// src/pages/Analytics.jsx - WITH FULL BIGQUERY INTEGRATION ✨
import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3, TrendingUp, Clock, Target, Award, Zap, BookOpen, Brain,
  TrendingDown, RefreshCw, Calendar, Flame, Star, AlertTriangle,
  CheckCircle2, Activity, Sparkles, Rocket, Eye, ArrowUpRight, ArrowDownRight,
  Trophy, Timer, Shield, Users, FileText, Layers, ChevronRight, Folder, Database
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

import { useAuth } from '@/contexts/AuthContext';
import { useCompleteAnalytics, useRecommendations, useGamification } from '@/hooks/useAnalytics';
import LevelProgress from '@/components/gamification/LevelProgress';
import BadgeCard from '@/components/gamification/BadgeCard';
import SubjectAnalytics from '@/components/analytics/SubjectAnalytics';
import toast from 'react-hot-toast';

// ==========================================
// APPLE DESIGN SYSTEM COLORS
// ==========================================
const APPLE_COLORS = {
  blue: '#007AFF',
  green: '#34C759',
  indigo: '#5856D6',
  orange: '#FF9500',
  pink: '#FF2D55',
  purple: '#AF52DE',
  red: '#FF3B30',
  teal: '#5AC8FA',
  yellow: '#FFCC00',
  gray: '#8E8E93',
  gray2: '#AEAEB2',
  gray3: '#C7C7CC',
  gray4: '#D1D1D6',
  gray5: '#E5E5EA',
  gray6: '#F2F2F7'
};

// ==========================================
// CUSTOM TOOLTIP - APPLE STYLE
// ==========================================
const CustomTooltip = memo(({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -5 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="bg-white/90 dark:bg-gray-900/95 backdrop-blur-2xl border border-black/10 dark:border-white/10 rounded-2xl p-4 shadow-2xl"
    >
      <p className="text-gray-900 dark:text-white font-semibold text-sm mb-2">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center justify-between gap-4 text-xs">
          <span className="text-gray-600 dark:text-gray-400 font-medium">{entry.name}</span>
          <span className="font-bold tabular-nums" style={{ color: entry.color }}>
            {typeof entry.value === 'number' ? entry.value.toFixed(0) : entry.value}
          </span>
        </div>
      ))}
    </motion.div>
  );
});

CustomTooltip.displayName = 'CustomTooltip';

// ==========================================
// SKELETON LOADER - APPLE STYLE
// ==========================================
const SkeletonCard = memo(() => (
  <div className="bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-3xl p-6 border border-black/5 dark:border-white/10 animate-pulse">
    <div className="flex items-start justify-between mb-5">
      <div className="w-14 h-14 rounded-2xl bg-gray-200 dark:bg-white/10" />
      <div className="w-20 h-7 rounded-full bg-gray-200 dark:bg-white/10" />
    </div>
    <div className="space-y-3">
      <div className="h-3 bg-gray-200 dark:bg-white/10 rounded-full w-24" />
      <div className="h-10 bg-gray-200 dark:bg-white/10 rounded-xl w-32" />
      <div className="h-3 bg-gray-200 dark:bg-white/10 rounded-full w-36" />
    </div>
  </div>
));

SkeletonCard.displayName = 'SkeletonCard';

// ==========================================
// EMPTY STATE - APPLE STYLE
// ==========================================
const EmptyState = memo(({ icon: Icon, title, description, actionLabel, onAction }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center justify-center py-16 text-center"
  >
    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-white/5 dark:to-white/10 flex items-center justify-center mb-5 shadow-lg">
      <Icon size={36} className="text-gray-400 dark:text-white/40" strokeWidth={1.5} />
    </div>
    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
    <p className="text-sm text-gray-500 dark:text-white/60 mb-6 max-w-xs leading-relaxed">{description}</p>
    {onAction && (
      <button
        onClick={onAction}
        className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-full text-sm font-semibold transition-all shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 active:scale-95"
      >
        {actionLabel}
      </button>
    )}
  </motion.div>
));

EmptyState.displayName = 'EmptyState';

