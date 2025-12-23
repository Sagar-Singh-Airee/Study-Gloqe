/**
 * Centralized Streak Calculation Utility
 * Provides a robust "True Streak" logic based on activity dates.
 */

/**
 * Calculates the current consecutive streak based on an array of activity dates.
 * A streak is maintained if there is activity today OR yesterday.
 * 
 * @param {Array<Date|Timestamp|string|number>} activityDates - Array of dates with activity
 * @returns {number} The current streak count
 */
export const calculateTrueStreak = (activityData) => {
    if (!activityData) return 0;

    let activityDates = [];

    // Case 1: Array of dates/timestamps
    if (Array.isArray(activityData)) {
        activityDates = activityData;
    }
    // Case 2: Daily activity map { "2023-01-01": 20, ... }
    else if (typeof activityData === 'object') {
        activityDates = Object.keys(activityData);
    }

    if (activityDates.length === 0) return 0;

    // 1. Normalize all dates to midnight Local (Start of day)
    const uniqueDates = Array.from(new Set(
        activityDates.map(d => {
            let date;
            if (d?.toDate) date = d.toDate(); // Firestore Timestamp
            else date = new Date(d);

            if (isNaN(date.getTime())) return null;

            date.setHours(0, 0, 0, 0);
            return date.getTime();
        }).filter(t => t !== null)
    )).sort((a, b) => b - a); // Sort newest first

    if (uniqueDates.length === 0) return 0;

    // 2. Determine if streak is still active
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayTime = yesterday.getTime();

    const lastActivityTime = uniqueDates[0];

    // If last activity was before yesterday, streak is broken
    if (lastActivityTime < yesterdayTime) {
        return 0;
    }

    // 3. Count consecutive days backwards
    let streakCount = 0;
    let nextExpectedDate = new Date(lastActivityTime);

    for (const activityTime of uniqueDates) {
        if (activityTime === nextExpectedDate.getTime()) {
            streakCount++;
            // Move back 1 day
            nextExpectedDate.setDate(nextExpectedDate.getDate() - 1);
        } else {
            // Gap found
            break;
        }
    }

    return streakCount;
};

/**
 * Checks if a streak is at risk (no activity today but was active yesterday)
 */
export const isStreakAtRisk = (activityDates) => {
    if (!activityDates || activityDates.length === 0) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayTime = yesterday.getTime();

    const uniqueDates = activityDates.map(d => {
        const date = d?.toDate ? d.toDate() : new Date(d);
        date.setHours(0, 0, 0, 0);
        return date.getTime();
    });

    const hasToday = uniqueDates.includes(todayTime);
    const hasYesterday = uniqueDates.includes(yesterdayTime);

    // At risk if active yesterday but not yet today
    return !hasToday && hasYesterday;
};
