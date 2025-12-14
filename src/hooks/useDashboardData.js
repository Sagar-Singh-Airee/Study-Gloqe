// src/hooks/useDashboardData.js - ✅ ENHANCED WITH BIGQUERY + FIXED
import { useState, useEffect } from 'react';
// ✅ FIXED: Import db and COLLECTIONS from config
import { db, COLLECTIONS } from '@/config/firebase';
import {
    collection,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    doc,
    updateDoc,
    increment,
    arrayUnion,
    serverTimestamp,
    writeBatch,
    setDoc
} from 'firebase/firestore';
import { useAuth } from '@contexts/AuthContext';
import bigQueryService from '@/services/bigQueryService'; // ✅ BigQuery service


export const useDashboardData = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({
        stats: {
            totalDocuments: 0,
            quizzesCompleted: 0,
            quizzesGenerated: 0,
            currentStreak: 0,
            streak: 0, // ✅ Alias for compatibility
            averageAccuracy: 0,
            level: 1,
            xp: 0,
            badges: 0,
            totalStudyTime: 0, // ✅ From BigQuery
            totalSessions: 0, // ✅ From BigQuery
        },
        recentDocuments: [],
        aiRecommendations: [],
        activeRooms: [],
        classes: [],
        documents: [],
        studySessions: [],
        gamification: null,
        // ✅ BigQuery Analytics Data
        analytics: null,
        learningPatterns: null,
        performanceTrends: [],
        recommendations: [],
        peerComparison: null
    });

    // ✅ Separate loading states
    const [analyticsLoading, setAnalyticsLoading] = useState(true);

    useEffect(() => {
        if (!user?.uid) return;

        const unsubscribers = [];

        const setupListeners = async () => {
            try {
                // ===== 1. REAL-TIME USER DATA LISTENER =====
                // ✅ FIXED: Use COLLECTIONS.USERS
                const userRef = doc(db, COLLECTIONS.USERS, user.uid);
                const unsubUser = onSnapshot(userRef, (doc) => {
                    if (doc.exists()) {
                        const userData = doc.data();
                        const xp = userData.xp || 0;
                        const level = Math.floor(xp / 100) + 1;
                        const streak = userData.streak || 0;

                        setData(prev => ({
                            ...prev,
                            stats: {
                                ...prev.stats,
                                level: level,
                                xp: xp,
                                currentStreak: streak,
                                streak: streak // ✅ Both properties for compatibility
                            }
                        }));
                    }
                });
                unsubscribers.push(unsubUser);

                // ===== 2. REAL-TIME DOCUMENTS LISTENER =====
                // ✅ FIXED: Use COLLECTIONS.DOCUMENTS
                const documentsQuery = query(
                    collection(db, COLLECTIONS.DOCUMENTS),
                    where('uploaderId', '==', user.uid),
                    orderBy('createdAt', 'desc')
                );
                const unsubDocuments = onSnapshot(documentsQuery, (snapshot) => {
                    const docs = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                        // ✅ Keep Firestore Timestamp
                    }));

                    setData(prev => ({
                        ...prev,
                        recentDocuments: docs.slice(0, 5),
                        documents: docs,
                        stats: {
                            ...prev.stats,
                            totalDocuments: docs.length
                        }
                    }));
                });
                unsubscribers.push(unsubDocuments);

                // ===== 3. REAL-TIME STUDY SESSIONS LISTENER =====
                // ✅ FIXED: Use COLLECTIONS.STUDY_SESSIONS
                const sessionsQuery = query(
                    collection(db, COLLECTIONS.STUDY_SESSIONS),
                    where('userId', '==', user.uid),
                    orderBy('startTime', 'desc'),
                    limit(20)
                );
                const unsubSessions = onSnapshot(sessionsQuery, (snapshot) => {
                    const sessions = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                        // ✅ Keep Firestore Timestamp
                    }));

                    const completed = sessions.filter(s => s.status === 'completed').length;

                    setData(prev => ({
                        ...prev,
                        studySessions: sessions,
                        stats: {
                            ...prev.stats,
                            quizzesCompleted: completed,
                            totalSessions: sessions.length // ✅ Real-time session count
                        }
                    }));

                    console.log(`✅ Loaded ${sessions.length} study sessions`);
                });
                unsubscribers.push(unsubSessions);

                // ===== 4. REAL-TIME QUIZZES COUNT =====
                // ✅ FIXED: Use COLLECTIONS.QUIZZES
                const quizzesQuery = query(
                    collection(db, COLLECTIONS.QUIZZES),
                    where('createdBy', '==', user.uid)
                );
                const unsubQuizzes = onSnapshot(quizzesQuery, (snapshot) => {
                    setData(prev => ({
                        ...prev,
                        stats: {
                            ...prev.stats,
                            quizzesGenerated: snapshot.size
                        }
                    }));
                });
                unsubscribers.push(unsubQuizzes);

                // ===== 5. REAL-TIME ALO RECOMMENDATIONS =====
                // ✅ FIXED: Use COLLECTIONS.ALO
                const aloRef = doc(db, COLLECTIONS.ALO, user.uid);
                const unsubALO = onSnapshot(aloRef, (doc) => {
                    if (doc.exists()) {
                        setData(prev => ({
                            ...prev,
                            aiRecommendations: doc.data().nextDue || []
                        }));
                    } else {
                        setDoc(aloRef, {
                            skillVector: {},
                            masteryMap: {},
                            nextDue: [],
                            createdAt: serverTimestamp()
                        });
                    }
                });
                unsubscribers.push(unsubALO);

                // ===== 6. REAL-TIME ACTIVE ROOMS =====
                // ✅ FIXED: Use COLLECTIONS.ROOMS
                const roomsQuery = query(
                    collection(db, COLLECTIONS.ROOMS),
                    where('active', '==', true),
                    limit(3)
                );
                const unsubRooms = onSnapshot(roomsQuery, (snapshot) => {
                    const rooms = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));

                    setData(prev => ({
                        ...prev,
                        activeRooms: rooms
                    }));
                });
                unsubscribers.push(unsubRooms);

                // ===== 7. REAL-TIME USER'S CLASSES LISTENER =====
                // ✅ FIXED: Use COLLECTIONS.CLASSES
                const classesQuery = query(
                    collection(db, COLLECTIONS.CLASSES),
                    where('studentIds', 'array-contains', user.uid),
                    where('active', '==', true)
                );
                const unsubClasses = onSnapshot(classesQuery, (snapshot) => {
                    const userClasses = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));

                    setData(prev => ({
                        ...prev,
                        classes: userClasses
                    }));

                    console.log(`✅ Loaded ${userClasses.length} classes`);
                });
                unsubscribers.push(unsubClasses);

                setLoading(false);

                // ===== 8. ✅ FETCH BIGQUERY ANALYTICS (ONE-TIME) =====
                fetchBigQueryAnalytics(user.uid);

            } catch (error) {
                console.error('❌ Error setting up dashboard listeners:', error);
                setLoading(false);
                setAnalyticsLoading(false);
            }
        };

        setupListeners();

        return () => {
            console.log('🧹 Cleaning up dashboard listeners');
            unsubscribers.forEach(unsub => unsub());
        };
    }, [user?.uid]);

    // ✅ Fetch BigQuery Analytics Data
    const fetchBigQueryAnalytics = async (userId) => {
        try {
            setAnalyticsLoading(true);

            // Parallel fetch all BigQuery data
            const [
                analytics,
                learningPatterns,
                performanceTrends,
                recommendations,
                peerComparison
            ] = await Promise.allSettled([
                bigQueryService.getStudentAnalytics(userId, 30),
                bigQueryService.getLearningPatterns(userId),
                bigQueryService.getPerformanceTrends(userId, 'weekly'),
                bigQueryService.getPersonalizedRecommendations(userId, 10),
                bigQueryService.getPeerComparison(userId)
            ]);

            setData(prev => ({
                ...prev,
                // ✅ Merge BigQuery analytics with existing stats
                stats: {
                    ...prev.stats,
                    totalStudyTime: analytics.status === 'fulfilled' ? analytics.value?.total_study_time || 0 : 0,
                    totalSessions: analytics.status === 'fulfilled' ? analytics.value?.total_sessions || prev.stats.totalSessions : prev.stats.totalSessions,
                    averageAccuracy: analytics.status === 'fulfilled' ? analytics.value?.avg_quiz_score || 0 : 0
                },
                analytics: analytics.status === 'fulfilled' ? analytics.value : null,
                learningPatterns: learningPatterns.status === 'fulfilled' ? learningPatterns.value : null,
                performanceTrends: performanceTrends.status === 'fulfilled' ? performanceTrends.value : [],
                recommendations: recommendations.status === 'fulfilled' ? recommendations.value : [],
                peerComparison: peerComparison.status === 'fulfilled' ? peerComparison.value : null
            }));

            console.log('✅ BigQuery analytics loaded successfully');
        } catch (error) {
            console.error('❌ Error fetching BigQuery analytics:', error);
            // Don't fail the whole dashboard if BigQuery fails
        } finally {
            setAnalyticsLoading(false);
        }
    };

    // ✅ Refresh BigQuery analytics manually
    const refreshAnalytics = () => {
        if (user?.uid) {
            fetchBigQueryAnalytics(user.uid);
        }
    };

    return { 
        data, 
        loading: loading || analyticsLoading, 
        firebaseLoading: loading,
        analyticsLoading,
        refreshAnalytics // ✅ Expose refresh function
    };
};


