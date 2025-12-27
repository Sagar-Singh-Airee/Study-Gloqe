// src/features/teacher/components/classroom/TeacherQuizzes.jsx - QUIZ MANAGEMENT & ANALYTICS 🧠

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Brain, Clock, Users, TrendingUp, Award, CheckCircle,
    XCircle, Edit2, Trash2, Eye, BarChart3, Calendar,
    Search, Filter, ChevronDown, Target, Zap, AlertCircle
} from 'lucide-react';
import {
    collection, query, orderBy, onSnapshot, addDoc,
    updateDoc, deleteDoc, doc, serverTimestamp, where, getDocs
} from 'firebase/firestore';
import { db } from '@/shared/config/firebase';
import { format, isPast, isToday, isTomorrow } from 'date-fns';
import toast from 'react-hot-toast';

const TeacherQuizzes = ({ classId, classData }) => {
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedQuiz, setSelectedQuiz] = useState(null);
    const [filterStatus, setFilterStatus] = useState('all'); // all, active, completed, upcoming
    const [searchQuery, setSearchQuery] = useState('');
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        completed: 0,
        upcoming: 0,
        avgScore: 0,
        totalAttempts: 0,
    });

    // Fetch Quizzes Real-time
    useEffect(() => {
        if (!classId) return;

        const quizzesRef = collection(db, 'classes', classId, 'quizzes');
        const q = query(quizzesRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const quizList = await Promise.all(
                snapshot.docs.map(async (docSnap) => {
                    const data = docSnap.data();

                    // Get attempt statistics
                    const attemptsRef = collection(db, 'classes', classId, 'quizzes', docSnap.id, 'attempts');
                    const attemptsSnap = await getDocs(attemptsRef);

                    const attempts = attemptsSnap.docs.map(d => d.data());
                    const attemptCount = attempts.length;
                    const uniqueStudents = new Set(attempts.map(a => a.studentId)).size;

                    const totalScore = attempts.reduce((sum, a) => sum + (a.score || 0), 0);
                    const avgScore = attemptCount > 0 ? (totalScore / attemptCount).toFixed(1) : 0;

                    return {
                        id: docSnap.id,
                        ...data,
                        attemptCount,
                        uniqueStudents,
                        avgScore,
                    };
                })
            );

            setQuizzes(quizList);
            calculateStats(quizList);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [classId]);

    // Calculate Stats
    const calculateStats = (quizList) => {
        const now = new Date();
        const active = quizList.filter(q => {
            const dueDate = q.dueDate?.toDate();
            const startDate = q.startDate?.toDate();
            return startDate <= now && dueDate >= now;
        }).length;

        const upcoming = quizList.filter(q => {
            const startDate = q.startDate?.toDate();
            return startDate > now;
        }).length;

        const completed = quizList.filter(q => {
            const dueDate = q.dueDate?.toDate();
            return dueDate < now;
        }).length;

        const totalAttempts = quizList.reduce((sum, q) => sum + (q.attemptCount || 0), 0);
        const totalScore = quizList.reduce((sum, q) => sum + (parseFloat(q.avgScore) || 0) * (q.attemptCount || 0), 0);
        const avgScore = totalAttempts > 0 ? (totalScore / totalAttempts).toFixed(1) : 0;

        setStats({
            total: quizList.length,
            active,
            completed,
            upcoming,
            avgScore,
            totalAttempts,
        });
    };

    // Filter & Search
    const filteredQuizzes = quizzes.filter(quiz => {
        const matchesSearch = quiz.title.toLowerCase().includes(searchQuery.toLowerCase());
        const now = new Date();
        const dueDate = quiz.dueDate?.toDate();
        const startDate = quiz.startDate?.toDate();

        if (!matchesSearch) return false;

        switch (filterStatus) {
            case 'active':
                return startDate <= now && dueDate >= now;
            case 'completed':
                return dueDate < now;
            case 'upcoming':
                return startDate > now;
            default:
                return true;
        }
    });

    // Delete Quiz
    const handleDeleteQuiz = async (quizId) => {
        if (!confirm('Delete this quiz? All attempts will be lost.')) return;

        try {
            await deleteDoc(doc(db, 'classes', classId, 'quizzes', quizId));
            toast.success('Quiz deleted successfully');
        } catch (error) {
            console.error('Error deleting quiz:', error);
            toast.error('Failed to delete quiz');
        }
    };

    return (
        <div className="space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-6 gap-4">
                <StatCard
                    icon={Brain}
                    label="Total Quizzes"
                    value={stats.total}
                    gradient="from-purple-500 to-pink-500"
                />
                <StatCard
                    icon={Zap}
                    label="Active Now"
                    value={stats.active}
                    gradient="from-green-500 to-teal-500"
                />
                <StatCard
                    icon={CheckCircle}
                    label="Completed"
                    value={stats.completed}
                    gradient="from-blue-500 to-cyan-500"
                />
                <StatCard
                    icon={Clock}
                    label="Upcoming"
                    value={stats.upcoming}
                    gradient="from-orange-500 to-red-500"
                />
                <StatCard
                    icon={Users}
                    label="Total Attempts"
                    value={stats.totalAttempts}
                    gradient="from-indigo-500 to-purple-500"
                />
                <StatCard
                    icon={Award}
                    label="Avg Score"
                    value={`${stats.avgScore}%`}
                    gradient="from-yellow-500 to-orange-500"
                />
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 w-full">
                    {/* Search */}
                    <div className="relative flex-1 max-w-md">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search quizzes..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all text-sm font-semibold"
                        />
                    </div>

                    {/* Filter */}
                    <div className="relative">
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="appearance-none pl-4 pr-10 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all text-sm font-bold text-gray-700 bg-white cursor-pointer"
                        >
                            <option value="all">All Quizzes</option>
                            <option value="active">Active</option>
                            <option value="upcoming">Upcoming</option>
                            <option value="completed">Completed</option>
                        </select>
                        <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                </div>

                {/* Create Button */}
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl text-sm font-bold hover:shadow-lg hover:scale-105 transition-all whitespace-nowrap"
                >
                    <Plus size={18} />
                    Create Quiz
                </button>
            </div>

            {/* Quizzes Grid */}
            {loading ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => <QuizSkeleton key={i} />)}
                </div>
            ) : filteredQuizzes.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-300">
                    <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-5 border-4 border-white shadow-lg">
                        <Brain size={40} className="text-purple-600" />
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 mb-2">
                        {searchQuery ? 'No Results Found' : 'No Quizzes Yet'}
                    </h3>
                    <p className="text-sm text-gray-600 mb-6">
                        {searchQuery
                            ? 'Try adjusting your search or filters'
                            : 'Create your first quiz to assess student knowledge!'}
                    </p>
                    {!searchQuery && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl text-sm font-bold hover:shadow-lg hover:scale-105 transition-all"
                        >
                            <Plus size={18} />
                            Create First Quiz
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredQuizzes.map((quiz, idx) => (
                        <QuizCard
                            key={quiz.id}
                            quiz={quiz}
                            classData={classData}
                            onDelete={handleDeleteQuiz}
                            onEdit={setSelectedQuiz}
                            delay={idx * 0.05}
                        />
                    ))}
                </div>
            )}

            {/* Create Quiz Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <CreateQuizModal
                        classId={classId}
                        onClose={() => setShowCreateModal(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

// Stat Card Component
const StatCard = ({ icon: Icon, label, value, gradient }) => {
    return (
        <motion.div
            whileHover={{ y: -4, scale: 1.02 }}
            className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-lg transition-all"
        >
            <div className={`w-12 h-12 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center mb-3`}>
                <Icon size={20} className="text-white" />
            </div>
            <div className="text-2xl font-black text-gray-900 mb-1">{value}</div>
            <div className="text-xs text-gray-600 font-semibold">{label}</div>
        </motion.div>
    );
};

// Quiz Card Component
const QuizCard = ({ quiz, classData, onDelete, onEdit, delay }) => {
    const now = new Date();
    const dueDate = quiz.dueDate?.toDate();
    const startDate = quiz.startDate?.toDate();

    const isActive = startDate <= now && dueDate >= now;
    const isUpcoming = startDate > now;
    const isCompleted = dueDate < now;

    const isDueToday = isToday(dueDate);
    const isDueTomorrow = isTomorrow(dueDate);

    const participationRate = ((quiz.uniqueStudents / (classData.studentCount || 1)) * 100).toFixed(0);

    let statusColor = 'gray';
    let statusText = 'Draft';
    if (isActive) {
        statusColor = 'green';
        statusText = 'Active';
    } else if (isUpcoming) {
        statusColor = 'orange';
        statusText = 'Upcoming';
    } else if (isCompleted) {
        statusColor = 'blue';
        statusText = 'Completed';
    }

    let dueDateText = format(dueDate, 'MMM d, h:mm a');
    if (isDueToday) dueDateText = 'Due Today';
    if (isDueTomorrow) dueDateText = 'Due Tomorrow';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
            whileHover={{ y: -4 }}
            className={`bg-white border-2 rounded-2xl p-5 hover:shadow-xl transition-all ${isActive ? 'border-green-200 bg-green-50/30' : 'border-gray-200'
                }`}
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2.5 py-1 bg-${statusColor}-100 text-${statusColor}-700 rounded-lg text-xs font-black uppercase`}>
                            {statusText}
                        </span>
                        {quiz.timed && (
                            <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-lg text-xs font-bold flex items-center gap-1">
                                <Clock size={12} />
                                {quiz.duration}m
                            </span>
                        )}
                    </div>
                    <h3 className="text-base font-black text-gray-900 mb-1 line-clamp-2">
                        {quiz.title}
                    </h3>
                    <p className="text-xs text-gray-600 font-semibold">
                        {quiz.questionCount || 0} questions • {quiz.totalPoints || 0} pts
                    </p>
                </div>
            </div>

            {/* Date Range */}
            <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-xs">
                    <div className="w-20 font-bold text-gray-600">Start:</div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-100 rounded-lg font-semibold text-gray-700">
                        <Calendar size={12} />
                        {startDate && format(startDate, 'MMM d, h:mm a')}
                    </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                    <div className="w-20 font-bold text-gray-600">Due:</div>
                    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-semibold ${isDueToday ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                        <Clock size={12} />
                        {dueDateText}
                    </div>
                </div>
            </div>

            {/* Performance Stats */}
            <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="text-center p-3 bg-blue-50 rounded-xl border border-blue-200">
                    <Users size={14} className="text-blue-600 mx-auto mb-1" />
                    <div className="text-lg font-black text-gray-900">{quiz.uniqueStudents}</div>
                    <div className="text-[9px] text-gray-600 font-bold uppercase">Students</div>
                    <div className="mt-0.5 text-xs font-black text-blue-600">{participationRate}%</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-xl border border-purple-200">
                    <TrendingUp size={14} className="text-purple-600 mx-auto mb-1" />
                    <div className="text-lg font-black text-gray-900">{quiz.attemptCount || 0}</div>
                    <div className="text-[9px] text-gray-600 font-bold uppercase">Attempts</div>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-xl border border-yellow-200">
                    <Award size={14} className="text-yellow-600 mx-auto mb-1" />
                    <div className="text-lg font-black text-gray-900">{quiz.avgScore}%</div>
                    <div className="text-[9px] text-gray-600 font-bold uppercase">Avg Score</div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
                <button className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl text-xs font-bold hover:shadow-lg transition-all flex items-center justify-center gap-1.5">
                    <BarChart3 size={14} />
                    View Results
                </button>
                <button
                    onClick={() => onEdit(quiz)}
                    className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition-all"
                    title="Edit"
                >
                    <Edit2 size={14} />
                </button>
                <button
                    onClick={() => onDelete(quiz.id)}
                    className="p-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-all"
                    title="Delete"
                >
                    <Trash2 size={14} />
                </button>
            </div>
        </motion.div>
    );
};

