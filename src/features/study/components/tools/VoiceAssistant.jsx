// src/components/study/VoiceAssistant.jsx
// 🎙️ PRODUCTION EDITION v2.0 - Enhanced with Auto-Off Detection
// ✨ Smart Conversation End | 🚀 Zero Errors | 🎯 Production Ready

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Volume2, VolumeX, Mic, MicOff, Loader2 } from 'lucide-react';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@shared/config/firebase';
import { useAuth } from '@auth/contexts/AuthContext';
import { geminiModel } from '@shared/config/gemini';
import { textToSpeech, VOICE_OPTIONS } from '@study/services/googleTTS';
import toast from 'react-hot-toast';

// ════════════════════════════════════════════════════════════════════════════════
// 🎯 FAREWELL DETECTION - Auto-close on goodbye
// ════════════════════════════════════════════════════════════════════════════════

const FAREWELL_PHRASES = [
    // Common goodbyes
    'goodbye', 'bye', 'good bye', 'see you', 'see ya',
    // Thanks + end
    'thanks bye', 'thank you bye', 'thanks goodbye',
    // End conversation
    'end conversation', 'stop talking', 'stop listening', 'that\'s all',
    'i\'m done', 'im done', 'we\'re done', 'were done',
    // Polite endings
    'have a good day', 'have a nice day', 'talk to you later', 'catch you later',
    // Exit commands
    'exit', 'quit', 'close', 'stop', 'finish', 'done', 'that\'s it', 'thats it'
];

const detectFarewell = (text) => {
    const lowerText = text.toLowerCase().trim();
    return FAREWELL_PHRASES.some(phrase => lowerText.includes(phrase));
};

// ════════════════════════════════════════════════════════════════════════════════
// 🔊 VOICE ASSISTANT COMPONENT
// ════════════════════════════════════════════════════════════════════════════════

