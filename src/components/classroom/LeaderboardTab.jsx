// src/components/classroom/LeaderboardTab.jsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, TrendingUp, Award, Star, Target, Zap, Medal, Loader2 } from 'lucide-react';
import { getClassLeaderboard } from '@/services/gamificationService';
import toast from 'react-hot-toast';

const LeaderboardTab = ({ classId }) => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (classId) {
            loadLeaderboard();
        }
    }, [classId]);

    const loadLeaderboard = async () => {
        try {
            setLoading(true);
            const leaderboardData = await getClassLeaderboard(classId);
            setStudents(leaderboardData);
        } catch (error) {
            console.error('Error loading leaderboard:', error);
            toast.error('Failed to load leaderboard');
        } finally {
            setLoading(false);
        }
    };

    const getRankColor = (rank) => {
        switch (rank) {
            case 1: return 'from-yellow-400 to-yellow-500';
            case 2: return 'from-gray-300 to-gray-400';
            case 3: return 'from-orange-400 to-orange-500';
            default: return 'from-gray-600 to-gray-700';
        }
    };

    const getRankBadge = (rank) => {
        switch (rank) {
            case 1: return '🥇';
            case 2: return '🥈';
            case 3: return '🥉';
            default: return `#${rank}`;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 size={48} className="text-gray-400 animate-spin" />
            </div>
        );
    }

    if (students.length === 0) {
        return (
            <div className="text-center py-20 bg-white border border-gray-200 rounded-2xl">
                <Trophy size={64} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-xl font-bold text-black mb-2">No Students Yet</h3>
                <p className="text-gray-600">Students will appear here once they join the class</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-2xl mb-4">
                    <Trophy size={32} className="text-white" />
                </div>
                <h2 className="text-3xl font-black text-black mb-2">Class Leaderboard</h2>
                <p className="text-gray-600">Top performers this month</p>
            </div>

            {/* Top 3 Podium */}
            {students.length >= 3 && (
                <div className="grid grid-cols-3 gap-4 mb-8">
                    {/* 2nd Place */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="pt-12"
                    >
                        <div className="bg-gradient-to-br from-gray-300 to-gray-400 rounded-2xl p-6 text-center">
                            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-3 text-4xl">
                                🥈
                            </div>
                            <div className="font-black text-white text-lg mb-1 truncate" title={students[1]?.name}>
                                {students[1]?.name}
                            </div>
                            <div className="text-white/80 text-sm mb-3">{students[1]?.points} pts</div>
                            <div className="bg-white/20 backdrop-blur-xl rounded-lg py-2">
                                <div className="text-xs text-white/80">Level {students[1]?.level}</div>
                            </div>
                        </div>
                    </motion.div>

                    {/* 1st Place */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <div className="bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-2xl p-6 text-center relative">
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                                <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center border-4 border-white shadow-xl">
                                    <Trophy size={24} className="text-white" />
                                </div>
                            </div>
                            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-3 mt-4 text-5xl">
                                🥇
                            </div>
                            <div className="font-black text-white text-xl mb-1 truncate" title={students[0]?.name}>
                                {students[0]?.name}
                            </div>
                            <div className="text-white/90 text-base mb-3 font-bold">{students[0]?.points} pts</div>
                            <div className="bg-white/20 backdrop-blur-xl rounded-lg py-2">
                                <div className="text-sm text-white font-bold">Level {students[0]?.level}</div>
                            </div>
                        </div>
                    </motion.div>

                    {/* 3rd Place */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="pt-12"
                    >
                        <div className="bg-gradient-to-br from-orange-400 to-orange-500 rounded-2xl p-6 text-center">
                            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-3 text-4xl">
                                🥉
                            </div>
                            <div className="font-black text-white text-lg mb-1 truncate" title={students[2]?.name}>
                                {students[2]?.name}
                            </div>
                            <div className="text-white/80 text-sm mb-3">{students[2]?.points} pts</div>
                            <div className="bg-white/20 backdrop-blur-xl rounded-lg py-2">
                                <div className="text-xs text-white/80">Level {students[2]?.level}</div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Full Rankings */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-200 bg-gray-50">
                    <h3 className="text-xl font-black text-black">Full Rankings</h3>
                </div>

                <div className="divide-y divide-gray-200">
                    {students.map((student, idx) => (
                        <motion.div
                            key={student.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="p-4 hover:bg-gray-50 transition-all"
                        >
                            <div className="flex items-center gap-4">
                                {/* Rank Badge */}
                                <div className={`w-12 h-12 bg-gradient-to-br ${getRankColor(student.rank)} rounded-xl flex items-center justify-center flex-shrink-0`}>
                                    <span className="text-white font-black text-lg">
                                        {student.rank <= 3 ? getRankBadge(student.rank) : `#${student.rank}`}
                                    </span>
                                </div>

                                {/* Student Info */}
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-bold text-black">{student.name}</span>
                                        {student.streak >= 7 && (
                                            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-bold flex items-center gap-1">
                                                <Zap size={10} />
                                                {student.streak} day streak
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-gray-500">
                                        <span className="flex items-center gap-1">
                                            <Star size={12} />
                                            {student.points} pts
                                        </span>
                                        <span>•</span>
                                        <span className="flex items-center gap-1">
                                            <Target size={12} />
                                            {student.avgScore}% avg
                                        </span>
                                        <span>•</span>
                                        <span className="flex items-center gap-1">
                                            <Award size={12} />
                                            Level {student.level}
                                        </span>
                                    </div>
                                </div>

                                {/* Rank Change */}
                                {student.change !== 0 && (
                                    <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg ${student.change > 0
                                            ? 'bg-green-50 text-green-700'
                                            : 'bg-red-50 text-red-700'
                                        }`}>
                                        <TrendingUp
                                            size={14}
                                            className={student.change < 0 ? 'rotate-180' : ''}
                                        />
                                        <span className="text-xs font-bold">{Math.abs(student.change)}</span>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Recent Achievements Section */}
            {students.length > 0 && (
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white">
                    <div className="flex items-center gap-3 mb-4">
                        <Medal size={24} />
                        <h3 className="text-xl font-black">Recent Achievements</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {students[0] && (
                            <div className="bg-white/10 backdrop-blur-xl rounded-xl p-4">
                                <div className="text-3xl mb-2">🎯</div>
                                <div className="font-bold mb-1">Top Student</div>
                                <div className="text-sm text-white/80">{students[0].name} leads with {students[0].points} XP</div>
                            </div>
                        )}
                        {students.find(s => s.streak >= 7) && (
                            <div className="bg-white/10 backdrop-blur-xl rounded-xl p-4">
                                <div className="text-3xl mb-2">🔥</div>
                                <div className="font-bold mb-1">Hot Streak</div>
                                <div className="text-sm text-white/80">
                                    {students.find(s => s.streak >= 7).name}: {students.find(s => s.streak >= 7).streak} days
                                </div>
                            </div>
                        )}
                        {students.length >= 3 && (
                            <div className="bg-white/10 backdrop-blur-xl rounded-xl p-4">
                                <div className="text-3xl mb-2">⚡</div>
                                <div className="font-bold mb-1">Active Class</div>
                                <div className="text-sm text-white/80">{students.length} students competing</div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default LeaderboardTab;
