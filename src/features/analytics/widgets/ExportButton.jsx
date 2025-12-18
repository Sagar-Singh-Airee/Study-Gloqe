// src/features/analytics/widgets/ExportButton.jsx - ✅ EXPORT FUNCTIONALITY
import { useState } from 'react';
import { Download, FileText, FileSpreadsheet } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ExportButton = ({ data, timeRange }) => {
    const [showMenu, setShowMenu] = useState(false);

    const exportToCSV = () => {
        const { stats, quizSessions, studySessions, subjectPerformance } = data;

        // CSV Header
        let csv = 'Study Analytics Report\n\n';
        csv += `Report Period: Last ${timeRange} Days\n`;
        csv += `Generated: ${new Date().toLocaleString()}\n\n`;

        // Overall Stats
        csv += 'OVERALL STATISTICS\n';
        csv += 'Metric,Value\n';
        csv += `Total Study Time,${stats.totalStudyTime} hours\n`;
        csv += `Total Quizzes,${stats.totalQuizzes}\n`;
        csv += `Average Quiz Score,${stats.avgQuizScore}%\n`;
        csv += `Accuracy Rate,${stats.accuracy}%\n`;
        csv += `Study Streak,${stats.streak} days\n`;
        csv += `Total Documents,${stats.totalDocuments}\n`;
        csv += `Total Flashcards,${stats.totalFlashcards}\n\n`;

        // Subject Performance
        csv += 'SUBJECT PERFORMANCE\n';
        csv += 'Subject,Quizzes,Avg Score,Accuracy,Correct,Total Questions\n';
        subjectPerformance.forEach(subject => {
            csv += `"${subject.subject}",${subject.quizCount},${subject.avgScore}%,${subject.accuracy}%,${subject.correctAnswers},${subject.totalQuestions}\n`;
        });
        csv += '\n';

        // Quiz Sessions
        csv += 'QUIZ HISTORY\n';
        csv += 'Date,Title,Subject,Score,Correct,Total,Duration\n';
        quizSessions.slice(0, 50).forEach(quiz => {
            const date = quiz.completedAt.toLocaleDateString();
            const title = (quiz.quizTitle || quiz.title || 'Untitled').replace(/"/g, '""');
            const subject = quiz.subject || 'General';
            const score = quiz.score || 0;
            const correct = Object.values(quiz.answers || {}).filter(a => a.correct || a.isCorrect).length;
            const total = Object.keys(quiz.answers || {}).length;
            csv += `"${date}","${title}","${subject}",${score}%,${correct},${total},${quiz.duration || 0}s\n`;
        });

        // Download
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `analytics-report-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        setShowMenu(false);
    };

    const exportToPDF = () => {
        // Simple text-based PDF export (you can enhance with jsPDF library)
        alert('PDF export coming soon! For now, use CSV export or print this page.');
        setShowMenu(false);
    };

    return (
        <div className="relative">
            <button
                onClick={() => setShowMenu(!showMenu)}
                className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl font-bold text-gray-900 hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
                <Download size={18} />
                Export
            </button>

            <AnimatePresence>
                {showMenu && (
                    <>
                        {/* Backdrop */}
                        <div
                            className="fixed inset-0 z-10"
                            onClick={() => setShowMenu(false)}
                        />

                        {/* Menu */}
                        <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-20"
                        >
                            <button
                                onClick={exportToCSV}
                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                            >
                                <FileSpreadsheet size={18} className="text-green-600" />
                                <div>
                                    <p className="font-bold text-sm text-gray-900">Export CSV</p>
                                    <p className="text-xs text-gray-500">Excel compatible</p>
                                </div>
                            </button>

                            <button
                                onClick={exportToPDF}
                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-t border-gray-100"
                            >
                                <FileText size={18} className="text-red-600" />
                                <div>
                                    <p className="font-bold text-sm text-gray-900">Export PDF</p>
                                    <p className="text-xs text-gray-500">Printable report</p>
                                </div>
                            </button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ExportButton;
