import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bell, Plus, Send, Trash2,
    Users, Calendar, Megaphone,
    X, CheckCircle2
} from 'lucide-react';
import { collection, query, where, getDocs, addDoc, serverTimestamp, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { db } from '@shared/config/firebase';
import { useAuth } from '@auth/contexts/AuthContext';
import toast from 'react-hot-toast';

const Announcements = ({ classes = [], classId = null }) => {
    const { user } = useAuth();
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [newAnnouncement, setNewAnnouncement] = useState({
        title: '',
        content: '',
        classId: 'all', // 'all' or specific classId
        type: 'info' // info, warning, success
    });

    useEffect(() => {
        loadAnnouncements();
    }, [user, classes]);

    const loadAnnouncements = async () => {
        try {
            setLoading(true);
            const constraints = [
                where('teacherId', '==', user.uid),
                orderBy('createdAt', 'desc')
            ];

            const q = query(
                collection(db, 'announcements'),
                ...constraints
            );
            const snapshot = await getDocs(q);
            let data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date()
            }));

            if (classId) {
                data = data.filter(ann =>
                    ann.classId === 'all' ||
                    ann.classId === classId ||
                    (ann.targetClasses && ann.targetClasses.includes(classId))
                );
            }
            setAnnouncements(data);
        } catch (error) {
            console.error('Error loading announcements:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!newAnnouncement.title || !newAnnouncement.content) {
            toast.error('Please fill in all fields');
            return;
        }

        try {
            const classTarget = newAnnouncement.classId === 'all'
                ? classes.map(c => c.id)
                : [newAnnouncement.classId];

            await addDoc(collection(db, 'announcements'), {
                ...newAnnouncement,
                teacherId: user.uid,
                teacherName: user.displayName || 'Teacher',
                targetClasses: classTarget,
                createdAt: serverTimestamp()
            });

            toast.success('Announcement posted!');
            setShowCreate(false);
            setNewAnnouncement({ title: '', content: '', classId: 'all', type: 'info' });
            loadAnnouncements();
        } catch (error) {
            toast.error('Failed to post announcement');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this announcement?')) return;
        try {
            await deleteDoc(doc(db, 'announcements', id));
            toast.success('Announcement deleted');
            loadAnnouncements();
        } catch (error) {
            toast.error('Failed to delete');
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-black">Announcements</h2>
                    <p className="text-gray-600 mt-1">Keep your students updated</p>
                </div>
                <button
                    onClick={() => setShowCreate(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-black text-white rounded-xl font-bold hover:scale-105 transition-transform"
                >
                    <Plus size={18} />
                    New Announcement
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {announcements.length > 0 ? (
                    announcements.map((ann, idx) => (
                        <motion.div
                            key={ann.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative group"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${ann.type === 'warning' ? 'bg-orange-100 text-orange-600' :
                                        ann.type === 'success' ? 'bg-green-100 text-green-600' :
                                            'bg-blue-100 text-blue-600'
                                        }`}>
                                        <Megaphone size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-black">{ann.title}</h3>
                                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                            <Calendar size={12} />
                                            {ann.createdAt.toLocaleDateString()}
                                            <span>•</span>
                                            <Users size={12} />
                                            {ann.classId === 'all' ? 'All Classes' : classes.find(c => c.id === ann.classId)?.name}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDelete(ann.id)}
                                    className="p-2 hover:bg-red-50 text-red-600 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                            <p className="mt-4 text-gray-600 text-sm leading-relaxed">{ann.content}</p>
                        </motion.div>
                    ))
                ) : (
                    <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                        <Bell className="mx-auto text-gray-400 mb-4" size={48} />
                        <h3 className="text-lg font-bold text-black">No announcements yet</h3>
                        <p className="text-gray-500">Share updates or news with your students</p>
                    </div>
                )}
            </div>

            {/* Create Modal */}
            <AnimatePresence>
                {showCreate && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8"
                        >
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-2xl font-black text-black">New Announcement</h3>
                                <button onClick={() => setShowCreate(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleCreate} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-black mb-2">Announcement Title</label>
                                    <input
                                        type="text"
                                        required
                                        value={newAnnouncement.title}
                                        onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-black outline-none transition-all"
                                        placeholder="e.g. Mid-term Exam Date"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-black mb-2">Content</label>
                                    <textarea
                                        required
                                        rows={4}
                                        value={newAnnouncement.content}
                                        onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-black outline-none transition-all resize-none"
                                        placeholder="Enter announcement details..."
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-black mb-2">Target Class</label>
                                        <select
                                            value={newAnnouncement.classId}
                                            onChange={(e) => setNewAnnouncement({ ...newAnnouncement, classId: e.target.value })}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-black outline-none appearance-none bg-white cursor-pointer"
                                        >
                                            <option value="all">Everywhere</option>
                                            {classes.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-black mb-2">Priority</label>
                                        <select
                                            value={newAnnouncement.type}
                                            onChange={(e) => setNewAnnouncement({ ...newAnnouncement, type: e.target.value })}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-black outline-none appearance-none bg-white cursor-pointer"
                                        >
                                            <option value="info">Information</option>
                                            <option value="warning">Important</option>
                                            <option value="success">Celebration</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreate(false)}
                                        className="flex-1 px-4 py-3 border border-gray-200 rounded-xl font-bold hover:bg-gray-50 transition-all text-gray-600"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-4 py-3 bg-black text-white rounded-xl font-bold hover:scale-105 transition-transform flex items-center justify-center gap-2"
                                    >
                                        <Send size={18} />
                                        Post Now
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Announcements;
