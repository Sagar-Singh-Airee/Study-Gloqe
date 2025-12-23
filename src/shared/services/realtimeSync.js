// src/shared/services/realtimeSync.js
// Real-time Data Synchronization Service
// Ensures Dashboard and Analytics always show consistent data

import { useState, useEffect, useMemo } from 'react';
import {
    collection,
    query,
    where,
    onSnapshot,
    limit,
    doc,
    updateDoc,
    serverTimestamp
} from 'firebase/firestore';
import { db, COLLECTIONS } from '@shared/config/firebase';
import { eventBus, EVENT_TYPES } from './eventBus';
import { calculateTrueStreak } from '../utils/streakUtils';
import { calculateLevel, calculateLevelProgress, getNextLevelXp } from '../utils/levelUtils';

// ==================== UNIFIED METRICS HOOK ====================
// This ensures Dashboard and Analytics use the SAME source of truth

export const useUnifiedMetrics = (userId, options = {}) => {
    const {
        dateRange = 30,
        enableRealtime = true
    } = options;

    // 1. RAW DATA STATE (Source of Truth)
    // Storing raw data ensures we calculate metrics exactly the same way everywhere
    const [raw, setRaw] = useState({
        studySessions: [],
        quizSessions: [],
        user: {},
        documents: [],
        flashcards: [],
        gamification: {}
    });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);

    // ==================== REAL-TIME LISTENERS ====================
    useEffect(() => {
        if (!userId || !enableRealtime) {
            setLoading(false);
            return;
        }

        const unsubscribers = [];

        // Helper for safe state updates
        const updateRaw = (key, data) => {
            setRaw(prev => ({ ...prev, [key]: data }));
            setLastUpdated(new Date());
        };

        try {
            // 1. STUDY SESSIONS LISTENER
            const studySessionsQuery = query(
                collection(db, COLLECTIONS.STUDY_SESSIONS),
                where('userId', '==', userId),
                limit(200) // Fetch enough for recent trends
            );

            unsubscribers.push(onSnapshot(studySessionsQuery, (snapshot) => {
                const sessions = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    startTime: doc.data().startTime?.toDate?.() || new Date(doc.data().startTime || Date.now()),
                    endTime: doc.data().endTime?.toDate?.() || new Date(doc.data().endTime || Date.now())
                }));
                updateRaw('studySessions', sessions);
            }));

            // 2. QUIZ SESSIONS LISTENER
            const quizSessionsQuery = query(
                collection(db, COLLECTIONS.QUIZ_SESSIONS),
                where('userId', '==', userId),
                limit(200)
            );

            unsubscribers.push(onSnapshot(quizSessionsQuery, (snapshot) => {
                const quizzes = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    completedAt: doc.data().completedAt?.toDate?.() || new Date(doc.data().completedAt || Date.now())
                }));
                updateRaw('quizSessions', quizzes);
            }));

            // 3. USER PROFILE (Streak, Level, etc)
            const userDocRef = doc(db, COLLECTIONS.USERS, userId);
            unsubscribers.push(onSnapshot(userDocRef, (snapshot) => {
                if (snapshot.exists()) {
                    updateRaw('user', snapshot.data());
                }
            }));

            // 4. GAMIFICATION DATA (Badges, Missions)
            const gamificationRef = doc(db, COLLECTIONS.GAMIFICATION, userId);
            unsubscribers.push(onSnapshot(gamificationRef, (snapshot) => {
                if (snapshot.exists()) {
                    updateRaw('gamification', snapshot.data());
                }
            }));

            // 5. DOCUMENTS
            const documentsQuery = query(
                collection(db, COLLECTIONS.DOCUMENTS),
                where('userId', '==', userId),
                limit(100)
            );
            unsubscribers.push(onSnapshot(documentsQuery, (snapshot) => {
                const docs = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    createdAt: doc.data().createdAt?.toDate?.() || new Date()
                }));
                updateRaw('documents', docs);
            }));

            // 6. FLASHCARDS
            const flashcardsQuery = query(
                collection(db, COLLECTIONS.FLASHCARDS),
                where('userId', '==', userId),
                limit(50)
            );
            unsubscribers.push(onSnapshot(flashcardsQuery, (snapshot) => {
                const decks = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                updateRaw('flashcards', decks);
            }));

            // 7. EVENT BUS SUBSCRIPTION (For immediate feedback before Firestore sync)
            const eventUnsubscribe = eventBus.subscribe('*', (event) => {
                if (event.type === EVENT_TYPES.STREAK_UPDATED) {
                    // Optimistic update for streak
                    setRaw(prev => ({
                        ...prev,
                        user: {
                            ...prev.user,
                            streak: event.payload.streak
                        }
                    }));
                }
            });
            unsubscribers.push(eventUnsubscribe);

        } catch (err) {
            console.error('Error setting up listeners:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }

        return () => {
            unsubscribers.forEach(unsub => unsub && unsub());
        };
    }, [userId, enableRealtime]);

    // ==================== DERIVED ANALYTICS (Consistent Logic) ====================
    const metrics = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dateRangeStart = new Date();
        dateRangeStart.setDate(dateRangeStart.getDate() - dateRange);

        // --- Study Stats ---
        const completedSessions = raw.studySessions.filter(s =>
            s.status === 'completed' && s.startTime >= dateRangeStart
        );

        // Sort by date desc
        completedSessions.sort((a, b) => b.startTime - a.startTime);

        // Study sessions store totalTime in seconds - convert to minutes
        const studyTotalSeconds = completedSessions.reduce((sum, s) => sum + (s.totalTime || 0), 0);
        const studyTotalMinutes = Math.round(studyTotalSeconds / 60);

        const studyTodaySeconds = completedSessions
            .filter(s => s.startTime >= today)
            .reduce((sum, s) => sum + (s.totalTime || 0), 0);
        const studyTodayMinutes = Math.round(studyTodaySeconds / 60);

        // Unique days studied
        const activeDays = new Set(completedSessions.map(s => s.startTime.toDateString()));

        // --- Quiz Stats ---
        const completedQuizzes = raw.quizSessions.filter(q =>
            q.completedAt && q.completedAt >= dateRangeStart
        );

        // Calculate accuracy correctly
        let totalQuestions = 0;
        let totalCorrect = 0;
        let totalScore = 0;

        completedQuizzes.forEach(q => {
            // Option 1: Pre-calculated in doc
            if (q.totalQuestions && q.correctAnswers !== undefined) {
                totalQuestions += q.totalQuestions;
                totalCorrect += q.correctAnswers;
                totalScore += q.score || 0;
            }
            // Option 2: Calculate from answers map
            else if (q.answers) {
                const keys = Object.keys(q.answers);
                totalQuestions += keys.length;
                const correct = keys.filter(k => q.answers[k].answer > 0).length; // Assuming >0 is correct
                totalCorrect += correct;
                totalScore += q.score || 0;
            }
        });

        const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
        const averageScore = completedQuizzes.length > 0 ? Math.round(totalScore / completedQuizzes.length) : 0;

        // --- Streak Logic (Robust & Centralized) ---
        // 1. Calculate "True Streak" from actual activity sessions
        const allActivityDates = [
            ...completedSessions.map(s => s.startTime),
            ...completedQuizzes.map(q => q.completedAt)
        ];
        const calculatedStreak = calculateTrueStreak(allActivityDates);

        // 2. Fallback to stored values if calculation is 0 (prevents flickering before history loads)
        let storedStreak = 0;
        if (typeof raw.user.streak === 'number') {
            storedStreak = raw.user.streak;
        } else if (raw.user.streak?.current !== undefined) {
            storedStreak = raw.user.streak.current;
        } else if (raw.gamification.streakData?.currentStreak !== undefined) {
            storedStreak = raw.gamification.streakData.currentStreak;
        }

        const streak = Math.max(calculatedStreak, storedStreak);

        // --- Gamification ---
        // Take the highest XP found in either collection for resilience
        const xp = Math.max(raw.user?.xp || 0, raw.gamification?.xp || 0);
        const level = calculateLevel(xp);
        const levelProgress = calculateLevelProgress(xp);
        const nextLevelThreshold = getNextLevelXp(xp);

        // --- Documents & Flashcards ---
        const totalDocuments = raw.documents.length;
        // Count recent documents (last 7 days)
        const recentDocsDate = new Date();
        recentDocsDate.setDate(recentDocsDate.getDate() - 7);
        const recentDocumentsCount = raw.documents.filter(d => d.createdAt >= recentDocsDate).length;

        const totalDecks = raw.flashcards.length;
        const totalCards = raw.flashcards.reduce((sum, d) => sum + (d.cardCount || 0), 0);
        const cardsMastered = raw.flashcards.reduce((sum, d) => sum + (d.masteredCount || 0), 0);

        return {
            // High-level aggregates
            studyTime: {
                totalMinutes: studyTotalMinutes,
                sessionCount: completedSessions.length,
                averageSessionLength: completedSessions.length > 0 ? Math.round(studyTotalMinutes / completedSessions.length) : 0,
                todayMinutes: studyTodayMinutes
            },
            quizPerformance: {
                totalQuizzes: completedQuizzes.length,
                averageScore,
                accuracy,
                totalCorrect,
                totalQuestions
            },
            gamification: {
                xp,
                level,
                levelProgress,
                nextLevelXp: nextLevelThreshold,
                streak,
                badges: raw.user.unlockedBadges || [],
                achievements: raw.gamification.achievements || []
            },
            documents: {
                total: totalDocuments,
                recentCount: recentDocumentsCount
            },
            flashcards: {
                deckCount: totalDecks,
                cardCount: totalCards,
                masteredCount: cardsMastered
            },
            activity: {
                lastActive: raw.user.lastActiveDate?.toDate?.() || null,
                activeDays: activeDays.size
            },
            // Helpers
            studyHours: Math.floor(studyTotalMinutes / 60),
            studyMinutesRemainder: studyTotalMinutes % 60,
            xpProgress: levelProgress,
            xpToNextLevel: nextLevelThreshold - xp,
            totalItems: totalDocuments + totalDecks,
            overallProgress: Math.min(100, Math.round(
                (accuracy * 0.4) +
                (Math.min(studyTotalMinutes / 60, 100) * 0.3) +
                (Math.min(totalDocuments * 10, 100) * 0.3)
            ))
        };
    }, [raw, dateRange]);

    // ==================== AUTO-SYNC STREAK BACK TO DB ====================
    // If the calculated true streak from history is higher than stored value, sync it back
    // This ensures consistency without manual login triggers
    useEffect(() => {
        if (!userId || loading || !metrics || !enableRealtime) return;

        const storedStreak = raw.gamification?.streakData?.currentStreak || raw.user?.streak || 0;
        const calculatedStreak = metrics.gamification.streak;

        const storedXP = raw.gamification?.xp || raw.user?.xp || 0;
        const calculatedXP = metrics.gamification.xp;

        // Only sync if calculated is higher (healing)
        if (calculatedStreak > storedStreak || calculatedXP > storedXP) {
            const updateGamificationInDB = async () => {
                try {
                    const updates = {};
                    const userUpdates = {};

                    if (calculatedStreak > storedStreak) {
                        console.log(`✨ Healing Streak: ${storedStreak} -> ${calculatedStreak}`);
                        updates['streakData.currentStreak'] = calculatedStreak;
                        updates['streakData.longestStreak'] = Math.max(calculatedStreak, raw.gamification?.streakData?.longestStreak || 0);
                        userUpdates.streak = calculatedStreak;
                    }

                    if (calculatedXP > storedXP) {
                        console.log(`✨ Healing XP/Level: ${storedXP} -> ${calculatedXP}`);
                        updates.xp = calculatedXP;
                        updates.level = metrics.gamification.level;
                        userUpdates.xp = calculatedXP;
                        userUpdates.level = metrics.gamification.level;
                    }

                    const gamificationRef = doc(db, COLLECTIONS.GAMIFICATION, userId);
                    const userRef = doc(db, COLLECTIONS.USERS, userId);

                    await updateDoc(gamificationRef, {
                        ...updates,
                        updatedAt: serverTimestamp()
                    });

                    await updateDoc(userRef, {
                        ...userUpdates,
                        updatedAt: serverTimestamp()
                    }).catch(e => console.warn("Failed to sync to users doc:", e));

                } catch (error) {
                    console.error('❌ Error in auto-sync healing:', error);
                }
            };

            const timer = setTimeout(updateGamificationInDB, 2000); // Debounce
            return () => clearTimeout(timer);
        }
    }, [userId, loading, metrics?.gamification.streak, metrics?.gamification.xp, enableRealtime]);


    return {
        metrics,      // Aggregated stats (Use this for headlines)
        raw,          // Raw data arrays (Use this for charts/trends)
        loading,
        error,
        lastUpdated
    };
};

export const useDashboardSync = (userId) => useUnifiedMetrics(userId, { dateRange: 30 });
export const useAnalyticsSync = (userId, dateRange = 30) => useUnifiedMetrics(userId, { dateRange });

export default {
    useUnifiedMetrics,
    useDashboardSync,
    useAnalyticsSync
};
