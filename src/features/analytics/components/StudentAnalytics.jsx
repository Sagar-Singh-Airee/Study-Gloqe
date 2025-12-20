// src/features/analytics/components/StudentAnalytics.jsx - SaaS-Ready Analytics Dashboard
import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    BarChart3, TrendingUp, Clock, Target, Flame, Zap, RefreshCw,
    BookOpen, ChevronUp, ChevronDown
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Cell
} from 'recharts';
import { useAuth } from '@auth/contexts/AuthContext';
import { useGamification } from '@gamification/hooks/useGamification';
import { useAnalyticsData } from '../hooks/useAnalyticsData';

// ============================================
// METRIC CARD - Clean SaaS Style
// ============================================
const MetricCard = ({ icon: Icon, label, value, subValue, trend, color = 'slate' }) => {
    const colorMap = {
        slate: 'from-slate-600 to-slate-800',
        emerald: 'from-emerald-500 to-teal-600',
        amber: 'from-amber-500 to-orange-600',
        violet: 'from-violet-500 to-purple-600',
    };

    const trendColor = trend > 0 ? 'text-emerald-600' : trend < 0 ? 'text-rose-500' : 'text-slate-400';
    const TrendIcon = trend > 0 ? ChevronUp : trend < 0 ? ChevronDown : null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4, boxShadow: '0 20px 40px -12px rgba(0,0,0,0.15)' }}
            className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-sm 
                       hover:border-slate-300 transition-all duration-300"
        >
            <div className="flex items-start justify-between mb-4">
                <div className={`p-2.5 rounded-xl bg-gradient-to-br ${colorMap[color]} shadow-lg`}>
                    <Icon size={20} className="text-white" strokeWidth={2.5} />
                </div>
                {TrendIcon && (
                    <div className={`flex items-center gap-0.5 text-xs font-bold ${trendColor}`}>
                        <TrendIcon size={14} strokeWidth={3} />
                        <span>{Math.abs(trend)}%</span>
                    </div>
                )}
            </div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                {label}
            </p>
            <p className="text-2xl font-black text-slate-900 leading-tight">
                {value}
            </p>
            {subValue && (
                <p className="text-xs text-slate-500 font-medium mt-1">{subValue}</p>
            )}
        </motion.div>
    );
};

// ============================================
// CUSTOM TOOLTIP
// ============================================
const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white/95 backdrop-blur-xl border border-slate-200 rounded-xl px-4 py-3 shadow-xl">
            <p className="text-sm font-bold text-slate-800 mb-1">{label}</p>
            <p className="text-lg font-black text-slate-900">{payload[0].value}%</p>
        </div>
    );
};

