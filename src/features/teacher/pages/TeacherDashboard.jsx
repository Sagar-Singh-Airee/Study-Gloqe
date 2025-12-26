// src/pages/teacher/TeacherDashboard.jsx
// ✨ PRODUCTION-READY - ROYAL BLUE THEME - NO MEMORY LEAKS - v2.0

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, BookOpen, Users, FileText, Award, TrendingUp,
    Clock, CheckCircle2, AlertCircle, Activity, Target,
    Video, ClipboardList, Brain, Calendar, ChevronRight,
    Bell, MessageSquare, BarChart3, Trophy, FolderOpen,
    Settings, User
} from 'lucide-react';
import { useAuth } from '@auth/contexts/AuthContext';
import { db } from '@shared/config/firebase';
import {
    collection, query, where, getDocs, onSnapshot,
    orderBy, limit, doc, getDoc
} from 'firebase/firestore';
import toast from 'react-hot-toast';

// Import components
import TeacherNavbar from '@teacher/components/dashboard/TeacherNavbar';
import TeacherSidebar from '@teacher/components/dashboard/TeacherSidebar';
import QuickStats from '@teacher/components/dashboard/QuickStats';
import ClassManagement from '@teacher/components/dashboard/ClassManagement';
import AssignmentCreator from '@teacher/components/dashboard/AssignmentCreator';
import GradeBook from '@teacher/components/dashboard/GradeBook';
import TeacherAnalytics from '@teacher/components/dashboard/TeacherAnalytics';
import StudentList from '@teacher/components/dashboard/StudentList';
import GlobalStudentList from '@teacher/components/dashboard/GlobalStudentList';
import TeacherProfile from '@teacher/components/TeacherProfile';
import AssignmentList from '@teacher/components/dashboard/AssignmentList';
import QuizList from '@teacher/components/dashboard/QuizList';
import MaterialsList from '@teacher/components/dashboard/MaterialsList';
import CreateClassModal from '@teacher/components/dashboard/CreateClassModal';
import Announcements from '@teacher/components/dashboard/Announcements';
import LiveSessionList from '@teacher/components/dashboard/LiveSessionList';
import LiveSessionCreator from '@teacher/components/dashboard/LiveSessionCreator';

