// src/features/student/pages/Dashboard.jsx - ✅ PROFESSIONAL & OPTIMIZED 2025 + STREAK TRACKING
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BookOpen, Upload, Trophy, Clock, Users, Brain, Video, Bell,
    Layers, StickyNote, LayoutDashboard, LogOut, ChevronRight, Medal,
    Sparkles, TrendingUp, Zap, Flame, Target, Activity, Award,
    Search, Command, Menu, X, ChevronDown, HelpCircle,
    Calendar, BarChart3, Star, Gift, Rocket, Crown, Shield,
    CheckCircle2, ArrowUpRight, Plus, RefreshCw, Info,
    MousePointerClick, User
} from 'lucide-react';
import { useAuth } from '@auth/contexts/AuthContext';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@shared/config/firebase';
import { awardDailyXP, DAILY_ACTIONS } from '@gamification/services/gamificationService';
import { useGamification } from '@gamification/hooks/useGamification';
import { updateDailyStreak } from '@shared/services/streakService';
import { useDashboardSync } from '@shared/services/realtimeSync';
import { calculateLevel, calculateLevelProgress, getNextLevelXp } from '@utils/levelUtils';
import toast from 'react-hot-toast';
import logoImage from '@assets/logo/loma.png';

// Gamification Components
import LevelModal from '@gamification/components/LevelModal';
import AchievementToast from '@gamification/components/AchievementToast';

// Feature Sections
import OverviewSection from '@student/components/dashboard/OverviewSection';
import ClassesSection from '@student/components/dashboard/ClassesSection';
import DocumentsSection from '@student/components/dashboard/DocumentsSection';
import QuizzesSection from '@student/components/dashboard/QuizzesSection';
import FlashcardsSection from '@student/components/dashboard/FlashcardsSection';
import NotesSection from '@student/components/dashboard/NotesSection';
import RoomsSection from '@student/components/dashboard/RoomsSection';
import SessionHistorySection from '@student/components/dashboard/SessionHistorySection';
import AchievementsSection from '@student/components/dashboard/AchievementsSection';
import Profile from '@student/pages/Profile';

// Analytics Components
import AnalyticsSection from '@analytics/components/AnalyticsSection';
import StudentAnalytics from '@analytics/components/StudentAnalytics';
import LeaderboardSection from '@analytics/components/LeaderboardSection';
import ErrorBoundary from '@shared/components/ErrorBoundary';

// ============================================
// CONSTANTS
// ============================================

const GREETING = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: 'Good morning', emoji: '☀️' };
    if (hour < 18) return { text: 'Good afternoon', emoji: '🌤️' };
    return { text: 'Good evening', emoji: '🌙' };
};

const SIDEBAR_ITEMS = [
    { icon: LayoutDashboard, label: 'Overview', tab: 'overview', badge: null },
    { icon: BarChart3, label: 'Analytics', tab: 'analytics', badge: '✨' },
    { icon: Users, label: 'Classes', tab: 'classes', badge: null },
    { icon: BookOpen, label: 'Documents', tab: 'documents', badge: null },
    { icon: Medal, label: 'Achievements', tab: 'achievements', badge: 'NEW' },
    { icon: Brain, label: 'Quizzes', tab: 'quizzes', badge: null },
    { icon: Layers, label: 'Flashcards', tab: 'flashcards', badge: null },
    { icon: Video, label: 'Study Rooms', tab: 'rooms', badge: 'LIVE' },
    { icon: Trophy, label: 'Leaderboard', tab: 'leaderboard', badge: null },
    { icon: Clock, label: 'History', tab: 'history', badge: null },
];

const TUTORIAL_STEPS = [
    {
        id: 'welcome',
        title: '👋 Welcome to StudyGloqe!',
        description: 'Let\'s take a quick 60-second tour of your AI-powered learning dashboard.',
        target: null,
        position: 'center',
        action: null,
        scrollTo: null
    },
    {
        id: 'upload-pdf',
        title: '📤 Upload Your Study Materials',
        description: 'Click this button to upload PDFs. Our AI instantly generates quizzes, flashcards, and smart summaries!',
        target: 'upload-button',
        position: 'bottom',
        highlight: 'teal',
        action: null,
        scrollTo: 'upload-button'
    },
    {
        id: 'xp-card',
        title: '⭐ Your Learning Progress',
        description: 'Earn XP points, level up, and maintain daily streaks. Track your achievements in real-time!',
        target: 'xp-card',
        position: 'right',
        highlight: 'teal',
        action: null,
        scrollTo: 'xp-card'
    },
    {
        id: 'navigation',
        title: '🧭 Quick Navigation',
        description: 'Access all features from here. Use keyboard shortcuts (⌥1-9) for lightning-fast navigation!',
        target: 'sidebar-nav',
        position: 'right',
        highlight: 'teal',
        action: null,
        scrollTo: 'sidebar-nav'
    },
    {
        id: 'search',
        title: '🔍 Power Search',
        description: 'Press ⌘K anytime to instantly search and jump to any feature. Try it!',
        target: 'search-button',
        position: 'bottom',
        highlight: 'teal',
        action: null,
        scrollTo: 'search-button'
    },
    {
        id: 'complete',
        title: '🎉 Ready to Excel!',
        description: 'You\'re all set! Upload your first PDF to unlock AI-powered learning tools and start your journey.',
        target: null,
        position: 'center',
        action: 'complete',
        scrollTo: null
    }
];

// ============================================
// ANIMATED COMPONENTS - OPTIMIZED
// ============================================

