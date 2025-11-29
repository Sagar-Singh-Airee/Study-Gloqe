// src/components/features/DocumentsSection.jsx - FIXED VERSION
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    FileText, 
    Upload, 
    Search, 
    Trash2, 
    Eye, 
    Clock, 
    HardDrive, 
    Filter,
    BookOpen,
    Atom,
    FlaskConical,
    Dna,
    Code,
    Landmark,
    TrendingUp,
    BookMarked,
    Brain,
    Hammer,
    GraduationCap,
    FolderOpen
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { 
    collection, 
    query, 
    where, 
    orderBy, 
    onSnapshot,
    deleteDoc,
    doc
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { deleteDocument } from '@/services/documentService';
import toast from 'react-hot-toast';

const DocumentsSection = () => {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const [documents, setDocuments] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    const [selectedSubject, setSelectedSubject] = useState('all');
    const [loading, setLoading] = useState(true);
    const [showFilters, setShowFilters] = useState(false);

    // Subject configuration with icons and colors
    const subjectConfig = {
        'Mathematics': { 
            icon: BookOpen, 
            color: 'from-blue-500 to-blue-600',
            bg: 'bg-blue-50',
            text: 'text-blue-700',
            border: 'border-blue-200'
        },
        'Physics': { 
            icon: Atom, 
            color: 'from-purple-500 to-purple-600',
            bg: 'bg-purple-50',
            text: 'text-purple-700',
            border: 'border-purple-200'
        },
        'Chemistry': { 
            icon: FlaskConical, 
            color: 'from-green-500 to-green-600',
            bg: 'bg-green-50',
            text: 'text-green-700',
            border: 'border-green-200'
        },
        'Biology': { 
            icon: Dna, 
            color: 'from-emerald-500 to-emerald-600',
            bg: 'bg-emerald-50',
            text: 'text-emerald-700',
            border: 'border-emerald-200'
        },
        'Computer Science': { 
            icon: Code, 
            color: 'from-indigo-500 to-indigo-600',
            bg: 'bg-indigo-50',
            text: 'text-indigo-700',
            border: 'border-indigo-200'
        },
        'History': { 
            icon: Landmark, 
            color: 'from-amber-500 to-amber-600',
            bg: 'bg-amber-50',
            text: 'text-amber-700',
            border: 'border-amber-200'
        },
        'Economics': { 
            icon: TrendingUp, 
            color: 'from-cyan-500 to-cyan-600',
            bg: 'bg-cyan-50',
            text: 'text-cyan-700',
            border: 'border-cyan-200'
        },
        'Literature': { 
            icon: BookMarked, 
            color: 'from-pink-500 to-pink-600',
            bg: 'bg-pink-50',
            text: 'text-pink-700',
            border: 'border-pink-200'
        },
        'Psychology': { 
            icon: Brain, 
            color: 'from-violet-500 to-violet-600',
            bg: 'bg-violet-50',
            text: 'text-violet-700',
            border: 'border-violet-200'
        },
        'Engineering': { 
            icon: Hammer, 
            color: 'from-orange-500 to-orange-600',
            bg: 'bg-orange-50',
            text: 'text-orange-700',
            border: 'border-orange-200'
        },
        'General Studies': { 
            icon: GraduationCap, 
            color: 'from-gray-500 to-gray-600',
            bg: 'bg-gray-50',
            text: 'text-gray-700',
            border: 'border-gray-200'
        }
    };

    // Real-time listener for documents
    useEffect(() => {
        if (!currentUser) {
            setLoading(false);
            return;
        }

        const docsRef = collection(db, 'documents');
        const q = query(
            docsRef, 
            where('userId', '==', currentUser.uid), // ✅ Matches documentService.js
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const docs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date()
            }));
            console.log('📄 Fetched documents:', docs.length);
            setDocuments(docs);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching documents:", error);
            toast.error('Failed to load documents');
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser]);

    // Get unique subjects with counts
    const subjectStats = useMemo(() => {
        const stats = {};
        documents.forEach(doc => {
            const subject = doc.subject || 'General Studies';
            stats[subject] = (stats[subject] || 0) + 1;
        });
        return stats;
    }, [documents]);

    // Delete document
    const handleDelete = async (docId, title) => {
        if (window.confirm(`Are you sure you want to delete "${title}"?`)) {
            try {
                await deleteDocument(docId); // ✅ Uses service method (deletes from Storage too)
                toast.success('Document deleted successfully');
            } catch (error) {
                console.error("Error deleting document:", error);
                toast.error('Failed to delete document');
            }
        }
    };

    // Filter and sort documents
    const filteredDocs = documents
        .filter(doc => {
            const matchesSearch = doc.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                doc.subject?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesSubject = selectedSubject === 'all' || doc.subject === selectedSubject;
            return matchesSearch && matchesSubject;
        })
        .sort((a, b) => {
            if (sortBy === 'newest') return b.createdAt - a.createdAt;
            if (sortBy === 'oldest') return a.createdAt - b.createdAt;
            if (sortBy === 'name') return (a.title || '').localeCompare(b.title || '');
            if (sortBy === 'subject') return (a.subject || '').localeCompare(b.subject || '');
            return 0;
        });

    // Format file size
    const formatSize = (bytes) => {
        if (!bytes) return 'Unknown';
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    // Render document card
    const renderDocumentCard = (doc, idx) => {
        const subject = doc.subject || 'General Studies';
        const config = subjectConfig[subject] || subjectConfig['General Studies'];
        const SubjectIcon = config.icon;

        return (
            <motion.div
                key={doc.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: idx * 0.03 }}
                className="bg-white border-2 border-gray-100 rounded-2xl p-5 hover:border-gray-300 hover:shadow-xl transition-all group relative overflow-hidden"
            >
                {/* Gradient accent bar */}
                <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${config.color}`} />
                
                <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`w-14 h-14 bg-gradient-to-br ${config.color} rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform`}>
                        <FileText size={24} className="text-white" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 mb-2">
                            <h3 className="text-base font-black text-black truncate flex-1 group-hover:text-gray-700 transition-colors">
                                {doc.title || 'Untitled Document'}
                            </h3>
                        </div>
                        
                        {/* Subject Badge */}
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${config.bg} ${config.text} border ${config.border} mb-3`}>
                            <SubjectIcon size={12} />
                            <span className="text-xs font-bold">{subject}</span>
                        </div>

                        {/* Metadata */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 font-medium">
                            <span className="flex items-center gap-1">
                                <Clock size={12} />
                                {doc.createdAt.toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric',
                                    year: 'numeric'
                                })}
                            </span>
                            <span className="flex items-center gap-1">
                                <HardDrive size={12} />
                                {formatSize(doc.fileSize || doc.size)} {/* ✅ FIXED: Check both field names */}
                            </span>
                            {doc.pages && (
                                <span>{doc.pages} pages</span>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                        <button
                            onClick={() => navigate(`/study/${doc.id}`)} // ✅ FIXED: Navigate to study session
                            className="px-4 py-2 bg-black text-white rounded-lg text-sm font-bold hover:bg-gray-800 transition-all hover:scale-105 flex items-center gap-2 shadow-md"
                        >
                            <Eye size={16} />
                            Open
                        </button>
                        <button 
                            onClick={() => handleDelete(doc.id, doc.title)}
                            className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                            title="Delete"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                </div>
            </motion.div>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-4xl font-black text-black mb-2">My Documents</h1>
                    <p className="text-gray-600 font-medium">
                        {documents.length} document{documents.length !== 1 ? 's' : ''} • AI-organized by subject
                    </p>
                </div>
                <button
                    onClick={() => navigate('/upload')}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-black text-white rounded-xl font-bold hover:scale-105 transition-all shadow-lg hover:shadow-xl"
                >
                    <Upload size={20} />
                    Upload PDF
                </button>
            </div>

            {/* Subject Filter Pills */}
            <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                <button
                    onClick={() => setSelectedSubject('all')}
                    className={`px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-all flex items-center gap-2 ${
                        selectedSubject === 'all'
                            ? 'bg-black text-white shadow-lg'
                            : 'bg-white text-gray-600 border-2 border-gray-100 hover:border-gray-300'
                    }`}
                >
                    <FolderOpen size={16} />
                    All ({documents.length})
                </button>
                {Object.entries(subjectStats).map(([subject, count]) => {
                    const config = subjectConfig[subject] || subjectConfig['General Studies'];
                    const SubjectIcon = config.icon;
                    
                    return (
                        <button
                            key={subject}
                            onClick={() => setSelectedSubject(subject)}
                            className={`px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-all flex items-center gap-2 ${
                                selectedSubject === subject
                                    ? `${config.bg} ${config.text} border-2 ${config.border} shadow-md`
                                    : 'bg-white text-gray-600 border-2 border-gray-100 hover:border-gray-300'
                            }`}
                        >
                            <SubjectIcon size={16} />
                            {subject} ({count})
                        </button>
                    );
                })}
            </div>

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                {/* Search */}
                <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search by title or subject..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white border-2 border-gray-100 rounded-xl focus:outline-none focus:border-black transition-all shadow-sm font-medium"
                    />
                </div>

                {/* Filters Toggle */}
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`px-4 py-3 rounded-xl border-2 font-bold flex items-center gap-2 transition-all ${
                        showFilters 
                            ? 'border-black bg-gray-50 text-black' 
                            : 'border-gray-100 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                >
                    <Filter size={20} />
                    <span className="hidden md:inline">Sort</span>
                </button>
            </div>

            {/* Expanded Filters */}
            <AnimatePresence>
                {showFilters && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden mb-6"
                    >
                        <div className="bg-gray-50 rounded-xl p-4 flex flex-wrap gap-4 items-center border-2 border-gray-100">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-gray-600">Sort by:</span>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="px-4 py-2 bg-white border-2 border-gray-200 rounded-lg text-sm font-bold focus:outline-none focus:border-black transition-all"
                                >
                                    <option value="newest">Newest First</option>
                                    <option value="oldest">Oldest First</option>
                                    <option value="name">Name (A-Z)</option>
                                    <option value="subject">Subject</option>
                                </select>
                            </div>
                            <div className="text-sm font-bold text-gray-600 ml-auto flex items-center gap-2">
                                Showing {filteredDocs.length} of {documents.length}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Documents List */}
            <AnimatePresence mode="popLayout">
                {filteredDocs.length > 0 ? (
                    <div className="space-y-3">
                        {filteredDocs.map((doc, idx) => renderDocumentCard(doc, idx))}
                    </div>
                ) : (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-16 text-center"
                    >
                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                            <FileText size={32} className="text-gray-300" />
                        </div>
                        <h3 className="text-xl font-bold text-black mb-2">
                            {searchTerm || selectedSubject !== 'all' ? 'No documents found' : 'No documents yet'}
                        </h3>
                        <p className="text-gray-600 mb-6 max-w-md mx-auto font-medium">
                            {searchTerm 
                                ? `No results found for "${searchTerm}". Try a different keyword.` 
                                : selectedSubject !== 'all'
                                ? `No documents found in ${selectedSubject}. Upload some to get started!`
                                : 'Upload your lecture notes, textbooks, or research papers. AI will automatically categorize them by subject.'}
                        </p>
                        {!searchTerm && selectedSubject === 'all' && (
                            <button
                                onClick={() => navigate('/upload')}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl font-bold hover:scale-105 transition-all shadow-lg"
                            >
                                <Upload size={18} />
                                Upload First PDF
                            </button>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default DocumentsSection;
