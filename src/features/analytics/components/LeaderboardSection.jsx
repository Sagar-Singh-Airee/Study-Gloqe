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
    AlertCircle
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
    const { userData, currentUser } = useAuth();
    const [scope, setScope] = useState('global');
    const [leaderboardData, setLeaderboardData] = useState([]);
    const [userRank, setUserRank] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [debugInfo, setDebugInfo] = useState({ 
        totalUsers: 0, 
        studentsOnly: 0, 
        filteredUsers: 0,
        teachersExcluded: 0 
    });

    // Real-time leaderboard listener - STUDENTS ONLY
    useEffect(() => {
        console.log('🔄 Leaderboard Effect Triggered');
        console.log('👤 Current User:', currentUser?.uid || 'Not logged in');
        console.log('📊 Scope:', scope);
        console.log('🎯 User Data:', {
            xp: userData?.xp,
            level: userData?.level,
            role: userData?.role,
            classId: userData?.classId,
            displayName: userData?.displayName
        });

        if (!currentUser) {
            console.warn('⚠️ No user logged in, but fetching leaderboard for display');
        }

        // Reset state when scope changes
        setLoading(true);
        setError(null);

        try {
            console.log('🔍 Setting up Firestore query...');
            
            const usersRef = collection(db, 'users');
            const q = query(
                usersRef,
                orderBy('xp', 'desc'),
                limit(100)
            );

            console.log('📡 Subscribing to real-time updates...');

            const unsubscribe = onSnapshot(
                q, 
                (snapshot) => {
                    console.log('📦 Snapshot received!');
                    console.log('📊 Total documents:', snapshot.docs.length);
                    
                    if (snapshot.empty) {
                        console.warn('⚠️ No users found in Firestore!');
                        console.warn('💡 Tip: Check if users collection exists and has documents with xp field');
                    }

                    const allUsers = snapshot.docs.map(doc => {
                        const data = doc.data();
                        console.log('👤 User loaded:', {
                            id: doc.id,
                            name: data.displayName || data.name || 'Anonymous',
                            role: data.role || 'student (default)',
                            xp: data.xp || 0,
                            level: data.level || 1,
                            classId: data.classId || 'none'
                        });
                        return {
                            id: doc.id,
                            ...data
                        };
                    });

                    console.log('✅ Total users fetched:', allUsers.length);

                    // ✅ FILTER OUT TEACHERS - Only show students
                    const studentsOnly = allUsers.filter(user => {
                        const role = user.role?.toLowerCase() || 'student';
                        const isStudent = role === 'student' || role === 'learner';
                        
                        if (!isStudent) {
                            console.log('🚫 Excluded teacher:', user.displayName || user.name);
                        }
                        
                        return isStudent;
                    });

                    console.log('🎓 Students only:', studentsOnly.length);
                    console.log('👨‍🏫 Teachers excluded:', allUsers.length - studentsOnly.length);

                    // Filter client-side for specific scopes
                    let filteredUsers = studentsOnly;
                    if (scope === 'class' && userData?.classId) {
                        console.log('🎯 Filtering by classId:', userData.classId);
                        filteredUsers = studentsOnly.filter(u => u.classId === userData.classId);
                        console.log('📋 Class members found:', filteredUsers.length);
                        
                        if (filteredUsers.length === 0) {
                            console.warn('⚠️ No students in your class. ClassId might not be set correctly.');
                        }
                    } else if (scope === 'class' && !userData?.classId) {
                        console.warn('⚠️ Class scope selected but user has no classId');
                    }

                    console.log('📊 Final leaderboard count:', filteredUsers.length);
                    setLeaderboardData(filteredUsers);
                    setDebugInfo({ 
                        totalUsers: allUsers.length,
                        studentsOnly: studentsOnly.length,
                        filteredUsers: filteredUsers.length,
                        teachersExcluded: allUsers.length - studentsOnly.length
                    });

                    // Determine current user's standing
                    if (currentUser) {
                        const currentUserIndex = filteredUsers.findIndex(u => u.id === currentUser.uid);
                        
                        if (currentUserIndex !== -1) {
                            const currentStats = filteredUsers[currentUserIndex];
                            console.log('🏆 Current user found in leaderboard!');
                            console.log('📍 Rank:', currentUserIndex + 1);
                            console.log('⚡ XP:', currentStats.xp || 0);
                            
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
                                console.log('👨‍🏫 Current user is a teacher - not shown in student leaderboard');
                                setUserRank(null); // Don't show rank for teachers
                            } else {
                                console.warn('⚠️ Current user not in filtered results');
                                console.log('💡 User might be outside top 100 or filtered out by scope');
                                
                                setUserRank({
                                    rank: '>100',
                                    xp: userData?.xp || 0,
                                    level: userData?.level || 1,
                                    inTop100: false
                                });
                            }
                        }
                    } else {
                        console.log('👻 No current user, skipping rank calculation');
                    }

                    console.log('✅ Leaderboard update complete');
                    setLoading(false);
                }, 
                (err) => {
                    console.error('❌ Firestore Error:', err);
                    console.error('🔍 Error Code:', err.code);
                    console.error('📝 Error Message:', err.message);
                    
                    let errorMessage = 'Unable to load live rankings.';
                    
                    if (err.code === 'failed-precondition') {
                        errorMessage = 'Missing Firestore index. Check console for index creation link.';
                        console.error('🔗 Index creation link should appear above');
                    } else if (err.code === 'permission-denied') {
                        errorMessage = 'Permission denied. Check Firestore security rules.';
                        console.error('🔒 Firestore Rules Issue: Ensure users collection is readable');
                    } else if (err.code === 'unavailable') {
                        errorMessage = 'Connection lost. Check your internet connection.';
                        console.error('🌐 Network Issue');
                    }
                    
                    setError(errorMessage);
                    setLoading(false);
                }
            );

            console.log('✅ Listener setup complete');
            return () => {
                console.log('🔌 Unsubscribing from leaderboard updates');
                unsubscribe();
            };
        } catch (err) {
            console.error('❌ Setup Error:', err);
            console.error('📝 Stack:', err.stack);
            setError(err.message);
            setLoading(false);
        }
    }, [currentUser, userData, scope]);

    // UI Helpers
    const getRankGradient = (rank) => {
        if (rank === 1) return 'from-yellow-600 via-yellow-500 to-yellow-400';
        if (rank === 2) return 'from-gray-400 via-gray-300 to-gray-200';
        if (rank === 3) return 'from-orange-700 via-orange-600 to-orange-500';
        return 'from-black to-gray-800';
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
            <div className="flex items-center justify-center py-20">
                <div className="text-center">
                    <Loader2 size={48} className="animate-spin text-black mx-auto mb-4" />
                    <p className="text-gray-500 font-medium">Updating rankings...</p>
                    <p className="text-gray-400 text-sm mt-2">Fetching top students</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center max-w-md mx-auto p-6 bg-red-50 rounded-2xl border-2 border-red-200">
                    <Shield size={48} className="mx-auto text-red-400 mb-4" />
                    <h3 className="text-xl font-bold text-red-900 mb-2">Connection Issue</h3>
                    <p className="text-red-600 mb-4">{error}</p>
                    <div className="text-xs text-red-500 mb-4 font-mono bg-red-100 p-2 rounded">
                        Check browser console (F12) for detailed error logs
                    </div>
                    <button
                        onClick={() => {
                            console.log('🔄 Manual reload triggered');
                            window.location.reload();
                        }}
                        className="px-6 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Debug Info Banner (Development Only) */}
            {process.env.NODE_ENV === 'development' && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs font-mono"
                >
                    <div className="flex items-center gap-2 mb-2">
                        <AlertCircle size={14} className="text-blue-600" />
                        <span className="font-bold text-blue-900">Debug Info (Dev Mode Only)</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-blue-800">
                        <div>Total Fetched: <span className="font-bold">{debugInfo.totalUsers}</span></div>
                        <div>Students: <span className="font-bold">{debugInfo.studentsOnly}</span></div>
                        <div>Teachers Excluded: <span className="font-bold text-red-600">{debugInfo.teachersExcluded}</span></div>
                        <div>Filtered: <span className="font-bold">{debugInfo.filteredUsers}</span></div>
                        <div>Scope: <span className="font-bold">{scope}</span></div>
                        <div>User ID: <span className="font-bold">{currentUser?.uid?.slice(0, 8) || 'None'}...</span></div>
                    </div>
                </motion.div>
            )}

            {/* Header Section */}
            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8"
            >
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 bg-black rounded-2xl shadow-lg">
                            <Trophy className="text-white" size={24} />
                        </div>
                        <h1 className="text-4xl font-black text-black tracking-tight">
                            Student Leaderboard
                        </h1>
                    </div>
                    <p className="text-gray-600 font-medium">
                        Top students ranked by Total XP {leaderboardData.length > 0 && `(${leaderboardData.length} students)`}
                    </p>
                </div>

                {/* Scope Toggle */}
                <div className="flex bg-white border-2 border-gray-100 p-1 rounded-xl">
                    <button
                        onClick={() => {
                            console.log('🌍 Switching to Global scope');
                            setScope('global');
                        }}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold transition-all ${
                            scope === 'global'
                                ? 'bg-black text-white shadow-md'
                                : 'text-gray-500 hover:bg-gray-50 hover:text-black'
                        }`}
                    >
                        <Users size={18} />
                        Global
                    </button>
                    <button
                        onClick={() => {
                            console.log('🎯 Switching to Class scope');
                            setScope('class');
                        }}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold transition-all ${
                            scope === 'class'
                                ? 'bg-black text-white shadow-md'
                                : 'text-gray-500 hover:bg-gray-50 hover:text-black'
                        }`}
                    >
                        <Target size={18} />
                        Class
                    </button>
                </div>
            </motion.div>

            {/* Current User Stats Card - Only for Students */}
            {userRank && (
                <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-gradient-to-r from-black to-gray-900 rounded-2xl p-6 text-white mb-10 shadow-2xl relative overflow-hidden"
                >
                    {/* Abstract Background Shapes */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-10 -mb-10 blur-2xl" />
                    
                    <div className="relative flex items-center justify-between z-10">
                        <div className="flex items-center gap-5">
                            <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center border border-white/10">
                                <span className="text-xs text-white/60 font-bold uppercase tracking-wider">Rank</span>
                                <span className="text-3xl font-black text-white">#{userRank.rank}</span>
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    Your Performance
                                    {userRank.inTop100 && <Sparkles size={18} className="text-yellow-400" />}
                                </h2>
                                <p className="text-white/60">
                                    {scope === 'global' ? 'Global Ranking' : 'Class Ranking'}
                                </p>
                            </div>
                        </div>

                        <div className="text-right">
                            <div className="text-sm text-white/60 mb-1">Total XP Earned</div>
                            <div className="text-4xl font-black text-white tracking-tight">
                                {(userRank.xp || 0).toLocaleString()}
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Teacher Notice - If current user is a teacher */}
            {userData?.role?.toLowerCase() === 'teacher' && !userRank && (
                <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-6 text-white mb-10 shadow-xl"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                            <Shield size={24} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold mb-1">Teacher Account</h3>
                            <p className="text-blue-100 text-sm">
                                You're viewing the student leaderboard. Teacher accounts are not ranked.
                            </p>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Top 3 Podium */}
            {leaderboardData.length >= 3 && (
                <div className="grid grid-cols-3 gap-4 md:gap-8 mb-12 items-end max-w-4xl mx-auto">
                    {/* 2nd Place */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="order-1"
                    >
                        <div className="bg-white border-2 border-gray-200 rounded-t-2xl rounded-b-lg p-4 pt-8 text-center relative hover:-translate-y-2 transition-transform duration-300 shadow-lg">
                            <div className="absolute -top-10 left-1/2 -translate-x-1/2">
                                <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${getRankGradient(2)} flex items-center justify-center text-white font-black shadow-xl border-4 border-white`}>
                                    2
                                </div>
                            </div>
                            <div className="mt-6">
                                <div className="font-bold text-black truncate">{leaderboardData[1]?.displayName || leaderboardData[1]?.name || 'Student'}</div>
                                <div className="text-sm text-gray-500 font-medium">{(leaderboardData[1]?.xp || 0).toLocaleString()} XP</div>
                            </div>
                        </div>
                    </motion.div>

                    {/* 1st Place */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="order-2 -mt-8"
                    >
                        <div className="bg-gradient-to-b from-black to-gray-900 rounded-t-2xl rounded-b-lg p-6 pt-10 text-center relative hover:-translate-y-2 transition-transform duration-300 shadow-2xl border-4 border-yellow-500/20">
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2">
                                <Crown size={48} className="text-yellow-400 drop-shadow-lg mb-2 absolute -top-10 left-1/2 -translate-x-1/2" />
                                <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${getRankGradient(1)} flex items-center justify-center text-white text-2xl font-black shadow-xl border-4 border-black`}>
                                    1
                                </div>
                            </div>
                            <div className="mt-8">
                                <div className="font-bold text-white text-lg truncate">{leaderboardData[0]?.displayName || leaderboardData[0]?.name || 'Champion'}</div>
                                <div className="text-yellow-400 font-black text-xl">{(leaderboardData[0]?.xp || 0).toLocaleString()} XP</div>
                                <div className="text-xs text-gray-500 mt-2 uppercase tracking-widest font-bold">Top Student</div>
                            </div>
                        </div>
                    </motion.div>

                    {/* 3rd Place */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="order-3"
                    >
                        <div className="bg-white border-2 border-gray-200 rounded-t-2xl rounded-b-lg p-4 pt-8 text-center relative hover:-translate-y-2 transition-transform duration-300 shadow-lg">
                            <div className="absolute -top-10 left-1/2 -translate-x-1/2">
                                <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${getRankGradient(3)} flex items-center justify-center text-white font-black shadow-xl border-4 border-white`}>
                                    3
                                </div>
                            </div>
                            <div className="mt-6">
                                <div className="font-bold text-black truncate">{leaderboardData[2]?.displayName || leaderboardData[2]?.name || 'Student'}</div>
                                <div className="text-sm text-gray-500 font-medium">{(leaderboardData[2]?.xp || 0).toLocaleString()} XP</div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Full List */}
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-sm">
                <h3 className="text-xl font-black text-black mb-6 flex items-center gap-2">
                    <Award className="text-black" />
                    Full Rankings
                    <span className="text-sm font-normal text-gray-500">({leaderboardData.length} students)</span>
                </h3>
                
                <div className="space-y-2">
                    <AnimatePresence>
                        {leaderboardData.map((user, index) => {
                            const rank = index + 1;
                            const isCurrentUser = user.id === currentUser?.uid;

                            return (
                                <motion.div
                                    key={user.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
                                        isCurrentUser
                                            ? 'bg-black text-white shadow-lg scale-[1.02]'
                                            : 'hover:bg-gray-50 border border-transparent hover:border-gray-200'
                                    }`}
                                >
                                    {/* Rank Badge */}
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black flex-shrink-0 ${
                                        isCurrentUser 
                                            ? 'bg-white/20 text-white' 
                                            : 'bg-gray-100 text-black'
                                    }`}>
                                        {rank}
                                    </div>

                                    {/* Avatar */}
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                                        isCurrentUser
                                            ? 'bg-white text-black'
                                            : 'bg-gradient-to-br from-gray-800 to-black text-white'
                                    }`}>
                                        {getInitials(user.displayName || user.name)}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className={`font-bold truncate ${isCurrentUser ? 'text-white' : 'text-black'}`}>
                                            {user.displayName || user.name || 'Anonymous'}
                                            {isCurrentUser && <span className="ml-2 text-yellow-400">(You)</span>}
                                        </div>
                                        <div className={`text-xs ${isCurrentUser ? 'text-gray-400' : 'text-gray-500'}`}>
                                            Level {user.level || 1}
                                        </div>
                                    </div>

                                    {/* XP */}
                                    <div className={`font-black text-right ${isCurrentUser ? 'text-yellow-400' : 'text-black'}`}>
                                        {(user.xp || 0).toLocaleString()}
                                        <span className={`text-xs font-normal ml-1 ${isCurrentUser ? 'text-gray-400' : 'text-gray-500'}`}>XP</span>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>

                {leaderboardData.length === 0 && (
                    <div className="text-center py-12">
                        <Users size={48} className="mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-bold text-gray-700 mb-2">No Students Found</h3>
                        <p className="text-gray-500 text-sm mb-4">
                            {scope === 'class' 
                                ? 'No students in your class have XP yet.'
                                : 'No students found. Start earning XP to appear on the leaderboard!'}
                        </p>
                        <p className="text-xs text-gray-400 font-mono">
                            Open browser console (F12) for debug information
                        </p>
                    </div>
                )}
            </div>
        </>
    );
};

export default LeaderboardSection;
