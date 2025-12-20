// src/features/study/pages/StudySession.jsx - COMPLETE REPLACEMENT
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft, ChevronRight, Home, BookOpen, Brain,
    Save, Download, Share2, Clock, Target
} from 'lucide-react';
import { useAuth } from '../../auth/contexts/AuthContext';
import { getDocument, updateStudyTime } from '../services/documentService';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../shared/config/firebase';
import ConceptFlowchart from '../components/visual/ConceptFlowchart';
import QuestionBank from '../components/visual/QuestionBank';
import { saveFlashcardsFromVisual, saveQuizFromVisual } from '../services/visualAnalysisService';
import { trackAction } from '../../gamification/services/achievementTracker';
import toast from 'react-hot-toast';

const StudySession = () => {
    const { docId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    // State
    const [document, setDocument] = useState(null);
    const [visualPages, setVisualPages] = useState([]);
    const [currentPageIndex, setCurrentPageIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [sessionStartTime] = useState(Date.now());
    const [studyTime, setStudyTime] = useState(0);

    // Ref to track if session was saved
    const sessionSavedRef = useRef(false);
    const studyTimeRef = useRef(0);

    // Current page data
    const currentPage = visualPages[currentPageIndex];

    // Load document
    useEffect(() => {
        loadDocument();
    }, [docId]);

    // Study timer
    useEffect(() => {
        const timer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
            setStudyTime(elapsed);
            studyTimeRef.current = elapsed;
        }, 1000);

        return () => clearInterval(timer);
    }, [sessionStartTime]);

    // Save session on unmount or navigation
    useEffect(() => {
        const saveSession = async () => {
            if (sessionSavedRef.current || studyTimeRef.current < 10 || !user?.uid || !docId) {
                return;
            }

            sessionSavedRef.current = true;

            try {
                // Update document study time
                await updateStudyTime(docId, studyTimeRef.current, user.uid);

                // Create study session record for analytics
                await addDoc(collection(db, 'studySessions'), {
                    userId: user.uid,
                    documentId: docId,
                    documentTitle: document?.title || 'Unknown',
                    subject: document?.subject || 'General',
                    startTime: serverTimestamp(),
                    endTime: serverTimestamp(),
                    totalTime: studyTimeRef.current,
                    pagesViewed: currentPageIndex + 1,
                    totalPages: visualPages.length,
                    createdAt: serverTimestamp()
                });

                // Track achievement
                await trackAction(user.uid, 'STUDY_TIME', { seconds: studyTimeRef.current });

                console.log(`✅ Study session saved: ${studyTimeRef.current} seconds`);
            } catch (error) {
                console.error('❌ Error saving study session:', error);
            }
        };

        // Save on page unload
        const handleUnload = () => saveSession();
        window.addEventListener('beforeunload', handleUnload);

        return () => {
            window.removeEventListener('beforeunload', handleUnload);
            saveSession();
        };
    }, [user?.uid, docId, document, currentPageIndex, visualPages.length]);

    const loadDocument = async () => {
        try {
            setLoading(true);
            const doc = await getDocument(docId);
            setDocument(doc);

            // Load visual pages from Firestore
            if (doc.visualPages && doc.visualPages.length > 0) {
                setVisualPages(doc.visualPages);
            } else {
                toast.error('No visual analysis available for this document');
            }

        } catch (error) {
            console.error('Error loading document:', error);
            toast.error('Failed to load document');
        } finally {
            setLoading(false);
        }
    };

    const handleNextPage = () => {
        if (currentPageIndex < visualPages.length - 1) {
            setCurrentPageIndex(prev => prev + 1);
        }
    };

    const handlePrevPage = () => {
        if (currentPageIndex > 0) {
            setCurrentPageIndex(prev => prev - 1);
        }
    };

    const handleSaveFlashcards = async () => {
        try {
            if (!currentPage?.flashcards || currentPage.flashcards.length === 0) {
                toast.error('No flashcards available for this page');
                return;
            }

            await saveFlashcardsFromVisual(
                user.uid,
                docId,
                currentPage.flashcards,
                document.subject,
                currentPage.coreConcept
            );

            toast.success(`Saved ${currentPage.flashcards.length} flashcards!`);
        } catch (error) {
            console.error('Error saving flashcards:', error);
            toast.error('Failed to save flashcards');
        }
    };

    const handleSaveQuiz = async (questions) => {
        try {
            if (!questions || questions.length === 0) {
                toast.error('No questions available');
                return;
            }

            await saveQuizFromVisual(
                user.uid,
                docId,
                questions,
                document.subject,
                currentPage.coreConcept
            );

            toast.success(`Saved ${questions.length} questions to quiz bank!`);
        } catch (error) {
            console.error('Error saving quiz:', error);
            toast.error('Failed to save quiz');
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-600 font-semibold">Loading study session...</p>
                </div>
            </div>
        );
    }

    if (!document || visualPages.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <BookOpen size={64} className="mx-auto text-slate-300 mb-4" />
                    <h2 className="text-2xl font-black text-slate-900 mb-2">No Visual Analysis</h2>
                    <p className="text-slate-600 mb-6">
                        This document hasn't been processed for visual learning yet.
                    </p>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="px-6 py-3 bg-teal-500 text-white rounded-xl font-semibold hover:bg-teal-600 transition-colors"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            {/* Top Navigation Bar */}
            <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        {/* Left: Back & Title */}
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                            >
                                <Home size={20} />
                            </button>
                            <div>
                                <h1 className="text-lg font-bold text-slate-900">{document.title}</h1>
                                <p className="text-xs text-slate-500">
                                    Page {currentPageIndex + 1} of {visualPages.length}
                                </p>
                            </div>
                        </div>

                        {/* Center: Progress */}
                        <div className="hidden md:flex items-center gap-4">
                            <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-xl">
                                <Clock size={16} className="text-teal-600" />
                                <span className="text-sm font-semibold text-slate-700">
                                    {formatTime(studyTime)}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-xl">
                                <Target size={16} className="text-purple-600" />
                                <span className="text-sm font-semibold text-slate-700">
                                    {Math.round(((currentPageIndex + 1) / visualPages.length) * 100)}% Complete
                                </span>
                            </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleSaveFlashcards}
                                className="p-2 hover:bg-teal-50 rounded-xl transition-colors group"
                                title="Save as Flashcards"
                            >
                                <Save size={20} className="text-slate-600 group-hover:text-teal-600" />
                            </button>
                            <button
                                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                                title="Download"
                            >
                                <Download size={20} className="text-slate-600" />
                            </button>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-gradient-to-r from-teal-500 to-purple-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${((currentPageIndex + 1) / visualPages.length) * 100}%` }}
                            transition={{ duration: 0.3 }}
                        />
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 py-8">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentPageIndex}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-6"
                    >
                        {/* Page Header Card */}
                        <motion.div
                            className="bg-gradient-to-br from-teal-500 via-teal-600 to-slate-900 rounded-3xl p-8 text-white shadow-xl"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                            <BookOpen size={24} />
                                        </div>
                                        <div>
                                            <p className="text-sm opacity-80 font-medium">Page {currentPage.pageNumber}</p>
                                            <h2 className="text-3xl font-black">{currentPage.coreConcept}</h2>
                                        </div>
                                    </div>

                                    {/* Key Topics */}
                                    <div className="flex flex-wrap gap-2">
                                        {currentPage.keyTopics?.map((topic, i) => (
                                            <span
                                                key={i}
                                                className="px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-sm font-semibold"
                                            >
                                                {topic}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Metadata */}
                                <div className="flex flex-col gap-2 items-end">
                                    <div className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl text-sm font-semibold">
                                        {currentPage.complexity}
                                    </div>
                                    <div className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl text-sm font-semibold flex items-center gap-2">
                                        <Clock size={16} />
                                        {currentPage.estimatedTime} min
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Flowchart */}
                        {currentPage.flowchart && (
                            <ConceptFlowchart
                                flowchartCode={currentPage.flowchart}
                                title="Concept Map"
                            />
                        )}

                        {/* Explanation */}
                        <motion.div className="bg-white rounded-3xl p-6 shadow-lg border border-slate-200">
                            <div className="flex items-center gap-2 mb-4">
                                <Brain size={20} className="text-teal-600" />
                                <h3 className="text-lg font-bold text-slate-900">Detailed Explanation</h3>
                            </div>
                            <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                                {currentPage.explanation}
                            </p>
                        </motion.div>

                        {/* Learning Path */}
                        {currentPage.learningPath && currentPage.learningPath.length > 0 && (
                            <motion.div className="bg-white rounded-3xl p-6 shadow-lg border border-slate-200">
                                <h3 className="text-lg font-bold text-slate-900 mb-4">Learning Path</h3>
                                <div className="space-y-4">
                                    {currentPage.learningPath.map((step, i) => (
                                        <div
                                            key={i}
                                            className="flex gap-4 p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors"
                                        >
                                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-purple-500 text-white flex items-center justify-center font-bold">
                                                {step.step}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-1">
                                                    <h4 className="font-semibold text-slate-900">{step.title}</h4>
                                                    <span className="text-xs font-semibold text-slate-500">{step.duration}</span>
                                                </div>
                                                <p className="text-sm text-slate-600">{step.description}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* Question Bank */}
                        {currentPage.questionBank && currentPage.questionBank.length > 0 && (
                            <QuestionBank
                                questions={currentPage.questionBank}
                                onSaveToQuiz={handleSaveQuiz}
                            />
                        )}

                        {/* Flashcards Preview */}
                        {currentPage.flashcards && currentPage.flashcards.length > 0 && (
                            <motion.div className="bg-white rounded-3xl p-6 shadow-lg border border-slate-200">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold text-slate-900">
                                        Flashcards ({currentPage.flashcards.length})
                                    </h3>
                                    <button
                                        onClick={handleSaveFlashcards}
                                        className="px-4 py-2 bg-teal-500 text-white rounded-xl text-sm font-semibold hover:bg-teal-600 transition-colors"
                                    >
                                        Save All
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {currentPage.flashcards.slice(0, 4).map((card, i) => (
                                        <div key={i} className="p-4 bg-slate-50 rounded-2xl">
                                            <p className="text-sm font-semibold text-slate-900 mb-2">{card.front}</p>
                                            <p className="text-xs text-slate-600">{card.back}</p>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Bottom Navigation */}
            <div className="sticky bottom-0 bg-white/80 backdrop-blur-xl border-t border-slate-200">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={handlePrevPage}
                            disabled={currentPageIndex === 0}
                            className="flex items-center gap-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-semibold transition-colors"
                        >
                            <ChevronLeft size={20} />
                            Previous
                        </button>

                        <div className="flex items-center gap-2">
                            {visualPages.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => setCurrentPageIndex(index)}
                                    className={`w-2 h-2 rounded-full transition-all ${index === currentPageIndex
                                        ? 'bg-teal-500 w-8'
                                        : 'bg-slate-300 hover:bg-slate-400'
                                        }`}
                                />
                            ))}
                        </div>

                        <button
                            onClick={handleNextPage}
                            disabled={currentPageIndex === visualPages.length - 1}
                            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-purple-500 hover:from-teal-600 hover:to-purple-600 text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-semibold transition-all"
                        >
                            Next
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudySession;
