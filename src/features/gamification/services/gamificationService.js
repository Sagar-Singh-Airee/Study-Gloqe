// src/services/gamificationService.js - BULLETPROOF PRODUCTION VERSION 🚀
import {
    doc,
    updateDoc,
    increment,
    setDoc,
    getDoc,
    serverTimestamp,
    collection,
    getDocs,
    writeBatch,
    arrayUnion
} from 'firebase/firestore';
import { db } from '@shared/config/firebase';

// 📤 Event Bus for real-time streaming
import { eventBus, EVENT_TYPES } from '@shared/services/eventBus';


// ==========================================
// CONFIGURATION
// ==========================================

// XP Rewards Configuration
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

    // Enhanced rewards
    PERFECT_QUIZ: 50,
    FAST_LEARNER: 20,
    CONSISTENT_LEARNER: 30,
    KNOWLEDGE_MASTER: 100,
};

// Daily action types
const DAILY_ACTIONS = {
    UPLOAD_DOCUMENT: 'upload_document',
    STUDY_SESSION: 'study_session',
    USE_AI_CHAT: 'use_ai_chat',
    ADD_NOTES: 'add_notes',
    JOIN_ROOM: 'join_room',
    CREATE_FLASHCARD: 'create_flashcard',
    DAILY_LOGIN: 'daily_login',
};

// Level progression thresholds
const LEVEL_THRESHOLDS = [0, 100, 250, 500, 1000, 2000, 4000, 8000, 16000, 32000, 64000];

