// functions/index.js - 🏆 PRODUCTION-READY FIREBASE FUNCTIONS 2025
// ==================== LOAD ENVIRONMENT FIRST ====================
require('dotenv').config();

// ==================== IMPORTS ====================
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { VertexAI } = require('@google-cloud/vertexai');
const cors = require('cors')({ origin: true });
const { BigQuery } = require('@google-cloud/bigquery');

// Kafka Import
const { publishEvent } = require('./services/kafkaService');

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();
const bigqueryClient = new BigQuery();

// Import BigQuery tracking functions
const {
  trackQuizCompletion,
  trackStudySession,
  trackDocumentUpload
} = require('./bigquery/tracker');

// ==================== CONFIGURATION ====================
const CONFIG = {
  VERTEX_AI: {
    PROJECT_ID: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || functions.config()?.vertexai?.projectid,
    LOCATION: process.env.VERTEX_AI_LOCATION || functions.config()?.vertexai?.location || 'us-central1',
    MODEL: 'gemini-pro'
  },
  BIGQUERY: {
    DATASET: 'studygloqe_analytics',
    TABLES: {
      STUDY_SESSIONS: 'study_sessions',
      QUIZ_COMPLETIONS: 'quiz_completions',
      USER_EVENTS: 'user_events'
    }
  },
  CORS: {
    ALLOWED_ORIGINS: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:5173',
      'https://studygloqe.web.app',
      'https://studygloqe.firebaseapp.com'
    ]
  },
  TIMEOUTS: {
    DEFAULT: 60,
    LONG: 300,
    AI: 540
  }
};

// ==================== CORS WRAPPER ====================
const corsWrapper = (handler) => {
  return async (req, res) => {
    // Set CORS headers
    const origin = req.headers.origin;
    if (CONFIG.CORS.ALLOWED_ORIGINS.includes(origin)) {
      res.set('Access-Control-Allow-Origin', origin);
    }
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.set('Access-Control-Max-Age', '3600');

    // Handle preflight
    if (req.method === 'OPTIONS') {
      return res.status(204).send('');
    }

    return cors(req, res, () => handler(req, res));
  };
};

// ==================== VERTEX AI INITIALIZATION ====================
const getVertexAI = () => {
  const projectId = CONFIG.VERTEX_AI.PROJECT_ID;
  const location = CONFIG.VERTEX_AI.LOCATION;

  console.log(`Initializing Vertex AI - Project: ${projectId}, Location: ${location}`);

  return new VertexAI({
    project: projectId,
    location: location
  });
};

const vertexai = getVertexAI();

// ==================== HELPER FUNCTIONS ====================

/**
 * Detect subject from filename
 */
function detectSubjectFromFilename(fileName) {
  if (!fileName) return 'General';

  const lowerName = fileName.toLowerCase();
  const patterns = {
    'Mathematics': ['math', 'calculus', 'algebra', 'geometry', 'trigonometry', 'statistics'],
    'Physics': ['physics', 'mechanics', 'quantum', 'thermodynamics', 'optics'],
    'Chemistry': ['chemistry', 'organic', 'inorganic', 'chemical', 'biochemistry'],
    'Biology': ['biology', 'genetics', 'anatomy', 'botany', 'zoology', 'physiology'],
    'Computer Science': ['cs', 'programming', 'algorithm', 'software', 'coding', 'java', 'python', 'javascript'],
    'Data Science': ['data science', 'machine learning', 'ml', 'data analysis'],
    'Artificial Intelligence': ['ai', 'artificial intelligence', 'neural network', 'deep learning'],
    'Engineering': ['engineering', 'mechanical', 'electrical', 'civil'],
    'Economics': ['economics', 'macro', 'micro', 'econometrics'],
    'Finance': ['finance', 'investment', 'banking', 'accounting'],
    'Business': ['business', 'management', 'marketing', 'entrepreneurship'],
    'Psychology': ['psychology', 'cognitive', 'behavioral'],
    'History': ['history', 'historical', 'ancient', 'modern history'],
    'Literature': ['literature', 'english', 'novel', 'poetry', 'shakespeare'],
    'Law': ['law', 'legal', 'constitution', 'judiciary'],
    'Medicine': ['medicine', 'medical', 'clinical', 'pathology']
  };

  for (const [subject, keywords] of Object.entries(patterns)) {
    if (keywords.some(keyword => lowerName.includes(keyword))) {
      console.log(`Filename-based detection: ${subject} for ${fileName}`);
      return subject;
    }
  }

  return 'General';
}

/**
 * Validate required fields
 */
function validateFields(data, requiredFields) {
  const missing = requiredFields.filter(field => !data[field]);
  if (missing.length > 0) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      `Missing required fields: ${missing.join(', ')}`
    );
  }
}

/**
 * Safe field value - removes undefined
 */
function safeValue(value, defaultValue = null) {
  return value !== undefined && value !== null ? value : defaultValue;
}

// ==================== KAFKA TEST ENDPOINT ====================

/**
 * Test Kafka connection
 * Usage: GET https://your-region-your-project.cloudfunctions.net/testKafka
 */
