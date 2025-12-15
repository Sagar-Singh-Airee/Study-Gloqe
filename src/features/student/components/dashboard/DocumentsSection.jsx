// src/pages/DocumentsSection.jsx - PREMIUM APPLE-STYLE WITH FOLDER VIEW
import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    FileText, Upload, Search, Trash2, Eye, Clock, HardDrive, Filter,
    BookOpen, Atom, FlaskConical, Dna, Code, Landmark, TrendingUp, 
    BookMarked, Brain, Hammer, GraduationCap, FolderOpen, X, AlertTriangle,
    LayoutGrid, List, SortAsc, ChevronRight, Folder, ArrowLeft, MoreVertical
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@shared/config/firebase';
import { useAuth } from '@auth/contexts/AuthContext';
import { deleteDocument } from '@study/services/documentService';
import toast from 'react-hot-toast';

const DocumentsSection = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [documents, setDocuments] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    const [selectedFolder, setSelectedFolder] = useState(null); // null = show folders
    const [loading, setLoading] = useState(true);
    const [showFilters, setShowFilters] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [viewMode, setViewMode] = useState('folders'); // 'folders' or 'list'

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
                        createdAt: data.createdAt?.toDate?.() || new Date(),
                        updatedAt: data.updatedAt?.toDate?.() || new Date()
                    };
                }).sort((a, b) => b.createdAt - a.createdAt);
                
                setDocuments(docs);
                setLoading(false);
            },
            (error) => {
                console.error('Firestore error:', error);
                toast.error('Failed to load documents');
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [user?.uid]);

    // Premium subject configuration with Apple-style colors
    const subjectConfig = {
        'Mathematics': { 
            icon: BookOpen,
            color: 'from-gray-700 via-gray-600 to-gray-500',
            lightColor: 'from-gray-100 via-gray-50 to-white',
            accentColor: 'gray-600'
        },
        'Physics': { 
            icon: Atom,
            color: 'from-gray-600 via-gray-500 to-gray-700',
            lightColor: 'from-white via-gray-50 to-gray-100',
            accentColor: 'gray-700'
        },
        'Chemistry': { 
            icon: FlaskConical,
            color: 'from-gray-500 via-gray-600 to-gray-700',
            lightColor: 'from-gray-50 via-white to-gray-100',
            accentColor: 'gray-600'
        },
        'Biology': { 
            icon: Dna,
            color: 'from-gray-700 via-gray-800 to-gray-600',
            lightColor: 'from-gray-100 via-white to-gray-50',
            accentColor: 'gray-700'
        },
        'Computer Science': { 
            icon: Code,
            color: 'from-gray-800 via-gray-700 to-gray-900',
            lightColor: 'from-white via-gray-100 to-gray-200',
            accentColor: 'gray-800'
        },
        'History': { 
            icon: Landmark,
            color: 'from-gray-600 via-gray-700 to-gray-500',
            lightColor: 'from-gray-50 via-white to-gray-100',
            accentColor: 'gray-600'
        },
        'Economics': { 
            icon: TrendingUp,
            color: 'from-gray-700 via-gray-600 to-gray-800',
            lightColor: 'from-gray-100 via-gray-50 to-white',
            accentColor: 'gray-700'
        },
        'Literature': { 
            icon: BookMarked,
            color: 'from-gray-600 via-gray-700 to-gray-600',
            lightColor: 'from-white via-gray-50 to-gray-100',
            accentColor: 'gray-600'
        },
        'Psychology': { 
            icon: Brain,
            color: 'from-gray-700 via-gray-600 to-gray-700',
            lightColor: 'from-gray-50 via-white to-gray-100',
            accentColor: 'gray-700'
        },
        'Engineering': { 
            icon: Hammer,
            color: 'from-gray-800 via-gray-700 to-gray-900',
            lightColor: 'from-gray-100 via-white to-gray-50',
            accentColor: 'gray-800'
        },
        'General Studies': { 
            icon: GraduationCap,
            color: 'from-gray-600 via-gray-500 to-gray-600',
            lightColor: 'from-white via-gray-50 to-gray-100',
            accentColor: 'gray-600'
        }
    };

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

    // Filter documents for selected folder
    const folderDocuments = useMemo(() => {
        if (!selectedFolder) return [];
        return folderStats[selectedFolder]?.documents.filter(doc => 
            doc.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            doc.fileName?.toLowerCase().includes(searchTerm.toLowerCase())
        ).sort((a, b) => {
            if (sortBy === 'newest') return b.createdAt - a.createdAt;
            if (sortBy === 'oldest') return a.createdAt - b.createdAt;
            if (sortBy === 'name') return (a.title || '').localeCompare(b.title || '');
            return 0;
        }) || [];
    }, [selectedFolder, folderStats, searchTerm, sortBy]);

    const handleDelete = async (docId, title) => {
        if (window.confirm(`Delete "${title}"?`)) {
            try {
                await deleteDocument(docId);
                toast.success('Document deleted');
            } catch (error) {
                toast.error('Failed to delete');
            }
        }
    };

    const formatSize = (bytes) => {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const formatDate = (date) => {
        if (!date) return 'Unknown';
        return new Date(date).toLocaleDateString('en-US', { 
            month: 'short', day: 'numeric', year: 'numeric' 
        });
    };

    // Render folder card (Apple Finder style)
    const renderFolderCard = (subject, stats, idx) => {
        const config = subjectConfig[subject] || subjectConfig['General Studies'];
        const Icon = config.icon;

        return (
            <motion.div
                key={subject}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => setSelectedFolder(subject)}
                className="group relative cursor-pointer"
            >
                {/* Glassmorphic card */}
                <div className="relative bg-gradient-to-br from-white/80 via-white/60 to-gray-50/80 
                              backdrop-blur-2xl rounded-3xl p-8 
                              border border-gray-200/50 
                              hover:border-gray-300 hover:shadow-2xl hover:shadow-gray-400/20
                              transition-all duration-500 hover:-translate-y-2">
                    
                    {/* Top gradient accent */}
                    <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${config.color} rounded-t-3xl`} />
                    
                    {/* Folder icon */}
                    <div className="flex items-center justify-between mb-6">
                        <div className={`w-20 h-20 bg-gradient-to-br ${config.color} rounded-2xl 
                                       flex items-center justify-center shadow-xl shadow-gray-400/30
                                       group-hover:scale-110 transition-transform duration-300`}>
                            <Folder className="text-white" size={36} strokeWidth={1.5} />
                        </div>
                        <ChevronRight className="text-gray-400 group-hover:text-gray-600 transition-colors" size={24} />
                    </div>

                    {/* Folder info */}
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-gray-700 transition-colors">
                        {subject}
                    </h3>
                    
                    <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between text-gray-600">
                            <span className="font-medium">{stats.count} document{stats.count !== 1 ? 's' : ''}</span>
                            <span className="text-gray-500">{formatSize(stats.totalSize)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-500">
                            <Clock size={14} />
                            <span className="text-xs">Modified {formatDate(stats.lastUpdated)}</span>
                        </div>
                    </div>

                    {/* Hover preview indicator */}
                    <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${config.color}`} />
                    </div>
                </div>
            </motion.div>
        );
    };

    // Render document card inside folder
    const renderDocumentCard = (doc, idx) => {
        const subject = doc.subject || 'General Studies';
        const config = subjectConfig[subject];

        return (
            <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="group relative bg-gradient-to-br from-white/90 via-white/70 to-gray-50/90
                          backdrop-blur-xl rounded-2xl p-5
                          border border-gray-200/60 hover:border-gray-300
                          hover:shadow-xl hover:shadow-gray-300/30
                          transition-all duration-300 cursor-pointer"
                onClick={() => navigate(`/study/${doc.id}`)}
            >
                <div className="flex items-center gap-4">
                    {/* Document icon */}
                    <div className={`w-14 h-14 bg-gradient-to-br ${config.color} rounded-xl
                                   flex items-center justify-center shadow-lg shadow-gray-400/20
                                   group-hover:scale-105 transition-transform`}>
                        <FileText className="text-white" size={24} strokeWidth={2} />
                    </div>

                    {/* Document info */}
                    <div className="flex-1 min-w-0">
                        <h4 className="text-base font-bold text-gray-900 truncate mb-1 group-hover:text-gray-700">
                            {doc.title || doc.fileName || 'Untitled'}
                        </h4>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                                <Clock size={12} />
                                {formatDate(doc.createdAt)}
                            </span>
                            <span className="flex items-center gap-1">
                                <HardDrive size={12} />
                                {formatSize(doc.fileSize)}
                            </span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/study/${doc.id}`);
                            }}
                            className="p-2 rounded-lg bg-white/80 border border-gray-300
                                     text-gray-700 hover:bg-gray-100 hover:border-gray-400
                                     transition-all"
                        >
                            <Eye size={16} />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(doc.id, doc.title);
                            }}
                            className="p-2 rounded-lg bg-white/80 border border-gray-300
                                     text-red-600 hover:bg-red-50 hover:border-red-400
                                     transition-all"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>
            </motion.div>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 relative">
            {/* Subtle glassmorphic background elements */}
            <div className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-br from-gray-200/30 to-transparent rounded-full blur-3xl" />
            <div className="absolute bottom-20 right-20 w-96 h-96 bg-gradient-to-br from-gray-300/20 to-transparent rounded-full blur-3xl" />

            <div className="relative z-10 max-w-7xl mx-auto px-6 py-10">
                
                {/* Header */}
                <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-4">
                        {selectedFolder && (
                            <button
                                onClick={() => setSelectedFolder(null)}
                                className="p-3 rounded-xl bg-white/80 backdrop-blur-xl border border-gray-200
                                         hover:bg-white hover:border-gray-300 hover:shadow-lg transition-all"
                            >
                                <ArrowLeft size={20} className="text-gray-700" />
                            </button>
                        )}
                        <div>
                            <h1 className="text-4xl font-black text-gray-900 mb-1">
                                {selectedFolder || 'Library'}
                            </h1>
                            <p className="text-gray-600 font-medium">
                                {selectedFolder 
                                    ? `${folderDocuments.length} document${folderDocuments.length !== 1 ? 's' : ''}`
                                    : `${Object.keys(folderStats).length} folders • ${documents.length} total documents`
                                }
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => navigate('/upload')}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gray-800 to-gray-700
                                 text-white rounded-xl font-bold hover:shadow-xl hover:shadow-gray-600/30
                                 hover:scale-105 transition-all"
                    >
                        <Upload size={20} />
                        Upload
                    </button>
                </div>

                {/* Search bar */}
                {selectedFolder && (
                    <div className="mb-8">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="Search documents..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-6 py-4 bg-white/80 backdrop-blur-xl rounded-2xl
                                         border border-gray-200 focus:border-gray-400 focus:shadow-xl
                                         transition-all font-medium text-gray-900 placeholder:text-gray-500"
                            />
                        </div>
                    </div>
                )}

                {/* Content */}
                <AnimatePresence mode="wait">
                    {!selectedFolder ? (
                        // Folder view
                        <motion.div
                            key="folders"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                        >
                            {Object.entries(folderStats).map(([subject, stats], idx) => 
                                renderFolderCard(subject, stats, idx)
                            )}
                        </motion.div>
                    ) : (
                        // Documents inside folder
                        <motion.div
                            key="documents"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="space-y-3"
                        >
                            {folderDocuments.length > 0 ? (
                                folderDocuments.map((doc, idx) => renderDocumentCard(doc, idx))
                            ) : (
                                <div className="text-center py-20">
                                    <div className="w-24 h-24 bg-gradient-to-br from-gray-200 to-gray-100 rounded-full
                                                  flex items-center justify-center mx-auto mb-6 shadow-xl">
                                        <FileText size={40} className="text-gray-400" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900 mb-2">No documents found</h3>
                                    <p className="text-gray-600">Try a different search term</p>
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
