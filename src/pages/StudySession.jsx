// src/pages/StudySession.jsx - FIXED & MINIMAL
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Clock, BookOpen, Brain, Lightbulb, Share2, Bookmark,
    ArrowLeft, Maximize2, Minimize2, StickyNote,
    Copy, Download, Highlighter, ZoomIn, ZoomOut, Eye,
    Moon, Sun, Type, Palette, BookMarked, Target, Award,
    TrendingUp, Volume2, PlayCircle, PauseCircle, Settings, MessageCircle
} from 'lucide-react';
import { useAuth } from '@contexts/AuthContext';
import { db } from '@/config/firebase';
import { doc, getDoc, updateDoc, increment, setDoc } from 'firebase/firestore';
import StudyTimer from '@/components/study/StudyTimer';
import AskGloqePill from '@/components/study/AskGloqePill';
import TextViewer from '@/components/study/TextViewer';
import NotesPanel from '@/components/study/NotesPanel';
import toast from 'react-hot-toast';
import logoImage from '@/assets/logo/logo.svg';

const StudySession = () => {
    const { docId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [document, setDocument] = useState(null);
    const [extractedText, setExtractedText] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedText, setSelectedText] = useState('');
    const [pillPosition, setPillPosition] = useState({ x: 0, y: 0 });
    const [showPill, setShowPill] = useState(false);
    const [showNotes, setShowNotes] = useState(false);
    const [fullscreen, setFullscreen] = useState(false);
    const [fontSize, setFontSize] = useState(18);
    const [studyStartTime, setStudyStartTime] = useState(null);
    
    // Premium features
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

    const textViewerRef = useRef(null);
    const scrollIntervalRef = useRef(null);

    // ✅ FIXED: ESC key handler with proper dependencies
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                if (focusMode) {
                    setFocusMode(false);
                } else if (showPill) {
                    setShowPill(false);
                }
            }
        };

        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [focusMode, showPill]); // ✅ Added dependencies

    useEffect(() => {
        loadDocument();
        setStudyStartTime(Date.now());

        if (user?.uid && docId) {
            trackStudySession();
        }

        return () => {
            if (studyStartTime) {
                saveStudyProgress();
            }
            if (scrollIntervalRef.current) {
                clearInterval(scrollIntervalRef.current);
            }
        };
    }, [docId, user?.uid]);

    useEffect(() => {
        const handleScroll = () => {
            if (textViewerRef.current) {
                const { scrollTop, scrollHeight, clientHeight } = textViewerRef.current;
                const progress = (scrollTop / (scrollHeight - clientHeight)) * 100;
                setReadingProgress(Math.min(progress || 0, 100));
            }
        };

        const viewer = textViewerRef.current;
        if (viewer) {
            viewer.addEventListener('scroll', handleScroll);
            return () => viewer.removeEventListener('scroll', handleScroll);
        }
    }, [textViewerRef.current]);

    useEffect(() => {
        if (autoScroll && textViewerRef.current) {
            scrollIntervalRef.current = setInterval(() => {
                textViewerRef.current?.scrollBy({ top: 1, behavior: 'smooth' });
            }, 100 - scrollSpeed);
        } else if (scrollIntervalRef.current) {
            clearInterval(scrollIntervalRef.current);
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
                setDocument(docData);
                setExtractedText(docData.extractedText || 'No text available. Processing...');
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

    const trackStudySession = async () => {
        try {
            const sessionRef = doc(db, 'studySessions', `${user.uid}_${docId}_${Date.now()}`);
            await setDoc(sessionRef, {
                userId: user.uid,
                documentId: docId,
                startTime: new Date(),
                status: 'active'
            });
        } catch (error) {
            console.error('Error tracking session:', error);
        }
    };

    const saveStudyProgress = async () => {
        if (!studyStartTime || !user?.uid) return;

        const studyDuration = Math.floor((Date.now() - studyStartTime) / 1000);

        try {
            const docRef = doc(db, 'documents', docId);
            await updateDoc(docRef, {
                totalStudyTime: increment(studyDuration),
                lastStudiedAt: new Date(),
                readingProgress: readingProgress
            });

            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                totalStudyTime: increment(studyDuration)
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
        setSelectedText('');
        setPillPosition({
            x: window.innerWidth / 2,
            y: 100
        });
        setShowPill(true);
    };

    const handleZoomIn = () => setFontSize(prev => Math.min(prev + 2, 32));
    const handleZoomOut = () => setFontSize(prev => Math.max(prev - 2, 12));

    const toggleFullscreen = () => {
        if (!fullscreen) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
        setFullscreen(!fullscreen);
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
        const a = document.createElement('a');
        a.href = url;
        a.download = `${document?.title || 'document'}.txt`;
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

    const getReadingModeStyles = () => {
        switch (readingMode) {
            case 'dark':
                return { 
                    bg: 'bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950', 
                    text: 'text-gray-50', 
                    icon: 'text-gray-300',
                    secondary: 'text-gray-400',
                    border: 'border-gray-800'
                };
            case 'sepia':
                return { 
                    bg: 'bg-gradient-to-b from-[#f4ecd8] via-[#f5ead0] to-[#f4ecd8]', 
                    text: 'text-[#3d3229]', 
                    icon: 'text-[#5c4b37]',
                    secondary: 'text-[#6d5d4f]',
                    border: 'border-[#e0d5bb]'
                };
            case 'focus':
                return { 
                    bg: 'bg-gradient-to-b from-black via-gray-950 to-black', 
                    text: 'text-gray-200', 
                    icon: 'text-gray-400',
                    secondary: 'text-gray-500',
                    border: 'border-gray-900'
                };
            default:
                return { 
                    bg: 'bg-gradient-to-b from-white via-gray-50 to-white', 
                    text: 'text-gray-900', 
                    icon: 'text-gray-700',
                    secondary: 'text-gray-600',
                    border: 'border-gray-200'
                };
        }
    };

    const getFontFamilyClass = () => {
        switch (fontFamily) {
            case 'sans':
                return 'font-sans';
            case 'mono':
                return 'font-mono';
            default:
                return 'font-serif';
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
                <div className={`backdrop-blur-2xl ${readingMode === 'light' ? 'bg-white/90' : readingMode === 'dark' ? 'bg-gray-900/90' : readingMode === 'sepia' ? 'bg-[#f4ecd8]/90' : 'bg-black/90'} border-b ${modeStyles.border} px-6 py-3.5 sticky top-0 z-50 shadow-lg`}>
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
                                <h1 className={`text-base font-black truncate ${modeStyles.text}`}>{document?.title}</h1>
                                <p className={`text-xs font-semibold ${modeStyles.secondary}`}>
                                    📖 {estimatedReadTime} min read • {extractedText.split(/\s+/).length} words
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 flex-shrink-0">
                            <div className="flex items-center gap-2">
                                <Eye size={16} className={modeStyles.secondary} />
                                <div className="w-32 h-2 bg-gray-300 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-gradient-to-r from-blue-600 to-blue-500 transition-all duration-300"
                                        style={{ width: `${readingProgress}%` }}
                                    />
                                </div>
                                <span className={`text-sm font-black ${modeStyles.text} min-w-[36px]`}>
                                    {Math.round(readingProgress)}%
                                </span>
                            </div>

                            <StudyTimer startTime={studyStartTime} />
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                                onClick={() => setAutoScroll(!autoScroll)}
                                className={`p-2.5 rounded-xl transition-all ${autoScroll ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg' : `${readingMode === 'light' ? 'hover:bg-gray-100' : 'hover:bg-white/10'} ${modeStyles.icon}`}`}
                                title="Auto Scroll"
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
                                title="Stats"
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
                                title="Copy"
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
                                title="Fullscreen"
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
                                    <span className={`text-xs font-bold ${modeStyles.secondary}`}>
                                        Words Read
                                    </span>
                                    <span className={`text-base font-black ${modeStyles.text}`}>
                                        {extractedText.split(/\s+/).length.toLocaleString()}
                                    </span>
                                </div>
                                <div className={`flex justify-between items-center p-3.5 rounded-xl ${readingMode === 'light' ? 'bg-gray-50' : readingMode === 'sepia' ? 'bg-[#e8dfc8]' : 'bg-white/5'}`}>
                                    <span className={`text-xs font-bold ${modeStyles.secondary}`}>
                                        Time Spent
                                    </span>
                                    <span className={`text-base font-black ${modeStyles.text}`}>
                                        {Math.floor((Date.now() - studyStartTime) / 60000)} min
                                    </span>
                                </div>
                                <div className={`flex justify-between items-center p-3.5 rounded-xl ${readingMode === 'light' ? 'bg-gray-50' : readingMode === 'sepia' ? 'bg-[#e8dfc8]' : 'bg-white/5'}`}>
                                    <span className={`text-xs font-bold ${modeStyles.secondary}`}>
                                        Progress
                                    </span>
                                    <span className="text-base font-black text-blue-600">
                                        {Math.round(readingProgress)}%
                                    </span>
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
                    className={`flex-1 overflow-y-auto transition-all duration-300 ${
                        showNotes && !focusMode ? 'lg:pr-80' : ''
                    } px-8 md:px-16 py-12`}
                    style={{ scrollBehavior: 'smooth' }}
                >
                    <div className={`mx-auto transition-all duration-300 ${
                        focusMode ? 'max-w-3xl' : 'max-w-4xl'
                    }`}>
                        <div
                            className={`${getFontFamilyClass()} leading-relaxed selection:bg-blue-500/30 ${modeStyles.text} font-medium`}
                            style={{ 
                                fontSize: `${fontSize}px`,
                                lineHeight: lineHeight,
                                textRendering: 'optimizeLegibility',
                                fontSmooth: 'antialiased',
                                WebkitFontSmoothing: 'antialiased',
                                MozOsxFontSmoothing: 'grayscale'
                            }}
                            onMouseUp={handleTextSelection}
                        >
                            {extractedText.split('\n').map((paragraph, index) => (
                                paragraph.trim() && (
                                    <p key={index} className="mb-7">
                                        {paragraph}
                                    </p>
                                )
                            ))}
                        </div>
                    </div>
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

            {/* ✅ MINIMAL FLOATING LOGO - Bottom Left */}
            {!showPill && !focusMode && (
                <button
                    onClick={handleAskGloqe}
                    className="fixed bottom-8 left-8 w-16 h-16 bg-gradient-to-br from-blue-600 via-gray-600 to-gray-800 hover:from-blue-500 hover:via-gray-500 hover:to-gray-700 rounded-2xl shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 transform hover:scale-110 z-40 p-3 group"
                    title="Ask Gloqe AI"
                >
                    <img 
                        src={logoImage} 
                        alt="Ask Gloqe" 
                        className="w-full h-full group-hover:rotate-12 transition-transform duration-300" 
                    />
                </button>
            )}

            {/* ASK AI PILL */}
            {showPill && (
                <AskGloqePill
                    selectedText={selectedText}
                    position={pillPosition}
                    onClose={() => setShowPill(false)}
                    documentId={docId}
                />
            )}

            {/* Focus Mode Exit Hint */}
            {focusMode && (
                <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 backdrop-blur-2xl ${readingMode === 'light' ? 'bg-white/95 border-gray-300' : 'bg-black/80 border-white/20'} border-2 rounded-2xl text-sm ${modeStyles.text} shadow-2xl font-semibold`}>
                    Press <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded-lg text-xs font-mono mx-1">ESC</kbd> or{' '}
                    <button onClick={() => setFocusMode(false)} className="text-blue-600 font-black underline mx-1">
                        click here
                    </button>
                    {' '}to exit Focus Mode
                </div>
            )}
        </div>
    );
};

export default StudySession;
