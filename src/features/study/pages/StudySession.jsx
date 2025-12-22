// src/features/study/pages/StudySession.jsx - 🎓 PREMIUM STUDY EXPERIENCE
// ✅ Real-time progress | ✅ AI Voice + Chat | ✅ Better UX

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../shared/config/firebase';
import {
    ChevronLeft, ChevronRight, Home, BookOpen, Brain,
    Clock, Target, Play, Pause, Mic, MicOff, MessageSquare,
    X, Send, Volume2, Sparkles, Loader2, AlertCircle, CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../auth/contexts/AuthContext';
import ConceptFlowchart from '../components/visual/ConceptFlowchart';
import { GoogleGenerativeAI } from '@google/generative-ai';
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

const StudySession = () => {
    const { docId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    // Document State
    const [document, setDocument] = useState(null);
    const [visualPages, setVisualPages] = useState([]);
    const [currentPageIndex, setCurrentPageIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);

    // Session State
    const [studyTime, setStudyTime] = useState(0);
    const [sessionId, setSessionId] = useState(null);
    const [sessionPaused, setSessionPaused] = useState(false);

    // AI State
    const [chatOpen, setChatOpen] = useState(false);
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);

    // Premium Tools State
    const [showVoiceAssistant, setShowVoiceAssistant] = useState(false);
    const [showAskGloqePill, setShowAskGloqePill] = useState(false);

    // Refs
    const sessionStartTimeRef = useRef(Date.now());
    const timerRef = useRef(null);
    const sessionInitializedRef = useRef(false);
    const activeSessionIdRef = useRef(null); // ✨ Fix: Track active session ID for cleanup
    const recognitionRef = useRef(null);
    const chatEndRef = useRef(null);
    const genAI = useRef(null);

    const currentPage = visualPages[currentPageIndex];

    // ==================== 🤖 INITIALIZE AI ====================

    useEffect(() => {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (apiKey) {
            genAI.current = new GoogleGenerativeAI(apiKey);
        }

        // Speech Recognition
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = false;
            recognitionRef.current.lang = 'en-US';

            recognitionRef.current.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                handleVoiceCommand(transcript);
            };

            recognitionRef.current.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                setIsListening(false);
                toast.error('Voice recognition failed');
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
            };
        }
    }, []);

    // ==================== 🎤 VOICE ASSISTANT ====================

    const toggleVoiceListening = () => {
        if (!recognitionRef.current) {
            toast.error('Voice recognition not supported');
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
        } else {
            try {
                recognitionRef.current.start();
                setIsListening(true);
                toast('Listening...', { icon: '🎤' });
            } catch (error) {
                toast.error('Failed to start voice recognition');
            }
        }
    };

    const handleVoiceCommand = async (command) => {
        const lower = command.toLowerCase();

        if (lower.includes('next')) {
            handleNextPage();
            speak('Moving to next page');
        } else if (lower.includes('previous') || lower.includes('back')) {
            handlePrevPage();
            speak('Moving to previous page');
        } else if (lower.includes('home') || lower.includes('dashboard')) {
            speak('Going to dashboard');
            setTimeout(() => navigate('/dashboard'), 1000);
        } else if (lower.includes('pause')) {
            handleTogglePause();
            speak(sessionPaused ? 'Session resumed' : 'Session paused');
        } else {
            await handleAIQuery(command, true);
        }
    };

    const speak = (text) => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1.0;
            utterance.onstart = () => setIsSpeaking(true);
            utterance.onend = () => setIsSpeaking(false);
            window.speechSynthesis.speak(utterance);
        }
    };

    const stopSpeaking = () => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
        }
    };

    // ==================== 💬 CHAT ASSISTANT ====================

    const handleAIQuery = async (query, isVoice = false) => {
        if (!genAI.current) {
            toast.error('AI assistant not available');
            return;
        }

        try {
            setChatLoading(true);

            const userMessage = { role: 'user', content: query };
            setChatMessages(prev => [...prev, userMessage]);

            const context = `You are a helpful study assistant.

Document: ${document?.title || 'Unknown'}
Subject: ${document?.subject || 'General'}
Current Page: ${currentPageIndex + 1} of ${visualPages.length}
Topic: ${currentPage?.coreConcept || 'N/A'}
Key Concepts: ${currentPage?.keyTopics?.join(', ') || 'N/A'}

Content Summary:
${currentPage?.explanation?.substring(0, 500) || 'No content available'}

Student Question: ${query}

Provide a clear, concise, and helpful answer. Keep under 150 words.`;

            const model = genAI.current.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
            const result = await model.generateContent(context);
            const response = result.response.text();

            const aiMessage = { role: 'assistant', content: response };
            setChatMessages(prev => [...prev, aiMessage]);

            if (isVoice) speak(response);

            trackSessionActivity('ai_question', {
                question: query,
                page: currentPageIndex + 1
            });

        } catch (error) {
            console.error('AI query error:', error);
            toast.error('Failed to get AI response');
            setChatMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Sorry, I encountered an error. Please try again.'
            }]);
        } finally {
            setChatLoading(false);
        }
    };

    const handleChatSubmit = (e) => {
        e.preventDefault();
        if (!chatInput.trim()) return;
        handleAIQuery(chatInput);
        setChatInput('');
    };

    // Auto-scroll chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    // ==================== 📚 SESSION MANAGEMENT ====================

    useEffect(() => {
        if (!user?.uid || !docId || sessionInitializedRef.current) return;

        const initSession = async () => {
            try {
                sessionInitializedRef.current = true;
                const id = await startStudySession(
                    user.uid,
                    docId,
                    document?.title || 'Untitled',
                    document?.subject || 'General',
                    { source: 'visual-study', totalPages: visualPages.length }
                );

                setSessionId(id);
                activeSessionIdRef.current = id; // ✨ Update Ref
                sessionStartTimeRef.current = Date.now();
                toast.success('Study session started!', { duration: 2000, icon: '🎯' });

                // Welcome message
                setChatMessages([{
                    role: 'assistant',
                    content: `Hi! I'm your AI study assistant for "${document?.title || 'this material'}". Ask me anything or use voice commands like "next page" or "explain this concept"!`
                }]);

            } catch (error) {
                console.error('Failed to start session:', error);
                toast.error('Failed to start study session');
            }
        };

        if (document && visualPages.length > 0) {
            initSession();
        }

        return () => {
            const currentSessionId = activeSessionIdRef.current; // ✨ Use Ref for cleanup
            if (currentSessionId && user?.uid) {
                console.log('🧹 Cleaning up session on unmount:', currentSessionId);
                exitStudySession(currentSessionId, user.uid, docId, document?.title, document?.subject)
                    .catch(err => console.error('Session exit error:', err));
            }
            if (recognitionRef.current && isListening) {
                recognitionRef.current.stop();
            }
            stopSpeaking();
        };
    }, [user?.uid, docId, document, visualPages.length]);

    // Timer
    useEffect(() => {
        if (!sessionId || sessionPaused) return;

        timerRef.current = setInterval(() => {
            const elapsed = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);
            setStudyTime(elapsed);
        }, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [sessionId, sessionPaused]);

    // ==================== 📄 REAL-TIME DOCUMENT UPDATES ====================

    useEffect(() => {
        if (!docId) return;

        setLoading(true);

        const unsubscribe = onSnapshot(
            doc(db, 'documents', docId),
            (docSnap) => {
                if (docSnap.exists()) {
                    const docData = { id: docSnap.id, ...docSnap.data() };
                    setDocument(docData);
                    setIsProcessing(docData.status === 'processing');

                    // Update visual pages (real-time)
                    if (docData.visualPages && docData.visualPages.length > 0) {
                        setVisualPages(prev => {
                            if (prev.length !== docData.visualPages.length) {
                                console.log(`📊 Pages updated: ${prev.length} → ${docData.visualPages.length}`);
                                return docData.visualPages;
                            }
                            return prev;
                        });
                    }

                    setLoading(false);
                } else {
                    toast.error('Document not found');
                    navigate('/dashboard');
                }
            },
            (error) => {
                console.error('Error loading document:', error);
                toast.error('Failed to load document');
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [docId, navigate]);

    // ==================== 🎯 NAVIGATION ====================

    const handleNextPage = () => {
        if (currentPageIndex < visualPages.length - 1) {
            setCurrentPageIndex(prev => prev + 1);
            trackSessionActivity('pageview', {
                page: currentPageIndex + 2,
                pageName: visualPages[currentPageIndex + 1]?.coreConcept
            });
        }
    };

    const handlePrevPage = () => {
        if (currentPageIndex > 0) {
            setCurrentPageIndex(prev => prev - 1);
            trackSessionActivity('pageview', {
                page: currentPageIndex,
                pageName: visualPages[currentPageIndex - 1]?.coreConcept
            });
        }
    };

    const handleTogglePause = async () => {
        if (!sessionId) return;

        try {
            if (sessionPaused) {
                await resumeStudySession(sessionId);
                sessionStartTimeRef.current = Date.now() - (studyTime * 1000);
                setSessionPaused(false);
                toast.success('Session resumed ▶️');
            } else {
                await pauseStudySession(sessionId);
                setSessionPaused(true);
                toast('Session paused ⏸️', { icon: '⏸️' });
            }
        } catch (error) {
            toast.error('Failed to pause/resume');
        }
    };

    const formatTime = (seconds) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // ==================== 🎨 LOADING ====================

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <Loader2 size={48} className="text-teal-600 animate-spin mx-auto mb-4" />
                    <p className="text-slate-600 font-semibold">Loading study session...</p>
                </div>
            </div>
        );
    }

    if (!document) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <AlertCircle size={64} className="mx-auto text-red-400 mb-4" />
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Document Not Found</h2>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    if (visualPages.length === 0) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    {isProcessing ? (
                        <>
                            <Loader2 size={64} className="mx-auto text-teal-600 animate-spin mb-4" />
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">Processing Document</h2>
                            <p className="text-slate-600 mb-4">
                                Page {document.currentPage || 1} of {document.totalPages || '...'}
                            </p>
                            <p className="text-slate-500 text-sm">
                                Pages will appear automatically as they're analyzed. This may take a few minutes.
                            </p>
                        </>
                    ) : (
                        <>
                            <BookOpen size={64} className="mx-auto text-slate-300 mb-4" />
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">No Visual Analysis</h2>
                            <p className="text-slate-600 mb-6">This document hasn't been processed yet.</p>
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700"
                            >
                                Back to Dashboard
                            </button>
                        </>
                    )}
                </div>
            </div>
        );
    }

    // ==================== 🎨 MAIN RENDER ====================

    return (
        <div className="min-h-screen bg-white">
            {/* Top Bar */}
            <div className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                            >
                                <Home size={20} />
                            </button>
                            <div>
                                <h1 className="text-lg font-bold text-slate-900">{document.title}</h1>
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <span>Page {currentPageIndex + 1} of {visualPages.length}</span>
                                    {isProcessing && (
                                        <span className="flex items-center gap-1 text-teal-600 animate-pulse">
                                            <Loader2 size={12} className="animate-spin" />
                                            Processing... ({document.currentPage || visualPages.length}/{document.totalPages})
                                        </span>
                                    )}
                                    {sessionPaused && (
                                        <span className="text-orange-500">• Paused</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Timer */}
                            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${sessionPaused ? 'bg-orange-100' : 'bg-slate-100'
                                }`}>
                                <Clock size={16} className={sessionPaused ? 'text-orange-600' : 'text-teal-600'} />
                                <span className="text-sm font-semibold text-slate-700">{formatTime(studyTime)}</span>
                            </div>

                            {/* Pause/Resume */}
                            <button
                                onClick={handleTogglePause}
                                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                                title={sessionPaused ? 'Resume' : 'Pause'}
                            >
                                {sessionPaused ? <Play size={18} /> : <Pause size={18} />}
                            </button>

                            {/* Progress */}
                            <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-xl">
                                <Target size={16} className="text-purple-600" />
                                <span className="text-sm font-semibold text-slate-700">
                                    {Math.round(((currentPageIndex + 1) / visualPages.length) * 100)}%
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-gradient-to-r from-teal-600 to-teal-500"
                            animate={{ width: `${((currentPageIndex + 1) / visualPages.length) * 100}%` }}
                            transition={{ duration: 0.3 }}
                        />
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 py-8 pb-32">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentPageIndex}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-6"
                    >
                        {/* Page Header */}
                        <div className="bg-gradient-to-br from-teal-600 to-slate-900 rounded-3xl p-8 text-white">
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

                                <div className="flex flex-col gap-2 items-end">
                                    <div className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl text-sm font-semibold capitalize">
                                        {currentPage.complexity}
                                    </div>
                                    <div className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl text-sm font-semibold flex items-center gap-2">
                                        <Clock size={16} />
                                        {currentPage.estimatedTime}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Flowchart */}
                        {currentPage.flowchart && (
                            <ConceptFlowchart flowchartCode={currentPage.flowchart} title="Concept Map" />
                        )}

                        {/* Explanation */}
                        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <Brain size={20} className="text-teal-600" />
                                <h3 className="text-lg font-bold text-slate-900">Detailed Explanation</h3>
                            </div>
                            <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                                {currentPage.explanation}
                            </p>
                        </div>

                        {/* Learning Path */}
                        {currentPage.learningPath && currentPage.learningPath.length > 0 && (
                            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                                <h3 className="text-lg font-bold text-slate-900 mb-4">Learning Path</h3>
                                <div className="space-y-4">
                                    {currentPage.learningPath.map((step, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.1 }}
                                            className="flex gap-4 p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors"
                                        >
                                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-teal-600 to-teal-500 text-white flex items-center justify-center font-bold">
                                                {step.step}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-1">
                                                    <h4 className="font-semibold text-slate-900">{step.title}</h4>
                                                    <span className="text-xs font-semibold text-slate-500">{step.duration}</span>
                                                </div>
                                                <p className="text-sm text-slate-600">{step.description}</p>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 shadow-lg">
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
                                    onClick={() => {
                                        setCurrentPageIndex(index);
                                        trackSessionActivity('pageview', {
                                            page: index + 1,
                                            jumpedFrom: currentPageIndex + 1
                                        });
                                    }}
                                    className={`w-2 h-2 rounded-full transition-all ${index === currentPageIndex
                                        ? 'bg-teal-600 w-8'
                                        : 'bg-slate-300 hover:bg-slate-400'
                                        }`}
                                />
                            ))}
                        </div>

                        <button
                            onClick={handleNextPage}
                            disabled={currentPageIndex === visualPages.length - 1}
                            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-semibold transition-all"
                        >
                            Next
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* AI Floating Buttons */}
            <div className="fixed bottom-24 right-6 z-50 flex flex-col gap-3">
                {/* Voice Button - Opens VoiceAssistant */}
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowVoiceAssistant(true)}
                    className="w-14 h-14 rounded-full bg-gradient-to-br from-teal-600 to-teal-500 shadow-xl hover:shadow-2xl flex items-center justify-center"
                    title="Voice Assistant"
                >
                    <Mic size={24} className="text-white" />
                </motion.button>

                {/* Chat Button - Opens AskGloqePill */}
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowAskGloqePill(true)}
                    className="w-14 h-14 rounded-full bg-gradient-to-br from-slate-900 to-slate-800 shadow-xl hover:shadow-2xl flex items-center justify-center relative"
                    title="Ask Gloqe"
                >
                    <MessageSquare size={24} className="text-white" />
                </motion.button>
            </div>

            {/* Voice Assistant Modal (Premium with Google TTS) */}
            <AnimatePresence>
                {showVoiceAssistant && (
                    <VoiceAssistant
                        onClose={() => setShowVoiceAssistant(false)}
                        documentContext={currentPage?.explanation || document?.extractedText?.substring(0, 2000) || `Document: ${document?.title || 'Study Session'}`}
                    />
                )}
            </AnimatePresence>

            {/* Ask Gloqe Pill (Premium AI Chat) */}
            <AnimatePresence>
                {showAskGloqePill && (
                    <AskGloqePill
                        selectedText={currentPage?.coreConcept || currentPage?.keyTopics?.join(', ') || ''}
                        onClose={() => setShowAskGloqePill(false)}
                        documentId={docId}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default StudySession;