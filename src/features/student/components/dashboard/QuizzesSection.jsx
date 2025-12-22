// src/components/features/QuizzesSection.jsx - WHITE & SILVER MINIMAL DESIGN ✨

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Brain,
    Plus,
    Search,
    Trash2,
    Play,
    Clock,
    Target,
    Award,
    Sparkles,
    ChevronRight,
    Zap,
    TrendingUp,
    BookOpen,
    Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@auth/contexts/AuthContext';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@shared/config/firebase';
import { getUserQuizzes, deleteQuiz, generateQuizWithGemini, createQuiz } from '@teacher/services/quizService';
import toast from 'react-hot-toast';

const QuizzesSection = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [quizzes, setQuizzes] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('all');
    const [generatingQuiz, setGeneratingQuiz] = useState(null);
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [selectedDocument, setSelectedDocument] = useState(null);

    // Subject config - white/silver theme
    const subjectConfig = {
        'Mathematics': {
            color: 'text-blue-700',
            bg: 'bg-gradient-to-br from-blue-50 to-blue-100/50',
            border: 'border-blue-200/60',
            icon: 'bg-gradient-to-br from-blue-500 to-teal-500'
        },
        'Physics': {
            color: 'text-teal-700',
            bg: 'bg-gradient-to-br from-teal-50 to-teal-100/50',
            border: 'border-teal-200/60',
            icon: 'bg-gradient-to-br from-teal-500 to-blue-500'
        },
        'Chemistry': {
            color: 'text-teal-700',
            bg: 'bg-gradient-to-br from-teal-50 to-blue-50',
            border: 'border-teal-200/60',
            icon: 'bg-gradient-to-br from-teal-500 to-blue-400'
        },
        'Biology': {
            color: 'text-teal-800',
            bg: 'bg-gradient-to-br from-teal-50 to-teal-100/50',
            border: 'border-teal-200/60',
            icon: 'bg-gradient-to-br from-teal-600 to-blue-400'
        },
        'Computer Science': {
            color: 'text-blue-800',
            bg: 'bg-gradient-to-br from-blue-50 to-blue-100/50',
            border: 'border-blue-200/60',
            icon: 'bg-gradient-to-br from-blue-600 to-teal-500'
        },
        'History': {
            color: 'text-slate-700',
            bg: 'bg-gradient-to-br from-slate-50 to-slate-100/50',
            border: 'border-slate-200/60',
            icon: 'bg-gradient-to-br from-slate-500 to-slate-600'
        },
        'Economics': {
            color: 'text-blue-700',
            bg: 'bg-gradient-to-br from-blue-50 to-teal-50',
            border: 'border-blue-200/60',
            icon: 'bg-gradient-to-br from-blue-500 to-teal-500'
        },
        'Literature': {
            color: 'text-slate-700',
            bg: 'bg-gradient-to-br from-slate-50 to-slate-100/50',
            border: 'border-slate-200/60',
            icon: 'bg-gradient-to-br from-slate-600 to-slate-700'
        },
        'Psychology': {
            color: 'text-blue-700',
            bg: 'bg-gradient-to-br from-blue-50 to-teal-50',
            border: 'border-blue-200/60',
            icon: 'bg-gradient-to-br from-blue-600 to-teal-600'
        },
        'Engineering': {
            color: 'text-slate-800',
            bg: 'bg-gradient-to-br from-slate-50 to-slate-100/50',
            border: 'border-slate-200/60',
            icon: 'bg-gradient-to-br from-slate-500 to-slate-600'
        },
        'General Studies': {
            color: 'text-slate-600',
            bg: 'bg-gradient-to-br from-slate-50 to-slate-100/50',
            border: 'border-slate-200/60',
            icon: 'bg-gradient-to-br from-slate-400 to-slate-500'
        }
    };

    // Real-time quizzes listener
    useEffect(() => {
        if (!user?.uid) {
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, 'quizzes'),
            where('userId', '==', user.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const quizzesData = snapshot.docs.map(doc => {
                const data = doc.data();
                const completionCount = data.completionCount || 0;
                const averageScore = data.averageScore || 0;
                const bestScore = data.bestScore || 0;

                return {
                    id: doc.id,
                    ...data,
                    completionCount,
                    averageScore,
                    bestScore,
                    createdAt: data.createdAt?.toDate?.() || new Date()
                };
            }).sort((a, b) => b.createdAt - a.createdAt);

            setQuizzes(quizzesData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user?.uid]);

    // Real-time documents listener
    useEffect(() => {
        if (!user?.uid) return;

        const q = query(
            collection(db, 'documents'),
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const docsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate?.() || new Date()
            }));

            setDocuments(docsData);
        });

        return () => unsubscribe();
    }, [user?.uid]);

    // Group quizzes by subject
    const quizzesBySubject = useMemo(() => {
        const grouped = {};
        quizzes.forEach(quiz => {
            const subject = quiz.subject || 'General Studies';
            if (!grouped[subject]) {
                grouped[subject] = [];
            }
            grouped[subject].push(quiz);
        });
        return grouped;
    }, [quizzes]);

    // Filter quizzes
    const filteredQuizzes = useMemo(() => {
        let filtered = quizzes;

        if (selectedSubject !== 'all') {
            filtered = filtered.filter(quiz =>
                (quiz.subject || 'General Studies') === selectedSubject
            );
        }

        if (searchTerm) {
            filtered = filtered.filter(quiz =>
                quiz.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                quiz.subject?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        return filtered;
    }, [quizzes, selectedSubject, searchTerm]);

    // Calculate stats
    const quizStats = useMemo(() => {
        const totalCompleted = quizzes.reduce((sum, quiz) => sum + (quiz.completionCount || 0), 0);
        const perfectScores = quizzes.filter(quiz => (quiz.bestScore || 0) === 100).length;
        const avgScore = quizzes.length > 0
            ? Math.round(quizzes.reduce((sum, quiz) => sum + (quiz.averageScore || 0), 0) / quizzes.length)
            : 0;

        return {
            totalCompleted,
            perfectScores,
            avgScore
        };
    }, [quizzes]);

    // Generate quiz handler
    const handleGenerateQuiz = async (document, difficulty, questionCount) => {
        if (!document?.id || !user?.uid) {
            toast.error('Invalid document or user');
            return;
        }

        setGeneratingQuiz(document.id);
        const toastId = toast.loading(`🤖 AI is generating your ${difficulty} quiz...`);

        try {
            const questions = await generateQuizWithGemini(document.id, difficulty, questionCount);

            if (!questions || questions.length === 0) {
                throw new Error('No questions generated. Please try again.');
            }

            const quizId = await createQuiz(user.uid, document.id, questions, {
                title: `${document.title || 'Quiz'} - ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}`,
                description: `AI-generated ${difficulty} quiz with ${questions.length} questions`,
                subject: document.subject || 'General Studies',
                difficulty: difficulty,
                timeLimit: Math.ceil(questionCount * 1.5),
                shuffleQuestions: false,
                shuffleChoices: true,
                showResults: true,
                allowRetake: true,
                showHints: true,
                completionCount: 0,
                averageScore: 0,
                bestScore: 0
            });

            setShowGenerateModal(false);
            setSelectedDocument(null);
            toast.success('✨ Quiz generated successfully!', { id: toastId });

            setTimeout(() => {
                navigate(`/quiz/${quizId}`, {
                    replace: false,
                    state: {
                        fromGeneration: true,
                        difficulty: difficulty,
                        documentTitle: document.title
                    }
                });
            }, 500);

        } catch (error) {
            console.error('Quiz generation error:', error);

            let errorMessage = 'Failed to generate quiz';
            if (error.message.includes('API key')) {
                errorMessage = 'AI service configuration error. Please contact support.';
            } else if (error.message.includes('too short')) {
                errorMessage = 'Document text is too short. Please upload a longer document.';
            } else if (error.message.includes('not found')) {
                errorMessage = 'Document not found. Please try again.';
            } else if (error.message) {
                errorMessage = error.message;
            }

            toast.error(errorMessage, { id: toastId });
        } finally {
            setGeneratingQuiz(null);
        }
    };

    // Delete quiz handler
    const handleDeleteQuiz = async (quizId, quizTitle) => {
        if (!confirm(`Are you sure you want to delete "${quizTitle}"?`)) {
            return;
        }

        const toastId = toast.loading('Deleting quiz...');

        try {
            await deleteQuiz(quizId);
            toast.success('Quiz deleted successfully', { id: toastId });
        } catch (error) {
            console.error('Delete error:', error);
            toast.error('Failed to delete quiz', { id: toastId });
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20 bg-gradient-to-br from-slate-50 via-white to-teal-50">
                <div className="flex flex-col items-center gap-4">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="w-16 h-16 border-4 border-slate-200 border-t-teal-600 rounded-full shadow-lg"
                    />
                    <p className="text-slate-700 font-bold">Loading quizzes...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50 py-8 px-6">
            {/* Animated background orbs */}
            <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.25, 0.15] }}
                transition={{ duration: 8, repeat: Infinity }}
                className="fixed top-20 left-20 w-96 h-96 bg-gradient-to-br from-blue-200/40 via-teal-200/40 to-transparent rounded-full blur-3xl pointer-events-none"
            />

            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <motion.div
                            whileHover={{ scale: 1.05 }}
                            className="p-4 bg-gradient-to-br from-blue-600 to-teal-600 rounded-2xl shadow-lg shadow-teal-200/50"
                        >
                            <Brain className="w-7 h-7 text-white" />
                        </motion.div>
                        <div>
                            <h2 className="text-3xl font-bold bg-gradient-to-r from-slate-800 via-teal-700 to-blue-700 bg-clip-text text-transparent">
                                AI Quizzes
                            </h2>
                            <p className="text-slate-600 font-medium mt-1">
                                Test your knowledge with AI-generated quizzes
                            </p>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <motion.div
                        whileHover={{ y: -2 }}
                        className="bg-white border border-slate-200/60 rounded-2xl p-5 hover:border-blue-300/60 hover:shadow-lg hover:shadow-blue-100/50 transition-all"
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2.5 bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl border border-blue-200/60">
                                <Brain size={20} className="text-blue-700" />
                            </div>
                            <span className="text-sm font-semibold text-slate-600">Total Quizzes</span>
                        </div>
                        <p className="text-3xl font-bold text-slate-800">{quizzes.length}</p>
                    </motion.div>

                    <motion.div
                        whileHover={{ y: -2 }}
                        className="bg-white border border-slate-200/60 rounded-2xl p-5 hover:border-teal-300/60 hover:shadow-lg hover:shadow-teal-100/50 transition-all"
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2.5 bg-gradient-to-br from-teal-100 to-teal-50 rounded-xl border border-teal-200/60">
                                <Target size={20} className="text-teal-700" />
                            </div>
                            <span className="text-sm font-semibold text-slate-600">Completed</span>
                        </div>
                        <p className="text-3xl font-bold text-slate-800">{quizStats.totalCompleted}</p>
                    </motion.div>

                    <motion.div
                        whileHover={{ y: -2 }}
                        className="bg-white border border-slate-200/60 rounded-2xl p-5 hover:border-yellow-300/60 hover:shadow-lg hover:shadow-yellow-100/50 transition-all"
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2.5 bg-gradient-to-br from-yellow-100 to-yellow-50 rounded-xl border border-yellow-200/60">
                                <Award size={20} className="text-yellow-700" />
                            </div>
                            <span className="text-sm font-semibold text-slate-600">Perfect Scores</span>
                        </div>
                        <p className="text-3xl font-bold text-slate-800">{quizStats.perfectScores}</p>
                    </motion.div>

                    <motion.div
                        whileHover={{ y: -2 }}
                        className="bg-white border border-slate-200/60 rounded-2xl p-5 hover:border-blue-300/60 hover:shadow-lg hover:shadow-blue-100/50 transition-all"
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2.5 bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl border border-blue-200/60">
                                <TrendingUp size={20} className="text-blue-700" />
                            </div>
                            <span className="text-sm font-semibold text-slate-600">Avg Score</span>
                        </div>
                        <p className="text-3xl font-bold text-slate-800">{quizStats.avgScore}%</p>
                    </motion.div>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
                    <input
                        type="text"
                        placeholder="Search quizzes..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200/60 rounded-2xl 
                                 focus:outline-none focus:border-teal-400/60 focus:ring-2 focus:ring-teal-100 
                                 transition-all font-medium text-slate-800 placeholder:text-slate-400 shadow-sm"
                    />
                </div>

                {/* Subject Filter Tabs */}
                <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-300">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedSubject('all')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm whitespace-nowrap transition-all shadow-sm ${selectedSubject === 'all'
                            ? 'bg-gradient-to-r from-blue-600 to-teal-600 text-white shadow-md shadow-blue-200/50'
                            : 'bg-white border border-slate-200/60 text-slate-700 hover:border-slate-300'
                            }`}
                    >
                        All ({quizzes.length})
                    </motion.button>

                    {Object.entries(quizzesBySubject).map(([subject, subjectQuizzes]) => {
                        const config = subjectConfig[subject] || subjectConfig['General Studies'];

                        return (
                            <motion.button
                                key={subject}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setSelectedSubject(subject)}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm whitespace-nowrap transition-all shadow-sm ${selectedSubject === subject
                                    ? `${config.bg} ${config.color} border ${config.border} shadow-md`
                                    : 'bg-white border border-slate-200/60 text-slate-700 hover:border-slate-300'
                                    }`}
                            >
                                {subject} ({subjectQuizzes.length})
                            </motion.button>
                        );
                    })}
                </div>

                {/* Generate Quiz Section */}
                {documents.length > 0 && (
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Sparkles size={20} className="text-teal-600" />
                            Generate New Quiz
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {documents.slice(0, 6).map((doc) => {
                                const config = subjectConfig[doc.subject] || subjectConfig['General Studies'];

                                return (
                                    <motion.div
                                        key={doc.id}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        whileHover={{ y: -2 }}
                                        className="bg-white border border-slate-200/60 rounded-2xl p-5 hover:border-teal-300/60 hover:shadow-lg hover:shadow-teal-50/50 transition-all"
                                    >
                                        <div className="flex items-start gap-3 mb-4">
                                            <div className={`w-11 h-11 ${config.icon} rounded-xl flex items-center justify-center flex-shrink-0 shadow-md`}>
                                                <BookOpen size={20} className="text-white" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-bold text-slate-800 truncate mb-1.5">
                                                    {doc.title}
                                                </h4>
                                                {doc.subject && (
                                                    <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-lg ${config.bg} ${config.color} border ${config.border}`}>
                                                        {doc.subject}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => {
                                                setSelectedDocument(doc);
                                                setShowGenerateModal(true);
                                            }}
                                            disabled={generatingQuiz === doc.id}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-xl text-sm font-semibold hover:shadow-md hover:shadow-teal-200/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {generatingQuiz === doc.id ? (
                                                <>
                                                    <Loader2 size={16} className="animate-spin" />
                                                    Generating...
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles size={16} />
                                                    Generate Quiz
                                                </>
                                            )}
                                        </motion.button>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Quizzes List */}
                {filteredQuizzes.length > 0 ? (
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 mb-4">Your Quizzes</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredQuizzes.map((quiz) => {
                                const subject = quiz.subject || 'General Studies';
                                const config = subjectConfig[subject] || subjectConfig['General Studies'];

                                return (
                                    <motion.div
                                        key={quiz.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        whileHover={{ y: -2 }}
                                        className="bg-white border border-slate-200/60 rounded-2xl p-5 hover:border-blue-300/60 hover:shadow-lg hover:shadow-blue-50/50 transition-all group"
                                    >
                                        <div className="flex items-start gap-3 mb-4">
                                            <div className={`w-12 h-12 ${config.icon} rounded-xl flex items-center justify-center flex-shrink-0 shadow-md`}>
                                                <Brain size={22} className="text-white" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-base font-bold text-slate-800 truncate mb-2 group-hover:text-teal-700 transition-colors">
                                                    {quiz.title}
                                                </h4>
                                                <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-lg ${config.bg} ${config.color} border ${config.border}`}>
                                                    {subject}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="space-y-2 mb-4 text-xs text-slate-600 font-medium">
                                            <div className="flex items-center gap-2">
                                                <Target size={13} />
                                                {quiz.totalQuestions} Questions
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Clock size={13} />
                                                {quiz.timeLimit ? `${quiz.timeLimit} minutes` : 'No time limit'}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <TrendingUp size={13} />
                                                {quiz.difficulty?.charAt(0).toUpperCase() + quiz.difficulty?.slice(1)} Level
                                            </div>
                                            {quiz.completionCount > 0 && (
                                                <div className="flex items-center gap-2 text-teal-600 font-semibold">
                                                    <Award size={13} />
                                                    Completed {quiz.completionCount}x • Best: {quiz.bestScore}%
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex gap-2">
                                            <motion.button
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => navigate(`/quiz/${quiz.id}`)}
                                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-xl text-sm font-semibold hover:shadow-md hover:shadow-blue-200/50 transition-all"
                                            >
                                                <Play size={14} />
                                                {quiz.completionCount > 0 ? 'Retake' : 'Start Quiz'}
                                            </motion.button>
                                            <motion.button
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => handleDeleteQuiz(quiz.id, quiz.title)}
                                                className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 border border-red-200/60 transition-all"
                                            >
                                                <Trash2 size={16} />
                                            </motion.button>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-white border-2 border-dashed border-slate-300/60 rounded-3xl p-16 text-center"
                    >
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-50 rounded-full flex items-center justify-center mx-auto mb-5 shadow-md border border-slate-200/60"
                        >
                            <Brain size={40} className="text-slate-400" />
                        </motion.div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">No quizzes yet</h3>
                        <p className="text-slate-600 mb-6 font-medium">
                            Generate your first AI quiz from a document!
                        </p>
                    </motion.div>
                )}

                {/* Generate Quiz Modal */}
                <AnimatePresence>
                    {showGenerateModal && selectedDocument && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                            onClick={() => {
                                if (!generatingQuiz) {
                                    setShowGenerateModal(false);
                                    setSelectedDocument(null);
                                }
                            }}
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-200/60"
                            >
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-3 bg-gradient-to-br from-teal-100 to-blue-100 rounded-2xl border border-teal-200/60">
                                        <Sparkles className="w-6 h-6 text-teal-700" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-slate-800">Generate Quiz</h3>
                                </div>

                                <p className="text-slate-600 mb-6 font-medium">
                                    Creating quiz for: <span className="font-bold text-slate-800">{selectedDocument.title}</span>
                                </p>

                                <div className="space-y-3">
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => handleGenerateQuiz(selectedDocument, 'easy', 10)}
                                        disabled={!!generatingQuiz}
                                        className="w-full p-4 bg-gradient-to-br from-green-50 to-green-100/50 border border-green-200/60 rounded-2xl text-left hover:border-green-300 hover:shadow-md hover:shadow-green-100/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <div className="font-bold text-green-800 mb-1">Easy</div>
                                        <div className="text-sm text-green-700 font-medium">10 questions • Beginner level</div>
                                    </motion.button>

                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => handleGenerateQuiz(selectedDocument, 'medium', 15)}
                                        disabled={!!generatingQuiz}
                                        className="w-full p-4 bg-gradient-to-br from-yellow-50 to-yellow-100/50 border border-yellow-200/60 rounded-2xl text-left hover:border-yellow-300 hover:shadow-md hover:shadow-yellow-100/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <div className="font-bold text-yellow-800 mb-1">Medium</div>
                                        <div className="text-sm text-yellow-700 font-medium">15 questions • Intermediate level</div>
                                    </motion.button>

                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => handleGenerateQuiz(selectedDocument, 'hard', 20)}
                                        disabled={!!generatingQuiz}
                                        className="w-full p-4 bg-gradient-to-br from-red-50 to-red-100/50 border border-red-200/60 rounded-2xl text-left hover:border-red-300 hover:shadow-md hover:shadow-red-100/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <div className="font-bold text-red-800 mb-1">Hard</div>
                                        <div className="text-sm text-red-700 font-medium">20 questions • Advanced level</div>
                                    </motion.button>
                                </div>

                                {!generatingQuiz && (
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => {
                                            setShowGenerateModal(false);
                                            setSelectedDocument(null);
                                        }}
                                        className="w-full mt-4 px-6 py-3 bg-slate-100 text-slate-700 rounded-2xl font-semibold hover:bg-slate-200 border border-slate-200/60 transition-all"
                                    >
                                        Cancel
                                    </motion.button>
                                )}

                                {generatingQuiz && (
                                    <div className="mt-4 flex items-center justify-center gap-2 text-slate-600">
                                        <Loader2 size={16} className="animate-spin" />
                                        <span className="text-sm font-medium">AI is working on your quiz...</span>
                                    </div>
                                )}
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default QuizzesSection;
