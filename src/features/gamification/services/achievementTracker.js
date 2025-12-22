// src/features/gamification/services/achievementTracker.js - ✅ FIXED
import { doc, updateDoc, increment, arrayUnion, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../../../shared/config/firebase';
import { BADGE_DEFINITIONS, TITLE_DEFINITIONS } from '../config/achievements';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';

/**
 * Track user action and update stats
 * ✅ FIXED: Added CONTENT_GENERATED action type
 */
export const trackAction = async (userId, actionType, data = {}) => {
    if (!userId) return;

    const userRef = doc(db, 'gamification', userId);

    const updates = {
        updatedAt: serverTimestamp()
    };

    switch (actionType) {
        case 'STUDY_TIME':
            updates.totalStudyTime = increment(data.seconds || 0);
            updates.xp = increment(Math.floor((data.seconds || 0) / 60)); // 1 XP per minute
            break;

        case 'QUIZ_COMPLETED':
            updates.quizzesCompleted = increment(1);
            updates.xp = increment(data.score || 50);
            if (data.perfect) {
                updates.perfectQuizzes = increment(1);
            }
            break;

        case 'FLASHCARD_REVIEWED':
            updates.flashcardsReviewed = increment(data.count || 1);
            updates.xp = increment(data.count || 1);
            break;

        case 'FLASHCARD_MASTERED':
            updates.flashcardsMastered = increment(1);
            updates.xp = increment(10);
            break;

        case 'DOCUMENT_UPLOADED':
            updates.documentsUploaded = increment(1);
            updates.xp = increment(25);
            break;

        case 'CLASS_JOINED':
            updates.classesJoined = increment(1);
            updates.xp = increment(50);
            break;

        // ✅ NEW: Content generation (AI-generated flashcards/quizzes)
        case 'CONTENT_GENERATED':
            const itemsGenerated = data.generated || 1;
            updates.contentGenerated = increment(itemsGenerated);
            updates.xp = increment(itemsGenerated * 15); // 15 XP per generated item

            // Track specific content types
            if (data.type === 'flashcards') {
                updates.flashcardsGenerated = increment(itemsGenerated);
            } else if (data.type === 'quiz') {
                updates.quizzesGenerated = increment(itemsGenerated);
            }

            console.log(`✨ Content generated: ${itemsGenerated} items (+${itemsGenerated * 15} XP)`);
            break;

        case 'DAILY_CHECK_IN':
            const today = new Date().toISOString().split('T')[0];
            const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

            const userDoc = await getDoc(userRef);
            const userData = userDoc.data();
            const lastCheckIn = userData?.streakData?.lastCheckIn;
            const currentStreak = userData?.streakData?.currentStreak || 0;
            const activeDays = userData?.streakData?.activeDays || [];

            if (lastCheckIn?.startsWith(today)) {
                throw new Error('Already checked in today');
            }

            let newStreak = 1;
            if (lastCheckIn?.startsWith(yesterday)) {
                newStreak = currentStreak + 1;
            }

            updates['streakData.currentStreak'] = newStreak;
            updates['streakData.longestStreak'] = Math.max(
                newStreak,
                userData?.streakData?.longestStreak || 0
            );
            updates['streakData.lastCheckIn'] = new Date().toISOString();
            updates['streakData.activeDays'] = arrayUnion(today);
            updates.xp = increment(10);
            break;

        // ✅ NEW: Additional useful action types
        case 'DOCUMENT_VIEWED':
            updates.documentsViewed = increment(1);
            updates.xp = increment(2); // Small XP for viewing
            break;

        case 'STUDY_SESSION_COMPLETED':
            updates.studySessionsCompleted = increment(1);
            updates.xp = increment(data.duration ? Math.floor(data.duration / 60) : 20);
            break;

        case 'ASSIGNMENT_SUBMITTED':
            updates.assignmentsSubmitted = increment(1);
            updates.xp = increment(30);
            break;

        case 'ROOM_CREATED':
            updates.roomsCreated = increment(1);
            updates.xp = increment(40);
            break;

        case 'ROOM_JOINED':
            updates.roomsJoined = increment(1);
            updates.xp = increment(10);
            break;

        case 'NOTE_CREATED':
            updates.notesCreated = increment(1);
            updates.xp = increment(5);
            break;

        case 'STREAK_MILESTONE':
            // Called when hitting streak milestones (7, 14, 30 days)
            const days = data.days || 0;
            const bonusXP = days >= 30 ? 100 : days >= 14 ? 50 : days >= 7 ? 25 : 0;
            updates.xp = increment(bonusXP);

            if (bonusXP > 0) {
                toast.success(`🔥 ${days}-Day Streak! +${bonusXP} XP`, {
                    duration: 3000,
                    icon: '🔥'
                });
            }
            break;

        default:
            console.warn(`⚠️ Unknown action type: "${actionType}"`);
            return;
    }

    try {
        await updateDoc(userRef, updates);
        console.log(`✅ Action tracked: ${actionType}`, updates);

        // Check for new achievements
        await checkAndUnlockAchievements(userId);
    } catch (error) {
        console.error(`❌ Error tracking action "${actionType}":`, error);

        // Don't throw - gamification should be non-blocking
        if (error.code === 'not-found') {
            console.error('User gamification document not found. Creating...');
            await initializeUserAchievements(userId);
            // Retry once
            await updateDoc(userRef, updates);
        }
    }
};

/**
 * Check and unlock achievements
 */
export const checkAndUnlockAchievements = async (userId) => {
    if (!userId) return;

    try {
        const userRef = doc(db, 'gamification', userId);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
            console.warn('⚠️ User gamification document not found');
            return;
        }

        const userData = userDoc.data();
        const unlockedBadges = userData.unlockedBadges || [];
        const unlockedTitles = userData.unlockedTitles || [];

        let newlyUnlocked = [];
        let xpBonus = 0;

        // Check badges
        for (const [key, badge] of Object.entries(BADGE_DEFINITIONS)) {
            if (!unlockedBadges.includes(badge.id)) {
                try {
                    if (badge.condition(userData)) {
                        unlockedBadges.push(badge.id);
                        newlyUnlocked.push({ type: 'badge', ...badge });
                        xpBonus += badge.xpReward || 0;

                        console.log('🏆 Badge unlocked:', badge.name);
                    }
                } catch (error) {
                    console.warn(`⚠️ Error checking badge "${badge.id}":`, error);
                }
            }
        }

        // Check titles
        for (const [key, title] of Object.entries(TITLE_DEFINITIONS)) {
            if (!unlockedTitles.includes(title.id)) {
                try {
                    if (title.condition({ ...userData, badgesUnlocked: unlockedBadges.length })) {
                        unlockedTitles.push(title.id);
                        newlyUnlocked.push({ type: 'title', ...title });

                        console.log('👑 Title unlocked:', title.text);
                    }
                } catch (error) {
                    console.warn(`⚠️ Error checking title "${title.id}":`, error);
                }
            }
        }

        // Update if new achievements
        if (newlyUnlocked.length > 0) {
            await updateDoc(userRef, {
                unlockedBadges,
                unlockedTitles,
                xp: increment(xpBonus),
                badgesUnlocked: unlockedBadges.length,
                updatedAt: serverTimestamp()
            });

            // Show notifications
            newlyUnlocked.forEach((achievement) => {
                if (achievement.type === 'badge') {
                    confetti({
                        particleCount: 100,
                        spread: 70,
                        origin: { y: 0.6 },
                        colors: ['#3b82f6', '#8b5cf6', '#ec4899']
                    });
                    toast.success(`🏆 Badge Unlocked: ${achievement.name}!`, {
                        duration: 4000
                    });
                } else {
                    toast.success(`👑 Title Unlocked: ${achievement.text}!`, {
                        duration: 4000
                    });
                }
            });
        }
    } catch (error) {
        console.error('❌ Error checking achievements:', error);
    }
};

