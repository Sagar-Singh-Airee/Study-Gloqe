import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BookOpen, Upload, Trophy, Clock, Users, Brain, Video, Home, Bell,
    Layers, StickyNote, LayoutDashboard, Settings, LogOut, ChevronRight, Medal
} from 'lucide-react';
import { useAuth } from '@contexts/AuthContext';
import {
    useDashboardData,
    awardXP,
    joinStudyRoom,
    claimDailyBonus
} from '@/hooks/useDashboardData';
import toast from 'react-hot-toast';
import logoImage from '@/assets/logo/logo.svg';

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
import AchievementsSection from '@/components/features/AchievementsSection'; // <--- Added Import

const Dashboard = () => {
    const { user, userData, logout } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { data, loading } = useDashboardData();
    const [showXPAnimation, setShowXPAnimation] = useState(false);

    // Tab State
    const initialTab = searchParams.get('tab') || 'overview';
    const [activeTab, setActiveTab] = useState(initialTab);

    // Update active tab when URL changes
    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab) setActiveTab(tab);
    }, [searchParams]);

    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        setSearchParams({ tab: tabId });
    };

    // Auto-claim daily bonus on mount
    useEffect(() => {
        if (user?.uid) {
            const lastLogin = localStorage.getItem(`lastLogin_${user.uid}`);
            const today = new Date().toDateString();
            if (lastLogin !== today) {
                claimDailyBonus(user.uid);
                localStorage.setItem(`lastLogin_${user.uid}`, today);
                toast.success('🎁 Daily bonus: +5 XP!', {
                    duration: 3000,
                    style: {
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: '#fff',
                        fontWeight: 'bold',
                        borderRadius: '12px',
                        padding: '16px 24px',
                    },
                });
            }
        }
    }, [user?.uid]);

    // XP animation when it increases
    useEffect(() => {
        if (data.stats.xp > 0) {
            setShowXPAnimation(true);
            setTimeout(() => setShowXPAnimation(false), 1000);
        }
    }, [data.stats.xp]);

    const handleLogout = async () => {
        try {
            await logout();
            toast.success('👋 See you soon!', {
                style: {
                    background: '#000',
                    color: '#fff',
                    fontWeight: 'bold',
                    borderRadius: '12px',
                    padding: '16px 24px',
                },
            });
            navigate('/auth');
        } catch (error) {
            toast.error('Failed to logout');
        }
    };

    const handleUploadClick = () => {
        navigate('/upload');
    };

    const handleTakeQuiz = (quizId) => {
        navigate(`/quizzes/${quizId}`);
    };

    const handleJoinRoom = async (roomId) => {
        try {
            await joinStudyRoom(user.uid, roomId);
            await awardXP(user.uid, 5, 'joined-study-room');
            navigate(`/study-rooms/${roomId}`);
            toast.success('🎉 Joined room! +5 XP', {
                duration: 3000,
                style: {
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: '#fff',
                    fontWeight: 'bold',
                    borderRadius: '12px',
                    padding: '16px 24px',
                },
            });
        } catch (error) {
            toast.error('Failed to join room');
        }
    };

    const quickActions = [
        { icon: Upload, label: 'Upload PDF', desc: 'Generate instant quizzes', action: handleUploadClick },
        { icon: Brain, label: 'Take Quiz', desc: 'Test your knowledge', path: '/dashboard?tab=quizzes' },
        { icon: Video, label: 'Join Room', desc: 'Study with peers', path: '/dashboard?tab=rooms' },
        { icon: Layers, label: 'Flashcards', desc: 'Review concepts', path: '/dashboard?tab=flashcards' }
    ];

    // Sidebar Navigation Items (with all features)
    const sidebarItems = [
        { icon: LayoutDashboard, label: 'Dashboard', tab: 'overview', path: '/dashboard' },
        { icon: Users, label: 'Classes', tab: 'classes', path: '/dashboard?tab=classes' },
        { icon: BookOpen, label: 'Documents', tab: 'documents', path: '/dashboard?tab=documents' },
        { icon: Medal, label: 'Achievements', tab: 'achievements', path: '/dashboard?tab=achievements' }, // <--- Added Here
        { icon: Brain, label: 'Quizzes', tab: 'quizzes', path: '/dashboard?tab=quizzes' },
        { icon: Layers, label: 'Flashcards', tab: 'flashcards', path: '/dashboard?tab=flashcards' },
        { icon: StickyNote, label: 'Notes', tab: 'notes', path: '/dashboard?tab=notes' },
        { icon: Video, label: 'Rooms', tab: 'rooms', path: '/dashboard?tab=rooms' },
        { icon: Trophy, label: 'Leaderboard', tab: 'leaderboard', path: '/dashboard?tab=leaderboard' },
        { icon: Clock, label: 'History', tab: 'history', path: '/dashboard?tab=history' },
    ];

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Loading your dashboard...</p>
                </div>
            </div>
        );
    }

    // Render Content Based on Active Tab
    const renderContent = () => {
        switch (activeTab) {
            case 'overview':
                return (
                    <OverviewSection
                        stats={data.stats}
                        recentDocuments={data.recentDocuments}
                        aiRecommendations={data.aiRecommendations}
                        activeRooms={data.activeRooms}
                        quickActions={quickActions}
                        handleTabChange={handleTabChange}
                        handleUploadClick={handleUploadClick}
                        handleTakeQuiz={handleTakeQuiz}
                        handleJoinRoom={handleJoinRoom}
                        navigate={navigate}
                    />
                );
            case 'classes': return <ClassesSection />;
            case 'documents': return <DocumentsSection />;
            case 'achievements': return <AchievementsSection />; // <--- Added Here
            case 'quizzes': return <QuizzesSection />;
            case 'flashcards': return <FlashcardsSection />;
            case 'notes': return <NotesSection />;
            case 'rooms': return <RoomsSection />;
            case 'leaderboard': return <LeaderboardSection />;
            case 'history': return <SessionHistorySection />;
            default:
                return (
                    <OverviewSection
                        stats={data.stats}
                        recentDocuments={data.recentDocuments}
                        aiRecommendations={data.aiRecommendations}
                        activeRooms={data.activeRooms}
                        quickActions={quickActions}
                        handleTabChange={handleTabChange}
                        handleUploadClick={handleUploadClick}
                        handleTakeQuiz={handleTakeQuiz}
                        handleJoinRoom={handleJoinRoom}
                        navigate={navigate}
                    />
                );
        }
    };

    return (
        <div className="min-h-screen bg-white flex">
            {/* XP Floating Animation */}
            <AnimatePresence>
                {showXPAnimation && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.5 }}
                        animate={{ opacity: 1, y: -100, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none"
                    >
                        <div className="bg-black text-white px-6 py-3 rounded-full font-black text-xl shadow-2xl">
                            +{data.stats.xp} XP ⚡
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* SIDEBAR */}
            <div className="w-72 bg-gradient-to-b from-black via-gray-900 to-black fixed h-screen flex flex-col shadow-2xl border-r border-white/5">
                {/* Logo */}
                <div className="p-6 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <img src={logoImage} alt="StudyGloqe" className="h-10 w-10" />
                        <div>
                            <div className="text-xl font-black text-white">StudyGloqe</div>
                            <div className="text-xs text-gray-500">AI Learning Platform</div>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                    {sidebarItems.map((item, idx) => (
                        <Link
                            key={idx}
                            to={item.path}
                            onClick={() => handleTabChange(item.tab)}
                            className={`group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === item.tab
                                    ? 'bg-white/10 text-white shadow-lg'
                                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <item.icon size={20} />
                            <span className="flex-1">{item.label}</span>
                            {activeTab === item.tab && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                        </Link>
                    ))}

                    {/* Upload PDF Button */}
                    <button
                        onClick={handleUploadClick}
                        className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white text-black font-bold hover:bg-gray-200 transition-all"
                    >
                        <Upload size={20} />
                        <span>Upload PDF</span>
                    </button>
                </nav>

                {/* Notification & Logout */}
                <div className="p-4 border-t border-white/10 space-y-3">
                    {/* Logout */}
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all"
                    >
                        <LogOut size={18} />
                        <span>Logout</span>
                    </button>
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="flex-1 ml-72">
                <div className="p-8 space-y-6">
                    {/* TOP HEADER */}
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-sm text-gray-400 mb-1">
                                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                            </div>
                            <h1 className="text-3xl font-black text-black">
                                Good morning, {userData?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'Student'} 👋
                            </h1>
                            <p className="text-gray-500 text-sm mt-2">
                                Here's your learning overview for today
                            </p>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* Minimal Notification Icon */}
                            <button className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all relative group">
                                <Bell size={20} className="text-gray-600 group-hover:text-black" />
                                <span className="absolute top-3 right-3 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                            </button>

                            {/* ENHANCED PROFILE CARD */}
                            <Link
                                to="/settings"
                                className="flex items-center gap-5 px-6 py-4 rounded-2xl bg-gradient-to-br from-white via-gray-50 to-gray-100 hover:shadow-xl border-2 border-gray-200 hover:border-gray-300 transition-all duration-300 group min-w-[320px]"
                            >
                                {/* Profile Picture */}
                                <div className="relative">
                                    {userData?.profilePicture ? (
                                        <img
                                            src={userData.profilePicture}
                                            alt={userData.name || 'User'}
                                            className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-lg group-hover:scale-105 transition-transform duration-300"
                                        />
                                    ) : (
                                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-black via-gray-800 to-gray-700 flex items-center justify-center text-white font-black text-2xl shadow-lg group-hover:scale-105 transition-transform duration-300 border-4 border-white">
                                            {userData?.name?.charAt(0) || user?.email?.charAt(0).toUpperCase() || 'U'}
                                        </div>
                                    )}
                                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full" />
                                </div>

                                {/* User Info */}
                                <div className="flex-1 text-left">
                                    <div className="text-base font-bold text-black group-hover:text-gray-800 transition-colors mb-0.5">
                                        {userData?.name || user?.email?.split('@')[0] || 'User'}
                                    </div>
                                    <div className="text-xs text-gray-500 mb-1">
                                        {userData?.email || user?.email || 'user@example.com'}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="px-2 py-0.5 bg-black text-white text-xs font-bold rounded-md">
                                            Level {data.stats.level}
                                        </div>
                                        <div className="text-xs text-gray-600 font-semibold">
                                            {data.stats.xp} XP
                                        </div>
                                    </div>
                                </div>

                                {/* Settings Icon */}
                                <ChevronRight
                                    size={20}
                                    className="text-gray-400 group-hover:text-black group-hover:translate-x-1 transition-all duration-300"
                                />
                            </Link>
                        </div>
                    </div>

                    {/* DYNAMIC CONTENT */}
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
            </div>
        </div>
    );
};

export default Dashboard;
