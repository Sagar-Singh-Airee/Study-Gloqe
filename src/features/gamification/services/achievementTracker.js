// src/features/gamification/services/achievementTracker.js - 🔄 BRIDGE TO CONSOLIDATED SERVICE
/**
 * 👋 NOTE: This file is now a bridge to gamificationService.js to ensure backward compatibility
 * while using the new synchronized dual-collection logic.
 */
import gamificationService from './gamificationService';

export const trackAction = async (userId, actionType, data = {}) => {
    // Map old actions if needed, otherwise pass through
    console.log(`[AchievementTracker Bridge] Tracking: ${actionType}`);
    return gamificationService.trackAction(userId, actionType, data);
};

export const checkAndUnlockAchievements = async (userId) => {
    console.log(`[AchievementTracker Bridge] Checking achievements`);
    await gamificationService.checkAndUnlockBadges(userId);
    await gamificationService.checkAndUnlockTitles(userId);
};

export const initializeUserAchievements = async (userId) => {
    console.log(`[AchievementTracker Bridge] Initializing user`);
    return gamificationService.initializeGamification(userId);
};

export const getUserAchievements = async (userId) => {
    // This isn't strictly needed for the bridge but kept for compatibility
    return gamificationService.getUserTodaysXP(userId);
};

export const awardXP = async (userId, amount, reason) => {
    return gamificationService.awardXP(userId, amount, reason);
};

export default {
    trackAction,
    checkAndUnlockAchievements,
    initializeUserAchievements,
    getUserAchievements,
    awardXP
};
