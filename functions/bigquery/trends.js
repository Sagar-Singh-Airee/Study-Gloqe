// functions/bigquery/trends.js - UPDATED FOR FIREBASE EXTENSION
const { BigQuery } = require('@google-cloud/bigquery');
const functions = require('firebase-functions');

const bigquery = new BigQuery({
  projectId: process.env.GCLOUD_PROJECT
});

const DATASET = 'firebase_export';

// ✅ 1. GET MONTHLY TRENDS
exports.getMonthlyTrends = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  }

  if (!context.auth.token?.admin && !context.auth.token?.teacher) {
    throw new functions.https.HttpsError('permission-denied', 'Unauthorized');
  }

  const { months = 12 } = data;

  const query = `
    WITH monthly_metrics AS (
      SELECT
        DATE_TRUNC(DATE(timestamp), MONTH) as month,
        COUNT(DISTINCT data.userId) as active_users,
        COUNT(DISTINCT data.documentId) as documents_used,
        SUM(CAST(data.totalTime AS INT64)) as total_study_minutes,
        COUNT(*) as total_sessions,
        AVG(CAST(data.progressPercentage AS FLOAT64)) as avg_completion
      FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.studySessions_raw_latest\`
      WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @months MONTH)
      GROUP BY month
      ORDER BY month DESC
    ),
    growth_rates AS (
      SELECT
        month,
        active_users,
        LAG(active_users) OVER (ORDER BY month) as prev_active_users,
        documents_used,
        LAG(documents_used) OVER (ORDER BY month) as prev_documents,
        total_study_minutes,
        LAG(total_study_minutes) OVER (ORDER BY month) as prev_minutes,
        total_sessions,
        avg_completion
      FROM monthly_metrics
    )
    SELECT
      month,
      active_users,
      documents_used,
      total_study_minutes,
      total_sessions,
      avg_completion,
      ROUND(SAFE_DIVIDE(active_users - prev_active_users, prev_active_users) * 100, 2) as user_growth_pct,
      ROUND(SAFE_DIVIDE(documents_used - prev_documents, prev_documents) * 100, 2) as document_growth_pct,
      ROUND(SAFE_DIVIDE(total_study_minutes - prev_minutes, prev_minutes) * 100, 2) as time_growth_pct
    FROM growth_rates
    ORDER BY month DESC
  `;

  const options = {
    query: query,
    params: { months },
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

// ✅ 2. GET RETENTION COHORTS
exports.getRetentionCohorts = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  }

  if (!context.auth.token?.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Admins only');
  }

  const { cohortType = 'monthly' } = data;

  const dateFormat = cohortType === 'weekly' ? 'WEEK' : 'MONTH';

  const query = `
    WITH user_cohorts AS (
      SELECT
        data.userId,
        DATE_TRUNC(DATE(timestamp), ${dateFormat}) as cohort_period
      FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.users_raw_latest\`
      WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 12 MONTH)
    ),
    cohort_activity AS (
      SELECT
        uc.cohort_period,
        DATE_TRUNC(DATE(s.timestamp), ${dateFormat}) as activity_period,
        COUNT(DISTINCT s.data.userId) as active_users
      FROM user_cohorts uc
      LEFT JOIN \`${process.env.GCLOUD_PROJECT}.${DATASET}.studySessions_raw_latest\` s 
        ON uc.userId = s.data.userId
      WHERE s.timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 12 MONTH)
      GROUP BY uc.cohort_period, activity_period
    ),
    cohort_sizes AS (
      SELECT
        cohort_period,
        COUNT(DISTINCT userId) as cohort_size
      FROM user_cohorts
      GROUP BY cohort_period
    ),
    retention_matrix AS (
      SELECT
        ca.cohort_period,
        ca.activity_period,
        ca.active_users,
        cs.cohort_size,
        ROUND(SAFE_DIVIDE(ca.active_users, cs.cohort_size) * 100, 2) as retention_rate,
        DATE_DIFF(ca.activity_period, ca.cohort_period, ${dateFormat}) as period_number
      FROM cohort_activity ca
      JOIN cohort_sizes cs ON ca.cohort_period = cs.cohort_period
      WHERE ca.activity_period >= ca.cohort_period
    )
    SELECT
      cohort_period,
      cohort_size,
      ARRAY_AGG(STRUCT(
        period_number,
        activity_period,
        active_users,
        retention_rate
      ) ORDER BY period_number) as retention_by_period
    FROM retention_matrix
    GROUP BY cohort_period, cohort_size
    ORDER BY cohort_period DESC
  `;

  const options = {
    query: query,
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

// ✅ 3. GET SUBJECT TRENDS OVER TIME
exports.getSubjectTrends = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  }

  const { dateRange = 90 } = data;

  const query = `
    WITH weekly_subject_data AS (
      SELECT
        DATE_TRUNC(DATE(timestamp), WEEK) as week,
        data.subject,
        COUNT(DISTINCT data.userId) as unique_students,
        SUM(CAST(data.totalTime AS INT64)) as total_minutes,
        COUNT(*) as sessions
      FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.studySessions_raw_latest\`
      WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @dateRange DAY)
        AND data.subject IS NOT NULL
      GROUP BY week, data.subject
    ),
    ranked_subjects AS (
      SELECT
        week,
        subject,
        unique_students,
        total_minutes,
        sessions,
        RANK() OVER (PARTITION BY week ORDER BY unique_students DESC) as popularity_rank
      FROM weekly_subject_data
    )
    SELECT
      week,
      ARRAY_AGG(STRUCT(
        subject,
        unique_students,
        total_minutes,
        sessions,
        popularity_rank
      ) ORDER BY popularity_rank) as subjects
    FROM ranked_subjects
    WHERE popularity_rank <= 10
    GROUP BY week
    ORDER BY week DESC
  `;

  const options = {
    query: query,
    params: { dateRange },
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

// ✅ 4. GET CHURN PREDICTION DATA
exports.getChurnPredictionData = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  }

  if (!context.auth.token?.admin && !context.auth.token?.teacher) {
    throw new functions.https.HttpsError('permission-denied', 'Unauthorized');
  }

  const query = `
    WITH user_activity AS (
      SELECT
        data.userId,
        COUNT(*) as total_sessions,
        SUM(CAST(data.totalTime AS INT64)) as total_study_time,
        AVG(CAST(data.progressPercentage AS FLOAT64)) as avg_completion,
        DATE_DIFF(CURRENT_DATE(), DATE(MAX(timestamp)), DAY) as days_since_last_activity,
        DATE_DIFF(CURRENT_DATE(), DATE(MIN(timestamp)), DAY) as account_age_days
      FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.studySessions_raw_latest\`
      WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 90 DAY)
      GROUP BY data.userId
    ),
    churn_risk_scores AS (
      SELECT
        ua.*,
        u.data.name,
        u.data.email,
        CASE
          WHEN days_since_last_activity > 30 THEN 'High Risk'
          WHEN days_since_last_activity > 14 THEN 'Medium Risk'
          WHEN days_since_last_activity > 7 THEN 'Low Risk'
          ELSE 'Active'
        END as risk_level,
        CASE
          WHEN days_since_last_activity > 30 THEN 4
          WHEN days_since_last_activity > 14 THEN 3
          WHEN days_since_last_activity > 7 THEN 2
          ELSE 1
        END as risk_score
      FROM user_activity ua
      JOIN \`${process.env.GCLOUD_PROJECT}.${DATASET}.users_raw_latest\` u 
        ON ua.userId = u.data.userId
      WHERE days_since_last_activity > 7 OR total_sessions < 3
    )
    SELECT
      userId,
      name,
      email,
      total_sessions,
      total_study_time,
      avg_completion,
      days_since_last_activity,
      account_age_days,
      risk_level,
      risk_score
    FROM churn_risk_scores
    ORDER BY risk_score DESC, days_since_last_activity DESC
    LIMIT 100
  `;

  const options = {
    query: query,
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
