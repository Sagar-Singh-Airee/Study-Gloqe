// src/components/classroom/AnalyticsTab.jsx
import { motion } from 'framer-motion';
import { 
    TrendingUp, Users, Target, Clock, Award, 
    Activity, BarChart3, PieChart, Calendar 
} from 'lucide-react';

const AnalyticsTab = ({ classId }) => {
    // Mock analytics data
    const stats = {
        avgClassScore: 85,
        avgAttendance: 92,
        activeStudents: 23,
        totalStudents: 25,
        completionRate: 88,
        avgStudyTime: 45,
        improvement: 12,
        topPerformers: 5
    };

    const performanceData = [
        { week: 'Week 1', score: 78 },
        { week: 'Week 2', score: 82 },
        { week: 'Week 3', score: 80 },
        { week: 'Week 4', score: 85 },
        { week: 'Week 5', score: 88 },
    ];

    const categoryScores = [
        { category: 'Quizzes', score: 87, total: 100 },
        { category: 'Assignments', score: 82, total: 100 },
        { category: 'Participation', score: 90, total: 100 },
        { category: 'Projects', score: 85, total: 100 },
    ];

    const studentEngagement = [
        { name: 'Highly Active', count: 12, percentage: 48, color: 'bg-green-500' },
        { name: 'Moderately Active', count: 8, percentage: 32, color: 'bg-yellow-500' },
        { name: 'Low Activity', count: 5, percentage: 20, color: 'bg-red-500' },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-black">Class Analytics</h2>
                    <p className="text-gray-600">Detailed insights and performance metrics</p>
                </div>
                <button className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl font-bold hover:scale-105 transition-all">
                    <Calendar size={20} />
                    Last 30 Days
                </button>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white"
                >
                    <div className="flex items-center justify-between mb-4">
                        <Target size={24} />
                        <div className="text-sm font-bold opacity-80">Class Avg</div>
                    </div>
                    <div className="text-4xl font-black mb-1">{stats.avgClassScore}%</div>
                    <div className="text-sm opacity-80">Average Score</div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white"
                >
                    <div className="flex items-center justify-between mb-4">
                        <Users size={24} />
                        <div className="text-sm font-bold opacity-80">Active</div>
                    </div>
                    <div className="text-4xl font-black mb-1">{stats.activeStudents}/{stats.totalStudents}</div>
                    <div className="text-sm opacity-80">Active Students</div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white"
                >
                    <div className="flex items-center justify-between mb-4">
                        <Activity size={24} />
                        <div className="text-sm font-bold opacity-80">Completion</div>
                    </div>
                    <div className="text-4xl font-black mb-1">{stats.completionRate}%</div>
                    <div className="text-sm opacity-80">Assignment Rate</div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white"
                >
                    <div className="flex items-center justify-between mb-4">
                        <Clock size={24} />
                        <div className="text-sm font-bold opacity-80">Study Time</div>
                    </div>
                    <div className="text-4xl font-black mb-1">{stats.avgStudyTime}</div>
                    <div className="text-sm opacity-80">Avg Minutes/Day</div>
                </motion.div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Performance Trend */}
                <div className="bg-white rounded-2xl p-6 border border-gray-200">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
                            <TrendingUp size={20} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-black">Performance Trend</h3>
                            <p className="text-xs text-gray-500">Weekly average scores</p>
                        </div>
                    </div>

                    {/* Simple Bar Chart */}
                    <div className="space-y-3">
                        {performanceData.map((data, idx) => (
                            <div key={idx}>
                                <div className="flex items-center justify-between mb-1 text-sm">
                                    <span className="font-medium text-gray-600">{data.week}</span>
                                    <span className="font-bold text-black">{data.score}%</span>
                                </div>
                                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${data.score}%` }}
                                        transition={{ duration: 0.5, delay: idx * 0.1 }}
                                        className="h-full bg-gradient-to-r from-black to-gray-700"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex items-center gap-2 text-green-600">
                            <TrendingUp size={16} />
                            <span className="text-sm font-bold">+{stats.improvement}% improvement from last month</span>
                        </div>
                    </div>
                </div>

                {/* Category Performance */}
                <div className="bg-white rounded-2xl p-6 border border-gray-200">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
                            <BarChart3 size={20} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-black">Category Performance</h3>
                            <p className="text-xs text-gray-500">Scores by assessment type</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {categoryScores.map((cat, idx) => (
                            <div key={idx}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-bold text-black">{cat.category}</span>
                                    <span className="text-lg font-black text-black">{cat.score}%</span>
                                </div>
                                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(cat.score / cat.total) * 100}%` }}
                                        transition={{ duration: 0.5, delay: idx * 0.1 }}
                                        className={`h-full ${
                                            cat.score >= 85 ? 'bg-green-500' :
                                            cat.score >= 70 ? 'bg-yellow-500' :
                                            'bg-red-500'
                                        }`}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Student Engagement */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
                        <Activity size={20} className="text-white" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-black">Student Engagement</h3>
                        <p className="text-xs text-gray-500">Activity levels breakdown</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {studentEngagement.map((level, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.1 }}
                            className="bg-gray-50 rounded-xl p-6 text-center"
                        >
                            <div className={`w-16 h-16 ${level.color} rounded-full flex items-center justify-center mx-auto mb-4`}>
                                <span className="text-2xl font-black text-white">{level.count}</span>
                            </div>
                            <div className="text-lg font-black text-black mb-1">{level.percentage}%</div>
                            <div className="text-sm text-gray-600 font-medium">{level.name}</div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Insights & Recommendations */}
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white">
                <div className="flex items-center gap-3 mb-4">
                    <Award size={24} />
                    <h3 className="text-xl font-black">AI-Powered Insights</h3>
                </div>
                <div className="space-y-3">
                    <div className="bg-white/10 backdrop-blur-xl rounded-xl p-4">
                        <div className="font-bold mb-1">📈 Strong Performance</div>
                        <div className="text-sm text-white/90">Class is performing 12% above average compared to last month</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-xl rounded-xl p-4">
                        <div className="font-bold mb-1">⚠️ Attention Needed</div>
                        <div className="text-sm text-white/90">5 students showing low engagement - consider personalized check-ins</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-xl rounded-xl p-4">
                        <div className="font-bold mb-1">💡 Recommendation</div>
                        <div className="text-sm text-white/90">Assignment completion rate is high - students respond well to structured tasks</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsTab;
