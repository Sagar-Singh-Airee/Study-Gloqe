import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Clock, BookOpen, Brain, Lightbulb, Share2, Bookmark,
    ArrowLeft, Maximize2, Minimize2, StickyNote, Sparkles,
    Copy, Download, Highlighter, ZoomIn, ZoomOut, Eye,
    Moon, Sun, Type, Palette, BookMarked, Target, Award,
    TrendingUp, Volume2, PlayCircle, PauseCircle, Settings
} from 'lucide-react';
import { useAuth } from '@contexts/AuthContext';
import { db } from '@/config/firebase';
import { doc, getDoc, updateDoc, increment, setDoc } from 'firebase/firestore';
import StudyTimer from '@/components/study/StudyTimer';
import AskGloqePill from '@/components/study/AskGloqePill';
import TextViewer from '@/components/study/TextViewer';
import NotesPanel from '@/components/study/NotesPanel';
import toast from 'react-hot-toast';

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
    const [showNotes, setShowNotes] = useState(true);
    const [fullscreen, setFullscreen] = useState(false);
    const [fontSize, setFontSize] = useState(18);
    const [studyStartTime, setStudyStartTime] = useState(null);
    const [highlights, setHighlights] = useState([]);
    
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

    // Calculate reading progress on scroll
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

    // Auto-scroll feature
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

    // Estimate reading time
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

    const handleZoomIn = () => setFontSize(prev => Math.min(prev + 2, 28));
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
        toast.success('Text copied to clipboard!');
    };

    const handleDownloadText = () => {
        const blob = new Blob([extractedText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${document?.title || 'document'}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Text downloaded!');
    };

    const getReadingModeStyles = () => {
        switch (readingMode) {
            case 'dark':
                return { bg: 'bg-gray-950', text: 'text-gray-100', icon: 'text-gray-100' };
            case 'sepia':
                return { bg: 'bg-[#f4ecd8]', text: 'text-[#5c4b37]', icon: 'text-[#5c4b37]' };
            case 'focus':
                return { bg: 'bg-black', text: 'text-gray-300', icon: 'text-gray-300' };
            default:
                return { bg: 'bg-white', text: 'text-gray-900', icon: 'text-gray-700' };
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
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-400 text-sm">Loading your study session...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen flex flex-col transition-colors duration-300 ${modeStyles.bg}`}>
            {/* PREMIUM TOP BAR - Fixed proportions */}
            {!focusMode && (
                <div className={`backdrop-blur-2xl ${readingMode === 'light' ? 'bg-white/80' : 'bg-black/40'} border-b ${readingMode === 'light' ? 'border-gray-200' : 'border-white/10'} px-4 py-3 sticky top-0 z-50 shadow-sm`}>
                    <div className="max-w-[1800px] mx-auto flex items-center justify-between gap-4">
                        {/* Left - Back & Title */}
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                            <button
                                onClick={() => {
                                    saveStudyProgress();
                                    navigate('/dashboard');
                                }}
                                className={`p-2 ${readingMode === 'light' ? 'hover:bg-gray-100' : 'hover:bg-white/10'} rounded-xl transition-all flex-shrink-0`}
                            >
                                <ArrowLeft size={18} className={modeStyles.icon} />
                            </button>
                            <div className="min-w-0">
                                <h1 className={`text-sm font-bold truncate ${modeStyles.text}`}>{document?.title}</h1>
                                <p className={`text-xs ${readingMode === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                                    {estimatedReadTime} min read
                                </p>
                            </div>
                        </div>

                        {/* Center - Progress & Timer */}
                        <div className="flex items-center gap-4 flex-shrink-0">
                            {/* Reading Progress */}
                            <div className="flex items-center gap-2">
                                <Eye size={14} className={`${readingMode === 'light' ? 'text-gray-400' : 'text-gray-500'}`} />
                                <div className="w-24 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-gradient-to-r from-blue-600 to-blue-500 transition-all duration-300"
                                        style={{ width: `${readingProgress}%` }}
                                    />
                                </div>
                                <span className={`text-xs font-semibold ${modeStyles.text} min-w-[32px]`}>
                                    {Math.round(readingProgress)}%
                                </span>
                            </div>

                            <StudyTimer startTime={studyStartTime} />
                        </div>

                        {/* Right - Actions - Reorganized */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                            {/* Primary Actions */}
                            <button
                                onClick={() => setAutoScroll(!autoScroll)}
                                className={`p-2 rounded-xl transition-all ${autoScroll ? 'bg-blue-600 text-white' : `${readingMode === 'light' ? 'hover:bg-gray-100' : 'hover:bg-white/10'} ${modeStyles.icon}`}`}
                                title="Auto Scroll"
                            >
                                {autoScroll ? <PauseCircle size={16} /> : <PlayCircle size={16} />}
                            </button>
                            
                            <div className="flex items-center gap-0.5 px-1">
                                <button
                                    onClick={handleZoomOut}
                                    className={`p-2 ${readingMode === 'light' ? 'hover:bg-gray-100' : 'hover:bg-white/10'} rounded-lg transition-all`}
                                    title="Zoom Out"
                                >
                                    <ZoomOut size={16} className={modeStyles.icon} />
                                </button>
                                <button
                                    onClick={handleZoomIn}
                                    className={`p-2 ${readingMode === 'light' ? 'hover:bg-gray-100' : 'hover:bg-white/10'} rounded-lg transition-all`}
                                    title="Zoom In"
                                >
                                    <ZoomIn size={16} className={modeStyles.icon} />
                                </button>
                            </div>

                            <div className={`w-px h-6 ${readingMode === 'light' ? 'bg-gray-300' : 'bg-white/10'}`}></div>

                            <button
                                onClick={() => setShowStats(!showStats)}
                                className={`p-2 rounded-xl transition-all ${showStats ? 'bg-blue-600 text-white' : `${readingMode === 'light' ? 'hover:bg-gray-100' : 'hover:bg-white/10'} ${modeStyles.icon}`}`}
                                title="Stats"
                            >
                                <TrendingUp size={16} />
                            </button>
                            
                            <button
                                onClick={() => setShowSettings(!showSettings)}
                                className={`p-2 rounded-xl transition-all ${showSettings ? 'bg-blue-600 text-white' : `${readingMode === 'light' ? 'hover:bg-gray-100' : 'hover:bg-white/10'} ${modeStyles.icon}`}`}
                                title="Settings"
                            >
                                <Settings size={16} />
                            </button>

                            <div className={`w-px h-6 ${readingMode === 'light' ? 'bg-gray-300' : 'bg-white/10'}`}></div>

                            <button
                                onClick={handleCopyText}
                                className={`p-2 ${readingMode === 'light' ? 'hover:bg-gray-100' : 'hover:bg-white/10'} rounded-xl transition-all`}
                                title="Copy"
                            >
                                <Copy size={16} className={modeStyles.icon} />
                            </button>
                            
                            <button
                                onClick={handleDownloadText}
                                className={`p-2 ${readingMode === 'light' ? 'hover:bg-gray-100' : 'hover:bg-white/10'} rounded-xl transition-all`}
                                title="Download"
                            >
                                <Download size={16} className={modeStyles.icon} />
                            </button>

                            <button
                                onClick={() => setShowNotes(!showNotes)}
                                className={`p-2 rounded-xl transition-all ${showNotes ? 'bg-blue-600 text-white' : `${readingMode === 'light' ? 'hover:bg-gray-100' : 'hover:bg-white/10'} ${modeStyles.icon}`}`}
                                title="Notes"
                            >
                                <StickyNote size={16} />
                            </button>

                            <button
                                onClick={() => setFocusMode(!focusMode)}
                                className={`p-2 ${readingMode === 'light' ? 'hover:bg-gray-100' : 'hover:bg-white/10'} rounded-xl transition-all`}
                                title="Focus Mode"
                            >
                                <Target size={16} className={modeStyles.icon} />
                            </button>
                            
                            <button
                                onClick={toggleFullscreen}
                                className={`p-2 ${readingMode === 'light' ? 'hover:bg-gray-100' : 'hover:bg-white/10'} rounded-xl transition-all`}
                                title="Fullscreen"
                            >
                                {fullscreen ? <Minimize2 size={16} className={modeStyles.icon} /> : <Maximize2 size={16} className={modeStyles.icon} />}
                            </button>
                        </div>
                    </div>

                    {/* Settings Panel - Enhanced visibility */}
                    {showSettings && (
                        <div className={`absolute top-full right-4 mt-2 w-80 backdrop-blur-2xl ${readingMode === 'light' ? 'bg-white/95 border-gray-200' : 'bg-gray-900/95 border-white/10'} border rounded-2xl p-5 shadow-2xl z-50`}>
                            <h3 className={`text-sm font-bold mb-4 flex items-center gap-2 ${modeStyles.text}`}>
                                <Palette size={16} className="text-blue-600" />
                                Reading Preferences
                            </h3>

                            {/* Reading Mode */}
                            <div className="mb-4">
                                <label className={`text-xs font-semibold mb-2 block ${readingMode === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
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
                                            className={`p-3 rounded-xl transition-all flex flex-col items-center gap-1 ${
                                                readingMode === mode 
                                                    ? 'bg-blue-600 text-white' 
                                                    : `${readingMode === 'light' ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'bg-white/5 hover:bg-white/10 text-gray-300'}`
                                            }`}
                                        >
                                            <Icon size={16} />
                                            <span className="text-[10px] font-medium">{label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Font Family */}
                            <div className="mb-4">
                                <label className={`text-xs font-semibold mb-2 block ${readingMode === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                                    Font
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
                                            className={`p-2 rounded-lg text-xs font-medium transition-all ${
                                                fontFamily === font 
                                                    ? 'bg-blue-600 text-white' 
                                                    : `${readingMode === 'light' ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'bg-white/5 hover:bg-white/10 text-gray-300'}`
                                            }`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Line Height */}
                            <div className="mb-4">
                                <label className={`text-xs font-semibold mb-2 block ${readingMode === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
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
                                <div className={`flex justify-between text-xs mt-1 ${readingMode === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                                    <span>Compact</span>
                                    <span>Relaxed</span>
                                </div>
                            </div>

                            {/* Auto-scroll Speed */}
                            {autoScroll && (
                                <div>
                                    <label className={`text-xs font-semibold mb-2 block ${readingMode === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
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
                                    <div className={`flex justify-between text-xs mt-1 ${readingMode === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                                        <span>Slow</span>
                                        <span>Fast</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Stats Panel - Enhanced */}
                    {showStats && (
                        <div className={`absolute top-full right-4 mt-2 w-72 backdrop-blur-2xl ${readingMode === 'light' ? 'bg-white/95 border-gray-200' : 'bg-gray-900/95 border-white/10'} border rounded-2xl p-5 shadow-2xl z-50`}>
                            <h3 className={`text-sm font-bold mb-4 flex items-center gap-2 ${modeStyles.text}`}>
                                <Award size={16} className="text-blue-600" />
                                Reading Statistics
                            </h3>
                            <div className="space-y-3">
                                <div className={`flex justify-between items-center p-3 rounded-xl ${readingMode === 'light' ? 'bg-gray-50' : 'bg-white/5'}`}>
                                    <span className={`text-xs font-medium ${readingMode === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                                        Words Read
                                    </span>
                                    <span className={`text-sm font-bold ${modeStyles.text}`}>
                                        {extractedText.split(/\s+/).length}
                                    </span>
                                </div>
                                <div className={`flex justify-between items-center p-3 rounded-xl ${readingMode === 'light' ? 'bg-gray-50' : 'bg-white/5'}`}>
                                    <span className={`text-xs font-medium ${readingMode === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                                        Time Spent
                                    </span>
                                    <span className={`text-sm font-bold ${modeStyles.text}`}>
                                        {Math.floor((Date.now() - studyStartTime) / 60000)} min
                                    </span>
                                </div>
                                <div className={`flex justify-between items-center p-3 rounded-xl ${readingMode === 'light' ? 'bg-gray-50' : 'bg-white/5'}`}>
                                    <span className={`text-xs font-medium ${readingMode === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                                        Progress
                                    </span>
                                    <span className="text-sm font-bold text-blue-600">
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
                {/* TEXT VIEWER */}
                <div 
                    ref={textViewerRef}
                    className={`flex-1 overflow-y-auto transition-all duration-300 ${
                        showNotes && !focusMode ? 'lg:pr-80' : ''
                    } px-6 md:px-12 py-8`}
                    style={{ scrollBehavior: 'smooth' }}
                >
                    <div className={`mx-auto transition-all duration-300 ${
                        focusMode ? 'max-w-3xl' : 'max-w-4xl'
                    }`}>
                        <div
                            className={`${getFontFamilyClass()} leading-relaxed selection:bg-blue-600/30 ${modeStyles.text}`}
                            style={{ 
                                fontSize: `${fontSize}px`,
                                lineHeight: lineHeight
                            }}
                            onMouseUp={handleTextSelection}
                        >
                            {extractedText.split('\n').map((paragraph, index) => (
                                paragraph.trim() && (
                                    <p key={index} className="mb-6">
                                        {paragraph}
                                    </p>
                                )
                            ))}
                        </div>
                    </div>
                </div>

                {/* NOTES PANEL - Fixed width */}
                {showNotes && !focusMode && (
                    <div className={`fixed right-0 top-[57px] bottom-0 w-80 border-l ${readingMode === 'light' ? 'border-gray-200 bg-white' : 'border-white/10 bg-gray-950'} overflow-hidden shadow-xl`}>
                        <NotesPanel
                            documentId={docId}
                            onClose={() => setShowNotes(false)}
                        />
                    </div>
                )}
            </div>

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
                <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 backdrop-blur-2xl ${readingMode === 'light' ? 'bg-white/90 border-gray-200' : 'bg-black/60 border-white/20'} border rounded-full text-xs ${modeStyles.text} shadow-lg`}>
                    Press ESC or click{' '}
                    <button onClick={() => setFocusMode(false)} className="text-blue-600 font-semibold underline mx-1">
                        here
                    </button>
                    {' '}to exit Focus Mode
                </div>
            )}
        </div>
    );
};

export default StudySession;
