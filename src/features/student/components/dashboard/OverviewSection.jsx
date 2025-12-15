// src/components/features/OverviewSection.jsx - PREMIUM UI WITH REAL-TIME STREAK
import { motion, AnimatePresence } from 'framer-motion';
import {
    BookOpen, Upload, Trophy, Target, TrendingUp, Flame,
    Brain, FileText, Video, Sparkles, Users, ChevronRight,
    Clock, Activity, Calendar, ArrowRight, Zap, Play, Plus, Star,
    BarChart3, Award, Target as TargetIcon, Clock as ClockIcon,
    BookMarked, Video as VideoIcon, Users as UsersIcon
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

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
    // Safe defaults - FIX: Use both 'streak' and 'currentStreak' for compatibility
    const safeStats = {
        totalDocuments: stats?.totalDocuments ?? 0,
        quizzesGenerated: stats?.quizzesGenerated ?? 0,
        averageAccuracy: stats?.averageAccuracy ?? 0,
        currentStreak: stats?.streak ?? stats?.currentStreak ?? 0, // ✅ Fixed: Check both properties
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

    // Hover state for cards
    const [hoveredCard, setHoveredCard] = useState(null);
    
    // ✅ Real-time streak tracking with animation
    const [displayStreak, setDisplayStreak] = useState(safeStats.currentStreak);
    const [streakIncreased, setStreakIncreased] = useState(false);
    const prevStreakRef = useRef(safeStats.currentStreak);

    // ✅ Real-time streak update effect
    useEffect(() => {
        const newStreak = safeStats.currentStreak;
        const prevStreak = prevStreakRef.current;

        if (newStreak !== prevStreak) {
            // Animate streak change
            if (newStreak > prevStreak) {
                setStreakIncreased(true);
                setTimeout(() => setStreakIncreased(false), 1000);
            }
            
            // Smooth number transition
            const duration = 500;
            const startTime = Date.now();
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const current = Math.floor(prevStreak + (newStreak - prevStreak) * progress);
                
                setDisplayStreak(current);
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    setDisplayStreak(newStreak);
                    prevStreakRef.current = newStreak;
                }
            };
            
            requestAnimationFrame(animate);
        }
    }, [safeStats.currentStreak]);

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

    // Card animation variants
    const cardVariants = {
        initial: { opacity: 0, y: 20, scale: 0.95 },
        animate: { 
            opacity: 1, 
            y: 0, 
            scale: 1,
            transition: {
                duration: 0.4,
                ease: [0.25, 0.1, 0.25, 1],
                type: "spring",
                stiffness: 100
            }
        },
        hover: {
            y: -4,
            scale: 1.02,
            transition: {
                duration: 0.2,
                ease: "easeOut"
            }
        }
    };

    // Stat number animation
    const statNumberVariants = {
        initial: { opacity: 0, scale: 0.8 },
        animate: { 
            opacity: 1, 
            scale: 1,
            transition: {
                delay: 0.2,
                duration: 0.5,
                ease: "easeOut"
            }
        }
    };

    return (
        <div className="space-y-8">
            {/* HERO STATS GRID - Premium Glass Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Documents Card */}
                <motion.div
                    custom={0}
                    initial="initial"
                    animate="animate"
                    whileHover="hover"
                    variants={cardVariants}
                    onHoverStart={() => setHoveredCard('documents')}
                    onHoverEnd={() => setHoveredCard(null)}
                    className="group relative bg-white/80 backdrop-blur-xl rounded-3xl p-6 border border-white/50 shadow-lg hover:shadow-2xl transition-all cursor-pointer overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative">
                        <div className="flex items-start justify-between mb-6">
                            <motion.div 
                                whileHover={{ scale: 1.1, rotate: 5 }}
                                className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg"
                            >
                                <FileText size={24} className="text-white" strokeWidth={2.5} />
                            </motion.div>
                            <motion.div 
                                className="text-right"
                                animate={hoveredCard === 'documents' ? { scale: 1.1 } : { scale: 1 }}
                            >
                                <TrendingUp size={18} className="text-green-500 mb-1" strokeWidth={2.5} />
                                <div className="text-xs font-bold text-gray-400">+12%</div>
                            </motion.div>
                        </div>
                        <motion.div 
                            key={safeStats.totalDocuments}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="text-3xl font-black text-gray-900 mb-2 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent"
                        >
                            {safeStats.totalDocuments}
                        </motion.div>
                        <div className="text-sm text-gray-600 font-semibold flex items-center gap-2">
                            <BookOpen size={14} className="text-gray-400" />
                            Documents
                        </div>
                    </div>
                </motion.div>

                {/* Study Time Card */}
                <motion.div
                    custom={1}
                    initial="initial"
                    animate="animate"
                    whileHover="hover"
                    variants={cardVariants}
                    onHoverStart={() => setHoveredCard('studyTime')}
                    onHoverEnd={() => setHoveredCard(null)}
                    className="group relative bg-white/80 backdrop-blur-xl rounded-3xl p-6 border border-white/50 shadow-lg hover:shadow-2xl transition-all cursor-pointer overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative">
                        <div className="flex items-start justify-between mb-6">
                            <motion.div 
                                whileHover={{ scale: 1.1, rotate: -5 }}
                                className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg"
                            >
                                <Clock size={24} className="text-white" strokeWidth={2.5} />
                            </motion.div>
                            <motion.div 
                                className="text-right"
                                animate={hoveredCard === 'studyTime' ? { scale: 1.1 } : { scale: 1 }}
                            >
                                <Activity size={18} className="text-blue-500 mb-1" strokeWidth={2.5} />
                                <div className="text-xs font-bold text-gray-400">+8%</div>
                            </motion.div>
                        </div>
                        <motion.div 
                            key={safeStats.totalStudyTime}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="text-3xl font-black text-gray-900 mb-2 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent"
                        >
                            {safeStats.totalStudyTime}
                            <span className="text-lg text-gray-500 ml-1">m</span>
                        </motion.div>
                        <div className="text-sm text-gray-600 font-semibold flex items-center gap-2">
                            <ClockIcon size={14} className="text-gray-400" />
                            Study Time
                        </div>
                    </div>
                </motion.div>

                {/* Sessions Card */}
                <motion.div
                    custom={2}
                    initial="initial"
                    animate="animate"
                    whileHover="hover"
                    variants={cardVariants}
                    onHoverStart={() => setHoveredCard('sessions')}
                    onHoverEnd={() => setHoveredCard(null)}
                    className="group relative bg-white/80 backdrop-blur-xl rounded-3xl p-6 border border-white/50 shadow-lg hover:shadow-2xl transition-all cursor-pointer overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative">
                        <div className="flex items-start justify-between mb-6">
                            <motion.div 
                                whileHover={{ scale: 1.1, rotate: 5 }}
                                className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg"
                            >
                                <TargetIcon size={24} className="text-white" strokeWidth={2.5} />
                            </motion.div>
                            <motion.div 
                                className="text-right"
                                animate={hoveredCard === 'sessions' ? { scale: 1.1 } : { scale: 1 }}
                            >
                                <Brain size={18} className="text-purple-500 mb-1" strokeWidth={2.5} />
                                <div className="text-xs font-bold text-gray-400">+15%</div>
                            </motion.div>
                        </div>
                        <motion.div 
                            key={safeStats.totalSessions}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="text-3xl font-black text-gray-900 mb-2 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent"
                        >
                            {safeStats.totalSessions}
                        </motion.div>
                        <div className="text-sm text-gray-600 font-semibold flex items-center gap-2">
                            <Activity size={14} className="text-gray-400" />
                            Sessions
                        </div>
                    </div>
                </motion.div>

                {/* Streak Card - Premium Gradient with REAL-TIME UPDATES */}
                <motion.div
                    custom={3}
                    initial="initial"
                    animate="animate"
                    whileHover="hover"
                    variants={cardVariants}
                    onHoverStart={() => setHoveredCard('streak')}
                    onHoverEnd={() => setHoveredCard(null)}
                    className="group relative bg-gradient-to-br from-gray-900 via-gray-800 to-black rounded-3xl p-6 text-white shadow-lg hover:shadow-2xl transition-all cursor-pointer overflow-hidden"
                >
                    {/* ✅ Celebration overlay when streak increases */}
                    <AnimatePresence>
                        {streakIncreased && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: [0, 1, 0] }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 1 }}
                                className="absolute inset-0 bg-gradient-to-br from-orange-400/20 via-red-400/20 to-yellow-400/20 pointer-events-none"
                            />
                        )}
                    </AnimatePresence>
                    
                    <div className="absolute inset-0 bg-gradient-to-tr from-orange-500/10 via-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative">
                        <div className="flex items-start justify-between mb-6">
                            <motion.div 
                                whileHover={{ scale: 1.1, rotate: -5 }}
                                animate={streakIncreased ? { 
                                    scale: [1, 1.2, 1],
                                    rotate: [-5, 5, -5]
                                } : {}}
                                transition={{ duration: 0.5 }}
                                className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20"
                            >
                                <Flame size={24} strokeWidth={2.5} className="text-orange-400" />
                            </motion.div>
                            <motion.div 
                                animate={hoveredCard === 'streak' ? { scale: 1.1 } : { scale: 1 }}
                            >
                                <Sparkles size={18} className="text-yellow-400 mb-1 animate-pulse" strokeWidth={2.5} />
                                <div className="text-xs font-bold text-white/60">🔥 {displayStreak > 0 ? 'Hot' : 'Start'}</div>
                            </motion.div>
                        </div>
                        
                        {/* ✅ Real-time updating streak number */}
                        <motion.div 
                            key={displayStreak}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="text-3xl font-black mb-2 flex items-center gap-3"
                        >
                            <motion.span
                                animate={streakIncreased ? {
                                    scale: [1, 1.3, 1],
                                    color: ['#ffffff', '#fbbf24', '#ffffff']
                                } : {}}
                                transition={{ duration: 0.5 }}
                            >
                                {displayStreak}
                            </motion.span>
                            
                            {/* ✅ Animated stars based on streak */}
                            <AnimatePresence mode="wait">
                                <motion.div 
                                    key={displayStreak}
                                    initial={{ opacity: 0, scale: 0 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0 }}
                                    className="flex gap-1"
                                >
                                    {[...Array(Math.min(displayStreak, 5))].map((_, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, scale: 0, rotate: -180 }}
                                            animate={{ 
                                                opacity: 1, 
                                                scale: 1, 
                                                rotate: 0
                                            }}
                                            transition={{ 
                                                delay: i * 0.1,
                                                type: "spring",
                                                stiffness: 200
                                            }}
                                        >
                                            <Star size={14} className="text-yellow-400 fill-current" />
                                        </motion.div>
                                    ))}
                                </motion.div>
                            </AnimatePresence>
                        </motion.div>
                        
                        <div className="text-sm font-semibold flex items-center gap-2 text-white/80">
                            <Flame size={14} className="text-orange-400" />
                            Day Streak {displayStreak > 0 && '🎯'}
                        </div>
                        
                        {/* ✅ Motivational message */}
                        {displayStreak > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-3 text-xs text-white/60 font-medium"
                            >
                                {displayStreak === 1 && "Great start! 🚀"}
                                {displayStreak >= 2 && displayStreak < 7 && "Keep going! 💪"}
                                {displayStreak >= 7 && displayStreak < 30 && "On fire! 🔥"}
                                {displayStreak >= 30 && "Legendary! 👑"}
                            </motion.div>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* MAIN CONTENT GRID - Perfectly Balanced */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* LEFT: Quick Actions - Interactive Cards */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="lg:col-span-1"
                >
                    <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 border border-white/50 shadow-lg">
                        <div className="flex items-center gap-3 mb-6">
                            <motion.div 
                                className="w-2 h-8 bg-gradient-to-b from-gray-900 to-gray-700 rounded-full"
                                whileHover={{ scale: 1.1 }}
                            />
                            <h2 className="text-xl font-black text-gray-900 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                                Quick Actions
                            </h2>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            {safeQuickActions.map((action, idx) => {
                                const Icon = action.icon;
                                return (
                                    <motion.button
                                        key={idx}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        whileHover={{ 
                                            x: 4,
                                            scale: 1.02
                                        }}
                                        whileTap={{ scale: 0.98 }}
                                        transition={{ delay: 0.05 * idx, type: "spring", stiffness: 300 }}
                                        onClick={() => {
                                            if (action.action) action.action();
                                            else if (action.path) navigate(action.path);
                                        }}
                                        className="group relative bg-white rounded-2xl p-5 border-2 border-gray-200 hover:border-gray-900 hover:shadow-xl transition-all text-left flex items-center gap-4 overflow-hidden"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-gray-900/0 via-gray-900/5 to-gray-900/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                                        <motion.div 
                                            whileHover={{ scale: 1.1, rotate: 5 }}
                                            className={`w-14 h-14 bg-gradient-to-br ${action.gradient || 'from-gray-800 to-gray-700'} rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0`}
                                        >
                                            <Icon size={22} className={action.iconColor || 'text-white'} strokeWidth={2.5} />
                                        </motion.div>
                                        <div className="flex-1 relative">
                                            <h3 className="text-base font-black text-gray-900 mb-1">
                                                {action.label}
                                            </h3>
                                            <p className="text-sm text-gray-600 font-medium leading-tight">
                                                {action.desc}
                                            </p>
                                        </div>
                                        <motion.div
                                            animate={{ x: [0, 4, 0] }}
                                            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                                        >
                                            <ChevronRight size={18} className="text-gray-300 group-hover:text-gray-900 transition-colors" strokeWidth={2.5} />
                                        </motion.div>
                                    </motion.button>
                                );
                            })}
                        </div>
                    </div>
                </motion.div>

                {/* CENTER: Recent Documents - Glass Cards */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="lg:col-span-1"
                >
                    <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 border border-white/50 shadow-lg">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <motion.div 
                                    className="w-2 h-8 bg-gradient-to-b from-gray-900 to-gray-700 rounded-full"
                                    whileHover={{ scale: 1.1 }}
                                />
                                <h2 className="text-xl font-black text-gray-900 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                                    Recent Documents
                                </h2>
                            </div>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleTabChange?.('documents')}
                                className="text-sm font-bold text-gray-600 hover:text-gray-900 flex items-center gap-1 transition-colors group"
                            >
                                View All
                                <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" strokeWidth={2.5} />
                            </motion.button>
                        </div>

                        {safeRecentDocs.length > 0 ? (
                            <div className="space-y-3">
                                {safeRecentDocs.slice(0, 5).map((doc, idx) => (
                                    <motion.div
                                        key={doc.id || idx}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        whileHover={{ 
                                            y: -2,
                                            scale: 1.02
                                        }}
                                        transition={{ delay: 0.05 * idx, type: "spring", stiffness: 300 }}
                                        onClick={() => navigate(`/study/${doc.id}`)}
                                        className="group bg-white/60 rounded-2xl p-4 border border-gray-200 hover:border-gray-900 hover:bg-white hover:shadow-lg transition-all cursor-pointer backdrop-blur-sm"
                                    >
                                        <div className="flex items-center gap-4">
                                            <motion.div 
                                                whileHover={{ scale: 1.15, rotate: 3 }}
                                                className="w-12 h-12 bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl flex items-center justify-center shadow-md flex-shrink-0"
                                            >
                                                <FileText size={20} className="text-white" strokeWidth={2.5} />
                                            </motion.div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-sm font-black text-gray-900 truncate mb-2">
                                                    {doc.title || doc.fileName || 'Untitled'}
                                                </h3>
                                                <div className="flex items-center gap-3 text-xs text-gray-500 font-semibold">
                                                    {doc.subject && (
                                                        <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-[11px] font-bold">
                                                            {doc.subject}
                                                        </span>
                                                    )}
                                                    <span className="flex items-center gap-1">
                                                        <Calendar size={12} strokeWidth={2.5} />
                                                        {formatDate(doc.createdAt)}
                                                    </span>
                                                </div>
                                            </div>
                                            <motion.div
                                                animate={{ x: [0, 4, 0] }}
                                                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: idx * 0.1 }}
                                            >
                                                <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-900 transition-colors" strokeWidth={2.5} />
                                            </motion.div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="text-center py-12"
                            >
                                <motion.div 
                                    whileHover={{ scale: 1.1, rotate: 5 }}
                                    className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center mx-auto mb-6"
                                >
                                    <FileText size={32} className="text-gray-400" strokeWidth={2} />
                                </motion.div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">No documents yet</h3>
                                <p className="text-sm text-gray-600 mb-6 font-medium">Upload your first PDF to unlock AI-powered study tools</p>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleUploadClick}
                                    className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-2xl text-sm font-bold hover:shadow-xl transition-all"
                                >
                                    <Upload size={18} strokeWidth={2.5} />
                                    Upload PDF
                                </motion.button>
                            </motion.div>
                        )}
                    </div>
                </motion.div>

                {/* RIGHT: Live Rooms - Animated Status */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 }}
                    className="lg:col-span-1"
                >
                    <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 border border-white/50 shadow-lg">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <motion.div 
                                    className="w-2 h-8 bg-gradient-to-b from-gray-900 to-gray-700 rounded-full"
                                    whileHover={{ scale: 1.1 }}
                                />
                                <h2 className="text-xl font-black text-gray-900 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                                    Live Rooms
                                </h2>
                            </div>
                            <motion.div 
                                className="flex items-center gap-3"
                                animate={{ scale: [1, 1.05, 1] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                            >
                                <motion.div 
                                    className="w-2.5 h-2.5 bg-green-500 rounded-full"
                                    animate={{ opacity: [0.5, 1, 0.5] }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                />
                                <span className="text-xs font-bold text-gray-600">
                                    {safeActiveRooms.length} active
                                </span>
                            </motion.div>
                        </div>

                        {safeActiveRooms.length > 0 ? (
                            <div className="space-y-3">
                                {safeActiveRooms.slice(0, 4).map((room, idx) => (
                                    <motion.div
                                        key={room.id || idx}
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        whileHover={{ 
                                            x: 4,
                                            scale: 1.02
                                        }}
                                        transition={{ delay: 0.05 * idx, type: "spring", stiffness: 300 }}
                                        onClick={() => handleJoinRoom?.(room.id)}
                                        className="group bg-white/60 rounded-2xl p-4 border border-gray-200 hover:border-gray-900 hover:bg-white hover:shadow-lg transition-all cursor-pointer backdrop-blur-sm"
                                    >
                                        <div className="flex items-center gap-4 mb-3">
                                            <motion.div 
                                                whileHover={{ scale: 1.15, rotate: -3 }}
                                                className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-md flex-shrink-0"
                                            >
                                                <Video size={20} className="text-white" strokeWidth={2.5} />
                                            </motion.div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-sm font-black text-gray-900 truncate">
                                                    {room.name}
                                                </h3>
                                                <p className="text-xs text-gray-500 font-medium mt-1">
                                                    {room.topic || 'General Discussion'}
                                                </p>
                                            </div>
                                            <motion.div 
                                                className="flex items-center gap-2 text-xs font-bold text-green-600 bg-green-100 px-3 py-1.5 rounded-full"
                                                whileHover={{ scale: 1.05 }}
                                            >
                                                <motion.div 
                                                    className="w-1.5 h-1.5 bg-green-500 rounded-full"
                                                    animate={{ scale: [1, 1.3, 1] }}
                                                    transition={{ duration: 1, repeat: Infinity }}
                                                />
                                                LIVE
                                            </motion.div>
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-gray-500 font-semibold ml-14">
                                            <div className="flex items-center gap-2">
                                                <Users size={12} strokeWidth={2.5} className="text-gray-400" />
                                                <span>{room.members?.length || 0} members</span>
                                            </div>
                                            <motion.div
                                                animate={{ x: [0, 4, 0] }}
                                                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: idx * 0.1 }}
                                            >
                                                <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-900 transition-colors" strokeWidth={2.5} />
                                            </motion.div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="text-center py-12"
                            >
                                <motion.div 
                                    whileHover={{ scale: 1.1, rotate: -5 }}
                                    className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center mx-auto mb-6"
                                >
                                    <Users size={32} className="text-gray-400" strokeWidth={2} />
                                </motion.div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">No active rooms</h3>
                                <p className="text-sm text-gray-600 mb-6 font-medium">Be the first to create a study session</p>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-2xl text-sm font-bold hover:shadow-xl transition-all"
                                >
                                    <Plus size={18} strokeWidth={2.5} />
                                    Create Room
                                </motion.button>
                            </motion.div>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default OverviewSection;
