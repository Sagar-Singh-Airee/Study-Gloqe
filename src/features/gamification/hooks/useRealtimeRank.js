// src/features/gamification/hooks/useRealtimeRank.js
import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@shared/config/firebase';
import { useAuth } from '@auth/contexts/AuthContext';

/**
 * Real-time hook to get user's global and class rank
 * Syncs with the same data used in LeaderboardSection
 */
export const useRealtimeRank = () => {
    const { user: currentUser, userData } = useAuth();
    const [globalRank, setGlobalRank] = useState(null);
    const [classRank, setClassRank] = useState(null);
    const [loading, setLoading] = useState(true);
    const [totalStudents, setTotalStudents] = useState(0);

    useEffect(() => {
        let isMounted = true;

        if (!currentUser?.uid) {
            setLoading(false);
            return;
        }

        setLoading(true);

        // Real-time listener - same as LeaderboardSection
        const usersRef = collection(db, 'users');
        const q = query(
            usersRef,
            orderBy('xp', 'desc'),
            limit(500) // Get more users for accurate ranking
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!isMounted) return;

            const allUsers = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Filter students only (same logic as LeaderboardSection)
            const studentsOnly = allUsers.filter(u => {
                const role = u.role?.toLowerCase();
                return role === 'student' || role === 'learner';
            });

            setTotalStudents(studentsOnly.length);

            // Calculate global rank
            const globalIndex = studentsOnly.findIndex(u => u.id === currentUser.uid);
            if (globalIndex !== -1) {
                setGlobalRank(globalIndex + 1);
            } else {
                // User not in top 500
                setGlobalRank(500);
            }

            // Calculate class rank (if user has a classId)
            if (userData?.classId) {
                const classStudents = studentsOnly.filter(u => u.classId === userData.classId);
                const classIndex = classStudents.findIndex(u => u.id === currentUser.uid);
                if (classIndex !== -1) {
                    setClassRank(classIndex + 1);
                } else {
                    setClassRank(classStudents.length + 1);
                }
            } else {
                setClassRank(null);
            }

            setLoading(false);
        }, (error) => {
            if (isMounted) {
                console.error('Realtime rank error:', error);
                setLoading(false);
            }
        });

        return () => {
            isMounted = false;
            unsubscribe();
        };
    }, [currentUser?.uid, userData?.classId]);

    return {
        globalRank,
        classRank,
        totalStudents,
        loading,
        isTopTen: globalRank !== null && globalRank <= 10,
        isTopHundred: globalRank !== null && globalRank <= 100,
    };
};

export default useRealtimeRank;