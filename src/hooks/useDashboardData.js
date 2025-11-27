// src/hooks/useDashboardData.js - COMPLETE ENHANCED VERSION
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
        classes: [], // ← NEW: User's enrolled classes
        gamification: null
    });

    useEffect(() => {
        if (!user?.uid) return;

        const unsubscribers = [];

        const setupListeners = async () => {
            try {
                // ===== 1. REAL-TIME GAMIFICATION LISTENER =====
                const gamificationRef = doc(db, 'gamification', user.uid);
                const unsubGamification = onSnapshot(gamificationRef, (doc) => {
                    if (doc.exists()) {
                        const gamificationData = doc.data();
                        
                        // Calculate streak in real-time
                        const today = new Date().toDateString();
                        const yesterday = new Date(Date.now() - 86400000).toDateString();
                        const streak = gamificationData.pointsHistory?.filter(entry => {
                            const entryDate = new Date(entry.timestamp?.toDate()).toDateString();
                            return entryDate === today || entryDate === yesterday;
                        }).length || 0;

                        setData(prev => ({
                            ...prev,
                            gamification: gamificationData,
                            stats: {
                                ...prev.stats,
                                level: gamificationData.level || 1,
                                xp: gamificationData.xp || 0,
                                badges: gamificationData.badges?.length || 0,
                                currentStreak: streak
                            }
                        }));
                    } else {
                        // Initialize gamification if doesn't exist
                        setDoc(gamificationRef, {
                            xp: 0,
                            level: 1,
                            badges: [],
                            pointsHistory: [],
                            createdAt: serverTimestamp()
                        });
                    }
                });
                unsubscribers.push(unsubGamification);

                // ===== 2. REAL-TIME DOCUMENTS LISTENER =====
                const documentsQuery = query(
                    collection(db, 'documents'),
                    where('uploaderId', '==', user.uid),
                    orderBy('createdAt', 'desc'),
                    limit(5)
                );
                const unsubDocuments = onSnapshot(documentsQuery, (snapshot) => {
                    const docs = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    
                    setData(prev => ({
                        ...prev,
                        recentDocuments: docs,
                        stats: {
                            ...prev.stats,
                            totalDocuments: docs.length
                        }
                    }));
                });
                unsubscribers.push(unsubDocuments);

                // ===== 3. REAL-TIME SESSIONS LISTENER (for stats) =====
                const sessionsQuery = query(
                    collection(db, 'sessions'),
                    where('userId', '==', user.uid),
                    orderBy('startTs', 'desc')
                );
                const unsubSessions = onSnapshot(sessionsQuery, (snapshot) => {
                    const sessions = snapshot.docs.map(doc => doc.data());
                    
                    const completed = sessions.filter(s => s.endTs).length;
                    const totalScore = sessions.reduce((sum, s) => sum + (s.score || 0), 0);
                    const avgAccuracy = sessions.length > 0 
                        ? Math.round(totalScore / sessions.length) 
                        : 0;

                    setData(prev => ({
                        ...prev,
                        stats: {
                            ...prev.stats,
                            quizzesCompleted: completed,
                            averageAccuracy: avgAccuracy
                        }
                    }));
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
                        // Initialize ALO if doesn't exist
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

                // ===== 7. REAL-TIME USER'S CLASSES LISTENER (NEW!) =====
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
                    
                    console.log(`✅ Loaded ${userClasses.length} classes for user`);
                });
                unsubscribers.push(unsubClasses);

                setLoading(false);
            } catch (error) {
                console.error('❌ Error setting up dashboard listeners:', error);
                setLoading(false);
            }
        };

        setupListeners();

        // Cleanup all listeners
        return () => {
            console.log('🧹 Cleaning up dashboard listeners');
            unsubscribers.forEach(unsub => unsub());
        };
    }, [user?.uid]);

    return { data, loading };
};

// ===== ACTION HANDLERS =====

// Award XP when user completes an action
export const awardXP = async (userId, points, reason) => {
    try {
        const gamificationRef = doc(db, 'gamification', userId);
        
        await updateDoc(gamificationRef, {
            xp: increment(points),
            pointsHistory: arrayUnion({
                timestamp: serverTimestamp(),
                points,
                reason
            })
        });

        console.log(`✅ Awarded ${points} XP for ${reason}`);
    } catch (error) {
        console.error('❌ Error awarding XP:', error);
        throw error;
    }
};

// Mark quiz as completed
export const completeQuiz = async (userId, quizId, score, answers) => {
    try {
        const batch = writeBatch(db);

        // Create session record
        const sessionRef = doc(collection(db, 'sessions'));
        batch.set(sessionRef, {
            userId,
            quizId,
            startTs: serverTimestamp(),
            endTs: serverTimestamp(),
            answers,
            score,
            events: []
        });

        // Award XP
        const gamificationRef = doc(db, 'gamification', userId);
        const xpEarned = Math.max(Math.round(score / 10), 5); // Min 5 XP
        batch.update(gamificationRef, {
            xp: increment(xpEarned),
            pointsHistory: arrayUnion({
                timestamp: serverTimestamp(),
                points: xpEarned,
                reason: 'quiz-completed',
                score
            })
        });

        await batch.commit();
        console.log(`✅ Quiz completed: ${score}%, ${xpEarned} XP awarded`);
        
        return { success: true, xpEarned };
    } catch (error) {
        console.error('❌ Error completing quiz:', error);
        throw error;
    }
};

// Join study room
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

// Daily login bonus
export const claimDailyBonus = async (userId) => {
    try {
        const gamificationRef = doc(db, 'gamification', userId);
        
        await updateDoc(gamificationRef, {
            xp: increment(5),
            pointsHistory: arrayUnion({
                timestamp: serverTimestamp(),
                points: 5,
                reason: 'daily-login'
            })
        });

        console.log('✅ Daily bonus claimed: +5 XP');
        return { success: true, xp: 5 };
    } catch (error) {
        console.error('❌ Error claiming bonus:', error);
        throw error;
    }
};
