// src/components/classroom/LeaderboardTab.jsx
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, TrendingUp, Award, Star, Target, Zap, Medal, Loader2,
  RefreshCw, Activity, Bell, Crown, Flame
} from 'lucide-react';
import { getClassLeaderboard } from '@gamification/services/gamificationService';
// import { kafkaConsumer } from '@/services/kafkaConsumer'; // TODO: Implement Kafka consumer
import { useAuth } from '@auth/contexts/AuthContext';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';

const LeaderboardTab = ({ classId }) => {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [rankChanges, setRankChanges] = useState(new Map());
  const previousRanksRef = useRef(new Map());
  const audioRef = useRef(null);

  // Initialize real-time connection
  useEffect(() => {
    if (user?.uid) {
      // TODO: Connect to Kafka stream when implemented
      // kafkaConsumer.connect(user.uid);
      setIsLive(false); // Disabled for now

      // TODO: Subscribe to relevant events
      // const unsubscribeXP = kafkaConsumer.subscribe('xp.awarded', handleXPUpdate);
      // const unsubscribeQuiz = kafkaConsumer.subscribe('quiz.completed', handleQuizComplete);
      // const unsubscribeLeaderboard = kafkaConsumer.subscribe('leaderboard.updated', handleLeaderboardUpdate);

      // return () => {
      //   unsubscribeXP();
      //   unsubscribeQuiz();
      //   unsubscribeLeaderboard();
      // };
    }
  }, [user]);

  // Load initial leaderboard
  useEffect(() => {
    if (classId) {
      loadLeaderboard();
    }
  }, [classId]);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      const leaderboardData = await getClassLeaderboard(classId);

      // Store previous ranks
      students.forEach(student => {
        previousRanksRef.current.set(student.id, student.rank);
      });

      setStudents(leaderboardData);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error loading leaderboard:', error);
      toast.error('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  // Handle real-time XP updates
  const handleXPUpdate = (data) => {
    const { userId, newXP, newLevel } = data;

    setStudents(prev => {
      const updated = prev.map(student => {
        if (student.id === userId) {
          return { ...student, points: newXP, level: newLevel };
        }
        return student;
      });

      // Re-sort and update ranks
      return updateRanks(updated);
    });

    setLastUpdate(new Date());

    // Show toast for current user
    if (userId === user?.uid) {
      toast.success(`+${data.xpGained} XP!`, {
        icon: '⚡',
        duration: 3000,
      });
    }
  };

  // Handle quiz completion
  const handleQuizComplete = (data) => {
    const { userId, score, xpAwarded } = data;

    setStudents(prev => {
      const updated = prev.map(student => {
        if (student.id === userId) {
          return {
            ...student,
            points: student.points + xpAwarded,
            quizzes: (student.quizzes || 0) + 1,
            avgScore: calculateNewAverage(student.avgScore, score, student.quizzes || 0)
          };
        }
        return student;
      });

      return updateRanks(updated);
    });

    setLastUpdate(new Date());
  };

  // Handle direct leaderboard updates
  const handleLeaderboardUpdate = (data) => {
    console.log('📊 Leaderboard update received:', data);
    loadLeaderboard(); // Full refresh
  };

  // Update ranks and detect changes
  const updateRanks = (studentList) => {
    const sorted = [...studentList].sort((a, b) => b.points - a.points);

    const withRanks = sorted.map((student, index) => {
      const newRank = index + 1;
      const oldRank = previousRanksRef.current.get(student.id);

      // Detect rank changes
      if (oldRank && oldRank !== newRank) {
        const change = oldRank - newRank; // Positive = moved up
        setRankChanges(prev => new Map(prev).set(student.id, change));

        // Show notification
        if (student.id === user?.uid) {
          if (change > 0) {
            showRankUpNotification(newRank);
          } else {
            toast(`Rank changed: #${newRank}`, { icon: '📊' });
          }
        }

        // Clear change after animation
        setTimeout(() => {
          setRankChanges(prev => {
            const updated = new Map(prev);
            updated.delete(student.id);
            return updated;
          });
        }, 3000);
      }

      previousRanksRef.current.set(student.id, newRank);

      return { ...student, rank: newRank };
    });

    return withRanks;
  };

  // Calculate new average score
  const calculateNewAverage = (currentAvg, newScore, quizCount) => {
    if (quizCount === 0) return newScore;
    return Math.round(((currentAvg * quizCount) + newScore) / (quizCount + 1));
  };

  // Show rank up notification with confetti
  const showRankUpNotification = (newRank) => {
    toast.success(`🎉 Rank Up! You're now #${newRank}!`, {
      duration: 5000,
      style: {
        background: '#10b981',
        color: '#fff',
      },
    });

    // Confetti effect
    if (newRank <= 3) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }

    // Play sound
    if (audioRef.current) {
      audioRef.current.play();
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
      {/* Hidden audio element for sound effects */}
      <audio ref={audioRef} src="/sounds/rank-up.mp3" preload="auto" />

      {/* Live Status Bar */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <Activity size={24} className="text-white" />
            {isLive && (
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"
              />
            )}
          </div>
          <div>
            <div className="font-bold text-white">Live Updates Active</div>
            <div className="text-xs text-white/80">
              {lastUpdate && `Last update: ${lastUpdate.toLocaleTimeString()}`}
            </div>
          </div>
        </div>
        <button
          onClick={loadLeaderboard}
          className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg flex items-center gap-2 transition-all"
        >
          <RefreshCw size={16} className="text-white" />
          <span className="text-white text-sm font-bold">Refresh</span>
        </button>
      </motion.div>

      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-2xl mb-4 relative">
          <Trophy size={32} className="text-white" />
          {isLive && (
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="absolute -top-2 -right-2"
            >
              <Bell size={20} className="text-green-500" />
            </motion.div>
          )}
        </div>
        <h2 className="text-3xl font-black text-black mb-2">Class Leaderboard</h2>
        <p className="text-gray-600">Real-time rankings • {students.length} students competing</p>
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
            <motion.div
              animate={rankChanges.has(students[1]?.id) ? { scale: [1, 1.05, 1] } : {}}
              className="bg-gradient-to-br from-gray-300 to-gray-400 rounded-2xl p-6 text-center relative"
            >
              {rankChanges.has(students[1]?.id) && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold"
                >
                  ↑ +{rankChanges.get(students[1]?.id)}
                </motion.div>
              )}
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-3 text-4xl">
                🥈
              </div>
              <div className="font-black text-white text-lg mb-1 truncate" title={students[1]?.name}>
                {students[1]?.name}
              </div>
              <div className="text-white/80 text-sm mb-3">
                <motion.span
                  key={students[1]?.points}
                  initial={{ scale: 1.2, color: '#fff' }}
                  animate={{ scale: 1, color: 'rgba(255,255,255,0.8)' }}
                  transition={{ duration: 0.5 }}
                >
                  {students[1]?.points} pts
                </motion.span>
              </div>
              <div className="bg-white/20 backdrop-blur-xl rounded-lg py-2">
                <div className="text-xs text-white/80">Level {students[1]?.level}</div>
              </div>
            </motion.div>
          </motion.div>

          {/* 1st Place */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <motion.div
              animate={rankChanges.has(students[0]?.id) ? { scale: [1, 1.08, 1] } : {}}
              className="bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-2xl p-6 text-center relative"
            >
              <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                <motion.div
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center border-4 border-white shadow-xl"
                >
                  <Crown size={24} className="text-white" />
                </motion.div>
              </div>
              {rankChanges.has(students[0]?.id) && (
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-yellow-300/30 rounded-2xl"
                />
              )}
              <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-3 mt-4 text-5xl relative">
                🥇
                {students[0]?.streak >= 7 && (
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                    className="absolute -top-2 -right-2"
                  >
                    <Flame size={24} className="text-orange-500" />
                  </motion.div>
                )}
              </div>
              <div className="font-black text-white text-xl mb-1 truncate" title={students[0]?.name}>
                {students[0]?.name}
              </div>
              <div className="text-white/90 text-base mb-3 font-bold">
                <motion.span
                  key={students[0]?.points}
                  initial={{ scale: 1.3, color: '#fff' }}
                  animate={{ scale: 1, color: 'rgba(255,255,255,0.9)' }}
                  transition={{ duration: 0.5 }}
                >
                  {students[0]?.points} pts
                </motion.span>
              </div>
              <div className="bg-white/20 backdrop-blur-xl rounded-lg py-2">
                <div className="text-sm text-white font-bold">Level {students[0]?.level}</div>
              </div>
            </motion.div>
          </motion.div>

          {/* 3rd Place */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="pt-12"
          >
            <motion.div
              animate={rankChanges.has(students[2]?.id) ? { scale: [1, 1.05, 1] } : {}}
              className="bg-gradient-to-br from-orange-400 to-orange-500 rounded-2xl p-6 text-center relative"
            >
              {rankChanges.has(students[2]?.id) && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold"
                >
                  ↑ +{rankChanges.get(students[2]?.id)}
                </motion.div>
              )}
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-3 text-4xl">
                🥉
              </div>
              <div className="font-black text-white text-lg mb-1 truncate" title={students[2]?.name}>
                {students[2]?.name}
              </div>
              <div className="text-white/80 text-sm mb-3">
                <motion.span
                  key={students[2]?.points}
                  initial={{ scale: 1.2, color: '#fff' }}
                  animate={{ scale: 1, color: 'rgba(255,255,255,0.8)' }}
                  transition={{ duration: 0.5 }}
                >
                  {students[2]?.points} pts
                </motion.span>
              </div>
              <div className="bg-white/20 backdrop-blur-xl rounded-lg py-2">
                <div className="text-xs text-white/80">Level {students[2]?.level}</div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      )}

      {/* Full Rankings */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <h3 className="text-xl font-black text-black">Full Rankings</h3>
          {isLive && (
            <div className="flex items-center gap-2 text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-bold">Live</span>
            </div>
          )}
        </div>

        <div className="divide-y divide-gray-200">
          <AnimatePresence mode="popLayout">
            {students.map((student, idx) => (
              <motion.div
                key={student.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{
                  layout: { type: "spring", stiffness: 300, damping: 30 },
                  delay: idx * 0.02
                }}
                className={`p-4 hover:bg-gray-50 transition-all ${student.id === user?.uid ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                  }`}
              >
                <div className="flex items-center gap-4">
                  {/* Rank Badge */}
                  <motion.div
                    animate={rankChanges.has(student.id) ? { scale: [1, 1.15, 1] } : {}}
                    className={`w-12 h-12 bg-gradient-to-br ${getRankColor(student.rank)} rounded-xl flex items-center justify-center flex-shrink-0 relative`}
                  >
                    <span className="text-white font-black text-lg">
                      {student.rank <= 3 ? getRankBadge(student.rank) : `#${student.rank}`}
                    </span>
                    {rankChanges.has(student.id) && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center"
                      >
                        <TrendingUp size={12} className="text-white" />
                      </motion.div>
                    )}
                  </motion.div>

                  {/* Student Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-black">
                        {student.name}
                        {student.id === user?.uid && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                            You
                          </span>
                        )}
                      </span>
                      {student.streak >= 7 && (
                        <motion.span
                          animate={{ scale: [1, 1.05, 1] }}
                          transition={{ repeat: Infinity, duration: 2 }}
                          className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-bold flex items-center gap-1"
                        >
                          <Flame size={10} />
                          {student.streak} day streak
                        </motion.span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <motion.span
                        key={student.points}
                        initial={{ scale: 1.1, color: '#10b981' }}
                        animate={{ scale: 1, color: '#6b7280' }}
                        className="flex items-center gap-1"
                      >
                        <Star size={12} />
                        {student.points} pts
                      </motion.span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Target size={12} />
                        {student.avgScore || 0}% avg
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Award size={12} />
                        Level {student.level}
                      </span>
                    </div>
                  </div>

                  {/* Rank Change Indicator */}
                  <AnimatePresence>
                    {rankChanges.has(student.id) && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-50 text-green-700"
                      >
                        <TrendingUp size={14} />
                        <span className="text-xs font-bold">
                          +{rankChanges.get(student.id)}
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Recent Achievements Section */}
      {students.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white"
        >
          <div className="flex items-center gap-3 mb-4">
            <Medal size={24} />
            <h3 className="text-xl font-black">Recent Achievements</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {students[0] && (
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="bg-white/10 backdrop-blur-xl rounded-xl p-4"
              >
                <div className="text-3xl mb-2">🎯</div>
                <div className="font-bold mb-1">Top Student</div>
                <div className="text-sm text-white/80">
                  {students[0].name} leads with {students[0].points} XP
                </div>
              </motion.div>
            )}
            {students.find(s => s.streak >= 7) && (
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="bg-white/10 backdrop-blur-xl rounded-xl p-4"
              >
                <div className="text-3xl mb-2">🔥</div>
                <div className="font-bold mb-1">Hot Streak</div>
                <div className="text-sm text-white/80">
                  {students.find(s => s.streak >= 7).name}: {students.find(s => s.streak >= 7).streak} days
                </div>
              </motion.div>
            )}
            {students.length >= 3 && (
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="bg-white/10 backdrop-blur-xl rounded-xl p-4"
              >
                <div className="text-3xl mb-2">⚡</div>
                <div className="font-bold mb-1">Active Class</div>
                <div className="text-sm text-white/80">
                  {students.length} students competing
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default LeaderboardTab;
