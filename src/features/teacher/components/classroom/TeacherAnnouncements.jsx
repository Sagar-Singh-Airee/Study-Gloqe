// src/features/teacher/components/classroom/TeacherAnnouncements.jsx - ANNOUNCEMENTS CENTER 📢

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Megaphone, Clock, Edit2, Trash2, Pin, AlertCircle,
    MessageSquare, Users, Eye, ThumbsUp, Search, Filter,
    ChevronDown, Send, Image, Paperclip, Smile, X
} from 'lucide-react';
import {
    collection, query, orderBy, onSnapshot, addDoc,
    updateDoc, deleteDoc, doc, serverTimestamp, increment
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/shared/config/firebase';
import { useAuth } from '../../../auth/contexts/AuthContext';
import { format, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const TeacherAnnouncements = ({ classId, classData }) => {
    const { currentUser } = useAuth();
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('all'); // all, pinned, recent
    const [stats, setStats] = useState({
        total: 0,
        pinned: 0,
        thisWeek: 0,
        totalViews: 0,
        avgEngagement: 0,
    });

    // Fetch Announcements Real-time
    useEffect(() => {
        if (!classId) return;

        const announcementsRef = collection(db, 'classes', classId, 'announcements');
        const q = query(announcementsRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const announcementList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            setAnnouncements(announcementList);
            calculateStats(announcementList);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [classId]);

    // Calculate Stats
    const calculateStats = (announcementList) => {
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const pinned = announcementList.filter(a => a.pinned).length;
        const thisWeek = announcementList.filter(a => {
            const createdAt = a.createdAt?.toDate();
            return createdAt && createdAt >= oneWeekAgo;
        }).length;

        const totalViews = announcementList.reduce((sum, a) => sum + (a.views || 0), 0);
        const totalLikes = announcementList.reduce((sum, a) => sum + (a.likes || 0), 0);
        const avgEngagement = announcementList.length > 0
            ? Math.round((totalLikes / announcementList.length))
            : 0;

        setStats({
            total: announcementList.length,
            pinned,
            thisWeek,
            totalViews,
            avgEngagement,
        });
    };

    // Filter & Search
    const filteredAnnouncements = announcements.filter(announcement => {
        const matchesSearch = announcement.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            announcement.content.toLowerCase().includes(searchQuery.toLowerCase());

        if (!matchesSearch) return false;

        switch (filterType) {
            case 'pinned':
                return announcement.pinned;
            case 'recent':
                const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                return announcement.createdAt?.toDate() >= oneWeekAgo;
            default:
                return true;
        }
    });

    // Toggle Pin
    const handleTogglePin = async (announcementId, currentPinned) => {
        try {
            await updateDoc(doc(db, 'classes', classId, 'announcements', announcementId), {
                pinned: !currentPinned,
                pinnedAt: !currentPinned ? serverTimestamp() : null,
            });
            toast.success(!currentPinned ? '📌 Announcement pinned' : 'Announcement unpinned');
        } catch (error) {
            console.error('Error toggling pin:', error);
            toast.error('Failed to update announcement');
        }
    };

    // Delete Announcement
    const handleDeleteAnnouncement = async (announcementId, title) => {
        if (!confirm(`Delete "${title}"?`)) return;

        try {
            await deleteDoc(doc(db, 'classes', classId, 'announcements', announcementId));
            toast.success('Announcement deleted');
        } catch (error) {
            console.error('Error deleting announcement:', error);
            toast.error('Failed to delete announcement');
        }
    };

    return (
        <div className="space-y-6">
            {/* Stats Overview */}
            <div className="grid md:grid-cols-5 gap-4">
                <StatCard
                    icon={Megaphone}
                    label="Total Posts"
                    value={stats.total}
                    gradient="from-blue-500 to-cyan-500"
                />
                <StatCard
                    icon={Pin}
                    label="Pinned"
                    value={stats.pinned}
                    gradient="from-yellow-500 to-orange-500"
                />
                <StatCard
                    icon={Clock}
                    label="This Week"
                    value={stats.thisWeek}
                    gradient="from-green-500 to-teal-500"
                />
                <StatCard
                    icon={Eye}
                    label="Total Views"
                    value={stats.totalViews}
                    gradient="from-purple-500 to-pink-500"
                />
                <StatCard
                    icon={ThumbsUp}
                    label="Avg Engagement"
                    value={stats.avgEngagement}
                    gradient="from-red-500 to-pink-500"
                />
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 w-full">
                    {/* Search */}
                    <div className="relative flex-1 max-w-md">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search announcements..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all text-sm font-semibold"
                        />
                    </div>

                    {/* Filter */}
                    <div className="relative">
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="appearance-none pl-4 pr-10 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all text-sm font-bold text-gray-700 bg-white cursor-pointer"
                        >
                            <option value="all">All Posts</option>
                            <option value="pinned">Pinned Only</option>
                            <option value="recent">Recent (7d)</option>
                        </select>
                        <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                </div>

                {/* Create Button */}
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl text-sm font-bold hover:shadow-lg hover:scale-105 transition-all whitespace-nowrap"
                >
                    <Plus size={18} />
                    New Announcement
                </button>
            </div>

            {/* Announcements Feed */}
            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => <AnnouncementSkeleton key={i} />)}
                </div>
            ) : filteredAnnouncements.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-300">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-full flex items-center justify-center mx-auto mb-5 border-4 border-white shadow-lg">
                        <Megaphone size={40} className="text-blue-600" />
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 mb-2">
                        {searchQuery ? 'No Results Found' : 'No Announcements Yet'}
                    </h3>
                    <p className="text-sm text-gray-600 mb-6">
                        {searchQuery
                            ? 'Try adjusting your search or filters'
                            : 'Post your first announcement to communicate with students!'}
                    </p>
                    {!searchQuery && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl text-sm font-bold hover:shadow-lg hover:scale-105 transition-all"
                        >
                            <Plus size={18} />
                            Create First Announcement
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredAnnouncements.map((announcement, idx) => (
                        <AnnouncementCard
                            key={announcement.id}
                            announcement={announcement}
                            classData={classData}
                            onTogglePin={handleTogglePin}
                            onDelete={handleDeleteAnnouncement}
                            delay={idx * 0.05}
                        />
                    ))}
                </div>
            )}

            {/* Create Announcement Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <CreateAnnouncementModal
                        classId={classId}
                        classData={classData}
                        teacherId={currentUser.uid}
                        teacherName={currentUser.displayName}
                        teacherPhoto={currentUser.photoURL}
                        onClose={() => setShowCreateModal(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

// Stat Card Component
const StatCard = ({ icon: Icon, label, value, gradient }) => {
    return (
        <motion.div
            whileHover={{ y: -4, scale: 1.02 }}
            className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-lg transition-all"
        >
            <div className={`w-12 h-12 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center mb-3`}>
                <Icon size={20} className="text-white" />
            </div>
            <div className="text-2xl font-black text-gray-900 mb-1">{value}</div>
            <div className="text-xs text-gray-600 font-semibold">{label}</div>
        </motion.div>
    );
};

// Announcement Card Component
const AnnouncementCard = ({ announcement, classData, onTogglePin, onDelete, delay }) => {
    const timeAgo = announcement.createdAt
        ? formatDistanceToNow(announcement.createdAt.toDate(), { addSuffix: true })
        : 'Just now';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
            className={`bg-white border-2 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all ${announcement.pinned ? 'border-yellow-300 bg-yellow-50/30' : 'border-gray-200'
                }`}
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3 flex-1">
                    <img
                        src={announcement.teacherPhoto || `https://ui-avatars.com/api/?name=${announcement.teacherName}&background=random`}
                        alt={announcement.teacherName}
                        className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-md"
                    />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-black text-gray-900">{announcement.teacherName}</h4>
                            {announcement.pinned && (
                                <span className="px-2 py-0.5 bg-yellow-100 border border-yellow-300 text-yellow-700 rounded-lg text-xs font-bold flex items-center gap-1">
                                    <Pin size={12} />
                                    Pinned
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-gray-600 font-semibold">{timeAgo}</p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onTogglePin(announcement.id, announcement.pinned)}
                        className={`p-2 rounded-lg transition-all ${announcement.pinned
                            ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        title={announcement.pinned ? 'Unpin' : 'Pin'}
                    >
                        <Pin size={16} />
                    </button>
                    <button
                        onClick={() => onDelete(announcement.id, announcement.title)}
                        className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-all"
                        title="Delete"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            {/* Title */}
            <h3 className="text-xl font-black text-gray-900 mb-3">
                {announcement.title}
            </h3>

            {/* Content */}
            <p className="text-sm text-gray-700 leading-relaxed mb-4 whitespace-pre-wrap">
                {announcement.content}
            </p>

            {/* Image/Attachment */}
            {announcement.imageUrl && (
                <div className="mb-4 rounded-xl overflow-hidden border-2 border-gray-200">
                    <img
                        src={announcement.imageUrl}
                        alt="Announcement"
                        className="w-full h-auto object-cover"
                    />
                </div>
            )}

            {/* Engagement Stats */}
            <div className="flex items-center gap-6 pt-4 border-t-2 border-gray-100">
                <div className="flex items-center gap-2 text-gray-600">
                    <Eye size={16} />
                    <span className="text-sm font-bold">{announcement.views || 0} views</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                    <ThumbsUp size={16} />
                    <span className="text-sm font-bold">{announcement.likes || 0} likes</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                    <MessageSquare size={16} />
                    <span className="text-sm font-bold">{announcement.comments || 0} comments</span>
                </div>
            </div>
        </motion.div>
    );
};

