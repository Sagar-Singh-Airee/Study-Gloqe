// src/features/teacher/pages/TeacherDashboard.jsx
// ✅ PROFESSIONAL TEACHER DASHBOARD 2025 - ENHANCED UI

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BookOpen, Users, Trophy, Clock, Brain, Video, Bell, ClipboardList,
    FileText, LayoutDashboard, LogOut, ChevronRight, Sparkles, TrendingUp,
    Zap, Target, Activity, Award, Search, Command, Menu, X, ChevronDown,
    Calendar, BarChart3, Star, Plus, RefreshCw, Settings, User, MessageSquare,
    BookMarked, Megaphone, Shield, Crown, AlertCircle, CheckCircle2, ArrowUpRight,
    Flame, Gift, Info, MousePointerClick, HelpCircle
} from 'lucide-react';
import { useAuth } from '@auth/contexts/AuthContext';
import { collection, query, where, getDocs, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '@shared/config/firebase';
import toast from 'react-hot-toast';
import logoImage from '@assets/logo/loma.png';

// Teacher Dashboard Sections
import OverviewSection from '@teacher/components/dashboard/OverviewSection';
import ClassesSection from '@teacher/components/dashboard/ClassesSection';
import StudentsSection from '@teacher/components/dashboard/StudentsSection';
import AssignmentsSection from '@teacher/components/dashboard/AssignmentsSection';
import QuizzesSection from '@teacher/components/dashboard/QuizzesSection';
import MaterialsSection from '@teacher/components/dashboard/MaterialsSection';
import LiveSessionsSection from '@teacher/components/dashboard/LiveSessionsSection';
import GradeBookSection from '@teacher/components/dashboard/GradeBookSection';
import AnnouncementsSection from '@teacher/components/dashboard/AnnouncementsSection';
import AnalyticsSection from '@teacher/components/dashboard/AnalyticsSection';
import LeaderboardSection from '@analytics/components/LeaderboardSection';
import Profile from '@teacher/components/TeacherProfile'; // You'll need to create this

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
    { icon: BookOpen, label: 'Classes', tab: 'classes', badge: null },
    { icon: Users, label: 'Students', tab: 'students', badge: null },
    { icon: ClipboardList, label: 'Assignments', tab: 'assignments', badge: null },
    { icon: Brain, label: 'Quizzes', tab: 'quizzes', badge: null },
    { icon: FileText, label: 'Materials', tab: 'materials', badge: null },
    { icon: Video, label: 'Live Sessions', tab: 'live-sessions', badge: 'LIVE' },
    { icon: BookMarked, label: 'Grade Book', tab: 'gradebook', badge: null },
    { icon: Megaphone, label: 'Announcements', tab: 'announcements', badge: null },
    { icon: Trophy, label: 'Leaderboard', tab: 'leaderboard', badge: null },
];

const TUTORIAL_STEPS = [
    {
        id: 'welcome',
        title: '👋 Welcome to StudyGloqe Teacher Portal!',
        description: 'Let\'s take a quick tour of your teaching dashboard.',
        target: null,
        position: 'center',
    },
    {
        id: 'create-class',
        title: '📚 Create Your First Class',
        description: 'Start by creating a classroom. You can invite students using a unique class code.',
        target: 'create-class-button',
        position: 'bottom',
        highlight: 'teal',
    },
    {
        id: 'stats-card',
        title: '📊 Track Your Impact',
        description: 'Monitor total students, pending reviews, and class performance at a glance.',
        target: 'stats-card',
        position: 'right',
        highlight: 'teal',
    },
    {
        id: 'assignments',
        title: '📝 Create Assignments',
        description: 'Assign homework, track submissions, and grade student work efficiently.',
        target: 'sidebar-nav',
        position: 'right',
        highlight: 'teal',
    },
    {
        id: 'complete',
        title: '🎉 You\'re All Set!',
        description: 'Start teaching with AI-powered tools. Create your first class to begin!',
        target: null,
        position: 'center',
    },
];

