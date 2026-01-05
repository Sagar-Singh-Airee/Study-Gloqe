// src/features/gamification/services/gamificationService.js - ✅ FIXED AUTO-UNLOCK VERSION
import {
    doc,
    updateDoc,
    increment,
    setDoc,
    getDoc,
    serverTimestamp,
    writeBatch,
    arrayUnion,
    runTransaction
} from 'firebase/firestore';
import { db } from '@shared/config/firebase';
import { calculateLevel, getNextLevelXp } from '@shared/utils/levelUtils';
// Achievement Definitions
import { BADGE_DEFINITIONS, TITLE_DEFINITIONS } from '../config/achievements';


// Reward Constants
export const XP_REWARDS = {
    // One-time per day actions
    UPLOAD_DOCUMENT: 25,
    STUDY_SESSION: 20,
    USE_AI_CHAT: 5,
    ADD_NOTES: 5,
    JOIN_ROOM: 10,
    CREATE_ROOM: 15,
    CREATE_FLASHCARD: 10,
    DAILY_LOGIN: 10,
    STREAK_BONUS: 15,


    // Multiple times actions
    COMPLETE_QUIZ: 50,
    CORRECT_ANSWER: 5,
    CONTENT_GENERATED: 15,


    // Enhanced rewards
    PERFECT_QUIZ: 50,
    KNOWLEDGE_MASTER: 100,
};


export const DAILY_ACTIONS = {
    UPLOAD_DOCUMENT: 'UPLOAD_DOCUMENT',
    STUDY_SESSION: 'STUDY_SESSION',
    USE_AI_CHAT: 'USE_AI_CHAT',
    ADD_NOTES: 'ADD_NOTES',
    JOIN_ROOM: 'JOIN_ROOM',
    CREATE_FLASHCARD: 'CREATE_FLASHCARD',
    DAILY_LOGIN: 'DAILY_LOGIN',
    STREAK_BONUS: 'STREAK_BONUS',
    COMPLETE_QUIZ: 'COMPLETE_QUIZ',
    CORRECT_ANSWER: 'CORRECT_ANSWER',
    CONTENT_GENERATED: 'CONTENT_GENERATED'
};


const DAILY_XP_GOAL = 100;


// Re-exports for backward compatibility
export { BADGE_DEFINITIONS, TITLE_DEFINITIONS };


// ==========================================
// CORE XP FUNCTIONS
// ==========================================


/**
 * Award XP using atomic operations to both users and gamification docs
 */
export const awardXP = async (userId, xpAmount, reason) => {
    if (!userId || !xpAmount) return null;


    try {
        const userRef = doc(db, 'users', userId);
        const gamificationRef = doc(db, 'gamification', userId);


        const result = await runTransaction(db, async (transaction) => {
            const userSnap = await transaction.get(userRef);
            const gamificationSnap = await transaction.get(gamificationRef);


            if (!userSnap.exists()) {
                throw new Error('User not found');
            }


            const userData = userSnap.data();


            // Determine current state (favoring users doc for XP/Level)
            const currentXP = userData.xp || 0;
            const currentLevel = userData.level || 1;
            const newXP = currentXP + xpAmount;
            const newLevel = calculateLevel(newXP);
            const levelUp = newLevel > currentLevel;
            const levelsGained = newLevel - currentLevel;


            // 1. Update Users Collection (Display/Leaderboard)
            transaction.update(userRef, {
                xp: newXP,
                level: newLevel,
                updatedAt: serverTimestamp(),
                lastXPReason: reason,
                lastXPAmount: xpAmount,
                lastXPTime: serverTimestamp()
            });


            // 2. Update Gamification Collection (Detailed tracking)
            if (gamificationSnap.exists()) {
                transaction.update(gamificationRef, {
                    xp: newXP,
                    level: newLevel,
                    updatedAt: serverTimestamp()
                });
            } else {
                transaction.set(gamificationRef, {
                    xp: newXP,
                    level: newLevel,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                }, { merge: true });
            }


            return {
                newXP,
                newLevel,
                levelUp,
                levelsGained,
                xpGained: xpAmount,
                nextLevelXP: getNextLevelXp(newXP),
                currentLevel // Pass old level for comparison
            };
        });


        // ✅ FIX: Always check for unlocks after XP gain, especially on level up
        // Wait a bit for Firestore to propagate the changes
        await new Promise(resolve => setTimeout(resolve, 100));

        // Re-fetch the updated user data
        const userSnap = await getDoc(userRef);
        const gamificationSnap = await getDoc(gamificationRef);

        const updatedData = {
            ...userSnap.data(),
            ...(gamificationSnap.exists() ? gamificationSnap.data() : {})
        };


        // Check for new achievements after XP gain
        await checkAndUnlockBadges(userId, updatedData);
        await checkAndUnlockTitles(userId, updatedData);


        return result;
    } catch (error) {
        console.error('❌ Error awarding XP:', error);
        throw error;
    }
};


