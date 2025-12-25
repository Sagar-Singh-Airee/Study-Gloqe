// src/services/quizService.js - PRODUCTION-READY QUIZ SERVICE
import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  runTransaction,
  Timestamp
} from 'firebase/firestore';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { db } from '@shared/config/firebase';
import { awardDailyXP, DAILY_ACTIONS } from '@gamification/services/gamificationService';
import { toast } from 'sonner';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

/**
 * Custom error for UI handling
 */
class QuizError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'QuizError';
    this.code = code;
  }
}

/**
 * Helper: Retry function for AI calls
 */
const retryOperation = async (operation, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      console.warn(`Attempt ${i + 1} failed:`, error);
      if (i === maxRetries - 1) throw error;
      // Wait 1s, 2s, 4s...
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
};

// ==========================================
// 1. AI GENERATION SERVICE
// ==========================================

export const generateQuizWithGemini = async (documentId, difficulty = 'medium', questionCount = 10) => {
  try {
    console.log('🤖 Generating quiz for doc:', documentId);

    // 1. Fetch Document Content
    const docRef = doc(db, 'documents', documentId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new QuizError('Document not found', 'NOT_FOUND');
    }

    const docData = docSnap.data();
    const extractedText = docData.extractedText || docData.content || '';
    const subject = docData.subject || 'General Studies';
    const title = docData.title || docData.fileName || 'Untitled';

    if (!extractedText || extractedText.length < 100) {
      throw new QuizError(
        'Document content is too short (under 100 chars). Please upload a more detailed document.',
        'CONTENT_TOO_SHORT'
      );
    }

    // 2. Prepare Context (Limit to ~20k chars to save tokens while keeping context)
    const textSample = extractedText.substring(0, 25000);

    // 3. Configure Gemini with strict JSON Schema
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.7,
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            questions: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  stem: { type: SchemaType.STRING },
                  choices: {
                    type: SchemaType.ARRAY,
                    items: { type: SchemaType.STRING }
                  },
                  correctAnswer: { type: SchemaType.NUMBER, description: "Index 0-3" },
                  explanation: { type: SchemaType.STRING },
                  hint: { type: SchemaType.STRING },
                  topic: { type: SchemaType.STRING },
                  points: { type: SchemaType.NUMBER }
                },
                required: ["stem", "choices", "correctAnswer", "explanation", "hint", "topic"]
              }
            }
          }
        }
      }
    });

    const prompt = `
      You are a strict educational quiz generator. 
      Create exactly ${questionCount} questions based ONLY on the provided text.
      
      Context:
      - Subject: ${subject}
      - Difficulty: ${difficulty}
      
      Rules:
      1. Questions must be factually supported by the text.
      2. Each question must have exactly 4 choices.
      3. "correctAnswer" is the 0-based index (0-3) of the correct choice.
      4. Choices must be plausible distractors.
      5. Avoid "All of the above" unless absolutely necessary.
      6. Provide clear explanations and helpful hints.
      
      TEXT CONTENT:
      ${textSample}
    `;

    // 4. Execute with Retry
    const result = await retryOperation(() => model.generateContent(prompt));
    const responseText = result.response.text();

    // 5. Parse & Validate
    let quizData;
    try {
      quizData = JSON.parse(responseText);
    } catch (e) {
      console.error('JSON parse error:', e);
      throw new QuizError('AI generated invalid JSON. Please try again.', 'AI_PARSE_ERROR');
    }

    if (!quizData.questions || quizData.questions.length === 0) {
      throw new QuizError('AI could not generate questions from this text.', 'NO_QUESTIONS');
    }

    // 6. Post-process & Validate
    const processedQuestions = quizData.questions.slice(0, questionCount).map((q, index) => {
      // Ensure 4 choices
      if (!q.choices || q.choices.length !== 4) {
        throw new QuizError('Invalid question format from AI', 'INVALID_FORMAT');
      }

      // Ensure correctAnswer is valid
      if (typeof q.correctAnswer !== 'number' || q.correctAnswer < 0 || q.correctAnswer > 3) {
        console.warn(`Invalid correctAnswer for question ${index}:`, q.correctAnswer);
        q.correctAnswer = 0; // Fallback
      }

      return {
        ...q,
        id: `q_${Date.now()}_${index}`, // Stable ID for React keys
        points: q.points || (difficulty === 'hard' ? 2 : 1),
        difficulty // Tag each question
      };
    });

    return processedQuestions;

  } catch (error) {
    console.error('Gemini generation failed:', error);
    if (error instanceof QuizError) throw error;
    throw new Error('AI Service unavailable. Please try again later.');
  }
};

