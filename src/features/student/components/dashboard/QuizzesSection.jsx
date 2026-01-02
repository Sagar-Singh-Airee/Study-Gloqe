// src/components/features/QuizzesSection.jsx - PREMIUM LIGHT COMPACT EDITION 💎

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Brain, Plus, Search, Trash2, Play, Clock, Target, Award,
    Sparkles, ChevronRight, Zap, TrendingUp, BookOpen, Loader2,
    Filter, AlertCircle
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

    // Subject colors - compact
    const subjectColors = {
        'Mathematics': 'bg-blue-50 text-blue-700 border-blue-200',
        'Physics': 'bg-teal-50 text-teal-700 border-teal-200',
        'Chemistry': 'bg-cyan-50 text-cyan-700 border-cyan-200',
        'Biology': 'bg-emerald-50 text-emerald-700 border-emerald-200',
        'Computer Science': 'bg-indigo-50 text-indigo-700 border-indigo-200',
        'History': 'bg-amber-50 text-amber-700 border-amber-200',
        'default': 'bg-slate-50 text-slate-700 border-slate-200'
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
                return {
                    id: doc.id,
                    ...data,
                    completionCount: data.completionCount || 0,
                    averageScore: data.averageScore || 0,
                    bestScore: data.bestScore || 0,
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
            const subject = quiz.subject || 'General';
            if (!grouped[subject]) grouped[subject] = [];
            grouped[subject].push(quiz);
        });
        return grouped;
    }, [quizzes]);

    // Filter quizzes
    const filteredQuizzes = useMemo(() => {
        let filtered = quizzes;

        if (selectedSubject !== 'all') {
            filtered = filtered.filter(quiz =>
                (quiz.subject || 'General') === selectedSubject
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
        const avgScore = quizzes.length > 0
            ? Math.round(quizzes.reduce((sum, quiz) => sum + (quiz.averageScore || 0), 0) / quizzes.length)
            : 0;
        const perfectScores = quizzes.filter(quiz => (quiz.bestScore || 0) === 100).length;

        return { totalCompleted, avgScore, perfectScores };
    }, [quizzes]);

    // Generate quiz handler
    const handleGenerateQuiz = async (document, difficulty, questionCount) => {
        if (!document?.id || !user?.uid) {
            toast.error('Invalid document or user');
            return;
        }

        setGeneratingQuiz(document.id);
        const toastId = toast.loading(`Generating ${difficulty} quiz...`);

        try {
            const questions = await generateQuizWithGemini(document.id, difficulty, questionCount);

            if (!questions || questions.length === 0) {
                throw new Error('No questions generated. Please try again.');
            }

            const quizId = await createQuiz(user.uid, null, document.id, questions, {
                title: `${document.title || 'Quiz'} - ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}`,
                description: `AI-generated ${difficulty} quiz`,
                subject: document.subject || 'General',
                difficulty: difficulty,
                timeLimit: Math.ceil(questionCount * 1.5),
                shuffleQuestions: false,
                shuffleChoices: true,
                showResults: true,
                allowRetake: true,
                completionCount: 0,
                averageScore: 0,
                bestScore: 0
            });

            setShowGenerateModal(false);
            setSelectedDocument(null);
            toast.success('Quiz generated successfully!', { id: toastId });

            setTimeout(() => {
                navigate(`/quiz/${quizId}`, {
                    state: { fromGeneration: true, difficulty, documentTitle: document.title }
                });
            }, 500);

        } catch (error) {
            console.error('Quiz generation error:', error);
            toast.error(error.message || 'Failed to generate quiz', { id: toastId });
        } finally {
            setGeneratingQuiz(null);
        }
    };

    // Delete quiz handler
    const handleDeleteQuiz = async (quizId, quizTitle) => {
        if (!confirm(`Delete "${quizTitle}"?`)) return;

        const toastId = toast.loading('Deleting quiz...');
        try {
            await deleteQuiz(quizId);
            toast.success('Quiz deleted', { id: toastId });
        } catch (error) {
            toast.error('Failed to delete quiz', { id: toastId });
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20 bg-white">
                <div className="text-center">
                    <div className="w-12 h-12 border-2 border-slate-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-600">Loading quizzes...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            {/* Subtle background */}
            <div className="fixed inset-0 -z-10 bg-gradient-to-br from-white via-teal-50/20 to-blue-50/20" />

            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Compact Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-gradient-to-br from-teal-500 to-blue-600 rounded-xl shadow-sm">
                            <Brain className="w-5 h-5 text-white" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900">
                                AI Quizzes
                            </h2>
                            <p className="text-xs text-slate-600 mt-0.5">
                                Test your knowledge with AI-generated quizzes
                            </p>
                        </div>
                    </div>


                </div>

                {/* Search & Filter */}
                <div className="mb-6 space-y-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search quizzes..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl 
                                     focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 
                                     transition-all text-sm text-slate-900 placeholder:text-slate-400"
                        />
                    </div>

                    {/* Subject Pills */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2">
                        <button
                            onClick={() => setSelectedSubject('all')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${selectedSubject === 'all'
                                ? 'bg-gradient-to-r from-teal-500 to-blue-600 text-white shadow-sm'
                                : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                                }`}
                        >
                            All ({quizzes.length})
                        </button>

                        {Object.entries(quizzesBySubject).map(([subject, subjectQuizzes]) => (
                            <button
                                key={subject}
                                onClick={() => setSelectedSubject(subject)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap border ${selectedSubject === subject
                                    ? subjectColors[subject] || subjectColors.default
                                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                    }`}
                            >
                                {subject} ({subjectQuizzes.length})
                            </button>
                        ))}
                    </div>
                </div>

                {/* Generate from Documents */}
                {documents.length > 0 && (
                    <div className="mb-8">
                        <div className="flex items-center gap-2 mb-4">
                            <Sparkles size={16} className="text-teal-600" strokeWidth={2.5} />
                            <h3 className="text-sm font-bold text-slate-900">Generate New Quiz</h3>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            {documents.slice(0, 6).map((doc) => (
                                <motion.div
                                    key={doc.id}
                                    whileHover={{ y: -2 }}
                                    className="bg-white border border-slate-200 rounded-xl p-3 hover:border-teal-300 hover:shadow-sm transition-all"
                                >
                                    <div className="flex items-start gap-2 mb-3">
                                        <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <BookOpen size={16} className="text-white" strokeWidth={2.5} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-xs font-bold text-slate-900 truncate mb-1">
                                                {doc.title}
                                            </h4>
                                            {doc.subject && (
                                                <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md border ${subjectColors[doc.subject] || subjectColors.default
                                                    }`}>
                                                    {doc.subject}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setSelectedDocument(doc);
                                            setShowGenerateModal(true);
                                        }}
                                        disabled={generatingQuiz === doc.id}
                                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-teal-500 to-blue-600 text-white rounded-lg text-xs font-bold hover:shadow-sm transition-all disabled:opacity-50"
                                    >
                                        {generatingQuiz === doc.id ? (
                                            <>
                                                <Loader2 size={12} className="animate-spin" />
                                                Generating...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles size={12} />
                                                Generate Quiz
                                            </>
                                        )}
                                    </button>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Quizzes Grid */}
                {filteredQuizzes.length > 0 ? (
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 mb-4">Your Quizzes</h3>
                        <div className="grid grid-cols-3 gap-4">
                            {filteredQuizzes.map((quiz) => {
                                const subject = quiz.subject || 'General';
                                const subjectStyle = subjectColors[subject] || subjectColors.default;

                                return (
                                    <motion.div
                                        key={quiz.id}
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        whileHover={{ y: -2 }}
                                        className="bg-white border border-slate-200 rounded-xl p-4 hover:border-teal-300 hover:shadow-md transition-all"
                                    >
                                        <div className="flex items-start gap-2.5 mb-3">
                                            <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                                                <Brain size={18} className="text-white" strokeWidth={2.5} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-bold text-slate-900 mb-1.5 line-clamp-2 leading-tight">
                                                    {quiz.title}
                                                </h4>
                                                <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md border ${subjectStyle}`}>
                                                    {subject}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5 mb-3">
                                            <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                                                <Target size={11} />
                                                <span>{quiz.totalQuestions} Questions</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                                                <Clock size={11} />
                                                <span>{quiz.timeLimit ? `${quiz.timeLimit} min` : 'No limit'}</span>
                                            </div>
                                            {quiz.completionCount > 0 && (
                                                <div className="flex items-center gap-1.5 text-[11px] text-teal-600 font-semibold">
                                                    <Award size={11} />
                                                    <span>Best: {quiz.bestScore}%</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => navigate(`/quiz/${quiz.id}`)}
                                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-teal-500 to-blue-600 text-white rounded-lg text-xs font-bold hover:shadow-sm transition-all"
                                            >
                                                <Play size={12} />
                                                {quiz.completionCount > 0 ? 'Retake' : 'Start'}
                                            </button>
                                            <button
                                                onClick={() => handleDeleteQuiz(quiz.id, quiz.title)}
                                                className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 border border-rose-200 transition-all"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 border border-slate-200">
                            <Brain size={32} className="text-slate-400" />
                        </div>
                        <h3 className="text-base font-bold text-slate-900 mb-1">No quizzes yet</h3>
                        <p className="text-xs text-slate-600">
                            Generate your first quiz from a document
                        </p>
                    </div>
                )}

                {/* Generate Modal */}
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
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.95, opacity: 0 }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-slate-200"
                            >
                                <div className="flex items-center gap-2.5 mb-4">
                                    <div className="p-2 bg-gradient-to-br from-teal-500 to-blue-600 rounded-lg">
                                        <Sparkles className="w-5 h-5 text-white" strokeWidth={2.5} />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900">Generate Quiz</h3>
                                </div>

                                <p className="text-xs text-slate-600 mb-4">
                                    For: <span className="font-bold text-slate-900">{selectedDocument.title}</span>
                                </p>

                                <div className="space-y-2.5">
                                    <button
                                        onClick={() => handleGenerateQuiz(selectedDocument, 'easy', 10)}
                                        disabled={!!generatingQuiz}
                                        className="w-full p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-left hover:bg-emerald-100 hover:shadow-sm transition-all disabled:opacity-50"
                                    >
                                        <div className="font-bold text-sm text-emerald-800 mb-0.5">Easy</div>
                                        <div className="text-xs text-emerald-700">10 questions • Beginner level</div>
                                    </button>

                                    <button
                                        onClick={() => handleGenerateQuiz(selectedDocument, 'medium', 15)}
                                        disabled={!!generatingQuiz}
                                        className="w-full p-3 bg-amber-50 border border-amber-200 rounded-xl text-left hover:bg-amber-100 hover:shadow-sm transition-all disabled:opacity-50"
                                    >
                                        <div className="font-bold text-sm text-amber-800 mb-0.5">Medium</div>
                                        <div className="text-xs text-amber-700">15 questions • Intermediate level</div>
                                    </button>

                                    <button
                                        onClick={() => handleGenerateQuiz(selectedDocument, 'hard', 20)}
                                        disabled={!!generatingQuiz}
                                        className="w-full p-3 bg-rose-50 border border-rose-200 rounded-xl text-left hover:bg-rose-100 hover:shadow-sm transition-all disabled:opacity-50"
                                    >
                                        <div className="font-bold text-sm text-rose-800 mb-0.5">Hard</div>
                                        <div className="text-xs text-rose-700">20 questions • Advanced level</div>
                                    </button>
                                </div>

                                {!generatingQuiz && (
                                    <button
                                        onClick={() => {
                                            setShowGenerateModal(false);
                                            setSelectedDocument(null);
                                        }}
                                        className="w-full mt-3 px-4 py-2.5 bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-100 border border-slate-200 transition-all"
                                    >
                                        Cancel
                                    </button>
                                )}

                                {generatingQuiz && (
                                    <div className="mt-3 flex items-center justify-center gap-2 text-slate-600">
                                        <Loader2 size={14} className="animate-spin" />
                                        <span className="text-xs font-medium">Generating quiz...</span>
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
