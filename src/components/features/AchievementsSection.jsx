// src/components/features/AchievementsSection.jsx - PREMIUM CONTRAST-FIXED
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Trophy, Award, Gift, Crown, Star, Zap, BookOpen, Target, Lock,
    TrendingUp, Flame, Medal, Sparkles, ArrowRight, Info
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
    Trophy: Trophy,
    Award: Award,
    Medal: Medal,
    Flame: Flame
};

// --- PARTICLE BACKGROUND ---
const ParticleBackground = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-50">
        {[...Array(15)].map((_, i) => (
            <motion.div
                key={i}
                className="absolute w-1 h-1 bg-white/30 rounded-full"
                initial={{
                    x: Math.random() * 100 + '%',
                    y: Math.random() * 100 + '%',
                }}
                animate={{
                    y: [Math.random() * 100 + '%', Math.random() * 100 + '%'],
                    opacity: [0.3, 0.7, 0.3],
                }}
                transition={{
                    duration: Math.random() * 8 + 8,
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
        badgeCompletionRate,
        syncing
    } = useGamification();

    const handleEquipTitle = async (titleId) => {
        const result = await changeTitle(titleId);
        if (!result.success) {
            console.error('Failed to equip title:', result.error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center"
                >
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="w-20 h-20 border-4 border-gray-200 border-t-black rounded-full mx-auto mb-6"
                    />
                    <p className="text-gray-900 font-bold text-xl">Loading Achievements...</p>
                    <p className="text-gray-500 text-sm mt-2">Syncing your progress</p>
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
                className="relative bg-gradient-to-br from-gray-950 via-gray-900 to-black rounded-3xl p-8 md:p-12 text-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)] border border-white/10 overflow-hidden"
            >
                {/* Animated Background */}
                <ParticleBackground />
                
                {/* Glowing Orbs */}
                <motion.div
                    animate={{ 
                        scale: [1, 1.2, 1],
                        opacity: [0.2, 0.4, 0.2]
                    }}
                    transition={{ duration: 8, repeat: Infinity }}
                    className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-3xl"
                />
                <motion.div
                    animate={{ 
                        scale: [1.2, 1, 1.2],
                        opacity: [0.15, 0.3, 0.15]
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
                                className="flex items-center gap-3 mb-4 flex-wrap"
                            >
                                <span className="px-5 py-2 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-200 text-black rounded-full text-sm font-black tracking-wider uppercase shadow-[0_0_30px_rgba(250,204,21,0.6)]">
                                    Level {level}
                                </span>
                                <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-xl rounded-full border border-white/20">
                                    <Trophy size={16} className="text-yellow-400" />
                                    <span className="text-sm font-bold text-white">Rank #{globalRank}</span>
                                </div>
                            </motion.div>

                            <motion.h1 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="text-5xl md:text-6xl font-black mb-4 bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent leading-tight"
                            >
                                My Journey
                            </motion.h1>

                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.4 }}
                                className="flex items-center gap-2 mb-6"
                            >
                                <Crown size={18} className="text-yellow-400" />
                                <span className="text-sm text-gray-300">Current Title:</span>
                                <span className="text-white font-bold">{equippedTitle}</span>
                            </motion.div>

                            {/* Stats Grid */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                                className="grid grid-cols-3 gap-3"
                            >
                                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Flame size={16} className="text-orange-400" />
                                        <span className="text-xs text-gray-300 font-semibold uppercase">Streak</span>
                                    </div>
                                    <p className="text-2xl font-black text-white">{streak} Days</p>
                                </div>
                                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Medal size={16} className="text-blue-400" />
                                        <span className="text-xs text-gray-300 font-semibold uppercase">Badges</span>
                                    </div>
                                    <p className="text-2xl font-black text-white">{totalBadges}</p>
                                </div>
                                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                                    <div className="flex items-center gap-2 mb-2">
                                        <TrendingUp size={16} className="text-green-400" />
                                        <span className="text-xs text-gray-300 font-semibold uppercase">Rate</span>
                                    </div>
                                    <p className="text-2xl font-black text-white">{badgeCompletionRate}%</p>
                                </div>
                            </motion.div>
                        </div>

                        {/* Right: XP Progress */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 }}
                            className="bg-white/10 backdrop-blur-2xl p-6 rounded-3xl border border-white/20 shadow-2xl"
                        >
                            <div className="flex justify-between items-end mb-4">
                                <div>
                                    <p className="text-sm text-gray-300 font-semibold uppercase tracking-wider mb-1">Experience</p>
                                    <p className="text-4xl font-black text-white">{xp.toLocaleString()}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-gray-400 font-medium">Next Level</p>
                                    <p className="text-2xl font-bold text-gray-200">{nextLevelXp.toLocaleString()}</p>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="relative h-4 bg-gray-800/70 rounded-full overflow-hidden border border-white/20">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${levelProgress}%` }}
                                    transition={{ duration: 1.5, ease: "easeOut", delay: 0.6 }}
                                    className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 relative"
                                >
                                    <motion.div
                                        animate={{ x: ['0%', '100%'] }}
                                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent"
                                    />
                                </motion.div>
                            </div>

                            <p className="text-xs text-right mt-3 text-gray-300 font-semibold">
                                <span className="text-white font-bold">{xpToNextLevel.toLocaleString()} XP</span> to Level {level + 1}
                            </p>
                        </motion.div>
                    </div>
                </div>
            </motion.div>

            {/* Tabs with Better Styling */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white/80 backdrop-blur-xl rounded-2xl p-2 shadow-lg border border-gray-200"
            >
                <div className="flex gap-2">
                    {[
                        { key: 'badges', icon: Award, label: 'Badges' },
                        { key: 'gifts', icon: Gift, label: 'Gifts' },
                        { key: 'titles', icon: Crown, label: 'Titles' }
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex-1 px-6 py-3 font-bold text-sm transition-all rounded-xl flex items-center justify-center gap-2 ${
                                activeTab === tab.key
                                    ? 'text-white bg-gradient-to-r from-black to-gray-800 shadow-lg'
                                    : 'text-gray-600 hover:text-black hover:bg-gray-100'
                            }`}
                        >
                            <tab.icon size={18} />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </motion.div>

            {/* Syncing Indicator */}
            {syncing && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-3"
                >
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"
                    />
                    <span className="text-sm font-bold text-blue-900">Syncing badges...</span>
                </motion.div>
            )}

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
                                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        transition={{ delay: idx * 0.03, type: "spring" }}
                                        whileHover={{ y: -8, scale: 1.03 }}
                                        className={`relative p-6 rounded-3xl border-2 transition-all group overflow-hidden ${
                                            badge.unlocked
                                                ? 'bg-gradient-to-br from-white to-gray-50 border-gray-300 shadow-lg hover:shadow-2xl'
                                                : 'bg-gray-100 border-dashed border-gray-300 opacity-50'
                                        }`}
                                    >
                                        {badge.unlocked && (
                                            <div className="absolute inset-0 bg-gradient-to-br from-yellow-50/50 via-orange-50/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                        )}

                                        <div className="flex flex-col items-center text-center relative z-10">
                                            <motion.div
                                                whileHover={{ rotate: [0, -10, 10, -10, 0], scale: 1.15 }}
                                                transition={{ duration: 0.5 }}
                                                className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-4 shadow-xl ${
                                                    badge.unlocked 
                                                        ? 'bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white' 
                                                        : 'bg-gray-300 text-gray-500'
                                                }`}
                                            >
                                                {badge.unlocked ? (
                                                    <Icon size={32} strokeWidth={2.5} />
                                                ) : (
                                                    <Lock size={28} />
                                                )}
                                            </motion.div>

                                            <h3 className="font-black text-base mb-2 leading-tight text-gray-900">
                                                {badge.name}
                                            </h3>
                                            <p className="text-xs text-gray-600 leading-relaxed">
                                                {badge.desc || badge.description}
                                            </p>

                                            {badge.unlocked && (
                                                <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    className="absolute top-3 right-3 w-7 h-7 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg"
                                                >
                                                    <Sparkles size={16} className="text-white" />
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
                                    <h3 className="text-2xl font-black text-gray-700 mb-2">No Badges Yet</h3>
                                    <p className="text-gray-500 mb-6">Complete activities to earn your first badge!</p>
                                    <div className="inline-flex items-center gap-2 text-sm text-gray-600">
                                        <Info size={16} />
                                        <span>Badges auto-sync as you study</span>
                                    </div>
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
                                initial={{ scale: 0.95 }}
                                animate={{ scale: 1 }}
                                className="col-span-full bg-gradient-to-br from-gray-50 to-white rounded-3xl p-16 flex flex-col items-center justify-center text-center border-2 border-dashed border-gray-300"
                            >
                                <motion.div
                                    animate={{ 
                                        y: [0, -10, 0],
                                        rotate: [0, 5, -5, 0]
                                    }}
                                    transition={{ duration: 3, repeat: Infinity }}
                                    className="w-24 h-24 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl flex items-center justify-center mb-6 shadow-xl"
                                >
                                    <Gift size={40} className="text-gray-500" />
                                </motion.div>
                                <h3 className="text-2xl font-black text-gray-800 mb-3">No Gifts Yet</h3>
                                <p className="text-gray-600 max-w-md">
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
                                        transition={{ delay: idx * 0.03 }}
                                        whileHover={{ x: 6, scale: 1.01 }}
                                        className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all group ${
                                            isUnlocked
                                                ? 'bg-white border-gray-300 shadow-md hover:shadow-xl'
                                                : 'bg-gray-100 border-gray-300 opacity-50'
                                        } ${isEquipped ? 'ring-2 ring-black ring-offset-4 shadow-xl' : ''}`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <motion.div
                                                whileHover={{ rotate: 360 }}
                                                transition={{ duration: 0.6 }}
                                                className={`w-16 h-16 rounded-xl flex items-center justify-center shadow-lg ${
                                                    isUnlocked 
                                                        ? 'bg-gradient-to-br from-black to-gray-800 text-white' 
                                                        : 'bg-gray-300 text-gray-500'
                                                }`}
                                            >
                                                {isUnlocked ? <Crown size={28} /> : <Lock size={24} />}
                                            </motion.div>
                                            <div>
                                                <h3 className={`font-black text-lg ${!isUnlocked ? 'text-gray-500' : 'text-gray-900'}`}>
                                                    {title.text}
                                                </h3>
                                                <p className="text-xs text-gray-600 mt-1 font-medium">
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
                                                className="px-6 py-3 bg-gradient-to-r from-black to-gray-800 hover:from-gray-900 hover:to-black text-white text-sm font-bold rounded-xl transition-all shadow-lg flex items-center gap-2"
                                            >
                                                Equip
                                                <ArrowRight size={16} />
                                            </motion.button>
                                        )}
                                        {isEquipped && (
                                            <span className="px-5 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-bold rounded-xl flex items-center gap-2 shadow-lg">
                                                <Sparkles size={16} />
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
                                    <h3 className="text-2xl font-black text-gray-700 mb-2">No Titles Available</h3>
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