// ==========================================
// 2. QUIZ MANAGEMENT
// ==========================================

export const createQuiz = async (userId, documentId, questions, metadata = {}) => {
  try {
    // Calculate aggregated stats for the quiz card
    const totalPoints = questions.reduce((sum, q) => sum + (q.points || 1), 0);

    const quizData = {
      userId,
      documentId,
      title: metadata.title || 'AI Generated Quiz',
      description: metadata.description || '',
      subject: metadata.subject || 'General Knowledge',
      difficulty: metadata.difficulty || 'medium',
      questions, // Storing questions directly in the doc
      meta: {
        totalQuestions: questions.length,
        totalPoints,
        timeLimit: metadata.timeLimit || null,
      },
      settings: {
        shuffleQuestions: metadata.shuffleQuestions ?? false,
        shuffleChoices: metadata.shuffleChoices ?? true,
        showResults: metadata.showResults ?? true,
        allowRetake: metadata.allowRetake ?? true,
        showHints: metadata.showHints ?? true
      },
      stats: {
        attemptCount: 0,
        avgScore: 0
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      status: 'active'
    };

    const docRef = await addDoc(collection(db, 'quizzes'), quizData);
    console.log('✅ Quiz created:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Create quiz failed:', error);
    throw new Error('Failed to save quiz.');
  }
};

export const getQuiz = async (quizId) => {
  const snap = await getDoc(doc(db, 'quizzes', quizId));
  if (!snap.exists()) throw new Error('Quiz not found');
  return { id: snap.id, ...snap.data() };
};

export const getUserQuizzes = async (userId) => {
  try {
    // Requires index: quizzes [userId ASC, createdAt DESC]
    const q = query(
      collection(db, 'quizzes'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt?.toDate()
    }));
  } catch (error) {
    console.error('Fetch user quizzes failed:', error);
    return [];
  }
};

export const deleteQuiz = async (quizId) => {
  try {
    await deleteDoc(doc(db, 'quizzes', quizId));
    toast.success('Quiz deleted successfully');
  } catch (e) {
    console.error('Delete quiz error:', e);
    toast.error('Could not delete quiz');
  }
};

// ==========================================
// 3. SESSION ENGINE (The Game Loop)
// ==========================================

/**
 * Starts a quiz. 
 * Feature: Checks for existing active session to allow "Resume" functionality.
 */
export const startQuizSession = async (quizId, userId) => {
  try {
    // 1. Check for existing active session
    const existingQuery = query(
      collection(db, 'quizSessions'),
      where('userId', '==', userId),
      where('quizId', '==', quizId),
      where('status', '==', 'in_progress'),
      limit(1)
    );

    const existingSnap = await getDocs(existingQuery);
    if (!existingSnap.empty) {
      console.log('✅ Resuming existing session...');
      return existingSnap.docs[0].id;
    }

    // 2. Fetch Quiz Metadata for Denormalization (Crucial for history performance)
    const quiz = await getQuiz(quizId);

    // 3. Create new session
    const sessionData = {
      userId,
      quizId,
      status: 'in_progress',
      startTime: serverTimestamp(),
      answers: {}, // { questionId: { answer: index, timestamp } }
      score: 0,
      // Snapshot for efficient history queries
      quizSnapshot: {
        title: quiz.title,
        subject: quiz.subject,
        difficulty: quiz.difficulty,
        totalQuestions: quiz.meta?.totalQuestions || quiz.questions.length
      },
      createdAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'quizSessions'), sessionData);
    console.log('✅ Quiz session started:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Start session failed:', error);
    throw error;
  }
};

/**
 * Submits a single answer. 
 * Optimistic update pattern recommended in UI.
 */
export const submitQuizAnswer = async (sessionId, questionId, answerIndex) => {
  try {
    const sessionRef = doc(db, 'quizSessions', sessionId);
    await updateDoc(sessionRef, {
      [`answers.${questionId}`]: {
        answer: answerIndex,
        timestamp: Timestamp.now()
      }
    });
    console.log('✅ Answer submitted:', questionId, answerIndex);
  } catch (error) {
    console.error('Submit answer failed:', error);
    // Don't throw; UI should handle sync status
  }
};

/**
 * Completes quiz using Transaction for integrity.
 * Awards XP and updates global stats atomically.
 */
