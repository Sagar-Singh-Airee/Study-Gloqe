// src/components/features/AnalyticsSection.jsx - PROFESSIONAL UI/UX
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    BarChart3, TrendingUp, TrendingDown, Clock, Target, BookOpen,
    Flame, Zap, RefreshCw, AlertTriangle, Sparkles, ChevronRight,
    Download, Share2, Filter, Award, Calendar, ArrowUpRight, ArrowDownRight,
    Info
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
    useCompleteAnalyticsBigQuery,
    useStudyStreaks,
    useRecommendations,
    useDocumentsData
} from '@/hooks/useAnalytics';

// Professional Skeleton Loader with Shimmer
const SkeletonCard = () => (
    <div className="relative bg-white/60 backdrop-blur-sm border border-white/50 rounded-2xl p-5 overflow-hidden">
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
        <div className="flex items-center gap-3 mb-3">
            <div className="w-6 h-6 bg-gray-200 rounded-lg animate-pulse" />
            <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="h-9 w-24 bg-gray-200 rounded-lg animate-pulse" />
    </div>
);

// Tooltip Component
const Tooltip = ({ children, content }) => {
    const [show, setShow] = useState(false);
    
    return (
        <div className="relative inline-block">
            <div
                onMouseEnter={() => setShow(true)}
                onMouseLeave={() => setShow(false)}
            >
                {children}
            </div>
            <AnimatePresence>
                {show && (
                    <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap z-50"
                    >
                        {content}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900" />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Stat Card with Trend Indicator
const StatCard = ({ icon: Icon, label, value, trend, trendValue, color = "black", onClick, delay = 0 }) => {
    const trendColor = trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-400';
    const trendBg = trend === 'up' ? 'bg-green-50' : trend === 'down' ? 'bg-red-50' : 'bg-gray-50';
    const TrendIcon = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : null;

    return (
        <motion.div
            whileHover={{ scale: 1.03, y: -4 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, type: "spring", stiffness: 300, damping: 20 }}
            onClick={onClick}
            className="group relative bg-white/70 backdrop-blur-xl border border-white/50 rounded-2xl p-5 shadow-sm hover:shadow-xl transition-all cursor-pointer overflow-hidden"
        >
            {/* Hover glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="relative">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 bg-${color}/5 rounded-xl group-hover:scale-110 transition-transform`}>
                            <Icon size={20} className={`text-${color}`} />
                        </div>
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</div>
                    </div>
                    <Tooltip content="Click for details">
                        <ChevronRight size={16} className="text-gray-400 group-hover:text-black transition-colors" />
                    </Tooltip>
                </div>
                
                <div className="flex items-end justify-between">
                    <div className="text-3xl font-black text-black">{value}</div>
                    {trendValue && (
                        <div className={`flex items-center gap-1 px-2 py-1 ${trendBg} rounded-lg`}>
                            {TrendIcon && <TrendIcon size={12} className={trendColor} />}
                            <span className={`text-xs font-bold ${trendColor}`}>{trendValue}</span>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

// Insight Card
const InsightCard = ({ icon: Icon, title, description, action, type = "info" }) => {
    const colors = {
        success: 'from-green-500 to-emerald-600',
        warning: 'from-yellow-500 to-orange-600',
        info: 'from-blue-500 to-indigo-600',
        danger: 'from-red-500 to-pink-600'
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-white/70 backdrop-blur-xl border border-white/50 rounded-2xl p-5 overflow-hidden"
        >
            <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${colors[type]}`} />
            <div className="flex items-start gap-4">
                <div className={`p-3 bg-gradient-to-br ${colors[type]} rounded-xl`}>
                    <Icon size={20} className="text-white" />
                </div>
                <div className="flex-1">
                    <h4 className="font-bold text-black mb-1">{title}</h4>
                    <p className="text-sm text-gray-600">{description}</p>
                    {action && (
                        <button className="mt-2 text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors">
                            {action} →
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

const AnalyticsSection = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [timeframe, setTimeframe] = useState('week');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    // Map timeframe to days
    const dateRange = useMemo(() => {
        switch (timeframe) {
            case 'week': return 7;
            case 'month': return 30;
            case 'year': return 365;
            default: return 30;
        }
    }, [timeframe]);

    // BigQuery data hook
    const { 
        analytics, 
        trends, 
        performance, 
        loading: bigQueryLoading, 
        error: bigQueryError,
        refetchAll 
    } = useCompleteAnalyticsBigQuery(user?.uid, dateRange);

    // Firestore real-time hooks
    const { streaks, loading: streakLoading } = useStudyStreaks(user?.uid);
    const { recommendations } = useRecommendations(user?.uid);
    const { documents, loading: docsLoading } = useDocumentsData(user?.uid);

    const loading = bigQueryLoading || streakLoading || docsLoading;

    // Calculate stats from BigQuery
    const stats = useMemo(() => {
        if (!analytics?.bigQuery) {
            return {
                totalStudyTime: '0h 0m',
                quizzesCompleted: 0,
                averageScore: 0,
                documentsRead: documents?.length || 0,
                streak: streaks?.currentStreak || 0,
                improvement: '0%'
            };
        }

        const bqData = analytics.bigQuery;
        const totalMinutes = bqData.studyMinutes || 0;
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        return {
            totalStudyTime: `${hours}h ${minutes}m`,
            studyMinutesRaw: totalMinutes,
            quizzesCompleted: bqData.totalQuizzes || 0,
            averageScore: Math.round(bqData.avgScore || 0),
            documentsRead: bqData.documentsRead || documents?.length || 0,
            streak: streaks?.currentStreak || 0,
            improvement: calculateImprovement(trends),
            trend: getTrend(trends)
        };
    }, [analytics, documents, streaks, trends]);

    // Generate insights based on data
    const insights = useMemo(() => {
        const results = [];
        
        if (stats.streak >= 7) {
            results.push({
                icon: Flame,
                title: "Amazing Streak! 🔥",
                description: `You've maintained a ${stats.streak}-day study streak. Keep the momentum going!`,
                type: "success"
            });
        }

        if (stats.averageScore >= 80) {
            results.push({
                icon: Award,
                title: "Top Performer 🏆",
                description: `Your ${stats.averageScore}% average score is excellent. You're mastering the material!`,
                type: "success"
            });
        } else if (stats.averageScore < 60 && stats.quizzesCompleted > 0) {
            results.push({
                icon: Target,
                title: "Room for Improvement",
                description: "Your quiz scores suggest reviewing fundamentals. Try focused study sessions.",
                action: "View weak areas",
                type: "warning"
            });
        }

        if (stats.studyMinutesRaw < 60 && timeframe === 'week') {
            results.push({
                icon: Clock,
                title: "Boost Your Study Time",
                description: "Aim for at least 2 hours of study per week for better retention.",
                type: "info"
            });
        }

        return results;
    }, [stats, timeframe]);

    // Subject breakdown from BigQuery
    const subjectBreakdown = useMemo(() => {
        if (!performance || performance.length === 0) {
            return [];
        }

        const colors = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-pink-500'];
        
        return performance.slice(0, 5).map((subject, idx) => ({
            subject: subject.name || 'Unknown',
            time: `${subject.quizCount || 0} quiz${subject.quizCount !== 1 ? 'zes' : ''}`,
            percentage: subject.score || 0,
            color: colors[idx % colors.length],
            score: subject.score || 0,
            trend: subject.trend || 'stable'
        }));
    }, [performance]);

    // Activity data from BigQuery trends
    const activityData = useMemo(() => {
        if (!trends || trends.length === 0) {
            return generateEmptyWeek();
        }

        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const last7Days = [];

        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            
            const dayData = trends.find(t => {
                if (!t.date) return false;
                const trendDate = t.date?.toMillis ? new Date(t.date.toMillis()) : new Date(t.date);
                return trendDate.toISOString().split('T')[0] === dateStr;
            });

            last7Days.push({
                day: days[date.getDay()],
                value: dayData ? Math.min(70, (dayData.studyMinutes || 0) * 1.5) : 0,
                studyMinutes: dayData?.studyMinutes || 0,
                quizzes: dayData?.quizzesCompleted || 0,
                date: dateStr
            });
        }

        return last7Days;
    }, [trends]);

    // Handle refresh
    const handleRefresh = async () => {
        setIsRefreshing(true);
        await refetchAll();
        setTimeout(() => setIsRefreshing(false), 800);
    };

    // Export data
    const handleExport = () => {
        const data = {
            stats,
            activityData,
            subjectBreakdown,
            exportedAt: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
    };

    // Error state
    if (bigQueryError) {
        return (
            <div className="space-y-6">
                <div className="mb-8">
                    <h1 className="text-4xl font-black text-black mb-2">Analytics</h1>
                    <p className="text-gray-600">Unable to load BigQuery data</p>
                </div>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-red-50/80 backdrop-blur border-2 border-red-200/50 rounded-2xl p-8 text-center"
                >
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle size={32} className="text-red-500" />
                    </div>
                    <h3 className="text-xl font-bold text-red-600 mb-2">Connection Error</h3>
                    <p className="text-red-500 text-sm mb-6 max-w-md mx-auto">{bigQueryError}</p>
                    <button
                        onClick={handleRefresh}
                        className="px-6 py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-all inline-flex items-center gap-2"
                    >
                        <RefreshCw size={18} />
                        Retry Connection
                    </button>
                </motion.div>
            </div>
        );
    }

    // Loading state
    if (loading) {
        return (
            <div className="space-y-6">
                <div className="mb-8">
                    <h1 className="text-4xl font-black text-black mb-2">Analytics</h1>
                    <p className="text-gray-600">Loading insights from BigQuery...</p>
                </div>
                <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with Actions */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-black via-gray-800 to-gray-600 mb-2">
                        Analytics Dashboard
                    </h1>
                    <p className="text-gray-600 flex items-center gap-2">
                        Real-time insights powered by 
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-600 text-sm font-bold rounded-lg">
                            <Zap size={14} />
                            BigQuery
                        </span>
                    </p>
                </div>
                
                <div className="flex items-center gap-2">
                    <Tooltip content="Export data">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleExport}
                            className="p-3 rounded-xl bg-white/70 backdrop-blur border border-black/10 shadow-sm hover:shadow-md transition-all"
                        >
                            <Download size={18} className="text-gray-600" />
                        </motion.button>
                    </Tooltip>
                    
                    <Tooltip content="Share analytics">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="p-3 rounded-xl bg-white/70 backdrop-blur border border-black/10 shadow-sm hover:shadow-md transition-all"
                        >
                            <Share2 size={18} className="text-gray-600" />
                        </motion.button>
                    </Tooltip>
                    
                    <Tooltip content="Refresh data">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="p-3 rounded-xl bg-white/70 backdrop-blur border border-black/10 shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                        >
                            <RefreshCw size={18} className={`text-gray-600 ${isRefreshing ? 'animate-spin' : ''}`} />
                        </motion.button>
                    </Tooltip>
                </div>
            </div>

            {/* Timeframe Filter with Enhanced Design */}
            <div className="flex items-center gap-4 flex-wrap">
                <div className="flex gap-1 bg-white/70 backdrop-blur-xl p-1.5 rounded-xl border border-white/50 shadow-sm">
                    {['week', 'month', 'year'].map((tf) => (
                        <motion.button
                            key={tf}
                            onClick={() => setTimeframe(tf)}
                            className={`relative px-5 py-2.5 rounded-lg font-bold transition-all ${
                                timeframe === tf
                                    ? 'text-black'
                                    : 'text-gray-600 hover:text-black'
                            }`}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            {timeframe === tf && (
                                <motion.div
                                    layoutId="activeTimeframe"
                                    className="absolute inset-0 bg-white rounded-lg shadow-sm"
                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                />
                            )}
                            <span className="relative z-10">{tf.charAt(0).toUpperCase() + tf.slice(1)}</span>
                        </motion.button>
                    ))}
                </div>
                
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white/70 backdrop-blur-xl rounded-xl border border-white/50 font-bold text-gray-700 hover:text-black transition-all"
                >
                    <Filter size={18} />
                    Filters
                </motion.button>
            </div>

            {/* Insights Row */}
            {insights.length > 0 && (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {insights.map((insight, idx) => (
                        <InsightCard key={idx} {...insight} />
                    ))}
                </div>
            )}

            {/* Key Metrics Grid */}
            <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4">
                <StatCard
                    icon={Clock}
                    label="Study Time"
                    value={stats.totalStudyTime}
                    trend={stats.trend}
                    trendValue={stats.improvement}
                    color="blue-600"
                    onClick={() => navigate('/study-sessions')}
                    delay={0}
                />
                
                <StatCard
                    icon={Target}
                    label="Avg Score"
                    value={`${stats.averageScore}%`}
                    trend={stats.averageScore >= 70 ? 'up' : stats.averageScore < 60 ? 'down' : null}
                    trendValue={stats.averageScore >= 70 ? 'Good' : stats.averageScore < 60 ? 'Improve' : 'Fair'}
                    color="purple-600"
                    onClick={() => navigate('/quizzes')}
                    delay={0.05}
                />
                
                <StatCard
                    icon={BarChart3}
                    label="Quizzes"
                    value={stats.quizzesCompleted}
                    trend={stats.quizzesCompleted > 5 ? 'up' : null}
                    trendValue={stats.quizzesCompleted > 10 ? '+Active' : null}
                    color="green-600"
                    onClick={() => navigate('/quizzes')}
                    delay={0.1}
                />
                
                <StatCard
                    icon={BookOpen}
                    label="Documents"
                    value={stats.documentsRead}
                    trend={stats.documentsRead > 0 ? 'up' : null}
                    color="indigo-600"
                    onClick={() => navigate('/documents')}
                    delay={0.15}
                />
                
                <StatCard
                    icon={Flame}
                    label="Streak"
                    value={`${stats.streak} days`}
                    trend={stats.streak >= 7 ? 'up' : stats.streak === 0 ? 'down' : null}
                    trendValue={stats.streak >= 7 ? 'Hot!' : null}
                    color="orange-500"
                    onClick={() => navigate('/gamification')}
                    delay={0.2}
                />
                
                <StatCard
                    icon={stats.improvement.startsWith('+') ? TrendingUp : stats.improvement.startsWith('-') ? TrendingDown : TrendingUp}
                    label="Growth"
                    value={stats.improvement}
                    trend={stats.improvement.startsWith('+') ? 'up' : stats.improvement.startsWith('-') ? 'down' : null}
                    color={stats.improvement.startsWith('+') ? 'green-600' : stats.improvement.startsWith('-') ? 'red-600' : 'gray-600'}
                    delay={0.25}
                />
            </div>

            {/* Charts Row */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Enhanced Activity Chart */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all"
                >
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-xl font-black text-black">Daily Activity</h3>
                            <p className="text-xs text-gray-500 mt-1">Study time & quiz completion</p>
                        </div>
                        <span className="text-xs text-green-600 font-bold bg-green-50 px-2 py-1 rounded-lg">Live</span>
                    </div>
                    
                    {activityData.some(d => d.value > 0) ? (
                        <div className="space-y-4">
                            <div className="flex items-end justify-between gap-2 h-56">
                                {activityData.map((day, idx) => (
                                    <Tooltip
                                        key={idx}
                                        content={`${day.day}: ${day.studyMinutes}m studied, ${day.quizzes} quizzes`}
                                    >
                                        <div className="flex-1 flex flex-col items-center gap-2 group">
                                            <div className="w-full bg-gray-100/60 rounded-t-xl relative" style={{ height: '100%' }}>
                                                <motion.div
                                                    initial={{ height: 0 }}
                                                    animate={{ height: `${day.value}%` }}
                                                    transition={{ duration: 0.6, delay: 0.3 + (idx * 0.05), ease: "easeOut" }}
                                                    className="w-full bg-gradient-to-t from-black via-gray-700 to-gray-600 rounded-t-xl absolute bottom-0 group-hover:from-blue-600 group-hover:via-blue-500 group-hover:to-blue-400 transition-all"
                                                />
                                            </div>
                                            <span className="text-xs font-bold text-gray-500 group-hover:text-black transition-colors">
                                                {day.day}
                                            </span>
                                        </div>
                                    </Tooltip>
                                ))}
                            </div>
                            
                            {/* Legend */}
                            <div className="flex items-center justify-center gap-6 pt-4 border-t border-gray-200/50">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-gray-700 rounded" />
                                    <span className="text-xs text-gray-600">Study time</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-blue-500 rounded" />
                                    <span className="text-xs text-gray-600">On hover</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-64 text-center bg-gradient-to-br from-gray-50/50 to-gray-100/50 rounded-xl">
                            <AlertTriangle size={48} className="text-gray-300 mb-4" />
                            <p className="text-gray-500 font-bold text-lg mb-2">No activity yet</p>
                            <p className="text-gray-400 text-sm mb-4">Start studying to see your daily progress</p>
                            <button
                                onClick={() => navigate('/documents')}
                                className="px-4 py-2 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-all"
                            >
                                Browse Documents
                            </button>
                        </div>
                    )}
                </motion.div>

                {/* Enhanced Subject Performance */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all"
                >
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-xl font-black text-black">Subject Performance</h3>
                            <p className="text-xs text-gray-500 mt-1">Top performing subjects</p>
                        </div>
                        <button
                            onClick={() => navigate('/subjects')}
                            className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-black transition-all"
                        >
                            View all <ChevronRight size={14} />
                        </button>
                    </div>
                    
                    {subjectBreakdown.length > 0 ? (
                        <div className="space-y-4">
                            {subjectBreakdown.map((subject, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.4 + (idx * 0.05) }}
                                    className="group hover:bg-gray-50/50 p-2 rounded-xl transition-all"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-black">{subject.subject}</span>
                                            {subject.trend === 'up' && (
                                                <TrendingUp size={14} className="text-green-600" />
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-gray-500">{subject.time}</span>
                                            <span className="text-sm font-black text-gray-700">{subject.score}%</span>
                                        </div>
                                    </div>
                                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${subject.score}%` }}
                                            transition={{ duration: 0.8, delay: 0.4 + (idx * 0.05), ease: "easeOut" }}
                                            className={`h-full ${subject.color} rounded-full group-hover:opacity-80 transition-opacity`}
                                        />
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-64 text-center bg-gradient-to-br from-gray-50/50 to-gray-100/50 rounded-xl">
                            <BookOpen size={48} className="text-gray-300 mb-4" />
                            <p className="text-gray-500 font-bold text-lg mb-2">No subjects yet</p>
                            <p className="text-gray-400 text-sm mb-4">Take quizzes to track subject performance</p>
                            <button
                                onClick={() => navigate('/quizzes')}
                                className="px-4 py-2 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-all"
                            >
                                Start Quiz
                            </button>
                        </div>
                    )}
                </motion.div>
            </div>

            {/* AI Recommendations with Enhanced Styling */}
            {recommendations && recommendations.length > 0 ? (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="relative bg-gradient-to-br from-black via-gray-900 to-gray-800 backdrop-blur-xl rounded-2xl p-6 text-white border border-white/10 shadow-2xl overflow-hidden"
                >
                    {/* Animated background gradient */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-pink-600/10 animate-pulse" />
                    
                    <div className="relative">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-yellow-400/20 rounded-lg">
                                <Sparkles size={24} className="text-yellow-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black">AI-Powered Recommendations</h3>
                                <p className="text-white/60 text-sm">Personalized insights to boost your learning</p>
                            </div>
                        </div>
                        
                        <ul className="space-y-3">
                            {recommendations.slice(0, 3).map((rec, idx) => (
                                <motion.li
                                    key={rec.id || idx}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.45 + (idx * 0.05) }}
                                    className="flex items-start gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all group cursor-pointer"
                                >
                                    <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                                        rec.priority === 'high' ? 'bg-red-500/20' :
                                        rec.priority === 'medium' ? 'bg-yellow-500/20' : 'bg-green-500/20'
                                    }`}>
                                        <span className={`font-bold ${
                                            rec.priority === 'high' ? 'text-red-400' :
                                            rec.priority === 'medium' ? 'text-yellow-400' : 'text-green-400'
                                        }`}>
                                            {rec.priority === 'high' ? '!' : rec.priority === 'medium' ? '→' : '✓'}
                                        </span>
                                    </div>
                                    <div className="flex-1">
                                        <span className="font-bold text-white group-hover:text-yellow-400 transition-colors">
                                            {rec.title}
                                        </span>
                                        <span className="text-white/70"> — {rec.description}</span>
                                    </div>
                                    <ChevronRight size={16} className="text-white/40 group-hover:text-white/80 transition-colors" />
                                </motion.li>
                            ))}
                        </ul>
                    </div>
                </motion.div>
            ) : (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="relative bg-gradient-to-br from-black via-gray-900 to-gray-800 backdrop-blur-xl rounded-2xl p-6 text-white border border-white/10 shadow-2xl overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-pink-600/10 animate-pulse" />
                    
                    <div className="relative">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-yellow-400/20 rounded-lg">
                                <Zap size={24} className="text-yellow-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black">Getting Started Guide</h3>
                                <p className="text-white/60 text-sm">Complete these steps to unlock insights</p>
                            </div>
                        </div>
                        
                        <ul className="space-y-3">
                            <motion.li initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.45 }} className="flex items-start gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all">
                                <span className="text-green-400 font-bold">1.</span>
                                <span>Upload study materials to create your document library</span>
                            </motion.li>
                            <motion.li initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }} className="flex items-start gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all">
                                <span className="text-yellow-400 font-bold">2.</span>
                                <span>Take AI-generated quizzes to test your knowledge</span>
                            </motion.li>
                            <motion.li initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.55 }} className="flex items-start gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all">
                                <span className="text-blue-400 font-bold">3.</span>
                                <span>Build your study streak to unlock personalized recommendations</span>
                            </motion.li>
                        </ul>
                    </div>
                </motion.div>
            )}
        </div>
    );
};

