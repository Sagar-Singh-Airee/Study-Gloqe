// src/pages/Analytics.jsx - FIXED VERSION (No Infinite Loops) ✨
import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3, TrendingUp, Clock, Target, Award, Zap, BookOpen, Brain,
  TrendingDown, RefreshCw, Calendar, Flame, Star, AlertTriangle,
  CheckCircle2, Activity, Sparkles, Rocket, Database, Radio,
  Trophy, Timer, Shield, Users, FileText, Layers, ChevronRight,
  Folder, Lightbulb, AlertCircle, CalendarDays, Clock4, Mic
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

import { useAuth } from '@auth/contexts/AuthContext';
import { db } from '@shared/config/firebase';
import {
  collection, query, where, onSnapshot, orderBy,
  limit, getDocs, Timestamp, doc, getDoc
} from 'firebase/firestore';
import LevelProgress from '@gamification/components/LevelProgress';
import BadgeCard from '@gamification/components/BadgeCard';
import toast from 'react-hot-toast';

// 📤 Real-time Sync for consistent data between Dashboard and Analytics
import { useAnalyticsSync } from '@shared/services/realtimeSync';



// ==================== ANIMATED GRADIENT BACKGROUND ====================
const AnimatedBackground = memo(() => (
  <div className="fixed inset-0 -z-10 overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-gray-50" />

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

    <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,.02)_1px,transparent_1px)] bg-[size:50px_50px]" />
  </div>
));

AnimatedBackground.displayName = 'AnimatedBackground';

// ==================== CUSTOM TOOLTIP ====================
const CustomTooltip = memo(({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -5 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="bg-white/95 backdrop-blur-2xl border border-slate-200 rounded-2xl p-4 shadow-2xl"
    >
      <p className="text-slate-900 font-bold text-sm mb-2">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center justify-between gap-4 text-xs">
          <span className="text-slate-600 font-medium">{entry.name}</span>
          <span className="font-black tabular-nums" style={{ color: entry.color }}>
            {typeof entry.value === 'number' ? entry.value.toFixed(0) : entry.value}
          </span>
        </div>
      ))}
    </motion.div>
  );
});

CustomTooltip.displayName = 'CustomTooltip';

// ==================== SKELETON LOADER ====================
const SkeletonCard = memo(() => (
  <div className="relative bg-white/40 backdrop-blur-2xl border border-white/60 rounded-3xl p-6 overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2.5s_infinite] bg-gradient-to-r from-transparent via-white/80 to-transparent" />
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-slate-200 to-slate-300 rounded-2xl animate-pulse" />
        <div className="h-3 w-24 bg-gradient-to-r from-slate-200 to-slate-300 rounded-full animate-pulse" />
      </div>
      <div className="h-10 w-32 bg-gradient-to-r from-slate-200 to-slate-300 rounded-2xl animate-pulse" />
    </div>
  </div>
));

SkeletonCard.displayName = 'SkeletonCard';

// ==================== PREMIUM METRIC CARD ====================
const MetricCard = memo(({
  icon: Icon,
  title,
  value,
  subtitle,
  trend,
  trendValue,
  delay = 0,
  color = 'blue',
  realtime = false,
  onClick
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const colorMap = {
    'blue': { gradient: 'from-blue-500 to-cyan-500', glow: 'group-hover:shadow-blue-500/25' },
    'green': { gradient: 'from-green-500 to-emerald-500', glow: 'group-hover:shadow-green-500/25' },
    'orange': { gradient: 'from-orange-500 to-amber-500', glow: 'group-hover:shadow-orange-500/25' },
    'purple': { gradient: 'from-purple-500 to-pink-500', glow: 'group-hover:shadow-purple-500/25' },
    'red': { gradient: 'from-red-500 to-rose-500', glow: 'group-hover:shadow-red-500/25' },
    'indigo': { gradient: 'from-indigo-500 to-blue-500', glow: 'group-hover:shadow-indigo-500/25' },
  };

  const colors = colorMap[color] || colorMap.blue;

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
      <motion.div
        className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}
      />

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
            className={`p-3.5 bg-gradient-to-br ${colors.gradient} rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300`}
          >
            <Icon size={24} className="text-white" strokeWidth={2.5} />
          </motion.div>
          <div className="flex-1">
            <div className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">{title}</div>
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
          <p className="text-sm text-slate-600 font-medium">{subtitle}</p>
          {trend && trendValue && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl ${trend === 'up' ? 'bg-emerald-50 text-emerald-600' :
                trend === 'down' ? 'bg-rose-50 text-rose-600' :
                  'bg-slate-50 text-slate-600'
                }`}
            >
              {trend === 'up' ? <TrendingUp size={14} strokeWidth={3} /> :
                trend === 'down' ? <TrendingDown size={14} strokeWidth={3} /> : null}
              <span className="text-xs font-black">{trendValue}</span>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
});

MetricCard.displayName = 'MetricCard';

// ==================== INSIGHT CARD ====================
const InsightCard = memo(({ icon: Icon, title, value, color = 'blue' }) => {
  const colorClasses = {
    blue: 'from-blue-500 to-cyan-500',
    green: 'from-green-500 to-emerald-500',
    orange: 'from-orange-500 to-amber-500',
    purple: 'from-purple-500 to-pink-500',
    pink: 'from-pink-500 to-rose-500',
    cyan: 'from-cyan-500 to-blue-500',
    indigo: 'from-indigo-500 to-purple-500',
    yellow: 'from-yellow-500 to-orange-500',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.05 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="bg-white/40 backdrop-blur-2xl border border-white/60 rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all"
    >
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center mb-3 shadow-lg`}>
        <Icon size={20} className="text-white" strokeWidth={2.5} />
      </div>
      <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2">{title}</p>
      <p className="text-2xl font-black text-slate-800 tabular-nums">{value}</p>
    </motion.div>
  );
});

