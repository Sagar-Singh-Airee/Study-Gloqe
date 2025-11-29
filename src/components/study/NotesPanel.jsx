// src/components/study/NotesPanel.jsx - ENHANCED WITH REAL-TIME & DAILY XP
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, Save, Check, Clock, FileText, Trash2, 
    Download, Copy, Zap, Sparkles 
} from 'lucide-react';
import { db } from '@/config/firebase';
import { 
    doc, 
    getDoc, 
    setDoc, 
    onSnapshot,
    serverTimestamp,
    deleteDoc 
} from 'firebase/firestore';
import { useAuth } from '@contexts/AuthContext';
import { awardDailyXP, DAILY_ACTIONS } from '@/services/gamificationService';
import toast from 'react-hot-toast';

const NotesPanel = ({ documentId, onClose }) => {
    const { user } = useAuth();
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState(null);
    const [xpEarned, setXpEarned] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [wordCount, setWordCount] = useState(0);
    
    const saveTimeoutRef = useRef(null);
    const noteIdRef = useRef(`${user.uid}_${documentId}`);

    // Real-time listener
    useEffect(() => {
        const noteRef = doc(db, 'notes', noteIdRef.current);
        
        const unsubscribe = onSnapshot(noteRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setNotes(data.content || '');
                setLastSaved(data.updatedAt?.toDate());
                
                // Calculate word count
                const words = data.content?.trim().split(/\s+/).filter(w => w.length > 0).length || 0;
                setWordCount(words);
            }
        }, (error) => {
            console.error('Error listening to notes:', error);
        });

        return () => unsubscribe();
    }, [documentId, user.uid]);

    // Auto-save with debounce
    useEffect(() => {
        if (isTyping) {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }

            saveTimeoutRef.current = setTimeout(() => {
                saveNotes(true); // Auto-save
                setIsTyping(false);
            }, 2000); // Save after 2 seconds of no typing
        }

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [notes, isTyping]);

    const handleNotesChange = (e) => {
        setNotes(e.target.value);
        setIsTyping(true);
        
        // Update word count
        const words = e.target.value.trim().split(/\s+/).filter(w => w.length > 0).length;
        setWordCount(words);
    };

    const saveNotes = async (isAutoSave = false) => {
        if (!notes.trim()) return;
        
        setSaving(true);
        try {
            const noteRef = doc(db, 'notes', noteIdRef.current);
            
            await setDoc(noteRef, {
                userId: user.uid,
                documentId,
                content: notes,
                updatedAt: serverTimestamp(),
                wordCount: wordCount
            }, { merge: true });

            setLastSaved(new Date());

            // Award XP only on manual save and if not earned today
            if (!isAutoSave && !xpEarned) {
                const result = await awardDailyXP(
                    user.uid, 
                    DAILY_ACTIONS.ADD_NOTES, 
                    'Added Study Notes'
                );
                
                if (result.success) {
                    setXpEarned(true);
                    toast.success(`✨ +${result.xpGained} XP for taking notes!`, {
                        duration: 2000,
                        icon: '📝',
                        style: {
                            background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                            color: '#fff',
                            fontWeight: 'bold',
                            borderRadius: '12px',
                        },
                    });
                } else if (result.alreadyEarned) {
                    setXpEarned(true);
                }
            }

            if (!isAutoSave) {
                toast.success('Notes saved!', {
                    duration: 1500,
                    icon: '💾',
                    style: {
                        background: '#1f2937',
                        color: '#fff',
                        fontWeight: 'bold',
                        borderRadius: '12px',
                    },
                });
            }
        } catch (error) {
            console.error('Error saving notes:', error);
            toast.error('Failed to save notes');
        } finally {
            setSaving(false);
        }
    };

    const handleCopyNotes = () => {
        navigator.clipboard.writeText(notes);
        toast.success('Notes copied!', {
            duration: 1000,
            icon: '📋',
        });
    };

    const handleDownloadNotes = () => {
        const blob = new Blob([notes], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `notes-${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Notes downloaded!', {
            duration: 1000,
            icon: '📥',
        });
    };

    const handleClearNotes = async () => {
        if (!window.confirm('Are you sure you want to clear all notes?')) return;
        
        try {
            const noteRef = doc(db, 'notes', noteIdRef.current);
            await deleteDoc(noteRef);
            setNotes('');
            setWordCount(0);
            toast.success('Notes cleared', {
                duration: 1000,
                icon: '🗑️',
            });
        } catch (error) {
            console.error('Error clearing notes:', error);
            toast.error('Failed to clear notes');
        }
    };

    const getTimeAgo = (date) => {
        if (!date) return '';
        
        const seconds = Math.floor((new Date() - date) / 1000);
        
        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    };

    return (
        <motion.div
            initial={{ x: 320 }}
            animate={{ x: 0 }}
            exit={{ x: 320 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-[73px] bottom-0 w-80 bg-gradient-to-b from-white to-gray-50 border-l-2 border-gray-200 shadow-2xl flex flex-col z-30"
        >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b-2 border-gray-200 bg-white">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                        <FileText size={18} className="text-white" />
                    </div>
                    <div>
                        <h3 className="font-black text-gray-900 text-sm">My Notes</h3>
                        <div className="flex items-center gap-2 text-[10px] text-gray-500">
                            <span>{wordCount} words</span>
                            {lastSaved && (
                                <>
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                        <Clock size={10} />
                                        {getTimeAgo(lastSaved)}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-all"
                    aria-label="Close notes"
                >
                    <X size={18} className="text-gray-700" />
                </button>
            </div>

            {/* XP Badge */}
            {!xpEarned && notes.trim().length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mx-4 mt-3 p-2 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Sparkles size={14} className="text-blue-600" />
                            <span className="text-xs font-bold text-gray-700">
                                Save to earn +2 XP!
                            </span>
                        </div>
                        <span className="px-2 py-0.5 bg-blue-600 text-white rounded-full text-[10px] font-black">
                            NEW
                        </span>
                    </div>
                </motion.div>
            )}

            {/* Status Indicator */}
            <AnimatePresence>
                {isTyping && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="px-4 py-2 bg-yellow-50 border-b border-yellow-200"
                    >
                        <div className="flex items-center gap-2 text-xs text-yellow-700">
                            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                            <span className="font-semibold">Auto-saving...</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Notes Textarea */}
            <textarea
                value={notes}
                onChange={handleNotesChange}
                placeholder="✍️ Take notes while studying...

• Key concepts
• Important points
• Questions to review
• Summary"
                className="flex-1 p-4 resize-none focus:outline-none text-sm text-gray-800 leading-relaxed bg-transparent placeholder-gray-400"
                style={{
                    fontFamily: 'system-ui, -apple-system, sans-serif'
                }}
            />

            {/* Action Buttons */}
            <div className="p-4 border-t-2 border-gray-200 bg-white space-y-2">
                {/* Primary Save Button */}
                <button
                    onClick={() => saveNotes(false)}
                    disabled={saving || !notes.trim()}
                    className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                >
                    {saving ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save size={18} />
                            Save Notes
                            {!xpEarned && (
                                <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded-full text-[10px]">
                                    +2 XP
                                </span>
                            )}
                        </>
                    )}
                </button>

                {/* Secondary Actions */}
                <div className="grid grid-cols-3 gap-2">
                    <button
                        onClick={handleCopyNotes}
                        disabled={!notes.trim()}
                        className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                    >
                        <Copy size={14} />
                        Copy
                    </button>
                    <button
                        onClick={handleDownloadNotes}
                        disabled={!notes.trim()}
                        className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                    >
                        <Download size={14} />
                        Export
                    </button>
                    <button
                        onClick={handleClearNotes}
                        disabled={!notes.trim()}
                        className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-semibold text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                    >
                        <Trash2 size={14} />
                        Clear
                    </button>
                </div>

                {/* Info Text */}
                <p className="text-[10px] text-gray-500 text-center font-medium">
                    {isTyping ? '⚡ Auto-saving in 2s...' : lastSaved ? '✓ Saved & synced' : 'Type to start taking notes'}
                </p>
            </div>
        </motion.div>
    );
};

export default NotesPanel;
