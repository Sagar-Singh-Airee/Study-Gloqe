// src/features/analytics/components/StudentAnalytics.jsx - ✅ ULTIMATE PRODUCTION-READY
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BarChart3, TrendingUp, Clock, Target, Flame, Award,
    Calendar, Trophy, Zap, BookOpen, Brain, Layers, RefreshCw,
    Download, Sparkles, Activity, Eye, EyeOff, ChevronDown
} from 'lucide-react';
import { useAuth } from '@auth/contexts/AuthContext';

// Enhanced components
import QuickStatsGrid from '../widgets/QuickStatsGrid';
import ActivityHeatmap from '../charts/ActivityHeatmap';
import PerformanceRadarChart from '../charts/PerformanceRadarChart';
import StudyTimeLineChart from '../charts/StudyTimeLineChart';
import SubjectMasteryGrid from '../widgets/SubjectMasteryGrid';
import GoalTracker from '../widgets/GoalTracker';
import WeeklyProgressChart from '../charts/WeeklyProgressChart';
import TopPerformingSubjects from '../widgets/TopPerformingSubjects';
import LearningInsights from '../insights/LearningInsights';
import RecentActivityFeed from '../widgets/RecentActivityFeed';
import ExportButton from '../widgets/ExportButton';

// Hooks
import { useAnalyticsData } from '../hooks/useAnalyticsData';
import { useGoals } from '../hooks/useGoals';

// Section Header Component
const SectionHeader = ({ icon: Icon, title, subtitle, action, delay = 0 }) => (
    <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay }}
        className="flex items-center justify-between mb-4"
    >
        <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gray-900 to-black flex items-center justify-center shadow-xl">
                <Icon size={24} className="text-white" strokeWidth={2.5} />
            </div>
            <div>
                <h2 className="text-2xl font-black text-gray-900">{title}</h2>
                {subtitle && (
                    <p className="text-sm text-gray-600 font-semibold">{subtitle}</p>
                )}
            </div>
        </div>
        {action}
    </motion.div>
);