// ============================================
// ANIMATED COMPONENTS
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

    return <>{displayValue.toLocaleString()}</>;
};

// Compact Stats Ring for sidebar
const CompactStatsRing = ({ progress, size = 56 }) => {
    const strokeWidth = 4;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress / 100) * circumference;

    return (
        <svg width={size} height={size} className="transform -rotate-90">
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke="rgba(255,255,255,0.2)"
                strokeWidth={strokeWidth}
                fill="none"
            />
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke="url(#progressGradient)"
                strokeWidth={strokeWidth}
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
            />
            <defs>
                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#14b8a6" />
                    <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
            </defs>
        </svg>
    );
};

// ============================================
// MAIN DASHBOARD COMPONENT
// ============================================

const TeacherDashboard = () => {
    const { user, userData, logout } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // ============================================
    // STATE MANAGEMENT
    // ============================================
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [showMobileSidebar, setShowMobileSidebar] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showProfile, setShowProfile] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showTutorial, setShowTutorial] = useState(false);
    const [tutorialStep, setTutorialStep] = useState(0);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [classes, setClasses] = useState([]);

    // Teacher Stats
    const [stats, setStats] = useState({
        totalClasses: 0,
        totalStudents: 0,
        avgProgress: 0,
        pendingReviews: 0,
        activeQuizzes: 0,
        upcomingDeadlines: 0,
        weeklyGrowth: 0,
        activeStudentsToday: 0,
        submissionsToday: 0,
    });

    // ============================================
    // LOAD TEACHER DATA WITH REAL-TIME SYNC
    // ============================================

    useEffect(() => {
        if (!user?.uid) return;

        // Check if tutorial should be shown (first time user)
        const hasSeenTutorial = localStorage.getItem(`teacher_tutorial_${user.uid}`);
        if (!hasSeenTutorial && userData?.role === 'teacher') {
            setShowTutorial(true);
        }

        loadTeacherData();

        // Real-time class sync
        const classesQuery = query(
            collection(db, 'classes'),
            where('teacherId', '==', user.uid),
            where('active', '==', true),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(classesQuery, (snapshot) => {
            const classesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            }));
            setClasses(classesData);
            calculateStats(classesData);
        });

        return () => unsubscribe();
    }, [user?.uid, userData]);

    const loadTeacherData = async () => {
        try {
            setLoading(true);

            // Load notifications
            const notifQuery = query(
                collection(db, 'notifications'),
                where('userId', '==', user.uid),
                where('read', '==', false),
                orderBy('createdAt', 'desc'),
                limit(10)
            );
            const notifSnap = await getDocs(notifQuery);
            setNotifications(notifSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        } catch (error) {
            console.error('Error loading teacher data:', error);
            toast.error('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = async (classesData) => {
        try {
            // Calculate total students
            const allStudentIds = new Set();
            classesData.forEach(cls => {
                (cls.students || []).forEach(id => allStudentIds.add(id));
            });

            // Load assignments for pending reviews
            const assignmentsQuery = query(
                collection(db, 'assignments'),
                where('teacherId', '==', user.uid)
            );
            const assignmentsSnap = await getDocs(assignmentsQuery);
            const assignmentsData = assignmentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const pendingReviews = assignmentsData.reduce((count, assignment) => {
                const ungraded = (assignment.submissions || []).filter(s => !s.graded).length;
                return count + ungraded;
            }, 0);

            // Calculate submissions today
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const submissionsToday = assignmentsData.reduce((count, assignment) => {
                const todaySubmissions = (assignment.submissions || []).filter(s => {
                    const subDate = s.submittedAt?.toDate?.() || new Date(s.submittedAt);
                    return subDate >= today;
                }).length;
                return count + todaySubmissions;
            }, 0);

            setStats({
                totalClasses: classesData.length,
                totalStudents: allStudentIds.size,
                avgProgress: 78, // Calculate from actual student progress
                pendingReviews,
                activeQuizzes: 12, // From quizzes collection
                upcomingDeadlines: 3,
                weeklyGrowth: 15,
                activeStudentsToday: Math.floor(allStudentIds.size * 0.65),
                submissionsToday,
            });

        } catch (error) {
            console.error('Error calculating stats:', error);
        }
    };

    // ============================================
    // TAB SWITCHING
    // ============================================

    const handleTabChange = useCallback((tab) => {
        setActiveTab(tab);
        setSearchParams({ tab });
        setShowMobileSidebar(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [setSearchParams]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyPress = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setShowSearch(true);
            }
            if (e.key === 'Escape') {
                setShowSearch(false);
                setShowMobileSidebar(false);
                setShowProfile(false);
                setShowNotifications(false);
                setShowTutorial(false);
            }
            if (e.altKey && /^[1-9]$/.test(e.key)) {
                const index = parseInt(e.key) - 1;
                if (SIDEBAR_ITEMS[index]) {
                    handleTabChange(SIDEBAR_ITEMS[index].tab);
                }
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [handleTabChange]);

    // ============================================
    // SEARCH FUNCTIONALITY
    // ============================================

    const searchItems = useMemo(() => [
        { label: 'Overview', desc: 'Dashboard home', tab: 'overview', icon: LayoutDashboard },
        { label: 'Analytics', desc: 'Performance insights', tab: 'analytics', icon: BarChart3 },
        { label: 'Classes', desc: 'Manage classrooms', tab: 'classes', icon: BookOpen },
        { label: 'Students', desc: 'View all students', tab: 'students', icon: Users },
        { label: 'Assignments', desc: 'Create and grade', tab: 'assignments', icon: ClipboardList },
        { label: 'Quizzes', desc: 'AI-powered quizzes', tab: 'quizzes', icon: Brain },
        { label: 'Materials', desc: 'Upload resources', tab: 'materials', icon: FileText },
        { label: 'Live Sessions', desc: 'Virtual classrooms', tab: 'live-sessions', icon: Video },
        { label: 'Grade Book', desc: 'Student grades', tab: 'gradebook', icon: BookMarked },
        { label: 'Announcements', desc: 'Notify students', tab: 'announcements', icon: Megaphone },
        { label: 'Leaderboard', desc: 'Top performers', tab: 'leaderboard', icon: Trophy },
    ], []);

    const filteredSearchItems = useMemo(() => {
        if (!searchQuery.trim()) return searchItems;
        return searchItems.filter(item =>
            item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.desc.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [searchQuery, searchItems]);

    // ============================================
    // TUTORIAL HANDLERS
    // ============================================

    const handleTutorialNext = () => {
        if (tutorialStep < TUTORIAL_STEPS.length - 1) {
            setTutorialStep(tutorialStep + 1);
        } else {
            completeTutorial();
        }
    };

    const completeTutorial = () => {
        localStorage.setItem(`teacher_tutorial_${user.uid}`, 'completed');
        setShowTutorial(false);
        setTutorialStep(0);
        toast.success('Tutorial completed! 🎉');
    };

    // ============================================
    // LOGOUT
    // ============================================

    const handleLogout = async () => {
        try {
            await logout();
            toast.success('Logged out successfully');
            navigate('/auth');
        } catch (error) {
            toast.error('Failed to logout');
        }
    };

    // ============================================
    // RENDER LOADING STATE
    // ============================================

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-4"
                    />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Loading your dashboard...</h3>
                    <p className="text-gray-600">Syncing real-time data</p>
                </div>
            </div>
        );
    }

    const greeting = GREETING();
    const currentStep = TUTORIAL_STEPS[tutorialStep];

    // ============================================
    // MAIN RENDER
    // ============================================

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-teal-50/30">

            {/* ============================================
          TUTORIAL OVERLAY
      ============================================ */}
            <AnimatePresence>
                {showTutorial && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/70 z-[100] backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] w-full max-w-md bg-white rounded-3xl shadow-2xl p-8"
                        >
                            <div className="text-center mb-6">
                                <div className="text-5xl mb-4">{currentStep.title.split(' ')[0]}</div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                                    {currentStep.title.substring(currentStep.title.indexOf(' ') + 1)}
                                </h3>
                                <p className="text-gray-600">{currentStep.description}</p>
                            </div>

                            <div className="flex items-center justify-center gap-2 mb-6">
                                {TUTORIAL_STEPS.map((_, index) => (
                                    <div
                                        key={index}
                                        className={`h-2 rounded-full transition-all ${index === tutorialStep
                                            ? 'w-8 bg-teal-500'
                                            : index < tutorialStep
                                                ? 'w-2 bg-teal-300'
                                                : 'w-2 bg-gray-300'
                                            }`}
                                    />
                                ))}
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => completeTutorial()}
                                    className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-all"
                                >
                                    Skip
                                </button>
                                <button
                                    onClick={handleTutorialNext}
                                    className="flex-1 px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-bold hover:shadow-lg hover:scale-105 transition-all"
                                >
                                    {tutorialStep === TUTORIAL_STEPS.length - 1 ? 'Get Started' : 'Next'}
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* ============================================
          NAVBAR (TOP)
      ============================================ */}
            <motion.nav
                initial={{ y: -100 }}
                animate={{ y: 0 }}
                className="fixed top-0 left-0 right-0 h-16 bg-white/90 backdrop-blur-xl border-b border-gray-200 z-50"
            >
                <div className="h-full px-4 flex items-center justify-between">

                    {/* Left: Logo + Mobile Menu */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setShowMobileSidebar(true)}
                            className="lg:hidden p-2 rounded-xl hover:bg-gray-100 transition-all"
                        >
                            <Menu className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-3">
                            <img src={logoImage} alt="Logo" className="w-8 h-8" />
                            <div className="hidden sm:block">
                                <h1 className="text-lg font-bold text-gray-900">StudyGloqe</h1>
                                <p className="text-xs text-gray-600">Teacher Portal</p>
                            </div>
                        </div>
                    </div>

                    {/* Center: Greeting */}
                    <div className="hidden md:flex items-center gap-3">
                        <span className="text-2xl">{greeting.emoji}</span>
                        <div>
                            <p className="text-sm font-semibold text-gray-900">
                                {greeting.text}, {userData?.name || 'Teacher'}!
                            </p>
                            <p className="text-xs text-gray-600">
                                {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            </p>
                        </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2">

                        {/* Search Button */}
                        <button
                            id="search-button"
                            onClick={() => setShowSearch(true)}
                            className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all group"
                        >
                            <Search className="w-4 h-4 text-gray-600 group-hover:scale-110 transition-transform" />
                            <span className="text-sm text-gray-600">Search</span>
                            <kbd className="hidden lg:inline px-2 py-0.5 bg-white border border-gray-300 rounded text-xs text-gray-600">
                                ⌘K
                            </kbd>
                        </button>

                        {/* Tutorial Button */}
                        <button
                            onClick={() => {
                                setShowTutorial(true);
                                setTutorialStep(0);
                            }}
                            className="p-2 rounded-xl hover:bg-gray-100 transition-all relative group"
                            title="Show Tutorial"
                        >
                            <HelpCircle className="w-5 h-5 text-gray-600 group-hover:scale-110 transition-transform" />
                        </button>

                        {/* Notifications */}
                        <button
                            onClick={() => setShowNotifications(!showNotifications)}
                            className="relative p-2 rounded-xl hover:bg-gray-100 transition-all group"
                        >
                            <Bell className="w-5 h-5 text-gray-700 group-hover:scale-110 transition-transform" />
                            {notifications.length > 0 && (
                                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                            )}
                        </button>

                        {/* Profile */}
                        <button
                            onClick={() => setShowProfile(!showProfile)}
                            className="flex items-center gap-2 p-1 pr-3 rounded-xl hover:bg-gray-100 transition-all"
                        >
                            {userData?.photoURL ? (
                                <img
                                    src={userData.photoURL}
                                    alt="Profile"
                                    className="w-8 h-8 rounded-full object-cover border-2 border-teal-500"
                                />
                            ) : (
                                <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                    {(userData?.name || user?.email || 'T')[0].toUpperCase()}
                                </div>
                            )}
                            <ChevronDown className="w-4 h-4 text-gray-600" />
                        </button>

                        {/* Profile Dropdown */}
                        <AnimatePresence>
                            {showProfile && (
                                <>
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="fixed inset-0 z-40"
                                        onClick={() => setShowProfile(false)}
                                    />
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="absolute top-14 right-4 w-64 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-50"
                                    >
                                        <div className="p-4 bg-gradient-to-br from-teal-500 to-cyan-600 text-white">
                                            <p className="font-bold text-lg">{userData?.name || 'Teacher'}</p>
                                            <p className="text-sm opacity-90">{user?.email}</p>
                                            <div className="mt-3 flex items-center gap-4 text-sm">
                                                <div>
                                                    <p className="opacity-75">Students</p>
                                                    <p className="font-bold text-lg">{stats.totalStudents}</p>
                                                </div>
                                                <div>
                                                    <p className="opacity-75">Classes</p>
                                                    <p className="font-bold text-lg">{stats.totalClasses}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="p-2">
                                            <button
                                                onClick={() => {
                                                    setShowProfile(false);
                                                    handleTabChange('profile');
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-xl transition-all text-left"
                                            >
                                                <User className="w-4 h-4 text-gray-600" />
                                                <span className="text-sm font-medium text-gray-700">Profile Settings</span>
                                            </button>
                                            <button
                                                onClick={handleLogout}
                                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 text-red-600 rounded-xl transition-all text-left"
                                            >
                                                <LogOut className="w-4 h-4" />
                                                <span className="text-sm font-medium">Logout</span>
                                            </button>
                                        </div>
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </motion.nav>

            {/* ============================================
          SIDEBAR (LEFT) - DESKTOP
      ============================================ */}

            <motion.aside
                initial={{ x: -280 }}
                animate={{ x: 0, width: sidebarCollapsed ? 80 : 280 }}
                className="hidden lg:block fixed top-16 left-0 bottom-0 bg-white border-r border-gray-200 z-40 overflow-y-auto custom-scrollbar"
            >
                <div className="p-4">

                    {/* Stats Card */}
                    {!sidebarCollapsed && (
                        <motion.div
                            id="stats-card"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-6 p-5 bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-500 rounded-2xl text-white relative overflow-hidden group hover:shadow-2xl transition-all"
                        >
                            {/* Background Pattern */}
                            <div className="absolute inset-0 opacity-10">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -mr-16 -mt-16" />
                                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full -ml-12 -mb-12" />
                            </div>

                            <div className="relative">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <p className="text-sm opacity-90 mb-1">Total Students</p>
                                        <p className="text-4xl font-black tracking-tight">
                                            <AnimatedCounter value={stats.totalStudents} />
                                        </p>
                                    </div>
                                    <div className="relative">
                                        <CompactStatsRing progress={stats.avgProgress} size={56} />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <Users className="w-6 h-6" />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-1">
                                        <TrendingUp className="w-4 h-4" />
                                        <span>+{stats.weeklyGrowth}% this week</span>
                                    </div>
                                    <div className="px-2 py-1 bg-white/20 backdrop-blur-sm rounded-lg text-xs font-bold">
                                        {stats.totalClasses} Classes
                                    </div>
                                </div>

                                {stats.pendingReviews > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mt-3 pt-3 border-t border-white/20"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm opacity-90">Pending Reviews</span>
                                            <span className="px-3 py-1 bg-orange-500 rounded-lg text-sm font-bold animate-pulse">
                                                {stats.pendingReviews}
                                            </span>
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* Navigation Items */}
                    <nav className="space-y-1" id="sidebar-nav">
                        {SIDEBAR_ITEMS.map((item, index) => {
                            const Icon = item.icon;
                            const isActive = activeTab === item.tab;

                            return (
                                <motion.button
                                    key={item.tab}
                                    onClick={() => handleTabChange(item.tab)}
                                    className={`
                    w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all group
                    ${isActive
                                            ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg shadow-teal-500/30'
                                            : 'text-gray-700 hover:bg-gray-100'
                                        }
                  `}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    title={sidebarCollapsed ? item.label : ''}
                                >
                                    <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'scale-110' : 'group-hover:scale-110'} transition-transform`} />
                                    {!sidebarCollapsed && (
                                        <>
                                            <span className="flex-1 text-left font-semibold text-sm">{item.label}</span>
                                            {item.badge && (
                                                <span className={`
                          text-xs px-2 py-0.5 rounded-full font-bold
                          ${item.badge === 'LIVE'
                                                        ? 'bg-red-500 text-white animate-pulse'
                                                        : isActive
                                                            ? 'bg-white/25 text-white'
                                                            : 'bg-teal-100 text-teal-600'
                                                    }
                        `}>
                                                    {item.badge}
                                                </span>
                                            )}
                                        </>
                                    )}
                                </motion.button>
                            );
                        })}
                    </nav>

                    {/* Collapse Toggle */}
                    <motion.button
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        className="w-full mt-6 flex items-center justify-center gap-2 px-4 py-3 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-all group"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <ChevronRight className={`w-4 h-4 transition-transform ${sidebarCollapsed ? '' : 'rotate-180'}`} />
                        {!sidebarCollapsed && <span className="font-medium">Collapse</span>}
                    </motion.button>
                </div>
            </motion.aside>

            {/* ============================================
          MOBILE SIDEBAR
      ============================================ */}
            <AnimatePresence>
                {showMobileSidebar && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowMobileSidebar(false)}
                            className="lg:hidden fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
                        />
                        <motion.aside
                            initial={{ x: -280 }}
                            animate={{ x: 0 }}
                            exit={{ x: -280 }}
                            className="lg:hidden fixed top-0 left-0 bottom-0 w-80 bg-white z-50 overflow-y-auto shadow-2xl"
                        >
                            <div className="p-4">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <img src={logoImage} alt="Logo" className="w-10 h-10" />
                                        <div>
                                            <h2 className="font-bold text-gray-900">StudyGloqe</h2>
                                            <p className="text-xs text-gray-600">Teacher Portal</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowMobileSidebar(false)}
                                        className="p-2 rounded-xl hover:bg-gray-100 transition-all"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Mobile Stats Card */}
                                <div className="mb-6 p-5 bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-500 rounded-2xl text-white">
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <p className="text-sm opacity-90 mb-1">Total Students</p>
                                            <p className="text-4xl font-black"><AnimatedCounter value={stats.totalStudents} /></p>
                                        </div>
                                        <Users className="w-8 h-8 opacity-80" />
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <TrendingUp className="w-4 h-4" />
                                        <span>+{stats.weeklyGrowth}% this week</span>
                                    </div>
                                </div>

                                {/* Mobile Navigation */}
                                <nav className="space-y-1">
                                    {SIDEBAR_ITEMS.map((item) => {
                                        const Icon = item.icon;
                                        const isActive = activeTab === item.tab;

                                        return (
                                            <button
                                                key={item.tab}
                                                onClick={() => handleTabChange(item.tab)}
                                                className={`
                          w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all
                          ${isActive
                                                        ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg'
                                                        : 'text-gray-700 hover:bg-gray-100'
                                                    }
                        `}
                                            >
                                                <Icon className="w-5 h-5" />
                                                <span className="flex-1 text-left font-semibold text-sm">{item.label}</span>
                                                {item.badge && (
                                                    <span className={`
                            text-xs px-2 py-0.5 rounded-full font-bold
                            ${item.badge === 'LIVE'
                                                            ? 'bg-red-500 text-white animate-pulse'
                                                            : isActive
                                                                ? 'bg-white/25 text-white'
                                                                : 'bg-teal-100 text-teal-600'
                                                        }
                          `}>
                                                        {item.badge}
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </nav>
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* ============================================
          SEARCH MODAL
      ============================================ */}
            <AnimatePresence>
                {showSearch && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowSearch(false)}
                            className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: -50 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: -50 }}
                            className="fixed top-20 left-1/2 -translate-x-1/2 w-full max-w-2xl bg-white rounded-2xl shadow-2xl z-50 overflow-hidden"
                        >
                            <div className="p-4 border-b border-gray-200">
                                <div className="flex items-center gap-3">
                                    <Search className="w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search features, classes, students..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="flex-1 bg-transparent outline-none text-lg"
                                        autoFocus
                                    />
                                    <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs text-gray-600">
                                        ESC
                                    </kbd>
                                </div>
                            </div>

                            <div className="max-h-96 overflow-y-auto p-2">
                                {filteredSearchItems.length > 0 ? (
                                    filteredSearchItems.map((item) => {
                                        const Icon = item.icon;
                                        return (
                                            <button
                                                key={item.tab}
                                                onClick={() => {
                                                    handleTabChange(item.tab);
                                                    setShowSearch(false);
                                                    setSearchQuery('');
                                                }}
                                                className="w-full flex items-center gap-3 p-3 hover:bg-teal-50 rounded-xl transition-all text-left group"
                                            >
                                                <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center group-hover:bg-teal-500 transition-colors">
                                                    <Icon className="w-5 h-5 text-teal-600 group-hover:text-white transition-colors" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-semibold text-gray-900">{item.label}</p>
                                                    {item.desc && (
                                                        <p className="text-sm text-gray-600">{item.desc}</p>
                                                    )}
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
                                            </button>
                                        );
                                    })
                                ) : (
                                    <div className="text-center py-12">
                                        <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                        <p className="text-gray-600 font-medium">No results found</p>
                                        <p className="text-sm text-gray-500 mt-1">Try a different search term</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* ============================================
          MAIN CONTENT AREA
      ============================================ */}
            <main className={`pt-16 transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-[280px]'}`}>
                <div className="p-4 sm:p-6 lg:p-8 min-h-screen">

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.2 }}
                        >
                            {activeTab === 'overview' && <OverviewSection stats={stats} classes={classes} />}
                            {activeTab === 'analytics' && <AnalyticsSection />}
                            {activeTab === 'classes' && <ClassesSection />}
                            {activeTab === 'students' && <StudentsSection />}
                            {activeTab === 'assignments' && <AssignmentsSection />}
                            {activeTab === 'quizzes' && <QuizzesSection />}
                            {activeTab === 'materials' && <MaterialsSection />}
                            {activeTab === 'live-sessions' && <LiveSessionsSection />}
                            {activeTab === 'gradebook' && <GradeBookSection />}
                            {activeTab === 'announcements' && <AnnouncementsSection />}
                            {activeTab === 'leaderboard' && <LeaderboardSection />}
                            {activeTab === 'profile' && <Profile embedded={true} />}
                        </motion.div>
                    </AnimatePresence>

                </div>
            </main>

            {/* Custom Scrollbar Styles */}
            <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
      `}</style>

        </div>
    );
};

export default TeacherDashboard;
