// src/components/modals/LevelModal.jsx - COMPACT PREMIUM
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Trophy, Target, Zap, Star, Award,
    CheckCircle2, Gift, Crown, Flame, Calendar, Medal
} from 'lucide-react';
import { useGamification } from '@gamification/hooks/useGamification';

const LevelModal = ({ isOpen, onClose }) => {
    const [confetti, setConfetti] = useState(false);
    const [prevLevel, setPrevLevel] = useState(null);

    const {
        xp,
        level,
        nextLevelXp,
        levelProgress,
        streak,
        dailyMissions,
        weeklyMissions,
        totalBadges,
        equippedTitle,
        globalRank,
        xpToNextLevel,
    } = useGamification();

    useEffect(() => {
        if (prevLevel !== null && level > prevLevel) {
            setConfetti(true);
            setTimeout(() => setConfetti(false), 3000);
        }
        setPrevLevel(level);
    }, [level, prevLevel]);

    if (!isOpen) return null;

    const allMissions = [...dailyMissions, ...weeklyMissions];

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    transition={{ type: "spring", damping: 30 }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative w-full max-w-3xl max-h-[85vh] overflow-y-auto bg-white rounded-xl shadow-2xl"
                >
                    {/* Confetti */}
                    {confetti && (
                        <div className="absolute inset-0 pointer-events-none overflow-hidden z-50 rounded-xl">
                            {[...Array(30)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ y: -20, x: `${Math.random() * 100}%`, opacity: 1 }}
                                    animate={{ y: '110vh', rotate: Math.random() * 360, opacity: 0 }}
                                    transition={{ duration: 2 + Math.random(), delay: Math.random() * 0.2 }}
                                    className="absolute w-1.5 h-1.5 rounded-full bg-gray-800"
                                />
                            ))}
                        </div>
                    )}

                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all z-20"
                    >
                        <X size={16} className="text-gray-900" />
                    </button>

                    {/* Compact Header */}
                    <div className="p-5 border-b border-gray-200">
                        <div className="flex items-center gap-4">
                            {/* Smaller Level Badge */}
                            <div className="relative">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center border-2 border-gray-200 shadow-lg">
                                    <div className="text-center">
                                        <div className="text-[10px] text-gray-400 font-bold uppercase">Level</div>
                                        <div className="text-2xl font-black text-white">{level}</div>
                                    </div>
                                </div>

                                {streak > 0 && (
                                    <div className="absolute -top-1 -right-1 px-2 py-0.5 bg-black rounded-full flex items-center gap-1 border border-white">
                                        <Flame size={10} className="text-white" />
                                        <span className="text-[10px] font-black text-white">{streak}</span>
                                    </div>
                                )}
                            </div>

                            {/* Compact Stats */}
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <h2 className="text-lg font-black text-gray-900">{equippedTitle}</h2>
                                    <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 rounded-full border border-blue-200">
                                        <Trophy size={10} className="text-blue-600" />
                                        <span className="text-[10px] text-blue-900 font-bold">#{globalRank}</span>
                                    </div>
                                </div>

                                <p className="text-xs text-gray-600 mb-2">
                                    <span className="font-bold text-gray-900">{xpToNextLevel.toLocaleString()} XP</span> to Level {level + 1}
                                </p>

                                {/* Compact Progress Bar */}
                                <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${levelProgress}%` }}
                                        transition={{ duration: 1, ease: "easeOut" }}
                                        className="h-full bg-gradient-to-r from-blue-600 to-blue-500"
                                    />
                                </div>
                                <div className="flex justify-between items-center mt-1">
                                    <span className="text-[10px] text-gray-500 font-medium">{xp.toLocaleString()} XP</span>
                                    <span className="text-[10px] text-gray-500 font-medium">{nextLevelXp.toLocaleString()} XP</span>
                                </div>
                            </div>

                            {/* Mini Stats */}
                            <div className="flex gap-2">
                                <div className="bg-gray-50 rounded-lg px-3 py-2 text-center border border-gray-200">
                                    <Medal size={12} className="text-gray-500 mx-auto mb-0.5" />
                                    <p className="text-xs font-black text-gray-900">{totalBadges}</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg px-3 py-2 text-center border border-gray-200">
                                    <Target size={12} className="text-gray-500 mx-auto mb-0.5" />
                                    <p className="text-xs font-black text-gray-900">{allMissions.length}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Compact Content */}
                    <div className="p-5 space-y-4">
                        {/* Missions Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            {/* Daily Missions */}
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
                                        <Target className="text-white" size={14} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-gray-900">Daily</h3>
                                        <p className="text-[10px] text-gray-500">Today's tasks</p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    {dailyMissions.length > 0 ? (
                                        dailyMissions.slice(0, 3).map((mission, idx) => (
                                            <MissionCard key={mission.id || idx} mission={mission} />
                                        ))
                                    ) : (
                                        <div className="text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                            <Calendar size={20} className="mx-auto mb-1 text-gray-400" />
                                            <p className="text-[10px] text-gray-500">No missions</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Weekly Challenges */}
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-7 h-7 bg-gray-800 rounded-lg flex items-center justify-center">
                                        <Trophy className="text-white" size={14} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-gray-900">Weekly</h3>
                                        <p className="text-[10px] text-gray-500">Long-term goals</p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    {weeklyMissions.length > 0 ? (
                                        weeklyMissions.slice(0, 3).map((mission, idx) => (
                                            <MissionCard key={mission.id || idx} mission={mission} />
                                        ))
                                    ) : (
                                        <div className="text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                            <Trophy size={20} className="mx-auto mb-1 text-gray-400" />
                                            <p className="text-[10px] text-gray-500">No challenges</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Compact Rewards */}
                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex items-center gap-2 mb-3">
                                <Gift className="text-gray-700" size={16} />
                                <h3 className="text-sm font-black text-gray-900">Next Level Rewards</h3>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                                <RewardCard icon={Crown} label="Title" />
                                <RewardCard icon={Zap} label="+100 XP" />
                                <RewardCard icon={Star} label="Badge" />
                                <RewardCard icon={Award} label="Effect" />
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

// Compact Mission Card
const MissionCard = ({ mission }) => {
    const progress = Math.min((mission.current / mission.target) * 100, 100);
    const isCompleted = mission.current >= mission.target;

    return (
        <motion.div
            whileHover={{ x: 2 }}
            className={`p-2.5 rounded-lg border transition-all ${
                isCompleted
                    ? 'bg-gray-100 border-gray-300'
                    : 'bg-white border-gray-200 hover:border-blue-200 hover:bg-blue-50/30'
            }`}
        >
            <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-gray-900 truncate flex items-center gap-1">
                        {mission.title || 'Mystery Mission'}
                        {isCompleted && <CheckCircle2 size={10} className="text-gray-900 flex-shrink-0" />}
                    </h4>
                    <p className="text-[10px] text-gray-600 truncate">
                        {mission.description || 'Complete to earn rewards'}
                    </p>
                </div>

                {!isCompleted && (
                    <div className="flex items-center gap-1 text-[10px] font-black bg-black text-white px-1.5 py-0.5 rounded ml-2 flex-shrink-0">
                        <Zap size={8} />
                        +{mission.xpReward || 50}
                    </div>
                )}
            </div>

            {/* Mini Progress Bar */}
            <div className="relative h-1 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className={`h-full ${
                        isCompleted ? 'bg-gray-900' : 'bg-blue-600'
                    }`}
                />
            </div>

            <div className="flex justify-between items-center mt-1">
                <span className="text-[10px] text-gray-500 font-medium">
                    {mission.current || 0}/{mission.target || 0}
                </span>
                <span className="text-[10px] text-gray-900 font-bold">{Math.round(progress)}%</span>
            </div>
        </motion.div>
    );
};

// Compact Reward Card
const RewardCard = ({ icon: Icon, label }) => {
    return (
        <motion.div
            whileHover={{ y: -2 }}
            className="p-2 bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg text-center shadow-md relative overflow-hidden"
        >
            <div className="w-8 h-8 mx-auto mb-1 rounded-lg bg-white/10 flex items-center justify-center">
                <Icon className="text-white" size={14} />
            </div>
            <p className="text-[9px] text-white font-bold uppercase tracking-wide">{label}</p>
        </motion.div>
    );
};

export default LevelModal;
