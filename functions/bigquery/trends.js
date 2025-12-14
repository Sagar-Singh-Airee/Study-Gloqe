// functions/bigquery/trends.js - OPTIMIZED TREND ANALYSIS
const { BigQuery } = require('@google-cloud/bigquery');
const functions = require('firebase-functions');

const bigquery = new BigQuery({
  projectId: process.env.GCLOUD_PROJECT
});

const DATASET = 'studygloqe_analytics';
const LOCATION = 'asia-south1'; // Mumbai region

// ✅ 1. GET MONTHLY TRENDS
exports.getMonthlyTrends = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  }

  if (!context.auth.token?.admin && !context.auth.token?.teacher) {
    throw new functions.https.HttpsError('permission-denied', 'Unauthorized');
  }

  const { months = 12 } = data;

  // Validate months parameter
  if (months < 1 || months > 24) {
    throw new functions.https.HttpsError('invalid-argument', 'Months must be between 1 and 24');
  }

  const query = `
    WITH monthly_metrics AS (
      SELECT
        DATE_TRUNC(DATE(timestamp), MONTH) as month,
        COUNT(DISTINCT data.userId) as active_users,
        COUNT(DISTINCT data.documentId) as documents_used,
        SUM(CAST(data.totalTime AS INT64)) as total_study_minutes,
        COUNT(*) as total_sessions,
        AVG(CAST(data.progressPercentage AS FLOAT64)) as avg_completion,
        COUNT(DISTINCT data.subject) as subjects_studied
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
        LAG(total_sessions) OVER (ORDER BY month) as prev_sessions,
        avg_completion,
        LAG(avg_completion) OVER (ORDER BY month) as prev_completion,
        subjects_studied
      FROM monthly_metrics
    )
    SELECT
      month,
      active_users,
      documents_used,
      total_study_minutes,
      total_sessions,
      ROUND(avg_completion, 1) as avg_completion,
      subjects_studied,
      
      -- Growth percentages
      ROUND(SAFE_DIVIDE(active_users - prev_active_users, prev_active_users) * 100, 1) as user_growth_pct,
      ROUND(SAFE_DIVIDE(documents_used - prev_documents, prev_documents) * 100, 1) as document_growth_pct,
      ROUND(SAFE_DIVIDE(total_study_minutes - prev_minutes, prev_minutes) * 100, 1) as time_growth_pct,
      ROUND(SAFE_DIVIDE(total_sessions - prev_sessions, prev_sessions) * 100, 1) as sessions_growth_pct,
      ROUND(avg_completion - prev_completion, 1) as completion_change,
      
      -- Engagement metrics
      ROUND(SAFE_DIVIDE(total_study_minutes, active_users), 1) as avg_minutes_per_user,
      ROUND(SAFE_DIVIDE(total_sessions, active_users), 1) as avg_sessions_per_user
    FROM growth_rates
    ORDER BY month DESC
  `;

  const options = {
    query: query,
    params: { months },
    location: LOCATION,
    timeout: 30000
  };

  try {
    const [rows] = await bigquery.query(options);
    
    console.log(`✅ Monthly trends retrieved: ${rows.length} months`);
    
    return rows || [];
  } catch (error) {
    console.error('BigQuery Error (getMonthlyTrends):', {
      error: error.message,
      months
    });
    throw new functions.https.HttpsError('internal', 'Failed to get monthly trends: ' + error.message);
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

  const { cohortType = 'monthly', lookbackMonths = 12 } = data;

  if (!['weekly', 'monthly'].includes(cohortType)) {
    throw new functions.https.HttpsError('invalid-argument', 'cohortType must be "weekly" or "monthly"');
  }

  const dateFormat = cohortType === 'weekly' ? 'WEEK' : 'MONTH';

  const query = `
    WITH user_cohorts AS (
      SELECT
        data.userId,
        DATE_TRUNC(DATE(timestamp), ${dateFormat}) as cohort_period,
        MIN(timestamp) as first_seen
      FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.users_raw_latest\`
      WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @lookbackMonths MONTH)
      GROUP BY data.userId, cohort_period
    ),
    cohort_activity AS (
      SELECT
        uc.cohort_period,
        DATE_TRUNC(DATE(s.timestamp), ${dateFormat}) as activity_period,
        COUNT(DISTINCT s.data.userId) as active_users,
        SUM(CAST(s.data.totalTime AS INT64)) as total_study_time,
        COUNT(*) as total_sessions
      FROM user_cohorts uc
      LEFT JOIN \`${process.env.GCLOUD_PROJECT}.${DATASET}.studySessions_raw_latest\` s 
        ON uc.userId = s.data.userId
      WHERE s.timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @lookbackMonths MONTH)
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
        ca.total_study_time,
        ca.total_sessions,
        cs.cohort_size,
        ROUND(SAFE_DIVIDE(ca.active_users, cs.cohort_size) * 100, 1) as retention_rate,
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
        retention_rate,
        total_study_time,
        total_sessions,
        ROUND(SAFE_DIVIDE(total_study_time, active_users), 1) as avg_time_per_user
      ) ORDER BY period_number) as retention_by_period
    FROM retention_matrix
    GROUP BY cohort_period, cohort_size
    ORDER BY cohort_period DESC
  `;

  const options = {
    query: query,
    params: { lookbackMonths },
    location: LOCATION,
    timeout: 45000
  };

  try {
    const [rows] = await bigquery.query(options);
    
    console.log(`✅ Retention cohorts retrieved: ${rows.length} cohorts`);
    
    return rows || [];
  } catch (error) {
    console.error('BigQuery Error (getRetentionCohorts):', {
      error: error.message,
      cohortType,
      lookbackMonths
    });
    throw new functions.https.HttpsError('internal', 'Failed to get retention cohorts: ' + error.message);
  }
});

