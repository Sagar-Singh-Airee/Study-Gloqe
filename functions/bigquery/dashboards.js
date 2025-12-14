// functions/bigquery/dashboards.js - OPTIMIZED FOR STUDYGLOQE
const { BigQuery } = require('@google-cloud/bigquery');
const functions = require('firebase-functions');

const bigquery = new BigQuery({
  projectId: process.env.GCLOUD_PROJECT
});

// ✅ UPDATED: Your actual BigQuery dataset
const DATASET = 'studygloqe_analytics';
const LOCATION = 'asia-south1'; // Mumbai region

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
        AND data.classId IS NOT NULL
    ),
    overall_stats AS (
      SELECT
        COUNT(DISTINCT data.userId) as total_students,
        COUNT(DISTINCT data.documentId) as total_documents,
        SUM(CAST(data.totalTime AS INT64)) as total_study_time,
        COUNT(*) as total_sessions,
        AVG(CAST(data.progressPercentage AS FLOAT64)) as avg_progress,
        ROUND(AVG(CAST(data.totalTime AS INT64)), 0) as avg_session_duration
      FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.studySessions_raw_latest\`
      WHERE data.classId IN (SELECT classId FROM teacher_classes)
        AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @dateRange DAY)
    ),
    class_breakdown AS (
      SELECT
        c.data.className,
        c.data.classId,
        c.data.subject as class_subject,
        COUNT(DISTINCT s.data.userId) as active_students,
        SUM(CAST(s.data.totalTime AS INT64)) as study_time,
        AVG(CAST(s.data.progressPercentage AS FLOAT64)) as avg_progress,
        COUNT(*) as total_sessions
      FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.classes_raw_latest\` c
      LEFT JOIN \`${process.env.GCLOUD_PROJECT}.${DATASET}.studySessions_raw_latest\` s 
        ON c.data.classId = s.data.classId
        AND s.timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @dateRange DAY)
      WHERE c.data.teacherId = @teacherId
      GROUP BY c.data.className, c.data.classId, c.data.subject
      ORDER BY active_students DESC
    ),
    top_performers AS (
      SELECT
        u.data.name,
        u.data.userId,
        u.data.email,
        SUM(CAST(s.data.totalTime AS INT64)) as study_time,
        AVG(CAST(s.data.progressPercentage AS FLOAT64)) as avg_progress,
        COUNT(DISTINCT s.data.documentId) as documents_studied,
        COUNT(*) as total_sessions,
        MAX(s.timestamp) as last_activity
      FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.users_raw_latest\` u
      JOIN \`${process.env.GCLOUD_PROJECT}.${DATASET}.studySessions_raw_latest\` s 
        ON u.data.userId = s.data.userId
      WHERE s.data.classId IN (SELECT classId FROM teacher_classes)
        AND s.timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @dateRange DAY)
      GROUP BY u.data.name, u.data.userId, u.data.email
      ORDER BY study_time DESC
      LIMIT 10
    ),
    at_risk_students AS (
      SELECT
        u.data.name,
        u.data.userId,
        u.data.email,
        COUNT(s.document_id) as sessions,
        COALESCE(SUM(CAST(s.data.totalTime AS INT64)), 0) as study_time,
        COALESCE(AVG(CAST(s.data.progressPercentage AS FLOAT64)), 0) as avg_progress,
        DATE_DIFF(CURRENT_DATE(), DATE(MAX(s.timestamp)), DAY) as days_since_last_activity,
        CASE
          WHEN COUNT(s.document_id) = 0 THEN 'No Activity'
          WHEN DATE_DIFF(CURRENT_DATE(), DATE(MAX(s.timestamp)), DAY) > 14 THEN 'Inactive'
          WHEN COUNT(s.document_id) < 3 THEN 'Low Engagement'
          WHEN AVG(CAST(s.data.progressPercentage AS FLOAT64)) < 40 THEN 'Poor Progress'
          ELSE 'At Risk'
        END as risk_reason
      FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.users_raw_latest\` u
      LEFT JOIN \`${process.env.GCLOUD_PROJECT}.${DATASET}.studySessions_raw_latest\` s 
        ON u.data.userId = s.data.userId
        AND s.timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @dateRange DAY)
      WHERE u.data.role = 'student'
        AND EXISTS (
          SELECT 1 
          FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.classes_raw_latest\` c
          WHERE c.data.teacherId = @teacherId
        )
      GROUP BY u.data.name, u.data.userId, u.data.email
      HAVING sessions < 5 
        OR days_since_last_activity > 7 
        OR COALESCE(avg_progress, 0) < 40
        OR sessions = 0
      ORDER BY days_since_last_activity DESC, sessions ASC
      LIMIT 10
    ),
    daily_engagement AS (
      SELECT
        DATE(timestamp) as date,
        COUNT(DISTINCT data.userId) as active_students,
        SUM(CAST(data.totalTime AS INT64)) as total_minutes,
        COUNT(*) as sessions,
        AVG(CAST(data.totalTime AS INT64)) as avg_session_duration
      FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.studySessions_raw_latest\`
      WHERE data.classId IN (SELECT classId FROM teacher_classes)
        AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @dateRange DAY)
      GROUP BY date
      ORDER BY date DESC
    ),
    subject_breakdown AS (
      SELECT
        data.subject,
        COUNT(DISTINCT data.userId) as students,
        SUM(CAST(data.totalTime AS INT64)) as total_time,
        COUNT(*) as sessions
      FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.studySessions_raw_latest\`
      WHERE data.classId IN (SELECT classId FROM teacher_classes)
        AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @dateRange DAY)
        AND data.subject IS NOT NULL
      GROUP BY data.subject
      ORDER BY students DESC
    )
    SELECT
      os.total_students,
      os.total_documents,
      os.total_study_time,
      os.total_sessions,
      ROUND(os.avg_progress, 1) as avg_progress,
      os.avg_session_duration,
      ARRAY_AGG(STRUCT(
        cb.className,
        cb.classId,
        cb.class_subject,
        cb.active_students,
        cb.study_time,
        ROUND(cb.avg_progress, 1) as avg_progress,
        cb.total_sessions
      ) ORDER BY cb.active_students DESC) as class_breakdown,
      ARRAY_AGG(STRUCT(
        tp.name,
        tp.userId,
        tp.email,
        tp.study_time,
        ROUND(tp.avg_progress, 1) as avg_progress,
        tp.documents_studied,
        tp.total_sessions,
        tp.last_activity
      ) ORDER BY tp.study_time DESC) as top_performers,
      ARRAY_AGG(STRUCT(
        ar.name,
        ar.userId,
        ar.email,
        ar.sessions,
        ar.study_time,
        ROUND(ar.avg_progress, 1) as avg_progress,
        ar.days_since_last_activity,
        ar.risk_reason
      ) ORDER BY ar.days_since_last_activity DESC) as at_risk_students,
      ARRAY_AGG(STRUCT(
        de.date,
        de.active_students,
        de.total_minutes,
        de.sessions,
        ROUND(de.avg_session_duration, 0) as avg_session_duration
      ) ORDER BY de.date DESC) as daily_engagement,
      ARRAY_AGG(STRUCT(
        sb.subject,
        sb.students,
        sb.total_time,
        sb.sessions
      ) ORDER BY sb.students DESC) as subject_breakdown
    FROM overall_stats os
    LEFT JOIN class_breakdown cb ON 1=1
    LEFT JOIN top_performers tp ON 1=1
    LEFT JOIN at_risk_students ar ON 1=1
    LEFT JOIN daily_engagement de ON 1=1
    LEFT JOIN subject_breakdown sb ON 1=1
    GROUP BY 
      os.total_students,
      os.total_documents,
      os.total_study_time,
      os.total_sessions,
      os.avg_progress,
      os.avg_session_duration
  `;

  const options = {
    query: query,
    params: { teacherId, dateRange },
    location: LOCATION,
    timeout: 60000 // 60 seconds for complex dashboard query
  };

  try {
    const [rows] = await bigquery.query(options);
    
    const result = rows[0] || {
      total_students: 0,
      total_documents: 0,
      total_study_time: 0,
      total_sessions: 0,
      avg_progress: 0,
      avg_session_duration: 0,
      class_breakdown: [],
      top_performers: [],
      at_risk_students: [],
      daily_engagement: [],
      subject_breakdown: []
    };

    // Filter out nulls from arrays
    if (result.class_breakdown) {
      result.class_breakdown = result.class_breakdown.filter(c => c.classId !== null);
    }
    if (result.top_performers) {
      result.top_performers = result.top_performers.filter(p => p.userId !== null);
    }
    if (result.at_risk_students) {
      result.at_risk_students = result.at_risk_students.filter(s => s.userId !== null);
    }

    return result;
  } catch (error) {
    console.error('BigQuery Error (getTeacherDashboardData):', {
      error: error.message,
      teacherId,
      dateRange,
      stack: error.stack
    });
    throw new functions.https.HttpsError('internal', 'Teacher dashboard query failed: ' + error.message);
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
        AVG(CAST(data.progressPercentage AS FLOAT64)) as avg_completion_rate,
        ROUND(AVG(CAST(data.totalTime AS INT64)), 0) as avg_session_duration
      FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.studySessions_raw_latest\`
      WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @dateRange DAY)
    ),
    growth_metrics AS (
      SELECT
        COUNT(DISTINCT CASE 
          WHEN DATE(data.createdAt) >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY) 
          THEN data.userId 
        END) as new_users_7d,
        COUNT(DISTINCT CASE 
          WHEN DATE(data.createdAt) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY) 
          THEN data.userId 
        END) as new_users_30d,
        COUNT(DISTINCT data.userId) as total_users
      FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.users_raw_latest\`
    ),
    engagement_metrics AS (
      SELECT
        COUNT(DISTINCT CASE WHEN session_count >= 5 THEN userId END) as active_users,
        COUNT(DISTINCT CASE WHEN session_count >= 20 THEN userId END) as power_users,
        COUNT(DISTINCT CASE WHEN session_count < 5 AND session_count > 0 THEN userId END) as casual_users,
        ROUND(AVG(session_count), 1) as avg_sessions_per_user,
        ROUND(AVG(total_time), 0) as avg_study_time_per_user
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
        SUM(CAST(data.totalTime AS INT64)) as total_time,
        AVG(CAST(data.progressPercentage AS FLOAT64)) as avg_completion
      FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.studySessions_raw_latest\`
      WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @dateRange DAY)
        AND data.subject IS NOT NULL
      GROUP BY data.subject
      ORDER BY unique_students DESC
      LIMIT 10
    ),
    daily_metrics AS (
      SELECT
        DATE(timestamp) as date,
        COUNT(DISTINCT data.userId) as dau,
        COUNT(*) as sessions,
        SUM(CAST(data.totalTime AS INT64)) as minutes,
        AVG(CAST(data.totalTime AS INT64)) as avg_session_duration
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
        AND DATE(s.timestamp) BETWEEN DATE(u.data.createdAt) 
        AND DATE_ADD(DATE(u.data.createdAt), INTERVAL 7 DAY)
      WHERE DATE(u.data.createdAt) >= DATE_SUB(CURRENT_DATE(), INTERVAL 14 DAY)
        AND DATE(u.data.createdAt) < DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
    ),
    top_documents AS (
      SELECT
        data.documentId,
        data.documentTitle,
        COUNT(DISTINCT data.userId) as unique_users,
        COUNT(*) as sessions,
        SUM(CAST(data.totalTime AS INT64)) as total_time
      FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.studySessions_raw_latest\`
      WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @dateRange DAY)
        AND data.documentId IS NOT NULL
      GROUP BY data.documentId, data.documentTitle
      ORDER BY unique_users DESC
      LIMIT 10
    )
    SELECT
      ps.total_active_users,
      ps.total_documents,
      ps.total_study_minutes,
      ps.total_sessions,
      ROUND(ps.avg_completion_rate, 1) as avg_completion_rate,
      ps.avg_session_duration,
      gm.new_users_7d,
      gm.new_users_30d,
      gm.total_users,
      em.active_users,
      em.power_users,
      em.casual_users,
      em.avg_sessions_per_user,
      em.avg_study_time_per_user,
      ROUND(SAFE_DIVIDE(r7.users_retained, r7.users_created) * 100, 1) as retention_rate_7d,
      r7.users_created as cohort_size_7d,
      r7.users_retained as retained_users_7d,
      ARRAY_AGG(STRUCT(
        sp.subject,
        sp.unique_students,
        sp.total_sessions,
        sp.total_time,
        ROUND(sp.avg_completion, 1) as avg_completion
      ) ORDER BY sp.unique_students DESC) as subject_popularity,
      ARRAY_AGG(STRUCT(
        dm.date,
        dm.dau,
        dm.sessions,
        dm.minutes,
        ROUND(dm.avg_session_duration, 0) as avg_session_duration
      ) ORDER BY dm.date DESC) as daily_metrics,
      ARRAY_AGG(STRUCT(
        td.documentId,
        td.documentTitle,
        td.unique_users,
        td.sessions,
        td.total_time
      ) ORDER BY td.unique_users DESC) as top_documents
    FROM platform_stats ps
    CROSS JOIN growth_metrics gm
    CROSS JOIN engagement_metrics em
    CROSS JOIN retention_7d r7
    LEFT JOIN subject_popularity sp ON 1=1
    LEFT JOIN daily_metrics dm ON 1=1
    LEFT JOIN top_documents td ON 1=1
    GROUP BY 
      ps.total_active_users,
      ps.total_documents,
      ps.total_study_minutes,
      ps.total_sessions,
      ps.avg_completion_rate,
      ps.avg_session_duration,
      gm.new_users_7d,
      gm.new_users_30d,
      gm.total_users,
      em.active_users,
      em.power_users,
      em.casual_users,
      em.avg_sessions_per_user,
      em.avg_study_time_per_user,
      r7.users_created,
      r7.users_retained
  `;

  const options = {
    query: query,
    params: { dateRange },
    location: LOCATION,
    timeout: 60000
  };

  try {
    const [rows] = await bigquery.query(options);
    
    const result = rows[0] || {
      total_active_users: 0,
      total_documents: 0,
      total_study_minutes: 0,
      total_sessions: 0,
      avg_completion_rate: 0,
      avg_session_duration: 0,
      new_users_7d: 0,
      new_users_30d: 0,
      total_users: 0,
      active_users: 0,
      power_users: 0,
      casual_users: 0,
      avg_sessions_per_user: 0,
      avg_study_time_per_user: 0,
      retention_rate_7d: 0,
      subject_popularity: [],
      daily_metrics: [],
      top_documents: []
    };

    return result;
  } catch (error) {
    console.error('BigQuery Error (getAdminMetrics):', {
      error: error.message,
      dateRange,
      stack: error.stack
    });
    throw new functions.https.HttpsError('internal', 'Admin metrics query failed: ' + error.message);
  }
});

