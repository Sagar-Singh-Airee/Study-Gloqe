// src/pages/Analytics.jsx - ULTRA-PREMIUM UX EDITION 💎✨
import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3, TrendingUp, Clock, Target, Award, Zap, BookOpen,
  TrendingDown, RefreshCw, Flame, AlertTriangle, CheckCircle2,
  Activity, Radio, Trophy, Timer, Shield, ChevronRight, AlertCircle,
  Sparkles, Brain, Eye, ArrowUpRight, Calendar, Star, Users,
  Lightbulb, Filter, Download
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

import { useAuth } from '@auth/contexts/AuthContext';
import { db } from '@shared/config/firebase';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { useAnalyticsSync } from '@shared/services/realtimeSync';
import AIAnalyticsReport from '../components/AIAnalyticsReport';
import { useAIReport } from '../hooks/useAIReport';

// ==================== 🎨 ENHANCED DESIGN SYSTEM ====================
const COLORS = {
  primary: '#14b8a6',
  primaryLight: '#2dd4bf',
  primaryDark: '#0f766e',
  accent: '#38bdf8',
  surface: '#0f172a',
  surfaceLight: '#1e293b',
  border: '#334155',
  text: '#f1f5f9',
  textMuted: '#94a3b8',
  success: '#22c55e',
  warning: '#fbbf24',
  error: '#ef4444'
};

// ==================== 🧩 MICRO-COMPONENTS ====================

// 1. Enhanced Level Ring with Glow Effect
const LevelRing = memo(({ level, progress, size = 72 }) => {
  const radius = size / 2 - 5;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <motion.div
        className="absolute inset-0 rounded-full bg-teal-500/20 blur-xl"
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <svg className="relative rotate-[-90deg]" width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="#1e293b" strokeWidth="4" fill="transparent" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke="url(#levelGradient)" strokeWidth="4" fill="transparent"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
        <defs>
          <linearGradient id="levelGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#14b8a6" />
            <stop offset="100%" stopColor="#2dd4bf" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[9px] font-bold text-slate-500 tracking-wider">LEVEL</span>
        <span className="text-xl font-bold text-white">{level}</span>
      </div>
    </div>
  );
});

// 2. Mini Sparkline Chart
const Sparkline = memo(({ data, color = COLORS.primary, height = 40 }) => (
  <ResponsiveContainer width="100%" height={height}>
    <AreaChart data={data}>
      <defs>
        <linearGradient id="sparkGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor={color} stopOpacity={0.3} />
          <stop offset="95%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <Area
        type="monotone"
        dataKey="value"
        stroke={color}
        strokeWidth={2}
        fill="url(#sparkGradient)"
        animationDuration={1500}
      />
    </AreaChart>
  </ResponsiveContainer>
));

