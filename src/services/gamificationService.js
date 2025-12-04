// src/services/gamificationService.js - FIXED VERSION 🚀
import {
    doc,
    updateDoc,
    increment,
    setDoc,
    getDoc,
    serverTimestamp,
    collection,
    query,
    where,
    getDocs,
    writeBatch,
    arrayUnion
} from 'firebase/firestore';
import { db } from '@config/firebase';


// XP Rewards Configuration - ENHANCED
const XP_REWARDS = {
    // One-time per day actions
    UPLOAD_DOCUMENT: 15,
    STUDY_SESSION: 8,
    USE_AI_CHAT: 5,
    ADD_NOTES: 3,
    JOIN_ROOM: 8,
    CREATE_FLASHCARD: 6,
    DAILY_LOGIN: 10,
    STREAK_BONUS: 15,

    // Multiple times actions
    COMPLETE_QUIZ: 25,
    CORRECT_ANSWER: 8,
    COMPLETE_MISSION: 75,

    // New enhanced rewards
    PERFECT_QUIZ: 50,
    FAST_LEARNER: 20,
    CONSISTENT_LEARNER: 30,
    KNOWLEDGE_MASTER: 100,
};


// Daily action types (can only earn XP once per day)
const DAILY_ACTIONS = {
    UPLOAD_DOCUMENT: 'upload_document',
    STUDY_SESSION: 'study_session',
    USE_AI_CHAT: 'use_ai_chat',
    ADD_NOTES: 'add_notes',
    JOIN_ROOM: 'join_room',
    CREATE_FLASHCARD: 'create_flashcard',
    DAILY_LOGIN: 'daily_login',
};


// ===== BADGE DEFINITIONS =====
const BADGE_DEFINITIONS = [
    {
        id: 'first_steps',
        name: 'First Steps',
        desc: 'Complete your first quiz',
        iconName: 'Star',
        color: 'from-yellow-100/50',
        category: 'learning',
        rarity: 'common',
        requirement: { type: 'quiz_count', value: 1 },
        xpReward: 50
    },
    {
        id: 'quick_learner',
        name: 'Quick Learner',
        desc: 'Complete 10 quizzes',
        iconName: 'Zap',
        color: 'from-blue-100/50',
        category: 'learning',
        rarity: 'common',
        requirement: { type: 'quiz_count', value: 10 },
        xpReward: 100
    },
    {
        id: 'quiz_master',
        name: 'Quiz Master',
        desc: 'Complete 50 quizzes',
        iconName: 'Trophy',
        color: 'from-purple-100/50',
        category: 'learning',
        rarity: 'rare',
        requirement: { type: 'quiz_count', value: 50 },
        xpReward: 250
    },
    {
        id: 'dedicated_scholar',
        name: 'Dedicated Scholar',
        desc: 'Study for 100 minutes total',
        iconName: 'BookOpen',
        color: 'from-green-100/50',
        category: 'dedication',
        rarity: 'common',
        requirement: { type: 'study_time', value: 100 },
        xpReward: 100
    },
    {
        id: 'knowledge_seeker',
        name: 'Knowledge Seeker',
        desc: 'Study for 500 minutes total',
        iconName: 'Target',
        color: 'from-indigo-100/50',
        category: 'dedication',
        rarity: 'rare',
        requirement: { type: 'study_time', value: 500 },
        xpReward: 300
    },
    {
        id: 'streak_starter',
        name: 'Streak Starter',
        desc: 'Maintain a 3-day streak',
        iconName: 'Zap',
        color: 'from-orange-100/50',
        category: 'consistency',
        rarity: 'common',
        requirement: { type: 'streak', value: 3 },
        xpReward: 75
    },
    {
        id: 'on_fire',
        name: 'On Fire!',
        desc: 'Maintain a 7-day streak',
        iconName: 'Zap',
        color: 'from-red-100/50',
        category: 'consistency',
        rarity: 'rare',
        requirement: { type: 'streak', value: 7 },
        xpReward: 200
    },
    {
        id: 'unstoppable',
        name: 'Unstoppable',
        desc: 'Maintain a 30-day streak',
        iconName: 'Crown',
        color: 'from-yellow-100/50',
        category: 'consistency',
        rarity: 'epic',
        requirement: { type: 'streak', value: 30 },
        xpReward: 500
    },
    {
        id: 'content_creator',
        name: 'Content Creator',
        desc: 'Upload 5 documents',
        iconName: 'BookOpen',
        color: 'from-cyan-100/50',
        category: 'content',
        rarity: 'common',
        requirement: { type: 'documents', value: 5 },
        xpReward: 100
    },
    {
        id: 'library_builder',
        name: 'Library Builder',
        desc: 'Upload 25 documents',
        iconName: 'BookOpen',
        color: 'from-blue-100/50',
        category: 'content',
        rarity: 'rare',
        requirement: { type: 'documents', value: 25 },
        xpReward: 300
    },
    {
        id: 'social_learner',
        name: 'Social Learner',
        desc: 'Join 5 study rooms',
        iconName: 'UsersIcon',
        color: 'from-pink-100/50',
        category: 'collaboration',
        rarity: 'common',
        requirement: { type: 'rooms_joined', value: 5 },
        xpReward: 100
    },
    {
        id: 'community_champion',
        name: 'Community Champion',
        desc: 'Join 20 study rooms',
        iconName: 'UsersIcon',
        color: 'from-purple-100/50',
        category: 'collaboration',
        rarity: 'rare',
        requirement: { type: 'rooms_joined', value: 20 },
        xpReward: 250
    },
    {
        id: 'ai_enthusiast',
        name: 'AI Enthusiast',
        desc: 'Use AI chat 10 times',
        iconName: 'Zap',
        color: 'from-violet-100/50',
        category: 'assistance',
        rarity: 'common',
        requirement: { type: 'ai_chats', value: 10 },
        xpReward: 75
    },
    {
        id: 'level_10',
        name: 'Rising Star',
        desc: 'Reach Level 10',
        iconName: 'Star',
        color: 'from-yellow-100/50',
        category: 'progression',
        rarity: 'rare',
        requirement: { type: 'level', value: 10 },
        xpReward: 200
    },
    {
        id: 'level_25',
        name: 'Elite Scholar',
        desc: 'Reach Level 25',
        iconName: 'Crown',
        color: 'from-gold-100/50',
        category: 'progression',
        rarity: 'epic',
        requirement: { type: 'level', value: 25 },
        xpReward: 500
    },
    {
        id: 'level_50',
        name: 'Legendary Master',
        desc: 'Reach Level 50',
        iconName: 'Trophy',
        color: 'from-purple-100/50',
        category: 'progression',
        rarity: 'legendary',
        requirement: { type: 'level', value: 50 },
        xpReward: 1000
    }
];


