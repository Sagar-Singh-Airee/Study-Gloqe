// src/pages/Dashboard.jsx - PREMIUM REAL-TIME DASHBOARD
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BookOpen, Upload, Trophy, Clock, Users, Brain, Video, Bell,
    Layers, StickyNote, LayoutDashboard, LogOut, ChevronRight, Medal,
    Sparkles, TrendingUp, Zap, Flame, Target, Activity, Award
} from 'lucide-react';
import { useAuth } from '@contexts/AuthContext';
import { doc, onSnapshot, collection, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@config/firebase';
import { awardDailyXP, updateMission, DAILY_ACTIONS } from '@/services/gamificationService';
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

const Dashboard = () => {
    const { user, userData, logout } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    
    const [loading, setLoading] = useState(true);
    const [realtimeUserData, setRealtimeUserData] = useState(null);
    const [realtimeStats, setRealtimeStats] = useState({
        totalDocuments: 0,
        totalSessions: 0,
        totalStudyTime: 0,
        streak: 0
    });
    const [recentDocuments, setRecentDocuments] = useState([]);
    const [activeStudySessions, setActiveStudySessions] = useState([]);
    
    const [showXPAnimation, setShowXPAnimation] = useState(false);
    const [xpGained, setXpGained] = useState(0);
    const [notificationCount] = useState(0);
    const [levelModalOpen, setLevelModalOpen] = useState(false);
    const [achievement, setAchievement] = useState(null);
    const [showLevelUp, setShowLevelUp] = useState(false);
    const [previousLevel, setPreviousLevel] = useState(0);
    
    const initialTab = searchParams.get('tab') || 'overview';
    const [activeTab, setActiveTab] = useState(initialTab);

    // ✅ REAL-TIME USER DATA LISTENER
    useEffect(() => {
        if (!user?.uid) {
            setLoading(false);
            return;
        }

        console.log('👂 Setting up real-time user data listener');

        const userRef = doc(db, 'users', user.uid);
        const unsubscribe = onSnapshot(
            userRef,
            (docSnapshot) => {
                if (!docSnapshot.exists()) {
                    console.log('User document does not exist');
                    setLoading(false);
                    return;
                }

                const docData = docSnapshot.data();
                setRealtimeUserData(docData);

                // Check for XP gain
                if (docData?.lastXPTime && docData?.lastXPAmount) {
                    const lastXPTimeMillis = docData.lastXPTime?.toMillis?.() || 0;
                    const now = Date.now();
                    
                    if (now - lastXPTimeMillis < 3000) {
                        setXpGained(docData.lastXPAmount);
                        setShowXPAnimation(true);
                        setTimeout(() => setShowXPAnimation(false), 2000);

                        setAchievement({
                            title: docData.lastXPReason || 'Achievement Unlocked',
                            xp: docData.lastXPAmount
                        });
                        setTimeout(() => setAchievement(null), 5000);
                    }
                }

                // Check for level up
                const newLevel = Math.floor((docData.xp || 0) / 100) + 1;
                if (previousLevel > 0 && newLevel > previousLevel) {
                    setShowLevelUp(true);
                    setTimeout(() => setShowLevelUp(false), 3000);
                    toast.success(`🎉 Level Up! You're now Level ${newLevel}!`, {
                        duration: 4000,
                        style: {
                            background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
                            color: '#fff',
                            fontWeight: 'bold',
                            borderRadius: '16px',
                            padding: '16px 24px',
                        },
                    });
                }
                setPreviousLevel(newLevel);

                setLoading(false);
            },
            (error) => {
                console.error('User data listener error:', error);
                setLoading(false);
            }
        );

        return () => {
            console.log('🧹 Cleaning up user data listener');
            unsubscribe();
        };
    }, [user?.uid, previousLevel]);

    // ✅ REAL-TIME DOCUMENTS LISTENER
    useEffect(() => {
        if (!user?.uid) return;

        console.log('📚 Setting up real-time documents listener');

        const docsQuery = query(
            collection(db, 'documents'),
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc'),
            limit(5)
        );

        const unsubscribe = onSnapshot(
            docsQuery,
            (snapshot) => {
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

        return () => unsubscribe();
    }, [user?.uid]);

    // ✅ REAL-TIME STUDY SESSIONS LISTENER
    useEffect(() => {
        if (!user?.uid) return;

        console.log('📊 Setting up real-time sessions listener');

        const sessionsQuery = query(
            collection(db, 'studySessions'),
            where('userId', '==', user.uid)
        );

        const unsubscribe = onSnapshot(
            sessionsQuery,
            (snapshot) => {
                const sessions = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    startTime: doc.data().startTime?.toDate?.() || new Date()
                }));

                setActiveStudySessions(sessions);

                // Calculate total study time
                const totalTime = sessions.reduce((sum, s) => sum + (s.totalTime || 0), 0);
                
                // Calculate streak
                const today = new Date().toDateString();
                const sortedDates = [...new Set(
                    sessions.map(s => new Date(s.startTime).toDateString())
                )].sort((a, b) => new Date(b) - new Date(a));

                let streak = 0;
                if (sortedDates.length > 0 && sortedDates[0] === today) {
                    streak = 1;
                    for (let i = 1; i < sortedDates.length; i++) {
                        const prevDate = new Date(sortedDates[i - 1]);
                        const currDate = new Date(sortedDates[i]);
                        const diffDays = Math.floor((prevDate - currDate) / (1000 * 60 * 60 * 24));
                        if (diffDays === 1) streak++;
                        else break;
                    }
                }

                setRealtimeStats(prev => ({
                    ...prev,
                    totalSessions: sessions.length,
                    totalStudyTime: Math.round(totalTime / 60), // minutes
                    streak
                }));
            },
            (error) => {
                console.error('Sessions listener error:', error);
            }
        );

        return () => unsubscribe();
    }, [user?.uid]);

    // ✅ DAILY LOGIN BONUS (ONCE PER DAY)
    useEffect(() => {
        if (!user?.uid || !realtimeUserData) return;

        const lastLogin = localStorage.getItem(`lastLogin_${user.uid}`);
        const today = new Date().toDateString();
        
        if (lastLogin !== today) {
            // Award daily XP
            awardDailyXP(user.uid, DAILY_ACTIONS.DAILY_LOGIN, 'Daily Login Bonus')
                .then(result => {
                    if (result.success) {
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
    }, [user?.uid, realtimeUserData]);

    // Tab management
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

    // Calculate XP and level
    const currentXP = useMemo(() => 
        realtimeUserData?.xp ?? 0,
        [realtimeUserData?.xp]
    );

    const currentLevel = useMemo(() => 
        Math.floor(currentXP / 100) + 1,
        [currentXP]
    );

    const xpForNextLevel = useMemo(() => 
        currentLevel * 100,
        [currentLevel]
    );

    const xpProgress = useMemo(() => 
        ((currentXP % 100) / 100) * 100,
        [currentXP]
    );

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

    const sidebarItems = useMemo(() => [
        { icon: LayoutDashboard, label: 'Dashboard', tab: 'overview', path: '/dashboard' },
        { icon: Users, label: 'Classes', tab: 'classes', path: '/dashboard?tab=classes' },
        { icon: BookOpen, label: 'Documents', tab: 'documents', path: '/dashboard?tab=documents' },
        { icon: Medal, label: 'Achievements', tab: 'achievements', path: '/dashboard?tab=achievements' },
        { icon: Brain, label: 'Quizzes', tab: 'quizzes', path: '/dashboard?tab=quizzes' },
        { icon: Layers, label: 'Flashcards', tab: 'flashcards', path: '/dashboard?tab=flashcards' },
        { icon: StickyNote, label: 'Notes', tab: 'notes', path: '/dashboard?tab=notes' },
        { icon: Video, label: 'Rooms', tab: 'rooms', path: '/dashboard?tab=rooms' },
        { icon: Trophy, label: 'Leaderboard', tab: 'leaderboard', path: '/dashboard?tab=leaderboard' },
        { icon: Clock, label: 'History', tab: 'history', path: '/dashboard?tab=history' },
    ], []);

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
                        stats={realtimeStats}
                        recentDocuments={recentDocuments}
                        quickActions={quickActions}
                        {...commonProps}
                    />
                );
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
            default:
                return (
                    <OverviewSection
                        stats={realtimeStats}
                        recentDocuments={recentDocuments}
                        quickActions={quickActions}
                        {...commonProps}
                    />
                );
        }
    }, [activeTab, realtimeStats, recentDocuments, quickActions, handleTabChange, handleUploadClick, navigate]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-20 h-20 border-4 border-gray-200 border-t-gray-700 rounded-full animate-spin mx-auto mb-6" />
                    <p className="text-gray-600 font-bold text-lg">Loading your dashboard...</p>
                    <p className="text-gray-500 text-sm mt-2">Syncing real-time data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex overflow-hidden">
            {/* XP Gain Animation */}
            <AnimatePresence>
                {showXPAnimation && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.5 }}
                        animate={{ opacity: 1, y: -50, scale: 1 }}
                        exit={{ opacity: 0, y: -100, scale: 0.5 }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none"
                    >
                        <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white px-10 py-5 rounded-3xl font-black text-3xl shadow-2xl border-2 border-gray-600 flex items-center gap-4">
                            <Zap size={36} className="text-yellow-400 animate-pulse" fill="currentColor" />
                            +{xpGained} XP
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Level Up Animation */}
            <AnimatePresence>
                {showLevelUp && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none"
                    >
                        <div className="bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 text-white px-12 py-6 rounded-3xl font-black text-4xl shadow-2xl border-4 border-white flex flex-col items-center gap-2 animate-bounce">
                            <Award size={48} className="text-white" />
                            <div>Level {currentLevel}!</div>
                            <div className="text-sm font-semibold opacity-90">You're getting stronger!</div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* SIDEBAR */}
            <div className="w-72 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 fixed h-screen flex flex-col shadow-2xl border-r border-gray-700 z-40">
                <div className="p-6 border-b border-gray-700">
                    <Link to="/dashboard" className="flex items-center gap-3 group">
                        <img src={logoImage} alt="StudyGloqe" className="h-11 w-11 drop-shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6" />
                        <div>
                            <div className="text-xl font-black text-white group-hover:text-gray-200 transition-colors">
                                StudyGloqe
                            </div>
                            <div className="text-xs text-gray-400 flex items-center gap-1">
                                <Sparkles size={10} className="text-gray-500 animate-pulse" />
                                Real-time Learning
                            </div>
                        </div>
                    </Link>
                </div>

                {/* Level Progress Card */}
                <button
                    onClick={() => setLevelModalOpen(true)}
                    className="mx-4 mt-4 p-5 bg-gradient-to-br from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 rounded-2xl border-2 border-gray-600 hover:border-gray-500 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl group cursor-pointer relative overflow-hidden"
                >
                    {/* Animated background gradient */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                    
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center shadow-lg">
                                    <Flame size={18} className="text-white" />
                                </div>
                                <span className="text-sm text-gray-300 font-bold group-hover:text-white transition-colors">
                                    Level {currentLevel}
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-sm text-white font-black">
                                <Sparkles size={14} className="text-yellow-400 animate-pulse" />
                                {currentXP} XP
                            </div>
                        </div>
                        
                        <div className="h-3 bg-gray-900 rounded-full overflow-hidden relative shadow-inner">
                            <motion.div 
                                initial={false}
                                animate={{ width: `${xpProgress}%` }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                                className="h-full bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 rounded-full relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                            </motion.div>
                        </div>
                        
                        <div className="flex items-center justify-between mt-2.5">
                            <p className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors font-semibold">
                                {xpForNextLevel - currentXP} XP to Level {currentLevel + 1}
                            </p>
                            <ChevronRight size={16} className="text-gray-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
                        </div>
                    </div>
                </button>

                {/* Real-time Stats Mini Cards */}
                <div className="mx-4 mt-4 grid grid-cols-2 gap-2">
                    <div className="bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl p-3 border border-gray-600">
                        <div className="flex items-center gap-2 mb-1">
                            <Target size={14} className="text-gray-400" />
                            <span className="text-xs text-gray-400 font-semibold">Streak</span>
                        </div>
                        <p className="text-xl font-black text-white">{realtimeStats.streak}</p>
                    </div>
                    <div className="bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl p-3 border border-gray-600">
                        <div className="flex items-center gap-2 mb-1">
                            <Activity size={14} className="text-gray-400" />
                            <span className="text-xs text-gray-400 font-semibold">Time</span>
                        </div>
                        <p className="text-xl font-black text-white">{realtimeStats.totalStudyTime}m</p>
                    </div>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
                    {sidebarItems.map((item) => (
                        <Link
                            key={item.tab}
                            to={item.path}
                            onClick={() => handleTabChange(item.tab)}
                            className={`group flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all duration-200 relative ${
                                activeTab === item.tab
                                    ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-xl'
                                    : 'text-gray-400 hover:bg-gray-800 hover:text-white hover:translate-x-1'
                            }`}
                        >
                            {activeTab === item.tab && (
                                <motion.div 
                                    layoutId="activeTab"
                                    className="absolute inset-0 bg-gradient-to-r from-gray-600 to-gray-700 rounded-xl"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                            
                            <item.icon 
                                size={20} 
                                className={`relative z-10 transition-transform duration-200 ${
                                    activeTab === item.tab ? 'scale-110' : 'group-hover:scale-110'
                                }`}
                                strokeWidth={2.5}
                            />
                            <span className="flex-1 relative z-10">{item.label}</span>
                            {activeTab === item.tab && (
                                <motion.div 
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="w-2 h-2 bg-white rounded-full shadow-lg relative z-10"
                                />
                            )}
                        </Link>
                    ))}

                    <button
                        onClick={handleUploadClick}
                        className="w-full mt-6 flex items-center justify-center gap-2 px-4 py-4 rounded-xl bg-gradient-to-r from-white to-gray-100 text-gray-900 font-black hover:shadow-2xl hover:scale-105 transition-all duration-200 group"
                    >
                        <Upload size={20} className="transition-transform duration-200 group-hover:rotate-12" strokeWidth={2.5} />
                        <span>Upload PDF</span>
                    </button>
                </nav>

                <div className="p-4 border-t border-gray-700">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-gray-400 hover:bg-red-500/20 hover:text-red-400 transition-all duration-200 group"
                    >
                        <LogOut size={18} className="group-hover:-translate-x-1 transition-transform duration-200" strokeWidth={2.5} />
                        <span>Logout</span>
                    </button>
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="flex-1 ml-72">
                <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
                    {/* Enhanced Header */}
                    <div className="flex items-start justify-between gap-6">
                        <div className="flex-1">
                            <div className="text-sm text-gray-500 mb-2 flex items-center gap-2 font-semibold">
                                <Clock size={14} strokeWidth={2.5} />
                                {new Date().toLocaleDateString('en-US', { 
                                    weekday: 'long', 
                                    month: 'long', 
                                    day: 'numeric',
                                    year: 'numeric'
                                })}
                            </div>
                            <h1 className="text-5xl font-black text-gray-900 mb-3 tracking-tight">
                                Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {userData?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'Student'} 👋
                            </h1>
                            <p className="text-gray-600 text-base font-bold flex items-center gap-2">
                                <TrendingUp size={16} className="text-gray-500" strokeWidth={2.5} />
                                {realtimeStats.streak > 0 ? `${realtimeStats.streak} day streak! Keep it up!` : 'Start studying to build your streak'}
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            {notificationCount > 0 && (
                                <button className="w-12 h-12 rounded-xl bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-gray-300 flex items-center justify-center transition-all duration-200 relative group shadow-md hover:shadow-xl">
                                    <Bell size={20} className="text-gray-600 group-hover:text-gray-900 transition-colors" strokeWidth={2.5} />
                                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-gray-900 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white shadow-lg animate-pulse">
                                        {notificationCount}
                                    </span>
                                </button>
                            )}

                            <Link
                                to="/profile"
                                className="flex items-center gap-4 px-6 py-4 rounded-2xl bg-gradient-to-br from-white to-gray-50 hover:from-gray-50 hover:to-white border-2 border-gray-200 hover:border-gray-300 transition-all duration-200 group shadow-md hover:shadow-xl hover:scale-[1.02]"
                            >
                                <div className="relative">
                                    {userData?.profilePicture ? (
                                        <img
                                            src={userData.profilePicture}
                                            alt={userData.name || 'User'}
                                            className="w-14 h-14 rounded-xl object-cover border-3 border-white shadow-lg transition-transform duration-200 group-hover:scale-105"
                                        />
                                    ) : (
                                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-gray-800 via-gray-700 to-gray-900 flex items-center justify-center text-white font-black text-xl shadow-lg border-3 border-white transition-transform duration-200 group-hover:scale-105">
                                            {userData?.name?.charAt(0) || user?.email?.charAt(0).toUpperCase() || 'U'}
                                        </div>
                                    )}
                                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 border-2 border-white rounded-full animate-pulse" />
                                </div>

                                <div className="flex-1 text-left">
                                    <div className="text-base font-black text-gray-900 group-hover:text-gray-700 transition-colors mb-0.5 truncate">
                                        {userData?.name || user?.email?.split('@')[0] || 'User'}
                                    </div>
                                    <div className="text-xs text-gray-500 mb-1.5 truncate font-semibold">
                                        {userData?.email || user?.email || 'user@example.com'}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="px-3 py-1 bg-gradient-to-r from-gray-800 to-gray-700 text-white text-xs font-black rounded-lg shadow-md">
                                            Level {currentLevel}
                                        </div>
                                        <div className="text-xs text-gray-600 font-black flex items-center gap-1">
                                            <Zap size={12} className="text-gray-500" strokeWidth={2.5} />
                                            {currentXP} XP
                                        </div>
                                    </div>
                                </div>

                                <ChevronRight
                                    size={22}
                                    className="text-gray-400 group-hover:text-gray-900 group-hover:translate-x-1 transition-all duration-200"
                                    strokeWidth={2.5}
                                />
                            </Link>
                        </div>
                    </div>

                    {/* Content with smooth transitions */}
                    <AnimatePresence mode="wait" initial={false}>
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
            </div>

            <LevelModal 
                isOpen={levelModalOpen} 
                onClose={() => setLevelModalOpen(false)} 
            />

            <AchievementToast 
                achievement={achievement}
                onClose={() => setAchievement(null)}
            />

            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(0, 0, 0, 0.1);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(107, 114, 128, 0.5);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(107, 114, 128, 0.7);
                }
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                .animate-shimmer {
                    animation: shimmer 2s infinite;
                }
            `}</style>
        </div>
    );
};

export default Dashboard;
