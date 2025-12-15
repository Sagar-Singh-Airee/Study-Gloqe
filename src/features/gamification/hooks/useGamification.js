// src/hooks/useGamification.js - ✅ WITH AUTO-SYNC + FIXED
import { useState, useEffect, useCallback, useMemo } from 'react';
import { doc, onSnapshot, collection, updateDoc, setDoc, getDoc } from 'firebase/firestore';
// ✅ FIXED: Import db and COLLECTIONS from config
import { db, COLLECTIONS } from '@shared/config/firebase';
import { useAuth } from '@auth/contexts/AuthContext';
import {
    trackActionAndCheckUnlocks,
    equipTitle,
    BADGE_DEFINITIONS,
    TITLE_DEFINITIONS
} from '@gamification/services/gamificationService';

// Import analytics hooks for sync
import {
    useDocumentsData,
    useQuizSessionsData,
    useStudySessionsData,
    useFlashcardDecks
} from '@analytics/hooks/useAnalytics';

const LEVEL_THRESHOLDS = [0, 100, 250, 500, 1000, 2000, 4000, 8000, 16000, 32000, 64000];

const calculateLevelProgress = (xp, level) => {
    const currentThreshold = LEVEL_THRESHOLDS[level - 1] || 0;
    const nextThreshold = LEVEL_THRESHOLDS[level] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
    
    if (nextThreshold === currentThreshold) return 100;
    
    const progress = ((xp - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
    return Math.min(Math.max(progress, 0), 100);
};

// 🆕 Auto-calculate badges based on user activity
const calculateEarnedBadges = (documents, quizSessions, studySessions, decks, totalMastered) => {
    const earnedBadgeIds = [];
    
    // Document badges
    if (documents.length >= 1) earnedBadgeIds.push('first_upload');
    if (documents.length >= 5) earnedBadgeIds.push('doc_collector');
    if (documents.length >= 10) earnedBadgeIds.push('doc_master');
    if (documents.length >= 25) earnedBadgeIds.push('library_builder');
    
    // Quiz badges
    if (quizSessions.length >= 1) earnedBadgeIds.push('first_quiz');
    if (quizSessions.length >= 5) earnedBadgeIds.push('quiz_novice');
    if (quizSessions.length >= 10) earnedBadgeIds.push('quiz_expert');
    if (quizSessions.length >= 25) earnedBadgeIds.push('quiz_master');
    if (quizSessions.length >= 50) earnedBadgeIds.push('quiz_legend');
    
    // Study session badges
    const completedStudySessions = studySessions.filter(s => s.status === 'completed');
    const totalStudyMinutes = completedStudySessions.reduce((sum, s) => sum + (s.totalTime || 0), 0);
    
    if (totalStudyMinutes >= 60) earnedBadgeIds.push('study_hour');
    if (totalStudyMinutes >= 600) earnedBadgeIds.push('study_10hrs');
    if (totalStudyMinutes >= 3000) earnedBadgeIds.push('study_marathon');
    
    // Flashcard badges
    if (decks.length >= 1) earnedBadgeIds.push('flashcard_starter');
    if (totalMastered >= 50) earnedBadgeIds.push('card_master');
    if (totalMastered >= 200) earnedBadgeIds.push('memory_champion');
    
    return [...new Set(earnedBadgeIds)]; // Remove duplicates
};

export const useGamification = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [syncing, setSyncing] = useState(false);

    // 🆕 Import user activity data for auto-sync
    const { documents } = useDocumentsData(user?.uid);
    const { quizSessions } = useQuizSessionsData(user?.uid, 365);
    const { sessions: studySessions } = useStudySessionsData(user?.uid, 365);
    const { decks, totalMastered } = useFlashcardDecks(user?.uid);

    const [data, setData] = useState({
        xp: 0,
        level: 1,
        streak: 0,
        nextLevelXp: 100,
        levelProgress: 0,
        unlockedBadges: [],
        allBadges: [],
        totalBadges: 0,
        unlockedTitles: [],
        allTitles: [],
        equippedTitle: 'Novice Learner',
        equippedTitleId: 'novice',
        achievements: [],
        unlockedAchievements: 0,
        totalAchievements: 0,
        dailyMissions: [],
        weeklyMissions: [],
        globalRank: '--',
        classRank: '--'
    });

    // 🆕 Auto-sync badges when activity changes
    useEffect(() => {
        if (!user?.uid || loading || syncing) return;
        if (!documents || !quizSessions || !studySessions || !decks) return;

        const syncBadges = async () => {
            try {
                setSyncing(true);
                
                // Calculate earned badges
                const earnedBadgeIds = calculateEarnedBadges(
                    documents, 
                    quizSessions, 
                    studySessions, 
                    decks, 
                    totalMastered
                );

                // Check if there are new badges
                const currentBadges = data.unlockedBadges || [];
                const newBadges = earnedBadgeIds.filter(id => !currentBadges.includes(id));

                if (newBadges.length > 0) {
                    console.log(`🎖️ Auto-syncing ${newBadges.length} new badges:`, newBadges);
                    
                    // ✅ FIXED: Use COLLECTIONS.USERS
                    const userRef = doc(db, COLLECTIONS.USERS, user.uid);
                    await updateDoc(userRef, {
                        unlockedBadges: earnedBadgeIds,
                        lastBadgeSync: new Date().toISOString()
                    });

                    // Show notifications for new badges
                    const badgeDefinitions = Object.values(BADGE_DEFINITIONS);
                    newBadges.forEach(badgeId => {
                        const badgeInfo = badgeDefinitions.find(b => b.id === badgeId);
                        if (badgeInfo) {
                            setNotifications(prev => [...prev, {
                                type: 'badge',
                                data: badgeInfo,
                                id: `badge-${badgeId}-${Date.now()}`,
                                timestamp: Date.now()
                            }]);
                        }
                    });
                }
            } catch (err) {
                console.error('❌ Error syncing badges:', err);
            } finally {
                setSyncing(false);
            }
        };

        // Debounce sync (wait 2 seconds after changes)
        const timeoutId = setTimeout(syncBadges, 2000);
        return () => clearTimeout(timeoutId);
    }, [user?.uid, documents?.length, quizSessions?.length, studySessions?.length, decks?.length, totalMastered, loading, syncing, data.unlockedBadges]);

    // REAL-TIME USER STATS LISTENER
    useEffect(() => {
        if (!user?.uid) {
            setLoading(false);
            return;
        }

        let unsubUser = null;

        try {
            // ✅ FIXED: Use COLLECTIONS.USERS
            const userRef = doc(db, COLLECTIONS.USERS, user.uid);
            
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
                }
            );
        } catch (err) {
            console.error('❌ Error setting up user listener:', err);
        }

        return () => {
            if (unsubUser) unsubUser();
        };
    }, [user?.uid]);

    // REAL-TIME GLOBAL BADGES LISTENER
    useEffect(() => {
        let unsubBadges = null;
        let mounted = true;

        const setupBadgesListener = async () => {
            try {
                // ✅ FIXED: Use COLLECTIONS.GLOBAL_BADGES
                const badgesRef = collection(db, COLLECTIONS.GLOBAL_BADGES);
                
                unsubBadges = onSnapshot(
                    badgesRef,
                    (snapshot) => {
                        if (!mounted) return;

                        let badges = [];
                        
                        if (!snapshot.empty) {
                            badges = snapshot.docs.map(doc => ({
                                id: doc.id,
                                ...doc.data()
                            }));
                            console.log('✅ Loaded badges from Firestore:', badges.length);
                        } else {
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

    // REAL-TIME GLOBAL TITLES LISTENER
    useEffect(() => {
        let unsubTitles = null;
        let mounted = true;

        const setupTitlesListener = async () => {
            try {
                // ✅ FIXED: Use COLLECTIONS.GLOBAL_TITLES
                const titlesRef = collection(db, COLLECTIONS.GLOBAL_TITLES);
                
                unsubTitles = onSnapshot(
                    titlesRef,
                    (snapshot) => {
                        if (!mounted) return;

                        let titles = [];
                        
                        if (!snapshot.empty) {
                            titles = snapshot.docs.map(doc => ({
                                id: doc.id,
                                ...doc.data()
                            }));
                            console.log('✅ Loaded titles from Firestore:', titles.length);
                        } else {
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

    // REAL-TIME GAMIFICATION DATA LISTENER
    useEffect(() => {
        if (!user?.uid) return;

        let unsubGamification = null;
        let mounted = true;

        try {
            // ✅ FIXED: Use COLLECTIONS.GAMIFICATION
            const gamificationRef = doc(db, COLLECTIONS.GAMIFICATION, user.uid);
            
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

    // HELPER: TRACK ACTION
    const trackAction = useCallback(async (action, metadata = {}) => {
        if (!user?.uid) {
            console.warn('⚠️ Cannot track action: user not authenticated');
            return { badges: [], titles: [], achievements: [] };
        }

        try {
            const unlocks = await trackActionAndCheckUnlocks(user.uid, action, metadata);

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

    // HELPER: CHANGE TITLE
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

    // HELPER: DISMISS NOTIFICATION
    const dismissNotification = useCallback((notificationId) => {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
    }, []);

    // HELPER: CLEAR ALL NOTIFICATIONS
    const clearAllNotifications = useCallback(() => {
        setNotifications([]);
    }, []);

    // COMPUTED VALUES
    const computedValues = useMemo(() => ({
        xpToNextLevel: data.nextLevelXp - data.xp,
        badgeCompletionRate: data.allBadges.length > 0 
            ? Math.round((data.totalBadges / data.allBadges.length) * 100) 
            : 0,
        titleCompletionRate: data.allTitles.length > 0
            ? Math.round((data.unlockedTitles.length / data.allTitles.length) * 100)
            : 0,
        isMaxLevel: data.level >= LEVEL_THRESHOLDS.length,
        hasStreak: data.streak > 0,
        nextBadge: data.allBadges
            .filter(b => !b.unlocked)
            .sort((a, b) => (a.requiredXp || 0) - (b.requiredXp || 0))[0] || null,
    }), [data]);

    return {
        ...data,
        ...computedValues,
        loading,
        error,
        isLoaded: !loading,
        syncing,
        notifications,
        hasNotifications: notifications.length > 0,
        trackAction,
        changeTitle,
        dismissNotification,
        clearAllNotifications,
    };
};

export default useGamification;