// ✅ 3. GET SUBJECT TRENDS OVER TIME
exports.getSubjectTrends = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  }

  const { dateRange = 90, topN = 10 } = data;

  // Validate parameters
  if (dateRange < 7 || dateRange > 365) {
    throw new functions.https.HttpsError('invalid-argument', 'dateRange must be between 7 and 365 days');
  }

  const query = `
    WITH weekly_subject_data AS (
      SELECT
        DATE_TRUNC(DATE(timestamp), WEEK) as week,
        data.subject,
        COUNT(DISTINCT data.userId) as unique_students,
        SUM(CAST(data.totalTime AS INT64)) as total_minutes,
        COUNT(*) as sessions,
        AVG(CAST(data.progressPercentage AS FLOAT64)) as avg_progress
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
        ROUND(avg_progress, 1) as avg_progress,
        RANK() OVER (PARTITION BY week ORDER BY unique_students DESC) as popularity_rank,
        LAG(unique_students) OVER (PARTITION BY subject ORDER BY week) as prev_week_students
      FROM weekly_subject_data
    ),
    subject_with_growth AS (
      SELECT
        week,
        subject,
        unique_students,
        total_minutes,
        sessions,
        avg_progress,
        popularity_rank,
        ROUND(SAFE_DIVIDE(unique_students - prev_week_students, prev_week_students) * 100, 1) as growth_pct
      FROM ranked_subjects
      WHERE popularity_rank <= @topN
    )
    SELECT
      week,
      ARRAY_AGG(STRUCT(
        subject,
        unique_students,
        total_minutes,
        sessions,
        avg_progress,
        popularity_rank,
        growth_pct
      ) ORDER BY popularity_rank) as subjects
    FROM subject_with_growth
    GROUP BY week
    ORDER BY week DESC
  `;

  const options = {
    query: query,
    params: { dateRange, topN },
    location: LOCATION,
    timeout: 30000
  };

  try {
    const [rows] = await bigquery.query(options);
    
    console.log(`✅ Subject trends retrieved: ${rows.length} weeks`);
    
    return rows || [];
  } catch (error) {
    console.error('BigQuery Error (getSubjectTrends):', {
      error: error.message,
      dateRange,
      topN
    });
    throw new functions.https.HttpsError('internal', 'Failed to get subject trends: ' + error.message);
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

  const { minRiskLevel = 'Low Risk', limit = 100 } = data;

  const query = `
    WITH user_activity AS (
      SELECT
        data.userId,
        COUNT(*) as total_sessions,
        SUM(CAST(data.totalTime AS INT64)) as total_study_time,
        AVG(CAST(data.progressPercentage AS FLOAT64)) as avg_completion,
        DATE_DIFF(CURRENT_DATE(), DATE(MAX(timestamp)), DAY) as days_since_last_activity,
        DATE_DIFF(CURRENT_DATE(), DATE(MIN(timestamp)), DAY) as account_age_days,
        COUNT(DISTINCT DATE(timestamp)) as active_days,
        COUNT(DISTINCT data.subject) as subjects_studied
      FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.studySessions_raw_latest\`
      WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 90 DAY)
      GROUP BY data.userId
    ),
    churn_risk_scores AS (
      SELECT
        ua.*,
        u.data.name,
        u.data.email,
        
        -- Calculate engagement score (0-100)
        LEAST(100, 
          (CASE 
            WHEN days_since_last_activity <= 3 THEN 40
            WHEN days_since_last_activity <= 7 THEN 30
            WHEN days_since_last_activity <= 14 THEN 20
            WHEN days_since_last_activity <= 30 THEN 10
            ELSE 0
          END) +
          (CASE 
            WHEN total_sessions >= 20 THEN 30
            WHEN total_sessions >= 10 THEN 20
            WHEN total_sessions >= 5 THEN 10
            ELSE 5
          END) +
          (CASE 
            WHEN avg_completion >= 80 THEN 30
            WHEN avg_completion >= 60 THEN 20
            WHEN avg_completion >= 40 THEN 10
            ELSE 5
          END)
        ) as engagement_score,
        
        -- Risk categorization
        CASE
          WHEN days_since_last_activity > 30 OR total_sessions < 3 THEN 'High Risk'
          WHEN days_since_last_activity > 14 OR total_sessions < 5 THEN 'Medium Risk'
          WHEN days_since_last_activity > 7 THEN 'Low Risk'
          ELSE 'Active'
        END as risk_level,
        
        CASE
          WHEN days_since_last_activity > 30 OR total_sessions < 3 THEN 4
          WHEN days_since_last_activity > 14 OR total_sessions < 5 THEN 3
          WHEN days_since_last_activity > 7 THEN 2
          ELSE 1
        END as risk_score,
        
        -- Calculate activity rate (sessions per day)
        ROUND(SAFE_DIVIDE(total_sessions, NULLIF(active_days, 0)), 2) as sessions_per_active_day
        
      FROM user_activity ua
      JOIN \`${process.env.GCLOUD_PROJECT}.${DATASET}.users_raw_latest\` u 
        ON ua.userId = u.data.userId
      WHERE days_since_last_activity > 7 OR total_sessions < 5
    )
    SELECT
      userId,
      name,
      email,
      total_sessions,
      total_study_time,
      ROUND(avg_completion, 1) as avg_completion,
      days_since_last_activity,
      account_age_days,
      active_days,
      subjects_studied,
      engagement_score,
      risk_level,
      risk_score,
      sessions_per_active_day
    FROM churn_risk_scores
    ORDER BY risk_score DESC, days_since_last_activity DESC
    LIMIT @limit
  `;

  const options = {
    query: query,
    params: { limit },
    location: LOCATION,
    timeout: 30000
  };

  try {
    const [rows] = await bigquery.query(options);
    
    // Filter by risk level if specified
    let filteredRows = rows;
    if (minRiskLevel !== 'Active') {
      const riskLevels = ['Active', 'Low Risk', 'Medium Risk', 'High Risk'];
      const minIndex = riskLevels.indexOf(minRiskLevel);
      
      filteredRows = rows.filter(row => {
        const rowIndex = riskLevels.indexOf(row.risk_level);
        return rowIndex >= minIndex;
      });
    }
    
    console.log(`✅ Churn prediction data retrieved: ${filteredRows.length} at-risk users`);
    
    return filteredRows;
  } catch (error) {
    console.error('BigQuery Error (getChurnPredictionData):', {
      error: error.message,
      limit
    });
    throw new functions.https.HttpsError('internal', 'Failed to get churn prediction data: ' + error.message);
  }
});

