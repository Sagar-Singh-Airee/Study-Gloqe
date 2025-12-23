// src/pages/Analytics.jsx - PREMIUM LIGHT EDITION 💎 (Teal × Royal Blue)
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
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

import { useAuth } from '@auth/contexts/AuthContext';
import { db } from '@shared/config/firebase';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { useAnalyticsSync } from '@shared/services/realtimeSync';
import AIAnalyticsReport from '../components/AIAnalyticsReport';
import { useAIReport } from '../hooks/useAIReport';

// ==================== 🎨 LIGHT THEME DESIGN SYSTEM ====================
const COLORS = {
  primary: '#14b8a6',      // Teal
  primaryLight: '#5eead4',  // Teal Light
  royal: '#4169e1',        // Royal Blue
  royalLight: '#6b8aef',   // Royal Blue Light
  bg: '#ffffff',           // White
  bgSecondary: '#f8fafc',  // Slate 50
  bgTertiary: '#f1f5f9',   // Slate 100
  surface: '#ffffff',
  border: '#e2e8f0',       // Slate 200
  borderLight: '#f1f5f9',  // Slate 100
  text: '#0f172a',         // Slate 900
  textSecondary: '#475569', // Slate 600
  textMuted: '#64748b',    // Slate 500
  success: '#10b981',
  warning: '#f59e0b',
};

// ==================== 🧩 MICRO-COMPONENTS ====================

