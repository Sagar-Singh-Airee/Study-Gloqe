// src/components/features/DocumentsSection.jsx - BLACK/GRAY/SILVER/ROYAL BLUE THEME
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    FileText, Upload, Search, Trash2, Eye, Clock, HardDrive, Filter,
    BookOpen, Atom, FlaskConical, Dna, Code, Landmark, TrendingUp, 
    BookMarked, Brain, Hammer, GraduationCap, FolderOpen, X, AlertTriangle,
    LayoutGrid, List, SortAsc, Download, MoreVertical
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { deleteDocument } from '@/services/documentService';
import toast from 'react-hot-toast';


const DocumentsSection = ({ documents = [] }) => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    const [selectedSubject, setSelectedSubject] = useState('all');
    const [loading] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
    const [viewMode, setViewMode] = useState('grid');
    const [selectedDoc, setSelectedDoc] = useState(null);


    // Subject configuration - BLACK/GRAY/SILVER/ROYAL BLUE ONLY
    const subjectConfig = {
        'Mathematics': { 
            icon: BookOpen, 
            gradient: 'from-gray-700 via-gray-800 to-black',
            iconGradient: 'from-royal-blue-500 to-blue-600',
            glow: 'shadow-royal-blue-500/40',
            bg: 'bg-gradient-to-br from-gray-100 via-slate-50 to-white',
            text: 'text-gray-900',
            border: 'border-gray-300',
            iconColor: 'text-royal-blue-600'
        },
        'Physics': { 
            icon: Atom, 
            gradient: 'from-slate-700 via-gray-800 to-gray-900',
            iconGradient: 'from-blue-500 to-royal-blue-600',
            glow: 'shadow-blue-500/40',
            bg: 'bg-gradient-to-br from-slate-100 via-gray-50 to-white',
            text: 'text-gray-900',
            border: 'border-slate-300',
            iconColor: 'text-blue-600'
        },
        'Chemistry': { 
            icon: FlaskConical, 
            gradient: 'from-gray-600 via-slate-700 to-gray-800',
            iconGradient: 'from-royal-blue-600 to-indigo-600',
            glow: 'shadow-slate-500/40',
            bg: 'bg-gradient-to-br from-gray-50 via-slate-100 to-white',
            text: 'text-gray-900',
            border: 'border-gray-300',
            iconColor: 'text-royal-blue-700'
        },
        'Biology': { 
            icon: Dna, 
            gradient: 'from-slate-600 via-gray-700 to-slate-800',
            iconGradient: 'from-blue-600 to-royal-blue-700',
            glow: 'shadow-gray-500/40',
            bg: 'bg-gradient-to-br from-slate-50 via-gray-100 to-white',
            text: 'text-gray-900',
            border: 'border-slate-300',
            iconColor: 'text-blue-700'
        },
        'Computer Science': { 
            icon: Code, 
            gradient: 'from-gray-800 via-slate-800 to-black',
            iconGradient: 'from-royal-blue-500 to-blue-700',
            glow: 'shadow-royal-blue-500/50',
            bg: 'bg-gradient-to-br from-gray-100 via-slate-50 to-white',
            text: 'text-black',
            border: 'border-gray-400',
            iconColor: 'text-royal-blue-600'
        },
        'History': { 
            icon: Landmark, 
            gradient: 'from-slate-700 via-gray-700 to-slate-800',
            iconGradient: 'from-gray-600 to-slate-700',
            glow: 'shadow-slate-500/40',
            bg: 'bg-gradient-to-br from-slate-100 via-gray-50 to-white',
            text: 'text-gray-900',
            border: 'border-slate-300',
            iconColor: 'text-slate-700'
        },
        'Economics': { 
            icon: TrendingUp, 
            gradient: 'from-gray-700 via-slate-800 to-gray-900',
            iconGradient: 'from-royal-blue-600 to-blue-600',
            glow: 'shadow-blue-500/40',
            bg: 'bg-gradient-to-br from-gray-50 via-slate-100 to-white',
            text: 'text-gray-900',
            border: 'border-gray-300',
            iconColor: 'text-royal-blue-600'
        },
        'Literature': { 
            icon: BookMarked, 
            gradient: 'from-slate-600 via-gray-700 to-slate-800',
            iconGradient: 'from-gray-700 to-slate-800',
            glow: 'shadow-gray-500/40',
            bg: 'bg-gradient-to-br from-slate-50 via-gray-100 to-white',
            text: 'text-gray-900',
            border: 'border-slate-300',
            iconColor: 'text-gray-700'
        },
        'Psychology': { 
            icon: Brain, 
            gradient: 'from-gray-700 via-slate-700 to-gray-800',
            iconGradient: 'from-blue-600 to-royal-blue-700',
            glow: 'shadow-blue-500/40',
            bg: 'bg-gradient-to-br from-gray-100 via-slate-50 to-white',
            text: 'text-gray-900',
            border: 'border-gray-300',
            iconColor: 'text-blue-700'
        },
        'Engineering': { 
            icon: Hammer, 
            gradient: 'from-slate-700 via-gray-800 to-black',
            iconGradient: 'from-slate-600 to-gray-700',
            glow: 'shadow-slate-500/40',
            bg: 'bg-gradient-to-br from-slate-100 via-gray-50 to-white',
            text: 'text-gray-900',
            border: 'border-slate-300',
            iconColor: 'text-slate-700'
        },
        'General Studies': { 
            icon: GraduationCap, 
            gradient: 'from-gray-600 via-slate-700 to-gray-800',
            iconGradient: 'from-gray-500 to-slate-600',
            glow: 'shadow-gray-500/40',
            bg: 'bg-gradient-to-br from-gray-50 via-slate-100 to-white',
            text: 'text-gray-900',
            border: 'border-gray-300',
            iconColor: 'text-gray-700'
        }
    };


    // Get unique subjects with counts
    const subjectStats = useMemo(() => {
        const stats = {};
        documents.forEach(doc => {
            const subject = doc.subject || 'General Studies';
            stats[subject] = (stats[subject] || 0) + 1;
        });
        return stats;
    }, [documents]);


    // Delete single document
    const handleDelete = async (docId, title) => {
        if (window.confirm(`Delete "${title}"?`)) {
            try {
                await deleteDocument(docId);
                toast.success('Document deleted');
            } catch (error) {
                console.error("Error deleting document:", error);
                toast.error('Failed to delete document');
            }
        }
    };


    // Delete all documents
    const handleDeleteAll = async () => {
        try {
            const deletePromises = documents.map(doc => deleteDocument(doc.id));
            await Promise.all(deletePromises);
            toast.success(`All ${documents.length} documents deleted`);
            setShowDeleteAllModal(false);
        } catch (error) {
            console.error("Error deleting all documents:", error);
            toast.error('Failed to delete all documents');
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
        if (!bytes) return 'N/A';
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };


    // Grid View Document Card
    const renderGridCard = (doc, idx) => {
        const subject = doc.subject || 'General Studies';
        const config = subjectConfig[subject] || subjectConfig['General Studies'];
        const SubjectIcon = config.icon;


        return (
            <motion.div
                key={doc.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: idx * 0.02, duration: 0.3 }}
                className="group relative backdrop-blur-2xl bg-gradient-to-br from-white/80 via-gray-50/70 to-slate-100/60 
                           border-2 border-gray-300/70 rounded-2xl p-6 
                           hover:bg-gradient-to-br hover:from-white/90 hover:via-slate-50/80 hover:to-gray-100/70
                           hover:border-royal-blue-400 hover:shadow-2xl hover:shadow-royal-blue-500/20 
                           transition-all duration-300 cursor-pointer"
                onClick={() => navigate(`/study/${doc.id}`)}
            >
                {/* Accent bar - Gradient */}
                <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r ${config.gradient} rounded-t-2xl`} />
                
                {/* Header */}
                <div className="flex items-start justify-between mb-5 mt-1">
                    {/* Icon with strong gradient background */}
                    <div className={`w-14 h-14 bg-gradient-to-br ${config.gradient} rounded-xl 
                                     flex items-center justify-center flex-shrink-0 shadow-xl ${config.glow} 
                                     border border-gray-700/20`}>
                        <FileText size={24} className="text-white drop-shadow-lg" strokeWidth={2.5} />
                    </div>
                    
                    {/* Quick actions */}
                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/study/${doc.id}`);
                            }}
                            className="p-2 rounded-lg backdrop-blur-md bg-white/80 border-2 border-gray-300
                                       text-royal-blue-600 hover:text-royal-blue-700 hover:bg-royal-blue-50 
                                       hover:border-royal-blue-400 hover:shadow-lg hover:shadow-royal-blue-500/30
                                       transition-all"
                            title="Open document"
                        >
                            <Eye size={16} strokeWidth={2.5} />
                        </button>
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(doc.id, doc.title);
                            }}
                            className="p-2 rounded-lg backdrop-blur-md bg-white/80 border-2 border-gray-300
                                       text-red-500 hover:text-red-700 hover:bg-red-50 
                                       hover:border-red-400 hover:shadow-lg hover:shadow-red-500/30
                                       transition-all"
                            title="Delete document"
                        >
                            <Trash2 size={16} strokeWidth={2.5} />
                        </button>
                    </div>
                </div>


                {/* Content */}
                <div className="space-y-4">
                    <h3 className="text-lg font-black text-black line-clamp-2 group-hover:text-royal-blue-700 
                                   transition-colors leading-tight drop-shadow-sm">
                        {doc.title || 'Untitled Document'}
                    </h3>
                    
                    {/* Subject badge with icon */}
                    <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${config.bg} 
                                     ${config.text} border-2 ${config.border} backdrop-blur-sm shadow-md`}>
                        <SubjectIcon size={14} strokeWidth={2.5} className={config.iconColor} />
                        <span className="text-xs font-black tracking-wide">{subject}</span>
                    </div>


                    {/* Metadata - Enhanced visibility */}
                    <div className="space-y-2 text-xs font-bold">
                        <div className="flex items-center gap-2 text-gray-700">
                            <Clock size={14} className="text-gray-500" strokeWidth={2.5} />
                            <span>{doc.createdAt?.toLocaleDateString?.('en-US', { 
                                month: 'short', day: 'numeric', year: 'numeric'
                            })}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700">
                            <HardDrive size={14} className="text-gray-500" strokeWidth={2.5} />
                            <span>{formatSize(doc.fileSize || doc.size)}</span>
                        </div>
                        {doc.pages && (
                            <div className="text-gray-600">{doc.pages} pages</div>
                        )}
                    </div>
                </div>


                {/* Primary action button - Black to Royal Blue gradient */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/study/${doc.id}`);
                    }}
                    className="w-full mt-5 py-3 bg-gradient-to-r from-black via-gray-900 to-royal-blue-900 
                               text-white rounded-xl text-sm font-black hover:shadow-2xl hover:shadow-royal-blue-500/40
                               transition-all hover:scale-105 flex items-center justify-center gap-2 border border-gray-800"
                >
                    <Eye size={18} strokeWidth={2.5} />
                    Open Document
                </button>
            </motion.div>
        );
    };


    // List View Document Row
    const renderListRow = (doc, idx) => {
        const subject = doc.subject || 'General Studies';
        const config = subjectConfig[subject] || subjectConfig['General Studies'];
        const SubjectIcon = config.icon;


        return (
            <motion.div
                key={doc.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: idx * 0.02, duration: 0.3 }}
                className="group relative backdrop-blur-2xl bg-gradient-to-r from-white/80 via-gray-50/70 to-slate-100/60 
                           border-2 border-gray-300/70 rounded-2xl p-5 
                           hover:bg-gradient-to-r hover:from-white/90 hover:via-slate-50/80 hover:to-gray-100/70
                           hover:border-royal-blue-400 hover:shadow-2xl hover:shadow-royal-blue-500/20 
                           transition-all duration-300 cursor-pointer"
                onClick={() => navigate(`/study/${doc.id}`)}
            >
                <div className="flex items-center gap-5">
                    {/* Accent bar */}
                    <div className={`w-2 h-20 bg-gradient-to-b ${config.gradient} rounded-full flex-shrink-0 shadow-lg`} />
                    
                    {/* Icon */}
                    <div className={`w-14 h-14 bg-gradient-to-br ${config.gradient} rounded-xl 
                                     flex items-center justify-center flex-shrink-0 shadow-xl ${config.glow}
                                     border border-gray-700/20`}>
                        <FileText size={24} className="text-white drop-shadow-lg" strokeWidth={2.5} />
                    </div>


                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-black text-black truncate group-hover:text-royal-blue-700 
                                           transition-colors drop-shadow-sm">
                                {doc.title || 'Untitled Document'}
                            </h3>
                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${config.bg} 
                                             ${config.text} border-2 ${config.border} backdrop-blur-sm flex-shrink-0 shadow-md`}>
                                <SubjectIcon size={14} strokeWidth={2.5} className={config.iconColor} />
                                <span className="text-xs font-black tracking-wide">{subject}</span>
                            </div>
                        </div>


                        {/* Metadata */}
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs font-bold">
                            <span className="flex items-center gap-2 text-gray-700">
                                <Clock size={14} className="text-gray-500" strokeWidth={2.5} />
                                {doc.createdAt?.toLocaleDateString?.('en-US', { 
                                    month: 'short', day: 'numeric', year: 'numeric'
                                })}
                            </span>
                            <span className="flex items-center gap-2 text-gray-700">
                                <HardDrive size={14} className="text-gray-500" strokeWidth={2.5} />
                                {formatSize(doc.fileSize || doc.size)}
                            </span>
                            {doc.pages && (
                                <span className="text-gray-600">{doc.pages} pages</span>
                            )}
                        </div>
                    </div>


                    {/* Actions */}
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/study/${doc.id}`);
                            }}
                            className="px-5 py-2.5 bg-gradient-to-r from-black via-gray-900 to-royal-blue-900 
                                       text-white rounded-xl text-sm font-black hover:shadow-2xl hover:shadow-royal-blue-500/40
                                       transition-all hover:scale-105 flex items-center gap-2 border border-gray-800"
                        >
                            <Eye size={16} strokeWidth={2.5} />
                            Open
                        </button>
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(doc.id, doc.title);
                            }}
                            className="p-2.5 rounded-xl backdrop-blur-md bg-white/80 border-2 border-gray-300
                                       text-red-500 hover:text-red-700 hover:bg-red-50 
                                       hover:border-red-400 hover:shadow-lg hover:shadow-red-500/30
                                       transition-all hover:scale-110"
                            title="Delete document"
                        >
                            <Trash2 size={18} strokeWidth={2.5} />
                        </button>
                    </div>
                </div>
            </motion.div>
        );
    };


    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-16 h-16 border-4 border-royal-blue-600 border-t-transparent rounded-full animate-spin shadow-xl" />
            </div>
        );
    }


    return (
        <div className="relative">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
                <div className="flex-1">
                    <h1 className="text-5xl font-black bg-gradient-to-r from-black via-gray-800 to-royal-blue-700 
                                   bg-clip-text text-transparent mb-2 drop-shadow-lg">
                        My Documents
                    </h1>
                    <p className="text-gray-700 font-bold text-base">
                        {documents.length} document{documents.length !== 1 ? 's' : ''} • AI-organized
                    </p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                    {/* View Controls */}
                    <div className="flex items-center gap-1.5 backdrop-blur-xl bg-white/70 border-2 border-gray-300 rounded-xl p-1.5 shadow-lg">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2.5 rounded-lg transition-all ${
                                viewMode === 'grid' 
                                    ? 'bg-gradient-to-br from-royal-blue-600 to-blue-700 text-white shadow-xl shadow-royal-blue-500/40' 
                                    : 'text-gray-700 hover:text-royal-blue-600 hover:bg-gray-100'
                            }`}
                        >
                            <LayoutGrid size={20} strokeWidth={2.5} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2.5 rounded-lg transition-all ${
                                viewMode === 'list' 
                                    ? 'bg-gradient-to-br from-royal-blue-600 to-blue-700 text-white shadow-xl shadow-royal-blue-500/40' 
                                    : 'text-gray-700 hover:text-royal-blue-600 hover:bg-gray-100'
                            }`}
                        >
                            <List size={20} strokeWidth={2.5} />
                        </button>
                    </div>


                    {documents.length > 0 && (
                        <button
                            onClick={() => setShowDeleteAllModal(true)}
                            className="flex items-center gap-2 px-5 py-3 backdrop-blur-xl bg-white/70 
                                       text-red-600 border-2 border-red-300 rounded-xl font-bold shadow-lg
                                       hover:shadow-xl hover:shadow-red-500/30 hover:scale-105 hover:bg-red-50 
                                       transition-all"
                        >
                            <Trash2 size={18} strokeWidth={2.5} />
                            Delete All
                        </button>
                    )}
                    <button
                        onClick={() => navigate('/upload')}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-black via-gray-900 to-royal-blue-900 
                                   text-white rounded-xl font-black hover:shadow-2xl hover:shadow-royal-blue-500/40 
                                   hover:scale-105 transition-all border border-gray-800"
                    >
                        <Upload size={20} strokeWidth={2.5} />
                        Upload PDF
                    </button>
                </div>
            </div>


            {/* Search and Controls */}
            <div className="flex flex-col lg:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={22} strokeWidth={2.5} />
                    <input
                        type="text"
                        placeholder="Search documents by title or subject..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-14 pr-5 py-4 backdrop-blur-xl bg-white/70 border-2 border-gray-300 
                                   rounded-xl focus:outline-none focus:border-royal-blue-500 focus:shadow-xl 
                                   focus:shadow-royal-blue-500/30 transition-all font-bold text-black 
                                   placeholder:text-gray-500 shadow-lg"
                    />
                </div>


                <div className="flex gap-3">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`px-5 py-4 rounded-xl border-2 font-black flex items-center gap-2.5 transition-all shadow-lg ${
                            showFilters 
                                ? 'border-royal-blue-500 bg-royal-blue-50 text-royal-blue-700 shadow-xl shadow-royal-blue-500/30' 
                                : 'border-gray-300 backdrop-blur-xl bg-white/70 text-gray-800 hover:border-gray-400'
                        }`}
                    >
                        <Filter size={20} strokeWidth={2.5} />
                        <span>Filters</span>
                    </button>
                    
                    {/* Quick Stats */}
                    <div className="hidden sm:flex items-center gap-4 px-5 py-4 backdrop-blur-xl bg-white/70 
                                    border-2 border-gray-300 rounded-xl text-sm font-black text-gray-800 shadow-lg">
                        <span>{filteredDocs.length} shown</span>
                        <span className="w-1.5 h-1.5 bg-gray-500 rounded-full"></span>
                        <span>{documents.length} total</span>
                    </div>
                </div>
            </div>


            {/* Subject filters */}
            <div className="flex items-center gap-2.5 mb-6 overflow-x-auto pb-3 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent">
                <button
                    onClick={() => setSelectedSubject('all')}
                    className={`px-5 py-2.5 rounded-xl font-black text-sm whitespace-nowrap transition-all flex items-center gap-2 shadow-lg ${
                        selectedSubject === 'all'
                            ? 'bg-gradient-to-r from-black to-royal-blue-900 text-white shadow-xl shadow-royal-blue-500/40 border border-gray-800'
                            : 'backdrop-blur-md bg-white/70 text-gray-800 border-2 border-gray-300 hover:border-gray-400'
                    }`}
                >
                    <FolderOpen size={18} strokeWidth={2.5} />
                    All ({documents.length})
                </button>
                {Object.entries(subjectStats).map(([subject, count]) => {
                    const config = subjectConfig[subject] || subjectConfig['General Studies'];
                    const SubjectIcon = config.icon;
                    
                    return (
                        <button
                            key={subject}
                            onClick={() => setSelectedSubject(subject)}
                            className={`px-5 py-2.5 rounded-xl font-black text-sm whitespace-nowrap transition-all flex items-center gap-2 shadow-lg ${
                                selectedSubject === subject
                                    ? `${config.bg} ${config.text} border-2 ${config.border} shadow-xl ${config.glow} backdrop-blur-sm`
                                    : 'backdrop-blur-md bg-white/70 text-gray-800 border-2 border-gray-300 hover:border-gray-400'
                            }`}
                        >
                            <SubjectIcon size={18} strokeWidth={2.5} className={selectedSubject === subject ? config.iconColor : 'text-gray-600'} />
                            {subject} ({count})
                        </button>
                    );
                })}
            </div>


            {/* Filter panel */}
            <AnimatePresence>
                {showFilters && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden mb-6"
                    >
                        <div className="backdrop-blur-xl bg-gradient-to-br from-white/90 via-gray-50/80 to-slate-100/70 rounded-xl p-6 
                                        flex flex-wrap gap-6 items-center border-2 border-gray-300 shadow-xl">
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-black text-black">Sort by:</span>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="px-5 py-3 backdrop-blur-md bg-white/90 border-2 border-gray-400 rounded-lg 
                                               text-sm font-black text-black focus:outline-none focus:border-royal-blue-500 
                                               focus:shadow-lg focus:shadow-royal-blue-500/30 transition-all cursor-pointer shadow-md"
                                >
                                    <option value="newest">Newest First</option>
                                    <option value="oldest">Oldest First</option>
                                    <option value="name">Name (A-Z)</option>
                                    <option value="subject">Subject</option>
                                </select>
                            </div>
                            <div className="text-sm font-black text-gray-700 ml-auto flex items-center gap-2">
                                <SortAsc size={18} strokeWidth={2.5} />
                                Showing {filteredDocs.length} of {documents.length}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>


            {/* Documents grid/list */}
            <AnimatePresence mode="popLayout">
                {filteredDocs.length > 0 ? (
                    <motion.div
                        layout
                        className={viewMode === 'grid' 
                            ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
                            : "space-y-4"
                        }
                    >
                        {filteredDocs.map((doc, idx) => 
                            viewMode === 'grid' ? renderGridCard(doc, idx) : renderListRow(doc, idx)
                        )}
                    </motion.div>
                ) : (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="backdrop-blur-xl bg-gradient-to-br from-white/80 via-gray-50/70 to-slate-100/60 
                                   border-2 border-dashed border-gray-400 rounded-2xl p-20 text-center shadow-xl"
                    >
                        <div className="w-24 h-24 bg-gradient-to-br from-gray-200 via-slate-200 to-gray-300 rounded-full 
                                        flex items-center justify-center mx-auto mb-8 shadow-xl border-2 border-gray-400">
                            <FileText size={40} className="text-gray-600" strokeWidth={2.5} />
                        </div>
                        <h3 className="text-2xl font-black text-black mb-4">
                            {searchTerm || selectedSubject !== 'all' ? 'No documents found' : 'No documents yet'}
                        </h3>
                        <p className="text-gray-700 mb-10 max-w-md mx-auto font-bold text-base">
                            {searchTerm 
                                ? `No results for "${searchTerm}". Try different keywords.` 
                                : selectedSubject !== 'all'
                                ? `No documents in ${selectedSubject}. Upload to get started!`
                                : 'Upload lecture notes, textbooks, or papers. AI categorizes automatically.'}
                        </p>
                        {!searchTerm && selectedSubject === 'all' && (
                            <button
                                onClick={() => navigate('/upload')}
                                className="inline-flex items-center gap-2.5 px-8 py-4 bg-gradient-to-r from-black via-gray-900 to-royal-blue-900 
                                           text-white rounded-xl font-black hover:shadow-2xl hover:shadow-royal-blue-500/40 
                                           hover:scale-105 transition-all border border-gray-800"
                            >
                                <Upload size={20} strokeWidth={2.5} />
                                Upload First PDF
                            </button>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>


            {/* Delete All Modal */}
            <AnimatePresence>
                {showDeleteAllModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-lg flex items-center justify-center z-50 p-4"
                        onClick={() => setShowDeleteAllModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="backdrop-blur-2xl bg-white/95 rounded-2xl p-8 max-w-md w-full border-2 
                                       border-red-300 shadow-2xl shadow-red-500/30"
                        >
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-700 rounded-xl 
                                                flex items-center justify-center shadow-xl shadow-red-500/40 border border-red-800">
                                    <AlertTriangle size={28} className="text-white" strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-black">Delete All Documents?</h3>
                                    <p className="text-gray-700 font-bold text-sm mt-1">This action cannot be undone</p>
                                </div>
                            </div>
                            
                            <p className="text-gray-800 font-bold text-base mb-8 bg-red-50 border-l-4 border-red-600 p-4 rounded-lg">
                                You are about to permanently delete <span className="font-black text-red-700">{documents.length}</span> document{documents.length !== 1 ? 's' : ''}. 
                                All data will be lost.
                            </p>


                            <div className="flex gap-4">
                                <button
                                    onClick={() => setShowDeleteAllModal(false)}
                                    className="flex-1 px-5 py-3.5 backdrop-blur-md bg-gray-100 text-gray-800 border-2 
                                               border-gray-400 rounded-xl font-black hover:bg-gray-200 transition-all shadow-md"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteAll}
                                    className="flex-1 px-5 py-3.5 bg-gradient-to-r from-red-600 to-red-700 text-white 
                                               rounded-xl font-black hover:shadow-2xl hover:shadow-red-500/40 
                                               hover:scale-105 transition-all flex items-center justify-center gap-2 border border-red-800"
                                >
                                    <Trash2 size={18} strokeWidth={2.5} />
                                    Delete All
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};


export default DocumentsSection;
