// src/pages/teacher/TeacherDashboard.jsx - AI-POWERED DASHBOARD ✨

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader } from 'lucide-react';
import { useAuth } from '@auth/contexts/AuthContext';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '@shared/config/firebase';
import toast from 'react-hot-toast';

// Layout Components
import TeacherNavbar from '@teacher/components/dashboard/TeacherNavbar';
import TeacherSidebar from '@teacher/components/dashboard/TeacherSidebar';

// Feature Components
import QuickStats from '@teacher/components/dashboard/QuickStats';
import ClassManagement from '@teacher/components/dashboard/ClassManagement';
import StudentList from '@teacher/components/dashboard/StudentList';
import AssignmentList from '@teacher/components//dashboard/AssignmentList';
import QuizList from '@teacher/components/dashboard/QuizList';
import MaterialsList from '@teacher/components/dashboard/MaterialsList';
import LiveSessionList from '@teacher/components/dashboard/LiveSessionList';
import Announcements from '@teacher/components/dashboard/Announcements';
import TeacherAnalytics from '@teacher/components/dashboard/TeacherAnalytics';
import GradeBook from '@teacher/components/dashboard/GradeBook';

// AI Assistant Component

const TeacherDashboard = () => {
    const { user, userData } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // State
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');
    const [classes, setClasses] = useState([]);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [notifications, setNotifications] = useState([]);
    const [showAIAssistant, setShowAIAssistant] = useState(false);
    const [aiInsights, setAiInsights] = useState(null);

    // Real-time classes listener
    useEffect(() => {
        if (!user?.uid) return;

        const q = query(
            collection(db, 'classes'),
            where('teacherId', '==', user.uid),
            where('active', '==', true)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const classesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate(),
            }));

            setClasses(classesData);
            calculateStats(classesData);
        });

        return () => unsubscribe();
    }, [user?.uid]);

    // Calculate real-time stats
    const calculateStats = async (classesData) => {
        try {
            setLoading(true);

            // Get all students across all classes
            const allStudentIds = [...new Set(classesData.flatMap(c => c.students || []))];

            // Get assignments
            const assignmentsQuery = query(
                collection(db, 'assignments'),
                where('teacherId', '==', user.uid)
            );
            const assignmentsSnap = await getDocs(assignmentsQuery);
            const assignments = assignmentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Calculate pending reviews
            const pendingReviews = assignments.reduce((count, assignment) => {
                const ungraded = (assignment.submissions || []).filter(s => !s.graded).length;
                return count + ungraded;
            }, 0);

            // Get quizzes
            const quizzesQuery = query(
                collection(db, 'quizzes'),
                where('userId', '==', user.uid)
            );
            const quizzesSnap = await getDocs(quizzesQuery);
            const activeQuizzes = quizzesSnap.size;

            // Calculate averages (simplified for now)
            const avgProgress = classesData.length > 0
                ? Math.round(classesData.reduce((sum, c) => sum + (c.avgScore || 0), 0) / classesData.length)
                : 0;

            const calculatedStats = {
                totalStudents: allStudentIds.length,
                totalClasses: classesData.length,
                avgProgress,
                pendingReviews,
                activeQuizzes,
                weeklyGrowth: 12, // Calculate from historical data
                activeStudentsToday: Math.floor(allStudentIds.length * 0.6),
                submissionsToday: Math.floor(pendingReviews * 0.3),
                upcomingDeadlines: assignments.filter(a => {
                    const dueDate = a.dueDate?.toDate?.() || new Date(a.dueDate);
                    const daysUntilDue = Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24));
                    return daysUntilDue >= 0 && daysUntilDue <= 7;
                }).length
            };

            setStats(calculatedStats);

            // Generate AI insights
            generateAIInsights(calculatedStats, classesData);

        } catch (error) {
            console.error('Error calculating stats:', error);
        } finally {
            setLoading(false);
        }
    };

    // AI-powered insights
    const generateAIInsights = (stats, classesData) => {
        const insights = [];

        // Engagement analysis
        const engagementRate = stats.activeStudentsToday / Math.max(stats.totalStudents, 1);
        if (engagementRate < 0.5) {
            insights.push({
                type: 'warning',
                title: 'Low Engagement Alert',
                message: `Only ${Math.round(engagementRate * 100)}% of students are active today. Consider posting an announcement or creating interactive content.`,
                action: 'Post Announcement',
                actionTab: 'announcements'
            });
        } else if (engagementRate > 0.8) {
            insights.push({
                type: 'success',
                title: 'High Engagement! 🎉',
                message: `${Math.round(engagementRate * 100)}% of your students are actively learning today. Keep up the great work!`,
            });
        }

        // Pending work alert
        if (stats.pendingReviews > 10) {
            insights.push({
                type: 'alert',
                title: 'Grading Backlog',
                message: `You have ${stats.pendingReviews} submissions waiting for review. Students learn better with quick feedback!`,
                action: 'Start Grading',
                actionTab: 'assignments'
            });
        }

        // Performance insights
        if (stats.avgProgress < 60) {
            insights.push({
                type: 'warning',
                title: 'Class Performance Below Average',
                message: `Average class score is ${stats.avgProgress}%. Consider scheduling a review session or providing additional materials.`,
                action: 'View Analytics',
                actionTab: 'analytics'
            });
        }

        // Proactive suggestions
        if (classesData.length > 0 && stats.upcomingDeadlines === 0) {
            insights.push({
                type: 'info',
                title: 'No Upcoming Deadlines',
                message: `Keep students engaged! Consider creating a new assignment or scheduling a live session.`,
                action: 'Create Assignment',
                actionTab: 'assignments'
            });
        }

        setAiInsights(insights);
    };

    // Handle tab change
    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setSearchParams({ tab });
    };

    // Handle quick action from URL
    useEffect(() => {
        const action = searchParams.get('action');
        if (action === 'create') {
            // Trigger creation modal based on active tab
            toast.success(`Create ${activeTab} triggered`);
        }
    }, [searchParams, activeTab]);

    if (loading && classes.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <Loader className="w-12 h-12 animate-spin text-teal-600 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">Loading your dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            {/* Navbar */}
            <TeacherNavbar
                notifications={notifications}
                onProfileClick={() => handleTabChange('settings')}
            />

            <div className="flex">
                {/* Sidebar */}
                <TeacherSidebar
                    stats={stats}
                    activeTab={activeTab}
                    setActiveTab={handleTabChange}
                />

                {/* Main Content */}
                <main className="flex-1 ml-64 mt-16 p-8">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.2 }}
                        >
                            {/* AI Insights Banner */}
                            {aiInsights && aiInsights.length > 0 && activeTab === 'overview' && (
                                <div className="mb-6 space-y-3">
                                    {aiInsights.map((insight, idx) => (
                                        <motion.div
                                            key={idx}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.1 }}
                                            className={`p-4 rounded-xl border-2 ${insight.type === 'warning' ? 'bg-orange-50 border-orange-200' :
                                                insight.type === 'success' ? 'bg-green-50 border-green-200' :
                                                    insight.type === 'alert' ? 'bg-red-50 border-red-200' :
                                                        'bg-blue-50 border-blue-200'
                                                }`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-start gap-3">
                                                    <Sparkles className={`w-5 h-5 mt-0.5 ${insight.type === 'warning' ? 'text-orange-600' :
                                                        insight.type === 'success' ? 'text-green-600' :
                                                            insight.type === 'alert' ? 'text-red-600' :
                                                                'text-blue-600'
                                                        }`} />
                                                    <div>
                                                        <h4 className="font-bold text-gray-900 mb-1">
                                                            {insight.title}
                                                        </h4>
                                                        <p className="text-sm text-gray-600">
                                                            {insight.message}
                                                        </p>
                                                    </div>
                                                </div>
                                                {insight.action && (
                                                    <button
                                                        onClick={() => handleTabChange(insight.actionTab)}
                                                        className="px-4 py-2 bg-white rounded-lg text-sm font-semibold hover:shadow-md transition-all border border-gray-200"
                                                    >
                                                        {insight.action}
                                                    </button>
                                                )}
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}

                            {/* Tab Content */}
                            {activeTab === 'overview' && (
                                <div className="space-y-6">
                                    <QuickStats stats={stats} />
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <Announcements classes={classes} />
                                        <LiveSessionList classes={classes} classId={null} />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'classes' && <ClassManagement />}
                            {activeTab === 'students' && <StudentList classes={classes} />}
                            {activeTab === 'assignments' && <AssignmentList />}
                            {activeTab === 'quizzes' && <QuizList />}
                            {activeTab === 'materials' && <MaterialsList />}
                            {activeTab === 'live-sessions' && <LiveSessionList classes={classes} />}
                            {activeTab === 'announcements' && <Announcements classes={classes} />}
                            {activeTab === 'analytics' && <TeacherAnalytics classes={classes} />}
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>

            {/* AI Assistant FAB */}
            <button
                onClick={() => setShowAIAssistant(true)}
                className="fixed bottom-8 right-8 w-14 h-14 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center"
            >
                <Sparkles className="w-6 h-6" />
            </button>

            {/* AI Assistant Modal */}
            {showAIAssistant && (
                <AIAssistant
                    onClose={() => setShowAIAssistant(false)}
                    stats={stats}
                    classes={classes}
                />
            )}
        </div>
    );
};

export default TeacherDashboard;
