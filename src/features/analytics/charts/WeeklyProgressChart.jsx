// src/features/analytics/charts/WeeklyProgressChart.jsx - ✅ SLEEK GRAY/BLACK DESIGN
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { Calendar, BookOpen, Brain } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;

    return (
        <div className="bg-gray-900 backdrop-blur-xl border-2 border-gray-700 rounded-xl p-4 shadow-2xl">
            <p className="text-sm font-black text-white mb-3 pb-2 border-b border-gray-700">
                {label}
            </p>
            {payload.map((entry, index) => (
                <div key={index} className="flex items-center justify-between gap-6 text-xs mt-2">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-md border-2 border-white" style={{ backgroundColor: entry.color }} />
                        <span className="text-gray-300 font-semibold">{entry.name}</span>
                    </div>
                    <span className="font-black text-white text-base">{entry.value}</span>
                </div>
            ))}
        </div>
    );
};

const WeeklyProgressChart = ({ data }) => {
    const totalQuizzes = data.reduce((sum, d) => sum + d.quizCount, 0);
    const totalSessions = data.reduce((sum, d) => sum + d.sessionCount, 0);
    const avgSessionsPerDay = data.length > 0 ? (totalSessions / data.length).toFixed(1) : 0;
    const avgQuizzesPerDay = data.length > 0 ? (totalQuizzes / data.length).toFixed(1) : 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-br from-white via-gray-50 to-white rounded-2xl p-6 border-2 border-gray-200 shadow-lg hover:shadow-xl transition-all"
        >
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center shadow-2xl">
                    <Calendar size={28} className="text-white" strokeWidth={2.5} />
                </div>
                <div>
                    <h3 className="text-2xl font-black text-gray-900 mb-1">
                        Weekly Progress
                    </h3>
                    <p className="text-sm text-gray-700 font-semibold">
                        <span className="text-gray-900 font-black">{totalSessions}</span> sessions • 
                        <span className="text-gray-900 font-black ml-1">{totalQuizzes}</span> quizzes
                    </p>
                </div>
            </div>

            {/* Chart */}
            {data.length > 0 ? (
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={data} barGap={8}>
                            <defs>
                                {/* Gray Gradient for Sessions */}
                                <linearGradient id="sessionsGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#374151" />
                                    <stop offset="100%" stopColor="#6b7280" />
                                </linearGradient>
                                {/* Black Gradient for Quizzes */}
                                <linearGradient id="quizzesGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#111827" />
                                    <stop offset="100%" stopColor="#1f2937" />
                                </linearGradient>
                            </defs>
                            
                            <CartesianGrid 
                                strokeDasharray="3 3" 
                                stroke="rgba(0,0,0,0.08)" 
                                vertical={false}
                            />
                            
                            <XAxis
                                dataKey="dayName"
                                stroke="#374151"
                                tick={{ 
                                    fill: '#1f2937', 
                                    fontSize: 13, 
                                    fontWeight: 700 
                                }}
                                tickLine={false}
                                axisLine={{ stroke: '#d1d5db', strokeWidth: 2 }}
                            />
                            
                            <YAxis
                                stroke="#374151"
                                tick={{ 
                                    fill: '#1f2937', 
                                    fontSize: 13, 
                                    fontWeight: 700 
                                }}
                                tickLine={false}
                                axisLine={{ stroke: '#d1d5db', strokeWidth: 2 }}
                                label={{ 
                                    value: 'Count', 
                                    angle: -90, 
                                    position: 'insideLeft', 
                                    style: { 
                                        fontSize: 13, 
                                        fontWeight: 800,
                                        fill: '#111827'
                                    } 
                                }}
                            />
                            
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                            
                            <Legend
                                wrapperStyle={{ 
                                    fontSize: 13, 
                                    fontWeight: 700,
                                    color: '#111827',
                                    paddingTop: '16px'
                                }}
                                iconType="circle"
                            />
                            
                            <Bar
                                dataKey="sessionCount"
                                fill="url(#sessionsGradient)"
                                radius={[8, 8, 0, 0]}
                                name="Study Sessions"
                            />
                            
                            <Bar
                                dataKey="quizCount"
                                fill="url(#quizzesGradient)"
                                radius={[8, 8, 0, 0]}
                                name="Quizzes"
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div className="h-[300px] flex items-center justify-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                    <div className="text-center">
                        <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-4">
                            <Calendar size={40} className="text-gray-400" />
                        </div>
                        <p className="text-base font-bold text-gray-900 mb-1">No activity this week</p>
                        <p className="text-sm text-gray-600 font-medium">Start studying to track your progress</p>
                    </div>
                </div>
            )}

            {/* Daily Averages */}
            <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t-2 border-gray-200">
                <motion.div 
                    whileHover={{ scale: 1.05 }}
                    className="text-center p-4 bg-gradient-to-br from-gray-100 to-gray-50 rounded-xl border-2 border-gray-300 shadow-sm"
                >
                    <div className="flex items-center justify-center gap-2 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center shadow-md">
                            <BookOpen size={20} className="text-white" strokeWidth={2.5} />
                        </div>
                    </div>
                    <p className="text-3xl font-black text-gray-900 mb-1">
                        {avgSessionsPerDay}
                    </p>
                    <p className="text-xs text-gray-700 font-bold uppercase tracking-wider">
                        Sessions/Day
                    </p>
                    <div className="mt-2 px-3 py-1 bg-gray-200 rounded-lg">
                        <p className="text-xs text-gray-600 font-semibold">
                            Total: <span className="font-black text-gray-900">{totalSessions}</span>
                        </p>
                    </div>
                </motion.div>
                
                <motion.div 
                    whileHover={{ scale: 1.05 }}
                    className="text-center p-4 bg-gradient-to-br from-gray-900 to-black rounded-xl border-2 border-gray-800 shadow-lg"
                >
                    <div className="flex items-center justify-center gap-2 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center shadow-md">
                            <Brain size={20} className="text-white" strokeWidth={2.5} />
                        </div>
                    </div>
                    <p className="text-3xl font-black text-white mb-1">
                        {avgQuizzesPerDay}
                    </p>
                    <p className="text-xs text-gray-300 font-bold uppercase tracking-wider">
                        Quizzes/Day
                    </p>
                    <div className="mt-2 px-3 py-1 bg-gray-800 rounded-lg">
                        <p className="text-xs text-gray-400 font-semibold">
                            Total: <span className="font-black text-white">{totalQuizzes}</span>
                        </p>
                    </div>
                </motion.div>
            </div>

            {/* Performance Insight */}
            {data.length > 0 && (totalSessions > 0 || totalQuizzes > 0) && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="mt-4 p-3 bg-gray-100 rounded-xl border border-gray-300"
                >
                    <p className="text-xs text-gray-700 font-semibold text-center">
                        {totalSessions >= 7 
                            ? "🔥 Excellent! You're studying every day this week!" 
                            : totalSessions >= 4
                            ? "👍 Great progress! Keep building that study habit."
                            : "💡 Try to study at least 4-5 days per week for best results."}
                    </p>
                </motion.div>
            )}
        </motion.div>
    );
};

export default WeeklyProgressChart;
