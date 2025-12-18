// src/features/analytics/hooks/useGoals.js - ✅ GOALS MANAGEMENT
import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@shared/config/firebase';

export const useGoals = (userId) => {
    const [goals, setGoals] = useState([]);
    const [loading, setLoading] = useState(true);

    // Real-time goals listener
    useEffect(() => {
        if (!userId) {
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, 'goals'),
            where('userId', '==', userId),
            where('deleted', '!=', true)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const userGoals = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date()
            }));
            setGoals(userGoals);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userId]);

    // Add or update goal
    const updateGoal = async (goal) => {
        try {
            if (goal.id && goal.deleted) {
                // Delete goal
                await deleteDoc(doc(db, 'goals', goal.id));
            } else if (goal.id) {
                // Update existing goal
                await updateDoc(doc(db, 'goals', goal.id), {
                    ...goal,
                    updatedAt: new Date()
                });
            } else {
                // Create new goal
                await addDoc(collection(db, 'goals'), {
                    ...goal,
                    userId,
                    createdAt: new Date(),
                    completed: false,
                    deleted: false
                });
            }
        } catch (error) {
            console.error('Error updating goal:', error);
            throw error;
        }
    };

    return {
        goals,
        loading,
        updateGoal
    };
};
