// src/features/analytics/widgets/SubjectMasteryGrid.jsx - ✅ MASTERY GRID
import { motion } from 'framer-motion';
import { BookOpen, TrendingUp, TrendingDown } from 'lucide-react';

const SubjectMasteryGrid = ({ performance }) => {
    const getScoreColor = (score) => {
        if (score >= 90) return { gradient: 'from-emerald-500 to-green-600', text: 'text-emerald-600', bg: 'bg-emerald-50' };
        if (score >= 75) return { gradient: 'from-blue-500 to-cyan-600', text: 'text-blue-600', bg: 'bg-blue-50' };
        if (score >= 60) return { gradient: 'from-amber-500 to-orange-600', text: 'text-amber-600', bg: 'bg-amber-50' };
        return { gradient: 'from-red-500 to-rose-600', text: 'text-red-600', bg: 'bg-red-50' };
    };

    if (performance.length === 0) {
        return null;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-900 to-gray-700 flex items-center justify-center shadow-lg">
                    <BookOpen size={24} className="text-white" strokeWidth={2.5} />
                </div>
                <div>
                    <h3 className="text-xl font-black text-gray-900">All Subjects</h3>
                    <p className="text-sm text-gray-600">
                        Complete mastery breakdown across {performance.length} subjects
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {performance.map((subject, idx) => {
                    const colors = getScoreColor(subject.avgScore);

                    return (
                        <motion.div
                            key={subject.subject}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.03 }}
                            whileHover={{ y: -4 }}
                            className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:shadow-lg transition-all"
                        >
                            {/* Header */}
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                    <h4 className="font-bold text-gray-900 text-base mb-1 line-clamp-1">
                                        {subject.subject}
                                    </h4>
                                    <p className="text-xs text-gray-600 font-medium">
                                        {subject.quizCount} quiz{subject.quizCount !== 1 ? 'zes' : ''}
                                    </p>
                                </div>
                                <div className={`px-3 py-1 rounded-lg ${colors.bg} ${colors.text} text-xs font-black`}>
                                    {subject.avgScore}%
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="mb-4">
                                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${subject.mastery}%` }}
                                        transition={{ duration: 1, delay: idx * 0.05 }}
                                        className={`h-full bg-gradient-to-r ${colors.gradient}`}
                                    />
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="text-center p-2 bg-gray-50 rounded-lg">
                                    <p className="text-lg font-black text-gray-900">
                                        {subject.accuracy}%
                                    </p>
                                    <p className="text-xs text-gray-600 font-medium">
                                        Accuracy
                                    </p>
                                </div>
                                <div className="text-center p-2 bg-gray-50 rounded-lg">
                                    <p className="text-lg font-black text-gray-900">
                                        {subject.correctAnswers}/{subject.totalQuestions}
                                    </p>
                                    <p className="text-xs text-gray-600 font-medium">
                                        Correct
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};

export default SubjectMasteryGrid;
