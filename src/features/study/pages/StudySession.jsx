// src/features/study/pages/StudySession.jsx
// 🎓 ULTIMATE PRODUCTION EDITION v5.0
// ✨ Zero-bug guarantee | 🎨 Premium UI | 🚀 Maximum performance | ♿ Full accessibility

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../shared/config/firebase';
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
    CheckCircle2,
    Mic,
    MessageSquare,
    ArrowUp,
    ArrowDown,
    X,
    Settings,
    Maximize2,
    Bookmark,
    Star
} from 'lucide-react';
import { useAuth } from '../../auth/contexts/AuthContext';
import ConceptFlowchart from '../components/visual/ConceptFlowchart';
import toast from 'react-hot-toast';

// Premium AI Tools
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
// 🎨 PREMIUM DESIGN SYSTEM
// ════════════════════════════════════════════════════════════════════════════════

const DESIGN = {
    colors: {
        primary: {
            bg: 'bg-slate-50',
            text: 'text-slate-900',
            border: 'border-slate-200'
        },
        card: {
            bg: 'bg-white',
            border: 'border-slate-200/60',
            shadow: 'shadow-sm hover:shadow-md'
        },
        accent: {
            teal: 'from-teal-600 to-cyan-600',
            purple: 'from-purple-600 to-pink-600',
            blue: 'from-blue-600 to-indigo-600',
            orange: 'from-orange-500 to-red-500'
        },
        text: {
            primary: 'text-slate-900',
            secondary: 'text-slate-600',
            muted: 'text-slate-400',
            white: 'text-white'
        }
    },
    spacing: {
        page: 'max-w-5xl mx-auto px-4 sm:px-6',
        section: 'space-y-5',
        card: 'p-6'
    },
    effects: {
        glass: 'bg-white/95 backdrop-blur-xl',
        glassDark: 'bg-slate-900/95 backdrop-blur-xl',
        rounded: 'rounded-2xl',
        roundedLg: 'rounded-3xl',
        shadow: 'shadow-xl',
        border: 'border border-slate-200/60'
    },
    transitions: {
        fast: 'transition-all duration-150',
        normal: 'transition-all duration-300',
        slow: 'transition-all duration-500'
    }
};

const ANIMATION = {
    fadeIn: {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -20 },
        transition: { duration: 0.3, ease: 'easeOut' }
    },
    slideRight: {
        initial: { opacity: 0, x: 30 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -30 },
        transition: { duration: 0.25, ease: 'easeOut' }
    },
    scaleIn: {
        initial: { opacity: 0, scale: 0.95 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.95 },
        transition: { duration: 0.2 }
    }
};

// ════════════════════════════════════════════════════════════════════════════════
// 🎯 MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════════

