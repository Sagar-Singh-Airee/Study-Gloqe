// src/components/features/AchievementsSection.jsx - ULTIMATE PREMIUM VERSION
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Trophy, Award, Gift, Crown, Star, Zap, BookOpen, Target, Lock,
    TrendingUp, Calendar, Flame, Medal, Sparkles
} from 'lucide-react';
import { useGamification } from '@/hooks/useGamification';

// --- UsersIcon Component ---
function UsersIcon({ className }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    );
}

// --- ICONS MAPPING ---
const IconMap = {
    Zap: Zap,
    Star: Star,
    BookOpen: BookOpen,
    Target: Target,
    UsersIcon: UsersIcon,
    Crown: Crown,
    Trophy: Trophy
};

// --- SHINE EFFECT COMPONENT ---
const ShineEffect = () => (
    <motion.div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"
        initial={{ x: '-100%' }}
        whileHover={{ x: '100%' }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
    >
        <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12" />
    </motion.div>
);

// --- PARTICLE BACKGROUND ---
const ParticleBackground = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
            <motion.div
                key={i}
                className="absolute w-1 h-1 bg-white/20 rounded-full"
                initial={{
                    x: Math.random() * 100 + '%',
                    y: Math.random() * 100 + '%',
                }}
                animate={{
                    y: [Math.random() * 100 + '%', Math.random() * 100 + '%'],
                    opacity: [0.2, 0.8, 0.2],
                }}
                transition={{
                    duration: Math.random() * 10 + 10,
                    repeat: Infinity,
                    ease: "linear"
                }}
            />
        ))}
    </div>
);