// Helper functions
function calculateImprovement(trends) {
    if (!trends || trends.length < 2) return '0%';

    const recent = trends.slice(0, Math.ceil(trends.length / 2));
    const older = trends.slice(Math.ceil(trends.length / 2));

    const recentAvg = recent.reduce((sum, t) => sum + (t.studyMinutes || 0), 0) / recent.length;
    const olderAvg = older.reduce((sum, t) => sum + (t.studyMinutes || 0), 0) / older.length;

    if (olderAvg === 0) return recentAvg > 0 ? '+100%' : '0%';

    const change = ((recentAvg - olderAvg) / olderAvg) * 100;
    return change >= 0 ? `+${Math.round(change)}%` : `${Math.round(change)}%`;
}

function getTrend(trends) {
    if (!trends || trends.length < 2) return null;
    
    const recent = trends.slice(0, Math.ceil(trends.length / 2));
    const older = trends.slice(Math.ceil(trends.length / 2));

    const recentAvg = recent.reduce((sum, t) => sum + (t.studyMinutes || 0), 0) / recent.length;
    const olderAvg = older.reduce((sum, t) => sum + (t.studyMinutes || 0), 0) / older.length;

    if (recentAvg > olderAvg) return 'up';
    if (recentAvg < olderAvg) return 'down';
    return null;
}

function generateEmptyWeek() {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const result = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        result.push({ 
            day: days[date.getDay()], 
            value: 0, 
            studyMinutes: 0, 
            quizzes: 0,
            date: date.toISOString().split('T')[0]
        });
    }
    return result;
}

export default AnalyticsSection;
