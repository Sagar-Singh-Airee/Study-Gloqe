// src/components/gamification/LeaderboardCard.jsx - Leaderboard Display
import { motion } from 'framer-motion';
import { Trophy, TrendingUp, TrendingDown, Minus, Crown, Medal, Award } from 'lucide-react';

const LeaderboardCard = ({ 
  students, 
  currentUserId, 
  title = 'Leaderboard',
  showRankChange = true,
  compact = false 
}) => {
  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return <Crown size={20} className="text-yellow-500" />;
      case 2:
        return <Medal size={20} className="text-gray-400" />;
      case 3:
        return <Award size={20} className="text-orange-600" />;
      default:
        return null;
    }
  };

  const getRankChangeIcon = (change) => {
    if (change > 0) return <TrendingUp size={14} className="text-green-600" />;
    if (change < 0) return <TrendingDown size={14} className="text-red-600" />;
    return <Minus size={14} className="text-gray-400" />;
  };

  const getRankBgColor = (rank) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-300';
      case 2:
        return 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-300';
      case 3:
        return 'bg-gradient-to-r from-orange-50 to-orange-100 border-orange-300';
      default:
        return 'bg-white border-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 to-black p-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
            <Trophy size={24} className="text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-white">{title}</h3>
            <p className="text-sm text-gray-400">Top performers this week</p>
          </div>
        </div>
      </div>

      {/* Leaderboard List */}
      <div className={`${compact ? 'p-4' : 'p-6'} space-y-3`}>
        {students && students.length > 0 ? (
          students.map((student, index) => {
            const isCurrentUser = student.id === currentUserId;
            const rankBg = getRankBgColor(student.rank);

            return (
              <motion.div
                key={student.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`relative rounded-xl p-4 border-2 transition-all ${
                  isCurrentUser
                    ? 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-300 ring-2 ring-blue-500'
                    : rankBg
                }`}
              >
                {/* Current User Badge */}
                {isCurrentUser && (
                  <div className="absolute -top-2 -right-2 px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full">
                    You
                  </div>
                )}

                <div className="flex items-center gap-4">
                  {/* Rank */}
                  <div className="flex-shrink-0 w-12 text-center">
                    {student.rank <= 3 ? (
                      <div className="flex justify-center">
                        {getRankIcon(student.rank)}
                      </div>
                    ) : (
                      <span className="text-2xl font-black text-gray-900">
                        #{student.rank}
                      </span>
                    )}
                  </div>

                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {student.photoURL ? (
                      <img
                        src={student.photoURL}
                        alt={student.name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-lg"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center text-white font-bold text-lg border-2 border-white shadow-lg">
                        {student.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-lg font-bold text-gray-900 truncate">
                      {student.name}
                    </h4>
                    <div className="flex items-center gap-3 text-xs text-gray-600">
                      <span className="font-semibold">
                        Level {student.level}
                      </span>
                      {student.streak > 0 && (
                        <>
                          <span className="text-gray-400">•</span>
                          <span className="flex items-center gap-1">
                            🔥 {student.streak} day streak
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Points & Change */}
                  <div className="text-right">
                    <div className="text-2xl font-black text-gray-900 mb-1">
                      {student.points.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500 font-semibold">XP</div>
                    
                    {showRankChange && student.change !== undefined && (
                      <div className="flex items-center justify-end gap-1 mt-1">
                        {getRankChangeIcon(student.change)}
                        <span className={`text-xs font-bold ${
                          student.change > 0 ? 'text-green-600' :
                          student.change < 0 ? 'text-red-600' :
                          'text-gray-400'
                        }`}>
                          {student.change > 0 ? '+' : ''}{student.change}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Shine Effect for Top 3 */}
                {student.rank <= 3 && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 rounded-xl pointer-events-none" />
                )}
              </motion.div>
            );
          })
        ) : (
          <div className="text-center py-12">
            <Trophy size={48} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-semibold">No rankings yet</p>
            <p className="text-sm text-gray-400">Start earning XP to appear here!</p>
          </div>
        )}
      </div>

      {/* Footer Stats */}
      {students && students.length > 0 && !compact && (
        <div className="bg-gray-50 border-t-2 border-gray-200 p-4">
          <div className="flex items-center justify-around text-center">
            <div>
              <p className="text-2xl font-black text-gray-900">
                {students.length}
              </p>
              <p className="text-xs text-gray-500 font-semibold">Students</p>
            </div>
            <div className="w-px h-8 bg-gray-300" />
            <div>
              <p className="text-2xl font-black text-gray-900">
                {students.reduce((sum, s) => sum + s.points, 0).toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 font-semibold">Total XP</p>
            </div>
            <div className="w-px h-8 bg-gray-300" />
            <div>
              <p className="text-2xl font-black text-gray-900">
                {Math.round(students.reduce((sum, s) => sum + s.points, 0) / students.length).toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 font-semibold">Avg XP</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaderboardCard;
