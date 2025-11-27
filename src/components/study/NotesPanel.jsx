// src/components/study/NotesPanel.jsx
import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { db } from '@/config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '@contexts/AuthContext';
import toast from 'react-hot-toast';

const NotesPanel = ({ documentId, onClose }) => {
    const { user } = useAuth();
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadNotes();
    }, [documentId]);

    const loadNotes = async () => {
        try {
            const notesRef = doc(db, 'notes', `${user.uid}_${documentId}`);
            const notesSnap = await getDoc(notesRef);

            if (notesSnap.exists()) {
                setNotes(notesSnap.data().content || '');
            }
        } catch (error) {
            console.error('Error loading notes:', error);
        }
    };

    const saveNotes = async () => {
        setSaving(true);
        try {
            const notesRef = doc(db, 'notes', `${user.uid}_${documentId}`);
            await setDoc(notesRef, {
                userId: user.uid,
                documentId,
                content: notes,
                updatedAt: new Date()
            }, { merge: true });

            toast.success('Notes saved!');
        } catch (error) {
            console.error('Error saving notes:', error);
            toast.error('Failed to save notes');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed right-0 top-[73px] bottom-0 w-80 bg-white border-l border-gray-200 shadow-2xl flex flex-col z-30">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h3 className="font-black text-black">My Notes</h3>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-gray-100 rounded-lg transition-all"
                >
                    <X size={18} />
                </button>
            </div>

            {/* Notes Textarea */}
            <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Take notes while studying..."
                className="flex-1 p-4 resize-none focus:outline-none text-sm text-gray-800"
            />

            {/* Save Button */}
            <div className="p-4 border-t border-gray-200">
                <button
                    onClick={saveNotes}
                    disabled={saving}
                    className="w-full px-4 py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    <Save size={18} />
                    {saving ? 'Saving...' : 'Save Notes'}
                </button>
            </div>
        </div>
    );
};

export default NotesPanel;
