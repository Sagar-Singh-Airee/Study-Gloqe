// functions/bigquery/tracker.js - EVENT TRACKING TO BIGQUERY
const { BigQuery } = require('@google-cloud/bigquery');
const functions = require('firebase-functions');

const bigquery = new BigQuery({
  projectId: process.env.GCLOUD_PROJECT
});

const DATASET = 'studygloqe_analytics';
const LOCATION = 'asia-south1'; // Mumbai region

// ==========================================
// HELPER: Insert event to BigQuery
// ==========================================
async function insertEvent(eventData, tableName = 'user_events') {
  try {
    // Validate required fields
    if (!eventData.event_id || !eventData.user_id || !eventData.event_type) {
      throw new Error('Missing required fields: event_id, user_id, or event_type');
    }

    await bigquery
      .dataset(DATASET)
      .table(tableName)
      .insert([eventData], {
        skipInvalidRows: false,
        ignoreUnknownValues: true,
        raw: false
      });
    
    console.log(`✅ BigQuery: Event inserted to ${tableName} - ${eventData.event_type}`, {
      eventId: eventData.event_id,
      userId: eventData.user_id,
      eventType: eventData.event_type
    });
    
    return { success: true, eventId: eventData.event_id };
  } catch (error) {
    console.error(`❌ BigQuery insert error (${tableName}):`, {
      error: error.message,
      eventType: eventData.event_type,
      userId: eventData.user_id,
      details: error.errors || error
    });
    
    return { 
      success: false, 
      error: error.message,
      details: error.errors
    };
  }
}

// ==========================================
// BATCH INSERT (More efficient for multiple events)
// ==========================================
async function insertBatchEvents(events, tableName = 'user_events') {
  try {
    if (!events || events.length === 0) {
      return { success: true, count: 0 };
    }

    await bigquery
      .dataset(DATASET)
      .table(tableName)
      .insert(events, {
        skipInvalidRows: true,
        ignoreUnknownValues: true,
        raw: false
      });
    
    console.log(`✅ BigQuery: Batch inserted ${events.length} events to ${tableName}`);
    return { success: true, count: events.length };
  } catch (error) {
    console.error(`❌ BigQuery batch insert error:`, error.message);
    return { success: false, error: error.message };
  }
}

// ==========================================
// 🎯 TRACK QUIZ COMPLETION (Cloud Function)
// ==========================================
exports.trackQuizCompletion = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  }

  const userId = context.auth.uid;
  const { sessionData } = data;

  if (!sessionData) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing sessionData');
  }

  try {
    const timestamp = new Date().toISOString();
    const sessionId = sessionData.sessionId || `quiz_${userId}_${Date.now()}`;
    const score = sessionData.score || 0;
    const totalQuestions = sessionData.totalQuestions || 0;
    const correctAnswers = sessionData.correctAnswers || 0;
    
    // Calculate XP: base 10 XP per correct answer, bonus for perfect score
    const baseXP = correctAnswers * 10;
    const bonusXP = (score === 100 && totalQuestions > 0) ? 50 : 0;
    const xpEarned = baseXP + bonusXP;

    // Event tracking
    const eventData = {
      event_id: `quiz_${sessionId}_${Date.now()}`,
      user_id: userId,
      event_type: 'quiz_complete',
      event_timestamp: timestamp,
      
      // Quiz specific
      quiz_id: sessionData.quizId || null,
      quiz_score: score,
      quiz_subject: sessionData.subject || 'General',
      correct_answers: correctAnswers,
      total_questions: totalQuestions,
      time_taken_seconds: sessionData.timeTaken || 0,
      
      // Session tracking
      session_id: sessionId,
      xp_earned: xpEarned,
      
      // Metadata
      class_id: sessionData.classId || null,
      document_id: sessionData.documentId || null,
      
      // Device info (if available)
      device_type: data.deviceType || 'web',
      user_agent: context.rawRequest?.headers?.['user-agent'] || 'unknown'
    };
    
    // Insert to user_events table
    const eventResult = await insertEvent(eventData, 'user_events');
    
    // Insert to quiz_attempts table (detailed quiz data)
    const quizData = {
      attempt_id: eventData.event_id,
      user_id: userId,
      quiz_id: sessionData.quizId || null,
      session_id: sessionId,
      subject: sessionData.subject || 'General',
      score: score,
      correct_answers: correctAnswers,
      total_questions: totalQuestions,
      time_taken_seconds: sessionData.timeTaken || 0,
      completed_at: timestamp,
      xp_earned: xpEarned,
      class_id: sessionData.classId || null,
      document_id: sessionData.documentId || null
    };
    
    await insertEvent(quizData, 'quiz_attempts');
    
    console.log(`✅ Quiz completion tracked for user ${userId}:`, {
      score,
      xpEarned,
      subject: sessionData.subject
    });
    
    return {
      success: true,
      eventId: eventData.event_id,
      xpEarned,
      timestamp
    };
  } catch (error) {
    console.error('❌ trackQuizCompletion error:', error);
    throw new functions.https.HttpsError('internal', 'Failed to track quiz: ' + error.message);
  }
});