const AnimatedCounter = ({ value, duration = 1000 }) => {
    const [displayValue, setDisplayValue] = useState(0);
    const prevValueRef = useRef(0);

    useEffect(() => {
        let animationFrame;
        let startTime;
        const startValue = prevValueRef.current;

        const animate = (currentTime) => {
            if (!startTime) startTime = currentTime;
            const progress = Math.min((currentTime - startTime) / duration, 1);
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            setDisplayValue(Math.floor(startValue + (value - startValue) * easeOutQuart));

            if (progress < 1) {
                animationFrame = requestAnimationFrame(animate);
            } else {
                prevValueRef.current = value;
            }
        };

        if (value !== prevValueRef.current) {
            animationFrame = requestAnimationFrame(animate);
        }

        return () => {
            if (animationFrame) cancelAnimationFrame(animationFrame);
        };
    }, [value, duration]);

    return <span>{displayValue.toLocaleString()}</span>;
};

const CompactXPRing = ({ progress, size = 56 }) => {
    const strokeWidth = 4;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress / 100) * circumference;

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg className="transform -rotate-90" width={size} height={size}>
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth={strokeWidth}
                />
                <motion.circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="url(#compactGradient)"
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    strokeLinecap="round"
                />
                <defs>
                    <linearGradient id="compactGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#14b8a6" />
                        <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white text-xs font-black">{Math.round(progress)}%</span>
            </div>
        </div>
    );
};

// ============================================
// TUTORIAL OVERLAY
// ============================================

