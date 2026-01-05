// src/pages/Analytics.jsx - ✅ FIXED VERSION (Using Existing Infrastructure)
import React, { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3, TrendingUp, Clock, Target, Award, Zap, BookOpen,
  TrendingDown, RefreshCw, Flame, AlertCircle, Activity,
  Trophy, Timer, Shield, ChevronRight, Sparkles, Brain,
  ArrowUpRight, Star, Filter, Download
} from 'lucide-react';
import {
  BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

import { useAuth } from '@auth/contexts/AuthContext';
import { db } from '@shared/config/firebase';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { useAnalyticsSync } from '@shared/services/realtimeSync';
import AIAnalyticsReport from '../components/AIAnalyticsReport';
import { useAIReport } from '../hooks/useAIReport';

// ==================== 🎨 DESIGN SYSTEM ====================
const COLORS = {
  primary: '#14b8a6',
  primaryLight: '#5eead4',
  royal: '#4169e1',
  royalLight: '#6b8aef',
  bg: '#ffffff',
  bgSecondary: '#f8fafc',
  bgTertiary: '#f1f5f9',
  surface: '#ffffff',
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  text: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#64748b',
  success: '#10b981',
  warning: '#f59e0b',
};

const XP_PER_LEVEL = 1000;
const REFRESH_COOLDOWN = 2000;

// ==================== 🧩 COMPONENTS ====================

// ✅ Skeleton Loader
const SkeletonCard = memo(() => (
  <div className="animate-pulse rounded-xl border border-slate-200 bg-white p-4">
    <div className="flex items-start justify-between mb-3">
      <div className="h-10 w-10 bg-slate-200 rounded-lg" />
      <div className="h-4 w-12 bg-slate-200 rounded" />
    </div>
    <div className="h-8 w-20 bg-slate-200 rounded mb-2" />
    <div className="h-3 w-24 bg-slate-200 rounded" />
  </div>
));

const LevelRing = memo(({ level, progress, size = 60 }) => {
  const radius = size / 2 - 4;
  const circumference = 2 * Math.PI * radius;
  const safeProgress = Math.min(Math.max(progress || 0, 0), 100);
  const offset = circumference - (safeProgress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="rotate-[-90deg]" width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="#e2e8f0" strokeWidth="3" fill="transparent" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke="url(#levelGrad)" strokeWidth="3" fill="transparent"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
        <defs>
          <linearGradient id="levelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#14b8a6" />
            <stop offset="100%" stopColor="#4169e1" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[9px] font-bold text-slate-400 tracking-wide">LVL</span>
        <span className="text-lg font-bold text-slate-900">{level}</span>
      </div>
    </div>
  );
});

const Sparkline = memo(({ data, color = COLORS.primary, height = 32 }) => {
  if (!data || data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id={`spark-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#spark-${color})`}
          animationDuration={1200}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
});

const StatCard = memo(({ label, value, icon: Icon, trend, sparkData, onClick }) => (
  <motion.button
    type="button"
    onClick={onClick}
    aria-label={`View ${label} details`}
    className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:border-teal-400 hover:shadow-md"
    whileHover={{ y: -2 }}
    whileTap={{ scale: 0.98 }}
  >
    <div className="absolute inset-0 bg-gradient-to-br from-teal-50/50 to-blue-50/50 opacity-0 transition-opacity group-hover:opacity-100" />

    <div className="relative">
      <div className="flex items-start justify-between mb-3">
        <div className="rounded-lg bg-gradient-to-br from-teal-500 to-blue-600 p-2 shadow-sm">
          <Icon size={16} className="text-white" strokeWidth={2.5} aria-hidden="true" />
        </div>
        {trend && (
          <div className={`flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${trend.dir === 'up' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
            }`}>
            {trend.dir === 'up' ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
            {trend.val}
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="text-2xl font-bold text-slate-900 tracking-tight tabular-nums">
          {value}
        </div>
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </div>
      </div>

      {sparkData && sparkData.length > 0 && (
        <div className="mt-3 -mx-1">
          <Sparkline data={sparkData} color={trend?.dir === 'up' ? COLORS.primary : COLORS.textMuted} height={28} />
        </div>
      )}

      <ChevronRight size={14} className="absolute bottom-3 right-3 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
    </div>
  </motion.button>
));

const InsightPill = memo(({ icon: Icon, label, value }) => (
  <motion.div
    className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm"
    whileHover={{ scale: 1.02 }}
  >
    <div className="rounded-md bg-gradient-to-br from-teal-100 to-blue-100 p-1.5">
      <Icon size={14} className="text-teal-700" strokeWidth={2.5} aria-hidden="true" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-base font-bold text-slate-900 tabular-nums">{value}</div>
    </div>
  </motion.div>
));

const BadgeItem = memo(({ badge, index }) => (
  <motion.div
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: index * 0.08 }}
    className="group flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm hover:border-teal-300 hover:shadow-md transition-all cursor-pointer"
  >
    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 shadow-inner">
      {badge.icon ? (
        <img src={badge.icon} alt={badge.name} className="h-5 w-5" />
      ) : (
        <Award size={18} className="text-teal-600" />
      )}
    </div>
    <div className="flex-1 min-w-0">
      <div className="truncate text-xs font-bold text-slate-900">
        {badge.name}
      </div>
      <div className="truncate text-[10px] text-slate-500">
        {badge.description || 'Achievement'}
      </div>
    </div>
    <Star size={12} className="text-slate-300 group-hover:text-yellow-500 transition-colors" aria-hidden="true" />
  </motion.div>
));

const PremiumBackground = memo(() => (
  <div className="fixed inset-0 -z-10 bg-white" aria-hidden="true">
    <div className="absolute inset-0">
      <div className="absolute top-[-10%] right-[-5%] h-[600px] w-[600px] rounded-full bg-teal-100/40 blur-[120px]" />
      <div className="absolute bottom-[-10%] left-[-5%] h-[500px] w-[500px] rounded-full bg-blue-100/40 blur-[100px]" />
    </div>
    <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-40" />
  </div>
));

const ChartCard = memo(({ title, subtitle, icon: Icon, children, actions }) => (
  <motion.div
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
  >
    <div className="flex items-start justify-between mb-5">
      <div className="flex items-center gap-2.5">
        <div className="rounded-lg bg-gradient-to-br from-teal-500 to-blue-600 p-2 shadow-sm">
          <Icon size={16} className="text-white" strokeWidth={2.5} aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
    {children}
  </motion.div>
));

// ==================== 🌟 MAIN COMPONENT ====================
const Analytics = ({ embedded = false }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [timeframe, setTimeframe] = useState(30);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeView, setActiveView] = useState('overview');

  const refreshTimerRef = useRef(null);
  const isMountedRef = useRef(true);

  // ✅ Use your existing hooks
  const analyticsData = useAnalyticsSync(user?.uid, timeframe);
  const prevAnalyticsData = useAnalyticsSync(user?.uid, timeframe * 2);

  const analytics = analyticsData.metrics;
  const prevAnalytics = prevAnalyticsData.metrics;
  const aiReport = useAIReport(user?.uid, analytics);

  const currentSession = analytics?.studyTime?.activeSession;
  const isStudying = !!currentSession;

  // ✅ Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []);

  // ✅ FIXED: Safe daily activity processing
  const dailyActivity = useMemo(() => {
    const emptyResult = { study: [], score: [], xp: [], streak: [] };

    if (analyticsData.loading || !analyticsData.raw) return emptyResult;

    try {
      const days = 7;
      const now = new Date();
      const map = new Map();

      // Initialize last 7 days
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        map.set(d.toDateString(), { study: 0, score: [], xp: 0 });
      }

      // ✅ FIXED: Null-safe array operations
      const sessions = analyticsData.raw.studySessions || [];
      const quizzes = analyticsData.raw.quizSessions || [];

      // Aggregate Study Time
      sessions.forEach(s => {
        try {
          const date = s.startTime?.toDate?.() || new Date(s.startTime);
          if (isNaN(date.getTime())) return; // Skip invalid dates

          const key = date.toDateString();
          if (map.has(key)) {
            const entry = map.get(key);
            let mins = s.totalTime || 0;

            // If active today, add live elapsed time
            if (s.status === 'active') {
              const start = s.startTime?.toDate?.() || new Date(s.startTime);
              const elapsed = Math.floor((Date.now() - start.getTime()) / 60000);
              mins = Math.max(mins, elapsed);
            }

            entry.study += Math.max(0, mins);
            map.set(key, entry);
          }
        } catch (e) {
          console.warn('Invalid study session date:', e);
        }
      });

      // Aggregate Quiz Scores
      quizzes.forEach(q => {
        try {
          const date = q.completedAt?.toDate?.() || new Date(q.completedAt);
          if (isNaN(date.getTime())) return;

          const key = date.toDateString();
          if (map.has(key)) {
            const entry = map.get(key);
            if (q.score !== undefined && q.score !== null) {
              entry.score.push(q.score);
            }
            entry.xp += (q.xpEarned || 0);
            map.set(key, entry);
          }
        } catch (e) {
          console.warn('Invalid quiz date:', e);
        }
      });

      // Convert to arrays
      const result = { study: [], score: [], xp: [] };
      map.forEach((val) => {
        result.study.push({ value: Math.round(val.study) });
        result.score.push({
          value: val.score.length ? Math.round(val.score.reduce((a, b) => a + b, 0) / val.score.length) : 0
        });
        result.xp.push({ value: val.xp });
      });

      return result;
    } catch (error) {
      console.error('Error processing daily activity:', error);
      return emptyResult;
    }
  }, [analyticsData.raw, analyticsData.loading]);

  // ✅ FIXED: Safe metrics calculation
  const metrics = useMemo(() => {
    const studyTime = formatStudyTime(analytics.studyTime?.totalMinutes || 0);
    const studyTrend = calculateTrend(
      analytics.studyTime?.totalMinutes || 0,
      prevAnalytics.studyTime?.totalMinutes || 0
    );
    const scoreTrend = calculateTrend(
      analytics.quizPerformance?.averageScore || 0,
      prevAnalytics.quizPerformance?.averageScore || 0
    );

    const currentXP = analytics.gamification?.xp || 0;
    const currentLevel = analytics.gamification?.level || 1;
    const xpInLevel = currentXP % XP_PER_LEVEL;
    const levelProgress = (xpInLevel / XP_PER_LEVEL) * 100;

    return {
      studyTime,
      studyTrend,
      avgScore: analytics.quizPerformance?.averageScore || 0,
      scoreTrend,
      streak: analytics.gamification?.streak || 0,
      xp: currentXP,
      level: currentLevel,
      levelProgress,
      xpInLevel,
      nextLevelXP: currentLevel * XP_PER_LEVEL,
      accuracy: analytics.quizPerformance?.accuracy || 0,
      totalQuizzes: analytics.quizPerformance?.totalQuizzes || 0,
      badges: analytics?.gamification?.badges || [],
      sessionCount: analytics?.studyTime?.sessionCount || 0
    };
  }, [analytics, prevAnalytics]);

  // ✅ FIXED: Safe refresh with cleanup
  const handleRefresh = useCallback(() => {
    if (isRefreshing || !isMountedRef.current) return;

    setIsRefreshing(true);
    analyticsData.refetch?.();

    toast.success('Analytics refreshed', {
      style: {
        background: '#ffffff',
        color: '#0f172a',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        fontSize: '13px',
        fontWeight: 600
      },
      icon: '✨'
    });

    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => {
      if (isMountedRef.current) setIsRefreshing(false);
    }, REFRESH_COOLDOWN);
  }, [isRefreshing, analytics]);

  // ✅ Loading state with skeleton
  if (analyticsData.loading) {
    return (
      <div className="min-h-screen bg-white p-4 md:p-6 max-w-[1600px] mx-auto">
        <PremiumBackground />
        <div className="mb-6">
          <div className="h-10 w-64 bg-slate-200 rounded-lg animate-pulse mb-2" />
          <div className="h-4 w-96 bg-slate-100 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      {!embedded && <PremiumBackground />}

      <div className={`relative ${embedded ? 'pb-10' : 'min-h-screen p-4 md:p-6 max-w-[1600px] mx-auto'}`}>

        {/* Header */}
        <header className="mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-1">
                Analytics Dashboard
              </h1>
              <p className="text-xs text-slate-600 flex items-center gap-2">
                <Activity size={12} className="text-teal-500" aria-hidden="true" />
                Real-time insights into your learning journey
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              {/* View Tabs */}
              <div className="flex items-center gap-1 bg-slate-50 p-0.5 rounded-lg border border-slate-200">
                {['overview', 'performance', 'insights'].map((view) => (
                  <button
                    key={view}
                    onClick={() => setActiveView(view)}
                    aria-label={`View ${view}`}
                    className={`px-3 py-1.5 rounded-md text-[11px] font-bold capitalize transition-all ${activeView === view
                      ? 'bg-gradient-to-r from-teal-500 to-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                      }`}
                  >
                    {view}
                  </button>
                ))}
              </div>

              {/* Timeframe */}
              <div className="flex items-center gap-0.5 bg-slate-50 p-0.5 rounded-lg border border-slate-200">
                {[7, 30, 90].map((days) => (
                  <button
                    key={days}
                    onClick={() => setTimeframe(days)}
                    aria-label={`Show ${days} days`}
                    className={`px-2.5 py-1.5 rounded-md text-[11px] font-bold transition-all ${timeframe === days
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                      }`}
                  >
                    {days}D
                  </button>
                ))}
              </div>

              {/* Actions */}
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                aria-label="Refresh analytics"
                className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-white transition-all disabled:opacity-50"
              >
                <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
              </button>

              <button
                aria-label="Download report"
                className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-white transition-all"
              >
                <Download size={14} />
              </button>
            </div>
          </div>

          {/* ✅ Study Session Banner */}
          {isStudying && currentSession && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-3 bg-gradient-to-r from-teal-50 to-blue-50 border border-teal-200 rounded-xl flex items-center gap-3"
            >
              <div className="relative">
                <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse" />
                <div className="absolute inset-0 w-2 h-2 bg-teal-500 rounded-full animate-ping" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-slate-900">Study session in progress</p>
                <p className="text-[10px] text-slate-600">
                  Started {currentSession.startTime ? new Date(currentSession.startTime).toLocaleTimeString() : 'recently'}
                </p>
              </div>
              <button
                onClick={() => navigate('/study-timer')}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                View Session
              </button>
            </motion.div>
          )}
        </header>

        {/* Main Content */}
        <AnimatePresence mode="wait">
          {activeView === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              {/* Primary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  icon={Clock}
                  label="Study Time"
                  value={metrics.studyTime.display}
                  trend={metrics.studyTrend}
                  sparkData={dailyActivity.study}
                  onClick={() => navigate('/dashboard?tab=study-sessions')}
                />
                <StatCard
                  icon={Target}
                  label="Avg Score"
                  value={`${metrics.avgScore.toFixed(0)}%`}
                  trend={metrics.scoreTrend}
                  sparkData={dailyActivity.score}
                  onClick={() => navigate('/dashboard?tab=quizzes')}
                />
                <StatCard
                  icon={Flame}
                  label="Streak"
                  value={`${metrics.streak} Days`}
                  trend={{ dir: metrics.streak > 0 ? 'up' : 'down', val: metrics.streak > 0 ? 'Active' : 'Start' }}
                  sparkData={dailyActivity.study}
                />
                <StatCard
                  icon={Zap}
                  label="Total XP"
                  value={metrics.xp >= 1000 ? `${(metrics.xp / 1000).toFixed(1)}k` : metrics.xp}
                  trend={{ dir: 'up', val: `L${metrics.level}` }}
                  sparkData={dailyActivity.xp}
                />
              </div>

              {/* Main Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

                {/* Chart Section */}
                <div className="lg:col-span-8 space-y-5">

                  {/* Performance Chart */}
                  <ChartCard
                    title="Subject Performance"
                    subtitle="Top subjects by score"
                    icon={BookOpen}
                    actions={
                      <button
                        aria-label="Filter subjects"
                        className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-900 transition-colors"
                      >
                        <Filter size={13} />
                      </button>
                    }
                  >
                    <div className="h-[260px] w-full">
                      {analytics.performance && analytics.performance.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={analytics.performance.slice(0, 6)} barSize={36}>
                            <defs>
                              <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.9} />
                                <stop offset="100%" stopColor="#4169e1" stopOpacity={0.7} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                            <XAxis
                              dataKey="name"
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                              dy={8}
                              tickFormatter={(val) => val.substring(0, 8)}
                            />
                            <YAxis
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: '#64748b', fontSize: 10 }}
                              domain={[0, 100]}
                              dx={-8}
                            />
                            <Tooltip
                              cursor={{ fill: '#f8fafc', opacity: 0.8 }}
                              content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0].payload;
                                  return (
                                    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg ring-1 ring-slate-900/5">
                                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{label}</div>
                                      <div className="space-y-1.5">
                                        <div className="flex items-center justify-between gap-6">
                                          <div className="flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                                            <span className="text-[11px] text-slate-500">Avg Score</span>
                                          </div>
                                          <span className="text-[11px] font-bold text-slate-900">{data.score}%</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-6">
                                          <div className="flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                            <span className="text-[11px] text-slate-500">Accuracy</span>
                                          </div>
                                          <span className="text-[11px] font-bold text-slate-900">{data.accuracy}%</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-6">
                                          <div className="flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                                            <span className="text-[11px] text-slate-500">Study Time</span>
                                          </div>
                                          <span className="text-[11px] font-bold text-orange-600">{data.studyMinutes}m</span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Bar dataKey="score" radius={[6, 6, 0, 0]} animationDuration={1200}>
                              {analytics.performance.slice(0, 6).map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={entry.score >= 70 ? 'url(#barGrad)' : '#cbd5e1'}
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                          <BookOpen size={40} className="mb-3 opacity-20" aria-hidden="true" />
                          <p className="text-xs font-semibold mb-1">No data available</p>
                          <p className="text-[11px] text-slate-500">Complete quizzes to see performance</p>
                        </div>
                      )}
                    </div>
                  </ChartCard>

                  {/* Quick Insights */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <InsightPill icon={Timer} label="Daily Avg" value={`${Math.round((metrics.studyTime.totalMinutes || 0) / timeframe)}m`} />
                    <InsightPill icon={Trophy} label="Quizzes" value={metrics.totalQuizzes} />
                    <InsightPill icon={Shield} label="Badges" value={metrics.badges.length} />
                    <InsightPill icon={Target} label="Accuracy" value={`${metrics.accuracy}%`} />
                  </div>
                </div>

                {/* Sidebar */}
                <div className="lg:col-span-4 space-y-5">

                  {/* Level Card */}
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-teal-50/30 to-blue-50/30 p-5 shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wide text-teal-700 mb-1">
                          Current Level
                        </div>
                        <div className="text-xl font-bold text-slate-900">Level {metrics.level}</div>
                      </div>
                      <LevelRing level={metrics.level} progress={metrics.levelProgress} />
                    </div>

                    <div className="space-y-3 mb-5">
                      <div className="flex justify-between text-[10px] font-semibold text-slate-600">
                        <span>Progress</span>
                        <span>{Math.round(metrics.levelProgress)}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-teal-500 to-blue-600 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(metrics.levelProgress, 100)}%` }}
                          transition={{ duration: 1.2, ease: "easeOut" }}
                        />
                      </div>
                      <div className="text-[10px] text-slate-500 text-right">
                        {metrics.xpInLevel} / {XP_PER_LEVEL} XP to next level
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-xs font-bold text-slate-900">Achievements</div>
                        <button
                          onClick={() => navigate('/dashboard?tab=achievements')}
                          className="text-[10px] font-bold text-teal-600 hover:text-teal-700 transition-colors flex items-center gap-0.5"
                        >
                          View All
                          <ArrowUpRight size={10} />
                        </button>
                      </div>
                      <div className="space-y-2">
                        {metrics.badges.length > 0 ? (
                          [...metrics.badges].reverse().slice(0, 3).map((badge, i) => (
                            <BadgeItem key={badge.id || i} badge={badge} index={i} />
                          ))
                        ) : (
                          <div className="text-center py-6 text-slate-400">
                            <Star size={28} className="mx-auto mb-2 opacity-20" aria-hidden="true" />
                            <p className="text-[11px] font-medium">No achievements yet</p>
                            <p className="text-[10px] text-slate-500 mt-1">Keep learning to earn badges</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>

                  {/* Focus Areas */}
                  {analytics.weakAreas && analytics.weakAreas.length > 0 && (
                    <ChartCard
                      title="Focus Areas"
                      subtitle="Needs improvement"
                      icon={AlertCircle}
                    >
                      <div className="space-y-2">
                        {analytics.weakAreas.map((area, i) => (
                          <motion.button
                            key={area.name}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.08 }}
                            onClick={() => navigate('/dashboard?tab=quizzes')}
                            className="group w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white hover:border-teal-300 hover:shadow-sm transition-all"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-1 h-9 rounded-full bg-slate-300 group-hover:bg-gradient-to-b group-hover:from-teal-500 group-hover:to-blue-600 transition-all" />
                              <div className="text-left">
                                <div className="text-xs font-bold text-slate-900">
                                  {area.name}
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  {area.quizCount} quiz{area.quizCount !== 1 ? 'zes' : ''} • Below 70%
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="text-lg font-bold text-slate-500 group-hover:text-slate-900 tabular-nums transition-colors">
                                {area.score}%
                              </div>
                              <ChevronRight size={14} className="text-slate-400 group-hover:text-teal-600 transition-colors" />
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    </ChartCard>
                  )}
                </div>
              </div>

              {/* AI Insights */}
              {aiReport && (
                <ChartCard
                  title="AI-Powered Insights"
                  subtitle="Personalized recommendations"
                  icon={Brain}
                >
                  <AIAnalyticsReport
                    report={aiReport.report}
                    loading={aiReport.loading}
                    onGenerate={aiReport.generateReport}
                    canGenerate={aiReport.canGenerate}
                  />
                </ChartCard>
              )}
            </motion.div>
          )}

          {activeView === 'performance' && (
            <motion.div
              key="performance"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-20 text-slate-400"
            >
              <BarChart3 size={44} className="mx-auto mb-3 opacity-20" aria-hidden="true" />
              <p className="text-sm font-medium">Performance view coming soon</p>
            </motion.div>
          )}

          {activeView === 'insights' && (
            <motion.div
              key="insights"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-20 text-slate-400"
            >
              <Sparkles size={44} className="mx-auto mb-3 opacity-20" aria-hidden="true" />
              <p className="text-sm font-medium">Insights view coming soon</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

// ==================== 🛠️ UTILITIES ====================
const formatStudyTime = (m) => {
  if (!m) return { display: '0m', totalMinutes: 0 };
  const h = Math.floor(m / 60);
  const min = Math.round(m % 60);
  return { display: h > 0 ? `${h}h ${min}m` : `${min}m`, totalMinutes: m };
};

const calculateTrend = (current, previous) => {
  if (!previous || previous === 0) return { dir: 'up', val: 'New' };
  const change = ((current - previous) / previous) * 100;
  return {
    dir: change >= 0 ? 'up' : 'down',
    val: `${change > 0 ? '+' : ''}${Math.round(change)}%`
  };
};

export default Analytics;