exports.testKafka = functions.https.onRequest(corsWrapper(async (req, res) => {
  try {
    console.log('Testing Kafka connection...');

    const result = await publishEvent('quiz-events', {
      type: 'test.connection',
      userId: 'test-user-123',
      message: 'Hello from StudyGloqe Firebase!',
      timestamp: new Date().toISOString(),
      testData: {
        source: 'firebase-functions',
        environment: process.env.NODE_ENV || 'production',
        project: process.env.GOOGLE_CLOUD_PROJECT
      }
    });

    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Kafka message sent successfully!',
        topic: 'studygloqe-quiz-events',
        timestamp: new Date().toISOString(),
        environment: {
          hasBootstrapServer: !!process.env.CONFLUENT_BOOTSTRAP_SERVER,
          hasApiKey: !!process.env.CONFLUENT_API_KEY,
          hasApiSecret: !!process.env.CONFLUENT_API_SECRET
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        message: 'Failed to send Kafka message'
      });
    }
  } catch (error) {
    console.error('Test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}));

// ==================== KAFKA INTEGRATION - QUIZ EVENTS ====================

/**
 * Publish quiz completion event to Kafka
 */
exports.publishQuizEvent = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const { quizId, sessionId, score, subject, correctAnswers, totalQuestions, timeTaken } = data;

  try {
    await publishEvent('quiz-events', {
      type: 'quiz.completed',
      userId: context.auth.uid,
      quizId: safeValue(quizId),
      sessionId: safeValue(sessionId),
      score: safeValue(score, 0),
      subject: safeValue(subject, 'General'),
      correctAnswers: safeValue(correctAnswers, 0),
      totalQuestions: safeValue(totalQuestions, 0),
      timeTaken: safeValue(timeTaken, 0),
      completedAt: new Date().toISOString(),
      metadata: {
        userEmail: context.auth.token.email || 'unknown'
      }
    });

    console.log(`Quiz event published to Kafka for user ${context.auth.uid}`);
    return { success: true, message: 'Quiz event published to Kafka' };
  } catch (error) {
    console.error('Failed to publish quiz event:', error);
    throw new functions.https.HttpsError('internal', `Failed to publish quiz event: ${error.message}`);
  }
});

// ==================== KAFKA INTEGRATION - STUDY SESSIONS ====================

/**
 * Publish study session to Kafka
 */
exports.publishStudySession = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const { sessionId, documentId, documentTitle, subject, duration, status } = data;

  try {
    await publishEvent('study-sessions', {
      type: 'session.completed',
      userId: context.auth.uid,
      sessionId: safeValue(sessionId),
      documentId: safeValue(documentId),
      documentTitle: safeValue(documentTitle, 'Untitled'),
      subject: safeValue(subject, 'General'),
      duration: safeValue(duration, 0),
      status: safeValue(status, 'completed'),
      completedAt: new Date().toISOString(),
      metadata: {
        userEmail: context.auth.token.email || 'unknown'
      }
    });

    console.log(`Study session published to Kafka for user ${context.auth.uid}`);
    return { success: true, message: 'Study session published to Kafka' };
  } catch (error) {
    console.error('Failed to publish study session:', error);
    throw new functions.https.HttpsError('internal', `Failed to publish study session: ${error.message}`);
  }
});

// ==================== KAFKA INTEGRATION - ACHIEVEMENTS ====================

/**
 * Publish achievement to Kafka
 */
exports.publishAchievement = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const { achievementType, xpEarned, badgeUnlocked, level } = data;

  try {
    await publishEvent('achievements', {
      type: 'achievement.unlocked',
      userId: context.auth.uid,
      achievementType: safeValue(achievementType, 'unknown'),
      xpEarned: safeValue(xpEarned, 0),
      badgeUnlocked: safeValue(badgeUnlocked),
      level: safeValue(level, 1),
      unlockedAt: new Date().toISOString(),
      metadata: {
        userEmail: context.auth.token.email || 'unknown'
      }
    });

    console.log(`Achievement published to Kafka for user ${context.auth.uid}`);
    return { success: true, message: 'Achievement published to Kafka' };
  } catch (error) {
    console.error('Failed to publish achievement:', error);
    throw new functions.https.HttpsError('internal', `Failed to publish achievement: ${error.message}`);
  }
});

// ==================== KAFKA INTEGRATION - ANALYTICS EVENTS ====================

/**
 * Publish analytics event to Kafka
 */
exports.publishAnalyticsEvent = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const { eventType, eventData } = data;

  try {
    await publishEvent('analytics', {
      type: safeValue(eventType, 'analytics.event'),
      userId: context.auth.uid,
      ...eventData,
      timestamp: new Date().toISOString(),
      metadata: {
        userEmail: context.auth.token.email || 'unknown'
      }
    });

    console.log(`Analytics event published to Kafka for user ${context.auth.uid}`);
    return { success: true, message: 'Analytics event published to Kafka' };
  } catch (error) {
    console.error('Failed to publish analytics event:', error);
    throw new functions.https.HttpsError('internal', `Failed to publish analytics event: ${error.message}`);
  }
});

// ==================== KAFKA GENERIC PRODUCER (Single) ====================

exports.produceKafkaEvent = functions
  .runWith({ timeoutSeconds: CONFIG.TIMEOUTS.DEFAULT })
  .https.onRequest(corsWrapper(async (req, res) => {
    try {
      // Verify authentication
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const idToken = authHeader.split('Bearer ')[1];
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const userId = decodedToken.uid;

      const { topic, event } = req.body;

      if (!topic || !event) {
        return res.status(400).json({ error: 'Missing topic or event' });
      }

      // Parse event if string
      const eventData = typeof event.value === 'string' ? JSON.parse(event.value) : event.value || event;

      // Enforce user identity
      const enrichedEvent = {
        ...eventData,
        userId: userId,
        metadata: {
          ...eventData.metadata,
          userEmail: decodedToken.email || 'unknown',
          source: 'web-client',
          timestamp: new Date().toISOString()
        }
      };

      console.log(`Producing generic event to ${topic} for user ${userId}`);
      await publishEvent(topic, enrichedEvent);

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Failed to produce generic Kafka event:', error);
      return res.status(500).json({ error: error.message });
    }
  }));

// ==================== KAFKA GENERIC PRODUCER (Batch) ====================

