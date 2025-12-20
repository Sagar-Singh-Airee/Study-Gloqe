// src/components/features/LeaderboardSection.jsx - STUDENTS ONLY (NO TEACHERS)
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Trophy,
    Medal,
    Crown,
    Award,
    Target,
    Loader2,
    Sparkles,
    Users,
    Shield,
    Flame,
    Zap
} from 'lucide-react';
import { useAuth } from '@auth/contexts/AuthContext';
import {
    collection,
    query,
    orderBy,
    limit,
    onSnapshot
} from 'firebase/firestore';
import { db } from '@shared/config/firebase';

const LeaderboardSection = () => {
    // ✅ FIX: useAuth returns 'user', but we use 'currentUser' in this component
    const { userData, user: currentUser } = useAuth();
    const [scope, setScope] = useState('global');
    const [leaderboardData, setLeaderboardData] = useState([]);
    const [userRank, setUserRank] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Real-time leaderboard listener - STUDENTS ONLY
    useEffect(() => {
        if (!currentUser) return;

        setLoading(true);
        setError(null);

        try {
            const usersRef = collection(db, 'users');
            const q = query(
                usersRef,
                orderBy('xp', 'desc'),
                limit(100)
            );

            const unsubscribe = onSnapshot(
                q,
                (snapshot) => {
                    const allUsers = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));

                    // ✅ FILTER OUT TEACHERS - Only show students
                    const studentsOnly = allUsers.filter(u => {
                        const role = u.role?.toLowerCase() || 'student';
                        return role === 'student' || role === 'learner';
                    });

                    // Filter client-side for specific scopes
                    let filteredUsers = studentsOnly;

                    if (scope === 'class' && userData?.classId) {
                        filteredUsers = studentsOnly.filter(u => u.classId === userData.classId);
                    }

                    setLeaderboardData(filteredUsers);

                    // Determine current user's standing
                    if (currentUser) {
                        const currentUserIndex = filteredUsers.findIndex(u => u.id === currentUser.uid);

                        if (currentUserIndex !== -1) {
                            const currentStats = filteredUsers[currentUserIndex];
                            setUserRank({
                                rank: currentUserIndex + 1,
                                xp: currentStats.xp || 0,
                                level: currentStats.level || 1,
                                inTop100: true
                            });
                        } else {
                            // Check if current user is a teacher
                            const currentUserData = allUsers.find(u => u.id === currentUser.uid);
                            const isTeacher = currentUserData?.role?.toLowerCase() === 'teacher';

                            if (isTeacher) {
                                setUserRank(null);
                            } else {
                                setUserRank({
                                    rank: '>100',
                                    xp: userData?.xp || 0,
                                    level: userData?.level || 1,
                                    inTop100: false
                                });
                            }
                        }
                    }

                    setLoading(false);
                },
                (err) => {
                    console.error('❌ Leaderboard Error:', err);
                    if (err.code === 'failed-precondition') {
                        console.error('🔗 MISSING INDEX: Check the link above in console to create it!');
                        setError('Database index building... please wait a few minutes.');
                    } else {
                        setError('Unable to load live rankings.');
                    }
                    setLoading(false);
                }
            );

            return () => unsubscribe();
        } catch (err) {
            console.error('❌ Setup Error:', err);
            setError(err.message);
            setLoading(false);
        }
    }, [currentUser, userData?.classId, scope]); // Removed userData to prevents loop, only need classId

    // UI Helpers
    const getRankGradient = (rank) => {
        if (rank === 1) return 'from-yellow-400 to-amber-600';
        if (rank === 2) return 'from-gray-300 to-gray-500';
        if (rank === 3) return 'from-orange-400 to-red-500';
        return 'from-teal-500 to-cyan-600';
    };

    const getRankColor = (rank) => {
        if (rank === 1) return 'text-yellow-500';
        if (rank === 2) return 'text-gray-500';
        if (rank === 3) return 'text-orange-500';
        return 'text-teal-600';
    };

    const getInitials = (name) => {
        if (!name) return '??';
        return name
            .split(' ')
            .slice(0, 2)
            .map(n => n[0])
            .join('')
            .toUpperCase();
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-24">
                <div className="relative">
                    <div className="absolute inset-0 bg-teal-500 blur-xl opacity-20 animate-pulse" />
                    <Loader2 size={48} className="animate-spin text-teal-600 relative z-10" />
                </div>
                <p className="text-gray-500 font-medium mt-4">Syncing leaderboard...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center max-w-md mx-auto p-6 bg-red-50 rounded-2xl border border-red-100 shadow-sm">
                    <Shield size={48} className="mx-auto text-red-400 mb-4" />
                    <h3 className="text-xl font-bold text-red-900 mb-2">Unavailable</h3>
                    <p className="text-red-600 mb-4">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-500/30"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header Section */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12"
            >
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2 flex items-center gap-3">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-teal-600 to-cyan-600">
                            Leaderboard
                        </span>
                        <Trophy className="text-yellow-500" size={32} fill="currentColor" />
                    </h1>
                    <p className="text-gray-500 font-medium text-lg">
                        Top students ranked by Total XP
                    </p>
                </div>

                {/* Scope Toggle */}
                <div className="bg-gray-100 p-1.5 rounded-xl inline-flex relative">
                    {/* Sliding Background */}
                    <motion.div
                        className="absolute top-1.5 bottom-1.5 rounded-lg bg-white shadow-sm"
                        initial={false}
                        animate={{
                            x: scope === 'global' ? 0 : '100%',
                            width: '50%'
                        }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />

                    <button
                        onClick={() => setScope('global')}
                        className={`relative z - 10 flex items - center gap - 2 px - 6 py - 2.5 rounded - lg font - bold transition - colors w - 32 justify - center ${scope === 'global' ? 'text-teal-700' : 'text-gray-500 hover:text-gray-700'
                            } `}
                    >
                        <Users size={18} />
                        Global
                    </button>
                    <button
                        onClick={() => setScope('class')}
                        className={`relative z - 10 flex items - center gap - 2 px - 6 py - 2.5 rounded - lg font - bold transition - colors w - 32 justify - center ${scope === 'class' ? 'text-teal-700' : 'text-gray-500 hover:text-gray-700'
                            } `}
                    >
                        <Target size={18} />
                        Class
                    </button>
                </div>
            </motion.div>

            {/* Current User Stats Card */}
            {userRank && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative overflow-hidden rounded-3xl p-8 mb-16 shadow-2xl"
                >
                    {/* Animated Background */}
                    <div className="absolute inset-0 bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600" />
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
                    <motion.div
                        animate={{
                            scale: [1, 1.2, 1],
                            opacity: [0.3, 0.5, 0.3]
                        }}
                        transition={{ duration: 8, repeat: Infinity }}
                        className="absolute -top-20 -right-20 w-80 h-80 bg-white/20 rounded-full blur-3xl"
                    />

                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 text-white">
                        <div className="flex items-center gap-6">
                            <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center border border-white/20 shadow-xl">
                                <span className="text-xs text-white/80 font-bold uppercase tracking-wider mb-1">Rank</span>
                                <span className="text-4xl font-black">{userRank.rank}</span>
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold flex items-center gap-2 mb-2">
                                    Your Standing
                                    {userRank.inTop100 && <Sparkles size={24} className="text-yellow-300" />}
                                </h2>
                                <p className="text-white/80 font-medium text-lg">
                                    {scope === 'global' ? 'Global Ranking' : 'Class Ranking'}
                                    Looking good! 🚀
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-8 bg-white/10 px-8 py-4 rounded-2xl border border-white/10 backdrop-blur-sm">
                            <div className="text-right border-r border-white/10 pr-8">
                                <div className="text-sm text-blue-100 font-medium mb-1">Current Level</div>
                                <div className="text-3xl font-black">{userRank.level}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm text-teal-100 font-medium mb-1">Total XP</div>
                                <div className="text-3xl font-black text-yellow-300 drop-shadow-sm">
                                    {userRank.xp.toLocaleString()}
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Top 3 Podium */}
            {leaderboardData.length >= 3 && (
                <div className="relative h-64 md:h-80 mb-20 max-w-3xl mx-auto flex items-end justify-center gap-4 md:gap-8 px-4">
                    {/* 2nd Place */}
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="w-1/3 flex flex-col items-center"
                    >
                        <div className="relative mb-4 z-10 text-center">
                            <div className={`w - 16 h - 16 md: w - 20 md: h - 20 rounded - full bg - gradient - to - br from - gray - 200 to - gray - 400 p - 1 shadow - lg ring - 4 ring - white`}>
                                <div className="w-full h-full rounded-full bg-gray-100 flex items-center justify-center text-lg md:text-xl font-bold text-gray-700">
                                    {getInitials(leaderboardData[1]?.displayName || leaderboardData[1]?.name)}
                                </div>
                            </div>
                            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-gray-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm border border-white">
                                #{2}
                            </div>
                        </div>
                        <div className="w-full bg-gradient-to-b from-gray-200 to-white/50 backdrop-blur-sm rounded-t-3xl border-t border-x border-white/50 shadow-xl h-40 md:h-48 flex flex-col items-center justify-start pt-8 pb-4">
                            <h3 className="font-bold text-gray-800 text-sm md:text-base truncate max-w-[90%] mb-1">
                                {leaderboardData[1]?.displayName || 'Student'}
                            </h3>
                            <p className="font-black text-gray-500 text-sm md:text-lg">
                                {leaderboardData[1]?.xp.toLocaleString()} XP
                            </p>
                        </div>
                    </motion.div>

                    {/* 1st Place */}
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-1/3 flex flex-col items-center z-10"
                    >
                        <div className="relative mb-4 z-20 text-center">
                            <Crown size={40} className="text-yellow-400 absolute -top-8 left-1/2 -translate-x-1/2 animate-bounce" fill="currentColor" />
                            <div className={`w - 20 h - 20 md: w - 24 md: h - 24 rounded - full bg - gradient - to - br from - yellow - 300 to - amber - 500 p - 1 shadow - xl ring - 4 ring - yellow - 400 / 30`}>
                                <div className="w-full h-full rounded-full bg-yellow-50 flex items-center justify-center text-xl md:text-2xl font-bold text-amber-700">
                                    {getInitials(leaderboardData[0]?.displayName || leaderboardData[0]?.name)}
                                </div>
                            </div>
                            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-yellow-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm border border-white">
                                #{1}
                            </div>
                        </div>
                        <div className="w-full bg-gradient-to-b from-yellow-100 to-white/50 backdrop-blur-sm rounded-t-3xl border-t border-x border-white/50 shadow-2xl h-48 md:h-64 flex flex-col items-center justify-start pt-10 pb-4 relative overflow-hidden">
                            <div className="absolute inset-0 bg-yellow-400/10 blur-xl" />
                            <h3 className="font-bold text-amber-900 text-base md:text-lg truncate max-w-[90%] mb-1 relative z-10">
                                {leaderboardData[0]?.displayName || 'Champion'}
                            </h3>
                            <p className="font-black text-amber-600 text-lg md:text-2xl relative z-10">
                                {leaderboardData[0]?.xp.toLocaleString()} XP
                            </p>
                        </div>
                    </motion.div>

                    {/* 3rd Place */}
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="w-1/3 flex flex-col items-center"
                    >
                        <div className="relative mb-4 z-10 text-center">
                            <div className={`w - 16 h - 16 md: w - 20 md: h - 20 rounded - full bg - gradient - to - br from - orange - 300 to - red - 400 p - 1 shadow - lg ring - 4 ring - white`}>
                                <div className="w-full h-full rounded-full bg-orange-50 flex items-center justify-center text-lg md:text-xl font-bold text-orange-700">
                                    {getInitials(leaderboardData[2]?.displayName || leaderboardData[2]?.name)}
                                </div>
                            </div>
                            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm border border-white">
                                #{3}
                            </div>
                        </div>
                        <div className="w-full bg-gradient-to-b from-orange-100 to-white/50 backdrop-blur-sm rounded-t-3xl border-t border-x border-white/50 shadow-xl h-36 md:h-40 flex flex-col items-center justify-start pt-8 pb-4">
                            <h3 className="font-bold text-gray-800 text-sm md:text-base truncate max-w-[90%] mb-1">
                                {leaderboardData[2]?.displayName || 'Student'}
                            </h3>
                            <p className="font-black text-orange-600 text-sm md:text-lg">
                                {leaderboardData[2]?.xp.toLocaleString()} XP
                            </p>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* List View */}
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                    <h3 className="font-bold text-gray-700">Rankings</h3>
                    <span className="text-sm font-semibold text-gray-400">XP</span>
                </div>

                <div className="divide-y divide-gray-100">
                    <AnimatePresence>
                        {leaderboardData.map((user, index) => {
                            const rank = index + 1;
                            const isCurrentUser = user.id === currentUser?.uid;

                            return (
                                <motion.div
                                    key={user.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: index * 0.03 }}
                                    className={`flex items - center gap - 4 p - 4 hover: bg - gray - 50 transition - colors ${isCurrentUser ? 'bg-teal-50/50 hover:bg-teal-50' : ''
                                        } `}
                                >
                                    {/* Rank */}
                                    <div className="w-12 text-center flex-shrink-0">
                                        {rank <= 3 ? (
                                            <div className={`font - black text - lg ${getRankColor(rank)} `}>
                                                #{rank}
                                            </div>
                                        ) : (
                                            <span className="text-gray-400 font-bold">#{rank}</span>
                                        )}
                                    </div>

                                    {/* Avatar */}
                                    <div className={`w - 10 h - 10 rounded - full flex items - center justify - center font - bold text - sm shadow - sm flex - shrink - 0 ${isCurrentUser
                                            ? 'bg-teal-500 text-white'
                                            : 'bg-white border border-gray-200 text-gray-700'
                                        } `}>
                                        {getInitials(user.displayName || user.name)}
                                    </div>

                                    {/* Name */}
                                    <div className="flex-1 min-w-0">
                                        <div className={`font - bold truncate ${isCurrentUser ? 'text-teal-700' : 'text-gray-900'} `}>
                                            {user.displayName || user.name || 'Anonymous'}
                                            {isCurrentUser && <span className="ml-2 text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">You</span>}
                                        </div>
                                    </div>

                                    {/* XP */}
                                    <div className="flex items-center gap-2 font-bold text-gray-900">
                                        <Zap size={14} className="text-yellow-500" fill="currentColor" />
                                        {(user.xp || 0).toLocaleString()}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>

                {leaderboardData.length === 0 && !loading && (
                    <div className="text-center py-12">
                        <p className="text-gray-400">No students found yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LeaderboardSection;
