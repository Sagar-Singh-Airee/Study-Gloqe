// src/components/features/AchievementsSection.jsx - BOLD MINIMALIST WITH TEAL ✨

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Trophy, Award, Gift, Crown, Star, Zap, BookOpen, Target, Lock,
    TrendingUp, Flame, Medal, Sparkles, ArrowRight, CheckCircle2
} from 'lucide-react';
import { useGamification } from '@gamification/hooks/useGamification';

// UsersIcon Component
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

// Icons Mapping
const IconMap = {
    Zap, Star, BookOpen, Target, UsersIcon, Crown, Trophy, Award, Medal, Flame
};

const AchievementsSection = () => {
    const [activeTab, setActiveTab] = useState('badges');

    const {
        xp, level, nextLevelXp, levelProgress, globalRank, streak, totalBadges,
        equippedTitle, allBadges, allTitles, loading, changeTitle,
        xpToNextLevel, badgeCompletionRate, syncing
    } = useGamification();

    const handleEquipTitle = async (titleId) => {
        const result = await changeTitle(titleId);
        if (!result.success) {
            console.error('Failed to equip title:', result.error);
        }
    };

    const unlockedBadges = allBadges.filter(b => b.unlocked).length;
    const totalBadgesCount = allBadges.length;
    const unlockedTitles = allTitles.filter(t => t.unlocked).length;

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center"
                >
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        className="w-14 h-14 border-3 border-slate-200 border-t-teal-600 rounded-full mx-auto mb-4"
                    />
                    <p className="text-slate-900 font-bold text-lg">Loading</p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            <div className="max-w-6xl mx-auto px-8 py-12">
                {/* Bold Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-16"
                >
                    {/* Badges */}
                    <div className="flex items-center gap-3 mb-10">
                        <div className="px-4 py-1.5 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-lg text-sm font-bold tracking-wide shadow-lg shadow-teal-600/20">
                            LEVEL {level}
                        </div>
                        <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-100 rounded-lg">
                            <Trophy size={14} className="text-teal-600" />
                            <span className="text-sm font-bold text-slate-900">#{globalRank}</span>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-100 rounded-lg">
                            <Crown size={14} className="text-teal-600" />
                            <span className="text-sm font-bold text-slate-900">{equippedTitle}</span>
                        </div>
                    </div>

                    {/* Large Bold Title */}
                    <h1 className="text-7xl font-black text-slate-900 mb-14 tracking-tight leading-none">
                        Achievements
                    </h1>

                    {/* Stats Grid - Bold */}
                    <div className="grid grid-cols-4 gap-6">
                        {/* XP Card - Gradient */}
                        <div className="col-span-2 relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-black rounded-2xl p-8 shadow-xl">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-teal-500/10 rounded-full blur-3xl" />

                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-8">
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Total XP</p>
                                        <p className="text-5xl font-black text-white tracking-tight">{xp.toLocaleString()}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Next Level</p>
                                        <p className="text-2xl font-bold text-teal-400">{nextLevelXp.toLocaleString()}</p>
                                    </div>
                                </div>

                                <div className="relative h-2 bg-slate-700 rounded-full overflow-hidden mb-4">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${levelProgress}%` }}
                                        transition={{ duration: 1, ease: "easeOut" }}
                                        className="absolute h-full bg-gradient-to-r from-teal-400 via-teal-500 to-teal-600 rounded-full shadow-lg shadow-teal-500/50"
                                    />
                                </div>

                                <div className="flex justify-between text-xs font-bold">
                                    <span className="text-slate-400">{levelProgress}% COMPLETE</span>
                                    <span className="text-white">{xpToNextLevel.toLocaleString()} TO GO</span>
                                </div>
                            </div>
                        </div>

                        {/* Mini Stats - Bold */}
                        <div className="border-2 border-slate-200 rounded-2xl p-7 hover:border-teal-500 transition-colors">
                            <Flame size={28} className="text-teal-600 mb-5" strokeWidth={2.5} />
                            <p className="text-4xl font-black text-slate-900 mb-2">{streak}</p>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Day Streak</p>
                        </div>

                        <div className="border-2 border-slate-200 rounded-2xl p-7 hover:border-teal-500 transition-colors">
                            <Medal size={28} className="text-teal-600 mb-5" strokeWidth={2.5} />
                            <p className="text-4xl font-black text-slate-900 mb-2">{badgeCompletionRate}%</p>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Complete</p>
                        </div>
                    </div>
                </motion.div>

                {/* Bold Tabs */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="mb-12"
                >
                    <div className="flex gap-2 border-b-2 border-slate-200">
                        {[
                            { key: 'badges', label: 'Badges', count: unlockedBadges },
                            { key: 'titles', label: 'Titles', count: unlockedTitles },
                            { key: 'gifts', label: 'Gifts', count: 0 }
                        ].map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`px-6 py-4 text-sm font-bold uppercase tracking-wide transition-colors relative ${activeTab === tab.key
                                        ? 'text-slate-900'
                                        : 'text-slate-400 hover:text-slate-600'
                                    }`}
                            >
                                {tab.label}
                                {tab.count > 0 && (
                                    <span className={`ml-2 px-2 py-0.5 rounded-md text-xs font-black ${activeTab === tab.key
                                            ? 'bg-teal-100 text-teal-700'
                                            : 'bg-slate-100 text-slate-500'
                                        }`}>
                                        {tab.count}
                                    </span>
                                )}
                                {activeTab === tab.key && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-600 to-teal-500 rounded-t-full"
                                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                    />
                                )}
                            </button>
                        ))}
                    </div>
                </motion.div>

                {/* Syncing */}
                <AnimatePresence>
                    {syncing && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="mb-8 flex items-center gap-3 px-4 py-3 bg-teal-50 rounded-lg border border-teal-200"
                        >
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                className="w-4 h-4 border-2 border-teal-300 border-t-teal-600 rounded-full"
                            />
                            <span className="text-sm font-bold text-teal-900">Syncing...</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Content */}
                <AnimatePresence mode="wait">
                    {/* BADGES */}
                    {activeTab === 'badges' && (
                        <motion.div
                            key="badges"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="grid grid-cols-4 gap-6"
                        >
                            {allBadges.length > 0 ? allBadges.map((badge, idx) => {
                                const Icon = IconMap[badge.iconName] || Star;
                                return (
                                    <motion.div
                                        key={badge.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.03 }}
                                        whileHover={{ y: -4 }}
                                        className={`group relative border-2 rounded-2xl p-7 transition-all ${badge.unlocked
                                                ? 'border-slate-200 hover:border-teal-500 bg-white hover:shadow-lg hover:shadow-teal-500/10'
                                                : 'border-slate-100 bg-slate-50 opacity-40'
                                            }`}
                                    >
                                        <div className="flex flex-col items-center text-center">
                                            <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-5 transition-all ${badge.unlocked
                                                    ? 'bg-gradient-to-br from-teal-600 to-teal-700 text-white shadow-lg shadow-teal-600/30 group-hover:scale-110'
                                                    : 'bg-slate-200 text-slate-400'
                                                }`}>
                                                {badge.unlocked ? <Icon size={24} strokeWidth={2.5} /> : <Lock size={20} />}
                                            </div>
                                            <h3 className="text-sm font-bold text-slate-900 mb-2">
                                                {badge.name}
                                            </h3>
                                            <p className="text-xs text-slate-600 leading-relaxed font-medium">
                                                {badge.desc || badge.description}
                                            </p>
                                            {badge.unlocked && (
                                                <div className="absolute top-4 right-4">
                                                    <CheckCircle2 size={20} className="text-teal-600" strokeWidth={2.5} />
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            }) : (
                                <div className="col-span-4 text-center py-24">
                                    <Award size={56} className="mx-auto mb-6 text-slate-300" strokeWidth={2} />
                                    <h3 className="text-2xl font-bold text-slate-900 mb-2">No badges yet</h3>
                                    <p className="text-sm text-slate-600 font-medium">Complete activities to earn badges</p>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* TITLES */}
                    {activeTab === 'titles' && (
                        <motion.div
                            key="titles"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="space-y-4"
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
                                        whileHover={{ x: 4 }}
                                        className={`flex items-center justify-between p-6 border-2 rounded-2xl transition-all ${isUnlocked
                                                ? 'border-slate-200 hover:border-teal-500 bg-white hover:shadow-lg hover:shadow-teal-500/10'
                                                : 'border-slate-100 bg-slate-50 opacity-40'
                                            } ${isEquipped ? 'ring-2 ring-teal-600 ring-offset-2' : ''}`}
                                    >
                                        <div className="flex items-center gap-5">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isUnlocked
                                                    ? 'bg-gradient-to-br from-teal-600 to-teal-700 text-white shadow-lg shadow-teal-600/30'
                                                    : 'bg-slate-200 text-slate-400'
                                                }`}>
                                                {isUnlocked ? <Crown size={22} strokeWidth={2.5} /> : <Lock size={18} />}
                                            </div>
                                            <div>
                                                <h3 className="text-base font-bold text-slate-900 mb-1">
                                                    {title.text}
                                                </h3>
                                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                                                    {isUnlocked
                                                        ? isEquipped ? '✨ Active' : 'Available'
                                                        : `Level ${title.requiredLevel || 1}`}
                                                </p>
                                            </div>
                                        </div>

                                        {isUnlocked && !isEquipped && (
                                            <button
                                                onClick={() => handleEquipTitle(title.id)}
                                                className="px-6 py-2.5 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white text-sm font-bold rounded-lg transition-all shadow-lg shadow-teal-600/20 hover:shadow-xl hover:shadow-teal-600/30"
                                            >
                                                EQUIP
                                            </button>
                                        )}
                                        {isEquipped && (
                                            <div className="flex items-center gap-2 px-5 py-2.5 bg-teal-100 rounded-lg">
                                                <CheckCircle2 size={16} className="text-teal-700" strokeWidth={2.5} />
                                                <span className="text-sm font-bold text-teal-700 uppercase tracking-wide">Active</span>
                                            </div>
                                        )}
                                    </motion.div>
                                );
                            }) : (
                                <div className="text-center py-24">
                                    <Crown size={56} className="mx-auto mb-6 text-slate-300" strokeWidth={2} />
                                    <h3 className="text-2xl font-bold text-slate-900 mb-2">No titles available</h3>
                                    <p className="text-sm text-slate-600 font-medium">Level up to unlock titles</p>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* GIFTS */}
                    {activeTab === 'gifts' && (
                        <motion.div
                            key="gifts"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="text-center py-24"
                        >
                            <Gift size={56} className="mx-auto mb-6 text-slate-300" strokeWidth={2} />
                            <h3 className="text-2xl font-bold text-slate-900 mb-2">No gifts yet</h3>
                            <p className="text-sm text-slate-600 font-medium max-w-md mx-auto">
                                Impress your teachers with great work to receive special rewards
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default AchievementsSection;