/**
 * Award daily XP (limit to once per day)
 */
export const awardDailyXP = async (userId, actionType, reason) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const dailyActionRef = doc(db, 'gamification', userId, 'dailyActions', today);
        const dailyActionSnap = await getDoc(dailyActionRef);


        if (dailyActionSnap.exists() && dailyActionSnap.data().actions?.[actionType]) {
            return { success: false, message: 'Daily limit reached', xpGained: 0 };
        }


        const xpAmount = XP_REWARDS[actionType] || XP_REWARDS[actionType.toUpperCase()] || 0;
        if (xpAmount === 0) return { success: false, message: 'Invalid action', xpGained: 0 };


        const result = await awardXP(userId, xpAmount, reason);


        await setDoc(dailyActionRef, {
            actions: {
                [actionType]: {
                    completed: true,
                    timestamp: new Date().toISOString(),
                    xp: xpAmount
                }
            },
            lastUpdated: serverTimestamp()
        }, { merge: true });


        return { success: true, ...result, message: `+${xpAmount} XP earned!` };
    } catch (error) {
        console.error('❌ Error awarding daily XP:', error);
        return { success: false, message: 'Failed to award XP', xpGained: 0 };
    }
};


// ==========================================
// TRACKING & UNLOCK FUNCTIONS
// ==========================================


/**
 * Main entry point for tracking any user action
 */
