// src/features/gamification/hooks/useGamification.js - 🚀 ULTIMATE REALTIME VERSION
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { doc, onSnapshot, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../shared/config/firebase';
import { useAuth } from '../../auth/contexts/AuthContext';
import { BADGE_DEFINITIONS, TITLE_DEFINITIONS } from '../config/achievements';
import { trackAction as trackActionService, checkAndUnlockAchievements } from '../services/achievementTracker';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';

// Level XP thresholds
const LEVEL_THRESHOLDS = [
    0, 100, 250, 500, 1000, 2000, 4000, 8000, 16000, 32000, 64000, 128000
];

// Calculate level from XP
const calculateLevel = (xp) => {
    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
        if (xp >= LEVEL_THRESHOLDS[i]) {
            return i + 1;
        }
    }
    return 1;
};

// Calculate progress to next level
const calculateLevelProgress = (xp, level) => {
    const currentThreshold = LEVEL_THRESHOLDS[level - 1] || 0;
    const nextThreshold = LEVEL_THRESHOLDS[level] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];

    if (nextThreshold === currentThreshold) return 100;

    const progress = ((xp - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
    return Math.min(Math.max(progress, 0), 100);
};

export const useGamification = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState(null);
    const [notifications, setNotifications] = useState([]);

    // Store previous values for animations
    // ✅ FIXED: Use refs to track previous values without re-triggering listener
    const prevXPRef = useRef(null);
    const prevLevelRef = useRef(null);

    // Main gamification data
    const [gamificationData, setGamificationData] = useState({
        xp: 0,
        level: 1,
        streak: 0,
        nextLevelXp: 100,
        levelProgress: 0,
        globalRank: 999,

        // Badges
        unlockedBadges: [],
        badgesUnlocked: 0,

        // Titles
        unlockedTitles: [],
        equippedTitle: 'Newbie Scholar',
        equippedTitleId: 'title_newbie',

        // Streak data
        streakData: {
            currentStreak: 0,
            longestStreak: 0,
            lastCheckIn: null,
            activeDays: [],
            streakFreeze: 0
        },

        // Activity stats
        totalStudyTime: 0,
        quizzesCompleted: 0,
        perfectQuizzes: 0,
        flashcardsReviewed: 0,
        flashcardsMastered: 0,
        documentsUploaded: 0,
        classesJoined: 0
    });

    // 🔥 MAIN REALTIME LISTENER - Users Collection (Unified Source of Truth)
    useEffect(() => {
        if (!user?.uid) {
            setLoading(false);
            return;
        }

        console.log('🔄 Setting up realtime gamification listener (Users Collection)');
        setLoading(true);

        const userRef = doc(db, 'users', user.uid);

        const unsubscribe = onSnapshot(
            userRef,
            (snapshot) => {
                if (snapshot.exists()) {
                    const data = snapshot.data();

                    const xp = data.xp || 0;
                    const level = calculateLevel(xp);
                    const nextLevelXp = LEVEL_THRESHOLDS[level] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
                    const levelProgress = calculateLevelProgress(xp, level);

                    // 🎉 Detect XP gain (Only if prev exists)
                    const previousXP = prevXPRef.current;
                    if (previousXP !== null && xp > previousXP) {
                        const gained = xp - previousXP;

                        // Prevent toast spam on initial load or large updates
                        if (gained < 1000) {
                            toast.success(`+${gained} XP!`, {
                                icon: '⚡',
                                duration: 2000,
                                position: 'top-right',
                                id: 'xp-toast' // Prevent duplicates
                            });
                        }
                    }

                    // 🎊 Detect level up (Only if prev exists)
                    const previousLevel = prevLevelRef.current;
                    if (previousLevel !== null && level > previousLevel) {
                        confetti({
                            particleCount: 200,
                            spread: 100,
                            origin: { y: 0.5 },
                            colors: ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b']
                        });

                        toast.success(`🎉 Level ${level} Unlocked!`, {
                            duration: 4000,
                            position: 'top-center',
                            icon: '👑'
                        });

                        // Add level up notification
                        setNotifications(prev => [...prev, {
                            type: 'levelUp',
                            data: { newLevel: level, xpGained: xp - (previousXP || 0) },
                            id: `levelup-${Date.now()}`,
                            timestamp: Date.now()
                        }]);
                    }

                    // Update refs
                    prevXPRef.current = xp;
                    prevLevelRef.current = level;

                    setGamificationData({
                        xp,
                        level,
                        nextLevelXp,
                        levelProgress,
                        globalRank: data.globalRank || 999,
                        streak: data.streak || 0, // ✅ Correctly reading from users collection

                        unlockedBadges: data.unlockedBadges || [],
                        badgesUnlocked: (data.unlockedBadges || []).length,

                        unlockedTitles: data.unlockedTitles || ['title_newbie'],
                        equippedTitle: data.equippedTitle || 'Newbie Scholar',
                        equippedTitleId: data.equippedTitleId || 'title_newbie',

                        // Map legacy streakData structure for compatibility
                        streakData: {
                            currentStreak: data.streak || 0,
                            longestStreak: data.longestStreak || data.streak || 0,
                            lastCheckIn: data.lastLoginDate || null,
                            activeDays: [], // Can be populated if needed, but not strictly required for basic display
                            streakFreeze: 0
                        },

                        totalStudyTime: data.totalStudyTime || 0,
                        quizzesCompleted: data.totalQuizzes || 0,
                        perfectQuizzes: data.perfectQuizzes || 0,
                        flashcardsReviewed: data.flashcardsReviewed || 0,
                        flashcardsMastered: data.flashcardsMastered || 0,
                        documentsUploaded: data.totalDocuments || 0,
                        classesJoined: data.totalRoomsJoined || 0
                    });

                    setError(null);
                } else {
                    console.warn('⚠️ No user gamification data found');
                    if (loading) setError('Gamification data not initialized');
                }

                setLoading(false);
                setSyncing(false);
            },
            (err) => {
                console.error('❌ Gamification listener error:', err);
                setError(err.message);
                setLoading(false);
                setSyncing(false);
            }
        );

        return () => {
            console.log('🔴 Cleaning up gamification listener');
            unsubscribe();
        };
    }, [user?.uid]); // ✅ Removed previousXP/previousLevel deps to prevent re-subscribing loop

    // Process all badges with unlock status
    const allBadges = useMemo(() => {
        return Object.values(BADGE_DEFINITIONS).map(badge => ({
            ...badge,
            unlocked: gamificationData.unlockedBadges.includes(badge.id)
        }));
    }, [gamificationData.unlockedBadges]);

    // Process all titles with unlock status
    const allTitles = useMemo(() => {
        return Object.values(TITLE_DEFINITIONS).map(title => ({
            ...title,
            unlocked: gamificationData.unlockedTitles.includes(title.id)
        }));
    }, [gamificationData.unlockedTitles]);

    // Track action wrapper
    const trackAction = useCallback(async (actionType, data = {}) => {
        if (!user?.uid) {
            console.warn('⚠️ Cannot track action: user not authenticated');
            return { success: false };
        }

        setSyncing(true);

        try {
            await trackActionService(user.uid, actionType, data);

            // Check for new unlocks after a short delay
            setTimeout(() => {
                checkAndUnlockAchievements(user.uid).catch(console.error);
            }, 500);

            return { success: true };
        } catch (error) {
            console.error('❌ Error tracking action:', error);
            toast.error('Failed to track action');
            return { success: false, error: error.message };
        } finally {
            setSyncing(false);
        }
    }, [user?.uid]);

    // Change equipped title
    const changeTitle = useCallback(async (titleId) => {
        if (!user?.uid) {
            return { success: false, error: 'Not authenticated' };
        }

        try {
            const title = allTitles.find(t => t.id === titleId);

            if (!title) {
                return { success: false, error: 'Title not found' };
            }

            if (!title.unlocked) {
                return { success: false, error: 'Title not unlocked' };
            }

            const gamificationRef = doc(db, 'gamification', user.uid);
            await updateDoc(gamificationRef, {
                equippedTitle: title.text,
                equippedTitleId: title.id,
                updatedAt: serverTimestamp()
            });

            toast.success(`👑 Title equipped: ${title.text}`);
            return { success: true };
        } catch (error) {
            console.error('❌ Error equipping title:', error);
            toast.error('Failed to equip title');
            return { success: false, error: error.message };
        }
    }, [user?.uid, allTitles]);

    // Dismiss notification
    const dismissNotification = useCallback((notificationId) => {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
    }, []);

    // Clear all notifications
    const clearAllNotifications = useCallback(() => {
        setNotifications([]);
    }, []);

    // Computed values
    const computedValues = useMemo(() => ({
        xpToNextLevel: Math.max(0, gamificationData.nextLevelXp - gamificationData.xp),

        totalBadges: allBadges.filter(b => b.unlocked).length,
        totalBadgesCount: allBadges.length,

        badgeCompletionRate: allBadges.length > 0
            ? Math.round((allBadges.filter(b => b.unlocked).length / allBadges.length) * 100)
            : 0,

        titleCompletionRate: allTitles.length > 0
            ? Math.round((allTitles.filter(t => t.unlocked).length / allTitles.length) * 100)
            : 0,

        isMaxLevel: gamificationData.level >= LEVEL_THRESHOLDS.length - 1,

        hasStreak: gamificationData.streak > 0,

        nextMilestone: (() => {
            const milestones = [10, 25, 50, 100];
            const nextBadgeMilestone = milestones.find(m => allBadges.filter(b => b.unlocked).length < m);
            return nextBadgeMilestone || null;
        })()
    }), [gamificationData, allBadges, allTitles]);

    return {
        // Core stats
        xp: gamificationData.xp,
        level: gamificationData.level,
        nextLevelXp: gamificationData.nextLevelXp,
        levelProgress: gamificationData.levelProgress,
        globalRank: gamificationData.globalRank,
        streak: gamificationData.streak,

        // Badges & Titles
        totalBadges: computedValues.totalBadges,
        allBadges,
        unlockedBadges: gamificationData.unlockedBadges,

        allTitles,
        unlockedTitles: gamificationData.unlockedTitles,
        equippedTitle: gamificationData.equippedTitle,
        equippedTitleId: gamificationData.equippedTitleId,

        // Streak data
        streakData: gamificationData.streakData,

        // Activity stats
        totalStudyTime: gamificationData.totalStudyTime,
        quizzesCompleted: gamificationData.quizzesCompleted,
        perfectQuizzes: gamificationData.perfectQuizzes,
        flashcardsReviewed: gamificationData.flashcardsReviewed,
        flashcardsMastered: gamificationData.flashcardsMastered,
        documentsUploaded: gamificationData.documentsUploaded,
        classesJoined: gamificationData.classesJoined,

        // Computed values
        ...computedValues,

        // Actions
        trackAction,
        changeTitle,
        dismissNotification,
        clearAllNotifications,

        // State
        loading,
        syncing,
        error,
        isLoaded: !loading,

        // Notifications
        notifications,
        hasNotifications: notifications.length > 0
    };
};

export default useGamification;
