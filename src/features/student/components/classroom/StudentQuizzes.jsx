// src/features/student/components/classroom/StudentQuizzes.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Brain, Trophy, Play, Clock, CheckCircle2, AlertCircle,
    Award, Target, TrendingUp, Search, Filter, Calendar,
    Star, Zap, BarChart3, Loader2, BookOpen, ArrowRight
} from 'lucide-react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@shared/config/firebase';
import { useAuth } from '@auth/contexts/AuthContext';
import toast from 'react-hot-toast';

const StudentQuizzes = ({ classId, classData }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('all'); // all, available, completed, upcoming
    const [sortBy, setSortBy] = useState('recent');

    // Stats
    const [stats, setStats] = useState({
        total: 0,
        completed: 0,
        available: 0,
        avgScore: 0,
        totalPoints: 0,
        earnedPoints: 0
    });

    useEffect(() => {
        loadQuizzes();
    }, [classId, user?.uid]);

    const loadQuizzes = async () => {
        try {
            setLoading(true);

            // Load quizzes for this class
            const quizzesQuery = query(
                collection(db, 'quizzes'),
                where('classId', '==', classId),
                orderBy('createdAt', 'desc')
            );

            const snapshot = await getDocs(quizzesQuery);
            const quizzesData = [];

            let completedCount = 0;
            let totalScore = 0;
            let totalPossiblePoints = 0;
            let earnedPoints = 0;

            for (const docSnap of snapshot.docs) {
                const quizData = docSnap.data();
                const dueDate = quizData.dueDate?.toDate?.() || new Date(quizData.dueDate);

                // Check if student has attempted this quiz
                const sessionsQuery = query(
                    collection(db, 'quizSessions'),
                    where('quizId', '==', docSnap.id),
                    where('userId', '==', user.uid),
                    orderBy('completedAt', 'desc')
                );

                const sessionsSnap = await getDocs(sessionsQuery);
                const attempts = sessionsSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    completedAt: doc.data().completedAt?.toDate?.() || null
                }));

                // Get best attempt
                const bestAttempt = attempts.length > 0
                    ? attempts.reduce((best, current) =>
                        (current.score > best.score ? current : best), attempts[0])
                    : null;

                // Calculate status
                let status = 'available';
                if (attempts.length > 0) {
                    status = 'completed';
                    completedCount++;
                    if (bestAttempt?.score !== undefined) {
                        totalScore += bestAttempt.score;
                    }
                } else if (dueDate && new Date() > dueDate) {
                    status = 'expired';
                } else if (quizData.startDate && new Date() < quizData.startDate.toDate()) {
                    status = 'upcoming';
                }

                const maxPoints = quizData.maxPoints || quizData.questionCount * 10 || 100;
                totalPossiblePoints += maxPoints;
                if (bestAttempt?.score !== undefined) {
                    earnedPoints += bestAttempt.score;
                }

                quizzesData.push({
                    id: docSnap.id,
                    ...quizData,
                    dueDate,
                    status,
                    attempts: attempts.length,
                    bestScore: bestAttempt?.score,
                    lastAttempt: bestAttempt,
                    maxPoints
                });
            }

            setQuizzes(quizzesData);
            setStats({
                total: quizzesData.length,
                completed: completedCount,
                available: quizzesData.filter(q => q.status === 'available').length,
                avgScore: completedCount > 0 ? Math.round(totalScore / completedCount) : 0,
                totalPoints: totalPossiblePoints,
                earnedPoints
            });

        } catch (error) {
            console.error('Error loading quizzes:', error);
            toast.error('Failed to load quizzes');
        } finally {
            setLoading(false);
        }
    };

    const getFilteredQuizzes = () => {
        let filtered = [...quizzes];

        // Search
        if (searchQuery) {
            filtered = filtered.filter(q =>
                q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                q.subject?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Status filter
        if (filterStatus !== 'all') {
            filtered = filtered.filter(q => q.status === filterStatus);
        }

        // Sort
        if (sortBy === 'recent') {
            filtered.sort((a, b) => b.createdAt - a.createdAt);
        } else if (sortBy === 'name') {
            filtered.sort((a, b) => a.title.localeCompare(b.title));
        } else if (sortBy === 'dueDate') {
            filtered.sort((a, b) => a.dueDate - b.dueDate);
        }

        return filtered;
    };

    const handleStartQuiz = (quiz) => {
        if (quiz.status === 'completed' && quiz.attempts >= (quiz.maxAttempts || 3)) {
            toast.error('Maximum attempts reached');
            return;
        }

        if (quiz.status === 'upcoming') {
            toast.error('Quiz not yet available');
            return;
        }

        if (quiz.status === 'expired') {
            toast.error('Quiz has expired');
            return;
        }

        navigate(`/quiz/${quiz.id}`);
    };

    const getStatusConfig = (status) => {
        const configs = {
            available: {
                label: 'Available',
                color: 'bg-green-100 text-green-700 border-green-300',
                icon: Play
            },
            completed: {
                label: 'Completed',
                color: 'bg-blue-100 text-blue-700 border-blue-300',
                icon: CheckCircle2
            },
            upcoming: {
                label: 'Upcoming',
                color: 'bg-yellow-100 text-yellow-700 border-yellow-300',
                icon: Clock
            },
            expired: {
                label: 'Expired',
                color: 'bg-red-100 text-red-700 border-red-300',
                icon: AlertCircle
            }
        };
        return configs[status] || configs.available;
    };

    const getDaysUntil = (date) => {
        const now = new Date();
        const diff = date - now;
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

        if (days < 0) return 'Expired';
        if (days === 0) return 'Due today';
        if (days === 1) return 'Due tomorrow';
        return `${days} days left`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center">
                    <Loader2 size={48} className="text-blue-600 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600 font-semibold">Loading quizzes...</p>
                </div>
            </div>
        );
    }

    const filteredQuizzes = getFilteredQuizzes();

    return (
        <div className="space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white border-2 border-gray-200 rounded-xl p-5"
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                            <Trophy size={20} className="text-white" strokeWidth={2.5} />
                        </div>
                    </div>
                    <p className="text-3xl font-black text-gray-900 mb-1">{stats.total}</p>
                    <p className="text-sm text-gray-600 font-semibold">Total Quizzes</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white border-2 border-green-200 rounded-xl p-5"
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-500 rounded-lg flex items-center justify-center">
                            <CheckCircle2 size={20} className="text-white" strokeWidth={2.5} />
                        </div>
                    </div>
                    <p className="text-3xl font-black text-green-700 mb-1">{stats.completed}</p>
                    <p className="text-sm text-green-600 font-semibold">Completed</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white border-2 border-purple-200 rounded-xl p-5"
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                            <Star size={20} className="text-white" strokeWidth={2.5} />
                        </div>
                    </div>
                    <p className="text-3xl font-black text-purple-700 mb-1">{stats.avgScore}%</p>
                    <p className="text-sm text-purple-600 font-semibold">Avg Score</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white border-2 border-yellow-200 rounded-xl p-5"
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center">
                            <Zap size={20} className="text-white" strokeWidth={2.5} />
                        </div>
                    </div>
                    <p className="text-3xl font-black text-yellow-700 mb-1">{stats.earnedPoints}</p>
                    <p className="text-sm text-yellow-600 font-semibold">Points Earned</p>
                </motion.div>
            </div>

            {/* Progress Bar */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white border-2 border-gray-200 rounded-xl p-6"
            >
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h3 className="text-lg font-black text-gray-900">Overall Progress</h3>
                        <p className="text-sm text-gray-600">Complete all quizzes to master the subject</p>
                    </div>
                    <div className="text-right">
                        <p className="text-3xl font-black text-blue-600">
                            {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
                        </p>
                        <p className="text-xs text-gray-500 font-semibold">{stats.completed}/{stats.total} completed</p>
                    </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full"
                    />
                </div>
            </motion.div>

            {/* Search and Filters */}
            <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search quizzes..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none font-medium"
                        />
                    </div>

                    {/* Status Filter */}
                    <div className="flex items-center gap-2">
                        <Filter size={20} className="text-gray-600" />
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none font-semibold"
                        >
                            <option value="all">All Status</option>
                            <option value="available">Available</option>
                            <option value="completed">Completed</option>
                            <option value="upcoming">Upcoming</option>
                            <option value="expired">Expired</option>
                        </select>
                    </div>

                    {/* Sort */}
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none font-semibold"
                    >
                        <option value="recent">Most Recent</option>
                        <option value="name">Name A-Z</option>
                        <option value="dueDate">Due Date</option>
                    </select>
                </div>
            </div>

            {/* Quizzes List */}
            {filteredQuizzes.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-6">
                    {filteredQuizzes.map((quiz, idx) => {
                        const statusConfig = getStatusConfig(quiz.status);
                        const StatusIcon = statusConfig.icon;
                        const percentage = quiz.bestScore !== undefined && quiz.maxPoints
                            ? Math.round((quiz.bestScore / quiz.maxPoints) * 100)
                            : null;

                        return (
                            <motion.div
                                key={quiz.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden hover:shadow-xl transition-all group"
                            >
                                {/* Header */}
                                <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 p-6 relative">
                                    <div className="absolute top-4 right-4">
                                        <div className={`flex items-center gap-2 px-3 py-1.5 border-2 rounded-lg backdrop-blur-sm ${statusConfig.color} bg-white/90`}>
                                            <StatusIcon size={14} strokeWidth={2.5} />
                                            <span className="font-black text-xs">{statusConfig.label}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                                            <Brain size={24} className="text-white" strokeWidth={2.5} />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-xl font-black text-white line-clamp-1 group-hover:underline">
                                                {quiz.title}
                                            </h3>
                                        </div>
                                    </div>

                                    {quiz.subject && (
                                        <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-lg text-xs font-bold text-white">
                                            {quiz.subject}
                                        </span>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="p-6">
                                    {/* Quiz Info */}
                                    <div className="grid grid-cols-3 gap-3 mb-5">
                                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                                            <BookOpen size={16} className="text-gray-600 mx-auto mb-1" />
                                            <p className="text-lg font-black text-gray-900">{quiz.questionCount || 10}</p>
                                            <p className="text-xs text-gray-600 font-semibold">Questions</p>
                                        </div>

                                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                                            <Clock size={16} className="text-gray-600 mx-auto mb-1" />
                                            <p className="text-lg font-black text-gray-900">{quiz.timeLimit || 15}</p>
                                            <p className="text-xs text-gray-600 font-semibold">Minutes</p>
                                        </div>

                                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                                            <Award size={16} className="text-gray-600 mx-auto mb-1" />
                                            <p className="text-lg font-black text-gray-900">{quiz.maxPoints}</p>
                                            <p className="text-xs text-gray-600 font-semibold">Points</p>
                                        </div>
                                    </div>

                                    {/* Due Date */}
                                    {quiz.dueDate && (
                                        <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                                            <div className="flex items-center gap-2 text-sm">
                                                <Calendar size={16} className="text-gray-500" />
                                                <span className="text-gray-700 font-semibold">
                                                    {quiz.dueDate.toLocaleDateString()}
                                                </span>
                                            </div>
                                            <span className={`text-sm font-bold ${quiz.status === 'expired' ? 'text-red-600' : 'text-blue-600'
                                                }`}>
                                                {getDaysUntil(quiz.dueDate)}
                                            </span>
                                        </div>
                                    )}

                                    {/* Performance (if completed) */}
                                    {quiz.status === 'completed' && percentage !== null && (
                                        <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs text-purple-600 font-bold">Best Score</span>
                                                <span className="text-xs text-purple-600 font-semibold">
                                                    {quiz.attempts} attempt{quiz.attempts !== 1 ? 's' : ''}
                                                </span>
                                            </div>
                                            <div className="flex items-baseline gap-2">
                                                <p className="text-3xl font-black text-purple-700">{percentage}%</p>
                                                <p className="text-sm text-purple-600 font-semibold">
                                                    ({quiz.bestScore}/{quiz.maxPoints} points)
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Action Button */}
                                    <button
                                        onClick={() => handleStartQuiz(quiz)}
                                        disabled={quiz.status === 'upcoming' || (quiz.status === 'expired' && quiz.attempts === 0)}
                                        className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${quiz.status === 'available'
                                                ? 'bg-gradient-to-r from-green-600 to-teal-600 text-white hover:shadow-lg'
                                                : quiz.status === 'completed'
                                                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg'
                                                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                            }`}
                                    >
                                        {quiz.status === 'available' && (
                                            <>
                                                <Play size={18} fill="currentColor" />
                                                Start Quiz
                                            </>
                                        )}
                                        {quiz.status === 'completed' && (
                                            <>
                                                <TrendingUp size={18} />
                                                {quiz.attempts >= (quiz.maxAttempts || 3) ? 'View Results' : 'Retake Quiz'}
                                            </>
                                        )}
                                        {quiz.status === 'upcoming' && (
                                            <>
                                                <Clock size={18} />
                                                Coming Soon
                                            </>
                                        )}
                                        {quiz.status === 'expired' && (
                                            <>
                                                <AlertCircle size={18} />
                                                Expired
                                            </>
                                        )}
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-white rounded-xl border-2 border-gray-200 p-12 text-center">
                    <Brain size={64} className="text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {searchQuery || filterStatus !== 'all'
                            ? 'No quizzes found'
                            : 'No quizzes yet'}
                    </h3>
                    <p className="text-gray-600">
                        {searchQuery || filterStatus !== 'all'
                            ? 'Try adjusting your search or filters'
                            : 'Your teacher hasn\'t created any quizzes yet'}
                    </p>
                </div>
            )}
        </div>
    );
};

export default StudentQuizzes;
