// src/services/quizService.js
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
    deleteDoc,
    serverTimestamp
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { awardDailyXP, DAILY_ACTIONS } from './gamificationService';
import toast from 'react-hot-toast';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export const generateQuizWithGemini = async (documentId, difficulty = 'medium', questionCount = 10) => {
    try {
        console.log('Generating quiz with Gemini for document:', documentId);

        const docRef = doc(db, 'documents', documentId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            throw new Error('Document not found');
        }

        const docData = docSnap.data();
        const extractedText = docData.extractedText || docData.content || '';
        const subject = docData.subject || 'General Studies';
        const title = docData.title || docData.fileName || 'Untitled';

        if (!extractedText || extractedText.length < 100) {
            throw new Error('Document text too short for quiz generation. Please upload a document with more content.');
        }

        const textSample = extractedText.substring(0, 15000);

        const prompt = `You are an expert educational quiz generator. Based on the following content, create a ${difficulty} difficulty quiz with exactly ${questionCount} multiple-choice questions.

Content Subject: ${subject}
Document Title: ${title}
Difficulty Level: ${difficulty}

Content:
${textSample}

Generate exactly ${questionCount} questions in this JSON format:
{
  "questions": [
    {
      "stem": "Clear, specific question text",
      "choices": ["Choice A", "Choice B", "Choice C", "Choice D"],
      "correctAnswer": 0,
      "explanation": "Detailed explanation of the correct answer with reference to the content",
      "hint": "Helpful hint that guides without giving away the answer",
      "difficulty": "${difficulty}",
      "topic": "Specific topic/concept from the content",
      "points": 1
    }
  ]
}

IMPORTANT REQUIREMENTS:
1. Questions must be clear, unambiguous, and directly from the content
2. All 4 choices must be plausible and related to the content
3. Only ONE choice should be correct
4. correctAnswer must be 0, 1, 2, or 3 (index of correct choice)
5. Provide detailed explanations that reference the source material
6. Include helpful hints that guide thinking without revealing answers
7. For EASY: Focus on definitions and basic concepts
8. For MEDIUM: Include application and analysis questions
9. For HARD: Add complex scenarios and synthesis questions
10. Vary question types: definitions, facts, applications, analysis

Return ONLY valid JSON with no markdown formatting, no code blocks, no extra text.`;

        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        // Clean up the response - remove markdown code blocks if present
        text = text.trim();
        
        // Remove markdown code block formatting
        if (text.startsWith('```json')) {
            text = text.replace(/^```json\s*/, '').replace(/```\s*$/, '');
        } else if (text.startsWith('```')) {
            text = text.replace(/^```\s*/, '').replace(/```\s*$/, '');
        }

        // Find the last closing brace to ensure we have complete JSON
        const jsonEnd = text.lastIndexOf('}');
        if (jsonEnd !== -1) {
            text = text.substring(0, jsonEnd + 1);
        }

        // Parse and validate the JSON response
        let quizData;
        try {
            quizData = JSON.parse(text);
        } catch (parseError) {
            console.error('JSON Parse Error:', parseError);
            console.error('Raw response:', text);
            throw new Error('Failed to parse AI response. Please try again.');
        }

        // Validate quiz structure
        if (!quizData.questions || !Array.isArray(quizData.questions)) {
            throw new Error('Invalid quiz format received from AI');
        }

        if (quizData.questions.length === 0) {
            throw new Error('No questions generated. Please try again.');
        }

        // Validate and normalize each question
        const validatedQuestions = quizData.questions.map((q, index) => {
            if (!q.stem || !q.choices || q.choices.length !== 4) {
                throw new Error(`Invalid question format at index ${index}`);
            }
            if (typeof q.correctAnswer !== 'number' || q.correctAnswer < 0 || q.correctAnswer > 3) {
                throw new Error(`Invalid correct answer at question ${index + 1}`);
            }
            return {
                ...q,
                id: `q${index + 1}`,
                points: q.points || 1
            };
        });

        console.log('Quiz generated successfully:', validatedQuestions.length, 'questions');
        return validatedQuestions;

    } catch (error) {
        console.error('Gemini quiz generation error:', error);
        
        if (error.message.includes('API key')) {
            throw new Error('AI service configuration error. Please contact support.');
        }
        
        throw error;
    }
};

export const createQuiz = async (userId, documentId, questions, metadata = {}) => {
    try {
        const quizData = {
            userId,
            documentId,
            title: metadata.title || 'AI Generated Quiz',
            description: metadata.description || '',
            subject: metadata.subject || 'General Studies',
            difficulty: metadata.difficulty || 'medium',
            questions: questions,
            totalQuestions: questions.length,
            totalPoints: questions.reduce((sum, q) => sum + (q.points || 1), 0),
            timeLimit: metadata.timeLimit || null,
            settings: {
                shuffleQuestions: metadata.shuffleQuestions || false,
                shuffleChoices: metadata.shuffleChoices || true,
                showResults: metadata.showResults !== false,
                allowRetake: metadata.allowRetake || false,
                showHints: metadata.showHints !== false
            },
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            status: 'active',
            attemptCount: 0,
            avgScore: 0
        };

        const docRef = await addDoc(collection(db, 'quizzes'), quizData);
        console.log('Quiz created with ID:', docRef.id);
        
        return docRef.id;

    } catch (error) {
        console.error('Error creating quiz:', error);
        throw error;
    }
};

export const getQuiz = async (quizId) => {
    try {
        const docRef = doc(db, 'quizzes', quizId);
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

export const getUserQuizzes = async (userId) => {
    try {
        const q = query(
            collection(db, 'quizzes'),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc')
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.() || new Date()
        }));
    } catch (error) {
        console.error('Error getting user quizzes:', error);
        return [];
    }
};