export const trackAction = async (userId, action, data = {}) => {
    if (!userId) return;


    try {
        const gamificationRef = doc(db, 'gamification', userId);
        const userRef = doc(db, 'users', userId);
        const updates = { updatedAt: serverTimestamp() };
        let xpToAward = 0;
        let awardReason = '';


        switch (action) {
            case 'STUDY_SESSION':
                const minutes = data.minutes || 1;
                updates.totalStudyTime = increment(minutes);
                xpToAward = XP_REWARDS.STUDY_SESSION;
                awardReason = `Study session: ${minutes} min`;
                break;


            case 'QUIZ_COMPLETED':
                updates.quizzesCompleted = increment(1);
                xpToAward = XP_REWARDS.COMPLETE_QUIZ;
                awardReason = 'Quiz completed';
                if (data.perfect) {
                    updates.perfectQuizzes = increment(1);
                    xpToAward += XP_REWARDS.PERFECT_QUIZ;
                }
                break;


            case 'FLASHCARD_REVIEWED':
                updates.flashcardsReviewed = increment(data.count || 1);
                xpToAward = (data.count || 1) * 2; // 2 XP per card
                awardReason = 'Flashcards reviewed';
                break;


            case 'DOCUMENT_UPLOADED':
                updates.documentsUploaded = increment(1);
                xpToAward = XP_REWARDS.UPLOAD_DOCUMENT;
                awardReason = 'Document uploaded';
                break;


            case 'ROOM_JOINED':
                updates.classesJoined = increment(1);
                xpToAward = XP_REWARDS.JOIN_ROOM;
                awardReason = 'Joined study room';
                break;


            case 'CONTENT_GENERATED':
                const items = data.count || 1;
                updates.contentGenerated = increment(items);
                xpToAward = items * XP_REWARDS.CONTENT_GENERATED;
                awardReason = 'AI content generated';
                break;


            case 'STUDY_TIME':
                // Alias for study session tracking (from studySessionService)
                const studyMinutes = data.minutes || 1;
                updates.totalStudyTime = increment(studyMinutes);
                // No XP awarded here - XP is handled separately via daily actions
                console.log(`📊 Tracked study time: ${studyMinutes} minutes`);
                break;


            default:
                console.warn(`⚠️ Unknown action: ${action}`);
                return;
        }


        // Apply updates to gamification doc
        await setDoc(gamificationRef, updates, { merge: true });


        // Update display stats on user doc for sync
        const userUpdates = {};
        if (updates.totalStudyTime) userUpdates.totalStudyTime = updates.totalStudyTime;
        if (updates.quizzesCompleted) userUpdates.quizzesCompleted = updates.quizzesCompleted;
        if (updates.perfectQuizzes) userUpdates.perfectQuizzes = updates.perfectQuizzes;
        if (updates.documentsUploaded) userUpdates.documentsUploaded = updates.documentsUploaded;
        if (updates.classesJoined) userUpdates.classesJoined = updates.classesJoined;


        if (Object.keys(userUpdates).length > 0) {
            await updateDoc(userRef, userUpdates).catch(e => console.warn("Sync stats to users doc failed", e));
        }


        // Award XP if applicable
        if (xpToAward > 0) {
            await awardXP(userId, xpToAward, awardReason);
        } else {
            // Still check for unlocks if no XP was awarded but stats changed
            await checkAndUnlockBadges(userId);
            await checkAndUnlockTitles(userId);
        }


        console.log(`✅ Action tracked and synced: ${action}`);
    } catch (error) {
        console.error(`❌ Error tracking action ${action}:`, error);
    }
};


/**
 * Check and unlock badges based on master definitions
 */
export const checkAndUnlockBadges = async (userId, prefetchedData = null) => {
    try {
        const userRef = doc(db, 'users', userId);
        const gamificationRef = doc(db, 'gamification', userId);


        let userData;
        if (prefetchedData) {
            userData = prefetchedData;
        } else {
            const [userSnap, gamificationSnap] = await Promise.all([
                getDoc(userRef),
                getDoc(gamificationRef)
            ]);


            if (!userSnap.exists()) return { newlyUnlocked: [] };


            userData = {
                ...userSnap.data(),
                ...(gamificationSnap.exists() ? gamificationSnap.data() : {})
            };
        }


        const unlockedBadges = userData.unlockedBadges || userData.badges || [];
        const newlyUnlocked = [];


        for (const badge of Object.values(BADGE_DEFINITIONS)) {
            if (unlockedBadges.includes(badge.id)) continue;


            if (badge.condition(userData)) {
                newlyUnlocked.push(badge);
            }
        }


        if (newlyUnlocked.length > 0) {
            const badgeIds = newlyUnlocked.map(b => b.id);
            const batch = writeBatch(db);


            batch.update(userRef, {
                unlockedBadges: arrayUnion(...badgeIds),
                badgesUnlocked: (unlockedBadges.length + newlyUnlocked.length)
            });


            batch.update(gamificationRef, {
                unlockedBadges: arrayUnion(...badgeIds),
                badgesUnlocked: (unlockedBadges.length + newlyUnlocked.length)
            });


            await batch.commit();


            // Award reward XP for each badge
            for (const badge of newlyUnlocked) {
                await awardXP(userId, badge.xpReward || 50, `Badge earned: ${badge.name}`);
            }


            console.log(`🎉 Unlocked ${newlyUnlocked.length} badges!`);
        }


        return { newlyUnlocked, total: unlockedBadges.length + newlyUnlocked.length };
    } catch (error) {
        console.error('❌ Error checking badges:', error);
        return { newlyUnlocked: [] };
    }
};


