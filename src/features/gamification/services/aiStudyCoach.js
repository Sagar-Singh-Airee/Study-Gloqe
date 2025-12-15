// src/services/aiStudyCoach.js - AI-Powered Study Coach
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@shared/config/firebase';

// Study tips based on patterns
const STUDY_TIPS = {
    lowStreak: [
        "Try to study at the same time each day to build a habit! 📅",
        "Start with just 10 minutes - consistency beats intensity! 💪",
        "Set a small daily goal to maintain your streak 🔥"
    ],
    highStreak: [
        "Amazing streak! You're building a powerful habit! 🌟",
        "Your consistency is paying off - keep it up! 🏆",
        "You're in the top tier of learners! 👑"
    ],
    lowQuizScore: [
        "Focus on weak areas - review flashcards on topics you struggle with 📚",
        "Try taking practice quizzes before timed ones 🎯",
        "Break complex topics into smaller chunks 🧩"
    ],
    highQuizScore: [
        "Excellent performance! Challenge yourself with harder content 🚀",
        "You're mastering this material - try teaching it to someone! 🎓",
        "Consider exploring advanced topics in this area 🔬"
    ],
    lowStudyTime: [
        "Even 15 minutes of focused study is valuable! ⏰",
        "Try the Pomodoro technique - 25 min work, 5 min break 🍅",
        "Schedule study time in your calendar like a meeting 📆"
    ],
    highStudyTime: [
        "Great dedication! Remember to take breaks to retain info 🧠",
        "Quality over quantity - make sure you're actively learning! 💡",
        "You're putting in the work - results will follow! 📈"
    ],
    morning: [
        "Good morning, scholar! Morning study sessions boost memory retention 🌅",
        "Your brain is fresh - tackle challenging topics now! ☀️"
    ],
    afternoon: [
        "Afternoon energy dip? Try a quick walk before studying 🚶",
        "Good time for practice problems and review! 📝"
    ],
    evening: [
        "Evening study tip: Review what you learned today 🌙",
        "Avoid new complex topics late at night - review is better! 💤"
    ],
    night: [
        "Late night studying? Keep it light - review only! 🌃",
        "Sleep is crucial for memory - don't sacrifice it! 😴"
    ]
};

// Motivational messages
const MOTIVATIONAL_MESSAGES = [
    "Every expert was once a beginner. Keep going! 🌱",
    "Your future self will thank you for studying today! 🙏",
    "Progress, not perfection! Every step counts! 👣",
    "You're capable of more than you know! 💪",
    "Believe in your abilities - you've got this! ⭐",
    "Small daily improvements lead to stunning results! 📈",
    "Your dedication today shapes your tomorrow! 🎯",
    "Learning is a superpower - and you're gaining it! 🦸"
];

// Get time of day
const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
};

// Get random item from array
const randomPick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// AI Study Coach Service
export const getStudyCoachInsights = async (userId) => {
    if (!userId) {
        return {
            greeting: randomPick(MOTIVATIONAL_MESSAGES),
            tips: [],
            recommendation: null
        };
    }

    try {
        // Fetch user stats
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            return {
                greeting: randomPick(MOTIVATIONAL_MESSAGES),
                tips: [randomPick(STUDY_TIPS[getTimeOfDay()])],
                recommendation: null
            };
        }

        const userData = userSnap.data();
        const stats = userData.stats || {};
        const tips = [];

        // Time-based greeting
        const timeOfDay = getTimeOfDay();
        tips.push(randomPick(STUDY_TIPS[timeOfDay]));

        // Streak-based tips
        const streak = stats.streak || 0;
        if (streak < 3) {
            tips.push(randomPick(STUDY_TIPS.lowStreak));
        } else if (streak >= 7) {
            tips.push(randomPick(STUDY_TIPS.highStreak));
        }

        // Quiz performance tips
        const avgQuizScore = stats.averageQuizScore || 0;
        if (avgQuizScore > 0 && avgQuizScore < 70) {
            tips.push(randomPick(STUDY_TIPS.lowQuizScore));
        } else if (avgQuizScore >= 90) {
            tips.push(randomPick(STUDY_TIPS.highQuizScore));
        }

        // Study time tips
        const totalStudyMinutes = stats.totalStudyMinutes || 0;
        const daysActive = stats.daysActive || 1;
        const avgDailyMinutes = totalStudyMinutes / daysActive;

        if (avgDailyMinutes < 15) {
            tips.push(randomPick(STUDY_TIPS.lowStudyTime));
        } else if (avgDailyMinutes > 120) {
            tips.push(randomPick(STUDY_TIPS.highStudyTime));
        }

        // Generate recommendation
        let recommendation = null;
        const weakAreas = userData.weakAreas || [];

        if (weakAreas.length > 0) {
            recommendation = {
                type: 'weak_area',
                title: `Review: ${weakAreas[0]}`,
                description: `Your recent quiz results suggest you could improve in ${weakAreas[0]}. Consider reviewing this topic!`,
                action: 'Start Review',
                priority: 'high'
            };
        } else if (streak === 0) {
            recommendation = {
                type: 'start_streak',
                title: 'Start Your Streak!',
                description: 'Complete one study session today to start building your streak.',
                action: 'Start Studying',
                priority: 'medium'
            };
        } else if (avgDailyMinutes < 30) {
            recommendation = {
                type: 'increase_time',
                title: 'Boost Your Study Time',
                description: 'Try adding just 10 more minutes to your daily study routine.',
                action: 'Start Session',
                priority: 'low'
            };
        }

        return {
            greeting: randomPick(MOTIVATIONAL_MESSAGES),
            tips: tips.slice(0, 3), // Max 3 tips
            recommendation,
            stats: {
                streak,
                avgQuizScore: Math.round(avgQuizScore),
                avgDailyMinutes: Math.round(avgDailyMinutes),
                level: userData.level || 1
            }
        };

    } catch (error) {
        console.error('Error getting study coach insights:', error);
        return {
            greeting: randomPick(MOTIVATIONAL_MESSAGES),
            tips: [randomPick(STUDY_TIPS[getTimeOfDay()])],
            recommendation: null
        };
    }
};

// Get weak areas from quiz history
export const analyzeWeakAreas = async (userId) => {
    if (!userId) return [];

    try {
        // This would analyze quiz sessions to find weak topics
        // For now, return empty - can be enhanced with actual quiz analysis
        return [];
    } catch (error) {
        console.error('Error analyzing weak areas:', error);
        return [];
    }
};

// Get optimal study time suggestion
export const getOptimalStudyTime = async (userId) => {
    // Analyze user's past successful study sessions
    // Return suggested time slots
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 9) {
        return {
            suggestion: 'Now is a great time! Morning study boosts retention.',
            quality: 'excellent'
        };
    } else if (hour >= 9 && hour < 12) {
        return {
            suggestion: 'Good time for challenging topics!',
            quality: 'good'
        };
    } else if (hour >= 14 && hour < 17) {
        return {
            suggestion: 'Afternoon - good for practice and review.',
            quality: 'good'
        };
    } else if (hour >= 19 && hour < 22) {
        return {
            suggestion: 'Evening review session recommended.',
            quality: 'moderate'
        };
    } else {
        return {
            suggestion: 'Consider studying earlier for best results.',
            quality: 'low'
        };
    }
};