// ============================================
// SUBJECT PERFORMANCE BAR
// ============================================
const SubjectBar = ({ subject, score, delay = 0 }) => {
    const getScoreColor = (score) => {
        if (score >= 80) return 'from-emerald-500 to-teal-500';
        if (score >= 60) return 'from-amber-400 to-orange-500';
        return 'from-rose-400 to-red-500';
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay }}
            className="flex items-center gap-4"
        >
            <span className="text-sm font-semibold text-slate-700 w-24 truncate">
                {subject}
            </span>
            <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${score}%` }}
                    transition={{ duration: 0.8, delay: delay + 0.2, ease: 'easeOut' }}
                    className={`h-full bg-gradient-to-r ${getScoreColor(score)} rounded-full`}
                />
            </div>
            <span className="text-sm font-black text-slate-800 w-12 text-right">
                {score}%
            </span>
        </motion.div>
    );
};

// ============================================
// MAIN COMPONENT
// ============================================
const StudentAnalytics = () => {
    const { user } = useAuth();
    const [timeRange, setTimeRange] = useState(30);
    const [refreshing, setRefreshing] = useState(false);

    // Data hooks
    const {
        stats,
        subjectPerformance,
        loading,
        error,
        refetch
    } = useAnalyticsData(user?.uid, timeRange);

    const {
        xp,
        level,
        streak: gamificationStreak,
        loading: gamificationLoading
    } = useGamification();

    // Compute metrics
    const metrics = useMemo(() => ({
        studyTime: stats?.totalStudyTime || 0,
        avgSession: stats?.avgSessionLength || 0,
        quizScore: stats?.avgQuizScore || 0,
        totalQuizzes: stats?.totalQuizzes || 0,
        streak: gamificationStreak || stats?.streak || 0,
        xp: xp || 0,
        level: level || 1,
        accuracy: stats?.accuracy || 0,
    }), [stats, xp, level, gamificationStreak]);

    // Chart data
    const chartData = useMemo(() => {
        if (!subjectPerformance?.length) return [];
        return subjectPerformance.slice(0, 6).map(s => ({
            subject: s.subject?.substring(0, 12) || 'Unknown',
            score: Math.round(s.avgScore || 0),
        }));
    }, [subjectPerformance]);

    // Top subjects
    const topSubjects = useMemo(() => {
        if (!subjectPerformance?.length) return [];
        return [...subjectPerformance]
            .sort((a, b) => (b.avgScore || 0) - (a.avgScore || 0))
            .slice(0, 5);
    }, [subjectPerformance]);

    // Handlers
    const handleRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setTimeout(() => setRefreshing(false), 800);
    };

    // Loading State
    if (loading || gamificationLoading) {
        return (
            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="h-8 w-48 bg-slate-200 rounded-lg animate-pulse" />
                    <div className="h-10 w-32 bg-slate-200 rounded-lg animate-pulse" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-32 bg-slate-100 rounded-2xl animate-pulse" />
                    ))}
                </div>
                <div className="h-80 bg-slate-100 rounded-2xl animate-pulse" />
            </div>
        );
    }

    // Error State
    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4">
                        <BarChart3 size={28} className="text-rose-500" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-2">Unable to load analytics</h3>
                    <p className="text-sm text-slate-500 mb-4">{error}</p>
                    <button
                        onClick={handleRefresh}
                        className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-6 space-y-6 pb-24"
        >
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900">Analytics</h1>
                    <p className="text-sm text-slate-500 font-medium">
                        Track your learning progress
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={timeRange}
                        onChange={(e) => setTimeRange(Number(e.target.value))}
                        className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/10 hover:border-slate-300 transition cursor-pointer"
                    >
                        <option value={7}>Last 7 days</option>
                        <option value={30}>Last 30 days</option>
                        <option value={90}>Last 90 days</option>
                    </select>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="p-2.5 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition disabled:opacity-50"
                    >
                        <motion.div
                            animate={refreshing ? { rotate: 360 } : {}}
                            transition={{ duration: 0.8, repeat: refreshing ? Infinity : 0, ease: 'linear' }}
                        >
                            <RefreshCw size={18} className="text-slate-600" strokeWidth={2.5} />
                        </motion.div>
                    </motion.button>
                </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard
                    icon={Clock}
                    label="Study Time"
                    value={`${metrics.studyTime}h`}
                    subValue={`${metrics.avgSession}m avg session`}
                    color="slate"
                />
                <MetricCard
                    icon={Target}
                    label="Quiz Score"
                    value={`${metrics.quizScore}%`}
                    subValue={`${metrics.totalQuizzes} quizzes taken`}
                    trend={metrics.quizScore >= 70 ? 12 : -5}
                    color="emerald"
                />
                <MetricCard
                    icon={Flame}
                    label="Streak"
                    value={`${metrics.streak} days`}
                    subValue={metrics.streak >= 7 ? 'On fire!' : 'Keep going!'}
                    color="amber"
                />
                <MetricCard
                    icon={Zap}
                    label="XP Earned"
                    value={metrics.xp.toLocaleString()}
                    subValue={`Level ${metrics.level}`}
                    color="violet"
                />
            </div>

            {/* Performance Chart */}
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-sm"
            >
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-slate-100">
                        <BookOpen size={18} className="text-slate-600" strokeWidth={2.5} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Subject Performance</h3>
                        <p className="text-xs text-slate-500">Average scores by subject</p>
                    </div>
                </div>

                {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                            <XAxis
                                dataKey="subject"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                domain={[0, 100]}
                                tick={{ fill: '#94a3b8', fontSize: 12 }}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                            <Bar dataKey="score" radius={[8, 8, 0, 0]} maxBarSize={48}>
                                {chartData.map((entry, idx) => (
                                    <Cell
                                        key={idx}
                                        fill={entry.score >= 80 ? '#10b981' : entry.score >= 60 ? '#f59e0b' : '#f43f5e'}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex flex-col items-center justify-center h-60 text-slate-400">
                        <BarChart3 size={40} className="mb-3 opacity-50" />
                        <p className="font-medium">No quiz data yet</p>
                        <p className="text-sm">Complete quizzes to see your performance</p>
                    </div>
                )}
            </motion.div>

            {/* Top Performing Subjects */}
            {topSubjects.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-sm"
                >
                    <div className="flex items-center gap-3 mb-5">
                        <div className="p-2 rounded-lg bg-emerald-50">
                            <TrendingUp size={18} className="text-emerald-600" strokeWidth={2.5} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800">Top Subjects</h3>
                    </div>
                    <div className="space-y-4">
                        {topSubjects.map((item, idx) => (
                            <SubjectBar
                                key={item.subject || idx}
                                subject={item.subject || 'Unknown'}
                                score={Math.round(item.avgScore || 0)}
                                delay={idx * 0.05}
                            />
                        ))}
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
};

export default StudentAnalytics;
