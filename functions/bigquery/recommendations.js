// functions/bigquery/recommendations.js - UPDATED FOR FIREBASE EXTENSION
const { BigQuery } = require('@google-cloud/bigquery');
const functions = require('firebase-functions');

const bigquery = new BigQuery({
  projectId: process.env.GCLOUD_PROJECT
});

const DATASET = 'firebase_export';

// ✅ 1. GET PERSONALIZED DOCUMENT RECOMMENDATIONS
exports.getPersonalizedRecommendations = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  }

  const { userId, limit = 10 } = data;

  if (context.auth.uid !== userId && !context.auth.token?.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Unauthorized');
  }

  const query = `
    WITH user_subjects AS (
      SELECT
        data.subject,
        COUNT(*) as study_count
      FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.studySessions_raw_latest\`
      WHERE data.userId = @userId
        AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
      GROUP BY data.subject
      ORDER BY study_count DESC
      LIMIT 3
    ),
    user_documents AS (
      SELECT DISTINCT data.documentId
      FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.studySessions_raw_latest\`
      WHERE data.userId = @userId
    ),
    similar_users AS (
      SELECT
        data.userId as similar_user_id,
        COUNT(DISTINCT data.documentId) as common_docs
      FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.studySessions_raw_latest\`
      WHERE data.documentId IN (SELECT documentId FROM user_documents)
        AND data.userId != @userId
        AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 60 DAY)
      GROUP BY data.userId
      HAVING common_docs >= 2
      ORDER BY common_docs DESC
      LIMIT 50
    ),
    recommended_docs AS (
      SELECT
        data.documentId,
        data.documentTitle,
        data.subject,
        COUNT(DISTINCT data.userId) as popularity,
        AVG(CAST(data.progressPercentage AS FLOAT64)) as avg_completion,
        AVG(CAST(data.totalTime AS INT64)) as avg_study_time
      FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.studySessions_raw_latest\`
      WHERE data.userId IN (SELECT similar_user_id FROM similar_users)
        AND data.documentId NOT IN (SELECT documentId FROM user_documents)
        AND data.subject IN (SELECT subject FROM user_subjects)
        AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 60 DAY)
      GROUP BY data.documentId, data.documentTitle, data.subject
      HAVING popularity >= 3
      ORDER BY popularity DESC, avg_completion DESC
      LIMIT @limit
    )
    SELECT * FROM recommended_docs
  `;

  const options = {
    query: query,
    params: { userId, limit },
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

// ✅ 2. GET STUDY PLAN RECOMMENDATIONS
exports.getStudyPlanRecommendations = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  }

  const { userId } = data;

  if (context.auth.uid !== userId && !context.auth.token?.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Unauthorized');
  }

  const query = `
    WITH user_performance AS (
      SELECT
        data.subject,
        AVG(CAST(data.totalTime AS INT64)) as avg_time,
        COUNT(*) as sessions,
        AVG(CAST(data.progressPercentage AS FLOAT64)) as avg_progress
      FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.studySessions_raw_latest\`
      WHERE data.userId = @userId
        AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
      GROUP BY data.subject
    ),
    weak_subjects AS (
      SELECT
        subject,
        avg_time,
        sessions,
        avg_progress,
        CASE
          WHEN avg_progress < 50 THEN 'needs_attention'
          WHEN avg_progress < 75 THEN 'moderate'
          ELSE 'strong'
        END as strength_level,
        CASE
          WHEN avg_progress < 50 THEN 60
          WHEN avg_progress < 75 THEN 30
          ELSE 15
        END as recommended_minutes_per_day
      FROM user_performance
      ORDER BY avg_progress ASC
    ),
    optimal_schedule AS (
      SELECT
        EXTRACT(HOUR FROM timestamp) as hour,
        AVG(CAST(data.progressPercentage AS FLOAT64)) as productivity_score
      FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.studySessions_raw_latest\`
      WHERE data.userId = @userId
        AND data.progressPercentage IS NOT NULL
        AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 60 DAY)
      GROUP BY hour
      ORDER BY productivity_score DESC
      LIMIT 3
    )
    SELECT
      ARRAY_AGG(STRUCT(
        ws.subject,
        ws.avg_time,
        ws.sessions,
        ws.avg_progress,
        ws.strength_level,
        ws.recommended_minutes_per_day
      ) ORDER BY ws.avg_progress ASC) as subject_recommendations,
      ARRAY_AGG(STRUCT(
        os.hour,
        os.productivity_score
      ) ORDER BY os.productivity_score DESC) as optimal_study_hours
    FROM weak_subjects ws
    LEFT JOIN optimal_schedule os ON 1=1
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

// ✅ 3. GET PEER COMPARISON (Anonymous)
exports.getPeerComparison = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  }

  const { userId } = data;

  if (context.auth.uid !== userId && !context.auth.token?.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Unauthorized');
  }

  const query = `
    WITH user_stats AS (
      SELECT
        @userId as userId,
        SUM(CAST(data.totalTime AS INT64)) as my_study_time,
        COUNT(*) as my_sessions,
        AVG(CAST(data.progressPercentage AS FLOAT64)) as my_progress
      FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.studySessions_raw_latest\`
      WHERE data.userId = @userId
        AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
    ),
    peer_stats AS (
      SELECT
        APPROX_QUANTILES(total_time, 100)[OFFSET(50)] as median_study_time,
        APPROX_QUANTILES(total_time, 100)[OFFSET(75)] as top_25_study_time,
        APPROX_QUANTILES(total_time, 100)[OFFSET(90)] as top_10_study_time,
        APPROX_QUANTILES(sessions, 100)[OFFSET(50)] as median_sessions,
        APPROX_QUANTILES(avg_progress, 100)[OFFSET(50)] as median_progress
      FROM (
        SELECT
          data.userId,
          SUM(CAST(data.totalTime AS INT64)) as total_time,
          COUNT(*) as sessions,
          AVG(CAST(data.progressPercentage AS FLOAT64)) as avg_progress
        FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.studySessions_raw_latest\`
        WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
        GROUP BY data.userId
      )
    )
    SELECT
      us.my_study_time,
      us.my_sessions,
      us.my_progress,
      ps.median_study_time,
      ps.top_25_study_time,
      ps.top_10_study_time,
      ps.median_sessions,
      ps.median_progress,
      ROUND((us.my_study_time - ps.median_study_time) / NULLIF(ps.median_study_time, 0) * 100, 2) as percentile_vs_median,
      CASE
        WHEN us.my_study_time >= ps.top_10_study_time THEN 'Top 10%'
        WHEN us.my_study_time >= ps.top_25_study_time THEN 'Top 25%'
        WHEN us.my_study_time >= ps.median_study_time THEN 'Above Average'
        ELSE 'Below Average'
      END as performance_tier
    FROM user_stats us
    CROSS JOIN peer_stats ps
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
