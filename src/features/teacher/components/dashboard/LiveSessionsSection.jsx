// src/features/teacher/components/dashboard/LiveSessionsSection.jsx
// ✅ PROFESSIONAL LIVE SESSIONS SECTION - ENHANCED 2025

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Video, Plus, Search, Filter, Calendar, Users, Clock, Play,
    Square, Edit, Trash2, Copy, Share2, ExternalLink, MoreVertical,
    CheckCircle2, AlertCircle, TrendingUp, Activity, Zap, X,
    Link as LinkIcon, Settings, Bell, MessageSquare, Radio
} from 'lucide-react';
import { collection, query, where, getDocs, orderBy, deleteDoc, doc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '@shared/config/firebase';
import { useAuth } from '@auth/contexts/AuthContext';
import toast from 'react-hot-toast';

const LiveSessionsSection = () => {
    const { user } = useAuth();
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('all'); // all, upcoming, live, completed
    const [filterClass, setFilterClass] = useState('all');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [classes, setClasses] = useState([]);
    const [sessionData, setSessionData] = useState({
        title: '',
        description: '',
        classId: '',
        scheduledFor: '',
        duration: 60,
        meetingLink: '',
        recordSession: false,
    });
    const [stats, setStats] = useState({
        total: 0,
        upcoming: 0,
        live: 0,
        completed: 0,
        totalAttendees: 0,
    });

    useEffect(() => {
        loadData();
        // Set up real-time listener for live sessions
        const interval = setInterval(() => {
            checkLiveSessions();
        }, 30000); // Check every 30 seconds

        return () => clearInterval(interval);
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
            setClasses(classesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

            // Load sessions
            const sessionsQuery = query(
                collection(db, 'liveSessions'),
                where('teacherId', '==', user.uid),
                orderBy('scheduledFor', 'desc')
            );
            const sessionsSnap = await getDocs(sessionsQuery);
            const sessionsData = sessionsSnap.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                scheduledFor: doc.data().scheduledFor?.toDate() || new Date(doc.data().scheduledFor),
                createdAt: doc.data().createdAt?.toDate() || new Date(doc.data().createdAt),
            }));

            setSessions(sessionsData);
            calculateStats(sessionsData);
        } catch (error) {
            console.error('Error loading sessions:', error);
            toast.error('Failed to load sessions');
        } finally {
            setLoading(false);
        }
    };

    const checkLiveSessions = async () => {
        // Update session statuses based on current time
        const now = new Date();
        sessions.forEach(async (session) => {
            const sessionEnd = new Date(session.scheduledFor.getTime() + session.duration * 60000);

            let newStatus = session.status;
            if (now >= session.scheduledFor && now <= sessionEnd && session.status === 'scheduled') {
                newStatus = 'live';
            } else if (now > sessionEnd && session.status === 'live') {
                newStatus = 'completed';
            }

            if (newStatus !== session.status) {
                try {
                    await updateDoc(doc(db, 'liveSessions', session.id), { status: newStatus });
                } catch (error) {
                    console.error('Error updating session status:', error);
                }
            }
        });

        loadData(); // Refresh data
    };

    const calculateStats = (data) => {
        const now = new Date();
        const upcoming = data.filter(s => s.scheduledFor > now && s.status === 'scheduled').length;
        const live = data.filter(s => s.status === 'live').length;
        const completed = data.filter(s => s.status === 'completed').length;
        const totalAttendees = data.reduce((sum, s) => sum + (s.attendees?.length || 0), 0);

        setStats({
            total: data.length,
            upcoming,
            live,
            completed,
            totalAttendees,
        });
    };

    const handleCreateSession = async (e) => {
        e.preventDefault();

        if (!sessionData.title || !sessionData.classId || !sessionData.scheduledFor) {
            toast.error('Please fill in all required fields');
            return;
        }

        try {
            const scheduledDate = new Date(sessionData.scheduledFor);

            // Generate meeting link if not provided (you can integrate with Agora/Jitsi here)
            const meetingLink = sessionData.meetingLink || `${window.location.origin}/live/${Date.now()}`;

            await addDoc(collection(db, 'liveSessions'), {
                ...sessionData,
                scheduledFor: scheduledDate,
                teacherId: user.uid,
                teacherName: user.displayName || user.email,
                meetingLink,
                status: 'scheduled',
                attendees: [],
                createdAt: new Date(),
            });

            setShowCreateModal(false);
            setSessionData({
                title: '',
                description: '',
                classId: '',
                scheduledFor: '',
                duration: 60,
                meetingLink: '',
                recordSession: false,
            });
            loadData();
        } catch (error) {
            console.error('Error creating session:', error);
            toast.error('Failed to create session');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this session?')) return;

        try {
            await deleteDoc(doc(db, 'liveSessions', id));
            loadData();
        } catch (error) {
            console.error('Error deleting session:', error);
            toast.error('Failed to delete session');
        }
    };

    const handleStartSession = async (session) => {
        try {
            await updateDoc(doc(db, 'liveSessions', session.id), { status: 'live' });
            window.open(session.meetingLink, '_blank');
            loadData();
        } catch (error) {
            toast.error('Failed to start session');
        }
    };

    const handleEndSession = async (session) => {
        if (!window.confirm('Are you sure you want to end this session?')) return;

        try {
            await updateDoc(doc(db, 'liveSessions', session.id), { status: 'completed' });
            loadData();
        } catch (error) {
            toast.error('Failed to end session');
        }
    };

    const handleCopyLink = (link) => {
        navigator.clipboard.writeText(link);
    };

    // Filter sessions
    const filteredSessions = sessions.filter(session => {
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            if (!session.title.toLowerCase().includes(query)) {
                return false;
            }
        }

        if (filterStatus !== 'all' && session.status !== filterStatus) return false;
        if (filterClass !== 'all' && session.classId !== filterClass) return false;

        return true;
    });

    const statsCards = [
        {
            label: 'Total Sessions',
            value: stats.total,
            icon: Video,
            gradient: 'from-blue-500 to-cyan-500',
            bgColor: 'bg-blue-50',
        },
        {
            label: 'Upcoming',
            value: stats.upcoming,
            icon: Calendar,
            gradient: 'from-purple-500 to-pink-500',
            bgColor: 'bg-purple-50',
        },
        {
            label: 'Live Now',
            value: stats.live,
            icon: Radio,
            gradient: 'from-red-500 to-orange-500',
            bgColor: 'bg-red-50',
            pulse: stats.live > 0,
        },
        {
            label: 'Total Attendees',
            value: stats.totalAttendees,
            icon: Users,
            gradient: 'from-green-500 to-emerald-500',
            bgColor: 'bg-green-50',
        },
    ];

    const getStatusBadge = (status) => {
        const badges = {
            scheduled: { text: 'Scheduled', className: 'bg-blue-100 text-blue-600', icon: Calendar },
            live: { text: 'Live', className: 'bg-red-100 text-red-600 animate-pulse', icon: Radio },
            completed: { text: 'Completed', className: 'bg-gray-100 text-gray-600', icon: CheckCircle2 },
        };
        const badge = badges[status] || badges.scheduled;
        const Icon = badge.icon;
        return (
            <span className={`flex items-center gap-1.5 px-3 py-1 ${badge.className} rounded-full text-xs font-bold`}>
                <Icon className="w-3 h-3" />
                {badge.text}
            </span>
        );
    };

    const getTimeDisplay = (scheduledFor, duration) => {
        const now = new Date();
        const diff = scheduledFor - now;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(hours / 24);

        if (diff < 0) {
            return 'Past';
        } else if (hours < 1) {
            const minutes = Math.floor(diff / (1000 * 60));
            return `In ${minutes}m`;
        } else if (hours < 24) {
            return `In ${hours}h`;
        } else {
            return `In ${days}d`;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full mx-auto mb-4"
                    />
                    <p className="text-gray-600">Loading sessions...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Live Sessions</h1>
                    <p className="text-gray-600 font-medium mt-1">
                        Schedule and manage virtual classroom sessions
                    </p>
                </div>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all"
                >
                    <Plus className="w-5 h-5" />
                    Schedule Session
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
                            <div className={`${stat.bgColor} rounded-2xl p-5 border-2 border-transparent hover:border-gray-200 transition-all ${stat.pulse ? 'ring-2 ring-red-300' : ''}`}>
                                <div className="flex items-start justify-between mb-3">
                                    <div className={`w-11 h-11 bg-gradient-to-br ${stat.gradient} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                        <Icon className="w-5 h-5 text-white" />
                                    </div>
                                    {stat.pulse && (
                                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                    )}
                                </div>
                                <h3 className="text-3xl font-black text-gray-900 mb-1">{stat.value}</h3>
                                <p className="text-sm font-semibold text-gray-600">{stat.label}</p>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Live Sessions Alert */}
            {stats.live > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl p-6 text-white relative overflow-hidden"
                >
                    <div className="absolute inset-0 opacity-20">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -mr-16 -mt-16 animate-pulse" />
                    </div>
                    <div className="relative flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center animate-pulse">
                            <Radio className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold mb-1">You have {stats.live} live session(s)</h3>
                            <p className="text-white/90">Students are waiting. Join now to start teaching.</p>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Filters */}
            <div className="bg-white rounded-2xl p-4 border border-gray-200">
                <div className="flex flex-col lg:flex-row gap-4">

                    {/* Search */}
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search sessions..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                        />
                    </div>

                    {/* Status Filter */}
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all font-medium"
                    >
                        <option value="all">All Status</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="live">Live</option>
                        <option value="completed">Completed</option>
                    </select>

                    {/* Class Filter */}
                    <select
                        value={filterClass}
                        onChange={(e) => setFilterClass(e.target.value)}
                        className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all font-medium"
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

            {/* Sessions List */}
            {filteredSessions.length > 0 ? (
                <div className="space-y-4">
                    {filteredSessions.map((session, index) => {
                        const className = classes.find(c => c.id === session.classId)?.name || 'Unknown Class';
                        const attendeeCount = session.attendees?.length || 0;
                        const isLive = session.status === 'live';
                        const isUpcoming = session.status === 'scheduled' && session.scheduledFor > new Date();

                        return (
                            <motion.div
                                key={session.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className={`bg-white border-2 rounded-2xl p-6 transition-all ${isLive
                                    ? 'border-red-300 shadow-lg shadow-red-100'
                                    : 'border-gray-200 hover:border-red-200 hover:shadow-lg'
                                    }`}
                            >
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">

                                    {/* Session Info */}
                                    <div className="flex items-start gap-4 flex-1">
                                        <div className={`w-14 h-14 bg-gradient-to-br ${isLive ? 'from-red-500 to-orange-500' : 'from-blue-500 to-cyan-500'} rounded-xl flex items-center justify-center flex-shrink-0 ${isLive ? 'animate-pulse' : ''}`}>
                                            <Video className="w-7 h-7 text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="text-xl font-bold text-gray-900">{session.title}</h3>
                                                {getStatusBadge(session.status)}
                                            </div>
                                            <p className="text-gray-600 mb-3 line-clamp-2">{session.description}</p>
                                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-4 h-4" />
                                                    <span>{session.scheduledFor.toLocaleDateString()}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Clock className="w-4 h-4" />
                                                    <span>{session.scheduledFor.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Activity className="w-4 h-4" />
                                                    <span>{session.duration} min</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Users className="w-4 h-4" />
                                                    <span>{attendeeCount} attending</span>
                                                </div>
                                                <div className="flex items-center gap-2 font-semibold text-blue-600">
                                                    <span>{className}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-wrap items-center gap-2 mt-4 lg:mt-0">
                                        {isLive ? (
                                            <>
                                                <button
                                                    onClick={() => window.open(session.meetingLink, '_blank')}
                                                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-bold hover:shadow-lg transition-all animate-pulse"
                                                >
                                                    <Play className="w-5 h-5" />
                                                    Join Live
                                                </button>
                                                <button
                                                    onClick={() => handleEndSession(session)}
                                                    className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-all"
                                                >
                                                    <Square className="w-5 h-5" />
                                                </button>
                                            </>
                                        ) : isUpcoming ? (
                                            <>
                                                <button
                                                    onClick={() => handleStartSession(session)}
                                                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold hover:shadow-lg transition-all"
                                                >
                                                    <Play className="w-5 h-5" />
                                                    Start
                                                </button>
                                                <button
                                                    onClick={() => handleCopyLink(session.meetingLink)}
                                                    className="px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl font-bold transition-all"
                                                    title="Copy Link"
                                                >
                                                    <Copy className="w-5 h-5" />
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                onClick={() => handleCopyLink(session.meetingLink)}
                                                className="px-6 py-3 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl font-bold transition-all"
                                            >
                                                <ExternalLink className="w-5 h-5" />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDelete(session.id)}
                                            className="px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold transition-all"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Time Until Session */}
                                {isUpcoming && (
                                    <div className="mt-4 pt-4 border-t border-gray-200">
                                        <div className="flex items-center gap-2 text-sm">
                                            <Clock className="w-4 h-4 text-blue-600" />
                                            <span className="font-semibold text-blue-600">
                                                Starts {getTimeDisplay(session.scheduledFor, session.duration)}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-gray-300">
                    <Video className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No sessions found</h3>
                    <p className="text-gray-600 mb-6">
                        {searchQuery || filterStatus !== 'all' || filterClass !== 'all'
                            ? 'Try adjusting your filters'
                            : 'Schedule your first live session to connect with students'}
                    </p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-bold hover:shadow-lg transition-all"
                    >
                        <Plus className="w-5 h-5" />
                        Schedule Session
                    </button>
                </div>
            )}

            {/* Create Session Modal */}
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
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl"
                        >
                            <div className="flex items-center justify-between p-6 border-b border-gray-200">
                                <h2 className="text-2xl font-black text-gray-900">Schedule Live Session</h2>
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="p-2 hover:bg-gray-100 rounded-xl transition-all"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <form onSubmit={handleCreateSession} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-900 mb-2">
                                        Session Title *
                                    </label>
                                    <input
                                        type="text"
                                        value={sessionData.title}
                                        onChange={(e) => setSessionData({ ...sessionData, title: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:outline-none transition-all"
                                        placeholder="e.g., Math Lecture - Chapter 5"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-900 mb-2">
                                        Description
                                    </label>
                                    <textarea
                                        value={sessionData.description}
                                        onChange={(e) => setSessionData({ ...sessionData, description: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:outline-none transition-all resize-none"
                                        rows="3"
                                        placeholder="What will you cover in this session?"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-900 mb-2">
                                            Class *
                                        </label>
                                        <select
                                            value={sessionData.classId}
                                            onChange={(e) => setSessionData({ ...sessionData, classId: e.target.value })}
                                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:outline-none transition-all"
                                            required
                                        >
                                            <option value="">Select class</option>
                                            {classes.map(cls => (
                                                <option key={cls.id} value={cls.id}>
                                                    {cls.name} - {cls.section}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-900 mb-2">
                                            Duration (minutes) *
                                        </label>
                                        <input
                                            type="number"
                                            value={sessionData.duration}
                                            onChange={(e) => setSessionData({ ...sessionData, duration: parseInt(e.target.value) })}
                                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:outline-none transition-all"
                                            min="15"
                                            max="240"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-900 mb-2">
                                        Scheduled Date & Time *
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={sessionData.scheduledFor}
                                        onChange={(e) => setSessionData({ ...sessionData, scheduledFor: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:outline-none transition-all"
                                        min={new Date().toISOString().slice(0, 16)}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-900 mb-2">
                                        Meeting Link (optional)
                                    </label>
                                    <input
                                        type="url"
                                        value={sessionData.meetingLink}
                                        onChange={(e) => setSessionData({ ...sessionData, meetingLink: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:outline-none transition-all"
                                        placeholder="Leave blank to auto-generate"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        If left blank, we'll create a meeting room for you
                                    </p>
                                </div>

                                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                                    <input
                                        type="checkbox"
                                        id="recordSession"
                                        checked={sessionData.recordSession}
                                        onChange={(e) => setSessionData({ ...sessionData, recordSession: e.target.checked })}
                                        className="w-5 h-5 text-red-500 border-gray-300 rounded focus:ring-red-500"
                                    />
                                    <label htmlFor="recordSession" className="text-sm font-medium text-gray-700">
                                        Record this session for students who can't attend live
                                    </label>
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
                                        className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-bold hover:shadow-lg transition-all"
                                    >
                                        Schedule Session
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

export default LiveSessionsSection;
