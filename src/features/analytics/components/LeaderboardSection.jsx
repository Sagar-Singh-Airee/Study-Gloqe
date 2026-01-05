// src/components/features/LeaderboardSection.jsx - MINIMALIST PRO VERSION
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Trophy,
    Crown,
    Loader2,
    Users,
    Shield,
    Zap,
    Award
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

                    const studentsOnly = allUsers.filter(u => {
                        const role = u.role?.toLowerCase() || 'student';
                        return role === 'student' || role === 'learner';
                    });

                    let filteredUsers = studentsOnly;

                    if (scope === 'class' && userData?.classId) {
                        filteredUsers = studentsOnly.filter(u => u.classId === userData.classId);
                    }

                    setLeaderboardData(filteredUsers);

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
    }, [currentUser, userData?.classId, scope]);

    const getInitials = (name) => {
        if (!name) return '??';
        return name
            .split(' ')
            .slice(0, 2)
            .map(n => n[0])
            .join('')
            .toUpperCase();
    };

    const getRankColor = (rank) => {
        if (rank === 1) return 'text-amber-600';
        if (rank === 2) return 'text-slate-500';
        if (rank === 3) return 'text-orange-600';
        return 'text-gray-900';
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-32">
                <Loader2 size={32} className="animate-spin text-gray-400" strokeWidth={2} />
                <p className="text-gray-500 font-medium mt-4 text-sm">Loading rankings</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center max-w-md mx-auto p-8 bg-white rounded-2xl border border-red-200">
                    <Shield size={40} className="mx-auto text-red-500 mb-3" strokeWidth={2} />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to Load</h3>
                    <p className="text-sm text-gray-600 mb-4">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 font-['Inter',sans-serif]">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12"
            >
                <div>
                    <h1 className="text-4xl font-semibold text-gray-900 tracking-tight mb-2">
                        Leaderboard
                    </h1>
                    <p className="text-gray-500 text-sm">
                        Ranked by total experience points
                    </p>
                </div>

                {/* Scope Toggle - Minimalist */}
                <div className="inline-flex bg-gray-100 rounded-lg p-1">
                    <button
                        onClick={() => setScope('global')}
                        className={`px-5 py-2 text-sm font-medium rounded-md transition-all ${scope === 'global'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        Global
                    </button>
                    <button
                        onClick={() => setScope('class')}
                        className={`px-5 py-2 text-sm font-medium rounded-md transition-all ${scope === 'class'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        Class
                    </button>
                </div>
            </motion.div>

            {/* Current User Stats - Minimalist Card */}
            {userRank && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                    className="bg-white border border-gray-200 rounded-2xl p-8 mb-12 hover:border-gray-300 transition-colors"
                >
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 w-full sm:w-auto">
                            <div className="flex flex-col items-center">
                                <span className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">
                                    Rank
                                </span>
                                <span className="text-4xl font-semibold text-gray-900">
                                    {userRank.rank}
                                </span>
                            </div>
                            <div className="hidden sm:block h-12 w-px bg-gray-200" />
                            <div className="w-full sm:w-auto text-center sm:text-left">
                                <h2 className="text-lg font-semibold text-gray-900 mb-1">
                                    Your Position
                                </h2>
                                <p className="text-sm text-gray-500">
                                    {scope === 'global' ? 'Global rankings' : 'Class rankings'}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 w-full sm:w-auto">
                            <div className="text-center">
                                <div className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">
                                    Level
                                </div>
                                <div className="text-2xl font-semibold text-gray-900">
                                    {userRank.level}
                                </div>
                            </div>
                            <div className="hidden sm:block h-12 w-px bg-gray-200" />
                            <div className="text-center">
                                <div className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">
                                    Total XP
                                </div>
                                <div className="text-2xl font-semibold text-gray-900">
                                    {userRank.xp.toLocaleString()}
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Top 3 Podium - Minimalist */}
            {leaderboardData.length >= 3 && (
                <div className="mb-12">
                    <div className="flex items-end justify-center gap-4 max-w-3xl mx-auto">
                        {/* 2nd Place */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: 0.2 }}
                            className="w-1/3 flex flex-col items-center"
                        >
                            <div className="mb-4">
                                <div className="w-16 h-16 rounded-full bg-gray-100 border-2 border-gray-300 flex items-center justify-center overflow-hidden">
                                    {leaderboardData[1]?.photoURL ? (
                                        <img
                                            src={leaderboardData[1].photoURL}
                                            alt={leaderboardData[1].displayName}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <span className="text-lg font-semibold text-gray-600">
                                            {getInitials(leaderboardData[1]?.displayName || leaderboardData[1]?.name)}
                                        </span>
                                    )}
                                </div>
                                <div className="text-center mt-2">
                                    <div className="text-xs font-medium text-gray-500">#2</div>
                                </div>
                            </div>
                            <div className="w-full h-40 bg-gray-50 border border-gray-200 rounded-t-xl flex flex-col items-center justify-start pt-6">
                                <h3 className="font-medium text-gray-900 text-sm truncate max-w-[90%] mb-1">
                                    {leaderboardData[1]?.displayName || 'Student'}
                                </h3>
                                <p className="text-sm font-semibold text-gray-600">
                                    {leaderboardData[1]?.xp.toLocaleString()}
                                </p>
                            </div>
                        </motion.div>

                        {/* 1st Place */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: 0.1 }}
                            className="w-1/3 flex flex-col items-center"
                        >
                            <div className="mb-4">
                                <Crown size={20} className="text-amber-600 mx-auto mb-2" strokeWidth={2} />
                                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-amber-50 border-2 border-amber-600 flex items-center justify-center overflow-hidden">
                                    {leaderboardData[0]?.photoURL ? (
                                        <img
                                            src={leaderboardData[0].photoURL}
                                            alt={leaderboardData[0].displayName}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <span className="text-xl font-semibold text-amber-900">
                                            {getInitials(leaderboardData[0]?.displayName || leaderboardData[0]?.name)}
                                        </span>
                                    )}
                                </div>
                                <div className="text-center mt-2">
                                    <div className="text-xs font-medium text-amber-600">#1</div>
                                </div>
                            </div>
                            <div className="w-full h-56 bg-amber-50 border border-amber-200 rounded-t-xl flex flex-col items-center justify-start pt-6">
                                <h3 className="font-medium text-gray-900 text-base truncate max-w-[90%] mb-1">
                                    {leaderboardData[0]?.displayName || 'Champion'}
                                </h3>
                                <p className="text-base font-semibold text-amber-900">
                                    {leaderboardData[0]?.xp.toLocaleString()}
                                </p>
                            </div>
                        </motion.div>

                        {/* 3rd Place */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: 0.3 }}
                            className="w-1/3 flex flex-col items-center"
                        >
                            <div className="mb-4">
                                <div className="w-16 h-16 rounded-full bg-orange-50 border-2 border-orange-300 flex items-center justify-center overflow-hidden">
                                    {leaderboardData[2]?.photoURL ? (
                                        <img
                                            src={leaderboardData[2].photoURL}
                                            alt={leaderboardData[2].displayName}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <span className="text-lg font-semibold text-orange-700">
                                            {getInitials(leaderboardData[2]?.displayName || leaderboardData[2]?.name)}
                                        </span>
                                    )}
                                </div>
                                <div className="text-center mt-2">
                                    <div className="text-xs font-medium text-gray-500">#3</div>
                                </div>
                            </div>
                            <div className="w-full h-32 bg-orange-50 border border-orange-200 rounded-t-xl flex flex-col items-center justify-start pt-6">
                                <h3 className="font-medium text-gray-900 text-sm truncate max-w-[90%] mb-1">
                                    {leaderboardData[2]?.displayName || 'Student'}
                                </h3>
                                <p className="text-sm font-semibold text-orange-700">
                                    {leaderboardData[2]?.xp.toLocaleString()}
                                </p>
                            </div>
                        </motion.div>
                    </div>
                </div>
            )}

            {/* List View - Clean Table */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.4 }}
                className="bg-white border border-gray-200 rounded-2xl overflow-hidden"
            >
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <h3 className="font-medium text-gray-900 text-sm">All Rankings</h3>
                </div>

                <div className="divide-y divide-gray-100">
                    <AnimatePresence>
                        {leaderboardData.map((user, index) => {
                            const rank = index + 1;
                            const isCurrentUser = user.id === currentUser?.uid;
                            const isTopThree = rank <= 3;

                            return (
                                <motion.div
                                    key={user.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className={`flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors ${isCurrentUser ? 'bg-blue-50/50' : ''
                                        }`}
                                >
                                    {/* Rank */}
                                    <div className="w-12 text-center flex-shrink-0">
                                        <span className={`text-sm font-semibold ${getRankColor(rank)}`}>
                                            {rank}
                                        </span>
                                    </div>

                                    {/* Avatar */}
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 overflow-hidden ${isCurrentUser
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-700 border border-gray-200'
                                        }`}>
                                        {user.photoURL ? (
                                            <img
                                                src={user.photoURL}
                                                alt={user.displayName}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            getInitials(user.displayName || user.name)
                                        )}
                                    </div>

                                    {/* Name */}
                                    <div className="flex-1 min-w-0">
                                        <div className={`text-sm font-medium truncate ${isCurrentUser ? 'text-blue-900' : 'text-gray-900'
                                            }`}>
                                            {user.displayName || user.name || 'Anonymous'}
                                            {isCurrentUser && (
                                                <span className="ml-2 text-xs text-blue-600 font-normal">
                                                    (You)
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                            <span>Level {user.level || 1}</span>
                                            {user.equippedTitle && (
                                                <>
                                                    <span className="text-gray-300">•</span>
                                                    <span className="text-blue-600 font-medium">{user.equippedTitle}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* XP */}
                                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                                        <span>{(user.xp || 0).toLocaleString()}</span>
                                        <span className="text-xs text-gray-400">XP</span>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>

                {leaderboardData.length === 0 && !loading && (
                    <div className="text-center py-16">
                        <Users size={32} className="mx-auto text-gray-300 mb-3" strokeWidth={2} />
                        <p className="text-sm text-gray-500">No students found</p>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default LeaderboardSection;
