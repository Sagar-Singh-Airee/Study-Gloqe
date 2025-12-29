// src/features/teacher/components/dashboard/OverviewSection.jsx
// ✅ PROFESSIONAL TEACHER OVERVIEW - ENHANCED 2025

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Users, BookOpen, TrendingUp, Clock, Award, Calendar, Plus,
    AlertCircle, CheckCircle2, Video, FileText, Brain, ClipboardList,
    ArrowUpRight, Zap, Target, Activity, Sparkles, Bell, MessageSquare,
    Star, Trophy, Flame, Gift, ChevronRight, ExternalLink
} from 'lucide-react';
import { useAuth } from '@auth/contexts/AuthContext';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@shared/config/firebase';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const OverviewSection = ({ stats, classes }) => {
    const { user, userData } = useAuth();
    const navigate = useNavigate();
    const [recentActivity, setRecentActivity] = useState([]);
    const [upcomingSessions, setUpcomingSessions] = useState([]);
    const [pendingTasks, setPendingTasks] = useState([]);
    const [topStudents, setTopStudents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadOverviewData();
    }, [user?.uid]);

    const loadOverviewData = async () => {
        try {
            setLoading(true);

            // Load recent submissions
            const assignmentsQuery = query(
                collection(db, 'assignments'),
                where('teacherId', '==', user.uid),
                orderBy('createdAt', 'desc'),
                limit(10)
            );
            const assignmentsSnap = await getDocs(assignmentsQuery);
            const allSubmissions = [];

            assignmentsSnap.forEach(doc => {
                const assignment = doc.data();
                (assignment.submissions || []).forEach(sub => {
                    allSubmissions.push({
                        ...sub,
                        assignmentTitle: assignment.title,
                        assignmentId: doc.id,
                        type: 'submission'
                    });
                });
            });

            // Sort by date and get recent 5
            allSubmissions.sort((a, b) => {
                const dateA = a.submittedAt?.toDate?.() || new Date(a.submittedAt);
                const dateB = b.submittedAt?.toDate?.() || new Date(b.submittedAt);
                return dateB - dateA;
            });

            setRecentActivity(allSubmissions.slice(0, 5));

            // Load upcoming live sessions
            const sessionsQuery = query(
                collection(db, 'liveSessions'),
                where('teacherId', '==', user.uid),
                where('status', '==', 'scheduled'),
                orderBy('scheduledFor', 'asc'),
                limit(5)
            );
            const sessionsSnap = await getDocs(sessionsQuery);
            setUpcomingSessions(
                sessionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            );

            // Calculate pending tasks
            const tasks = [];

            // Pending assignment reviews
            assignmentsSnap.forEach(doc => {
                const assignment = doc.data();
                const ungraded = (assignment.submissions || []).filter(s => !s.graded).length;
                if (ungraded > 0) {
                    tasks.push({
                        id: doc.id,
                        title: `Grade ${assignment.title}`,
                        count: ungraded,
                        type: 'assignment',
                        icon: ClipboardList,
                        color: 'orange',
                        action: () => navigate(`/teacher/assignments?id=${doc.id}`)
                    });
                }
            });

            // Upcoming deadlines
            const now = new Date();
            const upcoming = assignmentsSnap.docs.filter(doc => {
                const dueDate = doc.data().dueDate?.toDate?.() || new Date(doc.data().dueDate);
                const daysUntil = (dueDate - now) / (1000 * 60 * 60 * 24);
                return daysUntil > 0 && daysUntil <= 3;
            });

            if (upcoming.length > 0) {
                tasks.push({
                    id: 'deadlines',
                    title: 'Assignments Due Soon',
                    count: upcoming.length,
                    type: 'deadline',
                    icon: Clock,
                    color: 'red',
                    action: () => navigate('/teacher/assignments')
                });
            }

            setPendingTasks(tasks.slice(0, 4));

            // Load top performing students (mock for now - implement based on your scoring system)
            setTopStudents([
                { id: 1, name: 'Alex Johnson', score: 98, trend: 'up', avatar: null },
                { id: 2, name: 'Sarah Williams', score: 95, trend: 'up', avatar: null },
                { id: 3, name: 'Michael Chen', score: 92, trend: 'stable', avatar: null },
            ]);

        } catch (error) {
            console.error('Error loading overview:', error);
            toast.error('Failed to load overview data');
        } finally {
            setLoading(false);
        }
    };

    // Quick stats cards data
    const quickStats = [
        {
            label: 'Total Students',
            value: stats.totalStudents,
            change: `+${stats.weeklyGrowth}%`,
            trend: 'up',
            icon: Users,
            gradient: 'from-blue-500 to-cyan-500',
            bgPattern: 'bg-blue-50',
        },
        {
            label: 'Active Classes',
            value: stats.totalClasses,
            change: 'This semester',
            trend: 'stable',
            icon: BookOpen,
            gradient: 'from-purple-500 to-pink-500',
            bgPattern: 'bg-purple-50',
        },
        {
            label: 'Avg Progress',
            value: `${stats.avgProgress}%`,
            change: '+5% this week',
            trend: 'up',
            icon: TrendingUp,
            gradient: 'from-green-500 to-emerald-500',
            bgPattern: 'bg-green-50',
        },
        {
            label: 'Pending Reviews',
            value: stats.pendingReviews,
            change: stats.submissionsToday > 0 ? `${stats.submissionsToday} today` : 'All caught up',
            trend: stats.pendingReviews > 10 ? 'down' : 'stable',
            icon: AlertCircle,
            gradient: stats.pendingReviews > 0 ? 'from-orange-500 to-red-500' : 'from-gray-400 to-gray-500',
            bgPattern: stats.pendingReviews > 0 ? 'bg-orange-50' : 'bg-gray-50',
        },
    ];

    // Quick action buttons
    const quickActions = [
        {
            label: 'Create Assignment',
            icon: Plus,
            gradient: 'from-teal-500 to-cyan-500',
            action: () => navigate('/teacher/assignments?action=create'),
        },
        {
            label: 'Schedule Session',
            icon: Video,
            gradient: 'from-purple-500 to-pink-500',
            action: () => navigate('/teacher/live-sessions?action=create'),
        },
        {
            label: 'Upload Material',
            icon: FileText,
            gradient: 'from-blue-500 to-indigo-500',
            action: () => navigate('/teacher/materials?action=upload'),
        },
        {
            label: 'Send Announcement',
            icon: Bell,
            gradient: 'from-orange-500 to-red-500',
            action: () => navigate('/teacher/announcements?action=create'),
        },
    ];

    const getTimeAgo = (date) => {
        const d = date?.toDate?.() || new Date(date);
        const seconds = Math.floor((new Date() - d) / 1000);
        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return d.toLocaleDateString();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-4"
                    />
                    <p className="text-gray-600">Loading overview...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">

            {/* Welcome Header */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden"
            >
                <div className="bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-500 rounded-3xl p-8 text-white relative">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -mr-32 -mt-32" />
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full -ml-24 -mb-24" />
                    </div>

                    <div className="relative">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.2 }}
                                >
                                    <h1 className="text-4xl font-black mb-2">
                                        Welcome back, {userData?.name || 'Teacher'}! 👋
                                    </h1>
                                    <p className="text-lg opacity-90 mb-4">
                                        You're making great progress with your students this week.
                                    </p>
                                </motion.div>

                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.4 }}
                                    className="flex flex-wrap gap-4"
                                >
                                    <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2">
                                        <Users className="w-5 h-5" />
                                        <span className="font-bold">{stats.totalStudents} Students</span>
                                    </div>
                                    <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2">
                                        <BookOpen className="w-5 h-5" />
                                        <span className="font-bold">{stats.totalClasses} Classes</span>
                                    </div>
                                    <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2">
                                        <Activity className="w-5 h-5" />
                                        <span className="font-bold">{stats.activeStudentsToday} Active Today</span>
                                    </div>
                                </motion.div>
                            </div>

                            {/* Illustration or Stats */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.3 }}
                                className="hidden lg:block"
                            >
                                <div className="w-32 h-32 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                                    <Trophy className="w-16 h-16" />
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {quickStats.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="relative group"
                        >
                            <div className={`${stat.bgPattern} rounded-2xl p-6 border-2 border-transparent hover:border-gray-200 transition-all group-hover:shadow-lg`}>
                                <div className="flex items-start justify-between mb-4">
                                    <div className={`w-12 h-12 bg-gradient-to-br ${stat.gradient} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                        <Icon className="w-6 h-6 text-white" />
                                    </div>
                                    {stat.trend === 'up' && (
                                        <div className="flex items-center gap-1 text-green-600 text-sm font-bold">
                                            <TrendingUp className="w-4 h-4" />
                                        </div>
                                    )}
                                </div>
                                <h3 className="text-3xl font-black text-gray-900 mb-1">{stat.value}</h3>
                                <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                                <p className="text-xs text-gray-500 mt-2">{stat.change}</p>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Quick Actions */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
            >
                <div className="bg-white rounded-2xl p-6 border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-gray-900">Quick Actions</h2>
                        <Zap className="w-5 h-5 text-yellow-500" />
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {quickActions.map((action, index) => {
                            const Icon = action.icon;
                            return (
                                <motion.button
                                    key={action.label}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={action.action}
                                    className={`flex flex-col items-center gap-3 p-4 bg-gradient-to-br ${action.gradient} rounded-xl text-white hover:shadow-lg transition-all`}
                                >
                                    <Icon className="w-6 h-6" />
                                    <span className="text-sm font-bold text-center">{action.label}</span>
                                </motion.button>
                            );
                        })}
                    </div>
                </div>
            </motion.div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Pending Tasks */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 }}
                    className="lg:col-span-2"
                >
                    <div className="bg-white rounded-2xl p-6 border border-gray-200">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                                    <AlertCircle className="w-5 h-5 text-orange-600" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">Pending Tasks</h2>
                                    <p className="text-sm text-gray-600">Action items requiring attention</p>
                                </div>
                            </div>
                            {pendingTasks.length > 0 && (
                                <span className="px-3 py-1 bg-orange-100 text-orange-600 rounded-full text-sm font-bold">
                                    {pendingTasks.length}
                                </span>
                            )}
                        </div>

                        {pendingTasks.length > 0 ? (
                            <div className="space-y-3">
                                {pendingTasks.map((task) => {
                                    const Icon = task.icon;
                                    const colorClasses = {
                                        orange: 'bg-orange-50 border-orange-200 text-orange-600',
                                        red: 'bg-red-50 border-red-200 text-red-600',
                                        blue: 'bg-blue-50 border-blue-200 text-blue-600',
                                    };

                                    return (
                                        <motion.div
                                            key={task.id}
                                            whileHover={{ scale: 1.02 }}
                                            className={`${colorClasses[task.color]} border-2 rounded-xl p-4 cursor-pointer transition-all`}
                                            onClick={task.action}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                                                        <Icon className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold">{task.title}</p>
                                                        <p className="text-sm opacity-75">{task.count} items</p>
                                                    </div>
                                                </div>
                                                <ChevronRight className="w-5 h-5" />
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-3" />
                                <p className="text-gray-600 font-medium">All caught up! 🎉</p>
                                <p className="text-sm text-gray-500 mt-1">No pending tasks at the moment.</p>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Upcoming Sessions */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 }}
                >
                    <div className="bg-white rounded-2xl p-6 border border-gray-200">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <Video className="w-5 h-5 text-purple-600" />
                                <h2 className="text-lg font-bold text-gray-900">Upcoming Sessions</h2>
                            </div>
                        </div>

                        {upcomingSessions.length > 0 ? (
                            <div className="space-y-3">
                                {upcomingSessions.map((session) => {
                                    const sessionDate = session.scheduledFor?.toDate?.() || new Date(session.scheduledFor);
                                    return (
                                        <div
                                            key={session.id}
                                            className="p-3 bg-purple-50 border border-purple-200 rounded-xl"
                                        >
                                            <p className="font-bold text-gray-900 mb-1">{session.title}</p>
                                            <p className="text-sm text-gray-600">
                                                {sessionDate.toLocaleDateString()} at {sessionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">{session.className}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                                <p className="text-sm text-gray-600">No upcoming sessions</p>
                            </div>
                        )}

                        <button
                            onClick={() => navigate('/teacher/live-sessions?action=create')}
                            className="w-full mt-4 py-3 bg-purple-100 hover:bg-purple-200 text-purple-600 rounded-xl font-bold transition-all"
                        >
                            Schedule New Session
                        </button>
                    </div>
                </motion.div>
            </div>

            {/* Recent Activity */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
            >
                <div className="bg-white rounded-2xl p-6 border border-gray-200">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <Activity className="w-5 h-5 text-teal-600" />
                            <h2 className="text-xl font-bold text-gray-900">Recent Activity</h2>
                        </div>
                        <button
                            onClick={() => navigate('/teacher/assignments')}
                            className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
                        >
                            View All
                            <ArrowUpRight className="w-4 h-4" />
                        </button>
                    </div>

                    {recentActivity.length > 0 ? (
                        <div className="space-y-3">
                            {recentActivity.map((activity, index) => (
                                <div
                                    key={index}
                                    className="flex items-center gap-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all"
                                >
                                    <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
                                        <ClipboardList className="w-5 h-5 text-teal-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 truncate">
                                            {activity.studentName || 'Student'} submitted {activity.assignmentTitle}
                                        </p>
                                        <p className="text-sm text-gray-600">{getTimeAgo(activity.submittedAt)}</p>
                                    </div>
                                    {!activity.graded && (
                                        <span className="px-3 py-1 bg-orange-100 text-orange-600 rounded-full text-xs font-bold">
                                            Pending
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <Activity className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-600 font-medium">No recent activity</p>
                            <p className="text-sm text-gray-500 mt-1">Activity will appear here as students interact with your content.</p>
                        </div>
                    )}
                </div>
            </motion.div>

        </div>
    );
};

export default OverviewSection;
