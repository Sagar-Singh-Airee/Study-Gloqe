// functions/index.js - ADD THESE TWO FUNCTIONS

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { BigQuery } = require('@google-cloud/bigquery');
const { logger } = require('firebase-functions');

const bigquery = new BigQuery();
const DATASET_ID = 'studygloqe_analytics';
const TABLE_ID = 'study_sessions';

/**
 * Sync study session to BigQuery
 */
exports.syncStudySessionToBigQuery = onCall(async (request) => {
  const { 
    userId, 
    sessionId, 
    documentId, 
    documentTitle, 
    subject, 
    startTime, 
    endTime, 
    totalMinutes, 
    status 
  } = request.data;

  // Validation
  if (!userId || !sessionId || !totalMinutes) {
    throw new HttpsError(
      'invalid-argument',
      'Missing required fields: userId, sessionId, totalMinutes'
    );
  }

  if (totalMinutes < 1 || totalMinutes > 720) {
    throw new HttpsError(
      'invalid-argument',
      `Invalid totalMinutes: ${totalMinutes}. Must be between 1-720`
    );
  }

  try {
    logger.info(`📊 Syncing session ${sessionId} to BigQuery`, {
      userId,
      totalMinutes,
      subject
    });

    const row = {
      session_id: sessionId,
      user_id: userId,
      document_id: documentId || null,
      document_title: documentTitle || 'Untitled',
      subject: subject || 'General Studies',
      start_time: startTime,
      end_time: endTime,
      total_minutes: totalMinutes,
      status: status || 'completed',
      sync_timestamp: new Date().toISOString()
    };

    await bigquery
      .dataset(DATASET_ID)
      .table(TABLE_ID)
      .insert([row]);

    logger.info(`✅ Session ${sessionId} synced successfully`);

    return {
      success: true,
      sessionId,
      totalMinutes,
      message: 'Study session synced to BigQuery'
    };

  } catch (error) {
    logger.error('❌ BigQuery sync error:', error);
    
    // Check if it's a duplicate error
    if (error.message && error.message.includes('already exists')) {
      logger.warn(`⚠️ Session ${sessionId} already in BigQuery`);
      return {
        success: true,
        sessionId,
        message: 'Session already synced (duplicate)'
      };
    }

    throw new HttpsError('internal', `Failed to sync to BigQuery: ${error.message}`);
  }
});

/**
 * Get study time analytics from BigQuery
 */
exports.getStudyTimeBigQuery = onCall(async (request) => {
  const { userId, timeframe = 30 } = request.data;

  if (!userId) {
    throw new HttpsError('invalid-argument', 'userId is required');
  }

  try {
    const query = `
      SELECT 
        DATE(start_time) as date,
        SUM(total_minutes) as total_minutes,
        COUNT(*) as session_count,
        STRING_AGG(DISTINCT subject, ', ') as subjects
      FROM \`${DATASET_ID}.${TABLE_ID}\`
      WHERE user_id = @userId
        AND start_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @timeframe DAY)
        AND status = 'completed'
      GROUP BY date
      ORDER BY date DESC
    `;

    const options = {
      query,
      params: { userId, timeframe: parseInt(timeframe) }
    };

    const [rows] = await bigquery.query(options);

    const totalMinutes = rows.reduce((sum, row) => sum + parseInt(row.total_minutes || 0), 0);
    const totalSessions = rows.reduce((sum, row) => sum + parseInt(row.session_count || 0), 0);

    return {
      success: true,
      data: {
        totalMinutes,
        totalSessions,
        averagePerSession: totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0,
        dailyBreakdown: rows.map(row => ({
          date: row.date.value,
          totalMinutes: parseInt(row.total_minutes || 0),
          sessionCount: parseInt(row.session_count || 0),
          subjects: row.subjects
        }))
      }
    };

  } catch (error) {
    logger.error('Error fetching study time:', error);
    throw new HttpsError('internal', `Failed to fetch study time: ${error.message}`);
  }
});
