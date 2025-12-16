// src/components/features/AchievementsSection.jsx - ✨ LIGHT PREMIUM VERSION
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Trophy, Award, Gift, Crown, Star, Zap, BookOpen, Target, Lock,
    TrendingUp, Flame, Medal, Sparkles, ArrowRight, Info, ChevronRight,
    CheckCircle2
} from 'lucide-react';
import { useGamification } from '@gamification/hooks/useGamification';

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

    // Calculate badge statistics
    const unlockedBadges = allBadges.filter(b => b.unlocked).length;
    const totalBadgesCount = allBadges.length;
    const unlockedTitles = allTitles.filter(t => t.unlocked).length;

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-white">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center"
                >
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="w-16 h-16 border-3 border-gray-200 border-t-gray-900 rounded-full mx-auto mb-4"
                    />
                    <p className="text-gray-900 font-bold text-lg">Loading Achievements...</p>
                    <p className="text-gray-500 text-sm mt-1">Syncing your progress</p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-8">
            {/* ✨ LIGHT Hero Header */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative bg-white rounded-2xl p-8 shadow-sm border border-gray-200 overflow-hidden"
            >
                {/* Subtle gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-gray-50/50 to-white pointer-events-none" />

                <div className="relative z-10">
                    <div className="grid lg:grid-cols-[1fr_380px] gap-8 items-start">
                        {/* Left: User Info */}
                        <div>
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="flex items-center gap-3 mb-6 flex-wrap"
                            >
                                <div className="px-4 py-1.5 bg-gray-900 text-white rounded-full text-sm font-bold">
                                    Level {level}
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full border border-gray-200">
                                    <Trophy size={14} className="text-gray-700" />
                                    <span className="text-sm font-semibold text-gray-700">Rank #{globalRank}</span>
                                </div>
                            </motion.div>

                            <motion.h1 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="text-4xl md:text-5xl font-black mb-4 text-gray-900"
                            >
                                My Achievements
                            </motion.h1>

                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="flex items-center gap-2 mb-8 text-gray-600"
                            >
                                <Crown size={16} className="text-gray-900" />
                                <span className="text-sm font-medium">{equippedTitle}</span>
                            </motion.div>

                            {/* Clean Stats Grid */}
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="grid grid-cols-3 gap-4"
                            >
                                <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 border border-gray-200">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                                            <Flame size={16} className="text-orange-600" />
                                        </div>
                                    </div>
                                    <p className="text-2xl font-black text-gray-900 mb-0.5">{streak}</p>
                                    <p className="text-xs text-gray-500 font-medium">Day Streak</p>
                                </div>

                                <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 border border-gray-200">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                                            <Medal size={16} className="text-blue-600" />
                                        </div>
                                    </div>
                                    <p className="text-2xl font-black text-gray-900 mb-0.5">{totalBadges}</p>
                                    <p className="text-xs text-gray-500 font-medium">{unlockedBadges}/{totalBadgesCount} Badges</p>
                                </div>

                                <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 border border-gray-200">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                                            <TrendingUp size={16} className="text-green-600" />
                                        </div>
                                    </div>
                                    <p className="text-2xl font-black text-gray-900 mb-0.5">{badgeCompletionRate}%</p>
                                    <p className="text-xs text-gray-500 font-medium">Complete</p>
                                </div>
                            </motion.div>
                        </div>

                        {/* Right: Clean XP Progress Card */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                            className="bg-gradient-to-br from-gray-900 to-black p-6 rounded-2xl text-white border border-gray-800"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Total XP</p>
                                    <p className="text-3xl font-black">{xp.toLocaleString()}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-400 font-medium mb-1">Next Level</p>
                                    <p className="text-xl font-bold text-gray-300">{nextLevelXp.toLocaleString()}</p>
                                </div>
                            </div>

                            {/* Clean Progress Bar */}
                            <div className="relative h-3 bg-gray-800 rounded-full overflow-hidden mb-3">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${levelProgress}%` }}
                                    transition={{ duration: 1.2, ease: "easeOut", delay: 0.5 }}
                                    className="h-full bg-gradient-to-r from-gray-400 to-white rounded-full"
                                />
                            </div>

                            <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-400 font-medium">{levelProgress}% Complete</span>
                                <span className="text-white font-bold">{xpToNextLevel.toLocaleString()} XP to go</span>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </motion.div>

            {/* ✨ CLEAN Tabs */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white rounded-xl p-1.5 border border-gray-200"
            >
                <div className="flex gap-1">
                    {[
                        { key: 'badges', icon: Award, label: 'Badges', count: unlockedBadges },
                        { key: 'titles', icon: Crown, label: 'Titles', count: unlockedTitles },
                        { key: 'gifts', icon: Gift, label: 'Gifts', count: 0 }
                    ].map((tab) => (
                        <motion.button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            className={`flex-1 px-5 py-3 font-bold text-sm transition-all rounded-lg flex items-center justify-center gap-2 relative ${
                                activeTab === tab.key
                                    ? 'text-white bg-gray-900'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                        >
                            {activeTab === tab.key && (
                                <motion.div
                                    layoutId="activeTabBg"
                                    className="absolute inset-0 bg-gray-900 rounded-lg"
                                    transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                                />
                            )}
                            <tab.icon size={18} className="relative z-10" />
                            <span className="relative z-10">{tab.label}</span>
                            {tab.count > 0 && (
                                <span className={`relative z-10 px-1.5 py-0.5 rounded text-xs font-black ${
                                    activeTab === tab.key
                                        ? 'bg-white/20 text-white'
                                        : 'bg-gray-200 text-gray-700'
                                }`}>
                                    {tab.count}
                                </span>
                            )}
                        </motion.button>
                    ))}
                </div>
            </motion.div>

            {/* Syncing Indicator */}
            <AnimatePresence>
                {syncing && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-3"
                    >
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"
                        />
                        <span className="text-sm font-semibold text-blue-900">Syncing achievements...</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ✨ CLEAN Content Area */}
            <div className="min-h-[500px]">
                <AnimatePresence mode="wait">
                    {/* BADGES TAB */}
                    {activeTab === 'badges' && (
                        <motion.div
                            key="badges"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                        >
                            {allBadges.length > 0 ? allBadges.map((badge, idx) => {
                                const Icon = IconMap[badge.iconName] || Star;
                                
                                return (
                                    <motion.div
                                        key={badge.id}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: idx * 0.02 }}
                                        whileHover={{ y: -4 }}
                                        className={`relative p-5 rounded-2xl border transition-all ${
                                            badge.unlocked
                                                ? 'bg-white border-gray-200 shadow-sm hover:shadow-md'
                                                : 'bg-gray-50 border-gray-200 border-dashed opacity-60'
                                        }`}
                                    >
                                        <div className="flex flex-col items-center text-center">
                                            <div
                                                className={`w-16 h-16 rounded-xl flex items-center justify-center mb-3 ${
                                                    badge.unlocked 
                                                        ? 'bg-gray-900 text-white' 
                                                        : 'bg-gray-200 text-gray-400'
                                                }`}
                                            >
                                                {badge.unlocked ? (
                                                    <Icon size={28} strokeWidth={2.5} />
                                                ) : (
                                                    <Lock size={24} />
                                                )}
                                            </div>

                                            <h3 className="font-bold text-sm mb-1 text-gray-900">
                                                {badge.name}
                                            </h3>
                                            <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                                                {badge.desc || badge.description}
                                            </p>

                                            {badge.unlocked && (
                                                <div className="absolute top-3 right-3 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                                    <CheckCircle2 size={14} className="text-white" strokeWidth={3} />
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            }) : (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="col-span-full bg-gray-50 rounded-2xl p-16 text-center border border-gray-200"
                                >
                                    <Award size={64} className="mx-auto mb-4 text-gray-300" />
                                    <h3 className="text-2xl font-bold text-gray-700 mb-2">No Badges Yet</h3>
                                    <p className="text-gray-500">Complete activities to earn your first badge!</p>
                                </motion.div>
                            )}
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
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.03 }}
                                        whileHover={{ x: 4 }}
                                        className={`flex items-center justify-between p-5 rounded-xl border transition-all ${
                                            isUnlocked
                                                ? 'bg-white border-gray-200 shadow-sm hover:shadow-md'
                                                : 'bg-gray-50 border-gray-200 opacity-60'
                                        } ${isEquipped ? 'ring-2 ring-gray-900 ring-offset-2' : ''}`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div
                                                className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                                                    isUnlocked 
                                                        ? 'bg-gray-900 text-white' 
                                                        : 'bg-gray-200 text-gray-400'
                                                }`}
                                            >
                                                {isUnlocked ? <Crown size={24} /> : <Lock size={20} />}
                                            </div>
                                            <div>
                                                <h3 className={`font-bold text-base mb-0.5 ${!isUnlocked ? 'text-gray-500' : 'text-gray-900'}`}>
                                                    {title.text}
                                                </h3>
                                                <p className="text-xs text-gray-500 font-medium">
                                                    {isUnlocked
                                                        ? isEquipped 
                                                            ? '✨ Currently equipped' 
                                                            : 'Available to equip'
                                                        : `Unlocks at Level ${title.requiredLevel || 1}`}
                                                </p>
                                            </div>
                                        </div>

                                        {isUnlocked && !isEquipped && (
                                            <motion.button
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => handleEquipTitle(title.id)}
                                                className="px-5 py-2.5 bg-gray-900 hover:bg-black text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2"
                                            >
                                                Equip
                                                <ChevronRight size={16} />
                                            </motion.button>
                                        )}
                                        {isEquipped && (
                                            <span className="px-5 py-2.5 bg-green-500 text-white text-sm font-bold rounded-lg flex items-center gap-2">
                                                <CheckCircle2 size={16} />
                                                Active
                                            </span>
                                        )}
                                    </motion.div>
                                );
                            }) : (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="bg-gray-50 rounded-2xl p-16 text-center border border-gray-200"
                                >
                                    <Crown size={64} className="mx-auto mb-4 text-gray-300" />
                                    <h3 className="text-2xl font-bold text-gray-700 mb-2">No Titles Available</h3>
                                    <p className="text-gray-500">Level up to unlock prestigious titles!</p>
                                </motion.div>
                            )}
                        </motion.div>
                    )}

                    {/* GIFTS TAB */}
                    {activeTab === 'gifts' && (
                        <motion.div
                            key="gifts"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <div className="bg-gray-50 rounded-2xl p-20 flex flex-col items-center justify-center text-center border border-gray-200">
                                <div className="w-20 h-20 bg-gray-200 rounded-2xl flex items-center justify-center mb-6">
                                    <Gift size={40} className="text-gray-400" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-800 mb-2">No Gifts Yet</h3>
                                <p className="text-gray-600 max-w-md">
                                    Impress your teachers with great work to receive special gifts and rewards!
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default AchievementsSection;
