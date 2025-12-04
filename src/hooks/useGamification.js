// src/hooks/useGamification.js - Real-time Gamification Data Hook
import { useState, useEffect } from 'react';
import { doc, onSnapshot, collection } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@contexts/AuthContext';
import {
    trackActionAndCheckUnlocks,
    equipTitle,
    BADGE_DEFINITIONS,
    TITLE_DEFINITIONS
} from '@/services/gamificationService';

/**
 * Centralized hook for all gamification data with real-time updates
 * Combines user stats badges, titles, achievements, and missions
 */
export const useGamification = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
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

    // Real-time user stats listener
    useEffect(() => {
        if (!user?.uid) {
            setLoading(false);
            return;
        }

        const userRef = doc(db, 'users', user.uid);
        const unsubUser = onSnapshot(userRef, (snapshot) => {
            if (snapshot.exists()) {
                const userData = snapshot.data();
                const xp = userData.xp || 0;
                const level = userData.level || 1;

                // Level thresholds from gamificationService
                const levelThresholds = [0, 100, 250, 500, 1000, 2000, 4000, 8000, 16000];
                const nextLevelXp = levelThresholds[level] || levelThresholds[levelThresholds.length - 1];
                const previousLevelXp = levelThresholds[level - 1] || 0;
                const levelProgress = nextLevelXp ? ((xp - previousLevelXp) / (nextLevelXp - previousLevelXp)) * 100 : 0;

                setData(prev => ({
                    ...prev,
                    xp,
                    level,
                    streak: userData.streak || 0,
                    nextLevelXp,
                    levelProgress: Math.min(levelProgress, 100),
                    unlockedBadges: userData.unlockedBadges || [],
                    unlockedTitles: userData.unlockedTitles || [],
                    equippedTitle: userData.equippedTitle || 'Novice Learner',
                    equippedTitleId: userData.equippedTitleId || 'novice',
                    globalRank: userData.globalRank || '--',
                    totalBadges: (userData.unlockedBadges || []).length
                }));
            }
        });

        return () => unsubUser();
    }, [user?.uid]);

    // Real-time badges listener
    useEffect(() => {
        const badgesRef = collection(db, 'badges');
        const unsubBadges = onSnapshot(badgesRef, (snapshot) => {
            const allBadges = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            setData(prev => ({
                ...prev,
                allBadges: allBadges.map(badge => ({
                    ...badge,
                    unlocked: prev.unlockedBadges.includes(badge.id)
                }))
            }));
        });

        return () => unsubBadges();
    }, []);

    // Real-time titles listener
    useEffect(() => {
        const titlesRef = collection(db, 'titles');
        const unsubTitles = onSnapshot(titlesRef, (snapshot) => {
            const allTitles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            setData(prev => ({
                ...prev,
                allTitles: allTitles.map(title => ({
                    ...title,
                    unlocked: prev.unlockedTitles.includes(title.id)
                }))
            }));

            setLoading(false);
        });

        return () => unsubTitles();
    }, []);

    // Real-time gamification data (missions & achievements) listener
    useEffect(() => {
        if (!user?.uid) return;

        const gamificationRef = doc(db, 'gamification', user.uid);
        const unsubGamification = onSnapshot(gamificationRef, (snapshot) => {
            if (snapshot.exists()) {
                const gamificationData = snapshot.data();
                const achievements = gamificationData.achievements || [];

                setData(prev => ({
                    ...prev,
                    achievements,
                    unlockedAchievements: achievements.filter(a => a.unlocked).length,
                    totalAchievements: achievements.length,
                    dailyMissions: (gamificationData.missions || []).filter(m => m.type === 'daily'),
                    weeklyMissions: (gamificationData.missions || []).filter(m => m.type === 'weekly')
                }));
            }
        });

        return () => unsubGamification();
    }, [user?.uid]);

    // Helper functions
    const trackAction = async (action, metadata = {}) => {
        if (!user?.uid) return;

        try {
            const unlocks = await trackActionAndCheckUnlocks(user.uid, action, metadata);

            // Add notifications for new unlocks
            const newNotifications = [];

            if (unlocks.badges.length > 0) {
                unlocks.badges.forEach(badge => {
                    newNotifications.push({
                        type: 'badge',
                        data: badge,
                        id: `badge-${badge.id}-${Date.now()}`
                    });
                });
            }

            if (unlocks.titles.length > 0) {
                unlocks.titles.forEach(title => {
                    newNotifications.push({
                        type: 'title',
                        data: title,
                        id: `title-${title.id}-${Date.now()}`
                    });
                });
            }

            if (unlocks.achievements.length > 0) {
                unlocks.achievements.forEach(achievement => {
                    newNotifications.push({
                        type: 'achievement',
                        data: achievement,
                        id: `achievement-${achievement.id}-${Date.now()}`
                    });
                });
            }

            if (newNotifications.length > 0) {
                setNotifications(prev => [...prev, ...newNotifications]);
            }

            return unlocks;
        } catch (error) {
            console.error('Error tracking action:', error);
            return { badges: [], titles: [], achievements: [] };
        }
    };

    const changeTitle = async (titleId) => {
        if (!user?.uid) return;

        try {
            await equipTitle(user.uid, titleId);
            return { success: true };
        } catch (error) {
            console.error('Error equipping title:', error);
            return { success: false, error: error.message };
        }
    };

    const dismissNotification = (notificationId) => {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
    };

    return {
        ...data,
        loading,
        notifications,
        trackAction,
        changeTitle,
        dismissNotification,
        isLoaded: !loading
    };
};

export default useGamification;
