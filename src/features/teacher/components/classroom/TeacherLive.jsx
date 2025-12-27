// src/features/teacher/components/classroom/TeacherLive.jsx - LIVE SESSIONS WITH GOOGLE MEET 🎥

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Video, Calendar, Clock, Users, Link as LinkIcon,
    ExternalLink, Edit2, Trash2, Copy, Check, AlertCircle,
    Search, Filter, ChevronDown, Play, Square, TrendingUp,
    Bell, Mail, MessageSquare, Zap, Download
} from 'lucide-react';
import {
    collection, query, orderBy, onSnapshot, addDoc,
    updateDoc, deleteDoc, doc, serverTimestamp, where, getDocs
} from 'firebase/firestore';
import { db } from '@/shared/config/firebase';
import { useAuth } from '../../../auth/contexts/AuthContext';
import { format, isPast, isFuture, isToday, isTomorrow, addMinutes } from 'date-fns';
import toast from 'react-hot-toast';

const TeacherLive = ({ classId, classData }) => {
    const { currentUser } = useAuth();
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('all'); // all, upcoming, live, completed
    const [copiedId, setCopiedId] = useState(null);
    const [stats, setStats] = useState({
        total: 0,
        upcoming: 0,
        live: 0,
        completed: 0,
        totalAttendees: 0,
        avgDuration: 0,
    });

    // Fetch Live Sessions Real-time
    useEffect(() => {
        if (!classId) return;

        const sessionsRef = collection(db, 'classes', classId, 'liveSessions');
        const q = query(sessionsRef, orderBy('scheduledAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const sessionList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            setSessions(sessionList);
            calculateStats(sessionList);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [classId]);

    // Calculate Stats
    const calculateStats = (sessionList) => {
        const now = new Date();

        const upcoming = sessionList.filter(s => {
            const scheduledAt = s.scheduledAt?.toDate();
            return scheduledAt && isFuture(scheduledAt);
        }).length;

        const live = sessionList.filter(s => s.status === 'live').length;

        const completed = sessionList.filter(s => {
            const scheduledAt = s.scheduledAt?.toDate();
            const endTime = s.duration ? addMinutes(scheduledAt, s.duration) : null;
            return endTime && isPast(endTime);
        }).length;

        const totalAttendees = sessionList.reduce((sum, s) => sum + (s.attendees?.length || 0), 0);

        const completedSessions = sessionList.filter(s => s.actualDuration);
        const totalDuration = completedSessions.reduce((sum, s) => sum + (s.actualDuration || 0), 0);
        const avgDuration = completedSessions.length > 0 ? Math.round(totalDuration / completedSessions.length) : 0;

        setStats({
            total: sessionList.length,
            upcoming,
            live,
            completed,
            totalAttendees,
            avgDuration,
        });
    };

    // Filter & Search
    const filteredSessions = sessions.filter(session => {
        const matchesSearch = session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            session.description?.toLowerCase().includes(searchQuery.toLowerCase());

        if (!matchesSearch) return false;

        const now = new Date();
        const scheduledAt = session.scheduledAt?.toDate();
        const endTime = session.duration ? addMinutes(scheduledAt, session.duration) : null;

        switch (filterStatus) {
            case 'upcoming':
                return scheduledAt && isFuture(scheduledAt);
            case 'live':
                return session.status === 'live';
            case 'completed':
                return endTime && isPast(endTime);
            default:
                return true;
        }
    });

    // Copy Meeting Link
    const handleCopyLink = (meetingLink, sessionId) => {
        navigator.clipboard.writeText(meetingLink);
        setCopiedId(sessionId);
        toast.success('Meeting link copied! 📋');
        setTimeout(() => setCopiedId(null), 2000);
    };

    // Delete Session
    const handleDeleteSession = async (sessionId, title) => {
        if (!confirm(`Delete "${title}"?`)) return;

        try {
            await deleteDoc(doc(db, 'classes', classId, 'liveSessions', sessionId));
            toast.success('Live session deleted');
        } catch (error) {
            console.error('Error deleting session:', error);
            toast.error('Failed to delete session');
        }
    };

    // Start Live Session
    const handleStartSession = async (session) => {
        try {
            await updateDoc(doc(db, 'classes', classId, 'liveSessions', session.id), {
                status: 'live',
                startedAt: serverTimestamp(),
            });

            // Open Google Meet link
            window.open(session.meetingLink, '_blank');
            toast.success('🎥 Live session started!');
        } catch (error) {
            console.error('Error starting session:', error);
            toast.error('Failed to start session');
        }
    };

    // End Live Session
    const handleEndSession = async (sessionId) => {
        if (!confirm('End this live session?')) return;

        try {
            const session = sessions.find(s => s.id === sessionId);
            const startedAt = session.startedAt?.toDate();
            const actualDuration = startedAt ? Math.round((Date.now() - startedAt.getTime()) / 60000) : 0;

            await updateDoc(doc(db, 'classes', classId, 'liveSessions', sessionId), {
                status: 'completed',
                endedAt: serverTimestamp(),
                actualDuration,
            });

            toast.success('Live session ended');
        } catch (error) {
            console.error('Error ending session:', error);
            toast.error('Failed to end session');
        }
    };

    return (
        <div className="space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-6 gap-4">
                <StatCard
                    icon={Video}
                    label="Total Sessions"
                    value={stats.total}
                    gradient="from-red-500 to-pink-500"
                />
                <StatCard
                    icon={Calendar}
                    label="Upcoming"
                    value={stats.upcoming}
                    gradient="from-blue-500 to-cyan-500"
                />
                <StatCard
                    icon={Zap}
                    label="Live Now"
                    value={stats.live}
                    gradient="from-green-500 to-teal-500"
                    pulse={stats.live > 0}
                />
                <StatCard
                    icon={Check}
                    label="Completed"
                    value={stats.completed}
                    gradient="from-purple-500 to-pink-500"
                />
                <StatCard
                    icon={Users}
                    label="Total Attendees"
                    value={stats.totalAttendees}
                    gradient="from-orange-500 to-red-500"
                />
                <StatCard
                    icon={Clock}
                    label="Avg Duration"
                    value={`${stats.avgDuration}m`}
                    gradient="from-indigo-500 to-purple-500"
                />
            </div>

            {/* Quick Info Banner */}
            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl p-6 text-white">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                        <Video size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black">Google Meet Integration</h3>
                        <p className="text-sm text-white/90">Schedule and manage live classes seamlessly</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-sm font-semibold">
                    <Bell size={16} />
                    <span>Students will receive notifications for upcoming sessions</span>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 w-full">
                    {/* Search */}
                    <div className="relative flex-1 max-w-md">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search sessions..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all text-sm font-semibold"
                        />
                    </div>

                    {/* Filter */}
                    <div className="relative">
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="appearance-none pl-4 pr-10 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all text-sm font-bold text-gray-700 bg-white cursor-pointer"
                        >
                            <option value="all">All Sessions</option>
                            <option value="upcoming">Upcoming</option>
                            <option value="live">Live Now</option>
                            <option value="completed">Completed</option>
                        </select>
                        <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                </div>

                {/* Schedule Button */}
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl text-sm font-bold hover:shadow-lg hover:scale-105 transition-all whitespace-nowrap"
                >
                    <Plus size={18} />
                    Schedule Live Session
                </button>
            </div>

            {/* Sessions List */}
            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => <SessionSkeleton key={i} />)}
                </div>
            ) : filteredSessions.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-300">
                    <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-5 border-4 border-white shadow-lg">
                        <Video size={40} className="text-red-600" />
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 mb-2">
                        {searchQuery ? 'No Results Found' : 'No Live Sessions Yet'}
                    </h3>
                    <p className="text-sm text-gray-600 mb-6">
                        {searchQuery
                            ? 'Try adjusting your search or filters'
                            : 'Schedule your first live session with Google Meet!'}
                    </p>
                    {!searchQuery && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl text-sm font-bold hover:shadow-lg hover:scale-105 transition-all"
                        >
                            <Plus size={18} />
                            Schedule First Session
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredSessions.map((session, idx) => (
                        <SessionCard
                            key={session.id}
                            session={session}
                            classData={classData}
                            onCopyLink={handleCopyLink}
                            onDelete={handleDeleteSession}
                            onStart={handleStartSession}
                            onEnd={handleEndSession}
                            copiedId={copiedId}
                            delay={idx * 0.05}
                        />
                    ))}
                </div>
            )}

            {/* Create Session Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <CreateSessionModal
                        classId={classId}
                        classData={classData}
                        teacherId={currentUser.uid}
                        teacherName={currentUser.displayName}
                        onClose={() => setShowCreateModal(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

// Stat Card Component
const StatCard = ({ icon: Icon, label, value, gradient, pulse = false }) => {
    return (
        <motion.div
            whileHover={{ y: -4, scale: 1.02 }}
            className={`bg-white border-2 border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-lg transition-all ${pulse ? 'animate-pulse' : ''
                }`}
        >
            <div className={`w-12 h-12 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center mb-3`}>
                <Icon size={20} className="text-white" />
            </div>
            <div className="text-2xl font-black text-gray-900 mb-1">{value}</div>
            <div className="text-xs text-gray-600 font-semibold">{label}</div>
        </motion.div>
    );
};

// Session Card Component
const SessionCard = ({ session, classData, onCopyLink, onDelete, onStart, onEnd, copiedId, delay }) => {
    const scheduledAt = session.scheduledAt?.toDate();
    const now = new Date();
    const endTime = session.duration ? addMinutes(scheduledAt, session.duration) : null;

    const isLive = session.status === 'live';
    const isUpcoming = scheduledAt && isFuture(scheduledAt);
    const isCompleted = endTime && isPast(endTime);

    const isDueToday = isToday(scheduledAt);
    const isDueTomorrow = isTomorrow(scheduledAt);

    let statusColor = 'gray';
    let statusText = 'Scheduled';
    let statusBg = 'bg-gray-100';

    if (isLive) {
        statusColor = 'green';
        statusText = 'Live Now';
        statusBg = 'bg-green-100';
    } else if (isCompleted) {
        statusColor = 'purple';
        statusText = 'Completed';
        statusBg = 'bg-purple-100';
    } else if (isUpcoming) {
        statusColor = 'blue';
        statusText = 'Upcoming';
        statusBg = 'bg-blue-100';
    }

    let dateText = scheduledAt ? format(scheduledAt, 'MMM d, yyyy • h:mm a') : 'Not scheduled';
    if (isDueToday) dateText = `Today • ${format(scheduledAt, 'h:mm a')}`;
    if (isDueTomorrow) dateText = `Tomorrow • ${format(scheduledAt, 'h:mm a')}`;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
            className={`bg-white border-2 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all ${isLive ? 'border-green-300 bg-green-50/30' : 'border-gray-200'
                }`}
        >
            <div className="flex items-start justify-between gap-4">
                {/* Left Content */}
                <div className="flex-1 min-w-0">
                    {/* Status Badge */}
                    <div className="flex items-center gap-2 mb-3">
                        <span className={`px-3 py-1.5 ${statusBg} text-${statusColor}-700 rounded-lg text-xs font-black uppercase flex items-center gap-1.5`}>
                            {isLive && <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />}
                            {statusText}
                        </span>
                        <span className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold flex items-center gap-1">
                            <Clock size={12} />
                            {session.duration} min
                        </span>
                    </div>

                    {/* Title & Description */}
                    <h3 className="text-xl font-black text-gray-900 mb-2">{session.title}</h3>
                    {session.description && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{session.description}</p>
                    )}

                    {/* Schedule Info */}
                    <div className="flex items-center gap-4 text-sm mb-4">
                        <div className="flex items-center gap-2 text-gray-700 font-semibold">
                            <Calendar size={16} className="text-blue-600" />
                            {dateText}
                        </div>
                        {session.attendees && session.attendees.length > 0 && (
                            <div className="flex items-center gap-2 text-gray-700 font-semibold">
                                <Users size={16} className="text-purple-600" />
                                {session.attendees.length} attended
                            </div>
                        )}
                    </div>

                    {/* Meeting Link */}
                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
                        <LinkIcon size={16} className="text-gray-500" />
                        <span className="text-xs font-mono text-gray-600 flex-1 truncate">
                            {session.meetingLink}
                        </span>
                        <button
                            onClick={() => onCopyLink(session.meetingLink, session.id)}
                            className="p-1.5 hover:bg-gray-200 rounded-lg transition-all"
                            title="Copy Link"
                        >
                            {copiedId === session.id ? (
                                <Check size={14} className="text-green-600" />
                            ) : (
                                <Copy size={14} className="text-gray-600" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Right Actions */}
                <div className="flex flex-col gap-2">
                    {isLive ? (
                        <>
                            <button
                                onClick={() => window.open(session.meetingLink, '_blank')}
                                className="px-4 py-2.5 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-xl text-sm font-bold hover:shadow-lg transition-all flex items-center gap-2"
                            >
                                <ExternalLink size={14} />
                                Join
                            </button>
                            <button
                                onClick={() => onEnd(session.id)}
                                className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-sm font-bold transition-all flex items-center gap-2"
                            >
                                <Square size={14} />
                                End
                            </button>
                        </>
                    ) : isUpcoming ? (
                        <>
                            <button
                                onClick={() => onStart(session)}
                                className="px-4 py-2.5 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl text-sm font-bold hover:shadow-lg transition-all flex items-center gap-2"
                            >
                                <Play size={14} />
                                Start
                            </button>
                            <button
                                onClick={() => onDelete(session.id, session.title)}
                                className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition-all"
                                title="Delete"
                            >
                                <Trash2 size={14} />
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => onDelete(session.id, session.title)}
                            className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-sm font-bold transition-all flex items-center gap-2"
                        >
                            <Trash2 size={14} />
                            Delete
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

// Session Skeleton
const SessionSkeleton = () => (
    <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 animate-pulse">
        <div className="flex items-start justify-between">
            <div className="flex-1">
                <div className="flex gap-2 mb-3">
                    <div className="h-7 w-20 bg-gray-200 rounded-lg" />
                    <div className="h-7 w-16 bg-gray-100 rounded-lg" />
                </div>
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-4 bg-gray-100 rounded w-full mb-3" />
                <div className="flex gap-4 mb-4">
                    <div className="h-5 bg-gray-100 rounded w-40" />
                    <div className="h-5 bg-gray-100 rounded w-24" />
                </div>
                <div className="h-12 bg-gray-100 rounded-xl" />
            </div>
            <div className="flex flex-col gap-2">
                <div className="h-10 w-24 bg-gray-200 rounded-xl" />
                <div className="h-10 w-24 bg-gray-100 rounded-xl" />
            </div>
        </div>
    </div>
);

// Create Session Modal
const CreateSessionModal = ({ classId, classData, teacherId, teacherName, onClose }) => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        scheduledDate: '',
        scheduledTime: '',
        duration: 60,
        meetingLink: '',
    });
    const [creating, setCreating] = useState(false);
    const [generatingMeet, setGeneratingMeet] = useState(false);

    // Generate Google Meet Link (Simulated - Replace with actual API call)
    const handleGenerateMeetLink = async () => {
        setGeneratingMeet(true);

        // SIMULATION: In production, call your Google Meet API here
        // Example: const response = await fetch('/api/google-meet/create', { method: 'POST', ... });

        setTimeout(() => {
            const randomId = Math.random().toString(36).substring(2, 15);
            const meetLink = `https://meet.google.com/${randomId}`;
            setFormData(prev => ({ ...prev, meetingLink: meetLink }));
            setGeneratingMeet(false);
            toast.success('Google Meet link generated! 🎥');
        }, 1500);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.title || !formData.scheduledDate || !formData.scheduledTime || !formData.meetingLink) {
            return toast.error('Please fill in all required fields');
        }

        setCreating(true);

        try {
            const scheduledDateTime = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`);

            await addDoc(collection(db, 'classes', classId, 'liveSessions'), {
                title: formData.title,
                description: formData.description,
                scheduledAt: scheduledDateTime,
                duration: parseInt(formData.duration),
                meetingLink: formData.meetingLink,
                teacherId,
                teacherName,
                status: 'scheduled',
                attendees: [],
                createdAt: serverTimestamp(),
            });

            toast.success('🎥 Live session scheduled!');
            onClose();
        } catch (error) {
            console.error('Error creating session:', error);
            toast.error('Failed to schedule session');
        } finally {
            setCreating(false);
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
                    <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <Video size={32} className="text-white" />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900">Schedule Live Session</h2>
                    <p className="text-sm text-gray-600 mt-2">Create a Google Meet session for {classData.studentCount} students</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Title */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Session Title *</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                            placeholder="e.g., Chapter 5 Review Session"
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all text-sm font-semibold"
                            disabled={creating}
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Brief description of the session..."
                            rows={3}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all text-sm font-semibold resize-none"
                            disabled={creating}
                        />
                    </div>

                    {/* Date & Time */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Date *</label>
                            <input
                                type="date"
                                value={formData.scheduledDate}
                                onChange={(e) => setFormData(prev => ({ ...prev, scheduledDate: e.target.value }))}
                                min={new Date().toISOString().split('T')[0]}
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all text-sm font-semibold"
                                disabled={creating}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Time *</label>
                            <input
                                type="time"
                                value={formData.scheduledTime}
                                onChange={(e) => setFormData(prev => ({ ...prev, scheduledTime: e.target.value }))}
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all text-sm font-semibold"
                                disabled={creating}
                            />
                        </div>
                    </div>

                    {/* Duration */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Duration (minutes) *</label>
                        <select
                            value={formData.duration}
                            onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all text-sm font-bold bg-white"
                            disabled={creating}
                        >
                            <option value={30}>30 minutes</option>
                            <option value={45}>45 minutes</option>
                            <option value={60}>1 hour</option>
                            <option value={90}>1.5 hours</option>
                            <option value={120}>2 hours</option>
                        </select>
                    </div>

                    {/* Google Meet Link */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Google Meet Link *</label>
                        <div className="flex gap-2">
                            <input
                                type="url"
                                value={formData.meetingLink}
                                onChange={(e) => setFormData(prev => ({ ...prev, meetingLink: e.target.value }))}
                                placeholder="https://meet.google.com/xxx-xxxx-xxx"
                                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all text-sm font-semibold"
                                disabled={creating}
                            />
                            <button
                                type="button"
                                onClick={handleGenerateMeetLink}
                                disabled={generatingMeet || creating}
                                className="px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl text-sm font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                            >
                                {generatingMeet ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    'Generate'
                                )}
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">Generate a new Google Meet link or paste an existing one</p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 border-2 border-gray-200 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all text-gray-700"
                            disabled={creating}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={creating}
                            className="flex-1 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl text-sm font-bold hover:shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                        >
                            {creating ? 'Scheduling...' : 'Schedule Session'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
};

export default TeacherLive;
