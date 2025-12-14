// src/components/features/AnalyticsSection.jsx - ULTIMATE PREMIUM EDITION
import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    BarChart3, TrendingUp, TrendingDown, Clock, Target, BookOpen,
    Flame, Zap, RefreshCw, AlertTriangle, Sparkles, ChevronRight,
    Download, Share2, Filter, Award, Calendar, ArrowUpRight, ArrowDownRight,
    Info, Eye, Activity, Radio
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
    useCompleteAnalyticsBigQuery,
    useStudyStreaks,
    useRecommendations,
    useDocumentsData,
    useRealtimeStudyTimer
} from '@/hooks/useAnalytics';

// ==================== ANIMATED GRADIENT BACKGROUND ====================
const AnimatedBackground = () => (
    <div className="fixed inset-0 -z-10 overflow-hidden">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-gray-50" />
        
        {/* Animated orbs */}
        <motion.div
            animate={{
                scale: [1, 1.2, 1],
                rotate: [0, 180, 360],
                opacity: [0.3, 0.5, 0.3]
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute -top-1/4 -right-1/4 w-[800px] h-[800px] rounded-full bg-gradient-to-br from-blue-200/30 via-purple-200/30 to-pink-200/30 blur-3xl"
        />
        <motion.div
            animate={{
                scale: [1.2, 1, 1.2],
                rotate: [360, 180, 0],
                opacity: [0.2, 0.4, 0.2]
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute -bottom-1/4 -left-1/4 w-[700px] h-[700px] rounded-full bg-gradient-to-tr from-cyan-200/30 via-indigo-200/30 to-violet-200/30 blur-3xl"
        />
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,.02)_1px,transparent_1px)] bg-[size:50px_50px]" />
    </div>
);

// ==================== SHIMMER SKELETON ====================
const SkeletonCard = () => (
    <div className="relative bg-white/40 backdrop-blur-2xl border border-white/60 rounded-3xl p-6 overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2.5s_infinite] bg-gradient-to-r from-transparent via-white/80 to-transparent" />
        <div className="space-y-3">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl animate-pulse" />
                <div className="h-3 w-24 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full animate-pulse" />
            </div>
            <div className="h-10 w-32 bg-gradient-to-r from-gray-200 to-gray-300 rounded-2xl animate-pulse" />
        </div>
    </div>
);

// ==================== PREMIUM TOOLTIP ====================
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
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-4 py-2.5 bg-gradient-to-r from-slate-900 to-slate-800 text-white text-xs font-bold rounded-2xl whitespace-nowrap z-50 shadow-2xl border border-white/10"
                    >
                        {content}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1.5 border-8 border-transparent border-t-slate-900" />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// ==================== PREMIUM STAT CARD ====================
const StatCard = ({ icon: Icon, label, value, trend, trendValue, color = "slate", onClick, delay = 0, realtime = false }) => {
    const [isHovered, setIsHovered] = useState(false);
    
    const colorMap = {
        'blue': { bg: 'from-blue-500 to-cyan-500', glow: 'group-hover:shadow-blue-500/25', icon: 'text-blue-600' },
        'purple': { bg: 'from-purple-500 to-pink-500', glow: 'group-hover:shadow-purple-500/25', icon: 'text-purple-600' },
        'green': { bg: 'from-green-500 to-emerald-500', glow: 'group-hover:shadow-green-500/25', icon: 'text-green-600' },
        'orange': { bg: 'from-orange-500 to-amber-500', glow: 'group-hover:shadow-orange-500/25', icon: 'text-orange-600' },
        'red': { bg: 'from-red-500 to-rose-500', glow: 'group-hover:shadow-red-500/25', icon: 'text-red-600' },
        'indigo': { bg: 'from-indigo-500 to-blue-500', glow: 'group-hover:shadow-indigo-500/25', icon: 'text-indigo-600' },
        'slate': { bg: 'from-slate-600 to-gray-600', glow: 'group-hover:shadow-slate-500/25', icon: 'text-slate-600' }
    };
    
    const colors = colorMap[color] || colorMap.slate;
    const trendColors = trend === 'up' ? 'text-emerald-600 bg-emerald-50' : trend === 'down' ? 'text-rose-600 bg-rose-50' : 'text-slate-600 bg-slate-50';
    const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : null;

    return (
        <motion.div
            whileHover={{ scale: 1.02, y: -8 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, type: "spring", stiffness: 300, damping: 20 }}
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`group relative bg-white/40 backdrop-blur-2xl border border-white/60 rounded-3xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.06)] hover:shadow-[0_20px_60px_rgba(0,0,0,0.12)] ${colors.glow} transition-all duration-500 cursor-pointer overflow-hidden`}
        >
            {/* Animated gradient overlay */}
            <motion.div 
                className={`absolute inset-0 bg-gradient-to-br ${colors.bg} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}
                animate={isHovered ? { 
                    background: [
                        `linear-gradient(135deg, rgba(0,0,0,0.02), transparent)`,
                        `linear-gradient(225deg, rgba(0,0,0,0.02), transparent)`,
                        `linear-gradient(135deg, rgba(0,0,0,0.02), transparent)`
                    ]
                } : {}}
                transition={{ duration: 3, repeat: Infinity }}
            />
            
            {/* Real-time indicator */}
            {realtime && (
                <div className="absolute top-4 right-4">
                    <motion.div 
                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full"
                    >
                        <Radio size={10} className="text-emerald-500" />
                        <span className="text-[10px] font-black text-emerald-600">LIVE</span>
                    </motion.div>
                </div>
            )}
            
            <div className="relative">
                <div className="flex items-center gap-4 mb-4">
                    <motion.div 
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.6 }}
                        className={`p-3.5 bg-gradient-to-br ${colors.bg} rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300`}
                    >
                        <Icon size={22} className="text-white" strokeWidth={2.5} />
                    </motion.div>
                    <div>
                        <div className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">{label}</div>
                        <motion.div 
                            className="text-3xl font-black bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent"
                            animate={realtime ? { scale: [1, 1.05, 1] } : {}}
                            transition={{ duration: 2, repeat: realtime ? Infinity : 0 }}
                        >
                            {value}
                        </motion.div>
                    </div>
                </div>
                
                <div className="flex items-center justify-between">
                    {trendValue && (
                        <motion.div 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 ${trendColors} rounded-xl`}
                        >
                            {TrendIcon && <TrendIcon size={14} strokeWidth={3} />}
                            <span className="text-xs font-black">{trendValue}</span>
                        </motion.div>
                    )}
                    <motion.div
                        animate={{ x: [0, 4, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="ml-auto"
                    >
                        <ChevronRight size={18} className="text-slate-400 group-hover:text-slate-600 transition-colors" strokeWidth={3} />
                    </motion.div>
                </div>
            </div>
        </motion.div>
    );
};

// ==================== INSIGHT CARD ====================
const InsightCard = ({ icon: Icon, title, description, action, type = "info" }) => {
    const typeConfig = {
        success: { 
            gradient: 'from-emerald-500 via-green-500 to-teal-500',
            bg: 'from-emerald-50 to-teal-50',
            border: 'border-emerald-200',
            icon: 'bg-white/20'
        },
        warning: { 
            gradient: 'from-amber-500 via-yellow-500 to-orange-500',
            bg: 'from-amber-50 to-orange-50',
            border: 'border-amber-200',
            icon: 'bg-white/20'
        },
        info: { 
            gradient: 'from-blue-500 via-cyan-500 to-indigo-500',
            bg: 'from-blue-50 to-indigo-50',
            border: 'border-blue-200',
            icon: 'bg-white/20'
        },
        danger: { 
            gradient: 'from-rose-500 via-red-500 to-pink-500',
            bg: 'from-rose-50 to-pink-50',
            border: 'border-rose-200',
            icon: 'bg-white/20'
        }
    };

    const config = typeConfig[type];

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.02 }}
            className={`relative bg-gradient-to-br ${config.bg} border ${config.border} rounded-3xl p-5 overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300`}
        >
            <div className={`absolute inset-0 bg-gradient-to-r ${config.gradient} opacity-5`} />
            
            <div className="relative flex items-start gap-4">
                <motion.div 
                    whileHover={{ rotate: 360, scale: 1.1 }}
                    transition={{ duration: 0.6 }}
                    className={`p-3.5 bg-gradient-to-br ${config.gradient} ${config.icon} rounded-2xl shadow-lg`}
                >
                    <Icon size={24} className="text-white" strokeWidth={2.5} />
                </motion.div>
                <div className="flex-1">
                    <h4 className="font-black text-slate-800 text-lg mb-1">{title}</h4>
                    <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
                    {action && (
                        <motion.button 
                            whileHover={{ x: 4 }}
                            className={`mt-3 text-sm font-black bg-gradient-to-r ${config.gradient} bg-clip-text text-transparent hover:underline`}
                        >
                            {action} →
                        </motion.button>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

// ==================== MAIN COMPONENT ====================
const AnalyticsSection = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [timeframe, setTimeframe] = useState('week');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [lastUpdate, setLastUpdate] = useState(new Date());

    // Real-time timer
    const { displayTime, isStudying, currentSubject } = useRealtimeStudyTimer(user?.uid);

    // Map timeframe to days
    const dateRange = useMemo(() => {
        switch (timeframe) {
            case 'week': return 7;
            case 'month': return 30;
            case 'year': return 365;
            default: return 30;
        }
    }, [timeframe]);

    // Hooks
    const { 
        analytics, 
        trends, 
        performance, 
        loading: bigQueryLoading, 
        error: bigQueryError,
        refetchAll 
    } = useCompleteAnalyticsBigQuery(user?.uid, dateRange);

    const { streaks, loading: streakLoading } = useStudyStreaks(user?.uid);
    const { recommendations } = useRecommendations(user?.uid);
    const { documents, loading: docsLoading } = useDocumentsData(user?.uid);

    const loading = bigQueryLoading || streakLoading || docsLoading;

    // Update timestamp
    useEffect(() => {
        const interval = setInterval(() => {
            setLastUpdate(new Date());
        }, 30000); // Update every 30 seconds
        return () => clearInterval(interval);
    }, []);

    // Calculate stats
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

    // Generate insights
    const insights = useMemo(() => {
        const results = [];
        
        if (stats.streak >= 7) {
            results.push({
                icon: Flame,
                title: "🔥 Fire Streak Active!",
                description: `${stats.streak}-day streak! You're absolutely crushing it. Keep this momentum going!`,
                type: "success"
            });
        }

        if (stats.averageScore >= 80) {
            results.push({
                icon: Award,
                title: "🏆 Elite Performance",
                description: `${stats.averageScore}% average score puts you in the top tier. Exceptional work!`,
                type: "success"
            });
        } else if (stats.averageScore < 60 && stats.quizzesCompleted > 0) {
            results.push({
                icon: Target,
                title: "Growth Opportunity",
                description: "Focus on fundamentals. Small improvements lead to big results!",
                action: "View weak areas",
                type: "warning"
            });
        }

        if (stats.studyMinutesRaw < 60 && timeframe === 'week') {
            results.push({
                icon: Clock,
                title: "Time to Level Up",
                description: "Target 2+ hours weekly for optimal retention and progress.",
                type: "info"
            });
        }

        return results;
    }, [stats, timeframe]);

    // Subject breakdown
    const subjectBreakdown = useMemo(() => {
        if (!performance || performance.length === 0) return [];

        const gradients = [
            'from-blue-500 to-cyan-500',
            'from-purple-500 to-pink-500',
            'from-green-500 to-emerald-500',
            'from-orange-500 to-amber-500',
            'from-rose-500 to-pink-500'
        ];
        
        return performance.slice(0, 5).map((subject, idx) => ({
            subject: subject.name || 'Unknown',
            time: `${subject.quizCount || 0} quiz${subject.quizCount !== 1 ? 'zes' : ''}`,
            percentage: subject.score || 0,
            gradient: gradients[idx % gradients.length],
            score: subject.score || 0,
            trend: subject.trend || 'stable'
        }));
    }, [performance]);

    // Activity data
    const activityData = useMemo(() => {
        if (!trends || trends.length === 0) return generateEmptyWeek();

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
                value: dayData ? Math.min(100, (dayData.studyMinutes || 0) * 2) : 0,
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
        setLastUpdate(new Date());
        setTimeout(() => setIsRefreshing(false), 1000);
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
            <>
                <AnimatedBackground />
                <div className="space-y-8 relative">
                    <div className="mb-8">
                        <h1 className="text-5xl font-black bg-gradient-to-r from-slate-800 via-slate-600 to-slate-800 bg-clip-text text-transparent mb-2">
                            Analytics Dashboard
                        </h1>
                        <p className="text-slate-600 font-medium">Connection issue detected</p>
                    </div>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-gradient-to-br from-rose-50 to-red-50 border border-rose-200 rounded-3xl p-10 text-center shadow-2xl"
                    >
                        <div className="w-20 h-20 bg-gradient-to-br from-rose-500 to-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                            <AlertTriangle size={40} className="text-white" strokeWidth={2.5} />
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 mb-3">Connection Error</h3>
                        <p className="text-slate-600 text-sm mb-8 max-w-md mx-auto leading-relaxed">{bigQueryError}</p>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleRefresh}
                            className="px-8 py-4 bg-gradient-to-r from-slate-800 to-slate-700 text-white rounded-2xl font-black hover:shadow-2xl transition-all inline-flex items-center gap-3"
                        >
                            <RefreshCw size={20} />
                            Retry Connection
                        </motion.button>
                    </motion.div>
                </div>
            </>
        );
    }

    // Loading state
    if (loading) {
        return (
            <>
                <AnimatedBackground />
                <div className="space-y-8 relative">
                    <div className="mb-8">
                        <motion.h1 
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="text-5xl font-black bg-gradient-to-r from-slate-800 via-slate-600 to-slate-800 bg-clip-text text-transparent mb-2"
                        >
                            Analytics Dashboard
                        </motion.h1>
                        <p className="text-slate-600 font-medium flex items-center gap-2">
                            <motion.span
                                animate={{ rotate: 360 }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            >
                                <Zap size={16} className="text-blue-500" />
                            </motion.span>
                            Loading real-time insights...
                        </p>
                    </div>
                    <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-6">
                        {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <AnimatedBackground />
            
            <div className="space-y-8 relative">
                {/* ========== HEADER ========== */}
                <div className="flex items-start justify-between gap-6 flex-wrap">
                    <div>
                        <motion.h1 
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-5xl font-black bg-gradient-to-r from-slate-800 via-slate-600 to-slate-800 bg-clip-text text-transparent mb-3 leading-tight"
                        >
                            Analytics Dashboard
                        </motion.h1>
                        <div className="flex items-center gap-3 flex-wrap">
                            <motion.div 
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.1 }}
                                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full"
                            >
                                <motion.div
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                >
                                    <Radio size={12} className="text-emerald-500" />
                                </motion.div>
                                <span className="text-xs font-black text-emerald-600">LIVE DATA</span>
                            </motion.div>
                            <span className="text-sm text-slate-500 font-medium">
                                Updated {lastUpdate.toLocaleTimeString()}
                            </span>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <Tooltip content="Export all data">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleExport}
                                className="p-3.5 rounded-2xl bg-white/40 backdrop-blur-2xl border border-white/60 shadow-lg hover:shadow-xl transition-all"
                            >
                                <Download size={20} className="text-slate-600" strokeWidth={2.5} />
                            </motion.button>
                        </Tooltip>
                        
                        <Tooltip content="Share dashboard">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="p-3.5 rounded-2xl bg-white/40 backdrop-blur-2xl border border-white/60 shadow-lg hover:shadow-xl transition-all"
                            >
                                <Share2 size={20} className="text-slate-600" strokeWidth={2.5} />
                            </motion.button>
                        </Tooltip>
                        
                        <Tooltip content="Refresh data">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                                className="p-3.5 rounded-2xl bg-white/40 backdrop-blur-2xl border border-white/60 shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                            >
                                <motion.div
                                    animate={isRefreshing ? { rotate: 360 } : {}}
                                    transition={{ duration: 1, repeat: isRefreshing ? Infinity : 0, ease: "linear" }}
                                >
                                    <RefreshCw size={20} className="text-slate-600" strokeWidth={2.5} />
                                </motion.div>
                            </motion.button>
                        </Tooltip>
                    </div>
                </div>

                {/* ========== LIVE STUDY INDICATOR ========== */}
                {isStudying && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 rounded-3xl p-6 overflow-hidden shadow-2xl"
                    >
                        <motion.div
                            animate={{
                                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                            }}
                            transition={{ duration: 3, repeat: Infinity }}
                            className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)] bg-[length:200%_100%]"
                        />
                        <div className="relative flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <motion.div
                                    animate={{ scale: [1, 1.1, 1] }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                    className="p-3 bg-white/20 rounded-2xl"
                                >
                                    <Activity size={28} className="text-white" strokeWidth={2.5} />
                                </motion.div>
                                <div>
                                    <div className="text-white/80 text-sm font-bold mb-1">CURRENTLY STUDYING</div>
                                    <div className="text-2xl font-black text-white">{currentSubject}</div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-white/80 text-sm font-bold mb-1">SESSION TIME</div>
                                <motion.div 
                                    className="text-3xl font-black text-white"
                                    animate={{ scale: [1, 1.05, 1] }}
                                    transition={{ duration: 1, repeat: Infinity }}
                                >
                                    {displayTime}
                                </motion.div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* ========== TIMEFRAME FILTER ========== */}
                <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex gap-2 bg-white/40 backdrop-blur-2xl p-2 rounded-2xl border border-white/60 shadow-lg">
                        {['week', 'month', 'year'].map((tf) => (
                            <motion.button
                                key={tf}
                                onClick={() => setTimeframe(tf)}
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                className="relative px-6 py-3 rounded-xl font-black transition-all"
                            >
                                {timeframe === tf && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute inset-0 bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl shadow-xl"
                                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                    />
                                )}
                                <span className={`relative z-10 ${timeframe === tf ? 'text-white' : 'text-slate-600'}`}>
                                    {tf.charAt(0).toUpperCase() + tf.slice(1)}
                                </span>
                            </motion.button>
                        ))}
                    </div>
                </div>

                {/* ========== INSIGHTS ROW ========== */}
                {insights.length > 0 && (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {insights.map((insight, idx) => (
                            <InsightCard key={idx} {...insight} />
                        ))}
                    </div>
                )}

                {/* ========== KEY METRICS ========== */}
                <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-6">
                    <StatCard
                        icon={Clock}
                        label="Study Time"
                        value={stats.totalStudyTime}
                        trend={stats.trend}
                        trendValue={stats.improvement}
                        color="blue"
                        onClick={() => navigate('/study-sessions')}
                        delay={0}
                        realtime={isStudying}
                    />
                    
                    <StatCard
                        icon={Target}
                        label="Avg Score"
                        value={`${stats.averageScore}%`}
                        trend={stats.averageScore >= 70 ? 'up' : stats.averageScore < 60 ? 'down' : null}
                        trendValue={stats.averageScore >= 70 ? 'Excellent' : stats.averageScore < 60 ? 'Improve' : 'Fair'}
                        color="purple"
                        onClick={() => navigate('/quizzes')}
                        delay={0.05}
                    />
                    
                    <StatCard
                        icon={BarChart3}
                        label="Quizzes"
                        value={stats.quizzesCompleted}
                        trend={stats.quizzesCompleted > 5 ? 'up' : null}
                        trendValue={stats.quizzesCompleted > 10 ? 'Very Active' : null}
                        color="green"
                        onClick={() => navigate('/quizzes')}
                        delay={0.1}
                    />
                    
                    <StatCard
                        icon={BookOpen}
                        label="Documents"
                        value={stats.documentsRead}
                        trend={stats.documentsRead > 0 ? 'up' : null}
                        color="indigo"
                        onClick={() => navigate('/documents')}
                        delay={0.15}
                    />
                    
                    <StatCard
                        icon={Flame}
                        label="Streak"
                        value={`${stats.streak} days`}
                        trend={stats.streak >= 7 ? 'up' : stats.streak === 0 ? 'down' : null}
                        trendValue={stats.streak >= 7 ? 'On Fire!' : null}
                        color="orange"
                        onClick={() => navigate('/gamification')}
                        delay={0.2}
                        realtime={true}
                    />
                    
                    <StatCard
                        icon={stats.improvement.startsWith('+') ? TrendingUp : stats.improvement.startsWith('-') ? TrendingDown : Activity}
                        label="Growth"
                        value={stats.improvement}
                        trend={stats.improvement.startsWith('+') ? 'up' : stats.improvement.startsWith('-') ? 'down' : null}
                        color={stats.improvement.startsWith('+') ? 'green' : stats.improvement.startsWith('-') ? 'red' : 'slate'}
                        delay={0.25}
                    />
                </div>

                {/* ========== CHARTS ROW ========== */}
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Activity Chart */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-white/40 backdrop-blur-2xl border border-white/60 rounded-3xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.06)] hover:shadow-[0_20px_60px_rgba(0,0,0,0.12)] transition-all duration-500"
                    >
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 mb-1">Daily Activity</h3>
                                <p className="text-sm text-slate-500 font-medium">Last 7 days performance</p>
                            </div>
                            <motion.div
                                animate={{ scale: [1, 1.1, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full"
                            >
                                <Radio size={10} className="text-emerald-500" />
                                <span className="text-xs font-black text-emerald-600">LIVE</span>
                            </motion.div>
                        </div>
                        
                        {activityData.some(d => d.value > 0) ? (
                            <div className="space-y-6">
                                <div className="flex items-end justify-between gap-3 h-64">
                                    {activityData.map((day, idx) => (
                                        <Tooltip
                                            key={idx}
                                            content={`${day.day}: ${day.studyMinutes}m studied, ${day.quizzes} quizzes`}
                                        >
                                            <motion.div 
                                                className="flex-1 flex flex-col items-center gap-3 group"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ delay: 0.4 + (idx * 0.05) }}
                                            >
                                                <div className="w-full bg-gradient-to-t from-slate-100 to-slate-50 rounded-2xl relative" style={{ height: '100%' }}>
                                                    <motion.div
                                                        initial={{ height: 0 }}
                                                        animate={{ height: `${day.value}%` }}
                                                        transition={{ duration: 1, delay: 0.5 + (idx * 0.05), ease: "easeOut" }}
                                                        className="w-full bg-gradient-to-t from-slate-700 via-slate-600 to-slate-500 rounded-2xl absolute bottom-0 group-hover:from-cyan-600 group-hover:via-blue-500 group-hover:to-indigo-500 transition-all duration-300 shadow-lg"
                                                    />
                                                </div>
                                                <span className="text-xs font-black text-slate-500 group-hover:text-slate-800 transition-colors">
                                                    {day.day}
                                                </span>
                                            </motion.div>
                                        </Tooltip>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-72 text-center bg-gradient-to-br from-slate-50/50 to-gray-50/50 rounded-3xl border border-slate-100">
                                <AlertTriangle size={56} className="text-slate-300 mb-4" strokeWidth={2} />
                                <p className="text-slate-600 font-black text-xl mb-2">No Activity Yet</p>
                                <p className="text-slate-500 text-sm mb-6 max-w-xs">Start studying to see your progress visualized here</p>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => navigate('/documents')}
                                    className="px-6 py-3 bg-gradient-to-r from-slate-800 to-slate-700 text-white rounded-2xl font-black hover:shadow-2xl transition-all"
                                >
                                    Browse Documents
                                </motion.button>
                            </div>
                        )}
                    </motion.div>

                    {/* Subject Performance */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 }}
                        className="bg-white/40 backdrop-blur-2xl border border-white/60 rounded-3xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.06)] hover:shadow-[0_20px_60px_rgba(0,0,0,0.12)] transition-all duration-500"
                    >
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 mb-1">Subject Performance</h3>
                                <p className="text-sm text-slate-500 font-medium">Top 5 subjects by score</p>
                            </div>
                            <motion.button
                                whileHover={{ x: 4 }}
                                onClick={() => navigate('/subjects')}
                                className="flex items-center gap-1 text-sm font-black text-slate-600 hover:text-slate-800 transition-colors"
                            >
                                View All <ChevronRight size={16} strokeWidth={3} />
                            </motion.button>
                        </div>
                        
                        {subjectBreakdown.length > 0 ? (
                            <div className="space-y-5">
                                {subjectBreakdown.map((subject, idx) => (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, x: -30 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.5 + (idx * 0.05) }}
                                        className="group"
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-base font-black text-slate-800">{subject.subject}</span>
                                                {subject.trend === 'up' && (
                                                    <TrendingUp size={16} className="text-emerald-600" strokeWidth={3} />
                                                )}
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="text-xs font-bold text-slate-500">{subject.time}</span>
                                                <span className="text-base font-black text-slate-700">{subject.score}%</span>
                                            </div>
                                        </div>
                                        <div className="h-3 bg-gradient-to-r from-slate-100 to-gray-100 rounded-full overflow-hidden shadow-inner">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${subject.score}%` }}
                                                transition={{ duration: 1, delay: 0.5 + (idx * 0.05), ease: "easeOut" }}
                                                className={`h-full bg-gradient-to-r ${subject.gradient} rounded-full shadow-lg group-hover:shadow-xl transition-all`}
                                            />
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-72 text-center bg-gradient-to-br from-slate-50/50 to-gray-50/50 rounded-3xl border border-slate-100">
                                <BookOpen size={56} className="text-slate-300 mb-4" strokeWidth={2} />
                                <p className="text-slate-600 font-black text-xl mb-2">No Subjects Yet</p>
                                <p className="text-slate-500 text-sm mb-6 max-w-xs">Take quizzes to track your performance by subject</p>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => navigate('/quizzes')}
                                    className="px-6 py-3 bg-gradient-to-r from-slate-800 to-slate-700 text-white rounded-2xl font-black hover:shadow-2xl transition-all"
                                >
                                    Start Quiz
                                </motion.button>
                            </div>
                        )}
                    </motion.div>
                </div>

                {/* ========== AI RECOMMENDATIONS ========== */}
                {recommendations && recommendations.length > 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 overflow-hidden shadow-2xl"
                    >
                        {/* Animated gradient overlay */}
                        <motion.div
                            animate={{
                                backgroundPosition: ['0% 0%', '100% 100%', '0% 0%']
                            }}
                            transition={{ duration: 8, repeat: Infinity }}
                            className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-pink-600/20 bg-[length:200%_200%]"
                        />
                        
                        <div className="relative">
                            <div className="flex items-center gap-4 mb-8">
                                <motion.div 
                                    animate={{ rotate: [0, 5, -5, 0] }}
                                    transition={{ duration: 3, repeat: Infinity }}
                                    className="p-3.5 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-2xl shadow-xl"
                                >
                                    <Sparkles size={28} className="text-white" strokeWidth={2.5} />
                                </motion.div>
                                <div>
                                    <h3 className="text-2xl font-black text-white mb-1">AI-Powered Insights</h3>
                                    <p className="text-white/60 text-sm font-medium">Personalized recommendations for your learning journey</p>
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                {recommendations.slice(0, 3).map((rec, idx) => (
                                    <motion.div
                                        key={rec.id || idx}
                                        initial={{ opacity: 0, x: -30 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.5 + (idx * 0.05) }}
                                        whileHover={{ scale: 1.02, x: 8 }}
                                        className="flex items-start gap-4 p-5 bg-white/5 backdrop-blur-xl rounded-2xl hover:bg-white/10 transition-all cursor-pointer border border-white/10"
                                    >
                                        <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                                            rec.priority === 'high' || rec.priority >= 90 ? 'bg-rose-500/20 border border-rose-500/30' :
                                            rec.priority === 'medium' || rec.priority >= 80 ? 'bg-amber-500/20 border border-amber-500/30' : 
                                            'bg-emerald-500/20 border border-emerald-500/30'
                                        }`}>
                                            <span className={`font-black text-lg ${
                                                rec.priority === 'high' || rec.priority >= 90 ? 'text-rose-400' :
                                                rec.priority === 'medium' || rec.priority >= 80 ? 'text-amber-400' : 
                                                'text-emerald-400'
                                            }`}>
                                                {rec.priority === 'high' || rec.priority >= 90 ? '!' : 
                                                 rec.priority === 'medium' || rec.priority >= 80 ? '→' : '✓'}
                                            </span>
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-black text-white text-lg mb-1">{rec.title}</div>
                                            <div className="text-white/70 text-sm leading-relaxed">{rec.description}</div>
                                        </div>
                                        <ChevronRight size={20} className="text-white/40 group-hover:text-white/80 transition-colors flex-shrink-0" strokeWidth={3} />
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 overflow-hidden shadow-2xl"
                    >
                        <motion.div
                            animate={{
                                backgroundPosition: ['0% 0%', '100% 100%', '0% 0%']
                            }}
                            transition={{ duration: 8, repeat: Infinity }}
                            className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-pink-600/20 bg-[length:200%_200%]"
                        />
                        
                        <div className="relative">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="p-3.5 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-2xl shadow-xl">
                                    <Zap size={28} className="text-white" strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-white mb-1">Getting Started</h3>
                                    <p className="text-white/60 text-sm font-medium">Complete these steps to unlock AI insights</p>
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                {[
                                    { step: '1', text: 'Upload study materials to create your document library', color: 'emerald' },
                                    { step: '2', text: 'Take AI-generated quizzes to test your knowledge', color: 'amber' },
                                    { step: '3', text: 'Build your study streak to unlock personalized recommendations', color: 'blue' }
                                ].map((item, idx) => (
                                    <motion.div 
                                        key={idx}
                                        initial={{ opacity: 0, x: -30 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.5 + (idx * 0.1) }}
                                        className="flex items-start gap-4 p-5 bg-white/5 backdrop-blur-xl rounded-2xl hover:bg-white/10 transition-all border border-white/10"
                                    >
                                        <div className={`flex-shrink-0 w-10 h-10 bg-${item.color}-500/20 border border-${item.color}-500/30 rounded-xl flex items-center justify-center`}>
                                            <span className={`text-${item.color}-400 font-black text-lg`}>{item.step}</span>
                                        </div>
                                        <span className="text-white/90 text-base leading-relaxed">{item.text}</span>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>
        </>
    );
};

// ==================== HELPER FUNCTIONS ====================
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
