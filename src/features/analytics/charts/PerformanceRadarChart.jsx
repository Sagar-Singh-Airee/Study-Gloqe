// src/features/analytics/charts/PerformanceRadarChart.jsx - ✅ SLEEK GRAY/BLACK DESIGN
import { motion } from 'framer-motion';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Target } from 'lucide-react';

const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;

    return (
        <div className="bg-gray-900 border-2 border-gray-700 rounded-xl p-4 shadow-2xl">
            <p className="text-sm font-black text-white mb-2">{payload[0].payload.fullSubject}</p>
            <div className="space-y-1">
                <p className="text-xs text-gray-300 font-semibold">
                    Mastery: <span className="font-black text-white">{payload[0].value}%</span>
                </p>
                {payload[0].payload.accuracy && (
                    <p className="text-xs text-gray-300 font-semibold">
                        Accuracy: <span className="font-black text-white">{payload[0].payload.accuracy}%</span>
                    </p>
                )}
            </div>
        </div>
    );
};

const PerformanceRadarChart = ({ data }) => {
    // Take top 6 subjects for radar (looks best with 5-8 axes)
    const radarData = data.slice(0, 6).map(subject => ({
        subject: subject.subject.length > 12 ? subject.subject.substring(0, 12) + '...' : subject.subject,
        fullSubject: subject.subject,
        mastery: subject.avgScore,
        accuracy: subject.accuracy
    }));

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-white via-gray-50 to-white rounded-2xl p-6 border-2 border-gray-200 shadow-lg hover:shadow-xl transition-all"
        >
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center shadow-2xl">
                    <Target size={28} className="text-white" strokeWidth={2.5} />
                </div>
                <div>
                    <h3 className="text-2xl font-black text-gray-900 mb-1">Subject Mastery</h3>
                    <p className="text-sm text-gray-700 font-semibold">
                        Performance across <span className="text-gray-900 font-black">{data.length}</span> subject{data.length !== 1 ? 's' : ''}
                    </p>
                </div>
            </div>

            {/* Chart */}
            {radarData.length > 0 ? (
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                    <ResponsiveContainer width="100%" height={340}>
                        <RadarChart data={radarData}>
                            <defs>
                                <linearGradient id="radarGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#1f2937" stopOpacity={0.8} />
                                    <stop offset="100%" stopColor="#6b7280" stopOpacity={0.3} />
                                </linearGradient>
                            </defs>
                            <PolarGrid 
                                stroke="#d1d5db" 
                                strokeWidth={1.5}
                            />
                            <PolarAngleAxis
                                dataKey="subject"
                                tick={{ 
                                    fill: '#111827', 
                                    fontSize: 13, 
                                    fontWeight: 700 
                                }}
                            />
                            <PolarRadiusAxis
                                angle={90}
                                domain={[0, 100]}
                                tick={{ 
                                    fill: '#4b5563', 
                                    fontSize: 11, 
                                    fontWeight: 600 
                                }}
                                stroke="#9ca3af"
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Radar
                                name="Mastery"
                                dataKey="mastery"
                                stroke="#111827"
                                fill="url(#radarGradient)"
                                fillOpacity={0.7}
                                strokeWidth={3}
                            />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div className="h-[340px] flex items-center justify-center bg-gray-50 rounded-xl border border-gray-200">
                    <div className="text-center">
                        <Target size={56} className="mx-auto mb-4 text-gray-300" strokeWidth={2} />
                        <p className="text-base font-bold text-gray-900 mb-1">No Data Yet</p>
                        <p className="text-sm text-gray-600 font-medium">Complete quizzes to see mastery</p>
                    </div>
                </div>
            )}

            {/* Top 3 Subjects */}
            {radarData.length > 0 && (
                <div className="mt-6 pt-6 border-t-2 border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-xs font-black text-gray-900 uppercase tracking-wider">
                            Top Performers
                        </p>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-yellow-500" />
                            <div className="w-2 h-2 rounded-full bg-gray-400" />
                            <div className="w-2 h-2 rounded-full bg-orange-600" />
                        </div>
                    </div>
                    <div className="space-y-3">
                        {data.slice(0, 3).map((subject, idx) => (
                            <motion.div 
                                key={subject.subject}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl border border-gray-200 hover:bg-gray-100 transition-all"
                            >
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-lg shadow-lg ${
                                    idx === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
                                    idx === 1 ? 'bg-gradient-to-br from-gray-400 to-gray-600' :
                                    'bg-gradient-to-br from-orange-500 to-orange-700'
                                }`}>
                                    {idx + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-black text-gray-900 truncate">{subject.subject}</p>
                                    <p className="text-xs text-gray-700 font-semibold">
                                        {subject.quizCount} quiz{subject.quizCount !== 1 ? 'zes' : ''} • {subject.accuracy}% accuracy
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-black text-gray-900">{subject.avgScore}%</p>
                                    <p className="text-xs text-gray-600 font-bold uppercase tracking-wide">Score</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {/* Summary Stats */}
            {radarData.length > 0 && (
                <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="text-center p-4 bg-gray-900 rounded-xl border border-gray-800">
                        <p className="text-3xl font-black text-white mb-1">
                            {Math.round(data.reduce((sum, s) => sum + s.avgScore, 0) / data.length)}%
                        </p>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                            Overall Avg
                        </p>
                    </div>
                    <div className="text-center p-4 bg-gray-900 rounded-xl border border-gray-800">
                        <p className="text-3xl font-black text-white mb-1">
                            {Math.max(...data.map(s => s.avgScore))}%
                        </p>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                            Best Score
                        </p>
                    </div>
                </div>
            )}
        </motion.div>
    );
};

export default PerformanceRadarChart;
