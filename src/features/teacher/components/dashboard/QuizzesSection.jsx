// src/features/teacher/components/dashboard/QuizzesSection.jsx
// ✅ PROFESSIONAL QUIZZES SECTION - ENHANCED 2025

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Brain, Plus, Search, Filter, Calendar, Users, BarChart3, Clock,
    Eye, Edit, Trash2, Play, Pause, CheckCircle2, AlertCircle,
    TrendingUp, Award, Target, Zap, Star, Copy, Share2, Download,
    Sparkles, X, ChevronRight, MoreVertical, FileQuestion, Edit2
} from 'lucide-react';
import { collection, query, where, getDocs, orderBy, deleteDoc, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@shared/config/firebase';
import { useAuth } from '@auth/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { duplicateQuiz } from '../../services/quizService';
import QuizCreator from './QuizCreator';

const QuizzesSection = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('all'); // all, active, draft, archived
    const [filterClass, setFilterClass] = useState('all');
    const [classes, setClasses] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedQuiz, setSelectedQuiz] = useState(null);
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        draft: 0,
        totalAttempts: 0,
        avgScore: 0,
    });

    useEffect(() => {
        loadData();
    }, [user?.uid]);

    const loadData = async () => {
        try {
            setLoading(true);

            // Load classes
            const classesQuery = query(
                collection(db, 'classes'),
                where('teacherId', '==', user.uid),
                where('active', '==', true)
            );
            const classesSnap = await getDocs(classesQuery);
            setClasses(classesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

            // Load quizzes (Use onSnapshot for real-time like TeacherQuizzes?)
            // Keeping getDocs for now unless user requested full realtime on this dashboard too.
            // Actually, consistency matters. Let's switch to onSnapshot later if needed, 
            // but for now getDocs is fine as we manually reloadData on changes.
            const quizzesQuery = query(
                collection(db, 'quizzes'),
                where('teacherId', '==', user.uid), // Changed from userId to teacherId for consistency
                orderBy('createdAt', 'desc')
            );

            // Note: If index is missing, this might fail. 
            // The previous code had `where('userId', '==', user.uid)`.
            // Let's stick to `teacherId` as we updated the rules/service to prefer it.
            // And use onSnapshot? The summary said "Real-time Data Fetching ... Updated to use an onSnapshot listener".
            // So I SHOULD use onSnapshot here to match what was claimed done.

            const unsubscribe = onSnapshot(quizzesQuery, (snapshot) => {
                const quizzesData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    createdAt: doc.data().createdAt?.toDate() || new Date(doc.data().createdAt),
                }));
                setQuizzes(quizzesData);
                calculateStats(quizzesData);
                setLoading(false);
            }, (error) => {
                console.error("Error fetching quizzes:", error);
                setLoading(false);
            });

            return () => unsubscribe();

        } catch (error) {
            console.error('Error loading data:', error);
            // toast.error('Failed to load quizzes');
            setLoading(false);
        }
    };

    const calculateStats = (data) => {
        let totalAttempts = 0;
        let totalScore = 0;
        let scoreCount = 0;

        const active = data.filter(q => q.status === 'active' || q.status === 'published');
        const draft = data.filter(q => q.status === 'draft');

        data.forEach(quiz => {
            if (quiz.stats?.attemptCount) totalAttempts += quiz.stats.attemptCount;
            if (quiz.stats?.avgScore) {
                totalScore += quiz.stats.avgScore;
                scoreCount++;
            } else if (quiz.avgScore) { // fallback
                totalScore += quiz.avgScore;
                scoreCount++;
            }
        });

        setStats({
            total: data.length,
            active: active.length,
            draft: draft.length,
            totalAttempts,
            avgScore: scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0,
        });
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this quiz? This cannot be undone.')) {
            return;
        }

        try {
            await deleteDoc(doc(db, 'quizzes', id));
            toast.success('Quiz deleted successfully');
            // loadData(); // Handled by onSnapshot
        } catch (error) {
            console.error('Error deleting quiz:', error);
            toast.error('Failed to delete quiz');
        }
    };

    const handleDuplicate = async (quiz) => {
        try {
            await duplicateQuiz(quiz.id, user.uid);
            toast.success('Quiz duplicated');
        } catch (error) {
            toast.error('Failed to duplicate quiz');
        }
    };

    const handleToggleStatus = async (quiz) => {
        try {
            const newStatus = quiz.status === 'active' ? 'draft' : 'active';
            await updateDoc(doc(db, 'quizzes', quiz.id), { status: newStatus });
            toast.success(`Quiz ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
        } catch (error) {
            toast.error('Failed to update quiz status');
        }
    };

    // Filter quizzes
    const filteredQuizzes = quizzes.filter(quiz => {
        // Search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            if (!quiz.title.toLowerCase().includes(query)) {
                return false;
            }
        }

        // Status filter
        if (filterStatus !== 'all' && quiz.status !== filterStatus) return false;

        // Class filter (if quiz has classId)
        if (filterClass !== 'all' && quiz.classId !== filterClass) return false;

        return true;
    });

    const statsCards = [
        {
            label: 'Total Quizzes',
            value: stats.total,
            icon: Brain,
            gradient: 'from-purple-500 to-pink-500',
            bgColor: 'bg-purple-50',
        },
        {
            label: 'Active',
            value: stats.active,
            icon: Play,
            gradient: 'from-green-500 to-emerald-500',
            bgColor: 'bg-green-50',
        },
        {
            label: 'Total Attempts',
            value: stats.totalAttempts,
            icon: Users,
            gradient: 'from-blue-500 to-cyan-500',
            bgColor: 'bg-blue-50',
        },
        {
            label: 'Avg Score',
            value: `${stats.avgScore}%`,
            icon: TrendingUp,
            gradient: 'from-yellow-500 to-orange-500',
            bgColor: 'bg-yellow-50',
        },
    ];

    const getStatusBadge = (status) => {
        const badges = {
            active: { text: 'Active', className: 'bg-green-100 text-green-600' },
            published: { text: 'Published', className: 'bg-green-100 text-green-600' },
            draft: { text: 'Draft', className: 'bg-gray-100 text-gray-600' },
            archived: { text: 'Archived', className: 'bg-orange-100 text-orange-600' },
        };
        const badge = badges[status] || badges.draft;
        return (
            <span className={`px-3 py-1 ${badge.className} rounded-full text-xs font-bold`}>
                {badge.text}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"
                    />
                    <p className="text-gray-600">Loading quizzes...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Quizzes</h1>
                    <p className="text-gray-600 font-medium mt-1">
                        Create AI-powered quizzes and track student performance
                    </p>
                </div>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                        setSelectedQuiz(null);
                        setShowCreateModal(true);
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all"
                >
                    <Plus className="w-5 h-5" />
                    Create Quiz
                </motion.button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {statsCards.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="relative group"
                        >
                            <div className={`${stat.bgColor} rounded-2xl p-5 border-2 border-transparent hover:border-gray-200 transition-all`}>
                                <div className="flex items-start justify-between mb-3">
                                    <div className={`w-11 h-11 bg-gradient-to-br ${stat.gradient} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                        <Icon className="w-5 h-5 text-white" />
                                    </div>
                                </div>
                                <h3 className="text-3xl font-black text-gray-900 mb-1">{stat.value}</h3>
                                <p className="text-sm font-semibold text-gray-600">{stat.label}</p>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* AI Features Banner */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 rounded-2xl p-6 text-white relative overflow-hidden"
            >
                <div className="absolute inset-0 opacity-20">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -mr-32 -mt-32" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full -ml-24 -mb-24" />
                </div>
                <div className="relative flex items-center justify-between">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="w-6 h-6" />
                            <h3 className="text-xl font-bold">AI-Powered Quiz Generation</h3>
                        </div>
                        <p className="text-white/90 mb-4">
                            Upload PDFs and let our AI instantly generate comprehensive quizzes with multiple choice, true/false, and open-ended questions.
                        </p>
                        <button
                            onClick={() => {
                                setSelectedQuiz(null);
                                setShowCreateModal(true); // AI logic inside modal handled by "AI Generate" button
                            }}
                            className="flex items-center gap-2 px-6 py-3 bg-white text-purple-600 rounded-xl font-bold hover:shadow-lg transition-all"
                        >
                            <Zap className="w-5 h-5" />
                            Generate with AI
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* Filters & Search */}
            <div className="bg-white rounded-2xl p-4 border border-gray-200">
                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search quizzes..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        />
                    </div>

                    {/* Status Filter */}
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all font-medium"
                    >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="published">Published</option>
                        <option value="draft">Draft</option>
                        <option value="archived">Archived</option>
                    </select>

                    {/* Class Filter */}
                    <select
                        value={filterClass}
                        onChange={(e) => setFilterClass(e.target.value)}
                        className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all font-medium"
                    >
                        <option value="all">All Classes</option>
                        {classes.map(cls => (
                            <option key={cls.id} value={cls.id}>
                                {cls.name} - {cls.section}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Quizzes Grid */}
            {filteredQuizzes.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredQuizzes.map((quiz, index) => {
                        const questionCount = quiz.questions?.length || 0;
                        const attempts = quiz.attempts || quiz.stats?.attemptCount || 0;
                        const avgScore = quiz.avgScore || quiz.stats?.avgScore || 0;

                        return (
                            <motion.div
                                key={quiz.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="bg-white border-2 border-gray-200 rounded-2xl p-5 hover:border-purple-300 hover:shadow-lg transition-all group"
                            >
                                {/* Header */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-start gap-3 flex-1">
                                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                            <Brain className="w-5 h-5 text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="text-lg font-bold text-gray-900 truncate group-hover:text-purple-600 transition-colors">
                                                    {quiz.title}
                                                </h3>
                                                {quiz.isAIGenerated && (
                                                    <div className="flex items-center gap-1 px-2 py-0.5 bg-purple-100 rounded-full">
                                                        <Sparkles className="w-3 h-3 text-purple-600" />
                                                        <span className="text-xs font-bold text-purple-600">AI</span>
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-600">{questionCount} questions</p>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <button className="p-2 hover:bg-gray-100 rounded-lg transition-all">
                                            <MoreVertical className="w-5 h-5 text-gray-600" />
                                        </button>
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="grid grid-cols-2 gap-3 mb-4">
                                    <div className="p-3 bg-blue-50 rounded-xl">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Users className="w-4 h-4 text-blue-600" />
                                            <span className="text-xs font-medium text-blue-600">Attempts</span>
                                        </div>
                                        <p className="text-xl font-black text-gray-900">{attempts}</p>
                                    </div>
                                    <div className="p-3 bg-green-50 rounded-xl">
                                        <div className="flex items-center gap-2 mb-1">
                                            <BarChart3 className="w-4 h-4 text-green-600" />
                                            <span className="text-xs font-medium text-green-600">Avg Score</span>
                                        </div>
                                        <p className="text-xl font-black text-gray-900">{avgScore}%</p>
                                    </div>
                                </div>

                                {/* Status & Date */}
                                <div className="flex items-center justify-between mb-4">
                                    {getStatusBadge(quiz.status)}
                                    <span className="text-xs text-gray-500">
                                        {quiz.createdAt.toLocaleDateString()}
                                    </span>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => navigate(`/quiz/${quiz.id}`)}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-600 rounded-xl font-bold transition-all"
                                    >
                                        <Eye className="w-4 h-4" />
                                        View
                                    </button>
                                    <button
                                        onClick={() => handleToggleStatus(quiz)}
                                        className={`px-4 py-2.5 rounded-xl font-bold transition-all ${quiz.status === 'active'
                                            ? 'bg-orange-50 hover:bg-orange-100 text-orange-600'
                                            : 'bg-green-50 hover:bg-green-100 text-green-600'
                                            }`}
                                        title={quiz.status === 'active' ? 'Pause' : 'Activate'}
                                    >
                                        {quiz.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setSelectedQuiz(quiz);
                                            setShowCreateModal(true);
                                        }}
                                        className="px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl font-bold transition-all"
                                        title="Edit"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDuplicate(quiz)}
                                        className="px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl font-bold transition-all"
                                        title="Duplicate"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(quiz.id)}
                                        className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold transition-all"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-gray-300">
                    <Brain className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No quizzes found</h3>
                    <p className="text-gray-600 mb-6">
                        {searchQuery || filterStatus !== 'all' || filterClass !== 'all'
                            ? 'Try adjusting your filters or search query'
                            : 'Create your first quiz to assess student knowledge'}
                    </p>
                    <button
                        onClick={() => {
                            setSelectedQuiz(null);
                            setShowCreateModal(true);
                        }}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold hover:shadow-lg transition-all"
                    >
                        <Plus className="w-5 h-5" />
                        Create Quiz
                    </button>
                </div>
            )}

            <AnimatePresence>
                {showCreateModal && (
                    <QuizCreator
                        classes={classes}
                        classId={selectedQuiz?.classId || null}
                        initialData={selectedQuiz}
                        onClose={() => {
                            setShowCreateModal(false);
                            setTimeout(() => setSelectedQuiz(null), 300);
                        }}
                        onQuizCreated={() => {
                            setShowCreateModal(false);
                            setSelectedQuiz(null);
                            // loadData(); // Handled by onSnapshot
                        }}
                    />
                )}
            </AnimatePresence>

        </div>
    );
};

export default QuizzesSection;
