// src/hooks/useDashboardData.js - FIXED VERSION
import { useState, useEffect } from 'react';
import { db } from '@/config/firebase';
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

export const useDashboardData = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({
        stats: {
            totalDocuments: 0,
            quizzesCompleted: 0,
            quizzesGenerated: 0,
            currentStreak: 0,
            averageAccuracy: 0,
            level: 1,
            xp: 0,
            badges: 0
        },
        recentDocuments: [],
        aiRecommendations: [],
        activeRooms: [],
        classes: [],
        documents: [],
        studySessions: [],
        gamification: null
    });

    useEffect(() => {
        if (!user?.uid) return;

        const unsubscribers = [];

        const setupListeners = async () => {
            try {
                // ===== 1. REAL-TIME USER DATA LISTENER =====
                const userRef = doc(db, 'users', user.uid);
                const unsubUser = onSnapshot(userRef, (doc) => {
                    if (doc.exists()) {
                        const userData = doc.data();
                        const xp = userData.xp || 0;
                        const level = Math.floor(xp / 100) + 1;

                        setData(prev => ({
                            ...prev,
                            stats: {
                                ...prev.stats,
                                level: level,
                                xp: xp,
                                currentStreak: userData.streak || 0
                            }
                        }));
                    }
                });
                unsubscribers.push(unsubUser);

                // ===== 2. REAL-TIME DOCUMENTS LISTENER =====
                const documentsQuery = query(
                    collection(db, 'documents'),
                    where('uploaderId', '==', user.uid),
                    orderBy('createdAt', 'desc')
                );
                const unsubDocuments = onSnapshot(documentsQuery, (snapshot) => {
                    const docs = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                        // ✅ REMOVED: Don't convert here, keep Firestore Timestamp
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
                const sessionsQuery = query(
                    collection(db, 'studySessions'),
                    where('userId', '==', user.uid),
                    orderBy('startTime', 'desc'),
                    limit(20)
                );
                const unsubSessions = onSnapshot(sessionsQuery, (snapshot) => {
                    const sessions = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                        // ✅ REMOVED: Don't convert here
                    }));

                    const completed = sessions.filter(s => s.status === 'completed').length;

                    setData(prev => ({
                        ...prev,
                        studySessions: sessions,
                        stats: {
                            ...prev.stats,
                            quizzesCompleted: completed
                        }
                    }));

                    console.log(`✅ Loaded ${sessions.length} study sessions`);
                });
                unsubscribers.push(unsubSessions);

                // ===== 4. REAL-TIME QUIZZES COUNT =====
                const quizzesQuery = query(
                    collection(db, 'quizzes'),
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
                const aloRef = doc(db, 'alo', user.uid);
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
                const roomsQuery = query(
                    collection(db, 'rooms'),
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
                const classesQuery = query(
                    collection(db, 'classes'),
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
            } catch (error) {
                console.error('❌ Error setting up dashboard listeners:', error);
                setLoading(false);
            }
        };

        setupListeners();

        return () => {
            console.log('🧹 Cleaning up dashboard listeners');
            unsubscribers.forEach(unsub => unsub());
        };
    }, [user?.uid]);

    return { data, loading };
};

// ===== REMOVED DUPLICATE awardXP =====
// Use awardXP from gamificationService instead
// Import: import { awardXP } from '@/services/gamificationService';

// ===== ACTION HANDLERS =====

export const completeQuiz = async (userId, quizId, score, answers) => {
    try {
        const batch = writeBatch(db);

        const sessionRef = doc(collection(db, 'studySessions'));
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

        const userRef = doc(db, 'users', userId);
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
        const roomRef = doc(db, 'rooms', roomId);

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
        const userRef = doc(db, 'users', userId);

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
