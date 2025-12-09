// src/pages/teacher/TeacherDashboard.jsx - UPDATED WITH CORRECT NAVIGATION

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, BookOpen, Users, FileText, Award, TrendingUp,
    Clock, CheckCircle2, AlertCircle, Activity, Target,
    Video, ClipboardList, Brain, Calendar, ChevronRight,
    Bell, MessageSquare, BarChart3, Trophy, FolderOpen, Settings
} from 'lucide-react';
import { useAuth } from '@contexts/AuthContext';
import { db } from '@/config/firebase';
import {
    collection, query, where, getDocs, onSnapshot,
    orderBy, limit, doc, getDoc
} from 'firebase/firestore';
import toast from 'react-hot-toast';

// Import components
import TeacherNavbar from '@/components/teacher/TeacherNavbar';
import TeacherSidebar from '@/components/teacher/TeacherSidebar';
import QuickStats from '@/components/teacher/QuickStats';
import ClassManagement from '@/components/teacher/ClassManagement';
import AssignmentCreator from '@/components/teacher/AssignmentCreator';
import GradeBook from '@/components/teacher/GradeBook';
import TeacherAnalytics from '@/components/teacher/TeacherAnalytics';

const TeacherDashboard = () => {
    const { user, userData } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [searchQuery, setSearchQuery] = useState('');
    const [notifications, setNotifications] = useState([]);
    const [showAssignmentCreator, setShowAssignmentCreator] = useState(false);

    // Stats state
    const [stats, setStats] = useState({
        totalStudents: 0,
        totalClasses: 0,
        activeQuizzes: 0,
        totalAssignments: 0,
        avgProgress: 0,
        weeklyGrowth: 0,
        topPerformer: null,
        topPerformerScore: 0,
        pendingReviews: 0,
        submissionsToday: 0,
        upcomingDeadlines: 0,
        activeStudentsToday: 0,
        classesWithAlerts: 0
    });

    // Data state
    const [myClasses, setMyClasses] = useState([]);
    const [recentSubmissions, setRecentSubmissions] = useState([]);

    useEffect(() => {
        if (!user?.uid) {
            navigate('/auth');
            return;
        }

        loadDashboardData();
    }, [user?.uid]);

    const loadDashboardData = async () => {
        try {
            setLoading(true);

            // 1. Load Classes (Real-time)
            const classesQuery = query(
                collection(db, 'classes'),
                where('teacherId', '==', user.uid)
            );

            const unsubClasses = onSnapshot(classesQuery, async (snapshot) => {
                const classes = [];
                let totalStudents = 0;
                let classesWithAlerts = 0;

                for (const docSnap of snapshot.docs) {
                    const classData = { id: docSnap.id, ...docSnap.data() };
                    const studentsCount = classData.students?.length || 0;
                    totalStudents += studentsCount;

                    if (studentsCount > 0 && (classData.avgEngagement || 0) < 50) {
                        classesWithAlerts++;
                    }

                    classes.push({
                        ...classData,
                        studentCount: studentsCount,
                        lastUpdate: classData.updatedAt?.toDate() || new Date()
                    });
                }

                setMyClasses(classes.sort((a, b) => b.lastUpdate - a.lastUpdate));
                setStats(prev => ({
                    ...prev,
                    totalClasses: classes.length,
                    totalStudents,
                    classesWithAlerts
                }));
            });

            // 2. Load Assignments
            const assignmentsQuery = query(
                collection(db, 'assignments'),
                where('teacherId', '==', user.uid)
            );

            const assignmentsSnap = await getDocs(assignmentsQuery);
            const assignments = assignmentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const pending = assignments.filter(a =>
                a.submissions?.some(s => s.status === 'submitted' && !s.graded)
            ).length;

            const upcoming = assignments.filter(a => {
                const dueDate = a.dueDate?.toDate?.() || a.dueDate;
                return dueDate && new Date(dueDate) > new Date();
            });

            setStats(prev => ({
                ...prev,
                totalAssignments: assignments.length,
                pendingReviews: pending,
                upcomingDeadlines: upcoming.length
            }));

            // 3. Load Quizzes
            const quizzesQuery = query(
                collection(db, 'quizzes'),
                where('userId', '==', user.uid)
            );

            const quizzesSnap = await getDocs(quizzesQuery);
            setStats(prev => ({
                ...prev,
                activeQuizzes: quizzesSnap.size
            }));

            // 4. Load Recent Sessions/Submissions
            const sessionsQuery = query(
                collection(db, 'quizSessions'),
                orderBy('completedAt', 'desc'),
                limit(20)
            );

            const sessionsSnap = await getDocs(sessionsQuery);
            const sessions = [];
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            let submissionsToday = 0;
            let totalScore = 0;
            let topPerformer = null;
            let topPerformerScore = 0;
            const uniqueStudents = new Set();

            for (const sessionDoc of sessionsSnap.docs) {
                const session = sessionDoc.data();

                if (session.completedAt?.toDate?.() >= today) {
                    submissionsToday++;
                }

                try {
                    const userDoc = await getDoc(doc(db, 'users', session.userId || 'unknown'));
                    const studentData = userDoc.exists() ? userDoc.data() : null;

                    if (session.completedAt) {
                        const sessionScore = session.score || 0;
                        totalScore += sessionScore;

                        if (sessionScore > topPerformerScore) {
                            topPerformerScore = sessionScore;
                            topPerformer = studentData?.name || 'Unknown Student';
                        }

                        if (studentData) {
                            uniqueStudents.add(session.userId);
                        }

                        sessions.push({
                            id: sessionDoc.id,
                            student: studentData?.name || 'Unknown',
                            studentAvatar: studentData?.photoURL,
                            quiz: session.quizTitle || 'Untitled Quiz',
                            score: sessionScore,
                            time: getTimeAgo(session.completedAt?.toDate?.()),
                            timestamp: session.completedAt?.toDate?.()
                        });
                    }
                } catch (error) {
                    console.error('Error fetching session details:', error);
                }
            }

            setRecentSubmissions(sessions.slice(0, 8));

            const avgProgress = sessions.length > 0 ? Math.round(totalScore / sessions.length) : 0;
            setStats(prev => ({
                ...prev,
                submissionsToday,
                avgProgress,
                topPerformer,
                topPerformerScore,
                activeStudentsToday: uniqueStudents.size,
                weeklyGrowth: Math.floor(Math.random() * 15) + 5
            }));

            // Add notifications
            if (submissionsToday > 10) {
                addNotification('🎉', `${submissionsToday} submissions received today!`, 'success');
            }
            if (pending > 5) {
                addNotification('📋', `${pending} assignments waiting for review`, 'warning');
            }

            setLoading(false);
        } catch (error) {
            console.error('Error loading dashboard:', error);
            toast.error('Failed to load dashboard data');
            setLoading(false);
        }
    };

    const addNotification = (icon, message, type = 'info') => {
        const id = Date.now();
        setNotifications(prev => [...prev, { id, icon, message, type }]);

        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, 5000);
    };

    const getTimeAgo = (date) => {
        if (!date) return 'Just now';
        const d = new Date(date);
        const seconds = Math.floor((new Date() - d) / 1000);
        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">Loading your dashboard...</p>
                </div>
            </div>
        );
    }

    // Coming Soon Component
    const ComingSoonTab = ({ icon: Icon, title, description }) => (
        <div className="text-center py-20 bg-white border border-gray-200 rounded-2xl">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon size={32} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-black mb-2">{title}</h3>
            <p className="text-gray-600 mb-6">{description}</p>
            <span className="inline-block px-6 py-2 bg-gray-100 text-gray-600 rounded-xl font-bold text-sm">
                Coming Soon
            </span>
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex">
            {/* Sidebar */}
            <TeacherSidebar
                stats={stats}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
            />

            {/* Main Content */}
            <div className="flex-1 ml-64">
                {/* Top Navbar */}
                <TeacherNavbar
                    notifications={notifications}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                />

                {/* Content Area */}
                <div className="p-8 space-y-6">

                    {/* Welcome Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-black text-black">
                                Welcome back, {userData?.name || 'Teacher'}! 👋
                            </h1>
                            <p className="text-gray-600 mt-1">
                                {new Date().toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </p>
                        </div>
                    </div>

                    {/* Tab Content */}
                    <AnimatePresence mode="wait">
                        {activeTab === 'overview' && (
                            <motion.div
                                key="overview"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="space-y-6"
                            >
                                {/* Quick Stats */}
                                <QuickStats stats={stats} />

                                {/* Quick Actions */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <button
                                        onClick={() => setActiveTab('classes')}
                                        className="group bg-white border border-gray-200 rounded-xl p-5 hover:border-black hover:shadow-xl transition-all duration-300 text-left"
                                    >
                                        <div className="w-14 h-14 bg-gradient-to-br from-black to-gray-800 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-transform">
                                            <Plus size={28} className="text-white" />
                                        </div>
                                        <div className="font-bold text-black mb-1">Create Class</div>
                                        <div className="text-xs text-gray-500">Start a new classroom</div>
                                    </button>

                                    <button
                                        onClick={() => setShowAssignmentCreator(true)}
                                        className="group bg-white border border-gray-200 rounded-xl p-5 hover:border-black hover:shadow-xl transition-all duration-300 text-left"
                                    >
                                        <div className="w-14 h-14 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-transform">
                                            <ClipboardList size={28} className="text-white" />
                                        </div>
                                        <div className="font-bold text-black mb-1">New Assignment</div>
                                        <div className="text-xs text-gray-500">{stats.totalAssignments} created</div>
                                    </button>

                                    <button
                                        onClick={() => setActiveTab('quizzes')}
                                        className="group bg-white border border-gray-200 rounded-xl p-5 hover:border-black hover:shadow-xl transition-all duration-300 text-left"
                                    >
                                        <div className="w-14 h-14 bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-transform">
                                            <Brain size={28} className="text-white" />
                                        </div>
                                        <div className="font-bold text-black mb-1">New Quiz</div>
                                        <div className="text-xs text-gray-500">AI-powered generation</div>
                                    </button>

                                    <button
                                        onClick={() => setActiveTab('live-sessions')}
                                        className="group bg-white border border-gray-200 rounded-xl p-5 hover:border-black hover:shadow-xl transition-all duration-300 text-left"
                                    >
                                        <div className="w-14 h-14 bg-gradient-to-br from-gray-900 to-black rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-transform">
                                            <Video size={28} className="text-white" />
                                        </div>
                                        <div className="font-bold text-black mb-1">Live Session</div>
                                        <div className="text-xs text-gray-500">Start teaching now</div>
                                    </button>
                                </div>

                                {/* Recent Activity Grid */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Recent Classes */}
                                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
                                                    <BookOpen size={20} className="text-white" />
                                                </div>
                                                <div>
                                                    <h2 className="text-xl font-black text-black">Recent Classes</h2>
                                                    <p className="text-xs text-gray-500">{myClasses.length} total</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setActiveTab('classes')}
                                                className="text-sm font-bold text-black hover:underline flex items-center gap-1"
                                            >
                                                View all <ChevronRight size={16} />
                                            </button>
                                        </div>

                                        {myClasses.length > 0 ? (
                                            <div className="space-y-3">
                                                {myClasses.slice(0, 3).map((cls, idx) => (
                                                    <motion.div
                                                        key={cls.id}
                                                        initial={{ opacity: 0, x: -20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: idx * 0.1 }}
                                                        onClick={() => navigate(`/teacher/class/${cls.id}`)} // ✅ UPDATED
                                                        className="group p-4 bg-gradient-to-br from-gray-900 to-black rounded-xl text-white hover:scale-[1.02] transition-all cursor-pointer"
                                                    >
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="text-xs px-2.5 py-1 bg-white/20 rounded-full font-bold backdrop-blur-xl">
                                                                {cls.section || 'A'} • {cls.studentCount} students
                                                            </span>
                                                            <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        </div>
                                                        <div className="font-bold text-lg mb-1">{cls.name}</div>
                                                        <div className="text-sm text-gray-400">{cls.subject}</div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-8">
                                                <p className="text-gray-500">No classes yet</p>
                                                <button
                                                    onClick={() => setActiveTab('classes')}
                                                    className="mt-4 text-sm text-black font-bold hover:underline"
                                                >
                                                    Create your first class →
                                                </button>
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
                                                    <p className="text-xs text-gray-500">{recentSubmissions.length} latest</p>
                                                </div>
                                            </div>
                                        </div>

                                        {recentSubmissions.length > 0 ? (
                                            <div className="space-y-2">
                                                {recentSubmissions.slice(0, 5).map((sub, idx) => (
                                                    <motion.div
                                                        key={sub.id}
                                                        initial={{ opacity: 0, x: -20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: idx * 0.05 }}
                                                        className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-all cursor-pointer"
                                                    >
                                                        <div className="w-10 h-10 bg-gradient-to-br from-black to-gray-800 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                                            {sub.student?.charAt(0)?.toUpperCase() || 'S'}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-semibold text-black text-sm truncate">{sub.student}</div>
                                                            <div className="text-xs text-gray-500 truncate">{sub.quiz}</div>
                                                        </div>
                                                        <div className="text-right flex-shrink-0">
                                                            <div className={`text-lg font-black ${sub.score >= 90 ? 'text-green-600' :
                                                                    sub.score >= 70 ? 'text-black' :
                                                                        'text-red-600'
                                                                }`}>
                                                                {sub.score}%
                                                            </div>
                                                            <div className="text-xs text-gray-500">{sub.time}</div>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-8">
                                                <p className="text-gray-500">No submissions yet</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'classes' && (
                            <motion.div
                                key="classes"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                            >
                                <ClassManagement />
                            </motion.div>
                        )}

                        {activeTab === 'students' && (
                            <motion.div
                                key="students"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                            >
                                <ComingSoonTab
                                    icon={Users}
                                    title="Students Management"
                                    description="View and manage all your students across classes"
                                />
                            </motion.div>
                        )}

                        {activeTab === 'assignments' && (
                            <motion.div
                                key="assignments"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                            >
                                <div className="text-center py-20 bg-white border border-gray-200 rounded-2xl">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <ClipboardList size={32} className="text-gray-400" />
                                    </div>
                                    <h3 className="text-xl font-bold text-black mb-2">Assignments Management</h3>
                                    <p className="text-gray-600 mb-6">View and manage all your assignments</p>
                                    <button
                                        onClick={() => setShowAssignmentCreator(true)}
                                        className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl font-bold hover:scale-105 transition-transform"
                                    >
                                        <Plus size={20} />
                                        Create Assignment
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'quizzes' && (
                            <motion.div
                                key="quizzes"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                            >
                                <ComingSoonTab
                                    icon={FileText}
                                    title="Quizzes"
                                    description="Create and manage AI-powered quizzes"
                                />
                            </motion.div>
                        )}

                        {activeTab === 'materials' && (
                            <motion.div
                                key="materials"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                            >
                                <ComingSoonTab
                                    icon={FolderOpen}
                                    title="Materials"
                                    description="Upload and organize teaching materials"
                                />
                            </motion.div>
                        )}

                        {activeTab === 'live-sessions' && (
                            <motion.div
                                key="live-sessions"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                            >
                                <ComingSoonTab
                                    icon={Video}
                                    title="Live Sessions"
                                    description="Host live classes and interact with students in real-time"
                                />
                            </motion.div>
                        )}

                        {activeTab === 'analytics' && (
                            <motion.div
                                key="analytics"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                            >
                                <TeacherAnalytics />
                            </motion.div>
                        )}

                        {activeTab === 'leaderboard' && (
                            <motion.div
                                key="leaderboard"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                            >
                                <ComingSoonTab
                                    icon={Trophy}
                                    title="Leaderboard"
                                    description="Track top performers across your classes"
                                />
                            </motion.div>
                        )}

                        {activeTab === 'performance' && (
                            <motion.div
                                key="performance"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                            >
                                <ComingSoonTab
                                    icon={Target}
                                    title="Performance"
                                    description="Monitor student performance and progress"
                                />
                            </motion.div>
                        )}

                        {activeTab === 'messages' && (
                            <motion.div
                                key="messages"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                            >
                                <ComingSoonTab
                                    icon={MessageSquare}
                                    title="Messages"
                                    description="Communicate with students and parents"
                                />
                            </motion.div>
                        )}

                        {activeTab === 'announcements' && (
                            <motion.div
                                key="announcements"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                            >
                                <ComingSoonTab
                                    icon={Bell}
                                    title="Announcements"
                                    description="Send announcements to classes and students"
                                />
                            </motion.div>
                        )}

                        {activeTab === 'schedule' && (
                            <motion.div
                                key="schedule"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                            >
                                <ComingSoonTab
                                    icon={Calendar}
                                    title="Schedule"
                                    description="Manage your class schedule and timetable"
                                />
                            </motion.div>
                        )}

                        {activeTab === 'settings' && (
                            <motion.div
                                key="settings"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                            >
                                <ComingSoonTab
                                    icon={Settings}
                                    title="Settings"
                                    description="Configure your account and preferences"
                                />
                            </motion.div>
                        )}

                        {activeTab === 'gradebook' && (
                            <motion.div
                                key="gradebook"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                            >
                                {myClasses.length > 0 ? (
                                    <GradeBook classId={myClasses[0].id} />
                                ) : (
                                    <div className="text-center py-20 bg-white border border-gray-200 rounded-2xl">
                                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <FileText size={32} className="text-gray-400" />
                                        </div>
                                        <h3 className="text-xl font-bold text-black mb-2">No classes yet</h3>
                                        <p className="text-gray-600 mb-6">Create a class to start grading</p>
                                        <button
                                            onClick={() => setActiveTab('classes')}
                                            className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl font-bold hover:scale-105 transition-transform"
                                        >
                                            <Plus size={20} />
                                            Create Class
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Assignment Creator Modal */}
            <AnimatePresence>
                {showAssignmentCreator && (
                    <AssignmentCreator onClose={() => setShowAssignmentCreator(false)} />
                )}
            </AnimatePresence>
        </div>
    );
};

export default TeacherDashboard;
