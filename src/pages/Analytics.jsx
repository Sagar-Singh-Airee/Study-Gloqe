// src/pages/Analytics.jsx - Premium Apple-Inspired Student Analytics Dashboard
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  Clock,
  Target,
  Award,
  Zap,
  BookOpen,
  Brain,
  TrendingDown,
  RefreshCw,
  Calendar,
  Flame,
  Star,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Activity,
  Sparkles,
  Rocket,
  Eye,
} from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { useCompleteAnalytics } from '@/hooks/useAnalytics';
import { useRecommendations } from '@/hooks/useRecommendations';
import { useGamification } from '@/hooks/useGamification';
import LevelProgress from '@/components/gamification/LevelProgress';
import toast from 'react-hot-toast';

// ========== PREMIUM METRIC CARD COMPONENT ==========
const PremiumMetricCard = ({ 
  icon: Icon, 
  title, 
  value, 
  subtitle, 
  gradient, 
  delay = 0,
  trend,
  trendValue 
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    whileHover={{ y: -8, transition: { duration: 0.3 } }}
    className={`relative bg-gradient-to-br ${gradient} rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-white border-opacity-20 backdrop-blur-sm overflow-hidden group`}
  >
    {/* Animated background gradient effect */}
    <div className="absolute inset-0 bg-gradient-to-br from-white to-transparent opacity-0 group-hover:opacity-10 transition-opacity duration-300" />

    <div className="relative z-10">
      <div className="flex items-start justify-between mb-4">
        <div className="w-14 h-14 rounded-2xl bg-white bg-opacity-20 backdrop-blur-md flex items-center justify-center shadow-lg">
          <Icon size={28} className="text-white" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
            trend === 'up' ? 'bg-green-400 bg-opacity-20 text-green-300' : 'bg-red-400 bg-opacity-20 text-red-300'
          }`}>
            {trend === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {trendValue}
          </div>
        )}
      </div>

      <p className="text-white text-opacity-80 text-sm font-semibold mb-2 uppercase tracking-wide">
        {title}
      </p>
      <p className="text-3xl font-black text-white mb-1">{value}</p>
      <p className="text-white text-opacity-60 text-sm font-medium">{subtitle}</p>
    </div>
  </motion.div>
);

// ========== ANIMATED PROGRESS BAR ==========
const AnimatedProgressBar = ({ score, label }) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <span className="font-semibold text-gray-900 text-sm">{label}</span>
      <span className="text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
        {score}%
      </span>
    </div>
    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden shadow-inner">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${score}%` }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        className={`h-full rounded-full ${
          score >= 80
            ? 'bg-gradient-to-r from-green-400 to-emerald-600'
            : score >= 60
            ? 'bg-gradient-to-r from-amber-400 to-orange-600'
            : 'bg-gradient-to-r from-red-400 to-rose-600'
        }`}
      />
    </div>
  </div>
);

// ========== STAT ITEM COMPONENT ==========
const StatItem = ({ label, value, icon: Icon, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay }}
    className="flex items-center justify-between py-3 px-4 rounded-xl hover:bg-gray-50 transition-colors group"
  >
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-gray-100 group-hover:bg-gray-200 transition-colors flex items-center justify-center">
        <Icon size={18} className="text-gray-700" />
      </div>
      <span className="text-sm font-semibold text-gray-600">{label}</span>
    </div>
    <span className="text-lg font-bold text-gray-900">{value}</span>
  </motion.div>
);

