// src/components/features/SessionHistorySection.jsx - COMPLETE VERSION
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Clock, 
    BookOpen, 
    TrendingUp, 
    Calendar,
    Filter,
    Search,
    FileText,
    Award,
    Zap,
    Target
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SessionHistorySection = ({ sessions = [] }) => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterBy, setFilterBy] = useState('all'); // all, today, week, month
    const [sortBy, setSortBy] = useState('recent'); // recent, duration, subject

    // Subject icons/colors config (matching DocumentsSection)
    const subjectConfig = {
        'Mathematics': { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
        'Physics': { color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
        'Chemistry': { color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
        'Biology': { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
        'Computer Science': { color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' },
        'History': { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
        'Economics': { color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-200' },
        'Literature': { color: 'text-pink-600', bg: 'bg-pink-50', border: 'border-pink-200' },
        'Psychology': { color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200' },
        'Engineering': { color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
        'General Studies': { color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' }
    };

    // Calculate stats from sessions
    const stats = useMemo(() => {
        const totalTime = sessions.reduce((sum, s) => sum + (s.totalTime || 0), 0);
        const avgProgress = sessions.length > 0 
            ? Math.round(sessions.reduce((sum, s) => sum + (s.progressPercentage || 0), 0) / sessions.length)
            : 0;
        
        const today = new Date().toDateString();
        const todaySessions = sessions.filter(s => 
            s.startTime && new Date(s.startTime).toDateString() === today
        ).length;

        return {
            total: sessions.length,
            totalTime: Math.round(totalTime / 60), // Convert to minutes
            avgProgress,
            todaySessions
        };
    }, [sessions]);

    // Filter sessions
    const filteredSessions = useMemo(() => {
        let filtered = sessions;

        // Filter by time period
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

        // Search filter
        if (searchTerm) {
            filtered = filtered.filter(session =>
                session.documentTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                session.subject?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Sort
        filtered.sort((a, b) => {
            if (sortBy === 'recent') {
                return (b.startTime?.getTime() || 0) - (a.startTime?.getTime() || 0);
            }
            if (sortBy === 'duration') {
                return (b.totalTime || 0) - (a.totalTime || 0);
            }
            if (sortBy === 'subject') {
                return (a.subject || '').localeCompare(b.subject || '');
            }
            return 0;
        });

        return filtered;
    }, [sessions, filterBy, searchTerm, sortBy]);

    // Format duration
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

    // Format date
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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-black rounded-xl">
                        <Clock className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-black">Study History</h2>
                        <p className="text-gray-600 font-medium">Track your learning journey</p>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white border-2 border-gray-100 rounded-2xl p-5 hover:border-gray-300 transition-all">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <BookOpen size={20} className="text-blue-600" />
                        </div>
                        <span className="text-sm font-bold text-gray-600">Total Sessions</span>
                    </div>
                    <p className="text-3xl font-black text-black">{stats.total}</p>
                </div>

                <div className="bg-white border-2 border-gray-100 rounded-2xl p-5 hover:border-gray-300 transition-all">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <Clock size={20} className="text-green-600" />
                        </div>
                        <span className="text-sm font-bold text-gray-600">Study Time</span>
                    </div>
                    <p className="text-3xl font-black text-black">{stats.totalTime}<span className="text-lg text-gray-500">min</span></p>
                </div>

                <div className="bg-white border-2 border-gray-100 rounded-2xl p-5 hover:border-gray-300 transition-all">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-purple-100 rounded-lg">
                            <TrendingUp size={20} className="text-purple-600" />
                        </div>
                        <span className="text-sm font-bold text-gray-600">Avg Progress</span>
                    </div>
                    <p className="text-3xl font-black text-black">{stats.avgProgress}<span className="text-lg text-gray-500">%</span></p>
                </div>

                <div className="bg-white border-2 border-gray-100 rounded-2xl p-5 hover:border-gray-300 transition-all">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-orange-100 rounded-lg">
                            <Zap size={20} className="text-orange-600" />
                        </div>
                        <span className="text-sm font-bold text-gray-600">Today</span>
                    </div>
                    <p className="text-3xl font-black text-black">{stats.todaySessions}</p>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col md:flex-row gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search sessions..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white border-2 border-gray-100 rounded-xl focus:outline-none focus:border-black transition-all font-medium"
                    />
                </div>

                {/* Time Filter */}
                <select
                    value={filterBy}
                    onChange={(e) => setFilterBy(e.target.value)}
                    className="px-4 py-3 bg-white border-2 border-gray-100 rounded-xl focus:outline-none focus:border-black font-bold text-sm"
                >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                </select>

                {/* Sort */}
                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-4 py-3 bg-white border-2 border-gray-100 rounded-xl focus:outline-none focus:border-black font-bold text-sm"
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
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ delay: idx * 0.03 }}
                                    onClick={() => navigate(`/study/${session.documentId}`)}
                                    className="bg-white border-2 border-gray-100 rounded-2xl p-5 hover:border-gray-300 hover:shadow-xl transition-all cursor-pointer group"
                                >
                                    <div className="flex items-start gap-4">
                                        {/* Icon */}
                                        <div className={`w-12 h-12 ${config.bg} rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                                            <FileText size={20} className={config.color} />
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                <h3 className="text-base font-black text-black truncate flex-1 group-hover:text-gray-700 transition-colors">
                                                    {session.documentTitle || 'Untitled Session'}
                                                </h3>
                                                <span className="text-xs font-bold text-gray-500 whitespace-nowrap">
                                                    {formatDate(session.startTime)}
                                                </span>
                                            </div>

                                            {/* Subject Badge */}
                                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${config.bg} ${config.color} border ${config.border} mb-3`}>
                                                <span className="text-xs font-bold">{subject}</span>
                                            </div>

                                            {/* Stats Row */}
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600 font-medium">
                                                <span className="flex items-center gap-1">
                                                    <Clock size={12} />
                                                    {formatDuration(session.totalTime)}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Target size={12} />
                                                    {Math.round(session.progressPercentage || 0)}% complete
                                                </span>
                                                {session.status === 'completed' && (
                                                    <span className="flex items-center gap-1 text-green-600">
                                                        <Award size={12} />
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
                        className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-16 text-center"
                    >
                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                            <Clock size={32} className="text-gray-300" />
                        </div>
                        <h3 className="text-xl font-bold text-black mb-2">
                            {searchTerm || filterBy !== 'all' ? 'No sessions found' : 'No study history yet'}
                        </h3>
                        <p className="text-gray-600 mb-6 max-w-md mx-auto font-medium">
                            {searchTerm 
                                ? `No results for "${searchTerm}"`
                                : filterBy !== 'all'
                                ? `No sessions in this time period`
                                : 'Start studying to build your learning history!'}
                        </p>
                        {!searchTerm && filterBy === 'all' && (
                            <button
                                onClick={() => navigate('/dashboard?tab=documents')}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl font-bold hover:scale-105 transition-all shadow-lg"
                            >
                                <BookOpen size={18} />
                                Start Studying
                            </button>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SessionHistorySection;
