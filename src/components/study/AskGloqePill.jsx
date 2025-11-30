// src/components/study/AskGloqePill.jsx - GRASSMORPHISM DESIGN 🌿
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, Send, Loader, Zap, Lightbulb, 
    FileText, Network, CheckCircle, Trash2, Copy, Check,
    Sparkles
} from 'lucide-react';
import { generateAIResponse } from '@/utils/vertexAI';
import { awardDailyXP, DAILY_ACTIONS } from '@/services/gamificationService';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import logoImage from '@/assets/logo/logo.svg';
import logoxImage from '@/assets/logo/logox.png'; // ✅ Added logox.png import


const AskGloqePill = ({ selectedText, onClose, documentId }) => {
    const { user } = useAuth();
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [chatHistory, setChatHistory] = useState([]);
    const [copiedId, setCopiedId] = useState(null);
    const [xpEarnedToday, setXpEarnedToday] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [typingText, setTypingText] = useState('');
    const [currentTypingIndex, setCurrentTypingIndex] = useState(0);
    const [showWelcome, setShowWelcome] = useState(true);
    
    const inputRef = useRef(null);
    const chatEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);


    const quickPrompts = useMemo(() => [
        { id: 'explain', icon: Lightbulb, text: 'Explain', prompt: `Explain: "${selectedText}"`, gradient: 'from-gray-200 to-gray-400' },
        { id: 'breakdown', icon: () => <img src={logoxImage} alt="Analyze" className="w-5 h-5" />, text: 'Analyze', prompt: `Analyze: "${selectedText}"`, gradient: 'from-slate-200 to-slate-400' },
        { id: 'summarize', icon: FileText, text: 'Summarize', prompt: `Summarize: "${selectedText}"`, gradient: 'from-neutral-200 to-neutral-400' },
        { id: 'quiz', icon: CheckCircle, text: 'Quiz Me', prompt: `Quiz: "${selectedText}"`, gradient: 'from-stone-200 to-stone-400' },
    ], [selectedText]);


    useEffect(() => {
        const timer = setTimeout(() => inputRef.current?.focus(), 300);
        return () => clearTimeout(timer);
    }, []);


    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory, loading]);


    useEffect(() => {
        if (isTyping && typingText) {
            if (currentTypingIndex < typingText.length) {
                typingTimeoutRef.current = setTimeout(() => {
                    setCurrentTypingIndex(prev => prev + 1);
                }, 20);
            } else {
                setIsTyping(false);
            }
        }
        return () => clearTimeout(typingTimeoutRef.current);
    }, [isTyping, typingText, currentTypingIndex]);


    const generateMessageId = useCallback(() => {
        return `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }, []);


    const handleSend = useCallback(async (customPrompt = null) => {
        const userInput = customPrompt || message.trim();
        if (!userInput || loading || !user?.uid) return;


        const displayContent = customPrompt 
            ? quickPrompts.find(p => p.prompt === customPrompt)?.text 
            : userInput;


        const userMessage = {
            id: generateMessageId(),
            role: 'user',
            content: displayContent,
            fullContent: userInput,
            timestamp: Date.now()
        };


        setChatHistory(prev => [...prev, userMessage]);
        setMessage('');
        setLoading(true);
        setShowWelcome(false);


        try {
            let finalPrompt;
            if (customPrompt) {
                finalPrompt = customPrompt;
            } else if (selectedText) {
                finalPrompt = `Context: "${selectedText}"\n\nQuestion: ${userInput}`;
            } else {
                finalPrompt = userInput;
            }


            const aiResponse = await generateAIResponse(finalPrompt, documentId);
            
            setIsTyping(true);
            setTypingText(aiResponse);
            setCurrentTypingIndex(0);


            setTimeout(async () => {
                const aiMessage = {
                    id: generateMessageId(),
                    role: 'ai',
                    content: aiResponse,
                    timestamp: Date.now()
                };


                setChatHistory(prev => [...prev, aiMessage]);
                setIsTyping(false);
                setTypingText('');
                setCurrentTypingIndex(0);


                if (!xpEarnedToday) {
                    try {
                        const result = await awardDailyXP(user.uid, DAILY_ACTIONS.USE_AI_CHAT, 'AI Chat');
                        if (result.success) {
                            setXpEarnedToday(true);
                            toast.success(`+${result.xpGained} XP! 🎉`);
                        }
                    } catch (e) {}
                }
            }, Math.min(aiResponse.length * 20, 2000));


        } catch (error) {
            setIsTyping(false);
            setChatHistory(prev => [...prev, {
                id: generateMessageId(),
                role: 'ai',
                content: `Connection issue. Please try again.`,
                timestamp: Date.now(),
                isError: true
            }]);
            toast.error('Connection failed');
        } finally {
            setLoading(false);
        }
    }, [message, loading, user, selectedText, documentId, quickPrompts, xpEarnedToday, generateMessageId]);


    const handleKeyPress = useCallback((e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }, [handleSend]);


    const handleClearChat = useCallback(() => {
        setChatHistory([]);
        setShowWelcome(true);
        toast.success('Cleared!');
    }, []);


    const handleCopyMessage = useCallback((content, messageId) => {
        navigator.clipboard.writeText(content).then(() => {
            setCopiedId(messageId);
            toast.success('Copied!');
            setTimeout(() => setCopiedId(null), 2000);
        });
    }, []);


    return (
        <AnimatePresence mode="wait">
            <motion.div
                initial={{ x: 450, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 450, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 280, damping: 25 }}
                className="fixed top-0 right-0 h-screen w-[460px] z-50 flex flex-col"
            >
                {/* 🌿 GRASSMORPHISM BACKGROUND */}
                <div className="absolute inset-0 overflow-hidden">
                    {/* White-Silver-Gray gradient base */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white via-gray-50 to-slate-200"></div>
                    
                    {/* Soft grassmorphism blobs */}
                    <motion.div
                        animate={{ 
                            scale: [1, 1.1, 1],
                            opacity: [0.4, 0.6, 0.4],
                            x: [0, 20, 0],
                            y: [0, -15, 0]
                        }}
                        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute -top-20 -right-20 w-80 h-80 bg-gradient-to-br from-gray-300/40 to-slate-400/30 rounded-full blur-2xl"
                    ></motion.div>
                    
                    <motion.div
                        animate={{ 
                            scale: [1.1, 1, 1.1],
                            opacity: [0.3, 0.5, 0.3],
                            x: [0, -15, 0],
                            y: [0, 20, 0]
                        }}
                        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute -bottom-32 -left-20 w-96 h-96 bg-gradient-to-tr from-slate-300/30 to-gray-400/20 rounded-full blur-2xl"
                    ></motion.div>


                    {/* Subtle noise texture for grassmorphism depth */}
                    <div className="absolute inset-0 opacity-[0.02] bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url%28%23noiseFilter%29%22/%3E%3C/svg%3E')]"></div>
                </div>


                {/* Main grassmorphism container */}
                <div className="relative h-full backdrop-blur-2xl bg-white/30 border-l border-white/40 shadow-2xl flex flex-col overflow-hidden">
                    {/* Subtle border glow */}
                    <div className="absolute inset-0 border border-white/20 pointer-events-none"></div>
                    
                    {/* 🎨 HEADER - Grassmorphism */}
                    <div className="relative px-6 py-5 overflow-hidden">
                        <div className="absolute inset-0 bg-white/40 backdrop-blur-xl border-b border-white/30"></div>
                        
                        {/* Subtle texture */}
                        <div className="absolute inset-0 opacity-10 bg-gradient-to-r from-gray-300 via-transparent to-gray-300"></div>
                        
                        <div className="relative flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {/* ✅ CHANGED: logox.png instead of Brain icon */}
                                <motion.div
                                    whileHover={{ scale: 1.1, rotate: 5 }}
                                    transition={{ type: "spring", stiffness: 300 }}
                                    className="w-16 h-16 flex items-center justify-center"
                                >
                                    <img src={logoxImage} alt="Gloqe" className="w-12 h-12 drop-shadow-lg" />
                                </motion.div>
                                
                                <div>
                                    <h2 className="font-black text-xl text-gray-800 drop-shadow-sm">
                                        Gloqe AI
                                    </h2>
                                    <p className="text-gray-600 text-xs font-semibold">STUDY ASSISTANT</p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                {!xpEarnedToday && (
                                    <motion.div
                                        whileHover={{ scale: 1.05 }}
                                        className="px-3 py-2 bg-white/60 backdrop-blur-md border border-white/40 rounded-lg text-gray-800 text-xs font-black flex items-center gap-1.5 shadow-lg"
                                    >
                                        <Zap size={14} className="text-gray-700" />
                                        <span>+5 XP</span>
                                    </motion.div>
                                )}
                                
                                {chatHistory.length > 0 && (
                                    <motion.button
                                        whileHover={{ scale: 1.1, rotate: 90 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={handleClearChat}
                                        className="p-2.5 bg-white/50 hover:bg-white/70 backdrop-blur-xl rounded-lg transition-all border border-white/40 shadow-lg"
                                    >
                                        <Trash2 size={18} className="text-gray-700" />
                                    </motion.button>
                                )}
                                
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={onClose}
                                    className="p-2.5 bg-white/50 hover:bg-red-400/30 backdrop-blur-xl rounded-lg transition-all border border-white/40 shadow-lg"
                                >
                                    <X size={20} className="text-gray-700" />
                                </motion.button>
                            </div>
                        </div>
                    </div>


                    {/* 💬 CHAT AREA - Grassmorphism */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                        {chatHistory.length === 0 && showWelcome ? (
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="text-center py-16"
                            >
                                {/* ✅ CHANGED: logox.png instead of Brain */}
                                <motion.div
                                    animate={{ 
                                        y: [0, -10, 0],
                                        scale: [1, 1.05, 1]
                                    }}
                                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                    className="w-32 h-32 mx-auto mb-6 flex items-center justify-center"
                                >
                                    <img src={logoxImage} alt="Gloqe" className="w-24 h-24 drop-shadow-xl" />
                                </motion.div>
                                
                                <h3 className="text-2xl font-black text-gray-800 mb-3 drop-shadow-sm">
                                    Ready to Learn
                                </h3>
                                <p className="text-gray-600 text-sm font-medium max-w-xs mx-auto">
                                    {selectedText ? 'Ask anything about your selection' : 'Your AI study companion'}
                                </p>
                            </motion.div>
                        ) : (
                            chatHistory.map((msg) => (
                                <motion.div
                                    key={msg.id}
                                    initial={{ opacity: 0, x: msg.role === 'user' ? 50 : -50 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group`}
                                >
                                    <div className="relative max-w-[85%]">
                                        {/* User message */}
                                        {msg.role === 'user' && (
                                            <motion.div whileHover={{ scale: 1.02 }}>
                                                <div className="absolute inset-0 bg-white/40 rounded-2xl blur-sm"></div>
                                                <div className="relative backdrop-blur-xl bg-white/60 border border-white/40 rounded-2xl px-5 py-3 shadow-lg">
                                                    <p className="text-sm font-semibold text-gray-800">{msg.content}</p>
                                                </div>
                                            </motion.div>
                                        )}
                                        
                                        {/* AI message */}
                                        {msg.role === 'ai' && !msg.isError && (
                                            <motion.div whileHover={{ scale: 1.01 }}>
                                                <div className="backdrop-blur-xl bg-white/50 border border-white/40 rounded-2xl px-5 py-4 shadow-lg">
                                                    <p className="text-sm font-semibold text-gray-800 whitespace-pre-wrap">
                                                        {msg.content}
                                                    </p>
                                                </div>
                                                
                                                <motion.button
                                                    whileHover={{ scale: 1.2 }}
                                                    onClick={() => handleCopyMessage(msg.content, msg.id)}
                                                    className="absolute -top-3 -right-3 opacity-0 group-hover:opacity-100 w-10 h-10 bg-white/70 backdrop-blur-xl border border-white/40 text-gray-700 rounded-full shadow-xl flex items-center justify-center transition-all"
                                                >
                                                    {copiedId === msg.id ? <Check size={14} /> : <Copy size={14} />}
                                                </motion.button>
                                            </motion.div>
                                        )}
                                        
                                        {msg.isError && (
                                            <div className="backdrop-blur-xl bg-red-100/50 border border-red-300/50 rounded-2xl px-5 py-3">
                                                <p className="text-sm font-semibold text-red-700">{msg.content}</p>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ))
                        )}
                        
                        {loading && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex justify-start"
                            >
                                <div className="backdrop-blur-xl bg-white/50 border border-white/40 rounded-2xl px-5 py-4 flex items-center gap-3 shadow-lg">
                                    <Loader size={18} className="animate-spin text-gray-600" />
                                    <span className="text-sm font-bold text-gray-700">Analyzing...</span>
                                </div>
                            </motion.div>
                        )}
                        
                        {isTyping && (
                            <div className="flex justify-start">
                                <div className="backdrop-blur-xl bg-white/50 border border-white/40 rounded-2xl px-5 py-4 max-w-[85%] shadow-lg">
                                    <p className="text-sm font-semibold text-gray-800 whitespace-pre-wrap">
                                        {typingText.substring(0, currentTypingIndex)}
                                        <motion.span
                                            animate={{ opacity: [1, 0] }}
                                            transition={{ duration: 0.8, repeat: Infinity }}
                                            className="inline-block w-0.5 h-4 bg-gray-600 ml-1"
                                        />
                                    </p>
                                </div>
                            </div>
                        )}
                        
                        <div ref={chatEndRef} />
                    </div>


                    {/* 🎯 QUICK ACTIONS - Grassmorphism cards */}
                    {chatHistory.length === 0 && selectedText && (
                        <motion.div
                            initial={{ y: 50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="px-6 py-4 backdrop-blur-xl bg-white/30 border-t border-white/30"
                        >
                            <div className="flex items-center gap-2 mb-3">
                                <Sparkles size={16} className="text-gray-600" />
                                <p className="text-xs font-black text-gray-700 uppercase">
                                    Quick Actions
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-2.5">
                                {quickPrompts.map((prompt, idx) => {
                                    const IconComponent = prompt.icon;
                                    return (
                                        <motion.button
                                            key={prompt.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.1 }}
                                            whileHover={{ scale: 1.05, y: -2 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => handleSend(prompt.prompt)}
                                            disabled={loading}
                                            className="relative overflow-hidden backdrop-blur-xl bg-white/50 hover:bg-white/70 border border-white/40 rounded-xl p-3 transition-all group shadow-lg"
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${prompt.gradient} flex items-center justify-center shadow-md transform group-hover:rotate-12 transition-transform border border-white/40`}>
                                                    {typeof IconComponent === 'function' ? <IconComponent /> : <IconComponent size={18} className="text-gray-700" />}
                                                </div>
                                                <span className="text-xs font-black text-gray-800">{prompt.text}</span>
                                            </div>
                                            
                                            <motion.div
                                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                                                initial={{ x: '-100%' }}
                                                whileHover={{ x: '100%' }}
                                                transition={{ duration: 0.6 }}
                                            />
                                        </motion.button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}


                    {/* 💎 INPUT AREA - Grassmorphism */}
                    <div className="relative px-6 py-5 backdrop-blur-2xl bg-white/40 border-t border-white/30">
                        <motion.div
                            className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-gray-400/50 to-transparent"
                            animate={{ opacity: [0.3, 0.6, 0.3] }}
                            transition={{ duration: 3, repeat: Infinity }}
                        />
                        
                        <div className="flex items-end gap-3">
                            <input
                                ref={inputRef}
                                type="text"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Ask anything..."
                                disabled={loading}
                                className="flex-1 px-5 py-4 backdrop-blur-xl bg-white/60 border border-white/40 focus:border-gray-400 rounded-2xl outline-none text-sm font-semibold text-gray-800 placeholder-gray-500 transition-all shadow-lg"
                            />
                            
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleSend()}
                                disabled={!message.trim() || loading}
                                className="relative px-6 py-4 bg-white/60 backdrop-blur-xl border border-white/40 text-gray-800 rounded-2xl disabled:opacity-50 transition-all font-bold shadow-lg overflow-hidden"
                            >
                                <div className="relative">
                                    {loading ? <Loader size={20} className="animate-spin" /> : <Send size={20} />}
                                </div>
                            </motion.button>
                        </div>
                        
                        <p className="text-[10px] text-gray-500 mt-2 text-center font-medium tracking-wide">
                            ENTER ⏎ SEND • SHIFT+ENTER ⏎ NEW LINE
                        </p>
                    </div>
                </div>
            </motion.div>


            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.2);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(100, 100, 100, 0.3);
                    border-radius: 10px;
                    border: 1px solid rgba(255, 255, 255, 0.3);
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(80, 80, 80, 0.4);
                }
            `}</style>
        </AnimatePresence>
    );
};


export default AskGloqePill;
