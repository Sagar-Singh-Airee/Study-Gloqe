// src/features/analytics/components/AIAnalyticsReport.jsx
// Premium AI-generated analytics report component

import { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Brain, Sparkles, TrendingUp, TrendingDown, Lightbulb, Target,
    ChevronRight, Zap, Award, Clock, RefreshCw, AlertCircle,
    CheckCircle2, Star, Rocket, ArrowRight, Shield, Flame
} from 'lucide-react';

// ==================== GRADE BADGE ====================
const GradeBadge = memo(({ grade }) => {
    const gradeColors = {
        'A+': 'from-emerald-400 to-green-500',
        'A': 'from-emerald-500 to-teal-500',
        'A-': 'from-teal-500 to-cyan-500',
        'B+': 'from-blue-400 to-cyan-500',
        'B': 'from-blue-500 to-indigo-500',
        'B-': 'from-indigo-500 to-purple-500',
        'C+': 'from-amber-400 to-yellow-500',
        'C': 'from-amber-500 to-orange-500',
        'C-': 'from-orange-500 to-red-400',
        'D': 'from-red-400 to-rose-500',
        'F': 'from-red-500 to-rose-600'
    };

    return (
        <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${gradeColors[grade] || gradeColors['B']} flex items-center justify-center shadow-2xl`}
        >
            <span className="text-3xl font-black text-white drop-shadow-lg">{grade}</span>
        </motion.div>
    );
});

GradeBadge.displayName = 'GradeBadge';

// ==================== INSIGHT CARD ====================
const InsightCard = memo(({ insight, index }) => {
    const typeColors = {
        success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
        warning: 'bg-amber-50 border-amber-200 text-amber-800',
        info: 'bg-blue-50 border-blue-200 text-blue-800',
        celebration: 'bg-purple-50 border-purple-200 text-purple-800',
        danger: 'bg-rose-50 border-rose-200 text-rose-800'
    };

    const priorityBadge = {
        high: 'bg-rose-100 text-rose-700',
        medium: 'bg-amber-100 text-amber-700',
        low: 'bg-slate-100 text-slate-600'
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`p-5 rounded-2xl border-2 ${typeColors[insight.type] || typeColors.info} backdrop-blur-xl`}
        >
            <div className="flex items-start gap-3">
                <span className="text-2xl">{insight.icon}</span>
                <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="font-black text-sm">{insight.title}</h4>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${priorityBadge[insight.priority] || priorityBadge.medium}`}>
                            {insight.priority?.toUpperCase()}
                        </span>
                    </div>
                    <p className="text-sm opacity-90 leading-relaxed">{insight.description}</p>
                    {insight.metric && (
                        <p className="text-xs font-bold mt-2 opacity-70">{insight.metric}</p>
                    )}
                </div>
            </div>
        </motion.div>
    );
});

InsightCard.displayName = 'InsightCard';

