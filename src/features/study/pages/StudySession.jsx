// src/pages/StudySession.jsx - ✅ FINAL: Session only ends on back button
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Clock, ArrowLeft, Maximize2, Minimize2, StickyNote,
    Copy, Download, ZoomIn, ZoomOut, Moon, Sun, BookOpen, Palette,
    Target, Award, TrendingUp, PlayCircle, PauseCircle, Settings,
    MessageSquare, Mic, Sparkles, Save, CheckCircle2, AlertCircle,
    RefreshCw, BookMarked, Zap
} from 'lucide-react';
import { useAuth } from '@auth/contexts/AuthContext';
import { db, functions } from '@shared/config/firebase';
import { doc, getDoc, updateDoc, increment, Timestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useStudySessionManager } from '@study/hooks/useStudySessionManager';
import StudyTimer from '@study/components/tools/StudyTimer';
import AskGloqePill from '@study/components/tools/AskGloqePill';
import TextViewer from '@study/components/tools/TextViewer';
import NotesPanel from '@study/components/tools/NotesPanel';
import VoiceAssistant from '@study/components/tools/VoiceAssistant';
import toast from 'react-hot-toast';
import logoImage from '@assets/logo/logoe.png';
import { detectSubjectFromContent } from '@shared/utils/subjectDetection';

