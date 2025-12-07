// functions/bigquery/dashboards.js - UPDATED FOR FIREBASE EXTENSION
const { BigQuery } = require('@google-cloud/bigquery');
const functions = require('firebase-functions');

const bigquery = new BigQuery({
  projectId: process.env.GCLOUD_PROJECT
});

const DATASET = 'firebase_export';

// ✅ 1. GET TEACHER DASHBOARD DATA
exports.getTeacherDashboardData = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  }

  if (!context.auth.token?.teacher && !context.auth.token?.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Teachers only');
  }

  const { teacherId, dateRange = 30 } = data;

  const query = `
    WITH teacher_classes AS (
      SELECT DISTINCT data.classId
      FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.classes_raw_latest\`
      WHERE data.teacherId = @teacherId
    ),
    overall_stats AS (
      SELECT
        COUNT(DISTINCT data.userId) as total_students,
        COUNT(DISTINCT data.documentId) as total_documents,
        SUM(CAST(data.totalTime AS INT64)) as total_study_time,
        COUNT(*) as total_sessions,
        AVG(CAST(data.progressPercentage AS FLOAT64)) as avg_progress
      FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.studySessions_raw_latest\`
      WHERE data.classId IN (SELECT classId FROM teacher_classes)
        AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @dateRange DAY)
    ),
    class_breakdown AS (
      SELECT
        c.data.className,
        c.data.classId,
        COUNT(DISTINCT s.data.userId) as active_students,
        SUM(CAST(s.data.totalTime AS INT64)) as study_time,
        AVG(CAST(s.data.progressPercentage AS FLOAT64)) as avg_progress
      FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.classes_raw_latest\` c
      LEFT JOIN \`${process.env.GCLOUD_PROJECT}.${DATASET}.studySessions_raw_latest\` s 
        ON c.data.classId = s.data.classId
        AND s.timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @dateRange DAY)
      WHERE c.data.teacherId = @teacherId
      GROUP BY c.data.className, c.data.classId
      ORDER BY active_students DESC
    ),
    top_performers AS (
      SELECT
        u.data.name,
        u.data.userId,
        SUM(CAST(s.data.totalTime AS INT64)) as study_time,
        AVG(CAST(s.data.progressPercentage AS FLOAT64)) as avg_progress,
        COUNT(DISTINCT s.data.documentId) as documents_studied
      FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.users_raw_latest\` u
      JOIN \`${process.env.GCLOUD_PROJECT}.${DATASET}.studySessions_raw_latest\` s 
        ON u.data.userId = s.data.userId
      WHERE s.data.classId IN (SELECT classId FROM teacher_classes)
        AND s.timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @dateRange DAY)
      GROUP BY u.data.name, u.data.userId
      ORDER BY study_time DESC
      LIMIT 10
    ),
    at_risk_students AS (
      SELECT
        u.data.name,
        u.data.userId,
        COUNT(s.document_id) as sessions,
        COALESCE(SUM(CAST(s.data.totalTime AS INT64)), 0) as study_time,
        AVG(CAST(s.data.progressPercentage AS FLOAT64)) as avg_progress,
        DATE_DIFF(CURRENT_DATE(), DATE(MAX(s.timestamp)), DAY) as days_since_last_activity
      FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.users_raw_latest\` u
      LEFT JOIN \`${process.env.GCLOUD_PROJECT}.${DATASET}.studySessions_raw_latest\` s 
        ON u.data.userId = s.data.userId
      WHERE u.data.classId IN (SELECT classId FROM teacher_classes)
        AND (s.timestamp IS NULL OR s.timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @dateRange DAY))
      GROUP BY u.data.name, u.data.userId
      HAVING sessions < 5 OR days_since_last_activity > 7 OR avg_progress < 40
      ORDER BY days_since_last_activity DESC, sessions ASC
      LIMIT 10
    ),
    daily_engagement AS (
      SELECT
        DATE(timestamp) as date,
        COUNT(DISTINCT data.userId) as active_students,
        SUM(CAST(data.totalTime AS INT64)) as total_minutes,
        COUNT(*) as sessions
      FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.studySessions_raw_latest\`
      WHERE data.classId IN (SELECT classId FROM teacher_classes)
        AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @dateRange DAY)
      GROUP BY date
      ORDER BY date DESC
    )
    SELECT
      os.*,
      ARRAY_AGG(STRUCT(
        cb.className,
        cb.classId,
        cb.active_students,
        cb.study_time,
        cb.avg_progress
      )) as class_breakdown,
      ARRAY_AGG(STRUCT(
        tp.name,
        tp.userId,
        tp.study_time,
        tp.avg_progress,
        tp.documents_studied
      )) as top_performers,
      ARRAY_AGG(STRUCT(
        ar.name,
        ar.userId,
        ar.sessions,
        ar.study_time,
        ar.avg_progress,
        ar.days_since_last_activity
      )) as at_risk_students,
      ARRAY_AGG(STRUCT(
        de.date,
        de.active_students,
        de.total_minutes,
        de.sessions
      ) ORDER BY de.date DESC) as daily_engagement
    FROM overall_stats os
    LEFT JOIN class_breakdown cb ON 1=1
    LEFT JOIN top_performers tp ON 1=1
    LEFT JOIN at_risk_students ar ON 1=1
    LEFT JOIN daily_engagement de ON 1=1
    GROUP BY 
      os.total_students,
      os.total_documents,
      os.total_study_time,
      os.total_sessions,
      os.avg_progress
  `;

  const options = {
    query: query,
    params: { teacherId, dateRange },
    location: 'US'
  };

  try {
    const [rows] = await bigquery.query(options);
    return rows[0] || null;
  } catch (error) {
    console.error('BigQuery Error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// ✅ 2. GET ADMIN DASHBOARD METRICS
exports.getAdminMetrics = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  }

  if (!context.auth.token?.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Admins only');
  }

  const { dateRange = 30 } = data;

  const query = `
    WITH platform_stats AS (
      SELECT
        COUNT(DISTINCT data.userId) as total_active_users,
        COUNT(DISTINCT data.documentId) as total_documents,
        SUM(CAST(data.totalTime AS INT64)) as total_study_minutes,
        COUNT(*) as total_sessions,
        AVG(CAST(data.progressPercentage AS FLOAT64)) as avg_completion_rate
      FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.studySessions_raw_latest\`
      WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @dateRange DAY)
    ),
    growth_metrics AS (
      SELECT
        COUNT(DISTINCT CASE WHEN DATE(timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY) THEN data.userId END) as new_users_7d,
        COUNT(DISTINCT CASE WHEN DATE(timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY) THEN data.userId END) as new_users_30d,
        COUNT(DISTINCT data.userId) as total_users
      FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.users_raw_latest\`
    ),
    engagement_metrics AS (
      SELECT
        COUNT(DISTINCT CASE WHEN session_count >= 5 THEN userId END) as active_users,
        COUNT(DISTINCT CASE WHEN session_count >= 20 THEN userId END) as power_users,
        AVG(session_count) as avg_sessions_per_user,
        AVG(total_time) as avg_study_time_per_user
      FROM (
        SELECT
          data.userId,
          COUNT(*) as session_count,
          SUM(CAST(data.totalTime AS INT64)) as total_time
        FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.studySessions_raw_latest\`
        WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @dateRange DAY)
        GROUP BY data.userId
      )
    ),
    subject_popularity AS (
      SELECT
        data.subject,
        COUNT(DISTINCT data.userId) as unique_students,
        COUNT(*) as total_sessions,
        SUM(CAST(data.totalTime AS INT64)) as total_time
      FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.studySessions_raw_latest\`
      WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @dateRange DAY)
      GROUP BY data.subject
      ORDER BY unique_students DESC
      LIMIT 10
    ),
    daily_metrics AS (
      SELECT
        DATE(timestamp) as date,
        COUNT(DISTINCT data.userId) as dau,
        COUNT(*) as sessions,
        SUM(CAST(data.totalTime AS INT64)) as minutes
      FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.studySessions_raw_latest\`
      WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @dateRange DAY)
      GROUP BY date
      ORDER BY date DESC
    ),
    retention_7d AS (
      SELECT
        COUNT(DISTINCT u.data.userId) as users_created,
        COUNT(DISTINCT s.data.userId) as users_retained
      FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.users_raw_latest\` u
      LEFT JOIN \`${process.env.GCLOUD_PROJECT}.${DATASET}.studySessions_raw_latest\` s 
        ON u.data.userId = s.data.userId
        AND DATE(s.timestamp) BETWEEN DATE(u.timestamp) AND DATE_ADD(DATE(u.timestamp), INTERVAL 7 DAY)
      WHERE DATE(u.timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL 14 DAY)
        AND DATE(u.timestamp) < DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
    )
    SELECT
      ps.*,
      gm.new_users_7d,
      gm.new_users_30d,
      gm.total_users,
      em.active_users,
      em.power_users,
      em.avg_sessions_per_user,
      em.avg_study_time_per_user,
      SAFE_DIVIDE(r7.users_retained, r7.users_created) * 100 as retention_rate_7d,
      ARRAY_AGG(STRUCT(
        sp.subject,
        sp.unique_students,
        sp.total_sessions,
        sp.total_time
      )) as subject_popularity,
      ARRAY_AGG(STRUCT(
        dm.date,
        dm.dau,
        dm.sessions,
        dm.minutes
      ) ORDER BY dm.date DESC) as daily_metrics
    FROM platform_stats ps
    CROSS JOIN growth_metrics gm
    CROSS JOIN engagement_metrics em
    CROSS JOIN retention_7d r7
    LEFT JOIN subject_popularity sp ON 1=1
    LEFT JOIN daily_metrics dm ON 1=1
    GROUP BY 
      ps.total_active_users,
      ps.total_documents,
      ps.total_study_minutes,
      ps.total_sessions,
      ps.avg_completion_rate,
      gm.new_users_7d,
      gm.new_users_30d,
      gm.total_users,
      em.active_users,
      em.power_users,
      em.avg_sessions_per_user,
      em.avg_study_time_per_user,
      r7.users_created,
      r7.users_retained
  `;

  const options = {
    query: query,
    params: { dateRange },
    location: 'US'
  };

  try {
    const [rows] = await bigquery.query(options);
    return rows[0] || null;
  } catch (error) {
    console.error('BigQuery Error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// ✅ 3. GET SUBJECT INSIGHTS
exports.getSubjectInsights = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  }

  const { subject, dateRange = 30 } = data;

  const query = `
    WITH subject_overview AS (
      SELECT
        COUNT(DISTINCT data.userId) as total_students,
        COUNT(DISTINCT data.documentId) as total_documents,
        SUM(CAST(data.totalTime AS INT64)) as total_study_time,
        AVG(CAST(data.totalTime AS INT64)) as avg_session_duration,
        AVG(CAST(data.progressPercentage AS FLOAT64)) as avg_completion
      FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.studySessions_raw_latest\`
      WHERE data.subject = @subject
        AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @dateRange DAY)
    ),
    performance_distribution AS (
      SELECT
        CASE
          WHEN avg_progress >= 80 THEN 'Excellent'
          WHEN avg_progress >= 60 THEN 'Good'
          WHEN avg_progress >= 40 THEN 'Average'
          ELSE 'Needs Help'
        END as performance_level,
        COUNT(*) as student_count
      FROM (
        SELECT
          data.userId,
          AVG(CAST(data.progressPercentage AS FLOAT64)) as avg_progress
        FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.studySessions_raw_latest\`
        WHERE data.subject = @subject
          AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @dateRange DAY)
        GROUP BY data.userId
      )
      GROUP BY performance_level
    ),
    popular_documents AS (
      SELECT
        data.documentId,
        data.documentTitle,
        COUNT(DISTINCT data.userId) as unique_students,
        AVG(CAST(data.totalTime AS INT64)) as avg_time,
        AVG(CAST(data.progressPercentage AS FLOAT64)) as avg_completion
      FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.studySessions_raw_latest\`
      WHERE data.subject = @subject
        AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @dateRange DAY)
      GROUP BY data.documentId, data.documentTitle
      ORDER BY unique_students DESC
      LIMIT 10
    ),
    time_trends AS (
      SELECT
        DATE(timestamp) as date,
        COUNT(DISTINCT data.userId) as students,
        SUM(CAST(data.totalTime AS INT64)) as total_minutes
      FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.studySessions_raw_latest\`
      WHERE data.subject = @subject
        AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @dateRange DAY)
      GROUP BY date
      ORDER BY date DESC
    )
    SELECT
      so.*,
      ARRAY_AGG(STRUCT(
        pd.performance_level,
        pd.student_count
      )) as performance_distribution,
      ARRAY_AGG(STRUCT(
        pdoc.documentId,
        pdoc.documentTitle,
        pdoc.unique_students,
        pdoc.avg_time,
        pdoc.avg_completion
      )) as popular_documents,
      ARRAY_AGG(STRUCT(
        tt.date,
        tt.students,
        tt.total_minutes
      ) ORDER BY tt.date DESC) as time_trends
    FROM subject_overview so
    LEFT JOIN performance_distribution pd ON 1=1
    LEFT JOIN popular_documents pdoc ON 1=1
    LEFT JOIN time_trends tt ON 1=1
    GROUP BY 
      so.total_students,
      so.total_documents,
      so.total_study_time,
      so.avg_session_duration,
      so.avg_completion
  `;

  const options = {
    query: query,
    params: { subject, dateRange },
    location: 'US'
  };

  try {
    const [rows] = await bigquery.query(options);
    return rows[0] || null;
  } catch (error) {
    console.error('BigQuery Error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});