const TutorialOverlay = ({ step, onNext, onPrev, onSkip, currentStepIndex, totalSteps }) => {
    useEffect(() => {
        if (step?.scrollTo) {
            setTimeout(() => {
                const element = document.getElementById(step.scrollTo);
                if (element) {
                    element.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center',
                        inline: 'center'
                    });
                }
            }, 300);
        }
    }, [step]);

    if (!step) return null;

    const isCenter = step.position === 'center';

    return (
        <>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-gradient-to-br from-black/75 via-gray-900/70 to-black/75 backdrop-blur-2xl z-[60]"
                style={{ pointerEvents: 'none' }}
            />

            <AnimatePresence mode="wait">
                <motion.div
                    key={step.id}
                    initial={{ opacity: 0, scale: 0.9, y: 32 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -32 }}
                    transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
                    className={`fixed z-[70] ${isCenter
                        ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
                        : 'bottom-8 left-1/2 -translate-x-1/2'
                        } max-w-lg w-full mx-4`}
                    style={{ pointerEvents: 'auto' }}
                >
                    <div className="relative">
                        <div className="absolute -inset-4 bg-gradient-to-r from-teal-500/30 via-cyan-500/30 to-teal-500/30 blur-3xl opacity-60 rounded-3xl" />

                        <div className="relative bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 via-cyan-500 to-teal-600" />

                            <div className="p-8">
                                <div className="flex items-start gap-5 mb-6">
                                    <motion.div
                                        animate={{
                                            scale: [1, 1.1, 1],
                                            rotate: [0, 8, -8, 0]
                                        }}
                                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                        className="relative shrink-0"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-br from-teal-500 via-cyan-500 to-teal-600 blur-xl opacity-40 rounded-2xl" />
                                        <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 via-cyan-500 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/30">
                                            <Sparkles size={28} className="text-white drop-shadow-lg" strokeWidth={2.5} />
                                        </div>
                                    </motion.div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-2.5">
                                            <h3 className="text-xl font-black text-gray-900 tracking-tight">
                                                {step.title}
                                            </h3>
                                            <span className="px-3 py-1.5 bg-gradient-to-r from-teal-50 to-cyan-50 text-teal-600 text-xs font-bold rounded-full border border-teal-200/50 shadow-sm">
                                                {currentStepIndex + 1}/{totalSteps}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 leading-relaxed font-medium">
                                            {step.description}
                                        </p>
                                    </div>

                                    <motion.button
                                        onClick={onSkip}
                                        whileHover={{ scale: 1.1, rotate: 90 }}
                                        whileTap={{ scale: 0.9 }}
                                        className="text-gray-400 hover:text-gray-700 transition-all p-2 hover:bg-gray-100 rounded-xl shrink-0 group"
                                    >
                                        <X size={18} className="transition-transform duration-300" />
                                    </motion.button>
                                </div>

                                <div className="mb-7">
                                    <div className="flex items-center justify-between text-xs font-semibold mb-3">
                                        <span className="text-gray-500">Progress</span>
                                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-cyan-600">
                                            {Math.round(((currentStepIndex + 1) / totalSteps) * 100)}% Complete
                                        </span>
                                    </div>
                                    <div className="h-2.5 bg-gradient-to-r from-gray-100 to-gray-50 rounded-full overflow-hidden shadow-inner relative">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${((currentStepIndex + 1) / totalSteps) * 100}%` }}
                                            className="h-full bg-gradient-to-r from-teal-500 via-cyan-500 to-teal-600 rounded-full shadow-lg"
                                            transition={{ duration: 0.8, ease: [0.65, 0, 0.35, 1] }}
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 animate-shimmer" />
                                        </motion.div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    {currentStepIndex > 0 && (
                                        <motion.button
                                            whileHover={{ scale: 1.03, x: -2 }}
                                            whileTap={{ scale: 0.97 }}
                                            onClick={onPrev}
                                            className="px-6 py-3.5 rounded-xl border-2 border-gray-200 hover:border-gray-300 hover:bg-gradient-to-r hover:from-gray-50 hover:to-white text-gray-700 font-bold transition-all shadow-sm hover:shadow-md"
                                        >
                                            ← Previous
                                        </motion.button>
                                    )}
                                    <motion.button
                                        whileHover={{ scale: 1.03 }}
                                        whileTap={{ scale: 0.97 }}
                                        onClick={onNext}
                                        className="relative flex-1 px-6 py-3.5 rounded-xl overflow-hidden font-bold transition-all shadow-xl hover:shadow-2xl flex items-center justify-center gap-2.5 group"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-teal-500 via-cyan-500 to-teal-600 transition-transform group-hover:scale-105" />
                                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <span className="relative text-white flex items-center gap-2.5">
                                            {step.action === 'complete' ? (
                                                <>
                                                    <CheckCircle2 size={20} strokeWidth={2.5} />
                                                    Get Started
                                                    <Sparkles size={18} strokeWidth={2.5} />
                                                </>
                                            ) : (
                                                <>
                                                    Next Step
                                                    <ChevronRight size={20} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" />
                                                </>
                                            )}
                                        </span>
                                    </motion.button>
                                </div>

                                <motion.button
                                    onClick={onSkip}
                                    whileHover={{ y: -1 }}
                                    className="w-full mt-5 text-sm text-gray-500 hover:text-gray-700 font-semibold transition-all hover:bg-gray-50 py-3 rounded-xl"
                                >
                                    Skip Tutorial →
                                </motion.button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>
        </>
    );
};

// ============================================
// COMMAND PALETTE
// ============================================

const CommandPalette = ({ isOpen, onClose, onNavigate, quickActions }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const inputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            inputRef.current?.focus();
            setSearchQuery('');
        }
    }, [isOpen]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        }
    }, [isOpen, onClose]);

    const filteredItems = useMemo(() => {
        const allItems = [
            ...SIDEBAR_ITEMS.map(item => ({ ...item, type: 'page' })),
            ...quickActions.map(action => ({ ...action, type: 'action' }))
        ];

        if (!searchQuery) return allItems.slice(0, 8);

        return allItems.filter(item =>
            item.label.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [searchQuery, quickActions]);

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-xl z-50 flex items-start justify-center pt-[18vh]"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.94, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: -20 }}
                transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
                className="w-full max-w-2xl relative"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="absolute -inset-6 bg-gradient-to-r from-teal-500/20 via-cyan-500/20 to-teal-500/20 blur-3xl opacity-40 rounded-3xl" />

                <div className="relative bg-white/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
                    <div className="flex items-center gap-4 px-6 py-5 border-b border-gray-100/50 bg-gradient-to-r from-gray-50/50 to-transparent">
                        <div className="p-2 bg-gradient-to-br from-gray-100 to-gray-50 rounded-xl">
                            <Search size={20} className="text-gray-600" strokeWidth={2} />
                        </div>
                        <input
                            ref={inputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search pages, actions, or type a command..."
                            className="flex-1 bg-transparent text-gray-900 placeholder-gray-400 focus:outline-none text-base font-medium"
                        />
                        <kbd className="px-3 py-1.5 bg-white text-gray-500 text-xs font-semibold rounded-lg border border-gray-200 shadow-sm">ESC</kbd>
                    </div>

                    <div className="max-h-96 overflow-y-auto p-3 custom-scrollbar">
                        {filteredItems.length === 0 ? (
                            <div className="text-center py-16 text-gray-500">
                                <motion.div
                                    animate={{ scale: [1, 1.1, 1] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                >
                                    <Search size={40} className="mx-auto mb-4 opacity-30" />
                                </motion.div>
                                <p className="font-semibold">No results found</p>
                                <p className="text-sm mt-1">Try a different search term</p>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {filteredItems.map((item, idx) => (
                                    <motion.button
                                        key={idx}
                                        onClick={() => {
                                            if (item.type === 'page') {
                                                onNavigate(item.tab);
                                            } else if (item.action) {
                                                item.action();
                                            } else if (item.path) {
                                                window.location.href = item.path;
                                            }
                                            onClose();
                                        }}
                                        whileHover={{ scale: 1.01, x: 2 }}
                                        whileTap={{ scale: 0.99 }}
                                        className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-gradient-to-r hover:from-gray-50 hover:to-transparent transition-all group border border-transparent hover:border-gray-100"
                                    >
                                        <div className="p-3 bg-gradient-to-br from-gray-100 to-gray-50 rounded-xl group-hover:from-teal-50 group-hover:to-cyan-50 transition-all shadow-sm group-hover:shadow shrink-0">
                                            {item.icon && <item.icon size={20} className="text-gray-700 group-hover:text-teal-600 transition-colors" strokeWidth={2} />}
                                        </div>
                                        <div className="flex-1 text-left min-w-0">
                                            <p className="font-bold text-gray-900 truncate group-hover:text-teal-600 transition-colors">{item.label}</p>
                                            {item.desc && <p className="text-xs text-gray-500 truncate mt-1">{item.desc}</p>}
                                        </div>
                                        <motion.span
                                            className="text-xs text-gray-400 font-medium shrink-0 px-3 py-1.5 bg-gray-50 rounded-lg group-hover:bg-teal-50 group-hover:text-teal-600 transition-all"
                                            whileHover={{ scale: 1.05 }}
                                        >
                                            {item.type === 'page' ? 'Navigate' : 'Action'}
                                        </motion.span>
                                    </motion.button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="px-5 py-4 border-t border-gray-100/50 bg-gradient-to-r from-gray-50/80 to-transparent backdrop-blur-sm flex items-center justify-between text-xs text-gray-500 font-medium">
                        <div className="flex items-center gap-5">
                            <span className="flex items-center gap-2">
                                <kbd className="px-2.5 py-1.5 bg-white rounded-lg text-xs border border-gray-200 shadow-sm">↑↓</kbd>
                                Navigate
                            </span>
                            <span className="flex items-center gap-2">
                                <kbd className="px-2.5 py-1.5 bg-white rounded-lg text-xs border border-gray-200 shadow-sm">↵</kbd>
                                Select
                            </span>
                        </div>
                        <span className="flex items-center gap-1.5">
                            Press <kbd className="px-2.5 py-1.5 bg-white rounded-lg border border-gray-200 mx-1 shadow-sm">⌘K</kbd> anytime
                        </span>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

// ============================================
// MOBILE SIDEBAR
// ============================================

const MobileSidebar = ({ isOpen, onClose, activeTab, onTabChange, onLogout }) => (
    <AnimatePresence>
        {isOpen && (
            <>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 lg:hidden"
                    onClick={onClose}
                />
                <motion.div
                    initial={{ x: -350 }}
                    animate={{ x: 0 }}
                    exit={{ x: -350 }}
                    transition={{ type: 'spring', damping: 32, stiffness: 320 }}
                    className="fixed left-0 top-0 h-full w-80 bg-gradient-to-b from-gray-900 via-gray-850 to-gray-900 z-50 lg:hidden overflow-y-auto shadow-2xl custom-scrollbar"
                >
                    <div className="p-6 flex items-center justify-between border-b border-gray-800/50 bg-gradient-to-r from-white/5 to-transparent">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <img src={logoImage} alt="Logo" className="h-9 w-17 rounded-xl shadow-lg" />
                            </div>
                            <div>
                                <span className="text-lg font-black text-white block tracking-tight">StudyGloqe</span>
                                <span className="text-xs text-gray-400 font-semibold">AI Learning</span>
                            </div>
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.1, rotate: 90 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={onClose}
                            className="p-2.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                        >
                            <X size={20} />
                        </motion.button>
                    </div>

                    <nav className="p-4 space-y-2">
                        {SIDEBAR_ITEMS.map((item) => (
                            <motion.button
                                key={item.tab}
                                onClick={() => { onTabChange(item.tab); onClose(); }}
                                whileHover={{ x: 6, scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl font-semibold transition-all relative overflow-hidden group ${activeTab === item.tab
                                    ? 'bg-gradient-to-r from-white/15 to-white/5 text-white shadow-xl border border-white/10'
                                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                    }`}
                            >
                                {activeTab === item.tab && (
                                    <motion.div
                                        layoutId="activeSidebarItem"
                                        className="absolute inset-0 bg-gradient-to-r from-teal-500/20 to-cyan-500/20"
                                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                                    />
                                )}
                                <item.icon size={20} strokeWidth={2} className="relative z-10" />
                                <span className="flex-1 text-left relative z-10">{item.label}</span>
                                {item.badge && (
                                    <span className={`relative z-10 px-2.5 py-1 text-xs font-bold rounded-full shadow-lg ${item.badge === 'LIVE' ? 'bg-red-500 text-white animate-pulse' :
                                        item.badge === 'NEW' ? 'bg-teal-500 text-white' :
                                            'bg-gray-700 text-gray-300'
                                        }`}>
                                        {item.badge}
                                    </span>
                                )}
                            </motion.button>
                        ))}
                    </nav>

                    <div className="p-4 border-t border-gray-800/50 mt-auto">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={onLogout}
                            className="w-full flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-xl text-red-400 hover:bg-red-500/20 font-semibold transition-all border-2 border-red-500/20 hover:border-red-500/50 shadow-lg shadow-red-500/10 relative overflow-hidden group"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 via-red-500/10 to-red-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <LogOut size={18} className="relative z-10" />
                            <span className="relative z-10">Logout</span>
                        </motion.button>
                    </div>
                </motion.div>
            </>
        )}
    </AnimatePresence>
);

