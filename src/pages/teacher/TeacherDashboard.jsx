// src/pages/teacher/TeacherDashboard.jsx - PREMIUM EDITION WITH REAL DATA
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, FileText, Award, TrendingUp, Plus, Calendar, Clock, CheckCircle2,
    LogOut, Bell, Search, Home, BookOpen, Trophy, BarChart3, Settings,
    ChevronRight, Zap, Target, Brain, Sparkles, ArrowUpRight, Star,
    Activity, Video, Mail, MessageSquare, Flame, Circle
} from 'lucide-react';
import { useAuth } from '@contexts/AuthContext';
import { db } from '@/config/firebase';
import { collection, query, where, getDocs, onSnapshot, orderBy, limit } from 'firebase/firestore';
import toast from 'react-hot-toast';
import logoImage from '@/assets/logo/logo.svg';

const TeacherDashboard = () => {
    const { user, userData, logout } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalStudents: 0,
        totalClasses: 0,
        activeQuizzes: 0,
        avgProgress: 0,
        weeklyGrowth: 0,
        topPerformer: null,
        pendingReviews: 0,
        responseTime: 0
    });
    const [myClasses, setMyClasses] = useState([]);
    const [recentSubmissions, setRecentSubmissions] = useState([]);
    const [todaySchedule, setTodaySchedule] = useState([]);

    // Real-time data loading
    useEffect(() => {
        if (!user?.uid) return;

        const unsubscribers = [];
        loadDashboardData();

        return () => {
            unsubscribers.forEach(unsub => unsub());
        };
    }, [user?.uid]);

    const loadDashboardData = async () => {
        try {
            setLoading(true);

            // 1. Load Teacher's Classes (Real-time)
            const classesQuery = query(
                collection(db, 'classes'),
                where('teacherId', '==', user.uid),
                where('active', '==', true)
            );

            const unsubClasses = onSnapshot(classesQuery, (snapshot) => {
                const classes = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setMyClasses(classes);

                // Calculate total students
                const totalStudents = classes.reduce((sum, cls) => sum + (cls.studentCount || 0), 0);
                
                setStats(prev => ({
                    ...prev,
                    totalClasses: classes.length,
                    totalStudents
                }));
            });

            // 2. Load Active Quizzes
            const quizzesQuery = query(
                collection(db, 'quizzes'),
                where('createdBy', '==', user.uid)
            );

            const quizzesSnapshot = await getDocs(quizzesQuery);
            const activeQuizzes = quizzesSnapshot.docs.filter(doc => {
                const quiz = doc.data();
                return quiz.assignedTo && quiz.assignedTo.length > 0;
            });

            setStats(prev => ({
                ...prev,
                activeQuizzes: activeQuizzes.length
            }));

            // 3. Load Recent Sessions (Student Submissions)
            const sessionsQuery = query(
                collection(db, 'sessions'),
                orderBy('endTs', 'desc'),
                limit(10)
            );

            const unsubSessions = onSnapshot(sessionsQuery, async (snapshot) => {
                const sessions = [];
                
                for (const sessionDoc of snapshot.docs) {
                    const session = sessionDoc.data();
                    
                    // Get quiz details
                    const quizDoc = await getDocs(query(
                        collection(db, 'quizzes'),
                        where('__name__', '==', session.quizId || 'unknown')
                    ));

                    // Get student details
                    const userDoc = await getDocs(query(
                        collection(db, 'users'),
                        where('__name__', '==', session.userId || 'unknown')
                    ));

                    if (session.endTs) {
                        sessions.push({
                            id: sessionDoc.id,
                            student: userDoc.docs[0]?.data()?.name || 'Unknown Student',
                            quiz: quizDoc.docs[0]?.data()?.title || 'Untitled Quiz',
                            score: session.score || 0,
                            time: getTimeAgo(session.endTs?.toDate()),
                            trend: session.score >= 80 ? 'up' : session.score >= 60 ? 'stable' : 'down'
                        });
                    }
                }

                setRecentSubmissions(sessions.slice(0, 5));

                // Calculate average progress
                if (sessions.length > 0) {
                    const avgScore = sessions.reduce((sum, s) => sum + s.score, 0) / sessions.length;
                    setStats(prev => ({
                        ...prev,
                        avgProgress: Math.round(avgScore),
                        topPerformer: sessions.sort((a, b) => b.score - a.score)[0]?.student || null
                    }));
                }
            });

            setLoading(false);
        } catch (error) {
            console.error('Error loading dashboard:', error);
            setLoading(false);
        }
    };

    const getTimeAgo = (date) => {
        if (!date) return 'Just now';
        const seconds = Math.floor((new Date() - date) / 1000);
        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    };

    const handleLogout = async () => {
        try {
            await logout();
            toast.success('Logged out successfully');
            navigate('/auth');
        } catch (error) {
            toast.error('Failed to logout');
        }
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    };

    const navItems = [
        { icon: Home, label: 'Dashboard', active: true, path: '/teacher/dashboard' },
        { icon: BookOpen, label: 'My Classes', path: '/teacher/classes', badge: myClasses.length },
        { icon: FileText, label: 'Assessments', path: '/teacher/assessments' },
        { icon: Users, label: 'Students', path: '/teacher/students', badge: stats.totalStudents },
        { icon: BarChart3, label: 'Analytics', path: '/teacher/analytics' },
        { icon: Trophy, label: 'Leaderboard', path: '/teacher/leaderboard' },
        { icon: Settings, label: 'Settings', path: '/teacher/settings' }
    ];

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">Loading your dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex">
            
            {/* PREMIUM SIDEBAR */}
            <div className="w-64 bg-gradient-to-b from-black via-gray-950 to-black fixed h-screen flex flex-col shadow-2xl border-r border-white/5">
                {/* Logo with glow effect */}
                <div className="p-5 border-b border-white/10">
                    <div className="flex items-center gap-2 group">
                        <div className="relative">
                            <div className="absolute inset-0 bg-white blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
                            <img src={logoImage} alt="Logo" className="h-8 w-8 relative z-10" />
                        </div>
                        <div>
                            <div className="text-lg font-black text-white tracking-tight">StudyGloqe</div>
                            <div className="text-xs text-gray-500 font-medium">Teacher Portal</div>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                    {navItems.map((item, idx) => (
                        <Link
                            key={idx}
                            to={item.path}
                            className={`group flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                                item.active
                                    ? 'bg-white/10 text-white shadow-lg shadow-white/5'
                                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <item.icon size={18} className={item.active ? 'drop-shadow-lg' : ''} />
                                <span>{item.label}</span>
                            </div>
                            {item.badge > 0 && (
                                <span className="px-2 py-0.5 bg-white/20 text-white text-xs font-bold rounded-full">
                                    {item.badge}
                                </span>
                            )}
                        </Link>
                    ))}
                </nav>

                {/* Bottom Profile Section */}
                <div className="p-3 border-t border-white/10 space-y-2">
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/5 backdrop-blur-xl">
                        <div className="relative">
                            <img
                                src={userData?.photoURL || `https://ui-avatars.com/api/?name=${userData?.name || 'T'}&background=fff&color=000&bold=true`}
                                alt="Profile"
                                className="w-9 h-9 rounded-full ring-2 ring-white/20"
                            />
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full ring-2 ring-black" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-white truncate">{userData?.name || 'Teacher'}</div>
                            <div className="text-xs text-gray-500">Online</div>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all"
                    >
                        <LogOut size={16} />
                        <span>Logout</span>
                    </button>
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="flex-1 ml-64">
                {/* PREMIUM TOP BAR */}
                <div className="sticky top-0 z-40 bg-white/70 backdrop-blur-2xl border-b border-gray-200/50 shadow-sm">
                    <div className="px-8 py-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-black text-black tracking-tight">
                                    {getGreeting()}, {userData?.name?.split(' ')[0] || 'Teacher'}! 👋
                                </h1>
                                <p className="text-sm text-gray-600 font-medium">
                                    {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                                </p>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="relative group">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-gray-600 transition-colors" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Search anything..."
                                        className="w-80 pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-black focus:ring-2 focus:ring-black/5 transition-all"
                                    />
                                </div>
                                <button className="relative p-2.5 rounded-xl hover:bg-gray-100 transition-all group">
                                    <Bell size={20} className="text-gray-600 group-hover:text-black transition-colors" />
                                    {stats.pendingReviews > 0 && (
                                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-black rounded-full animate-pulse" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* CONTENT */}
                <div className="p-8 space-y-6">
                    
                    {/* PREMIUM STATS CARDS */}
                    <div className="grid grid-cols-4 gap-4">
                        {/* Total Students */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="group bg-gradient-to-br from-black via-gray-900 to-black rounded-2xl p-6 text-white relative overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform duration-300"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl" />
                            <div className="relative">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-xl">
                                        <Users size={24} />
                                    </div>
                                    {stats.weeklyGrowth > 0 && (
                                        <span className="text-xs bg-green-500/20 text-green-400 px-2.5 py-1 rounded-full font-bold backdrop-blur-xl">
                                            +{stats.weeklyGrowth}%
                                        </span>
                                    )}
                                </div>
                                <div className="text-4xl font-black mb-2">{stats.totalStudents}</div>
                                <div className="text-sm text-gray-400 font-medium">Total Students</div>
                            </div>
                        </motion.div>

                        {/* Active Classes */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="group bg-white border-2 border-black rounded-2xl p-6 hover:shadow-2xl hover:shadow-black/10 transition-all duration-300 cursor-pointer"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <BookOpen size={24} className="text-white" />
                                </div>
                                <ArrowUpRight size={18} className="text-green-600" />
                            </div>
                            <div className="text-4xl font-black text-black mb-2">{stats.totalClasses}</div>
                            <div className="text-sm text-gray-600 font-medium">Active Classes</div>
                        </motion.div>

                        {/* Avg Progress */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="group bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-2xl p-6 hover:border-black transition-all duration-300 cursor-pointer"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center group-hover:rotate-12 transition-transform">
                                    <TrendingUp size={24} className="text-white" />
                                </div>
                                <Target size={18} className="text-gray-400" />
                            </div>
                            <div className="text-4xl font-black text-black mb-2">{stats.avgProgress}%</div>
                            <div className="text-sm text-gray-600 font-medium">Avg Progress</div>
                        </motion.div>

                        {/* Active Quizzes */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="group bg-gradient-to-br from-gray-800 via-gray-900 to-black rounded-2xl p-6 text-white relative overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform duration-300"
                        >
                            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-2xl" />
                            <div className="relative">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-xl">
                                        <FileText size={24} />
                                    </div>
                                    <Sparkles size={18} className="text-yellow-400" />
                                </div>
                                <div className="text-4xl font-black mb-2">{stats.activeQuizzes}</div>
                                <div className="text-sm text-gray-400 font-medium">Active Quizzes</div>
                            </div>
                        </motion.div>
                    </div>

                    {/* QUICK ACTIONS */}
                    <div className="grid grid-cols-4 gap-4">
                        <Link
                            to="/teacher/create-quiz"
                            className="group bg-white border border-gray-200 rounded-xl p-5 hover:border-black hover:shadow-xl transition-all duration-300"
                        >
                            <div className="w-14 h-14 bg-gradient-to-br from-black to-gray-800 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-transform">
                                <Plus size={28} className="text-white" />
                            </div>
                            <div className="font-bold text-black mb-1">Create Quiz</div>
                            <div className="text-xs text-gray-500">AI-powered generation</div>
                        </Link>

                        <Link
                            to="/teacher/classes"
                            className="group bg-white border border-gray-200 rounded-xl p-5 hover:border-black hover:shadow-xl transition-all duration-300"
                        >
                            <div className="w-14 h-14 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-transform">
                                <Users size={28} className="text-white" />
                            </div>
                            <div className="font-bold text-black mb-1">Manage Classes</div>
                            <div className="text-xs text-gray-500">{stats.totalClasses} active classes</div>
                        </Link>

                        <Link
                            to="/teacher/analytics"
                            className="group bg-white border border-gray-200 rounded-xl p-5 hover:border-black hover:shadow-xl transition-all duration-300"
                        >
                            <div className="w-14 h-14 bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-transform">
                                <BarChart3 size={28} className="text-white" />
                            </div>
                            <div className="font-bold text-black mb-1">View Analytics</div>
                            <div className="text-xs text-gray-500">Performance insights</div>
                        </Link>

                        <Link
                            to="/teacher/live"
                            className="group bg-white border border-gray-200 rounded-xl p-5 hover:border-black hover:shadow-xl transition-all duration-300"
                        >
                            <div className="w-14 h-14 bg-gradient-to-br from-gray-900 to-black rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-transform">
                                <Video size={28} className="text-white" />
                            </div>
                            <div className="font-bold text-black mb-1">Start Session</div>
                            <div className="text-xs text-gray-500">Live teaching</div>
                        </Link>
                    </div>

                    {/* MAIN GRID */}
                    <div className="grid grid-cols-12 gap-6">
                        
                        {/* LEFT - My Classes & Submissions */}
                        <div className="col-span-8 space-y-6">
                            
                            {/* My Classes */}
                            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
                                            <BookOpen size={20} className="text-white" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-black text-black">My Classes</h2>
                                            <p className="text-xs text-gray-500">{myClasses.length} active classes</p>
                                        </div>
                                    </div>
                                    <Link to="/teacher/classes" className="text-sm font-bold text-black hover:underline flex items-center gap-1">
                                        View all <ChevronRight size={16} />
                                    </Link>
                                </div>

                                {myClasses.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-4">
                                        {myClasses.slice(0, 4).map((cls, idx) => (
                                            <motion.div
                                                key={cls.id}
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: idx * 0.1 }}
                                                className="group p-5 bg-gradient-to-br from-gray-900 to-black rounded-xl text-white hover:scale-[1.02] transition-all cursor-pointer"
                                                onClick={() => navigate(`/teacher/classes/${cls.id}`)}
                                            >
                                                <div className="flex items-center justify-between mb-3">
                                                    <span className="text-xs px-2.5 py-1 bg-white/20 rounded-full font-bold backdrop-blur-xl">
                                                        {cls.section || 'A'}
                                                    </span>
                                                    <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                                <div className="font-bold text-lg mb-1">{cls.name}</div>
                                                <div className="text-sm text-gray-400 mb-3">{cls.subject}</div>
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-gray-500">Students</span>
                                                    <span className="font-bold">{cls.studentCount || 0}</span>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <BookOpen size={32} className="text-gray-400" />
                                        </div>
                                        <p className="text-gray-600 mb-4">No classes yet</p>
                                        <Link
                                            to="/teacher/classes"
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg font-medium hover:scale-105 transition-transform"
                                        >
                                            <Plus size={16} />
                                            Create your first class
                                        </Link>
                                    </div>
                                )}
                            </div>

                            {/* Recent Submissions */}
                            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
                                            <CheckCircle2 size={20} className="text-white" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-black text-black">Recent Submissions</h2>
                                            <p className="text-xs text-gray-500">Latest quiz results</p>
                                        </div>
                                    </div>
                                </div>

                                {recentSubmissions.length > 0 ? (
                                    <div className="space-y-2">
                                        {recentSubmissions.map((sub, idx) => (
                                            <motion.div
                                                key={sub.id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: idx * 0.05 }}
                                                className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-all"
                                            >
                                                <div className="w-11 h-11 bg-gradient-to-br from-black to-gray-800 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                                    {sub.student.charAt(0)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-semibold text-black text-sm truncate">{sub.student}</div>
                                                    <div className="text-xs text-gray-500 truncate">{sub.quiz}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className={`text-xl font-black ${
                                                        sub.score >= 90 ? 'text-green-600' :
                                                        sub.score >= 70 ? 'text-black' :
                                                        'text-red-600'
                                                    }`}>
                                                        {sub.score}%
                                                    </div>
                                                    <div className="text-xs text-gray-500">{sub.time}</div>
                                                </div>
                                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                                                    sub.trend === 'up' ? 'bg-green-100 text-green-600' :
                                                    sub.trend === 'down' ? 'bg-red-100 text-red-600' :
                                                    'bg-gray-100 text-gray-600'
                                                }`}>
                                                    {sub.trend === 'up' ? '↑' : sub.trend === 'down' ? '↓' : '→'}
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <CheckCircle2 size={32} className="text-gray-400" />
                                        </div>
                                        <p className="text-gray-600">No recent submissions</p>
                                        <p className="text-sm text-gray-500 mt-1">Student quiz results will appear here</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* RIGHT - Insights & Quick Stats */}
                        <div className="col-span-4 space-y-6">
                            
                            {/* Top Performer */}
                            {stats.topPerformer && (
                                <div className="bg-gradient-to-br from-yellow-50 via-yellow-100 to-orange-50 border-2 border-yellow-400 rounded-2xl p-6 shadow-lg">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Star size={20} className="text-yellow-600 fill-yellow-600" />
                                        <span className="text-sm font-bold text-yellow-900">Top Performer</span>
                                    </div>
                                    <div className="text-2xl font-black text-yellow-900 mb-1">{stats.topPerformer}</div>
                                    <div className="text-sm text-yellow-700">Outstanding performance this week! 🎉</div>
                                </div>
                            )}

                            {/* This Week */}
                            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                                <div className="flex items-center justify-between mb-5">
                                    <span className="font-bold text-black">This Week</span>
                                    <Calendar size={16} className="text-gray-400" />
                                </div>
                                <div className="space-y-2">
                                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day, idx) => {
                                        const isToday = idx === new Date().getDay() - 1;
                                        return (
                                            <div
                                                key={day}
                                                className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                                                    isToday
                                                        ? 'bg-black text-white font-bold'
                                                        : 'hover:bg-gray-50'
                                                }`}
                                            >
                                                <span className="text-sm font-medium">{day}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs">{27 + idx} Nov</span>
                                                    {isToday && <Circle size={8} className="fill-white" />}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Quick Insights */}
                            <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                                <h3 className="font-bold text-black mb-5 flex items-center gap-2">
                                    <Activity size={18} />
                                    Quick Insights
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">Pending reviews</span>
                                        <span className="text-xl font-black text-black">{stats.pendingReviews}</span>
                                    </div>
                                    <div className="h-px bg-gray-200" />
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">This week avg</span>
                                        <span className="text-xl font-black text-green-600">{stats.avgProgress}%</span>
                                    </div>
                                    <div className="h-px bg-gray-200" />
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">Active students</span>
                                        <span className="text-xl font-black text-black">{stats.totalStudents}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeacherDashboard;
