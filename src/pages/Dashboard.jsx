import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    BookOpen,
    Upload,
    Trophy,
    Target,
    Clock,
    TrendingUp,
    Calendar,
    Zap,
    Award,
    Play,
    LogOut
} from 'lucide-react';
import { useAuth } from '@contexts/AuthContext';
import toast from 'react-hot-toast';

const Dashboard = () => {
    const { user, userData, logout } = useAuth();
    const navigate = useNavigate();
    const [stats] = useState({
        totalDocuments: 0,
        completedQuizzes: 0,
        currentStreak: 0,
        weeklyProgress: 65
    });

    useEffect(() => {
        console.log('Dashboard mounted');
        console.log('User:', user);
        console.log('UserData:', userData);
    }, [user, userData]);

    const handleLogout = async () => {
        try {
            await logout();
            toast.success('Logged out successfully');
            navigate('/auth');
        } catch (error) {
            toast.error('Failed to logout');
        }
    };

    const quickStats = [
        {
            icon: BookOpen,
            label: 'Documents',
            value: stats.totalDocuments,
            color: 'from-blue-500 to-cyan-500'
        },
        {
            icon: Trophy,
            label: 'Completed Quizzes',
            value: stats.completedQuizzes,
            color: 'from-yellow-500 to-orange-500'
        },
        {
            icon: Zap,
            label: 'Current Streak',
            value: `${stats.currentStreak} days`,
            color: 'from-purple-500 to-pink-500'
        },
        {
            icon: Target,
            label: 'Weekly Goal',
            value: `${stats.weeklyProgress}%`,
            color: 'from-green-500 to-emerald-500'
        }
    ];

    // Always render the dashboard, don't block on userData
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header with Logout */}
                <div className="flex justify-between items-center">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <h1 className="text-3xl md:text-4xl font-bold mb-2">
                            Welcome back,{' '}
                            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                                {userData?.name || user?.email?.split('@')[0] || 'User'}
                            </span>
                            !
                        </h1>
                        <p className="text-gray-400">Ready to continue your learning journey?</p>
                    </motion.div>

                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600/20 border border-red-500/30 rounded-lg hover:bg-red-600/30 transition-colors"
                    >
                        <LogOut size={18} />
                        <span className="hidden sm:inline">Logout</span>
                    </button>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    {quickStats.map((stat, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-2xl p-6 hover:border-gray-600 transition-all"
                        >
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${stat.color} flex items-center justify-center mb-4`}>
                                <stat.icon size={24} />
                            </div>
                            <div className="text-2xl md:text-3xl font-bold mb-1">{stat.value}</div>
                            <div className="text-sm text-gray-400">{stat.label}</div>
                        </motion.div>
                    ))}
                </div>

                {/* Main Content Grid */}
                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Left Column */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* AI Recommended */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.4 }}
                            className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-blue-500/30 rounded-2xl p-6"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                                    <Zap size={20} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold">AI Recommended</h3>
                                    <p className="text-sm text-gray-400">Personalized for your learning path</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Link
                                    to="/upload"
                                    className="w-full p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left flex items-center justify-between group transition-all"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                                            <Upload size={18} />
                                        </div>
                                        <div>
                                            <div className="font-medium">Upload new study material</div>
                                            <div className="text-sm text-gray-400">Generate instant quizzes</div>
                                        </div>
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Play size={20} />
                                    </div>
                                </Link>
                            </div>
                        </motion.div>

                        {/* Recent Documents */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.5 }}
                            className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-2xl p-6"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-semibold">Recent Documents</h2>
                                <Link to="/upload" className="text-blue-400 hover:text-blue-300 text-sm font-medium">
                                    View All
                                </Link>
                            </div>

                            <div className="text-center py-12">
                                <BookOpen size={48} className="mx-auto text-gray-500 mb-4" />
                                <p className="text-gray-400 mb-4">No documents yet</p>
                                <Link to="/upload" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                                    <Upload size={18} />
                                    Upload Your First PDF
                                </Link>
                            </div>
                        </motion.div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                        {/* XP Progress */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.6 }}
                            className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-2xl p-6"
                        >
                            <h3 className="text-xl font-semibold mb-4">Your Progress</h3>

                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center justify-center">
                                    <span className="text-2xl font-bold text-white">{userData?.level || 1}</span>
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="font-medium">Level {userData?.level || 1}</span>
                                        <span className="text-gray-400">{userData?.xp || 0}/100 XP</span>
                                    </div>
                                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500"
                                            style={{ width: `${((userData?.xp || 0) % 100)}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <div className="text-sm font-medium mb-3">Recent Achievements</div>
                                <div className="grid grid-cols-3 gap-2">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="aspect-square rounded-lg bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-blue-500/30 flex items-center justify-center">
                                            <Award size={24} className="text-blue-400" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>

                        {/* Study Streak */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.7 }}
                            className="bg-gradient-to-br from-orange-900/30 to-red-900/30 border border-orange-500/30 rounded-2xl p-6"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center">
                                    <Zap size={20} />
                                </div>
                                <div>
                                    <div className="text-2xl font-bold">{stats.currentStreak} Days</div>
                                    <div className="text-sm text-gray-400">Current Streak</div>
                                </div>
                            </div>
                            <p className="text-sm text-gray-400">
                                Keep it up! Study today to maintain your streak 🔥
                            </p>
                        </motion.div>

                        {/* Quick Actions */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.8 }}
                            className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-2xl p-6"
                        >
                            <h3 className="text-xl font-semibold mb-4">Quick Actions</h3>
                            <div className="space-y-2">
                                <button onClick={() => toast.success('Feature coming soon!')} className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors text-left">
                                    <Calendar size={18} />
                                    <span>Join Study Room</span>
                                </button>
                                <button onClick={() => toast.success('Feature coming soon!')} className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors text-left">
                                    <Trophy size={18} />
                                    <span>View Leaderboard</span>
                                </button>
                                <button onClick={() => toast.success('Feature coming soon!')} className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors text-left">
                                    <TrendingUp size={18} />
                                    <span>Review Flashcards</span>
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;