exports.produceKafkaEvents = functions
  .runWith({ timeoutSeconds: CONFIG.TIMEOUTS.LONG })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    }

    const batches = data; // { topic: [{ key, value, ... }] }

    if (!batches) {
      return { success: true, count: 0 };
    }

    try {
      const promises = [];
      let count = 0;

      for (const [topic, items] of Object.entries(batches)) {
        for (const item of items) {
          let eventObj;
          try {
            // value comes as stringified JSON from frontend kafkaProducer
            eventObj = typeof item.value === 'string' ? JSON.parse(item.value) : item.value;
          } catch (e) {
            eventObj = { raw: item.value };
          }

          // Enforce security metadata
          eventObj.userId = context.auth.uid;
          eventObj.metadata = {
            ...eventObj.metadata,
            batchProcessed: true,
            processedAt: new Date().toISOString()
          };

          promises.push(publishEvent(topic, eventObj));
          count++;
        }
      }

      await Promise.all(promises);
      console.log(`Produced batch of ${count} events to Kafka for ${context.auth.uid}`);

      return { success: true, count };
    } catch (error) {
      console.error('Failed to produce batch Kafka events:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  });

// ==================== STUDY SESSION BIGQUERY SYNC ====================

exports.syncStudySessionToBigQuery = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

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
  } = data;

  // Validation
  if (!userId || !sessionId || !totalMinutes) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Missing required fields: userId, sessionId, totalMinutes'
    );
  }

  if (totalMinutes < 1 || totalMinutes > 720) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      `Invalid totalMinutes: ${totalMinutes}. Must be between 1-720`
    );
  }

  try {
    console.log(`Syncing session ${sessionId} to BigQuery`, { userId, totalMinutes, subject });

    const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
    const datasetId = CONFIG.BIGQUERY.DATASET;
    const tableId = CONFIG.BIGQUERY.TABLES.STUDY_SESSIONS;

    const row = {
      session_id: safeValue(sessionId),
      user_id: safeValue(userId),
      document_id: safeValue(documentId),
      document_title: safeValue(documentTitle, 'Untitled'),
      subject: safeValue(subject, 'General Studies'),
      start_time: safeValue(startTime),
      end_time: safeValue(endTime),
      total_minutes: safeValue(totalMinutes, 0),
      status: safeValue(status, 'completed'),
      sync_timestamp: new Date().toISOString()
    };

    await bigqueryClient
      .dataset(datasetId)
      .table(tableId)
      .insert([row]);

    console.log(`Session ${sessionId} synced successfully to BigQuery`);

    // Also publish to Kafka
    await publishEvent('study-sessions', {
      type: 'session.synced',
      ...row,
      timestamp: new Date().toISOString()
    });

    return {
      success: true,
      sessionId,
      totalMinutes,
      message: 'Study session synced to BigQuery and Kafka'
    };
  } catch (error) {
    console.error('BigQuery sync error:', error);

    // Check if it's a duplicate error
    if (error.message && error.message.includes('already exists')) {
      console.warn(`Session ${sessionId} already in BigQuery`);
      return {
        success: true,
        sessionId,
        message: 'Session already synced (duplicate)'
      };
    }

    throw new functions.https.HttpsError('internal', `Failed to sync to BigQuery: ${error.message}`);
  }
});

// ==================== GET STUDY TIME FROM BIGQUERY ====================

exports.getStudyTimeBigQuery = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const { userId, timeframe = 30 } = data;

  if (!userId) {
    throw new functions.https.HttpsError('invalid-argument', 'userId is required');
  }

  try {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;

    const query = `
      SELECT
        DATE(start_time) as date,
        SUM(total_minutes) as total_minutes,
        COUNT(*) as session_count,
        STRING_AGG(DISTINCT subject, ', ') as subjects
      FROM \`${projectId}.${CONFIG.BIGQUERY.DATASET}.${CONFIG.BIGQUERY.TABLES.STUDY_SESSIONS}\`
      WHERE user_id = @userId
        AND start_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @timeframe DAY)
        AND status = 'completed'
      GROUP BY date
      ORDER BY date DESC
    `;

    const options = {
      query,
      params: { userId, timeframe: parseInt(timeframe) },
      location: 'asia-south1'
    };

    const [rows] = await bigqueryClient.query(options);

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
    console.error('Error fetching study time from BigQuery:', error);
    throw new functions.https.HttpsError('internal', `Failed to fetch study time: ${error.message}`);
  }
});

// ==================== DOCUMENT PROCESSING - WITH BIGQUERY & KAFKA ====================

