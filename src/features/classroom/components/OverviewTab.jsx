// src/components/classroom/OverviewTab.jsx
import React, { useState, useEffect, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Clock, TrendingUp, Award, AlertCircle, CheckCircle2, 
    Calendar, BookOpen, FileText, Users, Target, Activity,
    ArrowUp, ArrowDown, Minus, Sparkles, Bell, ChevronRight
} from 'lucide-react';
import { collection, query, where, orderBy, limit, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '@shared/config/firebase';
import toast from 'react-hot-toast';

// ============================================
// ANIMATED COUNTER
// ============================================
const AnimatedNumber = memo(({ value, duration = 800 }) => {
    const [display, setDisplay] = useState(0);
    
    useEffect(() => {
        let startTime;
        const start = display;
        
        const animate = (time) => {
            if (!startTime) startTime = time;
            const progress = Math.min((time - startTime) / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3);
            
            setDisplay(Math.floor(start + (value - start) * easeOut));
            
            if (progress < 1) requestAnimationFrame(animate);
        };
        
        requestAnimationFrame(animate);
    }, [value, duration]);
    
    return <span>{display}</span>;
});

// ============================================
// STAT CARD
// ============================================
const StatCard = memo(({ stat, index, trend }) => {
    const Icon = stat.icon;
    
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ y: -4, scale: 1.02 }}
            className={`${stat.bg} rounded-2xl p-6 border border-gray-200 relative overflow-hidden group cursor-pointer`}
        >
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500" />
            
            <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 ${stat.iconBg} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                        <Icon size={24} className="text-white" />
                    </div>
                    
                    {/* Trend indicator */}
                    {trend && (
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
                            trend.direction === 'up' ? 'bg-green-100 text-green-700' :
                            trend.direction === 'down' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                        }`}>
                            {trend.direction === 'up' ? <ArrowUp size={12} /> :
                             trend.direction === 'down' ? <ArrowDown size={12} /> :
                             <Minus size={12} />}
                            <span>{trend.value}%</span>
                        </div>
                    )}
                </div>
                
                <div className="text-3xl font-black text-black mb-1 tracking-tight">
                    <AnimatedNumber value={stat.value} />
                    {stat.suffix && <span className="text-2xl">{stat.suffix}</span>}
                </div>
                <div className="text-sm text-gray-600 font-medium">{stat.label}</div>
            </div>
        </motion.div>
    );
});

// ============================================
// ACTIVITY ITEM
// ============================================
const ActivityItem = memo(({ activity, index }) => {
    const getIcon = () => {
        if (activity.status === 'completed') return CheckCircle2;
        if (activity.status === 'pending') return Clock;
        return AlertCircle;
    };
    
    const Icon = getIcon();
    
    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ x: 4 }}
            className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all cursor-pointer group"
        >
            <div className={`w-10 h-10 ${
                activity.status === 'completed' ? 'bg-green-500' :
                activity.status === 'pending' ? 'bg-orange-500' :
                'bg-blue-500'
            } rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-lg`}>
                <Icon size={18} className="text-white" />
            </div>
            
            <div className="flex-1 min-w-0">
                <div className="font-bold text-black text-sm truncate">{activity.title}</div>
                <div className="text-xs text-gray-500">{activity.time}</div>
            </div>
            
            <div className="flex items-center gap-2">
                <div className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    activity.status === 'completed' ? 'bg-green-100 text-green-700' :
                    activity.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                    'bg-blue-100 text-blue-700'
                }`}>
                    {activity.status}
                </div>
                <ChevronRight size={16} className="text-gray-400 group-hover:translate-x-1 transition-transform" />
            </div>
        </motion.div>
    );
});

// ============================================
// DEADLINE CARD
// ============================================
const DeadlineCard = memo(({ deadline, index }) => {
    const daysLeft = Math.ceil((new Date(deadline.dueDate) - new Date()) / (1000 * 60 * 60 * 24));
    
    const urgency = daysLeft <= 2 ? 'red' : daysLeft <= 5 ? 'orange' : 'green';
    
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.02 }}
            className={`p-4 border-l-4 border-${urgency}-500 bg-${urgency}-50 rounded-lg cursor-pointer group`}
        >
            <div className="flex items-center justify-between mb-2">
                <div className="font-bold text-black flex items-center gap-2">
                    {deadline.title}
                    {daysLeft <= 2 && <Bell size={14} className="text-red-500 animate-bounce" />}
                </div>
                <span className={`text-xs font-bold text-${urgency}-600`}>
                    {daysLeft === 0 ? 'Due today!' : daysLeft === 1 ? '1 day left' : `${daysLeft} days left`}
                </span>
            </div>
            <div className="text-sm text-gray-600">
                Due: {new Date(deadline.dueDate).toLocaleDateString('en-US', { 
                    month: 'short', day: 'numeric', year: 'numeric' 
                })}
            </div>
            {deadline.description && (
                <div className="text-xs text-gray-500 mt-2 line-clamp-1">{deadline.description}</div>
            )}
        </motion.div>
    );
});

