// src/components/classroom/AnnouncementsTab.jsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Plus, Bell, Pin, Trash2, Edit, MessageSquare,
    Calendar, AlertCircle, CheckCircle2, Info, Loader2, X
} from 'lucide-react';
import {
    createAnnouncement,
    getAnnouncements,
    deleteAnnouncement,
    togglePinAnnouncement,
    listenToAnnouncements,
    markAnnouncementAsRead
} from '@classroom/services/announcementService';
import { useAuth } from '@auth/contexts/AuthContext';
import toast from 'react-hot-toast';

const AnnouncementsTab = ({ classId, isTeacher }) => {
    const { user } = useAuth();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newAnnouncement, setNewAnnouncement] = useState({
        title: '',
        content: '', // Changed from 'message' to 'content'
        type: 'info'
    });
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Load announcements with real-time updates
    useEffect(() => {
        if (!classId) return;

        setLoading(true);

        // Subscribe to real-time updates
        const unsubscribe = listenToAnnouncements(classId, (announcementsData) => {
            setAnnouncements(announcementsData);
            setLoading(false);

            // Mark new announcements as read for students
            if (!isTeacher && user) {
                announcementsData.forEach(announcement => {
                    if (!announcement.readBy?.includes(user.uid)) {
                        markAnnouncementAsRead(announcement.id, user.uid).catch(console.error);
                    }
                });
            }
        });

        return () => unsubscribe();
    }, [classId, isTeacher, user]);

    const getTypeConfig = (type) => {
        switch (type) {
            case 'important':
                return {
                    bg: 'bg-red-50',
                    border: 'border-red-200',
                    icon: AlertCircle,
                    iconColor: 'text-red-600',
                    badgeBg: 'bg-red-100',
                    badgeText: 'text-red-700'
                };
            case 'alert':
                return {
                    bg: 'bg-orange-50',
                    border: 'border-orange-200',
                    icon: AlertCircle,
                    iconColor: 'text-orange-600',
                    badgeBg: 'bg-orange-100',
                    badgeText: 'text-orange-700'
                };
            case 'success':
                return {
                    bg: 'bg-green-50',
                    border: 'border-green-200',
                    icon: CheckCircle2,
                    iconColor: 'text-green-600',
                    badgeBg: 'bg-green-100',
                    badgeText: 'text-green-700'
                };
            default:
                return {
                    bg: 'bg-blue-50',
                    border: 'border-blue-200',
                    icon: Info,
                    iconColor: 'text-blue-600',
                    badgeBg: 'bg-blue-100',
                    badgeText: 'text-blue-700'
                };
        }
    };

    const getTimeAgo = (date) => {
        const seconds = Math.floor((new Date() - date) / 1000);
        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
        return date.toLocaleDateString();
    };

    const handleCreateAnnouncement = async () => {
        if (!newAnnouncement.title || !newAnnouncement.content) {
            toast.error('Please fill in all fields');
            return;
        }

        setSubmitting(true);
        try {
            await createAnnouncement({
                classId,
                teacherId: user.uid,
                title: newAnnouncement.title,
                content: newAnnouncement.content,
                priority: newAnnouncement.type,
                pinned: false
            });

            toast.success('Announcement posted successfully!');
            setShowCreateModal(false);
            setNewAnnouncement({ title: '', content: '', type: 'info' });
        } catch (error) {
            console.error('Error creating announcement:', error);
            toast.error('Failed to post announcement. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteAnnouncement = async (announcementId) => {
        if (!window.confirm('Are you sure you want to delete this announcement?')) {
            return;
        }

        try {
            await deleteAnnouncement(announcementId, classId);
            toast.success('Announcement deleted successfully');
        } catch (error) {
            console.error('Error deleting announcement:', error);
            toast.error('Failed to delete announcement');
        }
    };

    const handleTogglePin = async (announcementId, currentPinned) => {
        try {
            await togglePinAnnouncement(announcementId, currentPinned);
            toast.success(currentPinned ? 'Announcement unpinned' : 'Announcement pinned');
        } catch (error) {
            console.error('Error toggling pin:', error);
            toast.error('Failed to update pin status');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 size={48} className="text-gray-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-black">Announcements</h2>
                    <p className="text-gray-600">Class updates and important notices</p>
                </div>
                {isTeacher && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl font-bold hover:scale-105 transition-all"
                    >
                        <Plus size={20} />
                        New Announcement
                    </button>
                )}
            </div>

            {/* Announcements List */}
            <div className="space-y-4">
                {announcements.map((announcement, idx) => {
                    const config = getTypeConfig(announcement.priority || announcement.type);
                    const Icon = config.icon;

                    return (
                        <motion.div
                            key={announcement.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className={`${config.bg} border ${config.border} rounded-2xl p-6 relative ${announcement.pinned ? 'ring-2 ring-offset-2 ring-black' : ''
                                }`}
                        >
                            {/* Pinned Badge */}
                            {announcement.pinned && (
                                <div className="absolute -top-3 left-6 px-3 py-1 bg-black text-white rounded-full text-xs font-bold flex items-center gap-1">
                                    <Pin size={12} />
                                    Pinned
                                </div>
                            )}

                            <div className="flex items-start gap-4">
                                {/* Icon */}
                                <div className={`w-12 h-12 ${config.badgeBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                                    <Icon size={24} className={config.iconColor} />
                                </div>

                                {/* Content */}
                                <div className="flex-1">
                                    {/* Header */}
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <h3 className="text-lg font-bold text-black mb-1">{announcement.title}</h3>
                                            <div className="flex items-center gap-3 text-sm text-gray-600">
                                                <span className="font-medium">{announcement.teacherName}</span>
                                                <span>•</span>
                                                <span className="flex items-center gap-1">
                                                    <Calendar size={14} />
                                                    {getTimeAgo(announcement.createdAt)}
                                                </span>
                                                {announcement.readCount > 0 && (
                                                    <>
                                                        <span>•</span>
                                                        <span className="text-xs">{announcement.readCount} read</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Type Badge */}
                                        <span className={`px-3 py-1 ${config.badgeBg} ${config.badgeText} rounded-full text-xs font-bold capitalize`}>
                                            {announcement.priority || announcement.type}
                                        </span>
                                    </div>

                                    {/* Message */}
                                    <p className="text-gray-700 leading-relaxed mb-4">{announcement.content}</p>

                                    {/* Footer */}
                                    <div className="flex items-center justify-between pt-4 border-t border-gray-300">
                                        <div className="text-sm text-gray-500">
                                            {announcement.readBy && `${announcement.readBy.length} students read`}
                                        </div>

                                        {isTeacher && (
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleTogglePin(announcement.id, announcement.pinned)}
                                                    className="p-2 hover:bg-white/50 rounded-lg transition-all"
                                                    title={announcement.pinned ? "Unpin" : "Pin"}
                                                >
                                                    <Pin size={16} className={announcement.pinned ? "text-black" : "text-gray-600"} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteAnnouncement(announcement.id)}
                                                    className="p-2 hover:bg-red-100 rounded-lg transition-all"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} className="text-red-600" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Empty State */}
            {announcements.length === 0 && (
                <div className="text-center py-20 bg-white border border-gray-200 rounded-2xl">
                    <Bell size={64} className="mx-auto text-gray-300 mb-4" />
                    <h3 className="text-xl font-bold text-black mb-2">No Announcements Yet</h3>
                    <p className="text-gray-600 mb-6">
                        {isTeacher
                            ? 'Post your first announcement to notify students'
                            : 'Your teacher hasn\'t posted any announcements yet'}
                    </p>
                    {isTeacher && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl font-bold hover:scale-105 transition-all"
                        >
                            <Plus size={20} />
                            Create Announcement
                        </button>
                    )}
                </div>
            )}

            {/* Create Announcement Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-2xl p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-black text-black">Create Announcement</h2>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-all"
                                disabled={submitting}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Type Selection */}
                        <div className="mb-6">
                            <label className="block text-sm font-bold text-black mb-3">Announcement Type</label>
                            <div className="grid grid-cols-4 gap-3">
                                {['info', 'important', 'alert', 'success'].map((type) => (
                                    <button
                                        key={type}
                                        onClick={() => setNewAnnouncement({ ...newAnnouncement, type })}
                                        disabled={submitting}
                                        className={`px-4 py-3 rounded-xl font-bold capitalize transition-all ${newAnnouncement.type === type
                                                ? 'bg-black text-white'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Title */}
                        <div className="mb-6">
                            <label className="block text-sm font-bold text-black mb-2">Title</label>
                            <input
                                type="text"
                                placeholder="e.g., Important: Class Cancelled Tomorrow"
                                value={newAnnouncement.title}
                                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                                disabled={submitting}
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                        </div>

                        {/* Message */}
                        <div className="mb-6">
                            <label className="block text-sm font-bold text-black mb-2">Message</label>
                            <textarea
                                placeholder="Write your announcement message..."
                                value={newAnnouncement.content}
                                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                                disabled={submitting}
                                rows={6}
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-black transition-all resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                disabled={submitting}
                                className="flex-1 py-3 border-2 border-gray-200 rounded-xl font-bold hover:bg-gray-50 transition-all text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateAnnouncement}
                                disabled={!newAnnouncement.title || !newAnnouncement.content || submitting}
                                className="flex-1 py-3 bg-black text-white rounded-xl font-bold hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        Posting...
                                    </>
                                ) : (
                                    'Post Announcement'
                                )}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default AnnouncementsTab;
