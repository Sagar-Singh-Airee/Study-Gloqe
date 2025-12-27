// src/features/student/components/classroom/StudentAnnouncements.jsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Bell, Pin, Search, Calendar, User, MessageSquare,
    AlertCircle, Info, CheckCircle2, Star, Megaphone,
    Loader2, Filter, Clock, TrendingUp
} from 'lucide-react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@shared/config/firebase';
import { useAuth } from '@auth/contexts/AuthContext';
import toast from 'react-hot-toast';

const StudentAnnouncements = ({ classId, classData }) => {
    const { user } = useAuth();
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterPriority, setFilterPriority] = useState('all'); // all, high, normal, low

    useEffect(() => {
        loadAnnouncements();
    }, [classId]);

    const loadAnnouncements = async () => {
        try {
            setLoading(true);

            // Load announcements for this class
            const announcementsQuery = query(
                collection(db, 'announcements'),
                where('targetClasses', 'array-contains', classId),
                orderBy('createdAt', 'desc')
            );

            const snapshot = await getDocs(announcementsQuery);
            const announcementsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate?.() || new Date(),
                updatedAt: doc.data().updatedAt?.toDate?.()
            }));

            setAnnouncements(announcementsData);
        } catch (error) {
            console.error('Error loading announcements:', error);
            toast.error('Failed to load announcements');
        } finally {
            setLoading(false);
        }
    };

    const getFilteredAnnouncements = () => {
        let filtered = [...announcements];

        // Search
        if (searchQuery) {
            filtered = filtered.filter(a =>
                a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                a.content.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Priority filter
        if (filterPriority !== 'all') {
            filtered = filtered.filter(a => a.priority === filterPriority);
        }

        // Sort: pinned first, then by date
        filtered.sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return b.createdAt - a.createdAt;
        });

        return filtered;
    };

    const getPriorityConfig = (priority) => {
        const configs = {
            high: {
                icon: AlertCircle,
                color: 'text-red-600',
                bgColor: 'bg-red-50',
                borderColor: 'border-red-200',
                label: 'High Priority'
            },
            normal: {
                icon: Info,
                color: 'text-blue-600',
                bgColor: 'bg-blue-50',
                borderColor: 'border-blue-200',
                label: 'Normal'
            },
            low: {
                icon: CheckCircle2,
                color: 'text-gray-600',
                bgColor: 'bg-gray-50',
                borderColor: 'border-gray-200',
                label: 'Low Priority'
            }
        };
        return configs[priority] || configs.normal;
    };

    const getTimeAgo = (date) => {
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 7) return date.toLocaleDateString();
        if (days > 0) return `${days} day${days !== 1 ? 's' : ''} ago`;
        if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
        if (minutes > 0) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
        return 'Just now';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center">
                    <Loader2 size={48} className="text-blue-600 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600 font-semibold">Loading announcements...</p>
                </div>
            </div>
        );
    }

    const filteredAnnouncements = getFilteredAnnouncements();

    // Count by priority
    const priorityCounts = announcements.reduce((acc, a) => {
        acc[a.priority || 'normal'] = (acc[a.priority || 'normal'] || 0) + 1;
        return acc;
    }, {});

    return (
        <div className="space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white border-2 border-gray-200 rounded-xl p-5"
                >
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                            <Bell size={20} className="text-white" strokeWidth={2.5} />
                        </div>
                    </div>
                    <p className="text-3xl font-black text-gray-900 mb-1">{announcements.length}</p>
                    <p className="text-sm text-gray-600 font-semibold">Total Posts</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white border-2 border-red-200 rounded-xl p-5"
                >
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-500 rounded-lg flex items-center justify-center">
                            <AlertCircle size={20} className="text-white" strokeWidth={2.5} />
                        </div>
                    </div>
                    <p className="text-3xl font-black text-red-700 mb-1">{priorityCounts.high || 0}</p>
                    <p className="text-sm text-red-600 font-semibold">High Priority</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white border-2 border-purple-200 rounded-xl p-5"
                >
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                            <Pin size={20} className="text-white" strokeWidth={2.5} />
                        </div>
                    </div>
                    <p className="text-3xl font-black text-purple-700 mb-1">
                        {announcements.filter(a => a.pinned).length}
                    </p>
                    <p className="text-sm text-purple-600 font-semibold">Pinned</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white border-2 border-green-200 rounded-xl p-5"
                >
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-500 rounded-lg flex items-center justify-center">
                            <TrendingUp size={20} className="text-white" strokeWidth={2.5} />
                        </div>
                    </div>
                    <p className="text-3xl font-black text-green-700 mb-1">
                        {announcements.filter(a => {
                            const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                            return a.createdAt > dayAgo;
                        }).length}
                    </p>
                    <p className="text-sm text-green-600 font-semibold">Last 24 Hours</p>
                </motion.div>
            </div>

            {/* Search and Filters */}
            <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search announcements..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none font-medium"
                        />
                    </div>

                    {/* Priority Filter */}
                    <div className="flex items-center gap-2">
                        <Filter size={20} className="text-gray-600" />
                        <select
                            value={filterPriority}
                            onChange={(e) => setFilterPriority(e.target.value)}
                            className="px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none font-semibold"
                        >
                            <option value="all">All Priority</option>
                            <option value="high">High Priority</option>
                            <option value="normal">Normal</option>
                            <option value="low">Low Priority</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Announcements List */}
            {filteredAnnouncements.length > 0 ? (
                <div className="space-y-4">
                    {filteredAnnouncements.map((announcement, idx) => {
                        const priorityConfig = getPriorityConfig(announcement.priority || 'normal');
                        const PriorityIcon = priorityConfig.icon;

                        return (
                            <motion.div
                                key={announcement.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className={`bg-white border-2 rounded-xl overflow-hidden hover:shadow-xl transition-all ${announcement.pinned ? 'border-yellow-300 shadow-md' : 'border-gray-200'
                                    }`}
                            >
                                {/* Pinned Banner */}
                                {announcement.pinned && (
                                    <div className="bg-gradient-to-r from-yellow-400 to-orange-400 px-4 py-2 flex items-center gap-2">
                                        <Pin size={16} className="text-white" fill="currentColor" />
                                        <span className="text-sm font-black text-white">PINNED ANNOUNCEMENT</span>
                                    </div>
                                )}

                                <div className="p-6">
                                    {/* Header */}
                                    <div className="flex items-start gap-4 mb-4">
                                        {/* Icon */}
                                        <div className={`w-12 h-12 ${priorityConfig.bgColor} border ${priorityConfig.borderColor} rounded-xl flex items-center justify-center flex-shrink-0`}>
                                            <PriorityIcon size={24} className={priorityConfig.color} strokeWidth={2.5} />
                                        </div>

                                        {/* Title and Meta */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-3 mb-2">
                                                <h3 className="text-xl font-black text-gray-900 line-clamp-2">
                                                    {announcement.title}
                                                </h3>
                                                <span className={`px-3 py-1 ${priorityConfig.bgColor} ${priorityConfig.color} border ${priorityConfig.borderColor} rounded-lg text-xs font-bold uppercase flex-shrink-0`}>
                                                    {announcement.priority || 'normal'}
                                                </span>
                                            </div>

                                            {/* Meta Info */}
                                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                                                <div className="flex items-center gap-1.5">
                                                    <User size={14} />
                                                    <span className="font-semibold">{announcement.teacherName}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar size={14} />
                                                    <span>{announcement.createdAt.toLocaleDateString()}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Clock size={14} />
                                                    <span className="font-semibold">{getTimeAgo(announcement.createdAt)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="prose prose-sm max-w-none mb-4">
                                        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                                            {announcement.content}
                                        </p>
                                    </div>

                                    {/* Attachments */}
                                    {announcement.attachments && announcement.attachments.length > 0 && (
                                        <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                                            <p className="text-xs font-bold text-gray-600 uppercase mb-3">Attachments</p>
                                            <div className="space-y-2">
                                                {announcement.attachments.map((file, fileIdx) => (
                                                    <button
                                                        key={fileIdx}
                                                        onClick={() => window.open(file.url, '_blank')}
                                                        className="w-full flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all group"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <MessageSquare size={18} className="text-gray-600 group-hover:text-blue-600" />
                                                            <span className="font-semibold text-gray-700 group-hover:text-blue-700 text-sm">
                                                                {file.name}
                                                            </span>
                                                        </div>
                                                        <span className="text-xs text-gray-500 group-hover:text-blue-600 font-semibold">
                                                            View →
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Updated indicator */}
                                    {announcement.updatedAt && announcement.updatedAt > announcement.createdAt && (
                                        <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
                                            <Info size={14} />
                                            <span>Last updated {getTimeAgo(announcement.updatedAt)}</span>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-white rounded-xl border-2 border-gray-200 p-12 text-center">
                    <Bell size={64} className="text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {searchQuery || filterPriority !== 'all'
                            ? 'No announcements found'
                            : 'No announcements yet'}
                    </h3>
                    <p className="text-gray-600">
                        {searchQuery || filterPriority !== 'all'
                            ? 'Try adjusting your search or filters'
                            : 'Your teacher hasn\'t posted any announcements yet'}
                    </p>
                </div>
            )}
        </div>
    );
};

export default StudentAnnouncements;