InsightCard.displayName = 'InsightCard';

// ==================== CHART CONTAINER ====================
const ChartContainer = memo(({ title, subtitle, children, delay = 0, icon: Icon }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    className="bg-white/40 backdrop-blur-2xl border border-white/60 rounded-3xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.06)] hover:shadow-[0_20px_60px_rgba(0,0,0,0.12)] transition-all duration-500"
  >
    <div className="flex items-center gap-3 mb-8">
      {Icon && (
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center shadow-lg">
          <Icon size={22} className="text-slate-700" strokeWidth={2.5} />
        </div>
      )}
      <div>
        <h3 className="text-xl font-black text-slate-800">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 mt-1 font-medium">{subtitle}</p>}
      </div>
    </div>
    {children}
  </motion.div>
));

ChartContainer.displayName = 'ChartContainer';

// ==================== EMPTY STATE ====================
const EmptyState = memo(({ icon: Icon, title, description, actionLabel, onAction }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center justify-center py-16 text-center"
  >
    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mb-5 shadow-lg">
      <Icon size={36} className="text-slate-400" strokeWidth={1.5} />
    </div>
    <h3 className="text-lg font-black text-slate-800 mb-2">{title}</h3>
    <p className="text-sm text-slate-500 mb-6 max-w-xs leading-relaxed">{description}</p>
    {onAction && (
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onAction}
        className="px-6 py-3 bg-gradient-to-r from-slate-800 to-slate-700 text-white rounded-2xl text-sm font-black shadow-xl hover:shadow-2xl transition-all"
      >
        {actionLabel}
      </motion.button>
    )}
  </motion.div>
));

EmptyState.displayName = 'EmptyState';

// ==================== HELPERS ====================
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

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

// ==================== CUSTOM HOOKS (FIXED) ====================

