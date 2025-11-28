import {
    collection,
    addDoc,
    doc,
    getDoc,
    getDocs,
    query,
    where,
    orderBy,
    limit,
    updateDoc,
    serverTimestamp
} from 'firebase/firestore';
import { db, COLLECTIONS } from '@config/firebase';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * Generate quiz from document using AI
 */
export const generateQuiz = async (docId, settings = {}) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/generate-quiz`, {
            docId,
            numQuestions: settings.numQuestions || 10,
            difficulty: settings.difficulty || 'medium', // easy, medium, hard
            questionTypes: settings.questionTypes || ['mcq'], // mcq, true-false, short-answer
            topics: settings.topics || [] // specific topics to focus on
        });

        return response.data;
    } catch (error) {
        console.error('Error generating quiz:', error);
        throw error;
    }
};

/**
 * Create a quiz manually (for teachers)
 */
export const createQuiz = async (quizData) => {
    try {
        const quiz = {
            title: quizData.title,
            description: quizData.description || '',
            docId: quizData.docId || null,
            createdBy: quizData.createdBy,
            questions: quizData.questions,
            totalPoints: quizData.questions.reduce((sum, q) => sum + (q.points || 1), 0),
            timeLimit: quizData.timeLimit || null, // minutes
            isTeacherCreated: true,
            assignedTo: quizData.assignedTo || [], // classIds or userIds
            dueDate: quizData.dueDate || null,
            settings: {
                shuffleQuestions: quizData.shuffleQuestions || false,
                shuffleChoices: quizData.shuffleChoices || false,
                showResults: quizData.showResults !== false,
                allowRetake: quizData.allowRetake || false
            },
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        const docRef = await addDoc(collection(db, COLLECTIONS.QUIZZES), quiz);
        return docRef.id;
    } catch (error) {
        console.error('Error creating quiz:', error);
        throw error;
    }
};

/**
 * Get quiz by ID
 */
export const getQuiz = async (quizId) => {
    try {
        const docRef = doc(db, COLLECTIONS.QUIZZES, quizId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            throw new Error('Quiz not found');
        }

        return {
            id: docSnap.id,
            ...docSnap.data()
        };
    } catch (error) {
        console.error('Error getting quiz:', error);
        throw error;
    }
};

/**
 * Get available quizzes for a user
 */
export const getUserQuizzes = async (userId, userRole = 'student') => {
    try {
        let q;

        if (userRole === 'teacher') {
            // Teachers see their own created quizzes
            q = query(
                collection(db, COLLECTIONS.QUIZZES),
                where('createdBy', '==', userId),
                orderBy('createdAt', 'desc')
            );
        } else {
            // Students see assigned quizzes
            q = query(
                collection(db, COLLECTIONS.QUIZZES),
                where('assignedTo', 'array-contains', userId),
                orderBy('createdAt', 'desc')
            );
        }

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error getting user quizzes:', error);
        throw error;
    }
};

/**
 * Start a quiz session
 */
export const startQuizSession = async (quizId, userId) => {
    try {
        const session = {
            userId,
            quizId,
            startTs: serverTimestamp(),
            endTs: null,
            answers: [],
            score: 0,
            maxScore: 0,
            status: 'in-progress', // in-progress, completed, abandoned
            events: []
        };

        const docRef = await addDoc(collection(db, COLLECTIONS.SESSIONS), session);
        return docRef.id;
    } catch (error) {
        console.error('Error starting quiz session:', error);
        throw error;
    }
};

/**
 * Submit quiz answer
 */
export const submitQuizAnswer = async (sessionId, questionId, answer) => {
    try {
        const sessionRef = doc(db, COLLECTIONS.SESSIONS, sessionId);
        const sessionSnap = await getDoc(sessionRef);

        if (!sessionSnap.exists()) {
            throw new Error('Session not found');
        }

        const sessionData = sessionSnap.data();
        const answers = sessionData.answers || [];

        // Update or add answer
        const existingIndex = answers.findIndex(a => a.questionId === questionId);
        const answerData = {
            questionId,
            answer,
            timestamp: new Date().toISOString()
        };

        if (existingIndex >= 0) {
            answers[existingIndex] = answerData;
        } else {
            answers.push(answerData);
        }

        await updateDoc(sessionRef, { answers });

        return true;
    } catch (error) {
        console.error('Error submitting answer:', error);
        throw error;
    }
};

/**
 * Complete quiz session and calculate score
 */
export const completeQuizSession = async (sessionId) => {
    try {
        const sessionRef = doc(db, COLLECTIONS.SESSIONS, sessionId);
        const sessionSnap = await getDoc(sessionRef);

        if (!sessionSnap.exists()) {
            throw new Error('Session not found');
        }

        const sessionData = sessionSnap.data();
        const quiz = await getQuiz(sessionData.quizId);

        // Calculate score
        let score = 0;
        let maxScore = 0;

        sessionData.answers.forEach(answer => {
            const question = quiz.questions.find(q => q.id === answer.questionId);
            if (question) {
                maxScore += question.points || 1;
                if (answer.answer === question.correctAnswer) {
                    score += question.points || 1;
                }
            }
        });

        // Update session
        await updateDoc(sessionRef, {
            endTs: serverTimestamp(),
            score,
            maxScore,
            status: 'completed'
        });

        // Award XP and update gamification
        await awardXP(sessionData.userId, score, 'quiz_completion');

        return {
            score,
            maxScore,
            percentage: (score / maxScore) * 100
        };
    } catch (error) {
        console.error('Error completing quiz session:', error);
        throw error;
    }
};

/**
 * Get quiz results for a session
 */
export const getQuizResults = async (sessionId) => {
    try {
        const sessionRef = doc(db, COLLECTIONS.SESSIONS, sessionId);
        const sessionSnap = await getDoc(sessionRef);

        if (!sessionSnap.exists()) {
            throw new Error('Session not found');
        }

        const sessionData = sessionSnap.data();
        const quiz = await getQuiz(sessionData.quizId);

        // Combine session data with quiz questions
        const results = {
            session: {
                id: sessionId,
                ...sessionData
            },
            quiz: quiz,
            questionResults: sessionData.answers.map(answer => {
                const question = quiz.questions.find(q => q.id === answer.questionId);
                return {
                    question,
                    userAnswer: answer.answer,
                    correctAnswer: question.correctAnswer,
                    isCorrect: answer.answer === question.correctAnswer,
                    explanation: question.explanation
                };
            })
        };

        return results;
    } catch (error) {
        console.error('Error getting quiz results:', error);
        throw error;
    }
};

/**
 * Award XP to user (helper function)
 */
const awardXP = async (userId, points, reason) => {
    try {
        const gamificationRef = doc(db, COLLECTIONS.GAMIFICATION, userId);
        const gamificationSnap = await getDoc(gamificationRef);

        if (!gamificationSnap.exists()) {
            return;
        }

        const currentData = gamificationSnap.data();
        const newXP = (currentData.xp || 0) + points;
        const newLevel = Math.floor(newXP / 100) + 1; // 100 XP per level

        await updateDoc(gamificationRef, {
            xp: newXP,
            level: newLevel,
            history: [
                ...(currentData.history || []),
                {
                    points,
                    reason,
                    timestamp: new Date().toISOString()
                }
            ]
        });
    } catch (error) {
        console.error('Error awarding XP:', error);
    }
};