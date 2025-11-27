// src/pages/StudySession.jsx
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Clock, BookOpen, Brain, Lightbulb, Share2, Bookmark,
    ArrowLeft, Maximize2, Minimize2, StickyNote, Sparkles,
    Copy, Download, Highlighter, ZoomIn, ZoomOut
} from 'lucide-react';
import { useAuth } from '@contexts/AuthContext';
import { db } from '@/config/firebase';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
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
    const [fontSize, setFontSize] = useState(16);
    const [studyStartTime, setStudyStartTime] = useState(null);
    const [highlights, setHighlights] = useState([]);

    const textViewerRef = useRef(null);

    // Load document and extracted text
    useEffect(() => {
        loadDocument();
        setStudyStartTime(Date.now());

        // Track study session start
        if (user?.uid && docId) {
            trackStudySession();
        }

        // Cleanup - save progress on unmount
        return () => {
            if (studyStartTime) {
                saveStudyProgress();
            }
        };
    }, [docId, user?.uid]);

    const loadDocument = async () => {
        try {
            const docRef = doc(db, 'documents', docId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const docData = { id: docSnap.id, ...docSnap.data() };
                setDocument(docData);

                // Get extracted text (from OCR or PDF processing)
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

        const studyDuration = Math.floor((Date.now() - studyStartTime) / 1000); // seconds

        try {
            // Update document stats
            const docRef = doc(db, 'documents', docId);
            await updateDoc(docRef, {
                totalStudyTime: increment(studyDuration),
                lastStudiedAt: new Date()
            });

            // Update user stats
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                totalStudyTime: increment(studyDuration)
            });

            // Award XP for studying
            if (studyDuration >= 300) { // 5+ minutes
                await awardXP(user.uid, 10, 'study-session');
            }
        } catch (error) {
            console.error('Error saving progress:', error);
        }
    };

    // Handle text selection
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

    const handleZoomIn = () => {
        setFontSize(prev => Math.min(prev + 2, 24));
    };

    const handleZoomOut = () => {
        setFontSize(prev => Math.max(prev - 2, 12));
    };

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
        toast.success('Text file downloaded!');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Loading study session...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* TOP BAR */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-40">
                <div className="flex items-center justify-between">
                    {/* Left - Back & Title */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => {
                                saveStudyProgress();
                                navigate('/dashboard');
                            }}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-all"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-xl font-black text-black">{document?.title}</h1>
                            <p className="text-sm text-gray-500">Study Session</p>
                        </div>
                    </div>

                    {/* Center - Study Timer */}
                    <StudyTimer startTime={studyStartTime} />

                    {/* Right - Actions */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleZoomOut}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-all"
                            title="Zoom Out"
                        >
                            <ZoomOut size={18} />
                        </button>
                        <button
                            onClick={handleZoomIn}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-all"
                            title="Zoom In"
                        >
                            <ZoomIn size={18} />
                        </button>
                        <button
                            onClick={handleCopyText}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-all"
                            title="Copy Text"
                        >
                            <Copy size={18} />
                        </button>
                        <button
                            onClick={handleDownloadText}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-all"
                            title="Download Text"
                        >
                            <Download size={18} />
                        </button>
                        <button
                            onClick={() => setShowNotes(!showNotes)}
                            className={`p-2 rounded-lg transition-all ${showNotes ? 'bg-black text-white' : 'hover:bg-gray-100'
                                }`}
                            title="Toggle Notes"
                        >
                            <StickyNote size={18} />
                        </button>
                        <button
                            onClick={toggleFullscreen}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-all"
                            title="Fullscreen"
                        >
                            {fullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="flex-1 flex overflow-hidden">
                {/* TEXT VIEWER */}
                <div className={`flex-1 overflow-y-auto p-8 ${showNotes ? 'mr-80' : ''}`}>
                    <div className="max-w-4xl mx-auto">
                        <TextViewer
                            ref={textViewerRef}
                            text={extractedText}
                            fontSize={fontSize}
                            onTextSelect={handleTextSelection}
                            highlights={highlights}
                        />
                    </div>
                </div>

                {/* NOTES PANEL */}
                {showNotes && (
                    <NotesPanel
                        documentId={docId}
                        onClose={() => setShowNotes(false)}
                    />
                )}
            </div>

            {/* ASK GLOQE PILL */}
            {showPill && (
                <AskGloqePill
                    selectedText={selectedText}
                    position={pillPosition}
                    onClose={() => setShowPill(false)}
                    documentId={docId}
                />
            )}
        </div>
    );
};

export default StudySession;
