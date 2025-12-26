// src/features/gamification/contexts/GamificationContext.jsx
import { createContext, useContext, useEffect, useReducer, useMemo } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../shared/config/firebase';
import { useAuth } from '../../auth/contexts/AuthContext';
import { BADGE_DEFINITIONS, TITLE_DEFINITIONS } from '../config/achievements';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { calculateLevel, calculateLevelProgress, getNextLevelXp, LEVEL_THRESHOLDS } from '../../../shared/utils/levelUtils';

const GamificationContext = createContext(null);

// Initial State
const initialState = {
    xp: 0,
    level: 1,
    streak: 0,
    unlockedBadges: [],
    unlockedTitles: ['title_newbie'],
    equippedTitle: 'Novice Learner',
    equippedTitleId: 'title_newbie',
    stats: {
        totalStudyTime: 0,
        quizzesCompleted: 0,
        perfectQuizzes: 0,
        flashcardsReviewed: 0,
        flashcardsMastered: 0,
        documentsUploaded: 0,
        classesJoined: 0
    },
    loading: true,
    error: null
};

// Reducer
const gamificationReducer = (state, action) => {
    switch (action.type) {
        case 'SET_DATA':
            return { ...state, ...action.payload, loading: false };
        case 'SET_ERROR':
            return { ...state, error: action.payload, loading: false };
        case 'SET_LOADING':
            return { ...state, loading: action.payload };
        default:
            return state;
    }
};


export const GamificationProvider = ({ children }) => {
    const { user } = useAuth();
    const [state, dispatch] = useReducer(gamificationReducer, initialState);

    useEffect(() => {
        if (!user?.uid) {
            dispatch({ type: 'SET_LOADING', payload: false });
            return;
        }

        dispatch({ type: 'SET_LOADING', payload: true });

        const userRef = doc(db, 'users', user.uid);
        let previousXP = null;
        let previousLevel = null;

        const unsubscribe = onSnapshot(userRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                const xp = data.xp || 0;
                const level = data.level || calculateLevel(xp);

                // Detect Level Up
                if (previousLevel !== null && level > previousLevel) {
                    confetti({
                        particleCount: 200,
                        spread: 100,
                        origin: { y: 0.5 },
                        colors: ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b']
                    });
                    toast.success(`🎉 Level ${level} Unlocked!`, {
                        duration: 5000,
                        position: 'top-center',
                        icon: '👑'
                    });
                }

                // Detect XP Gain
                if (previousXP !== null && xp > previousXP) {
                    const gained = xp - previousXP;
                    if (gained < 1000) {
                        toast.success(`+${gained} XP`, {
                            icon: '⚡',
                            duration: 2000,
                            position: 'bottom-right',
                            id: 'xp-gain-ctx'
                        });
                    }
                }

                previousXP = xp;
                previousLevel = level;

                dispatch({
                    type: 'SET_DATA',
                    payload: {
                        xp,
                        level,
                        streak: data.streak || 0,
                        unlockedBadges: data.unlockedBadges || [],
                        unlockedTitles: data.unlockedTitles || ['title_newbie'],
                        equippedTitle: data.equippedTitle || 'Novice Learner',
                        equippedTitleId: data.equippedTitleId || 'title_newbie',
                        globalRank: data.globalRank || 999,
                        stats: {
                            totalStudyTime: data.totalStudyTime || 0,
                            quizzesCompleted: data.quizzesCompleted || 0,
                            perfectQuizzes: data.perfectQuizzes || 0,
                            flashcardsReviewed: data.flashcardsReviewed || 0,
                            flashcardsMastered: data.flashcardsMastered || 0,
                            documentsUploaded: data.documentsUploaded || 0,
                            classesJoined: data.classesJoined || 0
                        }
                    }
                });
            } else {
                dispatch({ type: 'SET_LOADING', payload: false });
            }
        }, (error) => {
            console.error('Gamification context sync error:', error);
            dispatch({ type: 'SET_ERROR', payload: error.message });
        });

        return () => unsubscribe();
    }, [user?.uid]);

    // Computed Values
    const contextValue = useMemo(() => {
        const nextLevelXp = getNextLevelXp(state.xp);
        const levelProgress = calculateLevelProgress(state.xp);
        const xpToNextLevel = Math.max(0, nextLevelXp - state.xp);

        return {
            ...state,
            nextLevelXp,
            levelProgress,
            xpToNextLevel,
            LEVEL_THRESHOLDS
        };
    }, [state]);

    return (
        <GamificationContext.Provider value={contextValue}>
            {children}
        </GamificationContext.Provider>
    );
};

export const useGamificationContext = () => {
    const context = useContext(GamificationContext);
    if (!context) {
        throw new Error('useGamificationContext must be used within a GamificationProvider');
    }
    return context;
};
