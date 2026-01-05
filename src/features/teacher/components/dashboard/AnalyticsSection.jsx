// src/components/teacher/TeacherAnalytics.jsx - TEACHER DASHBOARD ANALYTICS
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    BarChart3, TrendingUp, Users, Clock, Target, Award,
    AlertTriangle, Activity, RefreshCw, BookOpen, Sparkles,
    ArrowUpRight, ArrowDownRight, Trophy, UserCheck, UserX,
    Calendar
} from 'lucide-react';
import {
    collection, query, where, onSnapshot, getDocs,
    orderBy, limit
} from 'firebase/firestore';
import { db } from '@shared/config/firebase';
import { useAuth } from '@auth/contexts/AuthContext';

// Skeleton Loader
const SkeletonCard = () => (
    <div className="bg-gray-100 rounded-2xl p-6 animate-pulse">
        <div className="w-12 h-12 bg-gray-200 rounded-xl mb-4" />
        <div className="h-8 w-24 bg-gray-200 rounded mb-2" />
        <div className="h-4 w-32 bg-gray-200 rounded" />
    </div>
);

const StatCard = ({ icon: Icon, title, value, subtitle, trend, trendValue, color = 'black', delay = 0 }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
        className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-shadow"
    >
        <div className="flex items-start justify-between mb-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color === 'green' ? 'bg-green-100' :
                color === 'blue' ? 'bg-blue-100' :
                    color === 'purple' ? 'bg-purple-100' :
                        color === 'orange' ? 'bg-orange-100' :
                            'bg-gray-100'
                }`}>
                <Icon size={24} className={
                    color === 'green' ? 'text-green-600' :
                        color === 'blue' ? 'text-blue-600' :
                            color === 'purple' ? 'text-purple-600' :
                                color === 'orange' ? 'text-orange-600' :
                                    'text-gray-800'
                } />
            </div>
            {trend && (
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${trend === 'up' ? 'bg-green-100 text-green-700' :
                    trend === 'down' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-600'
                    }`}>
                    {trend === 'up' ? <ArrowUpRight size={12} /> :
                        trend === 'down' ? <ArrowDownRight size={12} /> : null}
                    {trendValue}
                </div>
            )}
        </div>
        <div className="text-3xl font-black text-black mb-1">{value}</div>
        <div className="text-sm text-gray-500">{subtitle || title}</div>
    </motion.div>
);