// Quiz Skeleton
const QuizSkeleton = () => (
    <div className="bg-white border-2 border-gray-200 rounded-2xl p-5 animate-pulse">
        <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
                <div className="flex gap-2 mb-2">
                    <div className="h-6 w-16 bg-gray-200 rounded-lg" />
                    <div className="h-6 w-12 bg-gray-100 rounded-lg" />
                </div>
                <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-4 bg-gray-100 rounded w-1/2" />
            </div>
        </div>
        <div className="space-y-2 mb-4">
            <div className="h-8 bg-gray-100 rounded-lg" />
            <div className="h-8 bg-gray-100 rounded-lg" />
        </div>
        <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="h-20 bg-gray-100 rounded-xl" />
            <div className="h-20 bg-gray-100 rounded-xl" />
            <div className="h-20 bg-gray-100 rounded-xl" />
        </div>
        <div className="flex gap-2">
            <div className="flex-1 h-10 bg-gray-200 rounded-xl" />
            <div className="w-10 h-10 bg-gray-100 rounded-xl" />
            <div className="w-10 h-10 bg-gray-100 rounded-xl" />
        </div>
    </div>
);

// Create Quiz Modal (Simplified)
const CreateQuizModal = ({ classId, onClose }) => {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto"
            >
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <Brain size={32} className="text-white" />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900">Create New Quiz</h2>
                    <p className="text-sm text-gray-600 mt-2">Use your existing Quiz Creator component here</p>
                </div>

                <button
                    onClick={onClose}
                    className="w-full py-3 border-2 border-gray-200 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all text-gray-700"
                >
                    Close
                </button>
            </motion.div>
        </motion.div>
    );
};

export default TeacherQuizzes;
