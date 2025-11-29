// src/components/study/AskGloqePill.jsx - WITH DAILY XP LIMITS
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, Send, Loader, Zap, Lightbulb, 
    FileText, Network, CheckCircle, Trash2, Copy, Check
} from 'lucide-react';
import { generateAIResponse } from '@/utils/vertexAI';
import { awardDailyXP, DAILY_ACTIONS } from '@/services/gamificationService';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import logoImage from '@/assets/logo/logo.svg';

const AskGloqePill = ({ selectedText, position, onClose, documentId }) => {
    const { user } = useAuth();
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [chatHistory, setChatHistory] = useState([]);
    const [adjustedPosition, setAdjustedPosition] = useState({ right: '20px', top: '0px' });
    const [copiedId, setCopiedId] = useState(null);
    const [xpEarnedToday, setXpEarnedToday] = useState(false);
    const inputRef = useRef(null);
    const chatEndRef = useRef(null);
    const pillRef = useRef(null);

    const quickPrompts = useMemo(() => [
        { id: 'explain', icon: Lightbulb, text: 'Explain', prompt: `Explain this in simple terms: "${selectedText}"` },
        { id: 'summarize', icon: FileText, text: 'Summarize', prompt: `Summarize this: "${selectedText}"` },
        { id: 'mindmap', icon: Network, text: 'Mind Map', prompt: `Create a mind map for: "${selectedText}"` },
        { id: 'quiz', icon: CheckCircle, text: 'Quiz', prompt: `Generate 3 quiz questions about: "${selectedText}"` },
    ], [selectedText]);

    useEffect(() => {
        let timeoutId;
        
        const adjustPosition = () => {
            clearTimeout(timeoutId);
            
            timeoutId = setTimeout(() => {
                const pillHeight = 420;
                const windowHeight = window.innerHeight;
                const windowWidth = window.innerWidth;
                
                let top = position.y;
                let right = windowWidth < 400 ? 10 : 20;

                if (top + pillHeight > windowHeight) {
                    top = Math.max(20, windowHeight - pillHeight - 20);
                }
                if (top < 20) {
                    top = 20;
                }

                setAdjustedPosition({ right: `${right}px`, top: `${top}px` });
            }, 100);
        };

        adjustPosition();
        window.addEventListener('resize', adjustPosition);
        
        return () => {
            clearTimeout(timeoutId);
            window.removeEventListener('resize', adjustPosition);
        };
    }, [position.y]);

    useEffect(() => {
        const timer = setTimeout(() => {
            inputRef.current?.focus();
        }, 100);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory]);

    const generateMessageId = useCallback((prefix) => {
        return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    }, []);

    const handleSend = useCallback(async (customPrompt = null) => {
        const userInput = customPrompt || message.trim();
        if (!userInput || loading || !user?.uid) return;

        const displayContent = customPrompt 
            ? quickPrompts.find(p => p.prompt === customPrompt)?.text 
            : userInput;

        const userMessage = {
            id: generateMessageId('user'),
            role: 'user',
            content: displayContent,
            timestamp: Date.now()
        };

        setChatHistory(prev => [...prev, userMessage]);
        setMessage('');
        setLoading(true);

        try {
            let finalPrompt;
            if (customPrompt) {
                finalPrompt = customPrompt;
            } else if (selectedText) {
                finalPrompt = `Based on this text: "${selectedText}"\n\nAnswer this question: ${userInput}`;
            } else {
                finalPrompt = userInput;
            }

            const aiResponse = await generateAIResponse(finalPrompt, documentId);
            
            const aiMessage = {
                id: generateMessageId('ai'),
                role: 'ai',
                content: aiResponse,
                timestamp: Date.now()
            };

            setChatHistory(prev => [...prev, aiMessage]);

            // ✅ AWARD XP ONLY ONCE PER DAY
            if (!xpEarnedToday) {
                const result = await awardDailyXP(user.uid, DAILY_ACTIONS.USE_AI_CHAT, 'Used AI Chat');
                
                if (result.success) {
                    setXpEarnedToday(true);
                    toast.success(`✨ +${result.xpGained} XP!`, {
                        duration: 2000,
                        icon: '🎉',
                        style: {
                            background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
                            color: '#fff',
                            fontWeight: 'bold',
                            borderRadius: '12px',
                            padding: '12px 20px',
                        },
                    });
                } else if (result.alreadyEarned) {
                    setXpEarnedToday(true);
                    // Don't show "already earned" toast on first message
                }
            }
        } catch (error) {
            console.error('AI Error:', error);
            
            const errorMessage = {
                id: generateMessageId('error'),
                role: 'ai',
                content: `Sorry, I encountered an error: ${error.message}. Please try again.`,
                timestamp: Date.now(),
                isError: true
            };
            setChatHistory(prev => [...prev, errorMessage]);
            
            toast.error('Failed to get response', {
                duration: 2000,
                style: {
                    background: '#1f2937',
                    color: '#fff',
                    fontWeight: 'bold',
                    borderRadius: '12px',
                },
            });
        } finally {
            setLoading(false);
        }
    }, [message, loading, user, selectedText, documentId, quickPrompts, generateMessageId, xpEarnedToday]);

    const handleKeyPress = useCallback((e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }, [handleSend]);

    const handleClearChat = useCallback(() => {
        setChatHistory([]);
        toast.success('Chat cleared', {
            duration: 1000,
            icon: '🗑️',
            style: {
                background: '#1f2937',
                color: '#fff',
                fontWeight: 'bold',
                borderRadius: '12px',
                padding: '10px 16px',
            },
        });
    }, []);

    const handleCopyMessage = useCallback((content, messageId) => {
        navigator.clipboard.writeText(content).then(() => {
            setCopiedId(messageId);
            toast.success('Copied!', {
                duration: 1000,
                icon: '📋',
                style: {
                    background: '#059669',
                    color: '#fff',
                    fontWeight: 'bold',
                    borderRadius: '12px',
                    padding: '8px 16px',
                },
            });
            setTimeout(() => setCopiedId(null), 2000);
        }).catch(err => {
            console.error('Copy failed:', err);
            toast.error('Failed to copy');
        });
    }, []);

    const messageComponents = useMemo(() => 
        chatHistory.map((msg) => (
            <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group`}
            >
                <div className="relative">
                    <div className={`max-w-[85%] rounded-xl px-3 py-2.5 shadow-sm ${
                        msg.role === 'user'
                            ? 'bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white'
                            : msg.isError
                            ? 'bg-gradient-to-br from-red-50 to-red-100 border border-red-300 text-red-900'
                            : 'bg-gradient-to-br from-white via-gray-50 to-white border border-gray-300 text-gray-900'
                    }`}>
                        <p className="text-xs font-medium leading-relaxed whitespace-pre-wrap">
                            {msg.content}
                        </p>
                    </div>
                    
                    {msg.role === 'ai' && !msg.isError && (
                        <button
                            onClick={() => handleCopyMessage(msg.content, msg.id)}
                            className="absolute -bottom-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-lg shadow-lg hover:shadow-xl"
                            title="Copy message"
                            aria-label="Copy message"
                        >
                            {copiedId === msg.id ? <Check size={11} /> : <Copy size={11} />}
                        </button>
                    )}
                </div>
            </motion.div>
        ))
    , [chatHistory, copiedId, handleCopyMessage]);

    return (
        <AnimatePresence mode="wait">
            {position && (
                <motion.div
                    key="ask-gloqe-pill"
                    ref={pillRef}
                    initial={{ opacity: 0, scale: 0.95, x: 20 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95, x: 20 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="fixed z-[100] w-[340px]"
                    style={adjustedPosition}
                >
                    <div className="bg-gradient-to-br from-blue-600 via-gray-800 to-black p-0.5 rounded-2xl shadow-2xl">
                        <div className="bg-white rounded-[15px] overflow-hidden">
                            {/* Header */}
                            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-gray-900 via-blue-900 to-gray-900 border-b-2 border-blue-500/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 p-1.5 shadow-lg">
                                        <img src={logoImage} alt="Gloqe Logo" className="w-full h-full" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-black text-white text-base tracking-tight">Ask Gloqe</span>
                                        <span className="text-[9px] text-blue-300 font-semibold">AI Assistant</span>
                                    </div>
                                    {/* ✅ SHOW XP BADGE - Updates based on if earned today */}
                                    <span className={`px-2 py-1 rounded-full text-[10px] font-black text-white flex items-center gap-1 shadow-md ${
                                        xpEarnedToday 
                                            ? 'bg-gradient-to-r from-gray-500 to-gray-600' 
                                            : 'bg-gradient-to-r from-blue-500 to-blue-600'
                                    }`}>
                                        <Zap size={10} fill="white" />
                                        {xpEarnedToday ? '✓ XP' : '+3 XP'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    {chatHistory.length > 0 && (
                                        <button
                                            onClick={handleClearChat}
                                            className="p-1.5 hover:bg-white/10 rounded-lg transition-all"
                                            title="Clear chat"
                                            aria-label="Clear chat"
                                        >
                                            <Trash2 size={14} className="text-white" />
                                        </button>
                                    )}
                                    <button
                                        onClick={onClose}
                                        className="p-1.5 hover:bg-white/10 rounded-lg transition-all"
                                        aria-label="Close"
                                    >
                                        <X size={16} className="text-white" />
                                    </button>
                                </div>
                            </div>

                            {/* Chat Area */}
                            <div className="h-[250px] overflow-y-auto p-3 space-y-2.5 bg-gradient-to-b from-gray-50 via-white to-gray-50 custom-scrollbar">
                                {chatHistory.length === 0 ? (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.3 }}
                                        className="text-center py-8"
                                    >
                                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 flex items-center justify-center mx-auto mb-3 shadow-xl">
                                            <img src={logoImage} alt="AI" className="w-8 h-8" />
                                        </div>
                                        <p className="text-sm font-black text-gray-900 mb-1">
                                            AI Assistant Ready
                                        </p>
                                        <p className="text-xs text-gray-600 font-medium">
                                            {selectedText ? 'Ask about selected text' : 'Ask anything'}
                                        </p>
                                        {xpEarnedToday && (
                                            <p className="text-[10px] text-gray-500 mt-2 italic">
                                                Daily XP already earned ✓
                                            </p>
                                        )}
                                    </motion.div>
                                ) : (
                                    messageComponents
                                )}
                                
                                {loading && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="flex justify-start"
                                    >
                                        <div className="bg-gradient-to-r from-blue-50 to-white border border-blue-200 rounded-xl px-4 py-2.5 shadow-md">
                                            <div className="flex items-center gap-2">
                                                <Loader size={14} className="animate-spin text-blue-700" />
                                                <span className="text-xs text-blue-900 font-bold">Thinking...</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                                
                                <div ref={chatEndRef} />
                            </div>

                            {/* Quick Prompts */}
                            {chatHistory.length === 0 && selectedText && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="px-3 py-2.5 bg-gradient-to-r from-gray-50 to-white border-t border-gray-200"
                                >
                                    <p className="text-[10px] font-black text-gray-700 uppercase tracking-wide mb-2">
                                        Quick Actions
                                    </p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {quickPrompts.map((prompt) => (
                                            <button
                                                key={prompt.id}
                                                onClick={() => handleSend(prompt.prompt)}
                                                disabled={loading}
                                                className="flex items-center gap-2 px-3 py-2 bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 border border-blue-300 hover:border-blue-600 rounded-lg transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                                            >
                                                <prompt.icon size={14} className="text-blue-700 flex-shrink-0" />
                                                <span className="text-xs font-bold text-blue-900 truncate">
                                                    {prompt.text}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {/* Input Area */}
                            <div className="px-3 py-3 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-t-2 border-blue-500/50">
                                <div className="flex items-end gap-2">
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        placeholder="Ask anything..."
                                        disabled={loading}
                                        className="flex-1 px-4 py-2.5 bg-white border-2 border-gray-300 focus:border-blue-500 rounded-lg focus:outline-none text-sm font-semibold text-gray-900 placeholder-gray-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-all shadow-sm focus:shadow-md"
                                        aria-label="Message input"
                                    />
                                    <button
                                        onClick={() => handleSend()}
                                        disabled={!message.trim() || loading}
                                        className="p-2.5 bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex-shrink-0"
                                        aria-label="Send message"
                                    >
                                        <Send size={16} />
                                    </button>
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1.5 font-medium text-center">
                                    Press Enter to send • {selectedText ? 'Answers about selection' : 'General questions'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <style>{`
                        .custom-scrollbar::-webkit-scrollbar {
                            width: 5px;
                        }
                        .custom-scrollbar::-webkit-scrollbar-track {
                            background: linear-gradient(to bottom, #f9fafb, #f3f4f6);
                        }
                        .custom-scrollbar::-webkit-scrollbar-thumb {
                            background: linear-gradient(to bottom, #3b82f6, #1d4ed8);
                            border-radius: 10px;
                        }
                        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                            background: linear-gradient(to bottom, #2563eb, #1e40af);
                        }
                    `}</style>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default AskGloqePill;
