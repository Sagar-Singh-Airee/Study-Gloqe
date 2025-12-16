// src/hooks/useGamification.js - ✅ FIXED VERSION
import { useState, useEffect, useCallback, useMemo } from 'react';
import { doc, onSnapshot, collection, updateDoc } from 'firebase/firestore';
import { db } from '@shared/config/firebase';
import { useAuth } from '@auth/contexts/AuthContext';
import {
    trackActionAndCheckUnlocks,
    equipTitle,
    BADGE_DEFINITIONS,
    TITLE_DEFINITIONS
} from '@gamification/services/gamificationService';

// ✅ OPTION 1: If analytics hooks exist, import them
// import {
//     useDocumentsData,
//     useQuizSessionsData,
//     useStudySessionsData,
//     useFlashcardDecks
// } from '@analytics/hooks/useAnalytics';

const LEVEL_THRESHOLDS = [0, 100, 250, 500, 1000, 2000, 4000, 8000, 16000, 32000, 64000];

const calculateLevelProgress = (xp, level) => {
    const currentThreshold = LEVEL_THRESHOLDS[level - 1] || 0;
    const nextThreshold = LEVEL_THRESHOLDS[level] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
    
    if (nextThreshold === currentThreshold) return 100;
    
    const progress = ((xp - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
    return Math.min(Math.max(progress, 0), 100);
};

// Auto-calculate badges based on user activity
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
    
    return [...new Set(earnedBadgeIds)];
};

export const useGamification = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [syncing, setSyncing] = useState(false);

    // ✅ OPTION 1: If analytics hooks exist, use them
    // const { documents = [] } = useDocumentsData(user?.uid);
    // const { quizSessions = [] } = useQuizSessionsData(user?.uid, 365);
    // const { sessions: studySessions = [] } = useStudySessionsData(user?.uid, 365);
    // const { decks = [], totalMastered = 0 } = useFlashcardDecks(user?.uid);

    // ✅ OPTION 2: If analytics hooks don't exist, use dummy data
    const documents = [];
    const quizSessions = [];
    const studySessions = [];
    const decks = [];
    const totalMastered = 0;

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

    // ✅ Store previous unlocked badges to detect changes
    const [prevUnlockedBadges, setPrevUnlockedBadges] = useState([]);

    // ✅ FIXED: Auto-sync badges when activity changes
    useEffect(() => {
        if (!user?.uid || loading || syncing) return;
        
        // ✅ Skip if analytics data not loaded
        if (!Array.isArray(documents) || !Array.isArray(quizSessions)) return;

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

                // ✅ Use prevUnlockedBadges instead of data.unlockedBadges
                const newBadges = earnedBadgeIds.filter(id => !prevUnlockedBadges.includes(id));

                if (newBadges.length > 0) {
                    console.log(`🎖️ Auto-syncing ${newBadges.length} new badges:`, newBadges);
                    
                    // ✅ FIXED: Use hardcoded collection name
                    const userRef = doc(db, 'users', user.uid);
                    await updateDoc(userRef, {
                        unlockedBadges: earnedBadgeIds,
                        lastBadgeSync: new Date().toISOString()
                    });

                    // Update previous badges
                    setPrevUnlockedBadges(earnedBadgeIds);

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
    }, [
        user?.uid, 
        documents?.length, 
        quizSessions?.length, 
        studySessions?.length, 
        decks?.length, 
        totalMastered,
        // ✅ REMOVED: loading, syncing, data.unlockedBadges
        prevUnlockedBadges
    ]);

    // REAL-TIME USER STATS LISTENER
    useEffect(() => {
        if (!user?.uid) {
            setLoading(false);
            return;
        }

        console.log('🔄 Setting up user stats listener');

        // ✅ FIXED: Use hardcoded collection name
        const userRef = doc(db, 'users', user.uid);
        
        const unsubUser = onSnapshot(
            userRef,
            (snapshot) => {
                if (snapshot.exists()) {
                    const userData = snapshot.data();
                    const xp = userData.xp || 0;
                    const level = userData.level || 1;
                    const nextLevelXp = LEVEL_THRESHOLDS[level] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
                    const levelProgress = calculateLevelProgress(xp, level);

                    const unlockedBadges = userData.unlockedBadges || [];
                    
                    setData(prev => ({
                        ...prev,
                        xp,
                        level,
                        streak: userData.streak || 0,
                        nextLevelXp,
                        levelProgress,
                        unlockedBadges,
                        unlockedTitles: userData.unlockedTitles || [],
                        equippedTitle: userData.equippedTitle || 'Novice Learner',
                        equippedTitleId: userData.equippedTitleId || 'novice',
                        globalRank: userData.globalRank || '--',
                        classRank: userData.classRank || '--',
                        totalBadges: unlockedBadges.length
                    }));

                    // ✅ Update prevUnlockedBadges
                    setPrevUnlockedBadges(unlockedBadges);
                    
                    console.log('✅ User stats loaded:', { xp, level, badges: unlockedBadges.length });
                    setError(null);
                } else {
                    console.log('⚠️ User gamification data not found, using defaults');
                }
            },
            (err) => {
                console.error('❌ Error fetching user stats:', err);
                setError('Failed to load user stats');
            }
        );

        return () => unsubUser();
    }, [user?.uid]);

    // REAL-TIME GLOBAL BADGES LISTENER
    useEffect(() => {
        console.log('🔄 Setting up badges listener');

        // ✅ FIXED: Use hardcoded collection name
        const badgesRef = collection(db, 'globalBadges');
        
        const unsubBadges = onSnapshot(
            badgesRef,
            (snapshot) => {
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

        return () => unsubBadges();
    }, []);

    // REAL-TIME GLOBAL TITLES LISTENER
    useEffect(() => {
        console.log('🔄 Setting up titles listener');

        // ✅ FIXED: Use hardcoded collection name
        const titlesRef = collection(db, 'globalTitles');
        
        const unsubTitles = onSnapshot(
            titlesRef,
            (snapshot) => {
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

        return () => unsubTitles();
    }, []);

    // REAL-TIME GAMIFICATION DATA LISTENER
    useEffect(() => {
        if (!user?.uid) return;

        console.log('🔄 Setting up gamification data listener');

        // ✅ FIXED: Use hardcoded collection name
        const gamificationRef = doc(db, 'gamification', user.uid);
        
        const unsubGamification = onSnapshot(
            gamificationRef,
            (snapshot) => {
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

                    console.log('✅ Gamification data loaded');
                } else {
                    console.log('⚠️ No gamification data found');
                }
            },
            (err) => {
                console.warn('⚠️ Error fetching gamification data:', err.message);
            }
        );

        return () => unsubGamification();
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
