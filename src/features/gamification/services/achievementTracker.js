// src/features/gamification/services/achievementTracker.js
import { doc, updateDoc, increment, arrayUnion, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../../../shared/config/firebase';
import { BADGE_DEFINITIONS, TITLE_DEFINITIONS } from '../config/achievements';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';

/**
 * Track user action and update stats
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

        default:
            console.warn('Unknown action type:', actionType);
            return;
    }

    try {
        await updateDoc(userRef, updates);
        console.log('✅ Action tracked:', actionType);

        // Check for new achievements
        await checkAndUnlockAchievements(userId);
    } catch (error) {
        console.error('❌ Error tracking action:', error);
    }
};

/**
 * Check and unlock achievements
 */
export const checkAndUnlockAchievements = async (userId) => {
    if (!userId) return;

    const userRef = doc(db, 'gamification', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) return;

    const userData = userDoc.data();
    const unlockedBadges = userData.unlockedBadges || [];
    const unlockedTitles = userData.unlockedTitles || [];

    let newlyUnlocked = [];
    let xpBonus = 0;

    // Check badges
    for (const [key, badge] of Object.entries(BADGE_DEFINITIONS)) {
        if (!unlockedBadges.includes(badge.id)) {
            if (badge.condition(userData)) {
                unlockedBadges.push(badge.id);
                newlyUnlocked.push({ type: 'badge', ...badge });
                xpBonus += badge.xpReward;

                console.log('🏆 Badge unlocked:', badge.name);
            }
        }
    }

    // Check titles
    for (const [key, title] of Object.entries(TITLE_DEFINITIONS)) {
        if (!unlockedTitles.includes(title.id)) {
            if (title.condition({ ...userData, badgesUnlocked: unlockedBadges.length })) {
                unlockedTitles.push(title.id);
                newlyUnlocked.push({ type: 'title', ...title });

                console.log('👑 Title unlocked:', title.text);
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
};

/**
 * Initialize user achievements (first time)
 */
export const initializeUserAchievements = async (userId) => {
    const userRef = doc(db, 'gamification', userId);

    await updateDoc(userRef, {
        unlockedBadges: ['streak_3'], // Example: give first badge
        unlockedTitles: ['title_newbie'],
        badgesUnlocked: 0,
        totalStudyTime: 0,
        quizzesCompleted: 0,
        perfectQuizzes: 0,
        flashcardsReviewed: 0,
        flashcardsMastered: 0,
        documentsUploaded: 0,
        classesJoined: 0,
        updatedAt: serverTimestamp()
    });
};

export default {
    trackAction,
    checkAndUnlockAchievements,
    initializeUserAchievements
};