// ============================================
// MAIN COMPONENT
// ============================================
const OverviewTab = ({ classData, isTeacher }) => {
    const [stats, setStats] = useState({
        studentCount: 0,
        activeQuizzes: 0,
        pendingAssignments: 0,
        avgScore: 0
    });
    const [trends, setTrends] = useState({});
    const [recentActivities, setRecentActivities] = useState([]);
    const [upcomingDeadlines, setUpcomingDeadlines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [performanceData, setPerformanceData] = useState([]);

    // Real-time stats listener
    useEffect(() => {
        if (!classData?.id) return;

        const classId = classData.id;
        let unsubscribers = [];

        try {
            // 1. Student count
            const studentsUnsub = onSnapshot(
                query(collection(db, 'classes', classId, 'students')),
                (snapshot) => {
                    setStats(prev => ({ ...prev, studentCount: snapshot.size }));
                },
                (error) => console.error('Students listener error:', error)
            );
            unsubscribers.push(studentsUnsub);

            // 2. Active quizzes
            const quizzesUnsub = onSnapshot(
                query(
                    collection(db, 'quizzes'),
                    where('classId', '==', classId),
                    where('status', '==', 'active')
                ),
                (snapshot) => {
                    setStats(prev => ({ ...prev, activeQuizzes: snapshot.size }));
                },
                (error) => console.error('Quizzes listener error:', error)
            );
            unsubscribers.push(quizzesUnsub);

            // 3. Pending assignments
            const assignmentsUnsub = onSnapshot(
                query(
                    collection(db, 'assignments'),
                    where('classId', '==', classId),
                    where('status', '==', 'pending')
                ),
                (snapshot) => {
                    setStats(prev => ({ ...prev, pendingAssignments: snapshot.size }));
                    
                    // Extract deadlines
                    const deadlines = snapshot.docs.map(doc => ({
                        id: doc.id,
                        title: doc.data().title,
                        dueDate: doc.data().dueDate,
                        description: doc.data().description,
                        type: 'assignment'
                    })).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
                    
                    setUpcomingDeadlines(deadlines.slice(0, 5));
                },
                (error) => console.error('Assignments listener error:', error)
            );
            unsubscribers.push(assignmentsUnsub);

            // 4. Average score (teacher only)
            if (isTeacher) {
                const scoresUnsub = onSnapshot(
                    query(
                        collection(db, 'quizResults'),
                        where('classId', '==', classId),
                        orderBy('completedAt', 'desc'),
                        limit(100)
                    ),
                    (snapshot) => {
                        if (snapshot.empty) {
                            setStats(prev => ({ ...prev, avgScore: 0 }));
                            return;
                        }
                        
                        const scores = snapshot.docs.map(doc => doc.data().score || 0);
                        const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
                        setStats(prev => ({ ...prev, avgScore: Math.round(avg) }));
                    },
                    (error) => console.error('Scores listener error:', error)
                );
                unsubscribers.push(scoresUnsub);
            }

            // 5. Recent activities
            const activitiesUnsub = onSnapshot(
                query(
                    collection(db, 'classActivities'),
                    where('classId', '==', classId),
                    orderBy('timestamp', 'desc'),
                    limit(10)
                ),
                (snapshot) => {
                    const activities = snapshot.docs.map(doc => {
                        const data = doc.data();
                        const timestamp = data.timestamp?.toDate();
                        const now = new Date();
                        const diffMs = now - timestamp;
                        const diffMins = Math.floor(diffMs / 60000);
                        const diffHours = Math.floor(diffMins / 60);
                        const diffDays = Math.floor(diffHours / 24);
                        
                        let timeString;
                        if (diffMins < 1) timeString = 'Just now';
                        else if (diffMins < 60) timeString = `${diffMins}m ago`;
                        else if (diffHours < 24) timeString = `${diffHours}h ago`;
                        else timeString = `${diffDays}d ago`;
                        
                        return {
                            id: doc.id,
                            type: data.type,
                            title: data.title,
                            status: data.status,
                            time: timeString,
                            timestamp: data.timestamp
                        };
                    });
                    
                    setRecentActivities(activities);
                },
                (error) => console.error('Activities listener error:', error)
            );
            unsubscribers.push(activitiesUnsub);

            setLoading(false);

        } catch (error) {
            console.error('Setup error:', error);
            toast.error('Failed to load class overview');
            setLoading(false);
        }

        return () => {
            unsubscribers.forEach(unsub => unsub());
        };
    }, [classData?.id, isTeacher]);

    // Calculate trends (compare with previous period)
    useEffect(() => {
        if (!classData?.id) return;

        const calculateTrends = async () => {
            try {
                // Get historical data (7 days ago)
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

                const historicalQuizzes = await getDocs(
                    query(
                        collection(db, 'quizzes'),
                        where('classId', '==', classData.id),
                        where('createdAt', '>=', sevenDaysAgo)
                    )
                );

                const currentActive = stats.activeQuizzes;
                const previousActive = historicalQuizzes.size - currentActive;
                const trendValue = previousActive > 0 
                    ? Math.round(((currentActive - previousActive) / previousActive) * 100)
                    : 0;

                setTrends({
                    quizzes: {
                        direction: trendValue > 0 ? 'up' : trendValue < 0 ? 'down' : 'neutral',
                        value: Math.abs(trendValue)
                    }
                });
            } catch (error) {
                console.error('Trends calculation error:', error);
            }
        };

        calculateTrends();
    }, [stats.activeQuizzes, classData?.id]);

    const statsData = useMemo(() => [
        { 
            label: 'Total Students', 
            value: stats.studentCount, 
            icon: Users, 
            color: 'blue',
            bg: 'bg-blue-50',
            iconBg: 'bg-blue-500'
        },
        { 
            label: 'Active Quizzes', 
            value: stats.activeQuizzes, 
            icon: FileText, 
            color: 'green',
            bg: 'bg-green-50',
            iconBg: 'bg-green-500'
        },
        { 
            label: 'Pending Tasks', 
            value: stats.pendingAssignments, 
            icon: Clock, 
            color: 'orange',
            bg: 'bg-orange-50',
            iconBg: 'bg-orange-500'
        },
        { 
            label: 'Avg Score', 
            value: stats.avgScore,
            suffix: '%',
            icon: Target, 
            color: 'purple',
            bg: 'bg-purple-50',
            iconBg: 'bg-purple-500'
        },
    ], [stats]);

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1,2,3,4].map(i => (
                        <div key={i} className="bg-gray-100 rounded-2xl p-6 animate-pulse h-32" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <AnimatePresence mode="wait">
                    {statsData.map((stat, idx) => (
                        <StatCard 
                            key={stat.label} 
                            stat={stat} 
                            index={idx} 
                            trend={trends.quizzes && idx === 1 ? trends.quizzes : null}
                        />
                    ))}
                </AnimatePresence>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Activity */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                >
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-gray-900 to-gray-700 rounded-xl flex items-center justify-center shadow-lg">
                                <Activity size={20} className="text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-black">Recent Activity</h3>
                                <p className="text-xs text-gray-500">Live updates</p>
                            </div>
                        </div>
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    </div>

                    <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                        <AnimatePresence mode="popLayout">
                            {recentActivities.length > 0 ? (
                                recentActivities.map((activity, idx) => (
                                    <ActivityItem key={activity.id} activity={activity} index={idx} />
                                ))
                            ) : (
                                <div className="text-center py-12">
                                    <Sparkles size={48} className="mx-auto mb-4 text-gray-300" />
                                    <p className="text-gray-500 font-medium">No recent activity</p>
                                    <p className="text-xs text-gray-400 mt-1">Activity will appear here</p>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>

                {/* Upcoming Deadlines */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-br from-gray-900 to-gray-700 rounded-xl flex items-center justify-center shadow-lg">
                            <Calendar size={20} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-black">Upcoming Deadlines</h3>
                            <p className="text-xs text-gray-500">Don't miss these</p>
                        </div>
                    </div>

                    <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                        <AnimatePresence mode="popLayout">
                            {upcomingDeadlines.length > 0 ? (
                                upcomingDeadlines.map((deadline, idx) => (
                                    <DeadlineCard key={deadline.id} deadline={deadline} index={idx} />
                                ))
                            ) : (
                                <div className="text-center py-12">
                                    <Calendar size={48} className="mx-auto mb-4 text-gray-300" />
                                    <p className="text-gray-500 font-medium">No upcoming deadlines</p>
                                    <p className="text-xs text-gray-400 mt-1">All caught up!</p>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            </div>

            {/* Class Description */}
            {classData.description && (
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-gradient-to-br from-gray-900 to-black text-white rounded-2xl p-6 shadow-xl"
                >
                    <h3 className="text-xl font-black mb-3 flex items-center gap-2">
                        <BookOpen size={24} />
                        About This Class
                    </h3>
                    <p className="text-gray-300 leading-relaxed">{classData.description}</p>
                </motion.div>
            )}

            {/* Performance Chart (Teacher Only) */}
            {isTeacher && (
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-br from-gray-900 to-gray-700 rounded-xl flex items-center justify-center shadow-lg">
                            <TrendingUp size={20} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-black">Class Performance</h3>
                            <p className="text-xs text-gray-500">Last 30 days • Live data</p>
                        </div>
                    </div>
                    
                    <div className="text-center py-12 text-gray-500">
                        <Award size={48} className="mx-auto mb-4 text-gray-300" />
                        <p className="font-medium">Performance analytics coming soon</p>
                        <p className="text-xs text-gray-400 mt-1">Track student progress in real-time</p>
                    </div>
                </motion.div>
            )}

            {/* Custom Scrollbar Styles */}
            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #f1f1f1;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #888;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #555;
                }
            `}</style>
        </div>
    );
};

export default OverviewTab;
