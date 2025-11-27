// src/pages/StudentHub.jsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users,
    BookOpen,
    Brain,
    Layers,
    StickyNote,
    Video,
    Trophy,
    BarChart3,
    Home,
    LogOut,
    Settings
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@contexts/AuthContext';
import toast from 'react-hot-toast';
import logoImage from '@/assets/logo/logo.svg';

// Import all feature section components
import ClassesSection from '@/components/features/ClassesSection';
import DocumentsSection from '@/components/features/DocumentsSection';
import QuizzesSection from '@/components/features/QuizzesSection';
import FlashcardsSection from '@/components/features/FlashcardsSection';
import NotesSection from '@/components/features/NotesSection';
import RoomsSection from '@/components/features/RoomsSection';
import LeaderboardSection from '@/components/features/LeaderboardSection';
import AnalyticsSection from '@/components/features/AnalyticsSection';

const StudentHub = () => {
    const { user, userData, logout } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // Get initial tab from URL query params or default to 'classes'
    const initialTab = searchParams.get('tab') || 'classes';
    const [activeTab, setActiveTab] = useState(initialTab);

    const tabs = [
        { id: 'classes', label: 'Classes', icon: Users, component: ClassesSection },
        { id: 'documents', label: 'Documents', icon: BookOpen, component: DocumentsSection },
        { id: 'quizzes', label: 'Quizzes', icon: Brain, component: QuizzesSection },
        { id: 'flashcards', label: 'Flashcards', icon: Layers, component: FlashcardsSection },
        { id: 'notes', label: 'Notes', icon: StickyNote, component: NotesSection },
        { id: 'rooms', label: 'Study Rooms', icon: Video, component: RoomsSection },
        { id: 'leaderboard', label: 'Leaderboard', icon: Trophy, component: LeaderboardSection },
        { id: 'analytics', label: 'Analytics', icon: BarChart3, component: AnalyticsSection },
    ];

    const ActiveComponent = tabs.find(t => t.id === activeTab)?.component;

    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        setSearchParams({ tab: tabId });
    };

    const handleLogout = async () => {
        try {
            await logout();
            toast.success('👋 See you soon!');
            navigate('/auth');
        } catch (error) {
            toast.error('Failed to logout');
        }
    };

    return (
        <div className="min-h-screen bg-white flex">
            {/* LEFT SIDEBAR */}
            <aside className="w-72 bg-gradient-to-b from-black via-gray-900 to-black fixed h-screen flex flex-col shadow-2xl border-r border-white/5">
                {/* Logo */}
                <div className="p-6 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <img src={logoImage} alt="StudyGloqe" className="h-10 w-10" />
                        <div>
                            <div className="text-xl font-black text-white">StudyGloqe</div>
                            <div className="text-xs text-gray-500">Student Workspace</div>
                        </div>
                    </div>
                </div>

                {/* Back to Dashboard */}
                <Link
                    to="/dashboard"
                    className="mx-4 mt-4 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white transition-all"
                >
                    <Home size={18} />
                    <span>Back to Dashboard</span>
                </Link>

                {/* Tab Navigation */}
                <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id
                                    ? 'bg-white text-black shadow-lg'
                                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <tab.icon size={20} />
                            <span className="flex-1 text-left">{tab.label}</span>
                            {activeTab === tab.id && <div className="w-1.5 h-1.5 bg-black rounded-full" />}
                        </button>
                    ))}
                </nav>

                {/* User Profile Section */}
                <div className="p-4 border-t border-white/10 space-y-3">
                    {/* Profile Card */}
                    <Link
                        to="/settings"
                        className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all group cursor-pointer"
                    >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white to-gray-300 flex items-center justify-center text-black font-bold text-lg flex-shrink-0">
                            {userData?.name?.charAt(0) || user?.email?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-white truncate group-hover:text-gray-200 transition-colors">
                                {userData?.name || user?.email?.split('@')[0] || 'User'}
                            </div>
                            <div className="text-xs text-gray-400">
                                Level {userData?.level || 1}
                            </div>
                        </div>
                        <Settings
                            size={18}
                            className="text-gray-500 group-hover:text-white group-hover:rotate-90 transition-all duration-300"
                        />
                    </Link>

                    {/* Logout Button */}
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all"
                    >
                        <LogOut size={18} />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <main className="flex-1 ml-72 p-8">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.2 }}
                        className="max-w-7xl mx-auto"
                    >
                        {ActiveComponent && <ActiveComponent />}
                    </motion.div>
                </AnimatePresence>
            </main>
        </div>
    );
};

export default StudentHub;