// ========== MAIN COMPONENT ==========
const Analytics = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [timeframe, setTimeframe] = useState(30);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { 
    level: gamificationLevel, 
    xp: gamificationXP, 
    nextLevelXp: gamNextLevelXP 
  } = useGamification();

  const {
    analytics,
    quizPerformance,
    studyTime,
    patterns,
    trends,
    streaks,
    performance,
    weakAreas,
    loading,
    error,
    refetchAll,
  } = useCompleteAnalytics(user?.uid, timeframe);

  const { recommendations, loading: recLoading } = useRecommendations(user?.uid, 5);

  useEffect(() => {
    if (!user?.uid) {
      navigate('/auth');
    }
  }, [user?.uid, navigate]);

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await refetchAll?.();
      toast.success('Analytics refreshed!', {
        icon: '✨',
        style: {
          background: '#000',
          color: '#fff',
          fontWeight: '600',
          borderRadius: '12px',
          padding: '16px 24px',
        },
        duration: 2500,
      });
    } catch (err) {
      console.error('Refresh error:', err);
      toast.error('Failed to refresh analytics');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <motion.div 
            animate={{ rotate: 360 }} 
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <div className="w-16 h-16 rounded-full border-4 border-gray-200 border-t-black mx-auto" />
          </motion.div>
          <p className="text-gray-700 font-semibold mt-6 text-lg">Loading your analytics...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-xl border border-gray-200"
        >
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={32} className="text-red-600" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Unable to Load</h2>
          <p className="text-gray-600 mb-6 text-sm">{typeof error === 'string' ? error : 'Something went wrong.'}</p>
          <motion.button
            onClick={handleRefresh}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-full px-6 py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-colors"
          >
            Try Again
          </motion.button>
        </motion.div>
      </div>
    );
  }

  // Safe data extraction
  const totalStudyTime = studyTime?.totalMinutes ?? 0;
  const avgQuizScore = quizPerformance?.averageScore ?? 0;
  const currentStreak = streaks?.currentStreak ?? 0;
  const totalXP = analytics?.bigQuery?.totalXP ?? gamificationXP ?? 0;
  const level = analytics?.bigQuery?.level ?? gamificationLevel ?? 1;
  const nextLevelXP = analytics?.bigQuery?.nextLevelXP ?? gamNextLevelXP ?? 1000;
  const levelProgress = nextLevelXP > 0 ? Number(((totalXP / nextLevelXP) * 100).toFixed(1)) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* ========== HEADER ========== */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white bg-opacity-50 backdrop-blur-md border-b border-gray-200 sticky top-0 z-40"
      >
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-black text-gray-900 mb-1">Analytics</h1>
              <p className="text-gray-600 font-medium flex items-center gap-2">
                <Activity size={16} />
                Your learning journey at a glance
              </p>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(Number(e.target.value))}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-black transition-all"
              >
                <option value={7}>Last 7 Days</option>
                <option value={30}>Last 30 Days</option>
                <option value={90}>Last 90 Days</option>
                <option value={365}>This Year</option>
              </select>

              <motion.button
                onClick={handleRefresh}
                disabled={isRefreshing}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                className="p-2.5 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                <RefreshCw 
                  size={20} 
                  className={isRefreshing ? 'animate-spin' : ''} 
                />
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ========== MAIN CONTENT ========== */}
      <div className="max-w-7xl mx-auto px-6 py-10">

        {/* ========== PREMIUM METRICS GRID ========== */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <PremiumMetricCard
            icon={Clock}
            title="Study Time"
            value={`${Math.floor(totalStudyTime / 60)}h ${totalStudyTime % 60}m`}
            subtitle={timeframe === 7 ? 'This Week' : timeframe === 30 ? 'This Month' : 'Total'}
            gradient="from-blue-500 via-cyan-500 to-blue-600"
            delay={0}
            trend="up"
            trendValue="+12%"
          />

          <PremiumMetricCard
            icon={Target}
            title="Quiz Score"
            value={`${avgQuizScore.toFixed(1)}%`}
            subtitle={avgQuizScore >= 80 ? '✨ Excellent' : avgQuizScore >= 60 ? '📈 Good' : '🎯 Keep practicing'}
            gradient="from-green-500 via-emerald-500 to-green-600"
            delay={0.1}
            trend={avgQuizScore >= 75 ? 'up' : 'down'}
            trendValue={avgQuizScore >= 75 ? '+5%' : '-3%'}
          />

          <PremiumMetricCard
            icon={Flame}
            title="Study Streak"
            value={`${currentStreak}d`}
            subtitle={currentStreak === 0 ? '🚀 Start today!' : '🔥 Keep momentum!'}
            gradient="from-orange-500 via-red-500 to-orange-600"
            delay={0.2}
            trend="up"
            trendValue="+3d"
          />

          <PremiumMetricCard
            icon={Zap}
            title="Total XP"
            value={totalXP.toLocaleString()}
            subtitle={`Level ${level} • Progress ${levelProgress}%`}
            gradient="from-purple-500 via-violet-500 to-purple-600"
            delay={0.3}
            trend="up"
            trendValue="+250 XP"
          />
        </div>

        {/* ========== LEVEL PROGRESS ========== */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-8"
        >
          <LevelProgress
            level={level}
            currentXP={totalXP}
            nextLevelXP={nextLevelXP}
            levelProgress={levelProgress}
          />
        </motion.div>

        {/* ========== MAIN GRID ========== */}
        <div className="grid lg:grid-cols-3 gap-6">

          {/* ===== LEFT COLUMN (2/3) ===== */}
          <div className="lg:col-span-2 space-y-6">

            {/* Subject Performance */}
            {performance && performance.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center">
                    <BookOpen size={24} className="text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-gray-900">Subject Performance</h2>
                    <p className="text-sm text-gray-500 mt-0.5">Track your mastery by topic</p>
                  </div>
                </div>

                <div className="space-y-5">
                  {performance.slice(0, 5).map((subject, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.08 }}
                    >
                      <AnimatedProgressBar 
                        score={subject.score || 0}
                        label={subject.name || 'Unknown'}
                      />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Learning Patterns */}
            {patterns && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center">
                    <Brain size={24} className="text-purple-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-gray-900">Learning Patterns</h2>
                    <p className="text-sm text-gray-500 mt-0.5">Insights into your study habits</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    { label: 'Best Study Time', value: patterns.bestStudyTime || 'Morning', icon: Clock },
                    { label: 'Avg Session', value: (patterns.avgSessionLength || '25') + ' min', icon: Zap },
                    { label: 'Study Days/Week', value: (patterns.studyDaysPerWeek || '5') + '/7', icon: Calendar },
                    { label: 'Completion Rate', value: (patterns.completionRate || '85') + '%', icon: CheckCircle2 },
                  ].map((item, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-5 border border-gray-100 hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-black bg-opacity-5 flex items-center justify-center">
                          <item.icon size={18} className="text-gray-700" />
                        </div>
                        <p className="text-xs text-gray-600 font-bold uppercase tracking-wide">{item.label}</p>
                      </div>
                      <p className="text-2xl font-black text-gray-900">{item.value}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Weak Areas */}
            {weakAreas && weakAreas.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-gradient-to-br from-red-50 to-rose-50 rounded-3xl border border-red-200 p-8 shadow-sm hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-red-200 flex items-center justify-center">
                    <Sparkles size={24} className="text-red-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-red-900">Areas for Improvement</h2>
                    <p className="text-sm text-red-700 mt-0.5">Focus areas to boost your scores</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {weakAreas.slice(0, 4).map((area, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="bg-white rounded-2xl p-4 border border-red-100 hover:border-red-300 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 mb-1 text-sm">{area.topic || 'Topic'}</h3>
                          <p className="text-xs text-gray-600">{area.description}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xl font-black text-red-600">{area.score}%</p>
                          <p className="text-xs text-gray-600 font-semibold">Accuracy</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* ===== RIGHT COLUMN (1/3) ===== */}
          <div className="space-y-6">

            {/* AI Recommendations */}
            {recommendations && recommendations.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-50 rounded-3xl border border-amber-200 p-6 shadow-sm hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-amber-200 flex items-center justify-center">
                    <Star size={20} className="text-amber-600" />
                  </div>
                  <h2 className="text-lg font-black text-amber-900">AI Tips</h2>
                </div>

                <div className="space-y-3">
                  {recommendations.slice(0, 4).map((rec, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="bg-white rounded-2xl p-4 border border-amber-100 hover:border-amber-300 transition-colors group cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-amber-600 mt-2 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-900 text-sm mb-1">{rec.title || 'Tip'}</h3>
                          <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">{rec.description}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm hover:shadow-lg transition-all duration-300"
            >
              <h2 className="text-lg font-black text-gray-900 mb-4">Quick Actions</h2>

              <div className="space-y-3">
                {[
                  { label: 'Start Study', icon: Rocket, color: 'bg-black text-white', action: '/study' },
                  { label: 'Take Quiz', icon: Target, color: 'bg-blue-100 text-blue-700 hover:bg-blue-200', action: '/dashboard?tab=quizzes' },
                  { label: 'View Achievements', icon: Award, color: 'bg-purple-100 text-purple-700 hover:bg-purple-200', action: '/dashboard?tab=achievements' },
                ].map((btn, idx) => (
                  <motion.button
                    key={idx}
                    onClick={() => navigate(btn.action)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full px-4 py-3 ${btn.color} rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm`}
                  >
                    <btn.icon size={18} />
                    {btn.label}
                  </motion.button>
                ))}
              </div>
            </motion.div>

            {/* Stats Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gradient-to-br from-gray-900 to-black text-white rounded-3xl p-6 shadow-sm hover:shadow-lg transition-all duration-300"
            >
              <h2 className="text-lg font-black mb-5">Your Stats</h2>

              <div className="space-y-1">
                <StatItem label="Quizzes Taken" value={quizPerformance?.totalQuizzes || 0} icon={BarChart3} delay={0} />
                <StatItem label="Documents" value={analytics?.bigQuery?.documentsRead || 0} icon={BookOpen} delay={0.05} />
                <StatItem label="Flashcards" value={analytics?.bigQuery?.flashcardsReviewed || 0} icon={Brain} delay={0.1} />
                <StatItem label="Study Rooms" value={analytics?.bigQuery?.roomsJoined || 0} icon={Eye} delay={0.15} />
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;