// ==========================================
// 📚 TRACK STUDY SESSION (Cloud Function)
// ==========================================
exports.trackStudySession = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  }

  const userId = context.auth.uid;
  const { sessionData } = data;

  if (!sessionData) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing sessionData');
  }

  try {
    const timestamp = new Date().toISOString();
    const sessionId = sessionData.id || `study_${userId}_${Date.now()}`;
    const durationMinutes = Math.round(sessionData.totalTime || sessionData.duration || 0);
    
    // XP calculation: 1 XP per minute, capped at 100 per session
    const xpEarned = Math.min(durationMinutes, 100);

    // Event tracking
    const eventData = {
      event_id: `study_${sessionId}_${Date.now()}`,
      user_id: userId,
      event_type: 'study_session',
      event_timestamp: timestamp,
      
      // Study session specific
      session_id: sessionId,
      document_id: sessionData.documentId || null,
      document_title: sessionData.documentTitle || 'Untitled',
      subject: sessionData.subject || 'General',
      duration_minutes: durationMinutes,
      progress_percentage: sessionData.progressPercentage || 0,
      
      // XP tracking
      xp_earned: xpEarned,
      
      // Metadata
      class_id: sessionData.classId || null,
      status: sessionData.status || 'completed',
      
      // Device info
      device_type: data.deviceType || 'web',
      user_agent: context.rawRequest?.headers?.['user-agent'] || 'unknown'
    };
    
    // Insert to user_events table
    await insertEvent(eventData, 'user_events');
    
    // Insert to study_sessions table (detailed session data)
    const studyData = {
      session_id: sessionId,
      user_id: userId,
      document_id: sessionData.documentId || null,
      document_title: sessionData.documentTitle || 'Untitled',
      subject: sessionData.subject || 'General',
      class_id: sessionData.classId || null,
      start_time: sessionData.startTime || timestamp,
      end_time: sessionData.endTime || timestamp,
      duration_minutes: durationMinutes,
      progress_percentage: sessionData.progressPercentage || 0,
      status: sessionData.status || 'completed',
      xp_earned: xpEarned,
      completed_at: timestamp
    };
    
    await insertEvent(studyData, 'study_sessions');
    
    console.log(`✅ Study session tracked for user ${userId}:`, {
      duration: durationMinutes,
      xpEarned,
      subject: sessionData.subject
    });
    
    return {
      success: true,
      eventId: eventData.event_id,
      xpEarned,
      duration: durationMinutes,
      timestamp
    };
  } catch (error) {
    console.error('❌ trackStudySession error:', error);
    throw new functions.https.HttpsError('internal', 'Failed to track study session: ' + error.message);
  }
});

// ==========================================
// 📄 TRACK DOCUMENT UPLOAD (Cloud Function)
// ==========================================
exports.trackDocumentUpload = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  }

  const userId = context.auth.uid;
  const { documentData } = data;

  if (!documentData) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing documentData');
  }

  try {
    const timestamp = new Date().toISOString();
    const documentId = documentData.id || `doc_${userId}_${Date.now()}`;
    
    // Fixed XP for document upload
    const xpEarned = 20;

    const eventData = {
      event_id: `doc_${documentId}_${Date.now()}`,
      user_id: userId,
      event_type: 'document_upload',
      event_timestamp: timestamp,
      
      // Document specific
      document_id: documentId,
      document_title: documentData.title || 'Untitled',
      document_type: documentData.type || 'pdf',
      document_size_bytes: documentData.size || 0,
      subject: documentData.subject || 'General',
      
      // XP tracking
      xp_earned: xpEarned,
      
      // Metadata
      class_id: documentData.classId || null,
      
      // Device info
      device_type: data.deviceType || 'web',
      user_agent: context.rawRequest?.headers?.['user-agent'] || 'unknown'
    };
    
    // Insert to user_events table
    await insertEvent(eventData, 'user_events');
    
    // Insert to documents table
    const docData = {
      document_id: documentId,
      user_id: userId,
      title: documentData.title || 'Untitled',
      subject: documentData.subject || 'General',
      type: documentData.type || 'pdf',
      size_bytes: documentData.size || 0,
      class_id: documentData.classId || null,
      uploaded_at: timestamp,
      xp_earned: xpEarned
    };
    
    await insertEvent(docData, 'documents');
    
    console.log(`✅ Document upload tracked for user ${userId}:`, {
      documentId,
      title: documentData.title,
      xpEarned
    });
    
    return {
      success: true,
      eventId: eventData.event_id,
      xpEarned,
      timestamp
    };
  } catch (error) {
    console.error('❌ trackDocumentUpload error:', error);
    throw new functions.https.HttpsError('internal', 'Failed to track document upload: ' + error.message);
  }
});

// ==========================================
// 🎖️ TRACK ACHIEVEMENT UNLOCK (Bonus)
// ==========================================
exports.trackAchievementUnlock = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  }

  const userId = context.auth.uid;
  const { achievementData } = data;

  if (!achievementData) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing achievementData');
  }

  try {
    const timestamp = new Date().toISOString();
    
    const eventData = {
      event_id: `achievement_${achievementData.id}_${Date.now()}`,
      user_id: userId,
      event_type: 'achievement_unlock',
      event_timestamp: timestamp,
      
      achievement_id: achievementData.id,
      achievement_name: achievementData.name,
      achievement_type: achievementData.type || 'badge',
      xp_earned: achievementData.xp || 0,
      
      device_type: data.deviceType || 'web',
      user_agent: context.rawRequest?.headers?.['user-agent'] || 'unknown'
    };
    
    await insertEvent(eventData, 'user_events');
    
    console.log(`✅ Achievement tracked for user ${userId}:`, {
      achievement: achievementData.name
    });
    
    return {
      success: true,
      eventId: eventData.event_id,
      timestamp
    };
  } catch (error) {
    console.error('❌ trackAchievementUnlock error:', error);
    throw new functions.https.HttpsError('internal', 'Failed to track achievement: ' + error.message);
  }
});

// Export helper functions for internal use
module.exports = {
  trackQuizCompletion: exports.trackQuizCompletion,
  trackStudySession: exports.trackStudySession,
  trackDocumentUpload: exports.trackDocumentUpload,
  trackAchievementUnlock: exports.trackAchievementUnlock,
  insertEvent,
  insertBatchEvents
};
