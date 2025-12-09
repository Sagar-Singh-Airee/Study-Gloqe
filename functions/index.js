// functions/index.js - COMPLETE WITH BIGQUERY INTEGRATION + STUDY SESSION SYNC
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { VertexAI } = require('@google-cloud/vertexai');
const cors = require('cors')({ origin: true });
const { BigQuery } = require('@google-cloud/bigquery');

admin.initializeApp();
const db = admin.firestore();
const bigqueryClient = new BigQuery();

// 🆕 Import BigQuery tracking functions
const {
  trackQuizCompletion,
  trackStudySession,
  trackDocumentUpload
} = require('./bigquery/tracker');

// ==========================================
// INITIALIZE VERTEX AI
// ==========================================
const getVertexAI = () => {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || 
                    process.env.GCLOUD_PROJECT || 
                    functions.config().vertexai?.project_id;
  
  const location = process.env.VERTEX_AI_LOCATION || 
                   functions.config().vertexai?.location || 
                   'us-central1';

  console.log(`🤖 Initializing Vertex AI - Project: ${projectId}, Location: ${location}`);

  return new VertexAI({
    project: projectId,
    location: location
  });
};

const vertex_ai = getVertexAI();

// ==========================================
// HELPER FUNCTIONS
// ==========================================
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
      console.log(`📝 Filename-based detection: ${subject} for ${fileName}`);
      return subject;
    }
  }

  return 'General';
}

// ==========================================
// 🆕 NEW: STUDY SESSION BIGQUERY SYNC
// ==========================================
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
    console.log(`📊 Syncing session ${sessionId} to BigQuery`, {
      userId,
      totalMinutes,
      subject
    });

    const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
    const datasetId = 'studygloqe_analytics';
    const tableId = 'study_sessions';

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

    await bigqueryClient
      .dataset(datasetId)
      .table(tableId)
      .insert([row]);

    console.log(`✅ Session ${sessionId} synced successfully to BigQuery`);

    return {
      success: true,
      sessionId,
      totalMinutes,
      message: 'Study session synced to BigQuery'
    };

  } catch (error) {
    console.error('❌ BigQuery sync error:', error);
    
    // Check if it's a duplicate error
    if (error.message && error.message.includes('already exists')) {
      console.warn(`⚠️ Session ${sessionId} already in BigQuery`);
      return {
        success: true,
        sessionId,
        message: 'Session already synced (duplicate)'
      };
    }

    throw new functions.https.HttpsError('internal', `Failed to sync to BigQuery: ${error.message}`);
  }
});

// 🆕 NEW: Get Study Time from BigQuery
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
      FROM \`${projectId}.studygloqe_analytics.study_sessions\`
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
    console.error('❌ Error fetching study time from BigQuery:', error);
    throw new functions.https.HttpsError('internal', `Failed to fetch study time: ${error.message}`);
  }
});

// ==========================================
// DOCUMENT PROCESSING - WITH BIGQUERY
// ==========================================
exports.processDocument = functions.firestore
  .document('documents/{docId}')
  .onCreate(async (snap, context) => {
    const docData = snap.data();
    const userId = docData.uploaderId;
    
    try {
      const model = vertex_ai.preview.getGenerativeModel({
        model: 'gemini-pro'
      });

      const prompt = `Classify the following document into one subject category (Math, Science, History, English, Computer Science, Physics, Chemistry, Biology, etc.): ${docData.title}. Respond with only the subject name.`;
      
      const result = await model.generateContent(prompt);
      const subject = result.response.text().trim();
      
      await snap.ref.update({
        subject: subject,
        status: 'completed',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Track in BigQuery
      await trackDocumentUpload(userId, {
        id: snap.id,
        title: docData.title,
        fileName: docData.fileName,
        subject
      });

      const gamificationRef = db.collection('gamification').doc(userId);
      const gamificationSnap = await gamificationRef.get();

      if (!gamificationSnap.exists) {
        await gamificationRef.set({
          xp: 20,
          level: 1,
          badges: ['first-upload'],
          pointsHistory: [{
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            points: 20,
            reason: 'document-upload'
          }]
        });
      } else {
        await gamificationRef.update({
          xp: admin.firestore.FieldValue.increment(20),
          pointsHistory: admin.firestore.FieldValue.arrayUnion({
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            points: 20,
            reason: 'document-upload'
          })
        });
      }

      console.log(`✅ Document processed and 20 XP awarded to ${userId}`);
      return { success: true };
    } catch (error) {
      console.error('Error processing document:', error);
      await snap.ref.update({
        status: 'failed',
        error: error.message
      });
      throw error;
    }
  });

exports.processDocumentEnhanced = functions.firestore
  .document('documents/{docId}')
  .onCreate(async (snap, context) => {
    const docData = snap.data();
    const userId = docData.uploaderId;
    
    try {
      let subject = 'General';
      let detectionMethod = 'none';

      if (docData.extractedText && docData.extractedText.length > 50) {
        console.log(`🤖 Running AI subject detection for document: ${snap.id}`);
        
        try {
          const model = vertex_ai.preview.getGenerativeModel({
            model: 'gemini-pro',
            generationConfig: {
              maxOutputTokens: 50,
              temperature: 0.2,
            }
          });

          const prompt = `Analyze and classify this academic document into ONE subject. Return ONLY the subject name.

