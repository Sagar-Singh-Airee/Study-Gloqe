// src/components/study/AskGloqePill.jsx - SMART POSITIONING
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Sparkles, X, Send, Loader, Zap, Lightbulb, 
    FileText, Network, Languages, CheckCircle, Brain
} from 'lucide-react';
import { generateAIResponse } from '@/utils/vertexAI';
import { awardXP } from '@/services/gamificationService';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import logoImage from '@/assets/logo/logo.svg';

const AskGloqePill = ({ selectedText, position, onClose, documentId }) => {
    const { user } = useAuth();
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [chatHistory, setChatHistory] = useState([]);
    const [adjustedPosition, setAdjustedPosition] = useState({ right: '20px', top: '0px' });
    const inputRef = useRef(null);
    const chatEndRef = useRef(null);
    const pillRef = useRef(null);

    // Quick prompts with context
    const quickPrompts = [
        { icon: Lightbulb, text: 'Explain', prompt: `Explain: "${selectedText}"` },
        { icon: FileText, text: 'Summarize', prompt: `Summarize: "${selectedText}"` },
        { icon: Network, text: 'Mind Map', prompt: `Create mind map: "${selectedText}"` },
        { icon: CheckCircle, text: 'Quiz', prompt: `Generate quiz: "${selectedText}"` },
    ];

    // Smart positioning - keep within viewport
    useEffect(() => {
        const adjustPosition = () => {
            const pillHeight = 350; // Approximate height of pill
            const windowHeight = window.innerHeight;
            const windowWidth = window.innerWidth;
            
            let top = position.y;
            let right = 20;

            // Check if pill would go off bottom
            if (top + pillHeight > windowHeight) {
                // Position it at bottom with padding
                top = windowHeight - pillHeight - 20;
            }

            // Check if pill would go off top
            if (top < 20) {
                top = 20;
            }

            // Check if there's enough space on right (for smaller screens)
            if (windowWidth < 400) {
                right = 10; // Smaller padding on mobile
            }

            setAdjustedPosition({
                right: `${right}px`,
                top: `${top}px`
            });
        };

        adjustPosition();

        // Re-adjust on window resize
        window.addEventListener('resize', adjustPosition);
        return () => window.removeEventListener('resize', adjustPosition);
    }, [position.y]);

    // Auto-focus input on mount
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // Auto-scroll to bottom
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory]);

    const handleSend = async (customPrompt = null) => {
        const prompt = customPrompt || message.trim();
        if (!prompt || loading || !user?.uid) return;

        const userMessage = {
            role: 'user',
            content: customPrompt ? quickPrompts.find(p => p.prompt === customPrompt)?.text : prompt,
            timestamp: new Date()
        };

        setChatHistory(prev => [...prev, userMessage]);
        setMessage('');
        setLoading(true);

        try {
            const fullPrompt = selectedText 
                ? `Context: "${selectedText}"\n\nQuestion: ${prompt}`
                : prompt;

            const aiResponse = await generateAIResponse(fullPrompt, documentId);
            
            const aiMessage = {
                role: 'ai',
                content: aiResponse,
                timestamp: new Date()
            };

            setChatHistory(prev => [...prev, aiMessage]);

            // 🎮 AWARD XP
            await awardXP(user.uid, 3, 'Used AI Chat');
            
            toast.success('✨ +3 XP', {
                duration: 1500,
                style: {
                    background: '#000',
                    color: '#fff',
                    fontWeight: 'bold',
                    borderRadius: '12px',
                    padding: '8px 16px',
                },
            });
        } catch (error) {
            console.error('AI Error:', error);
            toast.error('Failed to get response');
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                ref={pillRef}
                initial={{ opacity: 0, scale: 0.95, x: 20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95, x: 20 }}
                transition={{ duration: 0.2 }}
                className="fixed z-[100] w-[320px]"
                style={adjustedPosition}
            >
                {/* Compact Container */}
                <div className="bg-white rounded-xl shadow-2xl border-2 border-blue-700 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-blue-700 to-blue-600 border-b-2 border-blue-800">
                        <div className="flex items-center gap-2">
                            <img src={logoImage} alt="Gloqe" className="w-6 h-6" />
                            <span className="font-black text-white text-sm">Ask Gloqe</span>
                            <span className="px-1.5 py-0.5 bg-white/20 rounded-full text-[9px] font-bold text-white flex items-center gap-0.5">
                                <Zap size={8} fill="white" />
                                +3
                            </span>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-white/20 rounded-lg transition-all"
                        >
                            <X size={14} className="text-white" />
                        </button>
                    </div>

                    {/* Chat Area */}
                    <div className="h-[240px] overflow-y-auto p-3 space-y-2 bg-gray-50 custom-scrollbar">
                        {chatHistory.length === 0 ? (
                            /* Welcome State */
                            <div className="text-center py-6">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-700 to-blue-600 flex items-center justify-center mx-auto mb-2">
                                    <img src={logoImage} alt="AI" className="w-6 h-6" />
                                </div>
                                <p className="text-xs font-bold text-gray-900 mb-0.5">
                                    AI Assistant Ready
                                </p>
                                <p className="text-[10px] text-gray-600">
                                    Ask anything about your content
                                </p>
                            </div>
                        ) : (
                            /* Chat Messages */
                            chatHistory.map((msg, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.15 }}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`max-w-[85%] rounded-xl px-3 py-2 ${
                                        msg.role === 'user'
                                            ? 'bg-gradient-to-br from-blue-700 to-blue-600 text-white'
                                            : 'bg-white border border-gray-200 text-gray-900'
                                    }`}>
                                        <p className="text-xs font-medium leading-relaxed whitespace-pre-wrap">
                                            {msg.content}
                                        </p>
                                    </div>
                                </motion.div>
                            ))
                        )}
                        
                        {/* Loading Indicator */}
                        {loading && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex justify-start"
                            >
                                <div className="bg-white border border-gray-200 rounded-xl px-3 py-2">
                                    <div className="flex items-center gap-1.5">
                                        <Loader size={12} className="animate-spin text-blue-700" />
                                        <span className="text-xs text-gray-600 font-medium">Thinking...</span>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                        
                        <div ref={chatEndRef} />
                    </div>

                    {/* Quick Prompts */}
                    {chatHistory.length === 0 && selectedText && (
                        <div className="px-3 py-2 bg-white border-t border-gray-200">
                            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                                Quick Actions
                            </p>
                            <div className="grid grid-cols-2 gap-1.5">
                                {quickPrompts.map((prompt, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleSend(prompt.prompt)}
                                        disabled={loading}
                                        className="flex items-center gap-1.5 px-2 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 hover:border-blue-700 rounded-lg transition-all text-left disabled:opacity-50"
                                    >
                                        <prompt.icon size={12} className="text-blue-700 flex-shrink-0" />
                                        <span className="text-[10px] font-bold text-blue-900 truncate">
                                            {prompt.text}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Input Area */}
                    <div className="px-3 py-2 bg-white border-t-2 border-blue-700">
                        <div className="flex items-end gap-1.5">
                            <div className="flex-1 relative">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder="Ask anything..."
                                    disabled={loading}
                                    className="w-full px-3 py-2 border border-gray-300 focus:border-blue-700 rounded-lg focus:outline-none text-xs font-medium disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
                                />
                            </div>
                            <button
                                onClick={() => handleSend()}
                                disabled={!message.trim() || loading}
                                className="p-2 bg-gradient-to-br from-blue-700 to-blue-600 hover:from-blue-800 hover:to-blue-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg flex-shrink-0"
                            >
                                <Send size={14} />
                            </button>
                        </div>
                        <p className="text-[9px] text-gray-500 mt-1 font-medium">
                            Enter to send • Shift+Enter for new line
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* Custom Scrollbar Styles */}
            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #1d4ed8;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #1e40af;
                }
            `}</style>
        </AnimatePresence>
    );
};

export default AskGloqePill;
