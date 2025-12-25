// src/features/analytics/hooks/useAnalyticsData.js - ✅ COMPLETE INTEGRATION
import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, limit, orderBy } from 'firebase/firestore';
import { db } from '../../../shared/config/firebase';
import { calculateTrueStreak } from '@shared/utils/streakUtils';
import { categorizeQuizSession } from '../../../shared/utils/subjectDetection';
import bigQueryService from '../services/bigQueryService';

export const useAnalyticsData = (userId, timeRangeDays = 30) => {
    const [quizSessions, setQuizSessions] = useState([]);
    const [studySessions, setStudySessions] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [flashcards, setFlashcards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const cutoffDate = useMemo(() => {
        const date = new Date();
        date.setDate(date.getDate() - timeRangeDays);
        date.setHours(0, 0, 0, 0);
        return date;
    }, [timeRangeDays]);

    // ✅ REAL-TIME QUIZ SESSIONS
    useEffect(() => {
        if (!userId) {
            setLoading(false);
            return;
        }

        console.log('📊 Fetching quiz sessions for last', timeRangeDays, 'days');

        const q = query(
            collection(db, 'quizSessions'),
            where('userId', '==', userId),
            limit(500)
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const sessions = [];

                snapshot.docs.forEach(doc => {
                    const data = doc.data();
                    const completedAt = data.completedAt?.toDate() || data.createdAt?.toDate() || new Date();

                    if (completedAt >= cutoffDate) {
                        sessions.push({
                            id: doc.id,
                            ...data,
                            subject: categorizeQuizSession(data),
                            completedAt,
                            createdAt: data.createdAt?.toDate() || new Date(),
                            score: data.score ?? data.progressPercentage ?? 0
                        });
                    }
                });

                sessions.sort((a, b) => b.completedAt - a.completedAt);
                console.log('✅ Loaded', sessions.length, 'quiz sessions');
                setQuizSessions(sessions);
                setLoading(false);
            },
            (err) => {
                console.error('❌ Quiz sessions error:', err);
                setError('Failed to load quiz data');
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [userId, cutoffDate, timeRangeDays]);

    // ✅ REAL-TIME STUDY SESSIONS
    useEffect(() => {
        if (!userId) return;

        console.log('📚 Fetching study sessions for last', timeRangeDays, 'days');

        const q = query(
            collection(db, 'studySessions'),
            where('userId', '==', userId),
            limit(500)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const sessions = [];

            snapshot.docs.forEach(doc => {
                const data = doc.data();
                const startTime = data.startTime?.toDate() || data.createdAt?.toDate() || new Date();

                if (startTime >= cutoffDate) {
                    sessions.push({
                        id: doc.id,
                        ...data,
                        startTime,
                        endTime: data.endTime?.toDate(),
                        totalTime: data.totalTime || data.duration || 0
                    });
                }
            });

            sessions.sort((a, b) => b.startTime - a.startTime);
            console.log('✅ Loaded', sessions.length, 'study sessions');
            setStudySessions(sessions);
        });

        return () => unsubscribe();
    }, [userId, cutoffDate, timeRangeDays]);

    // ✅ REAL-TIME DOCUMENTS
    useEffect(() => {
        if (!userId) return;

        console.log('📄 Fetching documents for last', timeRangeDays, 'days');

        const q = query(
            collection(db, 'documents'),
            where('userId', '==', userId),
            limit(500)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const docs = [];

            snapshot.docs.forEach(doc => {
                const data = doc.data();
                const createdAt = data.createdAt?.toDate() || new Date();

                if (createdAt >= cutoffDate) {
                    docs.push({
                        id: doc.id,
                        ...data,
                        createdAt
                    });
                }
            });

            docs.sort((a, b) => b.createdAt - a.createdAt);
            console.log('✅ Loaded', docs.length, 'documents');
            setDocuments(docs);
        });

        return () => unsubscribe();
    }, [userId, cutoffDate, timeRangeDays]);

    // ✅ REAL-TIME FLASHCARDS
    useEffect(() => {
        if (!userId) return;

        console.log('🃏 Fetching flashcards for last', timeRangeDays, 'days');

        const q = query(
            collection(db, 'flashcards'),
            where('userId', '==', userId),
            limit(500)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const cards = [];

            snapshot.docs.forEach(doc => {
                const data = doc.data();
                const createdAt = data.createdAt?.toDate() || new Date();

                if (createdAt >= cutoffDate) {
                    cards.push({
                        id: doc.id,
                        ...data,
                        createdAt
                    });
                }
            });

            console.log('✅ Loaded', cards.length, 'flashcards');
            setFlashcards(cards);
        });

        return () => unsubscribe();
    }, [userId, cutoffDate, timeRangeDays]);

    // ✅ CALCULATE STATS
    const stats = useMemo(() => {
        console.log('🔄 Recalculating stats...');

        const totalStudyTime = Math.round(studySessions.reduce((sum, s) => sum + (s.totalTime || 0), 0) / 60);
        const totalQuizzes = quizSessions.length;
        const avgQuizScore = totalQuizzes > 0
            ? Math.round(quizSessions.reduce((sum, q) => sum + (q.score || 0), 0) / totalQuizzes)
            : 0;

        const totalCorrect = quizSessions.reduce((sum, q) => {
            const answers = Object.values(q.answers || {});
            return sum + answers.filter(a => a.correct || a.isCorrect).length;
        }, 0);

        const totalQuestions = quizSessions.reduce((sum, q) => {
            return sum + Object.keys(q.answers || {}).length;
        }, 0);

        const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

        // ✅ FIXED: Calculate streak using centralized utility
        const activityDatesArray = [...quizSessions, ...studySessions].map(session =>
            session.completedAt || session.startTime
        ).filter(Boolean);

        const streak = calculateTrueStreak(activityDatesArray);

        const avgSessionLength = studySessions.length > 0
            ? Math.round(studySessions.reduce((sum, s) => sum + (s.totalTime || 0), 0) / studySessions.length)
            : 0;

        // ✅ FIXED: Calculate unique active days from sessions
        const uniqueDates = new Set(
            [...quizSessions, ...studySessions]
                .map(s => (s.completedAt || s.startTime)?.toDateString?.() || null)
                .filter(Boolean)
        );

        return {
            totalStudyTime,
            totalQuizzes,
            avgQuizScore,
            accuracy,
            streak,
            totalDocuments: documents.length,
            totalFlashcards: flashcards.length,
            totalCorrect,
            totalQuestions,
            avgSessionLength,
            activeDays: uniqueDates.size  // ✅ Use .size for Set
        };
    }, [quizSessions, studySessions, documents, flashcards]);

    // ✅ SUBJECT PERFORMANCE
    const subjectPerformance = useMemo(() => {
        const subjectMap = {};

        quizSessions.forEach(session => {
            const subject = session.subject || 'General';
            if (!subjectMap[subject]) {
                subjectMap[subject] = {
                    subject,
                    quizCount: 0,
                    totalScore: 0,
                    totalQuestions: 0,
                    totalCorrect: 0
                };
            }

            subjectMap[subject].quizCount++;
            subjectMap[subject].totalScore += session.score || 0;

            const answers = Object.values(session.answers || {});
            const correct = answers.filter(a => a.correct || a.isCorrect).length;
            subjectMap[subject].totalCorrect += correct;
            subjectMap[subject].totalQuestions += answers.length;
        });

        return Object.values(subjectMap).map(subject => ({
            ...subject,
            avgScore: Math.round(subject.totalScore / subject.quizCount),
            accuracy: subject.totalQuestions > 0
                ? Math.round((subject.totalCorrect / subject.totalQuestions) * 100)
                : 0
        })).sort((a, b) => b.avgScore - a.avgScore);
    }, [quizSessions]);

    // ✅ WEEKLY ACTIVITY
    const weeklyActivity = useMemo(() => {
        const days = [];
        const today = new Date();

        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toDateString();

            const dayQuizzes = quizSessions.filter(q =>
                q.completedAt.toDateString() === dateStr
            );

            const daySessions = studySessions.filter(s =>
                s.startTime.toDateString() === dateStr
            );

            const studyTime = daySessions.reduce((sum, s) => sum + (s.totalTime || 0), 0) / 60;

            days.push({
                dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
                date: dateStr,
                studyTime: Math.round(studyTime * 10) / 10,
                quizCount: dayQuizzes.length,
                sessionCount: daySessions.length
            });
        }

        return days;
    }, [quizSessions, studySessions]);

    // ✅ RECENT ACTIVITY
    const recentActivity = useMemo(() => {
        const activities = [];

        quizSessions.slice(0, 10).forEach(quiz => {
            activities.push({
                type: 'quiz',
                title: quiz.title || 'Quiz Session',
                subject: quiz.subject,
                score: quiz.score,
                timestamp: quiz.completedAt,
                duration: quiz.duration
            });
        });

        studySessions.slice(0, 10).forEach(session => {
            activities.push({
                type: 'study',
                title: session.documentTitle || 'Study Session',
                subject: session.subject,
                timestamp: session.startTime,
                duration: session.totalTime
            });
        });

        return activities
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 15);
    }, [quizSessions, studySessions]);

    return {
        stats,
        quizSessions,
        studySessions,
        documents,
        flashcards,
        subjectPerformance,
        weeklyActivity,
        recentActivity,
        loading,
        error,
        refetch: () => {
            setLoading(true);
            // Firestore listeners will auto-refresh
            setTimeout(() => setLoading(false), 500);
        }
    };
};