// ✅ 5. GET DAILY ACTIVE USERS (DAU) TREND - BONUS
exports.getDailyActiveUsersTrend = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  }

  if (!context.auth.token?.admin && !context.auth.token?.teacher) {
    throw new functions.https.HttpsError('permission-denied', 'Unauthorized');
  }

  const { days = 30 } = data;

  const query = `
    WITH daily_metrics AS (
      SELECT
        DATE(timestamp) as date,
        COUNT(DISTINCT data.userId) as dau,
        COUNT(*) as sessions,
        SUM(CAST(data.totalTime AS INT64)) as total_minutes,
        AVG(CAST(data.progressPercentage AS FLOAT64)) as avg_progress
      FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.studySessions_raw_latest\`
      WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @days DAY)
      GROUP BY date
    ),
    weekly_active_users AS (
      SELECT
        DATE_TRUNC(DATE(timestamp), WEEK) as week,
        COUNT(DISTINCT data.userId) as wau
      FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.studySessions_raw_latest\`
      WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @days DAY)
      GROUP BY week
    )
    SELECT
      dm.date,
      dm.dau,
      dm.sessions,
      dm.total_minutes,
      ROUND(dm.avg_progress, 1) as avg_progress,
      wau.wau,
      ROUND(SAFE_DIVIDE(dm.dau, wau.wau) * 100, 1) as dau_wau_ratio,
      ROUND(SAFE_DIVIDE(dm.sessions, dm.dau), 1) as sessions_per_user,
      ROUND(SAFE_DIVIDE(dm.total_minutes, dm.dau), 1) as minutes_per_user
    FROM daily_metrics dm
    LEFT JOIN weekly_active_users wau 
      ON DATE_TRUNC(dm.date, WEEK) = wau.week
    ORDER BY dm.date DESC
  `;

  const options = {
    query: query,
    params: { days },
    location: LOCATION,
    timeout: 30000
  };

  try {
    const [rows] = await bigquery.query(options);
    
    console.log(`✅ DAU trend retrieved: ${rows.length} days`);
    
    return rows || [];
  } catch (error) {
    console.error('BigQuery Error (getDailyActiveUsersTrend):', {
      error: error.message,
      days
    });
    throw new functions.https.HttpsError('internal', 'Failed to get DAU trend: ' + error.message);
  }
});
