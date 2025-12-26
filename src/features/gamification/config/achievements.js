// src/features/gamification/config/achievements.js
export const BADGE_DEFINITIONS = {
    // 🔥 Study Streak Badges
    STREAK_3: {
        id: 'streak_3',
        name: 'Getting Started',
        description: 'Study for 3 days in a row',
        iconName: 'Flame',
        type: 'streak',
        condition: (userData) => (userData.streakData?.currentStreak || userData.streak || 0) >= 3,
        xpReward: 50
    },
    STREAK_7: {
        id: 'streak_7',
        name: 'Week Warrior',
        description: 'Maintain a 7-day study streak',
        iconName: 'Flame',
        type: 'streak',
        condition: (userData) => (userData.streakData?.currentStreak || userData.streak || 0) >= 7,
        xpReward: 100
    },
    STREAK_30: {
        id: 'streak_30',
        name: 'Unstoppable',
        description: 'Study for 30 days straight',
        iconName: 'Flame',
        type: 'streak',
        condition: (userData) => (userData.streakData?.currentStreak || userData.streak || 0) >= 30,
        xpReward: 500
    },

    // 📚 Study Time Badges
    STUDY_1HR: {
        id: 'study_1hr',
        name: 'First Hour',
        description: 'Study for 1 hour total',
        iconName: 'BookOpen',
        type: 'time',
        condition: (userData) => (userData.totalStudyTime || 0) >= 60, // Minutes
        xpReward: 50
    },
    STUDY_10HR: {
        id: 'study_10hr',
        name: 'Dedicated Learner',
        description: 'Study for 10 hours total',
        iconName: 'BookOpen',
        type: 'time',
        condition: (userData) => (userData.totalStudyTime || 0) >= 600,
        xpReward: 200
    },
    STUDY_50HR: {
        id: 'study_50hr',
        name: 'Study Master',
        description: 'Study for 50 hours total',
        iconName: 'BookOpen',
        type: 'time',
        condition: (userData) => (userData.totalStudyTime || 0) >= 3000,
        xpReward: 1000
    },

    // ❓ Quiz Badges
    QUIZ_FIRST: {
        id: 'quiz_first',
        name: 'Quiz Taker',
        description: 'Complete your first quiz',
        iconName: 'Target',
        type: 'quiz',
        condition: (userData) => (userData.quizzesCompleted || userData.totalQuizzes || 0) >= 1,
        xpReward: 25
    },
    QUIZ_10: {
        id: 'quiz_10',
        name: 'Quiz Champion',
        description: 'Complete 10 quizzes',
        iconName: 'Target',
        type: 'quiz',
        condition: (userData) => (userData.quizzesCompleted || userData.totalQuizzes || 0) >= 10,
        xpReward: 150
    },
    QUIZ_PERFECT: {
        id: 'quiz_perfect',
        name: 'Perfectionist',
        description: 'Score 100% on any quiz',
        iconName: 'Star',
        type: 'quiz',
        condition: (userData) => (userData.perfectQuizzes || 0) >= 1,
        xpReward: 100
    },

    // 🎴 Flashcard Badges
    FLASHCARD_50: {
        id: 'flashcard_50',
        name: 'Memory Builder',
        description: 'Review 50 flashcards',
        iconName: 'Zap',
        type: 'flashcard',
        condition: (userData) => (userData.flashcardsReviewed || 0) >= 50,
        xpReward: 75
    },
    FLASHCARD_MASTER: {
        id: 'flashcard_master',
        name: 'Master 20 Cards',
        description: 'Fully master 20 flashcards',
        iconName: 'Award',
        type: 'flashcard',
        condition: (userData) => (userData.flashcardsMastered || 0) >= 20,
        xpReward: 200
    },

    // 📄 Document Badges
    DOC_FIRST: {
        id: 'doc_first',
        name: 'First Upload',
        description: 'Upload your first document',
        iconName: 'BookOpen',
        type: 'document',
        condition: (userData) => (userData.documentsUploaded || userData.totalDocuments || 0) >= 1,
        xpReward: 25
    },
    DOC_10: {
        id: 'doc_10',
        name: 'Library Builder',
        description: 'Upload 10 documents',
        iconName: 'BookOpen',
        type: 'document',
        condition: (userData) => (userData.documentsUploaded || userData.totalDocuments || 0) >= 10,
        xpReward: 150
    },

    // 🏆 Level Badges
    LEVEL_5: {
        id: 'level_5',
        name: 'Leveling Up',
        description: 'Reach Level 5',
        iconName: 'Trophy',
        type: 'level',
        requiredLevel: 5,
        condition: (userData) => (userData.level || 1) >= 5,
        xpReward: 100
    },
    LEVEL_10: {
        id: 'level_10',
        name: 'Double Digits',
        description: 'Reach Level 10',
        iconName: 'Crown',
        type: 'level',
        requiredLevel: 10,
        condition: (userData) => (userData.level || 1) >= 10,
        xpReward: 300
    },
    LEVEL_25: {
        id: 'level_25',
        name: 'Elite Student',
        description: 'Reach Level 25',
        iconName: 'Medal',
        type: 'level',
        requiredLevel: 25,
        condition: (userData) => (userData.level || 1) >= 25,
        xpReward: 1000
    },

    // 👥 Social Badges
    CLASS_JOIN: {
        id: 'class_join',
        name: 'Classmate',
        description: 'Join your first class',
        iconName: 'UsersIcon',
        type: 'social',
        condition: (userData) => (userData.classesJoined || userData.totalRoomsJoined || 0) >= 1,
        xpReward: 50
    }
};

export const TITLE_DEFINITIONS = {
    NEWBIE: {
        id: 'title_newbie',
        text: 'Novice Learner',
        requiredLevel: 1,
        condition: () => true,
        rarity: 'common',
        color: 'text-gray-600'
    },
    APPRENTICE: {
        id: 'title_apprentice',
        text: 'Knowledge Apprentice',
        requiredLevel: 5,
        condition: (userData) => (userData.level || 1) >= 5,
        rarity: 'common',
        color: 'text-blue-600'
    },
    SCHOLAR: {
        id: 'title_scholar',
        text: 'Dedicated Scholar',
        requiredLevel: 10,
        condition: (userData) => (userData.level || 1) >= 10 && (userData.unlockedBadges?.length || 0) >= 5,
        rarity: 'rare',
        color: 'text-green-600'
    },
    MASTER: {
        id: 'title_master',
        text: 'Master Student',
        requiredLevel: 15,
        condition: (userData) => (userData.level || 1) >= 15 && (userData.unlockedBadges?.length || 0) >= 10,
        rarity: 'rare',
        color: 'text-indigo-600'
    },
    SAGE: {
        id: 'title_sage',
        text: 'Sage',
        requiredLevel: 20,
        condition: (userData) => (userData.level || 1) >= 20,
        rarity: 'epic',
        color: 'text-yellow-600'
    },
    LEGEND: {
        id: 'title_legend',
        text: 'Living Legend',
        requiredLevel: 25,
        condition: (userData) => (userData.level || 1) >= 25 && (userData.unlockedBadges?.length || 0) >= 20,
        rarity: 'legendary',
        color: 'text-gold-600'
    }
};