// ==========================================
// BADGE DEFINITIONS
// ==========================================
const BADGE_DEFINITIONS = {
    first_steps: {
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
    quick_learner: {
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
    quiz_master: {
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
    dedicated_scholar: {
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
    knowledge_seeker: {
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
    streak_starter: {
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
    on_fire: {
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
    unstoppable: {
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
    content_creator: {
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
    library_builder: {
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
    social_learner: {
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
    community_champion: {
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
    ai_enthusiast: {
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
    level_10: {
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
    level_25: {
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
    level_50: {
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
};

// ==========================================
// TITLE DEFINITIONS
// ==========================================
const TITLE_DEFINITIONS = {
    novice: {
        id: 'novice',
        text: 'Novice Learner',
        requiredLevel: 1,
        description: 'Just getting started',
        rarity: 'common',
        color: 'text-gray-600'
    },
    student: {
        id: 'student',
        text: 'Student',
        requiredLevel: 3,
        description: 'Making progress',
        rarity: 'common',
        color: 'text-blue-600'
    },
    scholar: {
        id: 'scholar',
        text: 'Scholar',
        requiredLevel: 5,
        description: 'Dedicated to learning',
        rarity: 'common',
        color: 'text-green-600'
    },
    expert: {
        id: 'expert',
        text: 'Expert',
        requiredLevel: 10,
        description: 'Highly skilled',
        rarity: 'rare',
        color: 'text-purple-600'
    },
    master: {
        id: 'master',
        text: 'Master',
        requiredLevel: 15,
        description: 'Top of the class',
        rarity: 'rare',
        color: 'text-indigo-600'
    },
    sage: {
        id: 'sage',
        text: 'Sage',
        requiredLevel: 20,
        description: 'Wise beyond years',
        rarity: 'epic',
        color: 'text-yellow-600'
    },
    virtuoso: {
        id: 'virtuoso',
        text: 'Virtuoso',
        requiredLevel: 25,
        description: 'Elite performer',
        rarity: 'epic',
        color: 'text-orange-600'
    },
    prodigy: {
        id: 'prodigy',
        text: 'Prodigy',
        requiredLevel: 30,
        description: 'Exceptional talent',
        rarity: 'epic',
        color: 'text-red-600'
    },
    legend: {
        id: 'legend',
        text: 'Legend',
        requiredLevel: 40,
        description: 'Legendary status',
        rarity: 'legendary',
        color: 'text-gold-600'
    },
    immortal: {
        id: 'immortal',
        text: 'Immortal Scholar',
        requiredLevel: 50,
        description: 'Eternal wisdom',
        rarity: 'legendary',
        color: 'text-purple-900'
    }
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

const getTodayString = () => new Date().toISOString().split('T')[0];

const getStartOfDay = () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return start;
};

const getEndOfDay = () => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return end;
};

const getEndOfWeek = () => {
    const end = new Date();
    end.setDate(end.getDate() + (7 - end.getDay()));
    end.setHours(23, 59, 59, 999);
    return end;
};

// Calculate level from XP
const calculateLevel = (xp) => {
    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
        if (xp >= LEVEL_THRESHOLDS[i]) {
            return i + 1;
        }
    }
    return 1;
};

// ==========================================
// CORE XP FUNCTIONS
// ==========================================

/**
 * Award XP to user (for non-daily actions)
 */
export const awardXP = async (userId, xpAmount, reason) => {
    try {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            await initializeGamification(userId);
        }

        const userData = userSnap.data() || {};
        const currentXP = userData.xp || 0;
        const currentLevel = userData.level || 1;
        const newXP = currentXP + xpAmount;
        const newLevel = calculateLevel(newXP);
        const levelUp = newLevel > currentLevel;
        const levelsGained = newLevel - currentLevel;

        // Update user document
        await updateDoc(userRef, {
            xp: newXP,
            level: newLevel,
            levelUp: levelUp,
            levelsGained: levelsGained,
            totalXPEarned: increment(xpAmount),
            lastXPReason: reason,
            lastXPAmount: xpAmount,
            lastXPTime: serverTimestamp(),
            updatedAt: serverTimestamp()
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
                    console.warn('Error resetting levelUp:', error.message);
                }
            }, 5000);
        }

        console.log(`✅ Awarded ${xpAmount} XP to ${userId}. New level: ${newLevel}`);

        // 📤 Publish XP_AWARDED event to Event Bus
        eventBus.publish(EVENT_TYPES.XP_AWARDED, {
            userId,
            xpAmount,
            newTotalXP: newXP,
            newLevel,
            reason,
            awardedAt: new Date().toISOString()
        });

        // 📤 Publish LEVEL_UP event if leveled up
        if (levelUp) {
            eventBus.publish(EVENT_TYPES.LEVEL_UP, {
                userId,
                oldLevel: currentLevel,
                newLevel,
                levelsGained,
                leveledUpAt: new Date().toISOString()
            });
        }

        return {
            newXP,
            newLevel,
            levelUp,
            levelsGained,
            xpGained: xpAmount,
            nextLevelXP: LEVEL_THRESHOLDS[newLevel] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1]
        };
    } catch (error) {
        console.error('❌ Error awarding XP:', error);
        throw error;
    }
};

/**
 * Check if user can earn daily XP for an action
 */
export const canAwardDailyXP = async (userId, actionType) => {
    try {
        const today = getTodayString();
        const dailyActionRef = doc(db, 'gamification', userId, 'dailyActions', today);
        const dailyActionSnap = await getDoc(dailyActionRef);

        if (!dailyActionSnap.exists()) {
            return true;
        }

        const actions = dailyActionSnap.data().actions || {};
        return !actions[actionType];
    } catch (error) {
        console.warn('⚠️ Error checking daily XP:', error.message);
        return false;
    }
};

/**
 * Award daily XP (once per day limit)
 */
export const awardDailyXP = async (userId, actionType, reason) => {
    try {
        // Check if already earned today
        const canAward = await canAwardDailyXP(userId, actionType);

        if (!canAward) {
            return {
                success: false,
                message: 'Already earned XP for this action today!',
                alreadyEarned: true,
                xpGained: 0
            };
        }

        const xpAmount = XP_REWARDS[actionType] || 0;

        if (xpAmount === 0) {
            return {
                success: false,
                message: 'Invalid action type',
                xpGained: 0
            };
        }

        // Award XP
        const result = await awardXP(userId, xpAmount, reason);

        // Mark action as done today
        const today = getTodayString();
        const dailyActionRef = doc(db, 'gamification', userId, 'dailyActions', today);

        await setDoc(dailyActionRef, {
            date: today,
            [`actions.${actionType}`]: {
                completed: true,
                timestamp: new Date().toISOString(),
                xp: xpAmount,
                type: actionType
            },
            lastUpdated: serverTimestamp()
        }, { merge: true });

        return {
            success: true,
            ...result,
            message: `+${xpAmount} XP earned!`
        };
    } catch (error) {
        console.error('❌ Error awarding daily XP:', error);
        return {
            success: false,
            message: 'Failed to award XP',
            xpGained: 0
        };
    }
};

/**
 * Get user's today's XP total
 */
export const getUserTodaysXP = async (userId) => {
    try {
        const today = getTodayString();
        const dailyActionRef = doc(db, 'gamification', userId, 'dailyActions', today);
        const dailyActionSnap = await getDoc(dailyActionRef);

        if (!dailyActionSnap.exists()) {
            return {
                total: 0,
                actions: {},
                dailyProgress: 0
            };
        }

        const actions = dailyActionSnap.data().actions || {};
        let totalXP = 0;

        Object.values(actions).forEach(action => {
            if (action.xp) {
                totalXP += action.xp;
            }
        });

        return {
            total: totalXP,
            actions: actions,
            dailyProgress: Math.min((totalXP / 100) * 100, 100)
        };
    } catch (error) {
        console.warn('⚠️ Error getting today\'s XP:', error.message);
        return {
            total: 0,
            actions: {},
            dailyProgress: 0
        };
    }
};

// ==========================================
// BADGE FUNCTIONS
// ==========================================

/**
 * Check and unlock badges based on user stats
 */
export const checkAndUnlockBadges = async (userId) => {
    try {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) return { newlyUnlocked: [] };

        const userData = userSnap.data();
        const unlockedBadges = userData.unlockedBadges || [];
        const newlyUnlocked = [];

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
        for (const badge of Object.values(BADGE_DEFINITIONS)) {
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
                await awardXP(userId, badge.xpReward, `Badge: ${badge.name}`);
            }

            console.log(`✅ Unlocked ${newlyUnlocked.length} badges for ${userId}`);
        }

        return { newlyUnlocked, total: unlockedBadges.length + newlyUnlocked.length };
    } catch (error) {
        console.error('❌ Error checking badges:', error);
        return { newlyUnlocked: [] };
    }
};

// ==========================================
// TITLE FUNCTIONS
// ==========================================

/**
 * Check and unlock titles based on level
 */
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
        for (const title of Object.values(TITLE_DEFINITIONS)) {
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

            // Auto-equip highest title if none equipped
            if (!userData.equippedTitle && newlyUnlocked.length > 0) {
                const highestTitle = newlyUnlocked.sort((a, b) => b.requiredLevel - a.requiredLevel)[0];
                updateData.equippedTitle = highestTitle.text;
                updateData.equippedTitleId = highestTitle.id;
            }

            await updateDoc(userRef, updateData);

            console.log(`✅ Unlocked ${newlyUnlocked.length} titles for ${userId}`);
        }

        return { newlyUnlocked, total: unlockedTitles.length + newlyUnlocked.length };
    } catch (error) {
        console.error('❌ Error checking titles:', error);
        return { newlyUnlocked: [] };
    }
};

/**
 * Equip a title
 */
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

        const title = TITLE_DEFINITIONS[titleId];
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
        console.error('❌ Error equipping title:', error);
        throw error;
    }
};

// ==========================================
// STREAK FUNCTIONS
// ==========================================

/**
 * Update user's login streak
 */
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
        const gamificationData = gamificationSnap.exists() ? gamificationSnap.data() : {};

        const today = getTodayString();
        const lastLogin = gamificationData.lastLoginDate;

        if (lastLogin !== today) {
            const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
            const isConsecutive = lastLogin === yesterday;

            const newStreak = isConsecutive ? (userData?.streak || 0) + 1 : 1;
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

            // Award streak bonus
            if (newStreak > 0) {
                await awardXP(userId, streakBonus, `${newStreak}-day streak! 🔥`);
            }

            // Award daily login XP
            await awardDailyXP(userId, DAILY_ACTIONS.DAILY_LOGIN, 'Daily login');

            console.log(`✅ Streak updated: ${newStreak} days`);
        }
    } catch (error) {
        console.error('❌ Error updating streak:', error);
    }
};

// ==========================================
// INITIALIZATION
// ==========================================

/**
 * Initialize gamification data for new user
 */
export const initializeGamification = async (userId) => {
    try {
        const gamificationRef = doc(db, 'gamification', userId);
        const userRef = doc(db, 'users', userId);

        // Check if already initialized
        const userSnap = await getDoc(userRef);
        if (userSnap.exists() && userSnap.data().xp !== undefined) {
            return;
        }

        const batch = writeBatch(db);

        batch.set(gamificationRef, {
            missions: [],
            achievements: [],
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
            totalDocuments: 0,
            totalRoomsJoined: 0,
            totalAIChats: 0,
            unlockedBadges: [],
            unlockedTitles: ['novice'],
            equippedTitle: 'Novice Learner',
            equippedTitleId: 'novice',
            levelUp: false,
            levelsGained: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        }, { merge: true });

        await batch.commit();

        console.log('✅ Gamification initialized for user:', userId);
    } catch (error) {
        console.error('❌ Error initializing gamification:', error);
        throw error;
    }
};

// ==========================================
// COMPREHENSIVE TRACKING
// ==========================================

/**
 * Track action and check for all unlocks
 */
export const trackActionAndCheckUnlocks = async (userId, action, metadata = {}) => {
    try {
        // Update user stats
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

        // Check for unlocks
        const [badges, titles] = await Promise.all([
            checkAndUnlockBadges(userId),
            checkAndUnlockTitles(userId)
        ]);

        return {
            badges: badges.newlyUnlocked || [],
            titles: titles.newlyUnlocked || [],
            achievements: []
        };
    } catch (error) {
        console.error('❌ Error tracking action:', error);
        return { badges: [], titles: [], achievements: [] };
    }
};

// ==========================================
// LEADERBOARD
// ==========================================

/**
 * Get class leaderboard
 */
export const getClassLeaderboard = async (classId) => {
    try {
        const classRef = doc(db, 'classes', classId);
        const classSnap = await getDoc(classRef);

        if (!classSnap.exists()) {
            throw new Error('Class not found');
        }

        const classData = classSnap.data();
        const studentIds = classData.studentIds || classData.students || [];

        if (studentIds.length === 0) {
            return [];
        }

        const students = await Promise.all(
            studentIds.map(async (studentId) => {
                try {
                    const userRef = doc(db, 'users', studentId);
                    const userSnap = await getDoc(userRef);

                    if (!userSnap.exists()) return null;

                    const userData = userSnap.data();

                    return {
                        id: studentId,
                        name: userData.displayName || userData.name || userData.email || 'Unknown',
                        points: userData.xp || 0,
                        level: userData.level || 1,
                        streak: userData.streak || 0,
                        quizzes: userData.totalQuizzes || 0,
                        photoURL: userData.photoURL || null
                    };
                } catch (error) {
                    console.warn(`⚠️ Error loading student ${studentId}:`, error.message);
                    return null;
                }
            })
        );

        const validStudents = students.filter(s => s !== null);
        validStudents.sort((a, b) => b.points - a.points);

        return validStudents.map((student, index) => ({
            ...student,
            rank: index + 1,
            change: 0
        }));
    } catch (error) {
        console.error('❌ Error getting class leaderboard:', error);
        throw error;
    }
};

// ==========================================
// EXPORTS
// ==========================================

export {
    XP_REWARDS,
    DAILY_ACTIONS,
    BADGE_DEFINITIONS,
    TITLE_DEFINITIONS,
    LEVEL_THRESHOLDS
};