// ==========================================
// BIGQUERY STATUS INDICATOR
// ==========================================
const BigQueryStatus = memo(({ isConnected, lastSync }) => (
  <motion.div
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    className="flex items-center gap-2 px-4 py-2 bg-white/60 dark:bg-white/10 backdrop-blur-xl border border-black/10 dark:border-white/20 rounded-full text-xs font-semibold"
  >
    <Database size={14} className={isConnected ? "text-green-500" : "text-gray-400"} strokeWidth={2.5} />
    <span className="text-gray-700 dark:text-white/80">
      {isConnected ? 'BigQuery Active' : 'Firestore Only'}
    </span>
    {lastSync && (
      <span className="text-gray-500 dark:text-white/50">
        • {new Date(lastSync).toLocaleTimeString()}
      </span>
    )}
  </motion.div>
));

BigQueryStatus.displayName = 'BigQueryStatus';

// ==========================================
// INSIGHT CARD
// ==========================================
const InsightCard = memo(({ icon: Icon, title, value, color = 'blue' }) => {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    green: 'bg-green-500/10 text-green-600 dark:text-green-400',
    orange: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
    purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl p-5 border border-black/5 dark:border-white/10 hover:border-black/10 dark:hover:border-white/20 transition-all shadow-lg"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl ${colorClasses[color]} flex items-center justify-center`}>
          <Icon size={18} strokeWidth={2.5} />
        </div>
        <p className="text-xs font-semibold text-gray-500 dark:text-white/50 uppercase tracking-wide">{title}</p>
      </div>
      <p className="text-3xl font-bold text-gray-900 dark:text-white tabular-nums tracking-tight">{value}</p>
    </motion.div>
  );
});

InsightCard.displayName = 'InsightCard';

// ==========================================
// CHART CONTAINER
// ==========================================
const ChartContainer = memo(({ title, subtitle, children, delay = 0, icon: Icon }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    className="bg-white/60 dark:bg-white/5 backdrop-blur-2xl rounded-3xl p-7 border border-black/5 dark:border-white/10 shadow-lg shadow-black/5 dark:shadow-black/20"
  >
    <div className="flex items-center gap-3 mb-8">
      {Icon && (
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-white/10 dark:to-white/5 flex items-center justify-center">
          <Icon size={20} className="text-gray-700 dark:text-white/80" strokeWidth={2.5} />
        </div>
      )}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white tracking-tight">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500 dark:text-white/50 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {children}
  </motion.div>
));

ChartContainer.displayName = 'ChartContainer';