Available: Mathematics, Physics, Chemistry, Biology, Computer Science, Data Science, AI, Engineering, Economics, Business, Finance, Psychology, Sociology, History, Geography, Literature, Philosophy, Law, Medicine, Environmental Science, Statistics, General

Filename: ${docData.fileName || docData.title}

Text sample:
${docData.extractedText.substring(0, 2000)}

Subject:`;

          const result = await model.generateContent(prompt);
          subject = result.response.text().trim().split('\n')[0].replace(/['"]/g, '');
          detectionMethod = 'ai';

          console.log(`✅ AI detected subject: ${subject} for document ${snap.id}`);
        } catch (aiError) {
          console.error('⚠️ AI detection failed, using filename fallback:', aiError);
          subject = detectSubjectFromFilename(docData.fileName || docData.title);
          detectionMethod = 'fallback';
        }
      } else {
        subject = detectSubjectFromFilename(docData.fileName || docData.title);
        detectionMethod = 'fallback';
      }

      await snap.ref.update({
        subject,
        subjectDetectionMethod: detectionMethod,
        status: 'completed',
        aiProcessedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Track in BigQuery
      await trackDocumentUpload(userId, {
        id: snap.id,
        title: docData.title,
        fileName: docData.fileName,
        subject
      });

      const gamificationRef = db.collection('gamification').doc(userId);
      const gamificationSnap = await gamificationRef.get();

      if (!gamificationSnap.exists) {
        await gamificationRef.set({
          xp: 20,
          level: 1,
          badges: ['first-upload'],
          pointsHistory: [{
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            points: 20,
            reason: 'document-upload'
          }]
        });
      } else {
        await gamificationRef.update({
          xp: admin.firestore.FieldValue.increment(20),
          pointsHistory: admin.firestore.FieldValue.arrayUnion({
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            points: 20,
            reason: 'document-upload'
          })
        });
      }

      console.log(`✅ Document ${snap.id} processed with subject: ${subject}, 20 XP awarded to ${userId}`);
      return { success: true, subject, detectionMethod };
    } catch (error) {
      console.error('❌ Error processing document:', error);
      await snap.ref.update({
        status: 'failed',
        error: error.message
      });
      throw error;
    }
  });

// ==========================================
// QUIZ GENERATION
// ==========================================
exports.generateQuiz = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated to generate quiz');
  }

  const { docId, numQuestions = 10, difficulty = 'medium' } = data;

  try {
    const docRef = db.collection('documents').doc(docId);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Document not found');
    }

    const pagesSnap = await docRef.collection('pages').get();
    const text = pagesSnap.docs.map(doc => doc.data().text).join('\n');

    const model = vertex_ai.preview.getGenerativeModel({
      model: 'gemini-pro'
    });

    const prompt = `Generate ${numQuestions} multiple choice questions from the following text. 
    Difficulty: ${difficulty}. 
    Format as JSON array with: {stem, choices: [], correctAnswer: index, explanation, tags: []}.
    
    Text:
    ${text.substring(0, 5000)}`;

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

    console.log(`✅ Quiz generated and 10 XP awarded to ${context.auth.uid}`);

    return {
      quizId: quizRef.id,
      numQuestions: questions.length
    };
  } catch (error) {
    console.error('Error generating quiz:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// ==========================================
// GAMIFICATION - WITH BIGQUERY TRACKING
// ==========================================
exports.awardXPOnQuizComplete = functions.firestore
  .document('quizSessions/{sessionId}')
  .onCreate(async (snap, context) => {
    const sessionData = snap.data();
    const userId = sessionData.userId;

    if (!sessionData.endTs) {
      return null;
    }

    try {
      const answers = sessionData.answers || {};
      const answerKeys = Object.keys(answers);
      let correctAnswers = 0;
      
      answerKeys.forEach(key => {
        if (answers[key].answer > 0) correctAnswers++;
      });

      const score = sessionData.score || 0;
      const xpEarned = Math.max(Math.round(score / 10), 5);

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

      console.log(`✅ ${xpEarned} XP awarded to ${userId} for quiz completion (score: ${score})`);

      return { success: true, xpEarned };
    } catch (error) {
      console.error('Error awarding XP:', error);
      return null;
    }
  });

// 🆕 Track Study Session Completion
exports.trackStudySessionComplete = functions.firestore
  .document('studySessions/{sessionId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    
    // Only track when status changes to 'completed'
    if (before.status !== 'completed' && after.status === 'completed') {
      await trackStudySession({
        id: context.params.sessionId,
        ...after
      }, after.userId);
      
      console.log(`✅ Study session tracked in BigQuery: ${context.params.sessionId}`);
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
      console.log(`🎉 User ${userId} leveled up from ${oldLevel} to ${newLevel}!`);
      
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
        message: `Congratulations! You've reached Level ${newLevel}! 🎉`,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return { leveledUp: true, newLevel };
    }

    return null;
  });