/**
 * Initialize user achievements (first time)
 */
export const initializeUserAchievements = async (userId) => {
    if (!userId) {
        throw new Error('User ID is required');
    }

    try {
        const gamificationRef = doc(db, 'gamification', userId);
        const userRef = doc(db, 'users', userId);

        // 1. Check for existing data in USERS collection (legacy)
        let legacyData = {};
        try {
            const userSnapshot = await getDoc(userRef);
            if (userSnapshot.exists()) {
                const userData = userSnapshot.data();
                console.log('📦 Found legacy user data, migrating...', userData?.streakData);

                legacyData = {
                    xp: userData.xp || 0,
                    level: userData.level || 1,
                    streakData: userData.streakData || null,
                    unlockedBadges: userData.unlockedBadges || [],
                    unlockedTitles: userData.unlockedTitles || ['title_newbie'],
                    equippedTitle: userData.equippedTitle || 'Newbie Scholar',
                    equippedTitleId: userData.equippedTitleId || 'title_newbie',

                    // Stats migration (if they exist)
                    totalStudyTime: userData.totalStudyTime || 0,
                    quizzesCompleted: userData.quizzesCompleted || 0,
                    documentsUploaded: userData.documentsUploaded || 0,
                };
            }
        } catch (e) {
            console.warn('⚠️ Could not fetch legacy user data:', e);
        }

        // 2. Create new gamification document with merged data
        // Use setDoc instead of updateDoc to create if not exists
        const { setDoc } = await import('firebase/firestore');

        await setDoc(gamificationRef, {
            // Achievements
            unlockedBadges: legacyData.unlockedBadges || [],
            unlockedTitles: legacyData.unlockedTitles || ['title_newbie'],
            equippedTitle: legacyData.equippedTitle || 'Newbie Scholar',
            equippedTitleId: legacyData.equippedTitleId || 'title_newbie',
            badgesUnlocked: (legacyData.unlockedBadges || []).length,

            // Stats
            totalStudyTime: legacyData.totalStudyTime || 0,
            quizzesCompleted: legacyData.quizzesCompleted || 0,
            perfectQuizzes: 0,
            flashcardsReviewed: 0,
            flashcardsMastered: 0,
            documentsUploaded: legacyData.documentsUploaded || 0,
            documentsViewed: 0,
            classesJoined: 0,

            // ✅ NEW: Content generation stats
            contentGenerated: 0,
            flashcardsGenerated: 0,
            quizzesGenerated: 0,

            // Additional stats
            studySessionsCompleted: 0,
            assignmentsSubmitted: 0,
            roomsCreated: 0,
            roomsJoined: 0,
            notesCreated: 0,

            // Streak data (Preserve legacy streak!)
            streakData: legacyData.streakData || {
                currentStreak: 0,
                longestStreak: 0,
                lastCheckIn: null,
                activeDays: []
            },

            // XP and Level
            xp: legacyData.xp || 0,
            level: legacyData.level || 1,

            // Timestamps
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        }, { merge: true }); // Merge true to be safe

        console.log('✅ User achievements initialized (with migration):', userId);
    } catch (error) {
        console.error('❌ Error initializing achievements:', error);
        throw error;
    }
};

/**
 * Get user achievements summary
 */
export const getUserAchievements = async (userId) => {
    if (!userId) return null;

    try {
        const userRef = doc(db, 'gamification', userId);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
            return null;
        }

        return {
            id: userDoc.id,
            ...userDoc.data()
        };
    } catch (error) {
        console.error('❌ Error getting achievements:', error);
        return null;
    }
};

/**
 * Award XP directly (for special events/admin)
 */
export const awardXP = async (userId, amount, reason = 'Special reward') => {
    if (!userId || !amount || amount <= 0) return;

    try {
        const userRef = doc(db, 'gamification', userId);
        await updateDoc(userRef, {
            xp: increment(amount),
            updatedAt: serverTimestamp()
        });

        toast.success(`✨ +${amount} XP: ${reason}`, {
            duration: 3000
        });

        console.log(`✨ Awarded ${amount} XP to ${userId}: ${reason}`);

        // Check for level up
        await checkAndUnlockAchievements(userId);
    } catch (error) {
        console.error('❌ Error awarding XP:', error);
    }
};

// ==================== 📦 EXPORTS ====================

export default {
    trackAction,
    checkAndUnlockAchievements,
    initializeUserAchievements,
    getUserAchievements,
    awardXP
};