// ============================================
// MAIN DASHBOARD COMPONENT
// ============================================

const Dashboard = () => {
    const { user, userData, logout } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const {
        xp: rawXP,
        level: rawLevel,
        nextLevelXp: rawNextLevelXp,
        levelProgress: rawLevelProgress,
        streak: rawStreak,
        loading: gamificationLoading,
        notifications,
        dismissNotification
    } = useGamification();

    const { metrics: dashboardMetrics, loading: dashboardLoading } = useDashboardSync(user?.uid);

    const streak = Math.max(dashboardMetrics?.gamification?.streak || 0, rawStreak || 0);
    const currentXP = Math.max(dashboardMetrics?.gamification?.xp || 0, rawXP || 0);

    const currentLevel = calculateLevel(currentXP);
    const xpProgress = calculateLevelProgress(currentXP);
    const xpForNextLevel = getNextLevelXp(currentXP);

    const [realtimeStats, setRealtimeStats] = useState({
        totalDocuments: 0,
        totalSessions: 0,
        totalStudyTime: 0,
        quizzesCompleted: 0,
        flashcardsReviewed: 0
    });
    const [recentDocuments, setRecentDocuments] = useState([]);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showCommandPalette, setShowCommandPalette] = useState(false);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [showXPAnimation, setShowXPAnimation] = useState(false);
    const [xpGained, setXpGained] = useState(0);
    const [levelModalOpen, setLevelModalOpen] = useState(false);
    const [tutorialActive, setTutorialActive] = useState(false);
    const [currentTutorialStep, setCurrentTutorialStep] = useState(0);

    const initialTab = searchParams.get('tab') || 'overview';
    const [activeTab, setActiveTab] = useState(initialTab);

    const isMountedRef = useRef(true);
    const listenersRef = useRef([]);

    const shouldShowTutorialButton = useMemo(() => {
        const hasSeenTutorial = localStorage.getItem('hasSeenDashboardTutorial');
        return !hasSeenTutorial && activeTab === 'overview';
    }, [activeTab]);

    const handleNextTutorialStep = () => {
        if (currentTutorialStep < TUTORIAL_STEPS.length - 1) {
            setCurrentTutorialStep(prev => prev + 1);
        } else {
            completeTutorial();
        }
    };

    const handlePrevTutorialStep = () => {
        if (currentTutorialStep > 0) {
            setCurrentTutorialStep(prev => prev - 1);
        }
    };

    const completeTutorial = () => {
        setTutorialActive(false);
        setCurrentTutorialStep(0);
        localStorage.setItem('hasSeenDashboardTutorial', 'true');
        toast.success('🎉 Tutorial completed! Ready to supercharge your learning!', {
            duration: 4000,
            style: {
                background: 'linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%)',
                color: '#fff',
                fontWeight: 'bold',
                borderRadius: '16px',
                padding: '16px 24px',
            },
        });
    };

    const skipTutorial = () => {
        setTutorialActive(false);
        setCurrentTutorialStep(0);
        localStorage.setItem('hasSeenDashboardTutorial', 'true');
    };

    const startTutorial = () => {
        setTutorialActive(true);
        setCurrentTutorialStep(0);
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setShowCommandPalette(true);
            }

            if (e.altKey && e.key >= '1' && e.key <= '9') {
                e.preventDefault();
                const index = parseInt(e.key) - 1;
                if (SIDEBAR_ITEMS[index]) {
                    handleTabChange(SIDEBAR_ITEMS[index].tab);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            listenersRef.current.forEach(unsubscribe => unsubscribe());
        };
    }, []);

    useEffect(() => {
        if (!notifications || notifications.length === 0) return;

        notifications.forEach(notification => {
            if (notification.data?.xpReward) {
                setXpGained(notification.data.xpReward);
                setShowXPAnimation(true);
                setTimeout(() => {
                    if (isMountedRef.current) setShowXPAnimation(false);
                }, 2500);
            }

            setTimeout(() => {
                dismissNotification(notification.id);
            }, 4000);
        });
    }, [notifications, dismissNotification]);

    useEffect(() => {
        if (!user?.uid) return;

        const docsQuery = query(
            collection(db, 'documents'),
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc'),
            limit(5)
        );

        const unsubscribe = onSnapshot(
            docsQuery,
            (snapshot) => {
                if (!isMountedRef.current) return;

                const docs = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    createdAt: doc.data().createdAt?.toDate?.() || new Date()
                }));
                setRecentDocuments(docs);
                setRealtimeStats(prev => ({
                    ...prev,
                    totalDocuments: snapshot.size
                }));
            },
            (error) => {
                console.error('Documents listener error:', error);
            }
        );

        listenersRef.current.push(unsubscribe);
        return () => unsubscribe();
    }, [user?.uid]);

    useEffect(() => {
        if (!user?.uid) return;

        const sessionsQuery = query(
            collection(db, 'studySessions'),
            where('userId', '==', user.uid)
        );

        const unsubscribe = onSnapshot(
            sessionsQuery,
            (snapshot) => {
                if (!isMountedRef.current) return;

                const sessions = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    startTime: doc.data().startTime?.toDate?.() || new Date()
                }));

                const totalTime = sessions.reduce((sum, s) => sum + (s.totalTime || 0), 0);

                setRealtimeStats(prev => ({
                    ...prev,
                    totalSessions: sessions.length,
                    totalStudyTime: Math.round(totalTime / 60)
                }));
            },
            (error) => {
                console.error('Sessions listener error:', error);
            }
        );

        listenersRef.current.push(unsubscribe);
        return () => unsubscribe();
    }, [user?.uid]);

    useEffect(() => {
        if (!user?.uid) return;

        const handleDailyLogin = async () => {
            const today = new Date().toDateString();
            const lastLoginKey = `lastLogin_${user.uid}`;
            const lastLogin = localStorage.getItem(lastLoginKey);

            if (lastLogin === today) {
                console.log('Already logged in today');
                return;
            }

            try {
                console.log('Processing daily login and streak...');

                const streakResult = await updateDailyStreak(user.uid);
                if (streakResult.success) {
                    console.log('Streak result:', streakResult);

                    if (streakResult.isIncremented) {
                        toast.success(`🔥 ${streakResult.streak} day streak!`, {
                            duration: 4000,
                            style: {
                                background: 'linear-gradient(135deg, #ff6b6b 0%, #ff8e53 100%)',
                                color: '#fff',
                                fontWeight: 'bold',
                                borderRadius: '16px',
                                padding: '16px 24px',
                            },
                        });
                    } else if (streakResult.wasReset) {
                        toast(`Streak reset! You missed ${streakResult.daysMissed} days. Start fresh!`, {
                            duration: 4000,
                            style: {
                                background: 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
                                color: '#fff',
                                fontWeight: 'bold',
                                borderRadius: '16px',
                                padding: '16px 24px',
                            },
                        });
                    } else if (streakResult.isNewStreak) {
                        toast.success('✨ Streak started! Come back tomorrow to keep it going', {
                            duration: 3500,
                            style: {
                                background: 'linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%)',
                                color: '#fff',
                                fontWeight: 'bold',
                                borderRadius: '16px',
                                padding: '16px 24px',
                            },
                        });
                    }
                }

                const xpResult = await awardDailyXP(user.uid, DAILY_ACTIONS.DAILY_LOGIN, 'Daily Login Bonus');
                if (xpResult.success && isMountedRef.current) {
                    toast.success(`✨ Daily bonus: +${xpResult.xpGained} XP!`, {
                        duration: 3000,
                        style: {
                            background: 'linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%)',
                            color: '#fff',
                            fontWeight: 'bold',
                            borderRadius: '16px',
                            padding: '16px 24px',
                        },
                    });
                }

                localStorage.setItem(lastLoginKey, today);
            } catch (error) {
                console.error('Daily login/streak error:', error);
                toast.error('Failed to process daily login');
            }
        };

        handleDailyLogin();
    }, [user?.uid]);

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab && tab !== activeTab) {
            setActiveTab(tab);
        }
    }, [searchParams, activeTab]);

    const handleTabChange = useCallback((tabId) => {
        if (tabId !== activeTab) {
            setActiveTab(tabId);
            setSearchParams({ tab: tabId });
        }
    }, [activeTab, setSearchParams]);

    const handleLogout = useCallback(async () => {
        try {
            await logout();
            toast.success('👋 See you soon!');
            navigate('/auth');
        } catch (error) {
            toast.error('Failed to logout');
        }
    }, [logout, navigate]);

    const handleUploadClick = useCallback(() => {
        navigate('/upload');
    }, [navigate]);

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        await new Promise(resolve => setTimeout(resolve, 1000));
        setIsRefreshing(false);
        toast.success('Data refreshed!');
    }, []);

    const quickActions = useMemo(() => [
        {
            icon: Upload,
            label: 'Upload PDF',
            desc: 'Generate instant quizzes',
            action: handleUploadClick,
            gradient: 'from-gray-800 to-gray-700',
            iconColor: 'text-white'
        },
        {
            icon: Brain,
            label: 'Take Quiz',
            desc: 'Test your knowledge',
            path: '/dashboard?tab=quizzes',
            gradient: 'from-gray-700 to-gray-600',
            iconColor: 'text-white'
        },
        {
            icon: Video,
            label: 'Join Room',
            desc: 'Study with peers',
            path: '/dashboard?tab=rooms',
            gradient: 'from-gray-600 to-gray-500',
            iconColor: 'text-white'
        },
        {
            icon: Layers,
            label: 'Flashcards',
            desc: 'Review concepts',
            path: '/dashboard?tab=flashcards',
            gradient: 'from-gray-500 to-gray-400',
            iconColor: 'text-white'
        },
    ], [handleUploadClick]);

    const renderContent = useCallback(() => {
        const commonProps = {
            handleTabChange,
            handleUploadClick,
            navigate,
            tutorialActive
        };

        switch (activeTab) {
            case 'overview':
                return <OverviewSection stats={{ streak, ...realtimeStats }} recentDocuments={recentDocuments} quickActions={quickActions} {...commonProps} />;
            case 'analytics':
                return <AnalyticsSection />;
            case 'classes':
                return <ClassesSection />;
            case 'documents':
                return <DocumentsSection />;
            case 'achievements':
                return <AchievementsSection />;
            case 'quizzes':
                return <QuizzesSection />;
            case 'flashcards':
                return <FlashcardsSection />;
            case 'notes':
                return <NotesSection />;
            case 'rooms':
                return <RoomsSection />;
            case 'leaderboard':
                return <LeaderboardSection />;
            case 'history':
                return <SessionHistorySection />;
            case 'profile':
                return <Profile embedded />;
            default:
                return <OverviewSection stats={{ ...realtimeStats, streak }} recentDocuments={recentDocuments} quickActions={quickActions} {...commonProps} />;
        }
    }, [activeTab, realtimeStats, streak, recentDocuments, quickActions, handleTabChange, handleUploadClick, navigate, tutorialActive]);

    if (gamificationLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="relative w-16 h-16 mx-auto mb-6">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                            className="absolute inset-0 rounded-full border-4 border-gray-100 border-t-teal-500 shadow-lg"
                        />
                        <motion.div
                            animate={{ rotate: -360 }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                            className="absolute inset-2 rounded-full border-4 border-gray-50 border-t-cyan-500"
                        />
                    </div>
                    <p className="text-gray-900 font-bold text-lg mb-2">Loading your dashboard...</p>
                    <p className="text-gray-500 text-sm font-medium">Syncing real-time data</p>
                </div>
            </div>
        );
    }

    const greeting = GREETING();
    const currentStep = TUTORIAL_STEPS[currentTutorialStep];

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
            <AnimatePresence>
                {showXPAnimation && xpGained > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 80, scale: 0.3 }}
                        animate={{ opacity: 1, y: -50, scale: 1 }}
                        exit={{ opacity: 0, y: -120, scale: 0.3 }}
                        transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] pointer-events-none"
                    >
                        <div className="relative">
                            <div className="absolute -inset-8 bg-gradient-to-r from-yellow-400/40 via-yellow-300/40 to-yellow-400/40 blur-3xl" />
                            <div className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white px-12 py-6 rounded-2xl font-black text-4xl shadow-2xl border border-yellow-400/30 flex items-center gap-5">
                                <motion.div
                                    animate={{
                                        rotate: [0, 10, -10, 10, 0],
                                        scale: [1, 1.2, 1, 1.2, 1]
                                    }}
                                    transition={{ duration: 0.6 }}
                                >
                                    <Zap size={40} className="text-yellow-400 drop-shadow-lg fill-current" />
                                </motion.div>
                                <span className="drop-shadow-lg">+{xpGained} XP</span>
                                <motion.div
                                    animate={{ scale: [0, 1.5, 1] }}
                                    transition={{ duration: 0.4, times: [0, 0.6, 1] }}
                                >
                                    <Sparkles size={32} className="text-yellow-300" />
                                </motion.div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {notifications && notifications.length > 0 && notifications.map(notif => (
                    <AchievementToast
                        key={notif.id}
                        notification={notif}
                        onDismiss={() => dismissNotification(notif.id)}
                    />
                ))}
            </AnimatePresence>

            <LevelModal
                isOpen={levelModalOpen}
                onClose={() => setLevelModalOpen(false)}
                level={currentLevel}
                xp={currentXP}
            />

            <AnimatePresence>
                {tutorialActive && (
                    <TutorialOverlay
                        step={currentStep}
                        onNext={handleNextTutorialStep}
                        onPrev={handlePrevTutorialStep}
                        onSkip={skipTutorial}
                        currentStepIndex={currentTutorialStep}
                        totalSteps={TUTORIAL_STEPS.length}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showCommandPalette && (
                    <CommandPalette
                        isOpen={showCommandPalette}
                        onClose={() => setShowCommandPalette(false)}
                        onNavigate={handleTabChange}
                        quickActions={quickActions}
                    />
                )}
            </AnimatePresence>

            <MobileSidebar
                isOpen={mobileSidebarOpen}
                onClose={() => setMobileSidebarOpen(false)}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                onLogout={handleLogout}
            />

            <motion.aside
                initial={{ x: -240 }}
                animate={{ x: 0 }}
                transition={{ duration: 0.5, ease: [0.65, 0, 0.35, 1] }}
                className="fixed left-0 top-0 h-full w-60 bg-gradient-to-b from-gray-900 via-gray-850 to-gray-900 border-r border-gray-800/50 hidden lg:block overflow-y-auto z-40 shadow-2xl custom-scrollbar"
            >
                <div className="p-4 border-b border-gray-800/50">
                    <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                            <img src={logoImage} alt="StudyGloqe" className="h-14 w-18 rounded-lg shadow-lg" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-base font-black text-white tracking-tight truncate">StudyGloqe</h1>
                            <p className="text-[10px] text-gray-400 font-semibold truncate">AI Learning Platform</p>
                        </div>
                    </div>
                </div>

                <div id="xp-card" className="p-3">
                    <motion.div
                        whileHover={{ scale: 1.02, y: -2 }}
                        transition={{ duration: 0.2 }}
                        className="relative bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-xl p-4 border border-gray-700/50 shadow-xl"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">Level</p>
                                <div className="flex items-baseline gap-1.5">
                                    <motion.p
                                        key={currentLevel}
                                        initial={{ scale: 1.2, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-400"
                                    >
                                        {currentLevel}
                                    </motion.p>
                                    <Crown size={14} className="text-yellow-400 mb-1 fill-current" />
                                </div>
                            </div>
                            <CompactXPRing progress={xpProgress} />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between py-2 px-2.5 bg-white/5 rounded-lg">
                                <span className="text-gray-400 font-medium text-xs">XP</span>
                                <span className="text-white font-bold text-xs">
                                    <AnimatedCounter value={currentXP} /> / {xpForNextLevel}
                                </span>
                            </div>

                            <div className="flex items-center justify-between py-2 px-2.5 bg-white/5 rounded-lg">
                                <span className="text-gray-400 font-medium text-xs">Streak</span>
                                <span className="flex items-center gap-1.5">
                                    <Flame size={14} className="text-orange-400 fill-current" />
                                    <span className="text-orange-400 font-bold text-xs">{streak}d</span>
                                </span>
                            </div>
                        </div>
                    </motion.div>
                </div>

                <nav id="sidebar-nav" className="p-3 space-y-1">
                    {SIDEBAR_ITEMS.map((item) => (
                        <motion.button
                            key={item.tab}
                            onClick={() => handleTabChange(item.tab)}
                            whileHover={{ x: 4, scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-all ${activeTab === item.tab
                                ? 'text-white shadow-lg'
                                : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            {activeTab === item.tab && (
                                <motion.div
                                    layoutId="activeNavItem"
                                    className="absolute inset-0 bg-gradient-to-r from-white/15 to-white/5 backdrop-blur-sm border border-white/10 rounded-lg"
                                    transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                                />
                            )}
                            <item.icon size={18} strokeWidth={2} className="relative z-10 shrink-0" />
                            <span className="flex-1 text-left relative z-10 truncate">{item.label}</span>
                            {item.badge && (
                                <span className={`relative z-10 px-2 py-0.5 text-[10px] font-bold rounded-full ${item.badge === 'LIVE' ? 'bg-red-500 text-white animate-pulse' :
                                    item.badge === 'NEW' ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white' :
                                        'bg-gray-700 text-gray-300'
                                    }`}>
                                    {item.badge}
                                </span>
                            )}
                        </motion.button>
                    ))}
                </nav>

                <div className="p-3 mt-auto"></div>
            </motion.aside>

            <div className="lg:ml-60">
                <motion.header
                    initial={{ y: -60, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.4 }}
                    className="sticky top-0 z-30 bg-white/80 backdrop-blur-2xl border-b border-gray-200/60 shadow-sm"
                >
                    <div className="flex items-center justify-between px-5 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setMobileSidebarOpen(true)}
                                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-all"
                            >
                                <Menu size={20} className="text-gray-700" />
                            </motion.button>
                            <div className="min-w-0">
                                <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                                    <span>{greeting.emoji}</span>
                                    <span className="truncate">
                                        {greeting.text}, {userData?.displayName?.split(' ')[0] || 'Student'}!
                                    </span>
                                </h2>
                                <p className="text-xs text-gray-600 font-medium truncate">
                                    {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <AnimatePresence>
                                {shouldShowTutorialButton && (
                                    <motion.button
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        onClick={startTutorial}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="px-4 py-2 bg-gradient-to-r from-teal-500 via-cyan-500 to-teal-600 rounded-lg font-bold text-sm text-white shadow-lg flex items-center gap-2"
                                    >
                                        <Sparkles size={16} />
                                        <span className="hidden sm:inline">Tutorial</span>
                                    </motion.button>
                                )}
                            </AnimatePresence>

                            <motion.button
                                id="search-button"
                                onClick={() => setShowCommandPalette(true)}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="hidden md:flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-all border border-gray-200"
                            >
                                <Search size={16} className="text-gray-600" />
                                <span className="text-sm text-gray-600 font-medium">Search</span>
                                <kbd className="px-2 py-0.5 bg-white text-gray-500 text-xs font-semibold rounded border border-gray-200">⌘K</kbd>
                            </motion.button>

                            <motion.button
                                id="upload-button"
                                onClick={handleUploadClick}
                                whileHover={{ scale: 1.05, boxShadow: '0 0 35px rgba(20, 184, 166, 0.4)' }}
                                whileTap={{ scale: 0.95 }}
                                className="relative px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all overflow-hidden group bg-black border border-white/20 shadow-[0_0_20px_rgba(20,184,166,0.2)]"
                            >
                                {/* Diffused Glow Layer */}
                                <div className="absolute inset-0 rounded-xl opacity-90 blur-[3px]" style={{
                                    padding: '2.5px',
                                    background: 'linear-gradient(90deg, #14b8a6, #22d3ee, #8b5cf6, #f472b6, #14b8a6)',
                                    backgroundSize: '200% auto',
                                    animation: 'borderGlow 1.5s linear infinite, glowPulse 2s ease-in-out infinite',
                                    mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                                    maskComposite: 'exclude',
                                    WebkitMaskComposite: 'xor',
                                }} />

                                {/* Sharp Inner Border */}
                                <div className="absolute inset-0 rounded-xl" style={{
                                    padding: '1.2px',
                                    background: 'linear-gradient(90deg, #14b8a6, #22d3ee, #8b5cf6, #f472b6, #14b8a6)',
                                    backgroundSize: '200% auto',
                                    animation: 'borderGlow 1.5s linear infinite',
                                    mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                                    maskComposite: 'exclude',
                                    WebkitMaskComposite: 'xor',
                                }} />

                                <div className="relative z-10 flex items-center gap-2 text-white">
                                    <Upload size={18} className="text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
                                    <span className="hidden sm:inline font-black tracking-wider uppercase text-xs">
                                        Upload
                                    </span>
                                </div>
                            </motion.button>

                            <motion.button
                                onClick={() => handleTabChange('profile')}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="relative"
                                title="Profile"
                            >
                                {userData?.avatar || userData?.photoURL ? (
                                    <div className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-gray-200 hover:ring-teal-400 transition-all duration-300 shadow-lg">
                                        <img
                                            src={userData.avatar || userData.photoURL}
                                            alt="Profile"
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.nextElementSibling.style.display = 'flex';
                                            }}
                                        />
                                        <div className="hidden w-full h-full bg-gradient-to-br from-teal-500 to-cyan-500 items-center justify-center">
                                            <span className="text-white font-bold text-sm">
                                                {userData?.displayName?.[0]?.toUpperCase() || 'U'}
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center ring-2 ring-gray-200 hover:ring-teal-400 transition-all duration-300 shadow-lg">
                                        <span className="text-white font-bold text-sm">
                                            {userData?.displayName?.[0]?.toUpperCase() || 'U'}
                                        </span>
                                    </div>
                                )}
                            </motion.button>

                            <motion.button
                                onClick={handleLogout}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-all"
                                title="Logout"
                            >
                                <LogOut size={20} />
                            </motion.button>

                            <motion.button
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-all disabled:opacity-50"
                            >
                                <motion.div
                                    animate={isRefreshing ? { rotate: 360 } : {}}
                                    transition={{ duration: 1, repeat: isRefreshing ? Infinity : 0, ease: 'linear' }}
                                >
                                    <RefreshCw size={16} className="text-gray-600" />
                                </motion.div>
                            </motion.button>
                        </div>
                    </div>
                </motion.header>

                <main className="p-5">
                    <ErrorBoundary onReset={() => setActiveTab('overview')}>
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                            >
                                {renderContent()}
                            </motion.div>
                        </AnimatePresence>
                    </ErrorBoundary>
                </main>
            </div>

            <style>{`
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                .animate-shimmer {
                    animation: shimmer 2s infinite;
                }

                @keyframes borderGlow {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }

                @keyframes glowPulse {
                    0%, 100% { filter: brightness(1) saturate(1); }
                    50% { filter: brightness(1.5) saturate(1.5); }
                }

                @keyframes pulseGlow {
                    0%, 100% { opacity: 0.3; transform: scale(1); }
                    50% { opacity: 0.6; transform: scale(1.05); }
                }

                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }

                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }

                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                    transition: background 0.3s ease;
                }

                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.2);
                }

                .custom-scrollbar {
                    scrollbar-width: thin;
                    scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
                }
            `}</style>
        </div>
    );
};

export default Dashboard;
