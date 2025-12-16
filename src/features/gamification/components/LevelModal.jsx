// src/gamification/components/LevelModal.jsx - ✅ REDESIGNED COMPACT VERSION
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Trophy, Target, Zap, Star, Award,
    CheckCircle2, Gift, Crown, Flame, Calendar, Medal,
    Sparkles, TrendingUp, BookOpen, Clock, ArrowRight
} from 'lucide-react';
import { useGamification } from '@gamification/hooks/useGamification';
import { TITLE_DEFINITIONS, BADGE_DEFINITIONS } from '@gamification/services/gamificationService';
import Confetti from 'react-confetti';

const LevelModal = ({ isOpen, onClose, levelUpData = null }) => {
    const [showBigConfetti, setShowBigConfetti] = useState(false);
    const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

    const {
        xp = 0,
        level = 1,
        nextLevelXp = 100,
        levelProgress = 0,
        streak = 0,
        dailyMissions = [],
        weeklyMissions = [],
        totalBadges = 0,
        equippedTitle = 'Novice Learner',
        globalRank = '--',
        xpToNextLevel = 100,
        loading = false,
        allBadges = [],
        allTitles = []
    } = useGamification();

    useEffect(() => {
        const updateWindowSize = () => {
            setWindowSize({
                width: window.innerWidth,
                height: window.innerHeight
            });
        };

        updateWindowSize();
        window.addEventListener('resize', updateWindowSize);
        return () => window.removeEventListener('resize', updateWindowSize);
    }, []);

    useEffect(() => {
        if (isOpen && levelUpData) {
            setShowBigConfetti(true);
            const timer = setTimeout(() => setShowBigConfetti(false), 5000);
            return () => clearTimeout(timer);
        }
    }, [isOpen, levelUpData]);

    // Get next unlockable rewards
    const getNextRewards = () => {
        const nextLevel = level + 1;
        
        const nextTitle = Object.values(TITLE_DEFINITIONS)
            .filter(t => t.requiredLevel === nextLevel)
            .sort((a, b) => a.requiredLevel - b.requiredLevel)[0];

        const nextBadge = Object.values(BADGE_DEFINITIONS)
            .filter(b => b.requirement.type === 'level' && b.requirement.value === nextLevel)[0];

        return { nextTitle, nextBadge };
    };

    const { nextTitle, nextBadge } = getNextRewards();

    // Calculate completion stats
    const totalMissions = [...dailyMissions, ...weeklyMissions];
    const completedMissions = totalMissions.filter(m => m.current >= m.target).length;
    const completionRate = totalMissions.length > 0 
        ? Math.round((completedMissions / totalMissions.length) * 100) 
        : 0;

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            >
                {showBigConfetti && (
                    <Confetti
                        width={windowSize.width}
                        height={windowSize.height}
                        recycle={false}
                        numberOfPieces={300}
                        gravity={0.3}
                        colors={['#000000', '#333333', '#666666', '#999999', '#CCCCCC', '#FFFFFF']}
                    />
                )}

                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 10 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden bg-white rounded-2xl shadow-2xl"
                >
                    {/* Level up banner */}
                    {levelUpData && (
                        <motion.div
                            initial={{ y: -100, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3, type: 'spring' }}
                            className="absolute top-0 left-0 right-0 z-30 p-3 bg-gradient-to-r from-black via-gray-900 to-black border-b-4 border-white"
                        >
                            <div className="flex items-center justify-center gap-3">
                                <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
                                    <Sparkles size={20} className="text-yellow-400" />
                                </motion.div>
                                <div className="text-center">
                                    <p className="text-white font-black text-lg">LEVEL UP!</p>
                                    <p className="text-gray-300 text-xs">You reached Level {levelUpData.newLevel}</p>
                                </div>
                                <motion.div animate={{ rotate: [0, -360] }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
                                    <Trophy size={20} className="text-yellow-400" />
                                </motion.div>
                            </div>
                        </motion.div>
                    )}

                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-3 right-3 p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all z-40"
                    >
                        <X size={16} className="text-gray-900" />
                    </button>

                    {/* Scrollable content */}
                    <div className={`overflow-y-auto max-h-[85vh] ${levelUpData ? 'pt-16' : ''}`}>
                        {/* Compact Header */}
                        <div className="p-5 bg-gradient-to-br from-gray-900 to-gray-800 text-white">
                            <div className="flex items-center gap-4">
                                {/* Level Badge */}
                                <div className="relative flex-shrink-0">
                                    <motion.div
                                        className="w-16 h-16 rounded-full bg-gradient-to-br from-white to-gray-100 flex items-center justify-center border-4 border-gray-700 shadow-xl"
                                        animate={levelUpData ? { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] } : {}}
                                        transition={{ duration: 0.5 }}
                                    >
                                        <div className="text-center">
                                            <div className="text-[9px] text-gray-500 font-bold uppercase">Level</div>
                                            <div className="text-2xl font-black text-gray-900">{level}</div>
                                        </div>
                                    </motion.div>

                                    {streak > 0 && (
                                        <motion.div
                                            className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center gap-1 border-2 border-white shadow-md"
                                            animate={{ scale: [1, 1.1, 1] }}
                                            transition={{ duration: 1.5, repeat: Infinity }}
                                        >
                                            <Flame size={10} className="text-white" />
                                            <span className="text-xs font-black text-white">{streak}</span>
                                        </motion.div>
                                    )}
                                </div>

                                {/* Stats */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h2 className="text-lg font-black truncate">{equippedTitle}</h2>
                                        {globalRank !== '--' && (
                                            <div className="flex items-center gap-1 px-2 py-0.5 bg-white/20 rounded-full border border-white/30">
                                                <Trophy size={10} className="text-yellow-400" />
                                                <span className="text-xs font-bold">#{globalRank}</span>
                                            </div>
                                        )}
                                    </div>

                                    <p className="text-xs text-gray-300 mb-2">
                                        <span className="font-bold text-white">{xpToNextLevel.toLocaleString()} XP</span> to Level {level + 1}
                                    </p>

                                    {/* Progress Bar */}
                                    <div className="relative h-2 bg-white/20 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${levelProgress}%` }}
                                            transition={{ duration: 1, ease: "easeOut" }}
                                            className="h-full bg-gradient-to-r from-blue-400 via-blue-500 to-blue-400 relative"
                                        >
                                            <motion.div
                                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                                                animate={{ x: ['-100%', '200%'] }}
                                                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                                            />
                                        </motion.div>
                                    </div>
                                    <div className="flex justify-between mt-1">
                                        <span className="text-[10px] text-gray-400 font-semibold">{xp.toLocaleString()} XP</span>
                                        <span className="text-[10px] text-gray-400 font-semibold">{nextLevelXp.toLocaleString()} XP</span>
                                    </div>
                                </div>

                                {/* Quick Stats */}
                                <div className="flex gap-2">
                                    <div className="bg-white/10 backdrop-blur-sm rounded-lg px-2.5 py-2 text-center border border-white/20">
                                        <Medal size={14} className="text-yellow-400 mx-auto mb-0.5" />
                                        <p className="text-xs font-black">{totalBadges}</p>
                                        <p className="text-[8px] text-gray-300 font-semibold">Badges</p>
                                    </div>
                                    <div className="bg-white/10 backdrop-blur-sm rounded-lg px-2.5 py-2 text-center border border-white/20">
                                        <Target size={14} className="text-green-400 mx-auto mb-0.5" />
                                        <p className="text-xs font-black">{completionRate}%</p>
                                        <p className="text-[8px] text-gray-300 font-semibold">Done</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-4 space-y-4">
                            {/* Daily Tasks */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-md">
                                            <Target className="text-white" size={14} />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black text-gray-900">Daily Tasks</h3>
                                            <p className="text-[10px] text-gray-500">
                                                {dailyMissions.filter(m => m.current >= m.target).length}/{dailyMissions.length} completed
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-xs font-bold text-gray-500">
                                        <Clock size={12} className="inline mr-1" />
                                        Reset in 24h
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    {dailyMissions.length > 0 ? (
                                        dailyMissions.map((mission, idx) => (
                                            <CompactMissionCard key={mission.id || idx} mission={mission} />
                                        ))
                                    ) : (
                                        <div className="text-center py-4 bg-gray-50 rounded-lg border border-gray-200">
                                            <Calendar size={24} className="mx-auto mb-1 text-gray-300" />
                                            <p className="text-xs font-semibold text-gray-500">No daily tasks available</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Weekly Challenges */}
                            {weeklyMissions.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-7 h-7 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg flex items-center justify-center shadow-md">
                                            <Trophy className="text-white" size={14} />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black text-gray-900">Weekly Challenges</h3>
                                            <p className="text-[10px] text-gray-500">
                                                {weeklyMissions.filter(m => m.current >= m.target).length}/{weeklyMissions.length} completed
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        {weeklyMissions.map((mission, idx) => (
                                            <CompactMissionCard key={mission.id || idx} mission={mission} />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Next Level Rewards */}
                            <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <Gift className="text-gray-700" size={16} />
                                        <h3 className="text-sm font-black text-gray-900">Level {level + 1} Rewards</h3>
                                    </div>
                                    <span className="text-xs font-bold text-gray-500">{xpToNextLevel} XP away</span>
                                </div>
                                
                                <div className="grid grid-cols-4 gap-2">
                                    {nextTitle ? (
                                        <CompactRewardCard icon={Crown} label={nextTitle.text.split(' ')[0]} active />
                                    ) : (
                                        <CompactRewardCard icon={Crown} label="Title" />
                                    )}
                                    <CompactRewardCard icon={Zap} label="+100 XP" active />
                                    {nextBadge ? (
                                        <CompactRewardCard icon={Star} label={nextBadge.name.split(' ')[0]} active />
                                    ) : (
                                        <CompactRewardCard icon={Star} label="Badge" />
                                    )}
                                    <CompactRewardCard icon={TrendingUp} label="Rank Up" active />
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

// ✅ Compact Mission Card
const CompactMissionCard = ({ mission }) => {
    const progress = mission.current && mission.target 
        ? Math.min((mission.current / mission.target) * 100, 100)
        : 0;
    const isCompleted = mission.current >= mission.target;

    return (
        <motion.div
            whileHover={{ x: 2 }}
            className={`p-2.5 rounded-lg border transition-all ${
                isCompleted
                    ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
                    : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm'
            }`}
        >
            <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    {isCompleted ? (
                        <CheckCircle2 size={14} className="text-green-600 flex-shrink-0" />
                    ) : (
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-300 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-gray-900 truncate">{mission.title || 'Mission'}</h4>
                        <p className="text-[10px] text-gray-500 truncate">{mission.description || 'Complete this mission'}</p>
                    </div>
                </div>

                {!isCompleted && mission.xpReward && (
                    <div className="flex items-center gap-0.5 text-[10px] font-black bg-gray-900 text-white px-1.5 py-0.5 rounded flex-shrink-0">
                        <Zap size={8} />
                        {mission.xpReward}
                    </div>
                )}
            </div>

            {/* Progress Bar */}
            <div className="flex items-center gap-2">
                <div className="relative h-1.5 bg-gray-200 rounded-full overflow-hidden flex-1">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className={`h-full ${
                            isCompleted
                                ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                                : 'bg-gradient-to-r from-blue-500 to-blue-600'
                        }`}
                    />
                </div>
                <span className="text-[10px] text-gray-500 font-bold min-w-[40px] text-right">
                    {mission.current || 0}/{mission.target || 0}
                </span>
            </div>
        </motion.div>
    );
};

// ✅ Compact Reward Card
const CompactRewardCard = ({ icon: Icon, label, active = false }) => {
    return (
        <motion.div
            whileHover={{ y: -2, scale: 1.05 }}
            className={`p-2 rounded-lg text-center transition-all ${
                active
                    ? 'bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 shadow-md'
                    : 'bg-gray-200 border border-gray-300 opacity-50'
            }`}
        >
            <div className={`w-7 h-7 mx-auto mb-1 rounded-md ${
                active ? 'bg-white/10' : 'bg-gray-400/20'
            } flex items-center justify-center`}>
                <Icon className={active ? 'text-white' : 'text-gray-600'} size={14} />
            </div>
            <p className={`text-[9px] font-black uppercase tracking-wide truncate ${
                active ? 'text-white' : 'text-gray-600'
            }`}>
                {label}
            </p>
        </motion.div>
    );
};

export default LevelModal;