export const startQuizSession = async (quizId, userId) => {
    try {
        const sessionData = {
            quizId,
            userId,
            startTime: serverTimestamp(),
            endTime: null,
            answers: {},
            score: 0,
            maxScore: 0,
            status: 'in_progress',
            completedQuestions: [],
            events: []
        };

        const docRef = await addDoc(collection(db, 'quizSessions'), sessionData);
        console.log('Quiz session started:', docRef.id);
        
        return docRef.id;
    } catch (error) {
        console.error('Error starting quiz session:', error);
        throw error;
    }
};

export const submitQuizAnswer = async (sessionId, questionId, answer) => {
    try {
        const sessionRef = doc(db, 'quizSessions', sessionId);
        
        await updateDoc(sessionRef, {
            [`answers.${questionId}`]: {
                answer,
                timestamp: serverTimestamp()
            }
        });

        console.log('Answer submitted for question:', questionId);
    } catch (error) {
        console.error('Error submitting answer:', error);
        throw error;
    }
};

export const completeQuizSession = async (sessionId) => {
    try {
        const sessionRef = doc(db, 'quizSessions', sessionId);
        const sessionSnap = await getDoc(sessionRef);

        if (!sessionSnap.exists()) {
            throw new Error('Session not found');
        }

        const sessionData = sessionSnap.data();
        const quizData = await getQuiz(sessionData.quizId);

        let correct = 0;
        const answers = sessionData.answers || {};
        const totalQuestions = quizData.questions.length;

        const questionResults = quizData.questions.map(question => {
            const userAnswer = answers[question.id]?.answer;
            const isCorrect = userAnswer === question.correctAnswer;
            
            if (isCorrect) {
                correct++;
            }

            return {
                questionId: question.id,
                userAnswer,
                correctAnswer: question.correctAnswer,
                isCorrect,
                points: isCorrect ? (question.points || 1) : 0
            };
        });

        const score = Math.round((correct / totalQuestions) * 100);
        const totalPoints = questionResults.reduce((sum, r) => sum + r.points, 0);
        const maxPoints = quizData.totalPoints;

        await updateDoc(sessionRef, {
            endTime: serverTimestamp(),
            status: 'completed',
            score,
            correctAnswers: correct,
            totalQuestions,
            totalPoints,
            maxPoints,
            questionResults
        });

        const quizRef = doc(db, 'quizzes', sessionData.quizId);
        const quizSnap = await getDoc(quizRef);
        const quizCurrentData = quizSnap.data();
        
        const attemptCount = (quizCurrentData.attemptCount || 0) + 1;
        const avgScore = ((quizCurrentData.avgScore || 0) * (attemptCount - 1) + score) / attemptCount;

        await updateDoc(quizRef, {
            attemptCount,
            avgScore: Math.round(avgScore),
            lastAttemptAt: serverTimestamp()
        });

        // Award XP based on score
        let xpAmount = 0;
        if (score >= 90) {
            xpAmount = 20;
        } else if (score >= 80) {
            xpAmount = 15;
        } else if (score >= 70) {
            xpAmount = 10;
        } else if (score >= 60) {
            xpAmount = 5;
        }

        if (xpAmount > 0) {
            await awardDailyXP(
                sessionData.userId, 
                DAILY_ACTIONS.COMPLETE_QUIZ, 
                `Quiz completed with ${score}% score`
            );
        }

        console.log('Quiz completed:', {
            score,
            correct,
            total: totalQuestions,
            xpAwarded: xpAmount
        });

        return {
            score,
            correct,
            total: totalQuestions,
            percentage: score,
            totalPoints,
            maxPoints,
            xpAwarded: xpAmount
        };

    } catch (error) {
        console.error('Error completing quiz session:', error);
        throw error;
    }
};

export const getQuizResults = async (sessionId) => {
    try {
        const sessionRef = doc(db, 'quizSessions', sessionId);
        const sessionSnap = await getDoc(sessionRef);

        if (!sessionSnap.exists()) {
            throw new Error('Session not found');
        }

        const sessionData = sessionSnap.data();
        const quiz = await getQuiz(sessionData.quizId);

        const results = {
            session: {
                id: sessionId,
                ...sessionData,
                startTime: sessionData.startTime?.toDate?.() || null,
                endTime: sessionData.endTime?.toDate?.() || null
            },
            quiz: quiz,
            questionResults: quiz.questions.map(question => {
                const userAnswer = sessionData.answers?.[question.id]?.answer;
                const isCorrect = userAnswer === question.correctAnswer;

                return {
                    question,
                    userAnswer,
                    correctAnswer: question.correctAnswer,
                    isCorrect,
                    explanation: question.explanation,
                    hint: question.hint,
                    topic: question.topic
                };
            })
        };

        return results;

    } catch (error) {
        console.error('Error getting quiz results:', error);
        throw error;
    }
};

export const deleteQuiz = async (quizId) => {
    try {
        await deleteDoc(doc(db, 'quizzes', quizId));
        console.log('Quiz deleted:', quizId);
        toast.success('Quiz deleted successfully');
    } catch (error) {
        console.error('Error deleting quiz:', error);
        toast.error('Failed to delete quiz');
        throw error;
    }
};

export const getUserQuizSessions = async (userId) => {
    try {
        const q = query(
            collection(db, 'quizSessions'),
            where('userId', '==', userId),
            where('status', '==', 'completed'),
            orderBy('endTime', 'desc'),
            limit(20)
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            startTime: doc.data().startTime?.toDate?.() || null,
            endTime: doc.data().endTime?.toDate?.() || null
        }));
    } catch (error) {
        console.error('Error getting user quiz sessions:', error);
        return [];
    }
};