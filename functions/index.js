const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { VertexAI } = require('@google-cloud/vertexai');

admin.initializeApp();
const db = admin.firestore();

// Initialize Vertex AI
const vertex_ai = new VertexAI({
  project: process.env.GOOGLE_CLOUD_PROJECT,
  location: 'us-central1'
});

/**
 * Cloud Function: Process uploaded PDF
 * Triggered when a new document is created
 */
exports.processDocument = functions.firestore
  .document('documents/{docId}')
  .onCreate(async (snap, context) => {
    const docData = snap.data();
    
    try {
      // 1. Extract text from PDF using Document AI
      // (Implementation depends on your PDF extraction library)
      
      // 2. Classify subject using Vertex AI
      const model = vertex_ai.preview.getGenerativeModel({
        model: 'gemini-pro'
      });

      const prompt = `Classify the following document into one subject category (Math, Science, History, English, etc.): ${docData.title}. Respond with only the subject name.`;
      
      const result = await model.generateContent(prompt);
      const subject = result.response.text().trim();
      
      // 3. Update document with extracted data
      await snap.ref.update({
        subject: subject,
        status: 'completed',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
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

/**
 * Cloud Function: Generate quiz from document
 * HTTP endpoint
 */
exports.generateQuiz = functions.https.onCall(async (data, context) => {
  // Check authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Must be authenticated to generate quiz'
    );
  }

  const { docId, numQuestions = 10, difficulty = 'medium' } = data;

  try {
    // 1. Get document data
    const docRef = db.collection('documents').doc(docId);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Document not found');
    }

    // 2. Get document text (from pages subcollection)
    const pagesSnap = await docRef.collection('pages').get();
    const text = pagesSnap.docs.map(doc => doc.data().text).join('\n');

    // 3. Generate quiz using Vertex AI
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

    // 4. Create quiz document
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

    return {
      quizId: quizRef.id,
      numQuestions: questions.length
    };
  } catch (error) {
    console.error('Error generating quiz:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Cloud Function: Award XP and update gamification
 * Triggered when a quiz session is completed
 */
exports.awardXPOnQuizComplete = functions.firestore
  .document('sessions/{sessionId}')
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const oldData = change.before.data();

    // Only process if status changed to completed
    if (newData.status === 'completed' && oldData.status !== 'completed') {
      const userId = newData.userId;
      const points = newData.score * 10; // 10 XP per point

      try {
        const gamificationRef = db.collection('gamification').doc(userId);
        const userRef = db.collection('users').doc(userId);

        await db.runTransaction(async (transaction) => {
          const gamificationDoc = await transaction.get(gamificationRef);
          const userData = await transaction.get(userRef);

          if (!gamificationDoc.exists) {
            return;
          }

          const currentXP = gamificationDoc.data().xp || 0;
          const newXP = currentXP + points;
          const newLevel = Math.floor(newXP / 100) + 1;

          // Update gamification
          transaction.update(gamificationRef, {
            xp: newXP,
            level: newLevel,
            history: admin.firestore.FieldValue.arrayUnion({
              points,
              reason: 'quiz_completion',
              timestamp: new Date().toISOString()
            })
          });

          // Update user
          transaction.update(userRef, {
            xp: newXP,
            level: newLevel
          });
        });

        return { success: true, pointsAwarded: points };
      } catch (error) {
        console.error('Error awarding XP:', error);
        throw error;
      }
    }

    return null;
  });

/**
 * Cloud Function: Calculate monthly rewards
 * Scheduled to run at the end of each month
 */
exports.calculateMonthlyRewards = functions.pubsub
  .schedule('0 0 1 * *') // Run on the 1st of every month at midnight
  .onRun(async (context) => {
    try {
      const classesSnap = await db.collection('classes').get();
      
      for (const classDoc of classesSnap.docs) {
        const classData = classDoc.data();
        
        if (!classData.rewardPolicy) continue;

        // Get all sessions for this class in the past month
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);

        const sessionsSnap = await db.collection('sessions')
          .where('userId', 'in', classData.studentIds)
          .where('endTs', '>=', monthAgo)
          .get();

        // Aggregate scores by student
        const studentScores = {};
        sessionsSnap.docs.forEach(doc => {
          const data = doc.data();
          if (!studentScores[data.userId]) {
            studentScores[data.userId] = 0;
          }
          studentScores[data.userId] += data.score;
        });

        // Sort and get top students
        const sortedStudents = Object.entries(studentScores)
          .sort((a, b) => b[1] - a[1])
          .slice(0, classData.rewardPolicy.topN || 3);

        // Create reward document
        await db.collection('rewards').add({
          classId: classDoc.id,
          periodId: new Date().toISOString().substring(0, 7), // YYYY-MM
          winners: sortedStudents.map(([userId, score]) => ({
            userId,
            score,
            prize: classData.rewardPolicy.prize
          })),
          status: 'pending_approval',
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Error calculating rewards:', error);
      throw error;
    }
  });

/**
 * Cloud Function: Get Agora token for study rooms
 * HTTP endpoint
 */
exports.getAgoraToken = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Must be authenticated'
    );
  }

  const { channelName, role } = data;
  
  // Implementation depends on Agora SDK
  // Return token for video/audio room
  
  return {
    token: 'agora_token_here',
    channelName,
    uid: context.auth.uid
  };
});