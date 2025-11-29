// src/components/features/QuizzesSection.jsx
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Brain, Play, ChevronRight, Sparkles, Clock, Target, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { awardXP, updateMission, XP_REWARDS } from '@/services/gamificationService';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import toast from 'react-hot-toast';

const QuizzesSection = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [quizzes, setQuizzes] = useState([]);
  const [stats, setStats] = useState({
    taken: 0,
    accuracy: 0,
    timeSpentHours: 0,
  });
  const [loading, setLoading] = useState(true);

  // Load quizzes in real time
  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    const quizzesRef = collection(db, 'quizzes');
    const q = query(quizzesRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setQuizzes(data);
        setLoading(false);
      },
      (err) => {
        console.error('Error loading quizzes:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // Load stats from sessions with gamification
  useEffect(() => {
    if (!user?.uid) return;

    const sessionsRef = collection(db, 'sessions');
    const q = query(sessionsRef, where('userId', '==', user.uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const sessions = snapshot.docs.map((doc) => doc.data());
        if (sessions.length === 0) {
          setStats({ taken: 0, accuracy: 0, timeSpentHours: 0 });
          return;
        }

        const taken = sessions.length;
        const totalCorrect = sessions.reduce(
          (sum, s) => sum + (s.correctCount || 0),
          0
        );
        const totalQuestions = sessions.reduce(
          (sum, s) => sum + (s.questionCount || 0),
          0
        );
        const accuracy =
          totalQuestions > 0
            ? Math.round((totalCorrect / totalQuestions) * 100)
            : 0;

        const totalSeconds = sessions.reduce(
          (sum, s) => sum + (s.durationSeconds || 0),
          0
        );
        const timeSpentHours = (totalSeconds / 3600).toFixed(1);

        setStats({
          taken,
          accuracy,
          timeSpentHours,
        });
      },
      (err) => {
        console.error('Error loading quiz stats:', err);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // Memoize difficulty color function
  const getDifficultyColor = useMemo(() => (difficulty) => {
    switch (difficulty) {
      case 'Easy':
        return 'bg-gray-100 text-gray-700';
      case 'Medium':
        return 'bg-gray-200 text-gray-800';
      case 'Hard':
        return 'bg-black text-white';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  }, []);

  // Handle quiz start with gamification
  const handleStartQuiz = async (quizId) => {
    try {
      // Award XP for starting quiz
      await awardXP(user.uid, 5, 'Started Quiz');
      await updateMission(user.uid, 'daily_quiz');
      
      toast.success('🎯 +5 XP for starting quiz!', {
        duration: 2000,
        style: {
          background: 'linear-gradient(135deg, #000 0%, #1a1a1a 100%)',
          color: '#fff',
          fontWeight: 'bold',
          borderRadius: '16px',
          padding: '16px 24px',
        },
      });

      navigate(`/quizzes/${quizId}`);
    } catch (error) {
      console.error('Error starting quiz:', error);
      navigate(`/quizzes/${quizId}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading quizzes...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-4xl font-black text-black">AI Quizzes</h1>
            <Sparkles size={32} className="text-black" />
          </div>
          <p className="text-gray-600">
            Test your knowledge with AI-generated quizzes
          </p>
        </div>
      </div>

      {/* Stats Cards with Gamification Hints */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-white border-2 border-black rounded-2xl p-5 relative overflow-hidden group"
        >
          {/* Shine effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center">
              <Brain size={24} className="text-white" />
            </div>
            <div>
              <div className="text-2xl font-black text-black flex items-center gap-2">
                {stats.taken}
                {stats.taken > 0 && (
                  <span className="text-xs font-bold px-2 py-1 bg-black text-white rounded-lg">
                    +{stats.taken * 20} XP
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-500">Quizzes Taken</div>
            </div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-gray-50 border border-gray-200 rounded-2xl p-5"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center">
              <Target size={24} className="text-white" />
            </div>
            <div>
              <div className="text-2xl font-black text-black">
                {stats.accuracy}%
              </div>
              <div className="text-sm text-gray-500">Avg Accuracy</div>
            </div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-gray-50 border border-gray-200 rounded-2xl p-5"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center">
              <Clock size={24} className="text-white" />
            </div>
            <div>
              <div className="text-2xl font-black text-black">
                {stats.timeSpentHours}h
              </div>
              <div className="text-sm text-gray-500">Time Spent</div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* XP Boost Banner */}
      {quizzes.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 p-4 bg-gradient-to-r from-black via-gray-900 to-black rounded-2xl border border-white/10"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                <Zap size={20} className="text-white" fill="white" />
              </div>
              <div>
                <p className="text-white font-bold text-sm">
                  Earn XP by completing quizzes!
                </p>
                <p className="text-gray-400 text-xs">
                  +20 XP per quiz • +10 XP per correct answer
                </p>
              </div>
            </div>
            <div className="px-4 py-2 bg-white/10 rounded-xl backdrop-blur-sm">
              <p className="text-white font-black text-lg">
                {stats.taken * 20} XP
              </p>
              <p className="text-gray-400 text-xs">Earned Total</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* AI Recommendations */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={20} className="text-black" />
          <h2 className="text-xl font-black text-black">Recommended for You</h2>
        </div>

        {quizzes.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 text-center">
            <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Brain size={32} className="text-white" />
            </div>
            <p className="text-gray-600 text-sm font-medium mb-2">
              No quizzes yet
            </p>
            <p className="text-gray-500 text-xs">
              Generate one from a document to get started and earn XP!
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {quizzes.slice(0, 2).map((quiz, idx) => (
              <motion.div
                key={quiz.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ scale: 1.03 }}
                className="bg-gradient-to-br from-gray-700 to-gray-900 rounded-2xl p-6 text-white hover:shadow-2xl transition-all group cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    <Brain size={24} />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs font-bold bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
                      {quiz.estimatedTime || 15} min
                    </div>
                    <div className="text-xs font-bold bg-green-500/20 text-green-400 px-3 py-1 rounded-full backdrop-blur-sm flex items-center gap-1">
                      <Zap size={12} />
                      +20 XP
                    </div>
                  </div>
                </div>

                <h3 className="text-lg font-bold mb-1">
                  {quiz.title || 'Untitled Quiz'}
                </h3>
                <p className="text-sm text-white/70 mb-4">
                  {(quiz.questions?.length || quiz.questionCount || 0)} questions •{' '}
                  {quiz.difficulty || 'Mixed'}
                </p>

                <button
                  onClick={() => handleStartQuiz(quiz.id)}
                  className="w-full py-2.5 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-bold backdrop-blur-sm transition-all flex items-center justify-center gap-2 group-hover:gap-3"
                >
                  Start Quiz
                  <ChevronRight size={16} />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* All Quizzes */}
      <div>
        <h2 className="text-xl font-black text-black mb-4">All Quizzes</h2>

        {quizzes.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 text-center">
            <p className="text-gray-600 text-sm">
              No quizzes found. Upload a PDF and generate your first quiz.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {quizzes.map((quiz, idx) => (
              <motion.div
                key={quiz.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                whileHover={{ scale: 1.01 }}
                className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-black hover:shadow-lg transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center">
                      <Brain size={24} className="text-white" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-bold text-black">
                          {quiz.title || 'Untitled Quiz'}
                        </h3>
                        {quiz.aiGenerated && (
                          <Sparkles size={14} className="text-black" />
                        )}
                        <span className="text-xs font-bold px-2 py-0.5 bg-green-500/10 text-green-600 rounded-lg flex items-center gap-1">
                          <Zap size={10} />
                          +20 XP
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>
                          {(quiz.questions?.length || quiz.questionCount || 0)} questions
                        </span>
                        <span>•</span>
                        <span
                          className={`px-2 py-0.5 rounded-full font-semibold ${getDifficultyColor(
                            quiz.difficulty
                          )}`}
                        >
                          {quiz.difficulty || 'Mixed'}
                        </span>
                        <span>•</span>
                        <span>{quiz.estimatedTime || 15} min</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleStartQuiz(quiz.id)}
                    className="flex items-center gap-2 px-6 py-2.5 bg-black text-white rounded-xl text-sm font-bold hover:scale-105 transition-all"
                  >
                    <Play size={16} />
                    Start
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default QuizzesSection;
