// src/components/features/AchievementsSection.jsx - PREMIUM LIGHT COMPACT EDITION 💎

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
                        className="w-12 h-12 border-2 border-slate-200 border-t-teal-600 rounded-full mx-auto mb-3"
                    />
                    <p className="text-slate-900 font-bold text-sm">Loading achievements...</p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            {/* Subtle gradient background */}
            <div className="fixed inset-0 -z-10 bg-gradient-to-br from-white via-teal-50/20 to-blue-50/20" />

            <div className="max-w-6xl mx-auto px-6 py-8">
                {/* Compact Header */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-10"
                >
                    {/* Status Badges */}
                    <div className="flex items-center gap-2 mb-6">
                        <div className="px-3 py-1.5 bg-gradient-to-r from-teal-500 to-blue-600 text-white rounded-lg text-xs font-bold tracking-wide shadow-sm">
                            LEVEL {level}
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
                            <Trophy size={12} className="text-teal-600" strokeWidth={2.5} />
                            <span className="text-xs font-bold text-slate-900">#{globalRank}</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
                            <Crown size={12} className="text-teal-600" strokeWidth={2.5} />
                            <span className="text-xs font-bold text-slate-900 truncate max-w-[120px]">{equippedTitle}</span>
                        </div>
                    </div>

                    {/* Compact Title */}
                    <h1 className="text-4xl font-bold text-slate-900 mb-8 tracking-tight">
                        Achievements
                    </h1>

                    {/* Compact Stats Grid */}
                    <div className="grid grid-cols-4 gap-4">
                        {/* XP Card - Gradient */}
                        <div className="col-span-2 relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-5 shadow-lg">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-3xl" />

                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-5">
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Total XP</p>
                                        <p className="text-3xl font-bold text-white tracking-tight">{xp.toLocaleString()}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Next Level</p>
                                        <p className="text-xl font-bold text-teal-400">{nextLevelXp.toLocaleString()}</p>
                                    </div>
                                </div>

                                <div className="relative h-1.5 bg-slate-700 rounded-full overflow-hidden mb-3">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${levelProgress}%` }}
                                        transition={{ duration: 1, ease: "easeOut" }}
                                        className="absolute h-full bg-gradient-to-r from-teal-400 to-blue-500 rounded-full"
                                    />
                                </div>

                                <div className="flex justify-between text-[10px] font-bold">
                                    <span className="text-slate-400">{levelProgress}% COMPLETE</span>
                                    <span className="text-white">{xpToNextLevel.toLocaleString()} TO GO</span>
                                </div>
                            </div>
                        </div>

                        {/* Mini Stats - Compact */}
                        <div className="border border-slate-200 rounded-xl p-4 bg-white hover:border-teal-400 hover:shadow-sm transition-all">
                            <Flame size={22} className="text-teal-600 mb-3" strokeWidth={2.5} />
                            <p className="text-2xl font-bold text-slate-900 mb-1">{streak}</p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Day Streak</p>
                        </div>

                        <div className="border border-slate-200 rounded-xl p-4 bg-white hover:border-teal-400 hover:shadow-sm transition-all">
                            <Medal size={22} className="text-teal-600 mb-3" strokeWidth={2.5} />
                            <p className="text-2xl font-bold text-slate-900 mb-1">{badgeCompletionRate}%</p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Complete</p>
                        </div>
                    </div>
                </motion.div>

                {/* Compact Tabs */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.15 }}
                    className="mb-8"
                >
                    <div className="flex gap-1 border-b border-slate-200">
                        {[
                            { key: 'badges', label: 'Badges', count: unlockedBadges },
                            { key: 'titles', label: 'Titles', count: unlockedTitles },
                            { key: 'gifts', label: 'Gifts', count: 0 }
                        ].map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`px-4 py-3 text-xs font-bold uppercase tracking-wide transition-all relative ${activeTab === tab.key
                                        ? 'text-slate-900'
                                        : 'text-slate-400 hover:text-slate-600'
                                    }`}
                            >
                                {tab.label}
                                {tab.count > 0 && (
                                    <span className={`ml-2 px-1.5 py-0.5 rounded-md text-[10px] font-bold ${activeTab === tab.key
                                            ? 'bg-teal-100 text-teal-700'
                                            : 'bg-slate-100 text-slate-500'
                                        }`}>
                                        {tab.count}
                                    </span>
                                )}
                                {activeTab === tab.key && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-teal-500 to-blue-600"
                                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                    />
                                )}
                            </button>
                        ))}
                    </div>
                </motion.div>

                {/* Syncing Indicator */}
                <AnimatePresence>
                    {syncing && (
                        <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="mb-6 flex items-center gap-2 px-3 py-2 bg-teal-50 rounded-lg border border-teal-200"
                        >
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                className="w-3 h-3 border-2 border-teal-300 border-t-teal-600 rounded-full"
                            />
                            <span className="text-xs font-bold text-teal-900">Syncing...</span>
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
                            className="grid grid-cols-4 gap-4"
                        >
                            {allBadges.length > 0 ? allBadges.map((badge, idx) => {
                                const Icon = IconMap[badge.iconName] || Star;
                                return (
                                    <motion.div
                                        key={badge.id}
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.02 }}
                                        whileHover={{ y: -3 }}
                                        className={`group relative border rounded-xl p-5 transition-all ${badge.unlocked
                                                ? 'border-slate-200 hover:border-teal-400 bg-white hover:shadow-md'
                                                : 'border-slate-100 bg-slate-50/50 opacity-50'
                                            }`}
                                    >
                                        <div className="flex flex-col items-center text-center">
                                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 transition-all ${badge.unlocked
                                                    ? 'bg-gradient-to-br from-teal-500 to-blue-600 text-white shadow-sm group-hover:scale-105'
                                                    : 'bg-slate-200 text-slate-400'
                                                }`}>
                                                {badge.unlocked ? <Icon size={20} strokeWidth={2.5} /> : <Lock size={16} />}
                                            </div>
                                            <h3 className="text-xs font-bold text-slate-900 mb-1.5">
                                                {badge.name}
                                            </h3>
                                            <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                                                {badge.desc || badge.description}
                                            </p>
                                            {badge.unlocked && (
                                                <div className="absolute top-3 right-3">
                                                    <CheckCircle2 size={16} className="text-teal-600" strokeWidth={2.5} />
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            }) : (
                                <div className="col-span-4 text-center py-16">
                                    <Award size={48} className="mx-auto mb-4 text-slate-300" strokeWidth={2} />
                                    <h3 className="text-lg font-bold text-slate-900 mb-1">No badges yet</h3>
                                    <p className="text-xs text-slate-600 font-medium">Complete activities to earn badges</p>
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
                            className="space-y-3"
                        >
                            {allTitles.length > 0 ? allTitles.map((title, idx) => {
                                const isUnlocked = title.unlocked;
                                const isEquipped = equippedTitle === title.text;

                                return (
                                    <motion.div
                                        key={title.id}
                                        initial={{ opacity: 0, x: -15 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.04 }}
                                        whileHover={{ x: 3 }}
                                        className={`flex items-center justify-between p-4 border rounded-xl transition-all ${isUnlocked
                                                ? 'border-slate-200 hover:border-teal-400 bg-white hover:shadow-md'
                                                : 'border-slate-100 bg-slate-50/50 opacity-50'
                                            } ${isEquipped ? 'ring-2 ring-teal-500 ring-offset-2' : ''}`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isUnlocked
                                                    ? 'bg-gradient-to-br from-teal-500 to-blue-600 text-white shadow-sm'
                                                    : 'bg-slate-200 text-slate-400'
                                                }`}>
                                                {isUnlocked ? <Crown size={18} strokeWidth={2.5} /> : <Lock size={16} />}
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-bold text-slate-900 mb-0.5">
                                                    {title.text}
                                                </h3>
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                                                    {isUnlocked
                                                        ? isEquipped ? '✨ Active' : 'Available'
                                                        : `Level ${title.requiredLevel || 1}`}
                                                </p>
                                            </div>
                                        </div>

                                        {isUnlocked && !isEquipped && (
                                            <button
                                                onClick={() => handleEquipTitle(title.id)}
                                                className="px-5 py-2 bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 text-white text-xs font-bold rounded-lg transition-all shadow-sm"
                                            >
                                                EQUIP
                                            </button>
                                        )}
                                        {isEquipped && (
                                            <div className="flex items-center gap-1.5 px-3 py-2 bg-teal-50 border border-teal-200 rounded-lg">
                                                <CheckCircle2 size={14} className="text-teal-700" strokeWidth={2.5} />
                                                <span className="text-xs font-bold text-teal-700 uppercase tracking-wide">Active</span>
                                            </div>
                                        )}
                                    </motion.div>
                                );
                            }) : (
                                <div className="text-center py-16">
                                    <Crown size={48} className="mx-auto mb-4 text-slate-300" strokeWidth={2} />
                                    <h3 className="text-lg font-bold text-slate-900 mb-1">No titles available</h3>
                                    <p className="text-xs text-slate-600 font-medium">Level up to unlock titles</p>
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
                            className="text-center py-16"
                        >
                            <Gift size={48} className="mx-auto mb-4 text-slate-300" strokeWidth={2} />
                            <h3 className="text-lg font-bold text-slate-900 mb-1">No gifts yet</h3>
                            <p className="text-xs text-slate-600 font-medium max-w-md mx-auto leading-relaxed">
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