// Real-time study session listener (FIXED - No index needed)
const useRealtimeStudySession = (userId) => {
  const [currentSession, setCurrentSession] = useState(null);
  const [isStudying, setIsStudying] = useState(false);

  useEffect(() => {
    if (!userId) return;

    // Simple query without composite index
    const q = query(
      collection(db, 'studySessions'),
      where('userId', '==', userId),
      where('status', '==', 'active'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        if (!snapshot.empty) {
          const session = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
          setCurrentSession(session);
          setIsStudying(true);
        } else {
          setCurrentSession(null);
          setIsStudying(false);
        }
      },
      (error) => {
        console.error('Study session listener error:', error);
        setIsStudying(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  return { currentSession, isStudying };
};

// Real-time analytics data (FIXED - using Unified Sync)
const useRealtimeAnalytics = (userId, timeframe = 30) => {
  // Use the Unified Sync hook for source-of-truth consistency
  const { metrics, raw, loading, error, refresh } = useAnalyticsSync(userId, timeframe);

  // Derived analytics specific to this page
  const data = useMemo(() => {
    // Default empty state
    const defaultData = {
      studyTime: { totalMinutes: 0, sessionCount: 0, averageSessionLength: 0 },
      quizPerformance: { averageScore: 0, totalQuizzes: 0, totalCorrect: 0, accuracy: 0 },
      streak: 0,
      level: 1,
      xp: 0,
      nextLevelXp: 1000,
      badges: [],
      weakAreas: [],
      performance: [],
      trends: []
    };

    if (loading || !metrics) return defaultData;

    // 1. Calculate Per-Subject Performance (from raw quizzes)
    const subjectStats = {};
    raw.quizSessions.forEach(quiz => {
      const subject = quiz.subject || 'General';
      if (!subjectStats[subject]) {
        subjectStats[subject] = { scores: [], count: 0 };
      }
      // score might be computed in metrics, but raw quiz might needs checking
      let score = quiz.score || 0;
      // Handle quizzes that have answers but no top-level score
      if (quiz.answers && score === 0) {
        const ans = Object.values(quiz.answers);
        if (ans.length > 0) {
          const correct = ans.filter(a => a.answer > 0).length;
          score = (correct / ans.length) * 100;
        }
      }
      subjectStats[subject].scores.push(score);
      subjectStats[subject].count++;
    });

    const performance = Object.entries(subjectStats).map(([name, data]) => ({
      name,
      score: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length),
      quizCount: data.count
    })).sort((a, b) => b.score - a.score);

    // 2. Identify Weak Areas (< 70%)
    const weakAreas = performance
      .filter(p => p.score < 70)
      .slice(0, 3);

    return {
      studyTime: metrics.studyTime,
      quizPerformance: metrics.quizPerformance,
      // ✨ THE FIX: Use the authoritative streak from RealtimeSync (User profile)
      streak: metrics.gamification.streak,
      level: metrics.gamification.level,
      xp: metrics.gamification.xp,
      nextLevelXp: 1000 - metrics.xpToNextLevel, // Approximate based on sync service
      badges: metrics.gamification.badges,
      weakAreas,
      performance,
      trends: [] // Trends would require historical snapshot comparison
    };
  }, [metrics, raw, loading]);

  const refetch = useCallback(() => {
    refresh();
  }, [refresh]);

  return { ...data, loading, error, refetch };
};

// ==================== MAIN COMPONENT ====================
const Analytics = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [timeframe, setTimeframe] = useState(30);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Real-time hooks
  const { currentSession, isStudying } = useRealtimeStudySession(user?.uid);
  const analytics = useRealtimeAnalytics(user?.uid, timeframe);
  const prevAnalytics = useRealtimeAnalytics(user?.uid, timeframe * 2);

  useEffect(() => {
    if (!user?.uid) navigate('/auth');
  }, [user?.uid, navigate]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      analytics.refetch();
      setLastUpdate(new Date());
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [analytics.refetch]); // FIXED: Depend on refetch function

  // Calculated metrics
  const metrics = useMemo(() => {
    const studyTime = formatStudyTime(analytics.studyTime.totalMinutes);
    const studyTimeTrend = calculateTrend(
      analytics.studyTime.totalMinutes,
      prevAnalytics.studyTime.totalMinutes
    );
    const scoreTrend = calculateTrend(
      analytics.quizPerformance.averageScore,
      prevAnalytics.quizPerformance.averageScore
    );
    const streakTrend = calculateTrend(analytics.streak, prevAnalytics.streak);
    const xpTrend = calculateTrend(analytics.xp, prevAnalytics.xp);

    return {
      studyTime,
      studyTimeTrend,
      avgScore: analytics.quizPerformance.averageScore,
      scoreTrend,
      streak: analytics.streak,
      streakTrend,
      xp: analytics.xp,
      xpTrend,
      level: analytics.level,
      nextLevelXp: analytics.nextLevelXp,
      levelProgress: (analytics.xp / analytics.nextLevelXp) * 100,
      sessionCount: analytics.studyTime.sessionCount,
      avgSessionLength: analytics.studyTime.averageSessionLength,
      totalQuizzes: analytics.quizPerformance.totalQuizzes,
      accuracy: analytics.quizPerformance.accuracy,
      badgeCount: analytics.badges.length
    };
  }, [analytics, prevAnalytics]);

  // Chart data
  const chartData = useMemo(() => {
    const subjectData = analytics.performance
      .slice(0, 6)
      .map(p => ({
        subject: p.name.substring(0, 15),
        fullName: p.name,
        score: p.score,
        quizCount: p.quizCount
      }));

    return { subjectData };
  }, [analytics.performance]);

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    try {
      setIsRefreshing(true);
      analytics.refetch();
      setLastUpdate(new Date());

      toast.success('Analytics refreshed', {
        icon: '✓',
        style: {
          background: 'rgba(255, 255, 255, 0.95)',
          color: '#1e293b',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(0,0,0,0.1)',
          borderRadius: '16px',
          fontSize: '14px',
          fontWeight: '700'
        },
        duration: 2000,
      });
    } catch (err) {
      console.error('Refresh error:', err);
      toast.error('Failed to refresh');
    } finally {
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  }, [analytics.refetch]);

  // Loading state
  if (analytics.loading) {
    return (
      <>
        <AnimatedBackground />
        <div className="min-h-screen relative">
          <div className="max-w-7xl mx-auto px-6 py-12">
            <div className="mb-8">
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="h-12 w-64 bg-gradient-to-r from-slate-200 to-slate-300 rounded-2xl mb-3"
              />
              <div className="h-6 w-48 bg-gradient-to-r from-slate-100 to-slate-200 rounded-xl" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          </div>
        </div>
      </>
    );
  }

  // Error state
  if (analytics.error) {
    return (
      <>
        <AnimatedBackground />
        <div className="min-h-screen flex items-center justify-center p-6 relative">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/40 backdrop-blur-2xl rounded-3xl p-10 max-w-md w-full text-center border border-white/60 shadow-2xl"
          >
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-rose-500 to-red-500 flex items-center justify-center mx-auto mb-6 shadow-xl">
              <AlertTriangle size={36} className="text-white" strokeWidth={2} />
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-3">Unable to Load</h2>
            <p className="text-slate-600 mb-8 text-sm leading-relaxed">{analytics.error}</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleRefresh}
              className="w-full px-6 py-4 bg-gradient-to-r from-slate-800 to-slate-700 text-white rounded-2xl font-black shadow-2xl hover:shadow-3xl transition-all"
            >
              Try Again
            </motion.button>
          </motion.div>
        </div>
      </>
    );
  }

  return (
    <>
      <AnimatedBackground />

      <div className="min-h-screen relative">
        {/* HEADER */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-2xl border-b border-slate-200 sticky top-0 z-50 shadow-sm"
        >
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-5xl font-black bg-gradient-to-r from-slate-800 via-slate-600 to-slate-800 bg-clip-text text-transparent mb-2">
                  Analytics Dashboard
                </h1>
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
                    <span className="text-xs font-black text-emerald-600">REAL-TIME DATA</span>
                  </motion.div>
                  <span className="text-sm text-slate-500 font-medium">
                    Updated {lastUpdate.toLocaleTimeString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <select
                  value={timeframe}
                  onChange={(e) => setTimeframe(Number(e.target.value))}
                  className="px-5 py-3 bg-white/40 backdrop-blur-2xl border border-white/60 rounded-2xl font-black text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all cursor-pointer shadow-lg"
                >
                  <option value={7}>Last 7 Days</option>
                  <option value={30}>Last 30 Days</option>
                  <option value={90}>Last 90 Days</option>
                  <option value={365}>This Year</option>
                </select>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="p-3.5 bg-white/40 backdrop-blur-2xl text-slate-800 rounded-2xl hover:bg-white/60 transition-all disabled:opacity-50 border border-white/60 shadow-lg"
                  title="Refresh analytics"
                >
                  <motion.div
                    animate={isRefreshing ? { rotate: 360 } : {}}
                    transition={{ duration: 1, repeat: isRefreshing ? Infinity : 0, ease: "linear" }}
                  >
                    <RefreshCw size={20} strokeWidth={2.5} />
                  </motion.div>
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* MAIN CONTENT */}
        <div className="max-w-7xl mx-auto px-6 py-10">
          {/* LIVE STUDY INDICATOR */}
          {isStudying && currentSession && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 rounded-3xl p-6 overflow-hidden shadow-2xl mb-10"
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
                    <div className="text-2xl font-black text-white">
                      {currentSession.documentTitle || 'Untitled Document'}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white/80 text-sm font-bold mb-1">SESSION TIME</div>
                  <motion.div
                    className="text-3xl font-black text-white"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    {currentSession.startTime?.toMillis
                      ? Math.floor((Date.now() - currentSession.startTime.toMillis()) / 60000)
                      : 0}m
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}

          {/* METRIC CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            <MetricCard
              icon={Clock}
              title="Study Time"
              value={metrics.studyTime.display}
              subtitle={`${metrics.sessionCount} session${metrics.sessionCount !== 1 ? 's' : ''}`}
              trend={metrics.studyTimeTrend.direction}
              trendValue={metrics.studyTimeTrend.value}
              delay={0}
              color="blue"
              realtime={isStudying}
              onClick={() => navigate('/dashboard?tab=study-sessions')}
            />
            <MetricCard
              icon={Target}
              title="Quiz Score"
              value={`${metrics.avgScore.toFixed(0)}%`}
              subtitle={
                metrics.avgScore >= 80 ? 'Excellent!' :
                  metrics.avgScore >= 60 ? 'Good progress' :
                    'Keep practicing'
              }
              trend={metrics.scoreTrend.direction}
              trendValue={metrics.scoreTrend.value}
              delay={0.05}
              color="green"
              onClick={() => navigate('/dashboard?tab=quizzes')}
            />
            <MetricCard
              icon={Flame}
              title="Streak"
              value={`${metrics.streak} Day${metrics.streak !== 1 ? 's' : ''}`}
              subtitle={
                metrics.streak >= 7 ? 'On Fire! 🔥' :
                  metrics.streak >= 3 ? 'Keep it up!' :
                    'Build momentum'
              }
              trend={metrics.streakTrend.direction}
              trendValue={metrics.streakTrend.value}
              delay={0.1}
              color="orange"
              realtime={true}
            />
            <MetricCard
              icon={Zap}
              title="Total XP"
              value={metrics.xp.toLocaleString()}
              subtitle={`Level ${metrics.level}`}
              trend={metrics.xpTrend.direction}
              trendValue={metrics.xpTrend.value}
              delay={0.15}
              color="purple"
            />
          </div>

          {/* QUICK INSIGHTS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-10">
            <InsightCard
              icon={Timer}
              title="Daily Avg"
              value={`${Math.round(analytics.studyTime.totalMinutes / (timeframe || 30))}m`}
              color="blue"
            />
            <InsightCard
              icon={Trophy}
              title="Quizzes"
              value={metrics.totalQuizzes}
              color="green"
            />
            <InsightCard
              icon={Shield}
              title="Badges"
              value={metrics.badgeCount}
              color="orange"
            />
            <InsightCard
              icon={TrendingUp}
              title="Accuracy"
              value={`${metrics.accuracy}%`}
              color="purple"
            />
          </div>

          {/* LEVEL PROGRESS */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-10"
          >
            <LevelProgress
              level={metrics.level}
              currentXP={metrics.xp}
              nextLevelXP={metrics.nextLevelXp}
              levelProgress={metrics.levelProgress}
            />
          </motion.div>

          {/* SUBJECT PERFORMANCE CHART */}
          <ChartContainer title="Subject Performance" subtitle="Top performing subjects" delay={0.5} icon={BookOpen}>
            {chartData.subjectData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData.subjectData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                  <XAxis
                    dataKey="subject"
                    stroke="rgba(0,0,0,0.3)"
                    tick={{ fill: 'rgba(0,0,0,0.5)', fontSize: 11, fontWeight: 600 }}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="rgba(0,0,0,0.3)"
                    tick={{ fill: 'rgba(0,0,0,0.5)', fontSize: 12, fontWeight: 600 }}
                    tickLine={false}
                    domain={[0, 100]}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="score"
                    fill="#10b981"
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

          {/* WEAK AREAS */}
          {analytics.weakAreas.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-white/40 backdrop-blur-2xl border border-white/60 rounded-3xl p-8 shadow-lg mt-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-red-500 flex items-center justify-center shadow-lg">
                  <AlertCircle size={20} className="text-white" strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800">Focus Areas</h3>
                  <p className="text-xs text-slate-500 font-medium">Topics that need improvement</p>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                {analytics.weakAreas.map((area, i) => (
                  <div
                    key={i}
                    className="bg-white/40 backdrop-blur-xl rounded-2xl p-4 border border-rose-200 flex items-center justify-between"
                  >
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{area.name}</h4>
                      <p className="text-xs text-slate-500">{area.quizCount} quizzes</p>
                    </div>
                    <span className="text-xl font-black text-rose-600">{area.score.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* BADGES */}
          {analytics.badges.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="bg-white/40 backdrop-blur-2xl border border-white/60 rounded-3xl p-8 shadow-lg mt-6"
            >
              <div className="flex items-center gap-4 mb-7">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center shadow-lg">
                  <Award size={22} className="text-white" strokeWidth={2.5} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800">Badges & Achievements</h2>
                  <p className="text-xs text-slate-500 mt-1 font-medium">Your milestones</p>
                </div>
              </div>

              <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
                {analytics.badges.slice(0, 8).map((badge, idx) => (
                  <BadgeCard key={idx} badge={badge} />
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </>
  );
};

export default Analytics;
