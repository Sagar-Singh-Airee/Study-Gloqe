// src/components/gamification/LeaderboardCard.jsx - ✅ FIXED VERSION
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, TrendingUp, TrendingDown, Minus, Crown, Medal, Award,
  Search, RefreshCw, ChevronDown, AlertCircle, Sparkles
} from 'lucide-react';
import { useState } from 'react';

const LeaderboardCard = ({ 
  students = [], 
  currentUserId = null, 
  title = 'Leaderboard',
  subtitle = 'Top performers',
  showRankChange = true,
  compact = false,
  loading = false,
  error = null,
  onRefresh = null,
  maxVisible = compact ? 5 : 10,
  timePeriod = 'week', // 'today' | 'week' | 'month' | 'alltime'
  onTimePeriodChange = null
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAll, setShowAll] = useState(false);

  // ✅ Get avatar initials (handles multi-word names)
  const getInitials = (name) => {
    if (!name) return '?';
    const words = name.trim().split(' ');
    if (words.length === 1) return words[0].charAt(0).toUpperCase();
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
  };

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return <Crown size={24} className="text-yellow-500" strokeWidth={2.5} />;
      case 2:
        return <Medal size={24} className="text-gray-400" strokeWidth={2.5} />;
      case 3:
        return <Award size={24} className="text-orange-600" strokeWidth={2.5} />;
      default:
        return null;
    }
  };

  const getRankChangeIcon = (change) => {
    if (change > 0) return <TrendingUp size={14} className="text-green-600" />;
    if (change < 0) return <TrendingDown size={14} className="text-red-600" />;
    return <Minus size={14} className="text-gray-400" />;
  };

  const getRankBgColor = (rank, isCurrentUser) => {
    if (isCurrentUser) {
      return 'bg-gradient-to-r from-blue-50 via-blue-100 to-blue-50 border-blue-400 ring-2 ring-blue-500/50';
    }
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-50 via-amber-50 to-yellow-50 border-yellow-400 shadow-lg';
      case 2:
        return 'bg-gradient-to-r from-gray-50 via-slate-50 to-gray-50 border-gray-400 shadow-md';
      case 3:
        return 'bg-gradient-to-r from-orange-50 via-red-50 to-orange-50 border-orange-400 shadow-md';
      default:
        return 'bg-white border-gray-200 hover:border-gray-300';
    }
  };

  // ✅ Get time period label
  const getTimePeriodLabel = () => {
    switch (timePeriod) {
      case 'today': return 'today';
      case 'week': return 'this week';
      case 'month': return 'this month';
      case 'alltime': return 'all time';
      default: return '';
    }
  };

  // ✅ Filter students
  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const displayedStudents = showAll 
    ? filteredStudents 
    : filteredStudents.slice(0, maxVisible);

  // ✅ Loading state
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-gray-900 to-black p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/10 rounded-xl animate-pulse"></div>
            <div className="flex-1">
              <div className="h-6 bg-white/10 rounded w-32 mb-2 animate-pulse"></div>
              <div className="h-4 bg-white/10 rounded w-48 animate-pulse"></div>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  // ✅ Error state
  if (error) {
    return (
      <div className="bg-white rounded-2xl border-2 border-red-200 overflow-hidden">
        <div className="bg-gradient-to-r from-red-600 to-red-700 p-6">
          <div className="flex items-center gap-3">
            <AlertCircle size={24} className="text-white" />
            <div>
              <h3 className="text-xl font-black text-white">Failed to Load</h3>
              <p className="text-sm text-red-100">{error}</p>
            </div>
          </div>
        </div>
        <div className="p-6 text-center">
          <p className="text-gray-600 mb-4">Could not load leaderboard data</p>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors flex items-center gap-2 mx-auto"
            >
              <RefreshCw size={16} />
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 via-black to-gray-900 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 5 }}
            >
              <Trophy size={24} className="text-white" strokeWidth={2.5} />
            </motion.div>
            <div>
              <h3 className="text-2xl font-black text-white">{title}</h3>
              <p className="text-sm text-gray-400">
                {subtitle} {getTimePeriodLabel()}
              </p>
            </div>
          </div>

          {/* ✅ Refresh button */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw 
                size={18} 
                className={`text-white ${loading ? 'animate-spin' : ''}`} 
              />
            </button>
          )}
        </div>

        {/* ✅ Time period selector */}
        {onTimePeriodChange && !compact && (
          <div className="flex gap-2 mt-4">
            {['today', 'week', 'month', 'alltime'].map((period) => (
              <button
                key={period}
                onClick={() => onTimePeriodChange(period)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  timePeriod === period
                    ? 'bg-white text-gray-900'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                {period === 'alltime' ? 'All Time' : period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ✅ Search bar */}
      {!compact && students.length > 5 && (
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
            />
          </div>
        </div>
      )}

      {/* Leaderboard List */}
      <div className={`${compact ? 'p-4' : 'p-6'} space-y-3`}>
        {displayedStudents.length > 0 ? (
          <AnimatePresence mode="popLayout">
            {displayedStudents.map((student, index) => {
              const isCurrentUser = student.id === currentUserId;
              const rankBg = getRankBgColor(student.rank, isCurrentUser);
              const isTopThree = student.rank <= 3;

              return (
                <motion.div
                  key={student.id}
                  layout
                  initial={{ opacity: 0, x: -20, scale: 0.95 }}
                  animate={{ 
                    opacity: 1, 
                    x: 0, 
                    scale: 1,
                    // ✅ Special animation for top 3
                    ...(isTopThree && {
                      y: [0, -4, 0]
                    })
                  }}
                  exit={{ opacity: 0, x: 20, scale: 0.95 }}
                  transition={{ 
                    delay: index * 0.05,
                    ...(isTopThree && {
                      y: {
                        duration: 2,
                        repeat: Infinity,
                        repeatDelay: 5
                      }
                    })
                  }}
                  whileHover={{ 
                    scale: 1.02, 
                    y: -2,
                    transition: { duration: 0.2 }
                  }}
                  className={`group relative rounded-xl p-4 border-2 transition-all cursor-pointer ${rankBg}`}
                >
                  {/* ✅ Current User Badge */}
                  {isCurrentUser && (
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      className="absolute -top-2 -right-2 px-3 py-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-xs font-black rounded-full shadow-lg border-2 border-white"
                    >
                      You
                    </motion.div>
                  )}

                  {/* ✅ Top 3 glow effect */}
                  {isTopThree && !isCurrentUser && (
                    <motion.div
                      className="absolute -inset-0.5 bg-gradient-to-r from-yellow-400/20 via-transparent to-yellow-400/20 rounded-xl blur-sm"
                      animate={{
                        opacity: [0.3, 0.6, 0.3]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />
                  )}

                  <div className="flex items-center gap-4 relative z-10">
                    {/* Rank */}
                    <div className="flex-shrink-0 w-12 text-center">
                      {isTopThree ? (
                        <motion.div
                          className="flex justify-center"
                          animate={{ 
                            rotate: [0, -10, 10, 0],
                            scale: [1, 1.1, 1]
                          }}
                          transition={{ 
                            duration: 2,
                            repeat: Infinity,
                            repeatDelay: 5
                          }}
                        >
                          {getRankIcon(student.rank)}
                        </motion.div>
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
                          className={`w-12 h-12 rounded-full object-cover border-2 shadow-lg ${
                            isTopThree ? 'border-yellow-400' : 'border-white'
                          }`}
                        />
                      ) : (
                        <div className={`w-12 h-12 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center text-white font-black text-base border-2 shadow-lg ${
                          isTopThree ? 'border-yellow-400' : 'border-white'
                        }`}>
                          {getInitials(student.name)}
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
                          Level {student.level || 1}
                        </span>
                        {student.streak > 0 && (
                          <>
                            <span className="text-gray-400">•</span>
                            <span className="flex items-center gap-1">
                              🔥 {student.streak} day{student.streak !== 1 ? 's' : ''}
                            </span>
                          </>
                        )}
                        {student.quizzes > 0 && (
                          <>
                            <span className="text-gray-400">•</span>
                            <span>{student.quizzes} quiz{student.quizzes !== 1 ? 'zes' : ''}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Points & Change */}
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center gap-2 justify-end mb-1">
                        {isTopThree && (
                          <Sparkles size={16} className="text-yellow-500" />
                        )}
                        <span className="text-2xl font-black text-gray-900">
                          {student.points.toLocaleString()}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 font-semibold uppercase tracking-wide">
                        XP
                      </div>
                      
                      {showRankChange && student.change !== undefined && student.change !== 0 && (
                        <div className="flex items-center justify-end gap-1 mt-2">
                          {getRankChangeIcon(student.change)}
                          <span className={`text-xs font-black ${
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

                  {/* ✅ FIXED: Shine Effect */}
                  {isTopThree && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-xl pointer-events-none"
                      initial={{ x: '-100%' }}
                      animate={{ x: '200%' }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        repeatDelay: 3,
                        ease: 'linear'
                      }}
                    />
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        ) : searchQuery ? (
          <div className="text-center py-12">
            <Search size={48} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-semibold">No students found</p>
            <p className="text-sm text-gray-400">Try a different search term</p>
          </div>
        ) : (
          <div className="text-center py-12">
            <Trophy size={48} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-semibold">No rankings yet</p>
            <p className="text-sm text-gray-400">Start earning XP to appear here!</p>
          </div>
        )}

        {/* ✅ Show More button */}
        {filteredStudents.length > maxVisible && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowAll(!showAll)}
            className="w-full p-3 bg-gray-100 hover:bg-gray-200 rounded-xl border-2 border-gray-200 font-bold text-gray-700 transition-all flex items-center justify-center gap-2"
          >
            <span>
              {showAll ? 'Show Less' : `Show ${filteredStudents.length - maxVisible} More`}
            </span>
            <ChevronDown 
              size={18} 
              className={`transition-transform ${showAll ? 'rotate-180' : ''}`}
            />
          </motion.button>
        )}
      </div>

      {/* Footer Stats */}
      {students.length > 0 && !compact && (
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-t-2 border-gray-200 p-5">
          <div className="flex items-center justify-around text-center">
            <div>
              <p className="text-2xl font-black text-gray-900">
                {students.length}
              </p>
              <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">
                Students
              </p>
            </div>
            <div className="w-px h-10 bg-gray-300" />
            <div>
              <p className="text-2xl font-black text-gray-900">
                {students.reduce((sum, s) => sum + (s.points || 0), 0).toLocaleString()}
              </p>
              <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">
                Total XP
              </p>
            </div>
            <div className="w-px h-10 bg-gray-300" />
            <div>
              <p className="text-2xl font-black text-gray-900">
                {Math.round(students.reduce((sum, s) => sum + (s.points || 0), 0) / students.length).toLocaleString()}
              </p>
              <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">
                Avg XP
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaderboardCard;
