// functions/bigquery/analytics.js - OPTIMIZED FOR STUDYGLOQE
const { BigQuery } = require('@google-cloud/bigquery');
const functions = require('firebase-functions');

const bigquery = new BigQuery({
  projectId: process.env.GCLOUD_PROJECT
});

// ✅ UPDATED: Your actual BigQuery dataset
const DATASET = 'studygloqe_analytics';
const LOCATION = 'asia-south1'; // Mumbai region

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
        AVG(CAST(data.totalTime AS INT64)) as avg_time,
        SUM(CAST(data.totalTime AS INT64)) as total_time
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
      ARRAY_AGG(
        STRUCT(
          sb.subject, 
          sb.sessions, 
          sb.avg_time,
          sb.total_time,
          ROUND(SAFE_DIVIDE(sb.total_time, ss.total_study_time) * 100, 1) as percentage
        ) 
        ORDER BY sb.sessions DESC
      ) as subject_breakdown
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
    location: LOCATION,
    timeout: 30000 // 30 second timeout
  };

  try {
    const [rows] = await bigquery.query(options);
    
    // Return with fallback values
    const result = rows[0] || {
      documents_studied: 0,
      total_study_time: 0,
      avg_session_duration: 0,
      total_sessions: 0,
      last_study_date: null,
      subject_breakdown: []
    };

    // Filter out null subjects
    if (result.subject_breakdown) {
      result.subject_breakdown = result.subject_breakdown.filter(
        item => item.subject !== null
      );
    }

    return result;
  } catch (error) {
    console.error('BigQuery Error (getStudentAnalytics):', {
      error: error.message,
      userId,
      dateRange,
      stack: error.stack
    });
    throw new functions.https.HttpsError('internal', 'Analytics query failed: ' + error.message);
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
        AVG(CAST(data.totalTime AS INT64)) as avg_time,
        AVG(CAST(data.progressPercentage AS FLOAT64)) as avg_completion
      FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.studySessions_raw_latest\`
      WHERE data.classId = @classId
        AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @dateRange DAY)
        AND data.subject IS NOT NULL
      GROUP BY data.subject
      ORDER BY students_count DESC
      LIMIT 10
    ),
    daily_activity AS (
      SELECT
        DATE(timestamp) as date,
        COUNT(DISTINCT data.userId) as active_students,
        SUM(CAST(data.totalTime AS INT64)) as minutes_studied,
        COUNT(*) as sessions
      FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.studySessions_raw_latest\`
      WHERE data.classId = @classId
        AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @dateRange DAY)
      GROUP BY date
      ORDER BY date DESC
      LIMIT 30
    )
    SELECT
      cp.active_students,
      cp.total_study_time,
      cp.avg_session_duration,
      cp.total_sessions,
      ARRAY_AGG(
        STRUCT(
          sp.subject, 
          sp.students_count, 
          sp.total_time, 
          sp.avg_time,
          sp.avg_completion
        )
        ORDER BY sp.students_count DESC
      ) as subject_breakdown,
      ARRAY_AGG(
        STRUCT(
          da.date, 
          da.active_students, 
          da.minutes_studied,
          da.sessions
        ) 
        ORDER BY da.date DESC
      ) as daily_activity
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
    location: LOCATION,
    timeout: 30000
  };

  try {
    const [rows] = await bigquery.query(options);
    return rows[0] || {
      active_students: 0,
      total_study_time: 0,
      avg_session_duration: 0,
      total_sessions: 0,
      subject_breakdown: [],
      daily_activity: []
    };
  } catch (error) {
    console.error('BigQuery Error (getClassAnalytics):', {
      error: error.message,
      classId,
      dateRange
    });
    throw new functions.https.HttpsError('internal', 'Class analytics query failed: ' + error.message);
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
        SUM(CAST(data.totalTime AS INT64)) as total_time,
        AVG(CAST(data.progressPercentage AS FLOAT64)) as avg_productivity
      FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.studySessions_raw_latest\`
      WHERE data.userId = @userId
        AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 90 DAY)
      GROUP BY hour
      ORDER BY hour
    ),
    weekly_pattern AS (
      SELECT
        EXTRACT(DAYOFWEEK FROM timestamp) as day_of_week,
        CASE EXTRACT(DAYOFWEEK FROM timestamp)
          WHEN 1 THEN 'Sunday'
          WHEN 2 THEN 'Monday'
          WHEN 3 THEN 'Tuesday'
          WHEN 4 THEN 'Wednesday'
          WHEN 5 THEN 'Thursday'
          WHEN 6 THEN 'Friday'
          WHEN 7 THEN 'Saturday'
        END as day_name,
        COUNT(*) as sessions,
        AVG(CAST(data.totalTime AS INT64)) as avg_duration,
        SUM(CAST(data.totalTime AS INT64)) as total_time
      FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.studySessions_raw_latest\`
      WHERE data.userId = @userId
        AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 90 DAY)
      GROUP BY day_of_week, day_name
      ORDER BY day_of_week
    ),
    optimal_times AS (
      SELECT
        EXTRACT(HOUR FROM timestamp) as hour,
        AVG(CAST(data.progressPercentage AS FLOAT64)) as avg_progress,
        COUNT(*) as sessions
      FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.studySessions_raw_latest\`
      WHERE data.userId = @userId
        AND data.progressPercentage IS NOT NULL
        AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 90 DAY)
      GROUP BY hour
      HAVING sessions >= 3  -- Only consider hours with at least 3 sessions
      ORDER BY avg_progress DESC
      LIMIT 3
    )
    SELECT
      ARRAY_AGG(
        STRUCT(
          hp.hour, 
          hp.sessions, 
          hp.avg_duration, 
          hp.total_time,
          hp.avg_productivity
        ) 
        ORDER BY hp.hour
      ) as hourly_pattern,
      ARRAY_AGG(
        STRUCT(
          wp.day_of_week, 
          wp.day_name,
          wp.sessions, 
          wp.avg_duration,
          wp.total_time
        ) 
        ORDER BY wp.day_of_week
      ) as weekly_pattern,
      ARRAY_AGG(
        STRUCT(
          ot.hour, 
          ot.avg_progress,
          ot.sessions
        ) 
        ORDER BY ot.avg_progress DESC
      ) as optimal_hours
    FROM hourly_pattern hp
    LEFT JOIN weekly_pattern wp ON 1=1
    LEFT JOIN optimal_times ot ON 1=1
    GROUP BY 1
  `;

  const options = {
    query: query,
    params: { userId },
    location: LOCATION,
    timeout: 30000
  };

  try {
    const [rows] = await bigquery.query(options);
    return rows[0] || {
      hourly_pattern: [],
      weekly_pattern: [],
      optimal_hours: []
    };
  } catch (error) {
    console.error('BigQuery Error (getLearningPatterns):', {
      error: error.message,
      userId
    });
    throw new functions.https.HttpsError('internal', 'Learning patterns query failed: ' + error.message);
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
        COUNT(DISTINCT data.documentId) as documents_studied,
        COUNT(DISTINCT data.subject) as subjects_studied
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
      ROUND(avg_progress, 1) as avg_progress,
      documents_studied,
      subjects_studied,
      LAG(study_time) OVER (ORDER BY period) as prev_study_time,
      LAG(sessions) OVER (ORDER BY period) as prev_sessions,
      LAG(avg_progress) OVER (ORDER BY period) as prev_avg_progress,
      ROUND(
        SAFE_DIVIDE(
          study_time - LAG(study_time) OVER (ORDER BY period), 
          LAG(study_time) OVER (ORDER BY period)
        ) * 100, 
        1
      ) as time_change_pct,
      ROUND(
        SAFE_DIVIDE(
          sessions - LAG(sessions) OVER (ORDER BY period), 
          LAG(sessions) OVER (ORDER BY period)
        ) * 100, 
        1
      ) as sessions_change_pct,
      ROUND(
        avg_progress - LAG(avg_progress) OVER (ORDER BY period),
        1
      ) as progress_change
    FROM time_periods
    ORDER BY period DESC
  `;

  const options = {
    query: query,
    params: { userId, intervalDays },
    location: LOCATION,
    timeout: 30000
  };

  try {
    const [rows] = await bigquery.query(options);
    return rows || [];
  } catch (error) {
    console.error('BigQuery Error (getPerformanceTrends):', {
      error: error.message,
      userId,
      period
    });
    throw new functions.https.HttpsError('internal', 'Performance trends query failed: ' + error.message);
  }
});