// 1. Compact Level Ring
const LevelRing = memo(({ level, progress, size = 60 }) => {
  const radius = size / 2 - 4;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

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

// 2. Compact Sparkline
const Sparkline = memo(({ data, color = COLORS.primary, height = 32 }) => (
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
));

// 3. Enhanced Compact Stat Card
const StatCard = memo(({ label, value, icon: Icon, trend, sparkData, onClick }) => (
  <motion.button
    type="button"
    onClick={onClick}
    className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:border-teal-400 hover:shadow-md"
    whileHover={{ y: -2 }}
    whileTap={{ scale: 0.98 }}
  >
    <div className="absolute inset-0 bg-gradient-to-br from-teal-50/50 to-blue-50/50 opacity-0 transition-opacity group-hover:opacity-100" />

    <div className="relative">
      <div className="flex items-start justify-between mb-3">
        <div className="rounded-lg bg-gradient-to-br from-teal-500 to-blue-600 p-2 shadow-sm">
          <Icon size={16} className="text-white" strokeWidth={2.5} />
        </div>
        {trend && (
          <div className={`flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${trend.dir === 'up'
            ? 'bg-emerald-50 text-emerald-700'
            : 'bg-slate-100 text-slate-600'
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

      <ChevronRight size={14} className="absolute bottom-3 right-3 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  </motion.button>
));

// 4. Compact Insight Pill
const InsightPill = memo(({ icon: Icon, label, value }) => (
  <motion.div
    className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm"
    whileHover={{ scale: 1.02 }}
  >
    <div className="rounded-md bg-gradient-to-br from-teal-100 to-blue-100 p-1.5">
      <Icon size={14} className="text-teal-700" strokeWidth={2.5} />
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-base font-bold text-slate-900 tabular-nums">{value}</div>
    </div>
  </motion.div>
));

// 5. Compact Badge Item
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
    <Star size={12} className="text-slate-300 group-hover:text-yellow-500 transition-colors" />
  </motion.div>
));

// 6. Premium Light Background
const PremiumBackground = memo(() => (
  <div className="fixed inset-0 -z-10 bg-white">
    <div className="absolute inset-0">
      <div className="absolute top-[-10%] right-[-5%] h-[600px] w-[600px] rounded-full bg-teal-100/40 blur-[120px]" />
      <div className="absolute bottom-[-10%] left-[-5%] h-[500px] w-[500px] rounded-full bg-blue-100/40 blur-[100px]" />
    </div>
    <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-40" />
  </div>
));

// 7. Chart Container
const ChartCard = memo(({ title, subtitle, icon: Icon, children, actions }) => (
  <motion.div
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
  >
    <div className="flex items-start justify-between mb-5">
      <div className="flex items-center gap-2.5">
        <div className="rounded-lg bg-gradient-to-br from-teal-500 to-blue-600 p-2 shadow-sm">
          <Icon size={16} className="text-white" strokeWidth={2.5} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          {subtitle && (
            <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>
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
  const [activeView, setActiveView] = useState('overview');

  const { currentSession, isStudying } = useRealtimeStudySession(user?.uid);
  const analytics = useRealtimeAnalytics(user?.uid, timeframe);
  const prevAnalytics = useRealtimeAnalytics(user?.uid, timeframe * 2);
  const aiReport = useAIReport(user?.uid, analytics);

  const generateSparkData = (value) => {
    return Array.from({ length: 7 }, (_, i) => ({
      value: Math.max(0, value * (0.7 + Math.random() * 0.5))
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
      sessionCount: analytics.studyTime.sessionCount
    };
  }, [analytics, prevAnalytics]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    analytics.refetch();
    toast.success('Analytics refreshed', {
      style: {
        background: '#ffffff',
        color: '#0f172a',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        fontSize: '13px',
        fontWeight: 600
      }
    });
    setTimeout(() => setIsRefreshing(false), 800);
  }, [analytics]);

  if (analytics.loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-14 h-14 mx-auto mb-3">
            <div className="absolute inset-0 border-2 border-slate-200 rounded-full" />
            <div className="absolute inset-0 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-sm font-medium text-slate-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {!embedded && <PremiumBackground />}

      <div className={`relative ${embedded ? 'pb-10' : 'min-h-screen p-4 md:p-6 max-w-[1600px] mx-auto'}`}>

        {/* === COMPACT HEADER === */}
        <header className="mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-1">
                Analytics Dashboard
              </h1>
              <p className="text-xs text-slate-600">
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
                className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-white transition-all"
              >
                <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
              </button>

              <button className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-white transition-all">
                <Download size={14} />
              </button>
            </div>
          </div>
        </header>

        {/* === MAIN CONTENT === */}
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
                  sparkData={generateSparkData(metrics.studyTime.totalMinutes || 50)}
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
                  sparkData={generateSparkData(metrics.streak * 8)}
                />
                <StatCard
                  icon={Zap}
                  label="Total XP"
                  value={(metrics.xp / 1000).toFixed(1) + 'k'}
                  trend={{ dir: 'up', val: `L${metrics.level}` }}
                  sparkData={generateSparkData(metrics.xp / 8)}
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
                      <button className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-900 transition-colors">
                        <Filter size={13} />
                      </button>
                    }
                  >
                    <div className="h-[260px] w-full">
                      {analytics.performance.length > 0 ? (
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
                              contentStyle={{
                                backgroundColor: '#ffffff',
                                border: '1px solid #e2e8f0',
                                borderRadius: '10px',
                                padding: '10px',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                              }}
                              itemStyle={{ color: '#0f172a', fontSize: '11px', fontWeight: 600 }}
                              labelStyle={{ color: '#64748b', fontSize: '10px', marginBottom: '6px' }}
                            />
                            <Bar dataKey="score" radius={[6, 6, 0, 0]} animationDuration={1200}>
                              {analytics.performance.slice(0, 6).map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={entry.score > 70 ? 'url(#barGrad)' : '#cbd5e1'}
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                          <BookOpen size={40} className="mb-3 opacity-20" />
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
                    <InsightPill icon={Users} label="Accuracy" value={`${metrics.accuracy}%`} />
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
                        <div className="text-xl font-bold text-slate-900">Scholar</div>
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
                          animate={{ width: `${metrics.levelProgress}%` }}
                          transition={{ duration: 1.2, ease: "easeOut" }}
                        />
                      </div>
                      <div className="text-[10px] text-slate-500 text-right">
                        {(metrics.xp % 1000)} / 1000 XP to next level
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
                          metrics.badges.slice(0, 3).map((badge, i) => (
                            <BadgeItem key={i} badge={badge} index={i} />
                          ))
                        ) : (
                          <div className="text-center py-6 text-slate-400">
                            <Star size={28} className="mx-auto mb-2 opacity-20" />
                            <p className="text-[11px] font-medium">No achievements yet</p>
                            <p className="text-[10px] text-slate-500 mt-1">Keep learning to earn badges</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>

                  {/* Focus Areas */}
                  {analytics.weakAreas.length > 0 && (
                    <ChartCard
                      title="Focus Areas"
                      subtitle="Needs improvement"
                      icon={AlertCircle}
                    >
                      <div className="space-y-2">
                        {analytics.weakAreas.map((area, i) => (
                          <motion.button
                            key={i}
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
              <ChartCard
                title="AI-Powered Insights"
                subtitle="Personalized recommendations"
                icon={Brain}
              >
                <div className="prose prose-slate prose-sm max-w-none">
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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-20 text-slate-400"
            >
              <BarChart3 size={44} className="mx-auto mb-3 opacity-20" />
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
              <Sparkles size={44} className="mx-auto mb-3 opacity-20" />
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
      (snap) => setData(snap.empty ? { currentSession: null, isStudying: false } : {
        currentSession: { id: snap.docs[0].id, ...snap.docs[0].data() },
        isStudying: true
      })
    );
    return () => unsub();
  }, [userId]);
  return data;
};

const useRealtimeAnalytics = (userId, timeframe) => {
  const { metrics, raw, loading, refresh } = useAnalyticsSync(userId, timeframe);

  const data = useMemo(() => {
    const empty = {
      studyTime: { totalMinutes: 0, sessionCount: 0 },
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
        if (ans.length) score = (ans.filter(a => a.isCorrect || a.answer > 0).length / ans.length) * 100;
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
      nextLevelXp: metrics.gamification.nextLevelXp,
      badges: metrics.gamification.badges,
      weakAreas: perf.filter((p) => p.score < 70).slice(0, 3),
      performance: perf
    };
  }, [metrics, raw, loading]);

  return { ...data, loading, refetch: refresh };
};

export default Analytics;
