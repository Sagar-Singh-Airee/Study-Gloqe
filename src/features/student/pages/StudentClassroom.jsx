// src/features/student/pages/StudentClassroom.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, BookOpen, FileText, Video, Trophy,
    Bell, BarChart3, CheckCircle2, Clock, AlertCircle,
    Users, Award, Target, Download, MessageSquare,
    Play, Star, Crown, Zap, TrendingUp, Calendar
} from 'lucide-react';
import { useAuth } from '@auth/contexts/AuthContext';
import { doc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@shared/config/firebase';
import toast from 'react-hot-toast';

// Import student classroom tabs
import StudentOverview from '@features/student/components/classroom/StudentOverview';
import StudentAssignments from '@features/student/components/classroom/StudentAssignments';
import StudentMaterials from '@features/student/components/classroom/StudentMaterials';
import StudentQuizzes from '@features/student/components/classroom/StudentQuizzes';
import StudentGrades from '@features/student/components/classroom/StudentGrades';
import StudentAnnouncements from '@features/student/components/classroom/StudentAnnouncements';
import StudentLiveSessions from '@features/student/components/classroom/StudentLive';

const StudentClassroom = () => {
    const { classId } = useParams();
    const navigate = useNavigate();
    const { user, userData } = useAuth();

    const [classData, setClassData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    // Stats state
    const [stats, setStats] = useState({
        totalAssignments: 0,
        completedAssignments: 0,
        pendingAssignments: 0,
        avgGrade: 0,
        classRank: 0,
        totalStudents: 0,
        xp: userData?.xp || 0,
        upcomingDeadlines: 0
    });

    // Real-time class data listener
    useEffect(() => {
        if (!classId || !user?.uid) return;

        const classRef = doc(db, 'classes', classId);
        const unsubscribe = onSnapshot(
            classRef,
            (docSnap) => {
                if (!docSnap.exists()) {
                    toast.error('Class not found');
                    navigate('/dashboard');
                    return;
                }

                const data = docSnap.data();

                // Check if user is enrolled
                if (!data.students?.includes(user.uid)) {
                    toast.error('You are not enrolled in this class');
                    navigate('/dashboard');
                    return;
                }

                setClassData({ id: docSnap.id, ...data });
                setStats(prev => ({
                    ...prev,
                    totalStudents: data.students?.length || 0
                }));
                setLoading(false);
            },
            (error) => {
                console.error('Error loading classroom:', error);
                toast.error('Failed to load classroom');
                navigate('/dashboard');
            }
        );

        return () => unsubscribe();
    }, [classId, user?.uid, navigate]);

    // Load assignments stats
    useEffect(() => {
        if (!classId || !user?.uid) return;

        const loadAssignmentStats = async () => {
            try {
                const assignmentsQuery = query(
                    collection(db, 'assignments'),
                    where('classId', '==', classId)
                );

                const snapshot = await getDocs(assignmentsQuery);
                const total = snapshot.size;

                // Count completed vs pending
                let completed = 0;
                let upcoming = 0;

                for (const doc of snapshot.docs) {
                    const assignment = doc.data();
                    const dueDate = assignment.dueDate?.toDate?.() || new Date(assignment.dueDate);

                    // Check if student submitted
                    if (assignment.submissions?.some(s => s.studentId === user.uid)) {
                        completed++;
                    }

                    // Check upcoming deadlines (next 7 days)
                    const now = new Date();
                    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                    if (dueDate > now && dueDate < sevenDaysLater) {
                        upcoming++;
                    }
                }

                setStats(prev => ({
                    ...prev,
                    totalAssignments: total,
                    completedAssignments: completed,
                    pendingAssignments: total - completed,
                    upcomingDeadlines: upcoming
                }));
            } catch (error) {
                console.error('Error loading assignment stats:', error);
            }
        };

        loadAssignmentStats();
    }, [classId, user?.uid]);

    // Navigation tabs configuration
    const tabs = [
        {
            id: 'overview',
            label: 'Overview',
            icon: BookOpen,
            color: 'from-blue-500 to-cyan-500'
        },
        {
            id: 'assignments',
            label: 'Assignments',
            icon: FileText,
            badge: stats.pendingAssignments,
            color: 'from-purple-500 to-pink-500'
        },
        {
            id: 'quizzes',
            label: 'Quizzes',
            icon: Trophy,
            color: 'from-yellow-500 to-orange-500'
        },
        {
            id: 'materials',
            label: 'Materials',
            icon: Download,
            color: 'from-green-500 to-teal-500'
        },
        {
            id: 'grades',
            label: 'Grades',
            icon: BarChart3,
            color: 'from-indigo-500 to-purple-500'
        },
        {
            id: 'live',
            label: 'Live Classes',
            icon: Video,
            color: 'from-red-500 to-pink-500'
        },
        {
            id: 'announcements',
            label: 'Announcements',
            icon: Bell,
            color: 'from-teal-500 to-blue-500'
        }
    ];

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center"
                >
                    <div className="w-20 h-20 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
                    <p className="text-xl font-bold text-gray-700 mb-2">Loading Classroom...</p>
                    <p className="text-sm text-gray-500">Preparing your learning environment</p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm backdrop-blur-lg bg-white/90">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    {/* Top Bar: Back Button + Quick Actions */}
                    <div className="flex items-center justify-between mb-4">
                        {/* Back Button */}
                        <motion.button
                            whileHover={{ x: -4 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => navigate('/dashboard')}
                            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all font-medium"
                        >
                            <ArrowLeft size={20} />
                            <span>Back to Dashboard</span>
                        </motion.button>

                        {/* Quick Stats Pills */}
                        <div className="flex items-center gap-3">
                            {/* XP Badge */}
                            <motion.div
                                whileHover={{ scale: 1.05 }}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-300 rounded-xl shadow-sm"
                            >
                                <Zap size={18} className="text-yellow-600" fill="currentColor" />
                                <div className="text-right">
                                    <p className="text-xs text-yellow-600 font-bold">Total XP</p>
                                    <p className="text-sm font-black text-yellow-700">{stats.xp.toLocaleString()}</p>
                                </div>
                            </motion.div>

                            {/* Rank Badge */}
                            <motion.div
                                whileHover={{ scale: 1.05 }}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-300 rounded-xl shadow-sm"
                            >
                                <Crown size={18} className="text-purple-600" />
                                <div className="text-right">
                                    <p className="text-xs text-purple-600 font-bold">Class Rank</p>
                                    <p className="text-sm font-black text-purple-700">#{stats.classRank || '—'}</p>
                                </div>
                            </motion.div>

                            {/* Completion Rate */}
                            <motion.div
                                whileHover={{ scale: 1.05 }}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-50 to-teal-50 border border-green-300 rounded-xl shadow-sm"
                            >
                                <Target size={18} className="text-green-600" />
                                <div className="text-right">
                                    <p className="text-xs text-green-600 font-bold">Completed</p>
                                    <p className="text-sm font-black text-green-700">
                                        {stats.totalAssignments > 0
                                            ? Math.round((stats.completedAssignments / stats.totalAssignments) * 100)
                                            : 0}%
                                    </p>
                                </div>
                            </motion.div>
                        </div>
                    </div>

                    {/* Class Header Info */}
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            {/* Class Icon */}
                            <motion.div
                                whileHover={{ rotate: 5, scale: 1.05 }}
                                className="w-20 h-20 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-xl"
                            >
                                <BookOpen size={40} className="text-white" strokeWidth={2.5} />
                            </motion.div>

                            {/* Class Details */}
                            <div>
                                <h1 className="text-3xl font-black text-gray-900 mb-1">
                                    {classData?.name}
                                </h1>
                                <div className="flex items-center gap-3 text-sm text-gray-600">
                                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg font-bold">
                                        {classData?.subject}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                                        Section {classData?.section}
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <Users size={14} />
                                        {stats.totalStudents} students
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Teacher Info Card */}
                        <div className="text-right bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl p-4 shadow-sm">
                            <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Instructor</p>
                            <p className="text-base font-black text-gray-900">{classData?.teacherName}</p>
                            <p className="text-xs text-gray-600 mt-1">📧 Available for questions</p>
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex items-center gap-2 mt-6 overflow-x-auto pb-2 scrollbar-hide">
                        {tabs.map((tab) => {
                            const isActive = activeTab === tab.id;
                            return (
                                <motion.button
                                    key={tab.id}
                                    whileHover={{ y: -2 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${isActive
                                        ? `bg-gradient-to-r ${tab.color} text-white shadow-lg`
                                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                                        }`}
                                >
                                    <tab.icon size={18} strokeWidth={2.5} />
                                    <span>{tab.label}</span>

                                    {/* Badge */}
                                    {tab.badge > 0 && (
                                        <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-black ${isActive
                                            ? 'bg-white/20 text-white'
                                            : 'bg-red-100 text-red-600'
                                            }`}>
                                            {tab.badge}
                                        </span>
                                    )}
                                </motion.button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="max-w-7xl mx-auto px-6 py-8">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                    >
                        {activeTab === 'overview' && (
                            <StudentOverview
                                classId={classId}
                                classData={classData}
                                stats={stats}
                                onNavigate={setActiveTab}
                            />
                        )}
                        {activeTab === 'assignments' && (
                            <StudentAssignments
                                classId={classId}
                                classData={classData}
                            />
                        )}
                        {activeTab === 'quizzes' && (
                            <StudentQuizzes
                                classId={classId}
                                classData={classData}
                            />
                        )}
                        {activeTab === 'materials' && (
                            <StudentMaterials
                                classId={classId}
                                classData={classData}
                            />
                        )}
                        {activeTab === 'grades' && (
                            <StudentGrades
                                classId={classId}
                                classData={classData}
                            />
                        )}
                        {activeTab === 'live' && (
                            <StudentLiveSessions
                                classId={classId}
                                classData={classData}
                            />
                        )}
                        {activeTab === 'announcements' && (
                            <StudentAnnouncements
                                classId={classId}
                                classData={classData}
                            />
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};

export default StudentClassroom;