exports.processDocumentEnhanced = functions.firestore
  .document('documents/{docId}')
  .onCreate(async (snap, context) => {
    const docData = snap.data();
    const userId = docData.userId || docData.uploaderId; // Handle both

    try {
      console.log(`Processing Document ${snap.id} for User ${userId}`);

      let subject = 'General';
      let detectionMethod = 'none';

      // 1. SMART SUBJECT DETECTION

      // If user provided context, respect it (Ground Truth)
      if (docData.subjectDetectionMethod === 'user_context' && docData.subject) {
        subject = docData.subject;
        detectionMethod = 'user_context';
        console.log(`Using user-provided context for subject: ${subject}`);
      }
      // Otherwise, use AI or Fallback
      else if (docData.extractedText && docData.extractedText.length > 50) {
        console.log(`Running AI subject detection for document ${snap.id}`);

        try {
          const model = vertexai.preview.getGenerativeModel({
            model: CONFIG.VERTEX_AI.MODEL,
            generationConfig: {
              maxOutputTokens: 50,
              temperature: 0.2
            }
          });

          const prompt = `Analyze and classify this academic document into ONE subject. Return ONLY the subject name.

Available: Mathematics, Physics, Chemistry, Biology, Computer Science, Data Science, AI, Engineering, Economics, Business, Finance, Psychology, Sociology, History, Geography, Literature, Philosophy, Law, Medicine, Environmental Science, Statistics, General

Filename: ${docData.fileName || docData.title}
Text sample: ${docData.extractedText.substring(0, 2000)}

Subject:`;

          const result = await model.generateContent(prompt);
          subject = result.response.text().trim().split('\n')[0].replace(/"/g, '');
          detectionMethod = 'ai';
          console.log(`AI detected subject: ${subject}`);
        } catch (aiError) {
          console.error('AI detection failed, using filename fallback:', aiError);
          subject = detectSubjectFromFilename(docData.fileName || docData.title);
          detectionMethod = 'fallback';
        }
      } else {
        subject = detectSubjectFromFilename(docData.fileName || docData.title);
        detectionMethod = 'fallback';
      }

      // Update Document with finalized Subject and Status
      await snap.ref.update({
        subject,
        subjectDetectionMethod: detectionMethod,
        status: 'completed',
        aiProcessedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // 2. AUTO-GENERATION (Smart Content)
      if (docData.autoGenerationRequested && docData.extractedText) {
        console.log('Auto-generation requested:', docData.autoGenerationRequested);

        const { quiz, flashcards } = docData.autoGenerationRequested;

        const model = vertexai.preview.getGenerativeModel({
          model: CONFIG.VERTEX_AI.MODEL
        });

        // A. Generate QUIZ
        if (quiz) {
          try {
            console.log('Auto-generating Quiz...');

            const quizPrompt = `Generate 5 multiple choice questions from the following text. Focus on key concepts. Format as JSON array with properties: stem, choices[], correctAnswer (index 0-3), explanation.

Text Context (${subject}): ${docData.extractedText.substring(0, 3000)}`;

            const result = await model.generateContent(quizPrompt);
            const textResponse = result.response.text().replace(/``````\n?/g, '').trim();
            const questions = JSON.parse(textResponse);

            await db.collection('quizzes').add({
              title: `Review: ${docData.title}`,
              docId: snap.id,
              createdBy: userId,
              questions: questions.map((q, i) => ({
                id: `q${i + 1}`,
                ...q,
                points: 10
              })),
              totalPoints: questions.length * 10,
              subject: subject,
              folderId: docData.folderId || null,
              isAutoGenerated: true,
              createdAt: admin.firestore.FieldValue.serverTimestamp()
            });

            console.log('Auto-generated Quiz created');
          } catch (e) {
            console.error('Failed to auto-generate quiz:', e);
          }
        }

        // B. Generate FLASHCARDS
        if (flashcards) {
          try {
            console.log('Auto-generating Flashcards...');

            const fcPrompt = `Generate 8 flashcards (Concept → Definition) from the text. Format as JSON array: [{ front, back }].

Text Context (${subject}): ${docData.extractedText.substring(0, 3000)}`;

            const result = await model.generateContent(fcPrompt);
            const textResponse = result.response.text().replace(/``````\n?/g, '').trim();
            const cards = JSON.parse(textResponse);

            const batch = db.batch();
            cards.forEach(card => {
              const ref = db.collection('flashcards').doc();
              batch.set(ref, {
                ...card,
                userId,
                docId: snap.id,
                subject: subject,
                folderId: docData.folderId || null,
                box: 1,
                nextReview: admin.firestore.FieldValue.serverTimestamp(),
                createdAt: admin.firestore.FieldValue.serverTimestamp()
              });
            });

            await batch.commit();
            console.log('Auto-generated Flashcards created');
          } catch (e) {
            console.error('Failed to auto-generate flashcards:', e);
          }
        }
      }

      // 3. TRACKING & ANALYTICS

      // Track in BigQuery
      await trackDocumentUpload(userId, {
        id: snap.id,
        title: docData.title,
        fileName: docData.fileName,
        subject
      });

      // Publish to Kafka
      await publishEvent('analytics', {
        type: 'document.uploaded',
        userId,
        documentId: snap.id,
        documentTitle: docData.title,
        fileName: docData.fileName,
        subject,
        detectionMethod,
        timestamp: new Date().toISOString()
      });

      // Award XP
      const gamificationRef = db.collection('gamification').doc(userId);
      await gamificationRef.set({
        xp: admin.firestore.FieldValue.increment(20),
        pointsHistory: admin.firestore.FieldValue.arrayUnion({
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          points: 20,
          reason: 'document-upload'
        })
      }, { merge: true });

      console.log(`Document ${snap.id} processed successfully`);
      return { success: true, subject };

    } catch (error) {
      console.error('Error processing document:', error);
      await snap.ref.update({
        status: 'failed',
        error: error.message
      });
      throw error;
    }
  });

// ==================== QUIZ GENERATION ====================

exports.generateQuiz = functions
  .runWith({ timeoutSeconds: CONFIG.TIMEOUTS.AI })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated to generate quiz');
    }

    const { docId, numQuestions = 10, difficulty = 'medium' } = data;

    try {
      const docRef = db.collection('documents').doc(docId);
      const docSnap = await docRef.get();

      if (!docSnap.exists()) {
        throw new functions.https.HttpsError('not-found', 'Document not found');
      }

      const pagesSnap = await docRef.collection('pages').get();
      const text = pagesSnap.docs.map(doc => doc.data().text).join('\n');

      const model = vertexai.preview.getGenerativeModel({
        model: CONFIG.VERTEX_AI.MODEL
      });

      const prompt = `Generate ${numQuestions} multiple choice questions from the following text. Difficulty: ${difficulty}. Format as JSON array with: stem, choices[], correctAnswer (index), explanation, tags[].

Text: ${text.substring(0, 5000)}`;

      const result = await model.generateContent(prompt);
      const questions = JSON.parse(result.response.text());

      const quizRef = await db.collection('quizzes').add({
        title: `Quiz: ${docSnap.data().title}`,
        docId: docId,
        createdBy: context.auth.uid,
        questions: questions.map((q, index) => ({
          id: `q${index + 1}`,
          ...q,
          points: 10
        })),
        totalPoints: numQuestions * 10,
        isTeacherCreated: false,
        assignedTo: [],
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      const gamificationRef = db.collection('gamification').doc(context.auth.uid);
      await gamificationRef.update({
        xp: admin.firestore.FieldValue.increment(10),
        pointsHistory: admin.firestore.FieldValue.arrayUnion({
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          points: 10,
          reason: 'quiz-generated'
        })
      });

      console.log(`Quiz generated and 10 XP awarded to ${context.auth.uid}`);

      return {
        quizId: quizRef.id,
        numQuestions: questions.length
      };
    } catch (error) {
      console.error('Error generating quiz:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  });

// ==================== GAMIFICATION - WITH BIGQUERY & KAFKA TRACKING ====================

exports.awardXPOnQuizComplete = functions.firestore
  .document('quizSessions/{sessionId}')
  .onCreate(async (snap, context) => {
    const sessionData = snap.data();
    const userId = sessionData.userId;

    if (!sessionData.endTs) return null;

    try {
      const answers = sessionData.answers || {};
      const answerKeys = Object.keys(answers);
      let correctAnswers = 0;

      answerKeys.forEach(key => {
        if (answers[key].answer === 0) correctAnswers++;
      });

      const score = sessionData.score || 0;
      const xpEarned = Math.max(Math.round(score * 10), 5);

      // Track in BigQuery
      await trackQuizCompletion({
        sessionId: snap.id,
        quizId: sessionData.quizId,
        subject: sessionData.subject,
        score,
        correctAnswers,
        totalQuestions: answerKeys.length,
        timeTaken: sessionData.duration || 0
      }, userId);

      // Publish to Kafka
      await publishEvent('quiz-events', {
        type: 'quiz.completed',
        userId,
        sessionId: snap.id,
        quizId: sessionData.quizId,
        subject: sessionData.subject,
        score,
        correctAnswers,
        totalQuestions: answerKeys.length,
        xpEarned,
        timestamp: new Date().toISOString()
      });

      const gamificationRef = db.collection('gamification').doc(userId);
      await gamificationRef.update({
        xp: admin.firestore.FieldValue.increment(xpEarned),
        pointsHistory: admin.firestore.FieldValue.arrayUnion({
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          points: xpEarned,
          reason: 'quiz-completed',
          sessionId: snap.id,
          score: score
        })
      });

      console.log(`${xpEarned} XP awarded to ${userId} for quiz completion (score: ${score}%)`);

      return { success: true, xpEarned };
    } catch (error) {
      console.error('Error awarding XP:', error);
      return null;
    }
  });

// Track Study Session Completion
exports.trackStudySessionComplete = functions.firestore
  .document('studySessions/{sessionId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Only track when status changes to completed
    if (before.status !== 'completed' && after.status === 'completed') {
      await trackStudySession({
        id: context.params.sessionId,
        ...after
      }, after.userId);

      // Publish to Kafka
      await publishEvent('study-sessions', {
        type: 'session.completed',
        userId: after.userId,
        sessionId: context.params.sessionId,
        documentId: after.documentId,
        subject: after.subject,
        duration: after.duration || after.totalTime,
        timestamp: new Date().toISOString()
      });

      console.log(`Study session tracked in BigQuery and Kafka: ${context.params.sessionId}`);
    }

    return null;
  });

exports.checkLevelUp = functions.firestore
  .document('gamification/{userId}')
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const oldData = change.before.data();
    const userId = context.params.userId;

    const oldLevel = oldData.level || 1;
    const newXP = newData.xp || 0;
    const newLevel = Math.floor(newXP / 300) + 1;

    if (newLevel > oldLevel) {
      console.log(`User ${userId} leveled up from ${oldLevel} to ${newLevel}!`);

      await change.after.ref.update({
        level: newLevel,
        badges: admin.firestore.FieldValue.arrayUnion(`level-${newLevel}`),
        xp: admin.firestore.FieldValue.increment(50),
        pointsHistory: admin.firestore.FieldValue.arrayUnion({
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          points: 50,
          reason: 'level-up-bonus',
          level: newLevel
        })
      });

      await db.collection('users').doc(userId).update({
        level: newLevel,
        xp: newXP + 50
      });

      await db.collection('notifications').add({
        userId,
        type: 'level-up',
        title: 'Level Up!',
        message: `Congratulations! You've reached Level ${newLevel}!`,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Publish to Kafka
      await publishEvent('achievements', {
        type: 'level.up',
        userId,
        oldLevel,
        newLevel,
        bonusXP: 50,
        timestamp: new Date().toISOString()
      });

      return { leveledUp: true, newLevel };
    }

    return null;
  });

// ==================== AI UTILITIES ====================

exports.detectSubject = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { text, fileName } = data;

  try {
    if (!text || text.length < 50) {
      const fallbackSubject = detectSubjectFromFilename(fileName);
      return {
        subject: fallbackSubject,
        confidence: 'low',
        method: 'fallback'
      };
    }

    const model = vertexai.preview.getGenerativeModel({
      model: CONFIG.VERTEX_AI.MODEL,
      generationConfig: {
        maxOutputTokens: 50,
        temperature: 0.2
      }
    });

    const prompt = `Analyze this academic document and classify it into ONE subject category. Return ONLY the subject name, nothing else.

Available subjects: Mathematics, Physics, Chemistry, Biology, Computer Science, Data Science, Artificial Intelligence, Engineering, Mechanical Engineering, Electrical Engineering, Civil Engineering, Economics, Business, Finance, Accounting, Psychology, Sociology, Political Science, History, Geography, Literature, English, Philosophy, Law, Medicine, Nursing, Environmental Science, Statistics, General

Filename: ${fileName || 'unknown'}
Document text (first 2000 characters): ${text.substring(0, 2000)}

Subject (single word or short phrase only):`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    let subject = response.text().trim();

    // Clean up response
    subject = subject.split('\n')[0].trim();
    subject = subject.replace(/"/g, '');

    console.log(`AI detected subject: ${subject} for file ${fileName}`);

    return {
      subject,
      confidence: 'high',
      method: 'ai'
    };
  } catch (error) {
    console.error('Error in AI subject detection:', error);
    const fallbackSubject = detectSubjectFromFilename(fileName);
    return {
      subject: fallbackSubject,
      confidence: 'low',
      method: 'fallback',
      error: error.message
    };
  }
});

exports.generateSummary = functions
  .runWith({ timeoutSeconds: CONFIG.TIMEOUTS.AI })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    }

    const { text, length = 'medium' } = data;

    try {
      const model = vertexai.preview.getGenerativeModel({
        model: CONFIG.VERTEX_AI.MODEL
      });

      const lengthInstructions = {
        short: '3-4 sentences',
        medium: '1 paragraph (5-7 sentences)',
        long: '2-3 paragraphs'
      };

      const prompt = `Summarize the following text in ${lengthInstructions[length]}. Make it clear and concise.

Text: ${text.substring(0, 5000)}

Summary:`;

      const result = await model.generateContent(prompt);
      const summary = result.response.text().trim();

      console.log(`Generated ${length} summary for user ${context.auth.uid}`);

      return summary;
    } catch (error) {
      console.error('Error generating summary:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  });

exports.explainText = functions
  .runWith({ timeoutSeconds: CONFIG.TIMEOUTS.AI })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    }

    const { text, action = 'explain' } = data;

    try {
      const model = vertexai.preview.getGenerativeModel({
        model: CONFIG.VERTEX_AI.MODEL
      });

      const prompts = {
        explain: `Explain this text in simple terms:\n\n${text}`,
        simplify: `Simplify this text for a beginner:\n\n${text}`,
        translate: `Translate this to Hindi:\n\n${text}`,
        examples: `Provide 2-3 examples to illustrate this concept:\n\n${text}`,
        mindmap: `Create a simple mind map structure (text-based) for this:\n\n${text}\n\nMap:`,
        quiz: `Generate 3 quick quiz questions about this:\n\n${text}\n\n(JSON format)`
      };

      const prompt = prompts[action] || prompts.explain;

      const result = await model.generateContent(prompt);
      const response = result.response.text().trim();

      console.log(`Generated ${action} for user ${context.auth.uid}`);

      return { response, action };
    } catch (error) {
      console.error('Error explaining text:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  });

// ==================== BIGQUERY-POWERED ANALYTICS ====================

exports.getAnalyticsBigQuery = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const { uid, timeframe = 30 } = data;
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;

  const query = `
    SELECT
      COALESCE(SUM(xp_earned), 0) as total_xp,
      COUNT(DISTINCT CASE WHEN event_type = 'quiz_complete' THEN event_id END) as total_quizzes,
      ROUND(AVG(CASE WHEN event_type = 'quiz_complete' THEN quiz_score END), 2) as avg_quiz_score,
      COALESCE(SUM(CASE WHEN event_type = 'study_session' THEN study_minutes END), 0) as total_study_minutes,
      COUNT(DISTINCT DATE(timestamp)) as active_days,
      COUNT(DISTINCT CASE WHEN event_type = 'document_upload' THEN event_id END) as documents_uploaded
    FROM \`${projectId}.${CONFIG.BIGQUERY.DATASET}.user_events\`
    WHERE user_id = @userId
      AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @days DAY)
  `;

  const options = {
    query,
    params: { userId: uid, days: timeframe },
    location: 'asia-south1'
  };

  try {
    const [rows] = await bigqueryClient.query(options);
    const result = rows[0] || {
      total_xp: 0,
      total_quizzes: 0,
      avg_quiz_score: 0,
      total_study_minutes: 0,
      active_days: 0,
      documents_uploaded: 0
    };

    const level = Math.floor(result.total_xp / 1000) + 1;

    return {
      bigQuery: {
        totalXP: parseInt(result.total_xp),
        level,
        nextLevelXP: level * 1000,
        totalQuizzes: parseInt(result.total_quizzes),
        avgScore: parseFloat(result.avg_quiz_score || 0),
        studyMinutes: parseInt(result.total_study_minutes),
        activeDays: parseInt(result.active_days),
        documentsRead: parseInt(result.documents_uploaded),
        xpFromQuizzes: parseInt(result.total_quizzes) * 100,
        xpFromStudy: parseInt(result.total_study_minutes),
        xpFromAchievements: 0,
        xpFromFlashcards: 0
      }
    };
  } catch (error) {
    console.error('BigQuery getAnalytics error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

exports.getTrendsBigQuery = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const { uid, timeframe = 7 } = data;
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;

  const query = `
    SELECT
      DATE(timestamp) as date,
      COALESCE(SUM(CASE WHEN event_type = 'study_session' THEN study_minutes END), 0) as study_minutes,
      COUNT(DISTINCT CASE WHEN event_type = 'quiz_complete' THEN event_id END) as quizzes_completed,
      ROUND(AVG(CASE WHEN event_type = 'quiz_complete' THEN quiz_score END), 2) as avg_score
    FROM \`${projectId}.${CONFIG.BIGQUERY.DATASET}.user_events\`
    WHERE user_id = @userId
      AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @days DAY)
    GROUP BY date
    ORDER BY date DESC
    LIMIT 7
  `;

  const options = {
    query,
    params: { userId: uid, days: timeframe },
    location: 'asia-south1'
  };

  try {
    const [rows] = await bigqueryClient.query(options);

    const trends = rows.map(row => ({
      date: { toMillis: () => new Date(row.date.value).getTime() },
      studyMinutes: parseInt(row.study_minutes || 0),
      quizzesCompleted: parseInt(row.quizzes_completed || 0),
      avgScore: parseFloat(row.avg_score || 0)
    }));

    return trends;
  } catch (error) {
    console.error('BigQuery getTrends error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

exports.getSubjectPerformanceBigQuery = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const { uid } = data;
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;

  const query = `
    SELECT
      quiz_subject as name,
      COUNT(*) as quiz_count,
      ROUND(AVG(quiz_score), 2) as score,
      SUM(correct_answers) as total_correct,
      SUM(total_questions) as total_questions
    FROM \`${projectId}.${CONFIG.BIGQUERY.DATASET}.user_events\`
    WHERE user_id = @userId
      AND event_type = 'quiz_complete'
      AND quiz_subject IS NOT NULL
    GROUP BY quiz_subject
    ORDER BY score DESC
  `;

  const options = {
    query,
    params: { userId: uid },
    location: 'asia-south1'
  };

  try {
    const [rows] = await bigqueryClient.query(options);

    const performance = rows.map(row => ({
      id: row.name,
      name: row.name,
      score: parseFloat(row.score || 0),
      quizCount: parseInt(row.quiz_count || 0)
    }));

    return performance;
  } catch (error) {
    console.error('BigQuery getSubjectPerformance error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// ==================== FIRESTORE ANALYTICS (LEGACY/FALLBACK) ====================

exports.getStudentAnalytics = functions.https.onRequest(corsWrapper(async (req, res) => {
  try {
    const userId = req.body.userId || req.query.userId;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const gamificationDoc = await db.collection('gamification').doc(userId).get();
    const userDoc = await db.collection('users').doc(userId).get();

    const gamificationData = gamificationDoc.exists() ? gamificationDoc.data() : {};
    const userInfo = userDoc.exists() ? userDoc.data() : {};

    const analyticsData = {
      totalXP: gamificationData.xp || 0,
      level: gamificationData.level || 1,
      nextLevelXP: (gamificationData.level || 1) * 300,
      streak: userInfo.streak || 0,
      badges: gamificationData.badges || [],
      totalPoints: gamificationData.xp || 0
    };

    console.log(`Analytics fetched for user ${userId}`);
    return res.status(200).json(analyticsData);
  } catch (error) {
    console.error('Error in getStudentAnalytics:', error);
    return res.status(500).json({
      error: error.message,
      details: 'Failed to fetch student analytics'
    });
  }
}));

exports.getQuizPerformance = functions.https.onRequest(corsWrapper(async (req, res) => {
  try {
    const userId = req.body.userId || req.query.userId;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const sessionsSnapshot = await db.collection('quizSessions')
      .where('userId', '==', userId)
      .limit(50)
      .get();

    if (sessionsSnapshot.empty) {
      return res.status(200).json({
        averageScore: 0,
        totalQuizzes: 0,
        subjectPerformance: [],
        recentScores: []
      });
    }

    const sessions = sessionsSnapshot.docs.map(doc => doc.data());

    const totalQuizzes = sessions.length;
    const totalScore = sessions.reduce((sum, s) => sum + (s.score || 0), 0);
    const averageScore = totalQuizzes > 0 ? totalScore / totalQuizzes : 0;

    const subjectScores = {};
    sessions.forEach(session => {
      const subject = session.subject || 'General';
      if (!subjectScores[subject]) {
        subjectScores[subject] = { total: 0, count: 0 };
      }
      subjectScores[subject].total += session.score || 0;
      subjectScores[subject].count += 1;
    });

    const subjectPerformance = Object.entries(subjectScores).map(([name, data]) => ({
      name,
      score: Math.round(data.total / data.count)
    }));

    const performanceData = {
      averageScore: Math.round(averageScore),
      totalQuizzes,
      subjectPerformance,
      recentScores: sessions.slice(0, 10).map(s => s.score || 0)
    };

    console.log(`Quiz performance fetched for user ${userId}`);
    return res.status(200).json(performanceData);
  } catch (error) {
    console.error('Error in getQuizPerformance:', error);
    return res.status(500).json({
      error: error.message,
      details: 'Failed to fetch quiz performance'
    });
  }
}));

exports.getStudyTimeStats = functions.https.onRequest(corsWrapper(async (req, res) => {
  try {
    const userId = req.body.userId || req.query.userId;
    const period = parseInt(req.body.period || req.query.period || 30);

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const sessionsSnapshot = await db.collection('studySessions')
      .where('userId', '==', userId)
      .limit(100)
      .get();

    if (sessionsSnapshot.empty) {
      return res.status(200).json({
        totalMinutes: 0,
        totalHours: 0,
        totalSessions: 0,
        avgSessionLength: 0,
        period
      });
    }

    const sessions = sessionsSnapshot.docs.map(doc => doc.data());

    const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration || s.totalTime || 0), 0);
    const totalSessions = sessions.length;
    const avgSessionLength = totalSessions > 0 ? totalMinutes / totalSessions : 0;

    const studyData = {
      totalMinutes,
      totalHours: Math.round(totalMinutes / 60),
      totalSessions,
      avgSessionLength: Math.round(avgSessionLength),
      period
    };

    console.log(`Study time stats fetched for user ${userId}`);
    return res.status(200).json(studyData);
  } catch (error) {
    console.error('Error in getStudyTimeStats:', error);
    return res.status(500).json({
      error: error.message,
      details: 'Failed to fetch study time stats'
    });
  }
}));

exports.getPerformanceTrends = functions.https.onRequest(corsWrapper(async (req, res) => {
  try {
    const userId = req.body.userId || req.query.userId;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const sessionsSnapshot = await db.collection('quizSessions')
      .where('userId', '==', userId)
      .limit(20)
      .get();

    if (sessionsSnapshot.empty) {
      return res.status(200).json({
        trend: 'stable',
        recentAverage: 0,
        previousAverage: 0,
        scores: []
      });
    }

    const sessions = sessionsSnapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          score: data.score || 0,
          date: data.createdAt ? data.createdAt.toDate() : new Date(),
          subject: data.subject || 'General'
        };
      })
      .sort((a, b) => b.date - a.date);

    const recentScores = sessions.slice(0, 5).map(s => s.score);
    const olderScores = sessions.slice(5, 10).map(s => s.score);

    const recentAvg = recentScores.length > 0
      ? recentScores.reduce((sum, s) => sum + s, 0) / recentScores.length
      : 0;

    const olderAvg = olderScores.length > 0
      ? olderScores.reduce((sum, s) => sum + s, 0) / olderScores.length
      : recentAvg;

    let trend = 'stable';
    if (recentAvg > olderAvg + 5) trend = 'improving';
    if (recentAvg < olderAvg - 5) trend = 'declining';

    const trendsData = {
      trend,
      recentAverage: Math.round(recentAvg),
      previousAverage: Math.round(olderAvg),
      scores: sessions.map(s => s.score)
    };

    console.log(`Performance trends fetched for user ${userId}`);
    return res.status(200).json(trendsData);
  } catch (error) {
    console.error('Error in getPerformanceTrends:', error);
    return res.status(500).json({
      error: error.message,
      details: 'Failed to fetch performance trends'
    });
  }
}));

exports.getPersonalizedRecommendations = functions.https.onRequest(corsWrapper(async (req, res) => {
  try {
    const userId = req.body.userId || req.query.userId;
    const limit = parseInt(req.body.limit || req.query.limit || 5);

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const sessionsSnapshot = await db.collection('quizSessions')
      .where('userId', '==', userId)
      .limit(10)
      .get();

    const recommendations = [];

    if (sessionsSnapshot.empty) {
      recommendations.push({
        title: 'Start Your Learning Journey',
        description: 'Take your first quiz to get personalized recommendations',
        action: 'Browse Quizzes',
        priority: 'high'
      });
      return res.status(200).json({ recommendations });
    }

    const sessions = sessionsSnapshot.docs.map(doc => doc.data());
    const avgScore = sessions.reduce((sum, s) => sum + (s.score || 0), 0) / sessions.length;

    if (avgScore < 60) {
      recommendations.push({
        title: 'Focus on Fundamentals',
        description: 'Review basic concepts to strengthen your foundation',
        action: 'View Study Materials',
        priority: 'high'
      });
    }

    if (sessions.length < 3) {
      recommendations.push({
        title: 'Practice More Quizzes',
        description: 'Take more quizzes to improve your skills',
        action: 'Browse Quizzes',
        priority: 'medium'
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        title: 'Keep Up the Great Work!',
        description: 'You\'re doing well! Continue practicing regularly',
        action: 'View Progress',
        priority: 'low'
      });
    }

    console.log(`Recommendations generated for user ${userId}`);
    return res.status(200).json({
      recommendations: recommendations.slice(0, limit)
    });
  } catch (error) {
    console.error('Error in getPersonalizedRecommendations:', error);
    return res.status(500).json({
      error: error.message,
      details: 'Failed to generate recommendations'
    });
  }
}));

exports.getLearningPatterns = functions.https.onRequest(corsWrapper(async (req, res) => {
  try {
    const userId = req.body.userId || req.query.userId;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const sessionsSnapshot = await db.collection('studySessions')
      .where('userId', '==', userId)
      .limit(100)
      .get();

    if (sessionsSnapshot.empty) {
      return res.status(200).json({
        bestStudyTime: 'Morning',
        avgSessionLength: 0,
        studyDaysPerWeek: 0,
        completionRate: 0,
        totalSessions: 0
      });
    }

    const sessions = sessionsSnapshot.docs.map(doc => doc.data());

    const hourlyDistribution = {};
    sessions.forEach(session => {
      const hour = session.startTime ? new Date(session.startTime).getHours() : 9;
      hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;
    });

    const bestHour = Object.entries(hourlyDistribution)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 9;

    const bestStudyTime = bestHour < 12 ? 'Morning' : bestHour < 17 ? 'Afternoon' : 'Evening';

    const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    const avgSessionLength = sessions.length > 0 ? totalMinutes / sessions.length : 0;

    const patternsData = {
      bestStudyTime,
      avgSessionLength: Math.round(avgSessionLength),
      studyDaysPerWeek: Math.min(Math.round(sessions.length / 4), 7),
      completionRate: 85,
      totalSessions: sessions.length
    };

    console.log(`Learning patterns fetched for user ${userId}`);
    return res.status(200).json(patternsData);
  } catch (error) {
    console.error('Error in getLearningPatterns:', error);
    return res.status(500).json({
      error: error.message,
      details: 'Failed to fetch learning patterns'
    });
  }
}));

// ==================== END OF FILE ====================

console.log('✅ StudyGloqe Firebase Functions loaded with Kafka integration!');
