// src/features/study/pages/StudySession.jsx
// 🎓 MINIMALIST PREMIUM EDITION v10.0
// ✨ Clean Design | 📚 Study-Optimized | 🚀 Production Ready

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
    Activity,
    Zap,
    Check,
    TrendingUp,
    Link,
    CheckCircle,
    X
} from 'lucide-react';
import { useAuth } from '../../auth/contexts/AuthContext';
import ConceptFlowchart from '../components/visual/ConceptFlowchart';
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
    card: 'bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300',
};



// ════════════════════════════════════════════════════════════════════════════════
// 🤖 LOMA AI BUTTON
// ════════════════════════════════════════════════════════════════════════════════

const LomaAIButton = ({ onModeSelect, isActive, currentMode }) => {
    const [showMenu, setShowMenu] = useState(false);

    return (
        <div className="fixed bottom-24 right-4 md:bottom-32 md:right-8 z-50 flex flex-col items-end gap-4">
            {/* Floating Menu */}
            <AnimatePresence>
                {showMenu && !isActive && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                        className="bg-white rounded-2xl shadow-2xl border-2 border-gray-100 p-2 mb-2"
                    >
                        <button
                            onClick={() => {
                                onModeSelect('voice');
                                setShowMenu(false);
                            }}
                            className="flex items-center gap-3 px-5 py-3 hover:bg-emerald-50 rounded-xl transition-all group w-full"
                        >
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                <Mic size={18} className="text-white" />
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
                            className="flex items-center gap-3 px-5 py-3 hover:bg-blue-50 rounded-xl transition-all group w-full mt-2"
                        >
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                <MessageSquare size={18} className="text-white" />
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
                    } else {
                        setShowMenu(!showMenu);
                    }
                }}
                className={`relative w-20 h-20 rounded-full shadow-2xl hover:shadow-3xl transition-all group ${isActive
                    ? 'ring-4 ring-emerald-400 animate-pulse'
                    : 'ring-4 ring-white hover:ring-emerald-200'
                    }`}
                style={{ background: 'white', padding: '6px' }}
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

                {/* Logo container */}
                <div className="relative w-full h-full rounded-full bg-gradient-to-br from-white to-gray-50 flex items-center justify-center shadow-inner overflow-hidden">
                    <img
                        src={lomaLogo}
                        alt="Loma AI"
                        className="w-[85%] h-[85%] object-contain relative z-10"
                    />

                    {/* Shimmer effect */}
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
                    <div className="px-3 py-2 bg-gray-900 text-white text-xs font-semibold rounded-lg shadow-2xl whitespace-nowrap">
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

    // UI state
    const [aiMode, setAiMode] = useState(null);
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

            } catch (error) {
                // Silently fails for production
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
            return;
        }

        try {
            if (sessionPaused) {
                await resumeStudySession(sessionIdRef.current);
                setSessionPaused(false);
            } else {
                await pauseStudySession(sessionIdRef.current);
                setSessionPaused(true);
            }
        } catch (error) {
            // Error logged in console if needed
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
                    className="text-center space-y-6"
                >
                    <div className="relative w-20 h-20 mx-auto">
                        <motion.div
                            className="absolute inset-0 border-4 border-emerald-500 rounded-full border-t-transparent"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        />
                        <Loader2 className="absolute inset-0 m-auto w-10 h-10 text-emerald-600 animate-pulse" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading Session</h2>
                        <p className="text-sm text-gray-600">Preparing your study materials...</p>
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
                    className="text-center max-w-md space-y-6"
                >
                    <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto">
                        <AlertCircle size={40} className="text-red-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                            {error || 'Document Not Found'}
                        </h2>
                        <p className="text-gray-600 text-sm">
                            Unable to load the study session. Please try again.
                        </p>
                    </div>
                    <button
                        onClick={handleGoHome}
                        className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold text-sm hover:shadow-xl transition-all transform hover:scale-105"
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
                    className="text-center max-w-lg space-y-6"
                >
                    {processingStatus.isStreaming ? (
                        <>
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                                className="w-20 h-20 mx-auto"
                            >
                                <Activity size={80} className="text-emerald-600" />
                            </motion.div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                                    🎬 AI Processing
                                </h2>
                                <p className="text-gray-600 text-sm mb-4">
                                    First page arriving soon... Pages appear one-by-one
                                </p>

                                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden mb-3 shadow-inner">
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
                                    <p className="text-sm text-emerald-600 font-semibold">
                                        {processingStatus.processedPages}/{processingStatus.totalPages} pages ready
                                    </p>
                                )}

                                <p className="text-xs text-gray-500 mt-4">
                                    💡 First page loads in 2-3 seconds
                                </p>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto">
                                <BookOpen size={40} className="text-gray-500" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                    No Visual Analysis
                                </h2>
                                <p className="text-gray-600 text-sm mb-4">
                                    This document hasn't been processed yet
                                </p>
                            </div>
                            <button
                                onClick={handleGoHome}
                                className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold text-sm hover:shadow-xl transition-all transform hover:scale-105"
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
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
            {/* HEADER */}
            <div className={`sticky top-0 z-50 ${DESIGN.header}`}>
                <div className={DESIGN.container}>
                    <div className="py-3 md:py-4 flex flex-col md:flex-row gap-4 md:items-center justify-between">
                        {/* Left: Nav & Title */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <button
                                onClick={handleGoHome}
                                className="p-2.5 hover:bg-gray-100 rounded-xl transition-all hover:scale-105 active:scale-95 group"
                                title="Back to Dashboard"
                            >
                                <Home size={20} className="text-gray-700 group-hover:text-emerald-600 transition-colors" />
                            </button>

                            <div className="min-w-0 flex-1">
                                <h1 className="text-lg font-bold text-gray-900 truncate">
                                    {document.title}
                                </h1>
                                <div className="flex items-center gap-2 text-xs flex-wrap mt-0.5">
                                    <span className="font-semibold text-gray-600">
                                        Page {currentPageIndex + 1}/{totalPages}
                                    </span>
                                    {processingStatus.isStreaming && (
                                        <span className="flex items-center gap-1 text-emerald-600 font-semibold animate-pulse">
                                            <Activity size={12} />
                                            Streaming {processingStatus.processedPages}/{processingStatus.totalPages}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right: Controls */}
                        <div className="flex items-center justify-between gap-2.5 flex-shrink-0 w-full md:w-auto">
                            {/* Timer */}
                            <div className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-sm ${sessionPaused
                                ? 'bg-gradient-to-r from-orange-50 to-red-50 ring-2 ring-orange-200'
                                : 'bg-gradient-to-r from-emerald-50 to-teal-50 ring-2 ring-emerald-200'
                                }`}>
                                <Clock size={16} className={sessionPaused ? 'text-orange-600' : 'text-emerald-600'} />
                                <span className="text-base font-bold text-gray-900 tabular-nums min-w-[4rem]">
                                    {formatTime(studyTime)}
                                </span>
                            </div>

                            {/* Pause/Resume */}
                            <button
                                onClick={handleTogglePause}
                                disabled={!sessionId}
                                className={`p-2.5 rounded-xl transition-all shadow-sm hover:scale-105 active:scale-95 ${sessionPaused
                                    ? 'bg-gradient-to-r from-orange-100 to-red-100 hover:from-orange-200 hover:to-red-200 text-orange-600'
                                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                                title={sessionPaused ? 'Resume' : 'Pause'}
                            >
                                {sessionPaused ? <Play size={18} /> : <Pause size={18} />}
                            </button>

                            {/* Progress */}
                            <div className="px-4 py-2 bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl flex items-center gap-2 shadow-sm ring-2 ring-purple-200">
                                <Target size={16} className="text-purple-600" />
                                <span className="text-base font-bold text-gray-900">{progress}%</span>
                            </div>

                            {/* Auto-scroll */}
                            <button
                                onClick={() => {
                                    setAutoScrollToNew(!autoScrollToNew);
                                }}
                                className={`p-2.5 rounded-xl transition-all shadow-sm hover:scale-105 active:scale-95 ${autoScrollToNew
                                    ? 'bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-600 ring-2 ring-emerald-200'
                                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                    }`}
                                title={autoScrollToNew ? 'Auto-scroll ON' : 'Auto-scroll OFF'}
                            >
                                <Zap size={18} className={autoScrollToNew ? 'animate-pulse' : ''} />
                            </button>
                        </div>
                    </div>

                    {/* Progress bar */}
                    <div className="pb-4">
                        <div className="h-2 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full overflow-hidden relative shadow-inner">
                            <motion.div
                                className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 shadow-sm"
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
                className="h-[calc(100vh-160px)] overflow-y-auto overscroll-contain"
                style={{ scrollBehavior: 'smooth' }}
            >
                <div className={`${DESIGN.container} py-6 space-y-6 pb-32`}>
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
                                    {/* PAGE HEADER - Minimalist */}
                                    <div className={DESIGN.card + ' p-6'}>
                                        <div className="flex items-start justify-between gap-6">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                                        Page {currentPage.pageNumber}
                                                    </span>
                                                    {newPageAnimation === currentPage.pageNumber && (
                                                        <motion.span
                                                            initial={{ scale: 0 }}
                                                            animate={{ scale: 1 }}
                                                            className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded"
                                                        >
                                                            NEW
                                                        </motion.span>
                                                    )}
                                                </div>
                                                <h2 className="text-2xl font-bold text-gray-900 mb-4 leading-tight">
                                                    {currentPage.coreConcept}
                                                </h2>

                                                {/* Key Topics */}
                                                {currentPage.keyTopics?.length > 0 && (
                                                    <div className="flex flex-wrap gap-2">
                                                        {currentPage.keyTopics.map((topic, i) => (
                                                            <span
                                                                key={i}
                                                                className="px-3 py-1 bg-gray-50 text-gray-700 text-sm font-medium rounded-md border border-gray-200"
                                                            >
                                                                {topic}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Metadata */}
                                            <div className="flex flex-col gap-2 flex-shrink-0">
                                                {currentPage.complexity && (
                                                    <div className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-md capitalize">
                                                        {currentPage.complexity}
                                                    </div>
                                                )}
                                                {currentPage.estimatedTime && (
                                                    <div className="px-3 py-1.5 bg-purple-50 text-purple-700 text-xs font-semibold rounded-md flex items-center gap-1.5">
                                                        <Clock size={12} />
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

                                    {/* EXPLANATION */}
                                    <div className={DESIGN.card + ' p-6'}>
                                        <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-gray-100">
                                            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                                                <Brain size={16} className="text-emerald-600" />
                                            </div>
                                            <h3 className="text-base font-semibold text-gray-900">Explanation</h3>
                                        </div>
                                        <div className="prose prose-sm max-w-none">
                                            <p className="text-gray-700 leading-relaxed text-sm whitespace-pre-wrap">
                                                {currentPage.explanation}
                                            </p>
                                        </div>
                                    </div>

                                    {/* LEARNING PATH */}
                                    {currentPage.learningPath?.length > 0 && (
                                        <div className={DESIGN.card + ' p-6'}>
                                            <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-gray-100">
                                                <div className="w-8 h-8 rounded-lg bg-yellow-50 flex items-center justify-center flex-shrink-0">
                                                    <Sparkles size={16} className="text-yellow-600" />
                                                </div>
                                                <h3 className="text-base font-semibold text-gray-900">Learning Path</h3>
                                            </div>
                                            <div className="space-y-3">
                                                {currentPage.learningPath.map((step, i) => (
                                                    <motion.div
                                                        key={i}
                                                        initial={{ opacity: 0, x: -20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: i * 0.05 }}
                                                        className="flex gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-100"
                                                    >
                                                        <div className="flex-shrink-0 w-8 h-8 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center font-semibold text-sm">
                                                            {step.step}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-start justify-between gap-3 mb-1.5">
                                                                <h4 className="font-semibold text-gray-900 text-sm">{step.title}</h4>
                                                                <span className="text-xs font-medium text-gray-500 flex items-center gap-1 flex-shrink-0">
                                                                    <Clock size={12} />
                                                                    {step.duration}
                                                                </span>
                                                            </div>
                                                            <p className="text-gray-600 text-sm leading-relaxed">{step.description}</p>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* KEY CONCEPTS */}
                                    {currentPage.keyConcepts?.length > 0 && (
                                        <div className={DESIGN.card + ' p-6'}>
                                            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-gray-100">
                                                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                                                    <Target size={16} className="text-indigo-600" />
                                                </div>
                                                <h3 className="text-base font-semibold text-gray-900">Key Concepts</h3>
                                            </div>
                                            <div className="space-y-2.5">
                                                {currentPage.keyConcepts.map((concept, i) => (
                                                    <div key={i} className="flex gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                                                        <div className="flex-shrink-0 w-5 h-5 rounded bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-semibold mt-0.5">
                                                            {i + 1}
                                                        </div>
                                                        <p className="text-gray-700 text-sm leading-relaxed">{concept}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* REAL-WORLD APPLICATIONS */}
                                    {currentPage.applications?.length > 0 && (
                                        <div className={DESIGN.card + ' p-6'}>
                                            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-gray-100">
                                                <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                                                    <TrendingUp size={16} className="text-orange-600" />
                                                </div>
                                                <h3 className="text-base font-semibold text-gray-900">Real-World Applications</h3>
                                            </div>
                                            <div className="grid gap-3">
                                                {currentPage.applications.map((app, i) => (
                                                    <div key={i} className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-100">
                                                        <h4 className="font-semibold text-gray-900 text-sm mb-1.5">{app.title}</h4>
                                                        <p className="text-gray-600 text-sm leading-relaxed">{app.description}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* PRACTICE QUESTIONS */}
                                    {currentPage.questions?.length > 0 && (
                                        <div className={DESIGN.card + ' p-6'}>
                                            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-gray-100">
                                                <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
                                                    <CheckCircle size={16} className="text-violet-600" />
                                                </div>
                                                <h3 className="text-base font-semibold text-gray-900">Practice Questions</h3>
                                            </div>
                                            <div className="space-y-4">
                                                {currentPage.questions.map((q, i) => (
                                                    <div key={i} className="p-4 bg-violet-50/50 rounded-lg border border-violet-100">
                                                        <p className="font-medium text-gray-900 text-sm mb-2">{q.question}</p>
                                                        <p className="text-gray-600 text-sm italic">Answer: {q.answer}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* RELATED TOPICS */}
                                    {currentPage.relatedTopics?.length > 0 && (
                                        <div className={DESIGN.card + ' p-6'}>
                                            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-gray-100">
                                                <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0">
                                                    <Link size={16} className="text-teal-600" />
                                                </div>
                                                <h3 className="text-base font-semibold text-gray-900">Related Topics</h3>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {currentPage.relatedTopics.map((topic, i) => (
                                                    <span
                                                        key={i}
                                                        className="px-3 py-1.5 bg-teal-50 text-teal-700 text-sm font-medium rounded-md hover:bg-teal-100 transition-colors cursor-pointer"
                                                    >
                                                        {topic}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* SUMMARY */}
                                    {currentPage.summary && (
                                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6 shadow-sm">
                                            <div className="flex items-center gap-2.5 mb-3">
                                                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                                                    <Check size={16} className="text-blue-600" />
                                                </div>
                                                <h3 className="text-base font-semibold text-gray-900">Summary</h3>
                                            </div>
                                            <p className="text-gray-700 text-sm leading-relaxed">{currentPage.summary}</p>
                                        </div>
                                    )}
                                </>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* BOTTOM NAVIGATION */}
            <div className={`fixed bottom-0 left-0 right-0 ${DESIGN.header} border-t shadow-xl z-40`}>
                <div className={DESIGN.container}>
                    <div className="py-3 md:py-4 flex items-center justify-between gap-2 md:gap-6">
                        {/* Previous */}
                        <button
                            onClick={handlePrevPage}
                            disabled={!hasPrevPage}
                            className="flex items-center gap-2 px-3 md:px-6 py-2 md:py-2.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-semibold text-sm transition-all hover:scale-105 active:scale-95 shadow-sm"
                        >
                            <ChevronLeft size={18} />
                            <span className="hidden sm:inline">Previous</span>
                        </button>

                        {/* Page dots */}
                        <div className="flex items-center gap-2 overflow-x-auto max-w-2xl scrollbar-hide px-3">
                            {visualPages.slice(0, 15).map((page, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleJumpToPage(index)}
                                    className={`h-2.5 rounded-full transition-all relative group ${index === currentPageIndex
                                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 w-10 shadow-md'
                                        : newPageAnimation === page.pageNumber
                                            ? 'bg-yellow-500 w-4 animate-pulse shadow-sm'
                                            : 'bg-gray-300 hover:bg-gray-400 w-2.5'
                                        }`}
                                    title={page.coreConcept || `Page ${index + 1}`}
                                >
                                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl font-medium">
                                        {page.coreConcept || `Page ${index + 1}`}
                                    </span>
                                </button>
                            ))}
                            {visualPages.length > 15 && (
                                <span className="text-xs text-gray-500 ml-2 font-semibold">
                                    +{visualPages.length - 15}
                                </span>
                            )}
                        </div>

                        {/* Next */}
                        <button
                            onClick={handleNextPage}
                            disabled={!hasNextPage}
                            className="flex items-center gap-2 px-3 md:px-6 py-2 md:py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-semibold text-sm transition-all hover:scale-105 active:scale-95 shadow-md"
                        >
                            <span className="hidden sm:inline">Next</span>
                            <ChevronRight size={18} />
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
                        className="fixed bottom-24 left-6 px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl shadow-xl flex items-center gap-3 z-40 ring-4 ring-emerald-200"
                    >
                        <Activity size={20} className="animate-spin" />
                        <div className="text-sm">
                            <p className="font-semibold">Processing Pages</p>
                            <p className="text-xs opacity-95">
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
                        className="fixed bottom-24 right-6 w-14 h-14 rounded-full bg-gray-900 text-white shadow-2xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center z-40 ring-4 ring-gray-300"
                        title="Scroll to top"
                    >
                        <ArrowUp size={24} />
                    </motion.button>
                )}
            </AnimatePresence>

            {/* LOMA AI BUTTON */}
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
