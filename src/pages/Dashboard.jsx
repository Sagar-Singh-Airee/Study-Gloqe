import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BookOpen, Upload, Trophy, Target, Clock, TrendingUp, Zap, Award, Play, LogOut,
    Users, Brain, ChevronRight, Flame, BarChart3, FileText, Video, Home, Bell, Search,
    Sparkles, Layers, Mic, Plus, Settings
} from 'lucide-react';
import { useAuth } from '@contexts/AuthContext';
import {
    useDashboardData,
    awardXP,
    completeQuiz,
    joinStudyRoom,
    claimDailyBonus
} from '@/hooks/useDashboardData';
import toast from 'react-hot-toast';
import logoImage from '@/assets/logo/logo.svg';

const Dashboard = () => {
    const { user, userData, logout } = useAuth();
    const navigate = useNavigate();
    const { data, loading } = useDashboardData();
    const [showXPAnimation, setShowXPAnimation] = useState(false);

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

    // Navigation items - Simplified
    const navItems = [
        { icon: Home, label: 'Dashboard', active: true, path: '/dashboard' },
        { icon: Layers, label: 'Workspace', path: '/hub' },
        { icon: Upload, label: 'Upload PDF', path: '/upload' },
        { icon: Trophy, label: 'Leaderboard', path: '/leaderboard' }
    ];

    const quickActions = [
        { icon: Upload, label: 'Upload PDF', desc: 'Generate instant quizzes', action: handleUploadClick },
        { icon: Layers, label: 'Open Workspace', desc: 'Access all features', path: '/hub' },
        { icon: Brain, label: 'Take Quiz', desc: 'Test your knowledge', path: '/hub?tab=quizzes' },
        { icon: Video, label: 'Join Room', desc: 'Study with peers', path: '/hub?tab=rooms' }
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

    const stats = data.stats;
    const recentDocuments = data.recentDocuments;
    const aiRecommendations = data.aiRecommendations;
    const activeRooms = data.activeRooms;

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
                            +{stats.xp} XP ⚡
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* SIDEBAR */}
            <div className="w-72 bg-gradient-to-b from-black via-gray-900 to-black fixed h-screen flex flex-col shadow-2xl border-r border-white/5">
                <div className="p-6 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <img src={logoImage} alt="StudyGloqe" className="h-10 w-10" />
                        <div>
                            <div className="text-xl font-black text-white">StudyGloqe</div>
                            <div className="text-xs text-gray-500">AI Learning Platform</div>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                    {navItems.map((item, idx) => (
                        <Link
                            key={idx}
                            to={item.path || '#'}
                            className={`group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${item.active
                                    ? 'bg-white/10 text-white shadow-lg'
                                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <item.icon size={20} />
                            <span className="flex-1">{item.label}</span>
                            {item.active && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                        </Link>
                    ))}
                </nav>

                {/* User Profile Section */}
                <div className="p-4 border-t border-white/10 space-y-3">
                    <Link
                        to="/settings"
                        onClick={() => console.log('🖱️ Settings link clicked!')}
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
                                Level {stats.level} • {stats.xp} XP
                            </div>
                        </div>
                        <Settings
                            size={18}
                            className="text-gray-500 group-hover:text-white group-hover:rotate-90 transition-all duration-300"
                        />
                    </Link>

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

                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    className="w-80 pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-300 transition-all"
                                />
                            </div>
                            <button className="relative p-2.5 rounded-xl hover:bg-gray-50 transition-all">
                                <Bell size={20} className="text-gray-600" />
                                <span className="absolute top-2 right-2 w-2 h-2 bg-black rounded-full" />
                            </button>
                        </div>
                    </div>

                    {/* STATS GRID */}
                    <div className="grid grid-cols-4 gap-4">
                        <motion.div
                            key={`doc-${stats.totalDocuments}`}
                            initial={{ scale: 1 }}
                            animate={{ scale: [1, 1.05, 1] }}
                            transition={{ duration: 0.3 }}
                            className="bg-gradient-to-br from-gray-900 to-black rounded-2xl p-6 text-white hover:scale-[1.02] transition-all cursor-pointer"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
                                    <FileText size={24} />
                                </div>
                                <TrendingUp size={16} className="text-white/60" />
                            </div>
                            <div className="text-3xl font-black mb-1">{stats.totalDocuments}</div>
                            <div className="text-sm text-gray-400">Documents Uploaded</div>
                        </motion.div>

                        <motion.div
                            key={`quiz-${stats.quizzesGenerated}`}
                            initial={{ scale: 1 }}
                            animate={{ scale: [1, 1.05, 1] }}
                            transition={{ duration: 0.3 }}
                            className="bg-white border-2 border-black rounded-2xl p-6 hover:scale-[1.02] transition-all cursor-pointer group"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Brain size={24} className="text-white" />
                                </div>
                                <Sparkles size={16} className="text-gray-400" />
                            </div>
                            <div className="text-3xl font-black mb-1 text-black">{stats.quizzesGenerated}</div>
                            <div className="text-sm text-gray-500">AI Quizzes Generated</div>
                        </motion.div>

                        <motion.div
                            key={`acc-${stats.averageAccuracy}`}
                            initial={{ scale: 1 }}
                            animate={{ scale: [1, 1.05, 1] }}
                            transition={{ duration: 0.3 }}
                            className="bg-gray-50 border border-gray-200 rounded-2xl p-6 hover:scale-[1.02] transition-all cursor-pointer"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center">
                                    <Target size={24} className="text-white" />
                                </div>
                                <div className="text-xs font-bold text-gray-500">AVG</div>
                            </div>
                            <div className="text-3xl font-black mb-1 text-black">{stats.averageAccuracy}%</div>
                            <div className="text-sm text-gray-500">Quiz Accuracy</div>
                        </motion.div>

                        <motion.div
                            key={`streak-${stats.currentStreak}`}
                            initial={{ scale: 1 }}
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 0.5 }}
                            className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 text-white hover:scale-[1.02] transition-all cursor-pointer relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 text-6xl opacity-10">🔥</div>
                            <div className="relative">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
                                        <Flame size={24} />
                                    </div>
                                </div>
                                <div className="text-3xl font-black mb-1">{stats.currentStreak}</div>
                                <div className="text-sm text-gray-400">Day Streak</div>
                            </div>
                        </motion.div>
                    </div>

                    {/* MAIN GRID */}
                    <div className="grid grid-cols-12 gap-6">
                        {/* LEFT - Recent Activity */}
                        <div className="col-span-8 space-y-6">
                            {/* AI Recommendations */}
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <Sparkles size={20} className="text-black" />
                                        <h2 className="text-xl font-black text-black">Recommended for You</h2>
                                    </div>
                                    <Link to="/hub?tab=quizzes" className="text-sm font-bold text-black hover:underline">
                                        View all quizzes →
                                    </Link>
                                </div>

                                {aiRecommendations.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-4">
                                        {aiRecommendations.slice(0, 2).map((rec, idx) => (
                                            <motion.div
                                                key={`rec-${rec.quizId || idx}`}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: idx * 0.1 }}
                                                className="bg-gradient-to-br from-gray-700 to-gray-800 rounded-2xl p-6 text-white hover:scale-[1.02] transition-all cursor-pointer group"
                                            >
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
                                                        <Brain size={24} />
                                                    </div>
                                                    <div className="text-xs font-bold bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
                                                        {rec.estimatedTime || 15} min
                                                    </div>
                                                </div>
                                                <h3 className="text-lg font-bold mb-1">{rec.title || 'Continue Learning'}</h3>
                                                <p className="text-sm text-white/70 mb-4">{rec.description || 'Personalized by AI'}</p>
                                                <button
                                                    onClick={() => handleTakeQuiz(rec.quizId)}
                                                    className="w-full py-2.5 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-bold backdrop-blur-sm transition-all flex items-center justify-center gap-2 group-hover:gap-3"
                                                >
                                                    Start
                                                    <ChevronRight size={16} />
                                                </button>
                                            </motion.div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 text-center">
                                        <Brain size={48} className="mx-auto text-gray-300 mb-4" />
                                        <p className="text-gray-600 mb-4">Upload your first PDF to get AI-powered recommendations!</p>
                                        <button
                                            onClick={handleUploadClick}
                                            className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl font-bold hover:scale-105 transition-all"
                                        >
                                            <Upload size={18} />
                                            Upload PDF
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Recent Documents */}
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-xl font-black text-black">Recent Documents</h2>
                                    <Link to="/hub?tab=documents" className="text-sm font-bold text-black hover:underline">
                                        View all →
                                    </Link>
                                </div>

                                <AnimatePresence mode="popLayout">
                                    {recentDocuments.length > 0 ? (
                                        <div className="space-y-3">
                                            {recentDocuments.slice(0, 3).map((doc) => (
                                                <motion.div
                                                    key={doc.id}
                                                    layout
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, x: -100 }}
                                                    className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-black hover:shadow-lg transition-all cursor-pointer group"
                                                    onClick={() => navigate(`/pdf-reader/${doc.id}`)}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-14 h-14 bg-gradient-to-br from-gray-900 to-black rounded-xl flex items-center justify-center flex-shrink-0">
                                                            <FileText size={24} className="text-white" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <h3 className="text-sm font-bold text-black truncate">{doc.title}</h3>
                                                                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600">
                                                                    {doc.subject || 'General'}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-4 text-xs text-gray-500">
                                                                <span>{doc.pages || 0} pages</span>
                                                                <span>•</span>
                                                                <span>{doc.createdAt ? new Date(doc.createdAt.toDate()).toLocaleDateString() : 'Just now'}</span>
                                                            </div>
                                                        </div>
                                                        <button className="px-4 py-2 bg-black text-white rounded-lg text-sm font-bold opacity-0 group-hover:opacity-100 transition-all hover:scale-105">
                                                            Open
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    ) : (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="bg-gray-50 border border-gray-200 rounded-2xl p-8 text-center"
                                        >
                                            <FileText size={48} className="mx-auto text-gray-300 mb-4" />
                                            <p className="text-gray-600 mb-4">No documents yet. Upload your first PDF!</p>
                                            <button
                                                onClick={handleUploadClick}
                                                className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl font-bold hover:scale-105 transition-all"
                                            >
                                                <Upload size={18} />
                                                Upload PDF
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* RIGHT SIDEBAR */}
                        <div className="col-span-4 space-y-6">
                            {/* Quick Actions */}
                            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
                                <h3 className="text-sm font-black text-black mb-4 uppercase tracking-wider">Quick Actions</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    {quickActions.map((action, idx) => (
                                        <button
                                            key={`action-${idx}`}
                                            onClick={() => {
                                                if (action.action) {
                                                    action.action();
                                                } else if (action.path) {
                                                    navigate(action.path);
                                                }
                                            }}
                                            className="p-4 bg-white border border-gray-200 rounded-xl hover:border-black hover:shadow-md transition-all cursor-pointer group"
                                        >
                                            <action.icon size={24} className="text-black mb-3 group-hover:scale-110 transition-transform" />
                                            <div className="text-xs font-bold text-black mb-1">{action.label}</div>
                                            <div className="text-xs text-gray-500">{action.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Progress */}
                            <motion.div
                                key={`progress-${stats.xp}`}
                                className="bg-gradient-to-br from-black to-gray-900 rounded-2xl p-6 text-white"
                            >
                                <h3 className="text-sm font-black mb-4 uppercase tracking-wider text-gray-400">Level Progress</h3>

                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                                        <div className="text-2xl font-black">{stats.level}</div>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between text-xs mb-2">
                                            <span className="font-bold">Level {stats.level}</span>
                                            <span className="text-gray-400">{stats.xp}/300 XP</span>
                                        </div>
                                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${(stats.xp / 300) * 100}%` }}
                                                transition={{ duration: 0.5 }}
                                                className="h-full bg-white"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3 pt-4 border-t border-white/10">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Trophy size={16} className="text-white/60" />
                                            <span className="text-sm">Badges Earned</span>
                                        </div>
                                        <span className="text-lg font-black">{stats.badges}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Target size={16} className="text-white/60" />
                                            <span className="text-sm">Quizzes Done</span>
                                        </div>
                                        <span className="text-lg font-black">{stats.quizzesCompleted}</span>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Live Rooms */}
                            <div className="bg-white border border-gray-200 rounded-2xl p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-black text-black uppercase tracking-wider">Live Rooms</h3>
                                    <div className="flex items-center gap-1">
                                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                        <span className="text-xs text-gray-500">{activeRooms.length} active</span>
                                    </div>
                                </div>

                                <AnimatePresence mode="popLayout">
                                    {activeRooms.length > 0 ? (
                                        <div className="space-y-3">
                                            {activeRooms.map((room) => (
                                                <motion.div
                                                    key={room.id}
                                                    layout
                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.9 }}
                                                    onClick={() => handleJoinRoom(room.id)}
                                                    className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all cursor-pointer group"
                                                >
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Video size={14} className="text-black" />
                                                        <span className="text-sm font-bold text-black truncate">{room.name}</span>
                                                    </div>
                                                    <div className="text-xs text-gray-500 mb-2">{room.topic || 'General Discussion'}</div>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-1 text-xs text-gray-500">
                                                            <Users size={12} />
                                                            <span>{room.members?.length || 0} members</span>
                                                        </div>
                                                        <span className="text-xs font-bold text-black opacity-0 group-hover:opacity-100 transition-opacity">
                                                            Join →
                                                        </span>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    ) : (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="text-center py-6"
                                        >
                                            <Users size={32} className="mx-auto text-gray-300 mb-2" />
                                            <p className="text-xs text-gray-500">No active rooms right now</p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
