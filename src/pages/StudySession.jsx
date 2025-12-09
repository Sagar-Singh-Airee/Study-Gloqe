// src/pages/StudySession.jsx - WITH BIGQUERY INTEGRATION
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Clock, ArrowLeft, Maximize2, Minimize2, StickyNote,
    Copy, Download, ZoomIn, ZoomOut, Moon, Sun, BookOpen, Palette,
    Target, Award, TrendingUp, PlayCircle, PauseCircle, Settings,
    MessageSquare, Mic, Sparkles, Save, CheckCircle2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { db, functions } from '@/config/firebase';
import { doc, getDoc, updateDoc, increment, Timestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useStudySessionManager } from '@/hooks/useStudySessionManager';
import StudyTimer from '@/components/study/StudyTimer';
import AskGloqePill from '@/components/study/AskGloqePill';
import TextViewer from '@/components/study/TextViewer';
import NotesPanel from '@/components/study/NotesPanel';
import VoiceAssistant from '@/components/study/VoiceAssistant';
import toast from 'react-hot-toast';
import logoImage from '@/assets/logo/logox.png';
import { detectSubjectFromContent } from '@/helpers/subjectDetection';

const StudySession = () => {
    const { docId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    // Document State
    const [studyDocument, setStudyDocument] = useState(null);
    const [extractedText, setExtractedText] = useState('');
    const [loading, setLoading] = useState(true);
    const [detectedSubject, setDetectedSubject] = useState('');

    // UI State
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

    // Reading Settings
    const [fontSize, setFontSize] = useState(18);
    const [readingMode, setReadingMode] = useState('light');
    const [lineHeight, setLineHeight] = useState(1.8);
    const [fontFamily, setFontFamily] = useState('serif');
    const [readingProgress, setReadingProgress] = useState(0);
    const [autoScroll, setAutoScroll] = useState(false);
    const [scrollSpeed, setScrollSpeed] = useState(50);

    // Refs
    const textViewerRef = useRef(null);
    const scrollIntervalRef = useRef(null);
    const saveTimeoutRef = useRef(null);
    const lastSaveProgressRef = useRef(0);

    // Session Management Hook
    const { isSessionActive, currentSessionId, sessionStartTime } = useStudySessionManager(
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

    const modeStyles = useMemo(() => {
        switch (readingMode) {
            case 'dark':
                return {
                    bg: 'bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950',
                    text: 'text-gray-50',
                    icon: 'text-gray-300',
                    secondary: 'text-gray-400',
                    border: 'border-gray-800',
                    topBg: 'bg-gray-900/90'
                };
            case 'sepia':
                return {
                    bg: 'bg-gradient-to-b from-[#f4ecd8] via-[#f5ead0] to-[#f4ecd8]',
                    text: 'text-[#3d3229]',
                    icon: 'text-[#5c4b37]',
                    secondary: 'text-[#6d5d4f]',
                    border: 'border-[#e0d5bb]',
                    topBg: 'bg-[#f4ecd8]/90'
                };
            case 'focus':
                return {
                    bg: 'bg-gradient-to-b from-black via-gray-950 to-black',
                    text: 'text-gray-200',
                    icon: 'text-gray-400',
                    secondary: 'text-gray-500',
                    border: 'border-gray-900',
                    topBg: 'bg-black/90'
                };
            default:
                return {
                    bg: 'bg-gradient-to-b from-white via-gray-50 to-white',
                    text: 'text-gray-900',
                    icon: 'text-gray-700',
                    secondary: 'text-gray-600',
                    border: 'border-gray-200',
                    topBg: 'bg-white/90'
                };
        }
    }, [readingMode]);

    // ==========================================
    // 🆕 SYNC TO BIGQUERY
    // ==========================================
    const syncToBigQuery = useCallback(async () => {
        if (!user?.uid || !currentSessionId || !sessionStartTime) {
            console.log('⚠️ Missing data for BigQuery sync');
            return;
        }

        try {
            const endTime = new Date().toISOString();
            const startTime = new Date(sessionStartTime).toISOString();
            const totalMinutes = Math.floor((Date.now() - sessionStartTime) / 1000 / 60);

            // Only sync if session is at least 1 minute
            if (totalMinutes < 1) {
                console.log('⚠️ Session too short to sync (<1 min)');
                return;
            }

            console.log('📊 Syncing to BigQuery...', {
                sessionId: currentSessionId,
                totalMinutes,
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
                status: 'completed'
            });

            console.log('✅ BigQuery sync successful:', result.data);
            
            return true;
        } catch (error) {
            console.error('❌ BigQuery sync error:', error);
            // Don't show error to user - fail silently
            return false;
        }
    }, [user?.uid, currentSessionId, sessionStartTime, docId, studyDocument, detectedSubject]);

    // ==========================================
    // SAVE PROGRESS WITH DEBOUNCE
    // ==========================================
    const saveProgress = useCallback(async (immediate = false) => {
        if (!user?.uid || !docId || !currentSessionId) return;

        // Only save if progress changed significantly (more than 5%)
        if (!immediate && Math.abs(readingProgress - lastSaveProgressRef.current) < 5) {
            return;
        }

        // Clear existing timeout
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        const doSave = async () => {
            try {
                setIsSaving(true);

                // Calculate session duration in minutes
                const durationMinutes = sessionStartTime
                    ? Math.floor((Date.now() - sessionStartTime) / 1000 / 60)
                    : 0;

                // Update document
                await updateDoc(doc(db, 'documents', docId), {
                    lastStudiedAt: Timestamp.now(),
                    readingProgress: Math.round(readingProgress),
                    subject: detectedSubject || 'General Studies'
                });

                // Update user stats
                await updateDoc(doc(db, 'users', user.uid), {
                    lastActivityAt: Timestamp.now()
                });

                lastSaveProgressRef.current = readingProgress;
                setLastSaved(new Date());

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
                toast.error('Failed to save progress');
            } finally {
                setIsSaving(false);
            }
        };

        if (immediate) {
            await doSave();
        } else {
            saveTimeoutRef.current = setTimeout(doSave, 2000);
        }
    }, [user?.uid, docId, currentSessionId, readingProgress, detectedSubject, sessionStartTime]);

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

                    // Restore reading progress
                    if (docData.readingProgress) {
                        setReadingProgress(docData.readingProgress);
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
    // AUTO-SAVE EVERY 60 SECONDS
    // ==========================================
    useEffect(() => {
        if (!isSessionActive) return;

        const interval = setInterval(() => {
            saveProgress(false);
        }, 60000); // 60 seconds

        return () => clearInterval(interval);
    }, [isSessionActive, saveProgress]);

    // ==========================================
    // 🆕 SAVE & SYNC ON UNMOUNT
    // ==========================================
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
            // Save and sync on unmount
            (async () => {
                await saveProgress(true);
                await syncToBigQuery();
            })();
        };
    }, [saveProgress, syncToBigQuery]);

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
            // ESC: Close modals
            if (e.key === 'Escape') {
                if (showVoiceAssistant) setShowVoiceAssistant(false);
                else if (showAssistantMenu) setShowAssistantMenu(false);
                else if (focusMode) setFocusMode(false);
                else if (showPill) setShowPill(false);
                else if (showSettings) setShowSettings(false);
                else if (showStats) setShowStats(false);
                else if (showNotes) setShowNotes(false);
            }

            // Ctrl/Cmd + S: Save
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                saveProgress(true);
            }

            // Ctrl/Cmd + N: Toggle Notes
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                setShowNotes(prev => !prev);
            }

            // F: Focus Mode
            if (e.key === 'f' && !e.ctrlKey && !e.metaKey) {
                const selection = window.getSelection();
                if (!selection || selection.toString().trim() === '') {
                    setFocusMode(prev => !prev);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showVoiceAssistant, showAssistantMenu, focusMode, showPill, showSettings, showStats, showNotes, saveProgress]);

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

    // 🆕 UPDATED: Handle Back with BigQuery Sync
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
            // Save progress first
            await saveProgress(true);
            
            // Sync to BigQuery
            await syncToBigQuery();
            
            toast.success('Session saved successfully!', {
                id: loadingToast,
                icon: '✅',
                duration: 2000,
                style: {
                    background: '#10b981',
                    color: '#fff',
                    fontWeight: 'bold',
                    borderRadius: '12px',
                }
            });

            // Small delay to show success message
            setTimeout(() => {
                navigate('/dashboard');
            }, 500);
        } catch (error) {
            console.error('Error saving session:', error);
            toast.error('Failed to save session', { id: loadingToast });
            // Navigate anyway
            navigate('/dashboard');
        }
    }, [saveProgress, syncToBigQuery, navigate]);

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
            {/* ==========================================
                TOP BAR
                ========================================== */}
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
                            <StudyTimer startTime={sessionStartTime} />
                        </div>

                        {/* Right - Controls */}
                        <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
                            {/* Save Button */}
                            <button
                                onClick={() => saveProgress(true)}
                                disabled={isSaving}
                                className={`p-2.5 rounded-xl transition-all ${isSaving ? 'opacity-50 cursor-not-allowed' : ''} ${readingMode === 'light' ? 'hover:bg-gray-100' : 'hover:bg-white/10'}`}
                                title="Save Progress (Ctrl+S)"
                            >
                                <Save size={18} className={`${modeStyles.icon} ${isSaving ? 'animate-pulse' : ''}`} />
                            </button>

                            {/* Auto Scroll */}
                            <button
                                onClick={() => setAutoScroll(!autoScroll)}
                                className={`p-2.5 rounded-xl transition-all ${autoScroll ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg' : `${readingMode === 'light' ? 'hover:bg-gray-100' : 'hover:bg-white/10'} ${modeStyles.icon}`}`}
                                title={autoScroll ? "Stop Auto Scroll" : "Start Auto Scroll"}
                            >
                                {autoScroll ? <PauseCircle size={18} /> : <PlayCircle size={18} />}
                            </button>

                            {/* Zoom Controls */}
                            <div className="flex items-center gap-0.5 px-0.5">
                                <button
                                    onClick={handleZoomOut}
                                    className={`p-2.5 ${readingMode === 'light' ? 'hover:bg-gray-100' : 'hover:bg-white/10'} rounded-lg transition-all`}
                                    title="Zoom Out"
                                >
                                    <ZoomOut size={18} className={modeStyles.icon} />
                                </button>
                                <span className={`text-xs font-bold ${modeStyles.secondary} min-w-[40px] text-center`}>
                                    {fontSize}px
                                </span>
                                <button
                                    onClick={handleZoomIn}
                                    className={`p-2.5 ${readingMode === 'light' ? 'hover:bg-gray-100' : 'hover:bg-white/10'} rounded-lg transition-all`}
                                    title="Zoom In"
                                >
                                    <ZoomIn size={18} className={modeStyles.icon} />
                                </button>
                            </div>

                            <div className={`w-px h-7 ${modeStyles.border}`}></div>

                            {/* Settings & Stats */}
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

                            {/* Tools */}
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
                                <div>
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
                                <div className={`flex justify-between items-center p-3.5 rounded-xl ${readingMode === 'light' ? 'bg-gray-50' : readingMode === 'sepia' ? 'bg-[#e8dfc8]' : 'bg-white/5'}`}>
                                    <span className={`text-xs font-bold ${modeStyles.secondary}`}>Subject</span>
                                    <span className={`text-sm font-black ${modeStyles.text}`}>{detectedSubject}</span>
                                </div>
                                <div className={`flex justify-between items-center p-3.5 rounded-xl ${readingMode === 'light' ? 'bg-gray-50' : readingMode === 'sepia' ? 'bg-[#e8dfc8]' : 'bg-white/5'}`}>
                                    <span className={`text-xs font-bold ${modeStyles.secondary}`}>Words</span>
                                    <span className={`text-base font-black ${modeStyles.text}`}>{wordCount.toLocaleString()}</span>
                                </div>
                                <div className={`flex justify-between items-center p-3.5 rounded-xl ${readingMode === 'light' ? 'bg-gray-50' : readingMode === 'sepia' ? 'bg-[#e8dfc8]' : 'bg-white/5'}`}>
                                    <span className={`text-xs font-bold ${modeStyles.secondary}`}>Time</span>
                                    <span className={`text-base font-black ${modeStyles.text}`}>
                                        {sessionStartTime ? Math.floor((Date.now() - sessionStartTime) / 60000) : 0} min
                                    </span>
                                </div>
                                <div className={`flex justify-between items-center p-3.5 rounded-xl ${readingMode === 'light' ? 'bg-gray-50' : readingMode === 'sepia' ? 'bg-[#e8dfc8]' : 'bg-white/5'}`}>
                                    <span className={`text-xs font-bold ${modeStyles.secondary}`}>Progress</span>
                                    <span className="text-base font-black text-blue-600">{Math.round(readingProgress)}%</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ==========================================
                READING AREA
                ========================================== */}
            <div className="flex-1 flex overflow-hidden relative">
                <div
                    ref={textViewerRef}
                    className={`flex-1 overflow-y-auto transition-all duration-300 ${showNotes && !focusMode ? 'lg:pr-80' : ''}`}
                    onScroll={handleScroll}
                >
                    <TextViewer
                        text={extractedText}
                        fontSize={fontSize}
                        lineHeight={lineHeight}
                        fontFamily={fontFamily}
                        readingMode={readingMode}
                        onTextSelect={handleTextSelection}
                    />
                </div>

                {/* NOTES PANEL */}
                {showNotes && !focusMode && (
                    <div className={`fixed right-0 top-[69px] bottom-0 w-80 border-l-2 ${modeStyles.border} ${readingMode === 'light' ? 'bg-white' : readingMode === 'sepia' ? 'bg-[#f4ecd8]' : 'bg-gray-950'} overflow-hidden shadow-2xl`}>
                        <NotesPanel
                            documentId={docId}
                            onClose={() => setShowNotes(false)}
                        />
                    </div>
                )}
            </div>

            {/* ==========================================
                ASK GLOQE BUTTON
                ========================================== */}
            {!showPill && !focusMode && !showAssistantMenu && !showVoiceAssistant && (
                <motion.button
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowAssistantMenu(true)}
                    className="fixed bottom-8 left-8 z-40"
                    title="Ask Gloqe AI"
                >
                    <img
                        src={logoImage}
                        alt="Ask Gloqe"
                        className="w-20 h-20 drop-shadow-2xl hover:drop-shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-all duration-300"
                    />
                </motion.button>
            )}

            {/* ASSISTANT MENU */}
            <AnimatePresence>
                {showAssistantMenu && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-xl z-50 flex items-center justify-center p-4"
                        onClick={() => setShowAssistantMenu(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="relative w-full max-w-md"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="relative overflow-hidden rounded-3xl">
                                <div className="backdrop-blur-2xl bg-gradient-to-br from-white/20 via-gray-200/15 to-gray-300/10 border-2 border-white/30 shadow-2xl">

                                    <div className="absolute inset-0 opacity-10">
                                        <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full blur-xl"></div>
                                        <div className="absolute bottom-0 right-0 w-40 h-40 bg-gray-300 rounded-full blur-xl"></div>
                                    </div>

                                    {/* Header */}
                                    <div className="relative px-8 pt-8 pb-6 text-center border-b border-white/20">
                                        <motion.div
                                            initial={{ scale: 0, rotate: -180 }}
                                            animate={{ scale: 1, rotate: 0 }}
                                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                            className="inline-block mb-4"
                                        >
                                            <img
                                                src={logoImage}
                                                alt="Gloqe AI"
                                                className="w-24 h-24 drop-shadow-2xl"
                                            />
                                        </motion.div>

                                        <h2 className="text-2xl font-black bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 bg-clip-text text-transparent mb-2">
                                            Choose Assistant
                                        </h2>
                                        <p className="text-sm text-gray-600 font-medium">
                                            How would you like to interact with AI?
                                        </p>
                                    </div>

                                    {/* Assistant Options */}
                                    <div className="p-6 space-y-4">
                                        <motion.button
                                            whileHover={{ scale: 1.02, y: -2 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => {
                                                setShowAssistantMenu(false);
                                                setSelectedText('');
                                                setPillPosition({ x: window.innerWidth / 2, y: 100 });
                                                setShowPill(true);
                                            }}
                                            className="w-full p-5 rounded-2xl backdrop-blur-xl bg-gradient-to-r from-white/40 to-gray-200/30 border-2 border-white/40 hover:border-blue-400/50 transition-all duration-300 group relative overflow-hidden"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>

                                            <div className="relative flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                                                    <MessageSquare size={24} className="text-white" />
                                                </div>
                                                <div className="text-left flex-1">
                                                    <h3 className="text-lg font-black text-gray-800 mb-1">Text Chat</h3>
                                                    <p className="text-sm text-gray-600 font-medium">Type and chat with AI assistant</p>
                                                </div>
                                                <div className="text-right">
                                                    <div className="px-3 py-1 bg-blue-500/10 rounded-full">
                                                        <span className="text-xs font-black text-blue-700">+5 XP</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.button>

                                        <motion.button
                                            whileHover={{ scale: 1.02, y: -2 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => {
                                                setShowAssistantMenu(false);
                                                setShowVoiceAssistant(true);
                                            }}
                                            className="w-full p-5 rounded-2xl backdrop-blur-xl bg-gradient-to-r from-white/40 to-gray-200/30 border-2 border-white/40 hover:border-purple-400/50 transition-all duration-300 group relative overflow-hidden"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>

                                            <div className="relative flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
                                                    <Mic size={24} className="text-white" />
                                                </div>
                                                <div className="text-left flex-1">
                                                    <h3 className="text-lg font-black text-gray-800 mb-1">Voice Assistant</h3>
                                                    <p className="text-sm text-gray-600 font-medium">Speak naturally with AI</p>
                                                </div>
                                                <div className="text-right">
                                                    <div className="px-3 py-1 bg-purple-500/10 rounded-full">
                                                        <span className="text-xs font-black text-purple-700">+5 XP</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.button>
                                    </div>

                                    <div className="px-6 pb-6">
                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => setShowAssistantMenu(false)}
                                            className="w-full py-3.5 rounded-xl backdrop-blur-xl bg-white/30 hover:bg-white/40 border-2 border-white/40 text-gray-700 font-bold transition-all duration-300"
                                        >
                                            Cancel
                                        </motion.button>
                                    </div>
                                </div>

                                <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/10 blur-xl -z-10"></div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ASK GLOQE PILL */}
            {showPill && (
                <AskGloqePill
                    selectedText={selectedText}
                    position={pillPosition}
                    onClose={() => setShowPill(false)}
                    documentId={docId}
                />
            )}

            {/* VOICE ASSISTANT */}
            {showVoiceAssistant && (
                <VoiceAssistant
                    onClose={() => setShowVoiceAssistant(false)}
                    documentContext={extractedText}
                    documentId={docId}
                />
            )}

            {/* FOCUS MODE HINT */}
            {focusMode && (
                <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 backdrop-blur-2xl ${readingMode === 'light' ? 'bg-white/95 border-gray-300' : 'bg-black/80 border-white/20'} border-2 rounded-2xl text-sm ${modeStyles.text} shadow-2xl font-semibold`}>
                    Press <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded-lg text-xs font-mono mx-1">ESC</kbd> or <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded-lg text-xs font-mono mx-1">F</kbd> to exit Focus Mode
                </div>
            )}

            {/* PROGRESS BAR */}
            <div className={`fixed bottom-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-800 z-50 ${focusMode ? 'hidden' : ''}`}>
                <motion.div
                    className="h-full bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700"
                    initial={{ width: 0 }}
                    animate={{ width: `${readingProgress}%` }}
                    transition={{ duration: 0.3 }}
                />
            </div>
        </div>
    );
};

export default StudySession;
