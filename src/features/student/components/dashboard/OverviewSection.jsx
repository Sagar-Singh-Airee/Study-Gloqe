// src/features/student/components/dashboard/OverviewSection.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    BookOpen, Upload, Trophy, Flame, FileText, Video,
    ChevronRight, Zap, ArrowRight
} from 'lucide-react';

const OverviewSection = ({
    stats = {},
    recentDocuments = [],
    activeRooms = [],
    handleTabChange,
    handleJoinRoom,
    userName = 'Scholar'
}) => {
    const navigate = useNavigate();

    const safeStats = {
        totalDocuments: stats?.totalDocuments ?? 0,
        currentStreak: stats?.streak ?? stats?.currentStreak ?? 0
    };

    const safeRecentDocs = Array.isArray(recentDocuments) ? recentDocuments : [];
    const safeActiveRooms = Array.isArray(activeRooms) ? activeRooms : [];

    const isFirstTime = safeStats.totalDocuments === 0;

    const containerVariants = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.08 } }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 8 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-8 pb-12"
        >
            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-1">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">
                        Dashboard
                    </h1>
                    <p className="text-gray-500 font-medium mt-1">
                        Welcome back, <span className="text-teal-500 font-bold">{userName}</span>
                    </p>
                </div>
            </div>

            {/* GUIDE STRIP */}
            <motion.section variants={itemVariants} className="px-1">
                <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="rounded-full bg-gradient-to-r from-teal-500 to-slate-400 p-[2px]">
                            <div className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-800">
                                HOW IT WORKS
                            </div>
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-slate-900">
                                Your study flow in four steps
                            </h2>
                            <p className="text-[11px] text-slate-500">
                                Upload → Study → Quiz → Rank up
                            </p>
                        </div>
                    </div>

                    <div className="hidden md:flex items-center gap-2">
                        <span className="text-[11px] font-medium text-slate-500">
                            Start with step 1
                        </span>
                        <div className="h-1.5 w-24 rounded-full bg-slate-200 overflow-hidden">
                            <motion.div
                                className="h-full bg-gradient-to-r from-teal-400 to-slate-400"
                                initial={{ x: '-100%' }}
                                animate={{ x: '100%' }}
                                transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
                            />
                        </div>
                    </div>
                </div>

                {/* 4 STEPS – bigger with hover pop-up */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <StepCard
                        number="01"
                        title="Upload"
                        desc="Add PDFs or notes so Gloqe can work with your content."
                        icon={Upload}
                        accent="teal"
                        isActive={isFirstTime}
                        onClick={() => navigate('/upload')}
                    />
                    <StepCard
                        number="02"
                        title="Study"
                        desc="Open a document and enter a focused study session."
                        icon={BookOpen}
                        accent="slate"
                        onClick={() => handleTabChange?.('documents')}
                    />
                    <StepCard
                        number="03"
                        title="Quiz"
                        desc="Generate quizzes and test what you understand."
                        icon={Zap}
                        accent="purple"
                        onClick={() => handleTabChange?.('quizzes')}
                    />
                    <StepCard
                        number="04"
                        title="Rank Up"
                        desc="Earn XP, build streaks and climb the leaderboard."
                        icon={Trophy}
                        accent="silver"
                        onClick={() => handleTabChange?.('achievements')}
                    />
                </div>
            </motion.section>

            {/* STATS ROW */}
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <StatCard
                    title="Documents"
                    value={safeStats.totalDocuments}
                    icon={FileText}
                    onClick={() => handleTabChange?.('documents')}
                />
                <motion.div
                    variants={itemVariants}
                    className="rounded-3xl bg-gradient-to-br from-slate-900 to-black px-6 py-5 text-white shadow-md"
                >
                    <div className="mb-3 flex items-center gap-2">
                        <Flame className="text-orange-400" size={18} />
                        <span className="text-xs font-semibold text-slate-200">
                            Current streak
                        </span>
                    </div>
                    <div className="text-3xl font-black">
                        {safeStats.currentStreak}
                        <span className="ml-1 text-sm font-medium text-slate-400">days</span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">
                        Keep logging in daily to grow your streak.
                    </p>
                </motion.div>
            </section>

            {/* MAIN GRID */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* LEFT: PRIMARY ACTION */}
                <motion.div variants={itemVariants} className="lg:col-span-1">
                    <div className="h-full rounded-[24px] border border-slate-200 bg-white p-1 shadow-sm">
                        <div className="flex h-full flex-col rounded-[20px] bg-slate-50/60 px-6 py-5">
                            <h2 className="mb-5 text-sm font-semibold tracking-wide text-slate-900">
                                Start a new session
                            </h2>

                            <motion.button
                                onClick={() => navigate('/upload')}
                                animate={
                                    isFirstTime
                                        ? {
                                            boxShadow: [
                                                '0 0 0 rgba(45, 212, 191, 0)',
                                                '0 0 16px rgba(45, 212, 191, 0.35)',
                                                '0 0 0 rgba(45, 212, 191, 0)'
                                            ]
                                        }
                                        : {}
                                }
                                transition={
                                    isFirstTime
                                        ? { duration: 2, repeat: Infinity, ease: 'easeInOut' }
                                        : {}
                                }
                                className="group relative mb-4 flex w-full flex-1 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 bg-white px-4 text-center shadow-xs hover:border-teal-400 hover:bg-slate-50 transition-colors"
                            >
                                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-50 text-teal-600 shadow-sm group-hover:scale-105 transition-transform">
                                    <Upload size={26} />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-slate-900">
                                        {isFirstTime ? 'Upload your first PDF' : 'Upload a new PDF'}
                                    </p>
                                    <p className="mt-1 text-[11px] font-medium text-slate-500">
                                        Click to browse files from your device.
                                    </p>
                                </div>
                            </motion.button>

                            <div className="mt-auto grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => handleTabChange?.('quizzes')}
                                    className="group rounded-xl border border-slate-200 bg-white px-3 py-3 text-center text-xs font-semibold text-slate-800 hover:border-purple-400 hover:shadow-md transition-all"
                                >
                                    <Zap
                                        size={18}
                                        className="mx-auto mb-1 text-purple-500 group-hover:scale-105 transition-transform"
                                    />
                                    Quizzes
                                </button>
                                <button
                                    onClick={() => handleTabChange?.('classes')}
                                    className="group rounded-xl border border-slate-200 bg-white px-3 py-3 text-center text-xs font-semibold text-slate-800 hover:border-teal-400 hover:shadow-md transition-all"
                                >
                                    <Video
                                        size={18}
                                        className="mx-auto mb-1 text-teal-500 group-hover:scale-105 transition-transform"
                                    />
                                    My classes
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* CENTER: RECENT DOCUMENTS */}
                <motion.div variants={itemVariants} className="lg:col-span-1">
                    <div className="mb-4 flex items-center justify-between px-2">
                        <h2 className="text-sm font-semibold tracking-wide text-slate-900">
                            Recent documents
                        </h2>
                        <button
                            onClick={() => handleTabChange?.('documents')}
                            className="text-[11px] font-semibold text-teal-600 hover:underline"
                        >
                            View all
                        </button>
                    </div>

                    <div className="space-y-3">
                        {safeRecentDocs.length > 0 ? (
                            safeRecentDocs.slice(0, 4).map((doc) => (
                                <button
                                    key={doc.id}
                                    onClick={() => navigate(`/study/${doc.id}`)}
                                    className="flex w-full items-center gap-4 rounded-2xl border border-slate-100 bg-white px-4 py-3 text-left shadow-xs transition-all hover:border-teal-400 hover:shadow-md"
                                >
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-[10px] font-bold text-teal-600">
                                        PDF
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-slate-900">
                                            {doc.title}
                                        </p>
                                        <p className="truncate text-[11px] text-slate-500">
                                            {doc.subject || 'General study'}
                                        </p>
                                    </div>
                                    <ChevronRight
                                        size={16}
                                        className="text-slate-300 group-hover:text-teal-500"
                                    />
                                </button>
                            ))
                        ) : (
                            <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-10 text-center">
                                <FileText size={28} className="mx-auto mb-3 text-slate-300" />
                                <p className="text-sm font-semibold text-slate-400">
                                    No documents yet
                                </p>
                                <button
                                    onClick={() => navigate('/upload')}
                                    className="mt-3 text-[11px] font-semibold text-teal-600 hover:underline"
                                >
                                    Upload your first PDF →
                                </button>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* RIGHT: LIVE CLASSES */}
                <motion.div variants={itemVariants} className="lg:col-span-1">
                    <div className="mb-4 flex items-center justify-between px-2">
                        <h2 className="text-sm font-semibold tracking-wide text-slate-900">
                            Live right now
                        </h2>
                        <button
                            onClick={() => handleTabChange?.('classes')}
                            className="text-[11px] font-semibold text-teal-600 hover:underline"
                        >
                            All classes
                        </button>
                    </div>

                    <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
                        {safeActiveRooms.length > 0 ? (
                            safeActiveRooms.slice(0, 4).map((room) => (
                                <button
                                    key={room.id}
                                    onClick={() =>
                                        handleJoinRoom
                                            ? handleJoinRoom(room.id)
                                            : navigate(`/classroom/${room.id}`)
                                    }
                                    className="flex w-full items-center gap-4 border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50 last:border-b-0"
                                >
                                    <div className="relative">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-slate-100">
                                            {(room.code || 'CL').slice(0, 2).toUpperCase()}
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-white">
                                            <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                                        </div>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-slate-900">
                                            {room.name}
                                        </p>
                                        <p className="text-[11px] font-semibold text-emerald-600">
                                            Live now
                                        </p>
                                    </div>
                                    <ChevronRight size={16} className="text-slate-300" />
                                </button>
                            ))
                        ) : (
                            <div className="px-6 py-8 text-center">
                                <Video size={28} className="mx-auto mb-3 text-slate-300" />
                                <p className="text-sm font-semibold text-slate-400">
                                    No live classes at the moment
                                </p>
                                <p className="mt-1 text-[11px] text-slate-500">
                                    Join or create a class from the Classes tab.
                                </p>
                            </div>
                        )}
                    </div>
                </motion.div>
            </section>
        </motion.div>
    );
};

