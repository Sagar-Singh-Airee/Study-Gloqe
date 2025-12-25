// src/features/study/pages/StudySession.jsx
// 🎓 PRODUCTION EDITION v9.0 - ENHANCED & POLISHED
// ✨ Beautiful Loma Button | 🎯 All Features Enhanced | 🚀 Production Ready

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { doc, onSnapshot, collection, query, orderBy } from 'firebase/firestore';
import { db } from '@shared/config/firebase';
import {
    ChevronLeft,
    ChevronRight,
    Home,
    BookOpen,
    Brain,
    Play,
    Pause,
    Clock,
    Target,
    Sparkles,
    Loader2,
    AlertCircle,
    Mic,
    MessageSquare,
    ArrowUp,
    X,
    Activity,
    Zap,
    Check,
    Bot
} from 'lucide-react';
import { useAuth } from '../../auth/contexts/AuthContext';
import ConceptFlowchart from '../components/visual/ConceptFlowchart';
import toast from 'react-hot-toast';
import lomaLogo from '../../../assets/logo/loma.png';

// AI Tools
import AskGloqePill from '../components/tools/AskGloqePill';
import VoiceAssistant from '../components/tools/VoiceAssistant';

// Session services
import {
    startStudySession,
    exitStudySession,
    pauseStudySession,
    resumeStudySession,
    trackSessionActivity
} from '../services/studySessionService';

// ════════════════════════════════════════════════════════════════════════════════
// 🎨 DESIGN SYSTEM
// ════════════════════════════════════════════════════════════════════════════════

const DESIGN = {
    header: 'bg-white/95 backdrop-blur-xl border-b border-gray-200/80 shadow-sm',
    container: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
    card: 'bg-white rounded-3xl border border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300',
    gradient: {
        primary: 'from-emerald-500 via-teal-500 to-cyan-500',
        secondary: 'from-violet-500 via-purple-500 to-fuchsia-500',
        accent: 'from-blue-500 via-indigo-500 to-purple-500'
    }
};

// ════════════════════════════════════════════════════════════════════════════════
// 🎬 STREAMING TOAST COMPONENT
// ════════════════════════════════════════════════════════════════════════════════

const StreamingPageToast = ({ pageNumber, coreConcept, totalPages }) => (
    <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.9 }}
        className="relative overflow-hidden flex items-start gap-4 px-6 py-5 rounded-2xl shadow-2xl backdrop-blur-2xl border-2 bg-white border-emerald-200 min-w-[340px]"
    >
        <motion.div
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: 3, ease: 'easeOut' }}
            className="absolute bottom-0 left-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500"
        />

        <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 flex-shrink-0">
            <Check size={22} className="text-emerald-600" />
        </div>

        <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-gray-900">
                📄 Page {pageNumber} Ready!
            </p>
            <p className="text-sm text-gray-600 mt-1 font-medium truncate">
                {coreConcept}
            </p>
            <p className="text-xs text-emerald-600 mt-2 font-bold">
                {pageNumber}/{totalPages} pages processed
            </p>
        </div>

        <Activity size={22} className="text-emerald-500 animate-pulse flex-shrink-0" />
    </motion.div>
);

// ════════════════════════════════════════════════════════════════════════════════
// 🤖 ENHANCED LOMA AI BUTTON COMPONENT
// ════════════════════════════════════════════════════════════════════════════════

