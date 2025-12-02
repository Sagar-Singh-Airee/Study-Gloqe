// src/components/classroom/LeaderboardTab.jsx
import { motion } from 'framer-motion';
import { Trophy, TrendingUp, Award, Star, Target, Zap, Medal } from 'lucide-react';

const LeaderboardTab = ({ classId }) => {
    // Mock leaderboard data
    const students = [
        { id: 1, name: 'Alice Johnson', points: 2450, quizzes: 28, avgScore: 94, streak: 15, level: 12, rank: 1, change: 0 },
        { id: 2, name: 'Bob Smith', points: 2380, quizzes: 26, avgScore: 91, streak: 12, level: 11, rank: 2, change: 1 },
        { id: 3, name: 'Charlie Davis', points: 2290, quizzes: 25, avgScore: 89, streak: 10, level: 11, rank: 3, change: -1 },
        { id: 4, name: 'Diana Wilson', points: 2150, quizzes: 24, avgScore: 88, streak: 8, level: 10, rank: 4, change: 0 },
        { id: 5, name: 'Eve Martinez', points: 2080, quizzes: 23, avgScore: 86, streak: 7, level: 10, rank: 5, change: 2 },
        { id: 6, name: 'Frank Brown', points: 1950, quizzes: 22, avgScore: 84, streak: 5, level: 9, rank: 6, change: -1 },
        { id: 7, name: 'Grace Lee', points: 1820, quizzes: 21, avgScore: 82, streak: 4, level: 9, rank: 7, change: 0 },
        { id: 8, name: 'Henry Taylor', points: 1750, quizzes: 20, avgScore: 80, streak: 3, level: 8, rank: 8, change: 1 },
    ];

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
                        <div className="font-black text-white text-lg mb-1">{students[1].name}</div>
                        <div className="text-white/80 text-sm mb-3">{students[1].points} pts</div>
                        <div className="bg-white/20 backdrop-blur-xl rounded-lg py-2">
                            <div className="text-xs text-white/80">Level {students[1].level}</div>
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
                        <div className="font-black text-white text-xl mb-1">{students[0].name}</div>
                        <div className="text-white/90 text-base mb-3 font-bold">{students[0].points} pts</div>
                        <div className="bg-white/20 backdrop-blur-xl rounded-lg py-2">
                            <div className="text-sm text-white font-bold">Level {students[0].level}</div>
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
                        <div className="font-black text-white text-lg mb-1">{students[2].name}</div>
                        <div className="text-white/80 text-sm mb-3">{students[2].points} pts</div>
                        <div className="bg-white/20 backdrop-blur-xl rounded-lg py-2">
                            <div className="text-xs text-white/80">Level {students[2].level}</div>
                        </div>
                    </div>
                </motion.div>
            </div>

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
                                    <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg ${
                                        student.change > 0 
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

            {/* Achievements Section */}
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white">
                <div className="flex items-center gap-3 mb-4">
                    <Medal size={24} />
                    <h3 className="text-xl font-black">Recent Achievements</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white/10 backdrop-blur-xl rounded-xl p-4">
                        <div className="text-3xl mb-2">🎯</div>
                        <div className="font-bold mb-1">Perfect Score</div>
                        <div className="text-sm text-white/80">Alice got 100% on Math Quiz</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-xl rounded-xl p-4">
                        <div className="text-3xl mb-2">🔥</div>
                        <div className="font-bold mb-1">Hot Streak</div>
                        <div className="text-sm text-white/80">Bob: 12 days in a row</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-xl rounded-xl p-4">
                        <div className="text-3xl mb-2">⚡</div>
                        <div className="font-bold mb-1">Speed Demon</div>
                        <div className="text-sm text-white/80">Charlie: Fastest completion</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LeaderboardTab;