const StudentAnalytics = () => {
    const { user } = useAuth();
    const [timeRange, setTimeRange] = useState(30);
    const [refreshing, setRefreshing] = useState(false);
    const [collapsedSections, setCollapsedSections] = useState({});

    // Fetch all analytics data with real-time updates
    const {
        stats,
        quizSessions,
        studySessions,
        subjectPerformance,
        weeklyActivity,
        recentActivity,
        loading,
        error,
        refetch
    } = useAnalyticsData(user?.uid, timeRange);

    // Goals tracking
    const { goals, updateGoal } = useGoals(user?.uid);

    // Refresh handler
    const handleRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setTimeout(() => setRefreshing(false), 1000);
    };

    // Toggle section collapse
    const toggleSection = (section) => {
        setCollapsedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    // Loading State
    if (loading) {
        return (
            <div className="p-6 space-y-6 pb-24">
                {/* Header Skeleton */}
                <div className="flex items-center justify-between">
                    <div className="space-y-3">
                        <div className="h-10 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-xl w-80 animate-pulse" />
                        <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-lg w-64 animate-pulse" />
                    </div>
                    <div className="flex gap-3">
                        <div className="h-11 w-36 bg-gray-200 rounded-xl animate-pulse" />
                        <div className="h-11 w-11 bg-gray-200 rounded-xl animate-pulse" />
                    </div>
                </div>

                {/* Stats Grid Skeleton */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="h-36 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200 rounded-2xl animate-pulse"
                        />
                    ))}
                </div>

                {/* Charts Skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {[1, 2].map(i => (
                        <div key={i} className="h-96 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200 rounded-2xl animate-pulse" />
                    ))}
                </div>

                {/* Loading Text */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-8"
                >
                    <div className="w-16 h-16 rounded-full bg-gray-900 flex items-center justify-center mx-auto mb-4">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        >
                            <Sparkles size={32} className="text-white" />
                        </motion.div>
                    </div>
                    <p className="text-xl font-black text-gray-900">Loading Your Analytics...</p>
                    <p className="text-sm text-gray-600 font-semibold mt-2">Crunching the numbers 📊</p>
                </motion.div>
            </div>
        );
    }

    // Error State
    if (error) {
        return (
            <div className="p-6 min-h-screen flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-300 rounded-3xl p-12 text-center max-w-md shadow-2xl"
                >
                    <div className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center mx-auto mb-6">
                        <Activity size={40} className="text-white" strokeWidth={2.5} />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 mb-3">
                        Failed to Load Analytics
                    </h2>
                    <p className="text-sm text-gray-700 font-semibold mb-6">
                        {error}
                    </p>
                    <button
                        onClick={handleRefresh}
                        className="px-8 py-4 bg-gradient-to-r from-gray-900 to-black text-white rounded-xl font-black hover:shadow-xl transition-all flex items-center gap-2 mx-auto"
                    >
                        <RefreshCw size={20} />
                        Try Again
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50"
        >
            {/* Hero Header */}
            <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-6 pb-8 shadow-2xl">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between flex-wrap gap-4"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-xl flex items-center justify-center border border-white/20">
                                <BarChart3 size={32} className="text-white" strokeWidth={2.5} />
                            </div>
                            <div>
                                <h1 className="text-4xl font-black mb-2 flex items-center gap-3">
                                    Analytics Dashboard
                                    <span className="text-2xl">📊</span>
                                </h1>
                                <p className="text-gray-300 font-semibold">
                                    Comprehensive insights into your learning journey
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Time Range Selector */}
                            <select
                                value={timeRange}
                                onChange={(e) => setTimeRange(Number(e.target.value))}
                                className="px-5 py-3 bg-white/10 backdrop-blur-xl border-2 border-white/20 rounded-xl font-bold text-white focus:outline-none focus:ring-2 focus:ring-white/50 hover:bg-white/20 transition-all cursor-pointer"
                            >
                                <option value={7} className="text-gray-900">Last 7 Days</option>
                                <option value={30} className="text-gray-900">Last 30 Days</option>
                                <option value={90} className="text-gray-900">Last 90 Days</option>
                                <option value={365} className="text-gray-900">This Year</option>
                            </select>

                            {/* Refresh Button */}
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleRefresh}
                                disabled={refreshing}
                                className="p-3 bg-white/10 backdrop-blur-xl border-2 border-white/20 rounded-xl hover:bg-white/20 transition-all disabled:opacity-50"
                            >
                                <motion.div
                                    animate={refreshing ? { rotate: 360 } : {}}
                                    transition={{ duration: 1, repeat: refreshing ? Infinity : 0, ease: "linear" }}
                                >
                                    <RefreshCw size={20} className="text-white" strokeWidth={2.5} />
                                </motion.div>
                            </motion.button>

                            {/* Export Button */}
                            <ExportButton
                                data={{
                                    stats,
                                    quizSessions,
                                    studySessions,
                                    subjectPerformance,
                                    weeklyActivity
                                }}
                                timeRange={timeRange}
                            />
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto p-6 space-y-8 pb-24">
                {/* Quick Stats Section */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <QuickStatsGrid stats={stats} />
                </motion.section>

                {/* Goal Tracker Section */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <GoalTracker
                        goals={goals}
                        currentStats={stats}
                        onUpdateGoal={updateGoal}
                    />
                </motion.section>

                {/* Divider */}
                <div className="relative py-4">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t-2 border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center">
                        <span className="px-6 py-2 bg-gray-900 text-white text-xs font-black uppercase tracking-widest rounded-full">
                            Performance Analytics
                        </span>
                    </div>
                </div>

                {/* Study Time & Performance Charts */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <SectionHeader
                        icon={TrendingUp}
                        title="Study Trends"
                        subtitle="Track your study patterns and performance over time"
                        delay={0.3}
                    />
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <StudyTimeLineChart data={weeklyActivity} timeRange={timeRange} />
                        <PerformanceRadarChart data={subjectPerformance} />
                    </div>
                </motion.section>

                {/* Activity Heatmap */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <SectionHeader
                        icon={Activity}
                        title="Activity Calendar"
                        subtitle="Visualize your daily study consistency"
                        delay={0.4}
                    />
                    <ActivityHeatmap sessions={studySessions} timeRange={timeRange} />
                </motion.section>

                {/* Weekly Progress & Top Subjects */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                >
                    <SectionHeader
                        icon={Calendar}
                        title="Weekly Overview"
                        subtitle="Your progress and achievements this week"
                        delay={0.5}
                    />
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <WeeklyProgressChart data={weeklyActivity} />
                        <TopPerformingSubjects data={subjectPerformance} />
                    </div>
                </motion.section>

                {/* Divider */}
                <div className="relative py-4">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t-2 border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center">
                        <span className="px-6 py-2 bg-gray-900 text-white text-xs font-black uppercase tracking-widest rounded-full">
                            Subject Details
                        </span>
                    </div>
                </div>

                {/* Subject Mastery Grid */}
                {subjectPerformance.length > 0 && (
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                    >
                        <SectionHeader
                            icon={BookOpen}
                            title="Subject Mastery"
                            subtitle={`Detailed breakdown across ${subjectPerformance.length} subjects`}
                            delay={0.6}
                        />
                        <SubjectMasteryGrid performance={subjectPerformance} />
                    </motion.section>
                )}

                {/* Divider */}
                <div className="relative py-4">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t-2 border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center">
                        <span className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-black uppercase tracking-widest rounded-full flex items-center gap-2">
                            <Sparkles size={14} />
                            AI Powered
                        </span>
                    </div>
                </div>

                {/* AI Learning Insights */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                >
                    <LearningInsights
                        quizSessions={quizSessions}
                        studySessions={studySessions}
                        subjectPerformance={subjectPerformance}
                    />
                </motion.section>

                {/* Recent Activity Feed */}
                {recentActivity.length > 0 && (
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 }}
                    >
                        <SectionHeader
                            icon={Clock}
                            title="Recent Activity"
                            subtitle="Your latest learning actions"
                            delay={0.8}
                        />
                        <RecentActivityFeed activities={recentActivity} />
                    </motion.section>
                )}

                {/* Footer Summary */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9 }}
                    className="mt-12 p-8 bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white rounded-3xl border-2 border-gray-700 shadow-2xl"
                >
                    <div className="text-center">
                        <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
                            <Trophy size={32} className="text-white" />
                        </div>
                        <h3 className="text-2xl font-black mb-2">
                            Keep Up The Amazing Work! 🎉
                        </h3>
                        <p className="text-gray-300 font-semibold mb-6">
                            You've completed <span className="text-white font-black">{stats.totalQuizzes}</span> quizzes
                            and studied for <span className="text-white font-black">{stats.totalStudyTime}</span> hours.
                            That's dedication! 💪
                        </p>
                        <div className="flex items-center justify-center gap-4 flex-wrap">
                            <div className="px-6 py-3 bg-white/10 rounded-xl border border-white/20">
                                <p className="text-sm text-gray-400 font-semibold">Current Streak</p>
                                <p className="text-2xl font-black">{stats.streak} days 🔥</p>
                            </div>
                            <div className="px-6 py-3 bg-white/10 rounded-xl border border-white/20">
                                <p className="text-sm text-gray-400 font-semibold">Avg Accuracy</p>
                                <p className="text-2xl font-black">{stats.accuracy}% 🎯</p>
                            </div>
                            <div className="px-6 py-3 bg-white/10 rounded-xl border border-white/20">
                                <p className="text-sm text-gray-400 font-semibold">Total XP</p>
                                <p className="text-2xl font-black">{(stats.totalQuizzes * 50 + stats.totalDocuments * 25).toLocaleString()} ⚡</p>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
};

export default StudentAnalytics;