const AchievementsSection = () => {
    const [activeTab, setActiveTab] = useState('badges');

    const {
        xp,
        level,
        nextLevelXp,
        levelProgress,
        globalRank,
        streak,
        totalBadges,
        equippedTitle,
        allBadges,
        allTitles,
        loading,
        changeTitle,
        xpToNextLevel,
        badgeCompletionRate
    } = useGamification();

    const handleEquipTitle = async (titleId) => {
        const result = await changeTitle(titleId);
        if (!result.success) {
            console.error('Failed to equip title:', result.error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center"
                >
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="w-16 h-16 border-4 border-gray-200 border-t-gray-900 rounded-full mx-auto mb-6"
                    />
                    <p className="text-gray-600 font-semibold text-lg">Loading your achievements...</p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-12">
            {/* Hero Header with Level Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative bg-gradient-to-br from-gray-950 via-gray-900 to-black rounded-3xl p-8 md:p-12 text-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] border border-white/5 overflow-hidden"
            >
                {/* Animated Background */}
                <ParticleBackground />
                
                {/* Glowing Orbs */}
                <motion.div
                    animate={{ 
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.5, 0.3]
                    }}
                    transition={{ duration: 8, repeat: Infinity }}
                    className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-3xl"
                />
                <motion.div
                    animate={{ 
                        scale: [1.2, 1, 1.2],
                        opacity: [0.2, 0.4, 0.2]
                    }}
                    transition={{ duration: 10, repeat: Infinity }}
                    className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-indigo-500/20 to-cyan-500/20 rounded-full blur-3xl"
                />

                <div className="relative z-10">
                    <div className="grid md:grid-cols-2 gap-8 items-center">
                        {/* Left: User Info */}
                        <div>
                            <motion.div 
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 }}
                                className="flex items-center gap-3 mb-4"
                            >
                                <span className="px-4 py-1.5 bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-300 text-black rounded-full text-sm font-black tracking-wider uppercase shadow-[0_0_30px_rgba(250,204,21,0.5)]">
                                    Level {level}
                                </span>
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 backdrop-blur-xl rounded-full border border-white/10">
                                    <Trophy size={16} className="text-yellow-400" />
                                    <span className="text-sm font-bold">Rank #{globalRank}</span>
                                </div>
                            </motion.div>

                            <motion.h1 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="text-5xl md:text-6xl font-black mb-3 bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent leading-tight"
                            >
                                My Journey
                            </motion.h1>

                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.4 }}
                                className="flex items-center gap-2 text-gray-400"
                            >
                                <Crown size={18} className="text-yellow-500" />
                                <span className="text-sm">Current Title:</span>
                                <span className="text-white font-bold">{equippedTitle}</span>
                            </motion.div>

                            {/* Stats Grid */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                                className="grid grid-cols-3 gap-4 mt-6"
                            >
                                <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Flame size={16} className="text-orange-500" />
                                        <span className="text-xs text-gray-400 font-semibold uppercase">Streak</span>
                                    </div>
                                    <p className="text-2xl font-black">{streak} Days</p>
                                </div>
                                <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Medal size={16} className="text-blue-400" />
                                        <span className="text-xs text-gray-400 font-semibold uppercase">Badges</span>
                                    </div>
                                    <p className="text-2xl font-black">{totalBadges}</p>
                                </div>
                                <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                                    <div className="flex items-center gap-2 mb-2">
                                        <TrendingUp size={16} className="text-green-400" />
                                        <span className="text-xs text-gray-400 font-semibold uppercase">Rate</span>
                                    </div>
                                    <p className="text-2xl font-black">{badgeCompletionRate}%</p>
                                </div>
                            </motion.div>
                        </div>

                        {/* Right: XP Progress */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 }}
                            className="bg-white/5 backdrop-blur-2xl p-6 rounded-3xl border border-white/10 shadow-2xl"
                        >
                            <div className="flex justify-between items-end mb-4">
                                <div>
                                    <p className="text-sm text-gray-400 font-semibold uppercase tracking-wider mb-1">Experience</p>
                                    <p className="text-4xl font-black">{xp.toLocaleString()}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-gray-500 font-medium">Next Level</p>
                                    <p className="text-2xl font-bold text-gray-300">{nextLevelXp.toLocaleString()}</p>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="relative h-4 bg-gray-800/50 rounded-full overflow-hidden border border-white/10">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${levelProgress}%` }}
                                    transition={{ duration: 1.5, ease: "easeOut", delay: 0.6 }}
                                    className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 relative"
                                >
                                    <motion.div
                                        animate={{ x: ['0%', '100%'] }}
                                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                                    />
                                </motion.div>
                            </div>

                            <p className="text-xs text-right mt-3 text-gray-400 font-semibold">
                                <span className="text-white font-bold">{xpToNextLevel.toLocaleString()} XP</span> to Level {level + 1}
                            </p>
                        </motion.div>
                    </div>
                </div>
            </motion.div>

            {/* Tabs */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-2xl p-2 shadow-sm border border-gray-200"
            >
                <div className="flex gap-2">
                    {['badges', 'gifts', 'titles'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 px-6 py-3 font-bold text-sm transition-all rounded-xl relative flex items-center justify-center gap-2 ${
                                activeTab === tab
                                    ? 'text-white bg-gradient-to-r from-gray-900 to-gray-800 shadow-lg'
                                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                        >
                            {tab === 'badges' && <Award size={18} />}
                            {tab === 'gifts' && <Gift size={18} />}
                            {tab === 'titles' && <Crown size={18} />}
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>
            </motion.div>

            {/* Content Area */}
            <div className="min-h-[500px]">
                <AnimatePresence mode="wait">
                    {/* BADGES TAB */}
                    {activeTab === 'badges' && (
                        <motion.div
                            key="badges"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.4 }}
                            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                        >
                            {allBadges.length > 0 ? allBadges.map((badge, idx) => {
                                const Icon = IconMap[badge.iconName] || Star;
                                
                                return (
                                    <motion.div
                                        key={badge.id}
                                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05, type: "spring" }}
                                        whileHover={{ y: -8, scale: 1.02 }}
                                        className={`relative p-6 rounded-3xl border transition-all group overflow-hidden ${
                                            badge.unlocked
                                                ? 'bg-white border-gray-200 shadow-lg hover:shadow-2xl'
                                                : 'bg-gray-50 border-dashed border-gray-300 opacity-60'
                                        }`}
                                    >
                                        {badge.unlocked && (
                                            <>
                                                <ShineEffect />
                                                <div className={`absolute inset-0 bg-gradient-to-br ${badge.color || 'from-yellow-100/50 to-orange-100/50'} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                                            </>
                                        )}

                                        <div className="flex flex-col items-center text-center relative z-10">
                                            <motion.div
                                                whileHover={{ rotate: [0, -10, 10, -10, 0], scale: 1.1 }}
                                                transition={{ duration: 0.5 }}
                                                className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-lg ${
                                                    badge.unlocked 
                                                        ? 'bg-gradient-to-br from-gray-900 to-gray-800 text-white' 
                                                        : 'bg-gray-200 text-gray-400'
                                                }`}
                                            >
                                                {badge.unlocked ? (
                                                    <Icon size={28} strokeWidth={2.5} />
                                                ) : (
                                                    <Lock size={24} />
                                                )}
                                            </motion.div>

                                            <h3 className="font-black text-base mb-2 leading-tight">{badge.name}</h3>
                                            <p className="text-xs text-gray-500 leading-relaxed">{badge.desc}</p>

                                            {badge.unlocked && (
                                                <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    className="absolute top-3 right-3 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg"
                                                >
                                                    <Sparkles size={14} className="text-white" />
                                                </motion.div>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            }) : (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="col-span-full bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl p-16 text-center border-2 border-dashed border-gray-300"
                                >
                                    <Award size={64} className="mx-auto mb-6 text-gray-300" />
                                    <h3 className="text-xl font-bold text-gray-600 mb-2">No Badges Yet</h3>
                                    <p className="text-gray-500">Complete activities to earn your first badge!</p>
                                </motion.div>
                            )}
                        </motion.div>
                    )}

                    {/* GIFTS TAB */}
                    {activeTab === 'gifts' && (
                        <motion.div
                            key="gifts"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
                        >
                            <motion.div
                                initial={{ scale: 0.9 }}
                                animate={{ scale: 1 }}
                                className="col-span-full bg-gradient-to-br from-gray-50 to-white rounded-3xl p-16 flex flex-col items-center justify-center text-center border-2 border-dashed border-gray-200"
                            >
                                <motion.div
                                    animate={{ 
                                        y: [0, -10, 0],
                                        rotate: [0, 5, -5, 0]
                                    }}
                                    transition={{ duration: 3, repeat: Infinity }}
                                    className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mb-6 shadow-inner"
                                >
                                    <Gift size={36} className="text-gray-400" />
                                </motion.div>
                                <h3 className="text-2xl font-black text-gray-700 mb-2">No Gifts Yet</h3>
                                <p className="text-gray-500 max-w-md">
                                    Impress your teachers with great work to receive special gifts and rewards!
                                </p>
                            </motion.div>
                        </motion.div>
                    )}

                    {/* TITLES TAB */}
                    {activeTab === 'titles' && (
                        <motion.div
                            key="titles"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="space-y-3"
                        >
                            {allTitles.length > 0 ? allTitles.map((title, idx) => {
                                const isUnlocked = title.unlocked;
                                const isEquipped = equippedTitle === title.text;

                                return (
                                    <motion.div
                                        key={title.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        whileHover={{ x: 4, scale: 1.01 }}
                                        className={`flex items-center justify-between p-5 rounded-2xl border transition-all group ${
                                            isUnlocked
                                                ? 'bg-white border-gray-200 shadow-sm hover:shadow-lg'
                                                : 'bg-gray-50 border-gray-200 opacity-60'
                                        } ${isEquipped ? 'ring-2 ring-black ring-offset-2 shadow-xl' : ''}`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <motion.div
                                                whileHover={{ rotate: 360 }}
                                                transition={{ duration: 0.6 }}
                                                className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-md ${
                                                    isUnlocked 
                                                        ? 'bg-gradient-to-br from-gray-900 to-gray-800 text-white' 
                                                        : 'bg-gray-200 text-gray-400'
                                                }`}
                                            >
                                                {isUnlocked ? <Crown size={24} /> : <Lock size={20} />}
                                            </motion.div>
                                            <div>
                                                <h3 className={`font-black text-base ${!isUnlocked && 'text-gray-400'}`}>
                                                    {title.text}
                                                </h3>
                                                <p className="text-xs text-gray-500 mt-1 font-medium">
                                                    {isUnlocked
                                                        ? isEquipped 
                                                            ? '✨ Currently equipped' 
                                                            : 'Available to equip'
                                                        : `🔒 Unlocks at Level ${title.requiredLevel || 1}`}
                                                </p>
                                            </div>
                                        </div>

                                        {isUnlocked && !isEquipped && (
                                            <motion.button
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => handleEquipTitle(title.id)}
                                                className="px-5 py-2.5 bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-800 hover:to-black text-white text-xs font-bold rounded-xl transition-all shadow-lg"
                                            >
                                                Equip
                                            </motion.button>
                                        )}
                                        {isEquipped && (
                                            <span className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg">
                                                <Sparkles size={14} />
                                                Active
                                            </span>
                                        )}
                                    </motion.div>
                                );
                            }) : (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl p-16 text-center border-2 border-dashed border-gray-300"
                                >
                                    <Crown size={64} className="mx-auto mb-6 text-gray-300" />
                                    <h3 className="text-xl font-bold text-gray-600 mb-2">No Titles Available</h3>
                                    <p className="text-gray-500">Level up to unlock prestigious titles!</p>
                                </motion.div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default AchievementsSection;
