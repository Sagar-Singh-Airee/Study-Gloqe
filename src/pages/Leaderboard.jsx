import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Crown, TrendingUp, Users, Calendar, Award } from 'lucide-react';
import { useAuth } from '@contexts/AuthContext';

const Leaderboard = () => {
  const { userData, user } = useAuth();
  const [timeframe, setTimeframe] = useState('month'); // week, month, all-time
  const [scope, setScope] = useState('class'); // class, school, global
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [userRank, setUserRank] = useState(null);

  useEffect(() => {
    loadLeaderboard();
  }, [timeframe, scope]);

  const loadLeaderboard = async () => {
    // Simulate loading data (replace with actual API call)
    const mockData = [
      { id: '1', name: 'Alice Johnson', xp: 4500, level: 45, badges: 12, streak: 15, avatar: 'AJ' },
      { id: '2', name: 'Bob Smith', xp: 4200, level: 42, badges: 10, streak: 12, avatar: 'BS' },
      { id: '3', name: 'Charlie Brown', xp: 3800, level: 38, badges: 9, streak: 10, avatar: 'CB' },
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
    return 'from-accent to-blue-600';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-display font-bold mb-2">
          <span className="gradient-text">Leaderboard</span>
        </h1>
        <p className="text-primary-300">
          Compete with peers and climb to the top!
        </p>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="card"
      >
        <div className="flex flex-wrap gap-4">
          {/* Timeframe */}
          <div>
            <label className="block text-sm font-medium mb-2">Timeframe</label>
            <div className="flex gap-2">
              {['week', 'month', 'all-time'].map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-4 py-2 rounded-xl transition-all ${
                    timeframe === tf
                      ? 'bg-accent text-white'
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  {tf.charAt(0).toUpperCase() + tf.slice(1).replace('-', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Scope */}
          <div>
            <label className="block text-sm font-medium mb-2">Scope</label>
            <div className="flex gap-2">
              {['class', 'school', 'global'].map((sc) => (
                <button
                  key={sc}
                  onClick={() => setScope(sc)}
                  className={`px-4 py-2 rounded-xl transition-all ${
                    scope === sc
                      ? 'bg-accent text-white'
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  {sc.charAt(0).toUpperCase() + sc.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* User's Rank Card */}
      {userRank && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="card bg-gradient-to-r from-accent/20 to-blue-600/20 border-accent/30"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-accent to-blue-600 flex items-center justify-center">
                <span className="text-2xl font-bold">{userData?.level || 1}</span>
              </div>
              <div>
                <div className="text-sm text-primary-400">Your Rank</div>
                <div className="text-3xl font-bold">#{userRank.rank}</div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm text-primary-400">XP This Period</div>
              <div className="text-2xl font-bold">{userRank.xp}</div>
              <div className="text-sm text-success flex items-center gap-1 justify-end">
                <TrendingUp size={14} />
                {userRank.change}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Top 3 Podium */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="grid grid-cols-3 gap-6"
      >
        {leaderboardData.slice(0, 3).map((user, index) => {
          const actualRank = index + 1;
          return (
            <div
              key={user.id}
              className={`card text-center ${
                actualRank === 1 ? 'order-2 scale-110' : actualRank === 2 ? 'order-1' : 'order-3'
              }`}
            >
              <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${getRankColor(actualRank)} flex items-center justify-center mx-auto mb-3 text-2xl font-bold`}>
                {user.avatar}
              </div>

              <div className="mb-2">
                {getRankIcon(actualRank)}
              </div>

              <div className="font-bold mb-1">{user.name}</div>
              <div className="text-sm text-primary-400 mb-3">Level {user.level}</div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-primary-400">XP:</span>
                  <span className="font-semibold">{user.xp.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-primary-400">Badges:</span>
                  <span className="font-semibold">{user.badges}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-primary-400">Streak:</span>
                  <span className="font-semibold">{user.streak} days</span>
                </div>
              </div>
            </div>
          );
        })}
      </motion.div>

      {/* Full Leaderboard */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="card"
      >
        <h2 className="text-2xl font-display font-semibold mb-6">Rankings</h2>

        <div className="space-y-2">
          {leaderboardData.map((user, index) => {
            const rank = index + 1;
            const isCurrentUser = userData?.uid === user.id;

            return (
              <div
                key={user.id}
                className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
                  isCurrentUser
                    ? 'bg-accent/20 border-2 border-accent'
                    : 'glass-hover'
                }`}
              >
                {/* Rank */}
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${getRankColor(rank)} flex items-center justify-center flex-shrink-0 font-bold`}>
                  {rank <= 3 ? getRankIcon(rank) : rank}
                </div>

                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center font-bold flex-shrink-0">
                  {user.avatar}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold flex items-center gap-2">
                    {user.name}
                    {isCurrentUser && (
                      <span className="text-xs px-2 py-1 rounded-full bg-accent/20 text-accent">
                        You
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-primary-400">
                    Level {user.level} • {user.xp.toLocaleString()} XP
                  </div>
                </div>

                {/* Stats */}
                <div className="hidden md:flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <div className="text-primary-400">Badges</div>
                    <div className="font-semibold">{user.badges}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-primary-400">Streak</div>
                    <div className="font-semibold">{user.streak}d</div>
                  </div>
                </div>

                {/* Badge */}
                {rank <= 10 && (
                  <div className="flex items-center gap-1">
                    <Trophy size={18} className="text-yellow-400" />
                    <span className="text-xs text-primary-400">Top 10</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Season Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="card bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
            <Calendar size={24} />
          </div>
          <div className="flex-1">
            <div className="font-semibold mb-1">Current Season: November 2024</div>
            <div className="text-sm text-primary-300">
              15 days remaining • Top 3 students will receive special rewards! 🏆
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Leaderboard;