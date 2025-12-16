// src/services/challengeService.js - ✅ FIXED Daily Challenges System
import {
    doc, getDoc, setDoc, updateDoc, serverTimestamp, runTransaction
} from 'firebase/firestore';
import { db } from '@shared/config/firebase';
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

// ✅ FIXED: Get today's date string in UTC to avoid timezone issues
const getTodayString = () => {
    const now = new Date();
    const utcDate = new Date(now.getTime() + now.getTimezoneOffset() * 60000);
    return utcDate.toISOString().split('T')[0];
};

// Generate daily challenges for a user
export const generateDailyChallenges = async (userId) => {
    if (!userId) return [];

    const today = getTodayString();
    const userChallengesRef = doc(db, 'users', userId, 'dailyChallenges', today);

    try {
        const existingDoc = await getDoc(userChallengesRef);

        if (existingDoc.exists()) {
            console.log('✅ Challenges already exist for today');
            return existingDoc.data().challenges;
        }

        // Generate new challenges: 1 easy, 1 medium, 1 hard
        const easyKeys = Object.keys(DAILY_CHALLENGES).filter(k => DAILY_CHALLENGES[k].difficulty === 'easy');
        const mediumKeys = Object.keys(DAILY_CHALLENGES).filter(k => DAILY_CHALLENGES[k].difficulty === 'medium');
        const hardKeys = Object.keys(DAILY_CHALLENGES).filter(k => DAILY_CHALLENGES[k].difficulty === 'hard');

        const randomPick = (arr) => arr[Math.floor(Math.random() * arr.length)];

        const selectedChallenges = [
            { ...DAILY_CHALLENGES[randomPick(easyKeys)], progress: 0, completed: false, completedAt: null },
            { ...DAILY_CHALLENGES[randomPick(mediumKeys)], progress: 0, completed: false, completedAt: null },
            { ...DAILY_CHALLENGES[randomPick(hardKeys)], progress: 0, completed: false, completedAt: null }
        ];

        await setDoc(userChallengesRef, {
            challenges: selectedChallenges,
            date: today,
            createdAt: serverTimestamp(),
            allCompleted: false,
            allCompletedAt: null,
            streakBonus: false
        });

        console.log('✅ Generated new challenges for', today);
        return selectedChallenges;
    } catch (error) {
        console.error('❌ Error generating daily challenges:', error);
        return [];
    }
};

// Get user's daily challenges
export const getDailyChallenges = async (userId) => {
    if (!userId) return { challenges: [], allCompleted: false, date: null };

    const today = getTodayString();
    const userChallengesRef = doc(db, 'users', userId, 'dailyChallenges', today);

    try {
        const docSnap = await getDoc(userChallengesRef);

        if (!docSnap.exists()) {
            console.log('⚠️ No challenges found, generating new ones');
            const challenges = await generateDailyChallenges(userId);
            return { challenges, allCompleted: false, date: today };
        }

        const data = docSnap.data();
        return {
            challenges: data.challenges || [],
            allCompleted: data.allCompleted || false,
            allCompletedAt: data.allCompletedAt || null,
            streakBonus: data.streakBonus || false,
            date: data.date
        };
    } catch (error) {
        console.error('❌ Error getting daily challenges:', error);
        return { challenges: [], allCompleted: false, date: null };
    }
};