const VoiceAssistant = ({ onClose, documentContext = '' }) => {
    const { user } = useAuth();

    // State
    const [isListening, setIsListening] = useState(true);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [currentTranscript, setCurrentTranscript] = useState('');
    const [lastUserMessage, setLastUserMessage] = useState('');
    const [lastAIMessage, setLastAIMessage] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [conversationHistory, setConversationHistory] = useState([]);
    const [isMuted, setIsMuted] = useState(false);
    const [hasRecognitionError, setHasRecognitionError] = useState(false);
    const [audioError, setAudioError] = useState(null);

    // Refs
    const recognitionRef = useRef(null);
    const audioRef = useRef(null);
    const silenceTimerRef = useRef(null);
    const isProcessingRef = useRef(false);
    const isRecognitionRunningRef = useRef(false);
    const isMountedRef = useRef(true);
    const restartTimeoutRef = useRef(null);
    const farewellDetectedRef = useRef(false);

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🛡️ SAFE STATE SETTER
    // ═══════════════════════════════════════════════════════════════════════════════

    const safeSetState = useCallback((setter, value) => {
        if (isMountedRef.current) {
            setter(value);
        }
    }, []);

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🧹 CLEANUP ALL RESOURCES
    // ═══════════════════════════════════════════════════════════════════════════════

    const cleanupAll = useCallback(() => {
        console.log('🧹 Cleaning up Voice Assistant...');

        // Clear timeouts
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
        }

        if (restartTimeoutRef.current) {
            clearTimeout(restartTimeoutRef.current);
            restartTimeoutRef.current = null;
        }

        // Stop recognition
        if (recognitionRef.current) {
            try {
                recognitionRef.current.onend = null;
                recognitionRef.current.onerror = null;
                recognitionRef.current.onresult = null;
                recognitionRef.current.stop();
            } catch (e) {
                // Silent cleanup
            }
            recognitionRef.current = null;
        }

        // Stop audio
        if (audioRef.current) {
            try {
                audioRef.current.pause();
                audioRef.current.onended = null;
                audioRef.current.onerror = null;
                audioRef.current.src = '';
                audioRef.current = null;
            } catch (e) {
                // Silent cleanup
            }
        }

        isRecognitionRunningRef.current = false;
        isProcessingRef.current = false;
    }, []);

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🎤 RECOGNITION CONTROLS
    // ═══════════════════════════════════════════════════════════════════════════════

    const startRecognition = useCallback(() => {
        if (!isMountedRef.current || !recognitionRef.current || isRecognitionRunningRef.current) {
            return;
        }

        try {
            recognitionRef.current.start();
            isRecognitionRunningRef.current = true;
            safeSetState(setHasRecognitionError, false);
            console.log('🎤 Listening...');
        } catch (error) {
            console.warn('Recognition start failed:', error);
            isRecognitionRunningRef.current = false;

            // Retry after delay
            restartTimeoutRef.current = setTimeout(() => {
                if (isMountedRef.current && isListening && !isProcessingRef.current) {
                    startRecognition();
                }
            }, 1000);
        }
    }, [isListening, safeSetState]);

    const stopRecognition = useCallback(() => {
        if (recognitionRef.current && isRecognitionRunningRef.current) {
            try {
                recognitionRef.current.stop();
            } catch (error) {
                // Ignore stop errors
            }
            isRecognitionRunningRef.current = false;
            console.log('🛑 Stopped listening');
        }
    }, []);

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🚀 INITIALIZE SPEECH RECOGNITION
    // ═══════════════════════════════════════════════════════════════════════════════

    useEffect(() => {
        isMountedRef.current = true;
        console.log('🚀 Voice Assistant Starting...');

        if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
            toast.error('Voice recognition not supported in this browser');
            safeSetState(setHasRecognitionError, true);
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        const recognition = recognitionRef.current;

        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.maxAlternatives = 1;

        let finalTranscript = '';

        recognition.onstart = () => {
            if (!isMountedRef.current) return;
            isRecognitionRunningRef.current = true;
            safeSetState(setHasRecognitionError, false);
        };

        recognition.onresult = (event) => {
            if (!isMountedRef.current) return;

            let interimTranscript = '';
            finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript + ' ';
                } else {
                    interimTranscript += transcript;
                }
            }

            safeSetState(setCurrentTranscript, finalTranscript + interimTranscript);

            // Clear existing silence timer
            if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
            }

            // Auto-send after 1.5s of silence
            if (finalTranscript.trim() && !isProcessingRef.current) {
                silenceTimerRef.current = setTimeout(() => {
                    if (isMountedRef.current && finalTranscript.trim().length > 2) {
                        handleAutoSend(finalTranscript.trim());
                        finalTranscript = '';
                        safeSetState(setCurrentTranscript, '');
                    }
                }, 1500);
            }
        };

        recognition.onerror = (event) => {
            if (!isMountedRef.current) return;

            console.warn('Speech recognition error:', event.error);
            isRecognitionRunningRef.current = false;
            safeSetState(setHasRecognitionError, true);

            // Restart on recoverable errors
            const recoverableErrors = ['no-speech', 'audio-capture', 'network'];
            if (recoverableErrors.includes(event.error)) {
                restartTimeoutRef.current = setTimeout(() => {
                    if (isMountedRef.current && isListening && !isProcessingRef.current) {
                        startRecognition();
                    }
                }, 1000);
            }
        };

        recognition.onend = () => {
            if (!isMountedRef.current) return;

            isRecognitionRunningRef.current = false;

            // Auto-restart if should be listening
            if (isListening && !isProcessingRef.current && !hasRecognitionError && !farewellDetectedRef.current) {
                restartTimeoutRef.current = setTimeout(() => {
                    if (isMountedRef.current && !isRecognitionRunningRef.current) {
                        startRecognition();
                    }
                }, 500);
            }
        };

        // Start listening
        if (isListening) {
            startRecognition();
        }

        return () => {
            console.log('🔚 Component unmounting...');
            isMountedRef.current = false;
            cleanupAll();
        };
    }, [isListening, cleanupAll, startRecognition, safeSetState, hasRecognitionError]);

    // ═══════════════════════════════════════════════════════════════════════════════
    // 💬 HANDLE USER MESSAGE WITH FAREWELL DETECTION
    // ═══════════════════════════════════════════════════════════════════════════════

    const handleAutoSend = useCallback(async (text) => {
        if (!text.trim() || isProcessingRef.current || !isMountedRef.current) {
            return;
        }

        console.log('💬 User said:', text);
        isProcessingRef.current = true;
        safeSetState(setIsProcessing, true);
        safeSetState(setLastUserMessage, text);
        safeSetState(setIsListening, false);
        safeSetState(setAudioError, null);

        // Stop recognition
        stopRecognition();

        // ✨ CHECK FOR FAREWELL
        const isFarewell = detectFarewell(text);

        const newHistory = [...conversationHistory, { role: 'user', content: text }];
        safeSetState(setConversationHistory, newHistory);

        try {
            const conversationContext = newHistory
                .slice(-6)
                .map(msg => `${msg.role === 'user' ? 'User' : 'Gloqe'}: ${msg.content}`)
                .join('\n');

            // If farewell detected, generate goodbye response
            let prompt;
            if (isFarewell) {
                prompt = `You are Gloqe, a friendly AI study companion. The user is saying goodbye.

Respond with a warm, brief farewell (10-15 words max). Sound natural and encouraging.

User: ${text}

Respond:`;
            } else {
                prompt = `You are Gloqe, a warm and enthusiastic AI study companion. Speak naturally like a helpful friend.

Guidelines:
- Keep responses SHORT (1-2 sentences, under 25 words)
- Sound natural and conversational
- Use contractions (I'm, you'll, let's)
- Be encouraging and warm
- No markdown or formatting

Study material context:
${documentContext.substring(0, 800)}

Conversation:
${conversationContext}

User: ${text}

Respond naturally:`;
            }

            const result = await geminiModel.generateContent(prompt);
            const aiResponse = result.response.text().trim();

            console.log('🤖 Gloqe:', aiResponse);
            safeSetState(setLastAIMessage, aiResponse);
            safeSetState(setConversationHistory, [...newHistory, { role: 'assistant', content: aiResponse }]);

            // Speak response
            if (!isMuted && isMountedRef.current) {
                await speakText(aiResponse);
            } else if (isMountedRef.current) {
                setTimeout(() => {
                    safeSetState(setLastAIMessage, '');
                }, 3000);
            }

            // Log interaction
            if (user?.uid) {
                const userRef = doc(db, 'users', user.uid);
                updateDoc(userRef, {
                    voiceInteractions: increment(1)
                }).catch(err => console.error('Failed to log interaction:', err));
            }

            // ✨ AUTO-CLOSE ON FAREWELL
            if (isFarewell && isMountedRef.current) {
                farewellDetectedRef.current = true;
                console.log('👋 Farewell detected, auto-closing in 2s...');

                setTimeout(() => {
                    if (isMountedRef.current) {
                        toast.success('Voice chat ended. See you soon! 👋', { duration: 2000 });
                        cleanupAll();
                        onClose();
                    }
                }, 2000); // Wait 2s after AI speaks
                return; // Don't resume listening
            }

        } catch (error) {
            console.error('❌ AI Error:', error);
            if (!isMountedRef.current) return;

            const errorMsg = "Hmm, I didn't catch that. Could you repeat?";
            safeSetState(setLastAIMessage, errorMsg);
            if (!isMuted) {
                await speakText(errorMsg);
            }
        } finally {
            if (isMountedRef.current && !farewellDetectedRef.current) {
                isProcessingRef.current = false;
                safeSetState(setIsProcessing, false);
                safeSetState(setLastUserMessage, '');
                safeSetState(setCurrentTranscript, '');

                // Resume listening after delay
                setTimeout(() => {
                    if (isMountedRef.current && !isProcessingRef.current) {
                        safeSetState(setIsListening, true);
                    }
                }, 800);
            }
        }
    }, [conversationHistory, documentContext, isMuted, stopRecognition, safeSetState, user, onClose, cleanupAll]);

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🔊 TEXT-TO-SPEECH
    // ═══════════════════════════════════════════════════════════════════════════════

    const speakText = useCallback(async (text) => {
        if (!isMountedRef.current || !text) return;

        return new Promise(async (resolve) => {
            try {
                safeSetState(setIsSpeaking, true);
                safeSetState(setAudioError, null);

                // Stop any existing audio
                if (audioRef.current) {
                    audioRef.current.pause();
                    audioRef.current = null;
                }

                console.log('🔊 Generating voice...');

                // Generate TTS with male voice
                const audioDataUrl = await textToSpeech(text, {
                    ...VOICE_OPTIONS.MALE_NEURAL_D,
                    speakingRate: 1.1,
                    pitch: -2.0,
                    volume: 0.0
                });

                if (!isMountedRef.current) {
                    resolve();
                    return;
                }

                // Create audio element
                const audio = new Audio();
                audioRef.current = audio;

                // Wait for audio to load
                await new Promise((loadResolve, loadReject) => {
                    audio.addEventListener('canplaythrough', loadResolve, { once: true });
                    audio.addEventListener('error', (e) => {
                        console.error('Audio load error:', e);
                        loadReject(new Error('Audio failed to load'));
                    }, { once: true });

                    audio.src = audioDataUrl;
                });

                // Set up event handlers
                audio.onended = () => {
                    console.log('✅ Finished speaking');
                    if (isMountedRef.current) {
                        safeSetState(setIsSpeaking, false);
                        setTimeout(() => {
                            safeSetState(setLastAIMessage, '');
                        }, 500);
                    }
                    resolve();
                };

                audio.onerror = (e) => {
                    console.error('❌ Audio error:', e);
                    if (isMountedRef.current) {
                        safeSetState(setIsSpeaking, false);
                        safeSetState(setAudioError, 'Playback failed');
                        toast.error('Audio playback failed');
                    }
                    resolve();
                };

                // Play audio
                await audio.play();
                console.log('▶️ Speaking...');

            } catch (error) {
                console.error('❌ TTS Error:', error);
                if (!isMountedRef.current) {
                    resolve();
                    return;
                }

                safeSetState(setIsSpeaking, false);
                safeSetState(setAudioError, error.message);

                // Enhanced error messaging
                if (error.message.includes('403')) {
                    toast.error('Voice API access denied');
                } else if (error.message.includes('429')) {
                    toast.error('Voice quota exceeded');
                } else if (error.message.includes('network')) {
                    toast.error('Network error');
                } else {
                    toast.error('Voice synthesis failed');
                }

                // Show text briefly even if audio fails
                setTimeout(() => {
                    if (isMountedRef.current) {
                        safeSetState(setLastAIMessage, '');
                    }
                }, 3000);

                resolve();
            }
        });
    }, [safeSetState]);

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🎛️ CONTROLS
    // ═══════════════════════════════════════════════════════════════════════════════

    const toggleMute = useCallback(() => {
        if (isSpeaking && audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
            safeSetState(setIsSpeaking, false);
        }
        const newMutedState = !isMuted;
        safeSetState(setIsMuted, newMutedState);

        toast.success(newMutedState ? '🔇 Voice muted' : '🔊 Voice enabled', {
            duration: 1000,
            style: {
                background: '#1f2937',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 'bold'
            }
        });
    }, [isMuted, isSpeaking, safeSetState]);

    const toggleListening = useCallback(() => {
        if (isListening) {
            stopRecognition();
            safeSetState(setIsListening, false);
            toast.success('🎤 Paused', { duration: 1000 });
        } else {
            safeSetState(setIsListening, true);
            toast.success('🎤 Listening', { duration: 1000 });
        }
    }, [isListening, stopRecognition, safeSetState]);

    const handleClose = useCallback(() => {
        cleanupAll();
        onClose();
        toast.success('Voice chat ended 👋', { duration: 2000 });
    }, [onClose, cleanupAll]);

    const handleBackgroundClick = useCallback((e) => {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    }, [handleClose]);

    // ═══════════════════════════════════════════════════════════════════════════════
    // ⌨️ KEYBOARD SHORTCUTS
    // ═══════════════════════════════════════════════════════════════════════════════

    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                handleClose();
            }
        };

        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [handleClose]);

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🎨 RENDER: ERROR STATE
    // ═══════════════════════════════════════════════════════════════════════════════

    if (hasRecognitionError && !isRecognitionRunningRef.current && isListening) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-gradient-to-br from-gray-950 via-black to-gray-950 z-50 flex items-center justify-center"
                onClick={handleBackgroundClick}
            >
                <div className="text-center space-y-6 p-8 bg-white/5 rounded-2xl backdrop-blur-xl border border-white/10 max-w-md">
                    <div className="text-red-400 text-lg font-semibold">Voice Recognition Unavailable</div>
                    <div className="text-gray-400 text-sm">
                        Your browser doesn't support voice recognition or microphone access was denied.
                        Please check your microphone permissions and try again.
                    </div>
                    <button
                        onClick={handleClose}
                        className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-medium"
                    >
                        Close Assistant
                    </button>
                </div>
            </motion.div>
        );
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🎨 RENDER: MAIN UI
    // ═══════════════════════════════════════════════════════════════════════════════

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gradient-to-br from-gray-950 via-black to-gray-950 z-50 flex items-center justify-center"
            onClick={handleBackgroundClick}
        >
            {/* Close Button */}
            <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleClose}
                className="absolute top-6 right-6 p-3 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all backdrop-blur-xl border border-white/10 shadow-xl z-10"
            >
                <X size={24} />
            </motion.button>

            {/* Mute Button */}
            <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleMute}
                className={`absolute top-6 left-6 p-3 rounded-full transition-all backdrop-blur-xl border shadow-xl z-10 ${isMuted
                        ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'
                    }`}
            >
                {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
            </motion.button>

            {/* Listening Toggle */}
            <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleListening}
                className={`absolute bottom-6 left-6 p-3 rounded-full transition-all backdrop-blur-xl border shadow-xl z-10 ${isListening
                        ? 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20'
                        : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20'
                    }`}
            >
                {isListening ? <Mic size={24} /> : <MicOff size={24} />}
            </motion.button>

            <div className="flex flex-col items-center justify-center gap-12">

                {/* Voice Orb */}
                <div className="relative">
                    {/* Pulsing rings */}
                    <AnimatePresence>
                        {(isListening || isSpeaking) && (
                            <>
                                <motion.div
                                    initial={{ scale: 1, opacity: 0 }}
                                    animate={{ scale: 2.5, opacity: 0 }}
                                    exit={{ scale: 1, opacity: 0 }}
                                    transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
                                    className="absolute inset-0 rounded-full bg-gradient-to-r from-gray-400/20 to-white/20"
                                />
                                <motion.div
                                    initial={{ scale: 1, opacity: 0 }}
                                    animate={{ scale: 2, opacity: 0 }}
                                    exit={{ scale: 1, opacity: 0 }}
                                    transition={{ repeat: Infinity, duration: 2, ease: "easeOut", delay: 0.5 }}
                                    className="absolute inset-0 rounded-full bg-gradient-to-r from-gray-500/30 to-white/30"
                                />
                            </>
                        )}
                    </AnimatePresence>

                    {/* Main orb */}
                    <motion.div
                        animate={{
                            scale: isSpeaking ? [1, 1.15, 1] : isListening ? [1, 1.05, 1] : 1,
                        }}
                        transition={{
                            repeat: (isSpeaking || isListening) ? Infinity : 0,
                            duration: isSpeaking ? 0.8 : 2,
                            ease: "easeInOut"
                        }}
                        className={`relative w-48 h-48 rounded-full flex items-center justify-center transition-all duration-500 ${isSpeaking
                                ? 'bg-gradient-to-br from-blue-200 via-white to-blue-300 shadow-2xl shadow-blue-500/50'
                                : isListening
                                    ? 'bg-gradient-to-br from-green-600 via-green-500 to-green-400 shadow-2xl shadow-green-500/50'
                                    : 'bg-gradient-to-br from-gray-800 via-gray-700 to-gray-600 shadow-xl'
                            }`}
                    >
                        {/* Shine effect */}
                        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/20 to-transparent" />

                        {/* Status icon */}
                        {!isListening && !isSpeaking && !isProcessing && (
                            <div className="text-white/60 text-sm font-medium text-center">
                                Ready
                            </div>
                        )}

                        {/* Processing spinner */}
                        {isProcessing && (
                            <Loader2 size={48} className="text-white animate-spin" />
                        )}

                        {/* Waveform animation */}
                        {(isListening || isSpeaking) && !isProcessing && (
                            <div className="absolute inset-0 flex items-center justify-center gap-1.5">
                                {[...Array(5)].map((_, i) => (
                                    <motion.div
                                        key={i}
                                        animate={{
                                            height: isSpeaking ? [20, 60, 20] : [10, 40, 10],
                                        }}
                                        transition={{
                                            repeat: Infinity,
                                            duration: 0.8,
                                            delay: i * 0.1,
                                            ease: "easeInOut"
                                        }}
                                        className={`w-1.5 rounded-full ${isSpeaking ? 'bg-blue-800' : 'bg-white'
                                            }`}
                                    />
                                ))}
                            </div>
                        )}
                    </motion.div>
                </div>

                {/* Text Display */}
                <div className="max-w-2xl text-center space-y-4 px-6">
                    {/* User message */}
                    <AnimatePresence mode="wait">
                        {(currentTranscript || lastUserMessage) && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="text-gray-400 text-lg font-medium min-h-[28px]"
                            >
                                {currentTranscript || lastUserMessage}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* AI response */}
                    <AnimatePresence mode="wait">
                        {lastAIMessage && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="text-white text-2xl font-semibold leading-relaxed"
                            >
                                {lastAIMessage}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Audio Error */}
                    <AnimatePresence>
                        {audioError && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="text-red-400 text-sm font-medium"
                            >
                                Audio Error: {audioError}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Status indicator */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={isProcessing ? 'processing' : isSpeaking ? 'speaking' : isListening ? 'listening' : 'idle'}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="text-sm text-gray-500 font-medium"
                        >
                            {isProcessing ? (
                                <span className="flex items-center justify-center gap-2">
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                                        className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full"
                                    />
                                    Thinking...
                                </span>
                            ) : isSpeaking ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                                    Gloqe is speaking
                                </span>
                            ) : isListening ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                    Listening... (say "bye" to end)
                                </span>
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                                    Ready to listen
                                </span>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </motion.div>
    );
};

export default VoiceAssistant;
