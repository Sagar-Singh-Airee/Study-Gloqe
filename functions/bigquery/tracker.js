// functions/bigquery/tracker.js - DATA TRACKING TO BIGQUERY
const { BigQuery } = require('@google-cloud/bigquery');
const bigquery = new BigQuery();

const DATASET_ID = 'studygloqe_analytics';

// ==========================================
// HELPER: Insert event to BigQuery
// ==========================================
async function insertEvent(eventData) {
  const tableId = 'user_events';
  
  try {
    await bigquery
      .dataset(DATASET_ID)
      .table(tableId)
      .insert([eventData]);
    
    console.log(`✅ BigQuery: Event inserted - ${eventData.event_type}`);
    return { success: true };
  } catch (error) {
    console.error('❌ BigQuery insert error:', error);
    return { success: false, error: error.message };
  }
}

// ==========================================
// TRACK QUIZ COMPLETION
// ==========================================
async function trackQuizCompletion(sessionData, userId) {
  try {
    const eventData = {
      event_id: `quiz_${sessionData.sessionId}_${Date.now()}`,
      user_id: userId,
      event_type: 'quiz_complete',
      timestamp: new Date().toISOString(),
      
      quiz_id: sessionData.quizId || null,
      quiz_score: sessionData.score || 0,
      quiz_subject: sessionData.subject || 'General',
      correct_answers: sessionData.correctAnswers || 0,
      total_questions: sessionData.totalQuestions || 0,
      
      session_id: sessionData.sessionId,
      xp_earned: Math.max(Math.round((sessionData.score || 0) / 10), 5),
      level: null,
      badge_earned: null,
      
      study_minutes: null,
      document_id: null,
      
      device_type: 'web',
      browser: 'unknown'
    };
    
    await insertEvent(eventData);
    
    await bigquery
      .dataset(DATASET_ID)
      .table('quiz_sessions')
      .insert([{
        session_id: sessionData.sessionId,
        user_id: userId,
        quiz_id: sessionData.quizId || null,
        subject: sessionData.subject || 'General',
        score: sessionData.score || 0,
        correct_answers: sessionData.correctAnswers || 0,
        total_questions: sessionData.totalQuestions || 0,
        time_taken_seconds: sessionData.timeTaken || 0,
        completed_at: new Date().toISOString()
      }]);
    
    console.log(`✅ BigQuery: Quiz tracked for user ${userId}`);
  } catch (error) {
    console.error('❌ BigQuery trackQuizCompletion error:', error);
  }
}

// ==========================================
// TRACK STUDY SESSION
// ==========================================
async function trackStudySession(sessionData, userId) {
  try {
    const eventData = {
      event_id: `study_${sessionData.id}_${Date.now()}`,
      user_id: userId,
      event_type: 'study_session',
      timestamp: new Date().toISOString(),
      
      quiz_id: null,
      quiz_score: null,
      quiz_subject: null,
      correct_answers: null,
      total_questions: null,
      
      session_id: sessionData.id,
      study_minutes: sessionData.totalTime || sessionData.duration || 0,
      document_id: sessionData.documentId || null,
      
      xp_earned: sessionData.totalTime || sessionData.duration || 0,
      level: null,
      badge_earned: null,
      
      device_type: 'web',
      browser: 'unknown'
    };
    
    await insertEvent(eventData);
    
    await bigquery
      .dataset(DATASET_ID)
      .table('study_sessions')
      .insert([{
        session_id: sessionData.id,
        user_id: userId,
        document_id: sessionData.documentId || null,
        document_title: sessionData.documentTitle || 'Untitled',
        subject: sessionData.subject || 'General',
        start_time: sessionData.startTime?.toDate ? sessionData.startTime.toDate().toISOString() : new Date().toISOString(),
        end_time: sessionData.endTime?.toDate ? sessionData.endTime.toDate().toISOString() : new Date().toISOString(),
        duration_minutes: sessionData.totalTime || sessionData.duration || 0,
        status: sessionData.status || 'completed'
      }]);
    
    console.log(`✅ BigQuery: Study session tracked for user ${userId}`);
  } catch (error) {
    console.error('❌ BigQuery trackStudySession error:', error);
  }
}

// ==========================================
// TRACK DOCUMENT UPLOAD
// ==========================================
async function trackDocumentUpload(userId, documentData) {
  try {
    const eventData = {
      event_id: `doc_${documentData.id}_${Date.now()}`,
      user_id: userId,
      event_type: 'document_upload',
      timestamp: new Date().toISOString(),
      
      quiz_id: null,
      quiz_score: null,
      quiz_subject: null,
      correct_answers: null,
      total_questions: null,
      
      session_id: null,
      study_minutes: null,
      document_id: documentData.id,
      
      xp_earned: 20,
      level: null,
      badge_earned: null,
      
      device_type: 'web',
      browser: 'unknown'
    };
    
    await insertEvent(eventData);
    console.log(`✅ BigQuery: Document upload tracked for user ${userId}`);
  } catch (error) {
    console.error('❌ BigQuery trackDocumentUpload error:', error);
  }
}

module.exports = {
  trackQuizCompletion,
  trackStudySession,
  trackDocumentUpload,
  insertEvent
};
