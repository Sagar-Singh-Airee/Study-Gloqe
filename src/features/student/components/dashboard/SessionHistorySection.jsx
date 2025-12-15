// src/components/features/SessionHistorySection.jsx - WITH DELETE ALL FEATURE
import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Clock, 
    BookOpen, 
    TrendingUp, 
    Calendar,
    Search,
    FileText,
    Award,
    Zap,
    Target,
    Flame,
    Trash2,
    AlertTriangle,
    X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, getDocs, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '@shared/config/firebase';
import { useAuth } from '@auth/contexts/AuthContext';
import toast from 'react-hot-toast';

const SessionHistorySection = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterBy, setFilterBy] = useState('all');
    const [sortBy, setSortBy] = useState('recent');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // ✅ REAL-TIME FIRESTORE LISTENER
    useEffect(() => {
        if (!user?.uid) {
            setLoading(false);
            return;
        }

        console.log('📊 Setting up real-time session history listener');

        const q = query(
            collection(db, 'studySessions'),
            where('userId', '==', user.uid)
        );

        const unsubscribe = onSnapshot(q, 
            (snapshot) => {
                console.log('📥 Received', snapshot.docs.length, 'study sessions');
                
                const sessionData = snapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        ...data,
                        startTime: data.startTime?.toDate?.() || new Date(data.startTime) || new Date(),
                        endTime: data.endTime?.toDate?.() || (data.endTime ? new Date(data.endTime) : null)
                    };
                })
                .sort((a, b) => (b.startTime?.getTime() || 0) - (a.startTime?.getTime() || 0));
                
                setSessions(sessionData);
                setLoading(false);
            },
            (error) => {
                console.error('❌ Session history listener error:', error);
                setLoading(false);
            }
        );

        return () => {
            console.log('🧹 Cleaning up session history listener');
            unsubscribe();
        };
    }, [user?.uid]);

    // ✅ DELETE ALL SESSIONS FUNCTION
    const handleDeleteAllSessions = async () => {
        if (!user?.uid) return;

        setDeleting(true);
        const toastId = toast.loading('Deleting all sessions...');

        try {
            console.log('🗑️ Starting batch delete of', sessions.length, 'sessions');

            // Firestore batch supports max 500 operations
            const batchSize = 500;
            const batches = [];

            for (let i = 0; i < sessions.length; i += batchSize) {
                const batch = writeBatch(db);
                const chunk = sessions.slice(i, i + batchSize);

                chunk.forEach(session => {
                    const docRef = doc(db, 'studySessions', session.id);
                    batch.delete(docRef);
                });

                batches.push(batch.commit());
            }

            await Promise.all(batches);

            console.log('✅ All sessions deleted successfully');
            toast.success(`Deleted ${sessions.length} session${sessions.length !== 1 ? 's' : ''}`, { id: toastId });
            setShowDeleteModal(false);

        } catch (error) {
            console.error('❌ Error deleting sessions:', error);
            toast.error('Failed to delete sessions', { id: toastId });
        } finally {
            setDeleting(false);
        }
    };

    // Premium subject configuration
    const subjectConfig = {
        'Mathematics': { 
            color: 'text-gray-700', 
            bg: 'bg-gray-100', 
            border: 'border-gray-300',
            gradient: 'from-gray-100 to-gray-200'
        },
        'Physics': { 
            color: 'text-gray-800', 
            bg: 'bg-gray-50', 
            border: 'border-gray-300',
            gradient: 'from-gray-50 to-gray-100'
        },
        'Chemistry': { 
            color: 'text-gray-700', 
            bg: 'bg-gray-100', 
            border: 'border-gray-300',
            gradient: 'from-gray-100 to-gray-50'
        },
        'Biology': { 
            color: 'text-gray-800', 
            bg: 'bg-gray-50', 
            border: 'border-gray-300',
            gradient: 'from-white to-gray-100'
        },
        'Computer Science': { 
            color: 'text-gray-900', 
            bg: 'bg-gray-100', 
            border: 'border-gray-400',
            gradient: 'from-gray-100 to-gray-200'
        },
        'History': { 
            color: 'text-gray-700', 
            bg: 'bg-gray-50', 
            border: 'border-gray-300',
            gradient: 'from-gray-50 to-white'
        },
        'Economics': { 
            color: 'text-gray-800', 
            bg: 'bg-gray-100', 
            border: 'border-gray-300',
            gradient: 'from-gray-100 to-gray-50'
        },
        'Literature': { 
            color: 'text-gray-700', 
            bg: 'bg-gray-50', 
            border: 'border-gray-300',
            gradient: 'from-white to-gray-50'
        },
        'Psychology': { 
            color: 'text-gray-800', 
            bg: 'bg-gray-100', 
            border: 'border-gray-300',
            gradient: 'from-gray-100 to-white'
        },
        'Engineering': { 
            color: 'text-gray-900', 
            bg: 'bg-gray-100', 
            border: 'border-gray-400',
            gradient: 'from-gray-100 to-gray-200'
        },
        'General Studies': { 
            color: 'text-gray-600', 
            bg: 'bg-gray-50', 
            border: 'border-gray-200',
            gradient: 'from-gray-50 to-white'
        }
    };

    // Calculate stats
    const stats = useMemo(() => {
        const totalTime = sessions.reduce((sum, s) => sum + (s.totalTime || 0), 0);
        const avgProgress = sessions.length > 0 
            ? Math.round(sessions.reduce((sum, s) => sum + (s.progressPercentage || 0), 0) / sessions.length)
            : 0;
        
        const today = new Date().toDateString();
        const todaySessions = sessions.filter(s => 
            s.startTime && new Date(s.startTime).toDateString() === today
        );

        const todayTime = todaySessions.reduce((sum, s) => sum + (s.totalTime || 0), 0);

        // Calculate streak
        let streak = 0;
        const sortedDates = [...new Set(
            sessions.map(s => new Date(s.startTime).toDateString())
        )].sort((a, b) => new Date(b) - new Date(a));

        if (sortedDates.length > 0 && sortedDates[0] === today) {
            streak = 1;
            for (let i = 1; i < sortedDates.length; i++) {
                const prevDate = new Date(sortedDates[i - 1]);
                const currDate = new Date(sortedDates[i]);
                const diffDays = Math.floor((prevDate - currDate) / (1000 * 60 * 60 * 24));
                if (diffDays === 1) {
                    streak++;
                } else {
                    break;
                }
            }
        }

        return {
            total: sessions.length,
            totalTime: Math.round(totalTime / 60),
            avgProgress,
            todaySessions: todaySessions.length,
            todayTime: Math.round(todayTime / 60),
            streak
        };
    }, [sessions]);

    // Filter sessions
    const filteredSessions = useMemo(() => {
        let filtered = sessions;

        if (filterBy !== 'all') {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

            filtered = filtered.filter(session => {
                const sessionDate = session.startTime ? new Date(session.startTime) : new Date();
                
                if (filterBy === 'today') return sessionDate >= today;
                if (filterBy === 'week') return sessionDate >= weekAgo;
                if (filterBy === 'month') return sessionDate >= monthAgo;
                return true;
            });
        }

        if (searchTerm) {
            filtered = filtered.filter(session =>
                session.documentTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                session.subject?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (sortBy === 'duration') {
            filtered.sort((a, b) => (b.totalTime || 0) - (a.totalTime || 0));
        } else if (sortBy === 'subject') {
            filtered.sort((a, b) => (a.subject || '').localeCompare(b.subject || ''));
        }

        return filtered;
    }, [sessions, filterBy, searchTerm, sortBy]);

    const formatDuration = (seconds) => {
        if (!seconds) return '0m';
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        
        if (hours > 0) {
            return `${hours}h ${remainingMinutes}m`;
        }
        return `${minutes}m`;
    };

    const formatDate = (date) => {
        if (!date) return 'Unknown';
        const d = date instanceof Date ? date : new Date(date);
        
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (d.toDateString() === today.toDateString()) {
            return `Today at ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
        }
        if (d.toDateString() === yesterday.toDateString()) {
            return `Yesterday at ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
        }
        
        return d.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-16 h-16 border-4 border-gray-200 border-t-gray-700 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-gray-800 to-gray-700 rounded-xl shadow-lg">
                        <Clock className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-gray-900">Study History</h2>
                        <p className="text-gray-600 font-semibold">Track your learning journey</p>
                    </div>
                </div>

                {/* Delete All Button */}
                {sessions.length > 0 && (
                    <button
                        onClick={() => setShowDeleteModal(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-red-200 text-red-600 rounded-xl font-bold hover:bg-red-50 hover:border-red-400 transition-all shadow-sm"
                    >
                        <Trash2 size={18} strokeWidth={2.5} />
                        Delete All
                    </button>
                )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 rounded-2xl p-5 hover:border-gray-300 hover:shadow-lg transition-all">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-gray-100 rounded-lg">
                            <BookOpen size={20} className="text-gray-700" />
                        </div>
                        <span className="text-sm font-bold text-gray-600">Total Sessions</span>
                    </div>
                    <p className="text-3xl font-black text-gray-900">{stats.total}</p>
                </div>

                <div className="bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 rounded-2xl p-5 hover:border-gray-300 hover:shadow-lg transition-all">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-gray-100 rounded-lg">
                            <Clock size={20} className="text-gray-700" />
                        </div>
                        <span className="text-sm font-bold text-gray-600">Total Time</span>
                    </div>
                    <p className="text-3xl font-black text-gray-900">{stats.totalTime}<span className="text-lg text-gray-500">min</span></p>
                </div>

                <div className="bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 rounded-2xl p-5 hover:border-gray-300 hover:shadow-lg transition-all">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-gray-100 rounded-lg">
                            <Flame size={20} className="text-gray-700" />
                        </div>
                        <span className="text-sm font-bold text-gray-600">Streak</span>
                    </div>
                    <p className="text-3xl font-black text-gray-900">{stats.streak}<span className="text-lg text-gray-500">days</span></p>
                </div>

                <div className="bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 rounded-2xl p-5 hover:border-gray-300 hover:shadow-lg transition-all">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-gray-100 rounded-lg">
                            <Zap size={20} className="text-gray-700" />
                        </div>
                        <span className="text-sm font-bold text-gray-600">Today</span>
                    </div>
                    <p className="text-3xl font-black text-gray-900">{stats.todayTime}<span className="text-lg text-gray-500">min</span></p>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search sessions..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-gray-400 transition-all font-semibold text-gray-900 placeholder:text-gray-500"
                    />
                </div>

                <select
                    value={filterBy}
                    onChange={(e) => setFilterBy(e.target.value)}
                    className="px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-gray-400 font-bold text-sm text-gray-900"
                >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                </select>

                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-gray-400 font-bold text-sm text-gray-900"
                >
                    <option value="recent">Most Recent</option>
                    <option value="duration">Longest</option>
                    <option value="subject">By Subject</option>
                </select>
            </div>

            {/* Sessions List */}
            <AnimatePresence mode="popLayout">
                {filteredSessions.length > 0 ? (
                    <div className="space-y-3">
                        {filteredSessions.map((session, idx) => {
                            const subject = session.subject || 'General Studies';
                            const config = subjectConfig[subject] || subjectConfig['General Studies'];

                            return (
                                <motion.div
                                    key={session.id}
                                    layout
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ delay: idx * 0.02 }}
                                    onClick={() => navigate(`/study/${session.documentId}`)}
                                    className={`bg-gradient-to-br ${config.gradient} border-2 ${config.border} rounded-2xl p-5 hover:shadow-xl hover:border-gray-400 transition-all cursor-pointer group`}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={`w-12 h-12 ${config.bg} rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-md border ${config.border}`}>
                                            <FileText size={20} className={config.color} strokeWidth={2.5} />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                <h3 className="text-base font-black text-gray-900 truncate flex-1 group-hover:text-gray-700 transition-colors">
                                                    {session.documentTitle || 'Untitled Session'}
                                                </h3>
                                                <span className="text-xs font-bold text-gray-500 whitespace-nowrap">
                                                    {formatDate(session.startTime)}
                                                </span>
                                            </div>

                                            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg ${config.bg} ${config.color} border ${config.border} mb-3 shadow-sm`}>
                                                <span className="text-xs font-bold">{subject}</span>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600 font-bold">
                                                <span className="flex items-center gap-1">
                                                    <Clock size={12} strokeWidth={2.5} />
                                                    {formatDuration(session.totalTime)}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Target size={12} strokeWidth={2.5} />
                                                    {Math.round(session.progressPercentage || 0)}% complete
                                                </span>
                                                {session.status === 'completed' && (
                                                    <span className="flex items-center gap-1 text-gray-700">
                                                        <Award size={12} strokeWidth={2.5} />
                                                        Completed
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                ) : (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-gradient-to-br from-gray-50 to-white border-2 border-dashed border-gray-300 rounded-2xl p-16 text-center"
                    >
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md border-2 border-gray-200">
                            <Clock size={32} className="text-gray-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                            {searchTerm || filterBy !== 'all' ? 'No sessions found' : 'No study history yet'}
                        </h3>
                        <p className="text-gray-600 mb-6 max-w-md mx-auto font-semibold">
                            {searchTerm 
                                ? `No results for "${searchTerm}"`
                                : filterBy !== 'all'
                                ? `No sessions in this time period`
                                : 'Start studying to build your learning history!'}
                        </p>
                        {!searchTerm && filterBy === 'all' && (
                            <button
                                onClick={() => navigate('/documents')}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gray-800 to-gray-700 text-white rounded-xl font-bold hover:scale-105 transition-all shadow-lg"
                            >
                                <BookOpen size={18} />
                                Start Studying
                            </button>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {showDeleteModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={() => !deleting && setShowDeleteModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border-2 border-gray-200"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-red-100 rounded-xl">
                                        <AlertTriangle className="w-6 h-6 text-red-600" />
                                    </div>
                                    <h3 className="text-2xl font-black text-gray-900">Delete All History?</h3>
                                </div>
                                {!deleting && (
                                    <button
                                        onClick={() => setShowDeleteModal(false)}
                                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        <X size={20} className="text-gray-500" />
                                    </button>
                                )}
                            </div>

                            <p className="text-gray-600 mb-6 font-semibold leading-relaxed">
                                This will permanently delete <span className="font-black text-gray-900">{sessions.length} session{sessions.length !== 1 ? 's' : ''}</span> from your study history. 
                                This action cannot be undone.
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    disabled={deleting}
                                    className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteAllSessions}
                                    disabled={deleting}
                                    className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-bold hover:from-red-700 hover:to-red-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {deleting ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Deleting...
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 size={18} />
                                            Delete All
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SessionHistorySection;