const LomaAIButton = ({ onModeSelect, isActive, currentMode }) => {
    const [showMenu, setShowMenu] = useState(false);

    return (
        <div className="fixed bottom-32 right-8 z-50 flex flex-col items-end gap-4">
            {/* Floating Menu */}
            <AnimatePresence>
                {showMenu && !isActive && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                        className="bg-white rounded-3xl shadow-2xl border-2 border-gray-100 p-2 mb-2"
                    >
                        <button
                            onClick={() => {
                                onModeSelect('voice');
                                setShowMenu(false);
                            }}
                            className="flex items-center gap-4 px-6 py-4 hover:bg-emerald-50 rounded-2xl transition-all group w-full"
                        >
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                <Mic size={20} className="text-white" />
                            </div>
                            <div className="text-left">
                                <p className="text-sm font-bold text-gray-900">Voice Chat</p>
                                <p className="text-xs text-gray-500">Talk to Loma</p>
                            </div>
                        </button>

                        <button
                            onClick={() => {
                                onModeSelect('text');
                                setShowMenu(false);
                            }}
                            className="flex items-center gap-4 px-6 py-4 hover:bg-blue-50 rounded-2xl transition-all group w-full mt-2"
                        >
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                <MessageSquare size={20} className="text-white" />
                            </div>
                            <div className="text-left">
                                <p className="text-sm font-bold text-gray-900">Text Chat</p>
                                <p className="text-xs text-gray-500">Ask questions</p>
                            </div>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Loma Button */}
            <motion.button
                whileHover={{ scale: 1.1, rotate: 3 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                    if (isActive) {
                        onModeSelect(null);
                        toast.success(`${currentMode === 'voice' ? 'Voice' : 'Text'} chat ended`);
                    } else {
                        setShowMenu(!showMenu);
                    }
                }}
                className={`relative w-20 h-20 rounded-full shadow-2xl hover:shadow-3xl transition-all group ${isActive
                        ? 'ring-4 ring-emerald-400 animate-pulse'
                        : 'ring-4 ring-white hover:ring-emerald-200'
                    }`}
                style={{
                    background: 'white',
                    padding: '6px'
                }}
            >
                {/* Active indicator rings */}
                {isActive && (
                    <>
                        <motion.div
                            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="absolute inset-0 bg-emerald-400 rounded-full"
                        />
                        <motion.div
                            animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
                            transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
                            className="absolute inset-0 bg-teal-400 rounded-full"
                        />
                    </>
                )}

                {/* Logo container - Sticker style */}
                <div className="relative w-full h-full rounded-full bg-gradient-to-br from-white to-gray-50 flex items-center justify-center shadow-inner overflow-hidden">
                    <img
                        src={lomaLogo}
                        alt="Loma AI"
                        className="w-[85%] h-[85%] object-contain relative z-10"
                    />

                    {/* Shimmer effect on hover */}
                    <motion.div
                        initial={{ x: '-100%' }}
                        whileHover={{ x: '200%' }}
                        transition={{ duration: 0.6 }}
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                    />
                </div>

                {/* Active status dot */}
                {isActive && (
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-4 border-white shadow-lg flex items-center justify-center">
                        <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 1, repeat: Infinity }}
                            className="w-2 h-2 bg-white rounded-full"
                        />
                    </div>
                )}

                {/* Tooltip */}
                <div className="absolute bottom-full right-0 mb-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-xl shadow-2xl whitespace-nowrap">
                        {isActive ? `End ${currentMode === 'voice' ? 'Voice' : 'Text'} Chat` : 'Ask Loma AI ✨'}
                    </div>
                </div>
            </motion.button>
        </div>
    );
};

// ════════════════════════════════════════════════════════════════════════════════
// 🎯 MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════════

