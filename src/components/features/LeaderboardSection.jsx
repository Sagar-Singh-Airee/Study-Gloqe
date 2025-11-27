// src/components/features/LeaderboardSection.jsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Crown, TrendingUp, Users, Calendar, Award } from 'lucide-react';
import { useAuth } from '@contexts/AuthContext';

const LeaderboardSection = () => {
    const { userData, user } = useAuth();
    const [timeframe, setTimeframe] = useState('month');
    const [scope, setScope] = useState('class');
    const [leaderboardData, setLeaderboardData] = useState([]);
    const [userRank, setUserRank] = useState(null);

    useEffect(() => {
        loadLeaderboard();
    }, [timeframe, scope]);

    const loadLeaderboard = async () => {
        const mockData = [
            { id: '1', name: 'Alice Johnson', xp: 4500, level: 45, badges: 12, streak: 15, avatar: 'AJ' },
            { id: '2', name: 'Bob Smith', xp: 4200, level: 42, badges: 10, streak: 12, avatar: 'BS' },
            { id: '3', name: 'Charlie Brown', xp: 3800, level: 38, badges: 9, stretch: 10, avatar: 'CB' },
            { id: '4', name: 'Diana Prince', xp: 3500, level: 35, badges: 8, streak: 8, avatar: 'DP' },
            { id: '5', name: 'Eve Wilson', xp: 3200, level: 32, badges: 7, streak: 7, avatar: 'EW' },
            { id: '6', name: 'Frank Miller', xp: 3000, level: 30, badges: 6, streak: 6, avatar: 'FM' },
            { id: '7', name: 'Grace Lee', xp: 2800, level: 28, badges: 5, streak: 5, avatar: 'GL' },
            { id: '8', name: 'Henry Davis', xp: 2600, level: 26, badges: 5, streak: 4, avatar: 'HD' },
            { id: '9', name: 'Ivy Chen', xp: 2400, level: 24, badges: 4, streak: 3, avatar: 'IC' },
            { id: '10', name: 'Jack Ryan', xp: 2200, level: 22, badges: 4, streak: 3, avatar: 'JR' },
        ];

        setLeaderboardData(mockData);
        setUserRank({ rank: 8, xp: 2600, change: '+2' });
    };

    const getRankIcon = (rank) => {
        if (rank === 1) return <Crown className="text-yellow-400" size={24} />;
        if (rank === 2) return <Medal className="text-gray-400" size={24} />;
        if (rank === 3) return <Medal className="text-orange-400" size={24} />;
        return null;
    };

    const getRankColor = (rank) => {
        if (rank === 1) return 'from-yellow-500 to-orange-500';
        if (rank === 2) return 'from-gray-400 to-gray-600';
        if (rank === 3) return 'from-orange-500 to-red-500';
        return 'from-black to-gray-800';
    };

    return (
        <>
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-black text-black mb-2">Leaderboard</h1>
                <p className="text-gray-600">Compete with peers and climb to the top!</p>
            </div>

            {/* Filters */}
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 mb-6">
                <div className="flex flex-wrap gap-6">
                    {/* Timeframe */}
                    <div>
                        <label className="block text-sm font-bold text-black mb-2">Timeframe</label>
                        <div className="flex gap-2">
                            {['week', 'month', 'all-time'].map((tf) => (
                                <button
                                    key={tf}
                                    onClick={() => setTimeframe(tf)}
                                    className={`px-4 py-2 rounded-xl font-bold transition-all ${timeframe === tf
                                            ? 'bg-black text-white'
                                            : 'bg-white border border-gray-300 hover:border-black'
                                        }`}
                                >
                                    {tf.charAt(0).toUpperCase() + tf.slice(1).replace('-', ' ')}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Scope */}
                    <div>
                        <label className="block text-sm font-bold text-black mb-2">Scope</label>
                        <div className="flex gap-2">
                            {['class', 'school', 'global'].map((sc) => (
                                <button
                                    key={sc}
                                    onClick={() => setScope(sc)}
                                    className={`px-4 py-2 rounded-xl font-bold transition-all ${scope === sc
                                            ? 'bg-black text-white'
                                            : 'bg-white border border-gray-300 hover:border-black'
                                        }`}
                                >
                                    {sc.charAt(0).toUpperCase() + sc.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* User's Rank Card */}
            {userRank && (
                <div className="bg-gradient-to-br from-black to-gray-900 rounded-2xl p-6 text-white mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center">
                                <span className="text-2xl font-black">{userData?.level || 1}</span>
                            </div>
                            <div>
                                <div className="text-sm text-gray-400">Your Rank</div>
                                <div className="text-3xl font-black">#{userRank.rank}</div>
                            </div>
                        </div>

                        <div className="text-right">
                            <div className="text-sm text-gray-400">XP This Period</div>
                            <div className="text-2xl font-black">{userRank.xp}</div>
                            <div className="text-sm text-green-400 flex items-center gap-1 justify-end">
                                <TrendingUp size={14} />
                                {userRank.change}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Top 3 Podium */}
            <div className="grid grid-cols-3 gap-6 mb-6">
                {leaderboardData.slice(0, 3).map((user, index) => {
                    const actualRank = index + 1;
                    return (
                        <div
                            key={user.id}
                            className={`bg-white border-2 border-gray-200 rounded-2xl p-6 text-center hover:border-black transition-all ${actualRank === 1 ? 'order-2 scale-110' : actualRank === 2 ? 'order-1' : 'order-3'
                                }`}
                        >
                            <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${getRankColor(actualRank)} flex items-center justify-center mx-auto mb-3 text-white text-xl font-black`}>
                                {user.avatar}
                            </div>

                            <div className="mb-2 flex justify-center">
                                {getRankIcon(actualRank)}
                            </div>

                            <div className="font-bold text-black mb-1">{user.name}</div>
                            <div className="text-sm text-gray-500 mb-3">Level {user.level}</div>

                            <div className="space-y-1 text-sm">
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-500">XP:</span>
                                    <span className="font-semibold text-black">{user.xp.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-500">Badges:</span>
                                    <span className="font-semibold text-black">{user.badges}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-500">Streak:</span>
                                    <span className="font-semibold text-black">{user.streak} days</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Full Leaderboard */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <h2 className="text-2xl font-black text-black mb-6">Rankings</h2>

                <div className="space-y-2">
                    {leaderboardData.map((user, index) => {
                        const rank = index + 1;
                        const isCurrentUser = userData?.uid === user.id;

                        return (
                            <div
                                key={user.id}
                                className={`flex items-center gap-4 p-4 rounded-xl transition-all ${isCurrentUser
                                        ? 'bg-black/5 border-2 border-black'
                                        : 'hover:bg-gray-50'
                                    }`}
                            >
                                {/* Rank */}
                                <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${getRankColor(rank)} flex items-center justify-center flex-shrink-0 font-black text-white`}>
                                    {rank <= 3 ? getRankIcon(rank) : rank}
                                </div>

                                {/* Avatar */}
                                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center font-black text-white flex-shrink-0">
                                    {user.avatar}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-black flex items-center gap-2">
                                        {user.name}
                                        {isCurrentUser && (
                                            <span className="text-xs px-2 py-1 rounded-full bg-black/10 text-black">
                                                You
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        Level {user.level} • {user.xp.toLocaleString()} XP
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="hidden md:flex items-center gap-6 text-sm">
                                    <div className="text-center">
                                        <div className="text-gray-500">Badges</div>
                                        <div className="font-semibold text-black">{user.badges}</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-gray-500">Streak</div>
                                        <div className="font-semibold text-black">{user.streak}d</div>
                                    </div>
                                </div>

                                {/* Badge */}
                                {rank <= 10 && (
                                    <div className="flex items-center gap-1">
                                        <Trophy size={18} className="text-yellow-400" />
                                        <span className="text-xs text-gray-500">Top 10</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </>
    );
};

export default LeaderboardSection;
