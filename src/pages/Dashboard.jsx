import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
    Play
} from 'lucide-react';
import { useAuth } from '@contexts/AuthContext';
import { getUserDocuments } from '@services/documentService';
import { getUserQuizzes } from '@services/quizService';

const Dashboard = () => {
    const { userData } = useAuth();
    const [documents, setDocuments] = useState([]);
    const [quizzes, setQuizzes] = useState([]);
    const [stats, setStats] = useState({
        totalDocuments: 0,
        completedQuizzes: 0,
        currentStreak: 3,
        weeklyProgress: 65
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            const [docsData, quizzesData] = await Promise.all([
                getUserDocuments(userData.uid, 5),
                getUserQuizzes(userData.uid, userData.role)
            ]);

            setDocuments(docsData);
            setQuizzes(quizzesData);
            setStats({
                totalDocuments: docsData.length,
                completedQuizzes: quizzesData.filter(q => q.status === 'completed').length,
                currentStreak: 3,
                weeklyProgress: 65
            });
        } catch (error) {
            console.error('Error loading dashboard:', error);
        } finally {
            setLoading(false);
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

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="mt-4 text-primary-300">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Welcome Section */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <h1 className="text-4xl font-display font-bold mb-2">
                    Welcome back, <span className="gradient-text">{userData?.name || 'Student'}</span>!
                </h1>
                <p className="text-primary-300">Ready to continue your learning journey?</p>
            </motion.div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {quickStats.map((stat, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        className="card-hover"
                    >
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${stat.color} flex items-center justify-center mb-4`}>
                            <stat.icon size={24} />
                        </div>
                        <div className="text-3xl font-bold mb-1">{stat.value}</div>
                        <div className="text-sm text-primary-400">{stat.label}</div>
                    </motion.div>
                ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid lg:grid-cols-3 gap-6">
                {/* Left Column - Recent Activity & Recommendations */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Recommended Next Steps */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                        className="card bg-gradient-to-br from-accent/20 to-blue-600/20 border-accent/30"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                                <Zap size={20} />
                            </div>
                            <div>
                                <h3 className="text-xl font-display font-semibold">AI Recommended</h3>
                                <p className="text-sm text-primary-300">Personalized for your learning path</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <button className="w-full p-4 rounded-xl glass-hover text-left flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center">
                                        <Play size={18} />
                                    </div>
                                    <div>
                                        <div className="font-medium">Continue: Physics Chapter 5 Quiz</div>
                                        <div className="text-sm text-primary-400">3 questions remaining</div>
                                    </div>
                                </div>
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Play size={20} />
                                </div>
                            </button>

                            <Link
                                to="/upload"
                                className="w-full p-4 rounded-xl glass-hover text-left flex items-center justify-between group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                                        <Upload size={18} />
                                    </div>
                                    <div>
                                        <div className="font-medium">Upload new study material</div>
                                        <div className="text-sm text-primary-400">Generate instant quizzes</div>
                                    </div>
                                </div>
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Upload size={20} />
                                </div>
                            </Link>
                        </div>
                    </motion.div>

                    {/* Recent Documents */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.5 }}
                        className="card"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-display font-semibold">Recent Documents</h2>
                            <Link to="/upload" className="text-accent hover:text-accent-light text-sm font-medium">
                                View All
                            </Link>
                        </div>

                        {documents.length === 0 ? (
                            <div className="text-center py-12">
                                <BookOpen size={48} className="mx-auto text-primary-400 mb-4" />
                                <p className="text-primary-300 mb-4">No documents yet</p>
                                <Link to="/upload" className="btn-primary inline-flex items-center gap-2">
                                    <Upload size={18} />
                                    Upload Your First PDF
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {documents.slice(0, 5).map((doc, index) => (
                                    <Link
                                        key={doc.id}
                                        to={`/reader/${doc.docId}`}
                                        className="flex items-center gap-4 p-4 rounded-xl glass-hover group"
                                    >
                                        <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-accent to-blue-600 flex items-center justify-center flex-shrink-0">
                                            <BookOpen size={20} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium truncate">{doc.title}</div>
                                            <div className="text-sm text-primary-400">
                                                {doc.pages || 0} pages • {doc.subject || 'Uncategorized'}
                                            </div>
                                        </div>
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Play size={20} />
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </motion.div>
                </div>

                {/* Right Column - Progress & Calendar */}
                <div className="space-y-6">
                    {/* XP Progress */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.6 }}
                        className="card"
                    >
                        <h3 className="text-xl font-display font-semibold mb-4">Your Progress</h3>

                        {/* Level Badge */}
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center justify-center">
                                <span className="text-2xl font-bold">{userData?.level || 1}</span>
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="font-medium">Level {userData?.level || 1}</span>
                                    <span className="text-primary-400">{userData?.xp || 0}/500 XP</span>
                                </div>
                                <div className="h-2 bg-primary-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-accent to-blue-600 transition-all duration-500"
                                        style={{ width: `${((userData?.xp || 0) / 500) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>

                        {/* Recent Badges */}
                        <div>
                            <div className="text-sm font-medium mb-3">Recent Achievements</div>
                            <div className="grid grid-cols-3 gap-2">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="aspect-square rounded-lg bg-gradient-to-br from-accent/20 to-blue-600/20 border border-accent/30 flex items-center justify-center">
                                        <Award size={24} className="text-accent" />
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
                        className="card bg-gradient-to-br from-orange-500/20 to-red-500/20 border-orange-500/30"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center">
                                <Zap size={20} />
                            </div>
                            <div>
                                <div className="text-2xl font-bold">{stats.currentStreak} Days</div>
                                <div className="text-sm text-primary-300">Current Streak</div>
                            </div>
                        </div>
                        <p className="text-sm text-primary-300">
                            Keep it up! Study today to maintain your streak 🔥
                        </p>
                    </motion.div>

                    {/* Quick Actions */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.8 }}
                        className="card"
                    >
                        <h3 className="text-xl font-display font-semibold mb-4">Quick Actions</h3>
                        <div className="space-y-2">
                            <Link to="/rooms" className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors">
                                <Calendar size={18} />
                                <span>Join Study Room</span>
                            </Link>
                            <Link to="/leaderboard" className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors">
                                <Trophy size={18} />
                                <span>View Leaderboard</span>
                            </Link>
                            <Link to="/flashcards" className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors">
                                <TrendingUp size={18} />
                                <span>Review Flashcards</span>
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;