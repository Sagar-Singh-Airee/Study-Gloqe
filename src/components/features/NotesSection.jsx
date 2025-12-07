// src/components/features/NotesSection.jsx - PREMIUM APPLE-STYLE AUTO-CATEGORIZED NOTES
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    StickyNote, Search, Trash2, Clock, FileText, Folder,
    ChevronRight, ArrowLeft, BookOpen, Atom, FlaskConical, 
    Dna, Code, Landmark, TrendingUp, BookMarked, Brain, 
    Hammer, GraduationCap, FolderOpen, Plus, Eye, Edit,
    MoreVertical, Filter, SortAsc, Calendar, Tag
} from 'lucide-react';
import { useAuth } from '@contexts/AuthContext';
import { 
    collection, query, where, onSnapshot,
    deleteDoc, doc, writeBatch
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';


const NotesSection = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    const [selectedFolder, setSelectedFolder] = useState(null); // null = show folders
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleting, setDeleting] = useState(false);


    // Premium subject configuration with Apple-style colors
    const subjectConfig = {
        'Mathematics': { 
            icon: BookOpen,
            color: 'from-gray-700 via-gray-600 to-gray-500',
            lightColor: 'from-gray-100 via-gray-50 to-white',
            accentColor: 'gray-600',
            badgeColor: 'bg-gray-100 text-gray-700 border-gray-300'
        },
        'Physics': { 
            icon: Atom,
            color: 'from-gray-600 via-gray-500 to-gray-700',
            lightColor: 'from-white via-gray-50 to-gray-100',
            accentColor: 'gray-700',
            badgeColor: 'bg-gray-50 text-gray-800 border-gray-300'
        },
        'Chemistry': { 
            icon: FlaskConical,
            color: 'from-gray-500 via-gray-600 to-gray-700',
            lightColor: 'from-gray-50 via-white to-gray-100',
            accentColor: 'gray-600',
            badgeColor: 'bg-gray-100 text-gray-700 border-gray-300'
        },
        'Biology': { 
            icon: Dna,
            color: 'from-gray-700 via-gray-800 to-gray-600',
            lightColor: 'from-gray-100 via-white to-gray-50',
            accentColor: 'gray-700',
            badgeColor: 'bg-gray-100 text-gray-800 border-gray-300'
        },
        'Computer Science': { 
            icon: Code,
            color: 'from-gray-800 via-gray-700 to-gray-900',
            lightColor: 'from-white via-gray-100 to-gray-200',
            accentColor: 'gray-800',
            badgeColor: 'bg-gray-100 text-gray-900 border-gray-400'
        },
        'History': { 
            icon: Landmark,
            color: 'from-gray-600 via-gray-700 to-gray-500',
            lightColor: 'from-gray-50 via-white to-gray-100',
            accentColor: 'gray-600',
            badgeColor: 'bg-gray-50 text-gray-700 border-gray-300'
        },
        'Economics': { 
            icon: TrendingUp,
            color: 'from-gray-700 via-gray-600 to-gray-800',
            lightColor: 'from-gray-100 via-gray-50 to-white',
            accentColor: 'gray-700',
            badgeColor: 'bg-gray-100 text-gray-800 border-gray-300'
        },
        'Literature': { 
            icon: BookMarked,
            color: 'from-gray-600 via-gray-700 to-gray-600',
            lightColor: 'from-white via-gray-50 to-gray-100',
            accentColor: 'gray-600',
            badgeColor: 'bg-gray-50 text-gray-700 border-gray-300'
        },
        'Psychology': { 
            icon: Brain,
            color: 'from-gray-700 via-gray-600 to-gray-700',
            lightColor: 'from-gray-50 via-white to-gray-100',
            accentColor: 'gray-700',
            badgeColor: 'bg-gray-100 text-gray-800 border-gray-300'
        },
        'Engineering': { 
            icon: Hammer,
            color: 'from-gray-800 via-gray-700 to-gray-900',
            lightColor: 'from-gray-100 via-white to-gray-50',
            accentColor: 'gray-800',
            badgeColor: 'bg-gray-100 text-gray-900 border-gray-400'
        },
        'General Studies': { 
            icon: GraduationCap,
            color: 'from-gray-600 via-gray-500 to-gray-600',
            lightColor: 'from-white via-gray-50 to-gray-100',
            accentColor: 'gray-600',
            badgeColor: 'bg-gray-50 text-gray-600 border-gray-200'
        }
    };


    // ✅ REAL-TIME NOTES LISTENER
    useEffect(() => {
        if (!user?.uid) {
            setLoading(false);
            return;
        }

        const notesRef = collection(db, 'notes');
        const q = query(notesRef, where('userId', '==', user.uid));

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const notesData = snapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        ...data,
                        createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt) || new Date(),
                        updatedAt: data.updatedAt?.toDate?.() || (data.updatedAt ? new Date(data.updatedAt) : null)
                    };
                }).sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));

                setNotes(notesData);
                setLoading(false);
            },
            (error) => {
                console.error('❌ Error loading notes:', error);
                toast.error('Failed to load notes');
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [user?.uid]);


    // Group notes by subject (Auto-categorization)
    const folderStats = useMemo(() => {
        const stats = {};
        notes.forEach(note => {
            const subject = note.subject || 'General Studies';
            if (!stats[subject]) {
                stats[subject] = {
                    count: 0,
                    notes: [],
                    lastUpdated: note.createdAt,
                    documents: new Set()
                };
            }
            stats[subject].count++;
            stats[subject].notes.push(note);
            if (note.documentId) stats[subject].documents.add(note.documentId);
            if (note.createdAt > stats[subject].lastUpdated) {
                stats[subject].lastUpdated = note.createdAt;
            }
        });
        return stats;
    }, [notes]);


    // Filter notes for selected folder
    const folderNotes = useMemo(() => {
        if (!selectedFolder) return [];
        return folderStats[selectedFolder]?.notes.filter(note => 
            note.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            note.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            note.documentTitle?.toLowerCase().includes(searchTerm.toLowerCase())
        ).sort((a, b) => {
            if (sortBy === 'newest') return b.createdAt - a.createdAt;
            if (sortBy === 'oldest') return a.createdAt - b.createdAt;
            if (sortBy === 'name') return (a.title || '').localeCompare(b.title || '');
            return 0;
        }) || [];
    }, [selectedFolder, folderStats, searchTerm, sortBy]);


    // Delete single note
    const deleteNote = async (noteId, noteTitle) => {
        if (!window.confirm(`Delete "${noteTitle}"?`)) return;

        try {
            await deleteDoc(doc(db, 'notes', noteId));
            toast.success('Note deleted');
        } catch (error) {
            console.error('❌ Error deleting note:', error);
            toast.error('Failed to delete note');
        }
    };


    // Delete all notes in folder
    const handleDeleteFolder = async () => {
        if (!selectedFolder) return;

        setDeleting(true);
        const toastId = toast.loading(`Deleting all ${selectedFolder} notes...`);

        try {
            const notesToDelete = folderStats[selectedFolder].notes;
            const batchSize = 500;
            const batches = [];

            for (let i = 0; i < notesToDelete.length; i += batchSize) {
                const batch = writeBatch(db);
                const chunk = notesToDelete.slice(i, i + batchSize);

                chunk.forEach(note => {
                    const docRef = doc(db, 'notes', note.id);
                    batch.delete(docRef);
                });

                batches.push(batch.commit());
            }

            await Promise.all(batches);
            toast.success(`Deleted ${notesToDelete.length} note${notesToDelete.length !== 1 ? 's' : ''}`, { id: toastId });
            setShowDeleteModal(false);
            setSelectedFolder(null);
        } catch (error) {
            console.error('❌ Error deleting folder:', error);
            toast.error('Failed to delete notes', { id: toastId });
        } finally {
            setDeleting(false);
        }
    };


    // Format date
    const formatDate = (date) => {
        if (!date) return 'Unknown';
        const d = date instanceof Date ? date : new Date(date);
        
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (d.toDateString() === today.toDateString()) {
            return `Today ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
        }
        if (d.toDateString() === yesterday.toDateString()) {
            return `Yesterday ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
        }
        
        return d.toLocaleDateString('en-US', { 
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
                            <span className="font-medium flex items-center gap-2">
                                <StickyNote size={16} />
                                {stats.count} note{stats.count !== 1 ? 's' : ''}
                            </span>
                            <span className="text-gray-500 flex items-center gap-1">
                                <FileText size={14} />
                                {stats.documents.size}
                            </span>
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


    // Render note card inside folder
    const renderNoteCard = (note, idx) => {
        const subject = note.subject || 'General Studies';
        const config = subjectConfig[subject];
        const Icon = config.icon;

        return (
            <motion.div
                key={note.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="group relative bg-gradient-to-br from-white/90 via-white/70 to-gray-50/90
                          backdrop-blur-xl rounded-2xl p-5
                          border border-gray-200/60 hover:border-gray-300
                          hover:shadow-xl hover:shadow-gray-300/30
                          transition-all duration-300"
            >
                <div className="flex gap-4">
                    {/* Note icon */}
                    <div className={`w-14 h-14 bg-gradient-to-br ${config.color} rounded-xl
                                   flex items-center justify-center shadow-lg shadow-gray-400/20
                                   group-hover:scale-105 transition-transform flex-shrink-0`}>
                        <StickyNote className="text-white" size={24} strokeWidth={2} />
                    </div>

                    {/* Note content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-2">
                            <h4 className="text-base font-bold text-gray-900 line-clamp-2 group-hover:text-gray-700">
                                {note.title || 'Untitled Note'}
                            </h4>
                            
                            {/* Subject badge */}
                            <span className={`text-xs px-2.5 py-1 rounded-lg border font-bold whitespace-nowrap ${config.badgeColor}`}>
                                {subject}
                            </span>
                        </div>

                        <p className="text-sm text-gray-600 line-clamp-2 mb-3 font-medium">
                            {note.content || 'No content'}
                        </p>

                        {/* Document reference */}
                        {note.documentTitle && (
                            <div className="flex items-center gap-2 text-xs text-gray-500 mb-2 font-semibold">
                                <FileText size={12} strokeWidth={2.5} />
                                <span className="truncate">{note.documentTitle}</span>
                            </div>
                        )}

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-200/60">
                            <div className="flex items-center gap-1 text-xs text-gray-500 font-semibold">
                                <Clock size={12} strokeWidth={2.5} />
                                {formatDate(note.createdAt)}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => note.documentId && navigate(`/study/${note.documentId}`)}
                                    disabled={!note.documentId}
                                    className="p-2 rounded-lg bg-white/80 border border-gray-300
                                             text-gray-700 hover:bg-gray-100 hover:border-gray-400
                                             transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    <Eye size={16} />
                                </button>
                                <button
                                    onClick={() => deleteNote(note.id, note.title || 'Untitled')}
                                    className="p-2 rounded-lg bg-white/80 border border-gray-300
                                             text-red-600 hover:bg-red-50 hover:border-red-400
                                             transition-all"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
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
                                {selectedFolder || 'Notes Library'}
                            </h1>
                            <p className="text-gray-600 font-medium">
                                {selectedFolder 
                                    ? `${folderNotes.length} note${folderNotes.length !== 1 ? 's' : ''} • Auto-categorized from study sessions`
                                    : `${Object.keys(folderStats).length} subjects • ${notes.length} total notes`
                                }
                            </p>
                        </div>
                    </div>

                    {selectedFolder ? (
                        <button
                            onClick={() => setShowDeleteModal(true)}
                            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700
                                     text-white rounded-xl font-bold hover:shadow-xl hover:shadow-red-600/30
                                     hover:scale-105 transition-all"
                        >
                            <Trash2 size={20} />
                            Delete Folder
                        </button>
                    ) : (
                        <button
                            onClick={() => navigate('/documents')}
                            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gray-800 to-gray-700
                                     text-white rounded-xl font-bold hover:shadow-xl hover:shadow-gray-600/30
                                     hover:scale-105 transition-all"
                        >
                            <Plus size={20} />
                            New Study Session
                        </button>
                    )}
                </div>

                {/* Search bar (only when inside folder) */}
                {selectedFolder && (
                    <div className="mb-8">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="Search notes..."
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
                        notes.length === 0 ? (
                            <motion.div 
                                key="empty"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="bg-gradient-to-br from-gray-50 to-white border-2 border-dashed border-gray-300 rounded-3xl p-20 text-center"
                            >
                                <div className="w-24 h-24 bg-gradient-to-br from-gray-200 to-gray-100 rounded-full
                                              flex items-center justify-center mx-auto mb-6 shadow-xl">
                                    <StickyNote size={48} className="text-gray-400" />
                                </div>
                                <h3 className="text-3xl font-black text-gray-900 mb-3">No notes yet</h3>
                                <p className="text-gray-600 mb-8 max-w-md mx-auto font-medium text-lg">
                                    Start a study session and take notes. They'll be automatically organized by subject!
                                </p>
                                <button
                                    onClick={() => navigate('/documents')}
                                    className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-gray-800 to-gray-700 
                                             text-white rounded-2xl font-bold hover:scale-105 transition-all shadow-2xl hover:shadow-gray-600/40"
                                >
                                    <Plus size={22} />
                                    Start Study Session
                                </button>
                            </motion.div>
                        ) : (
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
                        )
                    ) : (
                        // Notes inside folder
                        <motion.div
                            key="notes"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="space-y-3"
                        >
                            {folderNotes.length > 0 ? (
                                folderNotes.map((note, idx) => renderNoteCard(note, idx))
                            ) : (
                                <div className="text-center py-20 bg-gradient-to-br from-white to-gray-50 rounded-3xl border-2 border-dashed border-gray-300">
                                    <div className="w-20 h-20 bg-gradient-to-br from-gray-200 to-gray-100 rounded-full
                                                  flex items-center justify-center mx-auto mb-6 shadow-xl">
                                        <StickyNote size={40} className="text-gray-400" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900 mb-2">No notes found</h3>
                                    <p className="text-gray-600 font-medium">
                                        {searchTerm ? 'Try a different search term' : 'Start studying to create notes!'}
                                    </p>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Delete Folder Confirmation Modal */}
            <AnimatePresence>
                {showDeleteModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={() => !deleting && setShowDeleteModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border-2 border-gray-200"
                        >
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-3 bg-red-100 rounded-xl">
                                    <Trash2 className="w-6 h-6 text-red-600" />
                                </div>
                                <h3 className="text-2xl font-black text-gray-900">Delete {selectedFolder}?</h3>
                            </div>

                            <p className="text-gray-600 mb-6 font-semibold leading-relaxed">
                                This will permanently delete{' '}
                                <span className="font-black text-gray-900">
                                    {folderStats[selectedFolder]?.count} note{folderStats[selectedFolder]?.count !== 1 ? 's' : ''}
                                </span>{' '}
                                from {selectedFolder}. This action cannot be undone.
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    disabled={deleting}
                                    className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold 
                                             hover:bg-gray-200 transition-all disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteFolder}
                                    disabled={deleting}
                                    className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white 
                                             rounded-xl font-bold hover:from-red-700 hover:to-red-800 transition-all 
                                             disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {deleting ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Deleting...
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 size={18} />
                                            Delete Folder
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};


export default NotesSection;
