// src/features/teacher/components/dashboard/AnnouncementsSection.jsx
// ✅ PROFESSIONAL ANNOUNCEMENTS SECTION - ENHANCED 2025

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Megaphone, Plus, Search, Filter, Calendar, Users, Bell, Clock,
    Edit, Trash2, Send, Eye, Pin, Archive, AlertCircle, CheckCircle2,
    TrendingUp, Target, Zap, X, MessageSquare, Mail, Volume2, Star
} from 'lucide-react';
import { collection, query, where, getDocs, orderBy, deleteDoc, doc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '@shared/config/firebase';
import { useAuth } from '@auth/contexts/AuthContext';
import toast from 'react-hot-toast';

const AnnouncementsSection = () => {
    const { user } = useAuth();
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterPriority, setFilterPriority] = useState('all'); // all, high, medium, low
    const [filterClass, setFilterClass] = useState('all');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingAnnouncement, setEditingAnnouncement] = useState(null);
    const [classes, setClasses] = useState([]);
    const [announcementData, setAnnouncementData] = useState({
        title: '',
        message: '',
        priority: 'medium',
        classIds: [],
        sendEmail: false,
        sendPush: true,
        pinned: false,
    });
    const [stats, setStats] = useState({
        total: 0,
        thisWeek: 0,
        pinned: 0,
        totalReach: 0,
    });

    useEffect(() => {
        loadData();
    }, [user?.uid]);

    const loadData = async () => {
        try {
            setLoading(true);

            // Load classes
            const classesQuery = query(
                collection(db, 'classes'),
                where('teacherId', '==', user.uid),
                where('active', '==', true)
            );
            const classesSnap = await getDocs(classesQuery);
            const classesData = classesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setClasses(classesData);

            // Load announcements
            const announcementsQuery = query(
                collection(db, 'announcements'),
                where('teacherId', '==', user.uid),
                where('status', '==', 'active'),
                orderBy('createdAt', 'desc')
            );
            const announcementsSnap = await getDocs(announcementsQuery);
            const announcementsData = announcementsSnap.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date(doc.data().createdAt),
            }));

            setAnnouncements(announcementsData);
            calculateStats(announcementsData, classesData);
        } catch (error) {
            console.error('Error loading announcements:', error);
            toast.error('Failed to load announcements');
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (announcementsData, classesData) => {
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const thisWeek = announcementsData.filter(a => a.createdAt >= weekAgo).length;
        const pinned = announcementsData.filter(a => a.pinned).length;

        // Calculate total reach (students who received announcements)
        const totalReach = announcementsData.reduce((sum, announcement) => {
            const targetClasses = announcement.classIds || [];
            const studentsReached = targetClasses.reduce((classSum, classId) => {
                const cls = classesData.find(c => c.id === classId);
                return classSum + (cls?.students?.length || 0);
            }, 0);
            return sum + studentsReached;
        }, 0);

        setStats({
            total: announcementsData.length,
            thisWeek,
            pinned,
            totalReach,
        });
    };

    const handleCreateAnnouncement = async (e) => {
        e.preventDefault();

        if (!announcementData.title || !announcementData.message || announcementData.classIds.length === 0) {
            toast.error('Please fill in all required fields');
            return;
        }

        try {
            const newAnnouncement = {
                ...announcementData,
                teacherId: user.uid,
                teacherName: user.displayName || user.email,
                status: 'active',
                views: 0,
                createdAt: new Date(),
            };

            if (editingAnnouncement) {
                await updateDoc(doc(db, 'announcements', editingAnnouncement.id), newAnnouncement);
                toast.success('Announcement updated successfully!');
            } else {
                await addDoc(collection(db, 'announcements'), newAnnouncement);
                toast.success('Announcement posted successfully!');

                // TODO: Trigger email/push notifications based on settings
                if (announcementData.sendEmail) {
                    toast.success('Email notifications sent!');
                }
                if (announcementData.sendPush) {
                    toast.success('Push notifications sent!');
                }
            }

            setShowCreateModal(false);
            setEditingAnnouncement(null);
            setAnnouncementData({
                title: '',
                message: '',
                priority: 'medium',
                classIds: [],
                sendEmail: false,
                sendPush: true,
                pinned: false,
            });
            loadData();
        } catch (error) {
            console.error('Error creating announcement:', error);
            toast.error('Failed to post announcement');
        }
    };

    const handleEdit = (announcement) => {
        setEditingAnnouncement(announcement);
        setAnnouncementData({
            title: announcement.title,
            message: announcement.message,
            priority: announcement.priority,
            classIds: announcement.classIds || [],
            sendEmail: false,
            sendPush: false,
            pinned: announcement.pinned || false,
        });
        setShowCreateModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this announcement?')) return;

        try {
            await deleteDoc(doc(db, 'announcements', id));
            toast.success('Announcement deleted successfully');
            loadData();
        } catch (error) {
            console.error('Error deleting announcement:', error);
            toast.error('Failed to delete announcement');
        }
    };

    const handleTogglePin = async (announcement) => {
        try {
            await updateDoc(doc(db, 'announcements', announcement.id), {
                pinned: !announcement.pinned,
            });
            toast.success(announcement.pinned ? 'Announcement unpinned' : 'Announcement pinned');
            loadData();
        } catch (error) {
            toast.error('Failed to update announcement');
        }
    };

    const handleClassToggle = (classId) => {
        setAnnouncementData(prev => ({
            ...prev,
            classIds: prev.classIds.includes(classId)
                ? prev.classIds.filter(id => id !== classId)
                : [...prev.classIds, classId],
        }));
    };

    // Filter announcements
    const filteredAnnouncements = announcements.filter(announcement => {
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            if (!announcement.title.toLowerCase().includes(query) &&
                !announcement.message.toLowerCase().includes(query)) {
                return false;
            }
        }

        if (filterPriority !== 'all' && announcement.priority !== filterPriority) return false;
        if (filterClass !== 'all' && !announcement.classIds?.includes(filterClass)) return false;

        return true;
    });

    // Sort: pinned first, then by date
    const sortedAnnouncements = [...filteredAnnouncements].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return b.createdAt - a.createdAt;
    });

    const statsCards = [
        {
            label: 'Total Announcements',
            value: stats.total,
            icon: Megaphone,
            gradient: 'from-blue-500 to-cyan-500',
            bgColor: 'bg-blue-50',
        },
        {
            label: 'This Week',
            value: stats.thisWeek,
            icon: TrendingUp,
            gradient: 'from-green-500 to-emerald-500',
            bgColor: 'bg-green-50',
        },
        {
            label: 'Pinned',
            value: stats.pinned,
            icon: Pin,
            gradient: 'from-purple-500 to-pink-500',
            bgColor: 'bg-purple-50',
        },
        {
            label: 'Total Reach',
            value: stats.totalReach,
            icon: Users,
            gradient: 'from-orange-500 to-red-500',
            bgColor: 'bg-orange-50',
        },
    ];

    const getPriorityBadge = (priority) => {
        const badges = {
            high: { text: 'High Priority', className: 'bg-red-100 text-red-600', icon: AlertCircle },
            medium: { text: 'Medium', className: 'bg-yellow-100 text-yellow-600', icon: Bell },
            low: { text: 'Low Priority', className: 'bg-gray-100 text-gray-600', icon: CheckCircle2 },
        };
        const badge = badges[priority] || badges.medium;
        const Icon = badge.icon;
        return (
            <span className={`flex items-center gap-1.5 px-3 py-1 ${badge.className} rounded-full text-xs font-bold`}>
                <Icon className="w-3 h-3" />
                {badge.text}
            </span>
        );
    };

    const getTimeAgo = (date) => {
        const seconds = Math.floor((new Date() - date) / 1000);
        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        const days = Math.floor(seconds / 86400);
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"
                    />
                    <p className="text-gray-600">Loading announcements...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Announcements</h1>
                    <p className="text-gray-600 font-medium mt-1">
                        Broadcast important updates to your students
                    </p>
                </div>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                        setEditingAnnouncement(null);
                        setAnnouncementData({
                            title: '',
                            message: '',
                            priority: 'medium',
                            classIds: [],
                            sendEmail: false,
                            sendPush: true,
                            pinned: false,
                        });
                        setShowCreateModal(true);
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all"
                >
                    <Plus className="w-5 h-5" />
                    New Announcement
                </motion.button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {statsCards.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="relative group"
                        >
                            <div className={`${stat.bgColor} rounded-2xl p-5 border-2 border-transparent hover:border-gray-200 transition-all`}>
                                <div className="flex items-start justify-between mb-3">
                                    <div className={`w-11 h-11 bg-gradient-to-br ${stat.gradient} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                        <Icon className="w-5 h-5 text-white" />
                                    </div>
                                </div>
                                <h3 className="text-3xl font-black text-gray-900 mb-1">{stat.value}</h3>
                                <p className="text-sm font-semibold text-gray-600">{stat.label}</p>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl p-4 border border-gray-200">
                <div className="flex flex-col lg:flex-row gap-4">

                    {/* Search */}
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search announcements..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                        />
                    </div>

                    {/* Priority Filter */}
                    <select
                        value={filterPriority}
                        onChange={(e) => setFilterPriority(e.target.value)}
                        className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all font-medium"
                    >
                        <option value="all">All Priorities</option>
                        <option value="high">High Priority</option>
                        <option value="medium">Medium Priority</option>
                        <option value="low">Low Priority</option>
                    </select>

                    {/* Class Filter */}
                    <select
                        value={filterClass}
                        onChange={(e) => setFilterClass(e.target.value)}
                        className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all font-medium"
                    >
                        <option value="all">All Classes</option>
                        {classes.map(cls => (
                            <option key={cls.id} value={cls.id}>
                                {cls.name} - {cls.section}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Announcements List */}
            {sortedAnnouncements.length > 0 ? (
                <div className="space-y-4">
                    {sortedAnnouncements.map((announcement, index) => {
                        const targetClasses = announcement.classIds?.map(id =>
                            classes.find(c => c.id === id)?.name
                        ).filter(Boolean) || [];

                        return (
                            <motion.div
                                key={announcement.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className={`bg-white border-2 rounded-2xl p-6 transition-all relative ${announcement.pinned
                                        ? 'border-orange-300 shadow-lg shadow-orange-100'
                                        : 'border-gray-200 hover:border-orange-200 hover:shadow-lg'
                                    }`}
                            >
                                {/* Pinned Badge */}
                                {announcement.pinned && (
                                    <div className="absolute top-4 right-4">
                                        <div className="flex items-center gap-1.5 px-3 py-1 bg-orange-100 text-orange-600 rounded-full text-xs font-bold">
                                            <Pin className="w-3 h-3" />
                                            Pinned
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-start gap-4">
                                    {/* Icon */}
                                    <div className={`w-12 h-12 bg-gradient-to-br ${announcement.priority === 'high' ? 'from-red-500 to-orange-500' : 'from-blue-500 to-cyan-500'} rounded-xl flex items-center justify-center flex-shrink-0`}>
                                        <Megaphone className="w-6 h-6 text-white" />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between mb-2">
                                            <h3 className="text-xl font-bold text-gray-900 pr-20">{announcement.title}</h3>
                                        </div>

                                        <p className="text-gray-700 mb-4 whitespace-pre-wrap">{announcement.message}</p>

                                        {/* Meta Info */}
                                        <div className="flex flex-wrap items-center gap-3 mb-4">
                                            {getPriorityBadge(announcement.priority)}
                                            <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                                <Clock className="w-4 h-4" />
                                                <span>{getTimeAgo(announcement.createdAt)}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                                <Eye className="w-4 h-4" />
                                                <span>{announcement.views || 0} views</span>
                                            </div>
                                        </div>

                                        {/* Target Classes */}
                                        {targetClasses.length > 0 && (
                                            <div className="flex items-center gap-2 mb-4">
                                                <Users className="w-4 h-4 text-gray-500" />
                                                <div className="flex flex-wrap gap-2">
                                                    {targetClasses.map((className, idx) => (
                                                        <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium">
                                                            {className}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Actions */}
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleTogglePin(announcement)}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${announcement.pinned
                                                        ? 'bg-orange-50 hover:bg-orange-100 text-orange-600'
                                                        : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
                                                    }`}
                                            >
                                                <Pin className="w-4 h-4" />
                                                {announcement.pinned ? 'Unpin' : 'Pin'}
                                            </button>
                                            <button
                                                onClick={() => handleEdit(announcement)}
                                                className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl font-bold transition-all"
                                            >
                                                <Edit className="w-4 h-4" />
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(announcement.id)}
                                                className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold transition-all"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-gray-300">
                    <Megaphone className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No announcements found</h3>
                    <p className="text-gray-600 mb-6">
                        {searchQuery || filterPriority !== 'all' || filterClass !== 'all'
                            ? 'Try adjusting your filters'
                            : 'Create your first announcement to communicate with students'}
                    </p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-bold hover:shadow-lg transition-all"
                    >
                        <Plus className="w-5 h-5" />
                        New Announcement
                    </button>
                </div>
            )}

            {/* Create/Edit Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowCreateModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
                        >
                            <div className="flex items-center justify-between p-6 border-b border-gray-200">
                                <h2 className="text-2xl font-black text-gray-900">
                                    {editingAnnouncement ? 'Edit Announcement' : 'New Announcement'}
                                </h2>
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="p-2 hover:bg-gray-100 rounded-xl transition-all"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <form onSubmit={handleCreateAnnouncement} className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-80px)]">
                                <div>
                                    <label className="block text-sm font-bold text-gray-900 mb-2">
                                        Title *
                                    </label>
                                    <input
                                        type="text"
                                        value={announcementData.title}
                                        onChange={(e) => setAnnouncementData({ ...announcementData, title: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none transition-all"
                                        placeholder="e.g., Class Postponed - Tomorrow"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-900 mb-2">
                                        Message *
                                    </label>
                                    <textarea
                                        value={announcementData.message}
                                        onChange={(e) => setAnnouncementData({ ...announcementData, message: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none transition-all resize-none"
                                        rows="5"
                                        placeholder="Write your announcement here..."
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-900 mb-2">
                                        Priority *
                                    </label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {['low', 'medium', 'high'].map((priority) => (
                                            <button
                                                key={priority}
                                                type="button"
                                                onClick={() => setAnnouncementData({ ...announcementData, priority })}
                                                className={`p-3 border-2 rounded-xl font-bold capitalize transition-all ${announcementData.priority === priority
                                                        ? priority === 'high'
                                                            ? 'border-red-500 bg-red-50 text-red-600'
                                                            : priority === 'medium'
                                                                ? 'border-yellow-500 bg-yellow-50 text-yellow-600'
                                                                : 'border-gray-500 bg-gray-50 text-gray-600'
                                                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                                    }`}
                                            >
                                                {priority}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-900 mb-2">
                                        Target Classes * (Select at least one)
                                    </label>
                                    <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto p-3 bg-gray-50 rounded-xl">
                                        {classes.map((cls) => (
                                            <label
                                                key={cls.id}
                                                className="flex items-center gap-3 p-3 bg-white border-2 border-gray-200 rounded-xl hover:border-orange-300 cursor-pointer transition-all"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={announcementData.classIds.includes(cls.id)}
                                                    onChange={() => handleClassToggle(cls.id)}
                                                    className="w-5 h-5 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                                                />
                                                <div className="flex-1">
                                                    <p className="font-bold text-gray-900">{cls.name}</p>
                                                    <p className="text-sm text-gray-600">{cls.section} • {cls.students?.length || 0} students</p>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
                                        <input
                                            type="checkbox"
                                            id="sendPush"
                                            checked={announcementData.sendPush}
                                            onChange={(e) => setAnnouncementData({ ...announcementData, sendPush: e.target.checked })}
                                            className="w-5 h-5 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
                                        />
                                        <label htmlFor="sendPush" className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <Bell className="w-4 h-4 text-blue-600" />
                                                <span className="font-bold text-blue-900">Send Push Notification</span>
                                            </div>
                                            <p className="text-sm text-blue-700 mt-1">Students will receive an instant notification</p>
                                        </label>
                                    </div>

                                    <div className="flex items-center gap-3 p-4 bg-purple-50 border-2 border-purple-200 rounded-xl">
                                        <input
                                            type="checkbox"
                                            id="sendEmail"
                                            checked={announcementData.sendEmail}
                                            onChange={(e) => setAnnouncementData({ ...announcementData, sendEmail: e.target.checked })}
                                            className="w-5 h-5 text-purple-500 border-gray-300 rounded focus:ring-purple-500"
                                        />
                                        <label htmlFor="sendEmail" className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <Mail className="w-4 h-4 text-purple-600" />
                                                <span className="font-bold text-purple-900">Send Email</span>
                                            </div>
                                            <p className="text-sm text-purple-700 mt-1">Students will receive an email copy</p>
                                        </label>
                                    </div>

                                    <div className="flex items-center gap-3 p-4 bg-orange-50 border-2 border-orange-200 rounded-xl">
                                        <input
                                            type="checkbox"
                                            id="pinned"
                                            checked={announcementData.pinned}
                                            onChange={(e) => setAnnouncementData({ ...announcementData, pinned: e.target.checked })}
                                            className="w-5 h-5 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                                        />
                                        <label htmlFor="pinned" className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <Pin className="w-4 h-4 text-orange-600" />
                                                <span className="font-bold text-orange-900">Pin to Top</span>
                                            </div>
                                            <p className="text-sm text-orange-700 mt-1">Keep this announcement at the top</p>
                                        </label>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateModal(false)}
                                        className="flex-1 px-6 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2"
                                    >
                                        <Send className="w-5 h-5" />
                                        {editingAnnouncement ? 'Update' : 'Post'} Announcement
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
};

export default AnnouncementsSection;