// ===== TITLE DEFINITIONS =====
const TITLE_DEFINITIONS = [
    { id: 'novice', text: 'Novice Learner', requiredLevel: 1, description: 'Just getting started', rarity: 'common', color: 'text-gray-600' },
    { id: 'student', text: 'Student', requiredLevel: 3, description: 'Making progress', rarity: 'common', color: 'text-blue-600' },
    { id: 'scholar', text: 'Scholar', requiredLevel: 5, description: 'Dedicated to learning', rarity: 'common', color: 'text-green-600' },
    { id: 'expert', text: 'Expert', requiredLevel: 10, description: 'Highly skilled', rarity: 'rare', color: 'text-purple-600' },
    { id: 'master', text: 'Master', requiredLevel: 15, description: 'Top of the class', rarity: 'rare', color: 'text-indigo-600' },
    { id: 'sage', text: 'Sage', requiredLevel: 20, description: 'Wise beyond years', rarity: 'epic', color: 'text-yellow-600' },
    { id: 'virtuoso', text: 'Virtuoso', requiredLevel: 25, description: 'Elite performer', rarity: 'epic', color: 'text-orange-600' },
    { id: 'prodigy', text: 'Prodigy', requiredLevel: 30, description: 'Exceptional talent', rarity: 'epic', color: 'text-red-600' },
    { id: 'legend', text: 'Legend', requiredLevel: 40, description: 'Legendary status', rarity: 'legendary', color: 'text-gold-600' },
    { id: 'immortal', text: 'Immortal Scholar', requiredLevel: 50, description: 'Eternal wisdom', rarity: 'legendary', color: 'text-purple-900' }
];


// ===== COMPREHENSIVE ACHIEVEMENT DEFINITIONS =====
const ACHIEVEMENT_DEFINITIONS = [
    // Learning Achievements
    {
        id: 'first_quiz',
        title: 'First Quiz',
        description: 'Complete your first quiz',
        icon: '🎓',
        xpReward: 50,
        category: 'learning',
        trigger: 'quiz_complete',
        requirement: { type: 'count', value: 1 }
    },
    {
        id: 'quiz_veteran',
        title: 'Quiz Veteran',
        description: 'Complete 25 quizzes',
        icon: '📚',
        xpReward: 150,
        category: 'learning',
        trigger: 'quiz_complete',
        requirement: { type: 'count', value: 25 }
    },
    {
        id: 'perfect_score',
        title: 'Perfect Score',
        description: 'Get 100% on a quiz',
        icon: '💯',
        xpReward: 100,
        category: 'learning',
        trigger: 'quiz_perfect',
        requirement: { type: 'score', value: 100 }
    },
    // Dedication Achievements
    {
        id: 'study_enthusiast',
        title: 'Study Enthusiast',
        description: 'Study for 100 minutes total',
        icon: '⏱️',
        xpReward: 100,
        category: 'dedication',
        trigger: 'study_time',
        requirement: { type: 'total', value: 100 }
    },
    {
        id: 'marathon_learner',
        title: 'Marathon Learner',
        description: 'Study for 1000 minutes total',
        icon: '🏃',
        xpReward: 500,
        category: 'dedication',
        trigger: 'study_time',
        requirement: { type: 'total', value: 1000 }
    },
    // Content Achievements
    {
        id: 'first_upload',
        title: 'First Upload',
        description: 'Upload your first document',
        icon: '📄',
        xpReward: 50,
        category: 'content',
        trigger: 'document_upload',
        requirement: { type: 'count', value: 1 }
    },
    {
        id: 'content_library',
        title: 'Content Library',
        description: 'Upload 10 documents',
        icon: '📚',
        xpReward: 150,
        category: 'content',
        trigger: 'document_upload',
        requirement: { type: 'count', value: 10 }
    },
    // Social Achievements
    {
        id: 'first_room',
        title: 'Social Butterfly',
        description: 'Join your first study room',
        icon: '👥',
        xpReward: 50,
        category: 'social',
        trigger: 'room_join',
        requirement: { type: 'count', value: 1 }
    },
    {
        id: 'room_regular',
        title: 'Room Regular',
        description: 'Join 10 study rooms',
        icon: '🏠',
        xpReward: 150,
        category: 'social',
        trigger: 'room_join',
        requirement: { type: 'count', value: 10 }
    },
    // AI Achievements
    {
        id: 'ai_explorer',
        title: 'AI Explorer',
        description: 'Use AI chat 5 times',
        icon: '🤖',
        xpReward: 75,
        category: 'assistance',
        trigger: 'ai_chat',
        requirement: { type: 'count', value: 5 }
    },
    {
        id: 'ai_master',
        title: 'AI Master',
        description: 'Use AI chat 50 times',
        icon: '🧠',
        xpReward: 250,
        category: 'assistance',
        trigger: 'ai_chat',
        requirement: { type: 'count', value: 50 }
    },
    // Mission Achievements
    {
        id: 'mission_complete',
        title: 'Mission Accomplished',
        description: 'Complete your first mission',
        icon: '🎯',
        xpReward: 75,
        category: 'missions',
        trigger: 'mission_complete',
        requirement: { type: 'count', value: 1 }
    },
    {
        id: 'mission_master',
        title: 'Mission Master',
        description: 'Complete 10 missions',
        icon: '🏆',
        xpReward: 200,
        category: 'missions',
        trigger: 'mission_complete',
        requirement: { type: 'count', value: 10 }
    }
];


