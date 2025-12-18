// src/features/analytics/insights/LearningInsights.jsx - ✅ FULLY FIXED
import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { Lightbulb, TrendingUp, AlertTriangle, CheckCircle2, Zap, Target, Trophy, ArrowRight } from 'lucide-react';

const LearningInsights = ({ quizSessions, studySessions, subjectPerformance }) => {
    // Generate AI insights
    const insights = useMemo(() => {
        const generated = []; // ✅ FIXED: Initialize array

        // Study Time Insight
        const totalStudyMinutes = studySessions.reduce((sum, s) => sum + (s.totalTime || 0), 0);
        const avgSessionLength = studySessions.length > 0 ? totalStudyMinutes / studySessions.length : 0;

        if (avgSessionLength < 25 && avgSessionLength > 0) {
            generated.push({
                type: 'warning',
                icon: AlertTriangle,
                color: 'amber',
                title: 'Short Study Sessions',
                message: `Your average session is ${Math.round(avgSessionLength)} minutes. Consider 45-60 minute sessions for better retention.`,
                action: 'Increase session length'
            });
        } else if (avgSessionLength > 90) {
            generated.push({
                type: 'tip',
                icon: Zap,
                color: 'gray',
                title: 'Long Sessions Detected',
                message: 'You study for long periods. Take 10-15 minute breaks every hour to maintain focus.',
                action: 'Use Pomodoro technique'
            });
        }

        // Performance Insight
        if (subjectPerformance.length > 0) {
            const weakSubjects = subjectPerformance.filter(s => s.avgScore < 70);
            if (weakSubjects.length > 0) {
                generated.push({
                    type: 'warning',
                    icon: Target,
                    color: 'red',
                    title: 'Areas Needing Focus',
                    message: `You're scoring below 70% in ${weakSubjects.length} subject(s): ${weakSubjects.slice(0, 2).map(s => s.subject).join(', ')}${weakSubjects.length > 2 ? '...' : ''}`,
                    action: 'Review these topics'
                });
            }

            const strongSubjects = subjectPerformance.filter(s => s.avgScore >= 85);
            if (strongSubjects.length > 0) {
                generated.push({
                    type: 'success',
                    icon: CheckCircle2,
                    color: 'black',
                    title: 'Strong Performance',
                    message: `Excellent work in ${strongSubjects.length} subject(s)! You're mastering ${strongSubjects[0].subject}.`,
                    action: 'Maintain consistency'
                });
            }
        }

        // Consistency Insight
        const activeDays = new Set(
            [...quizSessions, ...studySessions].map(s => 
                (s.completedAt || s.startTime)?.toDateString()
            ).filter(Boolean)
        ).size;

        if (activeDays >= 5) {
            generated.push({
                type: 'success',
                icon: TrendingUp,
                color: 'black',
                title: 'Consistent Learner',
                message: `You've been active ${activeDays} days recently. This consistency builds strong habits!`,
                action: 'Keep it up!'
            });
        } else if (activeDays >= 1 && activeDays <= 2) {
            generated.push({
                type: 'tip',
                icon: Lightbulb,
                color: 'gray',
                title: 'Study More Regularly',
                message: 'Try to study at least 4-5 days per week for better learning outcomes.',
                action: 'Set daily reminders'
            });
        }

        // Accuracy Insight
        const totalCorrect = quizSessions.reduce((sum, q) => {
            return sum + Object.values(q.answers || {}).filter(a => a.correct || a.isCorrect).length;
        }, 0);
        const totalQuestions = quizSessions.reduce((sum, q) => sum + Object.keys(q.answers || {}).length, 0);
        const accuracy = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;

        if (accuracy >= 85 && totalQuestions >= 10) {
            generated.push({
                type: 'success',
                icon: Trophy,
                color: 'black',
                title: 'High Accuracy Rate',
                message: `You're answering ${Math.round(accuracy)}% of questions correctly. Outstanding!`,
                action: 'Challenge yourself more'
            });
        }

        return generated;
    }, [quizSessions, studySessions, subjectPerformance]);

    const getColorClasses = (color) => {
        const colors = {
            amber: { 
                bg: 'bg-gradient-to-br from-amber-50 to-orange-50', 
                border: 'border-amber-300', 
                text: 'text-amber-900', 
                iconBg: 'bg-gradient-to-br from-amber-500 to-orange-500',
                badgeBg: 'bg-amber-100',
                badgeText: 'text-amber-900',
                badgeBorder: 'border-amber-300'
            },
            gray: { 
                bg: 'bg-gradient-to-br from-gray-50 to-gray-100', 
                border: 'border-gray-300', 
                text: 'text-gray-900', 
                iconBg: 'bg-gradient-to-br from-gray-600 to-gray-700',
                badgeBg: 'bg-gray-200',
                badgeText: 'text-gray-900',
                badgeBorder: 'border-gray-400'
            },
            red: { 
                bg: 'bg-gradient-to-br from-red-50 to-rose-50', 
                border: 'border-red-300', 
                text: 'text-red-900', 
                iconBg: 'bg-gradient-to-br from-red-500 to-rose-500',
                badgeBg: 'bg-red-100',
                badgeText: 'text-red-900',
                badgeBorder: 'border-red-300'
            },
            black: { 
                bg: 'bg-gradient-to-br from-gray-900 to-black', 
                border: 'border-gray-800', 
                text: 'text-white', 
                iconBg: 'bg-gradient-to-br from-gray-700 to-gray-800',
                badgeBg: 'bg-gray-800',
                badgeText: 'text-white',
                badgeBorder: 'border-gray-700'
            }
        };
        return colors[color] || colors.gray;
    };

    if (insights.length === 0) {
        return null;
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center shadow-2xl">
                    <Lightbulb size={28} className="text-white" strokeWidth={2.5} />
                </div>
                <div>
                    <h3 className="text-2xl font-black text-gray-900 mb-1">
                        AI Learning Insights
                    </h3>
                    <p className="text-sm text-gray-700 font-semibold">
                        Personalized recommendations based on your activity
                    </p>
                </div>
            </div>

            {/* Insights Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {insights.map((insight, idx) => {
                    const Icon = insight.icon;
                    const colors = getColorClasses(insight.color);

                    return (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            whileHover={{ y: -4 }}
                            className={`${colors.bg} border-2 ${colors.border} rounded-2xl p-6 shadow-md hover:shadow-xl transition-all`}
                        >
                            <div className="flex items-start gap-4">
                                {/* Icon */}
                                <div className={`w-14 h-14 rounded-2xl ${colors.iconBg} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                                    <Icon size={26} className="text-white" strokeWidth={2.5} />
                                </div>

                                {/* Content */}
                                <div className="flex-1">
                                    <h4 className={`font-black text-lg ${colors.text} mb-2`}>
                                        {insight.title}
                                    </h4>
                                    <p className={`text-sm ${colors.text} ${insight.color === 'black' ? 'text-gray-200' : ''} leading-relaxed mb-4 font-medium`}>
                                        {insight.message}
                                    </p>
                                    
                                    {/* Action Badge */}
                                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl ${colors.badgeBg} border-2 ${colors.badgeBorder} text-xs font-black ${colors.badgeText} shadow-sm hover:shadow-md transition-all`}>
                                        <Zap size={16} strokeWidth={3} />
                                        <span>{insight.action}</span>
                                        <ArrowRight size={14} strokeWidth={3} />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Summary Stats */}
            {insights.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: insights.length * 0.1 + 0.2 }}
                    className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 rounded-2xl p-5 border-2 border-gray-700 shadow-xl"
                >
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                                <Lightbulb size={20} className="text-white" strokeWidth={2.5} />
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                                    Insights Generated
                                </p>
                                <p className="text-xl font-black text-white">
                                    {insights.length} Recommendation{insights.length !== 1 ? 's' : ''}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {insights.filter(i => i.type === 'success').length > 0 && (
                                <div className="px-4 py-2 bg-green-500/20 border border-green-500/50 rounded-lg">
                                    <p className="text-xs text-green-400 font-bold">
                                        ✓ {insights.filter(i => i.type === 'success').length} Success
                                    </p>
                                </div>
                            )}
                            {insights.filter(i => i.type === 'warning').length > 0 && (
                                <div className="px-4 py-2 bg-amber-500/20 border border-amber-500/50 rounded-lg">
                                    <p className="text-xs text-amber-400 font-bold">
                                        ⚠ {insights.filter(i => i.type === 'warning').length} Warning
                                    </p>
                                </div>
                            )}
                            {insights.filter(i => i.type === 'tip').length > 0 && (
                                <div className="px-4 py-2 bg-blue-500/20 border border-blue-500/50 rounded-lg">
                                    <p className="text-xs text-blue-400 font-bold">
                                        💡 {insights.filter(i => i.type === 'tip').length} Tip
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default LearningInsights;
