// src/components/study/AskGloqePill.jsx
import { useState } from 'react';
import { 
    Sparkles, X, Loader, MessageCircle, Lightbulb, 
    FileText, Network, Languages, CheckCircle 
} from 'lucide-react';
import { generateAIResponse } from '@/utils/vertexAI';
import toast from 'react-hot-toast';

const AskGloqePill = ({ selectedText, position, onClose, documentId }) => {
    const [loading, setLoading] = useState(false);
    const [response, setResponse] = useState('');
    const [activeAction, setActiveAction] = useState(null);

    const actions = [
        { 
            id: 'explain', 
            label: 'Explain', 
            icon: Lightbulb, 
            prompt: `Explain this in simple terms:\n\n"${selectedText}"`,
            color: 'blue'
        },
        { 
            id: 'summarize', 
            label: 'Summarize', 
            icon: FileText, 
            prompt: `Summarize this concisely:\n\n"${selectedText}"`,
            color: 'green'
        },
        { 
            id: 'mindmap', 
            label: 'Mind Map', 
            icon: Network, 
            prompt: `Create a mind map structure for:\n\n"${selectedText}"`,
            color: 'purple'
        },
        { 
            id: 'quiz', 
            label: 'Quiz Me', 
            icon: CheckCircle, 
            prompt: `Generate 3 quiz questions about:\n\n"${selectedText}"`,
            color: 'orange'
        },
        { 
            id: 'translate', 
            label: 'Translate', 
            icon: Languages, 
            prompt: `Translate to Hindi:\n\n"${selectedText}"`,
            color: 'pink'
        },
    ];

    const handleAction = async (action) => {
        setLoading(true);
        setActiveAction(action.id);

        try {
            const aiResponse = await generateAIResponse(action.prompt, documentId);
            setResponse(aiResponse);
        } catch (error) {
            console.error('AI Error:', error);
            toast.error('Failed to get AI response');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="fixed z-50 bg-white rounded-2xl shadow-2xl border-2 border-black p-4 min-w-[400px] max-w-[600px]"
            style={{
                left: `${position.x}px`,
                top: `${position.y}px`,
                transform: 'translateX(-50%)'
            }}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Sparkles size={20} className="text-purple-600" />
                    <h3 className="font-black text-black">Ask Gloqe</h3>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-gray-100 rounded-lg transition-all"
                >
                    <X size={18} />
                </button>
            </div>

            {/* Selected Text */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-700 italic line-clamp-3">
                    "{selectedText}"
                </p>
            </div>

            {/* Actions */}
            {!response && (
                <div className="grid grid-cols-3 gap-2 mb-4">
                    {actions.map((action) => (
                        <button
                            key={action.id}
                            onClick={() => handleAction(action)}
                            disabled={loading}
                            className={`p-3 rounded-xl border-2 transition-all text-center hover:scale-105 disabled:opacity-50 ${
                                activeAction === action.id
                                    ? 'border-black bg-black text-white'
                                    : 'border-gray-200 hover:border-black'
                            }`}
                        >
                            <action.icon size={20} className="mx-auto mb-1" />
                            <div className="text-xs font-bold">{action.label}</div>
                        </button>
                    ))}
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-8">
                    <Loader size={32} className="animate-spin text-purple-600" />
                    <span className="ml-3 text-gray-600">Thinking...</span>
                </div>
            )}

            {/* Response */}
            {response && !loading && (
                <div className="space-y-3">
                    <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-200">
                        <p className="text-sm text-gray-800 whitespace-pre-wrap">{response}</p>
                    </div>
                    <button
                        onClick={() => {
                            setResponse('');
                            setActiveAction(null);
                        }}
                        className="w-full px-4 py-2 bg-black text-white rounded-lg font-bold hover:bg-gray-800 transition-all"
                    >
                        Try Another Action
                    </button>
                </div>
            )}
        </div>
    );
};

export default AskGloqePill;