export const completeQuizSession = async (sessionId) => {
  try {
    const result = await runTransaction(db, async (transaction) => {
      // A. Reads
      const sessionRef = doc(db, 'quizSessions', sessionId);
      const sessionSnap = await transaction.get(sessionRef);
      if (!sessionSnap.exists()) throw new Error("Session missing");

      const sessionData = sessionSnap.data();
      if (sessionData.status === 'completed') throw new Error("Already completed");

      const quizRef = doc(db, 'quizzes', sessionData.quizId);
      const quizSnap = await transaction.get(quizRef);
      if (!quizSnap.exists()) throw new Error("Quiz missing");
      const quizData = quizSnap.data();

      // B. Logic / Grading
      const answers = sessionData.answers || {};
      let correctCount = 0;
      let earnedPoints = 0;

      const resultsDetail = quizData.questions.map(q => {
        const userAnswer = answers[q.id]?.answer;
        const isCorrect = userAnswer === q.correctAnswer;

        if (isCorrect) {
          correctCount++;
          earnedPoints += (q.points || 1);
        }
        return { qId: q.id, isCorrect, userAnswer };
      });

      const totalQuestions = quizData.questions.length;
      const scorePercent = Math.round((correctCount / totalQuestions) * 100);

      // XP Logic
      let xpAwarded = 0;
      if (scorePercent >= 90) xpAwarded = 20;
      else if (scorePercent >= 75) xpAwarded = 15;
      else if (scorePercent >= 60) xpAwarded = 10;
      else xpAwarded = 5;

      // C. Writes
      transaction.update(sessionRef, {
        status: 'completed',
        endTime: serverTimestamp(),
        score: scorePercent,
        resultSummary: {
          correctCount,
          earnedPoints,
          xpAwarded
        }
      });

      // Update Quiz Aggregates (Running Average)
      const oldStats = quizData.stats || { attemptCount: 0, avgScore: 0 };
      const newCount = (oldStats.attemptCount || 0) + 1;
      const newAvg = Math.round(
        ((oldStats.avgScore || 0) * (newCount - 1) + scorePercent) / newCount
      );

      transaction.update(quizRef, {
        'stats.attemptCount': newCount,
        'stats.avgScore': newAvg,
        lastAttemptAt: serverTimestamp()
      });

      return { userId: sessionData.userId, xpAwarded, scorePercent };
    });

    // D. Side Effects (Gamification Service)
    // frontend handles this via trackAction now to prevent double counting

    console.log('✅ Quiz completed:', result);
    return result;

  } catch (error) {
    console.error('❌ Complete quiz failed:', error);
    throw error;
  }
};

/**
 * Fetch results. 
 * Optimization: Merges session data with quiz data so UI has one object.
 */
export const getQuizResults = async (sessionId) => {
  const sessionSnap = await getDoc(doc(db, 'quizSessions', sessionId));
  if (!sessionSnap.exists()) throw new Error('Session not found');

  const sessionData = sessionSnap.data();
  const quiz = await getQuiz(sessionData.quizId);

  // Map answers to questions for review
  const detailedReview = quiz.questions.map(q => {
    const answerEntry = sessionData.answers?.[q.id];
    return {
      ...q,
      userAnswer: answerEntry?.answer,
      isCorrect: answerEntry?.answer === q.correctAnswer
    };
  });

  return {
    session: {
      ...sessionData,
      startTime: sessionData.startTime?.toDate(),
      endTime: sessionData.endTime?.toDate()
    },
    quizTitle: quiz.title,
    questions: detailedReview
  };
};

/**
 * Get History.
 * Efficient: Uses the "quizSnapshot" we saved earlier to avoid fetching the Quiz collection.
 */
export const getUserQuizSessions = async (userId) => {
  try {
    // Requires index: quizSessions [userId ASC, status ASC, endTime DESC]
    const q = query(
      collection(db, 'quizSessions'),
      where('userId', '==', userId),
      where('status', '==', 'completed'),
      orderBy('endTime', 'desc'),
      limit(20)
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        score: data.score,
        startTime: data.startTime?.toDate(),
        endTime: data.endTime?.toDate(),
        // Use cached snapshot data
        quizTitle: data.quizSnapshot?.title || 'Unknown Quiz',
        subject: data.quizSnapshot?.subject || 'General'
      };
    });
  } catch (error) {
    console.error('Fetch history failed:', error);
    return [];
  }
};

export default {
  generateQuizWithGemini,
  createQuiz,
  getQuiz,
  getUserQuizzes,
  deleteQuiz,
  startQuizSession,
  submitQuizAnswer,
  completeQuizSession,
  getQuizResults,
  getUserQuizSessions
};
