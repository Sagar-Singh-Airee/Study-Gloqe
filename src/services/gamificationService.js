import {
  doc,
  getDoc,
  updateDoc,
  increment,
  arrayUnion,
  serverTimestamp
} from 'firebase/firestore';
import { db, COLLECTIONS } from '@config/firebase';

/**
 * Award XP to a user
 */
export const awardXP = async (userId, points, reason) => {
  try {
    const gamificationRef = doc(db, COLLECTIONS.GAMIFICATION, userId);
    const gamificationSnap = await getDoc(gamificationRef);

    if (!gamificationSnap.exists()) {
      throw new Error('Gamification profile not found');
    }

    const currentData = gamificationSnap.data();
    const newXP = (currentData.xp || 0) + points;
    const newLevel = Math.floor(newXP / 100) + 1; // 100 XP per level

    await updateDoc(gamificationRef, {
      xp: newXP,
      level: newLevel,
      history: arrayUnion({
        points,
        reason,
        timestamp: new Date().toISOString()
      })
    });

    // Also update user document
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    await updateDoc(userRef, {
      xp: newXP,
      level: newLevel
    });

    return { newXP, newLevel, pointsAwarded: points };
  } catch (error) {
    console.error('Error awarding XP:', error);
    throw error;
  }
};

/**
 * Award a badge to a user
 */
export const awardBadge = async (userId, badge) => {
  try {
    const gamificationRef = doc(db, COLLECTIONS.GAMIFICATION, userId);
    
    await updateDoc(gamificationRef, {
      badges: arrayUnion({
        id: badge.id,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        earnedAt: serverTimestamp()
      })
    });

    return true;
  } catch (error) {
    console.error('Error awarding badge:', error);
    throw error;
  }
};

/**
 * Get user's gamification data
 */
export const getUserGamification = async (userId) => {
  try {
    const gamificationRef = doc(db, COLLECTIONS.GAMIFICATION, userId);
    const gamificationSnap = await getDoc(gamificationRef);

    if (!gamificationSnap.exists()) {
      return {
        xp: 0,
        level: 1,
        badges: [],
        history: []
      };
    }

    return gamificationSnap.data();
  } catch (error) {
    console.error('Error getting gamification data:', error);
    throw error;
  }
};

/**
 * Get leaderboard
 */
export const getLeaderboard = async (scope = 'global', timeframe = 'all-time', limit = 100) => {
  try {
    // This would be implemented with BigQuery or Firestore aggregation
    // For now, return mock data
    return [
      { userId: '1', name: 'Alice Johnson', xp: 4500, level: 45, badges: 12 },
      { userId: '2', name: 'Bob Smith', xp: 4200, level: 42, badges: 10 }
    ];
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    throw error;
  }
};

/**
 * Update user streak
 */
export const updateStreak = async (userId) => {
  try {
    const gamificationRef = doc(db, COLLECTIONS.GAMIFICATION, userId);
    const gamificationSnap = await getDoc(gamificationRef);

    if (!gamificationSnap.exists()) {
      return;
    }

    const data = gamificationSnap.data();
    const lastActivity = data.lastActivity?.toDate();
    const now = new Date();
    
    let newStreak = data.currentStreak || 0;

    if (!lastActivity) {
      newStreak = 1;
    } else {
      const daysSinceLastActivity = Math.floor((now - lastActivity) / (1000 * 60 * 60 * 24));
      
      if (daysSinceLastActivity === 1) {
        // Consecutive day
        newStreak += 1;
      } else if (daysSinceLastActivity > 1) {
        // Streak broken
        newStreak = 1;
      }
      // If same day, don't change streak
    }

    await updateDoc(gamificationRef, {
      currentStreak: newStreak,
      lastActivity: serverTimestamp(),
      longestStreak: Math.max(newStreak, data.longestStreak || 0)
    });

    // Award badges for streaks
    if (newStreak === 7) {
      await awardBadge(userId, {
        id: '7-day-streak',
        name: '7 Day Streak',
        description: 'Studied for 7 days in a row',
        icon: 'fire'
      });
    }

    return newStreak;
  } catch (error) {
    console.error('Error updating streak:', error);
    throw error;
  }
};

/**
 * Check and award achievement badges
 */
export const checkAchievements = async (userId, action, metadata = {}) => {
  try {
    const gamificationData = await getUserGamification(userId);
    const earnedBadgeIds = gamificationData.badges?.map(b => b.id) || [];

    const achievements = {
      'first-quiz': {
        condition: action === 'quiz_completed' && !earnedBadgeIds.includes('first-quiz'),
        badge: {
          id: 'first-quiz',
          name: 'First Quiz',
          description: 'Complete your first quiz',
          icon: 'check'
        }
      },
      'perfect-score': {
        condition: action === 'quiz_completed' && metadata.score === 100 && !earnedBadgeIds.includes('perfect-score'),
        badge: {
          id: 'perfect-score',
          name: 'Perfect Score',
          description: 'Get 100% on a quiz',
          icon: 'star'
        }
      },
      'quiz-master': {
        condition: action === 'quiz_completed' && metadata.totalQuizzes >= 50 && !earnedBadgeIds.includes('quiz-master'),
        badge: {
          id: 'quiz-master',
          name: 'Quiz Master',
          description: 'Complete 50 quizzes',
          icon: 'trophy'
        }
      }
    };

    const badgesToAward = Object.values(achievements)
      .filter(achievement => achievement.condition)
      .map(achievement => achievement.badge);

    for (const badge of badgesToAward) {
      await awardBadge(userId, badge);
    }

    return badgesToAward;
  } catch (error) {
    console.error('Error checking achievements:', error);
    throw error;
  }
};