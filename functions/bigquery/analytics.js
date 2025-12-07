// functions/bigquery/analytics.js - UPDATED FOR FIREBASE EXTENSION
const { BigQuery } = require('@google-cloud/bigquery');
const functions = require('firebase-functions');

const bigquery = new BigQuery({
  projectId: process.env.GCLOUD_PROJECT
});

const DATASET = 'firebase_export'; // ✅ Updated for extension

// ✅ 1. GET STUDENT ANALYTICS
exports.getStudentAnalytics = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  }

  const { userId, dateRange = 30 } = data;

  if (context.auth.uid !== userId && !context.auth.token?.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Unauthorized access');
  }

  const query = `
    WITH study_stats AS (
      SELECT
        data.userId as user_id,
        COUNT(DISTINCT data.documentId) as documents_studied,
        SUM(CAST(data.totalTime AS INT64)) as total_study_time,
        AVG(CAST(data.totalTime AS INT64)) as avg_session_duration,
        COUNT(*) as total_sessions,
        MAX(timestamp) as last_study_date
      FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.studySessions_raw_latest\`
      WHERE data.userId = @userId
        AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @dateRange DAY)
      GROUP BY data.userId
    ),
    subject_breakdown AS (
      SELECT
        data.subject,
        COUNT(*) as sessions,
        AVG(CAST(data.totalTime AS INT64)) as avg_time
      FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.studySessions_raw_latest\`
      WHERE data.userId = @userId
        AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @dateRange DAY)
      GROUP BY data.subject
    )
    SELECT
      COALESCE(ss.documents_studied, 0) as documents_studied,
      COALESCE(ss.total_study_time, 0) as total_study_time,
      COALESCE(ss.avg_session_duration, 0) as avg_session_duration,
      COALESCE(ss.total_sessions, 0) as total_sessions,
      ss.last_study_date,
      ARRAY_AGG(STRUCT(sb.subject, sb.sessions, sb.avg_time) ORDER BY sb.sessions DESC) as subject_breakdown
    FROM study_stats ss
    LEFT JOIN subject_breakdown sb ON 1=1
    GROUP BY 
      ss.documents_studied, 
      ss.total_study_time, 
      ss.avg_session_duration, 
      ss.total_sessions, 
      ss.last_study_date
  `;

  const options = {
    query: query,
    params: { userId, dateRange },
    location: 'US'
  };

  try {
    const [rows] = await bigquery.query(options);
    return rows[0] || {
      documents_studied: 0,
      total_study_time: 0,
      avg_session_duration: 0,
      total_sessions: 0,
      subject_breakdown: []
    };
  } catch (error) {
    console.error('BigQuery Error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// ✅ 2. GET CLASS ANALYTICS (For Teachers)
exports.getClassAnalytics = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  }

  if (!context.auth.token?.teacher && !context.auth.token?.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Teachers only');
  }

  const { classId, dateRange = 30 } = data;

  const query = `
    WITH class_performance AS (
      SELECT
        COUNT(DISTINCT data.userId) as active_students,
        SUM(CAST(data.totalTime AS INT64)) as total_study_time,
        AVG(CAST(data.totalTime AS INT64)) as avg_session_duration,
        COUNT(*) as total_sessions
      FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.studySessions_raw_latest\`
      WHERE data.classId = @classId
        AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @dateRange DAY)
    ),
    subject_performance AS (
      SELECT
        data.subject,
        COUNT(DISTINCT data.userId) as students_count,
        SUM(CAST(data.totalTime AS INT64)) as total_time,
        AVG(CAST(data.totalTime AS INT64)) as avg_time
      FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.studySessions_raw_latest\`
      WHERE data.classId = @classId
        AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @dateRange DAY)
      GROUP BY data.subject
      ORDER BY students_count DESC
      LIMIT 10
    ),
    daily_activity AS (
      SELECT
        DATE(timestamp) as date,
        COUNT(DISTINCT data.userId) as active_students,
        SUM(CAST(data.totalTime AS INT64)) as minutes_studied
      FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.studySessions_raw_latest\`
      WHERE data.classId = @classId
        AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @dateRange DAY)
      GROUP BY date
      ORDER BY date DESC
      LIMIT 30
    )
    SELECT
      cp.*,
      ARRAY_AGG(STRUCT(sp.subject, sp.students_count, sp.total_time, sp.avg_time)) as subject_breakdown,
      ARRAY_AGG(STRUCT(da.date, da.active_students, da.minutes_studied) ORDER BY da.date DESC) as daily_activity
    FROM class_performance cp
    LEFT JOIN subject_performance sp ON 1=1
    LEFT JOIN daily_activity da ON 1=1
    GROUP BY 
      cp.active_students,
      cp.total_study_time,
      cp.avg_session_duration,
      cp.total_sessions
  `;

  const options = {
    query: query,
    params: { classId, dateRange },
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

// ✅ 3. GET LEARNING PATTERNS
exports.getLearningPatterns = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  }

  const { userId } = data;

  if (context.auth.uid !== userId && !context.auth.token?.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Unauthorized');
  }

  const query = `
    WITH hourly_pattern AS (
      SELECT
        EXTRACT(HOUR FROM timestamp) as hour,
        COUNT(*) as sessions,
        AVG(CAST(data.totalTime AS INT64)) as avg_duration,
        SUM(CAST(data.totalTime AS INT64)) as total_time
      FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.studySessions_raw_latest\`
      WHERE data.userId = @userId
        AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 90 DAY)
      GROUP BY hour
      ORDER BY hour
    ),
    weekly_pattern AS (
      SELECT
        EXTRACT(DAYOFWEEK FROM timestamp) as day_of_week,
        COUNT(*) as sessions,
        AVG(CAST(data.totalTime AS INT64)) as avg_duration
      FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.studySessions_raw_latest\`
      WHERE data.userId = @userId
        AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 90 DAY)
      GROUP BY day_of_week
      ORDER BY day_of_week
    ),
    optimal_times AS (
      SELECT
        EXTRACT(HOUR FROM timestamp) as hour,
        AVG(CAST(data.progressPercentage AS FLOAT64)) as avg_progress
      FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.studySessions_raw_latest\`
      WHERE data.userId = @userId
        AND data.progressPercentage IS NOT NULL
        AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 90 DAY)
      GROUP BY hour
      ORDER BY avg_progress DESC
      LIMIT 3
    )
    SELECT
      ARRAY_AGG(STRUCT(hp.hour, hp.sessions, hp.avg_duration, hp.total_time) ORDER BY hp.hour) as hourly_pattern,
      ARRAY_AGG(STRUCT(wp.day_of_week, wp.sessions, wp.avg_duration) ORDER BY wp.day_of_week) as weekly_pattern,
      ARRAY_AGG(STRUCT(ot.hour, ot.avg_progress) ORDER BY ot.avg_progress DESC) as optimal_hours
    FROM hourly_pattern hp
    LEFT JOIN weekly_pattern wp ON 1=1
    LEFT JOIN optimal_times ot ON 1=1
    GROUP BY 1
  `;

  const options = {
    query: query,
    params: { userId },
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

// ✅ 4. GET PERFORMANCE TRENDS
exports.getPerformanceTrends = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  }

  const { userId, period = 'weekly' } = data;

  if (context.auth.uid !== userId && !context.auth.token?.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Unauthorized');
  }

  const dateFormat = period === 'monthly' ? 'MONTH' : 'WEEK';
  const intervalDays = period === 'monthly' ? 180 : 90;

  const query = `
    WITH time_periods AS (
      SELECT
        DATE_TRUNC(DATE(timestamp), ${dateFormat}) as period,
        SUM(CAST(data.totalTime AS INT64)) as study_time,
        COUNT(*) as sessions,
        AVG(CAST(data.progressPercentage AS FLOAT64)) as avg_progress,
        COUNT(DISTINCT data.documentId) as documents_studied
      FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.studySessions_raw_latest\`
      WHERE data.userId = @userId
        AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @intervalDays DAY)
      GROUP BY period
      ORDER BY period DESC
    )
    SELECT
      period,
      study_time,
      sessions,
      avg_progress,
      documents_studied,
      LAG(study_time) OVER (ORDER BY period) as prev_study_time,
      LAG(sessions) OVER (ORDER BY period) as prev_sessions,
      ROUND((study_time - LAG(study_time) OVER (ORDER BY period)) / NULLIF(LAG(study_time) OVER (ORDER BY period), 0) * 100, 2) as time_change_pct,
      ROUND((sessions - LAG(sessions) OVER (ORDER BY period)) / NULLIF(LAG(sessions) OVER (ORDER BY period), 0) * 100, 2) as sessions_change_pct
    FROM time_periods
    ORDER BY period DESC
  `;

  const options = {
    query: query,
    params: { userId, intervalDays },
    location: 'US'
  };

  try {
    const [rows] = await bigquery.query(options);
    return rows;
  } catch (error) {
    console.error('BigQuery Error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});