/**
 * ✅ FIXED: Check and unlock titles based on level and conditions
 */
export const checkAndUnlockTitles = async (userId, prefetchedData = null) => {
    try {
        const userRef = doc(db, 'users', userId);
        const gamificationRef = doc(db, 'gamification', userId);


        let userData;
        if (prefetchedData) {
            userData = prefetchedData;
        } else {
            const [userSnap, gamificationSnap] = await Promise.all([
                getDoc(userRef),
                getDoc(gamificationRef)
            ]);


            if (!userSnap.exists()) return { newlyUnlocked: [] };


            userData = {
                ...userSnap.data(),
                ...(gamificationSnap.exists() ? gamificationSnap.data() : {})
            };
        }


        const extractIds = (arr) => {
            if (!Array.isArray(arr)) return [];
            return arr.map(item => typeof item === 'object' ? (item.id || item.titleId || item.id) : item).filter(Boolean);
        };


        const unlockedTitles = Array.from(new Set([
            ...(userData.unlockedTitles || []),
            ...(userData.titles || []),
            ...extractIds(userData.achievements)
        ]));
        const newlyUnlocked = [];


        const currentLevel = userData.level || 1;


        for (const title of Object.values(TITLE_DEFINITIONS)) {
            if (unlockedTitles.includes(title.id)) continue;


            // ✅ FIX: Check both condition function AND requiredLevel
            let shouldUnlock = false;

            // If title has requiredLevel property, check level first
            if (title.requiredLevel !== undefined) {
                shouldUnlock = currentLevel >= title.requiredLevel;
            }

            // If title has condition function, check that too
            if (title.condition && typeof title.condition === 'function') {
                shouldUnlock = shouldUnlock && title.condition(userData);
            } else if (!title.requiredLevel && title.condition) {
                // If no requiredLevel but has condition, just use condition
                shouldUnlock = title.condition(userData);
            }


            if (shouldUnlock) {
                newlyUnlocked.push(title);
                console.log(`👑 Unlocking title: ${title.text} (Level ${currentLevel}/${title.requiredLevel})`);
            }
        }


        if (newlyUnlocked.length > 0) {
            const titleIds = newlyUnlocked.map(t => t.id);
            const batch = writeBatch(db);


            batch.update(userRef, {
                unlockedTitles: arrayUnion(...titleIds),
                updatedAt: serverTimestamp()
            });


            batch.update(gamificationRef, {
                unlockedTitles: arrayUnion(...titleIds),
                updatedAt: serverTimestamp()
            });


            await batch.commit();
            console.log(`👑 Successfully unlocked ${newlyUnlocked.length} titles!`, titleIds);
        }


        return { newlyUnlocked, total: unlockedTitles.length + newlyUnlocked.length };
    } catch (error) {
        console.error('❌ Error checking titles:', error);
        return { newlyUnlocked: [] };
    }
};


/**
 * Equip a title - synced to both docs
 */
export const equipTitle = async (userId, titleId) => {
    try {
        const title = TITLE_DEFINITIONS[Object.keys(TITLE_DEFINITIONS).find(k => TITLE_DEFINITIONS[k].id === titleId)];
        if (!title) throw new Error('Title not found');


        const batch = writeBatch(db);
        batch.update(doc(db, 'users', userId), {
            equippedTitle: title.text,
            equippedTitleId: title.id,
            updatedAt: serverTimestamp()
        });
        batch.update(doc(db, 'gamification', userId), {
            equippedTitle: title.text,
            equippedTitleId: title.id,
            updatedAt: serverTimestamp()
        });


        await batch.commit();
        return { success: true, title };
    } catch (error) {
        console.error('❌ Error equipping title:', error);
        throw error;
    }
};


/**
 * ✅ NEW: Force check titles for a user (useful for manual unlock or debugging)
 */
export const forceCheckTitles = async (userId) => {
    console.log('🔄 Force checking titles for user:', userId);
    return await checkAndUnlockTitles(userId);
};


/**
 * Repair/Sync user gamification data between collections
 * Ensures everything in 'gamification' is also in 'users'
 */
