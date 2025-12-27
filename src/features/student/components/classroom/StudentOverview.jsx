// src/features/student/components/classroom/StudentOverview.jsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    FileText, Trophy, Download, Video, Bell, BarChart3,
    Clock, CheckCircle2, AlertCircle, TrendingUp, Calendar,
    Star, Award, Target, Zap, BookOpen, ArrowRight,
    Flame, Brain, Users, MessageSquare, Play
} from 'lucide-react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@shared/config/firebase';
import { useAuth } from '@auth/contexts/AuthContext';

const StudentOverview = ({ classId, classData, stats, onNavigate }) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [overviewData, setOverviewData] = useState({
        upcomingAssignments: [],
        recentAnnouncements: [],
        nextLiveSession: null,
        recentGrades: [],
        weeklyProgress: 0,
        streak: 0
    });

    useEffect(() => {
        loadOverviewData();
    }, [classId, user?.uid]);

    const loadOverviewData = async () => {
        try {
            setLoading(true);

            // Load upcoming assignments (due in next 7 days)
            const assignmentsQuery = query(
                collection(db, 'assignments'),
                where('classId', '==', classId),
                orderBy('dueDate', 'asc'),
                limit(5)
            );
            const assignmentsSnap = await getDocs(assignmentsQuery);
            const assignments = assignmentsSnap.docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    dueDate: doc.data().dueDate?.toDate?.() || new Date(doc.data().dueDate)
                }))
                .filter(a => a.dueDate > new Date()); // Only future assignments

            // Load recent announcements
            const announcementsQuery = query(
                collection(db, 'announcements'),
                where('targetClasses', 'array-contains', classId),
                orderBy('createdAt', 'desc'),
                limit(3)
            );
            const announcementsSnap = await getDocs(announcementsQuery);
            const announcements = announcementsSnap.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate?.() || new Date()
            }));

            // Load next live session
            const sessionsQuery = query(
                collection(db, 'liveSessions'),
                where('classId', '==', classId),
                where('status', '==', 'scheduled'),
                orderBy('scheduledTime', 'asc'),
                limit(1)
            );
            const sessionsSnap = await getDocs(sessionsQuery);
            const nextSession = sessionsSnap.docs.length > 0
                ? { id: sessionsSnap.docs[0].id, ...sessionsSnap.docs[0].data() }
                : null;

            setOverviewData({
                upcomingAssignments: assignments,
                recentAnnouncements: announcements,
                nextLiveSession: nextSession,
                recentGrades: [],
                weeklyProgress: 75, // You can calculate this based on completed activities
                streak: 7 // Calculate based on login history
            });

        } catch (error) {
            console.error('Error loading overview:', error);
        } finally {
            setLoading(false);
        }
    };

    const getTimeUntil = (date) => {
        const now = new Date();
        const diff = date - now;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        if (days > 0) return `${days}d ${hours}h`;
        if (hours > 0) return `${hours}h`;
        return 'Soon';
    };

    const getStatusColor = (assignment) => {
        const daysLeft = Math.ceil((assignment.dueDate - new Date()) / (1000 * 60 * 60 * 24));
        if (daysLeft <= 1) return 'border-red-300 bg-red-50';
        if (daysLeft <= 3) return 'border-orange-300 bg-orange-50';
        return 'border-blue-300 bg-blue-50';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center">
                    <div className="w-12 h-12 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">Loading overview...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Assignments */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white border-2 border-blue-200 rounded-2xl p-6 hover:shadow-xl transition-all cursor-pointer group"
                    onClick={() => onNavigate('assignments')}
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <FileText size={24} className="text-white" strokeWidth={2.5} />
                        </div>
                        <ArrowRight size={20} className="text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                    </div>
                    <h3 className="text-3xl font-black text-gray-900 mb-1">{stats.totalAssignments}</h3>
                    <p className="text-sm text-gray-600 font-semibold">Total Assignments</p>
                    <div className="mt-3 flex items-center gap-2">
                        <span className="text-xs font-bold text-green-600">{stats.completedAssignments} completed</span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs font-bold text-orange-600">{stats.pendingAssignments} pending</span>
                    </div>
                </motion.div>

                {/* Quizzes */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white border-2 border-yellow-200 rounded-2xl p-6 hover:shadow-xl transition-all cursor-pointer group"
                    onClick={() => onNavigate('quizzes')}
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Trophy size={24} className="text-white" strokeWidth={2.5} />
                        </div>
                        <ArrowRight size={20} className="text-gray-400 group-hover:text-yellow-600 group-hover:translate-x-1 transition-all" />
                    </div>
                    <h3 className="text-3xl font-black text-gray-900 mb-1">—</h3>
                    <p className="text-sm text-gray-600 font-semibold">Active Quizzes</p>
                    <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-yellow-600">
                        <Star size={14} fill="currentColor" />
                        <span>View all quizzes</span>
                    </div>
                </motion.div>

                {/* Average Grade */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white border-2 border-purple-200 rounded-2xl p-6 hover:shadow-xl transition-all cursor-pointer group"
                    onClick={() => onNavigate('grades')}
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <BarChart3 size={24} className="text-white" strokeWidth={2.5} />
                        </div>
                        <ArrowRight size={20} className="text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
                    </div>
                    <h3 className="text-3xl font-black text-gray-900 mb-1">{stats.avgGrade || '—'}%</h3>
                    <p className="text-sm text-gray-600 font-semibold">Average Grade</p>
                    <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-purple-600">
                        <TrendingUp size={14} />
                        <span>View grade report</span>
                    </div>
                </motion.div>

                {/* Study Streak */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white border-2 border-orange-200 rounded-2xl p-6 hover:shadow-xl transition-all"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                            <Flame size={24} className="text-white" strokeWidth={2.5} />
                        </div>
                        <span className="text-xs font-black text-orange-600 bg-orange-100 px-2 py-1 rounded-lg">ACTIVE</span>
                    </div>
                    <h3 className="text-3xl font-black text-gray-900 mb-1">{overviewData.streak} days</h3>
                    <p className="text-sm text-gray-600 font-semibold">Study Streak 🔥</p>
                    <div className="mt-3 text-xs font-bold text-orange-600">
                        Keep it going!
                    </div>
                </motion.div>
            </div>

            {/* Main Content Grid */}
            <div className="grid lg:grid-cols-3 gap-6">
                {/* Left Column - Upcoming & Announcements */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Upcoming Assignments */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-white rounded-2xl border-2 border-gray-200 p-6"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                                    <Clock size={20} className="text-white" strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-gray-900">Upcoming Deadlines</h2>
                                    <p className="text-xs text-gray-500">Next 7 days</p>
                                </div>
                            </div>
                            <button
                                onClick={() => onNavigate('assignments')}
                                className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                            >
                                View all
                                <ArrowRight size={16} />
                            </button>
                        </div>

                        <div className="space-y-3">
                            {overviewData.upcomingAssignments.length > 0 ? (
                                overviewData.upcomingAssignments.map((assignment, idx) => (
                                    <motion.div
                                        key={assignment.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.1 }}
                                        className={`p-4 border-2 rounded-xl transition-all hover:shadow-md ${getStatusColor(assignment)}`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <h3 className="font-bold text-gray-900 mb-1">{assignment.title}</h3>
                                                <p className="text-xs text-gray-600 mb-2 line-clamp-1">
                                                    {assignment.description || 'No description'}
                                                </p>
                                                <div className="flex items-center gap-3 text-xs">
                                                    <span className="flex items-center gap-1 font-semibold text-gray-700">
                                                        <Calendar size={12} />
                                                        {assignment.dueDate.toLocaleDateString()}
                                                    </span>
                                                    <span className="font-bold text-blue-700">
                                                        Due in {getTimeUntil(assignment.dueDate)}
                                                    </span>
                                                </div>
                                            </div>
                                            <button className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors">
                                                Start
                                            </button>
                                        </div>
                                    </motion.div>
                                ))
                            ) : (
                                <div className="text-center py-8">
                                    <CheckCircle2 size={48} className="text-green-500 mx-auto mb-3" />
                                    <p className="text-gray-600 font-semibold">No upcoming deadlines! 🎉</p>
                                    <p className="text-xs text-gray-500 mt-1">You're all caught up</p>
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Recent Announcements */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white rounded-2xl border-2 border-gray-200 p-6"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-blue-500 rounded-xl flex items-center justify-center">
                                    <Bell size={20} className="text-white" strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-gray-900">Announcements</h2>
                                    <p className="text-xs text-gray-500">Latest updates</p>
                                </div>
                            </div>
                            <button
                                onClick={() => onNavigate('announcements')}
                                className="text-sm font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1"
                            >
                                View all
                                <ArrowRight size={16} />
                            </button>
                        </div>

                        <div className="space-y-3">
                            {overviewData.recentAnnouncements.length > 0 ? (
                                overviewData.recentAnnouncements.map((announcement, idx) => (
                                    <motion.div
                                        key={announcement.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.1 }}
                                        className="p-4 bg-gradient-to-r from-teal-50 to-blue-50 border border-teal-200 rounded-xl"
                                    >
                                        <div className="flex items-start gap-3">
                                            <MessageSquare size={16} className="text-teal-600 mt-1" />
                                            <div className="flex-1">
                                                <h3 className="font-bold text-gray-900 text-sm mb-1">{announcement.title}</h3>
                                                <p className="text-xs text-gray-600 line-clamp-2">{announcement.content}</p>
                                                <p className="text-xs text-gray-500 mt-2">
                                                    {announcement.createdAt.toLocaleDateString()} • {announcement.teacherName}
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))
                            ) : (
                                <div className="text-center py-8">
                                    <Bell size={48} className="text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-500 text-sm">No announcements yet</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>

                {/* Right Column - Quick Actions & Live Session */}
                <div className="space-y-6">
                    {/* Next Live Class */}
                    {overviewData.nextLiveSession && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl p-6 text-white"
                        >
                            <div className="flex items-center gap-2 mb-4">
                                <Video size={24} strokeWidth={2.5} />
                                <h2 className="text-lg font-black">Next Live Class</h2>
                            </div>
                            <h3 className="text-xl font-black mb-2">{overviewData.nextLiveSession.topic}</h3>
                            <p className="text-sm opacity-90 mb-4">{overviewData.nextLiveSession.description}</p>
                            <div className="flex items-center gap-2 text-sm font-semibold mb-4">
                                <Calendar size={16} />
                                <span>Tomorrow at 10:00 AM</span>
                            </div>
                            <button className="w-full py-3 bg-white text-red-600 rounded-xl font-black hover:bg-red-50 transition-colors flex items-center justify-center gap-2">
                                <Play size={18} />
                                Join Class
                            </button>
                        </motion.div>
                    )}

                    {/* Quick Actions */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white rounded-2xl border-2 border-gray-200 p-6"
                    >
                        <h2 className="text-lg font-black text-gray-900 mb-4">Quick Actions</h2>
                        <div className="space-y-3">
                            <button
                                onClick={() => onNavigate('materials')}
                                className="w-full p-4 bg-green-50 hover:bg-green-100 border border-green-200 rounded-xl text-left transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <Download size={20} className="text-green-600" />
                                    <div className="flex-1">
                                        <p className="font-bold text-gray-900 text-sm">Browse Materials</p>
                                        <p className="text-xs text-gray-600">Study resources & notes</p>
                                    </div>
                                    <ArrowRight size={16} className="text-gray-400 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </button>

                            <button
                                onClick={() => onNavigate('grades')}
                                className="w-full p-4 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl text-left transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <BarChart3 size={20} className="text-purple-600" />
                                    <div className="flex-1">
                                        <p className="font-bold text-gray-900 text-sm">Check Grades</p>
                                        <p className="text-xs text-gray-600">View your progress</p>
                                    </div>
                                    <ArrowRight size={16} className="text-gray-400 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </button>

                            <button
                                onClick={() => onNavigate('quizzes')}
                                className="w-full p-4 bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 rounded-xl text-left transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <Brain size={20} className="text-yellow-600" />
                                    <div className="flex-1">
                                        <p className="font-bold text-gray-900 text-sm">Practice Quizzes</p>
                                        <p className="text-xs text-gray-600">Test your knowledge</p>
                                    </div>
                                    <ArrowRight size={16} className="text-gray-400 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </button>
                        </div>
                    </motion.div>

                    {/* Class Progress */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white rounded-2xl border-2 border-gray-200 p-6"
                    >
                        <h2 className="text-lg font-black text-gray-900 mb-4">Weekly Progress</h2>
                        <div className="mb-4">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-semibold text-gray-700">Completion Rate</span>
                                <span className="text-2xl font-black text-blue-600">{overviewData.weeklyProgress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${overviewData.weeklyProgress}%` }}
                                    transition={{ duration: 1, ease: 'easeOut' }}
                                    className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
                                />
                            </div>
                        </div>
                        <p className="text-xs text-gray-600">
                            Great job! You're doing better than last week 🚀
                        </p>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default StudentOverview;
