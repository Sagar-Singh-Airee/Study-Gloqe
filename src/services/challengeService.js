// src/services/challengeService.js - Daily Challenges System
import {
    doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs,
    serverTimestamp, increment, arrayUnion
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { awardXP } from './gamificationService';
import toast from 'react-hot-toast';

// Challenge definitions
const DAILY_CHALLENGES = {
    // Easy challenges (50 XP)
    complete_quiz: {
        id: 'complete_quiz',
        title: 'Quiz Master',
        description: 'Complete any quiz',
        difficulty: 'easy',
        xpReward: 50,
        icon: 'Brain',
        target: 1,
        type: 'quiz_completed'
    },
    study_15min: {
        id: 'study_15min',
        title: 'Quick Study',
        description: 'Study for 15 minutes',
        difficulty: 'easy',
        xpReward: 50,
        icon: 'Clock',
        target: 15,
        type: 'study_minutes'
    },
    view_flashcards: {
        id: 'view_flashcards',
        title: 'Memory Boost',
        description: 'Review 10 flashcards',
        difficulty: 'easy',
        xpReward: 50,
        icon: 'Layers',
        target: 10,
        type: 'flashcards_reviewed'
    },

    // Medium challenges (100 XP)
    complete_2_quizzes: {
        id: 'complete_2_quizzes',
        title: 'Double Trouble',
        description: 'Complete 2 quizzes',
        difficulty: 'medium',
        xpReward: 100,
        icon: 'Target',
        target: 2,
        type: 'quiz_completed'
    },
    study_30min: {
        id: 'study_30min',
        title: 'Focused Learner',
        description: 'Study for 30 minutes',
        difficulty: 'medium',
        xpReward: 100,
        icon: 'Timer',
        target: 30,
        type: 'study_minutes'
    },
    pomodoro_session: {
        id: 'pomodoro_session',
        title: 'Deep Focus',
        description: 'Complete 2 Pomodoro sessions',
        difficulty: 'medium',
        xpReward: 100,
        icon: 'Zap',
        target: 2,
        type: 'pomodoro_completed'
    },
    score_80_quiz: {
        id: 'score_80_quiz',
        title: 'High Achiever',
        description: 'Score 80%+ on a quiz',
        difficulty: 'medium',
        xpReward: 100,
        icon: 'Award',
        target: 80,
        type: 'quiz_score'
    },

    // Hard challenges (200 XP)
    perfect_quiz: {
        id: 'perfect_quiz',
        title: 'Perfectionist',
        description: 'Score 100% on a quiz',
        difficulty: 'hard',
        xpReward: 200,
        icon: 'Trophy',
        target: 100,
        type: 'quiz_score'
    },
    study_60min: {
        id: 'study_60min',
        title: 'Marathon Scholar',
        description: 'Study for 60 minutes',
        difficulty: 'hard',
        xpReward: 200,
        icon: 'Flame',
        target: 60,
        type: 'study_minutes'
    },
    complete_4_quizzes: {
        id: 'complete_4_quizzes',
        title: 'Quiz Champion',
        description: 'Complete 4 quizzes',
        difficulty: 'hard',
        xpReward: 200,
        icon: 'Crown',
        target: 4,
        type: 'quiz_completed'
    }
};

// Get today's date string
const getTodayString = () => new Date().toISOString().split('T')[0];

// Generate daily challenges for a user
export const generateDailyChallenges = async (userId) => {
    if (!userId) return [];

    const today = getTodayString();
    const userChallengesRef = doc(db, 'users', userId, 'dailyChallenges', today);

    try {
        const existingDoc = await getDoc(userChallengesRef);

        if (existingDoc.exists()) {
            return existingDoc.data().challenges;
        }

        // Generate new challenges: 1 easy, 1 medium, 1 hard
        const easyKeys = Object.keys(DAILY_CHALLENGES).filter(k => DAILY_CHALLENGES[k].difficulty === 'easy');
        const mediumKeys = Object.keys(DAILY_CHALLENGES).filter(k => DAILY_CHALLENGES[k].difficulty === 'medium');
        const hardKeys = Object.keys(DAILY_CHALLENGES).filter(k => DAILY_CHALLENGES[k].difficulty === 'hard');

        const randomPick = (arr) => arr[Math.floor(Math.random() * arr.length)];

        const selectedChallenges = [
            { ...DAILY_CHALLENGES[randomPick(easyKeys)], progress: 0, completed: false },
            { ...DAILY_CHALLENGES[randomPick(mediumKeys)], progress: 0, completed: false },
            { ...DAILY_CHALLENGES[randomPick(hardKeys)], progress: 0, completed: false }
        ];

        await setDoc(userChallengesRef, {
            challenges: selectedChallenges,
            date: today,
            createdAt: serverTimestamp(),
            allCompleted: false,
            streakBonus: false
        });

        return selectedChallenges;
    } catch (error) {
        console.error('Error generating daily challenges:', error);
        return [];
    }
};

// Get user's daily challenges
export const getDailyChallenges = async (userId) => {
    if (!userId) return { challenges: [], allCompleted: false };

    const today = getTodayString();
    const userChallengesRef = doc(db, 'users', userId, 'dailyChallenges', today);

    try {
        const docSnap = await getDoc(userChallengesRef);

        if (!docSnap.exists()) {
            const challenges = await generateDailyChallenges(userId);
            return { challenges, allCompleted: false };
        }

        const data = docSnap.data();
        return {
            challenges: data.challenges || [],
            allCompleted: data.allCompleted || false,
            streakBonus: data.streakBonus || false
        };
    } catch (error) {
        console.error('Error getting daily challenges:', error);
        return { challenges: [], allCompleted: false };
    }
};

// Update challenge progress
export const updateChallengeProgress = async (userId, challengeType, amount = 1) => {
    if (!userId) return;

    const today = getTodayString();
    const userChallengesRef = doc(db, 'users', userId, 'dailyChallenges', today);

    try {
        const docSnap = await getDoc(userChallengesRef);
        if (!docSnap.exists()) {
            await generateDailyChallenges(userId);
            return;
        }

        const data = docSnap.data();
        let challenges = [...data.challenges];
        let updated = false;
        let completedChallenge = null;

        challenges = challenges.map(challenge => {
            if (challenge.type === challengeType && !challenge.completed) {
                const newProgress = Math.min(challenge.progress + amount, challenge.target);
                const isNowCompleted = newProgress >= challenge.target;

                if (isNowCompleted && !challenge.completed) {
                    completedChallenge = { ...challenge, progress: newProgress, completed: true };
                    updated = true;
                    return completedChallenge;
                } else if (newProgress !== challenge.progress) {
                    updated = true;
                    return { ...challenge, progress: newProgress };
                }
            }
            return challenge;
        });

        if (updated) {
            const allCompleted = challenges.every(c => c.completed);
            await updateDoc(userChallengesRef, {
                challenges,
                allCompleted
            });

            // Award XP for completed challenge
            if (completedChallenge) {
                await awardXP(userId, completedChallenge.xpReward, `Daily Challenge: ${completedChallenge.title}`);
                toast.success(`Challenge Complete! +${completedChallenge.xpReward} XP 🎯`, {
                    icon: '🏆',
                    duration: 4000,
                    style: { background: '#000', color: '#fff' }
                });

                // Check if all challenges completed for bonus
                if (allCompleted && !data.allCompleted) {
                    await awardXP(userId, 100, 'All Daily Challenges Completed Bonus');
                    toast.success('All challenges complete! +100 XP Bonus! 🌟', {
                        icon: '🎉',
                        duration: 5000,
                        style: { background: '#FFD700', color: '#000' }
                    });
                }
            }
        }
    } catch (error) {
        console.error('Error updating challenge progress:', error);
    }
};

// Get challenge streak
export const getChallengeStreak = async (userId) => {
    if (!userId) return 0;

    try {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            return userSnap.data().challengeStreak || 0;
        }
        return 0;
    } catch (error) {
        console.error('Error getting challenge streak:', error);
        return 0;
    }
};

// Export challenge definitions for UI
export { DAILY_CHALLENGES };