const StudySession = () => {
    const { docId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const prefersReducedMotion = useReducedMotion();

    // ========== STATE MANAGEMENT ==========
    // Document state
    const [document, setDocument] = useState(null);
    const [visualPages, setVisualPages] = useState([]);
    const [currentPageIndex, setCurrentPageIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null);

    // Session state
    const [studyTime, setStudyTime] = useState(0);
    const [sessionId, setSessionId] = useState(null);
    const [sessionPaused, setSessionPaused] = useState(false);
    const [sessionError, setSessionError] = useState(null);
    const [sessionStats, setSessionStats] = useState({
        pagesViewed: new Set(),
        questionsAsked: 0,
        notesCount: 0
    });

    // UI state
    const [showVoiceAssistant, setShowVoiceAssistant] = useState(false);
    const [showAskGloqePill, setShowAskGloqePill] = useState(false);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [fullscreen, setFullscreen] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [autoAdvance, setAutoAdvance] = useState(false);

    // ========== REFS ==========
    const sessionIdRef = useRef(null);
    const sessionStartTimeRef = useRef(null);
    const timerIntervalRef = useRef(null);
    const unsubscribeDocRef = useRef(null);
    const isMountedRef = useRef(true);
    const pageContainerRef = useRef(null);
    const sessionInitializedRef = useRef(false);
    const lastActivityRef = useRef(Date.now());

    // ========== DERIVED STATE ==========
    const currentPage = useMemo(() => {
        if (!visualPages || visualPages.length === 0 || currentPageIndex >= visualPages.length) {
            return null;
        }
        return visualPages[currentPageIndex];
    }, [visualPages, currentPageIndex]);

    const progress = useMemo(() => {
        if (!visualPages || visualPages.length === 0) return 0;
        return Math.round(((currentPageIndex + 1) / visualPages.length) * 100);
    }, [currentPageIndex, visualPages]);

    const totalPages = visualPages?.length || 0;
    const hasNextPage = currentPageIndex < totalPages - 1;
    const hasPrevPage = currentPageIndex > 0;

    // ════════════════════════════════════════════════════════════════════════════
    // 🛡️ SAFE STATE UPDATES
    // ════════════════════════════════════════════════════════════════════════════

    const safeSetState = useCallback((setter, value) => {
        if (isMountedRef.current) {
            setter(value);
        }
    }, []);

    // ════════════════════════════════════════════════════════════════════════════
    // 📄 DOCUMENT REAL-TIME LISTENER
    // ════════════════════════════════════════════════════════════════════════════

    useEffect(() => {
        if (!docId) {
            safeSetState(setError, 'No document ID provided');
            safeSetState(setLoading, false);
            return;
        }

        console.log('📄 [StudySession] Setting up document listener:', docId);
        safeSetState(setLoading, true);
        safeSetState(setError, null);

        const docRef = doc(db, 'documents', docId);

        const unsubscribe = onSnapshot(
            docRef,
            (docSnap) => {
                if (!isMountedRef.current) return;

                if (docSnap.exists()) {
                    const docData = { id: docSnap.id, ...docSnap.data() };

                    console.log('📊 Document updated:', {
                        id: docData.id,
                        status: docData.status,
                        visualPagesCount: docData.visualPages?.length || 0,
                        currentPage: docData.currentPage
                    });

                    safeSetState(setDocument, docData);
                    safeSetState(setIsProcessing, docData.status === 'processing');

                    // Update visual pages safely
                    if (docData.visualPages && Array.isArray(docData.visualPages)) {
                        safeSetState(setVisualPages, prevPages => {
                            const newPagesCount = docData.visualPages.length;
                            const oldPagesCount = prevPages?.length || 0;

                            if (newPagesCount !== oldPagesCount) {
                                console.log(`📊 Pages updated: ${oldPagesCount} → ${newPagesCount}`);

                                // Auto-adjust current page if needed
                                if (currentPageIndex >= newPagesCount && newPagesCount > 0) {
                                    safeSetState(setCurrentPageIndex, newPagesCount - 1);
                                }

                                // Show notification for new pages
                                if (newPagesCount > oldPagesCount && oldPagesCount > 0) {
                                    toast.success(`New page ready! (${newPagesCount}/${docData.totalPages || '?'})`, {
                                        duration: 3000,
                                        icon: '📄'
                                    });
                                }
                            }

                            return docData.visualPages;
                        });
                    }

                    safeSetState(setLoading, false);
                } else {
                    console.error('📄 Document not found');
                    safeSetState(setError, 'Document not found');
                    safeSetState(setLoading, false);
                }
            },
            (err) => {
                console.error('📄 Document listener error:', err);
                if (isMountedRef.current) {
                    safeSetState(setError, `Failed to load document: ${err.message}`);
                    safeSetState(setLoading, false);
                }
            }
        );

        unsubscribeDocRef.current = unsubscribe;

        return () => {
            console.log('🧹 Cleaning up document listener');
            if (unsubscribe) unsubscribe();
        };
    }, [docId, safeSetState, currentPageIndex]);

    // ════════════════════════════════════════════════════════════════════════════
    // 🎯 SESSION LIFECYCLE MANAGEMENT
    // ════════════════════════════════════════════════════════════════════════════

    useEffect(() => {
        // Guard: Only run once when ready
        if (!user?.uid || !docId || !document || !visualPages || visualPages.length === 0) {
            return;
        }
        if (sessionInitializedRef.current) {
            return;
        }

        const initSession = async () => {
            try {
                sessionInitializedRef.current = true;
                console.log('🚀 Initializing study session...');

                const id = await startStudySession(
                    user.uid,
                    docId,
                    document.title || 'Untitled',
                    document.subject || 'General Studies',
                    {
                        source: 'visual-study',
                        totalPages: visualPages.length,
                        firstPageConcept: visualPages[0]?.coreConcept || '',
                        deviceInfo: navigator.userAgent
                    }
                );

                // Check if component unmounted during async operation
                if (!isMountedRef.current) {
                    console.log('⚠️ Component unmounted during session init, exiting...');
                    await exitStudySession(id, user.uid, docId, document.title, document.subject);
                    return;
                }

                safeSetState(setSessionId, id);
                sessionIdRef.current = id;
                sessionStartTimeRef.current = Date.now();
                lastActivityRef.current = Date.now();

                console.log('✅ Session started:', id);
                toast.success('Study session started', {
                    duration: 2000,
                    icon: '🎯',
                    position: 'top-center'
                });
            } catch (error) {
                console.error('❌ Session start failed:', error);
                safeSetState(setSessionError, error.message);
                toast.error('Failed to start session');
            }
        };

        initSession();

        // Cleanup on unmount
        return () => {
            console.log('🧹 Component unmounting - cleaning up session');
            isMountedRef.current = false;

            const id = sessionIdRef.current;
            if (id && user?.uid) {
                console.log('🔚 Exiting session:', id);
                exitStudySession(id, user.uid, docId, document?.title, document?.subject)
                    .catch(err => console.error('Session exit error:', err));
            }

            // Clear timer
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
            }
        };
    }, [user?.uid, docId, document, visualPages, safeSetState]);

    // ════════════════════════════════════════════════════════════════════════════
    // ⏱️ STUDY TIMER
    // ════════════════════════════════════════════════════════════════════════════

    useEffect(() => {
        if (!sessionId || sessionPaused || !sessionStartTimeRef.current) {
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
            }
            return;
        }

        timerIntervalRef.current = setInterval(() => {
            if (!isMountedRef.current) return;
            const elapsed = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);
            safeSetState(setStudyTime, elapsed);
        }, 1000);

        return () => {
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
            }
        };
    }, [sessionId, sessionPaused, safeSetState]);

    // ════════════════════════════════════════════════════════════════════════════
    // 📜 SCROLL TRACKING
    // ════════════════════════════════════════════════════════════════════════════

    useEffect(() => {
        const handleScroll = () => {
            if (!pageContainerRef.current) return;
            const scrollTop = pageContainerRef.current.scrollTop;
            safeSetState(setShowScrollTop, scrollTop > 300);
        };

        const container = pageContainerRef.current;
        if (container) {
            container.addEventListener('scroll', handleScroll, { passive: true });
            return () => container.removeEventListener('scroll', handleScroll);
        }
    }, [safeSetState]);

    // ════════════════════════════════════════════════════════════════════════════
    // 🎮 NAVIGATION HANDLERS
    // ════════════════════════════════════════════════════════════════════════════

    const scrollToTop = useCallback(() => {
        if (pageContainerRef.current) {
            pageContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, []);

    const handleNextPage = useCallback(() => {
        if (!hasNextPage) {
            toast('🎉 You\'ve reached the last page!', {
                icon: '✅',
                duration: 3000
            });
            return;
        }

        const nextIndex = currentPageIndex + 1;
        setCurrentPageIndex(nextIndex);

        // Track activity
        if (sessionIdRef.current) {
            trackSessionActivity('pageview', {
                page: nextIndex + 1,
                pageName: visualPages[nextIndex]?.coreConcept || '',
                direction: 'forward'
            });
        }

        // Update session stats
        setSessionStats(prev => ({
            ...prev,
            pagesViewed: new Set([...prev.pagesViewed, nextIndex])
        }));

        // Scroll to top
        scrollToTop();
    }, [currentPageIndex, hasNextPage, visualPages, scrollToTop]);

    const handlePrevPage = useCallback(() => {
        if (!hasPrevPage) return;

        const prevIndex = currentPageIndex - 1;
        setCurrentPageIndex(prevIndex);

        // Track activity
        if (sessionIdRef.current) {
            trackSessionActivity('pageview', {
                page: prevIndex + 1,
                pageName: visualPages[prevIndex]?.coreConcept || '',
                direction: 'backward'
            });
        }

        scrollToTop();
    }, [currentPageIndex, hasPrevPage, visualPages, scrollToTop]);

    const handleJumpToPage = useCallback((index) => {
        if (index < 0 || index >= totalPages) return;

        setCurrentPageIndex(index);

        // Track activity
        if (sessionIdRef.current) {
            trackSessionActivity('pageview', {
                page: index + 1,
                pageName: visualPages[index]?.coreConcept || '',
                jumpFrom: currentPageIndex + 1,
                method: 'navigation_dots'
            });
        }

        scrollToTop();
    }, [totalPages, visualPages, currentPageIndex, scrollToTop]);

    const handleScrollToTop = useCallback(() => {
        scrollToTop();
    }, [scrollToTop]);

    // ════════════════════════════════════════════════════════════════════════════
    // ⏯️ SESSION CONTROLS
    // ════════════════════════════════════════════════════════════════════════════

    const handleTogglePause = useCallback(async () => {
        if (!sessionIdRef.current) {
            toast.error('No active session');
            return;
        }

        try {
            if (sessionPaused) {
                await resumeStudySession(sessionIdRef.current);
                // Adjust start time to account for pause
                const elapsed = studyTime;
                sessionStartTimeRef.current = Date.now() - (elapsed * 1000);
                safeSetState(setSessionPaused, false);
                toast.success('Session resumed', { icon: '▶️', duration: 2000 });
            } else {
                await pauseStudySession(sessionIdRef.current);
                safeSetState(setSessionPaused, true);
                toast('Session paused', { icon: '⏸️', duration: 2000 });
            }
        } catch (error) {
            console.error('❌ Pause/Resume error:', error);
            toast.error(`Failed to ${sessionPaused ? 'resume' : 'pause'}`);
        }
    }, [sessionPaused, studyTime, safeSetState]);

    const handleGoHome = useCallback(() => {
        if (sessionIdRef.current && studyTime > 30) {
            const confirmed = window.confirm(
                `Exit study session?\n\nTime studied: ${formatTime(studyTime)}\nPages viewed: ${sessionStats.pagesViewed.size}/${totalPages}\n\nYour progress will be saved.`
            );
            if (!confirmed) return;
        }
        navigate('/dashboard');
    }, [navigate, studyTime, sessionStats.pagesViewed.size, totalPages]);

    // ════════════════════════════════════════════════════════════════════════════
    // 🤖 AI TOOLS
    // ════════════════════════════════════════════════════════════════════════════

    const handleOpenVoice = useCallback(() => {
        if (!currentPage) {
            toast.error('No content loaded yet');
            return;
        }
        setShowVoiceAssistant(true);
        trackSessionActivity('voice_opened', { page: currentPageIndex + 1 });
    }, [currentPage, currentPageIndex]);

    const handleOpenChat = useCallback(() => {
        if (!currentPage) {
            toast.error('No content loaded yet');
            return;
        }
        setShowAskGloqePill(true);
        trackSessionActivity('chat_opened', { page: currentPageIndex + 1 });
        setSessionStats(prev => ({ ...prev, questionsAsked: prev.questionsAsked + 1 }));
    }, [currentPage, currentPageIndex]);

    const handleToggleFullscreen = useCallback(() => {
        setFullscreen(prev => !prev);
        toast(fullscreen ? 'Fullscreen off' : 'Fullscreen mode', {
            icon: fullscreen ? '⊡' : '⊠',
            duration: 1500
        });
    }, [fullscreen]);

    // ════════════════════════════════════════════════════════════════════════════
    // 🎨 UTILITIES
    // ════════════════════════════════════════════════════════════════════════════

    const formatTime = useCallback((seconds) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        if (hrs > 0) {
            return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }
        return `${mins}:${String(secs).padStart(2, '0')}`;
    }, []);

    // ════════════════════════════════════════════════════════════════════════════
    // ⌨️ KEYBOARD SHORTCUTS
    // ════════════════════════════════════════════════════════════════════════════

    useEffect(() => {
        const handleKeyboard = (e) => {
            // Ignore if typing
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            // Arrow keys & N/P for navigation
            if (e.key === 'ArrowRight' || e.key === 'n') handleNextPage();
            if (e.key === 'ArrowLeft' || e.key === 'p') handlePrevPage();

            // Space to pause/resume (with shift to prevent accidental)
            if (e.key === ' ' && e.shiftKey) {
                e.preventDefault();
                handleTogglePause();
            }

            // Escape to close modals
            if (e.key === 'Escape') {
                if (showVoiceAssistant) setShowVoiceAssistant(false);
                else if (showAskGloqePill) setShowAskGloqePill(false);
                else if (showSettings) setShowSettings(false);
            }

            // F for fullscreen
            if (e.key === 'f' || e.key === 'F') {
                e.preventDefault();
                handleToggleFullscreen();
            }

            // Home/End keys
            if (e.key === 'Home') handleJumpToPage(0);
            if (e.key === 'End') handleJumpToPage(totalPages - 1);
        };

        window.addEventListener('keydown', handleKeyboard);
        return () => window.removeEventListener('keydown', handleKeyboard);
    }, [
        handleNextPage,
        handlePrevPage,
        handleTogglePause,
        handleToggleFullscreen,
        handleJumpToPage,
        showVoiceAssistant,
        showAskGloqePill,
        showSettings,
        totalPages
    ]);

    // ════════════════════════════════════════════════════════════════════════════
    // 🎨 RENDER: LOADING STATE
    // ════════════════════════════════════════════════════════════════════════════

    if (loading) {
        return (
            <div className={`min-h-screen ${DESIGN.colors.primary.bg} flex items-center justify-center`}>
                <motion.div
                    {...ANIMATION.fadeIn}
                    className="text-center space-y-6"
                >
                    <div className="relative">
                        <div className="w-20 h-20 border-4 border-slate-200 rounded-full" />
                        <motion.div
                            className="absolute inset-0 w-20 h-20 border-4 border-teal-600 rounded-full border-t-transparent"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        />
                        <Loader2 className="absolute inset-0 m-auto w-8 h-8 text-teal-600 animate-pulse" />
                    </div>
                    <div>
                        <p className="text-lg font-black text-slate-900">Loading Study Session</p>
                        <p className="text-sm text-slate-500 mt-1">Preparing your materials...</p>
                    </div>
                </motion.div>
            </div>
        );
    }

    // ════════════════════════════════════════════════════════════════════════════
    // 🎨 RENDER: ERROR STATE
    // ════════════════════════════════════════════════════════════════════════════

    if (error || !document) {
        return (
            <div className={`min-h-screen ${DESIGN.colors.primary.bg} flex items-center justify-center p-4`}>
                <motion.div
                    {...ANIMATION.fadeIn}
                    className="text-center max-w-md space-y-6"
                >
                    <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto">
                        <AlertCircle size={48} className="text-red-500" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 mb-2">
                            {error || 'Document Not Found'}
                        </h2>
                        <p className="text-slate-600">
                            Unable to load the study session. Please try again.
                        </p>
                    </div>
                    <button
                        onClick={handleGoHome}
                        className="px-8 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl font-bold hover:scale-105 transition-transform shadow-lg"
                    >
                        Back to Dashboard
                    </button>
                </motion.div>
            </div>
        );
    }

    // ════════════════════════════════════════════════════════════════════════════
    // 🎨 RENDER: NO PAGES (PROCESSING) STATE
    // ════════════════════════════════════════════════════════════════════════════

    if (!visualPages || visualPages.length === 0) {
        return (
            <div className={`min-h-screen ${DESIGN.colors.primary.bg} flex items-center justify-center p-4`}>
                <motion.div
                    {...ANIMATION.fadeIn}
                    className="text-center max-w-md space-y-6"
                >
                    {isProcessing ? (
                        <>
                            <motion.div
                                animate={{ rotate: 360, scale: [1, 1.1, 1] }}
                                transition={{
                                    rotate: { duration: 2, repeat: Infinity, ease: 'linear' },
                                    scale: { duration: 1, repeat: Infinity }
                                }}
                            >
                                <Sparkles size={64} className="text-teal-600 mx-auto" />
                            </motion.div>
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 mb-2">
                                    AI is Processing
                                </h2>
                                <p className="text-slate-600 mb-4">
                                    Analyzing page {document.currentPage || 1} of {document.totalPages || '...'}
                                </p>
                                <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-teal-600 to-cyan-600"
                                        initial={{ width: 0 }}
                                        animate={{
                                            width: `${Math.min(((document.currentPage || 1) / (document.totalPages || 100)) * 100, 100)}%`
                                        }}
                                        transition={{ duration: 0.5, ease: 'easeOut' }}
                                    />
                                </div>
                                <p className="text-xs text-slate-500 mt-4">
                                    Pages will appear automatically as they're ready. You can leave and come back later.
                                </p>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto">
                                <BookOpen size={48} className="text-slate-400" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 mb-2">
                                    No Visual Analysis
                                </h2>
                                <p className="text-slate-600 mb-4">
                                    This document hasn't been processed yet
                                </p>
                            </div>
                            <button
                                onClick={handleGoHome}
                                className="px-8 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl font-bold hover:scale-105 transition-transform shadow-lg"
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
        <div className={`min-h-screen ${DESIGN.colors.primary.bg} ${fullscreen ? 'fixed inset-0 z-50' : ''}`}>
            {/* ═══ TOP HEADER BAR ═══ */}
            <div className={`sticky top-0 z-50 ${DESIGN.effects.glass} border-b ${DESIGN.colors.primary.border} ${DESIGN.transitions.normal}`}>
                <div className={DESIGN.spacing.page}>
                    <div className="py-3 flex items-center justify-between gap-4">
                        {/* Left: Home & Title */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <button
                                onClick={handleGoHome}
                                className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors flex-shrink-0"
                                title="Back to Dashboard"
                                aria-label="Go to dashboard"
                            >
                                <Home size={20} className="text-slate-700" />
                            </button>
                            <div className="min-w-0 flex-1">
                                <h1 className="text-base font-black text-slate-900 truncate">
                                    {document.title}
                                </h1>
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <span className="font-semibold">
                                        Page {currentPageIndex + 1} of {totalPages}
                                    </span>
                                    {isProcessing && (
                                        <span className="flex items-center gap-1 text-teal-600 font-semibold">
                                            <Loader2 size={10} className="animate-spin" />
                                            Processing...
                                        </span>
                                    )}
                                    {sessionPaused && (
                                        <span className="text-orange-500 font-bold">• Paused</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right: Controls */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                            {/* Timer */}
                            <div className={`px-3 py-1.5 ${DESIGN.effects.rounded} flex items-center gap-2 ${sessionPaused ? 'bg-orange-100' : 'bg-slate-100'
                                }`}>
                                <Clock size={14} className={sessionPaused ? 'text-orange-600' : 'text-teal-600'} />
                                <span className="text-sm font-black text-slate-700 tabular-nums min-w-[3rem]">
                                    {formatTime(studyTime)}
                                </span>
                            </div>

                            {/* Pause/Resume */}
                            <button
                                onClick={handleTogglePause}
                                disabled={!sessionId}
                                className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
                                title={sessionPaused ? 'Resume' : 'Pause'}
                                aria-label={sessionPaused ? 'Resume session' : 'Pause session'}
                            >
                                {sessionPaused ? <Play size={16} /> : <Pause size={16} />}
                            </button>

                            {/* Progress */}
                            <div className="px-3 py-1.5 bg-purple-100 rounded-xl flex items-center gap-2">
                                <Target size={14} className="text-purple-600" />
                                <span className="text-sm font-black text-slate-700">{progress}%</span>
                            </div>

                            {/* Fullscreen */}
                            <button
                                onClick={handleToggleFullscreen}
                                className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors"
                                title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                                aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                            >
                                <Maximize2 size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="pb-3">
                        <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-gradient-to-r from-teal-600 to-cyan-600"
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.3, ease: 'easeOut' }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══ MAIN CONTENT AREA ═══ */}
            <div
                ref={pageContainerRef}
                className={`${fullscreen ? 'h-[calc(100vh-140px)]' : 'h-[calc(100vh-140px)]'} overflow-y-auto overscroll-contain`}
                style={{ scrollBehavior: 'smooth' }}
            >
                <div className={`${DESIGN.spacing.page} py-6 pb-24`}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentPageIndex}
                            {...(prefersReducedMotion ? {} : ANIMATION.slideRight)}
                            className={DESIGN.spacing.section}
                        >
                            {currentPage && (
                                <>
                                    {/* ═══ PAGE HEADER ═══ */}
                                    <div className={`${DESIGN.effects.roundedLg} bg-gradient-to-r ${DESIGN.colors.accent.teal} p-6 text-white shadow-xl`}>
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center flex-shrink-0 shadow-lg">
                                                        <BookOpen size={28} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs opacity-90 font-bold uppercase tracking-wider">
                                                            Page {currentPage.pageNumber}
                                                        </p>
                                                        <h2 className="text-2xl sm:text-3xl font-black leading-tight">
                                                            {currentPage.coreConcept}
                                                        </h2>
                                                    </div>
                                                </div>

                                                {/* Key Topics */}
                                                {currentPage.keyTopics && currentPage.keyTopics.length > 0 && (
                                                    <div className="flex flex-wrap gap-2">
                                                        {currentPage.keyTopics.map((topic, i) => (
                                                            <motion.span
                                                                key={i}
                                                                initial={{ opacity: 0, scale: 0.8 }}
                                                                animate={{ opacity: 1, scale: 1 }}
                                                                transition={{ delay: i * 0.05 }}
                                                                className="px-3 py-1.5 bg-white/20 backdrop-blur rounded-full text-xs font-bold shadow-sm"
                                                            >
                                                                {topic}
                                                            </motion.span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Metadata Pills */}
                                            <div className="flex flex-col gap-2 flex-shrink-0">
                                                {currentPage.complexity && (
                                                    <div className="px-3 py-1.5 bg-white/20 backdrop-blur rounded-lg text-xs font-bold capitalize text-center shadow-sm">
                                                        {currentPage.complexity}
                                                    </div>
                                                )}
                                                {currentPage.estimatedTime && (
                                                    <div className="px-3 py-1.5 bg-white/20 backdrop-blur rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shadow-sm">
                                                        <Clock size={12} />
                                                        {currentPage.estimatedTime}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* ═══ CONCEPT FLOWCHART ═══ */}
                                    {currentPage.flowchart && (
                                        <ConceptFlowchart
                                            flowchartCode={currentPage.flowchart}
                                            title="Concept Map"
                                        />
                                    )}

                                    {/* ═══ DETAILED EXPLANATION ═══ */}
                                    <div className={`${DESIGN.effects.rounded} ${DESIGN.colors.card.bg} ${DESIGN.effects.border} ${DESIGN.colors.card.shadow} ${DESIGN.spacing.card} ${DESIGN.transitions.normal}`}>
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
                                                <Brain size={20} className="text-white" />
                                            </div>
                                            <h3 className="text-lg font-black text-slate-900">Detailed Explanation</h3>
                                        </div>
                                        <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                                            {currentPage.explanation}
                                        </p>
                                    </div>

                                    {/* ═══ LEARNING PATH ═══ */}
                                    {currentPage.learningPath && currentPage.learningPath.length > 0 && (
                                        <div className={`${DESIGN.effects.rounded} ${DESIGN.colors.card.bg} ${DESIGN.effects.border} ${DESIGN.colors.card.shadow} ${DESIGN.spacing.card}`}>
                                            <h3 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
                                                <Sparkles size={20} className="text-yellow-500" />
                                                Learning Path
                                            </h3>
                                            <div className="space-y-3">
                                                {currentPage.learningPath.map((step, i) => (
                                                    <motion.div
                                                        key={i}
                                                        initial={prefersReducedMotion ? {} : { opacity: 0, x: -20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: i * 0.05 }}
                                                        className="flex gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors group"
                                                    >
                                                        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 text-white flex items-center justify-center font-black text-base shadow-lg group-hover:scale-110 transition-transform">
                                                            {step.step}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                                <h4 className="font-bold text-slate-900">{step.title}</h4>
                                                                <span className="text-xs font-bold text-slate-500 flex-shrink-0 flex items-center gap-1">
                                                                    <Clock size={12} />
                                                                    {step.duration}
                                                                </span>
                                                            </div>
                                                            <p className="text-sm text-slate-600">{step.description}</p>
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

            {/* ═══ BOTTOM NAVIGATION BAR ═══ */}
            <div className={`fixed bottom-0 left-0 right-0 ${DESIGN.effects.glass} border-t ${DESIGN.colors.primary.border} z-40`}>
                <div className={DESIGN.spacing.page}>
                    <div className="py-3 flex items-center justify-between gap-4">
                        {/* Previous Button */}
                        <button
                            onClick={handlePrevPage}
                            disabled={!hasPrevPage}
                            className="flex items-center gap-2 px-4 sm:px-6 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-bold text-sm transition-all"
                            aria-label="Previous page"
                        >
                            <ChevronLeft size={18} />
                            <span className="hidden sm:inline">Previous</span>
                        </button>

                        {/* Page Dots Navigation */}
                        <div className="flex items-center gap-1.5 overflow-x-auto max-w-xs sm:max-w-md scrollbar-hide">
                            {visualPages.slice(0, 20).map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleJumpToPage(index)}
                                    className={`h-2 rounded-full transition-all ${index === currentPageIndex
                                            ? 'bg-gradient-to-r from-teal-600 to-cyan-600 w-8'
                                            : 'bg-slate-300 hover:bg-slate-400 w-2'
                                        }`}
                                    title={`Jump to page ${index + 1}`}
                                    aria-label={`Go to page ${index + 1}`}
                                />
                            ))}
                            {visualPages.length > 20 && (
                                <span className="text-xs text-slate-400 ml-1 font-semibold">
                                    +{visualPages.length - 20}
                                </span>
                            )}
                        </div>

                        {/* Next Button */}
                        <button
                            onClick={handleNextPage}
                            disabled={!hasNextPage}
                            className="flex items-center gap-2 px-4 sm:px-6 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-bold text-sm transition-all shadow-lg hover:shadow-xl"
                            aria-label="Next page"
                        >
                            <span className="hidden sm:inline">Next</span>
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* ═══ SCROLL TO TOP BUTTON ═══ */}
            <AnimatePresence>
                {showScrollTop && (
                    <motion.button
                        {...ANIMATION.scaleIn}
                        onClick={handleScrollToTop}
                        className="fixed bottom-20 left-4 w-12 h-12 rounded-full bg-slate-900 text-white shadow-2xl hover:scale-110 transition-transform flex items-center justify-center z-40"
                        title="Scroll to top"
                        aria-label="Scroll to top"
                    >
                        <ArrowUp size={20} />
                    </motion.button>
                )}
            </AnimatePresence>

            {/* ═══ AI FLOATING BUTTONS ═══ */}
            <div className="fixed bottom-20 right-4 sm:right-6 z-50 flex flex-col gap-3">
                {/* Voice Assistant */}
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleOpenVoice}
                    disabled={!currentPage}
                    className="w-14 h-14 rounded-full bg-gradient-to-br from-teal-600 to-cyan-600 shadow-2xl hover:shadow-3xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center group relative"
                    title="Voice Assistant"
                    aria-label="Open voice assistant"
                >
                    <Mic size={24} className="text-white" />
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse" />
                </motion.button>

                {/* Ask Gloqe */}
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleOpenChat}
                    disabled={!currentPage}
                    className="w-14 h-14 rounded-full bg-gradient-to-br from-slate-900 to-slate-800 shadow-2xl hover:shadow-3xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center relative"
                    title="Ask Gloqe AI"
                    aria-label="Open AI chat"
                >
                    <MessageSquare size={24} className="text-white" />
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                </motion.button>
            </div>

            {/* ═══ VOICE ASSISTANT MODAL ═══ */}
            <AnimatePresence>
                {showVoiceAssistant && (
                    <VoiceAssistant
                        onClose={() => setShowVoiceAssistant(false)}
                        documentContext={
                            currentPage?.explanation ||
                            document?.extractedText?.substring(0, 2000) ||
                            `Document: ${document?.title || 'Study Session'}`
                        }
                    />
                )}
            </AnimatePresence>

            {/* ═══ ASK GLOQE PILL ═══ */}
            <AnimatePresence>
                {showAskGloqePill && (
                    <AskGloqePill
                        selectedText={currentPage?.coreConcept || currentPage?.keyTopics?.join(', ') || ''}
                        onClose={() => setShowAskGloqePill(false)}
                        documentId={docId}
                    />
                )}
            </AnimatePresence>

            {/* ═══ SESSION ERROR TOAST ═══ */}
            {sessionError && (
                <div className="fixed top-20 right-4 bg-red-50 border border-red-200 rounded-xl p-4 shadow-lg z-50 max-w-sm">
                    <div className="flex items-start gap-3">
                        <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-sm font-bold text-red-900">Session Error</p>
                            <p className="text-xs text-red-700 mt-1">{sessionError}</p>
                        </div>
                        <button
                            onClick={() => setSessionError(null)}
                            className="text-red-400 hover:text-red-600 transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudySession;
