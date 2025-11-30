// src/pages/QuizResults.jsx - PREMIUM RESULTS PAGE
import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  Target,
  Clock,
  CheckCircle2,
  XCircle,
  Home,
  RotateCcw,
  Share2,
  Award,
  TrendingUp,
  Brain,
  Sparkles,
  Download,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Star,
  Zap
} from 'lucide-react';
import { useAuth } from '@contexts/AuthContext';
import { getQuizResults } from '@services/quizService';
import toast from 'react-hot-toast';



const QuizResults = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [expandedQuestions, setExpandedQuestions] = useState(new Set());


  useEffect(() => {
    if (!sessionId || !user?.uid) {
      toast.error('Invalid session');
      navigate('/dashboard', { replace: true });
      return;
    }
    loadResults();
  }, [sessionId, user]);


  // Confetti celebration for high scores
  useEffect(() => {
    if (results) {
      const percentage = (results.session.correctAnswers / results.session.totalQuestions) * 100;
      
      if (percentage >= 90 && location.state?.justCompleted) {
        // Trigger confetti after a short delay
        setTimeout(() => {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#1f2937', '#6b7280', '#9ca3af', '#d1d5db']
          });
        }, 500);
      }
    }
  }, [results, location.state]);


  const loadResults = async () => {
    try {
      setLoading(true);
      const data = await getQuizResults(sessionId);
      
      if (!data) {
        throw new Error('Results not found');
      }
      
      setResults(data);
      console.log('Results loaded:', data);
      
    } catch (error) {
      console.error('Error loading results:', error);
      toast.error(error.message || 'Failed to load results');
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 2000);
    } finally {
      setLoading(false);
    }
  };


  const toggleQuestion = (index) => {
    setExpandedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };


  const shareResults = async () => {
    const percentage = Math.round((results.session.correctAnswers / results.session.totalQuestions) * 100);
    const shareText = `🎯 I scored ${percentage}% on "${results.quiz.title}"!\n${results.session.correctAnswers}/${results.session.totalQuestions} correct answers.\n\nChallenge yourself on Accort!`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Quiz Results',
          text: shareText,
        });
        toast.success('Shared successfully!');
      } catch (error) {
        if (error.name !== 'AbortError') {
          copyToClipboard(shareText);
        }
      }
    } else {
      copyToClipboard(shareText);
    }
  };


  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Results copied to clipboard!');
  };


  const downloadResults = () => {
    toast.success('Download feature coming soon!');
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-gray-700 rounded-full animate-spin mx-auto"></div>
          <p className="mt-6 text-gray-600 font-semibold">Loading your results...</p>
          <p className="mt-2 text-sm text-gray-400">Calculating score</p>
        </div>
      </div>
    );
  }


  if (!results) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Results Not Found</h2>
          <p className="text-gray-600 mb-6">Unable to load quiz results.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-all"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }


  const { session, quiz, questionResults } = results;
  const correctAnswers = session.correctAnswers || questionResults.filter(r => r.isCorrect).length;
  const totalQuestions = session.totalQuestions || questionResults.length;
  const percentage = Math.round((correctAnswers / totalQuestions) * 100);
  const incorrectAnswers = totalQuestions - correctAnswers;
  
  // Calculate time taken
  const startTime = session.startTime?.toDate?.() || new Date();
  const endTime = session.endTime?.toDate?.() || new Date();
  const timeTaken = Math.round((endTime - startTime) / 60000); // minutes


  const getGrade = (percentage) => {
    if (percentage >= 90) return { 
      label: 'Outstanding!', 
      color: 'text-green-700', 
      bg: 'bg-green-50',
      border: 'border-green-300',
      emoji: '🎉',
      message: 'Exceptional performance!'
    };
    if (percentage >= 80) return { 
      label: 'Excellent!', 
      color: 'text-blue-700', 
      bg: 'bg-blue-50',
      border: 'border-blue-300',
      emoji: '👏',
      message: 'Great job!'
    };
    if (percentage >= 70) return { 
      label: 'Good Work!', 
      color: 'text-yellow-700', 
      bg: 'bg-yellow-50',
      border: 'border-yellow-300',
      emoji: '👍',
      message: 'Well done!'
    };
    if (percentage >= 60) return { 
      label: 'Keep Trying!', 
      color: 'text-orange-700', 
      bg: 'bg-orange-50',
      border: 'border-orange-300',
      emoji: '💪',
      message: 'You can do better!'
    };
    return { 
      label: 'Need Practice', 
      color: 'text-red-700', 
      bg: 'bg-red-50',
      border: 'border-red-300',
      emoji: '📚',
      message: 'Keep studying!'
    };
  };


  const grade = getGrade(percentage);
  const xpEarned = session.xpAwarded || (percentage >= 60 ? Math.round(percentage / 10) * 5 : 0);


  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 py-8">
      <div className="max-w-5xl mx-auto px-4 space-y-6">
        
        {/* Hero Results Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className={`bg-white/80 backdrop-blur-sm border-2 ${grade.border} rounded-3xl p-8 shadow-2xl text-center relative overflow-hidden`}
        >
          {/* Background decoration */}
          <div className="absolute inset-0 opacity-5">
            <div className={`absolute top-0 right-0 w-64 h-64 ${grade.bg} rounded-full -translate-y-32 translate-x-32`}></div>
            <div className={`absolute bottom-0 left-0 w-64 h-64 ${grade.bg} rounded-full translate-y-32 -translate-x-32`}></div>
          </div>

          <div className="relative z-10">
            {/* Trophy Icon */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-900 to-gray-700 flex items-center justify-center mx-auto mb-6 shadow-xl"
            >
              <Trophy size={48} className="text-white" />
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-4xl md:text-5xl font-black text-gray-900 mb-3"
            >
              Quiz Complete! {grade.emoji}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className={`text-2xl font-bold ${grade.color} mb-2`}
            >
              {grade.label}
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-gray-600 font-semibold mb-8"
            >
              {grade.message}
            </motion.p>

            {/* Quiz Title */}
            <div className="mb-8 p-4 bg-gray-50 border border-gray-200 rounded-xl">
              <p className="text-sm text-gray-600 font-semibold mb-1">Quiz Taken</p>
              <p className="text-lg font-black text-gray-900">{quiz.title}</p>
            </div>

            {/* Score Display */}
            <div className="grid grid-cols-3 gap-4 md:gap-6 max-w-3xl mx-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 }}
                className="p-6 rounded-2xl bg-white border-2 border-gray-200 shadow-lg hover:shadow-xl transition-all"
              >
                <div className="text-4xl md:text-5xl font-black text-gray-900 mb-2">
                  {percentage}%
                </div>
                <div className="text-sm font-bold text-gray-600">Score</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7 }}
                className="p-6 rounded-2xl bg-white border-2 border-green-300 shadow-lg hover:shadow-xl transition-all"
              >
                <div className="text-4xl md:text-5xl font-black text-green-700 mb-2">
                  {correctAnswers}
                </div>
                <div className="text-sm font-bold text-gray-600">Correct</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8 }}
                className="p-6 rounded-2xl bg-white border-2 border-red-300 shadow-lg hover:shadow-xl transition-all"
              >
                <div className="text-4xl md:text-5xl font-black text-red-700 mb-2">
                  {incorrectAnswers}
                </div>
                <div className="text-sm font-bold text-gray-600">Incorrect</div>
              </motion.div>
            </div>

            {/* XP Earned */}
            {xpEarned > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                className="mt-8 p-6 rounded-2xl bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 shadow-lg"
              >
                <div className="flex items-center justify-center gap-4">
                  <div className="p-3 bg-yellow-100 rounded-xl border-2 border-yellow-300">
                    <Award size={32} className="text-yellow-700" />
                  </div>
                  <div className="text-left">
                    <div className="text-3xl font-black text-yellow-700">
                      +{xpEarned} XP
                    </div>
                    <div className="text-sm font-bold text-gray-600">Experience Points Earned</div>
                  </div>
                  <Sparkles size={24} className="text-yellow-600 animate-pulse" />
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
            className="bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gray-100 rounded-xl">
                <Target size={24} className="text-gray-700" />
              </div>
              <div className="flex-1">
                <div className="text-2xl font-black text-gray-900">
                  {session.totalPoints || correctAnswers}/{quiz.totalPoints || totalQuestions}
                </div>
                <div className="text-sm font-bold text-gray-600">Points Scored</div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1 }}
            className="bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Clock size={24} className="text-blue-700" />
              </div>
              <div className="flex-1">
                <div className="text-2xl font-black text-gray-900">
                  {timeTaken} min
                </div>
                <div className="text-sm font-bold text-gray-600">Time Taken</div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
            className="bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-xl">
                <TrendingUp size={24} className="text-purple-700" />
              </div>
              <div className="flex-1">
                <div className="text-2xl font-black text-gray-900">
                  {percentage}%
                </div>
                <div className="text-sm font-bold text-gray-600">Accuracy</div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3 }}
          className="bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-2xl p-6 shadow-lg"
        >
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-all shadow-md hover:scale-105"
            >
              <Brain size={18} />
              {showDetails ? 'Hide' : 'Review'} Answers
            </button>

            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-bold hover:border-gray-400 hover:shadow-md transition-all"
            >
              <Home size={18} />
              Dashboard
            </button>

            {quiz.settings?.allowRetake && (
              <button
                onClick={() => navigate(`/quiz/${quiz.id}`)}
                className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-bold hover:border-gray-400 hover:shadow-md transition-all"
              >
                <RotateCcw size={18} />
                Retake Quiz
              </button>
            )}

            <button
              onClick={shareResults}
              className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-bold hover:border-gray-400 hover:shadow-md transition-all"
            >
              <Share2 size={18} />
              Share
            </button>

            <button
              onClick={downloadResults}
              className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-bold hover:border-gray-400 hover:shadow-md transition-all"
            >
              <Download size={18} />
              Download
            </button>
          </div>
        </motion.div>

        {/* Detailed Results */}
        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-2xl p-8 shadow-lg"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gray-100 rounded-xl">
                  <Brain className="w-6 h-6 text-gray-700" />
                </div>
                <h2 className="text-2xl font-black text-gray-900">Question Review</h2>
              </div>

              <div className="space-y-4">
                {questionResults.map((result, index) => {
                  const isExpanded = expandedQuestions.has(index);
                  
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className={`border-2 rounded-2xl overflow-hidden transition-all ${
                        result.isCorrect
                          ? 'border-green-300 bg-green-50/50'
                          : 'border-red-300 bg-red-50/50'
                      }`}
                    >
                      {/* Question Header */}
                      <button
                        onClick={() => toggleQuestion(index)}
                        className="w-full p-5 flex items-center justify-between hover:bg-white/50 transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            result.isCorrect 
                              ? 'bg-green-600' 
                              : 'bg-red-600'
                          }`}>
                            {result.isCorrect ? (
                              <CheckCircle2 size={20} className="text-white" />
                            ) : (
                              <XCircle size={20} className="text-white" />
                            )}
                          </div>
                          <div className="text-left">
                            <div className="font-bold text-gray-900">
                              Question {index + 1}
                            </div>
                            <div className="text-sm text-gray-600 font-semibold">
                              {result.isCorrect ? 'Correct' : 'Incorrect'}
                            </div>
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronUp size={20} className="text-gray-600" />
                        ) : (
                          <ChevronDown size={20} className="text-gray-600" />
                        )}
                      </button>

                      {/* Expanded Content */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="border-t-2 border-gray-200"
                          >
                            <div className="p-6 space-y-4 bg-white">
                              {/* Question Text */}
                              <div>
                                <p className="text-sm font-bold text-gray-600 mb-2">Question:</p>
                                <p className="text-gray-900 font-semibold leading-relaxed">
                                  {result.question.stem}
                                </p>
                              </div>

                              {/* Your Answer */}
                              <div className={`p-4 rounded-xl border-2 ${
                                result.isCorrect 
                                  ? 'bg-green-50 border-green-300' 
                                  : 'bg-red-50 border-red-300'
                              }`}>
                                <p className="text-sm font-bold text-gray-600 mb-2">Your Answer:</p>
                                <p className="text-gray-900 font-semibold">
                                  {result.question.choices[result.userAnswer]}
                                </p>
                              </div>

                              {/* Correct Answer (if wrong) */}
                              {!result.isCorrect && (
                                <div className="p-4 rounded-xl bg-green-50 border-2 border-green-300">
                                  <p className="text-sm font-bold text-gray-600 mb-2">Correct Answer:</p>
                                  <p className="text-gray-900 font-semibold">
                                    {result.question.choices[result.correctAnswer]}
                                  </p>
                                </div>
                              )}

                              {/* Explanation */}
                              {result.explanation && (
                                <div className="p-4 rounded-xl bg-blue-50 border-2 border-blue-200">
                                  <div className="flex items-start gap-2">
                                    <Lightbulb size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                      <p className="text-sm font-bold text-gray-600 mb-2">Explanation:</p>
                                      <p className="text-sm text-gray-700 leading-relaxed">
                                        {result.explanation}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Topic Tag */}
                              {result.topic && (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-gray-500">Topic:</span>
                                  <span className="px-3 py-1 bg-gray-100 border border-gray-300 rounded-lg text-xs font-bold text-gray-700">
                                    {result.topic}
                                  </span>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};


export default QuizResults;
