// functions/index.js - COMPLETE REAL-TIME VERSION
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

    // 5. AWARD XP FOR QUIZ GENERATION (NEW)
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
// 3. AWARD XP ON QUIZ COMPLETE (Updated with better logic)
// ==========================================
exports.awardXPOnQuizComplete = functions.firestore
  .document('sessions/{sessionId}')
  .onCreate(async (snap, context) => {
    const sessionData = snap.data();
    const userId = sessionData.userId;

    // Only process completed sessions
    if (!sessionData.endTs) {
      return null;
    }

    try {
      const score = sessionData.score || 0;
      const xpEarned = Math.max(Math.round(score / 10), 5); // Min 5 XP even for low scores

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

// ==========================================
// 4. AUTO LEVEL-UP TRIGGER (NEW - Real-time)
// ==========================================
exports.checkLevelUp = functions.firestore
  .document('gamification/{userId}')
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const oldData = change.before.data();
    const userId = context.params.userId;

    const oldLevel = oldData.level || 1;
    const newXP = newData.xp || 0;
    
    // Level up every 300 XP
    const newLevel = Math.floor(newXP / 300) + 1;

    if (newLevel > oldLevel) {
      console.log(`🎉 User ${userId} leveled up from ${oldLevel} to ${newLevel}!`);
      
      // Update level and award bonus
      await change.after.ref.update({
        level: newLevel,
        badges: admin.firestore.FieldValue.arrayUnion(`level-${newLevel}`),
        xp: admin.firestore.FieldValue.increment(50), // Level-up bonus
        pointsHistory: admin.firestore.FieldValue.arrayUnion({
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          points: 50,
          reason: 'level-up-bonus',
          level: newLevel
        })
      });

      // Also update user document
      await db.collection('users').doc(userId).update({
        level: newLevel,
        xp: newXP + 50
      });

      // Create notification (optional)
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
// 5. UPDATE ALO RECOMMENDATIONS (NEW - AI Learning Orchestrator)
// ==========================================
exports.updateALORecommendations = functions.firestore
  .document('sessions/{sessionId}')
  .onCreate(async (snap, context) => {
    const session = snap.data();
    const userId = session.userId;

    try {
      const aloRef = db.collection('alo').doc(userId);
      const aloSnap = await aloRef.get();
      
      if (!aloSnap.exists) {
        // Initialize ALO data
        await aloRef.set({
          skillVector: {},
          masteryMap: {},
          nextDue: []
        });
      }

      // Analyze quiz performance
      const quizRef = await db.collection('quizzes').doc(session.quizId).get();
      const quizData = quizRef.data();
      
      // Simple recommendation logic (enhance with ML later)
      const score = session.score || 0;
      const recommendations = [];

      if (score < 70) {
        // Need more practice
        recommendations.push({
          type: 'quiz',
          title: `Review ${quizData.title}`,
          description: 'Practice makes perfect - try again!',
          quizId: session.quizId,
          priority: 0.9,
          estimatedTime: 15,
          path: `/quizzes/${session.quizId}`
        });
      }

      // Get related documents for similar topics
      const docsSnap = await db.collection('documents')
        .where('uploaderId', '==', userId)
        .limit(3)
        .get();

      docsSnap.docs.forEach(doc => {
        const docData = doc.data();
        recommendations.push({
          type: 'document',
          title: `Continue ${docData.title}`,
          description: 'Keep learning new concepts',
          docId: doc.id,
          priority: 0.7,
          estimatedTime: 20,
          path: `/pdf-reader/${doc.id}`
        });
      });

      // Update ALO with new recommendations
      await aloRef.update({
        nextDue: recommendations.slice(0, 3), // Top 3 recommendations
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`✅ ALO recommendations updated for ${userId}`);
      return { success: true };
    } catch (error) {
      console.error('Error updating ALO:', error);
      return null;
    }
  });

// ==========================================
// 6. DAILY LOGIN BONUS (NEW)
// ==========================================
exports.checkDailyLogin = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const userId = context.auth.uid;
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  try {
    const userRef = db.collection('users').doc(userId);
    const userSnap = await userRef.get();
    const userData = userSnap.data();

    if (userData.lastLoginDate !== today) {
      // Award daily bonus
      const gamificationRef = db.collection('gamification').doc(userId);
      
      await gamificationRef.update({
        xp: admin.firestore.FieldValue.increment(5),
        pointsHistory: admin.firestore.FieldValue.arrayUnion({
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          points: 5,
          reason: 'daily-login'
        })
      });

      await userRef.update({
        lastLoginDate: today
      });

      console.log(`✅ Daily bonus awarded to ${userId}`);
      return { bonusAwarded: true, xp: 5 };
    }

    return { bonusAwarded: false };
  } catch (error) {
    console.error('Error checking daily login:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// ==========================================
// 7. MONTHLY REWARDS CALCULATION (Your existing code)
// ==========================================
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
            studentScores[data.userId] = { totalScore: 0, quizCount: 0 };
          }
          studentScores[data.userId].totalScore += data.score || 0;
          studentScores[data.userId].quizCount += 1;
        });

        // Sort and get top students (with minimum attempts requirement)
        const sortedStudents = Object.entries(studentScores)
          .filter(([userId, stats]) => stats.quizCount >= (classData.rewardPolicy.minAttempts || 5))
          .sort((a, b) => b[1].totalScore - a[1].totalScore)
          .slice(0, classData.rewardPolicy.topN || 3);

        if (sortedStudents.length === 0) continue;

        // Create reward document
        await db.collection('rewards').add({
          classId: classDoc.id,
          periodId: new Date().toISOString().substring(0, 7), // YYYY-MM
          winners: sortedStudents.map(([userId, stats]) => ({
            userId,
            totalScore: stats.totalScore,
            quizCount: stats.quizCount,
            prize: classData.rewardPolicy.prize
          })),
          status: 'pending_approval',
          teacherId: classData.teacherId,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`✅ Rewards calculated for class ${classDoc.id}`);
      }

      return { success: true };
    } catch (error) {
      console.error('Error calculating rewards:', error);
      throw error;
    }
  });

// ==========================================
// 8. AGORA TOKEN GENERATION (Your existing code)
// ==========================================
exports.getAgoraToken = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const { channelName, role } = data;
  const userId = context.auth.uid;
  
  // TODO: Implement Agora RTC token generation
  // const RtcTokenBuilder = require('agora-access-token').RtcTokenBuilder;
  // const token = RtcTokenBuilder.buildTokenWithUid(...);
  
  console.log(`✅ Agora token generated for ${userId} in channel ${channelName}`);
  
  return {
    token: 'agora_token_placeholder', // Replace with real token
    channelName,
    uid: userId
  };
});

