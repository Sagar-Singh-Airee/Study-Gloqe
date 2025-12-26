import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Video, Calendar, Clock, Users,
    MoreVertical, Trash2, ExternalLink,
    Play, CheckCircle, Search, Filter,
    BookOpen, AlertCircle, Plus
} from 'lucide-react';
import { getTeacherSessions, getClassSessions, deleteSession, updateSessionStatus } from '../../services/liveSessionService';
import { useAuth } from '@auth/contexts/AuthContext';
import toast from 'react-hot-toast';

const LiveSessionList = ({ classId = null, onCreateNew, classes = [] }) => {
    const { user } = useAuth();
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    useEffect(() => {
        loadSessions();
    }, [user, classId]);

    const loadSessions = async () => {
        try {
            setLoading(true);
            const data = classId
                ? await getClassSessions(classId)
                : await getTeacherSessions(user.uid);
            setSessions(data);
        } catch (error) {
            console.error('Error loading sessions:', error);
            toast.error('Failed to load sessions');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this session?')) return;
        try {
            await deleteSession(id);
            toast.success('Session deleted');
            loadSessions();
        } catch (error) {
            toast.error('Failed to delete session');
        }
    };

    const handleStartSession = async (session) => {
        try {
            await updateSessionStatus(session.id, 'live');
            window.open(session.meetingLink, '_blank');
            loadSessions();
        } catch (error) {
            toast.error('Failed to start session');
        }
    };

    const filteredSessions = sessions.filter(s => {
        const matchesSearch = s.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.className.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = filterStatus === 'all' || s.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black text-gray-900">Live Sessions</h2>
                    <p className="text-gray-500 font-medium">Manage your virtual classrooms and meetings</p>
                </div>
                {!classId && (
                    <button
                        onClick={onCreateNew}
                        className="px-6 py-3 bg-black text-white rounded-2xl font-black hover:scale-105 active:scale-95 transition-all flex items-center gap-2 shadow-xl shadow-black/10"
                    >
                        <Video size={20} />
                        Schedule Session
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by topic or class..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-gray-100 rounded-2xl focus:outline-none focus:border-black transition-all font-bold text-gray-900"
                    />
                </div>
                <div className="flex gap-2">
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-4 py-3.5 bg-white border-2 border-gray-100 rounded-2xl focus:outline-none font-black text-gray-900"
                    >
                        <option value="all">All Status</option>
                        <option value="upcoming">Upcoming</option>
                        <option value="live">Live Now</option>
                        <option value="past">Past</option>
                    </select>
                </div>
            </div>

            {/* Session Grid */}
            {filteredSessions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredSessions.map((session) => (
                        <motion.div
                            key={session.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className={`bg-white rounded-[2rem] p-6 border-2 transition-all group relative overflow-hidden ${session.status === 'live'
                                ? 'border-red-500 shadow-xl shadow-red-50'
                                : 'border-gray-100 hover:border-black hover:shadow-xl hover:shadow-gray-100'
                                }`}
                        >
                            {/* Live Badge */}
                            {session.status === 'live' && (
                                <div className="absolute top-0 right-0 bg-red-500 text-white px-6 py-2 rounded-bl-2xl font-black text-[10px] tracking-widest uppercase animate-pulse">
                                    LIVE NOW
                                </div>
                            )}

                            <div className="space-y-4">
                                {/* Topic & Class */}
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${session.status === 'live' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-600'
                                            }`}>
                                            {session.classSubject}
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-black text-gray-900 group-hover:text-black line-clamp-1">
                                        {session.topic}
                                    </h3>
                                    <p className="text-sm font-bold text-gray-500 flex items-center gap-1">
                                        <BookOpen size={14} />
                                        {session.className}
                                    </p>
                                </div>

                                {/* Date & Time */}
                                <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                    <div className="space-y-1">
                                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Date</div>
                                        <div className="text-xs font-black text-gray-900 flex items-center gap-1">
                                            <Calendar size={12} className="text-gray-400" />
                                            {new Date(session.date).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Time</div>
                                        <div className="text-xs font-black text-gray-900 flex items-center gap-1">
                                            <Clock size={12} className="text-gray-400" />
                                            {session.startTime} ({session.duration}m)
                                        </div>
                                    </div>
                                </div>

                                {/* Description */}
                                {session.description && (
                                    <p className="text-xs font-medium text-gray-500 line-clamp-2">
                                        {session.description}
                                    </p>
                                )}

                                {/* Actions */}
                                <div className="flex items-center gap-2 pt-2">
                                    {session.status === 'past' ? (
                                        <div className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-500 rounded-xl font-black text-sm">
                                            <CheckCircle size={16} />
                                            Session Ended
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => handleStartSession(session)}
                                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black text-sm transition-all shadow-lg ${session.status === 'live'
                                                ? 'bg-red-500 text-white shadow-red-100 hover:bg-red-600'
                                                : 'bg-black text-white shadow-gray-100 hover:scale-105'
                                                }`}
                                        >
                                            <Play size={16} fill="currentColor" />
                                            {session.status === 'live' ? 'Join Again' : 'Start Session'}
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDelete(session.id)}
                                        className="p-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-red-50 hover:text-red-600 transition-all font-bold"
                                        title="Delete Session"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-gray-50 rounded-[2.5rem] border-4 border-dashed border-gray-100">
                    <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-gray-200">
                        <Video size={40} className="text-gray-300" />
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 mb-2">No live sessions scheduled</h3>
                    <p className="text-gray-500 font-medium mb-8 max-w-sm mx-auto">
                        Connect with your students in real-time. Schedule your first live class now!
                    </p>
                    {!classId && (
                        <button
                            onClick={onCreateNew}
                            className="px-8 py-4 bg-black text-white rounded-2xl font-black hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-black/10 flex items-center gap-2 mx-auto"
                        >
                            <Plus size={20} />
                            Schedule Session
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default LiveSessionList;