// Helper: Get today's date string
const getTodayString = () => {
    return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
};


// Helper: Get start of day timestamp
const getStartOfDay = () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return start;
};


// ✅ FIXED: Get user's today's XP and actions
export const getUserTodaysXP = async (userId) => {
    try {
        const today = getTodayString();
        const dailyActionRef = doc(db, 'gamification', userId, 'dailyActions', today);
        const dailyActionSnap = await getDoc(dailyActionRef);

        if (!dailyActionSnap.exists()) {
            return {
                total: 0,
                usedAIChat: false,
                actions: {},
                dailyProgress: 0
            };
        }

        const actions = dailyActionSnap.data().actions || {};
        let totalXP = 0;

        // Calculate total XP from today's actions
        Object.values(actions).forEach(action => {
            if (action.xp) {
                totalXP += action.xp;
            }
        });

        return {
            total: totalXP,
            usedAIChat: !!actions[DAILY_ACTIONS.USE_AI_CHAT],
            actions: actions,
            dailyProgress: Math.min((totalXP / 100) * 100, 100) // Progress towards daily cap
        };
    } catch (error) {
        console.error('Error getting today\'s XP:', error);
        return {
            total: 0,
            usedAIChat: false,
            actions: {},
            dailyProgress: 0
        };
    }
};


// Helper: Check if action was done today
export const canAwardDailyXP = async (userId, actionType) => {
    try {
        const today = getTodayString();
        const dailyActionRef = doc(db, 'gamification', userId, 'dailyActions', today);
        const dailyActionSnap = await getDoc(dailyActionRef);

        if (!dailyActionSnap.exists()) {
            return true; // No actions today yet
        }

        const actions = dailyActionSnap.data().actions || {};
        return !actions[actionType]; // Return true if action not done today
    } catch (error) {
        console.error('Error checking daily XP:', error);
        return false;
    }
};


// Helper: Mark action as done today with XP
const markActionDone = async (userId, actionType, xpAmount) => {
    try {
        const today = getTodayString();
        const dailyActionRef = doc(db, 'gamification', userId, 'dailyActions', today);

        await setDoc(dailyActionRef, {
            date: today,
            [`actions.${actionType}`]: {
                completed: true,
                timestamp: serverTimestamp(),
                xp: xpAmount,
                type: actionType
            },
            lastUpdated: serverTimestamp()
        }, { merge: true });

        // Update user's daily stats
        const userStatsRef = doc(db, 'users', userId);
        await updateDoc(userStatsRef, {
            lastActivity: serverTimestamp(),
            [`dailyStats.${today}.${actionType}`]: {
                completed: true,
                xp: xpAmount,
                timestamp: serverTimestamp()
            }
        });
    } catch (error) {
        console.error('Error marking action:', error);
    }
};


// Award XP for daily actions (once per day only)
export const awardDailyXP = async (userId, actionType, reason) => {
    try {
        // Check if already done today
        const canAward = await canAwardDailyXP(userId, actionType);

        if (!canAward) {
            return {
                success: false,
                message: 'Already earned XP for this action today!',
                alreadyEarned: true,
                xpGained: 0
            };
        }

        // Get XP amount for this action
        const xpAmount = XP_REWARDS[actionType] || 0;

        if (xpAmount === 0) {
            return {
                success: false,
                message: 'Invalid action type',
                xpGained: 0
            };
        }

        // Check daily XP cap (100 XP per day)
        const todayXP = await getUserTodaysXP(userId);
        if (todayXP.total + xpAmount > 100) {
            return {
                success: false,
                message: 'Daily XP limit reached! Come back tomorrow.',
                dailyLimitReached: true,
                xpGained: 0
            };
        }

        // Award XP
        const result = await awardXP(userId, xpAmount, reason);

        // Mark action as done today
        await markActionDone(userId, actionType, xpAmount);

        return {
            success: true,
            ...result,
            message: `+${xpAmount} XP earned!`,
            dailyProgress: Math.min(((todayXP.total + xpAmount) / 100) * 100, 100)
        };
    } catch (error) {
        console.error('Error awarding daily XP:', error);
        return {
            success: false,
            message: 'Failed to award XP',
            xpGained: 0
        };
    }
};


