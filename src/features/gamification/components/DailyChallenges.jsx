// src/components/gamification/DailyChallenges.jsx - ✅ FIXED VERSION
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Target, Trophy, Flame, Clock, Brain, Zap, Award,
    Crown, Layers, Timer, CheckCircle2, Sparkles, AlertCircle, RefreshCw
} from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@shared/config/firebase';
import { useAuth } from '@auth/contexts/AuthContext';
import { getDailyChallenges, getChallengeStreak } from '@gamification/services/challengeService';
import Confetti from 'react-confetti';  // npm install react-confetti

// Icon map for dynamic rendering
const ICON_MAP = {
    Brain: Brain,
    Clock: Clock,
    Layers: Layers,
    Target: Target,
    Timer: Timer,
    Zap: Zap,
    Award: Award,
    Trophy: Trophy,
    Flame: Flame,
    Crown: Crown
};

// ✅ Bonus XP constant
const ALL_COMPLETE_BONUS = 100;

const DailyChallenges = ({ compact = false }) => {
    const { user } = useAuth();
    const [challenges, setChallenges] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [allCompleted, setAllCompleted] = useState(false);
    const [streak, setStreak] = useState(0);
    const [timeLeft, setTimeLeft] = useState('');
    const [showConfetti, setShowConfetti] = useState(false);
    const [justCompleted, setJustCompleted] = useState(null);

    // ✅ FIXED: Get today's date string in UTC (matching challengeService)
    const getTodayString = () => {
        const now = new Date();
        const utcDate = new Date(now.getTime() + now.getTimezoneOffset() * 60000);
        return utcDate.toISOString().split('T')[0];
    };

    // ✅ FIXED: Real-time challenges listener
    useEffect(() => {
        if (!user?.uid) {
            setLoading(false);
            return;
        }

        const today = getTodayString();
        const challengesRef = doc(db, 'users', user.uid, 'dailyChallenges', today);

        console.log('🔄 Setting up daily challenges listener');

        const unsubscribe = onSnapshot(
            challengesRef,
            async (snapshot) => {
                try {
                    if (snapshot.exists()) {
                        const data = snapshot.data();
                        const fetchedChallenges = data.challenges || [];
                        const wasAllCompleted = allCompleted;
                        const newAllCompleted = data.allCompleted || false;

                        setChallenges(fetchedChallenges);
                        setAllCompleted(newAllCompleted);

                        // ✅ Show confetti when all challenges just completed
                        if (newAllCompleted && !wasAllCompleted) {
                            setShowConfetti(true);
                            setTimeout(() => setShowConfetti(false), 5000);
                        }

                        // ✅ Detect newly completed challenge
                        const newlyCompleted = fetchedChallenges.find(
                            (c, idx) => c.completed && !challenges[idx]?.completed
                        );
                        if (newlyCompleted) {
                            setJustCompleted(newlyCompleted.id);
                            setTimeout(() => setJustCompleted(null), 2000);
                        }

                        setError(null);
                        console.log('✅ Challenges updated:', fetchedChallenges.length);
                    } else {
                        // No challenges exist yet, generate them
                        console.log('⚠️ No challenges found, generating...');
                        const { challenges: newChallenges, allCompleted: completed } = 
                            await getDailyChallenges(user.uid);
                        setChallenges(newChallenges);
                        setAllCompleted(completed);
                    }

                    // Load streak
                    const currentStreak = await getChallengeStreak(user.uid);
                    setStreak(currentStreak);

                    setLoading(false);
                } catch (err) {
                    console.error('❌ Error loading challenges:', err);
                    setError('Failed to load challenges');
                    setLoading(false);
                }
            },
            (err) => {
                console.error('❌ Challenges listener error:', err);
                setError('Failed to connect to challenges');
                setLoading(false);
            }
        );

        return () => {
            console.log('🔌 Unsubscribing from challenges listener');
            unsubscribe();
        };
    }, [user?.uid]);

    // ✅ FIXED: Calculate time until reset (UTC-based)
    useEffect(() => {
        const updateTimeLeft = () => {
            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
            tomorrow.setUTCHours(0, 0, 0, 0);

            const diff = tomorrow - now;
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

            setTimeLeft(`${hours}h ${minutes}m`);
        };

        updateTimeLeft();
        const interval = setInterval(updateTimeLeft, 60000);
        return () => clearInterval(interval);
    }, []);

    // ✅ Retry loading challenges
    const handleRetry = async () => {
        setLoading(true);
        setError(null);
        try {
            const { challenges: newChallenges, allCompleted: completed } = 
                await getDailyChallenges(user.uid);
            setChallenges(newChallenges);
            setAllCompleted(completed);
            const currentStreak = await getChallengeStreak(user.uid);
            setStreak(currentStreak);
        } catch (err) {
            setError('Failed to load challenges');
        } finally {
            setLoading(false);
        }
    };

    const getDifficultyColor = (difficulty) => {
        switch (difficulty) {
            case 'easy': return 'from-green-500 to-emerald-500';
            case 'medium': return 'from-yellow-500 to-orange-500';
            case 'hard': return 'from-red-500 to-rose-500';
            default: return 'from-gray-500 to-gray-600';
        }
    };

    const getDifficultyBg = (difficulty) => {
        switch (difficulty) {
            case 'easy': return 'bg-green-500/10 border-green-500/30';
            case 'medium': return 'bg-yellow-500/10 border-yellow-500/30';
            case 'hard': return 'bg-red-500/10 border-red-500/30';
            default: return 'bg-gray-500/10 border-gray-500/30';
        }
    };

    // ✅ FIXED: Smart progress calculation
    const calculateProgress = (challenge) => {
        // For quiz_score type, check if achieved target
        if (challenge.type === 'quiz_score') {
            return challenge.progress >= challenge.target ? 100 : 
                   (challenge.progress / challenge.target) * 100;
        }
        // For count/time challenges, normal calculation
        return Math.min((challenge.progress / challenge.target) * 100, 100);
    };

    // ✅ Loading state
    if (loading) {
        return (
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-20 bg-gray-100 rounded-xl"></div>
                    <div className="h-20 bg-gray-100 rounded-xl"></div>
                    <div className="h-20 bg-gray-100 rounded-xl"></div>
                </div>
            </div>
        );
    }

    // ✅ Error state
    if (error) {
        return (
            <div className="bg-white rounded-2xl border border-red-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                    <AlertCircle size={24} className="text-red-500" />
                    <div>
                        <h3 className="font-bold text-red-900">Failed to Load Challenges</h3>
                        <p className="text-sm text-red-600">{error}</p>
                    </div>
                </div>
                <button
                    onClick={handleRetry}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                    <RefreshCw size={16} />
                    <span>Retry</span>
                </button>
            </div>
        );
    }

    // ✅ Empty state
    if (challenges.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="text-center py-8">
                    <Target size={48} className="text-gray-300 mx-auto mb-3" />
                    <h3 className="font-bold text-gray-900 mb-2">No Challenges Available</h3>
                    <p className="text-sm text-gray-500">Check back tomorrow for new challenges!</p>
                </div>
            </div>
        );
    }

    // ✅ Compact version
    if (compact) {
        const completedCount = challenges.filter(c => c.completed).length;
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-4 text-white shadow-lg"
            >
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Target size={18} />
                        <span className="font-bold text-sm">Daily Challenges</span>
                    </div>
                    <span className="text-xs opacity-80">{timeLeft} left</span>
                </div>

                <div className="flex items-center gap-2 mb-3">
                    {challenges.map((challenge, idx) => (
                        <motion.div
                            key={idx}
                            className={`flex-1 h-2 rounded-full transition-all ${
                                challenge.completed ? 'bg-white' : 'bg-white/30'
                            }`}
                            initial={{ scale: 0.8 }}
                            animate={{ scale: challenge.completed ? 1.1 : 1 }}
                        />
                    ))}
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-sm font-bold">{completedCount}/{challenges.length} Complete</span>
                    {streak > 0 && (
                        <div className="flex items-center gap-1">
                            <Flame size={14} className="text-yellow-300" />
                            <span className="text-xs font-bold">{streak} day streak</span>
                        </div>
                    )}
                </div>

                {allCompleted && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mt-3 p-2 bg-white/20 rounded-lg flex items-center gap-2"
                    >
                        <Trophy size={14} />
                        <span className="text-xs font-bold">All Done! +{ALL_COMPLETE_BONUS} XP</span>
                    </motion.div>
                )}
            </motion.div>
        );
    }

    const completedCount = challenges.filter(c => c.completed).length;

    return (
        <>
            {/* ✅ Confetti on all complete */}
            {showConfetti && (
                <Confetti
                    width={window.innerWidth}
                    height={window.innerHeight}
                    recycle={false}
                    numberOfPieces={200}
                    gravity={0.3}
                />
            )}

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm"
            >
                {/* Header */}
                <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <motion.div
                                className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center"
                                animate={allCompleted ? { rotate: [0, 10, -10, 0] } : {}}
                                transition={{ duration: 0.5 }}
                            >
                                <Target size={24} className="text-white" />
                            </motion.div>
                            <div>
                                <h2 className="text-xl font-black text-black">Daily Challenges</h2>
                                <p className="text-gray-500 text-sm">
                                    {allCompleted ? 'All complete! 🎉' : 'Complete for bonus XP'}
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Clock size={14} />
                                <span>Resets in {timeLeft}</span>
                            </div>
                            {streak > 0 && (
                                <motion.div
                                    className="flex items-center gap-1 mt-1 justify-end"
                                    animate={{ scale: [1, 1.05, 1] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                >
                                    <Flame size={14} className="text-orange-500" />
                                    <span className="text-sm font-bold text-orange-500">
                                        {streak} day streak!
                                    </span>
                                </motion.div>
                            )}
                        </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-4">
                        <div className="flex items-center justify-between text-sm mb-2">
                            <span className="text-gray-600">Progress</span>
                            <span className="font-bold text-black">
                                {completedCount}/{challenges.length}
                            </span>
                        </div>
                        <div className="h-3 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{
                                    width: `${(completedCount / challenges.length) * 100}%`
                                }}
                                className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-600 relative"
                                transition={{ duration: 0.5, ease: 'easeOut' }}
                            >
                                {/* Shimmer effect */}
                                <motion.div
                                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                                    animate={{ x: ['-100%', '200%'] }}
                                    transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                                />
                            </motion.div>
                        </div>
                    </div>

                    {/* ✅ All completed bonus with correct XP */}
                    {allCompleted && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            className="mt-4 p-4 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 rounded-xl flex items-center gap-3 shadow-lg"
                        >
                            <motion.div
                                animate={{ rotate: [0, 360] }}
                                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                            >
                                <Sparkles size={24} className="text-white" />
                            </motion.div>
                            <div className="flex-1">
                                <span className="text-white font-black text-sm">
                                    All challenges complete! 🎉
                                </span>
                                <div className="flex items-center gap-1 mt-1">
                                    <Zap size={14} className="text-yellow-200" />
                                    <span className="text-yellow-100 font-bold text-xs">
                                        +{ALL_COMPLETE_BONUS} XP Bonus Earned!
                                    </span>
                                </div>
                            </div>
                            <Trophy size={24} className="text-yellow-200" />
                        </motion.div>
                    )}
                </div>

                {/* Challenges List */}
                <div className="p-4 space-y-3">
                    <AnimatePresence mode="popLayout">
                        {challenges.map((challenge, idx) => {
                            const IconComponent = ICON_MAP[challenge.icon] || Target;
                            const progress = calculateProgress(challenge);
                            const isJustCompleted = justCompleted === challenge.id;

                            return (
                                <motion.div
                                    key={challenge.id}
                                    layout
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ 
                                        opacity: 1, 
                                        x: 0,
                                        scale: isJustCompleted ? [1, 1.02, 1] : 1
                                    }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className={`p-4 rounded-xl border-2 transition-all ${
                                        challenge.completed
                                            ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300 shadow-sm'
                                            : getDifficultyBg(challenge.difficulty)
                                    }`}
                                >
                                    <div className="flex items-center gap-4">
                                        {/* Icon */}
                                        <motion.div
                                            className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-md ${
                                                challenge.completed
                                                    ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                                                    : `bg-gradient-to-br ${getDifficultyColor(challenge.difficulty)}`
                                            }`}
                                            animate={
                                                isJustCompleted
                                                    ? { rotate: [0, -10, 10, -10, 0], scale: [1, 1.2, 1] }
                                                    : {}
                                            }
                                        >
                                            {challenge.completed ? (
                                                <CheckCircle2 size={28} className="text-white" strokeWidth={2.5} />
                                            ) : (
                                                <IconComponent size={28} className="text-white" strokeWidth={2.5} />
                                            )}
                                        </motion.div>

                                        {/* Details */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <h3
                                                    className={`font-black text-base ${
                                                        challenge.completed ? 'text-green-700' : 'text-black'
                                                    }`}
                                                >
                                                    {challenge.title}
                                                </h3>
                                                <span
                                                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                                        challenge.difficulty === 'easy'
                                                            ? 'bg-green-100 text-green-700'
                                                            : challenge.difficulty === 'medium'
                                                            ? 'bg-yellow-100 text-yellow-700'
                                                            : 'bg-red-100 text-red-700'
                                                    }`}
                                                >
                                                    {challenge.difficulty}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600 mb-3">
                                                {challenge.description}
                                            </p>

                                            {/* Progress bar */}
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden border border-gray-300">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${progress}%` }}
                                                        className={`h-full relative ${
                                                            challenge.completed
                                                                ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                                                                : `bg-gradient-to-r ${getDifficultyColor(challenge.difficulty)}`
                                                        }`}
                                                        transition={{ duration: 0.5, ease: 'easeOut' }}
                                                    >
                                                        {/* Shimmer */}
                                                        {!challenge.completed && (
                                                            <motion.div
                                                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                                                                animate={{ x: ['-100%', '200%'] }}
                                                                transition={{
                                                                    duration: 1.5,
                                                                    repeat: Infinity,
                                                                    ease: 'linear'
                                                                }}
                                                            />
                                                        )}
                                                    </motion.div>
                                                </div>
                                                <span className="text-xs font-black text-gray-600 min-w-[60px] text-right">
                                                    {challenge.progress}/{challenge.target}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Reward */}
                                        <div className="text-right flex-shrink-0">
                                            <div
                                                className={`flex items-center gap-1 justify-end ${
                                                    challenge.completed ? 'text-green-600' : 'text-yellow-600'
                                                }`}
                                            >
                                                <Zap size={18} strokeWidth={2.5} />
                                                <span className="font-black text-lg">{challenge.xpReward}</span>
                                            </div>
                                            <span className="text-xs text-gray-500 font-semibold">XP</span>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            </motion.div>
        </>
    );
};

export default DailyChallenges;
