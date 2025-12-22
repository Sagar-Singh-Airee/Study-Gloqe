// src/components/features/NotesSection.jsx - PREMIUM LIGHT COMPACT EDITION 💎

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    StickyNote, Search, Trash2, Clock, FileText, Folder,
    ChevronRight, ArrowLeft, BookOpen, Atom, FlaskConical,
    Dna, Code, Landmark, TrendingUp, BookMarked, Brain,
    Hammer, GraduationCap, FolderOpen, Plus, Eye, Edit
} from 'lucide-react';
import { useAuth } from '@auth/contexts/AuthContext';
import {
    collection, query, where, onSnapshot,
    deleteDoc, doc, writeBatch
} from 'firebase/firestore';
import { db } from '@shared/config/firebase';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const NotesSection = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    const [selectedFolder, setSelectedFolder] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Subject configuration with teal/blue theme
    const subjectConfig = {
        'Mathematics': {
            icon: BookOpen,
            color: 'bg-blue-50 text-blue-700 border-blue-200',
            gradient: 'from-blue-500 to-teal-600'
        },
        'Physics': {
            icon: Atom,
            color: 'bg-teal-50 text-teal-700 border-teal-200',
            gradient: 'from-teal-500 to-blue-600'
        },
        'Chemistry': {
            icon: FlaskConical,
            color: 'bg-cyan-50 text-cyan-700 border-cyan-200',
            gradient: 'from-cyan-500 to-teal-600'
        },
        'Biology': {
            icon: Dna,
            color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            gradient: 'from-emerald-500 to-teal-600'
        },
        'Computer Science': {
            icon: Code,
            color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
            gradient: 'from-indigo-500 to-blue-600'
        },
        'History': {
            icon: Landmark,
            color: 'bg-amber-50 text-amber-700 border-amber-200',
            gradient: 'from-amber-500 to-orange-600'
        },
        'Economics': {
            icon: TrendingUp,
            color: 'bg-violet-50 text-violet-700 border-violet-200',
            gradient: 'from-violet-500 to-purple-600'
        },
        'Literature': {
            icon: BookMarked,
            color: 'bg-rose-50 text-rose-700 border-rose-200',
            gradient: 'from-rose-500 to-pink-600'
        },
        'Psychology': {
            icon: Brain,
            color: 'bg-purple-50 text-purple-700 border-purple-200',
            gradient: 'from-purple-500 to-indigo-600'
        },
        'Engineering': {
            icon: Hammer,
            color: 'bg-orange-50 text-orange-700 border-orange-200',
            gradient: 'from-orange-500 to-amber-600'
        },
        'General Studies': {
            icon: GraduationCap,
            color: 'bg-slate-50 text-slate-700 border-slate-200',
            gradient: 'from-slate-500 to-slate-600'
        }
    };

    // Real-time notes listener
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
                console.error('Error loading notes:', error);
                toast.error('Failed to load notes');
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [user?.uid]);

    // Group notes by subject
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
            console.error('Error deleting note:', error);
            toast.error('Failed to delete note');
        }
    };

    // Delete all notes in folder
    const handleDeleteFolder = async () => {
        if (!selectedFolder) return;

        setDeleting(true);
        const toastId = toast.loading(`Deleting notes...`);

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
            console.error('Error deleting folder:', error);
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

    // Render folder card
    const renderFolderCard = (subject, stats, idx) => {
        const config = subjectConfig[subject] || subjectConfig['General Studies'];
        const Icon = config.icon;

        return (
            <motion.button
                key={subject}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                onClick={() => setSelectedFolder(subject)}
                whileHover={{ y: -2 }}
                className="text-left bg-white border border-slate-200 rounded-xl p-4 hover:border-teal-300 hover:shadow-md transition-all"
            >
                <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 bg-gradient-to-br ${config.gradient} rounded-lg flex items-center justify-center shadow-sm`}>
                        <Icon className="text-white" size={18} strokeWidth={2.5} />
                    </div>
                    <ChevronRight className="text-slate-400" size={16} />
                </div>

                <h3 className="text-sm font-bold text-slate-900 mb-2">
                    {subject}
                </h3>

                <div className="space-y-1.5 text-[11px]">
                    <div className="flex items-center justify-between text-slate-600">
                        <span className="font-medium flex items-center gap-1.5">
                            <StickyNote size={11} />
                            {stats.count} note{stats.count !== 1 ? 's' : ''}
                        </span>
                        <span className="text-slate-500 flex items-center gap-1">
                            <FileText size={10} />
                            {stats.documents.size}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500">
                        <Clock size={10} />
                        <span className="text-[10px]">{formatDate(stats.lastUpdated)}</span>
                    </div>
                </div>
            </motion.button>
        );
    };

    // Render note card
    const renderNoteCard = (note, idx) => {
        const subject = note.subject || 'General Studies';
        const config = subjectConfig[subject];
        const Icon = config.icon;

        return (
            <motion.div
                key={note.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.02 }}
                className="group bg-white border border-slate-200 rounded-xl p-4 hover:border-teal-300 hover:shadow-sm transition-all"
            >
                <div className="flex gap-3">
                    <div className={`w-10 h-10 bg-gradient-to-br ${config.gradient} rounded-lg flex items-center justify-center shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform`}>
                        <StickyNote className="text-white" size={16} strokeWidth={2.5} />
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                            <h4 className="text-sm font-bold text-slate-900 line-clamp-2 leading-tight">
                                {note.title || 'Untitled Note'}
                            </h4>

                            <span className={`text-[10px] px-2 py-0.5 rounded-md border font-semibold whitespace-nowrap ${config.color}`}>
                                {subject}
                            </span>
                        </div>

                        <p className="text-xs text-slate-600 line-clamp-2 mb-2 leading-relaxed">
                            {note.content || 'No content'}
                        </p>

                        {note.documentTitle && (
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-2 font-medium">
                                <FileText size={10} strokeWidth={2.5} />
                                <span className="truncate">{note.documentTitle}</span>
                            </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                            <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                                <Clock size={10} strokeWidth={2.5} />
                                {formatDate(note.createdAt)}
                            </div>

                            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => note.documentId && navigate(`/study/${note.documentId}`)}
                                    disabled={!note.documentId}
                                    className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-all disabled:opacity-30"
                                >
                                    <Eye size={14} />
                                </button>
                                <button
                                    onClick={() => deleteNote(note.id, note.title || 'Untitled')}
                                    className="p-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 hover:border-rose-300 transition-all"
                                >
                                    <Trash2 size={14} />
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
            <div className="flex items-center justify-center py-20 bg-white">
                <div className="text-center">
                    <div className="w-12 h-12 border-2 border-slate-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-600">Loading notes...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            {/* Subtle background */}
            <div className="fixed inset-0 -z-10 bg-gradient-to-br from-white via-teal-50/20 to-blue-50/20" />

            <div className="max-w-7xl mx-auto px-6 py-8">

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        {selectedFolder && (
                            <button
                                onClick={() => setSelectedFolder(null)}
                                className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all"
                            >
                                <ArrowLeft size={18} className="text-slate-700" />
                            </button>
                        )}
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 mb-0.5">
                                {selectedFolder || 'Notes Library'}
                            </h1>
                            <p className="text-xs text-slate-600">
                                {selectedFolder
                                    ? `${folderNotes.length} note${folderNotes.length !== 1 ? 's' : ''}`
                                    : `${Object.keys(folderStats).length} subjects • ${notes.length} total notes`
                                }
                            </p>
                        </div>
                    </div>

                    {selectedFolder ? (
                        <button
                            onClick={() => setShowDeleteModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 hover:shadow-sm transition-all"
                        >
                            <Trash2 size={14} />
                            Delete Folder
                        </button>
                    ) : (
                        <button
                            onClick={() => navigate('/documents')}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-blue-600 text-white rounded-lg text-xs font-bold hover:shadow-sm transition-all"
                        >
                            <Plus size={14} />
                            New Study Session
                        </button>
                    )}
                </div>

                {/* Search bar */}
                {selectedFolder && (
                    <div className="mb-6">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search notes..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all text-sm text-slate-900 placeholder:text-slate-400"
                            />
                        </div>
                    </div>
                )}

                {/* Content */}
                <AnimatePresence mode="wait">
                    {!selectedFolder ? (
                        notes.length === 0 ? (
                            <motion.div
                                key="empty"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center"
                            >
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200">
                                    <StickyNote size={32} className="text-slate-400" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 mb-1">No notes yet</h3>
                                <p className="text-xs text-slate-600 mb-6 max-w-md mx-auto leading-relaxed">
                                    Start a study session and take notes. They'll be automatically organized by subject!
                                </p>
                                <button
                                    onClick={() => navigate('/documents')}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-500 to-blue-600 text-white rounded-lg text-xs font-bold hover:shadow-sm transition-all"
                                >
                                    <Plus size={14} />
                                    Start Study Session
                                </button>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="folders"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="grid grid-cols-3 gap-4"
                            >
                                {Object.entries(folderStats).map(([subject, stats], idx) =>
                                    renderFolderCard(subject, stats, idx)
                                )}
                            </motion.div>
                        )
                    ) : (
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
                                <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                                    <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 border border-slate-200">
                                        <StickyNote size={28} className="text-slate-400" />
                                    </div>
                                    <h3 className="text-base font-bold text-slate-900 mb-1">No notes found</h3>
                                    <p className="text-xs text-slate-600">
                                        {searchTerm ? 'Try a different search term' : 'Start studying to create notes!'}
                                    </p>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Delete Modal */}
            <AnimatePresence>
                {showDeleteModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={() => !deleting && setShowDeleteModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-slate-200"
                        >
                            <div className="flex items-center gap-2.5 mb-4">
                                <div className="p-2 bg-rose-50 rounded-lg border border-rose-200">
                                    <Trash2 className="w-5 h-5 text-rose-600" strokeWidth={2.5} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900">Delete {selectedFolder}?</h3>
                            </div>

                            <p className="text-xs text-slate-600 mb-6 leading-relaxed">
                                This will permanently delete{' '}
                                <span className="font-bold text-slate-900">
                                    {folderStats[selectedFolder]?.count} note{folderStats[selectedFolder]?.count !== 1 ? 's' : ''}
                                </span>{' '}
                                from {selectedFolder}. This action cannot be undone.
                            </p>

                            <div className="flex gap-2.5">
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    disabled={deleting}
                                    className="flex-1 px-4 py-2.5 bg-slate-50 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-100 border border-slate-200 transition-all disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteFolder}
                                    disabled={deleting}
                                    className="flex-1 px-4 py-2.5 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                                >
                                    {deleting ? (
                                        <>
                                            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Deleting...
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 size={14} />
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