// ===== ACTION HANDLERS =====

export const completeQuiz = async (userId, quizId, score, answers) => {
    try {
        const batch = writeBatch(db);

        // ✅ FIXED: Use COLLECTIONS.STUDY_SESSIONS
        const sessionRef = doc(collection(db, COLLECTIONS.STUDY_SESSIONS));
        batch.set(sessionRef, {
            userId,
            documentId: quizId,
            documentTitle: 'Quiz',
            subject: 'Quiz',
            startTime: serverTimestamp(),
            endTime: serverTimestamp(),
            status: 'completed',
            totalTime: 0,
            progressPercentage: score,
            score,
            answers
        });

        // ✅ FIXED: Use COLLECTIONS.USERS
        const userRef = doc(db, COLLECTIONS.USERS, userId);
        const xpEarned = Math.max(Math.round(score / 10), 5);
        batch.update(userRef, {
            xp: increment(xpEarned),
            lastXPTime: serverTimestamp(),
            lastXPAmount: xpEarned,
            lastXPReason: 'quiz-completed'
        });

        await batch.commit();
        console.log(`✅ Quiz completed: ${score}%, ${xpEarned} XP awarded`);

        return { success: true, xpEarned };
    } catch (error) {
        console.error('❌ Error completing quiz:', error);
        throw error;
    }
};

