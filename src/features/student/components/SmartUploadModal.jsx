import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Sparkles, FolderOpen, Target, BookOpen,
    Lightbulb, Brain, Layers, CheckCircle2,
    ArrowRight, Loader2, FileText
} from 'lucide-react';
import FolderSelect from './FolderSelect';

const SmartUploadModal = ({
    file,
    uploadTask,
    onComplete,
    onCancel,
    isOpen
}) => {
    // Processing State
    const [progress, setProgress] = useState(0);
    const [uploadComplete, setUploadComplete] = useState(false);

    // Context State
    const [purpose, setPurpose] = useState('');
    const [subject, setSubject] = useState('');
    const [folderId, setFolderId] = useState(null);
    const [createQuiz, setCreateQuiz] = useState(true);
    const [createFlashcards, setCreateFlashcards] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Track Upload Progress
    useEffect(() => {
        if (!uploadTask) return;

        const unsubscribe = uploadTask.on('state_changed',
            (snapshot) => {
                const p = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setProgress(p);
                if (p === 100) setUploadComplete(true);
            },
            (error) => {
                console.error('Upload error in modal:', error);
            }
        );

        return () => unsubscribe && unsubscribe();
    }, [uploadTask]);

    // Handle Form Submit
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Construct Context Object
        const context = {
            purpose,
            subject,
            folderId,
            createOptions: {
                quiz: createQuiz,
                flashcards: createFlashcards
            }
        };

        // Complete the flow
        await onComplete(context);
        setIsSubmitting(false);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                {/* Backdrop with blur */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onCancel}
                    className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm z-0"
                />

                {/* Modal Container */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]"
                >
                    {/* 1. Header & Progress Area */}
                    <div className="relative bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 p-8 text-white">
                        {/* Background Deco */}
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Sparkles size={120} />
                        </div>

                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h2 className="text-2xl font-black mb-1 flex items-center gap-2">
                                        <Sparkles className="text-yellow-300" />
                                        Contextual Intelligence
                                    </h2>
                                    <p className="text-violet-100 font-medium">
                                        Help our AI organize this document perfectly for you.
                                    </p>
                                </div>
                                <button
                                    onClick={onCancel}
                                    className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* File Card & Progress */}
                            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                                <div className="flex items-center gap-4 mb-3">
                                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                                        <FileText className="text-white" size={20} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold truncate">{file?.name}</p>
                                        <p className="text-xs text-violet-200">
                                            {(file?.size / 1024 / 1024).toFixed(2)} MB • PDF Document
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xl font-black">{Math.round(progress)}%</span>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="h-2 bg-black/20 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progress}%` }}
                                        className={`h-full ${uploadComplete ? 'bg-green-400' : 'bg-white'} transition-all duration-300`}
                                    />
                                </div>
                                <div className="flex justify-between items-center mt-2 text-[10px] font-bold tracking-wider uppercase opacity-80">
                                    <span>{uploadComplete ? 'Upload Complete' : 'Uploading in background...'}</span>
                                    {uploadComplete && <span className="flex items-center gap-1 text-green-300"><CheckCircle2 size={12} /> Ready to process</span>}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 2. Form Area */}
                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-gray-50">
                        <form id="smart-upload-form" onSubmit={handleSubmit} className="space-y-6">

                            {/* Row 1: Purpose & Subject */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                                        <Target size={16} className="text-violet-500" />
                                        What's this for?
                                    </div>
                                    <input
                                        required
                                        type="text"
                                        placeholder="e.g. Final Exam, Research, Reading"
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all font-medium bg-white"
                                        value={purpose}
                                        onChange={(e) => setPurpose(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                                        <BookOpen size={16} className="text-pink-500" />
                                        Subject / Course
                                    </div>
                                    <input
                                        required
                                        type="text"
                                        placeholder="e.g. Biology 101, Calculus II"
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10 transition-all font-medium bg-white"
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Row 2: Organization */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Folder Selection */}
                                <div className="md:col-span-2">
                                    <div className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                                        <FolderOpen size={16} className="text-blue-500" />
                                        Where should it go?
                                    </div>
                                    <FolderSelect
                                        selectedFolderId={folderId}
                                        onChange={setFolderId}
                                        className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm"
                                    />
                                </div>

                                {/* AI Generation Options */}
                                <div className="md:col-span-1 space-y-3">
                                    <div className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-1">
                                        <BotIcon />
                                        Auto-Generate
                                    </div>

                                    <label className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer ${createQuiz ? 'border-violet-500 bg-violet-50' : 'border-gray-200 hover:border-gray-300 bg-white'}`}>
                                        <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${createQuiz ? 'bg-violet-500 text-white' : 'bg-gray-200'}`}>
                                            {createQuiz && <CheckCircle2 size={14} />}
                                        </div>
                                        <input type="checkbox" className="hidden" checked={createQuiz} onChange={(e) => setCreateQuiz(e.target.checked)} />
                                        <div className="flex items-center gap-2">
                                            <Brain size={16} className={createQuiz ? 'text-violet-600' : 'text-gray-400'} />
                                            <span className={`text-sm font-bold ${createQuiz ? 'text-violet-900' : 'text-gray-500'}`}>Quiz</span>
                                        </div>
                                    </label>

                                    <label className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer ${createFlashcards ? 'border-pink-500 bg-pink-50' : 'border-gray-200 hover:border-gray-300 bg-white'}`}>
                                        <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${createFlashcards ? 'bg-pink-500 text-white' : 'bg-gray-200'}`}>
                                            {createFlashcards && <CheckCircle2 size={14} />}
                                        </div>
                                        <input type="checkbox" className="hidden" checked={createFlashcards} onChange={(e) => setCreateFlashcards(e.target.checked)} />
                                        <div className="flex items-center gap-2">
                                            <Layers size={16} className={createFlashcards ? 'text-pink-600' : 'text-gray-400'} />
                                            <span className={`text-sm font-bold ${createFlashcards ? 'text-pink-900' : 'text-gray-500'}`}>Flashcards</span>
                                        </div>
                                    </label>
                                </div>
                            </div>

                        </form>
                    </div>

                    {/* 3. Footer Area */}
                    <div className="p-6 bg-white border-t border-gray-100 flex justify-between items-center">
                        <button
                            type="button"
                            onClick={() => onComplete({ skipContext: true })}
                            className="text-gray-400 font-bold text-sm hover:text-gray-600 px-4 py-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            Skip & Use Auto-Detect
                        </button>

                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            form="smart-upload-form"
                            type="submit"
                            disabled={!purpose || !subject || isSubmitting}
                            className={`
                                flex items-center gap-2 px-8 py-3 rounded-xl font-black text-white shadow-xl shadow-violet-500/30
                                ${(!purpose || !subject || isSubmitting) ? 'bg-gray-300 cursor-not-allowed shadow-none' : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500'}
                                transition-all
                            `}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    Organizing...
                                </>
                            ) : (
                                <>
                                    Save & Organize
                                    <ArrowRight size={18} strokeWidth={3} />
                                </>
                            )}
                        </motion.button>
                    </div>

                </motion.div>
            </div>
        </AnimatePresence>
    );
};

const BotIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-violet-500">
        <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 4V6M12 18V20M6 12H4M20 12H18M15 12C15 13.66 13.66 15 12 15C10.34 15 9 13.66 9 12C9 10.34 10.34 9 12 9C13.66 9 15 10.34 15 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

export default SmartUploadModal;
