// src/services/gamificationService.js - ULTIMATE ENHANCED VERSION 🚀
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

// Award XP (for actions that can be done multiple times)
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
        
        // Update user with enhanced stats
        await updateDoc(userRef, {
            xp: newXP,
            level: newLevel,
            levelUp: levelUp,
            levelsGained: levelsGained,
            totalXPEarned: increment(xpAmount),
            lastXPReason: reason,
            lastXPAmount: xpAmount,
            lastXPTime: serverTimestamp(),
            achievements: arrayUnion({
                type: 'xp_earned',
                amount: xpAmount,
                reason: reason,
                timestamp: serverTimestamp()
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

// Initialize user gamification data - ENHANCED
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
                expiresAt: getEndOfDay()
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
                expiresAt: getEndOfDay()
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
                expiresAt: getEndOfDay()
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
                expiresAt: getEndOfDay()
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
                expiresAt: getEndOfWeek()
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
                expiresAt: getEndOfWeek()
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
                expiresAt: getEndOfWeek()
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

// Check and unlock achievements
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
                missionMasterAchievement.unlockedAt = serverTimestamp();
                
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
                    expiresAt: getEndOfDay(),
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

export { XP_REWARDS, DAILY_ACTIONS };