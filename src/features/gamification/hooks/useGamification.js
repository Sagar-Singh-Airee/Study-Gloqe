// src/features/gamification/hooks/useGamification.js - 🚀 FIXED VERSION
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../shared/config/firebase';
import { useAuth } from '../../auth/contexts/AuthContext';
import { BADGE_DEFINITIONS, TITLE_DEFINITIONS } from '../config/achievements';
import { trackAction as trackActionService, initializeGamification, repairUserGamification } from '../services/gamificationService';
import toast from 'react-hot-toast';
import { trackAction } from '@gamification/services/achievementTracker';
import confetti from 'canvas-confetti';
import { calculateLevel, calculateLevelProgress, getNextLevelXp } from '../../../shared/utils/levelUtils';


export const useGamification = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState(null);
    const [notifications, setNotifications] = useState([]);


    const isMountedRef = useRef(true);
    const unsubscribeRef = useRef(null);
    const gamificationUnsubscribeRef = useRef(null);


    const prevXPRef = useRef(null);
    const prevLevelRef = useRef(null);
    const prevBadgesRef = useRef([]);
    const prevTitlesRef = useRef([]);


    const [gamificationData, setGamificationData] = useState({
        xp: 0,
        level: 1,
        streak: 0,
        nextLevelXp: 100,
        levelProgress: 0,
        globalRank: 999,
        unlockedBadges: [],
        badgesUnlocked: 0,
        unlockedTitles: ['title_newbie'],
        equippedTitle: 'Novice Learner',
        equippedTitleId: 'title_newbie',
        totalStudyTime: 0,
        quizzesCompleted: 0,
        perfectQuizzes: 0,
        flashcardsReviewed: 0,
        flashcardsMastered: 0,
        documentsUploaded: 0,
        classesJoined: 0
    });


    useEffect(() => {
        isMountedRef.current = true;


        if (!user?.uid) {
            setLoading(false);
            return;
        }


        console.log('🔄 Setting up synced gamification listener (Users Collection)');
        setLoading(true);


        // Run silent repair/sync on load to recover any missing data from legacy collections
        repairUserGamification(user.uid).catch(e => console.warn("Silent repair failed", e));


        // Helper function to extract IDs from arrays
        const extractIds = (arr) => {
            if (!Array.isArray(arr)) return [];
            return arr.map(item => typeof item === 'object' ? (item.id || item.titleId || item.badgeId) : item).filter(Boolean);
        };


        // 1. PRIMARY LISTENER: Users Collection (The source of truth for display & leaderboard)
        const userRef = doc(db, 'users', user.uid);
        unsubscribeRef.current = onSnapshot(userRef, async (snapshot) => {
            if (!isMountedRef.current) return;


            if (snapshot.exists()) {
                const data = snapshot.data();


                const xp = data.xp || 0;
                const level = data.level || calculateLevel(xp);
                const nextLevelXp = getNextLevelXp(xp);
                const levelProgress = calculateLevelProgress(xp);


                // Animations
                const previousXP = prevXPRef.current;
                if (previousXP !== null && xp > previousXP) {
                    const gained = xp - previousXP;
                    if (gained < 1000) {
                        toast.success(`+${gained} XP!`, { icon: '⚡', duration: 2000, position: 'top-right', id: 'xp-toast' });
                    }
                }


                const previousLevel = prevLevelRef.current;
                if (previousLevel !== null && level > previousLevel) {
                    confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 }, colors: ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'] });
                    toast.success(`🎉 Level ${level} Unlocked!`, { duration: 4000, position: 'top-center', icon: '👑' });
                    setNotifications(prev => [...prev, {
                        type: 'levelUp',
                        data: { newLevel: level, xpGained: xp - (previousXP || 0) },
                        id: `levelup-${Date.now()}`,
                        timestamp: Date.now()
                    }]);
                }


                // ✅ FIX: Merge with previous state to ensure we don't lose data from the other collection listener
                const unlockedBadges = Array.from(new Set([
                    ...extractIds(data.unlockedBadges || data.badges || []),
                    ...extractIds(prevBadgesRef.current),
                    ...(gamificationData.unlockedBadges || [])
                ]));

                const unlockedTitles = Array.from(new Set([
                    ...extractIds(data.unlockedTitles || data.titles || data.achievements || []),
                    ...extractIds(prevTitlesRef.current.length > 0 ? prevTitlesRef.current : ['title_newbie']),
                    ...(gamificationData.unlockedTitles || [])
                ]));


                // 2. Detect New Badges
                if (prevBadgesRef.current.length > 0 && unlockedBadges.length > prevBadgesRef.current.length) {
                    const newBadgeIds = unlockedBadges.filter(id => !prevBadgesRef.current.includes(id));
                    newBadgeIds.forEach(id => {
                        const badge = BADGE_DEFINITIONS[Object.keys(BADGE_DEFINITIONS).find(k => BADGE_DEFINITIONS[k].id === id)];
                        if (badge) {
                            toast.success(`🎖️ New Badge: ${badge.name}!`, { duration: 4500, icon: '🌟' });
                            setNotifications(prevNotifs => [...prevNotifs, {
                                type: 'badge',
                                data: badge,
                                id: `badge-${id}-${Date.now()}`,
                                timestamp: Date.now()
                            }]);
                        }
                    });
                }


                // 3. Detect New Titles
                if (prevTitlesRef.current.length > 0 && unlockedTitles.length > prevTitlesRef.current.length) {
                    const newTitleIds = unlockedTitles.filter(id => !prevTitlesRef.current.includes(id));
                    newTitleIds.forEach(id => {
                        const title = TITLE_DEFINITIONS[Object.keys(TITLE_DEFINITIONS).find(k => TITLE_DEFINITIONS[k].id === id)];
                        if (title) {
                            toast.success(`👑 New Title: ${title.text}!`, { duration: 4500 });
                            setNotifications(prevNotifs => [...prevNotifs, {
                                type: 'title',
                                data: title,
                                id: `title-${id}-${Date.now()}`,
                                timestamp: Date.now()
                            }]);
                        }
                    });
                }


                prevXPRef.current = xp;
                prevLevelRef.current = level;
                prevBadgesRef.current = unlockedBadges;
                prevTitlesRef.current = unlockedTitles;


                setGamificationData(prev => ({
                    ...prev,
                    xp,
                    level,
                    nextLevelXp,
                    levelProgress,
                    streak: data.streak || 0,
                    unlockedBadges,
                    badgesUnlocked: unlockedBadges.length,
                    unlockedTitles,
                    equippedTitle: data.equippedTitle || prev.equippedTitle || 'Novice Learner',
                    equippedTitleId: data.equippedTitleId || data.currentTitleId || prev.equippedTitleId || 'title_newbie',
                    totalStudyTime: data.totalStudyTime || prev.totalStudyTime || 0,
                    quizzesCompleted: data.quizzesCompleted || prev.quizzesCompleted || 0,
                    documentsUploaded: data.documentsUploaded || prev.documentsUploaded || 0,
                    classesJoined: data.classesJoined || prev.classesJoined || 0
                }));


                setError(null);
                setLoading(false);
            } else {
                console.warn('⚠️ User doc not found, initializing gamification...');
                await initializeGamification(user.uid);
            }
        }, (err) => {
            console.error('❌ User sync error:', err);
            if (isMountedRef.current) {
                setError(err.message);
                setLoading(false);
            }
        });


        // 2. SECONDARY LISTENER: Gamification Collection (For granular stats like flashcards)
        const gamificationRef = doc(db, 'gamification', user.uid);
        gamificationUnsubscribeRef.current = onSnapshot(gamificationRef, (snapshot) => {
            if (!isMountedRef.current || !snapshot.exists()) return;
            const data = snapshot.data();


            setGamificationData(prev => {
                // Merge badges and titles from gamification doc if they are more complete (including legacy names)
                const userBadges = extractIds(prev.unlockedBadges || []);
                const gamBadges = extractIds(data.unlockedBadges || data.badges || []);
                const mergedBadges = Array.from(new Set([...userBadges, ...gamBadges]));


                const userTitles = extractIds(prev.unlockedTitles || []);
                const gamTitles = extractIds(data.unlockedTitles || data.titles || data.achievements || []);
                const mergedTitles = Array.from(new Set([...userTitles, ...gamTitles]));


                return {
                    ...prev,
                    perfectQuizzes: data.perfectQuizzes || 0,
                    flashcardsReviewed: data.flashcardsReviewed || 0,
                    flashcardsMastered: data.flashcardsMastered || 0,
                    totalStudyTime: data.totalStudyTime || prev.totalStudyTime,
                    quizzesCompleted: data.quizzesCompleted || prev.quizzesCompleted,
                    documentsUploaded: data.documentsUploaded || prev.documentsUploaded,
                    classesJoined: data.classesJoined || prev.classesJoined,
                    unlockedBadges: mergedBadges,
                    badgesUnlocked: mergedBadges.length,
                    unlockedTitles: mergedTitles
                };
            });
        });


        return () => {
            isMountedRef.current = false;
            if (unsubscribeRef.current) unsubscribeRef.current();
            if (gamificationUnsubscribeRef.current) gamificationUnsubscribeRef.current();
        };
    }, [user?.uid]);


    const allBadges = useMemo(() => {
        return Object.values(BADGE_DEFINITIONS).map(badge => ({
            ...badge,
            unlocked: (gamificationData.unlockedBadges || []).includes(badge.id)
        }));
    }, [gamificationData.unlockedBadges]);

    const recentlyUnlocked = useMemo(() => {
        return allBadges
            .filter(b => b.unlocked)
            .slice(-5)
            .reverse();
    }, [allBadges]);


    const allTitles = useMemo(() => {
        return Object.values(TITLE_DEFINITIONS).map(title => ({
            ...title,
            unlocked: (gamificationData.unlockedTitles || []).includes(title.id)
        }));
    }, [gamificationData.unlockedTitles]);


    const trackActionCallback = useCallback(async (actionType, data = {}) => {
        if (!user?.uid) return { success: false };
        setSyncing(true);
        try {
            await trackActionService(user.uid, actionType, data);
            return { success: true };
        } catch (error) {
            console.error('❌ Track error:', error);
            return { success: false, error: error.message };
        } finally {
            if (isMountedRef.current) setSyncing(false);
        }
    }, [user?.uid]);


    const changeTitle = useCallback(async (titleId) => {
        if (!user?.uid) return { success: false };
        try {
            const title = allTitles.find(t => t.id === titleId);
            if (!title || !title.unlocked) return { success: false, error: 'Title not available' };
            setSyncing(true);
            const service = await import('../services/gamificationService');
            await service.default.equipTitle(user.uid, titleId);
            toast.success(`👑 Title equipped: ${title.text}`);
            return { success: true };
        } catch (error) {
            toast.error('Failed to equip title');
            return { success: false };
        } finally {
            if (isMountedRef.current) setSyncing(false);
        }
    }, [user?.uid, allTitles]);


    const dismissNotification = useCallback((id) => setNotifications(prev => prev.filter(n => n.id !== id)), []);


    return {
        ...gamificationData,
        allBadges,
        allTitles,
        trackAction: trackActionCallback,
        changeTitle,
        dismissNotification,
        loading,
        syncing,
        error,
        isLoaded: !loading,
        notifications,
        recentlyUnlocked,
        hasNotifications: notifications.length > 0
    };
};


export default useGamification;
