// src/components/features/NotesSection.jsx - REAL-TIME WITH FIREBASE
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Plus, 
    Search, 
    StickyNote, 
    Trash2, 
    Edit, 
    Share2, 
    Bookmark,
    Loader2,
    FileText,
    Calendar,
    Tag
} from 'lucide-react';
import { useAuth } from '@contexts/AuthContext';
import { 
    collection, 
    query, 
    where, 
    orderBy, 
    onSnapshot,
    deleteDoc,
    doc,
    updateDoc,
    addDoc,
    serverTimestamp
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useNavigate } from 'react-router-dom';

const NotesSection = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTag, setSelectedTag] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingNote, setEditingNote] = useState(null);

    // Real-time notes listener
    useEffect(() => {
        if (!currentUser) {
            setLoading(false);
            return;
        }

        console.log('📝 Setting up notes listener for user:', currentUser.uid);

        const notesRef = collection(db, 'notes');
        const q = query(
            notesRef,
            where('userId', '==', currentUser.uid),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const notesData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    created: doc.data().createdAt?.toDate() || new Date()
                }));

                console.log('📊 Loaded notes:', notesData.length);
                setNotes(notesData);
                setLoading(false);
            },
            (error) => {
                console.error('❌ Error loading notes:', error);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [currentUser]);

    // Extract all unique tags
    const allTags = [...new Set(notes.flatMap(note => note.tags || []))];

    // Filter notes
    const filteredNotes = notes.filter(note => {
        const matchesSearch = 
            note.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            note.content?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesTag = !selectedTag || note.tags?.includes(selectedTag);
        return matchesSearch && matchesTag;
    });

    // Color mapping (black/white/gray theme)
    const colors = {
        default: 'from-gray-100 to-white border-gray-300',
        dark: 'from-gray-200 to-gray-100 border-gray-400',
        light: 'from-white to-gray-50 border-gray-200',
        medium: 'from-gray-300 to-gray-200 border-gray-500'
    };

    // Delete note
    const deleteNote = async (noteId) => {
        if (!confirm('Are you sure you want to delete this note?')) return;

        try {
            await deleteDoc(doc(db, 'notes', noteId));
            console.log('✅ Note deleted:', noteId);
        } catch (error) {
            console.error('❌ Error deleting note:', error);
            alert('Failed to delete note');
        }
    };

    // Create new note
    const createNote = async (noteData) => {
        try {
            await addDoc(collection(db, 'notes'), {
                ...noteData,
                userId: currentUser.uid,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            console.log('✅ Note created');
            setShowCreateModal(false);
        } catch (error) {
            console.error('❌ Error creating note:', error);
            alert('Failed to create note');
        }
    };

    // Navigate to document
    const openDocument = (docId) => {
        if (docId) {
            navigate(`/study/${docId}`);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center">
                    <Loader2 size={48} className="animate-spin text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Loading your notes...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Header */}
            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-gradient-to-br from-black to-gray-800 rounded-2xl flex items-center justify-center shadow-lg">
                        <StickyNote className="text-white" size={28} />
                    </div>
                    <h1 className="text-4xl font-black bg-gradient-to-r from-black via-gray-800 to-black bg-clip-text text-transparent">
                        My Notes
                    </h1>
                </div>
                <p className="text-gray-600">All your study notes from sessions, automatically saved</p>
            </motion.div>

            {/* Toolbar */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border-2 border-gray-200 rounded-2xl p-5 mb-6 shadow-sm"
            >
                <div className="flex flex-wrap gap-4 items-center justify-between">
                    {/* Search */}
                    <div className="flex-1 min-w-[200px] max-w-md">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="Search notes..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:border-black focus:bg-white transition-all"
                            />
                        </div>
                    </div>

                    {/* Tags Filter */}
                    {allTags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setSelectedTag(null)}
                                className={`px-4 py-2 rounded-xl font-bold transition-all ${
                                    !selectedTag 
                                        ? 'bg-gradient-to-r from-black to-gray-800 text-white shadow-md' 
                                        : 'bg-gray-50 border border-gray-300 hover:border-black'
                                }`}
                            >
                                All
                            </button>
                            {allTags.slice(0, 5).map((tag) => (
                                <button
                                    key={tag}
                                    onClick={() => setSelectedTag(tag)}
                                    className={`px-4 py-2 rounded-xl font-bold transition-all ${
                                        selectedTag === tag 
                                            ? 'bg-gradient-to-r from-black to-gray-800 text-white shadow-md' 
                                            : 'bg-gray-50 border border-gray-300 hover:border-black'
                                    }`}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                            <FileText size={16} />
                            <span className="font-semibold">{notes.length} notes</span>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Notes Grid */}
            {filteredNotes.length === 0 ? (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-2xl p-16 text-center"
                >
                    <StickyNote size={64} className="mx-auto text-gray-300 mb-4" />
                    <h3 className="text-xl font-bold text-black mb-2">No notes found</h3>
                    <p className="text-gray-600 mb-6">
                        {searchTerm || selectedTag
                            ? 'Try adjusting your search or filters'
                            : 'Notes from your study sessions will appear here automatically'}
                    </p>
                    <button
                        onClick={() => navigate('/upload')}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-black to-gray-800 text-white rounded-xl font-bold hover:scale-105 transition-all shadow-lg"
                    >
                        <Plus size={18} />
                        Start Study Session
                    </button>
                </motion.div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence>
                        {filteredNotes.map((note, index) => (
                            <motion.div
                                key={note.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.3, delay: index * 0.05 }}
                                className={`bg-gradient-to-br ${colors[note.color || 'default']} border-2 rounded-2xl p-6 hover:scale-[1.02] hover:shadow-xl transition-all group`}
                            >
                                {/* Note Header */}
                                <div className="flex items-start justify-between mb-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-black to-gray-800 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <StickyNote size={20} className="text-white" />
                                    </div>
                                    {note.docTitle && (
                                        <button
                                            onClick={() => openDocument(note.docId)}
                                            className="text-xs px-2 py-1 rounded-lg bg-black/10 hover:bg-black/20 text-black font-semibold transition-all"
                                        >
                                            Open Doc
                                        </button>
                                    )}
                                </div>

                                {/* Note Content */}
                                <div className="mb-4">
                                    <h3 className="text-lg font-bold text-black mb-2 line-clamp-2">
                                        {note.title || 'Untitled Note'}
                                    </h3>
                                    <p className="text-sm text-gray-700 line-clamp-4">
                                        {note.content || 'No content'}
                                    </p>
                                </div>

                                {/* Document Reference */}
                                {note.docTitle && (
                                    <div className="flex items-center gap-2 text-xs text-gray-600 mb-3 pb-3 border-b border-gray-300">
                                        <FileText size={14} />
                                        <span className="truncate">{note.docTitle}</span>
                                    </div>
                                )}

                                {/* Tags */}
                                {note.tags && note.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {note.tags.map((tag) => (
                                            <span 
                                                key={tag} 
                                                className="text-xs px-2 py-1 rounded-full bg-black/10 text-black font-semibold flex items-center gap-1"
                                            >
                                                <Tag size={10} />
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Actions - Show on hover */}
                                <div className="flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity pt-3 border-t border-gray-300">
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => navigate(`/study/${note.docId}`)}
                                            className="p-2 rounded-lg hover:bg-black/10 transition-colors"
                                            title="Edit in session"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button 
                                            className="p-2 rounded-lg hover:bg-black/10 transition-colors"
                                            title="Bookmark"
                                        >
                                            <Bookmark size={16} />
                                        </button>
                                    </div>
                                    <button 
                                        onClick={() => deleteNote(note.id)}
                                        className="p-2 rounded-lg hover:bg-gray-800 hover:text-white transition-all"
                                        title="Delete"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                {/* Date */}
                                <div className="flex items-center gap-1 text-xs text-gray-500 mt-3">
                                    <Calendar size={12} />
                                    {note.created.toLocaleDateString('en-US', { 
                                        month: 'short', 
                                        day: 'numeric',
                                        year: 'numeric'
                                    })}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </>
    );
};

export default NotesSection;
