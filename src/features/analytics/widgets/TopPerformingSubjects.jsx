// src/features/analytics/widgets/TopPerformingSubjects.jsx - ✅ TOP SUBJECTS
import { motion } from 'framer-motion';
import { Trophy, TrendingUp, Award, Medal } from 'lucide-react';

const TopPerformingSubjects = ({ data }) => {
    const topSubjects = data.slice(0, 5);

    const getMedalIcon = (index) => {
        switch (index) {
            case 0: return { icon: Trophy, color: 'text-yellow-500', bg: 'bg-yellow-100' };
            case 1: return { icon: Medal, color: 'text-gray-400', bg: 'bg-gray-100' };
            case 2: return { icon: Award, color: 'text-orange-600', bg: 'bg-orange-100' };
            default: return { icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-100' };
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm"
        >
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center shadow-lg">
                    <Trophy size={24} className="text-white" strokeWidth={2.5} />
                </div>
                <div>
                    <h3 className="text-xl font-black text-gray-900">Top Subjects</h3>
                    <p className="text-sm text-gray-600">
                        Your best performing areas
                    </p>
                </div>
            </div>

            {/* Rankings */}
            {topSubjects.length > 0 ? (
                <div className="space-y-3">
                    {topSubjects.map((subject, idx) => {
                        const medal = getMedalIcon(idx);
                        const Icon = medal.icon;

                        return (
                            <motion.div
                                key={subject.subject}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                            >
                                {/* Rank */}
                                <div className={`w-12 h-12 rounded-xl ${medal.bg} flex items-center justify-center flex-shrink-0`}>
                                    <Icon size={24} className={medal.color} strokeWidth={2.5} />
                                </div>

                                {/* Subject Info */}
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-gray-900 truncate">
                                        {subject.subject}
                                    </h4>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-xs text-gray-600 font-medium">
                                            {subject.quizCount} quizzes
                                        </span>
                                        <span className="text-xs text-gray-400">•</span>
                                        <span className="text-xs text-gray-600 font-medium">
                                            {subject.accuracy}% accuracy
                                        </span>
                                    </div>
                                </div>

                                {/* Score */}
                                <div className="text-right">
                                    <p className="text-2xl font-black text-gray-900">
                                        {subject.avgScore}%
                                    </p>
                                    <p className="text-xs text-gray-500 font-medium">
                                        avg score
                                    </p>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-12">
                    <Trophy size={48} className="mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500 font-medium">No subjects yet</p>
                    <p className="text-sm text-gray-400 mt-1">Complete quizzes to see rankings</p>
                </div>
            )}

            {/* Overall Stats */}
            {topSubjects.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-green-50 rounded-xl border border-green-200">
                            <p className="text-2xl font-black text-green-700">
                                {Math.max(...topSubjects.map(s => s.avgScore))}%
                            </p>
                            <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">
                                Best Score
                            </p>
                        </div>
                        <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-200">
                            <p className="text-2xl font-black text-blue-700">
                                {Math.round(topSubjects.reduce((sum, s) => sum + s.avgScore, 0) / topSubjects.length)}%
                            </p>
                            <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">
                                Overall Avg
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    );
};

export default TopPerformingSubjects;