const TeacherAnalytics = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [timeframe, setTimeframe] = useState(30);

    // Data state
    const [classes, setClasses] = useState([]);
    const [allQuizSessions, setAllQuizSessions] = useState([]);
    const [allStudySessions, setAllStudySessions] = useState([]);
    const [students, setStudents] = useState([]);

    // Fetch all teacher's data
    useEffect(() => {
        if (!user?.uid) {
            setLoading(false);
            return;
        }

        const unsubscribers = [];

        // 1. Get teacher's classes
        const classesQuery = query(
            collection(db, 'classes'),
            where('teacherId', '==', user.uid)
        );

        const unsubClasses = onSnapshot(classesQuery, async (snapshot) => {
            const classesData = [];
            const classIds = [];

            snapshot.forEach((doc) => {
                const data = { id: doc.id, ...doc.data() };
                classesData.push(data);
                classIds.push(doc.id);
            });

            setClasses(classesData);

            // Get students from all classes
            const allStudentIds = new Set();
            classesData.forEach(cls => {
                (cls.students || []).forEach(id => allStudentIds.add(id));
            });

            if (allStudentIds.size > 0) {
                // Fetch student details
                const usersRef = collection(db, 'users');
                const usersSnap = await getDocs(usersRef);
                const studentsList = [];
                usersSnap.forEach(doc => {
                    if (allStudentIds.has(doc.id)) {
                        studentsList.push({ id: doc.id, ...doc.data() });
                    }
                });
                setStudents(studentsList);
            }

            // Get quiz sessions for these classes
            if (classIds.length > 0) {
                classIds.forEach(classId => {
                    const quizQuery = query(
                        collection(db, 'quizSessions'),
                        where('classId', '==', classId),
                        limit(100)
                    );

                    const unsubQuiz = onSnapshot(quizQuery, (quizSnap) => {
                        setAllQuizSessions(prev => {
                            const filtered = prev.filter(s => s.classId !== classId);
                            const newSessions = [];
                            quizSnap.forEach(doc => {
                                newSessions.push({ id: doc.id, ...doc.data() });
                            });
                            return [...filtered, ...newSessions];
                        });
                    });
                    unsubscribers.push(unsubQuiz);

                    const studyQuery = query(
                        collection(db, 'studySessions'),
                        where('classId', '==', classId),
                        limit(100)
                    );

                    const unsubStudy = onSnapshot(studyQuery, (studySnap) => {
                        setAllStudySessions(prev => {
                            const filtered = prev.filter(s => s.classId !== classId);
                            const newSessions = [];
                            studySnap.forEach(doc => {
                                const data = doc.data();
                                if (data.status === 'completed') {
                                    newSessions.push({ id: doc.id, ...data });
                                }
                            });
                            return [...filtered, ...newSessions];
                        });
                    });
                    unsubscribers.push(unsubStudy);
                });
            }

            setLoading(false);
        });

        unsubscribers.push(unsubClasses);

        return () => {
            unsubscribers.forEach(unsub => unsub());
        };
    }, [user?.uid]);

    // Calculate stats
    const stats = useMemo(() => {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - timeframe);

        // Total students across all classes
        const totalStudents = new Set();
        classes.forEach(cls => {
            (cls.students || []).forEach(id => totalStudents.add(id));
        });

        // Active students (had activity in timeframe)
        const activeStudentIds = new Set();
        allQuizSessions.forEach(s => {
            const date = s.createdAt?.toDate?.() || new Date(s.createdAt);
            if (date >= cutoffDate && s.userId) activeStudentIds.add(s.userId);
        });
        allStudySessions.forEach(s => {
            const date = s.startTime?.toDate?.() || new Date(s.startTime);
            if (date >= cutoffDate && s.userId) activeStudentIds.add(s.userId);
        });

        // Calculate average score
        const recentQuizzes = allQuizSessions.filter(s => {
            if (!s.answers) return false;
            const date = s.createdAt?.toDate?.() || new Date(s.createdAt);
            return date >= cutoffDate;
        });

        let totalScore = 0;
        let quizCount = 0;
        recentQuizzes.forEach(session => {
            const answers = session.answers || {};
            const keys = Object.keys(answers);
            let correct = 0;
            keys.forEach(k => { if (answers[k]?.answer > 0) correct++; });
            if (keys.length > 0) {
                totalScore += (correct / keys.length) * 100;
                quizCount++;
            }
        });

        // Calculate total study time
        const totalStudyMinutes = allStudySessions.reduce((sum, s) => {
            const date = s.startTime?.toDate?.() || new Date(s.startTime);
            if (date >= cutoffDate) return sum + (s.totalTime || 0);
            return sum;
        }, 0);

        // Get top performers
        const userScores = {};
        recentQuizzes.forEach(s => {
            if (!s.userId || !s.answers) return;
            const answers = s.answers;
            const keys = Object.keys(answers);
            let correct = 0;
            keys.forEach(k => { if (answers[k]?.answer > 0) correct++; });
            if (keys.length > 0) {
                if (!userScores[s.userId]) userScores[s.userId] = { total: 0, count: 0 };
                userScores[s.userId].total += (correct / keys.length) * 100;
                userScores[s.userId].count++;
            }
        });

        const topPerformers = Object.entries(userScores)
            .map(([userId, data]) => {
                const student = students.find(s => s.id === userId);
                return {
                    userId,
                    name: student?.displayName || student?.name || 'Student',
                    avgScore: Math.round(data.total / data.count),
                    quizCount: data.count
                };
            })
            .sort((a, b) => b.avgScore - a.avgScore)
            .slice(0, 5);

        // Get at-risk students (low engagement or scores)
        const atRiskStudents = [];
        totalStudents.forEach(studentId => {
            const quizzes = recentQuizzes.filter(q => q.userId === studentId);
            const student = students.find(s => s.id === studentId);

            if (quizzes.length === 0) {
                atRiskStudents.push({
                    userId: studentId,
                    name: student?.displayName || student?.name || 'Student',
                    reason: 'No recent activity',
                    severity: 'high'
                });
            } else {
                let total = 0;
                quizzes.forEach(q => {
                    const answers = q.answers || {};
                    const keys = Object.keys(answers);
                    let correct = 0;
                    keys.forEach(k => { if (answers[k]?.answer > 0) correct++; });
                    if (keys.length > 0) total += (correct / keys.length) * 100;
                });
                const avg = total / quizzes.length;
                if (avg < 50) {
                    atRiskStudents.push({
                        userId: studentId,
                        name: student?.displayName || student?.name || 'Student',
                        reason: `Average: ${Math.round(avg)}%`,
                        severity: avg < 30 ? 'high' : 'medium'
                    });
                }
            }
        });

        return {
            totalClasses: classes.length,
            totalStudents: totalStudents.size,
            activeStudents: activeStudentIds.size,
            avgScore: quizCount > 0 ? Math.round(totalScore / quizCount) : 0,
            totalQuizzes: recentQuizzes.length,
            totalStudyHours: Math.round(totalStudyMinutes / 60),
            topPerformers,
            atRiskStudents: atRiskStudents.slice(0, 5),
            engagementRate: totalStudents.size > 0
                ? Math.round((activeStudentIds.size / totalStudents.size) * 100)
                : 0
        };
    }, [classes, allQuizSessions, allStudySessions, students, timeframe]);

    // Class performance breakdown
    const classPerformance = useMemo(() => {
        return classes.map(cls => {
            const classQuizzes = allQuizSessions.filter(q => q.classId === cls.id && q.answers);
            let totalScore = 0;
            let count = 0;

            classQuizzes.forEach(session => {
                const answers = session.answers || {};
                const keys = Object.keys(answers);
                let correct = 0;
                keys.forEach(k => { if (answers[k]?.answer > 0) correct++; });
                if (keys.length > 0) {
                    totalScore += (correct / keys.length) * 100;
                    count++;
                }
            });

            return {
                id: cls.id,
                name: cls.name || cls.className || 'Unnamed Class',
                studentCount: cls.students?.length || 0,
                avgScore: count > 0 ? Math.round(totalScore / count) : 0,
                quizCount: classQuizzes.length
            };
        }).sort((a, b) => b.avgScore - a.avgScore);
    }, [classes, allQuizSessions]);

    // Handle refresh
    const handleRefresh = async () => {
        setIsRefreshing(true);
        await new Promise(resolve => setTimeout(resolve, 1000));
        setIsRefreshing(false);
    };

    // Loading state
    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2" />
                        <div className="h-4 w-64 bg-gray-100 rounded animate-pulse" />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-black">Teacher Analytics</h2>
                    <p className="text-gray-600">Cross-class insights and performance metrics</p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <select
                        value={timeframe}
                        onChange={(e) => setTimeframe(Number(e.target.value))}
                        className="flex-1 sm:flex-none px-4 py-2 bg-white border border-gray-200 rounded-xl font-bold text-sm focus:outline-none"
                    >
                        <option value={7}>Last 7 Days</option>
                        <option value={30}>Last 30 Days</option>
                        <option value={90}>Last 90 Days</option>
                    </select>
                    <button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl font-bold hover:scale-105 transition-all disabled:opacity-50 whitespace-nowrap"
                    >
                        <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Key Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    icon={BookOpen}
                    title="Total Classes"
                    value={stats.totalClasses}
                    subtitle="Active classrooms"
                    color="blue"
                    delay={0}
                />
                <StatCard
                    icon={Users}
                    title="Total Students"
                    value={`${stats.activeStudents}/${stats.totalStudents}`}
                    subtitle="Active students"
                    trend={stats.engagementRate >= 70 ? 'up' : stats.engagementRate >= 40 ? null : 'down'}
                    trendValue={`${stats.engagementRate}%`}
                    color="green"
                    delay={0.05}
                />
                <StatCard
                    icon={Target}
                    title="Average Score"
                    value={stats.avgScore > 0 ? `${stats.avgScore}%` : '--'}
                    subtitle="Across all quizzes"
                    trend={stats.avgScore >= 80 ? 'up' : stats.avgScore >= 50 ? null : 'down'}
                    trendValue={stats.avgScore >= 80 ? 'Great' : stats.avgScore >= 50 ? 'OK' : 'Low'}
                    color="purple"
                    delay={0.1}
                />
                <StatCard
                    icon={Clock}
                    title="Study Hours"
                    value={stats.totalStudyHours}
                    subtitle="Total across classes"
                    color="orange"
                    delay={0.15}
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Class Performance */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white border border-gray-200 rounded-2xl p-6"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
                            <BarChart3 size={20} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-black">Class Performance</h3>
                            <p className="text-xs text-gray-500">Average scores by class</p>
                        </div>
                    </div>

                    {classPerformance.length > 0 ? (
                        <div className="space-y-4">
                            {classPerformance.map((cls, idx) => (
                                <div
                                    key={cls.id}
                                    className="cursor-pointer hover:bg-gray-50 p-3 rounded-xl transition-colors"
                                    onClick={() => navigate(`/classroom/${cls.id}`)}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-bold text-black">{cls.name}</span>
                                        <span className="text-lg font-black text-black">
                                            {cls.avgScore > 0 ? `${cls.avgScore}%` : '--'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                                        <span>{cls.studentCount} students</span>
                                        <span>{cls.quizCount} quizzes</span>
                                    </div>
                                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${cls.avgScore}%` }}
                                            transition={{ duration: 0.5, delay: idx * 0.1 }}
                                            className={`h-full ${cls.avgScore >= 80 ? 'bg-green-500' :
                                                cls.avgScore >= 60 ? 'bg-yellow-500' :
                                                    cls.avgScore > 0 ? 'bg-red-500' : 'bg-gray-200'
                                                }`}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-40 text-center">
                            <BookOpen size={32} className="text-gray-300 mb-3" />
                            <p className="text-gray-500 font-medium">No classes yet</p>
                            <p className="text-gray-400 text-sm">Create a class to get started</p>
                        </div>
                    )}
                </motion.div>

                {/* Top Performers */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="bg-white border border-gray-200 rounded-2xl p-6"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center">
                            <Trophy size={20} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-black">Top Performers</h3>
                            <p className="text-xs text-gray-500">Highest scoring students</p>
                        </div>
                    </div>

                    {stats.topPerformers.length > 0 ? (
                        <div className="space-y-3">
                            {stats.topPerformers.map((student, idx) => (
                                <div
                                    key={student.userId}
                                    className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${idx === 0 ? 'bg-yellow-400 text-yellow-900' :
                                            idx === 1 ? 'bg-gray-300 text-gray-700' :
                                                idx === 2 ? 'bg-orange-300 text-orange-800' :
                                                    'bg-gray-100 text-gray-600'
                                            }`}>
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <p className="font-bold text-black">{student.name}</p>
                                            <p className="text-xs text-gray-500">{student.quizCount} quizzes</p>
                                        </div>
                                    </div>
                                    <div className="text-lg font-black text-green-600">{student.avgScore}%</div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-40 text-center">
                            <Trophy size={32} className="text-gray-300 mb-3" />
                            <p className="text-gray-500 font-medium">No quiz data yet</p>
                            <p className="text-gray-400 text-sm">Assign quizzes to see rankings</p>
                        </div>
                    )}
                </motion.div>
            </div>

            {/* At-Risk Students */}
            {stats.atRiskStudents.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-red-50 border border-red-200 rounded-2xl p-6"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center">
                            <AlertTriangle size={20} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-red-800">Students Needing Attention</h3>
                            <p className="text-xs text-red-600">Low engagement or performance</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {stats.atRiskStudents.map((student) => (
                            <div
                                key={student.userId}
                                className={`p-4 rounded-xl border ${student.severity === 'high'
                                    ? 'bg-red-100 border-red-300'
                                    : 'bg-orange-100 border-orange-300'
                                    }`}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <UserX size={16} className={
                                        student.severity === 'high' ? 'text-red-600' : 'text-orange-600'
                                    } />
                                    <span className="font-bold text-black">{student.name}</span>
                                </div>
                                <p className="text-sm text-gray-600">{student.reason}</p>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* AI Insights */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white"
            >
                <div className="flex items-center gap-3 mb-4">
                    <Sparkles size={24} />
                    <h3 className="text-xl font-black">AI-Powered Teaching Insights</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {stats.engagementRate >= 70 ? (
                        <div className="bg-white/10 backdrop-blur-xl rounded-xl p-4">
                            <div className="font-bold mb-1">🎉 Great Engagement</div>
                            <div className="text-sm text-white/90">
                                {stats.engagementRate}% of students are active. Keep up the momentum!
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white/10 backdrop-blur-xl rounded-xl p-4">
                            <div className="font-bold mb-1">⚠️ Boost Engagement</div>
                            <div className="text-sm text-white/90">
                                Only {stats.engagementRate}% active. Try gamified quizzes or group activities.
                            </div>
                        </div>
                    )}

                    {stats.avgScore >= 80 ? (
                        <div className="bg-white/10 backdrop-blur-xl rounded-xl p-4">
                            <div className="font-bold mb-1">📈 Excellent Performance</div>
                            <div className="text-sm text-white/90">
                                {stats.avgScore}% average! Consider introducing advanced content.
                            </div>
                        </div>
                    ) : stats.avgScore >= 50 ? (
                        <div className="bg-white/10 backdrop-blur-xl rounded-xl p-4">
                            <div className="font-bold mb-1">💡 Improvement Opportunity</div>
                            <div className="text-sm text-white/90">
                                {stats.avgScore}% average. Focus on review sessions for weaker topics.
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white/10 backdrop-blur-xl rounded-xl p-4">
                            <div className="font-bold mb-1">🎯 Action Needed</div>
                            <div className="text-sm text-white/90">
                                Low scores indicate content gaps. Schedule remedial sessions.
                            </div>
                        </div>
                    )}

                    <div className="bg-white/10 backdrop-blur-xl rounded-xl p-4">
                        <div className="font-bold mb-1">📊 Quick Stats</div>
                        <div className="text-sm text-white/90">
                            {stats.totalQuizzes} quizzes completed, {stats.totalStudyHours}h studied this period.
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default TeacherAnalytics;
