// src/components/classroom/OverviewTab.jsx
import { motion } from 'framer-motion';
import { 
    Clock, TrendingUp, Award, AlertCircle, CheckCircle2, 
    Calendar, BookOpen, FileText, Users, Target 
} from 'lucide-react';

const OverviewTab = ({ classData, isTeacher }) => {
    const stats = [
        { 
            label: 'Total Students', 
            value: classData.studentCount || 0, 
            icon: Users, 
            color: 'blue',
            bg: 'bg-blue-50',
            iconBg: 'bg-blue-500'
        },
        { 
            label: 'Active Quizzes', 
            value: classData.activeQuizzes || 0, 
            icon: FileText, 
            color: 'green',
            bg: 'bg-green-50',
            iconBg: 'bg-green-500'
        },
        { 
            label: 'Pending Assignments', 
            value: classData.pendingAssignments || 0, 
            icon: Clock, 
            color: 'orange',
            bg: 'bg-orange-50',
            iconBg: 'bg-orange-500'
        },
        { 
            label: 'Avg Score', 
            value: `${classData.avgScore || 0}%`, 
            icon: Target, 
            color: 'purple',
            bg: 'bg-purple-50',
            iconBg: 'bg-purple-500'
        },
    ];

    const recentActivities = [
        { type: 'quiz', title: 'Mid-term Quiz', status: 'completed', time: '2 hours ago' },
        { type: 'assignment', title: 'Chapter 5 Homework', status: 'pending', time: '1 day ago' },
        { type: 'material', title: 'Study Guide PDF', status: 'new', time: '3 days ago' },
    ];

    return (
        <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, idx) => {
                    const Icon = stat.icon;
                    return (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className={`${stat.bg} rounded-2xl p-6 border border-gray-200`}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className={`w-12 h-12 ${stat.iconBg} rounded-xl flex items-center justify-center`}>
                                    <Icon size={24} className="text-white" />
                                </div>
                            </div>
                            <div className="text-3xl font-black text-black mb-1">{stat.value}</div>
                            <div className="text-sm text-gray-600 font-medium">{stat.label}</div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Activity */}
                <div className="bg-white rounded-2xl p-6 border border-gray-200">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
                            <Clock size={20} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-black">Recent Activity</h3>
                            <p className="text-xs text-gray-500">Latest updates</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {recentActivities.map((activity, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all cursor-pointer"
                            >
                                <div className={`w-10 h-10 ${
                                    activity.status === 'completed' ? 'bg-green-500' :
                                    activity.status === 'pending' ? 'bg-orange-500' :
                                    'bg-blue-500'
                                } rounded-lg flex items-center justify-center flex-shrink-0`}>
                                    {activity.status === 'completed' ? (
                                        <CheckCircle2 size={18} className="text-white" />
                                    ) : activity.status === 'pending' ? (
                                        <Clock size={18} className="text-white" />
                                    ) : (
                                        <AlertCircle size={18} className="text-white" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-black text-sm truncate">{activity.title}</div>
                                    <div className="text-xs text-gray-500">{activity.time}</div>
                                </div>
                                <div className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                                    activity.status === 'completed' ? 'bg-green-100 text-green-700' :
                                    activity.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                                    'bg-blue-100 text-blue-700'
                                }`}>
                                    {activity.status}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Upcoming Deadlines */}
                <div className="bg-white rounded-2xl p-6 border border-gray-200">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
                            <Calendar size={20} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-black">Upcoming Deadlines</h3>
                            <p className="text-xs text-gray-500">Don't miss these</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="p-4 border-l-4 border-red-500 bg-red-50 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                                <div className="font-bold text-black">Final Project Submission</div>
                                <span className="text-xs font-bold text-red-600">2 days left</span>
                            </div>
                            <div className="text-sm text-gray-600">Due: Dec 5, 2025</div>
                        </div>

                        <div className="p-4 border-l-4 border-orange-500 bg-orange-50 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                                <div className="font-bold text-black">Unit Test 3</div>
                                <span className="text-xs font-bold text-orange-600">5 days left</span>
                            </div>
                            <div className="text-sm text-gray-600">Due: Dec 8, 2025</div>
                        </div>

                        <div className="p-4 border-l-4 border-green-500 bg-green-50 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                                <div className="font-bold text-black">Reading Assignment</div>
                                <span className="text-xs font-bold text-green-600">1 week left</span>
                            </div>
                            <div className="text-sm text-gray-600">Due: Dec 10, 2025</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Class Description */}
            {classData.description && (
                <div className="bg-gradient-to-br from-gray-900 to-black text-white rounded-2xl p-6">
                    <h3 className="text-xl font-black mb-3 flex items-center gap-2">
                        <BookOpen size={24} />
                        About This Class
                    </h3>
                    <p className="text-gray-300 leading-relaxed">{classData.description}</p>
                </div>
            )}

            {/* Performance Chart (Teacher Only) */}
            {isTeacher && (
                <div className="bg-white rounded-2xl p-6 border border-gray-200">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
                            <TrendingUp size={20} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-black">Class Performance</h3>
                            <p className="text-xs text-gray-500">Last 30 days</p>
                        </div>
                    </div>
                    
                    <div className="text-center py-12 text-gray-500">
                        <Award size={48} className="mx-auto mb-4 text-gray-300" />
                        <p className="font-medium">Performance analytics coming soon</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OverviewTab;
