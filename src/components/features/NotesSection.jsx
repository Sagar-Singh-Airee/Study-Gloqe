// src/components/features/NotesSection.jsx - CONNECTED TO STUDY SESSIONS
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Plus, 
    Search, 
    StickyNote, 
    Trash2, 
    Edit, 
    Bookmark,
    Loader2,
    FileText,
    Calendar,
    Tag,
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
    FolderOpen,
    Clock
} from 'lucide-react';
import { useAuth } from '@contexts/AuthContext';
import { 
    collection, 
    query, 
    where, 
    onSnapshot,
    deleteDoc,
    doc,
    writeBatch
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
    const [selectedSubject, setSelectedSubject] = useState('all');
    const [viewMode, setViewMode] = useState('grid'); // grid or list
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Premium subject configuration (matching your other components)
    const subjectConfig = {
        'Mathematics': { 
            icon: BookOpen,
            color: 'text-gray-700', 
            bg: 'bg-gray-100', 
            border: 'border-gray-300',
            gradient: 'from-gray-100 to-gray-200'
        },
        'Physics': { 
            icon: Atom,
            color: 'text-gray-800', 
            bg: 'bg-gray-50', 
            border: 'border-gray-300',
            gradient: 'from-gray-50 to-gray-100'
        },
        'Chemistry': { 
            icon: FlaskConical,
            color: 'text-gray-700', 
            bg: 'bg-gray-100', 
            border: 'border-gray-300',
            gradient: 'from-gray-100 to-gray-50'
        },
        'Biology': { 
            icon: Dna,
            color: 'text-gray-800', 
            bg: 'bg-gray-50', 
            border: 'border-gray-300',
            gradient: 'from-white to-gray-100'
        },
        'Computer Science': { 
            icon: Code,
            color: 'text-gray-900', 
            bg: 'bg-gray-100', 
            border: 'border-gray-400',
            gradient: 'from-gray-100 to-gray-200'
        },
        'History': { 
            icon: Landmark,
            color: 'text-gray-700', 
            bg: 'bg-gray-50', 
            border: 'border-gray-300',
            gradient: 'from-gray-50 to-white'
        },
        'Economics': { 
            icon: TrendingUp,
            color: 'text-gray-800', 
            bg: 'bg-gray-100', 
            border: 'border-gray-300',
            gradient: 'from-gray-100 to-gray-50'
        },
        'Literature': { 
            icon: BookMarked,
            color: 'text-gray-700', 
            bg: 'bg-gray-50', 
            border: 'border-gray-300',
            gradient: 'from-white to-gray-50'
        },
        'Psychology': { 
            icon: Brain,
            color: 'text-gray-800', 
            bg: 'bg-gray-100', 
            border: 'border-gray-300',
            gradient: 'from-gray-100 to-white'
        },
        'Engineering': { 
            icon: Hammer,
            color: 'text-gray-900', 
            bg: 'bg-gray-100', 
            border: 'border-gray-400',
            gradient: 'from-gray-100 to-gray-200'
        },
        'General Studies': { 
            icon: GraduationCap,
            color: 'text-gray-600', 
            bg: 'bg-gray-50', 
            border: 'border-gray-200',
            gradient: 'from-gray-50 to-white'
        }
    };

    // ✅ REAL-TIME NOTES LISTENER (Connected to study sessions)
    useEffect(() => {
        if (!user?.uid) {
            setLoading(false);
            return;
        }

        console.log('📝 Setting up real-time notes listener');

        // Query notes from study sessions
        const notesRef = collection(db, 'notes');
        const q = query(
            notesRef,
            where('userId', '==', user.uid)
        );

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
                })
                // Sort by newest first
                .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));

                console.log('📊 Loaded', notesData.length, 'notes');
                setNotes(notesData);
                setLoading(false);
            },
            (error) => {
                console.error('❌ Error loading notes:', error);
                toast.error('Failed to load notes');
                setLoading(false);
            }
        );

        return () => {
            console.log('🧹 Cleaning up notes listener');
            unsubscribe();
        };
    }, [user?.uid]);

    // Group notes by subject
    const notesBySubject = useMemo(() => {
        const grouped = {};
        notes.forEach(note => {
            const subject = note.subject || 'General Studies';
            if (!grouped[subject]) {
                grouped[subject] = [];
            }
            grouped[subject].push(note);
        });
        return grouped;
    }, [notes]);

    // Filter notes
    const filteredNotes = useMemo(() => {
        let filtered = notes;

        // Filter by subject
        if (selectedSubject !== 'all') {
            filtered = filtered.filter(note => 
                (note.subject || 'General Studies') === selectedSubject
            );
        }

        // Filter by search
        if (searchTerm) {
            filtered = filtered.filter(note =>
                note.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                note.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                note.documentTitle?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        return filtered;
    }, [notes, selectedSubject, searchTerm]);

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

    // Delete all notes
    const handleDeleteAllNotes = async () => {
        if (!user?.uid) return;

        setDeleting(true);
        const toastId = toast.loading('Deleting all notes...');

        try {
            const batchSize = 500;
            const batches = [];

            for (let i = 0; i < notes.length; i += batchSize) {
                const batch = writeBatch(db);
                const chunk = notes.slice(i, i + batchSize);

                chunk.forEach(note => {
                    const docRef = doc(db, 'notes', note.id);
                    batch.delete(docRef);
                });

                batches.push(batch.commit());
            }

            await Promise.all(batches);

            toast.success(`Deleted ${notes.length} note${notes.length !== 1 ? 's' : ''}`, { id: toastId });
            setShowDeleteModal(false);

        } catch (error) {
            console.error('❌ Error deleting notes:', error);
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
            return `Today at ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
        }
        if (d.toDateString() === yesterday.toDateString()) {
            return `Yesterday at ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
        }
        
        return d.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-16 h-16 border-4 border-gray-200 border-t-gray-700 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-gray-800 to-gray-700 rounded-xl shadow-lg">
                        <StickyNote className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-gray-900">Study Notes</h2>
                        <p className="text-gray-600 font-semibold">Notes from your study sessions</p>
                    </div>
                </div>

                {/* Delete All Button */}
                {notes.length > 0 && (
                    <button
                        onClick={() => setShowDeleteModal(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-red-200 text-red-600 rounded-xl font-bold hover:bg-red-50 hover:border-red-400 transition-all shadow-sm"
                    >
                        <Trash2 size={18} strokeWidth={2.5} />
                        Delete All
                    </button>
                )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 rounded-2xl p-5 hover:border-gray-300 hover:shadow-lg transition-all">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-gray-100 rounded-lg">
                            <StickyNote size={20} className="text-gray-700" />
                        </div>
                        <span className="text-sm font-bold text-gray-600">Total Notes</span>
                    </div>
                    <p className="text-3xl font-black text-gray-900">{notes.length}</p>
                </div>

                <div className="bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 rounded-2xl p-5 hover:border-gray-300 hover:shadow-lg transition-all">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-gray-100 rounded-lg">
                            <FolderOpen size={20} className="text-gray-700" />
                        </div>
                        <span className="text-sm font-bold text-gray-600">Subjects</span>
                    </div>
                    <p className="text-3xl font-black text-gray-900">{Object.keys(notesBySubject).length}</p>
                </div>

                <div className="bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 rounded-2xl p-5 hover:border-gray-300 hover:shadow-lg transition-all">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-gray-100 rounded-lg">
                            <FileText size={20} className="text-gray-700" />
                        </div>
                        <span className="text-sm font-bold text-gray-600">Documents</span>
                    </div>
                    <p className="text-3xl font-black text-gray-900">
                        {new Set(notes.map(n => n.documentId).filter(Boolean)).size}
                    </p>
                </div>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search notes..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-gray-400 transition-all font-semibold text-gray-900 placeholder:text-gray-500"
                    />
                </div>
            </div>

            {/* Subject Filter Tabs */}
            <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300">
                <button
                    onClick={() => setSelectedSubject('all')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all shadow-sm ${
                        selectedSubject === 'all'
                            ? 'bg-gradient-to-r from-gray-800 to-gray-700 text-white'
                            : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-gray-400'
                    }`}
                >
                    <FolderOpen size={16} strokeWidth={2.5} />
                    All ({notes.length})
                </button>

                {Object.entries(notesBySubject).map(([subject, subjectNotes]) => {
                    const config = subjectConfig[subject] || subjectConfig['General Studies'];
                    const Icon = config.icon;

                    return (
                        <button
                            key={subject}
                            onClick={() => setSelectedSubject(subject)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all shadow-sm ${
                                selectedSubject === subject
                                    ? `${config.bg} ${config.color} border-2 ${config.border}`
                                    : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-gray-400'
                            }`}
                        >
                            <Icon size={16} strokeWidth={2.5} />
                            {subject} ({subjectNotes.length})
                        </button>
                    );
                })}
            </div>

            {/* Notes Grid */}
            {filteredNotes.length === 0 ? (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-gradient-to-br from-gray-50 to-white border-2 border-dashed border-gray-300 rounded-2xl p-16 text-center"
                >
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md border-2 border-gray-200">
                        <StickyNote size={32} className="text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {searchTerm || selectedSubject !== 'all' ? 'No notes found' : 'No notes yet'}
                    </h3>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto font-semibold">
                        {searchTerm
                            ? `No results for "${searchTerm}"`
                            : selectedSubject !== 'all'
                            ? `No notes in ${selectedSubject}`
                            : 'Start a study session and take notes. They will appear here automatically.'}
                    </p>
                    {!searchTerm && selectedSubject === 'all' && (
                        <button
                            onClick={() => navigate('/documents')}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gray-800 to-gray-700 text-white rounded-xl font-bold hover:scale-105 transition-all shadow-lg"
                        >
                            <Plus size={18} />
                            Start Study Session
                        </button>
                    )}
                </motion.div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence mode="popLayout">
                        {filteredNotes.map((note, index) => {
                            const subject = note.subject || 'General Studies';
                            const config = subjectConfig[subject] || subjectConfig['General Studies'];
                            const Icon = config.icon;

                            return (
                                <motion.div
                                    key={note.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ duration: 0.3, delay: index * 0.03 }}
                                    className={`bg-gradient-to-br ${config.gradient} border-2 ${config.border} rounded-2xl p-6 hover:shadow-xl hover:border-gray-400 transition-all group cursor-pointer`}
                                    onClick={() => navigate(`/study/${note.documentId}`)}
                                >
                                    {/* Header */}
                                    <div className="flex items-start justify-between mb-4">
                                        <div className={`w-12 h-12 ${config.bg} rounded-xl flex items-center justify-center border-2 ${config.border} shadow-md`}>
                                            <Icon size={20} className={config.color} strokeWidth={2.5} />
                                        </div>
                                        {note.documentTitle && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/study/${note.documentId}`);
                                                }}
                                                className="text-xs px-3 py-1 rounded-lg bg-white/80 border border-gray-300 text-gray-700 font-bold hover:bg-white hover:border-gray-400 transition-all"
                                            >
                                                Open
                                            </button>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="mb-4">
                                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg ${config.bg} ${config.color} border ${config.border} mb-3 shadow-sm`}>
                                            <span className="text-xs font-bold">{subject}</span>
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                                            {note.title || 'Untitled Note'}
                                        </h3>
                                        <p className="text-sm text-gray-700 line-clamp-4 font-medium">
                                            {note.content || 'No content'}
                                        </p>
                                    </div>

                                    {/* Document Reference */}
                                    {note.documentTitle && (
                                        <div className="flex items-center gap-2 text-xs text-gray-600 mb-3 pb-3 border-t border-gray-300 pt-3 font-semibold">
                                            <FileText size={14} strokeWidth={2.5} />
                                            <span className="truncate">{note.documentTitle}</span>
                                        </div>
                                    )}

                                    {/* Footer */}
                                    <div className="flex items-center justify-between pt-3 border-t border-gray-300">
                                        <div className="flex items-center gap-1 text-xs text-gray-500 font-semibold">
                                            <Clock size={12} strokeWidth={2.5} />
                                            {formatDate(note.createdAt)}
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deleteNote(note.id, note.title || 'Untitled');
                                            }}
                                            className="p-2 rounded-lg hover:bg-red-100 text-red-600 transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 size={16} strokeWidth={2.5} />
                                        </button>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}

            {/* Delete All Confirmation Modal */}
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
                                <h3 className="text-2xl font-black text-gray-900">Delete All Notes?</h3>
                            </div>

                            <p className="text-gray-600 mb-6 font-semibold leading-relaxed">
                                This will permanently delete <span className="font-black text-gray-900">{notes.length} note{notes.length !== 1 ? 's' : ''}</span>. 
                                This action cannot be undone.
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    disabled={deleting}
                                    className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteAllNotes}
                                    disabled={deleting}
                                    className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-bold hover:from-red-700 hover:to-red-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {deleting ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Deleting...
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 size={18} />
                                            Delete All
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
