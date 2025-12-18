// src/features/analytics/charts/StudyTimeLineChart.jsx - ✅ SLEEK GRAY/BLACK DESIGN
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Clock, TrendingUp } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;

    return (
        <div className="bg-gray-900 backdrop-blur-xl border-2 border-gray-700 rounded-xl p-4 shadow-2xl">
            <p className="text-sm font-black text-white mb-3 pb-2 border-b border-gray-700">
                {label}
            </p>
            {payload.map((entry, index) => (
                <div key={index} className="flex items-center justify-between gap-6 text-xs mt-2">
                    <span className="text-gray-300 font-semibold">{entry.name}</span>
                    <span className="font-black text-white text-base">
                        {entry.value} {entry.name === 'Study Time' ? 'hrs' : 'sessions'}
                    </span>
                </div>
            ))}
        </div>
    );
};

const StudyTimeLineChart = ({ data, timeRange }) => {
    const totalHours = data.reduce((sum, d) => sum + d.studyTime, 0);
    const avgHours = data.length > 0 ? Math.round(totalHours / data.length) : 0;
    const peakHours = data.length > 0 ? Math.max(...data.map(d => d.studyTime)) : 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-white via-gray-50 to-white rounded-2xl p-6 border-2 border-gray-200 shadow-lg hover:shadow-xl transition-all"
        >
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center shadow-2xl">
                    <Clock size={28} className="text-white" strokeWidth={2.5} />
                </div>
                <div>
                    <h3 className="text-2xl font-black text-gray-900 mb-1">
                        Study Time Trend
                    </h3>
                    <p className="text-sm text-gray-700 font-semibold">
                        Daily study hours over the last 
                        <span className="text-gray-900 font-black ml-1">{data.length}</span> days
                    </p>
                </div>
            </div>

            {/* Chart */}
            {data.length > 0 ? (
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={data}>
                            <defs>
                                {/* Gray/Black Gradient */}
                                <linearGradient id="studyTimeGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#1f2937" stopOpacity={0.8} />
                                    <stop offset="50%" stopColor="#4b5563" stopOpacity={0.4} />
                                    <stop offset="95%" stopColor="#9ca3af" stopOpacity={0.1} />
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
                                    value: 'Hours', 
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
                            
                            <Area
                                type="monotone"
                                dataKey="studyTime"
                                stroke="#111827"
                                strokeWidth={4}
                                fill="url(#studyTimeGradient)"
                                name="Study Time"
                                dot={{ 
                                    fill: '#111827', 
                                    strokeWidth: 3, 
                                    stroke: '#fff',
                                    r: 5 
                                }}
                                activeDot={{ 
                                    r: 8, 
                                    fill: '#111827',
                                    stroke: '#fff',
                                    strokeWidth: 3
                                }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div className="h-[300px] flex items-center justify-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                    <div className="text-center">
                        <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-4">
                            <Clock size={40} className="text-gray-400" />
                        </div>
                        <p className="text-base font-bold text-gray-900 mb-1">No study sessions yet</p>
                        <p className="text-sm text-gray-600 font-medium">Start studying to see your progress</p>
                    </div>
                </div>
            )}

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t-2 border-gray-200">
                <motion.div 
                    whileHover={{ scale: 1.05 }}
                    className="text-center p-4 bg-gradient-to-br from-gray-50 to-white rounded-xl border-2 border-gray-200 shadow-sm"
                >
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <TrendingUp size={18} className="text-gray-700" />
                    </div>
                    <p className="text-3xl font-black text-gray-900 mb-1">
                        {totalHours}h
                    </p>
                    <p className="text-xs text-gray-700 font-bold uppercase tracking-wider">
                        Total
                    </p>
                </motion.div>
                
                <motion.div 
                    whileHover={{ scale: 1.05 }}
                    className="text-center p-4 bg-gradient-to-br from-gray-50 to-white rounded-xl border-2 border-gray-200 shadow-sm"
                >
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <Clock size={18} className="text-gray-700" />
                    </div>
                    <p className="text-3xl font-black text-gray-900 mb-1">
                        {avgHours}h
                    </p>
                    <p className="text-xs text-gray-700 font-bold uppercase tracking-wider">
                        Daily Avg
                    </p>
                </motion.div>
                
                <motion.div 
                    whileHover={{ scale: 1.05 }}
                    className="text-center p-4 bg-gradient-to-br from-gray-900 to-black rounded-xl border-2 border-gray-800 shadow-lg"
                >
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <TrendingUp size={18} className="text-white" />
                    </div>
                    <p className="text-3xl font-black text-white mb-1">
                        {peakHours}h
                    </p>
                    <p className="text-xs text-gray-300 font-bold uppercase tracking-wider">
                        Peak Day
                    </p>
                </motion.div>
            </div>

            {/* Insights Badge */}
            {data.length > 0 && avgHours > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="mt-4 p-3 bg-gray-100 rounded-xl border border-gray-300"
                >
                    <p className="text-xs text-gray-700 font-semibold text-center">
                        💡 <span className="font-black text-gray-900">Insight:</span> 
                        {avgHours >= 2 
                            ? " Great consistency! You're maintaining excellent study habits." 
                            : " Try to increase daily study time for better results."}
                    </p>
                </motion.div>
            )}
        </motion.div>
    );
};

export default StudyTimeLineChart;
