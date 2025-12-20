// src/pages/DocumentsSection.jsx - AI-POWERED DOCUMENT MANAGER
import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FileText, Upload, Search, Trash2, Eye, Clock, HardDrive,
    BookOpen, Atom, FlaskConical, Dna, Code, Landmark, TrendingUp,
    BookMarked, Brain, Hammer, GraduationCap, X,
    LayoutGrid, List, ChevronRight, Folder, ArrowLeft,
    Star, Calendar, Check, Grid, Rows, Target, Sparkles  // ✅ Added Sparkles icon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { db } from '@shared/config/firebase';
import { useAuth } from '@auth/contexts/AuthContext';
import { deleteDocument, redetectDocumentSubject } from '@study/services/documentService';  // ✅ Import redetect
import { detectSubjectHybrid } from '@shared/utils/subjectDetection';  // ✅ Import AI detection
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
    const [redetecting, setRedetecting] = useState(new Set());  // ✅ Track redetection status

    // Enhanced subject configuration - TEAL, ROYAL BLUE, BLACK, GRAY, WHITE ONLY
    const subjectConfig = {
        'Mathematics': {
            icon: BookOpen,
            color: 'from-blue-600 via-blue-500 to-teal-600',
            lightColor: 'from-blue-50 via-teal-50 to-blue-100',
            accentColor: 'blue-600',
            gradient: 'bg-gradient-to-br from-blue-600 to-teal-600',
            emoji: '📐'
        },
        'Physics': {
            icon: Atom,
            color: 'from-teal-600 via-blue-500 to-teal-700',
            lightColor: 'from-teal-50 via-blue-50 to-teal-100',
            accentColor: 'teal-600',
            gradient: 'bg-gradient-to-br from-teal-600 to-blue-600',
            emoji: '⚛️'
        },
        'Chemistry': {
            icon: FlaskConical,
            color: 'from-teal-600 via-teal-500 to-blue-600',
            lightColor: 'from-teal-50 via-blue-50 to-teal-100',
            accentColor: 'teal-600',
            gradient: 'bg-gradient-to-br from-teal-600 to-blue-500',
            emoji: '🧪'
        },
        'Biology': {
            icon: Dna,
            color: 'from-teal-700 via-teal-500 to-blue-600',
            lightColor: 'from-teal-50 via-blue-50 to-teal-100',
            accentColor: 'teal-700',
            gradient: 'bg-gradient-to-br from-teal-700 to-blue-500',
            emoji: '🧬'
        },
        'Computer Science': {
            icon: Code,
            color: 'from-blue-700 via-blue-500 to-teal-600',
            lightColor: 'from-blue-50 via-teal-50 to-blue-100',
            accentColor: 'blue-700',
            gradient: 'bg-gradient-to-br from-blue-700 to-teal-600',
            emoji: '💻'
        },
        'History': {
            icon: Landmark,
            color: 'from-gray-700 via-gray-600 to-gray-800',
            lightColor: 'from-gray-50 via-gray-100 to-gray-200',
            accentColor: 'gray-700',
            gradient: 'bg-gradient-to-br from-gray-700 to-gray-900',
            emoji: '🏛️'
        },
        'Economics': {
            icon: TrendingUp,
            color: 'from-blue-600 via-teal-500 to-blue-700',
            lightColor: 'from-blue-50 via-teal-50 to-blue-100',
            accentColor: 'blue-600',
            gradient: 'bg-gradient-to-br from-blue-600 to-teal-600',
            emoji: '📈'
        },
        'Literature': {
            icon: BookMarked,
            color: 'from-gray-800 via-gray-700 to-black',
            lightColor: 'from-gray-50 via-gray-100 to-gray-200',
            accentColor: 'gray-800',
            gradient: 'bg-gradient-to-br from-gray-800 to-black',
            emoji: '📚'
        },
        'Psychology': {
            icon: Brain,
            color: 'from-blue-700 via-teal-600 to-blue-800',
            lightColor: 'from-blue-50 via-teal-50 to-blue-100',
            accentColor: 'blue-700',
            gradient: 'bg-gradient-to-br from-blue-700 to-teal-700',
            emoji: '🧠'
        },
        'Engineering': {
            icon: Hammer,
            color: 'from-gray-700 via-gray-600 to-gray-800',
            lightColor: 'from-gray-50 via-gray-100 to-gray-200',
            accentColor: 'gray-700',
            gradient: 'bg-gradient-to-br from-gray-700 to-gray-900',
            emoji: '🔧'
        },
        'General Studies': {
            icon: GraduationCap,
            color: 'from-gray-600 via-gray-500 to-gray-700',
            lightColor: 'from-gray-50 via-gray-100 to-gray-200',
            accentColor: 'gray-600',
            gradient: 'bg-gradient-to-br from-gray-600 to-gray-800',
            emoji: '🎓'
        }
    };

    // ✅ NEW: Re-detect subject using AI
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

    // ✅ NEW: Batch re-detect all documents in a folder (especially General Studies)
    const [batchRedetecting, setBatchRedetecting] = useState(false);

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

                // Update toast progress
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

            // Small delay to prevent rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        setBatchRedetecting(false);

        if (successCount > 0) {
            toast.success(`✅ Re-categorized ${successCount} document(s)! ${failCount > 0 ? `(${failCount} unchanged)` : ''}`, { id: toastId });
        } else {
            toast.error(`No documents were re-categorized. They may already be correctly classified.`, { id: toastId });
        }
    }, [documents]);


    // PERMANENT DELETE ALL FUNCTION - NO RECOVERY
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

    // PERMANENT DELETE ALL DOCUMENTS (ENTIRE LIBRARY)
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

    // ✅ ENHANCED: Real-time Firestore listener with subject info
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
                    className="relative bg-white rounded-3xl p-6 border-2 border-gray-200
                             hover:border-teal-500 hover:shadow-2xl hover:shadow-teal-100
                             transition-all duration-500 hover:-translate-y-2 cursor-pointer"
                >
                    <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${config.color} rounded-t-3xl
                                   group-hover:h-2.5 transition-all duration-300`} />

                    <div className="flex items-center justify-between mb-5">
                        <motion.div
                            whileHover={{ rotate: [0, -5, 5, 0], scale: 1.1 }}
                            transition={{ duration: 0.5 }}
                            className={`w-20 h-20 ${config.gradient} rounded-2xl flex items-center justify-center shadow-xl`}
                        >
                            <Folder className="text-white" size={36} strokeWidth={1.8} />
                        </motion.div>
                        <ChevronRight className="text-gray-400 group-hover:text-teal-600 group-hover:translate-x-2 transition-all" size={26} strokeWidth={2.5} />
                    </div>

                    <h3 className="text-xl font-black text-gray-900 mb-3 line-clamp-1">
                        {config.emoji} {subject}
                    </h3>

                    <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-gray-700">
                                {stats.count} document{stats.count !== 1 ? 's' : ''}
                            </span>
                            <span className="text-sm text-gray-500 font-semibold">
                                {formatSize(stats.totalSize)}
                            </span>
                        </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between gap-2">
                        <span className="text-xs text-gray-500 font-medium">
                            {formatDate(stats.lastUpdated)}
                        </span>

                        <div className="flex items-center gap-2">
                            {/* ✅ NEW: Re-detect All button - especially for General Studies */}
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleBatchRedetect(subject);
                                }}
                                disabled={batchRedetecting}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center gap-1
                                          ${batchRedetecting
                                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-teal-50 to-blue-50 text-teal-700 hover:from-teal-100 hover:to-blue-100 border-teal-200 hover:border-teal-400'
                                    }`}
                                title="Re-detect all documents with AI"
                            >
                                {batchRedetecting ? (
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                    >
                                        <Sparkles size={14} strokeWidth={2} />
                                    </motion.div>
                                ) : (
                                    <Sparkles size={14} strokeWidth={2} />
                                )}
                                Re-detect All
                            </motion.button>

                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteAllInFolder(subject);
                                }}
                                className="px-3 py-1.5 bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-600 
                                         rounded-lg text-xs font-bold transition-all border border-gray-200 hover:border-red-300"
                            >
                                <Trash2 size={14} className="inline mr-1" strokeWidth={2} />
                                Delete All
                            </motion.button>
                        </div>
                    </div>
                </div>
            </motion.div>
        );
    };

    // ✅ ENHANCED: Render document card with AI detection indicator
    const renderDocumentCard = (doc, idx) => {
        const subject = doc.subject || 'General Studies';
        const config = subjectConfig[subject] || subjectConfig['General Studies'];
        const isFavorite = favorites.has(doc.id);
        const isSelected = selectedDocs.has(doc.id);
        const confidence = doc.subjectConfidence || 0;
        const method = doc.detectionMethod || 'unknown';
        const isRedetecting = redetecting.has(doc.id);

        // ✅ Determine badge colors based on method and confidence
        const getBadgeStyle = () => {
            if (method === 'ai_gemini') {
                return confidence >= 90
                    ? 'bg-gradient-to-r from-teal-500 to-blue-600 text-white border-teal-400'
                    : 'bg-gradient-to-r from-blue-500 to-teal-500 text-white border-blue-400';
            } else if (method === 'keyword') {
                return 'bg-gray-100 text-gray-700 border-gray-300';
            }
            return 'bg-gray-50 text-gray-500 border-gray-200';
        };

        return (
            <motion.div
                key={doc.id}
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: idx * 0.02, type: "spring" }}
                className={`group relative bg-white rounded-2xl p-5 border-2 transition-all cursor-pointer
                          ${isSelected
                        ? 'border-blue-500 shadow-xl shadow-blue-100'
                        : 'border-gray-200 hover:border-teal-400 hover:shadow-xl hover:shadow-teal-50'
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
                        className="w-5 h-5 rounded-md border-2 border-gray-300 text-blue-600 
                                 focus:ring-2 focus:ring-blue-500 cursor-pointer hover:border-blue-500"
                    />
                </div>

                <div className="flex items-start gap-4 ml-9">
                    <div className="relative shrink-0">
                        <motion.div
                            whileHover={{ scale: 1.08 }}
                            className={`w-16 h-16 ${config.gradient} rounded-xl flex items-center justify-center shadow-lg`}
                        >
                            <FileText className="text-white" size={28} strokeWidth={2.2} />
                        </motion.div>
                        {isFavorite && (
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute -top-1.5 -right-1.5 bg-gradient-to-br from-teal-400 to-blue-500 rounded-full p-1.5 shadow-lg"
                            >
                                <Star size={12} className="text-white" fill="white" strokeWidth={0} />
                            </motion.div>
                        )}
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-2">
                            <h4 className="text-base font-black text-gray-900 group-hover:text-teal-700 leading-snug line-clamp-2">
                                {doc.title || doc.fileName || 'Untitled'}
                            </h4>

                            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                {/* ✅ NEW: Re-detect button */}
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleRedetectSubject(doc.id, doc.title);
                                    }}
                                    disabled={isRedetecting}
                                    className={`p-2 rounded-lg transition-all border ${isRedetecting
                                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-teal-50 to-blue-50 text-teal-700 hover:from-teal-100 hover:to-blue-100 border-teal-200'
                                        }`}
                                    title="Re-detect subject with AI"
                                >
                                    {isRedetecting ? (
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                        >
                                            <Sparkles size={16} strokeWidth={2} />
                                        </motion.div>
                                    ) : (
                                        <Sparkles size={16} strokeWidth={2} />
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
                                        ? 'bg-teal-50 text-teal-700 border-teal-200'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-200'
                                        }`}
                                >
                                    {isFavorite ? <Star size={16} fill="currentColor" strokeWidth={0} /> : <Star size={16} strokeWidth={2} />}
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/study/${doc.id}`);
                                    }}
                                    className="p-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-blue-600
                                             transition-all border border-gray-200"
                                >
                                    <Eye size={16} strokeWidth={2} />
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(doc.id, doc.title);
                                    }}
                                    className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600
                                             transition-all border border-gray-200"
                                >
                                    <Trash2 size={16} strokeWidth={2} />
                                </motion.button>
                            </div>
                        </div>

                        {/* ✅ ENHANCED: Detection method badges */}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1.5 font-semibold">
                                <Calendar size={13} strokeWidth={2} />
                                {formatDate(doc.createdAt)}
                            </span>
                            <span className="flex items-center gap-1.5 font-semibold">
                                <HardDrive size={13} strokeWidth={2} />
                                {formatSize(doc.fileSize)}
                            </span>
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold bg-gradient-to-r ${config.lightColor} border border-gray-200`}>
                                {subject}
                            </span>

                            {/* 🎯 ENHANCED: Detection badge with method indicator */}
                            {confidence > 0 && (
                                <div className="relative group/tooltip">
                                    <motion.span
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: 0.2 }}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-help border ${getBadgeStyle()}`}
                                    >
                                        {method === 'ai_gemini' && <Sparkles size={12} strokeWidth={2.5} />}
                                        <Target size={12} strokeWidth={2.5} />
                                        {confidence}%
                                    </motion.span>

                                    {/* Enhanced Tooltip */}
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg 
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
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
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
            <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 via-white to-teal-50">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-20 h-20 border-4 border-gray-200 border-t-teal-600 rounded-full shadow-xl mb-6"
                />
                <p className="text-gray-700 font-black text-xl">Loading library...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-teal-50 relative overflow-hidden">
            <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 8, repeat: Infinity }}
                className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-br from-blue-200/30 via-teal-200/30 to-transparent rounded-full blur-3xl"
            />
            <motion.div
                animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }}
                transition={{ duration: 10, repeat: Infinity, delay: 1 }}
                className="absolute bottom-20 right-20 w-96 h-96 bg-gradient-to-br from-teal-200/30 via-blue-200/30 to-transparent rounded-full blur-3xl"
            />

            <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            {selectedFolder && (
                                <motion.button
                                    whileHover={{ scale: 1.05, x: -2 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setSelectedFolder(null)}
                                    className="p-3.5 rounded-2xl bg-white border-2 border-gray-200 hover:border-teal-500 hover:shadow-xl transition-all"
                                >
                                    <ArrowLeft size={22} className="text-gray-700" strokeWidth={2.5} />
                                </motion.button>
                            )}
                            <div>
                                <h1 className="text-4xl font-black bg-gradient-to-r from-gray-900 via-teal-700 to-blue-700 bg-clip-text text-transparent">
                                    {selectedFolder || 'My Library'}
                                </h1>
                                <p className="text-gray-600 font-semibold flex items-center gap-2">
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
                                    className="flex items-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-gray-700 to-gray-900
                                             text-white rounded-2xl font-black hover:shadow-2xl hover:shadow-gray-500/40
                                             transition-all border-2 border-gray-600"
                                >
                                    <Trash2 size={20} strokeWidth={2.5} />
                                    <span>Delete All</span>
                                </motion.button>
                            )}

                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => navigate('/upload')}
                                className="flex items-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-blue-600 to-teal-600
                                         text-white rounded-2xl font-black hover:shadow-2xl hover:shadow-blue-500/50 transition-all"
                            >
                                <Upload size={20} strokeWidth={2.5} />
                                <span>Upload</span>
                            </motion.button>
                        </div>
                    </div>

                    {selectedFolder && (
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                            <div className="flex-1 relative">
                                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} strokeWidth={2.5} />
                                <input
                                    type="text"
                                    placeholder="Search documents..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-14 pr-14 py-4 bg-white rounded-2xl border-2 border-gray-200 
                                             focus:border-teal-500 focus:shadow-xl transition-all font-semibold"
                                />
                            </div>

                            <div className="flex items-center gap-2 bg-white rounded-2xl border-2 border-gray-200 p-1.5">
                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setViewMode('grid')}
                                    className={`p-3 rounded-xl transition-all ${viewMode === 'grid'
                                        ? 'bg-gradient-to-br from-blue-600 to-teal-600 text-white shadow-lg'
                                        : 'text-gray-600 hover:bg-gray-100'
                                        }`}
                                >
                                    <LayoutGrid size={18} strokeWidth={2.5} />
                                </motion.button>
                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setViewMode('list')}
                                    className={`p-3 rounded-xl transition-all ${viewMode === 'list'
                                        ? 'bg-gradient-to-br from-blue-600 to-teal-600 text-white shadow-lg'
                                        : 'text-gray-600 hover:bg-gray-100'
                                        }`}
                                >
                                    <List size={18} strokeWidth={2.5} />
                                </motion.button>
                            </div>

                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="px-5 py-4 bg-white rounded-2xl border-2 border-gray-200 focus:border-teal-500 
                                         transition-all font-black text-gray-900 cursor-pointer"
                            >
                                <option value="newest">📅 Newest</option>
                                <option value="oldest">📆 Oldest</option>
                                <option value="name">🔤 Name</option>
                                <option value="size">💾 Size</option>
                            </select>
                        </div>
                    )}

                    <AnimatePresence>
                        {selectedDocs.size > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="mt-4 flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-50 to-teal-50 
                                         rounded-2xl border-2 border-blue-200 shadow-lg"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                                        <Check size={20} className="text-white" strokeWidth={3} />
                                    </div>
                                    <span className="font-black text-blue-900 text-lg">
                                        {selectedDocs.size} selected
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setSelectedDocs(new Set())}
                                        className="px-5 py-2.5 bg-white rounded-xl text-gray-700 font-black hover:bg-gray-100 
                                                 transition-all border-2 border-gray-200"
                                    >
                                        Clear
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={handleBulkDelete}
                                        className="px-5 py-2.5 bg-gradient-to-r from-gray-700 to-gray-900 rounded-xl text-white font-black 
                                                 hover:shadow-xl transition-all"
                                    >
                                        <Trash2 size={16} className="inline mr-2" strokeWidth={2.5} />
                                        Delete
                                    </motion.button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <AnimatePresence mode="wait">
                    {!selectedFolder ? (
                        <motion.div
                            key="folders"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
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
                                        className="w-32 h-32 bg-gradient-to-br from-gray-200 to-gray-100 rounded-full
                                                  flex items-center justify-center mx-auto mb-6 shadow-2xl"
                                    >
                                        <FileText size={60} className="text-gray-400" strokeWidth={1.5} />
                                    </motion.div>
                                    <h3 className="text-3xl font-black text-gray-900 mb-3">No documents yet</h3>
                                    <p className="text-gray-600 text-lg mb-6">Upload your first document to get started</p>
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => navigate('/upload')}
                                        className="px-8 py-4 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-2xl 
                                                 font-black hover:shadow-2xl transition-all inline-flex items-center gap-2"
                                    >
                                        <Upload size={20} strokeWidth={2.5} />
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
                                        className="w-32 h-32 bg-gradient-to-br from-gray-200 to-gray-100 rounded-full
                                                  flex items-center justify-center mx-auto mb-6 shadow-2xl"
                                    >
                                        <Search size={50} className="text-gray-400" strokeWidth={1.5} />
                                    </motion.div>
                                    <h3 className="text-3xl font-black text-gray-900 mb-3">No matches found</h3>
                                    <p className="text-gray-600 text-lg mb-6">
                                        {searchTerm ? `No results for "${searchTerm}"` : 'This folder is empty'}
                                    </p>
                                    {searchTerm ? (
                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => setSearchTerm('')}
                                            className="px-8 py-4 bg-gradient-to-r from-gray-700 to-gray-900 text-white rounded-2xl 
                                                     font-black hover:shadow-2xl transition-all inline-flex items-center gap-2"
                                        >
                                            <X size={20} strokeWidth={2.5} />
                                            Clear Search
                                        </motion.button>
                                    ) : (
                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => navigate('/upload')}
                                            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-2xl 
                                                     font-black hover:shadow-2xl transition-all inline-flex items-center gap-2"
                                        >
                                            <Upload size={20} strokeWidth={2.5} />
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
