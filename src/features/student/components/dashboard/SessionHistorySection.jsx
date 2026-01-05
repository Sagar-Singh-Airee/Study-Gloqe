// src/components/features/SessionHistorySection.jsx - PREMIUM LIGHT COMPACT EDITION 💎

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Clock, BookOpen, TrendingUp, Calendar, Search, FileText,
    Award, Zap, Target, Flame, Trash2, AlertTriangle, X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, getDocs, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '@shared/config/firebase';
import { useAuth } from '@auth/contexts/AuthContext';
import toast from 'react-hot-toast';

import { useGamification } from '../../../gamification/hooks/useGamification';
import { orderBy, limit } from 'firebase/firestore'; // Added orderBy

const SessionHistorySection = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { streak } = useGamification(); // ✅ Use global streak
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterBy, setFilterBy] = useState('all');
    const [sortBy, setSortBy] = useState('recent');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Real-time Firestore listener
    useEffect(() => {
        if (!user?.uid) {
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, 'studySessions'),
            where('userId', '==', user.uid),
            orderBy('startTime', 'desc'), // ✅ Server-side sorting
            limit(100) // ✅ Limit to prevents overloading
        );

        const unsubscribe = onSnapshot(q,
            (snapshot) => {
                const sessionData = snapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        ...data,
                        startTime: data.startTime?.toDate?.() || new Date(data.startTime) || new Date(),
                        endTime: data.endTime?.toDate?.() || (data.endTime ? new Date(data.endTime) : null)
                    };
                });
                // .sort() removed as we rely on server sort for efficiency

                setSessions(sessionData);
                setLoading(false);
            },
            (error) => {
                console.error('Session history listener error:', error);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [user?.uid]);

    // Delete all sessions
    const handleDeleteAllSessions = async () => {
        if (!user?.uid) return;

        setDeleting(true);
        const toastId = toast.loading('Deleting all sessions...');

        try {
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
            toast.success(`Deleted ${sessions.length} session${sessions.length !== 1 ? 's' : ''}`, { id: toastId });
            setShowDeleteModal(false);
        } catch (error) {
            console.error('Error deleting sessions:', error);
            toast.error('Failed to delete sessions', { id: toastId });
        } finally {
            setDeleting(false);
        }
    };

    // Subject configuration with teal/blue theme
    const subjectConfig = {
        'Mathematics': { color: 'bg-blue-50 text-blue-700 border-blue-200' },
        'Physics': { color: 'bg-teal-50 text-teal-700 border-teal-200' },
        'Chemistry': { color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
        'Biology': { color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
        'Computer Science': { color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
        'History': { color: 'bg-amber-50 text-amber-700 border-amber-200' },
        'Economics': { color: 'bg-violet-50 text-violet-700 border-violet-200' },
        'Literature': { color: 'bg-rose-50 text-rose-700 border-rose-200' },
        'Psychology': { color: 'bg-purple-50 text-purple-700 border-purple-200' },
        'Engineering': { color: 'bg-orange-50 text-orange-700 border-orange-200' },
        'General Studies': { color: 'bg-slate-50 text-slate-700 border-slate-200' }
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

        // Calculate streak (Now handled by global gamification hook)
        // const streak = ... (Old logic removed)

        return {
            total: sessions.length,
            totalTime: Math.round(totalTime / 60),
            avgProgress,
            todaySessions: todaySessions.length,
            todayTime: Math.round(todayTime / 60),
            streak // ✅ From useGamification
        };
    }, [sessions, streak]); // Added streak to dependency

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
                <div className="w-12 h-12 border-2 border-slate-200 border-t-teal-600 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            {/* Subtle background */}
            <div className="fixed inset-0 -z-10 bg-gradient-to-br from-white via-teal-50/20 to-blue-50/20" />

            <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
                {/* Header */}
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-br from-teal-500 to-blue-600 rounded-xl shadow-sm">
                            <Clock className="w-5 h-5 text-white" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900">Study History</h2>
                            <p className="text-xs text-slate-600">Track your learning journey</p>
                        </div>
                    </div>

                    {/* Delete All Button */}
                    {sessions.length > 0 && (
                        <button
                            onClick={() => setShowDeleteModal(true)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-rose-200 text-rose-600 rounded-lg text-xs font-bold hover:bg-rose-50 hover:border-rose-300 transition-all self-start sm:self-auto"
                        >
                            <Trash2 size={14} strokeWidth={2.5} />
                            Delete All
                        </button>
                    )}
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="bg-white border border-slate-200 rounded-xl p-3 hover:border-teal-300 hover:shadow-sm transition-all">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 bg-blue-50 rounded-lg">
                                <BookOpen size={14} className="text-blue-600" strokeWidth={2.5} />
                            </div>
                            <span className="text-[10px] font-bold text-slate-600">Total Sessions</span>
                        </div>
                        <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-3 hover:border-teal-300 hover:shadow-sm transition-all">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 bg-teal-50 rounded-lg">
                                <Clock size={14} className="text-teal-600" strokeWidth={2.5} />
                            </div>
                            <span className="text-[10px] font-bold text-slate-600">Total Time</span>
                        </div>
                        <p className="text-2xl font-bold text-slate-900">{stats.totalTime}<span className="text-sm text-slate-500">min</span></p>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-3 hover:border-teal-300 hover:shadow-sm transition-all">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 bg-orange-50 rounded-lg">
                                <Flame size={14} className="text-orange-600" strokeWidth={2.5} />
                            </div>
                            <span className="text-[10px] font-bold text-slate-600">Streak</span>
                        </div>
                        <p className="text-2xl font-bold text-slate-900">{stats.streak}<span className="text-sm text-slate-500">days</span></p>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-3 hover:border-teal-300 hover:shadow-sm transition-all">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 bg-emerald-50 rounded-lg">
                                <Zap size={14} className="text-emerald-600" strokeWidth={2.5} />
                            </div>
                            <span className="text-[10px] font-bold text-slate-600">Today</span>
                        </div>
                        <p className="text-2xl font-bold text-slate-900">{stats.todayTime}<span className="text-sm text-slate-500">min</span></p>
                    </div>
                </div>

                {/* Filters & Search */}
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search sessions..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all text-sm text-slate-900 placeholder:text-slate-400"
                        />
                    </div>

                    <select
                        value={filterBy}
                        onChange={(e) => setFilterBy(e.target.value)}
                        className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 text-xs font-bold text-slate-900"
                    >
                        <option value="all">All Time</option>
                        <option value="today">Today</option>
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                    </select>

                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 text-xs font-bold text-slate-900"
                    >
                        <option value="recent">Most Recent</option>
                        <option value="duration">Longest</option>
                        <option value="subject">By Subject</option>
                    </select>
                </div>

                {/* Sessions List */}
                <AnimatePresence mode="popLayout">
                    {filteredSessions.length > 0 ? (
                        <div className="space-y-2.5">
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
                                        className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-sm hover:border-teal-300 transition-all cursor-pointer group"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                                                <FileText size={16} className="text-white" strokeWidth={2.5} />
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2 mb-1.5">
                                                    <h3 className="text-sm font-bold text-slate-900 truncate flex-1 leading-tight">
                                                        {session.documentTitle || 'Untitled Session'}
                                                    </h3>
                                                    <span className="text-[10px] font-medium text-slate-500 whitespace-nowrap">
                                                        {formatDate(session.startTime)}
                                                    </span>
                                                </div>

                                                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-semibold mb-2 ${config.color}`}>
                                                    {subject}
                                                </div>

                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600 font-medium">
                                                    <span className="flex items-center gap-1">
                                                        <Clock size={10} strokeWidth={2.5} />
                                                        {formatDuration(session.totalTime)}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Target size={10} strokeWidth={2.5} />
                                                        {Math.round(session.progressPercentage || 0)}% complete
                                                    </span>
                                                    {session.status === 'completed' && (
                                                        <span className="flex items-center gap-1 text-emerald-600">
                                                            <Award size={10} strokeWidth={2.5} />
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
                            className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center"
                        >
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 border border-slate-200">
                                <Clock size={32} className="text-slate-400" />
                            </div>
                            <h3 className="text-base font-bold text-slate-900 mb-1">
                                {searchTerm || filterBy !== 'all' ? 'No sessions found' : 'No study history yet'}
                            </h3>
                            <p className="text-xs text-slate-600 mb-5 max-w-md mx-auto leading-relaxed">
                                {searchTerm
                                    ? `No results for "${searchTerm}"`
                                    : filterBy !== 'all'
                                        ? `No sessions in this time period`
                                        : 'Start studying to build your learning history!'}
                            </p>
                            {!searchTerm && filterBy === 'all' && (
                                <button
                                    onClick={() => navigate('/documents')}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-500 to-blue-600 text-white rounded-lg text-xs font-bold hover:shadow-sm transition-all"
                                >
                                    <BookOpen size={14} />
                                    Start Studying
                                </button>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {showDeleteModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={() => !deleting && setShowDeleteModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-slate-200"
                        >
                            <div className="flex items-center justify-between mb-5">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 bg-rose-50 rounded-lg border border-rose-200">
                                        <AlertTriangle className="w-5 h-5 text-rose-600" strokeWidth={2.5} />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900">Delete All History?</h3>
                                </div>
                                {!deleting && (
                                    <button
                                        onClick={() => setShowDeleteModal(false)}
                                        className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                                    >
                                        <X size={16} className="text-slate-500" />
                                    </button>
                                )}
                            </div>

                            <p className="text-xs text-slate-600 mb-5 leading-relaxed">
                                This will permanently delete <span className="font-bold text-slate-900">{sessions.length} session{sessions.length !== 1 ? 's' : ''}</span> from your study history.
                                This action cannot be undone.
                            </p>

                            <div className="flex gap-2.5">
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    disabled={deleting}
                                    className="flex-1 px-4 py-2.5 bg-slate-50 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-100 border border-slate-200 transition-all disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteAllSessions}
                                    disabled={deleting}
                                    className="flex-1 px-4 py-2.5 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                                >
                                    {deleting ? (
                                        <>
                                            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Deleting...
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 size={14} />
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
