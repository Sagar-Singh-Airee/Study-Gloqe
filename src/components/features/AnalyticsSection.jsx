// src/components/features/AnalyticsSection.jsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Clock, Target, Calendar, BookOpen } from 'lucide-react';

const AnalyticsSection = () => {
    const [timeframe, setTimeframe] = useState('week');

    const stats = {
        totalStudyTime: '12.5h',
        quizzesCompleted: 8,
        averageScore: 85,
        documentsRead: 5,
        streak: 7,
        improvement: '+12%'
    };

    const subjectBreakdown = [
        { subject: 'Physics', time: '4.5h', percentage: 36, color: 'bg-blue-500' },
        { subject: 'Mathematics', time: '3.2h', percentage: 26, color: 'bg-purple-500' },
        { subject: 'Chemistry', time: '2.8h', percentage: 22, color: 'bg-green-500' },
        { subject: 'Other', time: '2.0h', percentage: 16, color: 'bg-gray-500' }
    ];

    const activityData = [
        { day: 'Mon', value: 70 },
        { day: 'Tue', value: 85 },
        { day: 'Wed', value: 60 },
        { day: 'Thu', value: 95 },
        { day: 'Fri', value: 80 },
        { day: 'Sat', value: 75 },
        { day: 'Sun', value: 90 }
    ];

    return (
        <>
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-black text-black mb-2">Analytics</h1>
                <p className="text-gray-600">Track your learning progress and performance</p>
            </div>

            {/* Timeframe Filter */}
            <div className="flex gap-2 mb-6">
                {['week', 'month', 'year'].map((tf) => (
                    <button
                        key={tf}
                        onClick={() => setTimeframe(tf)}
                        className={`px-4 py-2 rounded-xl font-bold transition-all ${timeframe === tf
                                ? 'bg-black text-white'
                                : 'bg-gray-100 hover:bg-gray-200'
                            }`}
                    >
                        {tf.charAt(0).toUpperCase() + tf.slice(1)}
                    </button>
                ))}
            </div>

            {/* Key Metrics */}
            <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                <div className="bg-white border-2 border-black rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <Clock size={18} className="text-black" />
                        <div className="text-xs font-bold text-gray-500 uppercase">Study Time</div>
                    </div>
                    <div className="text-2xl font-black text-black">{stats.totalStudyTime}</div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <Target size={18} className="text-black" />
                        <div className="text-xs font-bold text-gray-500 uppercase">Avg Score</div>
                    </div>
                    <div className="text-2xl font-black text-black">{stats.averageScore}%</div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <BarChart3 size={18} className="text-black" />
                        <div className="text-xs font-bold text-gray-500 uppercase">Quizzes</div>
                    </div>
                    <div className="text-2xl font-black text-black">{stats.quizzesCompleted}</div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <BookOpen size={18} className="text-black" />
                        <div className="text-xs font-bold text-gray-500 uppercase">Documents</div>
                    </div>
                    <div className="text-2xl font-black text-black">{stats.documentsRead}</div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <Calendar size={18} className="text-black" />
                        <div className="text-xs font-bold text-gray-500 uppercase">Streak</div>
                    </div>
                    <div className="text-2xl font-black text-black">{stats.streak} days</div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp size={18} className="text-green-600" />
                        <div className="text-xs font-bold text-green-600 uppercase">Growth</div>
                    </div>
                    <div className="text-2xl font-black text-green-600">{stats.improvement}</div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
                {/* Activity Chart */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                    <h3 className="text-lg font-black text-black mb-6">Daily Activity</h3>
                    <div className="flex items-end justify-between gap-2 h-48">
                        {activityData.map((day) => (
                            <div key={day.day} className="flex-1 flex flex-col items-center gap-2">
                                <div className="w-full bg-gray-100 rounded-t-lg relative" style={{ height: '100%' }}>
                                    <motion.div
                                        initial={{ height: 0 }}
                                        animate={{ height: `${day.value}%` }}
                                        transition={{ duration: 0.5, delay: 0.1 }}
                                        className="w-full bg-black rounded-t-lg absolute bottom-0"
                                    />
                                </div>
                                <span className="text-xs font-bold text-gray-500">{day.day}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Subject Breakdown */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                    <h3 className="text-lg font-black text-black mb-6">Subject Breakdown</h3>
                    <div className="space-y-4">
                        {subjectBreakdown.map((subject) => (
                            <div key={subject.subject}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-bold text-black">{subject.subject}</span>
                                    <span className="text-sm text-gray-500">{subject.time}</span>
                                </div>
                                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${subject.percentage}%` }}
                                        transition={{ duration: 0.5 }}
                                        className={`h-full ${subject.color}`}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Insights */}
            <div className="bg-gradient-to-br from-black to-gray-900 rounded-2xl p-6 text-white">
                <h3 className="text-lg font-black mb-4">📊 Insights & Recommendations</h3>
                <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                        <span className="text-green-400">✓</span>
                        <span>Great job maintaining a 7-day streak! Keep it up to build momentum.</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-yellow-400">!</span>
                        <span>Your quiz scores improved by 12% this week. Focus on Chemistry to balance your subjects.</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-blue-400">→</span>
                        <span>Try studying for 15-20 minute sessions for better retention.</span>
                    </li>
                </ul>
            </div>
        </>
    );
};

export default AnalyticsSection;