// ==========================================
// SUBJECT FOLDER CARD
// ==========================================
const SubjectFolderCard = memo(({ subject, onClick }) => {
  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400 bg-green-500/10';
    if (score >= 60) return 'text-orange-600 dark:text-orange-400 bg-orange-500/10';
    return 'text-red-600 dark:text-red-400 bg-red-500/10';
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl p-5 border border-black/5 dark:border-white/10 hover:border-black/10 dark:hover:border-white/20 transition-all shadow-lg cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
            <Folder size={20} className="text-blue-600 dark:text-blue-400" strokeWidth={2.5} />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
              {subject.fullName || subject.name}
            </h4>
            <p className="text-xs text-gray-500 dark:text-white/50">
              {subject.quizCount || 0} quiz{(subject.quizCount || 0) !== 1 ? 'zes' : ''}
            </p>
          </div>
        </div>
        <ChevronRight size={18} className="text-gray-400 dark:text-white/40 group-hover:translate-x-1 transition-transform" strokeWidth={2.5} />
      </div>

      <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl ${getScoreColor(subject.score || 0)}`}>
        <Target size={14} strokeWidth={2.5} />
        <span className="text-sm font-bold tabular-nums">{(subject.score || 0).toFixed(0)}%</span>
      </div>
    </motion.div>
  );
});

SubjectFolderCard.displayName = 'SubjectFolderCard';

// ==========================================
// HELPERS
// ==========================================
const calculateTrend = (current, previous) => {
  if (!previous || previous === 0) return { direction: null, value: '0%' };
  const change = ((current - previous) / previous) * 100;
  return {
    direction: change > 0 ? 'up' : change < 0 ? 'down' : null,
    value: `${change > 0 ? '+' : ''}${change.toFixed(1)}%`
  };
};

const formatStudyTime = (totalMinutes) => {
  if (!totalMinutes) return { hours: 0, minutes: 0, display: '0h 0m' };
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return { hours, minutes, display: `${hours}h ${minutes}m` };
};

// ==========================================
// METRIC CARD
// ==========================================
const MetricCard = memo(({
  icon: Icon,
  title,
  value,
  subtitle,
  trend,
  trendValue,
  delay = 0,
  color = 'blue',
  source = 'firestore'
}) => {
  const colorClasses = {
    blue: 'from-blue-500/20 to-blue-600/20 border-blue-500/20',
    green: 'from-green-500/20 to-green-600/20 border-green-500/20',
    orange: 'from-orange-500/20 to-orange-600/20 border-orange-500/20',
    purple: 'from-purple-500/20 to-purple-600/20 border-purple-500/20',
  };

  const iconColorClasses = {
    blue: 'text-blue-500',
    green: 'text-green-500',
    orange: 'text-orange-500',
    purple: 'text-purple-500',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="group relative"
    >
      <div className="relative bg-white/60 dark:bg-white/5 backdrop-blur-2xl rounded-3xl p-6 border border-black/5 dark:border-white/10 hover:bg-white/80 dark:hover:bg-white/[0.07] transition-all duration-300 shadow-lg shadow-black/5 dark:shadow-black/20 hover:shadow-xl hover:shadow-black/10 dark:hover:shadow-black/30 hover:-translate-y-1">

        <div className="flex items-start justify-between mb-6">
          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
            <Icon size={24} className={`${iconColorClasses[color]}`} strokeWidth={2.5} />
          </div>

          {trend && (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${trend === 'up'
                ? 'bg-green-500/15 dark:bg-green-500/20 text-green-600 dark:text-green-400'
                : trend === 'down'
                  ? 'bg-red-500/15 dark:bg-red-500/20 text-red-600 dark:text-red-400'
                  : 'bg-gray-500/15 dark:bg-gray-500/20 text-gray-600 dark:text-gray-400'
              }`}>
              {trend === 'up' ? <ArrowUpRight size={14} strokeWidth={3} /> :
                trend === 'down' ? <ArrowDownRight size={14} strokeWidth={3} /> : null}
              <span className="tabular-nums">{trendValue}</span>
            </div>
          )}
        </div>

        <div className="flex items-start justify-between">
          <div>
            <p className="text-gray-500 dark:text-white/50 text-xs font-semibold mb-2 uppercase tracking-wide">{title}</p>
            <p className="text-4xl font-bold text-gray-900 dark:text-white mb-2 tabular-nums tracking-tight">{value}</p>
            <p className="text-gray-600 dark:text-white/60 text-sm font-medium">{subtitle}</p>
          </div>
          
          {source === 'bigquery' && (
            <div className="px-2 py-1 bg-blue-500/10 rounded-lg" title="Powered by BigQuery">
              <Database size={12} className="text-blue-600 dark:text-blue-400" />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
});

MetricCard.displayName = 'MetricCard';

