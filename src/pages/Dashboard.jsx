// src/pages/Dashboard.jsx - ULTIMATE PREMIUM DASHBOARD (LEVEL UP FIX)
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BookOpen, Upload, Trophy, Clock, Users, Brain, Video, Bell,
    Layers, StickyNote, LayoutDashboard, LogOut, ChevronRight, Medal,
    Sparkles, TrendingUp, Zap, Flame, Target, Activity, Award,
    Search, Command, Menu, X, ChevronDown, Settings, HelpCircle,
    Calendar, BarChart3, Star, Gift, Rocket, Crown, Shield,
    CheckCircle2, ArrowUpRight, Plus, RefreshCw
} from 'lucide-react';
import { useAuth } from '@contexts/AuthContext';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@config/firebase';
import { awardDailyXP, DAILY_ACTIONS } from '@/services/gamificationService';
import { useGamification } from '@/hooks/useGamification';
import toast from 'react-hot-toast';
import logoImage from '@/assets/logo/logo.svg';

// Gamification Components
import LevelModal from '@/components/gamification/LevelModal';
import AchievementToast from '@/components/gamification/AchievementToast';

// Feature Sections
import OverviewSection from '@/components/features/OverviewSection';
import ClassesSection from '@/components/features/ClassesSection';
import DocumentsSection from '@/components/features/DocumentsSection';
import QuizzesSection from '@/components/features/QuizzesSection';
import FlashcardsSection from '@/components/features/FlashcardsSection';
import NotesSection from '@/components/features/NotesSection';
import RoomsSection from '@/components/features/RoomsSection';
import LeaderboardSection from '@/components/features/LeaderboardSection';
import SessionHistorySection from '@/components/features/SessionHistorySection';
import AchievementsSection from '@/components/features/AchievementsSection';

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
    { icon: Users, label: 'Classes', tab: 'classes', badge: null },
    { icon: BookOpen, label: 'Documents', tab: 'documents', badge: null },
    { icon: Medal, label: 'Achievements', tab: 'achievements', badge: 'NEW' },
    { icon: Brain, label: 'Quizzes', tab: 'quizzes', badge: null },
    { icon: Layers, label: 'Flashcards', tab: 'flashcards', badge: null },
    { icon: StickyNote, label: 'Notes', tab: 'notes', badge: null },
    { icon: Video, label: 'Study Rooms', tab: 'rooms', badge: 'LIVE' },
    { icon: Trophy, label: 'Leaderboard', tab: 'leaderboard', badge: null },
    { icon: Clock, label: 'History', tab: 'history', badge: null },
];

// ============================================
// ANIMATED COMPONENTS
// ============================================

const AnimatedCounter = ({ value, duration = 1000 }) => {
    const [displayValue, setDisplayValue] = useState(0);
    const prevValueRef = useRef(0);
    
    useEffect(() => {
        let startTime;
        const startValue = prevValueRef.current;
        
        const animate = (currentTime) => {
            if (!startTime) startTime = currentTime;
            const progress = Math.min((currentTime - startTime) / duration, 1);
            
            setDisplayValue(Math.floor(startValue + (value - startValue) * progress));
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                prevValueRef.current = value;
            }
        };
        
        if (value !== prevValueRef.current) {
            requestAnimationFrame(animate);
        }
    }, [value, duration]);
    
    return <span>{displayValue.toLocaleString()}</span>;
};

const XPProgressRing = ({ progress, size = 120, strokeWidth = 8 }) => {
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
                    stroke="url(#xpGradient)"
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    strokeLinecap="round"
                />
                <defs>
                    <linearGradient id="xpGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#fbbf24" />
                        <stop offset="50%" stopColor="#f97316" />
                        <stop offset="100%" stopColor="#ef4444" />
                    </linearGradient>
                </defs>
            </svg>
        </div>
    );
};

