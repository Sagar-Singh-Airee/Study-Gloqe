// functions/bigquery/recommendations.js - ADVANCED AI RECOMMENDATIONS
const { BigQuery } = require('@google-cloud/bigquery');
const functions = require('firebase-functions');

const bigquery = new BigQuery({
  projectId: process.env.GCLOUD_PROJECT
});

const DATASET = 'studygloqe_analytics';
const LOCATION = 'asia-south1';

// ✅ 1. GET PERSONALIZED DOCUMENT RECOMMENDATIONS (Collaborative Filtering)
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
        COUNT(*) as study_count,
        AVG(CAST(data.progressPercentage AS FLOAT64)) as avg_completion
      FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.studySessions_raw_latest\`
      WHERE data.userId = @userId
        AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
        AND data.subject IS NOT NULL
      GROUP BY data.subject
      ORDER BY study_count DESC
      LIMIT 5
    ),
    user_documents AS (
      SELECT DISTINCT data.documentId
      FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.studySessions_raw_latest\`
      WHERE data.userId = @userId
    ),
    similar_users AS (
      SELECT
        data.userId as similar_user_id,
        COUNT(DISTINCT data.documentId) as common_docs,
        AVG(CAST(data.progressPercentage AS FLOAT64)) as avg_progress
      FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.studySessions_raw_latest\`
      WHERE data.documentId IN (SELECT documentId FROM user_documents)
        AND data.userId != @userId
        AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 60 DAY)
      GROUP BY data.userId
      HAVING common_docs >= 2
      ORDER BY common_docs DESC, avg_progress DESC
      LIMIT 50
    ),
    recommended_docs AS (
      SELECT
        data.documentId,
        data.documentTitle,
        data.subject,
        COUNT(DISTINCT data.userId) as popularity,
        AVG(CAST(data.progressPercentage AS FLOAT64)) as avg_completion,
        AVG(CAST(data.totalTime AS INT64)) as avg_study_time,
        MAX(timestamp) as last_studied,
        -- Advanced relevance score
        (COUNT(DISTINCT data.userId) * 0.3) +  -- Popularity
        (AVG(CAST(data.progressPercentage AS FLOAT64)) * 0.4) +  -- Completion rate
        (CASE 
          WHEN MAX(timestamp) >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY) THEN 30
          WHEN MAX(timestamp) >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY) THEN 20
          ELSE 10
        END) as relevance_score  -- Recency boost
      FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.studySessions_raw_latest\`
      WHERE data.userId IN (SELECT similar_user_id FROM similar_users)
        AND data.documentId NOT IN (SELECT documentId FROM user_documents)
        AND data.subject IN (SELECT subject FROM user_subjects)
        AND data.documentTitle IS NOT NULL
        AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 90 DAY)
      GROUP BY data.documentId, data.documentTitle, data.subject
      HAVING popularity >= 2
      ORDER BY relevance_score DESC, popularity DESC, avg_completion DESC
      LIMIT @limit
    )
    SELECT 
      documentId,
      documentTitle,
      subject,
      popularity as students_studying,
      ROUND(avg_completion, 1) as avg_completion_rate,
      ROUND(avg_study_time, 0) as avg_study_time_minutes,
      ROUND(relevance_score, 2) as relevance_score,
      CASE
        WHEN popularity >= 20 THEN '🔥 Trending'
        WHEN avg_completion >= 80 THEN '⭐ High Success Rate'
        WHEN popularity >= 10 THEN '👥 Popular'
        ELSE '📚 Recommended'
      END as badge,
      CASE
        WHEN popularity >= 20 THEN CONCAT(CAST(popularity AS STRING), ' students are studying this now')
        WHEN avg_completion >= 80 THEN CONCAT('High completion rate: ', CAST(ROUND(avg_completion, 0) AS STRING), '%')
        ELSE 'Similar students found this helpful'
      END as reason
    FROM recommended_docs
  `;

  const options = {
    query: query,
    params: { userId, limit },
    location: LOCATION,
    timeout: 30000
  };

  try {
    const [rows] = await bigquery.query(options);
    
    console.log(`✅ Recommendations retrieved for user ${userId}: ${rows.length} documents`);
    
    return rows || [];
  } catch (error) {
    console.error('BigQuery Error (getPersonalizedRecommendations):', {
      error: error.message,
      userId,
      limit
    });
    throw new functions.https.HttpsError('internal', 'Recommendations query failed: ' + error.message);
  }
});

