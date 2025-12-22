// src/features/analytics/components/AIAnalyticsReport.jsx
// Premium Light Edition - Teal × Royal Blue

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
        'A+': 'from-teal-500 to-emerald-600',
        'A': 'from-teal-500 to-blue-600',
        'A-': 'from-blue-500 to-cyan-600',
        'B+': 'from-blue-500 to-indigo-600',
        'B': 'from-indigo-500 to-purple-600',
        'B-': 'from-purple-500 to-blue-600',
        'C+': 'from-amber-500 to-yellow-600',
        'C': 'from-amber-600 to-orange-600',
        'C-': 'from-orange-600 to-red-500',
        'D': 'from-red-500 to-rose-600',
        'F': 'from-red-600 to-rose-700'
    };

    return (
        <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className={`w-16 h-16 rounded-xl bg-gradient-to-br ${gradeColors[grade] || gradeColors['B']} flex items-center justify-center shadow-lg`}
        >
            <span className="text-2xl font-bold text-white">{grade}</span>
        </motion.div>
    );
});

GradeBadge.displayName = 'GradeBadge';

// ==================== INSIGHT CARD ====================
const InsightCard = memo(({ insight, index }) => {
    const typeColors = {
        success: 'bg-teal-50 border-teal-200 text-teal-900',
        warning: 'bg-amber-50 border-amber-200 text-amber-900',
        info: 'bg-blue-50 border-blue-200 text-blue-900',
        celebration: 'bg-purple-50 border-purple-200 text-purple-900',
        danger: 'bg-rose-50 border-rose-200 text-rose-900'
    };

    const priorityBadge = {
        high: 'bg-rose-100 text-rose-700 border-rose-200',
        medium: 'bg-amber-100 text-amber-700 border-amber-200',
        low: 'bg-slate-100 text-slate-600 border-slate-200'
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            className={`p-4 rounded-xl border ${typeColors[insight.type] || typeColors.info} shadow-sm`}
        >
            <div className="flex items-start gap-2.5">
                <span className="text-xl">{insight.icon}</span>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                        <h4 className="font-bold text-xs truncate">{insight.title}</h4>
                        {insight.priority && (
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${priorityBadge[insight.priority] || priorityBadge.medium}`}>
                                {insight.priority.toUpperCase()}
                            </span>
                        )}
                    </div>
                    <p className="text-xs leading-relaxed opacity-90">{insight.description}</p>
                    {insight.metric && (
                        <p className="text-[10px] font-semibold mt-2 opacity-70">{insight.metric}</p>
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
        high: 'from-rose-500 to-pink-600',
        medium: 'from-amber-500 to-orange-600',
        low: 'from-slate-400 to-slate-500'
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + index * 0.08 }}
            whileHover={{ x: 4 }}
            className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-teal-300 transition-all"
        >
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${priorityColors[rec.priority] || priorityColors.medium} flex items-center justify-center shadow-sm flex-shrink-0`}>
                <ArrowRight size={14} className="text-white" strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900 text-xs truncate">{rec.action}</p>
                <p className="text-[10px] text-slate-600 mt-0.5 truncate">{rec.reason}</p>
            </div>
            <span className="text-[10px] font-semibold text-slate-500 bg-slate-50 px-2 py-1 rounded-md border border-slate-200 flex-shrink-0">
                {rec.timeframe}
            </span>
        </motion.div>
    );
});

RecommendationCard.displayName = 'RecommendationCard';

// ==================== PREDICTION PANEL ====================
const PredictionPanel = memo(({ predictions }) => {
    const trendIcons = {
        improving: { icon: TrendingUp, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200' },
        stable: { icon: Target, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
        declining: { icon: TrendingDown, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' }
    };

    const trend = trendIcons[predictions.trend] || trendIcons.stable;
    const TrendIcon = trend.icon;

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="p-5 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border border-slate-200 shadow-sm"
        >
            <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center shadow-sm">
                    <Rocket size={16} className="text-white" strokeWidth={2.5} />
                </div>
                <h3 className="font-bold text-sm text-slate-900">Performance Prediction</h3>
            </div>

            <div className="grid md:grid-cols-2 gap-3 mb-3">
                <div className={`p-3 ${trend.bg} rounded-lg border ${trend.border}`}>
                    <div className="flex items-center gap-2 mb-1.5">
                        <div className="p-1 rounded-md bg-white/50">
                            <TrendIcon size={14} className={trend.color} strokeWidth={2.5} />
                        </div>
                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">Trend</span>
                    </div>
                    <p className="font-bold text-base text-slate-900 capitalize">{predictions.trend}</p>
                    <p className="text-[10px] text-slate-600 mt-0.5">Confidence: {predictions.confidence}</p>
                </div>

                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="flex items-center gap-2 mb-1.5">
                        <div className="p-1 rounded-md bg-white/50">
                            <Star size={14} className="text-purple-600" strokeWidth={2.5} />
                        </div>
                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">Goal</span>
                    </div>
                    <p className="font-semibold text-xs text-slate-900 leading-relaxed">{predictions.monthlyGoal}</p>
                </div>
            </div>

            <div className="p-3 bg-white rounded-lg border border-slate-200">
                <p className="text-xs text-slate-700">
                    <span className="font-bold text-slate-900">Next Week:</span> {predictions.nextWeekForecast}
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
    // Loading State
    if (loading) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-gradient-to-br from-teal-50 via-white to-blue-50 rounded-2xl p-6 border border-slate-200 shadow-sm"
            >
                <div className="flex flex-col items-center justify-center py-10">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                        className="w-14 h-14 rounded-xl bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center shadow-lg mb-4"
                    >
                        <Brain size={26} className="text-white" strokeWidth={2} />
                    </motion.div>
                    <h3 className="text-base font-bold text-slate-900 mb-1">Analyzing Your Data</h3>
                    <p className="text-xs text-slate-600">Generating personalized insights...</p>

                    <div className="mt-6 flex gap-1.5">
                        {[0, 1, 2].map(i => (
                            <motion.div
                                key={i}
                                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                                className="w-2 h-2 rounded-full bg-teal-500"
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
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-rose-50 rounded-2xl p-6 border border-rose-200 text-center shadow-sm"
            >
                <div className="w-14 h-14 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center mx-auto mb-3">
                    <AlertCircle size={26} className="text-rose-600" strokeWidth={2} />
                </div>
                <h3 className="text-sm font-bold text-rose-900 mb-1">Unable to Generate Report</h3>
                <p className="text-xs text-rose-700 mb-4">{error}</p>
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onGenerate}
                    disabled={!canGenerate}
                    className="px-5 py-2 bg-rose-600 text-white rounded-lg text-xs font-bold shadow-sm hover:bg-rose-700 transition-all disabled:opacity-50"
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
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-teal-50 via-white to-blue-50 rounded-2xl p-6 border border-slate-200 shadow-sm text-center"
            >
                <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="w-16 h-16 rounded-xl bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center mx-auto mb-4 shadow-lg"
                >
                    <Sparkles size={30} className="text-white" strokeWidth={2} />
                </motion.div>

                <h3 className="text-lg font-bold text-slate-900 mb-2">AI Analytics Report</h3>
                <p className="text-xs text-slate-600 mb-6 max-w-md mx-auto leading-relaxed">
                    Get personalized insights, recommendations, and predictions powered by AI analysis.
                </p>

                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onGenerate}
                    disabled={!canGenerate}
                    className="px-6 py-3 bg-gradient-to-r from-teal-500 to-blue-600 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2 mx-auto"
                >
                    <Brain size={16} strokeWidth={2.5} />
                    Generate AI Report
                    <Sparkles size={14} strokeWidth={2.5} />
                </motion.button>

                {!canGenerate && (
                    <p className="text-[10px] text-slate-500 mt-3">Please wait before generating another report</p>
                )}
            </motion.div>
        );
    }

    // Report Display
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
        >
            {/* Header Card */}
            <div className="bg-gradient-to-br from-teal-50 via-white to-blue-50 rounded-2xl p-5 border border-slate-200 shadow-sm">
                <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-4">
                        <GradeBadge grade={report.overallGrade} />
                        <div className="flex-1">
                            <div className="flex items-center gap-1.5 mb-1">
                                <Sparkles size={14} className="text-teal-600" />
                                <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wide">AI Analysis</span>
                            </div>
                            <h2 className="text-base font-bold text-slate-900 leading-tight">{report.summaryHeadline}</h2>
                            {lastGenerated && (
                                <p className="text-[10px] text-slate-500 mt-1">
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
                        className="p-2 bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md hover:border-teal-300 transition-all disabled:opacity-50 flex-shrink-0"
                        title="Regenerate report"
                    >
                        <RefreshCw size={16} className="text-teal-600" strokeWidth={2.5} />
                    </motion.button>
                </div>

                {/* Motivational Message */}
                {report.motivationalMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="p-3 bg-gradient-to-r from-teal-100 to-blue-100 rounded-lg"
                    >
                        <p className="text-xs font-semibold text-slate-800 text-center">
                            ✨ {report.motivationalMessage}
                        </p>
                    </motion.div>
                )}
            </div>

            {/* Insights Grid */}
            {report.insights?.length > 0 && (
                <div className="grid md:grid-cols-2 gap-3">
                    {report.insights.map((insight, idx) => (
                        <InsightCard key={idx} insight={insight} index={idx} />
                    ))}
                </div>
            )}

            {/* Strengths & Improvements */}
            <div className="grid md:grid-cols-2 gap-4">
                {/* Strengths */}
                {report.strengths?.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, x: -15 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-teal-50 rounded-xl p-4 border border-teal-200 shadow-sm"
                    >
                        <div className="flex items-center gap-2.5 mb-3">
                            <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center shadow-sm">
                                <Shield size={16} className="text-white" strokeWidth={2.5} />
                            </div>
                            <h3 className="font-bold text-sm text-teal-900">Your Strengths</h3>
                        </div>
                        <ul className="space-y-2">
                            {report.strengths.map((strength, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                    <CheckCircle2 size={14} className="text-teal-600 mt-0.5 flex-shrink-0" strokeWidth={2.5} />
                                    <span className="text-xs font-medium text-teal-900 leading-relaxed">{strength}</span>
                                </li>
                            ))}
                        </ul>
                    </motion.div>
                )}

                {/* Improvements */}
                {report.improvements?.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, x: 15 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-amber-50 rounded-xl p-4 border border-amber-200 shadow-sm"
                    >
                        <div className="flex items-center gap-2.5 mb-3">
                            <div className="w-8 h-8 rounded-lg bg-amber-600 flex items-center justify-center shadow-sm">
                                <Flame size={16} className="text-white" strokeWidth={2.5} />
                            </div>
                            <h3 className="font-bold text-sm text-amber-900">Areas to Improve</h3>
                        </div>
                        <ul className="space-y-2">
                            {report.improvements.map((area, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                    <Lightbulb size={14} className="text-amber-600 mt-0.5 flex-shrink-0" strokeWidth={2.5} />
                                    <span className="text-xs font-medium text-amber-900 leading-relaxed">{area}</span>
                                </li>
                            ))}
                        </ul>
                    </motion.div>
                )}
            </div>

            {/* Recommendations */}
            {report.recommendations?.length > 0 && (
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2.5 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center shadow-sm">
                            <Target size={16} className="text-white" strokeWidth={2.5} />
                        </div>
                        <h3 className="font-bold text-sm text-slate-900">Action Recommendations</h3>
                    </div>
                    <div className="space-y-2.5">
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
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="p-4 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl border border-cyan-200 shadow-sm"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-sm flex-shrink-0">
                            <Lightbulb size={18} className="text-white" strokeWidth={2} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-xs text-cyan-900 mb-0.5">💡 Pro Study Tip</h4>
                            <p className="text-xs text-cyan-800 leading-relaxed">{report.studyTip}</p>
                        </div>
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
};

export default memo(AIAnalyticsReport);