// ==================== RECOMMENDATION CARD ====================
const RecommendationCard = memo(({ rec, index }) => {
    const priorityColors = {
        high: 'from-rose-500 to-pink-500',
        medium: 'from-amber-500 to-orange-500',
        low: 'from-slate-500 to-gray-500'
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + index * 0.1 }}
            whileHover={{ scale: 1.02, x: 5 }}
            className="flex items-center gap-4 p-4 bg-white/60 backdrop-blur-xl rounded-2xl border border-white/40 shadow-lg hover:shadow-xl transition-all"
        >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${priorityColors[rec.priority] || priorityColors.medium} flex items-center justify-center shadow-lg`}>
                <ArrowRight size={18} className="text-white" strokeWidth={3} />
            </div>
            <div className="flex-1">
                <p className="font-bold text-slate-800 text-sm">{rec.action}</p>
                <p className="text-xs text-slate-500 mt-1">{rec.reason}</p>
            </div>
            <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full">
                {rec.timeframe}
            </span>
        </motion.div>
    );
});

RecommendationCard.displayName = 'RecommendationCard';

// ==================== PREDICTION PANEL ====================
const PredictionPanel = memo(({ predictions }) => {
    const trendIcons = {
        improving: { icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-100' },
        stable: { icon: Target, color: 'text-blue-500', bg: 'bg-blue-100' },
        declining: { icon: TrendingDown, color: 'text-rose-500', bg: 'bg-rose-100' }
    };

    const trend = trendIcons[predictions.trend] || trendIcons.stable;
    const TrendIcon = trend.icon;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl text-white shadow-2xl"
        >
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                    <Rocket size={20} className="text-white" strokeWidth={2.5} />
                </div>
                <h3 className="font-black text-lg">Performance Prediction</h3>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                        <div className={`p-1.5 rounded-lg ${trend.bg}`}>
                            <TrendIcon size={16} className={trend.color} strokeWidth={3} />
                        </div>
                        <span className="text-xs font-bold text-white/60 uppercase">Trend</span>
                    </div>
                    <p className="font-black text-xl capitalize">{predictions.trend}</p>
                    <p className="text-xs text-white/50 mt-1">Confidence: {predictions.confidence}</p>
                </div>

                <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 rounded-lg bg-purple-100">
                            <Star size={16} className="text-purple-500" strokeWidth={3} />
                        </div>
                        <span className="text-xs font-bold text-white/60 uppercase">Monthly Goal</span>
                    </div>
                    <p className="font-bold text-sm leading-relaxed">{predictions.monthlyGoal}</p>
                </div>
            </div>

            <div className="mt-4 p-4 bg-white/5 rounded-2xl border border-white/10">
                <p className="text-sm font-medium text-white/80">
                    <span className="font-black text-white">Next Week:</span> {predictions.nextWeekForecast}
                </p>
            </div>
        </motion.div>
    );
});

PredictionPanel.displayName = 'PredictionPanel';

// ==================== MAIN COMPONENT ====================
const AIAnalyticsReport = ({
    report,
    loading,
    error,
    onGenerate,
    canGenerate,
    lastGenerated
}) => {
    const [expandedSection, setExpandedSection] = useState('insights');

    // Loading State
    if (loading) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-gradient-to-br from-purple-50 via-white to-pink-50 rounded-3xl p-8 border-2 border-purple-200 shadow-2xl"
            >
                <div className="flex flex-col items-center justify-center py-12">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                        className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-xl mb-6"
                    >
                        <Brain size={32} className="text-white" strokeWidth={2} />
                    </motion.div>
                    <h3 className="text-xl font-black text-slate-800 mb-2">Analyzing Your Data...</h3>
                    <p className="text-sm text-slate-500">AI is generating personalized insights</p>

                    <div className="mt-8 flex gap-2">
                        {[0, 1, 2].map(i => (
                            <motion.div
                                key={i}
                                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                                className="w-3 h-3 rounded-full bg-purple-500"
                            />
                        ))}
                    </div>
                </div>
            </motion.div>
        );
    }

    // Error State
    if (error) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-rose-50 rounded-3xl p-8 border-2 border-rose-200 text-center"
            >
                <div className="w-16 h-16 rounded-2xl bg-rose-100 flex items-center justify-center mx-auto mb-4">
                    <AlertCircle size={32} className="text-rose-500" strokeWidth={2} />
                </div>
                <h3 className="text-lg font-black text-rose-800 mb-2">Unable to Generate Report</h3>
                <p className="text-sm text-rose-600 mb-6">{error}</p>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onGenerate}
                    disabled={!canGenerate}
                    className="px-6 py-3 bg-rose-500 text-white rounded-xl font-bold shadow-lg hover:bg-rose-600 transition-all disabled:opacity-50"
                >
                    Try Again
                </motion.button>
            </motion.div>
        );
    }

    // No Report State
    if (!report) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-purple-50 via-white to-pink-50 rounded-3xl p-8 border-2 border-purple-200 shadow-xl text-center"
            >
                <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-6 shadow-2xl"
                >
                    <Sparkles size={36} className="text-white" strokeWidth={2} />
                </motion.div>

                <h3 className="text-2xl font-black text-slate-800 mb-3">AI Analytics Report</h3>
                <p className="text-slate-600 mb-8 max-w-md mx-auto">
                    Get personalized insights, recommendations, and predictions powered by AI analysis of your learning data.
                </p>

                <motion.button
                    whileHover={{ scale: 1.05, boxShadow: '0 20px 40px rgba(168, 85, 247, 0.3)' }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onGenerate}
                    disabled={!canGenerate}
                    className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl font-black shadow-xl hover:shadow-2xl transition-all disabled:opacity-50 flex items-center gap-3 mx-auto"
                >
                    <Brain size={20} strokeWidth={2.5} />
                    Generate AI Report
                    <Sparkles size={18} strokeWidth={2.5} />
                </motion.button>

                {!canGenerate && (
                    <p className="text-xs text-slate-400 mt-4">Please wait before generating another report</p>
                )}
            </motion.div>
        );
    }

    // Report Display
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
        >
            {/* Header Card */}
            <div className="bg-gradient-to-br from-purple-50 via-white to-pink-50 rounded-3xl p-8 border-2 border-purple-200 shadow-xl">
                <div className="flex items-start justify-between flex-wrap gap-6">
                    <div className="flex items-center gap-6">
                        <GradeBadge grade={report.overallGrade} />
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Sparkles size={18} className="text-purple-500" />
                                <span className="text-xs font-black text-purple-600 uppercase tracking-wider">AI Analysis</span>
                            </div>
                            <h2 className="text-2xl font-black text-slate-800 mb-1">{report.summaryHeadline}</h2>
                            {lastGenerated && (
                                <p className="text-xs text-slate-400">
                                    Generated {lastGenerated.toLocaleString()}
                                </p>
                            )}
                        </div>
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.05, rotate: 180 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onGenerate}
                        disabled={!canGenerate || loading}
                        className="p-3 bg-white rounded-xl border-2 border-purple-200 shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                        title="Regenerate report"
                    >
                        <RefreshCw size={20} className="text-purple-600" strokeWidth={2.5} />
                    </motion.button>
                </div>

                {/* Motivational Message */}
                {report.motivationalMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="mt-6 p-4 bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl"
                    >
                        <p className="text-purple-800 font-semibold text-center">
                            ✨ {report.motivationalMessage}
                        </p>
                    </motion.div>
                )}
            </div>

            {/* Insights Grid */}
            {report.insights?.length > 0 && (
                <div className="grid md:grid-cols-2 gap-4">
                    {report.insights.map((insight, idx) => (
                        <InsightCard key={idx} insight={insight} index={idx} />
                    ))}
                </div>
            )}

            {/* Strengths & Improvements */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Strengths */}
                {report.strengths?.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-emerald-50 rounded-3xl p-6 border-2 border-emerald-200"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg">
                                <Shield size={20} className="text-white" strokeWidth={2.5} />
                            </div>
                            <h3 className="font-black text-emerald-800">Your Strengths</h3>
                        </div>
                        <ul className="space-y-3">
                            {report.strengths.map((strength, idx) => (
                                <li key={idx} className="flex items-center gap-3">
                                    <CheckCircle2 size={18} className="text-emerald-500" strokeWidth={3} />
                                    <span className="text-sm font-semibold text-emerald-800">{strength}</span>
                                </li>
                            ))}
                        </ul>
                    </motion.div>
                )}

                {/* Improvements */}
                {report.improvements?.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-amber-50 rounded-3xl p-6 border-2 border-amber-200"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shadow-lg">
                                <Flame size={20} className="text-white" strokeWidth={2.5} />
                            </div>
                            <h3 className="font-black text-amber-800">Areas to Improve</h3>
                        </div>
                        <ul className="space-y-3">
                            {report.improvements.map((area, idx) => (
                                <li key={idx} className="flex items-center gap-3">
                                    <Lightbulb size={18} className="text-amber-500" strokeWidth={3} />
                                    <span className="text-sm font-semibold text-amber-800">{area}</span>
                                </li>
                            ))}
                        </ul>
                    </motion.div>
                )}
            </div>

            {/* Recommendations */}
            {report.recommendations?.length > 0 && (
                <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 border border-white/40 shadow-xl">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg">
                            <Target size={20} className="text-white" strokeWidth={2.5} />
                        </div>
                        <h3 className="font-black text-slate-800 text-lg">Action Recommendations</h3>
                    </div>
                    <div className="space-y-3">
                        {report.recommendations.map((rec, idx) => (
                            <RecommendationCard key={idx} rec={rec} index={idx} />
                        ))}
                    </div>
                </div>
            )}

            {/* Predictions */}
            {report.predictions && (
                <PredictionPanel predictions={report.predictions} />
            )}

            {/* Study Tip */}
            {report.studyTip && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="p-6 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-3xl border-2 border-cyan-200"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-xl">
                            <Lightbulb size={24} className="text-white" strokeWidth={2} />
                        </div>
                        <div>
                            <h4 className="font-black text-cyan-800 mb-1">💡 Pro Study Tip</h4>
                            <p className="text-sm text-cyan-700">{report.studyTip}</p>
                        </div>
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
};

export default memo(AIAnalyticsReport);
