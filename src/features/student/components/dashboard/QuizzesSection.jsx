// src/components/features/QuizzesSection.jsx - COMPLETE WITH AI ORGANIZATION
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
import { collection, query, where, onSnapshot, orderBy, doc, getDoc } from 'firebase/firestore';
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


    // Subject config
    const subjectConfig = {
        'Mathematics': { color: 'text-gray-700', bg: 'bg-gray-100', border: 'border-gray-300' },
        'Physics': { color: 'text-gray-800', bg: 'bg-gray-50', border: 'border-gray-300' },
        'Chemistry': { color: 'text-gray-700', bg: 'bg-gray-100', border: 'border-gray-300' },
        'Biology': { color: 'text-gray-800', bg: 'bg-gray-50', border: 'border-gray-300' },
        'Computer Science': { color: 'text-gray-900', bg: 'bg-gray-100', border: 'border-gray-400' },
        'History': { color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-300' },
        'Economics': { color: 'text-gray-800', bg: 'bg-gray-100', border: 'border-gray-300' },
        'Literature': { color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-300' },
        'Psychology': { color: 'text-gray-800', bg: 'bg-gray-100', border: 'border-gray-300' },
        'Engineering': { color: 'text-gray-900', bg: 'bg-gray-100', border: 'border-gray-400' },
        'General Studies': { color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' }
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
            const quizzesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate?.() || new Date()
            })).sort((a, b) => b.createdAt - a.createdAt);


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


    // Generate quiz handler - UPDATED WITH PROPER NAVIGATION
    const handleGenerateQuiz = async (document, difficulty, questionCount) => {
        if (!document?.id || !user?.uid) {
            toast.error('Invalid document or user');
            return;
        }

        setGeneratingQuiz(document.id);
        const toastId = toast.loading(`🤖 AI is generating your ${difficulty} quiz...`);


        try {
            console.log('Starting quiz generation for:', document.id, difficulty);

            // Generate quiz questions with Gemini
            const questions = await generateQuizWithGemini(document.id, difficulty, questionCount);

            if (!questions || questions.length === 0) {
                throw new Error('No questions generated. Please try again.');
            }

            console.log(`Generated ${questions.length} questions`);

            // Create quiz in Firestore
            const quizId = await createQuiz(user.uid, document.id, questions, {
                title: `${document.title || 'Quiz'} - ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}`,
                description: `AI-generated ${difficulty} quiz with ${questions.length} questions`,
                subject: document.subject || 'General Studies',
                difficulty: difficulty,
                timeLimit: Math.ceil(questionCount * 1.5), // 1.5 minutes per question
                shuffleQuestions: false,
                shuffleChoices: true,
                showResults: true,
                allowRetake: true,
                showHints: true
            });

            console.log('Quiz created with ID:', quizId);

            // Close modal
            setShowGenerateModal(false);
            setSelectedDocument(null);

            // Show success message
            toast.success('✨ Quiz generated successfully!', { id: toastId });

            // Navigate to quiz page with proper state
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
            <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-gray-200 border-t-gray-700 rounded-full animate-spin" />
                    <p className="text-gray-600 font-semibold">Loading quizzes...</p>
                </div>
            </div>
        );
    }


    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-gray-800 to-gray-700 rounded-xl shadow-lg">
                        <Brain className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-gray-900">AI Quizzes</h2>
                        <p className="text-gray-600 font-semibold">Test your knowledge with AI-generated quizzes</p>
                    </div>
                </div>
            </div>


            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 rounded-2xl p-5 hover:border-gray-300 hover:shadow-lg transition-all">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-gray-100 rounded-lg">
                            <Brain size={20} className="text-gray-700" />
                        </div>
                        <span className="text-sm font-bold text-gray-600">Total Quizzes</span>
                    </div>
                    <p className="text-3xl font-black text-gray-900">{quizzes.length}</p>
                </div>


                <div className="bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 rounded-2xl p-5 hover:border-gray-300 hover:shadow-lg transition-all">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-gray-100 rounded-lg">
                            <BookOpen size={20} className="text-gray-700" />
                        </div>
                        <span className="text-sm font-bold text-gray-600">Subjects</span>
                    </div>
                    <p className="text-3xl font-black text-gray-900">{Object.keys(quizzesBySubject).length}</p>
                </div>


                <div className="bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 rounded-2xl p-5 hover:border-gray-300 hover:shadow-lg transition-all">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-gray-100 rounded-lg">
                            <Target size={20} className="text-gray-700" />
                        </div>
                        <span className="text-sm font-bold text-gray-600">Documents</span>
                    </div>
                    <p className="text-3xl font-black text-gray-900">{documents.length}</p>
                </div>
            </div>


            {/* Search & Filter */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search quizzes..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-gray-400 transition-all font-semibold text-gray-900 placeholder:text-gray-500"
                    />
                </div>
            </div>


            {/* Subject Filter Tabs */}
            <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300">
                <button
                    onClick={() => setSelectedSubject('all')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all shadow-sm ${
                        selectedSubject === 'all'
                            ? 'bg-gradient-to-r from-gray-800 to-gray-700 text-white'
                            : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-gray-400'
                    }`}
                >
                    All ({quizzes.length})
                </button>


                {Object.entries(quizzesBySubject).map(([subject, subjectQuizzes]) => {
                    const config = subjectConfig[subject] || subjectConfig['General Studies'];


                    return (
                        <button
                            key={subject}
                            onClick={() => setSelectedSubject(subject)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all shadow-sm ${
                                selectedSubject === subject
                                    ? `${config.bg} ${config.color} border-2 ${config.border}`
                                    : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-gray-400'
                            }`}
                        >
                            {subject} ({subjectQuizzes.length})
                        </button>
                    );
                })}
            </div>


            {/* Documents with Generate Quiz Button */}
            {documents.length > 0 && (
                <div>
                    <h3 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
                        <Sparkles size={20} className="text-gray-700" />
                        Generate New Quiz
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {documents.slice(0, 6).map((doc) => (
                            <motion.div
                                key={doc.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-white border-2 border-gray-200 rounded-2xl p-5 hover:border-gray-400 hover:shadow-lg transition-all"
                            >
                                <div className="flex items-start gap-3 mb-4">
                                    <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <BookOpen size={18} className="text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-black text-gray-900 truncate mb-1">{doc.title}</h4>
                                        {doc.subject && (
                                            <span className={`inline-block text-xs font-bold px-2 py-1 rounded-lg ${subjectConfig[doc.subject]?.bg} ${subjectConfig[doc.subject]?.color} border ${subjectConfig[doc.subject]?.border}`}>
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
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-gray-800 to-gray-700 text-white rounded-xl text-sm font-bold hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                                </button>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}


            {/* Quizzes List */}
            {filteredQuizzes.length > 0 ? (
                <div>
                    <h3 className="text-xl font-black text-gray-900 mb-4">Your Quizzes</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredQuizzes.map((quiz) => {
                            const subject = quiz.subject || 'General Studies';
                            const config = subjectConfig[subject] || subjectConfig['General Studies'];


                            return (
                                <motion.div
                                    key={quiz.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white border-2 border-gray-200 rounded-2xl p-5 hover:border-gray-400 hover:shadow-lg transition-all group"
                                >
                                    <div className="flex items-start gap-3 mb-4">
                                        <div className="w-12 h-12 bg-gray-900 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <Brain size={22} className="text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-base font-black text-gray-900 truncate mb-2">{quiz.title}</h4>
                                            <span className={`inline-block text-xs font-bold px-2 py-1 rounded-lg ${config.bg} ${config.color} border ${config.border}`}>
                                                {subject}
                                            </span>
                                        </div>
                                    </div>


                                    <div className="space-y-2 mb-4 text-xs text-gray-600 font-semibold">
                                        <div className="flex items-center gap-2">
                                            <Target size={12} />
                                            {quiz.totalQuestions} Questions
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Clock size={12} />
                                            {quiz.timeLimit ? `${quiz.timeLimit} minutes` : 'No time limit'}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <TrendingUp size={12} />
                                            {quiz.difficulty?.charAt(0).toUpperCase() + quiz.difficulty?.slice(1)} Level
                                        </div>
                                    </div>


                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => navigate(`/quiz/${quiz.id}`)}
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-bold hover:scale-105 transition-all"
                                        >
                                            <Play size={14} />
                                            Start Quiz
                                        </button>
                                        <button
                                            onClick={() => handleDeleteQuiz(quiz.id, quiz.title)}
                                            className="p-2 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
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
                    className="bg-gradient-to-br from-gray-50 to-white border-2 border-dashed border-gray-300 rounded-2xl p-16 text-center"
                >
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md border-2 border-gray-200">
                        <Brain size={32} className="text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No quizzes yet</h3>
                    <p className="text-gray-600 mb-6 font-semibold">Generate your first AI quiz from a document!</p>
                </motion.div>
            )}


            {/* Generate Quiz Modal */}
            <AnimatePresence>
                {showGenerateModal && selectedDocument && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
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
                            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border-2 border-gray-200"
                        >
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-3 bg-gray-100 rounded-xl">
                                    <Sparkles className="w-6 h-6 text-gray-700" />
                                </div>
                                <h3 className="text-2xl font-black text-gray-900">Generate Quiz</h3>
                            </div>


                            <p className="text-gray-600 mb-6 font-semibold">
                                Creating quiz for: <span className="font-black text-gray-900">{selectedDocument.title}</span>
                            </p>


                            <div className="space-y-4">
                                <button
                                    onClick={() => handleGenerateQuiz(selectedDocument, 'easy', 10)}
                                    disabled={!!generatingQuiz}
                                    className="w-full p-4 bg-green-100 border-2 border-green-300 rounded-2xl text-left hover:bg-green-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <div className="font-black text-green-900 mb-1">Easy</div>
                                    <div className="text-sm text-green-700 font-semibold">10 questions • Beginner level</div>
                                </button>


                                <button
                                    onClick={() => handleGenerateQuiz(selectedDocument, 'medium', 15)}
                                    disabled={!!generatingQuiz}
                                    className="w-full p-4 bg-yellow-100 border-2 border-yellow-300 rounded-2xl text-left hover:bg-yellow-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <div className="font-black text-yellow-900 mb-1">Medium</div>
                                    <div className="text-sm text-yellow-700 font-semibold">15 questions • Intermediate level</div>
                                </button>


                                <button
                                    onClick={() => handleGenerateQuiz(selectedDocument, 'hard', 20)}
                                    disabled={!!generatingQuiz}
                                    className="w-full p-4 bg-red-100 border-2 border-red-300 rounded-2xl text-left hover:bg-red-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <div className="font-black text-red-900 mb-1">Hard</div>
                                    <div className="text-sm text-red-700 font-semibold">20 questions • Advanced level</div>
                                </button>
                            </div>


                            {!generatingQuiz && (
                                <button
                                    onClick={() => {
                                        setShowGenerateModal(false);
                                        setSelectedDocument(null);
                                    }}
                                    className="w-full mt-4 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all"
                                >
                                    Cancel
                                </button>
                            )}


                            {generatingQuiz && (
                                <div className="mt-4 flex items-center justify-center gap-2 text-gray-600">
                                    <Loader2 size={16} className="animate-spin" />
                                    <span className="text-sm font-semibold">AI is working on your quiz...</span>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};


export default QuizzesSection;