// ✅ FIXED: Award XP (for actions that can be done multiple times)
export const awardXP = async (userId, xpAmount, reason) => {
    try {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            // Initialize user if doesn't exist
            await initializeGamification(userId);
        }

        const userData = userSnap.data() || {};
        const currentXP = userData.xp || 0;
        const currentLevel = userData.level || 1;
        const newXP = currentXP + xpAmount;

        // Enhanced level calculation (progressive: 100, 250, 500, 1000, ...)
        const levelThresholds = [0, 100, 250, 500, 1000, 2000, 4000, 8000, 16000];
        let newLevel = 1;
        for (let i = levelThresholds.length - 1; i >= 0; i--) {
            if (newXP >= levelThresholds[i]) {
                newLevel = i + 1;
                break;
            }
        }

        const levelUp = newLevel > currentLevel;
        const levelsGained = newLevel - currentLevel;

        // Create timestamp as Date object for arrayUnion
        const now = new Date();

        // ✅ FIXED: Update user with enhanced stats
        await updateDoc(userRef, {
            xp: newXP,
            level: newLevel,
            levelUp: levelUp,
            levelsGained: levelsGained,
            totalXPEarned: increment(xpAmount),
            lastXPReason: reason,
            lastXPAmount: xpAmount,
            lastXPTime: serverTimestamp(),
            // ✅ FIXED: Use Date object instead of serverTimestamp in arrayUnion
            achievements: arrayUnion({
                type: 'xp_earned',
                amount: xpAmount,
                reason: reason,
                timestamp: now.toISOString(), // Use ISO string
                date: now
            })
        });

        // Reset levelUp after animation
        if (levelUp) {
            setTimeout(async () => {
                try {
                    await updateDoc(userRef, {
                        levelUp: false,
                        levelsGained: 0
                    });
                } catch (error) {
                    console.error('Error resetting levelUp:', error);
                }
            }, 5000); // Longer celebration for multiple levels
        }

        return {
            newXP,
            newLevel,
            levelUp,
            levelsGained,
            xpGained: xpAmount,
            nextLevelXP: levelThresholds[newLevel] || levelThresholds[levelThresholds.length - 1],
            progressToNextLevel: levelThresholds[newLevel] ?
                ((newXP - levelThresholds[newLevel - 1]) / (levelThresholds[newLevel] - levelThresholds[newLevel - 1])) * 100 : 0
        };
    } catch (error) {
        console.error('Error awarding XP:', error);
        throw error;
    }
};


// Get user's comprehensive gamification profile
export const getUserGamificationProfile = async (userId) => {
    try {
        const [userSnap, gamificationSnap, todayXP] = await Promise.all([
            getDoc(doc(db, 'users', userId)),
            getDoc(doc(db, 'gamification', userId)),
            getUserTodaysXP(userId)
        ]);

        if (!userSnap.exists()) {
            await initializeGamification(userId);
            return getUserGamificationProfile(userId); // Retry after initialization
        }

        const userData = userSnap.data();
        const gamificationData = gamificationSnap.exists() ? gamificationSnap.data() : {};

        // Calculate level progress
        const levelThresholds = [0, 100, 250, 500, 1000, 2000, 4000, 8000, 16000];
        const currentLevel = userData.level || 1;
        const currentXP = userData.xp || 0;
        const nextLevelXP = levelThresholds[currentLevel] || levelThresholds[levelThresholds.length - 1];
        const previousLevelXP = levelThresholds[currentLevel - 1] || 0;
        const progressToNextLevel = nextLevelXP ?
            ((currentXP - previousLevelXP) / (nextLevelXP - previousLevelXP)) * 100 : 100;

        return {
            user: {
                xp: currentXP,
                level: currentLevel,
                streak: userData.streak || 0,
                totalQuizzes: userData.totalQuizzes || 0,
                totalStudyTime: userData.totalStudyTime || 0,
                levelUp: userData.levelUp || false,
                levelsGained: userData.levelsGained || 0,
                lastXPReason: userData.lastXPReason,
                lastXPAmount: userData.lastXPAmount
            },
            gamification: {
                missions: gamificationData.missions || [],
                achievements: gamificationData.achievements || [],
                lastLoginDate: gamificationData.lastLoginDate
            },
            today: todayXP,
            progress: {
                toNextLevel: progressToNextLevel,
                nextLevelXP: nextLevelXP,
                currentLevelXP: previousLevelXP,
                remainingXP: nextLevelXP - currentXP
            },
            stats: {
                totalXPEarned: userData.totalXPEarned || 0,
                dailyAverage: calculateDailyAverage(userData.createdAt, currentXP),
                rank: calculateRank(currentXP),
                percentile: calculatePercentile(currentXP)
            }
        };
    } catch (error) {
        console.error('Error getting gamification profile:', error);
        return null;
    }
};