// ✅ FIXED: Update challenge progress with proper quiz score logic and transactions
export const updateChallengeProgress = async (userId, challengeType, amount = 1) => {
    if (!userId) {
        console.warn('⚠️ No userId provided to updateChallengeProgress');
        return;
    }

    const today = getTodayString();
    const userChallengesRef = doc(db, 'users', userId, 'dailyChallenges', today);
    const userRef = doc(db, 'users', userId);

    try {
        // ✅ Use transaction to prevent race conditions
        await runTransaction(db, async (transaction) => {
            const docSnap = await transaction.get(userChallengesRef);
            
            if (!docSnap.exists()) {
                console.log('⚠️ No challenges exist, generating...');
                await generateDailyChallenges(userId);
                return;
            }

            const data = docSnap.data();
            let challenges = [...data.challenges];
            let updated = false;
            let completedChallenge = null;

            challenges = challenges.map(challenge => {
                if (challenge.type === challengeType && !challenge.completed) {
                    let newProgress;
                    let isNowCompleted;

                    // ✅ FIXED: Different logic for quiz scores vs counts/times
                    if (challenge.type === 'quiz_score') {
                        // For quiz scores, check if current score meets target
                        newProgress = Math.max(challenge.progress || 0, amount);
                        isNowCompleted = amount >= challenge.target;
                        
                        console.log(`📊 Quiz Score Challenge: ${amount}% (target: ${challenge.target}%)`);
                    } else {
                        // For counts/times, increment progress
                        newProgress = Math.min(challenge.progress + amount, challenge.target);
                        isNowCompleted = newProgress >= challenge.target;
                        
                        console.log(`📈 Challenge Progress: ${newProgress}/${challenge.target}`);
                    }

                    if (isNowCompleted && !challenge.completed) {
                        completedChallenge = { 
                            ...challenge, 
                            progress: newProgress, 
                            completed: true,
                            completedAt: new Date().toISOString()
                        };
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
                const wasAllCompleted = data.allCompleted;

                transaction.update(userChallengesRef, {
                    challenges,
                    allCompleted,
                    ...(allCompleted && !wasAllCompleted && {
                        allCompletedAt: serverTimestamp()
                    })
                });

                // ✅ Award XP for completed challenge
                if (completedChallenge) {
                    await awardXP(userId, completedChallenge.xpReward, `Daily Challenge: ${completedChallenge.title}`);
                    
                    toast.success(`Challenge Complete! +${completedChallenge.xpReward} XP 🎯`, {
                        icon: '🏆',
                        duration: 4000,
                        style: { 
                            background: 'linear-gradient(135deg, #000 0%, #1a1a1a 100%)',
                            color: '#fff',
                            fontWeight: 'bold'
                        }
                    });

                    // ✅ FIXED: Check if all challenges completed for bonus + streak
                    if (allCompleted && !wasAllCompleted) {
                        // Award completion bonus
                        await awardXP(userId, 100, 'All Daily Challenges Completed Bonus');
                        
                        // ✅ Update streak
                        const userSnap = await transaction.get(userRef);
                        const currentStreak = userSnap.exists() ? (userSnap.data().challengeStreak || 0) : 0;
                        const newStreak = currentStreak + 1;
                        
                        transaction.update(userRef, {
                            challengeStreak: newStreak,
                            lastChallengeDate: today,
                            totalChallengesCompleted: (userSnap.data()?.totalChallengesCompleted || 0) + 1
                        });

                        toast.success(`All challenges complete! +100 XP Bonus! 🔥 ${newStreak} Day Streak!`, {
                            icon: '🎉',
                            duration: 6000,
                            style: { 
                                background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                                color: '#000',
                                fontWeight: 'bold',
                                fontSize: '16px'
                            }
                        });

                        console.log(`✅ All challenges completed! Streak: ${newStreak} days`);
                    }
                }
            }
        });
    } catch (error) {
        console.error('❌ Error updating challenge progress:', error);
        toast.error('Failed to update challenge progress');
    }
};

// ✅ FIXED: Get challenge streak with proper reset logic
export const getChallengeStreak = async (userId) => {
    if (!userId) return 0;

    try {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            return 0;
        }

        const userData = userSnap.data();
        const lastChallengeDate = userData.lastChallengeDate;
        const currentStreak = userData.challengeStreak || 0;

        // ✅ Check if streak should be reset
        if (!lastChallengeDate) {
            return 0;
        }

        const today = getTodayString();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayString = yesterday.toISOString().split('T')[0];

        // Streak is valid if last completion was today or yesterday
        if (lastChallengeDate === today || lastChallengeDate === yesterdayString) {
            return currentStreak;
        }

        // ✅ Streak broken - reset to 0
        await updateDoc(userRef, {
            challengeStreak: 0
        });

        console.log('⚠️ Challenge streak reset due to inactivity');
        return 0;
    } catch (error) {
        console.error('❌ Error getting challenge streak:', error);
        return 0;
    }
};

// ✅ NEW: Check and reset streak if needed (call on app load)
export const checkStreakStatus = async (userId) => {
    if (!userId) return;

    try {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) return;

        const userData = userSnap.data();
        const lastChallengeDate = userData.lastChallengeDate;
        
        if (!lastChallengeDate) return;

        const today = getTodayString();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayString = yesterday.toISOString().split('T')[0];

        // Reset streak if last completion was more than 1 day ago
        if (lastChallengeDate !== today && lastChallengeDate !== yesterdayString) {
            await updateDoc(userRef, {
                challengeStreak: 0
            });
            console.log('🔄 Streak reset due to missed day');
        }
    } catch (error) {
        console.error('❌ Error checking streak status:', error);
    }
};

// Export challenge definitions for UI
export { DAILY_CHALLENGES };
