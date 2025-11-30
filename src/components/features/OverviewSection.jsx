// src/components/features/OverviewSection.jsx - UNIQUE & SYMMETRIC
import { motion } from 'framer-motion';
import {
    BookOpen, Upload, Trophy, Target, TrendingUp, Flame,
    Brain, FileText, Video, Sparkles, Users, ChevronRight,
    Clock, Activity, Calendar, ArrowRight, Zap, Play, Plus, Star
} from 'lucide-react';

const OverviewSection = ({
    stats = {},
    recentDocuments = [],
    aiRecommendations = [],
    activeRooms = [],
    quickActions = [],
    handleTabChange,
    handleUploadClick,
    handleTakeQuiz,
    handleJoinRoom,
    navigate
}) => {
    // Safe defaults
    const safeStats = {
        totalDocuments: stats?.totalDocuments ?? 0,
        quizzesGenerated: stats?.quizzesGenerated ?? 0,
        averageAccuracy: stats?.averageAccuracy ?? 0,
        currentStreak: stats?.currentStreak ?? 0,
        xp: stats?.xp ?? 0,
        level: stats?.level ?? 1,
        badges: stats?.badges ?? 0,
        quizzesCompleted: stats?.quizzesCompleted ?? 0,
        totalStudyTime: stats?.totalStudyTime ?? 0,
        totalSessions: stats?.totalSessions ?? 0
    };

    const safeRecentDocs = Array.isArray(recentDocuments) ? recentDocuments : [];
    const safeRecommendations = Array.isArray(aiRecommendations) ? aiRecommendations : [];
    const safeActiveRooms = Array.isArray(activeRooms) ? activeRooms : [];
    const safeQuickActions = Array.isArray(quickActions) ? quickActions : [];

    // Format date helper
    const formatDate = (timestamp) => {
        if (!timestamp) return 'Just now';
        try {
            if (timestamp.toDate && typeof timestamp.toDate === 'function') {
                return timestamp.toDate().toLocaleDateString();
            }
            if (timestamp instanceof Date) {
                return timestamp.toLocaleDateString();
            }
            return new Date(timestamp).toLocaleDateString();
        } catch (error) {
            return 'Just now';
        }
    };

    return (
        <div className="space-y-8">
            {/* HEXAGONAL STATS GRID */}
            <div className="relative">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Documents Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="group bg-white rounded-2xl p-6 border-2 border-gray-200 hover:border-gray-900 hover:shadow-xl transition-all cursor-pointer relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-gray-50 to-transparent rounded-bl-full" />
                        <div className="flex items-start justify-between mb-4">
                            <div className="w-12 h-12 bg-gray-900 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                <FileText size={24} className="text-white" strokeWidth={2} />
                            </div>
                            <div className="text-right">
                                <TrendingUp size={16} className="text-green-500 mb-1" strokeWidth={2.5} />
                                <div className="text-xs font-bold text-gray-400">+12%</div>
                            </div>
                        </div>
                        <div className="text-2xl font-black text-gray-900 mb-1">{safeStats.totalDocuments}</div>
                        <div className="text-sm text-gray-500 font-semibold">Documents</div>
                    </motion.div>

                    {/* Study Time Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="group bg-white rounded-2xl p-6 border-2 border-gray-200 hover:border-gray-900 hover:shadow-xl transition-all cursor-pointer relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-gray-50 to-transparent rounded-bl-full" />
                        <div className="flex items-start justify-between mb-4">
                            <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Clock size={24} className="text-white" strokeWidth={2} />
                            </div>
                            <div className="text-right">
                                <Activity size={16} className="text-blue-500 mb-1" strokeWidth={2.5} />
                                <div className="text-xs font-bold text-gray-400">+8%</div>
                            </div>
                        </div>
                        <div className="text-2xl font-black text-gray-900 mb-1">{safeStats.totalStudyTime}<span className="text-lg text-gray-400">m</span></div>
                        <div className="text-sm text-gray-500 font-semibold">Study Time</div>
                    </motion.div>

                    {/* Sessions Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="group bg-white rounded-2xl p-6 border-2 border-gray-200 hover:border-gray-900 hover:shadow-xl transition-all cursor-pointer relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-gray-50 to-transparent rounded-bl-full" />
                        <div className="flex items-start justify-between mb-4">
                            <div className="w-12 h-12 bg-gray-700 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Target size={24} className="text-white" strokeWidth={2} />
                            </div>
                            <div className="text-right">
                                <Brain size={16} className="text-purple-500 mb-1" strokeWidth={2.5} />
                                <div className="text-xs font-bold text-gray-400">+15%</div>
                            </div>
                        </div>
                        <div className="text-2xl font-black text-gray-900 mb-1">{safeStats.totalSessions}</div>
                        <div className="text-sm text-gray-500 font-semibold">Sessions</div>
                    </motion.div>

                    {/* Streak Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="group bg-gradient-to-br from-gray-900 to-black rounded-2xl p-6 text-white hover:shadow-2xl transition-all cursor-pointer relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-orange-500/10 to-transparent rounded-bl-full" />
                        <div className="relative">
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform">
                                    <Flame size={24} strokeWidth={2} />
                                </div>
                                <div className="text-right">
                                    <Sparkles size={16} className="text-yellow-400 mb-1 animate-pulse" strokeWidth={2.5} />
                                    <div className="text-xs font-bold text-white/60">Active</div>
                                </div>
                            </div>
                            <div className="text-2xl font-black mb-1 flex items-center gap-2">
                                {safeStats.currentStreak}
                                <div className="flex">
                                    {[...Array(Math.min(safeStats.currentStreak, 3))].map((_, i) => (
                                        <Star key={i} size={14} className="text-yellow-400 fill-current" />
                                    ))}
                                </div>
                            </div>
                            <div className="text-sm text-white/80 font-semibold">Day Streak</div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* MAIN CONTENT GRID - Enhanced Symmetry */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* LEFT COLUMN - Quick Actions */}
                <div className="xl:col-span-1">
                    <div className="bg-white border-2 border-gray-200 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-2 h-8 bg-gray-900 rounded-full" />
                            <h2 className="text-xl font-black text-gray-900">Quick Actions</h2>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                            {safeQuickActions.map((action, idx) => {
                                const Icon = action.icon;
                                return (
                                    <motion.button
                                        key={idx}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.05 * idx }}
                                        onClick={() => {
                                            if (action.action) action.action();
                                            else if (action.path) navigate(action.path);
                                        }}
                                        className="group bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-gray-900 hover:shadow-lg transition-all text-left flex items-center gap-4"
                                    >
                                        <div className={`w-12 h-12 bg-gradient-to-br ${action.gradient || 'from-gray-800 to-gray-700'} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0`}>
                                            <Icon size={20} className={action.iconColor || 'text-white'} strokeWidth={2.5} />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-sm font-black text-gray-900 mb-1">
                                                {action.label}
                                            </h3>
                                            <p className="text-xs text-gray-500 font-semibold leading-tight">{action.desc}</p>
                                        </div>
                                        <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-900 group-hover:translate-x-1 transition-all" />
                                    </motion.button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* CENTER COLUMN - Recent Documents */}
                <div className="xl:col-span-1">
                    <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 h-full">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-8 bg-gray-900 rounded-full" />
                                <h2 className="text-xl font-black text-gray-900">Recent Documents</h2>
                            </div>
                            <button
                                onClick={() => handleTabChange?.('documents')}
                                className="text-xs font-bold text-gray-500 hover:text-gray-900 flex items-center gap-1 transition-colors group"
                            >
                                View All
                                <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" strokeWidth={2.5} />
                            </button>
                        </div>

                        {safeRecentDocs.length > 0 ? (
                            <div className="space-y-3">
                                {safeRecentDocs.slice(0, 6).map((doc, idx) => (
                                    <motion.div
                                        key={doc.id || idx}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.05 * idx }}
                                        onClick={() => navigate(`/study/${doc.id}`)}
                                        className="group bg-gray-50 border border-gray-200 rounded-xl p-4 hover:border-gray-900 hover:bg-white hover:shadow-lg transition-all cursor-pointer"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                                <FileText size={18} className="text-white" strokeWidth={2.5} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-sm font-black text-gray-900 truncate mb-1">
                                                    {doc.title || doc.fileName || 'Untitled'}
                                                </h3>
                                                <div className="flex items-center gap-2 text-xs text-gray-500 font-semibold">
                                                    {doc.subject && (
                                                        <span className="px-2 py-1 rounded-md bg-gray-100 text-xs">
                                                            {doc.subject}
                                                        </span>
                                                    )}
                                                    <span>{formatDate(doc.createdAt)}</span>
                                                </div>
                                            </div>
                                            <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-900 group-hover:translate-x-1 transition-all" strokeWidth={2.5} />
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-center py-8"
                            >
                                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <FileText size={28} className="text-gray-400" />
                                </div>
                                <h3 className="text-base font-bold text-gray-900 mb-2">No documents yet</h3>
                                <p className="text-sm text-gray-500 mb-5 font-medium">Upload your first PDF to get started</p>
                                <button
                                    onClick={handleUploadClick}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:scale-105 transition-all"
                                >
                                    <Upload size={16} strokeWidth={2.5} />
                                    Upload PDF
                                </button>
                            </motion.div>
                        )}
                    </div>
                </div>

                {/* RIGHT COLUMN - Live Rooms */}
                <div className="xl:col-span-1">
                    <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 h-full">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-8 bg-gray-900 rounded-full" />
                                <h2 className="text-xl font-black text-gray-900">Live Rooms</h2>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                <span className="text-xs text-gray-500 font-bold">{safeActiveRooms.length} active</span>
                            </div>
                        </div>

                        {safeActiveRooms.length > 0 ? (
                            <div className="space-y-3">
                                {safeActiveRooms.slice(0, 4).map((room, idx) => (
                                    <motion.div
                                        key={room.id || idx}
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.05 * idx }}
                                        onClick={() => handleJoinRoom?.(room.id)}
                                        className="group bg-gray-50 border border-gray-200 rounded-xl p-4 hover:border-gray-900 hover:bg-white hover:shadow-lg transition-all cursor-pointer"
                                    >
                                        <div className="flex items-center gap-4 mb-3">
                                            <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                                <Video size={18} className="text-white" strokeWidth={2.5} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <span className="text-sm font-bold text-gray-900 truncate block">{room.name}</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-xs text-green-600 font-bold">
                                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                                LIVE
                                            </div>
                                        </div>
                                        <div className="text-xs text-gray-500 mb-2 font-semibold ml-14">{room.topic || 'General Discussion'}</div>
                                        <div className="flex items-center justify-between text-xs text-gray-500 font-semibold ml-14">
                                            <div className="flex items-center gap-1">
                                                <Users size={12} strokeWidth={2.5} />
                                                <span>{room.members?.length || 0} members</span>
                                            </div>
                                            <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-900 group-hover:translate-x-1 transition-all" strokeWidth={2.5} />
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <Users size={28} className="text-gray-400" />
                                </div>
                                <p className="text-sm text-gray-600 font-semibold">No active rooms</p>
                                <p className="text-xs text-gray-500 mt-1">Be the first to create one!</p>
                                <button className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-bold hover:scale-105 transition-all">
                                    <Plus size={16} />
                                    Create Room
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OverviewSection;