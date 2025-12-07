// src/hooks/useGamification.js - PRODUCTION-READY with Error Resilience
import { useState, useEffect, useCallback, useMemo } from 'react';
import { doc, onSnapshot, collection } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import {
    trackActionAndCheckUnlocks,
    equipTitle,
    BADGE_DEFINITIONS,
    TITLE_DEFINITIONS
} from '@/services/gamificationService';

/**
 * Level progression thresholds
 */
const LEVEL_THRESHOLDS = [0, 100, 250, 500, 1000, 2000, 4000, 8000, 16000, 32000, 64000];

/**
 * Calculate level progress percentage
 */
const calculateLevelProgress = (xp, level) => {
    const currentThreshold = LEVEL_THRESHOLDS[level - 1] || 0;
    const nextThreshold = LEVEL_THRESHOLDS[level] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
    
    if (nextThreshold === currentThreshold) return 100;
    
    const progress = ((xp - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
    return Math.min(Math.max(progress, 0), 100);
};

/**
 * Centralized hook for all gamification data with real-time updates
 * Provides user stats, badges, titles, achievements, and missions
 */
export const useGamification = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [notifications, setNotifications] = useState([]);

    const [data, setData] = useState({
        // User Stats
        xp: 0,
        level: 1,
        streak: 0,
        nextLevelXp: 100,
        levelProgress: 0,

        // Badges
        unlockedBadges: [],
        allBadges: [],
        totalBadges: 0,

        // Titles
        unlockedTitles: [],
        allTitles: [],
        equippedTitle: 'Novice Learner',
        equippedTitleId: 'novice',

        // Achievements
        achievements: [],
        unlockedAchievements: 0,
        totalAchievements: 0,

        // Missions
        dailyMissions: [],
        weeklyMissions: [],

        // Leaderboard
        globalRank: '--',
        classRank: '--'
    });

    // ==========================================
    // REAL-TIME USER STATS LISTENER
    // ==========================================
    useEffect(() => {
        if (!user?.uid) {
            setLoading(false);
            return;
        }

        let unsubUser = null;

        try {
            const userRef = doc(db, 'users', user.uid);
            
            unsubUser = onSnapshot(
                userRef,
                (snapshot) => {
                    if (snapshot.exists()) {
                        const userData = snapshot.data();
                        const xp = userData.xp || 0;
                        const level = userData.level || 1;
                        const nextLevelXp = LEVEL_THRESHOLDS[level] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
                        const levelProgress = calculateLevelProgress(xp, level);

                        setData(prev => ({
                            ...prev,
                            xp,
                            level,
                            streak: userData.streak || 0,
                            nextLevelXp,
                            levelProgress,
                            unlockedBadges: userData.unlockedBadges || [],
                            unlockedTitles: userData.unlockedTitles || [],
                            equippedTitle: userData.equippedTitle || 'Novice Learner',
                            equippedTitleId: userData.equippedTitleId || 'novice',
                            globalRank: userData.globalRank || '--',
                            classRank: userData.classRank || '--',
                            totalBadges: (userData.unlockedBadges || []).length
                        }));
                        
                        setError(null);
                    } else {
                        console.log('⚠️ User gamification data not found, using defaults');
                    }
                },
                (err) => {
                    console.error('❌ Error fetching user stats:', err);
                    // Don't set error state, just log it
                }
            );
        } catch (err) {
            console.error('❌ Error setting up user listener:', err);
        }

        return () => {
            if (unsubUser) unsubUser();
        };
    }, [user?.uid]);

    // ==========================================
    // REAL-TIME GLOBAL BADGES LISTENER (With Fallback)
    // ==========================================
    useEffect(() => {
        let unsubBadges = null;
        let mounted = true;

        const setupBadgesListener = async () => {
            try {
                const badgesRef = collection(db, 'globalBadges');
                
                unsubBadges = onSnapshot(
                    badgesRef,
                    (snapshot) => {
                        if (!mounted) return;

                        let badges = [];
                        
                        if (!snapshot.empty) {
                            // Use Firestore badges
                            badges = snapshot.docs.map(doc => ({
                                id: doc.id,
                                ...doc.data()
                            }));
                            console.log('✅ Loaded badges from Firestore:', badges.length);
                        } else {
                            // Fallback to local definitions
                            console.log('⚠️ No globalBadges found, using local definitions');
                            badges = Object.values(BADGE_DEFINITIONS);
                        }

                        setData(prev => ({
                            ...prev,
                            allBadges: badges.map(badge => ({
                                ...badge,
                                unlocked: prev.unlockedBadges.includes(badge.id)
                            }))
                        }));
                    },
                    (err) => {
                        if (!mounted) return;
                        
                        console.warn('⚠️ Error fetching badges, using local definitions:', err.message);
                        
                        // Fallback to local definitions on error
                        const badges = Object.values(BADGE_DEFINITIONS);
                        setData(prev => ({
                            ...prev,
                            allBadges: badges.map(badge => ({
                                ...badge,
                                unlocked: prev.unlockedBadges.includes(badge.id)
                            }))
                        }));
                    }
                );
            } catch (err) {
                if (!mounted) return;
                
                console.warn('⚠️ Cannot setup badges listener, using local definitions:', err.message);
                
                // Use local definitions
                const badges = Object.values(BADGE_DEFINITIONS);
                setData(prev => ({
                    ...prev,
                    allBadges: badges.map(badge => ({
                        ...badge,
                        unlocked: prev.unlockedBadges.includes(badge.id)
                    }))
                }));
            }
        };

        setupBadgesListener();

        return () => {
            mounted = false;
            if (unsubBadges) unsubBadges();
        };
    }, []);

    // ==========================================
    // REAL-TIME GLOBAL TITLES LISTENER (With Fallback)
    // ==========================================
    useEffect(() => {
        let unsubTitles = null;
        let mounted = true;

        const setupTitlesListener = async () => {
            try {
                const titlesRef = collection(db, 'globalTitles');
                
                unsubTitles = onSnapshot(
                    titlesRef,
                    (snapshot) => {
                        if (!mounted) return;

                        let titles = [];
                        
                        if (!snapshot.empty) {
                            // Use Firestore titles
                            titles = snapshot.docs.map(doc => ({
                                id: doc.id,
                                ...doc.data()
                            }));
                            console.log('✅ Loaded titles from Firestore:', titles.length);
                        } else {
                            // Fallback to local definitions
                            console.log('⚠️ No globalTitles found, using local definitions');
                            titles = Object.values(TITLE_DEFINITIONS);
                        }

                        setData(prev => ({
                            ...prev,
                            allTitles: titles.map(title => ({
                                ...title,
                                unlocked: prev.level >= (title.requiredLevel || 1)
                            }))
                        }));

                        setLoading(false);
                    },
                    (err) => {
                        if (!mounted) return;
                        
                        console.warn('⚠️ Error fetching titles, using local definitions:', err.message);
                        
                        // Fallback to local definitions on error
                        const titles = Object.values(TITLE_DEFINITIONS);
                        setData(prev => ({
                            ...prev,
                            allTitles: titles.map(title => ({
                                ...title,
                                unlocked: prev.level >= (title.requiredLevel || 1)
                            }))
                        }));
                        
                        setLoading(false);
                    }
                );
            } catch (err) {
                if (!mounted) return;
                
                console.warn('⚠️ Cannot setup titles listener, using local definitions:', err.message);
                
                // Use local definitions
                const titles = Object.values(TITLE_DEFINITIONS);
                setData(prev => ({
                    ...prev,
                    allTitles: titles.map(title => ({
                        ...title,
                        unlocked: prev.level >= (title.requiredLevel || 1)
                    }))
                }));
                
                setLoading(false);
            }
        };

        setupTitlesListener();

        return () => {
            mounted = false;
            if (unsubTitles) unsubTitles();
        };
    }, []);

    // ==========================================
    // REAL-TIME GAMIFICATION DATA LISTENER
    // ==========================================
    useEffect(() => {
        if (!user?.uid) return;

        let unsubGamification = null;
        let mounted = true;

        try {
            const gamificationRef = doc(db, 'gamification', user.uid);
            
            unsubGamification = onSnapshot(
                gamificationRef,
                (snapshot) => {
                    if (!mounted) return;

                    if (snapshot.exists()) {
                        const gamificationData = snapshot.data();
                        const achievements = gamificationData.achievements || [];
                        const missions = gamificationData.missions || [];

                        setData(prev => ({
                            ...prev,
                            achievements,
                            unlockedAchievements: achievements.filter(a => a.unlocked).length,
                            totalAchievements: achievements.length,
                            dailyMissions: missions.filter(m => m.type === 'daily'),
                            weeklyMissions: missions.filter(m => m.type === 'weekly')
                        }));
                    } else {
                        // Document doesn't exist, use defaults
                        setData(prev => ({
                            ...prev,
                            achievements: [],
                            unlockedAchievements: 0,
                            totalAchievements: 0,
                            dailyMissions: [],
                            weeklyMissions: []
                        }));
                    }
                },
                (err) => {
                    if (!mounted) return;
                    console.warn('⚠️ Error fetching gamification data:', err.message);
                    // Keep existing data on error
                }
            );
        } catch (err) {
            console.warn('⚠️ Cannot setup gamification listener:', err.message);
        }

        return () => {
            mounted = false;
            if (unsubGamification) unsubGamification();
        };
    }, [user?.uid]);

    // ==========================================
    // HELPER: TRACK ACTION
    // ==========================================
    const trackAction = useCallback(async (action, metadata = {}) => {
        if (!user?.uid) {
            console.warn('⚠️ Cannot track action: user not authenticated');
            return { badges: [], titles: [], achievements: [] };
        }

        try {
            const unlocks = await trackActionAndCheckUnlocks(user.uid, action, metadata);

            // Create notifications for new unlocks
            const newNotifications = [];

            if (unlocks.badges?.length > 0) {
                unlocks.badges.forEach(badge => {
                    newNotifications.push({
                        type: 'badge',
                        data: badge,
                        id: `badge-${badge.id}-${Date.now()}-${Math.random()}`,
                        timestamp: Date.now()
                    });
                });
            }

            if (unlocks.titles?.length > 0) {
                unlocks.titles.forEach(title => {
                    newNotifications.push({
                        type: 'title',
                        data: title,
                        id: `title-${title.id}-${Date.now()}-${Math.random()}`,
                        timestamp: Date.now()
                    });
                });
            }

            if (unlocks.achievements?.length > 0) {
                unlocks.achievements.forEach(achievement => {
                    newNotifications.push({
                        type: 'achievement',
                        data: achievement,
                        id: `achievement-${achievement.id}-${Date.now()}-${Math.random()}`,
                        timestamp: Date.now()
                    });
                });
            }

            if (unlocks.levelUp) {
                newNotifications.push({
                    type: 'levelUp',
                    data: { newLevel: unlocks.newLevel },
                    id: `levelup-${Date.now()}-${Math.random()}`,
                    timestamp: Date.now()
                });
            }

            if (newNotifications.length > 0) {
                setNotifications(prev => [...prev, ...newNotifications]);
                
                // Auto-dismiss after 5 seconds
                setTimeout(() => {
                    setNotifications(prev => 
                        prev.filter(n => !newNotifications.find(nn => nn.id === n.id))
                    );
                }, 5000);
            }

            return unlocks;
        } catch (error) {
            console.error('❌ Error tracking action:', error);
            return { badges: [], titles: [], achievements: [] };
        }
    }, [user?.uid]);

    // ==========================================
    // HELPER: CHANGE TITLE
    // ==========================================
    const changeTitle = useCallback(async (titleId) => {
        if (!user?.uid) {
            return { success: false, error: 'User not authenticated' };
        }

        try {
            await equipTitle(user.uid, titleId);
            return { success: true };
        } catch (error) {
            console.error('❌ Error equipping title:', error);
            return { success: false, error: error.message };
        }
    }, [user?.uid]);

    // ==========================================
    // HELPER: DISMISS NOTIFICATION
    // ==========================================
    const dismissNotification = useCallback((notificationId) => {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
    }, []);

    // ==========================================
    // HELPER: CLEAR ALL NOTIFICATIONS
    // ==========================================
    const clearAllNotifications = useCallback(() => {
        setNotifications([]);
    }, []);

    // ==========================================
    // COMPUTED VALUES
    // ==========================================
    const computedValues = useMemo(() => ({
        // XP until next level
        xpToNextLevel: data.nextLevelXp - data.xp,
        
        // Percentage of badges unlocked
        badgeCompletionRate: data.allBadges.length > 0 
            ? Math.round((data.totalBadges / data.allBadges.length) * 100) 
            : 0,
        
        // Percentage of titles unlocked
        titleCompletionRate: data.allTitles.length > 0
            ? Math.round((data.unlockedTitles.length / data.allTitles.length) * 100)
            : 0,
        
        // Is max level
        isMaxLevel: data.level >= LEVEL_THRESHOLDS.length,
        
        // Has active streak
        hasStreak: data.streak > 0,
        
        // Next badge to unlock (sorted by XP requirement)
        nextBadge: data.allBadges
            .filter(b => !b.unlocked)
            .sort((a, b) => (a.requiredXp || 0) - (b.requiredXp || 0))[0] || null,
    }), [data]);

    // ==========================================
    // RETURN VALUE
    // ==========================================
    return {
        // Raw data
        ...data,
        
        // Computed values
        ...computedValues,
        
        // State flags
        loading,
        error,
        isLoaded: !loading,
        
        // Notifications
        notifications,
        hasNotifications: notifications.length > 0,
        
        // Actions
        trackAction,
        changeTitle,
        dismissNotification,
        clearAllNotifications,
    };
};

export default useGamification;
