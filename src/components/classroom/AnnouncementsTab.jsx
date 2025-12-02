// src/components/classroom/AnnouncementsTab.jsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
    Plus, Bell, Pin, Trash2, Edit, MessageSquare, 
    Calendar, AlertCircle, CheckCircle2, Info 
} from 'lucide-react';
import toast from 'react-hot-toast';

const AnnouncementsTab = ({ classId, isTeacher }) => {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newAnnouncement, setNewAnnouncement] = useState({ title: '', message: '', type: 'info' });

    // Mock announcements data
    const announcements = [
        {
            id: 1,
            title: 'Final Exam Schedule Released',
            message: 'The final exam will be held on December 15th at 9:00 AM. Please review chapters 1-10 and bring your student ID.',
            type: 'important',
            author: 'Teacher Name',
            createdAt: new Date('2025-12-01'),
            isPinned: true,
            comments: 3
        },
        {
            id: 2,
            title: 'Class Cancelled - December 5th',
            message: 'Due to a faculty meeting, class on December 5th is cancelled. Material will be covered in the next session.',
            type: 'alert',
            author: 'Teacher Name',
            createdAt: new Date('2025-11-30'),
            isPinned: false,
            comments: 8
        },
        {
            id: 3,
            title: 'New Study Materials Available',
            message: 'I\'ve uploaded the practice problems and answer key for Chapter 7. Check the Materials tab.',
            type: 'info',
            author: 'Teacher Name',
            createdAt: new Date('2025-11-28'),
            isPinned: false,
            comments: 5
        },
        {
            id: 4,
            title: 'Great Job on Last Week\'s Quiz!',
            message: 'Amazing performance everyone! Class average was 88%. Keep up the excellent work! 🎉',
            type: 'success',
            author: 'Teacher Name',
            createdAt: new Date('2025-11-27'),
            isPinned: false,
            comments: 12
        },
        {
            id: 5,
            title: 'Office Hours This Week',
            message: 'I\'ll be available for office hours on Wednesday 3-5 PM and Friday 2-4 PM. Feel free to drop by with questions!',
            type: 'info',
            author: 'Teacher Name',
            createdAt: new Date('2025-11-25'),
            isPinned: false,
            comments: 2
        },
    ];

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

    const handleCreateAnnouncement = () => {
        if (!newAnnouncement.title || !newAnnouncement.message) {
            toast.error('Please fill in all fields');
            return;
        }
        toast.success('Announcement posted!');
        setShowCreateModal(false);
        setNewAnnouncement({ title: '', message: '', type: 'info' });
    };

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
                    const config = getTypeConfig(announcement.type);
                    const Icon = config.icon;

                    return (
                        <motion.div
                            key={announcement.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className={`${config.bg} border ${config.border} rounded-2xl p-6 relative ${
                                announcement.isPinned ? 'ring-2 ring-offset-2 ring-black' : ''
                            }`}
                        >
                            {/* Pinned Badge */}
                            {announcement.isPinned && (
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
                                                <span className="font-medium">{announcement.author}</span>
                                                <span>•</span>
                                                <span className="flex items-center gap-1">
                                                    <Calendar size={14} />
                                                    {getTimeAgo(announcement.createdAt)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Type Badge */}
                                        <span className={`px-3 py-1 ${config.badgeBg} ${config.badgeText} rounded-full text-xs font-bold capitalize`}>
                                            {announcement.type}
                                        </span>
                                    </div>

                                    {/* Message */}
                                    <p className="text-gray-700 leading-relaxed mb-4">{announcement.message}</p>

                                    {/* Footer */}
                                    <div className="flex items-center justify-between pt-4 border-t border-gray-300">
                                        <button className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-black transition-all">
                                            <MessageSquare size={16} />
                                            {announcement.comments} Comments
                                        </button>

                                        {isTeacher && (
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => toast.success('Announcement pinned')}
                                                    className="p-2 hover:bg-white/50 rounded-lg transition-all"
                                                >
                                                    <Pin size={16} className="text-gray-600" />
                                                </button>
                                                <button className="p-2 hover:bg-white/50 rounded-lg transition-all">
                                                    <Edit size={16} className="text-gray-600" />
                                                </button>
                                                <button className="p-2 hover:bg-red-100 rounded-lg transition-all">
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
                        <h2 className="text-2xl font-black text-black mb-6">Create Announcement</h2>

                        {/* Type Selection */}
                        <div className="mb-6">
                            <label className="block text-sm font-bold text-black mb-3">Announcement Type</label>
                            <div className="grid grid-cols-4 gap-3">
                                {['info', 'important', 'alert', 'success'].map((type) => (
                                    <button
                                        key={type}
                                        onClick={() => setNewAnnouncement({ ...newAnnouncement, type })}
                                        className={`px-4 py-3 rounded-xl font-bold capitalize transition-all ${
                                            newAnnouncement.type === type
                                                ? 'bg-black text-white'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
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
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-black transition-all"
                            />
                        </div>

                        {/* Message */}
                        <div className="mb-6">
                            <label className="block text-sm font-bold text-black mb-2">Message</label>
                            <textarea
                                placeholder="Write your announcement message..."
                                value={newAnnouncement.message}
                                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, message: e.target.value })}
                                rows={6}
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-black transition-all resize-none"
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="flex-1 py-3 border-2 border-gray-200 rounded-xl font-bold hover:bg-gray-50 transition-all text-gray-600"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateAnnouncement}
                                className="flex-1 py-3 bg-black text-white rounded-xl font-bold hover:scale-105 transition-all"
                            >
                                Post Announcement
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default AnnouncementsTab;
