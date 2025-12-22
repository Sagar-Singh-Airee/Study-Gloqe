// src/pages/DocumentsSection.jsx - WHITE & SILVER MINIMAL DESIGN ✨

import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FileText, Upload, Search, Trash2, Eye, Clock, HardDrive,
    BookOpen, Atom, FlaskConical, Dna, Code, Landmark, TrendingUp,
    BookMarked, Brain, Hammer, GraduationCap, X,
    LayoutGrid, List, ChevronRight, Folder, ArrowLeft,
    Star, Calendar, Check, Grid, Rows, Target, Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { db } from '@shared/config/firebase';
import { useAuth } from '@auth/contexts/AuthContext';
import { deleteDocument, redetectDocumentSubject } from '@study/services/documentService';
import { detectSubjectHybrid } from '@shared/utils/subjectDetection';
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

    // Subject configuration - TEAL, BLUE, SILVER tones
    const subjectConfig = {
        'Mathematics': {
            icon: BookOpen,
            color: 'from-blue-500 via-blue-400 to-teal-500',
            lightColor: 'from-blue-50 via-teal-50 to-blue-100',
            accentColor: 'blue-600',
            gradient: 'bg-gradient-to-br from-blue-500 to-teal-500',
            emoji: '📐'
        },
        'Physics': {
            icon: Atom,
            color: 'from-teal-500 via-blue-400 to-teal-600',
            lightColor: 'from-teal-50 via-blue-50 to-teal-100',
            accentColor: 'teal-600',
            gradient: 'bg-gradient-to-br from-teal-500 to-blue-500',
            emoji: '⚛️'
        },
        'Chemistry': {
            icon: FlaskConical,
            color: 'from-teal-500 via-teal-400 to-blue-500',
            lightColor: 'from-teal-50 via-blue-50 to-teal-100',
            accentColor: 'teal-600',
            gradient: 'bg-gradient-to-br from-teal-500 to-blue-400',
            emoji: '🧪'
        },
        'Biology': {
            icon: Dna,
            color: 'from-teal-600 via-teal-400 to-blue-500',
            lightColor: 'from-teal-50 via-blue-50 to-teal-100',
            accentColor: 'teal-700',
            gradient: 'bg-gradient-to-br from-teal-600 to-blue-400',
            emoji: '🧬'
        },
        'Computer Science': {
            icon: Code,
            color: 'from-blue-600 via-blue-400 to-teal-500',
            lightColor: 'from-blue-50 via-teal-50 to-blue-100',
            accentColor: 'blue-700',
            gradient: 'bg-gradient-to-br from-blue-600 to-teal-500',
            emoji: '💻'
        },
        'History': {
            icon: Landmark,
            color: 'from-slate-500 via-slate-400 to-slate-600',
            lightColor: 'from-slate-50 via-slate-100 to-slate-200',
            accentColor: 'slate-700',
            gradient: 'bg-gradient-to-br from-slate-500 to-slate-600',
            emoji: '🏛️'
        },
        'Economics': {
            icon: TrendingUp,
            color: 'from-blue-500 via-teal-400 to-blue-600',
            lightColor: 'from-blue-50 via-teal-50 to-blue-100',
            accentColor: 'blue-600',
            gradient: 'bg-gradient-to-br from-blue-500 to-teal-500',
            emoji: '📈'
        },
        'Literature': {
            icon: BookMarked,
            color: 'from-slate-600 via-slate-500 to-slate-700',
            lightColor: 'from-slate-50 via-slate-100 to-slate-200',
            accentColor: 'slate-800',
            gradient: 'bg-gradient-to-br from-slate-600 to-slate-700',
            emoji: '📚'
        },
        'Psychology': {
            icon: Brain,
            color: 'from-blue-600 via-teal-500 to-blue-700',
            lightColor: 'from-blue-50 via-teal-50 to-blue-100',
            accentColor: 'blue-700',
            gradient: 'bg-gradient-to-br from-blue-600 to-teal-600',
            emoji: '🧠'
        },
        'Engineering': {
            icon: Hammer,
            color: 'from-slate-500 via-slate-400 to-slate-600',
            lightColor: 'from-slate-50 via-slate-100 to-slate-200',
            accentColor: 'slate-700',
            gradient: 'bg-gradient-to-br from-slate-500 to-slate-600',
            emoji: '🔧'
        },
        'General Studies': {
            icon: GraduationCap,
            color: 'from-slate-400 via-slate-300 to-slate-500',
            lightColor: 'from-slate-50 via-slate-100 to-slate-200',
            accentColor: 'slate-600',
            gradient: 'bg-gradient-to-br from-slate-400 to-slate-500',
            emoji: '🎓'
        }
    };

    // Re-detect subject using AI
    const handleRedetectSubject = useCallback(async (docId, docTitle) => {
        setRedetecting(prev => new Set(prev).add(docId));
        try {
            const result = await redetectDocumentSubject(docId);
            toast.success(`Updated: ${result.subject} (${result.confidence}% ${result.method})`);
        } catch (error) {
            console.error('Re-detection error:', error);
            toast.error('Failed to re-detect subject');
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
        let failCount = 0;
        const toastId = toast.loading(`Re-detecting ${docsToRedetect.length} documents with AI...`);

        for (const doc of docsToRedetect) {
            try {
                setRedetecting(prev => new Set(prev).add(doc.id));
                const result = await redetectDocumentSubject(doc.id);
                if (result.subject !== folderSubject) {
                    successCount++;
                }
                toast.loading(`Re-detected ${successCount + failCount}/${docsToRedetect.length}...`, { id: toastId });
            } catch (error) {
                console.error(`Re-detection failed for ${doc.id}:`, error);
                failCount++;
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
        if (successCount > 0) {
            toast.success(`✅ Re-categorized ${successCount} document(s)! ${failCount > 0 ? `(${failCount} unchanged)` : ''}`, { id: toastId });
        } else {
            toast.error(`No documents were re-categorized. They may already be correctly classified.`, { id: toastId });
        }
    }, [documents]);

    // Delete all in folder
    const handleDeleteAllInFolder = useCallback(async (folderSubject) => {
        const docsToDelete = documents.filter(doc => doc.subject === folderSubject);
        if (docsToDelete.length === 0) {
            toast.error('No documents to delete in this folder');
            return;
        }

        const confirmed = window.confirm(
            `⚠️ PERMANENT DELETE WARNING ⚠️\n\n` +
            `You are about to PERMANENTLY DELETE ${docsToDelete.length} document(s) from "${folderSubject}".\n\n` +
            `This action is IRREVERSIBLE and CANNOT BE UNDONE.\n` +
            `All files will be deleted from the database forever.\n\n` +
            `Type "DELETE" in the next prompt to confirm.`
        );
        if (!confirmed) return;

        const confirmText = window.prompt(
            `Type DELETE (in capital letters) to permanently delete ${docsToDelete.length} documents:`
        );
        if (confirmText !== 'DELETE') {
            toast.error('Deletion cancelled - incorrect confirmation');
            return;
        }

        const deletePromises = docsToDelete.map(async (doc) => {
            try {
                await deleteDocument(doc.id);
                return { success: true, id: doc.id };
            } catch (error) {
                console.error(`Failed to delete ${doc.id}:`, error);
                return { success: false, id: doc.id };
            }
        });

        toast.promise(
            Promise.all(deletePromises),
            {
                loading: `Permanently deleting ${docsToDelete.length} documents...`,
                success: (results) => {
                    const successful = results.filter(r => r.success).length;
                    const failed = results.filter(r => !r.success).length;
                    setSelectedFolder(null);
                    return `Deleted ${successful} documents${failed > 0 ? `, ${failed} failed` : ''}`;
                },
                error: 'Failed to delete documents',
            }
        );
    }, [documents]);

    // Delete all documents
    const handleDeleteAllDocuments = useCallback(async () => {
        if (documents.length === 0) {
            toast.error('No documents to delete');
            return;
        }

        const confirmed = window.confirm(
            `🚨 CRITICAL WARNING 🚨\n\n` +
            `You are about to DELETE YOUR ENTIRE LIBRARY!\n\n` +
            `This will PERMANENTLY DELETE ALL ${documents.length} documents.\n` +
            `ALL folders and files will be removed from the database FOREVER.\n\n` +
            `This action CANNOT be undone or recovered.\n\n` +
            `Are you absolutely sure?`
        );
        if (!confirmed) return;

        const doubleConfirm = window.confirm(
            `⚠️ FINAL CONFIRMATION ⚠️\n\n` +
            `This is your last chance to cancel.\n\n` +
            `Clicking OK will DELETE ALL ${documents.length} documents PERMANENTLY.\n\n` +
            `Click Cancel to abort, or OK to proceed with deletion.`
        );
        if (!doubleConfirm) {
            toast.success('Deletion cancelled');
            return;
        }

        const confirmText = window.prompt(
            `Type DELETE ALL (exactly) to confirm total deletion:`
        );
        if (confirmText !== 'DELETE ALL') {
            toast.error('Deletion cancelled - incorrect confirmation');
            return;
        }

        const deletePromises = documents.map(async (doc) => {
            try {
                await deleteDocument(doc.id);
                return { success: true };
            } catch (error) {
                console.error(`Failed to delete ${doc.id}:`, error);
                return { success: false };
            }
        });

        toast.promise(
            Promise.all(deletePromises),
            {
                loading: `Deleting all ${documents.length} documents...`,
                success: (results) => {
                    const successful = results.filter(r => r.success).length;
                    return `Successfully deleted ${successful} documents`;
                },
                error: 'Some documents failed to delete',
            }
        );
    }, [documents]);

    // Real-time Firestore listener
    useEffect(() => {
        if (!user?.uid) {
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, 'documents'),
            where('userId', '==', user.uid)
        );

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

                const stats = {
                    totalSize: docs.reduce((sum, d) => sum + (d.fileSize || 0), 0),
                    totalDocs: docs.length
                };
                setDocumentStats(stats);
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
                    lastUpdated: doc.createdAt
                };
            }
            stats[subject].count++;
            stats[subject].documents.push(doc);
            stats[subject].totalSize += (doc.fileSize || 0);
            if (doc.createdAt > stats[subject].lastUpdated) {
                stats[subject].lastUpdated = doc.createdAt;
            }
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
                case 'newest':
                    return b.createdAt - a.createdAt;
                case 'oldest':
                    return a.createdAt - b.createdAt;
                case 'name':
                    return (a.title || a.fileName || '').localeCompare(b.title || b.fileName || '');
                case 'size':
                    return (b.fileSize || 0) - (a.fileSize || 0);
                default:
                    return 0;
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
        if (window.confirm(`Permanently delete ${selectedDocs.size} document(s)? This cannot be undone.`)) {
            const deletePromises = [...selectedDocs].map(docId => deleteDocument(docId));
            toast.promise(
                Promise.all(deletePromises),
                {
                    loading: `Deleting ${selectedDocs.size} documents...`,
                    success: `Deleted ${selectedDocs.size} document(s)`,
                    error: 'Failed to delete some documents',
                }
            );
            setSelectedDocs(new Set());
        }
    }, [selectedDocs]);

    const handleDelete = async (docId, title) => {
        if (window.confirm(`Delete "${title || 'this document'}"? This cannot be undone.`)) {
            try {
                await deleteDocument(docId);
                toast.success('Document deleted');
            } catch (error) {
                console.error('Delete error:', error);
                toast.error('Failed to delete');
            }
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
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor(diffMs / (1000 * 60));

        if (diffMinutes < 1) return 'Just now';
        if (diffMinutes < 60) return `${diffMinutes}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    // Render folder card
    const renderFolderCard = (subject, stats, idx) => {
        const config = subjectConfig[subject] || subjectConfig['General Studies'];
        const Icon = config.icon;

        return (
            <motion.div
                key={subject}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: idx * 0.05, type: "spring", stiffness: 120 }}
                className="group relative"
            >
                <div
                    onClick={() => setSelectedFolder(subject)}
                    className="relative bg-white rounded-3xl p-6 border border-slate-200/60 shadow-sm
                             hover:border-teal-400/60 hover:shadow-xl hover:shadow-teal-100/50
                             transition-all duration-500 hover:-translate-y-1 cursor-pointer"
                >
                    <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${config.color} rounded-t-3xl
                                   group-hover:h-1.5 transition-all duration-300`} />

                    <div className="flex items-center justify-between mb-5">
                        <motion.div
                            whileHover={{ rotate: [0, -5, 5, 0], scale: 1.1 }}
                            transition={{ duration: 0.5 }}
                            className={`w-16 h-16 ${config.gradient} rounded-2xl flex items-center justify-center shadow-lg shadow-teal-100/50`}
                        >
                            <Folder className="text-white" size={30} strokeWidth={2} />
                        </motion.div>
                        <ChevronRight className="text-slate-400 group-hover:text-teal-600 group-hover:translate-x-1 transition-all" size={22} strokeWidth={2.5} />
                    </div>

                    <h3 className="text-lg font-bold text-slate-800 mb-3 line-clamp-1">
                        {config.emoji} {subject}
                    </h3>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-slate-600">
                                {stats.count} document{stats.count !== 1 ? 's' : ''}
                            </span>
                            <span className="text-sm text-slate-500 font-medium">
                                {formatSize(stats.totalSize)}
                            </span>
                        </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-500 font-medium">
                            {formatDate(stats.lastUpdated)}
                        </span>

                        <div className="flex items-center gap-2">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleBatchRedetect(subject);
                                }}
                                disabled={batchRedetecting}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border flex items-center gap-1
                                          ${batchRedetecting
                                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-teal-50 to-blue-50 text-teal-700 hover:from-teal-100 hover:to-blue-100 border-teal-200/60 hover:border-teal-400/60'
                                    }`}
                                title="Re-detect all documents with AI"
                            >
                                {batchRedetecting ? (
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                    >
                                        <Sparkles size={13} strokeWidth={2} />
                                    </motion.div>
                                ) : (
                                    <Sparkles size={13} strokeWidth={2} />
                                )}
                                <span className="hidden sm:inline">AI Detect</span>
                            </motion.button>

                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteAllInFolder(subject);
                                }}
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 
                                         rounded-lg text-xs font-semibold transition-all border border-slate-200/60 hover:border-red-300/60"
                            >
                                <Trash2 size={13} className="inline" strokeWidth={2} />
                            </motion.button>
                        </div>
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

        const getBadgeStyle = () => {
            if (method === 'ai_gemini') {
                return confidence >= 90
                    ? 'bg-gradient-to-r from-teal-500 to-blue-600 text-white border-teal-400'
                    : 'bg-gradient-to-r from-blue-500 to-teal-500 text-white border-blue-400';
            } else if (method === 'keyword') {
                return 'bg-slate-100 text-slate-700 border-slate-300';
            }
            return 'bg-slate-50 text-slate-500 border-slate-200';
        };

        return (
            <motion.div
                key={doc.id}
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: idx * 0.02, type: "spring" }}
                className={`group relative bg-white rounded-2xl p-5 border shadow-sm transition-all cursor-pointer
                          ${isSelected
                        ? 'border-blue-400/60 shadow-lg shadow-blue-100/50'
                        : 'border-slate-200/60 hover:border-teal-400/60 hover:shadow-lg hover:shadow-teal-50/50'
                    }`}
                onClick={() => navigate(`/study/${doc.id}`)}
            >
                <div className="absolute top-4 left-4 z-10">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                            e.stopPropagation();
                            setSelectedDocs(prev => {
                                const newSet = new Set(prev);
                                if (newSet.has(doc.id)) {
                                    newSet.delete(doc.id);
                                } else {
                                    newSet.add(doc.id);
                                }
                                return newSet;
                            });
                        }}
                        className="w-5 h-5 rounded-md border-2 border-slate-300 text-blue-600 
                                 focus:ring-2 focus:ring-blue-400/50 cursor-pointer hover:border-blue-500 transition-colors"
                    />
                </div>

                <div className="flex items-start gap-4 ml-9">
                    <div className="relative shrink-0">
                        <motion.div
                            whileHover={{ scale: 1.08 }}
                            className={`w-14 h-14 ${config.gradient} rounded-xl flex items-center justify-center shadow-md shadow-teal-100/50`}
                        >
                            <FileText className="text-white" size={24} strokeWidth={2.2} />
                        </motion.div>
                        {isFavorite && (
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute -top-1 -right-1 bg-gradient-to-br from-teal-400 to-blue-500 rounded-full p-1 shadow-md"
                            >
                                <Star size={10} className="text-white" fill="white" strokeWidth={0} />
                            </motion.div>
                        )}
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-2">
                            <h4 className="text-base font-bold text-slate-800 group-hover:text-teal-700 leading-snug line-clamp-2 transition-colors">
                                {doc.title || doc.fileName || 'Untitled'}
                            </h4>

                            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleRedetectSubject(doc.id, doc.title);
                                    }}
                                    disabled={isRedetecting}
                                    className={`p-2 rounded-lg transition-all border ${isRedetecting
                                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-teal-50 to-blue-50 text-teal-700 hover:from-teal-100 hover:to-blue-100 border-teal-200/60'
                                        }`}
                                    title="Re-detect subject with AI"
                                >
                                    {isRedetecting ? (
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                        >
                                            <Sparkles size={15} strokeWidth={2} />
                                        </motion.div>
                                    ) : (
                                        <Sparkles size={15} strokeWidth={2} />
                                    )}
                                </motion.button>

                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleFavorite(doc.id);
                                    }}
                                    className={`p-2 rounded-lg transition-all border ${isFavorite
                                        ? 'bg-teal-50 text-teal-700 border-teal-200/60'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200/60'
                                        }`}
                                >
                                    {isFavorite ? <Star size={15} fill="currentColor" strokeWidth={0} /> : <Star size={15} strokeWidth={2} />}
                                </motion.button>

                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/study/${doc.id}`);
                                    }}
                                    className="p-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-600
                                             transition-all border border-slate-200/60"
                                >
                                    <Eye size={15} strokeWidth={2} />
                                </motion.button>

                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(doc.id, doc.title);
                                    }}
                                    className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600
                                             transition-all border border-slate-200/60"
                                >
                                    <Trash2 size={15} strokeWidth={2} />
                                </motion.button>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500">
                            <span className="flex items-center gap-1.5 font-medium">
                                <Calendar size={12} strokeWidth={2} />
                                {formatDate(doc.createdAt)}
                            </span>
                            <span className="flex items-center gap-1.5 font-medium">
                                <HardDrive size={12} strokeWidth={2} />
                                {formatSize(doc.fileSize)}
                            </span>
                            <span className={`px-2 py-1 rounded-lg text-xs font-semibold bg-gradient-to-r ${config.lightColor} border border-slate-200/60`}>
                                {subject}
                            </span>

                            {confidence > 0 && (
                                <div className="relative group/tooltip">
                                    <motion.span
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: 0.2 }}
                                        className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-help border ${getBadgeStyle()}`}
                                    >
                                        {method === 'ai_gemini' && <Sparkles size={11} strokeWidth={2.5} />}
                                        <Target size={11} strokeWidth={2.5} />
                                        {confidence}%
                                    </motion.span>

                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-slate-900 text-white text-xs rounded-lg 
                                                  opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl">
                                        {method === 'ai_gemini' ? (
                                            <>
                                                🤖 AI Detection
                                                {confidence >= 90 ? ' • Very High' : confidence >= 70 ? ' • High' : ' • Medium'}
                                            </>
                                        ) : method === 'keyword' ? (
                                            '🔤 Keyword Detection'
                                        ) : method === 'user_provided' ? (
                                            '✏️ User Provided'
                                        ) : (
                                            '❓ Unknown Method'
                                        )}
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900"></div>
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
            <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-16 h-16 border-4 border-slate-200 border-t-teal-600 rounded-full shadow-lg mb-5"
                />
                <p className="text-slate-700 font-bold text-lg">Loading library...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50 relative overflow-hidden">
            {/* Animated background orbs */}
            <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.25, 0.15] }}
                transition={{ duration: 8, repeat: Infinity }}
                className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-br from-blue-200/40 via-teal-200/40 to-transparent rounded-full blur-3xl pointer-events-none"
            />
            <motion.div
                animate={{ scale: [1, 1.3, 1], opacity: [0.1, 0.2, 0.1] }}
                transition={{ duration: 10, repeat: Infinity, delay: 1 }}
                className="absolute bottom-20 right-20 w-96 h-96 bg-gradient-to-br from-teal-200/40 via-blue-200/40 to-transparent rounded-full blur-3xl pointer-events-none"
            />

            <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            {selectedFolder && (
                                <motion.button
                                    whileHover={{ scale: 1.05, x: -2 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setSelectedFolder(null)}
                                    className="p-3 rounded-2xl bg-white border border-slate-200/60 hover:border-teal-500/60 hover:shadow-lg transition-all"
                                >
                                    <ArrowLeft size={20} className="text-slate-700" strokeWidth={2.5} />
                                </motion.button>
                            )}
                            <div>
                                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 via-teal-700 to-blue-700 bg-clip-text text-transparent">
                                    {selectedFolder || 'My Library'}
                                </h1>
                                <p className="text-slate-600 font-medium flex items-center gap-2 mt-1">
                                    {selectedFolder
                                        ? `${filteredDocuments.length} document${filteredDocuments.length !== 1 ? 's' : ''}`
                                        : `${Object.keys(folderStats).length} folders • ${documents.length} documents • ${formatSize(documentStats.totalSize)}`
                                    }
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {!selectedFolder && documents.length > 0 && (
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleDeleteAllDocuments}
                                    className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-slate-700 to-slate-900
                                             text-white rounded-2xl font-semibold hover:shadow-lg hover:shadow-slate-400/40
                                             transition-all border border-slate-600"
                                >
                                    <Trash2 size={18} strokeWidth={2.5} />
                                    <span>Delete All</span>
                                </motion.button>
                            )}

                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => navigate('/upload')}
                                className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-teal-600
                                         text-white rounded-2xl font-semibold hover:shadow-lg hover:shadow-blue-400/40 transition-all"
                            >
                                <Upload size={18} strokeWidth={2.5} />
                                <span>Upload</span>
                            </motion.button>
                        </div>
                    </div>

                    {selectedFolder && (
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                            <div className="flex-1 relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} strokeWidth={2.5} />
                                <input
                                    type="text"
                                    placeholder="Search documents..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 bg-white rounded-2xl border border-slate-200/60 
                                             focus:border-teal-500/60 focus:shadow-lg transition-all font-medium text-slate-800 placeholder:text-slate-400"
                                />
                            </div>

                            <div className="flex items-center gap-2 bg-white rounded-2xl border border-slate-200/60 p-1">
                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setViewMode('grid')}
                                    className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid'
                                        ? 'bg-gradient-to-br from-blue-600 to-teal-600 text-white shadow-md'
                                        : 'text-slate-600 hover:bg-slate-100'
                                        }`}
                                >
                                    <LayoutGrid size={17} strokeWidth={2.5} />
                                </motion.button>
                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setViewMode('list')}
                                    className={`p-2.5 rounded-xl transition-all ${viewMode === 'list'
                                        ? 'bg-gradient-to-br from-blue-600 to-teal-600 text-white shadow-md'
                                        : 'text-slate-600 hover:bg-slate-100'
                                        }`}
                                >
                                    <List size={17} strokeWidth={2.5} />
                                </motion.button>
                            </div>

                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="px-4 py-3.5 bg-white rounded-2xl border border-slate-200/60 focus:border-teal-500/60 
                                         transition-all font-semibold text-slate-800 cursor-pointer"
                            >
                                <option value="newest">📅 Newest</option>
                                <option value="oldest">📆 Oldest</option>
                                <option value="name">🔤 Name</option>
                                <option value="size">💾 Size</option>
                            </select>
                        </div>
                    )}

                    {/* Bulk selection bar */}
                    <AnimatePresence>
                        {selectedDocs.size > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="mt-4 flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-blue-50 to-teal-50 
                                         rounded-2xl border border-blue-200/60 shadow-md"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-md">
                                        <Check size={18} className="text-white" strokeWidth={3} />
                                    </div>
                                    <span className="font-bold text-blue-900 text-base">
                                        {selectedDocs.size} selected
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setSelectedDocs(new Set())}
                                        className="px-4 py-2 bg-white rounded-xl text-slate-700 font-semibold hover:bg-slate-100 
                                                 transition-all border border-slate-200/60"
                                    >
                                        Clear
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={handleBulkDelete}
                                        className="px-4 py-2 bg-gradient-to-r from-slate-700 to-slate-900 rounded-xl text-white font-semibold 
                                                 hover:shadow-lg transition-all"
                                    >
                                        <Trash2 size={15} className="inline mr-1.5" strokeWidth={2.5} />
                                        Delete
                                    </motion.button>
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
                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
                        >
                            {Object.entries(folderStats).length > 0 ? (
                                Object.entries(folderStats).map(([subject, stats], idx) =>
                                    renderFolderCard(subject, stats, idx)
                                )
                            ) : (
                                <div className="col-span-full text-center py-20">
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="w-28 h-28 bg-gradient-to-br from-slate-200 to-slate-100 rounded-full
                                                  flex items-center justify-center mx-auto mb-5 shadow-lg"
                                    >
                                        <FileText size={50} className="text-slate-400" strokeWidth={1.5} />
                                    </motion.div>
                                    <h3 className="text-2xl font-bold text-slate-800 mb-2">No documents yet</h3>
                                    <p className="text-slate-600 text-base mb-5">Upload your first document to get started</p>
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => navigate('/upload')}
                                        className="px-7 py-3.5 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-2xl 
                                                 font-semibold hover:shadow-lg transition-all inline-flex items-center gap-2"
                                    >
                                        <Upload size={18} strokeWidth={2.5} />
                                        Upload Document
                                    </motion.button>
                                </div>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="documents"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className={viewMode === 'grid' ? 'grid grid-cols-1 lg:grid-cols-2 gap-4' : 'space-y-3'}
                        >
                            {filteredDocuments.length > 0 ? (
                                filteredDocuments.map((doc, idx) => renderDocumentCard(doc, idx))
                            ) : (
                                <div className="text-center py-20 col-span-full">
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="w-28 h-28 bg-gradient-to-br from-slate-200 to-slate-100 rounded-full
                                                  flex items-center justify-center mx-auto mb-5 shadow-lg"
                                    >
                                        <Search size={45} className="text-slate-400" strokeWidth={1.5} />
                                    </motion.div>
                                    <h3 className="text-2xl font-bold text-slate-800 mb-2">No matches found</h3>
                                    <p className="text-slate-600 text-base mb-5">
                                        {searchTerm ? `No results for "${searchTerm}"` : 'This folder is empty'}
                                    </p>
                                    {searchTerm ? (
                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => setSearchTerm('')}
                                            className="px-7 py-3.5 bg-gradient-to-r from-slate-700 to-slate-900 text-white rounded-2xl 
                                                     font-semibold hover:shadow-lg transition-all inline-flex items-center gap-2"
                                        >
                                            <X size={18} strokeWidth={2.5} />
                                            Clear Search
                                        </motion.button>
                                    ) : (
                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => navigate('/upload')}
                                            className="px-7 py-3.5 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-2xl 
                                                     font-semibold hover:shadow-lg transition-all inline-flex items-center gap-2"
                                        >
                                            <Upload size={18} strokeWidth={2.5} />
                                            Upload Document
                                        </motion.button>
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