// ============================================
// COMMAND PALETTE (CMD+K)
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
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-[20vh]"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center gap-3 p-4 border-b border-gray-100">
                    <Search size={20} className="text-gray-400" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search pages, actions, or type a command..."
                        className="flex-1 bg-transparent text-gray-900 placeholder-gray-400 focus:outline-none text-lg"
                    />
                    <kbd className="px-2 py-1 bg-gray-100 text-gray-500 text-xs font-mono rounded">ESC</kbd>
                </div>
                
                <div className="max-h-80 overflow-y-auto p-2">
                    {filteredItems.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            No results found
                        </div>
                    ) : (
                        filteredItems.map((item, idx) => (
                            <button
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
                                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group"
                            >
                                <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-gray-200 transition-colors">
                                    {item.icon && <item.icon size={18} className="text-gray-600" />}
                                </div>
                                <div className="flex-1 text-left">
                                    <p className="font-semibold text-gray-900">{item.label}</p>
                                    {item.desc && <p className="text-xs text-gray-500">{item.desc}</p>}
                                </div>
                                {item.type === 'page' && (
                                    <span className="text-xs text-gray-400 font-medium">Navigate</span>
                                )}
                                {item.type === 'action' && (
                                    <span className="text-xs text-gray-400 font-medium">Action</span>
                                )}
                            </button>
                        ))
                    )}
                </div>
                
                <div className="p-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-xs">↑↓</kbd>
                            Navigate
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-xs">↵</kbd>
                            Select
                        </span>
                    </div>
                    <span>Tip: Press <kbd className="px-1.5 py-0.5 bg-gray-200 rounded">⌘K</kbd> anytime</span>
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
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 lg:hidden"
                    onClick={onClose}
                />
                <motion.div
                    initial={{ x: -300 }}
                    animate={{ x: 0 }}
                    exit={{ x: -300 }}
                    transition={{ type: 'spring', damping: 25 }}
                    className="fixed left-0 top-0 h-full w-80 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 z-50 lg:hidden overflow-y-auto"
                >
                    <div className="p-4 flex items-center justify-between border-b border-gray-700">
                        <div className="flex items-center gap-3">
                            <img src={logoImage} alt="Logo" className="h-10 w-10" />
                            <span className="text-xl font-black text-white">StudyGloqe</span>
                        </div>
                        <button onClick={onClose} className="p-2 text-gray-400 hover:text-white">
                            <X size={24} />
                        </button>
                    </div>
                    
                    <nav className="p-4 space-y-1">
                        {SIDEBAR_ITEMS.map((item) => (
                            <button
                                key={item.tab}
                                onClick={() => { onTabChange(item.tab); onClose(); }}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
                                    activeTab === item.tab
                                        ? 'bg-gray-700 text-white'
                                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                                }`}
                            >
                                <item.icon size={20} />
                                <span>{item.label}</span>
                                {item.badge && (
                                    <span className={`ml-auto px-2 py-0.5 text-xs font-bold rounded-full ${
                                        item.badge === 'LIVE' ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-600 text-gray-300'
                                    }`}>
                                        {item.badge}
                                    </span>
                                )}
                            </button>
                        ))}
                    </nav>
                    
                    <div className="p-4 border-t border-gray-700 mt-auto">
                        <button
                            onClick={onLogout}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/20 font-bold transition-all"
                        >
                            <LogOut size={18} />
                            Logout
                        </button>
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
    
    // Gamification Hook
    const {
        xp: currentXP,
        level: currentLevel,
        nextLevelXp: xpForNextLevel,
        levelProgress: xpProgress,
        streak,
        loading: gamificationLoading,
        notifications,
        dismissNotification
    } = useGamification();
    
    // State
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
    const [showLevelUp, setShowLevelUp] = useState(false);
    
    const initialTab = searchParams.get('tab') || 'overview';
    const [activeTab, setActiveTab] = useState(initialTab);
    
    // ✅ REFS FOR LEVEL UP DETECTION (FIXED)
    const isMountedRef = useRef(true);
    const listenersRef = useRef([]);
    const isInitialLoadRef = useRef(true);
    const lastKnownLevelRef = useRef(null);
    const processedNotificationsRef = useRef(new Set());

    // ============================================
    // KEYBOARD SHORTCUTS
    // ============================================
    
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

    // ============================================
    // MOUNT/UNMOUNT TRACKING
    // ============================================
    
    useEffect(() => {
        isMountedRef.current = true;
        
        // ✅ Load last known level from localStorage on mount
        if (user?.uid) {
            const storedLevel = localStorage.getItem(`lastKnownLevel_${user.uid}`);
            if (storedLevel) {
                lastKnownLevelRef.current = parseInt(storedLevel, 10);
            }
        }
        
        return () => {
            isMountedRef.current = false;
            listenersRef.current.forEach(unsubscribe => unsubscribe());
        };
    }, [user?.uid]);

    // ============================================
    // ✅ FIXED: LEVEL UP DETECTION - ONLY ON ACTUAL LEVEL UP
    // ============================================
    
    useEffect(() => {
        // Skip if no level data yet
        if (!currentLevel || currentLevel <= 0) return;
        
        // ✅ Get stored level from localStorage
        const storedLevel = user?.uid 
            ? parseInt(localStorage.getItem(`lastKnownLevel_${user.uid}`), 10) 
            : null;
        
        // ✅ On initial load, just store the level - NO animation
        if (isInitialLoadRef.current) {
            isInitialLoadRef.current = false;
            lastKnownLevelRef.current = storedLevel || currentLevel;
            
            // Store in localStorage for persistence across navigation
            if (user?.uid) {
                localStorage.setItem(`lastKnownLevel_${user.uid}`, currentLevel.toString());
            }
            return; // ✅ Don't show animation on initial load
        }
        
        // ✅ Compare with BOTH ref and localStorage to prevent false positives
        const previousLevel = lastKnownLevelRef.current || storedLevel || currentLevel;
        
        // ✅ Only show animation if level ACTUALLY increased
        if (currentLevel > previousLevel) {
            console.log('🎉 Level Up Detected!', previousLevel, '->', currentLevel);
            
            setShowLevelUp(true);
            
            // Update both ref and localStorage
            lastKnownLevelRef.current = currentLevel;
            if (user?.uid) {
                localStorage.setItem(`lastKnownLevel_${user.uid}`, currentLevel.toString());
            }
            
            // Hide animation after 4 seconds
            setTimeout(() => {
                if (isMountedRef.current) {
                    setShowLevelUp(false);
                }
            }, 4000);
        } else {
            // ✅ No level up, just sync the ref
            lastKnownLevelRef.current = currentLevel;
        }
        
    }, [currentLevel, user?.uid]);

    // ============================================
    // ✅ FIXED: GAMIFICATION NOTIFICATIONS HANDLER
    // ============================================
    
    useEffect(() => {
        if (!notifications || notifications.length === 0) return;
        
        notifications.forEach(notification => {
            // ✅ Skip already processed notifications
            if (processedNotificationsRef.current.has(notification.id)) {
                return;
            }
            
            // Mark as processed
            processedNotificationsRef.current.add(notification.id);
            
            if (notification.type === 'levelUp') {
                // ✅ Level up is now handled by the level detection effect above
                // Just show the toast here
                toast.success(`🎉 Level Up! You're now Level ${notification.data.newLevel}!`, {
                    duration: 4000,
                    style: {
                        background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
                        color: '#fff',
                        fontWeight: 'bold',
                        borderRadius: '16px',
                        padding: '16px 24px',
                    },
                });
            } else if (notification.data?.xpReward) {
                // Show XP animation for other rewards
                setXpGained(notification.data.xpReward);
                setShowXPAnimation(true);
                setTimeout(() => {
                    if (isMountedRef.current) setShowXPAnimation(false);
                }, 2500);
            }
            
            // Auto-dismiss notification
            setTimeout(() => {
                dismissNotification(notification.id);
            }, 4000);
        });
    }, [notifications, dismissNotification]);

    // ============================================
    // REAL-TIME DOCUMENTS LISTENER
    // ============================================
    
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

    // ============================================
    // REAL-TIME STUDY SESSIONS LISTENER
    // ============================================
    
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

    // ============================================
    // DAILY LOGIN BONUS
    // ============================================
    
    useEffect(() => {
        if (!user?.uid) return;

        const lastLogin = localStorage.getItem(`lastLogin_${user.uid}`);
        const today = new Date().toDateString();
        
        if (lastLogin !== today) {
            awardDailyXP(user.uid, DAILY_ACTIONS.DAILY_LOGIN, 'Daily Login Bonus')
                .then(result => {
                    if (result.success && isMountedRef.current) {
                        localStorage.setItem(`lastLogin_${user.uid}`, today);
                        toast.success(`🎁 Daily bonus: +${result.xpGained} XP!`, {
                            duration: 3000,
                            style: {
                                background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
                                color: '#fff',
                                fontWeight: 'bold',
                                borderRadius: '16px',
                                padding: '16px 24px',
                            },
                        });
                    }
                })
                .catch(err => console.error('Daily bonus error:', err));
        }
    }, [user?.uid]);

    // ============================================
    // TAB MANAGEMENT
    // ============================================
    
    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab && tab !== activeTab) {
            setActiveTab(tab);
        }
    }, [searchParams]);

    const handleTabChange = useCallback((tabId) => {
        if (tabId !== activeTab) {
            setActiveTab(tabId);
            setSearchParams({ tab: tabId });
        }
    }, [activeTab, setSearchParams]);

    // ============================================
    // HANDLERS
    // ============================================

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

    // ============================================
    // QUICK ACTIONS
    // ============================================

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
        }
    ], [handleUploadClick]);

    // ============================================
    // RENDER CONTENT
    // ============================================

    const renderContent = useCallback(() => {
        const commonProps = {
            handleTabChange,
            handleUploadClick,
            navigate,
        };

        switch (activeTab) {
            case 'overview':
                return (
                    <OverviewSection
                        stats={{ ...realtimeStats, streak }}
                        recentDocuments={recentDocuments}
                        quickActions={quickActions}
                        {...commonProps}
                    />
                );
            case 'classes': return <ClassesSection />;
            case 'documents': return <DocumentsSection />;
            case 'achievements': return <AchievementsSection />;
            case 'quizzes': return <QuizzesSection />;
            case 'flashcards': return <FlashcardsSection />;
            case 'notes': return <NotesSection />;
            case 'rooms': return <RoomsSection />;
            case 'leaderboard': return <LeaderboardSection />;
            case 'history': return <SessionHistorySection />;
            default:
                return (
                    <OverviewSection
                        stats={{ ...realtimeStats, streak }}
                        recentDocuments={recentDocuments}
                        quickActions={quickActions}
                        {...commonProps}
                    />
                );
        }
    }, [activeTab, realtimeStats, streak, recentDocuments, quickActions, handleTabChange, handleUploadClick, navigate]);

    // ============================================
    // LOADING STATE
    // ============================================

    if (gamificationLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        className="w-16 h-16 border-4 border-gray-200 border-t-gray-800 rounded-full mx-auto mb-6"
                    />
                    <p className="text-gray-700 font-bold text-lg">Loading your dashboard...</p>
                    <p className="text-gray-500 text-sm mt-2">Syncing real-time data</p>
                </div>
            </div>
        );
    }

    const greeting = GREETING();

    // ============================================
    // RENDER
    // ============================================

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
            
            {/* XP GAIN ANIMATION */}
            <AnimatePresence>
                {showXPAnimation && xpGained > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.5 }}
                        animate={{ opacity: 1, y: -30, scale: 1 }}
                        exit={{ opacity: 0, y: -80, scale: 0.5 }}
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] pointer-events-none"
                    >
                        <div className="bg-gradient-to-br from-gray-900 to-black text-white px-8 py-4 rounded-2xl font-black text-2xl shadow-2xl border border-gray-700 flex items-center gap-3">
                            <Zap size={28} className="text-yellow-400" fill="currentColor" />
                            +{xpGained} XP
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ✅ LEVEL UP ANIMATION - ONLY SHOWS ON ACTUAL LEVEL UP */}
            <AnimatePresence>
                {showLevelUp && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
                    >
                        <div className="bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 text-white px-12 py-8 rounded-3xl font-black text-center shadow-2xl border-4 border-white">
                            <motion.div
                                animate={{ rotate: [0, 360] }}
                                transition={{ duration: 1 }}
                            >
                                <Crown size={56} className="mx-auto mb-4" />
                            </motion.div>
                            <div className="text-4xl mb-2">Level {currentLevel}!</div>
                            <div className="text-lg opacity-90">You're getting stronger!</div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* COMMAND PALETTE */}
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

            {/* MOBILE SIDEBAR */}
            <MobileSidebar
                isOpen={mobileSidebarOpen}
                onClose={() => setMobileSidebarOpen(false)}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                onLogout={handleLogout}
            />

            {/* DESKTOP SIDEBAR */}
            <aside className="hidden lg:flex w-72 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 fixed h-screen flex-col border-r border-gray-700 z-40">
                
                {/* Logo */}
                <div className="p-5 border-b border-gray-700/50">
                    <Link to="/dashboard" className="flex items-center gap-3 group">
                        <img 
                            src={logoImage} 
                            alt="StudyGloqe" 
                            className="h-10 w-10 drop-shadow-lg transition-transform group-hover:scale-110" 
                        />
                        <div>
                            <div className="text-xl font-black text-white">StudyGloqe</div>
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                Real-time Learning
                            </div>
                        </div>
                    </Link>
                </div>

                {/* XP Card */}
                <button
                    onClick={() => setLevelModalOpen(true)}
                    className="mx-4 mt-4 p-4 bg-gradient-to-br from-gray-700/80 to-gray-800/80 hover:from-gray-600/80 hover:to-gray-700/80 rounded-2xl border border-gray-600/50 transition-all group cursor-pointer relative overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    
                    <div className="relative flex items-center gap-4">
                        <div className="relative">
                            <XPProgressRing progress={xpProgress} size={56} strokeWidth={4} />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-white font-black text-sm">{currentLevel}</span>
                            </div>
                        </div>
                        
                        <div className="flex-1 text-left">
                            <div className="flex items-center gap-2 mb-1">
                                <Sparkles size={14} className="text-yellow-400" />
                                <span className="text-white font-black text-sm">
                                    {currentXP.toLocaleString()} XP
                                </span>
                            </div>
                            <div className="text-xs text-gray-400">
                                {(xpForNextLevel - currentXP).toLocaleString()} XP to Level {currentLevel + 1}
                            </div>
                        </div>
                        
                        <ChevronRight size={16} className="text-gray-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
                    </div>
                </button>

                {/* Quick Stats */}
                <div className="mx-4 mt-3 grid grid-cols-2 gap-2">
                    <div className="bg-gray-800/50 rounded-xl p-3 border border-gray-700/50">
                        <div className="flex items-center gap-1.5 mb-1">
                            <Flame size={14} className="text-orange-400" />
                            <span className="text-xs text-gray-500 font-semibold">Streak</span>
                        </div>
                        <p className="text-xl font-black text-white">{streak}</p>
                    </div>
                    <div className="bg-gray-800/50 rounded-xl p-3 border border-gray-700/50">
                        <div className="flex items-center gap-1.5 mb-1">
                            <Clock size={14} className="text-blue-400" />
                            <span className="text-xs text-gray-500 font-semibold">Today</span>
                        </div>
                        <p className="text-xl font-black text-white">{realtimeStats.totalStudyTime}m</p>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto custom-scrollbar">
                    {SIDEBAR_ITEMS.map((item, index) => (
                        <Link
                            key={item.tab}
                            to={`/dashboard?tab=${item.tab}`}
                            onClick={() => handleTabChange(item.tab)}
                            className={`group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all relative ${
                                activeTab === item.tab
                                    ? 'bg-white/10 text-white'
                                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                            }`}
                        >
                            {activeTab === item.tab && (
                                <motion.div 
                                    layoutId="activeTab"
                                    className="absolute left-0 w-1 h-8 bg-white rounded-r-full"
                                />
                            )}
                            
                            <item.icon size={20} strokeWidth={2.5} />
                            <span className="flex-1">{item.label}</span>
                            
                            {item.badge && (
                                <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                                    item.badge === 'LIVE' 
                                        ? 'bg-red-500/20 text-red-400 animate-pulse' 
                                        : 'bg-gray-600 text-gray-300'
                                }`}>
                                    {item.badge}
                                </span>
                            )}
                            
                            <span className="text-xs text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                ⌥{index + 1}
                            </span>
                        </Link>
                    ))}

                    <button
                        onClick={handleUploadClick}
                        className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-white text-gray-900 font-black hover:shadow-xl hover:scale-[1.02] transition-all group"
                    >
                        <Plus size={20} className="group-hover:rotate-90 transition-transform" />
                        Upload PDF
                    </button>
                </nav>

                {/* Bottom */}
                <div className="p-4 border-t border-gray-700/50 space-y-2">
                    <button
                        onClick={() => setShowCommandPalette(true)}
                        className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-800 hover:text-gray-300 transition-all"
                    >
                        <div className="flex items-center gap-2">
                            <Search size={16} />
                            <span>Search</span>
                        </div>
                        <kbd className="px-2 py-0.5 bg-gray-700 text-xs rounded">⌘K</kbd>
                    </button>
                    
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:bg-red-500/10 hover:text-red-400 transition-all"
                    >
                        <LogOut size={16} />
                        Logout
                    </button>
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <main className="lg:ml-72">
                
                {/* Top Bar */}
                <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-100">
                    <div className="px-4 lg:px-8 py-4 flex items-center justify-between gap-4">
                        
                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setMobileSidebarOpen(true)}
                            className="lg:hidden p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
                        >
                            <Menu size={24} className="text-gray-700" />
                        </button>

                        {/* Search Bar */}
                        <button
                            onClick={() => setShowCommandPalette(true)}
                            className="hidden md:flex items-center gap-3 flex-1 max-w-md px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors group"
                        >
                            <Search size={18} className="text-gray-400" />
                            <span className="text-gray-500 text-sm">Search anything...</span>
                            <kbd className="ml-auto px-2 py-0.5 bg-gray-200 text-gray-500 text-xs rounded font-mono">⌘K</kbd>
                        </button>

                        {/* Right Actions */}
                        <div className="flex items-center gap-3">
                            
                            {/* Refresh */}
                            <button
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                                className="p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
                            >
                                <RefreshCw size={18} className={`text-gray-600 ${isRefreshing ? 'animate-spin' : ''}`} />
                            </button>

                            {/* Profile */}
                            <Link
                                to="/profile"
                                className="flex items-center gap-3 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-all group"
                            >
                                <div className="relative">
                                    {userData?.profilePicture ? (
                                        <img
                                            src={userData.profilePicture}
                                            alt={userData.name || 'User'}
                                            className="w-9 h-9 rounded-lg object-cover"
                                        />
                                    ) : (
                                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white font-bold text-sm">
                                            {userData?.name?.charAt(0) || user?.email?.charAt(0).toUpperCase() || 'U'}
                                        </div>
                                    )}
                                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                                </div>
                                <div className="hidden sm:block text-left">
                                    <p className="text-sm font-bold text-gray-900 truncate max-w-[120px]">
                                        {userData?.name?.split(' ')[0] || 'User'}
                                    </p>
                                    <p className="text-xs text-gray-500">Level {currentLevel}</p>
                                </div>
                                <ChevronDown size={16} className="text-gray-400 hidden sm:block" />
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="p-4 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
                    
                    {/* Header */}
                    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                        <div>
                            <div className="text-sm text-gray-500 mb-1 flex items-center gap-2 font-medium">
                                <Calendar size={14} />
                                {new Date().toLocaleDateString('en-US', { 
                                    weekday: 'long', 
                                    month: 'long', 
                                    day: 'numeric'
                                })}
                            </div>
                            <h1 className="text-3xl lg:text-4xl font-black text-gray-900 mb-2">
                                {greeting.text}, {userData?.name?.split(' ')[0] || 'Student'} {greeting.emoji}
                            </h1>
                            <p className="text-gray-600 font-medium flex items-center gap-2">
                                {streak > 0 ? (
                                    <>
                                        <Flame size={18} className="text-orange-500" />
                                        {streak} day streak! Keep it up!
                                    </>
                                ) : (
                                    <>
                                        <Rocket size={18} className="text-gray-400" />
                                        Start studying to build your streak
                                    </>
                                )}
                            </p>
                        </div>

                        {/* Quick Stats Cards */}
                        <div className="flex gap-3 overflow-x-auto pb-2 lg:pb-0">
                            <div className="flex-shrink-0 px-4 py-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                                <div className="flex items-center gap-2 text-gray-500 text-xs font-semibold mb-1">
                                    <BookOpen size={14} />
                                    Documents
                                </div>
                                <p className="text-2xl font-black text-gray-900">{realtimeStats.totalDocuments}</p>
                            </div>
                            <div className="flex-shrink-0 px-4 py-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                                <div className="flex items-center gap-2 text-gray-500 text-xs font-semibold mb-1">
                                    <Brain size={14} />
                                    Sessions
                                </div>
                                <p className="text-2xl font-black text-gray-900">{realtimeStats.totalSessions}</p>
                            </div>
                            <div className="flex-shrink-0 px-4 py-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                                <div className="flex items-center gap-2 text-gray-500 text-xs font-semibold mb-1">
                                    <Clock size={14} />
                                    Study Time
                                </div>
                                <p className="text-2xl font-black text-gray-900">{realtimeStats.totalStudyTime}m</p>
                            </div>
                        </div>
                    </div>

                    {/* Main Content */}
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
                </div>
            </main>

            {/* MODALS */}
            <LevelModal 
                isOpen={levelModalOpen} 
                onClose={() => setLevelModalOpen(false)} 
            />

            <AchievementToast 
                achievement={notifications[0]?.data}
                onClose={() => notifications[0] && dismissNotification(notifications[0].id)}
            />

            {/* STYLES */}
            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(107, 114, 128, 0.3);
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(107, 114, 128, 0.5);
                }
            `}</style>
        </div>
    );
};

export default Dashboard;