// ✅ FIXED: Initialize user gamification data
export const initializeGamification = async (userId) => {
    try {
        const gamificationRef = doc(db, 'gamification', userId);
        const userRef = doc(db, 'users', userId);

        // Check if already initialized
        const userSnap = await getDoc(userRef);
        if (userSnap.exists() && userSnap.data().xp !== undefined) {
            return; // Already initialized
        }

        // Enhanced daily missions
        const dailyMissions = [
            {
                id: 'daily_quiz',
                type: 'daily',
                title: 'Complete 3 Quizzes',
                description: 'Test your knowledge today',
                target: 3,
                current: 0,
                xpReward: 50,
                icon: '🏆',
                category: 'learning',
                expiresAt: getEndOfDay().toISOString() // ✅ FIXED: Convert to string
            },
            {
                id: 'daily_study',
                type: 'daily',
                title: 'Study for 30 minutes',
                description: 'Focus time counts',
                target: 30,
                current: 0,
                xpReward: 40,
                icon: '⏰',
                category: 'productivity',
                expiresAt: getEndOfDay().toISOString() // ✅ FIXED
            },
            {
                id: 'daily_upload',
                type: 'daily',
                title: 'Upload 1 Document',
                description: 'Add learning materials',
                target: 1,
                current: 0,
                xpReward: 30,
                icon: '📄',
                category: 'content',
                expiresAt: getEndOfDay().toISOString() // ✅ FIXED
            },
            {
                id: 'daily_ai_chat',
                type: 'daily',
                title: 'Use AI Assistant',
                description: 'Ask Gloqe for help',
                target: 1,
                current: 0,
                xpReward: 25,
                icon: '🤖',
                category: 'assistance',
                expiresAt: getEndOfDay().toISOString() // ✅ FIXED
            }
        ];

        // Enhanced weekly missions
        const weeklyMissions = [
            {
                id: 'weekly_quizzes',
                type: 'weekly',
                title: 'Complete 15 Quizzes',
                description: 'Consistency is key',
                target: 15,
                current: 0,
                xpReward: 200,
                icon: '🎯',
                category: 'mastery',
                expiresAt: getEndOfWeek().toISOString() // ✅ FIXED
            },
            {
                id: 'weekly_rooms',
                type: 'weekly',
                title: 'Join 5 Study Rooms',
                description: 'Learn with peers',
                target: 5,
                current: 0,
                xpReward: 150,
                icon: '👥',
                category: 'collaboration',
                expiresAt: getEndOfWeek().toISOString() // ✅ FIXED
            },
            {
                id: 'weekly_streak',
                type: 'weekly',
                title: 'Maintain 5-day Streak',
                description: 'Stay consistent',
                target: 5,
                current: 0,
                xpReward: 300,
                icon: '🔥',
                category: 'consistency',
                expiresAt: getEndOfWeek().toISOString() // ✅ FIXED
            }
        ];

        // Initial achievements
        const initialAchievements = [
            {
                id: 'first_quiz',
                title: 'First Quiz',
                description: 'Complete your first quiz',
                icon: '🎓',
                xpReward: 50,
                unlocked: false,
                progress: 0,
                target: 1,
                category: 'learning'
            },
            {
                id: 'study_enthusiast',
                title: 'Study Enthusiast',
                description: 'Study for 100 minutes',
                icon: '📚',
                xpReward: 100,
                unlocked: false,
                progress: 0,
                target: 100,
                category: 'dedication'
            },
            {
                id: 'ai_explorer',
                title: 'AI Explorer',
                description: 'Use AI chat 5 times',
                icon: '🤖',
                xpReward: 75,
                unlocked: false,
                progress: 0,
                target: 5,
                category: 'assistance'
            }
        ];

        // Use batch write for efficiency
        const batch = writeBatch(db);

        batch.set(gamificationRef, {
            missions: [...dailyMissions, ...weeklyMissions],
            achievements: initialAchievements,
            lastLoginDate: getTodayString(),
            totalMissionsCompleted: 0,
            totalAchievementsUnlocked: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        }, { merge: true });

        batch.set(userRef, {
            xp: 0,
            level: 1,
            streak: 0,
            totalQuizzes: 0,
            totalStudyTime: 0,
            totalXPEarned: 0,
            levelUp: false,
            levelsGained: 0,
            dailyStats: {},
            weeklyStats: {},
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        }, { merge: true });

        await batch.commit();

        console.log('✅ Gamification initialized for user:', userId);
    } catch (error) {
        console.error('Error initializing gamification:', error);
        throw error;
    }
};


// Enhanced mission progress tracking
export const updateMission = async (userId, missionId, incrementBy = 1) => {
    try {
        const gamificationRef = doc(db, 'gamification', userId);
        const gamificationSnap = await getDoc(gamificationRef);

        if (!gamificationSnap.exists()) {
            await initializeGamification(userId);
            return;
        }

        const data = gamificationSnap.data();
        const missions = data?.missions || [];
        const missionIndex = missions.findIndex(m => m.id === missionId);

        if (missionIndex !== -1) {
            const mission = missions[missionIndex];
            const previousCurrent = mission.current;
            const newCurrent = Math.min(mission.current + incrementBy, mission.target);

            missions[missionIndex].current = newCurrent;
            missions[missionIndex].lastUpdated = serverTimestamp();

            // Check if mission just completed
            if (newCurrent === mission.target && previousCurrent !== mission.target) {
                await awardXP(userId, mission.xpReward, `Mission: ${mission.title}`);

                // Update mission completion stats
                await updateDoc(gamificationRef, {
                    totalMissionsCompleted: increment(1),
                    lastMissionCompleted: serverTimestamp()
                });

                // Check for mission-related achievements
                await checkMissionAchievements(userId, missionId);
            }

            await updateDoc(gamificationRef, {
                missions,
                updatedAt: serverTimestamp()
            });
        }
    } catch (error) {
        console.error('Error updating mission:', error);
    }
};


// Enhanced streak tracking with bonus rewards
export const updateStreak = async (userId) => {
    try {
        const userRef = doc(db, 'users', userId);
        const gamificationRef = doc(db, 'gamification', userId);

        const [userSnap, gamificationSnap] = await Promise.all([
            getDoc(userRef),
            getDoc(gamificationRef)
        ]);

        if (!userSnap.exists()) {
            await initializeGamification(userId);
            return;
        }

        const userData = userSnap.data();
        const gamificationData = gamificationSnap.data() || {};

        const today = getTodayString();
        const lastLogin = gamificationData.lastLoginDate;

        if (lastLogin !== today) {
            const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
            const isConsecutive = lastLogin === yesterday;

            const newStreak = isConsecutive ? (userData?.streak || 0) + 1 : 1;

            // Calculate streak bonus (increases every 7 days)
            const streakBonus = XP_REWARDS.STREAK_BONUS * Math.floor(newStreak / 7 + 1);

            // Use batch for efficiency
            const batch = writeBatch(db);
            batch.update(userRef, {
                streak: newStreak,
                lastStreakUpdate: serverTimestamp()
            });
            batch.update(gamificationRef, {
                lastLoginDate: today,
                currentStreak: newStreak
            });
            await batch.commit();

            // Award streak bonus and daily login
            if (newStreak > 0) {
                await awardXP(
                    userId,
                    streakBonus,
                    `${newStreak}-day streak! 🔥`
                );
            }

            // Award daily login XP
            await awardDailyXP(userId, DAILY_ACTIONS.DAILY_LOGIN, 'Daily login');

            console.log(`✅ Streak updated: ${newStreak} days, Bonus: ${streakBonus} XP`);
        }
    } catch (error) {
        console.error('Error updating streak:', error);
    }
};