// Announcement Skeleton
const AnnouncementSkeleton = () => (
    <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 animate-pulse">
        <div className="flex items-start gap-3 mb-4">
            <div className="w-12 h-12 bg-gray-200 rounded-full" />
            <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-24" />
            </div>
        </div>
        <div className="h-6 bg-gray-200 rounded w-3/4 mb-3" />
        <div className="space-y-2 mb-4">
            <div className="h-4 bg-gray-100 rounded w-full" />
            <div className="h-4 bg-gray-100 rounded w-5/6" />
            <div className="h-4 bg-gray-100 rounded w-4/6" />
        </div>
        <div className="flex gap-6 pt-4 border-t-2 border-gray-100">
            <div className="h-5 bg-gray-100 rounded w-20" />
            <div className="h-5 bg-gray-100 rounded w-20" />
            <div className="h-5 bg-gray-100 rounded w-24" />
        </div>
    </div>
);

// Create Announcement Modal
const CreateAnnouncementModal = ({ classId, classData, teacherId, teacherName, teacherPhoto, onClose }) => {
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        pinned: false,
    });
    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImage(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.title || !formData.content) {
            return toast.error('Please fill in all fields');
        }

        setUploading(true);

        try {
            let imageUrl = null;

            // Upload image if provided
            if (image) {
                const fileName = `${Date.now()}_${image.name}`;
                const imageRef = ref(storage, `classes/${classId}/announcements/${fileName}`);

                const uploadTask = uploadBytesResumable(imageRef, image);

                await new Promise((resolve, reject) => {
                    uploadTask.on('state_changed',
                        (snapshot) => {
                            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                            setUploadProgress(progress);
                        },
                        (error) => reject(error),
                        async () => {
                            imageUrl = await getDownloadURL(uploadTask.snapshot.ref);
                            resolve();
                        }
                    );
                });
            }

            // Create announcement
            await addDoc(collection(db, 'classes', classId, 'announcements'), {
                title: formData.title,
                content: formData.content,
                pinned: formData.pinned,
                imageUrl,
                teacherId,
                teacherName,
                teacherPhoto,
                views: 0,
                likes: 0,
                comments: 0,
                createdAt: serverTimestamp(),
            });

            toast.success('📢 Announcement posted!');
            onClose();
        } catch (error) {
            console.error('Error creating announcement:', error);
            toast.error('Failed to post announcement');
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto"
            >
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <Megaphone size={32} className="text-white" />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900">Create Announcement</h2>
                    <p className="text-sm text-gray-600 mt-2">Share important updates with {classData.studentCount} students</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Title */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Title *</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                            placeholder="e.g., Important: Exam Schedule"
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all text-sm font-semibold"
                            disabled={uploading}
                        />
                    </div>

                    {/* Content */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Message *</label>
                        <textarea
                            value={formData.content}
                            onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                            placeholder="Write your announcement..."
                            rows={6}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all text-sm font-semibold resize-none"
                            disabled={uploading}
                        />
                    </div>

                    {/* Image Upload */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Image (Optional)</label>
                        {imagePreview ? (
                            <div className="relative rounded-xl overflow-hidden border-2 border-gray-200">
                                <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover" />
                                <button
                                    type="button"
                                    onClick={() => {
                                        setImage(null);
                                        setImagePreview(null);
                                    }}
                                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ) : (
                            <div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    className="hidden"
                                    id="image-upload"
                                    disabled={uploading}
                                />
                                <label
                                    htmlFor="image-upload"
                                    className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer"
                                >
                                    <Image size={18} className="text-gray-600" />
                                    <span className="text-sm font-semibold text-gray-600">Add Image</span>
                                </label>
                            </div>
                        )}
                    </div>

                    {/* Pin Option */}
                    <div className="flex items-center gap-3 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl">
                        <input
                            type="checkbox"
                            id="pin-announcement"
                            checked={formData.pinned}
                            onChange={(e) => setFormData(prev => ({ ...prev, pinned: e.target.checked }))}
                            className="w-5 h-5 rounded border-2 border-yellow-300"
                            disabled={uploading}
                        />
                        <label htmlFor="pin-announcement" className="text-sm font-bold text-gray-700 cursor-pointer flex items-center gap-2">
                            <Pin size={16} className="text-yellow-600" />
                            Pin this announcement to the top
                        </label>
                    </div>

                    {/* Upload Progress */}
                    {uploading && image && (
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs font-bold text-gray-700">
                                <span>Uploading image...</span>
                                <span>{Math.round(uploadProgress)}%</span>
                            </div>
                            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${uploadProgress}%` }}
                                    transition={{ duration: 0.3 }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 border-2 border-gray-200 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all text-gray-700"
                            disabled={uploading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={uploading}
                            className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl text-sm font-bold hover:shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                        >
                            {uploading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Posting...
                                </>
                            ) : (
                                <>
                                    <Send size={16} />
                                    Post Announcement
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
};

export default TeacherAnnouncements;
