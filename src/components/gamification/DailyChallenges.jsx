// src/components/gamification/DailyChallenges.jsx - Daily Challenges Widget
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Target, Trophy, Flame, Clock, Brain, Zap, Award,
    Crown, Layers, Timer, CheckCircle2, Lock, Sparkles, ChevronRight
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getDailyChallenges, getChallengeStreak } from '@/services/challengeService';

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

const DailyChallenges = ({ compact = false }) => {
    const { user } = useAuth();
    const [challenges, setChallenges] = useState([]);
    const [loading, setLoading] = useState(true);
    const [allCompleted, setAllCompleted] = useState(false);
    const [streak, setStreak] = useState(0);
    const [timeLeft, setTimeLeft] = useState('');

    // Load challenges
    useEffect(() => {
        const loadChallenges = async () => {
            if (!user?.uid) return;

            try {
                const { challenges: dailyChallenges, allCompleted: completed } = await getDailyChallenges(user.uid);
                setChallenges(dailyChallenges);
                setAllCompleted(completed);

                const currentStreak = await getChallengeStreak(user.uid);
                setStreak(currentStreak);
            } catch (error) {
                console.error('Error loading challenges:', error);
            } finally {
                setLoading(false);
            }
        };

        loadChallenges();

        // Refresh every minute
        const interval = setInterval(loadChallenges, 60000);
        return () => clearInterval(interval);
    }, [user?.uid]);

    // Calculate time until reset
    useEffect(() => {
        const updateTimeLeft = () => {
            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);

            const diff = tomorrow - now;
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

            setTimeLeft(`${hours}h ${minutes}m`);
        };

        updateTimeLeft();
        const interval = setInterval(updateTimeLeft, 60000);
        return () => clearInterval(interval);
    }, []);

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

    if (compact) {
        // Compact version for sidebar/widget
        const completedCount = challenges.filter(c => c.completed).length;
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-4 text-white"
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
                        <div
                            key={idx}
                            className={`flex-1 h-2 rounded-full ${challenge.completed ? 'bg-white' : 'bg-white/30'
                                }`}
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
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
        >
            {/* Header */}
            <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
                            <Target size={24} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-black">Daily Challenges</h2>
                            <p className="text-gray-500 text-sm">Complete for bonus XP</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Clock size={14} />
                            <span>Resets in {timeLeft}</span>
                        </div>
                        {streak > 0 && (
                            <div className="flex items-center gap-1 mt-1 justify-end">
                                <Flame size={14} className="text-orange-500" />
                                <span className="text-sm font-bold text-orange-500">{streak} day streak!</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Progress bar */}
                <div className="mt-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-600">Progress</span>
                        <span className="font-bold text-black">
                            {challenges.filter(c => c.completed).length}/{challenges.length}
                        </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{
                                width: `${(challenges.filter(c => c.completed).length / challenges.length) * 100}%`
                            }}
                            className="h-full bg-gradient-to-r from-purple-500 to-indigo-600"
                            transition={{ duration: 0.5 }}
                        />
                    </div>
                </div>

                {/* All completed bonus */}
                {allCompleted && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mt-4 p-3 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl flex items-center gap-3"
                    >
                        <Sparkles size={20} className="text-white" />
                        <span className="text-white font-bold text-sm">All challenges complete! +100 XP Bonus earned!</span>
                    </motion.div>
                )}
            </div>

            {/* Challenges List */}
            <div className="p-4 space-y-3">
                {challenges.map((challenge, idx) => {
                    const IconComponent = ICON_MAP[challenge.icon] || Target;
                    const progress = Math.min((challenge.progress / challenge.target) * 100, 100);

                    return (
                        <motion.div
                            key={challenge.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className={`p-4 rounded-xl border-2 transition-all ${challenge.completed
                                    ? 'bg-green-50 border-green-200'
                                    : getDifficultyBg(challenge.difficulty)
                                }`}
                        >
                            <div className="flex items-center gap-4">
                                {/* Icon */}
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${challenge.completed
                                        ? 'bg-green-500'
                                        : `bg-gradient-to-br ${getDifficultyColor(challenge.difficulty)}`
                                    }`}>
                                    {challenge.completed ? (
                                        <CheckCircle2 size={24} className="text-white" />
                                    ) : (
                                        <IconComponent size={24} className="text-white" />
                                    )}
                                </div>

                                {/* Details */}
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className={`font-bold ${challenge.completed ? 'text-green-700' : 'text-black'}`}>
                                            {challenge.title}
                                        </h3>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold capitalize ${challenge.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                                                challenge.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-red-100 text-red-700'
                                            }`}>
                                            {challenge.difficulty}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-2">{challenge.description}</p>

                                    {/* Progress bar */}
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${progress}%` }}
                                                className={`h-full ${challenge.completed
                                                        ? 'bg-green-500'
                                                        : `bg-gradient-to-r ${getDifficultyColor(challenge.difficulty)}`
                                                    }`}
                                                transition={{ duration: 0.5 }}
                                            />
                                        </div>
                                        <span className="text-xs font-bold text-gray-500 min-w-[50px] text-right">
                                            {challenge.progress}/{challenge.target}
                                        </span>
                                    </div>
                                </div>

                                {/* Reward */}
                                <div className="text-right">
                                    <div className={`flex items-center gap-1 ${challenge.completed ? 'text-green-600' : 'text-yellow-600'
                                        }`}>
                                        <Zap size={16} />
                                        <span className="font-black">{challenge.xpReward}</span>
                                    </div>
                                    <span className="text-xs text-gray-500">XP</span>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </motion.div>
    );
};

export default DailyChallenges;