// ==========================================
// AI UTILITIES
// ==========================================
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

    const model = vertex_ai.preview.getGenerativeModel({
      model: 'gemini-pro',
      generationConfig: {
        maxOutputTokens: 50,
        temperature: 0.2,
      }
    });

    const prompt = `Analyze this academic document and classify it into ONE subject category. Return ONLY the subject name, nothing else.

Available subjects:
Mathematics, Physics, Chemistry, Biology, Computer Science, Data Science, Artificial Intelligence, Engineering, Mechanical Engineering, Electrical Engineering, Civil Engineering, Economics, Business, Finance, Accounting, Psychology, Sociology, Political Science, History, Geography, Literature, English, Philosophy, Law, Medicine, Nursing, Environmental Science, Statistics, General

Filename: ${fileName || 'unknown'}

Document text (first 2000 characters):
${text.substring(0, 2000)}

Subject (single word or short phrase only):`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    let subject = response.text().trim();

    subject = subject.split('\n')[0].trim();
    subject = subject.replace(/['"]/g, '');

    console.log(`✅ AI detected subject: ${subject} for file: ${fileName}`);

    return {
      subject,
      confidence: 'high',
      method: 'ai'
    };

  } catch (error) {
    console.error('❌ Error in AI subject detection:', error);
    
    const fallbackSubject = detectSubjectFromFilename(fileName);
    return {
      subject: fallbackSubject,
      confidence: 'low',
      method: 'fallback',
      error: error.message
    };
  }
});