const StudySession = () => {
    const { docId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const prefersReducedMotion = useReducedMotion();

    // Core state
    const [document, setDocument] = useState(null);
    const [visualPages, setVisualPages] = useState([]);
    const [currentPageIndex, setCurrentPageIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Session state
    const [sessionId, setSessionId] = useState(null);
    const [studyTime, setStudyTime] = useState(0);
    const [sessionPaused, setSessionPaused] = useState(false);
    const [newPageAnimation, setNewPageAnimation] = useState(null);

    // Processing state
    const [processingStatus, setProcessingStatus] = useState({
        processedPages: 0,
        totalPages: 0,
        isStreaming: false
    });

    // UI state - ENHANCED
    const [aiMode, setAiMode] = useState(null); // null, 'voice', or 'text'
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [autoScrollToNew, setAutoScrollToNew] = useState(true);

    // Refs
    const sessionIdRef = useRef(null);
    const timerRef = useRef(null);
    const pageContainerRef = useRef(null);
    const prevPageCountRef = useRef(0);

    // Derived state
    const currentPage = visualPages[currentPageIndex] || null;
    const totalPages = visualPages.length;
    const hasNextPage = currentPageIndex < totalPages - 1;
    const hasPrevPage = currentPageIndex > 0;
    const progress = totalPages > 0 ? Math.round(((currentPageIndex + 1) / totalPages) * 100) : 0;

    // ═══════════════════════════════════════════════════════════════════════════════
    // ⏱️ TIMER
    // ═══════════════════════════════════════════════════════════════════════════════

    useEffect(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        if (sessionPaused) return;

        timerRef.current = setInterval(() => {
            setStudyTime(prev => prev + 1);
        }, 1000);

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [sessionPaused]);

    // ═══════════════════════════════════════════════════════════════════════════════
    // 📡 REAL-TIME PAGE STREAMING
    // ═══════════════════════════════════════════════════════════════════════════════

    useEffect(() => {
        if (!docId) return;

        const pagesQuery = query(
            collection(db, 'documents', docId, 'visualPages'),
            orderBy('pageNumber', 'asc')
        );

        const unsubscribe = onSnapshot(
            pagesQuery,
            { includeMetadataChanges: false },
            (snapshot) => {
                const pages = [];
                snapshot.forEach((doc) => {
                    pages.push({ id: doc.id, ...doc.data() });
                });

                const prevCount = prevPageCountRef.current;
                if (pages.length > prevCount && prevCount > 0) {
                    const newPage = pages[pages.length - 1];

                    toast.custom(
                        () => (
                            <StreamingPageToast
                                pageNumber={newPage.pageNumber}
                                coreConcept={newPage.coreConcept || 'New Content'}
                                totalPages={pages.length}
                            />
                        ),
                        { duration: 4000, position: 'top-right', id: `page-${newPage.pageNumber}` }
                    );

                    setNewPageAnimation(newPage.pageNumber);
                    setTimeout(() => setNewPageAnimation(null), 2000);
                }

                prevPageCountRef.current = pages.length;
                setVisualPages(pages);
                setLoading(false);

                setProcessingStatus(prev => ({
                    ...prev,
                    processedPages: pages.length
                }));
            },
            (err) => {
                setError(`Failed to load pages: ${err.message}`);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [docId]);

    // ═══════════════════════════════════════════════════════════════════════════════
    // 📄 DOCUMENT METADATA
    // ═══════════════════════════════════════════════════════════════════════════════

    useEffect(() => {
        if (!docId) {
            setError('No document ID provided');
            setLoading(false);
            return;
        }

        const docRef = doc(db, 'documents', docId);

        const unsubscribe = onSnapshot(
            docRef,
            (snapshot) => {
                if (snapshot.exists()) {
                    const docData = { id: snapshot.id, ...snapshot.data() };

                    setDocument(docData);
                    setProcessingStatus(prev => ({
                        ...prev,
                        totalPages: docData.totalPages || 0,
                        isStreaming: docData.status === 'processing'
                    }));

                    if (docData.status === 'completed' && docData.totalPages > 0) {
                        toast.success(`🎉 All ${docData.totalPages} pages ready!`, {
                            duration: 5000,
                            id: 'doc-complete'
                        });
                    }
                } else {
                    setError('Document not found');
                    setLoading(false);
                }
            },
            (err) => {
                setError(`Failed to load document: ${err.message}`);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [docId]);

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🎯 SESSION INIT
    // ═══════════════════════════════════════════════════════════════════════════════

    useEffect(() => {
        if (!user?.uid || !docId || !document) return;
        if (sessionIdRef.current) return;

        const initSession = async () => {
            try {
                const id = await startStudySession(
                    user.uid,
                    docId,
                    document.title || 'Untitled',
                    document.subject || 'General Studies',
                    {
                        source: 'visual-study-streaming',
                        totalPages: document.totalPages || 0,
                        streamingEnabled: true
                    }
                );

                sessionIdRef.current = id;
                setSessionId(id);
                toast.success('Study session started! 🎯', { duration: 2000 });

            } catch (error) {
                toast.error('Failed to start session');
            }
        };

        initSession();

        return () => {
            const sid = sessionIdRef.current;
            if (sid && user?.uid) {
                exitStudySession(sid, user.uid, docId, document?.title, document?.subject)
                    .catch(err => console.error('Exit error:', err));
            }
        };
    }, [user?.uid, docId, document]);

    // ═══════════════════════════════════════════════════════════════════════════════
    // 📜 SCROLL TRACKING
    // ═══════════════════════════════════════════════════════════════════════════════

    useEffect(() => {
        const container = pageContainerRef.current;
        if (!container) return;

        const handleScroll = () => {
            setShowScrollTop(container.scrollTop > 300);
        };

        container.addEventListener('scroll', handleScroll, { passive: true });
        return () => container.removeEventListener('scroll', handleScroll);
    }, []);

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🎮 HANDLERS
    // ═══════════════════════════════════════════════════════════════════════════════

    const handleNextPage = useCallback(() => {
        if (!hasNextPage) {
            toast('🎉 Last page reached!', { icon: '✅', duration: 2000 });
            return;
        }

        const nextIndex = currentPageIndex + 1;
        setCurrentPageIndex(nextIndex);

        if (sessionIdRef.current) {
            trackSessionActivity('pageview', { page: nextIndex + 1, direction: 'forward' });
        }

        pageContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, [currentPageIndex, hasNextPage]);

    const handlePrevPage = useCallback(() => {
        if (!hasPrevPage) return;

        const prevIndex = currentPageIndex - 1;
        setCurrentPageIndex(prevIndex);

        if (sessionIdRef.current) {
            trackSessionActivity('pageview', { page: prevIndex + 1, direction: 'backward' });
        }

        pageContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, [currentPageIndex, hasPrevPage]);

    const handleJumpToPage = useCallback((index) => {
        if (index < 0 || index >= totalPages) return;
        setCurrentPageIndex(index);
        pageContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, [totalPages]);

    const handleTogglePause = useCallback(async () => {
        if (!sessionIdRef.current) {
            toast.error('No active session');
            return;
        }

        try {
            if (sessionPaused) {
                await resumeStudySession(sessionIdRef.current);
                setSessionPaused(false);
                toast.success('Session resumed ▶️', { duration: 2000 });
            } else {
                await pauseStudySession(sessionIdRef.current);
                setSessionPaused(true);
                toast('Session paused ⏸️', { duration: 2000 });
            }
        } catch (error) {
            toast.error('Failed to toggle pause');
        }
    }, [sessionPaused]);

    const formatTime = useCallback((seconds) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        if (hrs > 0) {
            return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }
        return `${mins}:${String(secs).padStart(2, '0')}`;
    }, []);

    const handleGoHome = useCallback(() => {
        if (sessionIdRef.current && studyTime > 30) {
            const confirmed = window.confirm(
                `Exit study session?\n\nTime studied: ${formatTime(studyTime)}\nPages viewed: ${currentPageIndex + 1}/${totalPages}\n\nProgress will be saved.`
            );
            if (!confirmed) return;
        }
        navigate('/dashboard');
    }, [navigate, studyTime, currentPageIndex, totalPages, formatTime]);

    // ═══════════════════════════════════════════════════════════════════════════════
    // ⌨️ KEYBOARD SHORTCUTS
    // ═══════════════════════════════════════════════════════════════════════════════

    useEffect(() => {
        const handleKeyboard = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            if (e.key === 'ArrowRight' || e.key === 'n') handleNextPage();
            if (e.key === 'ArrowLeft' || e.key === 'p') handlePrevPage();
            if (e.key === ' ' && e.shiftKey) {
                e.preventDefault();
                handleTogglePause();
            }
            if (e.key === 'Escape' && aiMode) {
                setAiMode(null);
            }
            if (e.key === 'Home') handleJumpToPage(0);
            if (e.key === 'End') handleJumpToPage(totalPages - 1);
        };

        window.addEventListener('keydown', handleKeyboard);
        return () => window.removeEventListener('keydown', handleKeyboard);
    }, [
        handleNextPage,
        handlePrevPage,
        handleTogglePause,
        handleJumpToPage,
        aiMode,
        totalPages
    ]);

    // ════════════════════════════════════════════════════════════════════════════
    // 🎨 LOADING STATE
    // ════════════════════════════════════════════════════════════════════════════

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center space-y-8"
                >
                    <div className="relative w-28 h-28 mx-auto">
                        <motion.div
                            className="absolute inset-0 border-4 border-emerald-500 rounded-full border-t-transparent"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        />
                        <Loader2 className="absolute inset-0 m-auto w-12 h-12 text-emerald-600 animate-pulse" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-gray-900 mb-2">Loading Session</h2>
                        <p className="text-base text-gray-600">Preparing your study materials...</p>
                    </div>
                </motion.div>
            </div>
        );
    }

    // ════════════════════════════════════════════════════════════════════════════
    // 🎨 ERROR STATE
    // ════════════════════════════════════════════════════════════════════════════

    if (error || !document) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center max-w-md space-y-8"
                >
                    <div className="w-24 h-24 rounded-full bg-red-50 flex items-center justify-center mx-auto">
                        <AlertCircle size={48} className="text-red-600" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-gray-900 mb-3">
                            {error || 'Document Not Found'}
                        </h2>
                        <p className="text-gray-600 text-lg">
                            Unable to load the study session. Please try again.
                        </p>
                    </div>
                    <button
                        onClick={handleGoHome}
                        className="px-10 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl font-bold text-lg hover:shadow-2xl transition-all transform hover:scale-105"
                    >
                        Back to Dashboard
                    </button>
                </motion.div>
            </div>
        );
    }

    // ════════════════════════════════════════════════════════════════════════════
    // 🎨 WAITING FOR PAGES
    // ════════════════════════════════════════════════════════════════════════════

    if (!visualPages || visualPages.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center max-w-lg space-y-8"
                >
                    {processingStatus.isStreaming ? (
                        <>
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                                className="w-24 h-24 mx-auto"
                            >
                                <Activity size={96} className="text-emerald-600" />
                            </motion.div>
                            <div>
                                <h2 className="text-3xl font-black text-gray-900 mb-4">
                                    🎬 AI Processing
                                </h2>
                                <p className="text-gray-600 text-lg mb-6">
                                    First page arriving soon... Pages appear one-by-one
                                </p>

                                <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden mb-4 shadow-inner">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500"
                                        initial={{ width: 0 }}
                                        animate={{
                                            width: processingStatus.totalPages > 0
                                                ? `${Math.min((processingStatus.processedPages / processingStatus.totalPages) * 100, 100)}%`
                                                : '30%'
                                        }}
                                        transition={{ duration: 0.5 }}
                                    />
                                </div>

                                {processingStatus.totalPages > 0 && (
                                    <p className="text-base text-emerald-600 font-bold">
                                        {processingStatus.processedPages}/{processingStatus.totalPages} pages ready
                                    </p>
                                )}

                                <p className="text-sm text-gray-500 mt-6">
                                    💡 First page loads in 2-3 seconds
                                </p>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mx-auto">
                                <BookOpen size={48} className="text-gray-500" />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black text-gray-900 mb-3">
                                    No Visual Analysis
                                </h2>
                                <p className="text-gray-600 text-lg mb-6">
                                    This document hasn't been processed yet
                                </p>
                            </div>
                            <button
                                onClick={handleGoHome}
                                className="px-10 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl font-bold text-lg hover:shadow-2xl transition-all transform hover:scale-105"
                            >
                                Back to Dashboard
                            </button>
                        </>
                    )}
                </motion.div>
            </div>
        );
    }

    // ════════════════════════════════════════════════════════════════════════════
    // 🎨 MAIN RENDER
    // ════════════════════════════════════════════════════════════════════════════

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50/20">
            {/* HEADER */}
            <div className={`sticky top-0 z-50 ${DESIGN.header}`}>
                <div className={DESIGN.container}>
                    <div className="py-5 flex items-center justify-between gap-6">
                        {/* Left: Nav & Title */}
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                            <button
                                onClick={handleGoHome}
                                className="p-3 hover:bg-gray-100 rounded-2xl transition-all hover:scale-105 active:scale-95 group"
                                title="Back to Dashboard"
                            >
                                <Home size={22} className="text-gray-700 group-hover:text-emerald-600 transition-colors" />
                            </button>

                            <div className="min-w-0 flex-1">
                                <h1 className="text-xl font-black text-gray-900 truncate">
                                    {document.title}
                                </h1>
                                <div className="flex items-center gap-3 text-sm flex-wrap mt-1">
                                    <span className="font-bold text-gray-600">
                                        Page {currentPageIndex + 1}/{totalPages}
                                    </span>
                                    {processingStatus.isStreaming && (
                                        <span className="flex items-center gap-1.5 text-emerald-600 font-semibold animate-pulse">
                                            <Activity size={14} />
                                            Streaming {processingStatus.processedPages}/{processingStatus.totalPages}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right: Controls */}
                        <div className="flex items-center gap-3 flex-shrink-0">
                            {/* Timer */}
                            <div className={`px-5 py-3 rounded-2xl flex items-center gap-2.5 transition-all shadow-lg ${sessionPaused
                                    ? 'bg-gradient-to-r from-orange-50 to-red-50 ring-2 ring-orange-300'
                                    : 'bg-gradient-to-r from-emerald-50 to-teal-50 ring-2 ring-emerald-300'
                                }`}>
                                <Clock size={18} className={sessionPaused ? 'text-orange-600' : 'text-emerald-600'} />
                                <span className="text-lg font-black text-gray-900 tabular-nums min-w-[5rem]">
                                    {formatTime(studyTime)}
                                </span>
                            </div>

                            {/* Pause/Resume */}
                            <button
                                onClick={handleTogglePause}
                                disabled={!sessionId}
                                className={`p-3.5 rounded-2xl transition-all shadow-lg hover:scale-105 active:scale-95 ${sessionPaused
                                        ? 'bg-gradient-to-r from-orange-100 to-red-100 hover:from-orange-200 hover:to-red-200 text-orange-600'
                                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                                title={sessionPaused ? 'Resume' : 'Pause'}
                            >
                                {sessionPaused ? <Play size={20} /> : <Pause size={20} />}
                            </button>

                            {/* Progress */}
                            <div className="px-5 py-3 bg-gradient-to-r from-violet-50 to-purple-50 rounded-2xl flex items-center gap-2.5 shadow-lg ring-2 ring-purple-300">
                                <Target size={18} className="text-purple-600" />
                                <span className="text-lg font-black text-gray-900">{progress}%</span>
                            </div>

                            {/* Auto-scroll */}
                            <button
                                onClick={() => {
                                    setAutoScrollToNew(!autoScrollToNew);
                                    toast(autoScrollToNew ? 'Auto-scroll disabled' : 'Auto-scroll enabled', {
                                        icon: autoScrollToNew ? '🔕' : '🔔',
                                        duration: 1500
                                    });
                                }}
                                className={`p-3.5 rounded-2xl transition-all shadow-lg hover:scale-105 active:scale-95 ${autoScrollToNew
                                        ? 'bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-600 ring-2 ring-emerald-300'
                                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                    }`}
                                title={autoScrollToNew ? 'Auto-scroll ON' : 'Auto-scroll OFF'}
                            >
                                <Zap size={20} className={autoScrollToNew ? 'animate-pulse' : ''} />
                            </button>
                        </div>
                    </div>

                    {/* Progress bar */}
                    <div className="pb-5">
                        <div className="h-2.5 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full overflow-hidden relative shadow-inner">
                            <motion.div
                                className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 shadow-lg"
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.4, ease: 'easeOut' }}
                            />
                            {processingStatus.isStreaming && (
                                <motion.div
                                    className="absolute top-0 h-full w-24 bg-gradient-to-r from-transparent via-white/60 to-transparent"
                                    animate={{ x: ['-100%', '400%'] }}
                                    transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div
                ref={pageContainerRef}
                className="h-[calc(100vh-180px)] overflow-y-auto overscroll-contain"
                style={{ scrollBehavior: 'smooth' }}
            >
                <div className={`${DESIGN.container} py-8 space-y-8 pb-32`}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentPageIndex}
                            initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            {currentPage && (
                                <>
                                    {/* PAGE HEADER CARD */}
                                    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 p-10 text-white shadow-2xl">
                                        {/* New page glow */}
                                        {newPageAnimation === currentPage.pageNumber && (
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: [0, 0.4, 0] }}
                                                transition={{ duration: 1.5 }}
                                                className="absolute inset-0 bg-yellow-300 pointer-events-none"
                                            />
                                        )}

                                        {/* Decorative elements */}
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32" />
                                        <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-400/20 rounded-full blur-3xl -ml-48 -mb-48" />

                                        <div className="flex items-start justify-between gap-8 relative z-10">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-5 mb-6">
                                                    <div className="w-20 h-20 rounded-3xl bg-white/20 backdrop-blur-2xl flex items-center justify-center shadow-2xl">
                                                        <BookOpen size={40} className="drop-shadow-lg" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <span className="text-base opacity-95 font-bold uppercase tracking-wider">
                                                                Page {currentPage.pageNumber}
                                                            </span>
                                                            {newPageAnimation === currentPage.pageNumber && (
                                                                <motion.span
                                                                    initial={{ scale: 0 }}
                                                                    animate={{ scale: [0, 1.2, 1] }}
                                                                    className="px-3 py-1 bg-yellow-400 text-yellow-900 text-sm font-black rounded-full shadow-lg"
                                                                >
                                                                    NEW!
                                                                </motion.span>
                                                            )}
                                                        </div>
                                                        <h2 className="text-4xl sm:text-5xl font-black leading-tight drop-shadow-lg">
                                                            {currentPage.coreConcept}
                                                        </h2>
                                                    </div>
                                                </div>

                                                {/* Key Topics */}
                                                {currentPage.keyTopics?.length > 0 && (
                                                    <div className="flex flex-wrap gap-2.5">
                                                        {currentPage.keyTopics.map((topic, i) => (
                                                            <motion.span
                                                                key={i}
                                                                initial={{ opacity: 0, scale: 0.8 }}
                                                                animate={{ opacity: 1, scale: 1 }}
                                                                transition={{ delay: i * 0.05 }}
                                                                className="px-4 py-2 bg-white/25 backdrop-blur-2xl rounded-full text-base font-bold shadow-xl"
                                                            >
                                                                {topic}
                                                            </motion.span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Metadata */}
                                            <div className="flex flex-col gap-3 flex-shrink-0">
                                                {currentPage.complexity && (
                                                    <div className="px-5 py-2.5 bg-white/25 backdrop-blur-2xl rounded-2xl text-base font-bold capitalize shadow-xl">
                                                        {currentPage.complexity}
                                                    </div>
                                                )}
                                                {currentPage.estimatedTime && (
                                                    <div className="px-5 py-2.5 bg-white/25 backdrop-blur-2xl rounded-2xl text-base font-bold flex items-center gap-2 shadow-xl">
                                                        <Clock size={16} />
                                                        {currentPage.estimatedTime}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* FLOWCHART */}
                                    {currentPage.flowchart && (
                                        <ConceptFlowchart
                                            flowchartCode={currentPage.flowchart}
                                            title="Concept Map"
                                        />
                                    )}

                                    {/* EXPLANATION CARD */}
                                    <div className={`${DESIGN.card} p-10`}>
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-xl">
                                                <Brain size={28} className="text-white" />
                                            </div>
                                            <h3 className="text-2xl font-black text-gray-900">Detailed Explanation</h3>
                                        </div>
                                        <p className="text-gray-700 leading-relaxed text-lg whitespace-pre-wrap">
                                            {currentPage.explanation}
                                        </p>
                                    </div>

                                    {/* LEARNING PATH */}
                                    {currentPage.learningPath?.length > 0 && (
                                        <div className={`${DESIGN.card} p-10`}>
                                            <h3 className="text-2xl font-black text-gray-900 mb-8 flex items-center gap-3">
                                                <Sparkles size={28} className="text-yellow-500" />
                                                Learning Path
                                            </h3>
                                            <div className="space-y-5">
                                                {currentPage.learningPath.map((step, i) => (
                                                    <motion.div
                                                        key={i}
                                                        initial={{ opacity: 0, x: -30 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: i * 0.06 }}
                                                        className="flex gap-5 p-6 bg-gradient-to-r from-gray-50 to-emerald-50/50 rounded-2xl hover:shadow-xl transition-all group border border-gray-100"
                                                    >
                                                        <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white flex items-center justify-center font-black text-xl shadow-xl group-hover:scale-110 transition-transform">
                                                            {step.step}
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex items-center justify-between gap-3 mb-3">
                                                                <h4 className="font-bold text-gray-900 text-xl">{step.title}</h4>
                                                                <span className="text-sm font-bold text-gray-500 flex items-center gap-1.5">
                                                                    <Clock size={16} />
                                                                    {step.duration}
                                                                </span>
                                                            </div>
                                                            <p className="text-gray-600 text-base leading-relaxed">{step.description}</p>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* BOTTOM NAVIGATION */}
            <div className={`fixed bottom-0 left-0 right-0 ${DESIGN.header} border-t shadow-2xl z-40`}>
                <div className={DESIGN.container}>
                    <div className="py-5 flex items-center justify-between gap-6">
                        {/* Previous */}
                        <button
                            onClick={handlePrevPage}
                            disabled={!hasPrevPage}
                            className="flex items-center gap-2.5 px-8 py-4 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-2xl font-bold text-base transition-all hover:scale-105 active:scale-95 shadow-lg"
                        >
                            <ChevronLeft size={22} />
                            <span>Previous</span>
                        </button>

                        {/* Page dots */}
                        <div className="flex items-center gap-2.5 overflow-x-auto max-w-2xl scrollbar-hide px-3">
                            {visualPages.slice(0, 15).map((page, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleJumpToPage(index)}
                                    className={`h-3 rounded-full transition-all relative group ${index === currentPageIndex
                                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 w-12 shadow-lg'
                                            : newPageAnimation === page.pageNumber
                                                ? 'bg-yellow-500 w-5 animate-pulse shadow-md'
                                                : 'bg-gray-300 hover:bg-gray-400 w-3'
                                        }`}
                                    title={page.coreConcept || `Page ${index + 1}`}
                                >
                                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 px-4 py-2 bg-gray-900 text-white text-sm rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-2xl font-medium">
                                        {page.coreConcept || `Page ${index + 1}`}
                                    </span>
                                </button>
                            ))}
                            {visualPages.length > 15 && (
                                <span className="text-sm text-gray-500 ml-3 font-bold">
                                    +{visualPages.length - 15}
                                </span>
                            )}
                        </div>

                        {/* Next */}
                        <button
                            onClick={handleNextPage}
                            disabled={!hasNextPage}
                            className="flex items-center gap-2.5 px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white disabled:opacity-40 disabled:cursor-not-allowed rounded-2xl font-bold text-base transition-all hover:scale-105 active:scale-95 shadow-xl"
                        >
                            <span>Next</span>
                            <ChevronRight size={22} />
                        </button>
                    </div>
                </div>
            </div>

            {/* STREAMING STATUS */}
            <AnimatePresence>
                {processingStatus.isStreaming && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="fixed bottom-28 left-6 px-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl shadow-2xl flex items-center gap-4 z-40 ring-4 ring-emerald-200"
                    >
                        <Activity size={24} className="animate-spin" />
                        <div className="text-base">
                            <p className="font-bold">Processing Pages</p>
                            <p className="text-sm opacity-95">
                                {processingStatus.processedPages}/{processingStatus.totalPages} ready
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* SCROLL TO TOP */}
            <AnimatePresence>
                {showScrollTop && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        onClick={() => pageContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
                        className="fixed bottom-28 right-6 w-16 h-16 rounded-full bg-gray-900 text-white shadow-2xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center z-40 ring-4 ring-gray-300"
                        title="Scroll to top"
                    >
                        <ArrowUp size={28} />
                    </motion.button>
                )}
            </AnimatePresence>

            {/* LOMA AI BUTTON - ENHANCED */}
            <LomaAIButton
                onModeSelect={setAiMode}
                isActive={aiMode !== null}
                currentMode={aiMode}
            />

            {/* VOICE ASSISTANT */}
            <AnimatePresence>
                {aiMode === 'voice' && (
                    <VoiceAssistant
                        onClose={() => setAiMode(null)}
                        documentContext={
                            currentPage?.explanation ||
                            document?.extractedText?.substring(0, 2000) ||
                            `Document: ${document?.title || 'Study Session'}`
                        }
                    />
                )}
            </AnimatePresence>

            {/* TEXT CHAT */}
            <AnimatePresence>
                {aiMode === 'text' && (
                    <AskGloqePill
                        selectedText={currentPage?.coreConcept || currentPage?.keyTopics?.join(', ') || ''}
                        onClose={() => setAiMode(null)}
                        documentId={docId}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default StudySession;
