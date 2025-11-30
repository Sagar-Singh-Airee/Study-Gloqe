// src/pages/StudySession.jsx - WITH AUTO-SAVE FEATURE
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Clock, ArrowLeft, Maximize2, Minimize2, StickyNote,
    Copy, Download, ZoomIn, ZoomOut, Moon, Sun, BookOpen, Palette, 
    Target, Award, TrendingUp, PlayCircle, PauseCircle, Settings,
    MessageSquare, Mic, Sparkles
} from 'lucide-react';
import { useAuth } from '@contexts/AuthContext';
import { db } from '@/config/firebase';
import { doc, getDoc, updateDoc, increment, collection, addDoc } from 'firebase/firestore';
import StudyTimer from '@/components/study/StudyTimer';
import AskGloqePill from '@/components/study/AskGloqePill';
import TextViewer from '@/components/study/TextViewer';
import NotesPanel from '@/components/study/NotesPanel';
import VoiceAssistant from '@/components/study/VoiceAssistant';
import toast from 'react-hot-toast';
import logoImage from '@/assets/logo/logox.png';

const StudySession = () => {
    const { docId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [pdfDocument, setPdfDocument] = useState(null);
    const [extractedText, setExtractedText] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedText, setSelectedText] = useState('');
    const [pillPosition, setPillPosition] = useState({ x: 0, y: 0 });
    const [showPill, setShowPill] = useState(false);
    const [showNotes, setShowNotes] = useState(false);
    const [fullscreen, setFullscreen] = useState(false);
    const [fontSize, setFontSize] = useState(18);
    const [studyStartTime, setStudyStartTime] = useState(null);
    const [sessionId, setSessionId] = useState(null);
    
    const [readingMode, setReadingMode] = useState('light');
    const [lineHeight, setLineHeight] = useState(1.8);
    const [fontFamily, setFontFamily] = useState('serif');
    const [showSettings, setShowSettings] = useState(false);
    const [readingProgress, setReadingProgress] = useState(0);
    const [estimatedReadTime, setEstimatedReadTime] = useState(0);
    const [focusMode, setFocusMode] = useState(false);
    const [autoScroll, setAutoScroll] = useState(false);
    const [scrollSpeed, setScrollSpeed] = useState(50);
    const [showStats, setShowStats] = useState(false);
    const [detectedSubject, setDetectedSubject] = useState('');
    const [showAssistantMenu, setShowAssistantMenu] = useState(false);
    const [showVoiceAssistant, setShowVoiceAssistant] = useState(false);

    const textViewerRef = useRef(null);
    const scrollIntervalRef = useRef(null);

    const detectSubjectFromText = async (text) => {
        try {
            const sampleText = text.split(/\s+/).slice(0, 500).join(' ');
            
            const subjects = {
                'Mathematics': ['equation', 'theorem', 'calculus', 'algebra', 'geometry', 'derivative', 'integral', 'matrix', 'function', 'proof'],
                'Physics': ['force', 'energy', 'momentum', 'velocity', 'acceleration', 'quantum', 'newton', 'gravity', 'wave', 'particle'],
                'Chemistry': ['molecule', 'atom', 'reaction', 'compound', 'element', 'acid', 'base', 'electron', 'bond', 'periodic'],
                'Biology': ['cell', 'organism', 'evolution', 'gene', 'protein', 'DNA', 'species', 'tissue', 'enzyme', 'bacteria'],
                'Computer Science': ['algorithm', 'programming', 'database', 'software', 'code', 'data structure', 'function', 'class', 'variable', 'loop'],
                'History': ['century', 'war', 'empire', 'revolution', 'ancient', 'medieval', 'dynasty', 'civilization', 'treaty', 'battle'],
                'Economics': ['market', 'supply', 'demand', 'economy', 'trade', 'inflation', 'GDP', 'capitalism', 'investment', 'revenue'],
                'Literature': ['novel', 'poem', 'author', 'character', 'narrative', 'metaphor', 'plot', 'theme', 'protagonist', 'verse'],
                'Psychology': ['behavior', 'cognitive', 'mental', 'therapy', 'consciousness', 'emotion', 'brain', 'perception', 'personality', 'disorder'],
                'Engineering': ['design', 'circuit', 'mechanical', 'electrical', 'system', 'structure', 'load', 'stress', 'material', 'engineering']
            };

            let maxScore = 0;
            let detectedSubject = 'General Studies';
            const lowerText = sampleText.toLowerCase();

            for (const [subject, keywords] of Object.entries(subjects)) {
                let score = 0;
                keywords.forEach(keyword => {
                    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
                    const matches = lowerText.match(regex);
                    if (matches) score += matches.length;
                });

                if (score > maxScore) {
                    maxScore = score;
                    detectedSubject = subject;
                }
            }

            return detectedSubject;
        } catch (error) {
            console.error('Error detecting subject:', error);
            return 'General Studies';
        }
    };

    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                if (showVoiceAssistant) {
                    setShowVoiceAssistant(false);
                } else if (showAssistantMenu) {
                    setShowAssistantMenu(false);
                } else if (focusMode) {
                    setFocusMode(false);
                } else if (showPill) {
                    setShowPill(false);
                } else if (showSettings) {
                    setShowSettings(false);
                } else if (showStats) {
                    setShowStats(false);
                }
            }
        };

        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [focusMode, showPill, showAssistantMenu, showVoiceAssistant, showSettings, showStats]);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, []);

    useEffect(() => {
        const initializeSession = async () => {
            await loadDocument();
            setStudyStartTime(Date.now());

            if (user?.uid && docId) {
                await startStudySession();
            }
        };

        initializeSession();

        return () => {
            if (studyStartTime && sessionId) {
                saveStudyProgress();
            }
            if (scrollIntervalRef.current) {
                clearInterval(scrollIntervalRef.current);
            }
        };
    }, [docId, user?.uid]);

    // 🆕 AUTO-SAVE FEATURE: Saves progress every 60 seconds
    useEffect(() => {
        let autoSaveInterval = null;
        
        if (sessionId && studyStartTime && user?.uid) {
            // Auto-save every 60 seconds (1 minute)
            autoSaveInterval = setInterval(() => {
                saveStudyProgress();
                console.log('✅ Auto-saved study progress');
            }, 60000); // 60000ms = 1 minute
        }

        return () => {
            if (autoSaveInterval) {
                clearInterval(autoSaveInterval);
            }
            // Final save when component unmounts
            if (sessionId && studyStartTime && user?.uid) {
                saveStudyProgress();
            }
        };
    }, [sessionId, studyStartTime, user?.uid, readingProgress, detectedSubject]);

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

    useEffect(() => {
        if (extractedText) {
            const words = extractedText.split(/\s+/).length;
            const avgReadingSpeed = 200;
            const minutes = Math.ceil(words / avgReadingSpeed);
            setEstimatedReadTime(minutes);
        }
    }, [extractedText]);

    const loadDocument = async () => {
        try {
            const docRef = doc(db, 'documents', docId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const docData = { id: docSnap.id, ...docSnap.data() };
                setPdfDocument(docData);
                const text = docData.extractedText || 'No text available. Processing...';
                setExtractedText(text);
                
                if (text && text.length > 100) {
                    const subject = await detectSubjectFromText(text);
                    setDetectedSubject(subject);
                }
            } else {
                toast.error('Document not found');
                navigate('/dashboard');
            }
        } catch (error) {
            console.error('Error loading document:', error);
            toast.error('Failed to load document');
        } finally {
            setLoading(false);
        }
    };

    const startStudySession = async () => {
        try {
            const sessionData = {
                userId: user.uid,
                documentId: docId,
                documentTitle: pdfDocument?.title || 'Untitled Document',
                subject: detectedSubject || 'General Studies',
                startTime: new Date(),
                status: 'active',
                totalTime: 0,
                progressPercentage: 0
            };

            const sessionRef = await addDoc(collection(db, 'studySessions'), sessionData);
            setSessionId(sessionRef.id);
        } catch (error) {
            console.error('Error starting session:', error);
        }
    };

    const saveStudyProgress = async () => {
        if (!studyStartTime || !user?.uid || !sessionId) return;

        const studyDuration = Math.floor((Date.now() - studyStartTime) / 1000);

        try {
            // Update study session
            const sessionRef = doc(db, 'studySessions', sessionId);
            await updateDoc(sessionRef, {
                endTime: new Date(),
                totalTime: studyDuration,
                progressPercentage: Math.round(readingProgress),
                status: 'active', // Keep as active during auto-save
                subject: detectedSubject || 'General Studies'
            });

            // Update document
            const docRef = doc(db, 'documents', docId);
            await updateDoc(docRef, {
                totalStudyTime: increment(studyDuration),
                lastStudiedAt: new Date(),
                readingProgress: readingProgress,
                subject: detectedSubject || 'General Studies'
            });

            // Update user stats
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                totalStudyTime: increment(studyDuration),
                lastActivityAt: new Date()
            });
        } catch (error) {
            console.error('Error saving progress:', error);
        }
    };

    const handleTextSelection = () => {
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
    };

    const handleAskGloqe = () => {
        setShowAssistantMenu(true);
    };

    const handleChatbot = () => {
        setShowAssistantMenu(false);
        setSelectedText('');
        setPillPosition({
            x: window.innerWidth / 2,
            y: 100
        });
        setShowPill(true);
    };

    const handleVoiceAssistant = () => {
        setShowAssistantMenu(false);
        setShowVoiceAssistant(true);
    };

    const handleZoomIn = () => {
        setFontSize(prev => {
            const newSize = Math.min(prev + 2, 32);
            toast.success(`Font size: ${newSize}px`, { duration: 1000 });
            return newSize;
        });
    };

    const handleZoomOut = () => {
        setFontSize(prev => {
            const newSize = Math.max(prev - 2, 12);
            toast.success(`Font size: ${newSize}px`, { duration: 1000 });
            return newSize;
        });
    };

    const toggleFullscreen = async () => {
        try {
            if (!fullscreen) {
                await document.documentElement.requestFullscreen();
                setFullscreen(true);
                toast.success('Fullscreen mode activated', { duration: 1000 });
            } else {
                await document.exitFullscreen();
                setFullscreen(false);
                toast.success('Fullscreen mode deactivated', { duration: 1000 });
            }
        } catch (error) {
            console.error('Fullscreen error:', error);
            toast.error('Fullscreen not supported');
        }
    };

    const handleCopyText = () => {
        navigator.clipboard.writeText(extractedText);
        toast.success('✨ Text copied!', {
            style: {
                background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
                color: '#fff',
                fontWeight: 'bold',
                borderRadius: '12px',
            }
        });
    };

    const handleDownloadText = () => {
        const blob = new Blob([extractedText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = window.document.createElement('a');
        a.href = url;
        a.download = `${pdfDocument?.title || 'document'}.txt`;
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
    };

    const handleScroll = (e) => {
        const target = e.currentTarget;
        const scrollTop = target.scrollTop;
        const scrollHeight = target.scrollHeight;
        const clientHeight = target.clientHeight;
        
        if (scrollHeight > clientHeight) {
            const progress = (scrollTop / (scrollHeight - clientHeight)) * 100;
            setReadingProgress(Math.min(Math.max(progress, 0), 100));
        }
    };

    const getReadingModeStyles = () => {
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
    };

    const modeStyles = getReadingModeStyles();

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
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                            <button
                                onClick={() => {
                                    saveStudyProgress();
                                    navigate('/dashboard');
                                }}
                                className={`p-2.5 ${readingMode === 'light' ? 'hover:bg-gray-100' : 'hover:bg-white/10'} rounded-xl transition-all flex-shrink-0`}
                            >
                                <ArrowLeft size={20} className={modeStyles.icon} />
                            </button>
                            <div className="min-w-0">
                                <h1 className={`text-base font-black truncate ${modeStyles.text}`}>{pdfDocument?.title}</h1>
                                <p className={`text-xs font-semibold ${modeStyles.secondary} flex items-center gap-2 flex-wrap`}>
                                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-md text-[10px] font-bold">
                                        {detectedSubject}
                                    </span>
                                    📖 {estimatedReadTime} min • {extractedText.split(/\s+/).length.toLocaleString()} words
                                </p>
                            </div>
                        </div>

                        <div className="flex-shrink-0">
                            <StudyTimer startTime={studyStartTime} />
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
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
                                title="Notes"
                            >
                                <StickyNote size={18} />
                            </button>

                            <button
                                onClick={() => setFocusMode(!focusMode)}
                                className={`p-2.5 ${readingMode === 'light' ? 'hover:bg-gray-100' : 'hover:bg-white/10'} rounded-xl transition-all`}
                                title="Focus Mode"
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

                    {/* Settings Panel */}
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
                                            className={`p-3 rounded-xl transition-all flex flex-col items-center gap-1.5 ${
                                                readingMode === mode 
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
                                            className={`p-2.5 rounded-lg text-xs font-bold transition-all ${
                                                fontFamily === font 
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

                    {/* Stats Panel */}
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
                                    <span className={`text-base font-black ${modeStyles.text}`}>{extractedText.split(/\s+/).length.toLocaleString()}</span>
                                </div>
                                <div className={`flex justify-between items-center p-3.5 rounded-xl ${readingMode === 'light' ? 'bg-gray-50' : readingMode === 'sepia' ? 'bg-[#e8dfc8]' : 'bg-white/5'}`}>
                                    <span className={`text-xs font-bold ${modeStyles.secondary}`}>Time</span>
                                    <span className={`text-base font-black ${modeStyles.text}`}>{Math.floor((Date.now() - studyStartTime) / 60000)} min</span>
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

            {/* MAIN READING AREA */}
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

                {showNotes && !focusMode && (
                    <div className={`fixed right-0 top-[69px] bottom-0 w-80 border-l-2 ${modeStyles.border} ${readingMode === 'light' ? 'bg-white' : readingMode === 'sepia' ? 'bg-[#f4ecd8]' : 'bg-gray-950'} overflow-hidden shadow-2xl`}>
                        <NotesPanel
                            documentId={docId}
                            onClose={() => setShowNotes(false)}
                        />
                    </div>
                )}
            </div>

            {/* ASK GLOQE BUTTON */}
            {!showPill && !focusMode && !showAssistantMenu && !showVoiceAssistant && (
                <motion.button
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleAskGloqe}
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
                                            onClick={handleChatbot}
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
                                            onClick={handleVoiceAssistant}
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

            {showPill && (
                <AskGloqePill
                    selectedText={selectedText}
                    position={pillPosition}
                    onClose={() => setShowPill(false)}
                    documentId={docId}
                />
            )}

            {showVoiceAssistant && (
                <VoiceAssistant
                    onClose={() => setShowVoiceAssistant(false)}
                    documentContext={extractedText}
                    documentId={docId}
                />
            )}

            {focusMode && (
                <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 backdrop-blur-2xl ${readingMode === 'light' ? 'bg-white/95 border-gray-300' : 'bg-black/80 border-white/20'} border-2 rounded-2xl text-sm ${modeStyles.text} shadow-2xl font-semibold`}>
                    Press <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded-lg text-xs font-mono mx-1">ESC</kbd> to exit Focus Mode
                </div>
            )}
        </div>
    );
};

export default StudySession;