// ✅ 2. GET STUDY PLAN RECOMMENDATIONS (AI-Powered Study Planner)
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
        AVG(CAST(data.progressPercentage AS FLOAT64)) as avg_progress,
        SUM(CAST(data.totalTime AS INT64)) as total_time,
        MAX(timestamp) as last_studied,
        DATE_DIFF(CURRENT_DATE(), DATE(MAX(timestamp)), DAY) as days_since_last_study
      FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.studySessions_raw_latest\`
      WHERE data.userId = @userId
        AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 60 DAY)
        AND data.subject IS NOT NULL
      GROUP BY data.subject
    ),
    subject_recommendations AS (
      SELECT
        subject,
        ROUND(avg_time, 0) as avg_time,
        sessions,
        ROUND(avg_progress, 1) as avg_progress,
        total_time,
        days_since_last_study,
        -- Determine strength level
        CASE
          WHEN avg_progress < 40 THEN 'critical'
          WHEN avg_progress < 60 THEN 'needs_attention'
          WHEN avg_progress < 80 THEN 'moderate'
          ELSE 'strong'
        END as strength_level,
        -- Status emoji
        CASE
          WHEN avg_progress < 40 THEN '🔴'
          WHEN avg_progress < 60 THEN '🟡'
          WHEN avg_progress < 80 THEN '🟢'
          ELSE '✅'
        END as status_emoji,
        -- Calculate recommended study time
        CASE
          WHEN avg_progress < 40 THEN 90
          WHEN avg_progress < 60 THEN 60
          WHEN avg_progress < 80 THEN 30
          ELSE 15
        END as recommended_minutes_per_day,
        -- Weekly goal
        CASE
          WHEN avg_progress < 40 THEN 5
          WHEN avg_progress < 60 THEN 4
          WHEN avg_progress < 80 THEN 3
          ELSE 2
        END as recommended_sessions_per_week,
        -- Priority score (lower is higher priority)
        (100 - avg_progress) * 0.6 + 
        (days_since_last_study * 0.4) as priority_score,
        -- Generate recommendation reason
        CASE
          WHEN avg_progress < 40 AND days_since_last_study > 7 
            THEN 'Low progress and not studied recently - urgent attention needed'
          WHEN avg_progress < 40 
            THEN 'Low completion rate - needs focused practice'
          WHEN days_since_last_study > 14 
            THEN 'Not studied in 2+ weeks - review recommended'
          WHEN avg_progress < 60 
            THEN 'Moderate progress - consistent practice will help'
          WHEN avg_progress < 80 
            THEN 'Good progress - maintain momentum'
          ELSE 'Strong performance - light review sufficient'
        END as recommendation_reason,
        -- Action items
        CASE
          WHEN avg_progress < 40 THEN 'Schedule daily practice sessions'
          WHEN avg_progress < 60 THEN 'Increase study frequency'
          WHEN days_since_last_study > 14 THEN 'Resume studying this subject'
          ELSE 'Continue current study habits'
        END as action_item
      FROM user_performance
      ORDER BY priority_score DESC
    ),
    optimal_schedule AS (
      SELECT
        EXTRACT(HOUR FROM timestamp) as hour,
        COUNT(*) as sessions,
        AVG(CAST(data.progressPercentage AS FLOAT64)) as productivity_score,
        AVG(CAST(data.totalTime AS INT64)) as avg_duration
      FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.studySessions_raw_latest\`
      WHERE data.userId = @userId
        AND data.progressPercentage IS NOT NULL
        AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 90 DAY)
      GROUP BY hour
      HAVING sessions >= 3
      ORDER BY productivity_score DESC
      LIMIT 5
    ),
    study_streak AS (
      SELECT
        COUNT(DISTINCT DATE(timestamp)) as days_studied,
        MAX(DATE(timestamp)) as last_study_date,
        DATE_DIFF(CURRENT_DATE(), MAX(DATE(timestamp)), DAY) as days_since_study
      FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.studySessions_raw_latest\`
      WHERE data.userId = @userId
        AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
    ),
    weekly_stats AS (
      SELECT
        COUNT(*) as sessions_this_week,
        SUM(CAST(data.totalTime AS INT64)) as minutes_this_week,
        COUNT(DISTINCT data.subject) as subjects_this_week
      FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.studySessions_raw_latest\`
      WHERE data.userId = @userId
        AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
    )
    SELECT
      ARRAY_AGG(STRUCT(
        sr.subject,
        sr.status_emoji,
        sr.avg_time,
        sr.sessions,
        sr.avg_progress,
        sr.total_time,
        sr.days_since_last_study,
        sr.strength_level,
        sr.recommended_minutes_per_day,
        sr.recommended_sessions_per_week,
        sr.recommendation_reason,
        sr.action_item,
        ROUND(sr.priority_score, 1) as priority_score
      ) ORDER BY sr.priority_score DESC) as subject_recommendations,
      
      ARRAY_AGG(STRUCT(
        os.hour,
        ROUND(os.productivity_score, 1) as productivity_score,
        os.sessions,
        ROUND(os.avg_duration, 0) as avg_duration_minutes,
        CASE
          WHEN os.hour BETWEEN 6 AND 11 THEN 'Morning'
          WHEN os.hour BETWEEN 12 AND 17 THEN 'Afternoon'
          WHEN os.hour BETWEEN 18 AND 22 THEN 'Evening'
          ELSE 'Night'
        END as time_period,
        CASE
          WHEN os.hour BETWEEN 6 AND 8 THEN '☀️'
          WHEN os.hour BETWEEN 9 AND 11 THEN '🌅'
          WHEN os.hour BETWEEN 12 AND 17 THEN '🌤️'
          WHEN os.hour BETWEEN 18 AND 20 THEN '🌆'
          ELSE '🌙'
        END as emoji
      ) ORDER BY os.productivity_score DESC) as optimal_study_hours,
      
      (SELECT AS STRUCT
        ss.days_studied,
        ss.last_study_date,
        ss.days_since_study,
        CASE
          WHEN ss.days_since_study = 0 THEN 'Active today! 🔥'
          WHEN ss.days_since_study = 1 THEN 'Studied yesterday - keep going! 💪'
          WHEN ss.days_since_study <= 7 THEN CONCAT('Last studied ', CAST(ss.days_since_study AS STRING), ' days ago')
          ELSE 'Time to get back on track! 📚'
        END as streak_message,
        CASE
          WHEN ss.days_studied >= 7 THEN '7-day streak! 🏆'
          WHEN ss.days_studied >= 3 THEN 'Building momentum! ⭐'
          ELSE 'Start your streak today!'
        END as streak_badge
      FROM study_streak ss) as study_streak_info,
      
      (SELECT AS STRUCT
        ws.sessions_this_week,
        ws.minutes_this_week,
        ws.subjects_this_week,
        CASE
          WHEN ws.sessions_this_week >= 10 THEN 'Excellent! 🌟'
          WHEN ws.sessions_this_week >= 5 THEN 'Good work! 👍'
          WHEN ws.sessions_this_week >= 3 THEN 'Keep going! 💪'
          ELSE 'Let\'s study more! 📚'
        END as weekly_feedback
      FROM weekly_stats ws) as weekly_summary
      
    FROM subject_recommendations sr
    LEFT JOIN optimal_schedule os ON 1=1
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
    
    console.log(`✅ Study plan generated for user ${userId}`);
    
    return rows[0] || {
      subject_recommendations: [],
      optimal_study_hours: [],
      study_streak_info: null,
      weekly_summary: null
    };
  } catch (error) {
    console.error('BigQuery Error (getStudyPlanRecommendations):', {
      error: error.message,
      userId
    });
    throw new functions.https.HttpsError('internal', 'Study plan query failed: ' + error.message);
  }
});

// ✅ 3. GET PEER COMPARISON (Anonymous Benchmarking)
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
        COUNT(DISTINCT data.documentId) as my_documents,
        COUNT(DISTINCT data.subject) as my_subjects,
        AVG(CAST(data.progressPercentage AS FLOAT64)) as my_progress,
        AVG(CAST(data.totalTime AS INT64)) as my_avg_session_duration,
        COUNT(DISTINCT DATE(timestamp)) as my_active_days
      FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.studySessions_raw_latest\`
      WHERE data.userId = @userId
        AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
    ),
    peer_stats AS (
      SELECT
        APPROX_QUANTILES(total_time, 100)[OFFSET(50)] as median_study_time,
        APPROX_QUANTILES(total_time, 100)[OFFSET(75)] as top_25_study_time,
        APPROX_QUANTILES(total_time, 100)[OFFSET(90)] as top_10_study_time,
        APPROX_QUANTILES(total_time, 100)[OFFSET(25)] as bottom_25_study_time,
        
        APPROX_QUANTILES(sessions, 100)[OFFSET(50)] as median_sessions,
        APPROX_QUANTILES(sessions, 100)[OFFSET(75)] as top_25_sessions,
        
        APPROX_QUANTILES(avg_progress, 100)[OFFSET(50)] as median_progress,
        APPROX_QUANTILES(avg_progress, 100)[OFFSET(75)] as top_25_progress,
        
        APPROX_QUANTILES(documents, 100)[OFFSET(50)] as median_documents,
        APPROX_QUANTILES(active_days, 100)[OFFSET(50)] as median_active_days,
        
        AVG(total_time) as avg_study_time,
        AVG(sessions) as avg_sessions,
        
        COUNT(DISTINCT user_id) as total_peers
      FROM (
        SELECT
          data.userId as user_id,
          SUM(CAST(data.totalTime AS INT64)) as total_time,
          COUNT(*) as sessions,
          COUNT(DISTINCT data.documentId) as documents,
          COUNT(DISTINCT DATE(timestamp)) as active_days,
          AVG(CAST(data.progressPercentage AS FLOAT64)) as avg_progress
        FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.studySessions_raw_latest\`
        WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
        GROUP BY data.userId
        HAVING sessions >= 3
      )
    )
    SELECT
      -- User stats
      us.my_study_time,
      us.my_sessions,
      us.my_documents,
      us.my_subjects,
      us.my_active_days,
      ROUND(us.my_progress, 1) as my_progress,
      ROUND(us.my_avg_session_duration, 0) as my_avg_session_duration,
      
      -- Peer benchmarks
      ps.median_study_time,
      ps.top_25_study_time,
      ps.top_10_study_time,
      ps.bottom_25_study_time,
      ps.median_sessions,
      ps.top_25_sessions,
      ROUND(ps.median_progress, 1) as median_progress,
      ROUND(ps.top_25_progress, 1) as top_25_progress,
      ps.median_documents,
      ps.median_active_days,
      ROUND(ps.avg_study_time, 0) as avg_study_time,
      ROUND(ps.avg_sessions, 0) as avg_sessions,
      ps.total_peers,
      
      -- Percentile calculations
      ROUND(SAFE_DIVIDE(us.my_study_time - ps.median_study_time, ps.median_study_time) * 100, 1) as time_vs_median_pct,
      ROUND(SAFE_DIVIDE(us.my_sessions - ps.median_sessions, ps.median_sessions) * 100, 1) as sessions_vs_median_pct,
      ROUND(us.my_progress - ps.median_progress, 1) as progress_vs_median,
      
      -- Performance tier
      CASE
        WHEN us.my_study_time >= ps.top_10_study_time THEN 'Top 10%'
        WHEN us.my_study_time >= ps.top_25_study_time THEN 'Top 25%'
        WHEN us.my_study_time >= ps.median_study_time THEN 'Above Average'
        WHEN us.my_study_time >= ps.bottom_25_study_time THEN 'Below Average'
        ELSE 'Bottom 25%'
      END as performance_tier,
      
      -- Tier emoji
      CASE
        WHEN us.my_study_time >= ps.top_10_study_time THEN '🏆'
        WHEN us.my_study_time >= ps.top_25_study_time THEN '🌟'
        WHEN us.my_study_time >= ps.median_study_time THEN '👍'
        ELSE '💪'
      END as tier_emoji,
      
      -- Motivational message
      CASE
        WHEN us.my_study_time >= ps.top_10_study_time THEN 'Outstanding! You\'re in the top 10% 🏆'
        WHEN us.my_study_time >= ps.top_25_study_time THEN 'Great work! You\'re in the top 25% 🌟'
        WHEN us.my_study_time >= ps.median_study_time THEN 'Doing well! Above average performance 👍'
        ELSE 'Keep pushing! There\'s room for improvement 💪'
      END as motivation_message,
      
      -- Improvement suggestions
      CASE
        WHEN us.my_sessions < ps.median_sessions THEN 'Try studying more frequently for better retention'
        WHEN us.my_avg_session_duration < 15 THEN 'Consider longer study sessions for deeper focus'
        WHEN us.my_documents < ps.median_documents THEN 'Explore more study materials to broaden knowledge'
        WHEN us.my_progress < ps.median_progress THEN 'Focus on completing more of each document'
        WHEN us.my_active_days < ps.median_active_days THEN 'Study more consistently throughout the week'
        ELSE 'Maintain your excellent study habits!'
      END as improvement_suggestion,
      
      -- Strengths
      ARRAY[
        IF(us.my_study_time >= ps.median_study_time, 'Study time above average', NULL),
        IF(us.my_sessions >= ps.median_sessions, 'Active learner', NULL),
        IF(us.my_progress >= ps.median_progress, 'High completion rate', NULL),
        IF(us.my_documents >= ps.median_documents, 'Diverse study materials', NULL),
        IF(us.my_active_days >= ps.median_active_days, 'Consistent study habits', NULL)
      ] as strengths,
      
      -- Areas for improvement
      ARRAY[
        IF(us.my_study_time < ps.median_study_time, 'Study time', NULL),
        IF(us.my_sessions < ps.median_sessions, 'Study frequency', NULL),
        IF(us.my_progress < ps.median_progress, 'Completion rate', NULL),
        IF(us.my_documents < ps.median_documents, 'Material diversity', NULL),
        IF(us.my_active_days < ps.median_active_days, 'Consistency', NULL)
      ] as areas_for_improvement
      
    FROM user_stats us
    CROSS JOIN peer_stats ps
  `;

  const options = {
    query: query,
    params: { userId },
    location: LOCATION,
    timeout: 30000
  };

  try {
    const [rows] = await bigquery.query(options);
    
    const result = rows[0] || {
      my_study_time: 0,
      my_sessions: 0,
      performance_tier: 'No data',
      motivation_message: 'Start studying to see your stats!'
    };
    
    // Filter out null values from arrays
    if (result.strengths) {
      result.strengths = result.strengths.filter(s => s !== null);
    }
    if (result.areas_for_improvement) {
      result.areas_for_improvement = result.areas_for_improvement.filter(a => a !== null);
    }
    
    console.log(`✅ Peer comparison retrieved for user ${userId}`);
    
    return result;
  } catch (error) {
    console.error('BigQuery Error (getPeerComparison):', {
      error: error.message,
      userId
    });
    throw new functions.https.HttpsError('internal', 'Peer comparison query failed: ' + error.message);
  }
});