// ✅ FIXED: Check and unlock achievements
const checkMissionAchievements = async (userId, missionId) => {
    try {
        const gamificationRef = doc(db, 'gamification', userId);
        const gamificationSnap = await getDoc(gamificationRef);

        if (!gamificationSnap.exists()) return;

        const data = gamificationSnap.data();
        const achievements = data.achievements || [];
        const missions = data.missions || [];

        // Example: Check for mission master achievement
        const completedMissions = missions.filter(m => m.current >= m.target).length;
        const missionMasterAchievement = achievements.find(a => a.id === 'mission_master');

        if (missionMasterAchievement && !missionMasterAchievement.unlocked) {
            if (completedMissions >= missionMasterAchievement.target) {
                missionMasterAchievement.unlocked = true;
                missionMasterAchievement.unlockedAt = new Date().toISOString(); // ✅ FIXED

                await awardXP(userId, missionMasterAchievement.xpReward, `Achievement: ${missionMasterAchievement.title}`);

                await updateDoc(gamificationRef, {
                    achievements: achievements,
                    totalAchievementsUnlocked: increment(1),
                    lastAchievementUnlocked: serverTimestamp()
                });
            }
        }
    } catch (error) {
        console.error('Error checking achievements:', error);
    }
};


// Get user's leaderboard position
export const getLeaderboardPosition = async (userId) => {
    try {
        const usersRef = collection(db, 'users');
        const usersSnap = await getDocs(usersRef);

        const users = [];
        usersSnap.forEach(doc => {
            const data = doc.data();
            if (data.xp) {
                users.push({
                    id: doc.id,
                    xp: data.xp,
                    level: data.level,
                    streak: data.streak
                });
            }
        });

        // Sort by XP
        users.sort((a, b) => b.xp - a.xp);

        const userIndex = users.findIndex(user => user.id === userId);
        const totalUsers = users.length;

        return {
            rank: userIndex + 1,
            totalUsers: totalUsers,
            percentile: totalUsers > 0 ? Math.round(((totalUsers - userIndex) / totalUsers) * 100) : 0,
            topUsers: users.slice(0, 10) // Top 10 users
        };
    } catch (error) {
        console.error('Error getting leaderboard:', error);
        return null;
    }
};

// Get class-specific leaderboard
export const getClassLeaderboard = async (classId) => {
    try {
        // Get class details to get student IDs
        const classRef = doc(db, 'classes', classId);
        const classSnap = await getDoc(classRef);

        if (!classSnap.exists()) {
            throw new Error('Class not found');
        }

        const classData = classSnap.data();
        const studentIds = classData.students || [];

        if (studentIds.length === 0) {
            return [];
        }

        // Fetch student details with gamification data
        const students = await Promise.all(
            studentIds.map(async (studentId) => {
                try {
                    const userRef = doc(db, 'users', studentId);
                    const userSnap = await getDoc(userRef);

                    if (!userSnap.exists()) {
                        return null;
                    }

                    const userData = userSnap.data();

                    return {
                        id: studentId,
                        name: userData.displayName || userData.name || userData.email || 'Unknown',
                        points: userData.xp || 0,
                        level: userData.level || 1,
                        streak: userData.streak || 0,
                        quizzes: userData.totalQuizzes || 0,
                        avgScore: userData.avgQuizScore || 0,
                        photoURL: userData.photoURL || null
                    };
                } catch (error) {
                    console.error(`Error loading student ${studentId}:`, error);
                    return null;
                }
            })
        );

        // Filter out null students and sort by points
        const validStudents = students.filter(s => s !== null);
        validStudents.sort((a, b) => b.points - a.points);

        // Add rank and change info
        return validStudents.map((student, index) => ({
            ...student,
            rank: index + 1,
            change: 0 // TODO: Implement rank change tracking
        }));
    } catch (error) {
        console.error('Error getting class leaderboard:', error);
        throw error;
    }
};


// Reset daily missions (call via Cloud Function at midnight)
export const resetDailyMissions = async (userId) => {
    try {
        const gamificationRef = doc(db, 'gamification', userId);
        const gamificationSnap = await getDoc(gamificationRef);

        if (!gamificationSnap.exists()) return;

        const data = gamificationSnap.data();
        const missions = data?.missions || [];

        const updatedMissions = missions.map(mission => {
            if (mission.type === 'daily') {
                return {
                    ...mission,
                    current: 0,
                    expiresAt: getEndOfDay().toISOString(), // ✅ FIXED
                    lastReset: serverTimestamp()
                };
            }
            return mission;
        });

        await updateDoc(gamificationRef, {
            missions: updatedMissions,
            dailyResetAt: serverTimestamp()
        });
    } catch (error) {
        console.error('Error resetting daily missions:', error);
    }
};


// Helper functions
function getEndOfDay() {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return end;
}


function getEndOfWeek() {
    const end = new Date();
    end.setDate(end.getDate() + (7 - end.getDay()));
    end.setHours(23, 59, 59, 999);
    return end;
}


function calculateDailyAverage(createdAt, totalXP) {
    if (!createdAt) return 0;

    const createdDate = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
    const daysSinceJoin = Math.max(1, Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24)));

    return Math.round(totalXP / daysSinceJoin);
}


function calculateRank(totalXP) {
    if (totalXP >= 5000) return 'Grand Master';
    if (totalXP >= 2000) return 'Master';
    if (totalXP >= 1000) return 'Expert';
    if (totalXP >= 500) return 'Advanced';
    if (totalXP >= 100) return 'Intermediate';
    return 'Beginner';
}


function calculatePercentile(totalXP) {
    // Simplified percentile calculation
    if (totalXP >= 5000) return 95;
    if (totalXP >= 2000) return 85;
    if (totalXP >= 1000) return 70;
    if (totalXP >= 500) return 50;
    if (totalXP >= 100) return 25;
    return 10;
}


// ===== BADGE MANAGEMENT FUNCTIONS =====

