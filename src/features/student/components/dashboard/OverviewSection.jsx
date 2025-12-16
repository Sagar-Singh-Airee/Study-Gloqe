// src/components/features/OverviewSection.jsx
// REFINED: Fixed Redirection, Permanent Guide, Bigger Upload UI
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    BookOpen, Upload, Trophy, Target, TrendingUp, Flame,
    Brain, FileText, Video, Sparkles, Users, ChevronRight,
    Clock, Activity, Calendar, ArrowRight, Zap, Play, Plus, Star,
    X, HelpCircle, CheckCircle2, GraduationCap, ChevronDown, ChevronUp
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

const OverviewSection = ({
    stats = {},
    recentDocuments = [],
    activeRooms = [],
    quickActions = [], // We'll merge this with our default actions
    handleTabChange,
    handleUploadClick, // ✅ We will use this explicitly
    handleTakeQuiz,
    handleJoinRoom,
    navigate: propNavigate, // Accept navigate from props if provided
    userName = "Scholar"
}) => {
    // 1. Unified Navigation Handler
    const hookNavigate = useNavigate();
    const doNavigate = propNavigate || hookNavigate;

    // 2. State & Safe Defaults
    const [showGuide, setShowGuide] = useState(true); // Always starts open, user can toggle
    const safeStats = {
        totalDocuments: stats?.totalDocuments ?? 0,
        currentStreak: stats?.streak ?? stats?.currentStreak ?? 0,
        totalStudyTime: stats?.totalStudyTime ?? 0,
        totalSessions: stats?.totalSessions ?? 0,
        xp: stats?.xp ?? 0
    };
    const safeRecentDocs = Array.isArray(recentDocuments) ? recentDocuments : [];
    const safeActiveRooms = Array.isArray(activeRooms) ? activeRooms : [];

    // 3. Animation Variants
    const containerVariants = { show: { transition: { staggerChildren: 0.1 } } };
    const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-8 font-sans pb-12"
        >
            {/* HEADER AREA */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-1">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">
                        Dashboard
                    </h1>
                    <p className="text-gray-500 font-medium mt-1">
                        Ready to learn, <span className="text-teal-600 font-bold">{userName}</span>?
                    </p>
                </div>

                <button
                    onClick={() => setShowGuide(!showGuide)}
                    className="flex items-center gap-2 px-4 py-2 bg-teal-50 text-teal-700 rounded-full font-bold text-sm hover:bg-teal-100 transition-colors"
                >
                    <Sparkles size={16} />
                    {showGuide ? "Hide Guide" : "How it Works"}
                    {showGuide ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
            </div>

            {/* 1. PERMANENT "HOW TO USE" GUIDE (Collapsible) */}
            <AnimatePresence>
                {showGuide && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="bg-gradient-to-r from-gray-900 to-blue-900 rounded-[24px] p-6 text-white shadow-xl relative">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
                                <GuideStep
                                    step="1" title="Upload" icon={Upload} color="blue"
                                    desc="Upload PDFs or images. AI parses them instantly."
                                    action={() => handleUploadClick ? handleUploadClick() : doNavigate('/upload')}
                                />
                                <GuideStep
                                    step="2" title="Study" icon={BookOpen} color="teal"
                                    desc="Read and ask 'Gloqe' questions about your text."
                                // No direct action, just info
                                />
                                <GuideStep
                                    step="3" title="Quiz" icon={Zap} color="purple"
                                    desc="Take AI-generated quizzes to test mastery."
                                    action={() => handleTakeQuiz ? handleTakeQuiz() : doNavigate('/quiz')}
                                />
                                <GuideStep
                                    step="4" title="Rank Up" icon={Trophy} color="orange"
                                    desc="Earn XP and climb the global leaderboard."
                                // No direct action
                                />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 2. STATS OVERVIEW */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <StatCard
                    title="Documents" value={safeStats.totalDocuments}
                    icon={FileText} color="blue"
                    onClick={() => handleTabChange ? handleTabChange('documents') : doNavigate('/documents')}
                />
                <StatCard title="Study Minutes" value={safeStats.totalStudyTime} icon={Clock} color="teal" />
                <StatCard title="XP Earned" value={safeStats.xp} icon={Target} color="purple" />

                {/* Streak Card */}
                <motion.div variants={itemVariants} className="bg-gradient-to-br from-gray-900 to-black rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
                    <div className="flex items-center gap-2 mb-4">
                        <Flame className="text-orange-500 fill-orange-500" size={20} />
                        <span className="text-sm font-bold text-gray-300">Streak</span>
                    </div>
                    <div className="text-4xl font-black">{safeStats.currentStreak} <span className="text-lg text-gray-500">days</span></div>
                </motion.div>
            </div>

            {/* 3. MAIN ACTION AREA */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* LEFT: PRIMARY ACTIONS */}
                <motion.div variants={itemVariants} className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-[24px] p-1 shadow-sm border border-gray-100 h-full">
                        <div className="bg-gray-50/50 rounded-[20px] p-6 h-full flex flex-col">
                            <h2 className="text-lg font-black text-gray-900 mb-6">Start Learning</h2>

                            {/* 🚀 BIG UPLOAD BUTTON */}
                            <button
                                onClick={handleUploadClick || (() => doNavigate('/upload'))}
                                className="group relative w-full aspect-[4/3] bg-white rounded-2xl border-2 border-dashed border-blue-200 hover:border-blue-500 hover:bg-blue-50 transition-all flex flex-col items-center justify-center mb-4 overflow-hidden"
                            >
                                <div className="w-20 h-20 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm">
                                    <Upload size={36} strokeWidth={2.5} />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900">Upload New PDF</h3>
                                <p className="text-sm text-gray-500 font-medium mt-1">Drag & drop or click</p>
                            </button>

                            <div className="grid grid-cols-2 gap-3 mt-auto">
                                <button
                                    onClick={handleTakeQuiz || (() => doNavigate('/quiz'))}
                                    className="p-4 bg-white rounded-xl border border-gray-200 hover:border-purple-500 hover:shadow-md transition-all text-center group"
                                >
                                    <Zap size={24} className="mx-auto text-purple-500 mb-2 group-hover:scale-110 transition-transform" />
                                    <span className="text-xs font-bold text-gray-700 block">Take Quiz</span>
                                </button>
                                <button
                                    onClick={handleJoinRoom || (() => doNavigate('/rooms'))}
                                    className="p-4 bg-white rounded-xl border border-gray-200 hover:border-green-500 hover:shadow-md transition-all text-center group"
                                >
                                    <Video size={24} className="mx-auto text-green-500 mb-2 group-hover:scale-110 transition-transform" />
                                    <span className="text-xs font-bold text-gray-700 block">Join Class</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* MIDDLE: RECENT DOCS */}
                <motion.div variants={itemVariants} className="lg:col-span-1">
                    <div className="flex items-center justify-between mb-4 px-2">
                        <h2 className="text-lg font-black text-gray-900">Recent</h2>
                        <button onClick={() => handleTabChange ? handleTabChange('documents') : doNavigate('/documents')} className="text-xs font-bold text-teal-600">View All</button>
                    </div>
                    <div className="space-y-3">
                        {safeRecentDocs.length > 0 ? safeRecentDocs.slice(0, 4).map((doc, i) => (
                            <div
                                key={i}
                                onClick={() => doNavigate(`/study/${doc.id}`)}
                                className="group bg-white p-4 rounded-2xl border border-gray-100 hover:border-teal-400 hover:shadow-md transition-all cursor-pointer flex items-center gap-4"
                            >
                                <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 font-bold text-xs">PDF</div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-bold text-gray-900 truncate">{doc.title}</h4>
                                    <p className="text-xs text-gray-500">{doc.subject || "General Study"}</p>
                                </div>
                                <ChevronRight size={18} className="text-gray-300 group-hover:text-teal-600" />
                            </div>
                        )) : (
                            <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-200">
                                <p className="text-sm font-bold text-gray-400">No recent documents</p>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* RIGHT: LIVE ROOMS */}
                <motion.div variants={itemVariants} className="lg:col-span-1">
                    <div className="flex items-center justify-between mb-4 px-2">
                        <h2 className="text-lg font-black text-gray-900">Live</h2>
                    </div>
                    <div className="bg-white rounded-[24px] border border-gray-100 overflow-hidden shadow-sm">
                        {safeActiveRooms.length > 0 ? safeActiveRooms.map((room, i) => (
                            <div
                                key={i}
                                onClick={() => handleJoinRoom ? handleJoinRoom(room.id) : doNavigate(`/room/${room.id}`)}
                                className="p-4 hover:bg-gray-50 border-b border-gray-50 last:border-0 cursor-pointer flex items-center gap-4"
                            >
                                <div className="relative">
                                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
                                        {room.code?.slice(0, 2) || "CL"}
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                                        <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-gray-900">{room.name}</h4>
                                    <p className="text-xs text-green-600 font-bold">Live Now</p>
                                </div>
                            </div>
                        )) : (
                            <div className="p-8 text-center text-gray-400 text-sm font-bold">No active classes</div>
                        )}
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
};

// --- SUB-COMPONENTS ---

const GuideStep = ({ step, title, icon: Icon, color, desc, action }) => (
    <div className={`relative p-4 rounded-2xl bg-white/5 border border-white/10 ${action ? 'cursor-pointer hover:bg-white/10' : ''} transition-colors`} onClick={action}>
        <div className={`w-10 h-10 rounded-full bg-${color}-500/20 text-${color}-300 flex items-center justify-center mb-3 font-bold`}>
            {step}
        </div>
        <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
            {title} <Icon size={16} className={`text-${color}-400`} />
        </h3>
        <p className="text-xs text-gray-300 leading-relaxed">{desc}</p>
        {action && (
            <div className="mt-3 flex items-center gap-1 text-xs font-bold text-teal-300">
                Try Now <ArrowRight size={12} />
            </div>
        )}
    </div>
);

const StatCard = ({ title, value, icon: Icon, color, onClick }) => (
    <motion.div
        whileHover={onClick ? { y: -5 } : {}}
        onClick={onClick}
        className={`bg-white rounded-3xl p-5 shadow-lg border border-gray-100 ${onClick ? 'cursor-pointer' : ''}`}
    >
        <div className={`w-10 h-10 rounded-xl bg-${color}-50 text-${color}-600 flex items-center justify-center mb-4`}>
            <Icon size={20} />
        </div>
        <div className="text-3xl font-black text-gray-900 mb-1">{value}</div>
        <div className="text-xs font-bold text-gray-400 uppercase">{title}</div>
    </motion.div>
);

export default OverviewSection;
