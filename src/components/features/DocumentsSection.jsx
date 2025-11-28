// src/components/features/DocumentsSection.jsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    FileText, 
    Upload, 
    Search, 
    Trash2, 
    Eye, 
    Clock, 
    HardDrive, 
    MoreVertical,
    Filter
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

const DocumentsSection = () => {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const [documents, setDocuments] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('newest'); // newest, oldest, name
    const [loading, setLoading] = useState(true);
    const [showFilters, setShowFilters] = useState(false);

    // Real-time listener for documents
    useEffect(() => {
        if (!currentUser) {
            setLoading(false);
            return;
        }

        const docsRef = collection(db, 'documents');
        const q = query(
            docsRef, 
            where('userId', '==', currentUser.uid),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const docs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date()
            }));
            setDocuments(docs);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching documents:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser]);

    // Delete document
    const handleDelete = async (docId, title) => {
        if (window.confirm(`Are you sure you want to delete "${title}"?`)) {
            try {
                await deleteDoc(doc(db, 'documents', docId));
            } catch (error) {
                console.error("Error deleting document:", error);
                alert("Failed to delete document.");
            }
        }
    };

    // Filter and sort documents
    const filteredDocs = documents
        .filter(doc => 
            doc.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            doc.subject?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => {
            if (sortBy === 'newest') return b.createdAt - a.createdAt;
            if (sortBy === 'oldest') return a.createdAt - b.createdAt;
            if (sortBy === 'name') return a.title.localeCompare(b.title);
            return 0;
        });

    // Format file size
    const formatSize = (bytes) => {
        if (!bytes) return 'Unknown size';
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
                    <p className="text-gray-600">Upload and manage your study materials</p>
                </div>
                <button
                    onClick={() => navigate('/upload')}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-black text-white rounded-xl font-bold hover:scale-105 transition-all shadow-lg hover:shadow-xl"
                >
                    <Upload size={20} />
                    Upload PDF
                </button>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                {/* Search */}
                <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search documents..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white border-2 border-gray-100 rounded-xl focus:outline-none focus:border-black transition-all shadow-sm"
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
                    <span className="hidden md:inline">Filters</span>
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
                        <div className="bg-gray-50 rounded-xl p-4 flex flex-wrap gap-4">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-gray-500">Sort by:</span>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:border-black"
                                >
                                    <option value="newest">Newest First</option>
                                    <option value="oldest">Oldest First</option>
                                    <option value="name">Name (A-Z)</option>
                                </select>
                            </div>
                            <div className="text-sm text-gray-500 ml-auto flex items-center">
                                {filteredDocs.length} document{filteredDocs.length !== 1 ? 's' : ''} found
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Documents List */}
            <AnimatePresence mode='popLayout'>
                {filteredDocs.length > 0 ? (
                    <div className="space-y-3">
                        {filteredDocs.map((doc, idx) => (
                            <motion.div
                                key={doc.id}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ delay: idx * 0.05 }}
                                className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-black hover:shadow-lg transition-all group relative"
                            >
                                <div className="flex items-center gap-4">
                                    {/* Icon */}
                                    <div className="w-14 h-14 bg-gradient-to-br from-gray-800 to-black rounded-xl flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-105 transition-transform">
                                        <FileText size={24} className="text-white" />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="text-sm font-bold text-black truncate pr-8">
                                                {doc.title || 'Untitled Document'}
                                            </h3>
                                            {doc.subject && (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 uppercase tracking-wide flex-shrink-0 border border-gray-200">
                                                    {doc.subject}
                                                </span>
                                            )}
                                        </div>
                                        
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                                            <span className="flex items-center gap-1">
                                                <Clock size={12} />
                                                {doc.createdAt.toLocaleDateString()}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <HardDrive size={12} />
                                                {formatSize(doc.size)}
                                            </span>
                                            {doc.pages && (
                                                <span>{doc.pages} pages</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions (Desktop) */}
                                    <div className="hidden md:flex items-center gap-2">
                                        <button
                                            onClick={() => navigate(`/documents/${doc.id}`)}
                                            className="px-4 py-2 bg-black text-white rounded-lg text-sm font-bold opacity-0 group-hover:opacity-100 transition-all hover:bg-gray-800 hover:scale-105 flex items-center gap-2 shadow-md translate-x-4 group-hover:translate-x-0"
                                        >
                                            <Eye size={16} />
                                            Open
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(doc.id, doc.title)}
                                            className="p-2 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>

                                    {/* Mobile Actions Menu (Simplified) */}
                                    <div className="md:hidden">
                                        <button
                                            onClick={() => navigate(`/documents/${doc.id}`)}
                                            className="p-2 bg-gray-100 rounded-lg text-black"
                                        >
                                            <Eye size={20} />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
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
                        <h3 className="text-xl font-bold text-black mb-2">No documents found</h3>
                        <p className="text-gray-600 mb-6 max-w-md mx-auto">
                            {searchTerm 
                                ? `No results found for "${searchTerm}". Try a different keyword.` 
                                : 'Upload your lecture notes, textbooks, or research papers to start generating quizzes and flashcards.'}
                        </p>
                        {!searchTerm && (
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