// ==========================================
// MAIN COMPONENT
// ==========================================
const Analytics = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [timeframe, setTimeframe] = useState(30);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [previousTimeframe, setPreviousTimeframe] = useState(60);
  const [bigQueryConnected, setBigQueryConnected] = useState(false);
  const [lastBigQuerySync, setLastBigQuerySync] = useState(null);

  const {
    level, xp, nextLevelXp, badges, achievements, streak, loading: gamificationLoading
  } = useGamification(user?.uid);

  const {
    analytics, quizPerformance, studyTime, patterns, trends, streaks,
    performance, weakAreas, loading, error, refetchAll,
  } = useCompleteAnalytics(user?.uid, timeframe);

  const {
    studyTime: prevStudyTime,
    quizPerformance: prevQuizPerformance,
    streaks: prevStreaks,
    analytics: prevAnalytics
  } = useCompleteAnalytics(user?.uid, previousTimeframe);

  const { recommendations } = useRecommendations(user?.uid);

  // Check BigQuery connection
  useEffect(() => {
    if (analytics?.bigQuery) {
      setBigQueryConnected(true);
      setLastBigQuerySync(analytics.bigQuery.lastSync || Date.now());
    }
  }, [analytics]);

  useEffect(() => setPreviousTimeframe(timeframe * 2), [timeframe]);
  useEffect(() => {
    if (!user?.uid) navigate('/auth');
  }, [user?.uid, navigate]);

  // Calculated data with BigQuery priority
  const calculatedData = useMemo(() => {
    const totalMinutes = analytics?.bigQuery?.totalStudyMinutes || studyTime?.totalMinutes || 0;
    const prevTotalMinutes = prevAnalytics?.bigQuery?.totalStudyMinutes || prevStudyTime?.totalMinutes || totalMinutes;
    const avgScore = analytics?.bigQuery?.averageScore || quizPerformance?.averageScore || 0;
    const prevAvgScore = prevAnalytics?.bigQuery?.averageScore || prevQuizPerformance?.averageScore || avgScore;
    const currentStreak = streak ?? streaks?.currentStreak ?? 0;
    const prevCurrentStreak = prevStreaks?.currentStreak ?? currentStreak;
    const totalXP = analytics?.bigQuery?.totalXP || xp || 0;
    const prevTotalXP = prevAnalytics?.bigQuery?.totalXP || totalXP;
    const userLevel = analytics?.bigQuery?.level || level || 1;
    const nextLevelXPValue = analytics?.bigQuery?.nextLevelXP || nextLevelXp || 1000;
    const levelProgress = nextLevelXPValue > 0 ? Number(((totalXP / nextLevelXPValue) * 100).toFixed(1)) : 0;

    return {
      studyTime: formatStudyTime(totalMinutes),
      studyTimeTrend: calculateTrend(totalMinutes, prevTotalMinutes),
      avgScore,
      scoreTrend: calculateTrend(avgScore, prevAvgScore),
      currentStreak,
      streakTrend: calculateTrend(currentStreak, prevCurrentStreak),
      totalXP,
      xpTrend: calculateTrend(totalXP, prevTotalXP),
      level: userLevel,
      nextLevelXP: nextLevelXPValue,
      levelProgress,
      totalMinutes,
      sessionCount: analytics?.bigQuery?.sessionCount || studyTime?.sessionCount || 0,
      avgSessionLength: analytics?.bigQuery?.avgSessionLength || studyTime?.averageSessionLength || 0,
      badgeCount: Array.isArray(badges) ? badges.length : 0,
      achievementCount: Array.isArray(achievements) ? achievements.length : 0,
      totalQuizzes: analytics?.bigQuery?.totalQuizzes || quizPerformance?.totalQuizzes || 0,
      totalCorrect: quizPerformance?.totalCorrect || 0,
      accuracy: quizPerformance?.accuracy || 0,
      dataSource: analytics?.bigQuery ? 'bigquery' : 'firestore'
    };
  }, [
    studyTime, prevStudyTime, quizPerformance, prevQuizPerformance,
    streaks, prevStreaks, analytics, prevAnalytics, xp, level,
    nextLevelXp, streak, badges, achievements
  ]);

  // Chart data with BigQuery priority
  const chartData = useMemo(() => {
    const trendsData = analytics?.bigQuery?.trends || trends || [];
    
    const studyTimeData = Array.isArray(trendsData)
      ? trendsData.slice(0, 7).reverse().map((t, i) => ({
        date: t.date ? (t.date.toMillis ? new Date(t.date.toMillis()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })) : `Day ${i + 1}`,
        minutes: t.studyMinutes || 0,
        quizzes: t.quizzesCompleted || 0,
        score: t.avgScore || 0
      }))
      : [];

    const performanceData = analytics?.bigQuery?.subjectPerformance || performance || [];
    const subjectData = Array.isArray(performanceData)
      ? performanceData
        .reduce((acc, p) => {
          const existingSubject = acc.find(item => item.fullName === p.name);
          if (existingSubject) {
            existingSubject.score = (existingSubject.score + (p.score || 0)) / 2;
            existingSubject.quizCount += p.quizCount || 0;
          } else {
            acc.push({
              subject: (p.name || 'Subject').substring(0, 15),
              fullName: p.name || 'Unknown',
              score: p.score || 0,
              quizCount: p.quizCount || 0,
              folder: p.folder || 'Uncategorized'
            });
          }
          return acc;
        }, [])
        .slice(0, 6)
      : [];

    const xpDistribution = [
      { name: 'Quizzes', value: analytics?.bigQuery?.xpFromQuizzes || 0 },
      { name: 'Study', value: analytics?.bigQuery?.xpFromStudy || 0 },
      { name: 'Achievements', value: analytics?.bigQuery?.xpFromAchievements || 0 },
      { name: 'Flashcards', value: analytics?.bigQuery?.xpFromFlashcards || 0 }
    ].filter(item => item.value > 0);

    const radarData = Array.isArray(performanceData)
      ? performanceData.slice(0, 5).map(p => ({
        subject: (p.name || 'Subject').substring(0, 10),
        score: p.score || 0
      }))
      : [];

    return { studyTimeData, subjectData, xpDistribution, radarData };
  }, [trends, performance, analytics]);

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    try {
      setIsRefreshing(true);
      await refetchAll?.();
      setLastBigQuerySync(Date.now());
      
      toast.success(bigQueryConnected ? 'Analytics refreshed from BigQuery' : 'Analytics refreshed', {
        icon: bigQueryConnected ? '📊' : '✓',
        style: {
          background: '#000',
          color: '#fff',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.1)',
          fontSize: '14px',
          fontWeight: '600'
        },
        duration: 2000,
      });
    } catch (err) {
      console.error('Refresh error:', err);
      toast.error('Failed to refresh');
    } finally {
      setIsRefreshing(false);
    }
  }, [refetchAll, bigQueryConnected]);

  // Loading state
  if (loading || gamificationLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 via-gray-100 to-gray-200 dark:from-gray-950 dark:via-gray-900 dark:to-black">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="mb-8">
            <div className="h-10 w-56 bg-gray-200 dark:bg-white/10 rounded-2xl animate-pulse mb-3" />
            <div className="h-5 w-40 bg-gray-200 dark:bg-white/5 rounded-xl animate-pulse" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
          <div className="grid lg:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 via-gray-100 to-gray-200 dark:from-gray-950 dark:via-gray-900 dark:to-black flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-3xl p-10 max-w-md w-full text-center border border-black/5 dark:border-white/10 shadow-2xl"
        >
          <div className="w-20 h-20 rounded-3xl bg-red-500/10 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle size={36} className="text-red-500" strokeWidth={2} />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">Unable to Load</h2>
          <p className="text-gray-600 dark:text-white/60 mb-8 text-sm leading-relaxed">
            {typeof error === 'string' ? error : 'Something went wrong loading your analytics data.'}
          </p>
          <button
            onClick={handleRefresh}
            className="w-full px-6 py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-semibold transition-all shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 active:scale-95"
          >
            Try Again
          </button>
        </motion.div>
      </div>
    );
  }

  const CHART_COLORS = [APPLE_COLORS.blue, APPLE_COLORS.green, APPLE_COLORS.orange, APPLE_COLORS.red, APPLE_COLORS.purple, APPLE_COLORS.pink];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-gray-100 to-gray-200 dark:from-gray-950 dark:via-gray-900 dark:to-black">
      {/* HEADER */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/80 dark:bg-black/60 backdrop-blur-2xl border-b border-black/5 dark:border-white/10 sticky top-0 z-50 shadow-sm"
      >
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">Analytics</h1>
              <p className="text-gray-600 dark:text-white/60 text-sm flex items-center gap-2 font-medium">
                <Activity size={16} strokeWidth={2.5} />
                Real-time learning insights
                {bigQueryConnected && <span className="text-blue-600 dark:text-blue-400">• Powered by BigQuery</span>}
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <BigQueryStatus isConnected={bigQueryConnected} lastSync={lastBigQuerySync} />

              <select
                value={timeframe}
                onChange={(e) => setTimeframe(Number(e.target.value))}
                className="px-5 py-3 bg-white/60 dark:bg-white/10 backdrop-blur-xl border border-black/10 dark:border-white/20 rounded-2xl font-semibold text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all cursor-pointer shadow-sm"
              >
                <option value={7} className="bg-white dark:bg-gray-900">Last 7 Days</option>
                <option value={30} className="bg-white dark:bg-gray-900">Last 30 Days</option>
                <option value={90} className="bg-white dark:bg-gray-900">Last 90 Days</option>
                <option value={365} className="bg-white dark:bg-gray-900">This Year</option>
              </select>

              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-3 bg-white/60 dark:bg-white/10 backdrop-blur-xl text-gray-900 dark:text-white rounded-2xl hover:bg-white/80 dark:hover:bg-white/15 transition-all disabled:opacity-50 border border-black/10 dark:border-white/20 shadow-sm active:scale-95"
                title="Refresh analytics"
              >
                <RefreshCw
                  size={20}
                  strokeWidth={2.5}
                  className={isRefreshing ? 'animate-spin' : ''}
                />
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* MAIN CONTENT */}
      <div className="max-w-7xl mx-auto px-6 py-10">

        {/* METRIC CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <MetricCard
            icon={Clock}
            title="Study Time"
            value={calculatedData.studyTime.display}
            subtitle={`${calculatedData.sessionCount} session${calculatedData.sessionCount !== 1 ? 's' : ''}`}
            trend={calculatedData.studyTimeTrend.direction}
            trendValue={calculatedData.studyTimeTrend.value}
            delay={0}
            color="blue"
            source={calculatedData.dataSource}
          />
          <MetricCard
            icon={Target}
            title="Quiz Score"
            value={`${calculatedData.avgScore.toFixed(0)}%`}
            subtitle={
              calculatedData.avgScore >= 80 ? 'Excellent!' :
                calculatedData.avgScore >= 60 ? 'Good progress' :
                  'Keep practicing'
            }
            trend={calculatedData.scoreTrend.direction}
            trendValue={calculatedData.scoreTrend.value}
            delay={0.1}
            color="green"
            source={calculatedData.dataSource}
          />
          <MetricCard
            icon={Flame}
            title="Streak"
            value={`${calculatedData.currentStreak} Day${calculatedData.currentStreak !== 1 ? 's' : ''}`}
            subtitle={
              calculatedData.currentStreak >= 7 ? 'On Fire! 🔥' :
                calculatedData.currentStreak >= 3 ? 'Keep it up!' :
                  'Build momentum'
            }
            trend={calculatedData.streakTrend.direction}
            trendValue={calculatedData.streakTrend.value}
            delay={0.2}
            color="orange"
            source={calculatedData.dataSource}
          />
          <MetricCard
            icon={Zap}
            title="Total XP"
            value={calculatedData.totalXP.toLocaleString()}
            subtitle={`Level ${calculatedData.level}`}
            trend={calculatedData.xpTrend.direction}
            trendValue={calculatedData.xpTrend.value}
            delay={0.3}
            color="purple"
            source={calculatedData.dataSource}
          />
        </div>

        {/* QUICK INSIGHTS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-10">
          <InsightCard icon={Timer} title="Daily Avg" value={`${Math.round(calculatedData.totalMinutes / (timeframe || 30))}m`} color="blue" />
          <InsightCard icon={Trophy} title="Achievements" value={calculatedData.achievementCount} color="green" />
          <InsightCard icon={Shield} title="Badges" value={calculatedData.badgeCount} color="orange" />
          <InsightCard icon={TrendingUp} title="Accuracy" value={`${calculatedData.accuracy}%`} color="purple" />
        </div>

        {/* LEVEL PROGRESS */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-10"
        >
          <LevelProgress
            level={calculatedData.level}
            currentXP={calculatedData.totalXP}
            nextLevelXP={calculatedData.nextLevelXP}
            levelProgress={calculatedData.levelProgress}
          />
        </motion.div>

        {/* CHARTS SECTION */}
        <div className="grid lg:grid-cols-2 gap-6 mb-10">
          {/* Study Time Trend */}
          <ChartContainer title="Study Activity" subtitle="Last 7 days" delay={0.5} icon={BarChart3}>
            {chartData.studyTimeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={chartData.studyTimeData}>
                  <defs>
                    <linearGradient id="colorStudyApple" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={APPLE_COLORS.blue} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={APPLE_COLORS.blue} stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" className="dark:stroke-white/5" />
                  <XAxis
                    dataKey="date"
                    stroke="rgba(0,0,0,0.3)"
                    className="dark:stroke-white/30"
                    tick={{ fill: 'rgba(0,0,0,0.5)', fontSize: 12, fontWeight: 500 }}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="rgba(0,0,0,0.3)"
                    className="dark:stroke-white/30"
                    tick={{ fill: 'rgba(0,0,0,0.5)', fontSize: 12, fontWeight: 500 }}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="minutes"
                    stroke={APPLE_COLORS.blue}
                    strokeWidth={3}
                    fill="url(#colorStudyApple)"
                    name="Minutes"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                icon={Clock}
                title="No Study Data"
                description="Start studying to see your activity"
                actionLabel="Upload Document"
                onAction={() => navigate('/dashboard?tab=documents')}
              />
            )}
          </ChartContainer>

          {/* Subject Performance */}
          <ChartContainer title="Subject Performance" subtitle="Top 6 subjects" delay={0.6} icon={BookOpen}>
            {chartData.subjectData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData.subjectData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" className="dark:stroke-white/5" />
                  <XAxis
                    dataKey="subject"
                    stroke="rgba(0,0,0,0.3)"
                    className="dark:stroke-white/30"
                    tick={{ fill: 'rgba(0,0,0,0.5)', fontSize: 11, fontWeight: 500 }}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="rgba(0,0,0,0.3)"
                    className="dark:stroke-white/30"
                    tick={{ fill: 'rgba(0,0,0,0.5)', fontSize: 12, fontWeight: 500 }}
                    tickLine={false}
                    domain={[0, 100]}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="score"
                    fill={APPLE_COLORS.green}
                    radius={[12, 12, 0, 0]}
                    name="Score %"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                icon={BookOpen}
                title="No Subject Data"
                description="Take quizzes to track performance"
                actionLabel="Take Quiz"
                onAction={() => navigate('/dashboard?tab=quizzes')}
              />
            )}
          </ChartContainer>

          {/* XP Distribution */}
          <ChartContainer title="XP Sources" subtitle="Experience distribution" delay={0.7} icon={Zap}>
            {chartData.xpDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={chartData.xpDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={90}
                    fill="#8884d8"
                    dataKey="value"
                    stroke="none"
                  >
                    {chartData.xpDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon={Zap} title="No XP Data" description="Complete activities to earn XP" />
            )}
          </ChartContainer>

          {/* Subject Radar */}
          <ChartContainer title="Subject Mastery" subtitle="Skill distribution" delay={0.8} icon={Brain}>
            {chartData.radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData.radarData}>
                  <PolarGrid stroke="rgba(0,0,0,0.1)" className="dark:stroke-white/10" />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fill: 'rgba(0,0,0,0.6)', fontSize: 12, fontWeight: 500 }}
                    className="dark:fill-white/60"
                  />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 100]}
                    tick={{ fill: 'rgba(0,0,0,0.4)', fontSize: 11, fontWeight: 500 }}
                    className="dark:fill-white/40"
                  />
                  <Radar
                    name="Score"
                    dataKey="score"
                    stroke={APPLE_COLORS.purple}
                    fill={APPLE_COLORS.purple}
                    fillOpacity={0.6}
                    strokeWidth={2}
                  />
                  <Tooltip content={<CustomTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon={Brain} title="No Mastery Data" description="Take quizzes in multiple subjects" />
            )}
          </ChartContainer>
        </div>

        {/* SUBJECT FOLDERS */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="bg-white/60 dark:bg-white/5 backdrop-blur-2xl rounded-3xl border border-black/5 dark:border-white/10 p-7 shadow-lg mb-10"
        >
          <div className="flex items-center gap-4 mb-7">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
              <BookOpen size={22} className="text-blue-600 dark:text-blue-400" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight">Subject Folders</h2>
              <p className="text-xs text-gray-500 dark:text-white/50 mt-1">Performance by category</p>
            </div>
          </div>

          {chartData.subjectData.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-4">
              {chartData.subjectData.map((subject, idx) => (
                <SubjectFolderCard
                  key={idx}
                  subject={subject}
                  onClick={() => navigate(`/dashboard?tab=quizzes&subject=${encodeURIComponent(subject.fullName)}`)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Folder}
              title="No Subjects Yet"
              description="Take quizzes to see subject categorization"
              actionLabel="Take Quiz"
              onAction={() => navigate('/dashboard?tab=quizzes')}
            />
          )}
        </motion.div>

        {/* BADGES & ACHIEVEMENTS */}
        {badges && badges.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
            className="bg-white/60 dark:bg-white/5 backdrop-blur-2xl rounded-3xl border border-black/5 dark:border-white/10 p-7 shadow-lg"
          >
            <div className="flex items-center gap-4 mb-7">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center">
                <Award size={22} className="text-yellow-600 dark:text-yellow-400" strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight">Badges & Achievements</h2>
                <p className="text-xs text-gray-500 dark:text-white/50 mt-1">Your milestones</p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
              {badges.slice(0, 8).map((badge, idx) => (
                <BadgeCard key={idx} badge={badge} />
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Analytics;
