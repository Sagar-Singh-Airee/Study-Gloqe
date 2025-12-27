// src/features/teacher/components/classroom/TeacherOverview.jsx - TEACHER DASHBOARD VIEW 📊

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Users, FileText, BookOpen, Brain, TrendingUp, Clock,
    Award, CheckCircle, AlertCircle, Calendar, Plus,
    ArrowRight, Zap, Target, MessageSquare, Video
} from 'lucide-react';
import { collection, query, where, orderBy, limit, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '@/shared/config/firebase';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import toast from 'react-hot-toast';

const TeacherOverview = ({ classData, stats }) => {
    const [recentActivity, setRecentActivity] = useState([]);
    const [upcomingDeadlines, setUpcomingDeadlines] = useState([]);
    const [studentEngagement, setStudentEngagement] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch Recent Activity
    useEffect(() => {
        if (!classData?.id) return;

        const activitiesRef = collection(db, 'classes', classData.id, 'activities');
        const q = query(activitiesRef, orderBy('timestamp', 'desc'), limit(8));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const activities = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setRecentActivity(activities);
        });

        return () => unsubscribe();
    }, [classData?.id]);

    // Fetch Upcoming Deadlines
    useEffect(() => {
        if (!classData?.id) return;

        const fetchDeadlines = async () => {
            try {
                const assignmentsRef = collection(db, 'classes', classData.id, 'assignments');
                const quizzesRef = collection(db, 'classes', classData.id, 'quizzes');

                const now = new Date();

                const [assignmentSnap, quizSnap] = await Promise.all([
                    getDocs(query(assignmentsRef, where('dueDate', '>=', now), orderBy('dueDate', 'asc'), limit(5))),
                    getDocs(query(quizzesRef, where('dueDate', '>=', now), orderBy('dueDate', 'asc'), limit(5)))
                ]);

                const assignments = assignmentSnap.docs.map(doc => ({
                    id: doc.id,
                    type: 'assignment',
                    ...doc.data()
                }));

                const quizzes = quizSnap.docs.map(doc => ({
                    id: doc.id,
                    type: 'quiz',
                    ...doc.data()
                }));

                const allDeadlines = [...assignments, ...quizzes]
                    .sort((a, b) => a.dueDate.toDate() - b.dueDate.toDate())
                    .slice(0, 6);

                setUpcomingDeadlines(allDeadlines);
            } catch (error) {
                console.error('Error fetching deadlines:', error);
            }
        };

        fetchDeadlines();
    }, [classData?.id]);

    // Fetch Student Engagement (Top 5 active students)
    useEffect(() => {
        if (!classData?.id) return;

        const fetchEngagement = async () => {
            try {
                const studentsRef = collection(db, 'classes', classData.id, 'students');
                const q = query(studentsRef, orderBy('lastActive', 'desc'), limit(5));

                const snapshot = await getDocs(q);
                const students = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                setStudentEngagement(students);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching engagement:', error);
                setLoading(false);
            }
        };

        fetchEngagement();
    }, [classData?.id]);

    // Quick Action Handlers
    const quickActions = [
        {
            icon: FileText,
            label: 'Create Assignment',
            gradient: 'from-purple-500 to-pink-500',
            action: () => toast.success('Opening Assignment Creator...')
        },
        {
            icon: Brain,
            label: 'Create Quiz',
            gradient: 'from-orange-500 to-red-500',
            action: () => toast.success('Opening Quiz Creator...')
        },
        {
            icon: BookOpen,
            label: 'Upload Material',
            gradient: 'from-green-500 to-teal-500',
            action: () => toast.success('Opening Material Uploader...')
        },
        {
            icon: MessageSquare,
            label: 'Post Announcement',
            gradient: 'from-yellow-500 to-orange-500',
            action: () => toast.success('Opening Announcements...')
        },
        {
            icon: Video,
            label: 'Schedule Live',
            gradient: 'from-red-500 to-pink-500',
            action: () => toast.success('Opening Live Sessions...')
        },
    ];

    return (
        <div className="space-y-6">
            {/* Welcome Banner */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24" />

                <div className="relative">
                    <h2 className="text-3xl font-black mb-2">
                        Welcome back, {classData.teacherName}! 👋
                    </h2>
                    <p className="text-lg text-white/90 mb-6 max-w-2xl">
                        You have <span className="font-black">{stats.studentCount} students</span> in this class.
                        {upcomingDeadlines.length > 0 && (
                            <> <span className="font-black">{upcomingDeadlines.length} upcoming deadlines</span> to track.</>
                        )}
                    </p>
                    <div className="flex items-center gap-3">
                        <div className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl border-2 border-white/30">
                            <div className="text-xs text-white/80 font-semibold mb-1">Class Code</div>
                            <div className="text-2xl font-black tracking-wider">{classData.classCode}</div>
                        </div>
                        <div className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl border-2 border-white/30">
                            <div className="text-xs text-white/80 font-semibold mb-1">Subject</div>
                            <div className="text-lg font-black">{classData.subject}</div>
                        </div>
                        <div className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl border-2 border-white/30">
                            <div className="text-xs text-white/80 font-semibold mb-1">Section</div>
                            <div className="text-lg font-black">{classData.section}</div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Quick Actions */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <h3 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
                    <Zap size={24} className="text-yellow-500" />
                    Quick Actions
                </h3>
                <div className="grid grid-cols-5 gap-4">
                    {quickActions.map((action, idx) => {
                        const Icon = action.icon;
                        return (
                            <motion.button
                                key={idx}
                                whileHover={{ scale: 1.05, y: -4 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={action.action}
                                className={`bg-gradient-to-br ${action.gradient} p-6 rounded-2xl text-white shadow-lg hover:shadow-xl transition-all group`}
                            >
                                <Icon size={32} className="mx-auto mb-3 group-hover:scale-110 transition-transform" />
                                <div className="text-sm font-bold text-center leading-tight">{action.label}</div>
                            </motion.button>
                        );
                    })}
                </div>
            </motion.div>

            <div className="grid lg:grid-cols-2 gap-6">
                {/* Upcoming Deadlines */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-sm"
                >
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                            <Calendar size={20} className="text-orange-500" />
                            Upcoming Deadlines
                        </h3>
                        <span className="px-3 py-1 bg-orange-50 border border-orange-200 text-orange-700 rounded-lg text-xs font-bold">
                            {upcomingDeadlines.length} Active
                        </span>
                    </div>

                    {upcomingDeadlines.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                <CheckCircle size={32} className="text-gray-400" />
                            </div>
                            <p className="text-sm text-gray-600 font-semibold">No upcoming deadlines</p>
                            <p className="text-xs text-gray-500 mt-1">All caught up! 🎉</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {upcomingDeadlines.map((item) => (
                                <DeadlineCard key={item.id} item={item} />
                            ))}
                        </div>
                    )}
                </motion.div>

                {/* Recent Activity */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-sm"
                >
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                            <TrendingUp size={20} className="text-blue-500" />
                            Recent Activity
                        </h3>
                    </div>

                    {recentActivity.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Clock size={32} className="text-gray-400" />
                            </div>
                            <p className="text-sm text-gray-600 font-semibold">No recent activity</p>
                            <p className="text-xs text-gray-500 mt-1">Activity will appear here</p>
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-80 overflow-y-auto">
                            {recentActivity.map((activity) => (
                                <ActivityCard key={activity.id} activity={activity} />
                            ))}
                        </div>
                    )}
                </motion.div>
            </div>

            {/* Student Engagement */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-sm"
            >
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                        <Target size={20} className="text-green-500" />
                        Most Active Students
                    </h3>
                    <span className="text-sm text-gray-600 font-semibold">Last 7 days</span>
                </div>

                {studentEngagement.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Users size={32} className="text-gray-400" />
                        </div>
                        <p className="text-sm text-gray-600 font-semibold">No student activity yet</p>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-5 gap-4">
                        {studentEngagement.map((student, idx) => (
                            <StudentEngagementCard key={student.id} student={student} rank={idx + 1} />
                        ))}
                    </div>
                )}
            </motion.div>
        </div>
    );
};

// Deadline Card Component
const DeadlineCard = ({ item }) => {
    const dueDate = item.dueDate?.toDate();
    const isPastDue = isPast(dueDate);
    const isDueToday = isToday(dueDate);
    const isDueTomorrow = isTomorrow(dueDate);

    let dueDateText = format(dueDate, 'MMM d, h:mm a');
    if (isDueToday) dueDateText = 'Due Today';
    if (isDueTomorrow) dueDateText = 'Due Tomorrow';

    return (
        <div className={`p-4 rounded-xl border-2 transition-all hover:shadow-md ${isPastDue ? 'bg-red-50 border-red-200' :
                isDueToday ? 'bg-orange-50 border-orange-200' :
                    'bg-gray-50 border-gray-200'
            }`}>
            <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        {item.type === 'assignment' ? (
                            <FileText size={14} className="text-purple-600" />
                        ) : (
                            <Brain size={14} className="text-orange-600" />
                        )}
                        <span className="text-xs font-bold text-gray-500 uppercase">{item.type}</span>
                    </div>
                    <h4 className="font-black text-gray-900 text-sm mb-1">{item.title}</h4>
                    <p className="text-xs text-gray-600 font-semibold flex items-center gap-1">
                        <Clock size={12} />
                        {dueDateText}
                    </p>
                </div>
                <div className="text-right">
                    <div className="text-lg font-black text-gray-900">{item.submissionCount || 0}</div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase">Submitted</div>
                </div>
            </div>
        </div>
    );
};

// Activity Card Component
const ActivityCard = ({ activity }) => {
    const getActivityIcon = (type) => {
        switch (type) {
            case 'submission': return FileText;
            case 'quiz_completion': return Brain;
            case 'material_viewed': return BookOpen;
            case 'announcement': return MessageSquare;
            default: return AlertCircle;
        }
    };

    const Icon = getActivityIcon(activity.type);

    return (
        <div className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon size={16} className="text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{activity.description}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                    {activity.timestamp && format(activity.timestamp.toDate(), 'MMM d, h:mm a')}
                </p>
            </div>
        </div>
    );
};

// Student Engagement Card Component
const StudentEngagementCard = ({ student, rank }) => {
    const rankColors = {
        1: 'from-yellow-400 to-orange-400',
        2: 'from-gray-400 to-gray-500',
        3: 'from-orange-400 to-red-400',
    };

    return (
        <div className="text-center p-4 bg-gray-50 rounded-xl border-2 border-gray-200 hover:border-blue-300 hover:shadow-md transition-all">
            <div className="relative inline-block mb-3">
                <img
                    src={student.photoURL || `https://ui-avatars.com/api/?name=${student.name}&background=random`}
                    alt={student.name}
                    className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-lg"
                />
                {rank <= 3 && (
                    <div className={`absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br ${rankColors[rank]} rounded-full flex items-center justify-center text-white text-xs font-black shadow-lg`}>
                        {rank}
                    </div>
                )}
            </div>
            <h4 className="font-black text-gray-900 text-sm mb-1 truncate">{student.name}</h4>
            <div className="flex items-center justify-center gap-1 text-xs text-gray-600 font-semibold">
                <Award size={12} className="text-yellow-500" />
                {student.xp || 0} XP
            </div>
        </div>
    );
};

export default TeacherOverview;
