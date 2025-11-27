// functions/index.js - COMPLETE WITH VERTEX AI ENV SUPPORT
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { VertexAI } = require('@google-cloud/vertexai');

admin.initializeApp();
const db = admin.firestore();

// ==========================================
// INITIALIZE VERTEX AI WITH ENVIRONMENT VARIABLES
// ==========================================
const getVertexAI = () => {
  // Get project ID from environment (Firebase sets this automatically in production)
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
// 1. DOCUMENT PROCESSING (Your existing code + XP award)
// ==========================================
exports.processDocument = functions.firestore
  .document('documents/{docId}')
  .onCreate(async (snap, context) => {
    const docData = snap.data();
    const userId = docData.uploaderId;
    
    try {
      // 1. Extract text from PDF using Document AI
      // (Implementation depends on your PDF extraction library)
      
      // 2. Classify subject using Vertex AI
      const model = vertex_ai.preview.getGenerativeModel({
        model: 'gemini-pro'
      });

      const prompt = `Classify the following document into one subject category (Math, Science, History, English, Computer Science, Physics, Chemistry, Biology, etc.): ${docData.title}. Respond with only the subject name.`;
      
      const result = await model.generateContent(prompt);
      const subject = result.response.text().trim();
      
      // 3. Update document with extracted data
      await snap.ref.update({
        subject: subject,
        status: 'completed',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // 4. AWARD XP FOR UPLOAD (NEW - Real-time feature)
      const gamificationRef = db.collection('gamification').doc(userId);
      const gamificationSnap = await gamificationRef.get();

      if (!gamificationSnap.exists) {
        // Initialize gamification data if doesn't exist
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
        // Award 20 XP for document upload
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

// ==========================================
// 2. GENERATE QUIZ (Your existing code)
// ==========================================
exports.generateQuiz = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Must be authenticated to generate quiz'
    );
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
// 3-11. (Keep all your existing functions as-is)
// ==========================================
exports.awardXPOnQuizComplete = functions.firestore
  .document('sessions/{sessionId}')
  .onCreate(async (snap, context) => {
    const sessionData = snap.data();
    const userId = sessionData.userId;

    if (!sessionData.endTs) {
      return null;
    }

    try {
      const score = sessionData.score || 0;
      const xpEarned = Math.max(Math.round(score / 10), 5);

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

// ... (Keep functions 5-11 exactly as they are in your code)

// ==========================================
// 12. AI SUBJECT DETECTION (NEW)
// ==========================================
exports.detectSubject = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated'
    );
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

// Helper function for fallback subject detection
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
// 13. ENHANCED DOCUMENT PROCESSING WITH AI
// ==========================================
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
// 14. GENERATE AI SUMMARY (NEW)
// ==========================================
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

// ==========================================
// 15. EXPLAIN TEXT (NEW - For Ask Gloqe Pill)
// ==========================================
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
