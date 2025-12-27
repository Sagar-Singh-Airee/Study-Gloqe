// src/features/student/components/classroom/GradeDetailsModal.jsx
import { motion } from 'framer-motion';
import {
    X, Award, Calendar, Clock, FileText, MessageSquare,
    CheckCircle2, AlertCircle, Star, TrendingUp, Target,
    User, Download, ExternalLink
} from 'lucide-react';

const GradeDetailsModal = ({ grade, onClose }) => {
    const percentage = Math.round((grade.score / grade.maxScore) * 100);

    const getGradeColor = (percentage) => {
        if (percentage >= 90) return 'text-green-600';
        if (percentage >= 80) return 'text-blue-600';
        if (percentage >= 70) return 'text-yellow-600';
        if (percentage >= 60) return 'text-orange-600';
        return 'text-red-600';
    };

    const getGradeBgColor = (percentage) => {
        if (percentage >= 90) return 'from-green-500 to-teal-500';
        if (percentage >= 80) return 'from-blue-500 to-cyan-500';
        if (percentage >= 70) return 'from-yellow-500 to-orange-500';
        if (percentage >= 60) return 'from-orange-500 to-red-500';
        return 'from-red-500 to-pink-500';
    };

    const getLetterGrade = (percentage) => {
        if (percentage >= 90) return 'A';
        if (percentage >= 80) return 'B';
        if (percentage >= 70) return 'C';
        if (percentage >= 60) return 'D';
        return 'F';
    };

    const getPerformanceMessage = (percentage) => {
        if (percentage >= 90) return { text: 'Outstanding work! Keep it up! 🌟', color: 'text-green-600' };
        if (percentage >= 80) return { text: 'Great job! You\'re doing well! 👏', color: 'text-blue-600' };
        if (percentage >= 70) return { text: 'Good effort! Keep improving! 💪', color: 'text-yellow-600' };
        if (percentage >= 60) return { text: 'You can do better. Review the material! 📚', color: 'text-orange-600' };
        return { text: 'Need more practice. Don\'t give up! 🚀', color: 'text-red-600' };
    };

    const performanceMsg = getPerformanceMessage(percentage);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            >
                {/* Header with Grade Display */}
                <div className={`bg-gradient-to-r ${getGradeBgColor(percentage)} p-8 text-white relative overflow-hidden`}>
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />

                    <div className="relative z-10">
                        <div className="flex items-start justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                                    <Award size={24} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold opacity-90 mb-1">Grade Report</p>
                                    <h2 className="text-2xl font-black">{grade.title}</h2>
                                </div>
                            </div>

                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Grade Display */}
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="flex items-baseline gap-4 mb-2">
                                    <span className="text-7xl font-black">{getLetterGrade(percentage)}</span>
                                    <span className="text-4xl font-bold opacity-90">{percentage}%</span>
                                </div>
                                <p className="text-lg font-semibold opacity-90">
                                    {grade.score} out of {grade.maxScore} points
                                </p>
                            </div>

                            {/* Type Badge */}
                            <div className="text-center bg-white/20 backdrop-blur-sm rounded-xl px-6 py-3">
                                <p className="text-xs font-bold opacity-75 mb-1">TYPE</p>
                                <p className="text-xl font-black uppercase">{grade.type}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 space-y-6">
                    {/* Performance Message */}
                    <div className={`p-4 bg-gradient-to-r ${percentage >= 90 ? 'from-green-50 to-teal-50 border-green-200' :
                            percentage >= 80 ? 'from-blue-50 to-cyan-50 border-blue-200' :
                                percentage >= 70 ? 'from-yellow-50 to-orange-50 border-yellow-200' :
                                    percentage >= 60 ? 'from-orange-50 to-red-50 border-orange-200' :
                                        'from-red-50 to-pink-50 border-red-200'
                        } border-2 rounded-xl flex items-center gap-3`}>
                        <Star size={24} className={performanceMsg.color} fill="currentColor" />
                        <p className={`font-bold ${performanceMsg.color}`}>{performanceMsg.text}</p>
                    </div>

                    {/* Meta Information */}
                    <div className="grid md:grid-cols-2 gap-4">
                        {/* Submitted Date */}
                        <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                            <div className="flex items-center gap-2 mb-2">
                                <Calendar size={16} className="text-gray-600" />
                                <p className="text-xs font-bold text-gray-600 uppercase">Submitted On</p>
                            </div>
                            <p className="text-lg font-black text-gray-900">
                                {grade.submittedAt.toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                                {grade.submittedAt.toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </p>
                        </div>

                        {/* Graded Date */}
                        {grade.gradedAt && (
                            <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                                <div className="flex items-center gap-2 mb-2">
                                    <CheckCircle2 size={16} className="text-gray-600" />
                                    <p className="text-xs font-bold text-gray-600 uppercase">Graded On</p>
                                </div>
                                <p className="text-lg font-black text-gray-900">
                                    {grade.gradedAt.toLocaleDateString('en-US', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </p>
                                <p className="text-sm text-gray-600 mt-1">
                                    {grade.gradedAt.toLocaleTimeString('en-US', {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </p>
                            </div>
                        )}

                        {/* Time Spent (for quizzes) */}
                        {grade.timeSpent && (
                            <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                                <div className="flex items-center gap-2 mb-2">
                                    <Clock size={16} className="text-gray-600" />
                                    <p className="text-xs font-bold text-gray-600 uppercase">Time Spent</p>
                                </div>
                                <p className="text-lg font-black text-gray-900">
                                    {Math.floor(grade.timeSpent / 60)} minutes
                                </p>
                                <p className="text-sm text-gray-600 mt-1">
                                    {grade.timeSpent % 60} seconds
                                </p>
                            </div>
                        )}

                        {/* Attempts (for quizzes) */}
                        {grade.attempts && (
                            <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                                <div className="flex items-center gap-2 mb-2">
                                    <Target size={16} className="text-gray-600" />
                                    <p className="text-xs font-bold text-gray-600 uppercase">Attempts</p>
                                </div>
                                <p className="text-lg font-black text-gray-900">
                                    {grade.attempts} attempt{grade.attempts !== 1 ? 's' : ''}
                                </p>
                                <p className="text-sm text-gray-600 mt-1">
                                    This is your best score
                                </p>
                            </div>
                        )}

                        {/* Late Submission Warning */}
                        {grade.isLate && (
                            <div className="md:col-span-2 p-4 bg-orange-50 border-2 border-orange-200 rounded-xl flex items-start gap-3">
                                <AlertCircle size={20} className="text-orange-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold text-orange-900 mb-1">Late Submission</p>
                                    <p className="text-sm text-orange-700">
                                        This assignment was submitted after the due date. Your grade may have been affected.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Teacher Feedback */}
                    {grade.feedback && (
                        <div className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl">
                            <div className="flex items-center gap-2 mb-4">
                                <MessageSquare size={20} className="text-blue-600" />
                                <h3 className="text-lg font-black text-gray-900">Teacher Feedback</h3>
                            </div>
                            <div className="prose prose-sm max-w-none">
                                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                                    {grade.feedback}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Grade Breakdown (if available) */}
                    {grade.breakdown && (
                        <div className="p-6 bg-white border-2 border-gray-200 rounded-xl">
                            <h3 className="text-lg font-black text-gray-900 mb-4">Grade Breakdown</h3>
                            <div className="space-y-3">
                                {grade.breakdown.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <span className="font-semibold text-gray-700">{item.category}</span>
                                        <span className="font-black text-gray-900">
                                            {item.earned}/{item.possible} pts
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Improvement Tips */}
                    {percentage < 90 && (
                        <div className="p-6 bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-xl">
                            <div className="flex items-center gap-2 mb-4">
                                <TrendingUp size={20} className="text-yellow-600" />
                                <h3 className="text-lg font-black text-gray-900">How to Improve</h3>
                            </div>
                            <ul className="space-y-2 text-sm text-gray-700">
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 size={16} className="text-yellow-600 mt-0.5 flex-shrink-0" />
                                    <span>Review the material and identify areas where you struggled</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 size={16} className="text-yellow-600 mt-0.5 flex-shrink-0" />
                                    <span>Practice similar problems or questions</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 size={16} className="text-yellow-600 mt-0.5 flex-shrink-0" />
                                    <span>Ask your teacher for clarification on concepts you don't understand</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 size={16} className="text-yellow-600 mt-0.5 flex-shrink-0" />
                                    <span>Form a study group with classmates</span>
                                </li>
                            </ul>
                        </div>
                    )}

                    {/* Submission Files (if any) */}
                    {grade.submissionFiles && grade.submissionFiles.length > 0 && (
                        <div className="p-6 bg-white border-2 border-gray-200 rounded-xl">
                            <h3 className="text-lg font-black text-gray-900 mb-4">Your Submission</h3>
                            <div className="space-y-2">
                                {grade.submissionFiles.map((file, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <FileText size={20} className="text-blue-600" />
                                            <span className="font-semibold text-gray-700">{file.name}</span>
                                        </div>
                                        <button
                                            onClick={() => window.open(file.url, '_blank')}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors"
                                        >
                                            <Download size={14} />
                                            View
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 px-8 py-4 bg-gray-50 flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                        Keep up the good work! 💪
                    </p>
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold hover:shadow-lg transition-all"
                    >
                        Close
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default GradeDetailsModal;
