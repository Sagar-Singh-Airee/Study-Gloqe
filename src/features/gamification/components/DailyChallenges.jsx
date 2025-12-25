// src/components/gamification/DailyChallenges.jsx
// ✨ MINIMALIST DESIGN - Teal/Royal Blue/Black/White
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Clock, CheckCircle2, Zap, TrendingUp } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@shared/config/firebase';
import { useAuth } from '@auth/contexts/AuthContext';
import {
    getDailyChallenges,
    getChallengeStreak,
    updateChallengeProgress
} from '@gamification/services/challengeService';
import toast from 'react-hot-toast';

const DailyChallenges = ({ compact = false, onChallengesLoaded }) => {
    const { user } = useAuth();
    const [challenges, setChallenges] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [allCompleted, setAllCompleted] = useState(false);
    const [streak, setStreak] = useState(0);
    const [timeLeft, setTimeLeft] = useState('');

    const getTodayString = useCallback(() => {
        const now = new Date();
        const utcDate = new Date(now.getTime() + now.getTimezoneOffset() * 60000);
        return utcDate.toISOString().split('T')[0];
    }, []);

    // Real-time listener
    useEffect(() => {
        if (!user?.uid) {
            setLoading(false);
            return;
        }

        const today = getTodayString();
        const challengesRef = doc(db, 'gamification', user.uid, 'dailyChallenges', today);

        const unsubscribe = onSnapshot(
            challengesRef,
            async (snapshot) => {
                try {
                    let loadedChallenges = [];
                    if (snapshot.exists()) {
                        const data = snapshot.data();
                        loadedChallenges = data.challenges || [];
                        setChallenges(loadedChallenges);
                        setAllCompleted(data.allCompleted || false);
                    } else {
                        const result = await getDailyChallenges(user.uid);
                        loadedChallenges = result.challenges || [];
                        setChallenges(loadedChallenges);
                        setAllCompleted(result.allCompleted);
                    }

                    if (onChallengesLoaded) {
                        onChallengesLoaded(loadedChallenges.length);
                    }

                    const currentStreak = await getChallengeStreak(user.uid);
                    setStreak(currentStreak);
                    setLoading(false);
                    setError(null);
                } catch (err) {
                    console.error('Error loading challenges:', err);
                    setError('Failed to load');
                    setLoading(false);
                }
            },
            (err) => {
                console.error('Listener error:', err);
                setError('Connection failed');
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [user?.uid, getTodayString]);

    // Timer
    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
            tomorrow.setUTCHours(0, 0, 0, 0);

            const diff = tomorrow - now;
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

            setTimeLeft(`${hours}h ${minutes}m`);
        };

        updateTime();
        const interval = setInterval(updateTime, 60000);
        return () => clearInterval(interval);
    }, []);

    const calculateProgress = useCallback((challenge) => {
        return Math.min((challenge.progress / challenge.target) * 100, 100);
    }, []);

    // Loading
    if (loading) {
        return (
            <div className="bg-white rounded-lg border border-slate-200 p-4">
                <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-slate-100 rounded w-32"></div>
                    <div className="h-2 bg-slate-100 rounded"></div>
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-16 bg-slate-50 rounded border border-slate-100"></div>
                    ))}
                </div>
            </div>
        );
    }

    // Error
    if (error) {
        return (
            <div className="bg-white rounded-lg border border-red-200 p-4">
                <p className="text-xs text-red-600">{error}</p>
            </div>
        );
    }

    // Empty
    if (challenges.length === 0) {
        return (
            <div className="bg-white rounded-lg border border-slate-200 p-4 text-center">
                <Target size={20} className="text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500">No challenges today</p>
            </div>
        );
    }

    const completedCount = challenges.filter(c => c.completed).length;
    const totalXP = challenges.reduce((sum, c) => sum + (c.completed ? c.xpReward : 0), 0) +
        (allCompleted ? 100 : 0);

    // Compact view
    if (compact) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-lg border border-slate-200 p-3 hover:border-teal-500 transition-colors"
            >
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-900">Daily Goals</span>
                    <span className="text-[10px] text-slate-500">{timeLeft}</span>
                </div>

                <div className="flex items-center gap-1.5 mb-2">
                    {challenges.slice(0, 5).map((c, i) => (
                        <div
                            key={i}
                            className={`flex-1 h-1.5 rounded-full transition-all ${c.completed ? 'bg-teal-500' : 'bg-slate-200'
                                }`}
                        />
                    ))}
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-600">
                        {completedCount}/{challenges.length} complete
                    </span>
                    <div className="flex items-center gap-1">
                        <Zap size={12} className="text-amber-500" />
                        <span className="text-xs font-bold text-slate-900">{totalXP}</span>
                    </div>
                </div>
            </motion.div>
        );
    }

    // Full view
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg border border-slate-200 overflow-hidden"
        >
            {/* Header */}
            <div className="p-4 border-b border-slate-100">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-blue-600 rounded-lg flex items-center justify-center">
                            <Target size={16} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900">Daily Challenges</h3>
                            <p className="text-[11px] text-slate-500">{completedCount}/5 complete</p>
                        </div>
                    </div>

                    <div className="text-right">
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 mb-1">
                            <Clock size={10} />
                            <span>{timeLeft}</span>
                        </div>
                        {streak > 0 && (
                            <div className="text-[11px] font-semibold text-orange-600">
                                {streak} day streak
                            </div>
                        )}
                    </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(completedCount / 5) * 100}%` }}
                            className="h-full bg-gradient-to-r from-teal-500 to-blue-600"
                            transition={{ duration: 0.5 }}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-500">Progress</span>
                        <div className="flex items-center gap-1">
                            <Zap size={11} className="text-amber-500" />
                            <span className="text-xs font-bold text-slate-900">{totalXP} XP</span>
                        </div>
                    </div>
                </div>

                {/* All complete banner */}
                {allCompleted && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mt-3 p-2 bg-gradient-to-r from-teal-50 to-blue-50 rounded-lg border border-teal-200"
                    >
                        <div className="flex items-center gap-2">
                            <CheckCircle2 size={14} className="text-teal-600" />
                            <span className="text-[11px] font-semibold text-teal-700">
                                All done! +100 XP bonus
                            </span>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Challenges list */}
            <div className="p-3 space-y-2">
                <AnimatePresence mode="popLayout">
                    {challenges.slice(0, 5).map((challenge, idx) => {
                        const progress = calculateProgress(challenge);

                        return (
                            <motion.div
                                key={challenge.id}
                                layout
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                transition={{ delay: idx * 0.03 }}
                                className={`group p-3 rounded-lg border transition-all ${challenge.completed
                                    ? 'bg-teal-50/50 border-teal-200'
                                    : 'bg-slate-50/30 border-slate-200 hover:border-slate-300'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    {/* Icon */}
                                    <div
                                        className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${challenge.completed
                                            ? 'bg-gradient-to-br from-teal-500 to-blue-600'
                                            : 'bg-slate-200'
                                            }`}
                                    >
                                        {challenge.completed ? (
                                            <CheckCircle2 size={18} className="text-white" />
                                        ) : (
                                            <Target size={18} className="text-slate-500" />
                                        )}
                                    </div>

                                    {/* Details */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <h4 className={`text-xs font-semibold ${challenge.completed ? 'text-teal-700' : 'text-slate-900'
                                                }`}>
                                                {challenge.title}
                                            </h4>
                                            <div className="flex items-center gap-1">
                                                <Zap size={11} className={challenge.completed ? 'text-teal-600' : 'text-amber-500'} />
                                                <span className="text-[11px] font-bold text-slate-700">
                                                    {challenge.xpReward}
                                                </span>
                                            </div>
                                        </div>

                                        <p className="text-[10px] text-slate-500 mb-2">
                                            {challenge.description}
                                        </p>

                                        {/* Progress */}
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${progress}%` }}
                                                    className={`h-full ${challenge.completed
                                                        ? 'bg-gradient-to-r from-teal-500 to-blue-600'
                                                        : 'bg-slate-400'
                                                        }`}
                                                    transition={{ duration: 0.4 }}
                                                />
                                            </div>
                                            <span className="text-[10px] font-medium text-slate-600 min-w-[40px] text-right">
                                                {challenge.progress}/{challenge.target}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};

export default DailyChallenges;