const StudySession = () => {
    const { docId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    // ==========================================
    // DOCUMENT STATE
    // ==========================================
    const [studyDocument, setStudyDocument] = useState(null);
    const [extractedText, setExtractedText] = useState('');
    const [loading, setLoading] = useState(true);
    const [detectedSubject, setDetectedSubject] = useState('');

    // ==========================================
    // UI STATE
    // ==========================================
    const [selectedText, setSelectedText] = useState('');
    const [pillPosition, setPillPosition] = useState({ x: 0, y: 0 });
    const [showPill, setShowPill] = useState(false);
    const [showNotes, setShowNotes] = useState(false);
    const [fullscreen, setFullscreen] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showStats, setShowStats] = useState(false);
    const [showAssistantMenu, setShowAssistantMenu] = useState(false);
    const [showVoiceAssistant, setShowVoiceAssistant] = useState(false);
    const [focusMode, setFocusMode] = useState(false);
    const [lastSaved, setLastSaved] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    // ==========================================
    // READING SETTINGS (with localStorage persistence)
    // ==========================================
    const [fontSize, setFontSize] = useState(() => {
        return parseInt(localStorage.getItem('study_fontSize')) || 18;
    });
    const [readingMode, setReadingMode] = useState(() => {
        return localStorage.getItem('study_readingMode') || 'light';
    });
    const [lineHeight, setLineHeight] = useState(() => {
        return parseFloat(localStorage.getItem('study_lineHeight')) || 1.8;
    });
    const [fontFamily, setFontFamily] = useState(() => {
        return localStorage.getItem('study_fontFamily') || 'serif';
    });
    const [readingProgress, setReadingProgress] = useState(0);
    const [autoScroll, setAutoScroll] = useState(false);
    const [scrollSpeed, setScrollSpeed] = useState(50);
    const [readingGoal, setReadingGoal] = useState(() => {
        return parseInt(localStorage.getItem('study_readingGoal')) || 30;
    });

    // ==========================================
    // REFS
    // ==========================================
    const textViewerRef = useRef(null);
    const scrollIntervalRef = useRef(null);
    const saveTimeoutRef = useRef(null);
    const lastSaveProgressRef = useRef(0);
    const retryCountRef = useRef(0);
    const MAX_SAVE_RETRIES = 3;

    // ==========================================
    // SESSION MANAGEMENT
    // ==========================================
    const {
        isSessionActive,
        currentSessionId,
        sessionStartTime,
        elapsedTime,
        elapsedMinutes,
        elapsedSeconds,
        isPaused,
        togglePause,
        endSession
    } = useStudySessionManager(
        user?.uid,
        docId,
        studyDocument
    );

    // ==========================================
    // MEMOIZED VALUES
    // ==========================================
    const estimatedReadTime = useMemo(() => {
        if (!extractedText) return 0;
        const words = extractedText.split(/\s+/).length;
        const avgReadingSpeed = 200;
        return Math.ceil(words / avgReadingSpeed);
    }, [extractedText]);

    const wordCount = useMemo(() => {
        return extractedText.split(/\s+/).filter(w => w.length > 0).length;
    }, [extractedText]);

    const readingGoalProgress = useMemo(() => {
        return Math.min((elapsedMinutes / readingGoal) * 100, 100);
    }, [elapsedMinutes, readingGoal]);

    const modeStyles = useMemo(() => {
        switch (readingMode) {
            case 'dark':
                return {
                    bg: 'bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950',
                    text: 'text-gray-50',
                    icon: 'text-gray-300',
                    secondary: 'text-gray-400',
                    border: 'border-gray-800',
                    topBg: 'bg-gray-900/90',
                    cardBg: 'bg-gray-800/50'
                };
            case 'sepia':
                return {
                    bg: 'bg-gradient-to-b from-[#f4ecd8] via-[#f5ead0] to-[#f4ecd8]',
                    text: 'text-[#3d3229]',
                    icon: 'text-[#5c4b37]',
                    secondary: 'text-[#6d5d4f]',
                    border: 'border-[#e0d5bb]',
                    topBg: 'bg-[#f4ecd8]/90',
                    cardBg: 'bg-[#e8dfc8]/50'
                };
            case 'focus':
                return {
                    bg: 'bg-gradient-to-b from-black via-gray-950 to-black',
                    text: 'text-gray-200',
                    icon: 'text-gray-400',
                    secondary: 'text-gray-500',
                    border: 'border-gray-900',
                    topBg: 'bg-black/90',
                    cardBg: 'bg-gray-900/50'
                };
            default:
                return {
                    bg: 'bg-gradient-to-b from-white via-gray-50 to-white',
                    text: 'text-gray-900',
                    icon: 'text-gray-700',
                    secondary: 'text-gray-600',
                    border: 'border-gray-200',
                    topBg: 'bg-white/90',
                    cardBg: 'bg-gray-50/50'
                };
        }
    }, [readingMode]);

    // ==========================================
    // SYNC TO BIGQUERY
    // ==========================================
    const syncToBigQuery = useCallback(async () => {
        if (!user?.uid || !currentSessionId || !sessionStartTime) {
            console.log('⚠️ Missing data for BigQuery sync');
            return false;
        }

        try {
            const endTime = new Date().toISOString();
            const startTime = new Date(sessionStartTime).toISOString();
            const totalMinutes = Math.floor(elapsedTime / 60);
            const totalSeconds = elapsedTime;

            console.log('📊 Syncing to BigQuery...', {
                sessionId: currentSessionId,
                totalMinutes,
                totalSeconds,
                subject: detectedSubject
            });

            const syncStudySession = httpsCallable(functions, 'syncStudySessionToBigQuery');

            const result = await syncStudySession({
                userId: user.uid,
                sessionId: currentSessionId,
                documentId: docId,
                documentTitle: studyDocument?.title || 'Untitled',
                subject: detectedSubject || 'General Studies',
                startTime,
                endTime,
                totalMinutes,
                totalSeconds: totalSeconds,
                wordCount,
                readingProgress: Math.round(readingProgress),
                status: 'completed'
            });

            console.log('✅ BigQuery sync successful:', result.data);
            return true;

        } catch (error) {
            console.error('❌ BigQuery sync error:', error);
            return false;
        }
    }, [user?.uid, currentSessionId, sessionStartTime, elapsedTime, docId, studyDocument, detectedSubject, wordCount, readingProgress]);

    // ==========================================
    // SAVE PROGRESS (Only reading progress)
    // ==========================================
    const saveProgress = useCallback(async (immediate = false) => {
        if (!user?.uid || !docId || !currentSessionId) return;

        if (!immediate && Math.abs(readingProgress - lastSaveProgressRef.current) < 5) {
            return;
        }

        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        const doSave = async () => {
            try {
                setIsSaving(true);
                const durationMinutes = Math.floor(elapsedTime / 60);

                const docUpdate = updateDoc(doc(db, 'documents', docId), {
                    lastStudiedAt: Timestamp.now(),
                    readingProgress: Math.round(readingProgress),
                    subject: detectedSubject || 'General Studies',
                    totalStudyTime: increment(durationMinutes)
                });

                const userUpdate = updateDoc(doc(db, 'users', user.uid), {
                    lastActivityAt: Timestamp.now(),
                    totalStudyMinutes: increment(durationMinutes)
                });

                await Promise.all([docUpdate, userUpdate]);

                lastSaveProgressRef.current = readingProgress;
                setLastSaved(new Date());
                retryCountRef.current = 0;

                if (immediate) {
                    toast.success('Progress saved!', {
                        icon: '💾',
                        duration: 2000,
                        style: {
                            background: '#10b981',
                            color: '#fff',
                            fontWeight: 'bold',
                            borderRadius: '12px',
                        }
                    });
                }

            } catch (error) {
                console.error('Error saving progress:', error);

                if (retryCountRef.current < MAX_SAVE_RETRIES) {
                    retryCountRef.current += 1;
                    console.log(`⚠️ Retrying save (${retryCountRef.current}/${MAX_SAVE_RETRIES})...`);
                    setTimeout(() => saveProgress(immediate), 2000 * retryCountRef.current);
                } else {
                    toast.error('Failed to save progress. Check connection.', {
                        duration: 4000
                    });
                }
            } finally {
                setIsSaving(false);
            }
        };

        if (immediate) {
            await doSave();
        } else {
            saveTimeoutRef.current = setTimeout(doSave, 2000);
        }
    }, [user?.uid, docId, currentSessionId, readingProgress, detectedSubject, elapsedTime]);

    // ==========================================
    // LOAD DOCUMENT
    // ==========================================
    useEffect(() => {
        const loadDocument = async () => {
            if (!docId) {
                navigate('/dashboard');
                return;
            }

            try {
                const docRef = doc(db, 'documents', docId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const docData = { id: docSnap.id, ...docSnap.data() };
                    setStudyDocument(docData);

                    const text = docData.extractedText || 'No text available. Processing...';
                    setExtractedText(text);

                    if (text && text.length > 100) {
                        const { subject } = detectSubjectFromContent(text);
                        setDetectedSubject(subject);
                    }

                    if (docData.readingProgress) {
                        setReadingProgress(docData.readingProgress);
                        setTimeout(() => {
                            if (textViewerRef.current) {
                                const scrollPosition = (docData.readingProgress / 100) *
                                    textViewerRef.current.scrollHeight;
                                textViewerRef.current.scrollTop = scrollPosition;
                                toast.success(`Restored to ${Math.round(docData.readingProgress)}%`, {
                                    duration: 2000,
                                    icon: '📖'
                                });
                            }
                        }, 100);
                    }
                } else {
                    toast.error('Document not found');
                    navigate('/dashboard');
                }
            } catch (error) {
                console.error('Error loading document:', error);
                toast.error('Failed to load document');
                navigate('/dashboard');
            } finally {
                setLoading(false);
            }
        };

        loadDocument();
    }, [docId, navigate]);

    // ==========================================
    // PERSIST READING SETTINGS
    // ==========================================
    useEffect(() => {
        localStorage.setItem('study_fontSize', fontSize);
        localStorage.setItem('study_readingMode', readingMode);
        localStorage.setItem('study_lineHeight', lineHeight);
        localStorage.setItem('study_fontFamily', fontFamily);
        localStorage.setItem('study_readingGoal', readingGoal);
    }, [fontSize, readingMode, lineHeight, fontFamily, readingGoal]);

    // ==========================================
    // READING GOAL CELEBRATION
    // ==========================================
    useEffect(() => {
        if (readingGoalProgress >= 100 && elapsedMinutes === readingGoal) {
            toast.success('🎉 Reading goal achieved!', {
                duration: 5000,
                style: {
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#fff',
                    fontWeight: 'bold',
                    borderRadius: '12px',
                }
            });
        }
    }, [readingGoalProgress, elapsedMinutes, readingGoal]);

    // ==========================================
    // AUTO SCROLL
    // ==========================================
    useEffect(() => {
        if (autoScroll && textViewerRef.current) {
            const scrollAmount = (100 - scrollSpeed) / 10;
            scrollIntervalRef.current = setInterval(() => {
                if (textViewerRef.current) {
                    textViewerRef.current.scrollBy({ top: scrollAmount, behavior: 'smooth' });
                }
            }, 100);
        } else if (scrollIntervalRef.current) {
            clearInterval(scrollIntervalRef.current);
            scrollIntervalRef.current = null;
        }

        return () => {
            if (scrollIntervalRef.current) {
                clearInterval(scrollIntervalRef.current);
            }
        };
    }, [autoScroll, scrollSpeed]);

    // ==========================================
    // KEYBOARD SHORTCUTS
    // ==========================================
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (showVoiceAssistant) setShowVoiceAssistant(false);
                else if (showAssistantMenu) setShowAssistantMenu(false);
                else if (focusMode) setFocusMode(false);
                else if (showPill) setShowPill(false);
                else if (showSettings) setShowSettings(false);
                else if (showStats) setShowStats(false);
                else if (showNotes) setShowNotes(false);
            }

            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                saveProgress(true);
            }

            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                setShowNotes(prev => !prev);
            }

            if ((e.ctrlKey || e.metaKey) && e.key === ' ') {
                e.preventDefault();
                togglePause();
            }

            if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowUp') {
                e.preventDefault();
                handleZoomIn();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowDown') {
                e.preventDefault();
                handleZoomOut();
            }

            if (e.key === 'f' && !e.ctrlKey && !e.metaKey) {
                const selection = window.getSelection();
                if (!selection || selection.toString().trim() === '') {
                    setFocusMode(prev => !prev);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showVoiceAssistant, showAssistantMenu, focusMode, showPill, showSettings, showStats, showNotes, saveProgress, togglePause]);

    // ==========================================
    // FULLSCREEN DETECTION
    // ==========================================
    useEffect(() => {
        const handleFullscreenChange = () => {
            setFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // ==========================================
    // HANDLERS
    // ==========================================
    const handleTextSelection = useCallback(() => {
        const selection = window.getSelection();
        const text = selection.toString().trim();

        if (text.length > 0) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();

            setSelectedText(text);
            setPillPosition({
                x: rect.left + rect.width / 2,
                y: rect.top - 60
            });
            setShowPill(true);
        } else {
            setShowPill(false);
        }
    }, []);

    const handleScroll = useCallback((e) => {
        const target = e.currentTarget;
        const scrollTop = target.scrollTop;
        const scrollHeight = target.scrollHeight;
        const clientHeight = target.clientHeight;

        if (scrollHeight > clientHeight) {
            const progress = (scrollTop / (scrollHeight - clientHeight)) * 100;
            setReadingProgress(Math.min(Math.max(progress, 0), 100));
        }
    }, []);

    const handleZoomIn = useCallback(() => {
        setFontSize(prev => {
            const newSize = Math.min(prev + 2, 32);
            toast.success(`Font size: ${newSize}px`, { duration: 1000 });
            return newSize;
        });
    }, []);

    const handleZoomOut = useCallback(() => {
        setFontSize(prev => {
            const newSize = Math.max(prev - 2, 12);
            toast.success(`Font size: ${newSize}px`, { duration: 1000 });
            return newSize;
        });
    }, []);

    const toggleFullscreen = useCallback(async () => {
        try {
            if (!fullscreen) {
                await document.documentElement.requestFullscreen();
                toast.success('Fullscreen mode', { duration: 1000 });
            } else {
                await document.exitFullscreen();
                toast.success('Exit fullscreen', { duration: 1000 });
            }
        } catch (error) {
            console.error('Fullscreen error:', error);
            toast.error('Fullscreen not supported');
        }
    }, [fullscreen]);

    const handleCopyText = useCallback(() => {
        navigator.clipboard.writeText(extractedText);
        toast.success('✨ Text copied!', {
            style: {
                background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
                color: '#fff',
                fontWeight: 'bold',
                borderRadius: '12px',
            }
        });
    }, [extractedText]);

    const handleDownloadText = useCallback(() => {
        const blob = new Blob([extractedText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = window.document.createElement('a');
        a.href = url;
        a.download = `${studyDocument?.title || 'document'}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('📥 Downloaded!', {
            style: {
                background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                color: '#fff',
                fontWeight: 'bold',
                borderRadius: '12px',
            }
        });
    }, [extractedText, studyDocument]);

    // ==========================================
    // HANDLE BACK - ONLY way to end session
    // ==========================================
    const handleBackToDashboard = useCallback(async () => {
        const loadingToast = toast.loading('Saving session...', {
            style: {
                background: '#1e40af',
                color: '#fff',
                fontWeight: 'bold',
                borderRadius: '12px',
            }
        });

        try {
            console.log('👋 Student exiting - ending session now...');

            // End session and get final data
            const sessionData = await endSession();

            // Save reading progress
            await saveProgress(true);

            // Sync to BigQuery/Analytics
            if (sessionData && sessionData.totalSeconds > 0) {
                await syncToBigQuery();

                const mins = sessionData.totalMinutes;
                const secs = sessionData.totalSeconds % 60;

                toast.success(`Session complete! You studied for ${mins}m ${secs}s`, {
                    id: loadingToast,
                    icon: '🎉',
                    duration: 3000,
                    style: {
                        background: '#10b981',
                        color: '#fff',
                        fontWeight: 'bold',
                        borderRadius: '12px',
                    }
                });
            } else {
                toast.success('Session saved!', {
                    id: loadingToast,
                    icon: '✅',
                    duration: 2000
                });
            }

            setTimeout(() => {
                navigate('/dashboard');
            }, 1000);

        } catch (error) {
            console.error('Error saving session:', error);
            toast.error('Failed to save session', { id: loadingToast });
            navigate('/dashboard');
        }
    }, [endSession, saveProgress, syncToBigQuery, navigate]);

    // ==========================================
    // LOADING STATE
    // ==========================================
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-950 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 p-1 animate-spin mx-auto mb-6">
                        <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                            <img src={logoImage} alt="Loading" className="w-10 h-10" />
                        </div>
                    </div>
                    <p className="text-gray-300 text-base font-semibold">Loading your study session...</p>
                    <p className="text-gray-500 text-sm mt-2">Preparing document viewer</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen flex flex-col transition-colors duration-300 ${modeStyles.bg}`}>
            {/* TOP BAR */}
            {!focusMode && (
                <div className={`backdrop-blur-2xl ${modeStyles.topBg} border-b ${modeStyles.border} px-6 py-3.5 sticky top-0 z-50 shadow-lg`}>
                    <div className="max-w-[1800px] mx-auto flex items-center justify-between gap-4">
                        {/* Left Section */}
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                            <button
                                onClick={handleBackToDashboard}
                                className={`p-2.5 ${readingMode === 'light' ? 'hover:bg-gray-100' : 'hover:bg-white/10'} rounded-xl transition-all flex-shrink-0`}
                                title="Back to Dashboard"
                            >
                                <ArrowLeft size={20} className={modeStyles.icon} />
                            </button>
                            <div className="min-w-0">
                                <h1 className={`text-base font-black truncate ${modeStyles.text}`}>
                                    {studyDocument?.title || 'Untitled Document'}
                                </h1>
                                <div className={`text-xs font-semibold ${modeStyles.secondary} flex items-center gap-2 flex-wrap`}>
                                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-md text-[10px] font-bold">
                                        {detectedSubject}
                                    </span>
                                    📖 {estimatedReadTime} min • {wordCount.toLocaleString()} words
                                    {lastSaved && (
                                        <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                            <CheckCircle2 size={12} />
                                            Saved {new Date(lastSaved).toLocaleTimeString()}
                                        </span>
                                    )}
                                    {isSaving && (
                                        <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                                            <Save size={12} className="animate-pulse" />
                                            Saving...
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Center - Timer */}
                        <div className="flex-shrink-0">
                            <StudyTimer
                                elapsedTime={elapsedTime}
                                isPaused={isPaused}
                                onTogglePause={togglePause}
                            />
                        </div>

                        {/* Right - Controls */}
                        <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
                            <button
                                onClick={() => saveProgress(true)}
                                disabled={isSaving}
                                className={`p-2.5 rounded-xl transition-all ${isSaving ? 'opacity-50 cursor-not-allowed' : ''} ${readingMode === 'light' ? 'hover:bg-gray-100' : 'hover:bg-white/10'}`}
                                title="Save Progress (Ctrl+S)"
                            >
                                <Save size={18} className={`${modeStyles.icon} ${isSaving ? 'animate-pulse' : ''}`} />
                            </button>

                            <button
                                onClick={() => setAutoScroll(!autoScroll)}
                                className={`p-2.5 rounded-xl transition-all ${autoScroll ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg' : `${readingMode === 'light' ? 'hover:bg-gray-100' : 'hover:bg-white/10'} ${modeStyles.icon}`}`}
                                title={autoScroll ? "Stop Auto Scroll" : "Start Auto Scroll"}
                            >
                                {autoScroll ? <PauseCircle size={18} /> : <PlayCircle size={18} />}
                            </button>

                            <div className="flex items-center gap-0.5 px-0.5">
                                <button
                                    onClick={handleZoomOut}
                                    className={`p-2.5 ${readingMode === 'light' ? 'hover:bg-gray-100' : 'hover:bg-white/10'} rounded-lg transition-all`}
                                    title="Zoom Out (Ctrl+↓)"
                                >
                                    <ZoomOut size={18} className={modeStyles.icon} />
                                </button>
                                <span className={`text-xs font-bold ${modeStyles.secondary} min-w-[40px] text-center`}>
                                    {fontSize}px
                                </span>
                                <button
                                    onClick={handleZoomIn}
                                    className={`p-2.5 ${readingMode === 'light' ? 'hover:bg-gray-100' : 'hover:bg-white/10'} rounded-lg transition-all`}
                                    title="Zoom In (Ctrl+↑)"
                                >
                                    <ZoomIn size={18} className={modeStyles.icon} />
                                </button>
                            </div>

                            <div className={`w-px h-7 ${modeStyles.border}`}></div>

                            <button
                                onClick={() => setShowStats(!showStats)}
                                className={`p-2.5 rounded-xl transition-all ${showStats ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg' : `${readingMode === 'light' ? 'hover:bg-gray-100' : 'hover:bg-white/10'} ${modeStyles.icon}`}`}
                                title="Statistics"
                            >
                                <TrendingUp size={18} />
                            </button>

                            <button
                                onClick={() => setShowSettings(!showSettings)}
                                className={`p-2.5 rounded-xl transition-all ${showSettings ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg' : `${readingMode === 'light' ? 'hover:bg-gray-100' : 'hover:bg-white/10'} ${modeStyles.icon}`}`}
                                title="Settings"
                            >
                                <Settings size={18} />
                            </button>

                            <div className={`w-px h-7 ${modeStyles.border}`}></div>

                            <button
                                onClick={handleCopyText}
                                className={`p-2.5 ${readingMode === 'light' ? 'hover:bg-gray-100' : 'hover:bg-white/10'} rounded-xl transition-all`}
                                title="Copy Text"
                            >
                                <Copy size={18} className={modeStyles.icon} />
                            </button>

                            <button
                                onClick={handleDownloadText}
                                className={`p-2.5 ${readingMode === 'light' ? 'hover:bg-gray-100' : 'hover:bg-white/10'} rounded-xl transition-all`}
                                title="Download"
                            >
                                <Download size={18} className={modeStyles.icon} />
                            </button>

                            <button
                                onClick={() => setShowNotes(!showNotes)}
                                className={`p-2.5 rounded-xl transition-all ${showNotes ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg' : `${readingMode === 'light' ? 'hover:bg-gray-100' : 'hover:bg-white/10'} ${modeStyles.icon}`}`}
                                title="Notes (Ctrl+N)"
                            >
                                <StickyNote size={18} />
                            </button>

                            <button
                                onClick={() => setFocusMode(!focusMode)}
                                className={`p-2.5 ${readingMode === 'light' ? 'hover:bg-gray-100' : 'hover:bg-white/10'} rounded-xl transition-all`}
                                title="Focus Mode (F)"
                            >
                                <Target size={18} className={modeStyles.icon} />
                            </button>

                            <button
                                onClick={toggleFullscreen}
                                className={`p-2.5 ${readingMode === 'light' ? 'hover:bg-gray-100' : 'hover:bg-white/10'} rounded-xl transition-all`}
                                title={fullscreen ? "Exit Fullscreen" : "Fullscreen"}
                            >
                                {fullscreen ? <Minimize2 size={18} className={modeStyles.icon} /> : <Maximize2 size={18} className={modeStyles.icon} />}
                            </button>
                        </div>
                    </div>

                    {/* SETTINGS PANEL */}
                    {showSettings && (
                        <div className={`absolute top-full right-6 mt-2 w-80 backdrop-blur-2xl ${readingMode === 'light' ? 'bg-white/98 border-gray-200' : readingMode === 'sepia' ? 'bg-[#f4ecd8]/98 border-[#e0d5bb]' : 'bg-gray-900/98 border-white/10'} border-2 rounded-2xl p-6 shadow-2xl z-50`}>
                            <h3 className={`text-sm font-black mb-5 flex items-center gap-2 ${modeStyles.text}`}>
                                <Palette size={18} className="text-blue-600" />
                                Reading Preferences
                            </h3>

                            <div className="mb-5">
                                <label className={`text-xs font-bold mb-3 block ${modeStyles.secondary}`}>
                                    Theme
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {[
                                        { mode: 'light', icon: Sun, label: 'Light' },
                                        { mode: 'dark', icon: Moon, label: 'Dark' },
                                        { mode: 'sepia', icon: BookOpen, label: 'Sepia' },
                                        { mode: 'focus', icon: Target, label: 'Focus' }
                                    ].map(({ mode, icon: Icon, label }) => (
                                        <button
                                            key={mode}
                                            onClick={() => setReadingMode(mode)}
                                            className={`p-3 rounded-xl transition-all flex flex-col items-center gap-1.5 ${readingMode === mode
                                                ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg'
                                                : `${readingMode === 'light' ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'bg-white/5 hover:bg-white/10 text-gray-300'}`
                                                }`}
                                        >
                                            <Icon size={18} />
                                            <span className="text-[11px] font-bold">{label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="mb-5">
                                <label className={`text-xs font-bold mb-3 block ${modeStyles.secondary}`}>
                                    Font Family
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { font: 'serif', label: 'Serif' },
                                        { font: 'sans', label: 'Sans' },
                                        { font: 'mono', label: 'Mono' }
                                    ].map(({ font, label }) => (
                                        <button
                                            key={font}
                                            onClick={() => setFontFamily(font)}
                                            className={`p-2.5 rounded-lg text-xs font-bold transition-all ${fontFamily === font
                                                ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg'
                                                : `${readingMode === 'light' ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'bg-white/5 hover:bg-white/10 text-gray-300'}`
                                                }`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="mb-4">
                                <label className={`text-xs font-bold mb-3 block ${modeStyles.secondary}`}>
                                    Line Spacing
                                </label>
                                <input
                                    type="range"
                                    min="1.2"
                                    max="2.5"
                                    step="0.1"
                                    value={lineHeight}
                                    onChange={(e) => setLineHeight(parseFloat(e.target.value))}
                                    className="w-full accent-blue-600"
                                />
                                <div className={`flex justify-between text-xs mt-2 font-semibold ${modeStyles.secondary}`}>
                                    <span>Compact</span>
                                    <span>Relaxed</span>
                                </div>
                            </div>

                            {autoScroll && (
                                <div className="mb-4">
                                    <label className={`text-xs font-bold mb-3 block ${modeStyles.secondary}`}>
                                        Scroll Speed
                                    </label>
                                    <input
                                        type="range"
                                        min="10"
                                        max="90"
                                        step="10"
                                        value={scrollSpeed}
                                        onChange={(e) => setScrollSpeed(parseInt(e.target.value))}
                                        className="w-full accent-blue-600"
                                    />
                                    <div className={`flex justify-between text-xs mt-2 font-semibold ${modeStyles.secondary}`}>
                                        <span>Slow</span>
                                        <span>Fast</span>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className={`text-xs font-bold mb-3 block ${modeStyles.secondary}`}>
                                    Daily Reading Goal (minutes)
                                </label>
                                <input
                                    type="number"
                                    min="5"
                                    max="180"
                                    step="5"
                                    value={readingGoal}
                                    onChange={(e) => setReadingGoal(parseInt(e.target.value))}
                                    className={`w-full p-2.5 rounded-lg ${readingMode === 'light' ? 'bg-gray-100' : 'bg-white/5'} ${modeStyles.text} font-bold text-center`}
                                />
                            </div>
                        </div>
                    )}

                    {/* STATS PANEL */}
                    {showStats && (
                        <div className={`absolute top-full right-6 mt-2 w-72 backdrop-blur-2xl ${readingMode === 'light' ? 'bg-white/98 border-gray-200' : readingMode === 'sepia' ? 'bg-[#f4ecd8]/98 border-[#e0d5bb]' : 'bg-gray-900/98 border-white/10'} border-2 rounded-2xl p-6 shadow-2xl z-50`}>
                            <h3 className={`text-sm font-black mb-5 flex items-center gap-2 ${modeStyles.text}`}>
                                <Award size={18} className="text-blue-600" />
                                Reading Statistics
                            </h3>
                            <div className="space-y-3">
                                <div className={`flex justify-between items-center p-3.5 rounded-xl ${modeStyles.cardBg}`}>
                                    <span className={`text-xs font-bold ${modeStyles.secondary}`}>Subject</span>
                                    <span className={`text-sm font-black ${modeStyles.text}`}>{detectedSubject}</span>
                                </div>
                                <div className={`flex justify-between items-center p-3.5 rounded-xl ${modeStyles.cardBg}`}>
                                    <span className={`text-xs font-bold ${modeStyles.secondary}`}>Words</span>
                                    <span className={`text-base font-black ${modeStyles.text}`}>{wordCount.toLocaleString()}</span>
                                </div>
                                <div className={`flex justify-between items-center p-3.5 rounded-xl ${modeStyles.cardBg}`}>
                                    <span className={`text-xs font-bold ${modeStyles.secondary}`}>Study Time</span>
                                    <span className={`text-base font-black ${modeStyles.text}`}>
                                        {elapsedMinutes}:{elapsedSeconds.toString().padStart(2, '0')}
                                    </span>
                                </div>
                                <div className={`flex justify-between items-center p-3.5 rounded-xl ${modeStyles.cardBg}`}>
                                    <span className={`text-xs font-bold ${modeStyles.secondary}`}>Progress</span>
                                    <span className={`text-base font-black ${modeStyles.text}`}>{Math.round(readingProgress)}%</span>
                                </div>

                                <div className={`p-4 rounded-xl ${modeStyles.cardBg} border-2 ${readingGoalProgress >= 100 ? 'border-green-500' : 'border-blue-500'}`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={`text-xs font-bold ${modeStyles.secondary} flex items-center gap-1`}>
                                            <Zap size={14} className={readingGoalProgress >= 100 ? 'text-green-500' : 'text-blue-500'} />
                                            Daily Goal
                                        </span>
                                        <span className={`text-lg font-black ${readingGoalProgress >= 100 ? 'text-green-600' : 'text-blue-600'}`}>
                                            {Math.round(readingGoalProgress)}%
                                        </span>
                                    </div>
                                    <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                        <motion.div
                                            className={`h-full ${readingGoalProgress >= 100 ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-gradient-to-r from-blue-500 to-blue-600'}`}
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min(readingGoalProgress, 100)}%` }}
                                            transition={{ duration: 0.5 }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-[10px] font-bold text-gray-500 mt-2">
                                        <span>{elapsedMinutes} min</span>
                                        <span>{readingGoal} min goal</span>
                                    </div>
                                </div>

                                <div className={`flex justify-between items-center p-3.5 rounded-xl ${modeStyles.cardBg}`}>
                                    <span className={`text-xs font-bold ${modeStyles.secondary}`}>Est. Time Left</span>
                                    <span className={`text-base font-black ${modeStyles.text}`}>
                                        {Math.max(0, estimatedReadTime - elapsedMinutes)} min
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* MAIN CONTENT */}
            <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 overflow-hidden">
                    <TextViewer
                        ref={textViewerRef}
                        text={extractedText}
                        fontSize={fontSize}
                        lineHeight={lineHeight}
                        fontFamily={fontFamily}
                        readingMode={readingMode}
                        onTextSelection={handleTextSelection}
                        onScroll={handleScroll}
                        readingProgress={readingProgress}
                    />
                </div>

                <AnimatePresence>
                    {showNotes && (
                        <NotesPanel
                            documentId={docId}
                            onClose={() => setShowNotes(false)}
                            readingMode={readingMode}
                        />
                    )}
                </AnimatePresence>
            </div>

            <AnimatePresence>
                {showPill && (
                    <AskGloqePill
                        selectedText={selectedText}
                        position={pillPosition}
                        onClose={() => setShowPill(false)}
                        readingMode={readingMode}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showVoiceAssistant && (
                    <VoiceAssistant
                        documentContext={extractedText}
                        subject={detectedSubject}
                        onClose={() => setShowVoiceAssistant(false)}
                        readingMode={readingMode}
                    />
                )}
            </AnimatePresence>

            {focusMode && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-black/90 backdrop-blur-xl px-6 py-3 rounded-full shadow-2xl z-50"
                >
                    <p className="text-white text-sm font-bold flex items-center gap-2">
                        <Target size={16} className="text-blue-400" />
                        Focus Mode • Press F or ESC to exit
                    </p>
                </motion.div>
            )}

            <div className="fixed bottom-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-800 z-50">
                <motion.div
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600"
                    style={{ width: `${readingProgress}%` }}
                    initial={{ width: 0 }}
                    animate={{ width: `${readingProgress}%` }}
                    transition={{ duration: 0.3 }}
                />
            </div>
        </div>
    );
};

export default StudySession;