exports.generateSummary = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const { text, length = 'medium' } = data;

  try {
    const model = vertex_ai.preview.getGenerativeModel({
      model: 'gemini-pro',
    });

    const lengthInstructions = {
      short: '3-4 sentences',
      medium: '1 paragraph (5-7 sentences)',
      long: '2-3 paragraphs'
    };

    const prompt = `Summarize the following text in ${lengthInstructions[length]}. Make it clear and concise.

Text:
${text.substring(0, 5000)}

Summary:`;

    const result = await model.generateContent(prompt);
    const summary = result.response.text().trim();

    console.log(`✅ Generated ${length} summary for user ${context.auth.uid}`);

    return { summary };
  } catch (error) {
    console.error('Error generating summary:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

exports.explainText = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const { text, action = 'explain' } = data;

  try {
    const model = vertex_ai.preview.getGenerativeModel({
      model: 'gemini-pro',
    });

    const prompts = {
      explain: `Explain this text in simple terms:\n\n"${text}"\n\nExplanation:`,
      simplify: `Simplify this text for a beginner:\n\n"${text}"\n\nSimplified:`,
      translate: `Translate this to Hindi:\n\n"${text}"\n\nTranslation:`,
      examples: `Provide 2-3 examples to illustrate this concept:\n\n"${text}"\n\nExamples:`,
      mindmap: `Create a simple mind map structure (text-based) for this:\n\n"${text}"\n\nMind Map:`,
      quiz: `Generate 3 quick quiz questions about this:\n\n"${text}"\n\nQuestions (JSON format):`,
    };

    const prompt = prompts[action] || prompts.explain;

    const result = await model.generateContent(prompt);
    const response = result.response.text().trim();

    console.log(`✅ Generated ${action} for user ${context.auth.uid}`);

    return { response, action };
  } catch (error) {
    console.error('Error explaining text:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// ==========================================
// 🆕 BIGQUERY-POWERED ANALYTICS
// ==========================================
exports.getAnalyticsBigQuery = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const { uid, timeframe = 30 } = data;
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;

  const query = `
    SELECT 
      COALESCE(SUM(xp_earned), 0) as totalXP,
      COUNT(DISTINCT CASE WHEN event_type = 'quiz_complete' THEN event_id END) as totalQuizzes,
      ROUND(AVG(CASE WHEN event_type = 'quiz_complete' THEN quiz_score END), 2) as avgQuizScore,
      COALESCE(SUM(CASE WHEN event_type = 'study_session' THEN study_minutes END), 0) as totalStudyMinutes,
      COUNT(DISTINCT DATE(timestamp)) as activeDays,
      COUNT(DISTINCT CASE WHEN event_type = 'document_upload' THEN event_id END) as documentsUploaded
    FROM \`${projectId}.studygloqe_analytics.user_events\`
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
      totalXP: 0,
      totalQuizzes: 0,
      avgQuizScore: 0,
      totalStudyMinutes: 0,
      activeDays: 0,
      documentsUploaded: 0
    };

    const level = Math.floor(result.totalXP / 1000) + 1;

    return {
      bigQuery: {
        totalXP: parseInt(result.totalXP),
        level,
        nextLevelXP: level * 1000,
        totalQuizzes: parseInt(result.totalQuizzes),
        avgScore: parseFloat(result.avgQuizScore) || 0,
        studyMinutes: parseInt(result.totalStudyMinutes),
        activeDays: parseInt(result.activeDays),
        documentsRead: parseInt(result.documentsUploaded),
        
        xpFromQuizzes: parseInt(result.totalQuizzes) * 100,
        xpFromStudy: parseInt(result.totalStudyMinutes),
        xpFromAchievements: 0,
        xpFromFlashcards: 0
      }
    };
  } catch (error) {
    console.error('❌ BigQuery getAnalytics error:', error);
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
      COALESCE(SUM(CASE WHEN event_type = 'study_session' THEN study_minutes END), 0) as studyMinutes,
      COUNT(DISTINCT CASE WHEN event_type = 'quiz_complete' THEN event_id END) as quizzesCompleted,
      ROUND(AVG(CASE WHEN event_type = 'quiz_complete' THEN quiz_score END), 2) as avgScore
    FROM \`${projectId}.studygloqe_analytics.user_events\`
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
      studyMinutes: parseInt(row.studyMinutes) || 0,
      quizzesCompleted: parseInt(row.quizzesCompleted) || 0,
      avgScore: parseFloat(row.avgScore) || 0
    }));
    
    return { trends };
  } catch (error) {
    console.error('❌ BigQuery getTrends error:', error);
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
      COUNT(*) as quizCount,
      ROUND(AVG(quiz_score), 2) as score,
      SUM(correct_answers) as totalCorrect,
      SUM(total_questions) as totalQuestions
    FROM \`${projectId}.studygloqe_analytics.user_events\`
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
      score: parseFloat(row.score) || 0,
      quizCount: parseInt(row.quizCount) || 0
    }));
    
    return { performance };
  } catch (error) {
    console.error('❌ BigQuery getSubjectPerformance error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// ==========================================
// FIRESTORE ANALYTICS (LEGACY/FALLBACK)
// ==========================================
exports.getStudentAnalytics = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    try {
      const userId = req.body.userId || req.query.userId;
      
      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      const gamificationDoc = await db.collection('gamification').doc(userId).get();
      const userDoc = await db.collection('users').doc(userId).get();

      const gamificationData = gamificationDoc.exists ? gamificationDoc.data() : {};
      const userInfo = userDoc.exists ? userDoc.data() : {};

      const analyticsData = {
        totalXP: gamificationData.xp || 0,
        level: gamificationData.level || 1,
        nextLevelXP: ((gamificationData.level || 1) * 300),
        streak: userInfo.streak || 0,
        badges: gamificationData.badges || [],
        totalPoints: gamificationData.xp || 0,
      };

      console.log(`✅ Analytics fetched for user: ${userId}`);
      return res.status(200).json(analyticsData);
    } catch (error) {
      console.error('❌ Error in getStudentAnalytics:', error);
      return res.status(500).json({ 
        error: error.message,
        details: 'Failed to fetch student analytics'
      });
    }
  });
});

exports.getQuizPerformance = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
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

      console.log(`✅ Quiz performance fetched for user: ${userId}`);
      return res.status(200).json(performanceData);
    } catch (error) {
      console.error('❌ Error in getQuizPerformance:', error);
      return res.status(500).json({ 
        error: error.message,
        details: 'Failed to fetch quiz performance'
      });
    }
  });
});

exports.getStudyTimeStats = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
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

      console.log(`✅ Study time stats fetched for user: ${userId}`);
      return res.status(200).json(studyData);
    } catch (error) {
      console.error('❌ Error in getStudyTimeStats:', error);
      return res.status(500).json({ 
        error: error.message,
        details: 'Failed to fetch study time stats'
      });
    }
  });
});

exports.getPerformanceTrends = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
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

      console.log(`✅ Performance trends fetched for user: ${userId}`);
      return res.status(200).json(trendsData);
    } catch (error) {
      console.error('❌ Error in getPerformanceTrends:', error);
      return res.status(500).json({ 
        error: error.message,
        details: 'Failed to fetch performance trends'
      });
    }
  });
});

exports.getPersonalizedRecommendations = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
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

      console.log(`✅ Recommendations generated for user: ${userId}`);
      return res.status(200).json({ 
        recommendations: recommendations.slice(0, limit) 
      });
    } catch (error) {
      console.error('❌ Error in getPersonalizedRecommendations:', error);
      return res.status(500).json({ 
        error: error.message,
        details: 'Failed to generate recommendations'
      });
    }
  });
});

exports.getLearningPatterns = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
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
      
      const totalSessions = sessions.length;
      const totalTime = sessions.reduce((sum, s) => sum + (s.duration || s.totalTime || 0), 0);
      const avgSessionLength = totalSessions > 0 ? Math.round(totalTime / totalSessions) : 0;

      const patterns = {
        bestStudyTime: 'Morning',
        avgSessionLength,
        studyDaysPerWeek: Math.min(totalSessions, 7),
        completionRate: 85,
        totalSessions
      };

      console.log(`✅ Learning patterns fetched for user: ${userId}`);
      return res.status(200).json(patterns);
    } catch (error) {
      console.error('❌ Error in getLearningPatterns:', error);
      return res.status(500).json({ 
        error: error.message,
        details: 'Failed to fetch learning patterns'
      });
    }
  });
});

exports.getStudyStreaks = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    try {
      const userId = req.body.userId || req.query.userId;
      
      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      const userDoc = await db.collection('users').doc(userId).get();
      const userData = userDoc.exists ? userDoc.data() : {};

      const streakData = {
        currentStreak: userData.streak || 0,
        longestStreak: userData.longestStreak || 0,
        lastStudyDate: userData.lastStudyDate || null
      };

      console.log(`✅ Study streaks fetched for user: ${userId}`);
      return res.status(200).json(streakData);
    } catch (error) {
      console.error('❌ Error in getStudyStreaks:', error);
      return res.status(500).json({ 
        error: error.message,
        details: 'Failed to fetch study streaks'
      });
    }
  });
});

exports.getSubjectPerformance = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
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
        return res.status(200).json({ performance: [] });
      }

      const subjectScores = {};
      sessionsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const subject = data.subject || 'General';
        if (!subjectScores[subject]) {
          subjectScores[subject] = { total: 0, count: 0 };
        }
        subjectScores[subject].total += data.score || 0;
        subjectScores[subject].count += 1;
      });

      const performance = Object.entries(subjectScores).map(([name, data]) => ({
        name,
        score: Math.round(data.total / data.count),
        quizCount: data.count
      })).sort((a, b) => b.score - a.score);

      console.log(`✅ Subject performance fetched for user: ${userId}`);
      return res.status(200).json({ performance });
    } catch (error) {
      console.error('❌ Error in getSubjectPerformance:', error);
      return res.status(500).json({ 
        error: error.message,
        details: 'Failed to fetch subject performance'
      });
    }
  });
});

exports.getWeakAreas = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
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
        return res.status(200).json({ weakAreas: [] });
      }

      const subjectScores = {};
      sessionsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const subject = data.subject || 'General';
        if (!subjectScores[subject]) {
          subjectScores[subject] = { total: 0, count: 0 };
        }
        subjectScores[subject].total += data.score || 0;
        subjectScores[subject].count += 1;
      });

      const weakAreas = Object.entries(subjectScores)
        .map(([name, data]) => ({
          topic: name,
          score: Math.round(data.total / data.count),
          description: `Practice more ${name} topics to improve`,
          quizCount: data.count
        }))
        .filter(area => area.score < 60)
        .sort((a, b) => a.score - b.score)
        .slice(0, 5);

      console.log(`✅ Weak areas fetched for user: ${userId}`);
      return res.status(200).json({ weakAreas });
    } catch (error) {
      console.error('❌ Error in getWeakAreas:', error);
      return res.status(500).json({ 
        error: error.message,
        details: 'Failed to fetch weak areas'
      });
    }
  });
});