// Initialize badges in Firestore (one-time setup)
export const initializeBadges = async () => {
    try {
        const batch = writeBatch(db);

        BADGE_DEFINITIONS.forEach(badge => {
            const badgeRef = doc(db, 'badges', badge.id);
            batch.set(badgeRef, badge);
        });

        await batch.commit();
        console.log('✅ Badges initialized successfully');
        return { success: true, count: BADGE_DEFINITIONS.length };
    } catch (error) {
        console.error('Error initializing badges:', error);
        throw error;
    }
};

// Initialize titles in Firestore (one-time setup)
export const initializeTitles = async () => {
    try {
        const batch = writeBatch(db);

        TITLE_DEFINITIONS.forEach(title => {
            const titleRef = doc(db, 'titles', title.id);
            batch.set(titleRef, title);
        });

        await batch.commit();
        console.log('✅ Titles initialized successfully');
        return { success: true, count: TITLE_DEFINITIONS.length };
    } catch (error) {
        console.error('Error initializing titles:', error);
        throw error;
    }
};

// Check and unlock badges for a user
export const checkAndUnlockBadges = async (userId) => {
    try {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) return { newlyUnlocked: [] };

        const userData = userSnap.data();
        const unlockedBadges = userData.unlockedBadges || [];
        const newlyUnlocked = [];

        // Get user stats
        const stats = {
            quiz_count: userData.totalQuizzes || 0,
            study_time: userData.totalStudyTime || 0,
            streak: userData.streak || 0,
            documents: userData.totalDocuments || 0,
            rooms_joined: userData.totalRoomsJoined || 0,
            ai_chats: userData.totalAIChats || 0,
            level: userData.level || 1
        };

        // Check each badge
        for (const badge of BADGE_DEFINITIONS) {
            if (unlockedBadges.includes(badge.id)) continue;

            const reqType = badge.requirement.type;
            const reqValue = badge.requirement.value;

            if (stats[reqType] >= reqValue) {
                newlyUnlocked.push(badge);
            }
        }

        // Unlock new badges
        if (newlyUnlocked.length > 0) {
            const badgeIds = newlyUnlocked.map(b => b.id);
            await updateDoc(userRef, {
                unlockedBadges: arrayUnion(...badgeIds),
                lastBadgeUnlocked: serverTimestamp()
            });

            // Award XP for each badge
            for (const badge of newlyUnlocked) {
                await awardXP(userId, badge.xpReward, `Badge Unlocked: ${badge.name}`);
            }

            console.log(`✅ Unlocked ${newlyUnlocked.length} new badges for user ${userId}`);
        }

        return { newlyUnlocked, total: unlockedBadges.length + newlyUnlocked.length };
    } catch (error) {
        console.error('Error checking badges:', error);
        return { newlyUnlocked: [] };
    }
};

// Unlock a specific badge
export const unlockBadge = async (userId, badgeId) => {
    try {
        const userRef = doc(db, 'users', userId);
        const badge = BADGE_DEFINITIONS.find(b => b.id === badgeId);

        if (!badge) {
            throw new Error('Badge not found');
        }

        await updateDoc(userRef, {
            unlockedBadges: arrayUnion(badgeId),
            lastBadgeUnlocked: serverTimestamp()
        });

        // Award XP
        await awardXP(userId, badge.xpReward, `Badge Unlocked: ${badge.name}`);

        console.log(`✅ Badge unlocked: ${badge.name}`);
        return { success: true, badge };
    } catch (error) {
        console.error('Error unlocking badge:', error);
        throw error;
    }
};


// ===== TITLE MANAGEMENT FUNCTIONS =====

// Check and unlock titles based on level
export const checkAndUnlockTitles = async (userId) => {
    try {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) return { newlyUnlocked: [] };

        const userData = userSnap.data();
        const userLevel = userData.level || 1;
        const unlockedTitles = userData.unlockedTitles || [];
        const newlyUnlocked = [];

        // Check each title
        for (const title of TITLE_DEFINITIONS) {
            if (unlockedTitles.includes(title.id)) continue;

            if (userLevel >= title.requiredLevel) {
                newlyUnlocked.push(title);
            }
        }

        // Unlock new titles
        if (newlyUnlocked.length > 0) {
            const titleIds = newlyUnlocked.map(t => t.id);
            const updateData = {
                unlockedTitles: arrayUnion(...titleIds),
                lastTitleUnlocked: serverTimestamp()
            };

            // Auto-equip the highest level title if no title is equipped
            if (!userData.equippedTitle && newlyUnlocked.length > 0) {
                const highestTitle = newlyUnlocked.sort((a, b) => b.requiredLevel - a.requiredLevel)[0];
                updateData.equippedTitle = highestTitle.text;
                updateData.equippedTitleId = highestTitle.id;
            }

            await updateDoc(userRef, updateData);

            console.log(`✅ Unlocked ${newlyUnlocked.length} new titles for user ${userId}`);
        }

        return { newlyUnlocked, total: unlockedTitles.length + newlyUnlocked.length };
    } catch (error) {
        console.error('Error checking titles:', error);
        return { newlyUnlocked: [] };
    }
};

// Equip a title
export const equipTitle = async (userId, titleId) => {
    try {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            throw new Error('User not found');
        }

        const userData = userSnap.data();
        const unlockedTitles = userData.unlockedTitles || [];

        if (!unlockedTitles.includes(titleId)) {
            throw new Error('Title not unlocked');
        }

        const title = TITLE_DEFINITIONS.find(t => t.id === titleId);
        if (!title) {
            throw new Error('Title not found');
        }

        await updateDoc(userRef, {
            equippedTitle: title.text,
            equippedTitleId: titleId,
            lastTitleChange: serverTimestamp()
        });

        console.log(`✅ Title equipped: ${title.text}`);
        return { success: true, title };
    } catch (error) {
        console.error('Error equipping title:', error);
        throw error;
    }
};


// ===== ACHIEVEMENT TRACKING FUNCTIONS =====

