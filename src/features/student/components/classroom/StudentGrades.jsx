// src/features/student/components/classroom/StudentGrades.jsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BarChart3, TrendingUp, Award, Target, Star, Eye,
    Calendar, CheckCircle2, AlertCircle, Trophy, Zap,
    BookOpen, FileText, Brain, Download, Filter, Search,
    Loader2, ArrowUp, ArrowDown, Minus
} from 'lucide-react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@shared/config/firebase';
import { useAuth } from '@auth/contexts/AuthContext';
import toast from 'react-hot-toast';
import GradeDetailsModal from './GradeDetailsModal';

const StudentGrades = ({ classId, classData }) => {
    const { user } = useAuth();
    const [grades, setGrades] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('all'); // all, assignment, quiz
    const [selectedGrade, setSelectedGrade] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    // Stats
    const [stats, setStats] = useState({
        overallGrade: 0,
        totalAssignments: 0,
        totalQuizzes: 0,
        avgAssignmentGrade: 0,
        avgQuizGrade: 0,
        totalPoints: 0,
        earnedPoints: 0,
        trend: 'up' // up, down, stable
    });

    useEffect(() => {
        loadGrades();
    }, [classId, user?.uid]);

    const loadGrades = async () => {
        try {
            setLoading(true);
            const allGrades = [];

            // Load assignment grades
            const assignmentsQuery = query(
                collection(db, 'assignments'),
                where('classId', '==', classId)
            );
            const assignmentsSnap = await getDocs(assignmentsQuery);

            for (const assignmentDoc of assignmentsSnap.docs) {
                const assignment = assignmentDoc.data();

                // Check for submission
                const submissionsQuery = query(
                    collection(db, 'submissions'),
                    where('assignmentId', '==', assignmentDoc.id),
                    where('studentId', '==', user.uid)
                );
                const submissionsSnap = await getDocs(submissionsQuery);

                if (submissionsSnap.docs.length > 0) {
                    const submission = submissionsSnap.docs[0].data();

                    if (submission.grade !== undefined) {
                        allGrades.push({
                            id: assignmentDoc.id,
                            type: 'assignment',
                            title: assignment.title,
                            score: submission.grade,
                            maxScore: assignment.totalPoints || 100,
                            submittedAt: submission.submittedAt?.toDate?.() || new Date(),
                            feedback: submission.feedback,
                            gradedAt: submission.gradedAt?.toDate?.(),
                            isLate: submission.isLate || false
                        });
                    }
                }
            }

            // Load quiz grades
            const quizzesQuery = query(
                collection(db, 'quizzes'),
                where('classId', '==', classId)
            );
            const quizzesSnap = await getDocs(quizzesQuery);

            for (const quizDoc of quizzesSnap.docs) {
                const quiz = quizDoc.data();

                // Check for quiz sessions
                const sessionsQuery = query(
                    collection(db, 'quizSessions'),
                    where('quizId', '==', quizDoc.id),
                    where('userId', '==', user.uid),
                    orderBy('completedAt', 'desc')
                );
                const sessionsSnap = await getDocs(sessionsQuery);

                if (sessionsSnap.docs.length > 0) {
                    // Get best attempt
                    const sessions = sessionsSnap.docs.map(doc => doc.data());
                    const bestSession = sessions.reduce((best, current) =>
                        (current.score > best.score ? current : best), sessions[0]
                    );

                    allGrades.push({
                        id: quizDoc.id,
                        type: 'quiz',
                        title: quiz.title,
                        score: bestSession.score,
                        maxScore: quiz.maxPoints || 100,
                        submittedAt: bestSession.completedAt?.toDate?.() || new Date(),
                        attempts: sessions.length,
                        timeSpent: bestSession.timeSpent
                    });
                }
            }

            // Sort by date (most recent first)
            allGrades.sort((a, b) => b.submittedAt - a.submittedAt);

            // Calculate statistics
            const assignmentGrades = allGrades.filter(g => g.type === 'assignment');
            const quizGrades = allGrades.filter(g => g.type === 'quiz');

            const totalPoints = allGrades.reduce((sum, g) => sum + g.maxScore, 0);
            const earnedPoints = allGrades.reduce((sum, g) => sum + g.score, 0);

            const avgAssignment = assignmentGrades.length > 0
                ? assignmentGrades.reduce((sum, g) => sum + (g.score / g.maxScore) * 100, 0) / assignmentGrades.length
                : 0;

            const avgQuiz = quizGrades.length > 0
                ? quizGrades.reduce((sum, g) => sum + (g.score / g.maxScore) * 100, 0) / quizGrades.length
                : 0;

            const overallGrade = allGrades.length > 0
                ? (earnedPoints / totalPoints) * 100
                : 0;

            // Calculate trend (compare last 3 vs previous 3)
            let trend = 'stable';
            if (allGrades.length >= 6) {
                const recent = allGrades.slice(0, 3).reduce((sum, g) => sum + (g.score / g.maxScore), 0) / 3;
                const previous = allGrades.slice(3, 6).reduce((sum, g) => sum + (g.score / g.maxScore), 0) / 3;

                if (recent > previous + 0.05) trend = 'up';
                else if (recent < previous - 0.05) trend = 'down';
            }

            setGrades(allGrades);
            setStats({
                overallGrade: Math.round(overallGrade),
                totalAssignments: assignmentGrades.length,
                totalQuizzes: quizGrades.length,
                avgAssignmentGrade: Math.round(avgAssignment),
                avgQuizGrade: Math.round(avgQuiz),
                totalPoints,
                earnedPoints: Math.round(earnedPoints),
                trend
            });

        } catch (error) {
            console.error('Error loading grades:', error);
            toast.error('Failed to load grades');
        } finally {
            setLoading(false);
        }
    };

    const getFilteredGrades = () => {
        let filtered = [...grades];

        // Search
        if (searchQuery) {
            filtered = filtered.filter(g =>
                g.title.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Type filter
        if (filterType !== 'all') {
            filtered = filtered.filter(g => g.type === filterType);
        }

        return filtered;
    };

    const getGradeColor = (percentage) => {
        if (percentage >= 90) return 'text-green-600';
        if (percentage >= 80) return 'text-blue-600';
        if (percentage >= 70) return 'text-yellow-600';
        if (percentage >= 60) return 'text-orange-600';
        return 'text-red-600';
    };

    const getGradeBgColor = (percentage) => {
        if (percentage >= 90) return 'bg-green-50 border-green-200';
        if (percentage >= 80) return 'bg-blue-50 border-blue-200';
        if (percentage >= 70) return 'bg-yellow-50 border-yellow-200';
        if (percentage >= 60) return 'bg-orange-50 border-orange-200';
        return 'bg-red-50 border-red-200';
    };

    const getLetterGrade = (percentage) => {
        if (percentage >= 90) return 'A';
        if (percentage >= 80) return 'B';
        if (percentage >= 70) return 'C';
        if (percentage >= 60) return 'D';
        return 'F';
    };

    const handleViewDetails = (grade) => {
        setSelectedGrade(grade);
        setShowDetailsModal(true);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center">
                    <Loader2 size={48} className="text-blue-600 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600 font-semibold">Loading grades...</p>
                </div>
            </div>
        );
    }

    const filteredGrades = getFilteredGrades();

    return (
        <div className="space-y-6">
            {/* Overall Grade Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 rounded-2xl p-8 text-white relative overflow-hidden"
            >
                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />

                <div className="relative z-10">
                    <div className="flex items-start justify-between mb-6">
                        <div>
                            <p className="text-blue-100 font-bold mb-2 flex items-center gap-2">
                                <Trophy size={20} />
                                Overall Class Grade
                            </p>
                            <div className="flex items-baseline gap-3">
                                <h1 className="text-7xl font-black">{stats.overallGrade}%</h1>
                                <span className="text-3xl font-bold opacity-90">
                                    {getLetterGrade(stats.overallGrade)}
                                </span>
                            </div>
                        </div>

                        {/* Trend Indicator */}
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl backdrop-blur-sm ${stats.trend === 'up' ? 'bg-green-500/20' :
                                stats.trend === 'down' ? 'bg-red-500/20' :
                                    'bg-white/20'
                            }`}>
                            {stats.trend === 'up' && <ArrowUp size={20} strokeWidth={3} />}
                            {stats.trend === 'down' && <ArrowDown size={20} strokeWidth={3} />}
                            {stats.trend === 'stable' && <Minus size={20} strokeWidth={3} />}
                            <span className="font-black text-sm">
                                {stats.trend === 'up' ? 'Improving' : stats.trend === 'down' ? 'Declining' : 'Stable'}
                            </span>
                        </div>
                    </div>

                    {/* Points Summary */}
                    <div className="flex items-center gap-8 text-sm">
                        <div>
                            <p className="text-blue-100 mb-1">Points Earned</p>
                            <p className="text-2xl font-black">{stats.earnedPoints} / {stats.totalPoints}</p>
                        </div>
                        <div>
                            <p className="text-blue-100 mb-1">Graded Items</p>
                            <p className="text-2xl font-black">{grades.length}</p>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Stats Grid */}
            <div className="grid md:grid-cols-4 gap-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white border-2 border-gray-200 rounded-xl p-5"
                >
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                            <FileText size={20} className="text-white" strokeWidth={2.5} />
                        </div>
                        <p className="text-sm text-gray-600 font-semibold">Assignments</p>
                    </div>
                    <p className="text-3xl font-black text-gray-900 mb-1">{stats.avgAssignmentGrade}%</p>
                    <p className="text-xs text-gray-500">{stats.totalAssignments} graded</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white border-2 border-gray-200 rounded-xl p-5"
                >
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                            <Brain size={20} className="text-white" strokeWidth={2.5} />
                        </div>
                        <p className="text-sm text-gray-600 font-semibold">Quizzes</p>
                    </div>
                    <p className="text-3xl font-black text-gray-900 mb-1">{stats.avgQuizGrade}%</p>
                    <p className="text-xs text-gray-500">{stats.totalQuizzes} completed</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white border-2 border-gray-200 rounded-xl p-5"
                >
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-500 rounded-lg flex items-center justify-center">
                            <Target size={20} className="text-white" strokeWidth={2.5} />
                        </div>
                        <p className="text-sm text-gray-600 font-semibold">Best Grade</p>
                    </div>
                    <p className="text-3xl font-black text-green-700 mb-1">
                        {grades.length > 0
                            ? Math.max(...grades.map(g => Math.round((g.score / g.maxScore) * 100)))
                            : 0}%
                    </p>
                    <p className="text-xs text-gray-500">Personal record</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white border-2 border-gray-200 rounded-xl p-5"
                >
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center">
                            <Award size={20} className="text-white" strokeWidth={2.5} />
                        </div>
                        <p className="text-sm text-gray-600 font-semibold">A's Earned</p>
                    </div>
                    <p className="text-3xl font-black text-yellow-700 mb-1">
                        {grades.filter(g => (g.score / g.maxScore) * 100 >= 90).length}
                    </p>
                    <p className="text-xs text-gray-500">90% or higher</p>
                </motion.div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search grades..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none font-medium"
                        />
                    </div>

                    {/* Type Filter */}
                    <div className="flex items-center gap-2">
                        <Filter size={20} className="text-gray-600" />
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none font-semibold"
                        >
                            <option value="all">All Types</option>
                            <option value="assignment">Assignments</option>
                            <option value="quiz">Quizzes</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Grades List */}
            {filteredGrades.length > 0 ? (
                <div className="space-y-3">
                    {filteredGrades.map((grade, idx) => {
                        const percentage = Math.round((grade.score / grade.maxScore) * 100);
                        const letterGrade = getLetterGrade(percentage);

                        return (
                            <motion.div
                                key={grade.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.03 }}
                                className={`bg-white border-2 rounded-xl p-5 hover:shadow-lg transition-all ${getGradeBgColor(percentage)}`}
                            >
                                <div className="flex items-center gap-4">
                                    {/* Type Icon */}
                                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${grade.type === 'assignment'
                                            ? 'bg-blue-600'
                                            : 'bg-purple-600'
                                        }`}>
                                        {grade.type === 'assignment' ? (
                                            <FileText size={24} className="text-white" strokeWidth={2.5} />
                                        ) : (
                                            <Brain size={24} className="text-white" strokeWidth={2.5} />
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="text-lg font-black text-gray-900 truncate">{grade.title}</h3>
                                            <span className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded text-xs font-bold uppercase">
                                                {grade.type}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-4 text-sm text-gray-600">
                                            <span className="flex items-center gap-1">
                                                <Calendar size={14} />
                                                {grade.submittedAt.toLocaleDateString()}
                                            </span>

                                            {grade.isLate && (
                                                <span className="flex items-center gap-1 text-orange-600 font-semibold">
                                                    <AlertCircle size={14} />
                                                    Late
                                                </span>
                                            )}

                                            {grade.attempts && (
                                                <span className="font-semibold">
                                                    {grade.attempts} attempt{grade.attempts !== 1 ? 's' : ''}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Grade Display */}
                                    <div className="text-right">
                                        <div className="flex items-baseline gap-2 mb-1">
                                            <p className={`text-4xl font-black ${getGradeColor(percentage)}`}>
                                                {letterGrade}
                                            </p>
                                            <p className="text-xl font-bold text-gray-700">
                                                {percentage}%
                                            </p>
                                        </div>
                                        <p className="text-sm text-gray-600 font-semibold">
                                            {grade.score} / {grade.maxScore} points
                                        </p>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-col gap-2">
                                        {grade.feedback && (
                                            <button
                                                onClick={() => handleViewDetails(grade)}
                                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors"
                                            >
                                                <Eye size={16} />
                                                View
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-white rounded-xl border-2 border-gray-200 p-12 text-center">
                    <BarChart3 size={64} className="text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {searchQuery || filterType !== 'all'
                            ? 'No grades found'
                            : 'No grades yet'}
                    </h3>
                    <p className="text-gray-600">
                        {searchQuery || filterType !== 'all'
                            ? 'Try adjusting your search or filters'
                            : 'Complete assignments and quizzes to see your grades here'}
                    </p>
                </div>
            )}

            {/* Grade Details Modal */}
            <AnimatePresence>
                {showDetailsModal && selectedGrade && (
                    <GradeDetailsModal
                        grade={selectedGrade}
                        onClose={() => {
                            setShowDetailsModal(false);
                            setSelectedGrade(null);
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default StudentGrades;