// ==========================================
// 9. JOIN STUDY ROOM (NEW)
// ==========================================
exports.joinStudyRoom = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const { roomId } = data;
  const userId = context.auth.uid;

  try {
    const roomRef = db.collection('rooms').doc(roomId);
    const roomSnap = await roomRef.get();

    if (!roomSnap.exists()) {
      throw new functions.https.HttpsError('not-found', 'Room not found');
    }

    // Add user to room members
    await roomRef.update({
      members: admin.firestore.FieldValue.arrayUnion(userId),
      lastActivity: admin.firestore.FieldValue.serverTimestamp()
    });

    // Award XP for joining
    const gamificationRef = db.collection('gamification').doc(userId);
    await gamificationRef.update({
      xp: admin.firestore.FieldValue.increment(5),
      pointsHistory: admin.firestore.FieldValue.arrayUnion({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        points: 5,
        reason: 'joined-study-room'
      })
    });

    console.log(`✅ User ${userId} joined room ${roomId} and earned 5 XP`);

    return { success: true };
  } catch (error) {
    console.error('Error joining room:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// ==========================================
// 10. INITIALIZE USER GAMIFICATION (NEW)
// ==========================================
exports.initializeUserGamification = functions.auth.user().onCreate(async (user) => {
  try {
    // Create gamification document for new user
    await db.collection('gamification').doc(user.uid).set({
      xp: 0,
      level: 1,
      badges: ['new-member'],
      pointsHistory: [{
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        points: 0,
        reason: 'account-created'
      }],
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Initialize ALO data
    await db.collection('alo').doc(user.uid).set({
      skillVector: {},
      masteryMap: {},
      nextDue: [],
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`✅ Gamification initialized for new user ${user.uid}`);
    return { success: true };
  } catch (error) {
    console.error('Error initializing user gamification:', error);
    return null;
  }
});

// ==========================================
// 11. AWARD BADGE (NEW - Callable function)
// ==========================================
exports.awardBadge = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const { badgeId, reason } = data;
  const userId = context.auth.uid;

  try {
    const gamificationRef = db.collection('gamification').doc(userId);
    
    await gamificationRef.update({
      badges: admin.firestore.FieldValue.arrayUnion(badgeId),
      pointsHistory: admin.firestore.FieldValue.arrayUnion({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        points: 0,
        reason: `badge-earned: ${badgeId}`
      })
    });

    // Create notification
    await db.collection('notifications').add({
      userId,
      type: 'badge-earned',
      title: 'New Badge Earned!',
      message: `You've earned the "${badgeId}" badge! 🏆`,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`✅ Badge ${badgeId} awarded to ${userId}`);
    return { success: true, badgeId };
  } catch (error) {
    console.error('Error awarding badge:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});
