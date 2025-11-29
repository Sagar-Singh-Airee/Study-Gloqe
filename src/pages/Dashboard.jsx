import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BookOpen, Upload, Trophy, Clock, Users, Brain, Video, Bell,
    Layers, StickyNote, LayoutDashboard, LogOut, ChevronRight, Medal,
    Sparkles, TrendingUp, Zap
} from 'lucide-react';
import { useAuth } from '@contexts/AuthContext';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@config/firebase';
import {
    useDashboardData,
    awardXP,
    joinStudyRoom,
    claimDailyBonus
} from '@/hooks/useDashboardData';
import { updateStreak } from '@/services/gamificationService';
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
    const { data, loading } = useDashboardData();
    
    // ALL STATE DECLARATIONS FIRST
    const [showXPAnimation, setShowXPAnimation] = useState(false);
    const [notificationCount] = useState(3);
    const [levelModalOpen, setLevelModalOpen] = useState(false);
    const [achievement, setAchievement] = useState(null);
    const [realtimeUserData, setRealtimeUserData] = useState(null);
    
    const initialTab = searchParams.get('tab') || 'overview';
    const [activeTab, setActiveTab] = useState(initialTab);

    // ALL EFFECTS
    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab && tab !== activeTab) {
            setActiveTab(tab);
        }
    }, [searchParams, activeTab]);

    useEffect(() => {
        if (!user?.uid) return;

        console.log('👂 Gamification listener mounted');

        updateStreak(user.uid).catch(err => console.error('Streak error:', err));

        const unsubscribe = onSnapshot(
            doc(db, 'users', user.uid),
            (docSnapshot) => {
                if (!docSnapshot.exists()) {
                    console.log('User document does not exist');
                    return;
                }

                const docData = docSnapshot.data();
                setRealtimeUserData(docData);

                if (docData?.lastXPTime && docData?.lastXPAmount) {
                    const lastXPTimeMillis = docData.lastXPTime?.toMillis?.() || 0;
                    const now = Date.now();
                    
                    if (now - lastXPTimeMillis < 3000) {
                        setAchievement({
                            title: docData.lastXPReason || 'Achievement Unlocked',
                            xp: docData.lastXPAmount
                        });

                        setTimeout(() => setAchievement(null), 5000);
                    }
                }
            },
            (error) => {
                console.error('Gamification listener error:', error);
            }
        );

        return () => {
            console.log('🧹 Gamification listener cleaned up');
            unsubscribe();
        };
    }, [user?.uid]);

    useEffect(() => {
        if (!user?.uid) return;

        const lastLogin = localStorage.getItem(`lastLogin_${user.uid}`);
        const today = new Date().toDateString();
        
        if (lastLogin !== today) {
            claimDailyBonus(user.uid);
            localStorage.setItem(`lastLogin_${user.uid}`, today);
            
            toast.success('🎁 Daily bonus: +5 XP!', {
                duration: 3000,
                style: {
                    background: 'linear-gradient(135deg, #000 0%, #1a1a1a 100%)',
                    color: '#fff',
                    fontWeight: 'bold',
                    borderRadius: '16px',
                    padding: '16px 24px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                },
            });
        }
    }, [user?.uid]);

    useEffect(() => {
        if (!data?.stats?.xp || data.stats.xp <= 0) return;

        const timer = setTimeout(() => {
            setShowXPAnimation(true);
            setTimeout(() => setShowXPAnimation(false), 800);
        }, 100);

        return () => clearTimeout(timer);
    }, [data?.stats?.xp]);

    // ALL CALLBACKS
    const handleTabChange = useCallback((tabId) => {
        if (tabId !== activeTab) {
            setActiveTab(tabId);
            setSearchParams({ tab: tabId });
        }
    }, [activeTab, setSearchParams]);

    const handleLogout = useCallback(async () => {
        try {
            await logout();
            toast.success('👋 See you soon!', {
                style: {
                    background: '#000',
                    color: '#fff',
                    fontWeight: 'bold',
                    borderRadius: '16px',
                    padding: '16px 24px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                },
            });
            navigate('/auth');
        } catch (error) {
            toast.error('Failed to logout');
        }
    }, [logout, navigate]);

    const handleUploadClick = useCallback(() => {
        navigate('/upload');
    }, [navigate]);

    const handleTakeQuiz = useCallback((quizId) => {
        navigate(`/quizzes/${quizId}`);
    }, [navigate]);

    const handleJoinRoom = useCallback(async (roomId) => {
        if (!user?.uid) return;
        
        try {
            await joinStudyRoom(user.uid, roomId);
            await awardXP(user.uid, 5, 'joined-study-room');
            navigate(`/study-rooms/${roomId}`);
            toast.success('🎉 Joined room! +5 XP', {
                duration: 3000,
                style: {
                    background: 'linear-gradient(135deg, #000 0%, #1a1a1a 100%)',
                    color: '#fff',
                    fontWeight: 'bold',
                    borderRadius: '16px',
                    padding: '16px 24px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                },
            });
        } catch (error) {
            toast.error('Failed to join room');
        }
    }, [user?.uid, navigate]);

    // ALL MEMOS
    const quickActions = useMemo(() => [
        { icon: Upload, label: 'Upload PDF', desc: 'Generate instant quizzes', action: handleUploadClick },
        { icon: Brain, label: 'Take Quiz', desc: 'Test your knowledge', path: '/dashboard?tab=quizzes' },
        { icon: Video, label: 'Join Room', desc: 'Study with peers', path: '/dashboard?tab=rooms' },
        { icon: Layers, label: 'Flashcards', desc: 'Review concepts', path: '/dashboard?tab=flashcards' }
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
            handleTakeQuiz,
            handleJoinRoom,
            navigate,
        };

        switch (activeTab) {
            case 'overview':
                return (
                    <OverviewSection
                        stats={data?.stats || {}}
                        recentDocuments={data?.recentDocuments || []}
                        aiRecommendations={data?.aiRecommendations || []}
                        activeRooms={data?.activeRooms || []}
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
                        stats={data?.stats || {}}
                        recentDocuments={data?.recentDocuments || []}
                        aiRecommendations={data?.aiRecommendations || []}
                        activeRooms={data?.activeRooms || []}
                        quickActions={quickActions}
                        {...commonProps}
                    />
                );
        }
    }, [activeTab, data, quickActions, handleTabChange, handleUploadClick, handleTakeQuiz, handleJoinRoom, navigate]);

    const currentLevel = useMemo(() => 
        realtimeUserData?.level ?? data?.stats?.level ?? 1,
        [realtimeUserData?.level, data?.stats?.level]
    );

    const currentXP = useMemo(() => 
        realtimeUserData?.xp ?? data?.stats?.xp ?? 0,
        [realtimeUserData?.xp, data?.stats?.xp]
    );

    const xpForNextLevel = useMemo(() => 
        currentLevel * 100,
        [currentLevel]
    );

    const xpProgress = useMemo(() => 
        ((currentXP % 100) / 100) * 100,
        [currentXP]
    );

    // ✅ NOW CHECK LOADING - AFTER ALL HOOKS
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-gray-200 border-t-black rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-600 font-semibold">Loading your dashboard...</p>
                </div>
            </div>
        );
    }

    // RENDER
    return (
        <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 flex overflow-hidden">
            {/* XP Floating Animation */}
            <AnimatePresence>
                {showXPAnimation && (
                    <motion.div
                        initial={{ opacity: 0, y: 30, scale: 0.5 }}
                        animate={{ opacity: 1, y: -100, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none"
                    >
                        <div className="bg-gradient-to-br from-black via-gray-900 to-black text-white px-8 py-4 rounded-2xl font-black text-2xl shadow-2xl border-2 border-white/20 flex items-center gap-3">
                            <Zap size={28} className="text-white" fill="white" />
                            +{data?.stats?.xp || 0} XP
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* SIDEBAR */}
            <div className="w-72 bg-gradient-to-b from-black via-gray-900 to-black fixed h-screen flex flex-col shadow-2xl border-r border-white/5 z-40">
                {/* Logo */}
                <div className="p-6 border-b border-white/10">
                    <Link to="/dashboard" className="flex items-center gap-3 group">
                        <img src={logoImage} alt="StudyGloqe" className="h-11 w-11 drop-shadow-lg transition-transform duration-300 group-hover:scale-110" />
                        <div>
                            <div className="text-xl font-black text-white group-hover:text-gray-200 transition-colors">
                                StudyGloqe
                            </div>
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                                <Sparkles size={10} className="text-gray-600" />
                                AI Learning Platform
                            </div>
                        </div>
                    </Link>
                </div>

                {/* XP Progress Card */}
                <button
                    onClick={() => setLevelModalOpen(true)}
                    className="mx-4 mt-4 p-4 bg-gradient-to-br from-white/5 to-white/10 hover:from-white/10 hover:to-white/15 rounded-2xl border border-white/10 hover:border-white/20 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-white/10 group cursor-pointer"
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-400 font-semibold group-hover:text-gray-300 transition-colors">
                            Level {currentLevel}
                        </span>
                        <span className="text-xs text-white font-bold flex items-center gap-1">
                            <Sparkles size={12} className="text-gray-400 group-hover:text-white transition-colors" />
                            {currentXP} XP
                        </span>
                    </div>
                    <div className="h-2.5 bg-gray-800 rounded-full overflow-hidden relative">
                        <motion.div 
                            initial={false}
                            animate={{ width: `${xpProgress}%` }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                            className="h-full bg-gradient-to-r from-white via-gray-300 to-gray-400 rounded-full"
                        />
                    </div>
                    <div className="flex items-center justify-between mt-2">
                        <p className="text-[10px] text-gray-600 group-hover:text-gray-500 transition-colors">
                            {xpForNextLevel - currentXP} XP to next level
                        </p>
                        <ChevronRight size={14} className="text-gray-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
                    </div>
                </button>

                {/* Navigation */}
                <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
                    {sidebarItems.map((item) => (
                        <Link
                            key={item.tab}
                            to={item.path}
                            onClick={() => handleTabChange(item.tab)}
                            className={`group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 relative ${
                                activeTab === item.tab
                                    ? 'bg-white/10 text-white shadow-lg'
                                    : 'text-gray-400 hover:bg-white/5 hover:text-white hover:translate-x-1'
                            }`}
                        >
                            {activeTab === item.tab && (
                                <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent rounded-xl" />
                            )}
                            
                            <item.icon 
                                size={20} 
                                className={`relative z-10 transition-transform duration-200 ${
                                    activeTab === item.tab ? 'scale-110' : 'group-hover:scale-110'
                                }`}
                            />
                            <span className="flex-1 relative z-10">{item.label}</span>
                            {activeTab === item.tab && (
                                <div className="w-2 h-2 bg-white rounded-full shadow-lg relative z-10" />
                            )}
                        </Link>
                    ))}

                    {/* Upload PDF Button */}
                    <button
                        onClick={handleUploadClick}
                        className="w-full mt-6 flex items-center justify-center gap-2 px-4 py-4 rounded-xl bg-gradient-to-r from-white to-gray-200 text-black font-bold hover:shadow-2xl hover:from-gray-100 hover:to-white transition-all duration-200 group"
                    >
                        <Upload size={20} className="transition-transform duration-200 group-hover:rotate-12" />
                        <span>Upload PDF</span>
                    </button>
                </nav>

                {/* Bottom Actions */}
                <div className="p-4 border-t border-white/10">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 group"
                    >
                        <LogOut size={18} className="group-hover:-translate-x-1 transition-transform duration-200" />
                        <span>Logout</span>
                    </button>
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="flex-1 ml-72">
                <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
                    {/* TOP HEADER */}
                    <div className="flex items-start justify-between gap-6">
                        <div className="flex-1">
                            <div className="text-sm text-gray-500 mb-2 flex items-center gap-2 font-medium">
                                <Clock size={14} />
                                {new Date().toLocaleDateString('en-US', { 
                                    weekday: 'long', 
                                    month: 'long', 
                                    day: 'numeric',
                                    year: 'numeric'
                                })}
                            </div>
                            <h1 className="text-4xl font-black text-black mb-3 tracking-tight">
                                Good morning, {userData?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'Student'} 👋
                            </h1>
                            <p className="text-gray-600 text-base font-medium flex items-center gap-2">
                                <TrendingUp size={16} className="text-gray-400" />
                                Here's your learning overview for today
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Notification Bell */}
                            <button className="w-12 h-12 rounded-xl bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-gray-300 flex items-center justify-center transition-all duration-200 relative group shadow-sm hover:shadow-md">
                                <Bell size={20} className="text-gray-600 group-hover:text-black transition-colors" />
                                {notificationCount > 0 && (
                                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-black text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white shadow-lg">
                                        {notificationCount}
                                    </span>
                                )}
                            </button>

                            {/* Profile Card */}
                            <Link
                                to="/settings"
                                className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-gray-300 transition-all duration-200 group min-w-[340px] shadow-sm hover:shadow-xl hover:scale-[1.01]"
                            >
                                <div className="relative">
                                    {userData?.profilePicture ? (
                                        <img
                                            src={userData.profilePicture}
                                            alt={userData.name || 'User'}
                                            className="w-14 h-14 rounded-xl object-cover border-3 border-white shadow-lg transition-transform duration-200 group-hover:scale-105"
                                        />
                                    ) : (
                                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-black via-gray-800 to-gray-700 flex items-center justify-center text-white font-black text-xl shadow-lg border-3 border-white transition-transform duration-200 group-hover:scale-105">
                                            {userData?.name?.charAt(0) || user?.email?.charAt(0).toUpperCase() || 'U'}
                                        </div>
                                    )}
                                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 border-2 border-white rounded-full" />
                                </div>

                                <div className="flex-1 text-left">
                                    <div className="text-base font-bold text-black group-hover:text-gray-800 transition-colors mb-0.5 truncate">
                                        {userData?.name || user?.email?.split('@')[0] || 'User'}
                                    </div>
                                    <div className="text-xs text-gray-500 mb-1.5 truncate">
                                        {userData?.email || user?.email || 'user@example.com'}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="px-2.5 py-1 bg-gradient-to-r from-black to-gray-800 text-white text-xs font-bold rounded-lg shadow-md">
                                            Level {currentLevel}
                                        </div>
                                        <div className="text-xs text-gray-600 font-bold flex items-center gap-1">
                                            <Zap size={12} className="text-gray-400" />
                                            {currentXP} XP
                                        </div>
                                    </div>
                                </div>

                                <ChevronRight
                                    size={22}
                                    className="text-gray-400 group-hover:text-black group-hover:translate-x-1 transition-all duration-200"
                                />
                            </Link>
                        </div>
                    </div>

                    {/* DYNAMIC CONTENT */}
                    <AnimatePresence mode="wait" initial={false}>
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.1 }}
                        >
                            {renderContent()}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* GAMIFICATION MODALS & TOASTS */}
            <LevelModal 
                isOpen={levelModalOpen} 
                onClose={() => setLevelModalOpen(false)} 
            />

            <AchievementToast 
                achievement={achievement}
                onClose={() => setAchievement(null)}
            />
        </div>
    );
};

export default Dashboard;
