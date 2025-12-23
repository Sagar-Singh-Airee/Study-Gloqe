export const LEVEL_THRESHOLDS = [
    0, 100, 250, 500, 1000, 2000, 4000, 8000, 16000, 32000, 64000, 128000, 256000
];

/**
 * Calculates current level based on total XP
 * @param {number} xp 
 * @returns {number} Level (starts at 1)
 */
export const calculateLevel = (xp) => {
    if (!xp || xp < 0) return 1;
    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
        if (xp >= LEVEL_THRESHOLDS[i]) {
            return i + 1;
        }
    }
    return 1;
};

/**
 * Calculates progress percentage towards next level
 * @param {number} xp 
 * @returns {number} Progress percentage (0-100)
 */
export const calculateLevelProgress = (xp) => {
    const level = calculateLevel(xp);
    const currentThreshold = LEVEL_THRESHOLDS[level - 1] || 0;
    const nextThreshold = LEVEL_THRESHOLDS[level] || currentThreshold + 1000;

    if (nextThreshold === currentThreshold) return 100;

    const progress = ((xp - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
    return Math.min(Math.max(progress, 0), 100);
};

/**
 * Returns the XP required for the next level
 * @param {number} xp 
 * @returns {number} XP threshold for next level
 */
export const getNextLevelXp = (xp) => {
    const level = calculateLevel(xp);
    return LEVEL_THRESHOLDS[level] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
};
