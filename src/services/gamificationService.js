// src/services/gamificationService.js - OPTIMIZED WITH DAILY XP LIMITS
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
    writeBatch
} from 'firebase/firestore';
import { db } from '@config/firebase';

// XP Rewards Configuration
const XP_REWARDS = {
    // One-time per day actions
    UPLOAD_DOCUMENT: 10,
    STUDY_SESSION: 5,
    USE_AI_CHAT: 3,
    ADD_NOTES: 2,
    JOIN_ROOM: 5,
    CREATE_FLASHCARD: 5,
    DAILY_LOGIN: 5,
    STREAK_BONUS: 10,
    
    // Multiple times actions
    COMPLETE_QUIZ: 20,
    CORRECT_ANSWER: 5,
    COMPLETE_MISSION: 50,
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

// Helper: Mark action as done today
const markActionDone = async (userId, actionType) => {
    try {
        const today = getTodayString();
        const dailyActionRef = doc(db, 'gamification', userId, 'dailyActions', today);
        
        await setDoc(dailyActionRef, {
            date: today,
            [`actions.${actionType}`]: {
                completed: true,
                timestamp: serverTimestamp()
            }
        }, { merge: true });
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
                alreadyEarned: true 
            };
        }
        
        // Get XP amount for this action
        const xpAmount = XP_REWARDS[actionType.toUpperCase()] || 0;
        
        if (xpAmount === 0) {
            return { success: false, message: 'Invalid action type' };
        }
        
        // Award XP
        const result = await awardXP(userId, xpAmount, reason);
        
        // Mark action as done today
        await markActionDone(userId, actionType);
        
        return { 
            success: true, 
            ...result,
            message: `+${xpAmount} XP earned!` 
        };
    } catch (error) {
        console.error('Error awarding daily XP:', error);
        return { success: false, message: 'Failed to award XP' };
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
        
        // Calculate level (100 XP per level)
        const newLevel = Math.floor(newXP / 100) + 1;
        const levelUp = newLevel > currentLevel;
        
        // Update user
        await updateDoc(userRef, {
            xp: newXP,
            level: newLevel,
            levelUp: levelUp,
            lastXPReason: reason,
            lastXPAmount: xpAmount,
            lastXPTime: serverTimestamp()
        });
        
        // Reset levelUp after animation
        if (levelUp) {
            setTimeout(async () => {
                try {
                    await updateDoc(userRef, { levelUp: false });
                } catch (error) {
                    console.error('Error resetting levelUp:', error);
                }
            }, 3000);
        }
        
        return { 
            newXP, 
            newLevel, 
            levelUp,
            xpGained: xpAmount 
        };
    } catch (error) {
        console.error('Error awarding XP:', error);
        throw error;
    }
};

// Initialize user gamification data
export const initializeGamification = async (userId) => {
    try {
        const gamificationRef = doc(db, 'gamification', userId);
        const userRef = doc(db, 'users', userId);
        
        // Check if already initialized
        const userSnap = await getDoc(userRef);
        if (userSnap.exists() && userSnap.data().xp !== undefined) {
            return; // Already initialized
        }
        
        // Daily missions
        const dailyMissions = [
            {
                id: 'daily_quiz',
                type: 'daily',
                title: 'Complete 3 Quizzes',
                description: 'Test your knowledge today',
                target: 3,
                current: 0,
                xpReward: 50,
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
                expiresAt: getEndOfDay()
            }
        ];
        
        // Weekly missions
        const weeklyMissions = [
            {
                id: 'weekly_quizzes',
                type: 'weekly',
                title: 'Complete 15 Quizzes',
                description: 'Consistency is key',
                target: 15,
                current: 0,
                xpReward: 200,
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
                expiresAt: getEndOfWeek()
            }
        ];
        
        // Use batch write for efficiency
        const batch = writeBatch(db);
        
        batch.set(gamificationRef, {
            missions: [...dailyMissions, ...weeklyMissions],
            achievements: [],
            lastLoginDate: getTodayString(),
            createdAt: serverTimestamp()
        }, { merge: true });
        
        batch.set(userRef, {
            xp: 0,
            level: 1,
            streak: 0,
            totalQuizzes: 0,
            totalStudyTime: 0,
            levelUp: false,
            createdAt: serverTimestamp()
        }, { merge: true });
        
        await batch.commit();
        
        console.log('✅ Gamification initialized for user:', userId);
    } catch (error) {
        console.error('Error initializing gamification:', error);
        throw error;
    }
};

// Update mission progress
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
            
            // Check if mission just completed
            if (newCurrent === mission.target && previousCurrent !== mission.target) {
                await awardXP(userId, mission.xpReward, `Completed: ${mission.title}`);
            }
            
            await updateDoc(gamificationRef, { missions });
        }
    } catch (error) {
        console.error('Error updating mission:', error);
    }
};

// Update daily streak
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
            
            // Use batch for efficiency
            const batch = writeBatch(db);
            batch.update(userRef, { streak: newStreak });
            batch.update(gamificationRef, { lastLoginDate: today });
            await batch.commit();
            
            // Award streak bonus
            if (newStreak > 0) {
                await awardXP(
                    userId, 
                    XP_REWARDS.STREAK_BONUS * newStreak, 
                    `${newStreak}-day streak! 🔥`
                );
            }
        }
    } catch (error) {
        console.error('Error updating streak:', error);
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
                    expiresAt: getEndOfDay() 
                };
            }
            return mission;
        });
        
        await updateDoc(gamificationRef, { missions: updatedMissions });
    } catch (error) {
        console.error('Error resetting daily missions:', error);
    }
};

// Get user's gamification stats
export const getGamificationStats = async (userId) => {
    try {
        const [userSnap, gamificationSnap] = await Promise.all([
            getDoc(doc(db, 'users', userId)),
            getDoc(doc(db, 'gamification', userId))
        ]);
        
        return {
            user: userSnap.exists() ? userSnap.data() : null,
            gamification: gamificationSnap.exists() ? gamificationSnap.data() : null
        };
    } catch (error) {
        console.error('Error getting gamification stats:', error);
        return null;
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

export { XP_REWARDS, DAILY_ACTIONS };