/* STEP CARD – BIGGER with smooth pop-up hover animation */
const StepCard = ({ number, title, desc, icon: Icon, onClick, isActive, accent }) => {
    const accentGradients = {
        teal: 'from-teal-400 to-teal-600',
        slate: 'from-slate-500 to-slate-300',
        purple: 'from-violet-500 to-fuchsia-400',
        silver: 'from-slate-300 to-slate-100'
    };

    const gradient = accentGradients[accent] || accentGradients.teal;

    return (
        <motion.button
            onClick={onClick}
            whileHover={{ scale: 1.05, y: -8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="group relative w-full rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-950 to-slate-900 p-[1px] text-left min-h-[180px]"
        >
            <div className="h-full rounded-2xl bg-gradient-to-br from-slate-900/90 to-black/90 px-6 py-6 flex flex-col justify-between">
                <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-40 group-hover:opacity-70 transition-opacity"
                    style={{ boxShadow: '0 0 18px rgba(45, 212, 191, 0.25)' }} />
                <div className="relative z-10 flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r ${gradient} text-xs font-bold text-slate-900`}>
                            {number}
                        </div>
                        <Icon size={20} className="text-slate-50" />
                    </div>
                    <div>
                        <p className="text-base font-semibold text-white">{title}</p>
                        <p className="mt-2 text-xs leading-relaxed text-slate-300">
                            {desc}
                        </p>
                    </div>
                </div>
                <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-teal-300 opacity-0 group-hover:opacity-100 transition-opacity relative z-10">
                    {isActive ? 'Start here' : 'Open'}
                    <ArrowRight size={12} />
                </div>
            </div>
        </motion.button>
    );
};

const StatCard = ({ title, value, icon: Icon, onClick }) => (
    <motion.button
        whileHover={onClick ? { y: -2 } : {}}
        onClick={onClick}
        className="w-full rounded-3xl border border-slate-200 bg-white px-5 py-5 text-left shadow-sm hover:shadow-md transition-shadow"
    >
        <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-slate-100">
            <Icon size={18} />
        </div>
        <div className="text-3xl font-black text-slate-900">{value}</div>
        <div className="mt-1 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
            {title}
        </div>
    </motion.button>
);

export default OverviewSection;
