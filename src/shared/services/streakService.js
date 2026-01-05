import { doc, getDoc, updateDoc, setDoc, increment, Timestamp, serverTimestamp } from 'firebase/firestore';
import { db } from '@shared/config/firebase';

/**
 * Update user's login streak
 * Call this once per day on first login
 */
export const updateDailyStreak = async (userId) => {
    if (!userId) {
        console.error('⚠️ No userId provided to updateDailyStreak');
        return { success: false, streak: 0 };
    }

    try {
        const userRef = doc(db, 'users', userId);
        const gamificationRef = doc(db, 'gamification', userId); // ✅ Added gamification ref

        // Fetch both documents in parallel
        const [userSnap, gamificationSnap] = await Promise.all([
            getDoc(userRef),
            getDoc(gamificationRef)
        ]);

        if (!userSnap.exists()) {
            console.error('⚠️ User document not found:', userId);
            return { success: false, streak: 0 };
        }

        const userData = userSnap.data();

        // Get today's date (normalized to midnight)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Get last activity date
        const lastActivityDate = userData.lastActivityDate?.toDate?.();

        // Helper to perform dual update
        const performDualUpdate = async (newStreak, isReset = false) => {
            const updates = {
                streak: newStreak,
                lastActivityDate: Timestamp.fromDate(today),
                lastActivityAt: Timestamp.now()
            };

            // Prepare gamification updates
            const gamificationUpdates = {
                'streakData.currentStreak': newStreak,
                'streakData.lastActivityDate': Timestamp.fromDate(today),
                updatedAt: serverTimestamp()
            };

            if (gamificationSnap.exists()) {
                const currentLongest = gamificationSnap.data().streakData?.longestStreak || 0;
                if (newStreak > currentLongest) {
                    gamificationUpdates['streakData.longestStreak'] = newStreak;
                }
            } else {
                // Initialize if missing
                gamificationUpdates['streakData.longestStreak'] = newStreak;
                gamificationUpdates.xp = gamificationUpdates.xp || 0;
                gamificationUpdates.level = gamificationUpdates.level || 1;
            }

            // Execute both updates
            const promises = [updateDoc(userRef, updates)];

            if (gamificationSnap.exists()) {
                promises.push(updateDoc(gamificationRef, gamificationUpdates));
            } else {
                promises.push(setDoc(gamificationRef, gamificationUpdates, { merge: true }));
            }

            await Promise.all(promises);
        };

        if (!lastActivityDate) {
            // ✅ FIRST TIME - Initialize streak
            await performDualUpdate(1);
            console.log('✅ Streak initialized to 1');
            return { success: true, streak: 1, isNewStreak: true };
        }

        // Normalize last activity to midnight
        const lastActivity = new Date(lastActivityDate);
        lastActivity.setHours(0, 0, 0, 0);

        // Calculate difference in days
        const diffMs = today - lastActivity;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        console.log('📊 Streak calculation:', {
            today: today.toDateString(),
            lastActivity: lastActivity.toDateString(),
            diffDays,
            currentStreak: userData.streak || 0
        });

        if (diffDays === 0) {
            // ✅ SAME DAY - No change
            console.log('ℹ️ Same day login, streak unchanged');
            return {
                success: true,
                streak: userData.streak || 1,
                isSameDay: true
            };
        }
        else if (diffDays === 1) {
            // ✅ CONSECUTIVE DAY - Increment streak
            const newStreak = (userData.streak || 0) + 1;
            await performDualUpdate(newStreak);

            console.log(`✅ Streak incremented: ${userData.streak} → ${newStreak} `);
            return {
                success: true,
                streak: newStreak,
                isIncremented: true,
                previousStreak: userData.streak || 0
            };
        }
        else {
            // ⚠️ MISSED DAY(S) - Reset to 1
            await performDualUpdate(1, true);

            console.log(`⚠️ Streak reset(missed ${diffDays - 1} day(s))`);
            return {
                success: true,
                streak: 1,
                wasReset: true,
                daysMissed: diffDays - 1,
                previousStreak: userData.streak || 0
            };
        }

    } catch (error) {
        console.error('❌ Error updating streak:', error);
        return { success: false, streak: 0, error: error.message };
    }
};

/**
 * Get current user streak
 */
export const getUserStreak = async (userId) => {
    if (!userId) return 0;

    try {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            return userSnap.data().streak || 0;
        }
        return 0;
    } catch (error) {
        console.error('❌ Error getting streak:', error);
        return 0;
    }
};

/**
 * Check if streak is about to break (user hasn't logged in today)
 */
export const isStreakAtRisk = async (userId) => {
    if (!userId) return false;

    try {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) return false;

        const userData = userSnap.data();
        const lastActivityDate = userData.lastActivityDate?.toDate?.();

        if (!lastActivityDate) return false;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const lastActivity = new Date(lastActivityDate);
        lastActivity.setHours(0, 0, 0, 0);

        const diffDays = Math.floor((today - lastActivity) / (1000 * 60 * 60 * 24));

        // Streak at risk if last activity was yesterday or earlier
        return diffDays >= 1;
    } catch (error) {
        console.error('❌ Error checking streak risk:', error);
        return false;
    }
};
