// src/features/student/components/classroom/StudentLive.jsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Video, Play, Clock, Calendar, Users, ExternalLink,
    CheckCircle2, AlertCircle, Loader2, Search, Filter,
    Download, Star, Award, TrendingUp, Eye, Wifi
} from 'lucide-react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@shared/config/firebase';
import { useAuth } from '@auth/contexts/AuthContext';
import toast from 'react-hot-toast';

const StudentLive = ({ classId, classData }) => {
    const { user } = useAuth();
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('all'); // all, upcoming, live, completed

    // Stats
    const [stats, setStats] = useState({
        total: 0,
        upcoming: 0,
        live: 0,
        completed: 0,
        attendance: 0
    });

    useEffect(() => {
        loadSessions();

        // Refresh every minute to update live status
        const interval = setInterval(loadSessions, 60000);
        return () => clearInterval(interval);
    }, [classId, user?.uid]);

    const loadSessions = async () => {
        try {
            setLoading(true);

            // Load live sessions for this class
            const sessionsQuery = query(
                collection(db, 'liveSessions'),
                where('classId', '==', classId),
                orderBy('scheduledTime', 'desc')
            );

            const snapshot = await getDocs(sessionsQuery);
            const sessionsData = [];

            let upcomingCount = 0;
            let liveCount = 0;
            let completedCount = 0;
            let attendedCount = 0;

            for (const docSnap of snapshot.docs) {
                const sessionData = docSnap.data();
                const scheduledTime = sessionData.scheduledTime?.toDate?.() || new Date(sessionData.scheduledTime);
                const endTime = sessionData.endTime?.toDate?.() || new Date(scheduledTime.getTime() + (sessionData.duration || 60) * 60000);

                // Check if student attended
                const attended = sessionData.attendees?.includes(user.uid) || false;
                if (attended) attendedCount++;

                // Calculate status
                let status = 'upcoming';
                const now = new Date();

                if (sessionData.status === 'live' || (now >= scheduledTime && now <= endTime)) {
                    status = 'live';
                    liveCount++;
                } else if (now > endTime || sessionData.status === 'completed') {
                    status = 'completed';
                    completedCount++;
                } else if (now < scheduledTime) {
                    status = 'upcoming';
                    upcomingCount++;
                }

                sessionsData.push({
                    id: docSnap.id,
                    ...sessionData,
                    scheduledTime,
                    endTime,
                    status,
                    attended
                });
            }

            setSessions(sessionsData);
            setStats({
                total: sessionsData.length,
                upcoming: upcomingCount,
                live: liveCount,
                completed: completedCount,
                attendance: sessionsData.length > 0 ? Math.round((attendedCount / sessionsData.length) * 100) : 0
            });

        } catch (error) {
            console.error('Error loading sessions:', error);
            toast.error('Failed to load live sessions');
        } finally {
            setLoading(false);
        }
    };

    const getFilteredSessions = () => {
        let filtered = [...sessions];

        // Search
        if (searchQuery) {
            filtered = filtered.filter(s =>
                s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.topic?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Status filter
        if (filterStatus !== 'all') {
            filtered = filtered.filter(s => s.status === filterStatus);
        }

        // Sort: live first, then upcoming, then completed
        filtered.sort((a, b) => {
            const statusOrder = { live: 0, upcoming: 1, completed: 2 };
            if (statusOrder[a.status] !== statusOrder[b.status]) {
                return statusOrder[a.status] - statusOrder[b.status];
            }
            return b.scheduledTime - a.scheduledTime;
        });

        return filtered;
    };

    const handleJoinSession = (session) => {
        if (session.status !== 'live') {
            toast.error('Session is not live yet');
            return;
        }

        if (!session.meetingLink) {
            toast.error('Meeting link not available');
            return;
        }

        window.open(session.meetingLink, '_blank');
        toast.success('Opening live session...');
    };

    const getStatusConfig = (status) => {
        const configs = {
            live: {
                label: 'Live Now',
                color: 'bg-red-100 text-red-700 border-red-300',
                gradient: 'from-red-500 to-pink-500',
                icon: Wifi,
                pulse: true
            },
            upcoming: {
                label: 'Upcoming',
                color: 'bg-blue-100 text-blue-700 border-blue-300',
                gradient: 'from-blue-500 to-cyan-500',
                icon: Clock,
                pulse: false
            },
            completed: {
                label: 'Completed',
                color: 'bg-gray-100 text-gray-700 border-gray-300',
                gradient: 'from-gray-500 to-gray-600',
                icon: CheckCircle2,
                pulse: false
            }
        };
        return configs[status] || configs.upcoming;
    };

    const getTimeUntil = (date) => {
        const now = new Date();
        const diff = date - now;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (days > 0) return `in ${days}d ${hours}h`;
        if (hours > 0) return `in ${hours}h ${minutes}m`;
        if (minutes > 0) return `in ${minutes}m`;
        return 'Starting soon';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center">
                    <Loader2 size={48} className="text-blue-600 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600 font-semibold">Loading live sessions...</p>
                </div>
            </div>
        );
    }

    const filteredSessions = getFilteredSessions();

    return (
        <div className="space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white border-2 border-gray-200 rounded-xl p-5"
                >
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                            <Video size={20} className="text-white" strokeWidth={2.5} />
                        </div>
                    </div>
                    <p className="text-3xl font-black text-gray-900 mb-1">{stats.total}</p>
                    <p className="text-sm text-gray-600 font-semibold">Total Sessions</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white border-2 border-red-200 rounded-xl p-5"
                >
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-500 rounded-lg flex items-center justify-center relative">
                            <Wifi size={20} className="text-white" strokeWidth={2.5} />
                            {stats.live > 0 && (
                                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
                            )}
                        </div>
                    </div>
                    <p className="text-3xl font-black text-red-700 mb-1">{stats.live}</p>
                    <p className="text-sm text-red-600 font-semibold">Live Now</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white border-2 border-blue-200 rounded-xl p-5"
                >
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                            <Clock size={20} className="text-white" strokeWidth={2.5} />
                        </div>
                    </div>
                    <p className="text-3xl font-black text-blue-700 mb-1">{stats.upcoming}</p>
                    <p className="text-sm text-blue-600 font-semibold">Upcoming</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white border-2 border-green-200 rounded-xl p-5"
                >
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-500 rounded-lg flex items-center justify-center">
                            <CheckCircle2 size={20} className="text-white" strokeWidth={2.5} />
                        </div>
                    </div>
                    <p className="text-3xl font-black text-green-700 mb-1">{stats.completed}</p>
                    <p className="text-sm text-green-600 font-semibold">Completed</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white border-2 border-purple-200 rounded-xl p-5"
                >
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                            <Award size={20} className="text-white" strokeWidth={2.5} />
                        </div>
                    </div>
                    <p className="text-3xl font-black text-purple-700 mb-1">{stats.attendance}%</p>
                    <p className="text-sm text-purple-600 font-semibold">Attendance</p>
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
                            placeholder="Search sessions..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none font-medium"
                        />
                    </div>

                    {/* Status Filter */}
                    <div className="flex items-center gap-2">
                        <Filter size={20} className="text-gray-600" />
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none font-semibold"
                        >
                            <option value="all">All Sessions</option>
                            <option value="live">Live Now</option>
                            <option value="upcoming">Upcoming</option>
                            <option value="completed">Completed</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Sessions List */}
            {filteredSessions.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-6">
                    {filteredSessions.map((session, idx) => {
                        const statusConfig = getStatusConfig(session.status);
                        const StatusIcon = statusConfig.icon;

                        return (
                            <motion.div
                                key={session.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.05 }}
                                className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden hover:shadow-xl transition-all group"
                            >
                                {/* Header */}
                                <div className={`bg-gradient-to-r ${statusConfig.gradient} p-6 relative overflow-hidden`}>
                                    {/* Background decoration */}
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />

                                    <div className="relative z-10">
                                        {/* Status Badge with Pulse */}
                                        <div className="flex items-center justify-between mb-4">
                                            <div className={`flex items-center gap-2 px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-lg border-2 border-white/30 ${statusConfig.pulse ? 'animate-pulse' : ''}`}>
                                                <StatusIcon size={16} className="text-white" strokeWidth={2.5} />
                                                <span className="font-black text-xs text-white">{statusConfig.label}</span>
                                            </div>

                                            {session.attended && (
                                                <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 backdrop-blur-sm rounded-lg border border-white/30">
                                                    <CheckCircle2 size={14} className="text-white" />
                                                    <span className="text-xs font-bold text-white">Attended</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Title */}
                                        <h3 className="text-xl font-black text-white mb-2 line-clamp-2 group-hover:underline">
                                            {session.title || session.topic}
                                        </h3>

                                        {/* Teacher */}
                                        {session.teacherName && (
                                            <p className="text-sm text-white/90 font-semibold">
                                                with {session.teacherName}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-6">
                                    {/* Description */}
                                    {session.description && (
                                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                                            {session.description}
                                        </p>
                                    )}

                                    {/* Info Grid */}
                                    <div className="grid grid-cols-2 gap-3 mb-5">
                                        {/* Date */}
                                        <div className="p-3 bg-gray-50 rounded-lg">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Calendar size={14} className="text-gray-600" />
                                                <p className="text-xs text-gray-600 font-bold">Date</p>
                                            </div>
                                            <p className="text-sm font-black text-gray-900">
                                                {session.scheduledTime.toLocaleDateString()}
                                            </p>
                                        </div>

                                        {/* Time */}
                                        <div className="p-3 bg-gray-50 rounded-lg">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Clock size={14} className="text-gray-600" />
                                                <p className="text-xs text-gray-600 font-bold">Time</p>
                                            </div>
                                            <p className="text-sm font-black text-gray-900">
                                                {session.scheduledTime.toLocaleTimeString('en-US', {
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </p>
                                        </div>

                                        {/* Duration */}
                                        <div className="p-3 bg-gray-50 rounded-lg">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Video size={14} className="text-gray-600" />
                                                <p className="text-xs text-gray-600 font-bold">Duration</p>
                                            </div>
                                            <p className="text-sm font-black text-gray-900">
                                                {session.duration || 60} mins
                                            </p>
                                        </div>

                                        {/* Participants */}
                                        <div className="p-3 bg-gray-50 rounded-lg">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Users size={14} className="text-gray-600" />
                                                <p className="text-xs text-gray-600 font-bold">Participants</p>
                                            </div>
                                            <p className="text-sm font-black text-gray-900">
                                                {session.attendees?.length || 0}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Time Until (for upcoming) */}
                                    {session.status === 'upcoming' && (
                                        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                            <p className="text-sm font-bold text-blue-700">
                                                Starts {getTimeUntil(session.scheduledTime)}
                                            </p>
                                        </div>
                                    )}

                                    {/* Action Button */}
                                    {session.status === 'live' && (
                                        <button
                                            onClick={() => handleJoinSession(session)}
                                            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl font-bold hover:shadow-lg transition-all animate-pulse"
                                        >
                                            <Play size={20} fill="currentColor" />
                                            Join Live Session
                                        </button>
                                    )}

                                    {session.status === 'upcoming' && (
                                        <button
                                            disabled
                                            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-500 rounded-xl font-bold cursor-not-allowed"
                                        >
                                            <Clock size={20} />
                                            Not Started Yet
                                        </button>
                                    )}

                                    {session.status === 'completed' && session.recordingUrl && (
                                        <button
                                            onClick={() => window.open(session.recordingUrl, '_blank')}
                                            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-bold hover:shadow-lg transition-all"
                                        >
                                            <Eye size={20} />
                                            Watch Recording
                                        </button>
                                    )}

                                    {session.status === 'completed' && !session.recordingUrl && (
                                        <button
                                            disabled
                                            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-500 rounded-xl font-bold cursor-not-allowed"
                                        >
                                            <CheckCircle2 size={20} />
                                            Session Ended
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-white rounded-xl border-2 border-gray-200 p-12 text-center">
                    <Video size={64} className="text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {searchQuery || filterStatus !== 'all'
                            ? 'No sessions found'
                            : 'No live sessions yet'}
                    </h3>
                    <p className="text-gray-600">
                        {searchQuery || filterStatus !== 'all'
                            ? 'Try adjusting your search or filters'
                            : 'Your teacher hasn\'t scheduled any live sessions yet'}
                    </p>
                </div>
            )}
        </div>
    );
};

export default StudentLive;