// 3. Enhanced Stat Card with Sparkline
const StatCard = memo(({ label, value, icon: Icon, trend, sparkData, onClick }) => (
  <motion.button
    type="button"
    onClick={onClick}
    className="group relative overflow-hidden rounded-2xl border border-slate-800/60 bg-gradient-to-br from-slate-900/80 to-slate-900/40 p-5 text-left backdrop-blur-sm transition-all hover:border-teal-500/50 hover:shadow-lg hover:shadow-teal-500/10"
    whileHover={{ y: -4 }}
    whileTap={{ scale: 0.98 }}
  >
    <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

    <div className="relative">
      <div className="flex items-start justify-between mb-3">
        <div className="rounded-xl bg-slate-800/50 p-2.5 text-teal-400 ring-1 ring-slate-700/50 group-hover:ring-teal-500/30 transition-all">
          <Icon size={18} strokeWidth={2.5} />
        </div>
        {trend && (
          <motion.div
            className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold ${trend.dir === 'up'
                ? 'bg-teal-500/10 text-teal-400 ring-1 ring-teal-500/20'
                : 'bg-slate-800/50 text-slate-400 ring-1 ring-slate-700/50'
              }`}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {trend.dir === 'up' ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {trend.val}
          </motion.div>
        )}
      </div>

      <div className="space-y-2">
        <motion.div
          className="text-3xl font-bold text-white tracking-tight tabular-nums"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {value}
        </motion.div>
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </div>
      </div>

      {sparkData && sparkData.length > 0 && (
        <div className="mt-4 -mx-2">
          <Sparkline data={sparkData} color={trend?.dir === 'up' ? COLORS.primary : COLORS.textMuted} height={32} />
        </div>
      )}

      <div className="absolute bottom-2 right-2 opacity-0 transition-opacity group-hover:opacity-100">
        <ChevronRight size={16} className="text-slate-600" />
      </div>
    </div>
  </motion.button>
));

// 4. Insight Pill
const InsightPill = memo(({ icon: Icon, label, value, color = 'teal' }) => {
  const colorClasses = {
    teal: 'bg-teal-500/10 text-teal-400 ring-teal-500/20',
    slate: 'bg-slate-500/10 text-slate-400 ring-slate-500/20',
    blue: 'bg-blue-500/10 text-blue-400 ring-blue-500/20'
  };

  return (
    <motion.div
      className={`flex items-center gap-3 rounded-xl px-4 py-3 ring-1 ${colorClasses[color]}`}
      whileHover={{ scale: 1.02 }}
    >
      <div className="rounded-lg bg-white/5 p-2">
        <Icon size={16} strokeWidth={2.5} />
      </div>
      <div className="flex-1">
        <div className="text-[10px] font-bold uppercase tracking-wider opacity-70">{label}</div>
        <div className="text-lg font-bold tabular-nums">{value}</div>
      </div>
    </motion.div>
  );
});

// 5. Premium Badge with Animation
const BadgeItem = memo(({ badge, index }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay: index * 0.1 }}
    className="group flex items-center gap-3 rounded-xl border border-slate-800/60 bg-slate-900/30 p-3 backdrop-blur-sm hover:bg-slate-800/50 hover:border-teal-500/30 transition-all cursor-pointer"
  >
    <div className="relative">
      <div className="absolute inset-0 rounded-lg bg-teal-500/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 ring-1 ring-slate-700">
        {badge.icon ? (
          <img src={badge.icon} alt={badge.name} className="h-6 w-6 grayscale group-hover:grayscale-0 transition-all" />
        ) : (
          <Award size={20} className="text-teal-400" />
        )}
      </div>
    </div>
    <div className="flex-1 min-w-0">
      <div className="truncate text-xs font-bold text-slate-200 group-hover:text-white transition-colors">
        {badge.name}
      </div>
      <div className="truncate text-[10px] text-slate-500">
        {badge.description || 'Achievement unlocked'}
      </div>
    </div>
    <Star size={14} className="text-slate-700 group-hover:text-yellow-500 transition-colors" />
  </motion.div>
));

// 6. Animated Background
const PremiumBackground = memo(() => (
  <div className="fixed inset-0 -z-10 bg-[#020617]">
    <div className="absolute inset-0">
      <div className="absolute top-[-20%] right-[-10%] h-[800px] w-[800px] rounded-full bg-teal-500/5 blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] left-[-10%] h-[600px] w-[600px] rounded-full bg-slate-700/10 blur-[100px]" />
    </div>

    <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)] opacity-[0.08]" />

    <motion.div
      className="absolute inset-0 opacity-[0.03]"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
      }}
    />
  </div>
));

// 7. Enhanced Chart Container
const ChartCard = memo(({ title, subtitle, icon: Icon, children, actions }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="rounded-3xl border border-slate-800/60 bg-gradient-to-br from-slate-900/60 to-slate-900/30 p-6 backdrop-blur-sm"
  >
    <div className="flex items-start justify-between mb-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-slate-800/50 p-2.5 ring-1 ring-slate-700/50">
          <Icon size={18} className="text-teal-400" strokeWidth={2.5} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">{title}</h3>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
          )}
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
  const [activeView, setActiveView] = useState('overview'); // overview, performance, insights

  const { currentSession, isStudying } = useRealtimeStudySession(user?.uid);
  const analytics = useRealtimeAnalytics(user?.uid, timeframe);
  const prevAnalytics = useRealtimeAnalytics(user?.uid, timeframe * 2);
  const aiReport = useAIReport(user?.uid, analytics);

  // Generate sparkline data
  const generateSparkData = (value) => {
    return Array.from({ length: 7 }, (_, i) => ({
      value: Math.max(0, value * (0.7 + Math.random() * 0.6))
    }));
  };

  const metrics = useMemo(() => {
    const studyTime = formatStudyTime(analytics.studyTime.totalMinutes);
    const studyTrend = calculateTrend(
      analytics.studyTime.totalMinutes,
      prevAnalytics.studyTime.totalMinutes
    );
    const scoreTrend = calculateTrend(
      analytics.quizPerformance.averageScore,
      prevAnalytics.quizPerformance.averageScore
    );

    return {
      studyTime,
      studyTrend,
      avgScore: analytics.quizPerformance.averageScore,
      scoreTrend,
      streak: analytics.streak,
      xp: analytics.xp,
      level: analytics.level,
      levelProgress: (analytics.xp / analytics.nextLevelXp) * 100,
      accuracy: analytics.quizPerformance.accuracy,
      totalQuizzes: analytics.quizPerformance.totalQuizzes,
      badges: analytics.badges,
      sessionCount: analytics.studyTime.sessionCount,
      avgSessionTime: analytics.studyTime.averageSessionLength
    };
  }, [analytics, prevAnalytics]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    analytics.refetch();
    toast.success('Refreshed', {
      icon: '✓',
      style: {
        background: '#0f172a',
        color: '#f1f5f9',
        border: '1px solid #334155',
        borderRadius: '12px'
      }
    });
    setTimeout(() => setIsRefreshing(false), 1000);
  }, [analytics]);

  if (analytics.loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 border-2 border-teal-500/20 rounded-full" />
            <div className="absolute inset-0 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-sm text-slate-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {!embedded && <PremiumBackground />}

      <div className={`relative ${embedded ? 'pb-12' : 'min-h-screen p-4 md:p-8 max-w-[1800px] mx-auto'}`}>

        {/* === ENHANCED HEADER === */}
        <header className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <motion.h1
                  className="text-4xl md:text-5xl font-bold text-white tracking-tight"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  Analytics
                </motion.h1>

                {isStudying && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-500/10 ring-1 ring-teal-500/20"
                  >
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500" />
                    </span>
                    <span className="text-[11px] font-bold text-teal-400 tracking-wider">LIVE</span>
                  </motion.div>
                )}
              </div>
              <p className="text-slate-400 text-sm max-w-2xl">
                Track your learning journey with real-time insights and AI-powered recommendations.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* View Switcher */}
              <div className="flex items-center gap-1 bg-slate-900/50 p-1 rounded-xl ring-1 ring-slate-800/50 backdrop-blur-md">
                {['overview', 'performance', 'insights'].map((view) => (
                  <button
                    key={view}
                    onClick={() => setActiveView(view)}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold capitalize transition-all ${activeView === view
                        ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                      }`}
                  >
                    {view}
                  </button>
                ))}
              </div>

              {/* Timeframe */}
              <div className="flex items-center gap-1 bg-slate-900/50 p-1 rounded-xl ring-1 ring-slate-800/50 backdrop-blur-md">
                {[7, 30, 90].map((days) => (
                  <button
                    key={days}
                    onClick={() => setTimeframe(days)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${timeframe === days
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-500 hover:text-white'
                      }`}
                  >
                    {days}D
                  </button>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleRefresh}
                  className="p-2.5 rounded-xl bg-slate-900/50 ring-1 ring-slate-800/50 text-slate-400 hover:text-white backdrop-blur-md transition-colors"
                >
                  <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-2.5 rounded-xl bg-slate-900/50 ring-1 ring-slate-800/50 text-slate-400 hover:text-white backdrop-blur-md transition-colors"
                >
                  <Download size={16} />
                </motion.button>
              </div>
            </div>
          </div>

          {/* Live Session Banner */}
          <AnimatePresence>
            {isStudying && currentSession && (
              <motion.div
                initial={{ opacity: 0, y: -20, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -20, height: 0 }}
                className="mt-6 overflow-hidden rounded-2xl bg-gradient-to-r from-teal-500/10 to-slate-900/50 p-4 ring-1 ring-teal-500/20 backdrop-blur-sm"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-teal-500/10 p-3 ring-1 ring-teal-500/20">
                      <Activity size={20} className="text-teal-400" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-teal-400 mb-1">
                        Active Study Session
                      </div>
                      <div className="text-sm font-semibold text-white">
                        {currentSession.documentTitle || 'Untitled Document'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Duration
                    </div>
                    <motion.div
                      className="text-2xl font-bold text-white tabular-nums"
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      {currentSession.startTime?.toMillis
                        ? Math.floor((Date.now() - currentSession.startTime.toMillis()) / 60000)
                        : 0}m
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        {/* === MAIN CONTENT === */}
        <AnimatePresence mode="wait">
          {activeView === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  icon={Clock}
                  label="Study Time"
                  value={metrics.studyTime.display}
                  trend={metrics.studyTrend}
                  sparkData={generateSparkData(metrics.studyTime.totalMinutes || 60)}
                  onClick={() => navigate('/dashboard?tab=study-sessions')}
                />
                <StatCard
                  icon={Target}
                  label="Avg Score"
                  value={`${metrics.avgScore.toFixed(0)}%`}
                  trend={metrics.scoreTrend}
                  sparkData={generateSparkData(metrics.avgScore)}
                  onClick={() => navigate('/dashboard?tab=quizzes')}
                />
                <StatCard
                  icon={Flame}
                  label="Streak"
                  value={`${metrics.streak} Days`}
                  trend={{ dir: 'up', val: 'Active' }}
                  sparkData={generateSparkData(metrics.streak * 10)}
                />
                <StatCard
                  icon={Zap}
                  label="Total XP"
                  value={metrics.xp.toLocaleString()}
                  trend={{ dir: 'up', val: `Level ${metrics.level}` }}
                  sparkData={generateSparkData(metrics.xp / 10)}
                />
              </div>

              {/* Main Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Left Column - Charts */}
                <div className="lg:col-span-8 space-y-6">

                  {/* Subject Performance */}
                  <ChartCard
                    title="Subject Performance"
                    subtitle="Your top performing subjects"
                    icon={BookOpen}
                    actions={
                      <button className="p-2 rounded-lg bg-slate-800/50 text-slate-400 hover:text-white transition-colors">
                        <Filter size={14} />
                      </button>
                    }
                  >
                    <div className="h-[280px] w-full">
                      {analytics.performance.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={analytics.performance.slice(0, 6)} barSize={40}>
                            <defs>
                              <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.9} />
                                <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.3} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} opacity={0.5} />
                            <XAxis
                              dataKey="name"
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                              dy={10}
                              tickFormatter={(val) => val.substring(0, 8)}
                            />
                            <YAxis
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: '#64748b', fontSize: 11 }}
                              domain={[0, 100]}
                              dx={-10}
                            />
                            <Tooltip
                              cursor={{ fill: '#1e293b', opacity: 0.3 }}
                              contentStyle={{
                                backgroundColor: '#0f172a',
                                border: '1px solid #334155',
                                borderRadius: '12px',
                                padding: '12px'
                              }}
                              itemStyle={{ color: '#f1f5f9', fontSize: '12px', fontWeight: 600 }}
                              labelStyle={{ color: '#94a3b8', fontSize: '11px', marginBottom: '8px' }}
                            />
                            <Bar dataKey="score" radius={[8, 8, 0, 0]} animationDuration={1500}>
                              {analytics.performance.slice(0, 6).map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={entry.score > 70 ? 'url(#barGrad)' : '#334155'}
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-600">
                          <BookOpen size={48} className="mb-4 opacity-20" />
                          <p className="text-sm font-medium mb-2">No data yet</p>
                          <p className="text-xs text-slate-700">Complete quizzes to see performance</p>
                        </div>
                      )}
                    </div>
                  </ChartCard>

                  {/* Quick Insights */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <InsightPill icon={Timer} label="Daily Avg" value={`${Math.round((metrics.studyTime.totalMinutes || 0) / timeframe)}m`} />
                    <InsightPill icon={Trophy} label="Quizzes" value={metrics.totalQuizzes} color="slate" />
                    <InsightPill icon={Shield} label="Badges" value={metrics.badges.length} color="blue" />
                    <InsightPill icon={Users} label="Accuracy" value={`${metrics.accuracy}%`} />
                  </div>
                </div>

                {/* Right Column - Profile & Badges */}
                <div className="lg:col-span-4 space-y-6">

                  {/* Level Progress Card */}
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="relative overflow-hidden rounded-3xl border border-slate-800/60 bg-gradient-to-br from-slate-900/80 to-slate-900/40 p-6 backdrop-blur-sm"
                  >
                    <div className="absolute -top-10 -right-10 opacity-5">
                      <Award size={180} className="text-white rotate-12" />
                    </div>

                    <div className="relative">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-teal-400 mb-1.5">
                            Current Level
                          </div>
                          <div className="text-2xl font-bold text-white">Scholar</div>
                        </div>
                        <LevelRing level={metrics.level} progress={metrics.levelProgress} />
                      </div>

                      <div className="space-y-3 mb-6">
                        <div className="flex justify-between text-xs font-medium text-slate-400">
                          <span>Progress to Level {metrics.level + 1}</span>
                          <span>{Math.round(metrics.levelProgress)}%</span>
                        </div>
                        <div className="h-2.5 w-full bg-slate-800/50 rounded-full overflow-hidden ring-1 ring-slate-700/50">
                          <motion.div
                            className="h-full bg-gradient-to-r from-teal-600 to-teal-400 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${metrics.levelProgress}%` }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                          />
                        </div>
                        <div className="text-[11px] text-slate-500 text-right">
                          {(metrics.xp % 1000)} / 1000 XP
                        </div>
                      </div>

                      <div className="pt-5 border-t border-slate-800/50">
                        <div className="flex items-center justify-between mb-4">
                          <div className="text-xs font-bold text-slate-300">Recent Achievements</div>
                          <button
                            onClick={() => navigate('/dashboard?tab=achievements')}
                            className="text-[11px] font-semibold text-teal-400 hover:text-teal-300 transition-colors flex items-center gap-1"
                          >
                            View All
                            <ArrowUpRight size={12} />
                          </button>
                        </div>
                        <div className="space-y-2.5">
                          {metrics.badges.length > 0 ? (
                            metrics.badges.slice(0, 3).map((badge, i) => (
                              <BadgeItem key={i} badge={badge} index={i} />
                            ))
                          ) : (
                            <div className="text-center py-6 text-slate-600">
                              <Star size={32} className="mx-auto mb-2 opacity-20" />
                              <p className="text-xs">No badges yet</p>
                              <p className="text-[10px] text-slate-700 mt-1">Keep learning to earn achievements</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  {/* Focus Areas */}
                  {analytics.weakAreas.length > 0 && (
                    <ChartCard
                      title="Focus Areas"
                      subtitle="Subjects needing attention"
                      icon={AlertCircle}
                    >
                      <div className="space-y-2.5">
                        {analytics.weakAreas.map((area, i) => (
                          <motion.button
                            key={i}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            onClick={() => navigate('/dashboard?tab=quizzes')}
                            className="group w-full flex items-center justify-between p-3 rounded-xl bg-slate-800/20 ring-1 ring-slate-800/40 hover:ring-teal-500/30 hover:bg-slate-800/40 transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-1 h-10 rounded-full bg-slate-700 group-hover:bg-teal-500 transition-colors" />
                              <div className="text-left">
                                <div className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors">
                                  {area.name}
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  {area.quizCount} quiz{area.quizCount !== 1 ? 'zes' : ''} • Below 70%
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-xl font-bold text-slate-500 group-hover:text-white tabular-nums transition-colors">
                                {area.score}%
                              </div>
                              <ChevronRight size={16} className="text-slate-700 group-hover:text-teal-400 transition-colors" />
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    </ChartCard>
                  )}
                </div>
              </div>

              {/* AI Insights */}
              <ChartCard
                title="AI Analysis"
                subtitle="Personalized insights powered by AI"
                icon={Brain}
              >
                <div className="prose prose-invert prose-sm max-w-none">
                  <AIAnalyticsReport
                    report={aiReport.report}
                    loading={aiReport.loading}
                    onGenerate={aiReport.generateReport}
                    canGenerate={aiReport.canGenerate}
                  />
                </div>
              </ChartCard>
            </motion.div>
          )}

          {activeView === 'performance' && (
            <motion.div
              key="performance"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center py-20 text-slate-400"
            >
              <Lightbulb size={48} className="mx-auto mb-4 opacity-20" />
              <p className="text-sm">Performance view coming soon...</p>
            </motion.div>
          )}

          {activeView === 'insights' && (
            <motion.div
              key="insights"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center py-20 text-slate-400"
            >
              <Sparkles size={48} className="mx-auto mb-4 opacity-20" />
              <p className="text-sm">Insights view coming soon...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

// ==================== 🛠️ UTILITY FUNCTIONS ====================
const formatStudyTime = (m) => {
  if (!m) return { display: '0h 0m', totalMinutes: 0 };
  const h = Math.floor(m / 60);
  const min = m % 60;
  return { display: h > 0 ? `${h}h ${min}m` : `${min}m`, totalMinutes: m };
};

const calculateTrend = (current, previous) => {
  if (!previous || previous === 0) return { dir: 'up', val: 'New' };
  const change = ((current - previous) / previous) * 100;
  return {
    dir: change >= 0 ? 'up' : 'down',
    val: `${change > 0 ? '+' : ''}${change.toFixed(0)}%`
  };
};

const useRealtimeStudySession = (userId) => {
  const [data, setData] = useState({ currentSession: null, isStudying: false });
  useEffect(() => {
    if (!userId) return;
    const unsub = onSnapshot(
      query(collection(db, 'studySessions'), where('userId', '==', userId), where('status', '==', 'active'), limit(1)),
      (snap) => {
        if (snap.empty) {
          setData({ currentSession: null, isStudying: false });
        } else {
          setData({
            currentSession: { id: snap.docs[0].id, ...snap.docs[0].data() },
            isStudying: true
          });
        }
      }
    );
    return () => unsub();
  }, [userId]);
  return data;
};

const useRealtimeAnalytics = (userId, timeframe) => {
  const { metrics, raw, loading, refresh } = useAnalyticsSync(userId, timeframe);

  const data = useMemo(() => {
    const empty = {
      studyTime: { totalMinutes: 0, sessionCount: 0, averageSessionLength: 0 },
      quizPerformance: { averageScore: 0, totalQuizzes: 0, accuracy: 0 },
      streak: 0,
      level: 1,
      xp: 0,
      nextLevelXp: 1000,
      badges: [],
      performance: [],
      weakAreas: []
    };

    if (loading || !metrics) return empty;

    const subStats = {};
    raw.quizSessions.forEach((q) => {
      const s = q.subject || 'General';
      if (!subStats[s]) subStats[s] = { scores: [], count: 0 };
      let score = q.score || 0;
      if (q.answers && score === 0) {
        const ans = Object.values(q.answers);
        if (ans.length) {
          score = (ans.filter(a => a.isCorrect || a.answer > 0).length / ans.length) * 100;
        }
      }
      subStats[s].scores.push(score);
      subStats[s].count++;
    });

    const perf = Object.entries(subStats)
      .map(([name, d]) => ({
        name,
        score: Math.round(d.scores.reduce((a, b) => a + b, 0) / d.scores.length),
        quizCount: d.count
      }))
      .sort((a, b) => b.score - a.score);

    return {
      studyTime: metrics.studyTime,
      quizPerformance: metrics.quizPerformance,
      streak: metrics.gamification.streak,
      level: metrics.gamification.level,
      xp: metrics.gamification.xp,
      nextLevelXp: 1000,
      badges: metrics.gamification.badges,
      weakAreas: perf.filter((p) => p.score < 70).slice(0, 3),
      performance: perf
    };
  }, [metrics, raw, loading]);

  return { ...data, loading, refetch: refresh };
};

export default Analytics;
