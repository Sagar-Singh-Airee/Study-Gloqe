// src/components/gamification/StudyCoach.jsx - AI Study Coach Widget
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Sparkles, Lightbulb, Target, Flame, TrendingUp,
    BookOpen, Brain, ChevronRight, Loader2, RefreshCw, MessageCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getStudyCoachInsights } from '@/services/aiStudyCoach';

const StudyCoach = ({ onActionClick }) => {
    const { user } = useAuth();
    const [insights, setInsights] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showAllTips, setShowAllTips] = useState(false);

    useEffect(() => {
        loadInsights();
    }, [user?.uid]);

    const loadInsights = async () => {
        setLoading(true);
        try {
            const data = await getStudyCoachInsights(user?.uid);
            setInsights(data);
        } catch (error) {
            console.error('Error loading insights:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl p-6 text-white">
                <div className="flex items-center gap-3">
                    <Loader2 size={24} className="animate-spin" />
                    <span className="font-bold">Loading your study coach...</span>
                </div>
            </div>
        );
    }

    if (!insights) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-700 rounded-2xl overflow-hidden text-white"
        >
            {/* Header */}
            <div className="p-6 pb-4">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center">
                            <Sparkles size={24} className="text-yellow-300" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black">AI Study Coach</h2>
                            <p className="text-sm text-white/70">Personalized guidance</p>
                        </div>
                    </div>
                    <button
                        onClick={loadInsights}
                        className="p-2 hover:bg-white/10 rounded-lg transition-all"
                        title="Refresh insights"
                    >
                        <RefreshCw size={16} />
                    </button>
                </div>

                {/* Greeting/Motivation */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="mt-4 p-4 bg-white/10 backdrop-blur-xl rounded-xl"
                >
                    <div className="flex items-start gap-3">
                        <MessageCircle size={20} className="text-yellow-300 flex-shrink-0 mt-0.5" />
                        <p className="text-sm font-medium leading-relaxed">{insights.greeting}</p>
                    </div>
                </motion.div>
            </div>

            {/* Stats Row */}
            {insights.stats && (
                <div className="px-6 pb-4">
                    <div className="grid grid-cols-3 gap-2">
                        <div className="bg-white/10 rounded-lg p-3 text-center">
                            <Flame size={16} className="mx-auto mb-1 text-orange-300" />
                            <p className="text-lg font-black">{insights.stats.streak}</p>
                            <p className="text-[10px] text-white/60">Day Streak</p>
                        </div>
                        <div className="bg-white/10 rounded-lg p-3 text-center">
                            <Target size={16} className="mx-auto mb-1 text-green-300" />
                            <p className="text-lg font-black">{insights.stats.avgQuizScore}%</p>
                            <p className="text-[10px] text-white/60">Avg Score</p>
                        </div>
                        <div className="bg-white/10 rounded-lg p-3 text-center">
                            <TrendingUp size={16} className="mx-auto mb-1 text-blue-300" />
                            <p className="text-lg font-black">{insights.stats.avgDailyMinutes}</p>
                            <p className="text-[10px] text-white/60">Avg Min/Day</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Tips */}
            <div className="px-6 pb-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Lightbulb size={14} className="text-yellow-300" />
                        <span className="text-sm font-bold">Tips for You</span>
                    </div>
                    {insights.tips.length > 1 && (
                        <button
                            onClick={() => setShowAllTips(!showAllTips)}
                            className="text-xs text-white/60 hover:text-white"
                        >
                            {showAllTips ? 'Show less' : `+${insights.tips.length - 1} more`}
                        </button>
                    )}
                </div>

                <AnimatePresence>
                    {insights.tips.slice(0, showAllTips ? undefined : 1).map((tip, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mb-2"
                        >
                            <div className="p-3 bg-white/5 rounded-lg text-sm text-white/90">
                                {tip}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Recommendation */}
            {insights.recommendation && (
                <div className="px-6 pb-6">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className={`p-4 rounded-xl border-2 ${insights.recommendation.priority === 'high'
                                ? 'bg-red-500/20 border-red-400/30'
                                : insights.recommendation.priority === 'medium'
                                    ? 'bg-yellow-500/20 border-yellow-400/30'
                                    : 'bg-blue-500/20 border-blue-400/30'
                            }`}
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <h4 className="font-bold text-sm mb-1">{insights.recommendation.title}</h4>
                                <p className="text-xs text-white/70 mb-3">{insights.recommendation.description}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => onActionClick?.(insights.recommendation.type)}
                            className="w-full py-2 bg-white/20 hover:bg-white/30 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all"
                        >
                            {insights.recommendation.action}
                            <ChevronRight size={14} />
                        </button>
                    </motion.div>
                </div>
            )}
        </motion.div>
    );
};

export default StudyCoach;
