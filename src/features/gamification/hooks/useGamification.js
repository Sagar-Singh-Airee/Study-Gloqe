// src/features/gamification/hooks/useGamification.js - 🚀 ULTIMATE REALTIME VERSION (COLLECTION FIXED)
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { doc, onSnapshot, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../../../shared/config/firebase';
import { useAuth } from '../../auth/contexts/AuthContext';
import { BADGE_DEFINITIONS, TITLE_DEFINITIONS } from '../config/achievements';
import { trackAction as trackActionService, checkAndUnlockAchievements, initializeUserAchievements } from '../services/achievementTracker';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { calculateLevel, calculateLevelProgress, getNextLevelXp, LEVEL_THRESHOLDS } from '../../../shared/utils/levelUtils';




export const useGamification = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState(null);
    const [notifications, setNotifications] = useState([]);

    // ✅ DEDICATED REFS - Prevents race conditions
    const isMountedRef = useRef(true);
    const unsubscribeRef = useRef(null);
    const achievementCheckTimeoutRef = useRef(null);
    const initAttemptedRef = useRef(false);

    // Store previous values for animations
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
        unlockedTitles: ['title_newbie'],
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

    // 🔥 MAIN REALTIME LISTENER - Gamification Collection (FIXED)
    useEffect(() => {
        // Reset mounted flag
        isMountedRef.current = true;
        initAttemptedRef.current = false;

        if (!user?.uid) {
            setLoading(false);
            return;
        }

        console.log('🔄 Setting up realtime gamification listener (Gamification Collection)');
        setLoading(true);

        // ✅ Point to 'gamification' collection instead of 'users'
        const gamificationRef = doc(db, 'gamification', user.uid);

        // ✅ NO DELAY - Set up listener immediately to prevent race conditions
        unsubscribeRef.current = onSnapshot(
            gamificationRef,
            async (snapshot) => {
                // ✅ Check if component is still mounted
                if (!isMountedRef.current) {
                    console.log('⚠️ Component unmounted, skipping state update');
                    return;
                }

                if (snapshot.exists()) {
                    const data = snapshot.data();

                    const xp = data.xp || 0;
                    const level = calculateLevel(xp);
                    const nextLevelXp = getNextLevelXp(xp);
                    const levelProgress = calculateLevelProgress(xp);

                    // 🎉 Detect XP gain (Only if prev exists)
                    const previousXP = prevXPRef.current;
                    if (previousXP !== null && xp > previousXP) {
                        const gained = xp - previousXP;

                        if (gained < 1000 && isMountedRef.current) {
                            toast.success(`+${gained} XP!`, {
                                icon: '⚡',
                                duration: 2000,
                                position: 'top-right',
                                id: 'xp-toast'
                            });
                        }
                    }

                    // 🎊 Detect level up
                    const previousLevel = prevLevelRef.current;
                    if (previousLevel !== null && level > previousLevel && isMountedRef.current) {
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

                    // Update state
                    setGamificationData({
                        xp,
                        level,
                        nextLevelXp,
                        levelProgress,
                        globalRank: data.globalRank || 999,
                        streak: data.streakData?.currentStreak || 0, // Use streakData.currentStreak

                        unlockedBadges: data.unlockedBadges || [],
                        badgesUnlocked: (data.unlockedBadges || []).length,

                        unlockedTitles: data.unlockedTitles || ['title_newbie'],
                        equippedTitle: data.equippedTitle || 'Newbie Scholar',
                        equippedTitleId: data.equippedTitleId || 'title_newbie',

                        streakData: {
                            currentStreak: data.streakData?.currentStreak || 0,
                            longestStreak: data.streakData?.longestStreak || 0,
                            lastCheckIn: data.streakData?.lastCheckIn || null,
                            activeDays: data.streakData?.activeDays || [],
                            streakFreeze: data.streakData?.streakFreeze || 0
                        },

                        totalStudyTime: data.totalStudyTime || 0,
                        quizzesCompleted: data.quizzesCompleted || 0,
                        perfectQuizzes: data.perfectQuizzes || 0,
                        flashcardsReviewed: data.flashcardsReviewed || 0,
                        flashcardsMastered: data.flashcardsMastered || 0,
                        documentsUploaded: data.documentsUploaded || 0,
                        classesJoined: data.classesJoined || 0
                    });

                    setError(null);
                    setLoading(false);
                    setSyncing(false);
                } else {
                    // ⚠️ No data found - Attempt initialization
                    console.warn('⚠️ No gamification data found, initializing...');

                    if (!initAttemptedRef.current) {
                        initAttemptedRef.current = true;
                        try {
                            await initializeUserAchievements(user.uid);
                            // The listener will catch the update after initialization
                        } catch (initErr) {
                            console.error("❌ Failed to initialize gamification:", initErr);
                            if (isMountedRef.current) {
                                setError('Failed to initialize gamification profile');
                                setLoading(false);
                            }
                        }
                    } else {
                        // Already attempted init and still no data? Stop infinite loop
                        if (isMountedRef.current) {
                            setError('Gamification data not initialized');
                            setLoading(false);
                        }
                    }
                }
            },
            (err) => {
                console.error('❌ Gamification listener error:', err);
                if (isMountedRef.current) {
                    setError(err.message);
                    setLoading(false);
                    setSyncing(false);
                }
            }
        );

        // ✅ PROPER CLEANUP - Guaranteed to run
        return () => {
            console.log('🔴 Cleaning up gamification listener');
            isMountedRef.current = false;

            // Clear any pending achievement checks
            if (achievementCheckTimeoutRef.current) {
                clearTimeout(achievementCheckTimeoutRef.current);
                achievementCheckTimeoutRef.current = null;
            }

            // Unsubscribe from Firestore listener
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
                unsubscribeRef.current = null;
            }
        };
    }, [user?.uid]); // ✅ Only re-run when user ID changes

    // ✅ SAFE GUARD: Ensure BADGE_DEFINITIONS and TITLE_DEFINITIONS are valid
    const allBadges = useMemo(() => {
        if (!BADGE_DEFINITIONS || typeof BADGE_DEFINITIONS !== 'object') {
            console.warn('⚠️ BADGE_DEFINITIONS is not defined');
            return [];
        }
        return Object.values(BADGE_DEFINITIONS).map(badge => ({
            ...badge,
            unlocked: gamificationData.unlockedBadges.includes(badge.id)
        }));
    }, [gamificationData.unlockedBadges]);

    const allTitles = useMemo(() => {
        if (!TITLE_DEFINITIONS || typeof TITLE_DEFINITIONS !== 'object') {
            console.warn('⚠️ TITLE_DEFINITIONS is not defined');
            return [];
        }
        return Object.values(TITLE_DEFINITIONS).map(title => ({
            ...title,
            unlocked: gamificationData.unlockedTitles.includes(title.id)
        }));
    }, [gamificationData.unlockedTitles]);

    // ✅ Track action wrapper - WITH PROPER CLEANUP
    const trackAction = useCallback(async (actionType, data = {}) => {
        if (!user?.uid) {
            console.warn('⚠️ Cannot track action: user not authenticated');
            return { success: false };
        }

        setSyncing(true);

        try {
            await trackActionService(user.uid, actionType, data);

            // ✅ FIX: Clear previous timeout and store new one
            if (achievementCheckTimeoutRef.current) {
                clearTimeout(achievementCheckTimeoutRef.current);
            }

            achievementCheckTimeoutRef.current = setTimeout(() => {
                if (isMountedRef.current) {
                    checkAndUnlockAchievements(user.uid).catch(console.error);
                }
                achievementCheckTimeoutRef.current = null;
            }, 500);

            return { success: true };
        } catch (error) {
            console.error('❌ Error tracking action:', error);
            if (isMountedRef.current) {
                toast.error('Failed to track action');
            }
            return { success: false, error: error.message };
        } finally {
            if (isMountedRef.current) {
                setSyncing(false);
            }
        }
    }, [user?.uid]);

    // ✅ Change equipped title - write to GAMIFICATION collection (and USERS for profile sync)
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

            setSyncing(true);

            // 1. Update GAMIFICATION collection (Source of truth for this hook)
            const gamificationRef = doc(db, 'gamification', user.uid);
            await updateDoc(gamificationRef, {
                equippedTitle: title.text,
                equippedTitleId: title.id,
                updatedAt: serverTimestamp()
            });

            // 2. Update USERS collection (For public profile display)
            // We do this concurrently but don't fail the operation if this tracking one fails?
            // Better to await it to ensure consistency.
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                equippedTitle: title.text,
                equippedTitleId: title.id,
                updatedAt: serverTimestamp()
            }).catch(e => console.warn("Failed to sync title to user profile:", e));

            if (isMountedRef.current) {
                toast.success(`👑 Title equipped: ${title.text}`);
                setSyncing(false);
            }
            return { success: true };
        } catch (error) {
            console.error('❌ Error equipping title:', error);
            if (isMountedRef.current) {
                toast.error('Failed to equip title');
                setSyncing(false);
            }
            return { success: false, error: error.message };
        }
    }, [user?.uid, allTitles]);

    // Dismiss notification
    const dismissNotification = useCallback((notificationId) => {
        if (isMountedRef.current) {
            setNotifications(prev => prev.filter(n => n.id !== notificationId));
        }
    }, []);

    // Clear all notifications
    const clearAllNotifications = useCallback(() => {
        if (isMountedRef.current) {
            setNotifications([]);
        }
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

        isMaxLevel: gamificationData.level >= LEVEL_THRESHOLDS.length,

        hasStreak: gamificationData.streak > 0,

        nextMilestone: (() => {
            const milestones = [10, 25, 50, 100];
            const nextBadgeMilestone = milestones.find(m => allBadges.filter(b => b.unlocked).length < m);
            return nextBadgeMilestone || null;
        })()
    }), [gamificationData, allBadges, allTitles]);

    // ✅ SELF-HEALING: Check for legacy streak if current is 0
    useEffect(() => {
        const checkAndRepairStreak = async () => {
            if (!user?.uid || loading) return;

            // If we have data but streak is 0, check if we lost it during migration
            const currentStreak = gamificationData?.streakData?.currentStreak || 0;

            if (currentStreak === 0) {
                try {
                    const userDoc = await getDoc(doc(db, 'users', user.uid));
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        const legacyStreak = userData?.streakData?.currentStreak || userData?.streak || 0;

                        // Only restore if legacy is actually non-zero
                        if (legacyStreak > 0) {
                            console.log(`🩹 Repairing streak: Restoring ${legacyStreak} from legacy profile...`);

                            const gamificationRef = doc(db, 'gamification', user.uid);
                            await updateDoc(gamificationRef, {
                                'streakData.currentStreak': legacyStreak,
                                'streakData.longestStreak': Math.max(legacyStreak, userData?.streakData?.longestStreak || 0),
                                'streakData.activeDays': userData?.streakData?.activeDays || [],
                                'streakData.lastCheckIn': userData?.streakData?.lastCheckIn || null,
                                // Also sync XP/Level if they are 0/1 but legacy has more
                                ...(gamificationData?.xp === 0 && userData?.xp > 0 ? { xp: userData.xp } : {}),
                                ...(gamificationData?.level === 1 && userData?.level > 1 ? { level: userData.level } : {})
                            });

                            toast.success('Stats restored from backup!', { icon: '🔄' });
                        }
                    }
                } catch (err) {
                    console.error('Error repairing streak:', err);
                }
            }
        };

        if (!loading && gamificationData) {
            checkAndRepairStreak();
        }
    }, [user?.uid, loading, gamificationData?.streakData?.currentStreak]);

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
        recentlyUnlocked: allBadges
            .filter(b => b.unlocked)
            .reverse() // Assume arrayUnion appends, so reverse to get newest first
            .slice(0, 5),

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