const TeacherDashboard = () => {
    const { user, userData } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [notifications, setNotifications] = useState([]);
    const [showAssignmentCreator, setShowAssignmentCreator] = useState(false);
    const [showLiveSessionCreator, setShowLiveSessionCreator] = useState(false);
    const [selectedGradeClassId, setSelectedGradeClassId] = useState(null);

    // Sync activeTab and actions with URL query param
    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        const tab = searchParams.get('tab');
        const action = searchParams.get('action');

        if (tab && ['overview', 'classes', 'students', 'assignments', 'quizzes', 'materials', 'live-sessions', 'analytics', 'leaderboard', 'performance', 'messages', 'announcements', 'schedule', 'profile', 'settings', 'gradebook'].includes(tab)) {
            setActiveTab(tab);
        }

        if (action === 'create' && (tab === 'assignments' || searchParams.get('tab') === 'assignments')) {
            setShowAssignmentCreator(true);
        }

        if (action === 'create' && (tab === 'live-sessions' || searchParams.get('tab') === 'live-sessions')) {
            setShowLiveSessionCreator(true);
        }

        if (action === 'create' && (tab === 'classes' || searchParams.get('tab') === 'classes')) {
            setActiveTab('classes');
        }
    }, [window.location.search]);

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

    // ✅ FIX 1: Proper cleanup with useEffect
    useEffect(() => {
        if (!user?.uid) {
            navigate('/auth');
            return;
        }

        // Store unsubscribe functions
        let unsubscribers = [];

        const loadDashboardData = async () => {
            try {
                setLoading(true);

                // 1. Load Classes (Real-time) - ✅ FIXED: Store unsubscribe
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
                    if (classes.length > 0 && !selectedGradeClassId) {
                        setSelectedGradeClassId(classes[0].id);
                    }
                    setStats(prev => ({
                        ...prev,
                        totalClasses: classes.length,
                        totalStudents,
                        classesWithAlerts
                    }));
                });

                // ✅ Store unsubscribe function
                unsubscribers.push(unsubClasses);

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

                // 4. Load Recent Sessions/Submissions - ✅ OPTIMIZED
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

                // ✅ FIX 2: Batch fetch user data instead of one-by-one
                const userIds = [...new Set(sessionsSnap.docs.map(doc => doc.data().userId).filter(Boolean))];
                const userDataCache = {};

                // Fetch all users at once
                await Promise.all(
                    userIds.map(async (userId) => {
                        try {
                            const userDoc = await getDoc(doc(db, 'users', userId));
                            if (userDoc.exists()) {
                                userDataCache[userId] = userDoc.data();
                            }
                        } catch (error) {
                            console.warn(`Failed to fetch user ${userId}:`, error);
                        }
                    })
                );

                // Process sessions with cached user data
                for (const sessionDoc of sessionsSnap.docs) {
                    const session = sessionDoc.data();

                    if (session.completedAt?.toDate?.() >= today) {
                        submissionsToday++;
                    }

                    const studentData = userDataCache[session.userId];

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
                }

                setRecentSubmissions(sessions.slice(0, 8));

                const avgProgress = sessions.length > 0 ? Math.round(totalScore / sessions.length) : 0;

                // ✅ FIX 3: Calculate real weekly growth (removed fake Math.random)
                const oneWeekAgo = new Date();
                oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                const weeklySubmissions = sessions.filter(s => s.timestamp >= oneWeekAgo).length;
                const previousWeekSubmissions = sessions.length - weeklySubmissions;
                const weeklyGrowth = previousWeekSubmissions > 0
                    ? Math.round(((weeklySubmissions - previousWeekSubmissions) / previousWeekSubmissions) * 100)
                    : weeklySubmissions > 0 ? 100 : 0;

                setStats(prev => ({
                    ...prev,
                    submissionsToday,
                    avgProgress,
                    topPerformer,
                    topPerformerScore,
                    activeStudentsToday: uniqueStudents.size,
                    weeklyGrowth: Math.max(0, weeklyGrowth) // Ensure positive
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

        loadDashboardData();

        // ✅ CLEANUP: Unsubscribe from all listeners
        return () => {
            unsubscribers.forEach(unsub => {
                if (typeof unsub === 'function') {
                    unsub();
                }
            });
        };
    }, [user?.uid, navigate]);

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
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-blue-700 font-medium">Loading your dashboard...</p>
                </div>
            </div>
        );
    }

    // Coming Soon Component - ✅ ROYAL BLUE THEME
    const ComingSoonTab = ({ icon: Icon, title, description }) => (
        <div className="text-center py-20 bg-white border border-blue-100 rounded-2xl shadow-sm">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon size={32} className="text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
            <p className="text-gray-600 mb-6">{description}</p>
            <span className="inline-block px-6 py-2 bg-gradient-to-r from-blue-100 to-teal-100 text-blue-700 rounded-xl font-bold text-sm">
                Coming Soon
            </span>
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50 flex">
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
                    onProfileClick={() => {
                        console.log('Profile clicked - switching to profile tab');
                        setActiveTab('profile');
                    }}
                />

                {/* Content Area */}
                <div className="p-8 space-y-6">

                    {/* Welcome Header - Hide on profile page */}
                    {activeTab !== 'profile' && (
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-3xl font-black text-gray-900">
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
                    )}

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

                                {/* Quick Actions - ✅ ROYAL BLUE THEME */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <button
                                        onClick={() => setActiveTab('classes')}
                                        className="group bg-white border border-blue-100 rounded-xl p-5 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-100 transition-all duration-300 text-left"
                                    >
                                        <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-transform shadow-lg shadow-blue-200">
                                            <Plus size={28} className="text-white" />
                                        </div>
                                        <div className="font-bold text-gray-900 mb-1">Create Class</div>
                                        <div className="text-xs text-gray-500">Start a new classroom</div>
                                    </button>

                                    <button
                                        onClick={() => setShowAssignmentCreator(true)}
                                        className="group bg-white border border-purple-100 rounded-xl p-5 hover:border-purple-300 hover:shadow-xl hover:shadow-purple-100 transition-all duration-300 text-left"
                                    >
                                        <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-transform shadow-lg shadow-purple-200">
                                            <ClipboardList size={28} className="text-white" />
                                        </div>
                                        <div className="font-bold text-gray-900 mb-1">New Assignment</div>
                                        <div className="text-xs text-gray-500">{stats.totalAssignments} created</div>
                                    </button>

                                    <button
                                        onClick={() => setActiveTab('quizzes')}
                                        className="group bg-white border border-teal-100 rounded-xl p-5 hover:border-teal-300 hover:shadow-xl hover:shadow-teal-100 transition-all duration-300 text-left"
                                    >
                                        <div className="w-14 h-14 bg-gradient-to-br from-teal-600 to-teal-700 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-transform shadow-lg shadow-teal-200">
                                            <Brain size={28} className="text-white" />
                                        </div>
                                        <div className="font-bold text-gray-900 mb-1">New Quiz</div>
                                        <div className="text-xs text-gray-500">AI-powered generation</div>
                                    </button>

                                    <button
                                        onClick={() => setActiveTab('live-sessions')}
                                        className="group bg-white border border-indigo-100 rounded-xl p-5 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-100 transition-all duration-300 text-left"
                                    >
                                        <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-transform shadow-lg shadow-indigo-200">
                                            <Video size={28} className="text-white" />
                                        </div>
                                        <div className="font-bold text-gray-900 mb-1">Live Session</div>
                                        <div className="text-xs text-gray-500">Start teaching now</div>
                                    </button>
                                </div>

                                {/* Recent Activity Grid - ✅ ROYAL BLUE THEME */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Recent Classes */}
                                    <div className="bg-white border border-blue-100 rounded-2xl p-6 shadow-sm hover:shadow-lg hover:shadow-blue-100 transition-all">
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-md">
                                                    <BookOpen size={20} className="text-white" />
                                                </div>
                                                <div>
                                                    <h2 className="text-xl font-black text-gray-900">Recent Classes</h2>
                                                    <p className="text-xs text-gray-500">{myClasses.length} total</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setActiveTab('classes')}
                                                className="text-sm font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
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
                                                        onClick={() => navigate(`/teacher/class/${cls.id}`)}
                                                        className="group p-4 bg-gradient-to-br from-blue-600 to-teal-600 rounded-xl text-white hover:scale-[1.02] hover:shadow-lg hover:shadow-blue-200 transition-all cursor-pointer"
                                                    >
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="text-xs px-2.5 py-1 bg-white/20 rounded-full font-bold backdrop-blur-xl">
                                                                {cls.section || 'A'} • {cls.studentCount} students
                                                            </span>
                                                            <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        </div>
                                                        <div className="font-bold text-lg mb-1">{cls.name}</div>
                                                        <div className="text-sm text-blue-100">{cls.subject}</div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-8">
                                                <p className="text-gray-500">No classes yet</p>
                                                <button
                                                    onClick={() => setActiveTab('classes')}
                                                    className="mt-4 text-sm text-blue-600 font-bold hover:underline"
                                                >
                                                    Create your first class →
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Recent Submissions */}
                                    <div className="bg-white border border-teal-100 rounded-2xl p-6 shadow-sm hover:shadow-lg hover:shadow-teal-100 transition-all">
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gradient-to-br from-teal-600 to-teal-700 rounded-xl flex items-center justify-center shadow-md">
                                                    <CheckCircle2 size={20} className="text-white" />
                                                </div>
                                                <div>
                                                    <h2 className="text-xl font-black text-gray-900">Recent Submissions</h2>
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
                                                        className="flex items-center gap-4 p-3 rounded-xl hover:bg-teal-50 transition-all cursor-pointer"
                                                    >
                                                        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-teal-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-md">
                                                            {sub.student?.charAt(0)?.toUpperCase() || 'S'}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-semibold text-gray-900 text-sm truncate">{sub.student}</div>
                                                            <div className="text-xs text-gray-500 truncate">{sub.quiz}</div>
                                                        </div>
                                                        <div className="text-right flex-shrink-0">
                                                            <div className={`text-lg font-black ${sub.score >= 90 ? 'text-green-600' :
                                                                sub.score >= 70 ? 'text-blue-600' :
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
                                <ClassManagement triggerCreate={new URLSearchParams(window.location.search).get('action') === 'create'} />
                            </motion.div>
                        )}

                        {activeTab === 'students' && (
                            <motion.div
                                key="students"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                            >
                                <GlobalStudentList classes={myClasses} />
                            </motion.div>
                        )}

                        {activeTab === 'assignments' && (
                            <motion.div
                                key="assignments"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                            >
                                <AssignmentList onCreateNew={() => setShowAssignmentCreator(true)} />
                            </motion.div>
                        )}

                        {activeTab === 'quizzes' && (
                            <motion.div
                                key="quizzes"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                            >
                                <QuizList onCreateNew={() => navigate('/upload')} />
                            </motion.div>
                        )}

                        {activeTab === 'materials' && (
                            <motion.div
                                key="materials"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                            >
                                <MaterialsList />
                            </motion.div>
                        )}

                        {activeTab === 'live-sessions' && (
                            <motion.div
                                key="live-sessions"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                            >
                                <LiveSessionList
                                    onCreateNew={() => setShowLiveSessionCreator(true)}
                                    classes={myClasses}
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
                                <Announcements classes={myClasses} />
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

                        {/* Profile Tab */}
                        {activeTab === 'profile' && (
                            <motion.div
                                key="profile"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                            >
                                <TeacherProfile />
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
                                className="space-y-6"
                            >
                                {myClasses.length > 0 ? (
                                    <>
                                        <div className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
                                            <span className="text-sm font-bold text-gray-500">Select Class:</span>
                                            <div className="flex gap-2">
                                                {myClasses.map(cls => (
                                                    <button
                                                        key={cls.id}
                                                        onClick={() => setSelectedGradeClassId(cls.id)}
                                                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${selectedGradeClassId === cls.id
                                                            ? 'bg-black text-white shadow-lg'
                                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                            }`}
                                                    >
                                                        {cls.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <GradeBook classId={selectedGradeClassId || myClasses[0].id} />
                                    </>
                                ) : (
                                    <div className="text-center py-20 bg-white border border-blue-100 rounded-2xl shadow-sm">
                                        <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <FileText size={32} className="text-blue-600" />
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-900 mb-2">No classes yet</h3>
                                        <p className="text-gray-600 mb-6">Create a class to start grading</p>
                                        <button
                                            onClick={() => setActiveTab('classes')}
                                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-xl font-bold hover:scale-105 hover:shadow-lg hover:shadow-blue-200 transition-all"
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

            {/* Live Session Creator Modal */}
            <AnimatePresence>
                {showLiveSessionCreator && (
                    <LiveSessionCreator
                        onClose={() => setShowLiveSessionCreator(false)}
                        classes={myClasses}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default TeacherDashboard;