// Check and unlock achievements
export const checkAndUnlockAchievements = async (userId, trigger, metadata = {}) => {
    try {
        const gamificationRef = doc(db, 'gamification', userId);
        const gamificationSnap = await getDoc(gamificationRef);

        if (!gamificationSnap.exists()) {
            await initializeGamification(userId);
            return { newlyUnlocked: [] };
        }

        const gamificationData = gamificationSnap.data();
        const achievements = gamificationData.achievements || [];
        const newlyUnlocked = [];

        // Get user stats for checking requirements
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.data() || {};

        const stats = {
            quiz_count: userData.totalQuizzes || 0,
            study_time: userData.totalStudyTime || 0,
            documents: userData.totalDocuments || 0,
            rooms: userData.totalRoomsJoined || 0,
            ai_chats: userData.totalAIChats || 0,
            missions: gamificationData.totalMissionsCompleted || 0,
            perfect_score: metadata.score === 100
        };

        // Check achievements that match the trigger
        const relevantAchievements = ACHIEVEMENT_DEFINITIONS.filter(a => a.trigger === trigger);

        for (const achievementDef of relevantAchievements) {
            const existing = achievements.find(a => a.id === achievementDef.id);

            if (existing && existing.unlocked) continue;

            let shouldUnlock = false;

            // Check requirement
            if (achievementDef.requirement.type === 'count') {
                const statKey = trigger.replace('_complete', '_count').replace('_upload', 's').replace('_join', 's');
                const currentValue = stats[statKey] || stats[trigger.replace('_', '_count')] || 0;
                shouldUnlock = currentValue >= achievementDef.requirement.value;
            } else if (achievementDef.requirement.type === 'total') {
                shouldUnlock = stats[achievementDef.trigger] >= achievementDef.requirement.value;
            } else if (achievementDef.requirement.type === 'score') {
                shouldUnlock = metadata.score >= achievementDef.requirement.value;
            }

            if (shouldUnlock) {
                // Update achievement
                const achievementIndex = achievements.findIndex(a => a.id === achievementDef.id);
                if (achievementIndex >= 0) {
                    achievements[achievementIndex].unlocked = true;
                    achievements[achievementIndex].unlockedAt = new Date().toISOString();
                    achievements[achievementIndex].progress = achievementDef.requirement.value;
                } else {
                    achievements.push({
                        ...achievementDef,
                        unlocked: true,
                        unlockedAt: new Date().toISOString(),
                        progress: achievementDef.requirement.value,
                        target: achievementDef.requirement.value
                    });
                }

                newlyUnlocked.push(achievementDef);
            }
        }

        // Save updated achievements
        if (newlyUnlocked.length > 0) {
            await updateDoc(gamificationRef, {
                achievements,
                totalAchievementsUnlocked: increment(newlyUnlocked.length),
                lastAchievementUnlocked: serverTimestamp()
            });

            // Award XP for each achievement
            for (const achievement of newlyUnlocked) {
                await awardXP(userId, achievement.xpReward, `Achievement: ${achievement.title}`);
            }

            console.log(`✅ Unlocked ${newlyUnlocked.length} achievements for trigger: ${trigger}`);
        }

        return { newlyUnlocked };
    } catch (error) {
        console.error('Error checking achievements:', error);
        return { newlyUnlocked: [] };
    }
};

// Update achievement progress (for achievements that track progress)
export const updateAchievementProgress = async (userId, achievementId, progress) => {
    try {
        const gamificationRef = doc(db, 'gamification', userId);
        const gamificationSnap = await getDoc(gamificationRef);

        if (!gamificationSnap.exists()) return;

        const data = gamificationSnap.data();
        const achievements = data.achievements || [];
        const achievementIndex = achievements.findIndex(a => a.id === achievementId);

        if (achievementIndex >= 0) {
            achievements[achievementIndex].progress = progress;

            // Check if should unlock
            if (!achievements[achievementIndex].unlocked &&
                progress >= achievements[achievementIndex].target) {
                achievements[achievementIndex].unlocked = true;
                achievements[achievementIndex].unlockedAt = new Date().toISOString();

                // Award XP
                await awardXP(userId, achievements[achievementIndex].xpReward,
                    `Achievement: ${achievements[achievementIndex].title}`);
            }

            await updateDoc(gamificationRef, { achievements });
        }
    } catch (error) {
        console.error('Error updating achievement progress:', error);
    }
};

// Track action and check for unlocks (comprehensive function to call after any user action)
export const trackActionAndCheckUnlocks = async (userId, action, metadata = {}) => {
    try {
        // Update user stats based on action
        const userRef = doc(db, 'users', userId);
        const updates = {};

        switch (action) {
            case 'quiz_complete':
                updates.totalQuizzes = increment(1);
                break;
            case 'document_upload':
                updates.totalDocuments = increment(1);
                break;
            case 'room_join':
                updates.totalRoomsJoined = increment(1);
                break;
            case 'ai_chat':
                updates.totalAIChats = increment(1);
                break;
            case 'study_time':
                updates.totalStudyTime = increment(metadata.minutes || 0);
                break;
        }

        if (Object.keys(updates).length > 0) {
            await updateDoc(userRef, updates);
        }

        // Check for badge unlocks, title unlocks, and achievement unlocks
        const [badges, titles, achievements] = await Promise.all([
            checkAndUnlockBadges(userId),
            checkAndUnlockTitles(userId),
            checkAndUnlockAchievements(userId, action, metadata)
        ]);

        const allUnlocks = {
            badges: badges.newlyUnlocked || [],
            titles: titles.newlyUnlocked || [],
            achievements: achievements.newlyUnlocked || []
        };

        return allUnlocks;
    } catch (error) {
        console.error('Error tracking action:', error);
        return { badges: [], titles: [], achievements: [] };
    }
};


export { XP_REWARDS, DAILY_ACTIONS, BADGE_DEFINITIONS, TITLE_DEFINITIONS, ACHIEVEMENT_DEFINITIONS };