// ✅ 4. GET SUBJECT-SPECIFIC RECOMMENDATIONS (BONUS)
exports.getSubjectRecommendations = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  }

  const { userId, subject } = data;

  if (!subject) {
    throw new functions.https.HttpsError('invalid-argument', 'Subject is required');
  }

  if (context.auth.uid !== userId && !context.auth.token?.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Unauthorized');
  }

  const query = `
    WITH subject_documents AS (
      SELECT
        data.documentId,
        data.documentTitle,
        COUNT(DISTINCT data.userId) as popularity,
        AVG(CAST(data.progressPercentage AS FLOAT64)) as avg_completion,
        AVG(CAST(data.totalTime AS INT64)) as avg_time,
        MAX(timestamp) as last_studied
      FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.studySessions_raw_latest\`
      WHERE data.subject = @subject
        AND data.documentTitle IS NOT NULL
        AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 90 DAY)
      GROUP BY data.documentId, data.documentTitle
      HAVING popularity >= 2
    ),
    user_completed_docs AS (
      SELECT DISTINCT data.documentId
      FROM \`${process.env.GCLOUD_PROJECT}.${DATASET}.studySessions_raw_latest\`
      WHERE data.userId = @userId
        AND data.subject = @subject
        AND CAST(data.progressPercentage AS FLOAT64) >= 80
    )
    SELECT
      sd.documentId,
      sd.documentTitle,
      sd.popularity as students_count,
      ROUND(sd.avg_completion, 1) as avg_completion_rate,
      ROUND(sd.avg_time, 0) as estimated_time_minutes,
      DATE_DIFF(CURRENT_DATE(), DATE(sd.last_studied), DAY) as days_since_studied,
      CASE
        WHEN sd.avg_completion >= 80 THEN 'Beginner-friendly'
        WHEN sd.avg_completion >= 60 THEN 'Intermediate'
        ELSE 'Advanced'
      END as difficulty_level,
      CASE
        WHEN sd.popularity >= 20 THEN '🔥 Trending'
        WHEN sd.avg_completion >= 80 THEN '⭐ High Success'
        ELSE '📚 Recommended'
      END as badge
    FROM subject_documents sd
    WHERE sd.documentId NOT IN (SELECT documentId FROM user_completed_docs)
    ORDER BY 
      (sd.popularity * 0.4 + sd.avg_completion * 0.6) DESC,
      sd.avg_completion DESC
    LIMIT 10
  `;

  const options = {
    query: query,
    params: { userId, subject },
    location: LOCATION,
    timeout: 30000
  };

  try {
    const [rows] = await bigquery.query(options);
    
    console.log(`✅ Subject recommendations retrieved for ${subject}: ${rows.length} documents`);
    
    return rows || [];
  } catch (error) {
    console.error('BigQuery Error (getSubjectRecommendations):', {
      error: error.message,
      userId,
      subject
    });
    throw new functions.https.HttpsError('internal', 'Subject recommendations query failed: ' + error.message);
  }
});
