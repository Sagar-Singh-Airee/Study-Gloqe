// REAL-TIME GAMIFICATION SERVICE
import { 
    doc, 
    updateDoc, 
    increment, 
    setDoc, 
    getDoc,
    serverTimestamp 
} from 'firebase/firestore';
import { db } from '@config/firebase';

// XP Rewards Configuration
const XP_REWARDS = {
    COMPLETE_QUIZ: 20,
    CORRECT_ANSWER: 10,
    UPLOAD_PDF: 15,
    CREATE_NOTE: 5,
    DAILY_LOGIN: 5,
    STUDY_SESSION_30MIN: 25,
    JOIN_ROOM: 10,
    CREATE_FLASHCARD: 8,
    COMPLETE_MISSION: 50,
    STREAK_BONUS: 10
};

// Initialize user gamification data
export const initializeGamification = async (userId) => {
    const gamificationRef = doc(db, 'gamification', userId);
    const userRef = doc(db, 'users', userId);

    // Initialize missions
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

    await setDoc(gamificationRef, {
        missions: [...dailyMissions, ...weeklyMissions],
        achievements: [],
        lastLoginDate: new Date().toDateString(),
        createdAt: serverTimestamp()
    }, { merge: true });

    await setDoc(userRef, {
        xp: 0,
        level: 1,
        streak: 0,
        totalQuizzes: 0,
        totalStudyTime: 0,
        levelUp: false
    }, { merge: true });
};

// Award XP and check for level up
export const awardXP = async (userId, xpAmount, reason) => {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.data();

    const currentXP = userData?.xp || 0;
    const currentLevel = userData?.level || 1;
    const newXP = currentXP + xpAmount;
    const xpForNextLevel = currentLevel * 100;

    let levelUp = false;
    let newLevel = currentLevel;

    // Check for level up
    if (newXP >= xpForNextLevel) {
        newLevel = currentLevel + 1;
        levelUp = true;
    }

    await updateDoc(userRef, {
        xp: newXP,
        level: newLevel,
        levelUp: levelUp,
        lastXPReason: reason,
        lastXPAmount: xpAmount,
        lastXPTime: serverTimestamp()
    });

    // Reset levelUp after 3 seconds
    if (levelUp) {
        setTimeout(async () => {
            await updateDoc(userRef, { levelUp: false });
        }, 3000);
    }

    return { newXP, newLevel, levelUp };
};

// Update mission progress
export const updateMission = async (userId, missionId, incrementBy = 1) => {
    const gamificationRef = doc(db, 'gamification', userId);
    const gamificationSnap = await getDoc(gamificationRef);
    const data = gamificationSnap.data();

    const missions = data?.missions || [];
    const missionIndex = missions.findIndex(m => m.id === missionId);

    if (missionIndex !== -1) {
        const mission = missions[missionIndex];
        const newCurrent = Math.min(mission.current + incrementBy, mission.target);
        missions[missionIndex].current = newCurrent;

        // Check if mission just completed
        if (newCurrent === mission.target && mission.current !== mission.target) {
            await awardXP(userId, mission.xpReward, `Completed: ${mission.title}`);
        }

        await updateDoc(gamificationRef, { missions });
    }
};

// Update daily streak
export const updateStreak = async (userId) => {
    const userRef = doc(db, 'users', userId);
    const gamificationRef = doc(db, 'gamification', userId);
    
    const userSnap = await getDoc(userRef);
    const gamificationSnap = await getDoc(gamificationRef);
    
    const userData = userSnap.data();
    const gamificationData = gamificationSnap.data();

    const today = new Date().toDateString();
    const lastLogin = gamificationData?.lastLoginDate;

    if (lastLogin !== today) {
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        const isConsecutive = lastLogin === yesterday;

        const newStreak = isConsecutive ? (userData?.streak || 0) + 1 : 1;

        await updateDoc(userRef, { streak: newStreak });
        await updateDoc(gamificationRef, { lastLoginDate: today });

        // Award streak bonus
        if (newStreak > 0) {
            await awardXP(userId, XP_REWARDS.STREAK_BONUS * newStreak, `${newStreak}-day streak!`);
        }
    }
};

// Reset daily missions (call via Cloud Function at midnight)
export const resetDailyMissions = async (userId) => {
    const gamificationRef = doc(db, 'gamification', userId);
    const gamificationSnap = await getDoc(gamificationRef);
    const data = gamificationSnap.data();

    const missions = data?.missions || [];
    const updatedMissions = missions.map(mission => {
        if (mission.type === 'daily') {
            return { ...mission, current: 0, expiresAt: getEndOfDay() };
        }
        return mission;
    });

    await updateDoc(gamificationRef, { missions: updatedMissions });
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

export { XP_REWARDS };