// ✅ 3. GET SUBJECT INSIGHTS
exports.getSubjectInsights = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  }

  const { subject, dateRange = 30 } = data;

  if (!subject) {
    throw new functions.https.HttpsError('invalid-argument', 'Subject is required');
  }

  const query = `
    WITH subject_overview AS (
      SELECT
        COUNT(DISTINCT data.userId) as total_students,
        COUNT(DISTINCT data.documentId) as total_documents,
        SUM(CAST(data.totalTime AS INT64)) as total_study_time,
        AVG(CAST(data.totalTime AS INT64)) as avg_session_duration,
        AVG(CAST(data.progressPercentage AS FLOAT64)) as avg_completion,
        COUNT(*) as total_sessions
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
          AND data.progressPercentage IS NOT NULL
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
        AVG(CAST(data.progressPercentage AS FLOAT64)) as avg_completion,
        COUNT(*) as total_sessions
      FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.studySessions_raw_latest\`
      WHERE data.subject = @subject
        AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @dateRange DAY)
        AND data.documentId IS NOT NULL
      GROUP BY data.documentId, data.documentTitle
      ORDER BY unique_students DESC
      LIMIT 10
    ),
    time_trends AS (
      SELECT
        DATE(timestamp) as date,
        COUNT(DISTINCT data.userId) as students,
        SUM(CAST(data.totalTime AS INT64)) as total_minutes,
        COUNT(*) as sessions,
        AVG(CAST(data.progressPercentage AS FLOAT64)) as avg_completion
      FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.studySessions_raw_latest\`
      WHERE data.subject = @subject
        AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @dateRange DAY)
      GROUP BY date
      ORDER BY date DESC
    )
    SELECT
      so.total_students,
      so.total_documents,
      so.total_study_time,
      ROUND(so.avg_session_duration, 0) as avg_session_duration,
      ROUND(so.avg_completion, 1) as avg_completion,
      so.total_sessions,
      ARRAY_AGG(STRUCT(
        pd.performance_level,
        pd.student_count
      ) ORDER BY 
        CASE pd.performance_level
          WHEN 'Excellent' THEN 1
          WHEN 'Good' THEN 2
          WHEN 'Average' THEN 3
          ELSE 4
        END
      ) as performance_distribution,
      ARRAY_AGG(STRUCT(
        pdoc.documentId,
        pdoc.documentTitle,
        pdoc.unique_students,
        ROUND(pdoc.avg_time, 0) as avg_time,
        ROUND(pdoc.avg_completion, 1) as avg_completion,
        pdoc.total_sessions
      ) ORDER BY pdoc.unique_students DESC) as popular_documents,
      ARRAY_AGG(STRUCT(
        tt.date,
        tt.students,
        tt.total_minutes,
        tt.sessions,
        ROUND(tt.avg_completion, 1) as avg_completion
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
      so.avg_completion,
      so.total_sessions
  `;

  const options = {
    query: query,
    params: { subject, dateRange },
    location: LOCATION,
    timeout: 30000
  };

  try {
    const [rows] = await bigquery.query(options);
    
    const result = rows[0] || {
      total_students: 0,
      total_documents: 0,
      total_study_time: 0,
      avg_session_duration: 0,
      avg_completion: 0,
      total_sessions: 0,
      performance_distribution: [],
      popular_documents: [],
      time_trends: []
    };

    // Filter nulls from arrays
    if (result.performance_distribution) {
      result.performance_distribution = result.performance_distribution.filter(
        p => p.performance_level !== null
      );
    }
    if (result.popular_documents) {
      result.popular_documents = result.popular_documents.filter(
        d => d.documentId !== null
      );
    }

    return result;
  } catch (error) {
    console.error('BigQuery Error (getSubjectInsights):', {
      error: error.message,
      subject,
      dateRange,
      stack: error.stack
    });
    throw new functions.https.HttpsError('internal', 'Subject insights query failed: ' + error.message);
  }
});