export const repairUserGamification = async (userId) => {
    if (!userId) return;


    try {
        const userRef = doc(db, 'users', userId);
        const gamificationRef = doc(db, 'gamification', userId);
        const achievementsRef = doc(db, 'achievements', userId);


        const [userSnap, gamificationSnap, achievementsSnap] = await Promise.all([
            getDoc(userRef),
            getDoc(gamificationRef),
            getDoc(achievementsRef)
        ]);


        if (!userSnap.exists()) return;


        const userData = userSnap.data();
        const gamData = gamificationSnap.exists() ? gamificationSnap.data() : {};
        const achData = achievementsSnap.exists() ? achievementsSnap.data() : {};


        const extractIds = (arr) => {
            if (!Array.isArray(arr)) return [];
            return arr.map(item => typeof item === 'object' ? (item.id || item.titleId || item.badgeId) : item).filter(Boolean);
        };


        const updates = {};


        // 1. Check for missing badges (supporting legacy names & collection)
        const userBadges = extractIds(userData.unlockedBadges || userData.badges || []);
        const gamBadges = extractIds(gamData.unlockedBadges || gamData.badges || []);
        const archBadges = extractIds(achData.badges || achData.achievements || []);
        const allBadges = Array.from(new Set([...userBadges, ...gamBadges, ...archBadges]));


        if (allBadges.length > (userData.unlockedBadges || []).length) {
            updates.unlockedBadges = allBadges;
        }


        // 2. Check for missing titles (supporting legacy names & collection)
        const userTitles = extractIds(userData.unlockedTitles || userData.titles || userData.achievements || []);
        const gamTitles = extractIds(gamData.unlockedTitles || gamData.titles || gamData.achievements || []);
        const achTitles = extractIds(achData.unlockedTitles || achData.titles || achData.achievements || []);


        // Ensure 'title_newbie' is always present
        if (!userTitles.includes('title_newbie')) userTitles.push('title_newbie');


        const allTitles = Array.from(new Set([...userTitles, ...gamTitles, ...achTitles]));


        if (allTitles.length > (userData.unlockedTitles || []).length) {
            updates.unlockedTitles = allTitles;
        }


        // 3. Ensure stats are synced (Favoring higher values where appropriate)
        const statsToSync = [
            'xp', 'level', 'streak', 'totalStudyTime',
            'quizzesCompleted', 'perfectQuizzes', 'documentsUploaded',
            'classesJoined', 'flashcardsReviewed', 'flashcardsMastered'
        ];


        statsToSync.forEach(stat => {
            const userVal = userData[stat] || 0;
            const gamVal = gamData[stat] || 0;


            if (gamVal > userVal) {
                updates[stat] = gamVal;
                if (stat === 'xp') {
                    updates.level = calculateLevel(gamVal);
                }
            }
        });


        // 4. Equipped title sync (Legacy support for 'equippedTitleId')
        const currentEquippedId = userData.equippedTitleId || userData.currentTitleId;
        const gamEquippedId = gamData.equippedTitleId || gamData.currentTitleId || achData.equippedTitleId || achData.currentTitleId;


        if (gamEquippedId && !currentEquippedId) {
            updates.equippedTitleId = gamEquippedId;
            const titleDef = Object.values(TITLE_DEFINITIONS).find(t => t.id === gamEquippedId);
            updates.equippedTitle = gamData.equippedTitle || achData.equippedTitle || titleDef?.text;
        }


        if (Object.keys(updates).length > 0) {
            console.log(`🔧 Repairing gamification data for ${userId}:`, updates);


            const batch = writeBatch(db);
            batch.update(userRef, {
                ...updates,
                updatedAt: serverTimestamp()
            });


            if (gamificationSnap.exists()) {
                batch.update(gamificationRef, {
                    ...updates,
                    updatedAt: serverTimestamp()
                });
            } else {
                batch.set(gamificationRef, {
                    ...userData,
                    ...updates,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
            }


            await batch.commit();

            // ✅ FIX: After repair, force check titles and badges to unlock any missing ones
            await checkAndUnlockBadges(userId);
            await checkAndUnlockTitles(userId);

            return { success: true, repaired: true };
        }


        // ✅ Even if no repair needed, check titles and badges
        await checkAndUnlockBadges(userId);
        await checkAndUnlockTitles(userId);

        return { success: true, repaired: false };
    } catch (error) {
        console.error('❌ Error repairing gamification:', error);
        return { success: false, error: error.message };
    }
};


/**
 * Get user's today's XP total
 */
export const getUserTodaysXP = async (userId) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const dailyActionRef = doc(db, 'gamification', userId, 'dailyActions', today);
        const dailyActionSnap = await getDoc(dailyActionRef);


        if (!dailyActionSnap.exists()) {
            return { total: 0, actions: {}, dailyProgress: 0 };
        }


        const actions = dailyActionSnap.data().actions || {};
        let totalXP = 0;
        Object.values(actions).forEach(a => { totalXP += (a.xp || 0); });


        const dailyProgress = Math.min((totalXP / DAILY_XP_GOAL) * 100, 100);
        return { total: totalXP, actions, dailyProgress: Math.round(dailyProgress) };
    } catch (error) {
        console.warn('⚠️ Error getting today\'s XP:', error.message);
        return { total: 0, actions: {}, dailyProgress: 0 };
    }
};


