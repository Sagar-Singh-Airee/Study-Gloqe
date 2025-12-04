// EPIC LEVEL MODAL - Opens when clicking level badge
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Trophy, Target, Zap, Star, TrendingUp, Award,
    CheckCircle2, Lock, Gift, Crown, Flame, Calendar
} from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@config/firebase';
import { useAuth } from '@contexts/AuthContext';

const LevelModal = ({ isOpen, onClose }) => {
    const { user } = useAuth();
    const [userData, setUserData] = useState(null);
    const [missions, setMissions] = useState([]);
    const [confetti, setConfetti] = useState(false);

    // Real-time user data listener
    useEffect(() => {
        if (!user?.uid) return;

        const unsubscribe = onSnapshot(
            doc(db, 'users', user.uid),
            (doc) => {
                const data = doc.data();
                setUserData(data);

                // Check if level just increased
                if (data?.levelUp) {
                    setConfetti(true);
                    setTimeout(() => setConfetti(false), 3000);
                }
            }
        );

        return () => unsubscribe();
    }, [user]);

    // Real-time missions listener
    useEffect(() => {
        if (!user?.uid) return;

        const unsubscribe = onSnapshot(
            doc(db, 'gamification', user.uid),
            (doc) => {
                const data = doc.data();
                setMissions(data?.missions || []);
            }
        );

        return () => unsubscribe();
    }, [user]);

    if (!isOpen) return null;

    // Use consistent level thresholds from gamificationService
    const levelThresholds = [0, 100, 250, 500, 1000, 2000, 4000, 8000, 16000];

    const xp = userData?.xp || 0;
    const level = userData?.level || 1;
    const xpForNextLevel = levelThresholds[level] || levelThresholds[levelThresholds.length - 1];
    const previousLevelXp = levelThresholds[level - 1] || 0;
    const xpProgress = xpForNextLevel ? ((xp - previousLevelXp) / (xpForNextLevel - previousLevelXp)) * 100 : 0;
    const streak = userData?.streak || 0;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-gray-900 via-black to-gray-900 rounded-2xl border border-gray-800 shadow-2xl"
                >
                    {/* Confetti Effect */}
                    {confetti && (
                        <div className="absolute inset-0 pointer-events-none overflow-hidden">
                            {[...Array(50)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ y: -20, x: Math.random() * 100 + '%', opacity: 1 }}
                                    animate={{
                                        y: '100vh',
                                        rotate: Math.random() * 360,
                                        opacity: 0
                                    }}
                                    transition={{ duration: 2 + Math.random(), delay: Math.random() * 0.5 }}
                                    className="absolute w-3 h-3 bg-gradient-to-br from-white to-gray-400 rounded-full"
                                />
                            ))}
                        </div>
                    )}

                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors z-10"
                    >
                        <X size={20} className="text-white" />
                    </button>

                    {/* Header */}
                    <div className="p-6 border-b border-gray-800">
                        <div className="flex items-center gap-4">
                            {/* Level Badge */}
                            <div className="relative">
                                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-700 to-black flex items-center justify-center border-4 border-white/20">
                                    <div className="text-center">
                                        <div className="text-xs text-gray-400 font-medium">LEVEL</div>
                                        <div className="text-3xl font-bold text-white">{level}</div>
                                    </div>
                                </div>

                                {/* Streak Indicator */}
                                {streak > 0 && (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="absolute -top-2 -right-2 px-2 py-1 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center gap-1"
                                    >
                                        <Flame size={14} className="text-white" />
                                        <span className="text-xs font-bold text-white">{streak}</span>
                                    </motion.div>
                                )}
                            </div>

                            {/* User Info */}
                            <div className="flex-1">
                                <h2 className="text-2xl font-bold text-white mb-2">
                                    Level {level} Scholar
                                </h2>
                                <p className="text-gray-400 text-sm mb-3">
                                    {xpForNextLevel - xp} XP to Level {level + 1}
                                </p>

                                {/* XP Progress Bar */}
                                <div className="relative h-3 bg-gray-800 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${xpProgress}%` }}
                                        transition={{ duration: 1, ease: "easeOut" }}
                                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-white to-gray-400 rounded-full"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-black">
                                        {xp} / {xpForNextLevel} XP
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content Grid */}
                    <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Daily Missions */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <Target className="text-white" size={20} />
                                <h3 className="text-lg font-bold text-white">Daily Missions</h3>
                            </div>

                            <div className="space-y-3">
                                {missions.filter(m => m.type === 'daily').map((mission) => (
                                    <MissionCard key={mission.id} mission={mission} />
                                ))}
                            </div>
                        </div>

                        {/* Weekly Challenges */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <Trophy className="text-white" size={20} />
                                <h3 className="text-lg font-bold text-white">Weekly Challenges</h3>
                            </div>

                            <div className="space-y-3">
                                {missions.filter(m => m.type === 'weekly').map((mission) => (
                                    <MissionCard key={mission.id} mission={mission} />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Level Rewards Preview */}
                    <div className="p-6 border-t border-gray-800">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Gift className="text-white" size={20} />
                            Next Level Rewards
                        </h3>
                        <div className="grid grid-cols-3 gap-4">
                            <RewardCard icon={Crown} label="Elite Badge" />
                            <RewardCard icon={Zap} label="+50 XP Boost" />
                            <RewardCard icon={Star} label="Special Title" />
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

// Mission Card Component
const MissionCard = ({ mission }) => {
    const progress = (mission.current / mission.target) * 100;
    const isCompleted = mission.current >= mission.target;

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`p-4 rounded-lg border ${isCompleted
                    ? 'bg-white/5 border-white/20'
                    : 'bg-gray-800/50 border-gray-700'
                }`}
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                    <h4 className="text-white font-semibold text-sm mb-1">
                        {mission.title}
                    </h4>
                    <p className="text-gray-400 text-xs">{mission.description}</p>
                </div>

                {isCompleted ? (
                    <CheckCircle2 className="text-white flex-shrink-0" size={20} />
                ) : (
                    <div className="flex items-center gap-1 text-white text-xs font-bold bg-gray-700 px-2 py-1 rounded">
                        <Zap size={12} />
                        +{mission.xpReward}
                    </div>
                )}
            </div>

            {/* Progress Bar */}
            <div className="relative h-2 bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className={`absolute inset-y-0 left-0 rounded-full ${isCompleted
                            ? 'bg-gradient-to-r from-white to-gray-400'
                            : 'bg-gradient-to-r from-gray-500 to-gray-600'
                        }`}
                />
            </div>

            <div className="mt-2 text-xs text-gray-400 text-right">
                {mission.current} / {mission.target}
            </div>
        </motion.div>
    );
};

// Reward Card Component
const RewardCard = ({ icon: Icon, label }) => {
    return (
        <div className="p-4 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg border border-gray-700 text-center">
            <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-white/10 flex items-center justify-center">
                <Icon className="text-white" size={24} />
            </div>
            <p className="text-xs text-gray-300 font-medium">{label}</p>
        </div>
    );
};

export default LevelModal;