export const joinStudyRoom = async (userId, roomId) => {
    try {
        // ✅ FIXED: Use COLLECTIONS.ROOMS
        const roomRef = doc(db, COLLECTIONS.ROOMS, roomId);

        await updateDoc(roomRef, {
            members: arrayUnion(userId),
            lastActivity: serverTimestamp()
        });

        console.log(`✅ User ${userId} joined room ${roomId}`);
        return { success: true };
    } catch (error) {
        console.error('❌ Error joining room:', error);
        throw error;
    }
};

export const claimDailyBonus = async (userId) => {
    try {
        // ✅ FIXED: Use COLLECTIONS.USERS
        const userRef = doc(db, COLLECTIONS.USERS, userId);

        await updateDoc(userRef, {
            xp: increment(5),
            lastXPTime: serverTimestamp(),
            lastXPAmount: 5,
            lastXPReason: 'daily-login'
        });

        console.log('✅ Daily bonus claimed: +5 XP');
        return { success: true, xp: 5 };
    } catch (error) {
        console.error('❌ Error claiming bonus:', error);
        throw error;
    }
};


// ✅ TEACHER DASHBOARD HOOK
export const useTeacherDashboard = (teacherId, dateRange = 30) => {
    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!teacherId) {
            setLoading(false);
            return;
        }

        const fetchDashboard = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await bigQueryService.getTeacherDashboardData(teacherId, dateRange);
                setDashboard(data);
            } catch (err) {
                console.error('❌ Error fetching teacher dashboard:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboard();
    }, [teacherId, dateRange]);

    return { dashboard, loading, error };
};


// ✅ ADMIN DASHBOARD HOOK
export const useAdminDashboard = (dateRange = 30) => {
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchMetrics = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await bigQueryService.getAdminMetrics(dateRange);
                setMetrics(data);
            } catch (err) {
                console.error('❌ Error fetching admin metrics:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchMetrics();
    }, [dateRange]);

    return { metrics, loading, error };
};