/**
 * Get class-specific leaderboard data
 */
export const getClassLeaderboard = async (classId) => {
    try {
        const classRef = doc(db, 'classes', classId);
        const classSnap = await getDoc(classRef);


        if (!classSnap.exists()) return [];


        const studentIds = classSnap.data().students || [];
        if (studentIds.length === 0) return [];


        const students = await Promise.all(
            studentIds.map(async (studentId) => {
                try {
                    const userRef = doc(db, 'users', studentId);
                    const userSnap = await getDoc(userRef);
                    if (!userSnap.exists()) return null;


                    const data = userSnap.data();
                    return {
                        id: studentId,
                        name: data.name || data.displayName || 'Anonymous Student',
                        points: data.xp || 0,
                        level: data.level || 1,
                        streak: data.streak || 0,
                        avgScore: data.avgScore || 0,
                        quizzes: data.quizzesCompleted || data.totalQuizzes || 0,
                        equippedTitle: data.equippedTitle || null
                    };
                } catch (err) {
                    console.error(`Error fetching student ${studentId} for leaderboard:`, err);
                    return null;
                }
            })
        );


        return students
            .filter(s => s !== null)
            .sort((a, b) => b.points - a.points);
    } catch (error) {
        console.error('❌ Error fetching class leaderboard:', error);
        return [];
    }
};


export const initializeGamification = async (userId) => {
    try {
        const userRef = doc(db, 'users', userId);
        const gamificationRef = doc(db, 'gamification', userId);


        const batch = writeBatch(db);
        const initialData = {
            xp: 0,
            level: 1,
            streak: 0,
            unlockedBadges: [],
            unlockedTitles: ['title_newbie'],
            equippedTitle: 'Novice Learner',
            equippedTitleId: 'title_newbie',
            quizzesCompleted: 0,
            totalStudyTime: 0,
            updatedAt: serverTimestamp()
        };


        batch.update(userRef, initialData);
        batch.set(gamificationRef, {
            ...initialData,
            createdAt: serverTimestamp()
        }, { merge: true });


        await batch.commit();
    } catch (error) {
        console.error('❌ Error initializing gamification:', error);
    }
};


export default {
    awardXP,
    awardDailyXP,
    trackAction,
    checkAndUnlockBadges,
    checkAndUnlockTitles,
    forceCheckTitles,
    equipTitle,
    getUserTodaysXP,
    initializeGamification,
    getClassLeaderboard,
    repairUserGamification,
    XP_REWARDS,
    DAILY_ACTIONS,
    BADGE_DEFINITIONS,
    TITLE_DEFINITIONS
};
