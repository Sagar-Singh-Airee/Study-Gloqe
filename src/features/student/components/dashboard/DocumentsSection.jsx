// src/pages/DocumentsSection.jsx - PREMIUM LIGHT COMPACT WITH SMART DETECTION 💎🤖

import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FileText, Upload, Search, Trash2, Eye, Clock, HardDrive,
    BookOpen, Atom, FlaskConical, Dna, Code, Landmark, TrendingUp,
    BookMarked, Brain, Hammer, GraduationCap, X,
    LayoutGrid, List, ChevronRight, Folder, ArrowLeft,
    Star, Calendar, Check, Target, Sparkles, RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@shared/config/firebase';
import { useAuth } from '@auth/contexts/AuthContext';
import { deleteDocument, redetectDocumentSubject } from '@study/services/documentService';
import toast from 'react-hot-toast';

const DocumentsSection = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [documents, setDocuments] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    const [selectedFolder, setSelectedFolder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('grid');
    const [selectedDocs, setSelectedDocs] = useState(new Set());
    const [favorites, setFavorites] = useState(new Set());
    const [documentStats, setDocumentStats] = useState({});
    const [redetecting, setRedetecting] = useState(new Set());
    const [batchRedetecting, setBatchRedetecting] = useState(false);

    // Subject configuration - Teal/Blue theme
    const subjectConfig = {
        'Mathematics': { icon: BookOpen, color: 'bg-blue-50 text-blue-700 border-blue-200', gradient: 'from-blue-500 to-teal-600' },
        'Physics': { icon: Atom, color: 'bg-teal-50 text-teal-700 border-teal-200', gradient: 'from-teal-500 to-blue-600' },
        'Chemistry': { icon: FlaskConical, color: 'bg-cyan-50 text-cyan-700 border-cyan-200', gradient: 'from-cyan-500 to-teal-600' },
        'Biology': { icon: Dna, color: 'bg-emerald-50 text-emerald-700 border-emerald-200', gradient: 'from-emerald-500 to-teal-600' },
        'Computer Science': { icon: Code, color: 'bg-indigo-50 text-indigo-700 border-indigo-200', gradient: 'from-indigo-500 to-blue-600' },
        'History': { icon: Landmark, color: 'bg-amber-50 text-amber-700 border-amber-200', gradient: 'from-amber-500 to-orange-600' },
        'Economics': { icon: TrendingUp, color: 'bg-violet-50 text-violet-700 border-violet-200', gradient: 'from-violet-500 to-purple-600' },
        'Literature': { icon: BookMarked, color: 'bg-rose-50 text-rose-700 border-rose-200', gradient: 'from-rose-500 to-pink-600' },
        'Psychology': { icon: Brain, color: 'bg-purple-50 text-purple-700 border-purple-200', gradient: 'from-purple-500 to-indigo-600' },
        'Engineering': { icon: Hammer, color: 'bg-orange-50 text-orange-700 border-orange-200', gradient: 'from-orange-500 to-amber-600' },
        'General Studies': { icon: GraduationCap, color: 'bg-slate-50 text-slate-700 border-slate-200', gradient: 'from-slate-500 to-slate-600' }
    };

    // Re-detect subject using AI
    const handleRedetectSubject = useCallback(async (docId, docTitle) => {
        setRedetecting(prev => new Set(prev).add(docId));
        const toastId = toast.loading('AI analyzing document...');

        try {
            const result = await redetectDocumentSubject(docId);
            toast.success(
                `✨ ${result.subject} detected (${result.confidence}% confidence via ${result.method === 'ai_gemini' ? 'AI' : 'keywords'})`,
                { id: toastId }
            );
        } catch (error) {
            console.error('Re-detection error:', error);
            toast.error('Failed to re-detect subject', { id: toastId });
        } finally {
            setRedetecting(prev => {
                const newSet = new Set(prev);
                newSet.delete(docId);
                return newSet;
            });
        }
    }, []);

    // Batch re-detect all documents in a folder
    const handleBatchRedetect = useCallback(async (folderSubject) => {
        const docsToRedetect = documents.filter(doc => doc.subject === folderSubject);
        if (docsToRedetect.length === 0) {
            toast.error('No documents to re-detect');
            return;
        }

        setBatchRedetecting(true);
        let successCount = 0;
        let reclassified = 0;
        const toastId = toast.loading(`AI analyzing ${docsToRedetect.length} documents...`);

        for (const doc of docsToRedetect) {
            try {
                setRedetecting(prev => new Set(prev).add(doc.id));
                const result = await redetectDocumentSubject(doc.id);
                successCount++;
                if (result.subject !== folderSubject) {
                    reclassified++;
                }
                toast.loading(`Analyzed ${successCount}/${docsToRedetect.length}...`, { id: toastId });
            } catch (error) {
                console.error(`Re-detection failed for ${doc.id}:`, error);
            } finally {
                setRedetecting(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(doc.id);
                    return newSet;
                });
            }
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        setBatchRedetecting(false);
        if (reclassified > 0) {
            toast.success(`✅ Re-categorized ${reclassified} of ${docsToRedetect.length} documents!`, { id: toastId });
        } else {
            toast.success(`All documents correctly classified!`, { id: toastId });
        }
    }, [documents]);

    // Delete all in folder
    const handleDeleteAllInFolder = useCallback(async (folderSubject) => {
        const docsToDelete = documents.filter(doc => doc.subject === folderSubject);
        if (docsToDelete.length === 0) return;

        if (!window.confirm(`Delete all ${docsToDelete.length} documents in "${folderSubject}"? This cannot be undone.`)) return;

        const deletePromises = docsToDelete.map(doc => deleteDocument(doc.id));
        toast.promise(Promise.all(deletePromises), {
            loading: `Deleting ${docsToDelete.length} documents...`,
            success: () => {
                setSelectedFolder(null);
                return `Deleted ${docsToDelete.length} documents`;
            },
            error: 'Failed to delete documents',
        });
    }, [documents]);

    // Delete all documents
    const handleDeleteAllDocuments = useCallback(async () => {
        if (documents.length === 0) return;
        if (!window.confirm(`⚠️ Delete ALL ${documents.length} documents? This cannot be undone.`)) return;

        const deletePromises = documents.map(doc => deleteDocument(doc.id));
        toast.promise(Promise.all(deletePromises), {
            loading: `Deleting all ${documents.length} documents...`,
            success: `Deleted ${documents.length} documents`,
            error: 'Failed to delete some documents',
        });
    }, [documents]);

    // Real-time Firestore listener
    useEffect(() => {
        if (!user?.uid) {
            setLoading(false);
            return;
        }

        const q = query(collection(db, 'documents'), where('userId', '==', user.uid));
        const unsubscribe = onSnapshot(q,
            (snapshot) => {
                const docs = snapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        ...data,
                        subject: data.subject || 'General Studies',
                        subjectConfidence: data.subjectConfidence || 0,
                        detectionMethod: data.detectionMethod || 'unknown',
                        createdAt: data.createdAt?.toDate?.() || new Date(),
                        updatedAt: data.updatedAt?.toDate?.() || new Date()
                    };
                }).sort((a, b) => b.createdAt - a.createdAt);

                setDocuments(docs);
                setLoading(false);
                setDocumentStats({
                    totalSize: docs.reduce((sum, d) => sum + (d.fileSize || 0), 0),
                    totalDocs: docs.length
                });
            },
            (error) => {
                console.error('Firestore error:', error);
                toast.error('Failed to load documents');
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [user?.uid]);

    // Load favorites
    useEffect(() => {
        const savedFavorites = localStorage.getItem(`favorites_${user?.uid}`);
        if (savedFavorites) {
            try {
                setFavorites(new Set(JSON.parse(savedFavorites)));
            } catch (error) {
                console.error('Failed to load favorites:', error);
            }
        }
    }, [user?.uid]);

    // Group documents by subject
    const folderStats = useMemo(() => {
        const stats = {};
        documents.forEach(doc => {
            const subject = doc.subject || 'General Studies';
            if (!stats[subject]) {
                stats[subject] = {
                    count: 0,
                    documents: [],
                    totalSize: 0,
                    lastUpdated: doc.createdAt,
                    aiDetected: 0,
                    avgConfidence: 0
                };
            }
            stats[subject].count++;
            stats[subject].documents.push(doc);
            stats[subject].totalSize += (doc.fileSize || 0);
            if (doc.createdAt > stats[subject].lastUpdated) {
                stats[subject].lastUpdated = doc.createdAt;
            }
            if (doc.detectionMethod === 'ai_gemini') {
                stats[subject].aiDetected++;
            }
            stats[subject].avgConfidence += (doc.subjectConfidence || 0);
        });

        Object.keys(stats).forEach(subject => {
            stats[subject].avgConfidence = Math.round(stats[subject].avgConfidence / stats[subject].count);
        });

        return stats;
    }, [documents]);

    // Filter documents
    const filteredDocuments = useMemo(() => {
        let filtered = selectedFolder
            ? folderStats[selectedFolder]?.documents || []
            : documents;

        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            filtered = filtered.filter(doc =>
                doc.title?.toLowerCase().includes(searchLower) ||
                doc.fileName?.toLowerCase().includes(searchLower) ||
                doc.subject?.toLowerCase().includes(searchLower)
            );
        }

        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'newest': return b.createdAt - a.createdAt;
                case 'oldest': return a.createdAt - b.createdAt;
                case 'name': return (a.title || a.fileName || '').localeCompare(b.title || b.fileName || '');
                case 'size': return (b.fileSize || 0) - (a.fileSize || 0);
                default: return 0;
            }
        });

        return filtered;
    }, [selectedFolder, folderStats, documents, searchTerm, sortBy]);

    // Toggle favorite
    const toggleFavorite = useCallback((docId) => {
        setFavorites(prev => {
            const newFavorites = new Set(prev);
            if (newFavorites.has(docId)) {
                newFavorites.delete(docId);
                toast.success('Removed from favorites');
            } else {
                newFavorites.add(docId);
                toast.success('Added to favorites');
            }
            localStorage.setItem(`favorites_${user?.uid}`, JSON.stringify([...newFavorites]));
            return newFavorites;
        });
    }, [user?.uid]);

    // Bulk delete
    const handleBulkDelete = useCallback(async () => {
        if (selectedDocs.size === 0) return;
        if (!window.confirm(`Delete ${selectedDocs.size} document(s)? This cannot be undone.`)) return;

        const deletePromises = [...selectedDocs].map(docId => deleteDocument(docId));
        toast.promise(Promise.all(deletePromises), {
            loading: `Deleting ${selectedDocs.size} documents...`,
            success: `Deleted ${selectedDocs.size} document(s)`,
            error: 'Failed to delete some documents',
        });
        setSelectedDocs(new Set());
    }, [selectedDocs]);

    const handleDelete = async (docId, title) => {
        if (!window.confirm(`Delete "${title || 'this document'}"? This cannot be undone.`)) return;

        try {
            await deleteDocument(docId);
            toast.success('Document deleted');
        } catch (error) {
            console.error('Delete error:', error);
            toast.error('Failed to delete');
        }
    };

    const formatSize = (bytes) => {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const formatDate = (date) => {
        if (!date) return 'Unknown';
        const now = new Date();
        const diffMs = now - date;
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMinutes < 1) return 'Just now';
        if (diffMinutes < 60) return `${diffMinutes}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    // Render folder card
    const renderFolderCard = (subject, stats, idx) => {
        const config = subjectConfig[subject] || subjectConfig['General Studies'];
        const Icon = config.icon;
        const aiPercentage = Math.round((stats.aiDetected / stats.count) * 100);

        return (
            <motion.div
                key={subject}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                whileHover={{ y: -2 }}
                onClick={() => setSelectedFolder(subject)}
                className="bg-white border border-slate-200 rounded-xl p-4 hover:border-teal-300 hover:shadow-md transition-all cursor-pointer group"
            >
                <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 bg-gradient-to-br ${config.gradient} rounded-lg flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform`}>
                        <Folder className="text-white" size={18} strokeWidth={2.5} />
                    </div>
                    <ChevronRight className="text-slate-400 group-hover:text-teal-600 group-hover:translate-x-0.5 transition-all" size={16} strokeWidth={2.5} />
                </div>

                <h3 className="text-sm font-bold text-slate-900 mb-2 line-clamp-1">{subject}</h3>

                <div className="space-y-1.5 mb-3">
                    <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-600 font-medium">{stats.count} docs</span>
                        <span className="text-slate-500 font-medium">{formatSize(stats.totalSize)}</span>
                    </div>

                    {/* AI Detection Stats */}
                    {stats.aiDetected > 0 && (
                        <div className="flex items-center justify-between text-[10px]">
                            <span className="flex items-center gap-1 text-teal-600 font-bold">
                                <Sparkles size={10} strokeWidth={2.5} />
                                {stats.aiDetected} AI detected
                            </span>
                            <span className="text-teal-700 font-bold">{aiPercentage}%</span>
                        </div>
                    )}

                    {stats.avgConfidence > 0 && (
                        <div className="flex items-center gap-1 text-[10px]">
                            <Target size={9} strokeWidth={2.5} className="text-blue-600" />
                            <span className="text-slate-600 font-medium">Avg: {stats.avgConfidence}% confidence</span>
                        </div>
                    )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-500 font-medium">{formatDate(stats.lastUpdated)}</span>

                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleBatchRedetect(subject);
                            }}
                            disabled={batchRedetecting}
                            className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all border flex items-center gap-1 ${batchRedetecting
                                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                    : 'bg-teal-50 text-teal-700 hover:bg-teal-100 border-teal-200'
                                }`}
                            title="Re-detect all with AI"
                        >
                            {batchRedetecting ? (
                                <RefreshCw size={10} className="animate-spin" strokeWidth={2.5} />
                            ) : (
                                <Sparkles size={10} strokeWidth={2.5} />
                            )}
                            AI
                        </button>

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteAllInFolder(subject);
                            }}
                            className="px-2 py-1 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-md text-[10px] font-bold transition-all border border-slate-200 hover:border-rose-200"
                        >
                            <Trash2 size={10} strokeWidth={2.5} />
                        </button>
                    </div>
                </div>
            </motion.div>
        );
    };

    // Render document card
    const renderDocumentCard = (doc, idx) => {
        const subject = doc.subject || 'General Studies';
        const config = subjectConfig[subject] || subjectConfig['General Studies'];
        const isFavorite = favorites.has(doc.id);
        const isSelected = selectedDocs.has(doc.id);
        const confidence = doc.subjectConfidence || 0;
        const method = doc.detectionMethod || 'unknown';
        const isRedetecting = redetecting.has(doc.id);

        const getConfidenceBadge = () => {
            if (method === 'ai_gemini') {
                if (confidence >= 90) return 'bg-gradient-to-r from-teal-500 to-blue-600 text-white border-teal-400';
                if (confidence >= 70) return 'bg-gradient-to-r from-blue-500 to-teal-500 text-white border-blue-400';
                return 'bg-blue-50 text-blue-700 border-blue-200';
            }
            if (method === 'keyword') return 'bg-slate-100 text-slate-700 border-slate-300';
            return 'bg-slate-50 text-slate-500 border-slate-200';
        };

        return (
            <motion.div
                key={doc.id}
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: idx * 0.02 }}
                className={`group bg-white rounded-xl p-4 border shadow-sm transition-all cursor-pointer ${isSelected
                        ? 'border-blue-400 shadow-md'
                        : 'border-slate-200 hover:border-teal-300 hover:shadow-md'
                    }`}
                onClick={() => navigate(`/study/${doc.id}`)}
            >
                <div className="flex items-start gap-3">
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                                e.stopPropagation();
                                setSelectedDocs(prev => {
                                    const newSet = new Set(prev);
                                    if (newSet.has(doc.id)) newSet.delete(doc.id);
                                    else newSet.add(doc.id);
                                    return newSet;
                                });
                            }}
                            className="w-4 h-4 rounded border-2 border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-400/50 cursor-pointer hover:border-blue-500 transition-colors"
                        />

                        <div className="relative">
                            <div className={`w-10 h-10 bg-gradient-to-br ${config.gradient} rounded-lg flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform`}>
                                <FileText className="text-white" size={16} strokeWidth={2.5} />
                            </div>
                            {isFavorite && (
                                <div className="absolute -top-1 -right-1 bg-gradient-to-br from-teal-400 to-blue-500 rounded-full p-0.5">
                                    <Star size={8} className="text-white" fill="white" strokeWidth={0} />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                            <h4 className="text-sm font-bold text-slate-900 group-hover:text-teal-700 leading-tight line-clamp-2 transition-colors">
                                {doc.title || doc.fileName || 'Untitled'}
                            </h4>

                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleRedetectSubject(doc.id, doc.title);
                                    }}
                                    disabled={isRedetecting}
                                    className={`p-1.5 rounded-lg transition-all border ${isRedetecting
                                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                            : 'bg-teal-50 text-teal-700 hover:bg-teal-100 border-teal-200'
                                        }`}
                                    title="Re-detect with AI"
                                >
                                    {isRedetecting ? (
                                        <RefreshCw size={12} className="animate-spin" strokeWidth={2.5} />
                                    ) : (
                                        <Sparkles size={12} strokeWidth={2.5} />
                                    )}
                                </button>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleFavorite(doc.id);
                                    }}
                                    className={`p-1.5 rounded-lg transition-all border ${isFavorite
                                            ? 'bg-teal-50 text-teal-700 border-teal-200'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200'
                                        }`}
                                >
                                    <Star size={12} fill={isFavorite ? 'currentColor' : 'none'} strokeWidth={2.5} />
                                </button>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/study/${doc.id}`);
                                    }}
                                    className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-all border border-slate-200"
                                >
                                    <Eye size={12} strokeWidth={2.5} />
                                </button>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(doc.id, doc.title);
                                    }}
                                    className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-all border border-slate-200"
                                >
                                    <Trash2 size={12} strokeWidth={2.5} />
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                            <span className="flex items-center gap-1 text-slate-500 font-medium">
                                <Calendar size={9} strokeWidth={2.5} />
                                {formatDate(doc.createdAt)}
                            </span>
                            <span className="flex items-center gap-1 text-slate-500 font-medium">
                                <HardDrive size={9} strokeWidth={2.5} />
                                {formatSize(doc.fileSize)}
                            </span>

                            <span className={`px-1.5 py-0.5 rounded-md font-bold border ${config.color}`}>
                                {subject}
                            </span>

                            {confidence > 0 && (
                                <div className="relative group/tooltip">
                                    <span className={`px-1.5 py-0.5 rounded-md font-bold flex items-center gap-0.5 cursor-help border ${getConfidenceBadge()}`}>
                                        {method === 'ai_gemini' && <Sparkles size={9} strokeWidth={2.5} />}
                                        <Target size={9} strokeWidth={2.5} />
                                        {confidence}%
                                    </span>

                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-[9px] rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 font-bold">
                                        {method === 'ai_gemini' ? (
                                            <>
                                                🤖 AI Detection
                                                {confidence >= 90 ? ' • Very High' : confidence >= 70 ? ' • High' : ' • Medium'}
                                            </>
                                        ) : method === 'keyword' ? (
                                            '🔤 Keyword Detection'
                                        ) : (
                                            '❓ Unknown Method'
                                        )}
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-0.5 border-4 border-transparent border-t-slate-900"></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-12 h-12 border-2 border-slate-200 border-t-teal-600 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            {/* Subtle background */}
            <div className="fixed inset-0 -z-10 bg-gradient-to-br from-white via-teal-50/20 to-blue-50/20" />

            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            {selectedFolder && (
                                <button
                                    onClick={() => setSelectedFolder(null)}
                                    className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all"
                                >
                                    <ArrowLeft size={18} className="text-slate-700" strokeWidth={2.5} />
                                </button>
                            )}
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900">
                                    {selectedFolder || 'My Library'}
                                </h1>
                                <p className="text-xs text-slate-600">
                                    {selectedFolder
                                        ? `${filteredDocuments.length} document${filteredDocuments.length !== 1 ? 's' : ''}`
                                        : `${Object.keys(folderStats).length} folders • ${documents.length} documents • ${formatSize(documentStats.totalSize)}`
                                    }
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {!selectedFolder && documents.length > 0 && (
                                <button
                                    onClick={handleDeleteAllDocuments}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-white border border-rose-200 text-rose-600 rounded-lg text-xs font-bold hover:bg-rose-50 hover:border-rose-300 transition-all"
                                >
                                    <Trash2 size={14} strokeWidth={2.5} />
                                    Delete All
                                </button>
                            )}

                            <button
                                onClick={() => navigate('/upload')}
                                className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-teal-500 to-blue-600 text-white rounded-lg text-xs font-bold hover:shadow-sm transition-all"
                            >
                                <Upload size={14} strokeWidth={2.5} />
                                Upload
                            </button>
                        </div>
                    </div>

                    {selectedFolder && (
                        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} strokeWidth={2.5} />
                                <input
                                    type="text"
                                    placeholder="Search documents..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all text-sm text-slate-900 placeholder:text-slate-400"
                                />
                            </div>

                            <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-200 p-1">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-2 rounded-lg transition-all ${viewMode === 'grid'
                                            ? 'bg-gradient-to-br from-teal-500 to-blue-600 text-white'
                                            : 'text-slate-600 hover:bg-slate-100'
                                        }`}
                                >
                                    <LayoutGrid size={14} strokeWidth={2.5} />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-2 rounded-lg transition-all ${viewMode === 'list'
                                            ? 'bg-gradient-to-br from-teal-500 to-blue-600 text-white'
                                            : 'text-slate-600 hover:bg-slate-100'
                                        }`}
                                >
                                    <List size={14} strokeWidth={2.5} />
                                </button>
                            </div>

                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="px-3 py-2.5 bg-white rounded-xl border border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all text-xs font-bold text-slate-900 cursor-pointer"
                            >
                                <option value="newest">Newest</option>
                                <option value="oldest">Oldest</option>
                                <option value="name">Name</option>
                                <option value="size">Size</option>
                            </select>
                        </div>
                    )}

                    {/* Bulk selection bar */}
                    <AnimatePresence>
                        {selectedDocs.size > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="mt-4 flex items-center justify-between px-4 py-2.5 bg-blue-50 rounded-xl border border-blue-200"
                            >
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
                                        <Check size={14} className="text-white" strokeWidth={3} />
                                    </div>
                                    <span className="text-xs font-bold text-blue-900">
                                        {selectedDocs.size} selected
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setSelectedDocs(new Set())}
                                        className="px-3 py-1.5 bg-white rounded-lg text-xs text-slate-700 font-bold hover:bg-slate-100 transition-all border border-slate-200"
                                    >
                                        Clear
                                    </button>
                                    <button
                                        onClick={handleBulkDelete}
                                        className="px-3 py-1.5 bg-rose-600 rounded-lg text-xs text-white font-bold hover:bg-rose-700 transition-all flex items-center gap-1"
                                    >
                                        <Trash2 size={12} strokeWidth={2.5} />
                                        Delete
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Content */}
                <AnimatePresence mode="wait">
                    {!selectedFolder ? (
                        <motion.div
                            key="folders"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="grid grid-cols-3 gap-4"
                        >
                            {Object.entries(folderStats).length > 0 ? (
                                Object.entries(folderStats).map(([subject, stats], idx) =>
                                    renderFolderCard(subject, stats, idx)
                                )
                            ) : (
                                <div className="col-span-full text-center py-16">
                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200">
                                        <FileText size={32} className="text-slate-400" strokeWidth={1.5} />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900 mb-1">No documents yet</h3>
                                    <p className="text-xs text-slate-600 mb-5">Upload your first document to get started</p>
                                    <button
                                        onClick={() => navigate('/upload')}
                                        className="px-5 py-2.5 bg-gradient-to-r from-teal-500 to-blue-600 text-white rounded-lg text-xs font-bold hover:shadow-sm transition-all inline-flex items-center gap-1.5"
                                    >
                                        <Upload size={14} strokeWidth={2.5} />
                                        Upload Document
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="documents"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className={viewMode === 'grid' ? 'grid grid-cols-2 gap-3' : 'space-y-2.5'}
                        >
                            {filteredDocuments.length > 0 ? (
                                filteredDocuments.map((doc, idx) => renderDocumentCard(doc, idx))
                            ) : (
                                <div className="text-center py-16 col-span-full">
                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200">
                                        <Search size={32} className="text-slate-400" strokeWidth={1.5} />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900 mb-1">No matches found</h3>
                                    <p className="text-xs text-slate-600 mb-5">
                                        {searchTerm ? `No results for "${searchTerm}"` : 'This folder is empty'}
                                    </p>
                                    {searchTerm ? (
                                        <button
                                            onClick={() => setSearchTerm('')}
                                            className="px-5 py-2.5 bg-slate-700 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-all inline-flex items-center gap-1.5"
                                        >
                                            <X size={14} strokeWidth={2.5} />
                                            Clear Search
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => navigate('/upload')}
                                            className="px-5 py-2.5 bg-gradient-to-r from-teal-500 to-blue-600 text-white rounded-lg text-xs font-bold hover:shadow-sm transition-all inline-flex items-center gap-1.5"
                                        >
                                            <Upload size={14} strokeWidth={2.5} />
                                            Upload Document
                                        </button>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default DocumentsSection;
