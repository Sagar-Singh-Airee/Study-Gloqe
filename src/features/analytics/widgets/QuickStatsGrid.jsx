// src/features/analytics/widgets/QuickStatsGrid.jsx - ✅ MINIMAL GRAY/BLACK
import { motion } from 'framer-motion';
import { Clock, Target, Flame, Trophy, BookOpen, Brain, Layers, Zap } from 'lucide-react';

const QuickStatsGrid = ({ stats }) => {
    const statCards = [
        {
            label: 'Study Time',
            value: `${stats.totalStudyTime}h`,
            subtitle: `${stats.avgSessionLength}m avg`,
            icon: Clock,
            iconGradient: 'from-gray-800 to-gray-900'
        },
        {
            label: 'Quiz Score',
            value: `${stats.avgQuizScore}%`,
            subtitle: `${stats.totalQuizzes} quizzes`,
            icon: Target,
            iconGradient: 'from-gray-900 to-black'
        },
        {
            label: 'Streak',
            value: stats.streak,
            subtitle: stats.streak === 1 ? 'day' : 'days',
            icon: Flame,
            iconGradient: 'from-gray-700 to-gray-800'
        },
        {
            label: 'Accuracy',
            value: `${stats.accuracy}%`,
            subtitle: `${stats.totalCorrect}/${stats.totalQuestions}`,
            icon: Trophy,
            iconGradient: 'from-black to-gray-900'
        },
        {
            label: 'Documents',
            value: stats.totalDocuments,
            subtitle: 'uploaded',
            icon: BookOpen,
            iconGradient: 'from-gray-700 to-gray-900'
        },
        {
            label: 'Quizzes',
            value: stats.totalQuizzes,
            subtitle: 'completed',
            icon: Brain,
            iconGradient: 'from-gray-800 to-black'
        },
        {
            label: 'Flashcards',
            value: stats.totalFlashcards,
            subtitle: 'created',
            icon: Layers,
            iconGradient: 'from-gray-600 to-gray-800'
        },
        {
            label: 'XP Points',
            value: (stats.totalQuizzes * 50 + stats.totalDocuments * 25).toLocaleString(),
            subtitle: 'earned',
            icon: Zap,
            iconGradient: 'from-black to-gray-800'
        }
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statCards.map((stat, idx) => (
                <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05, type: "spring" }}
                    whileHover={{ y: -6 }}
                    className="group relative bg-white rounded-2xl p-6 border-2 border-gray-200 shadow-sm hover:shadow-2xl hover:border-gray-400 transition-all overflow-hidden"
                >
                    {/* Background Pattern */}
                    <div className="absolute inset-0 bg-gradient-to-br from-transparent via-gray-50 to-gray-100 opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    {/* Content */}
                    <div className="relative">
                        {/* Icon */}
                        <div className={`w-16 h-16 mb-4 rounded-2xl bg-gradient-to-br ${stat.iconGradient} flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform`}>
                            <stat.icon size={28} className="text-white" strokeWidth={2.5} />
                        </div>

                        {/* Stats */}
                        <div className="space-y-2">
                            <p className="text-xs font-black text-gray-600 uppercase tracking-widest">
                                {stat.label}
                            </p>
                            <div className="flex items-baseline gap-2">
                                <p className="text-4xl font-black text-gray-900 leading-none">
                                    {stat.value}
                                </p>
                            </div>
                            <p className="text-xs text-gray-700 font-bold">
                                {stat.subtitle}
                            </p>
                        </div>
                    </div>

                    {/* Accent Line */}
                    <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${stat.iconGradient}`} />
                </motion.div>
            ))}
        </div>
    );
};

export default QuickStatsGrid;
