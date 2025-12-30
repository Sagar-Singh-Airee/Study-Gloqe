// src/pages/QuizResults.jsx
// 🎨 ULTIMATE PREMIUM DESIGN - FULLY FIXED
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { GoogleGenerativeAI } from '@google/generative-ai';
import ReactMarkdown from 'react-markdown';
import {
  Trophy, Clock, CheckCircle2, XCircle, Home, Share2,
  Sparkles, RotateCcw, Zap, BookOpen, ArrowRight, Check,
  Target, ChevronDown, Brain, Award, TrendingUp
} from 'lucide-react';
import { useAuth } from '@auth/contexts/AuthContext';
import { getQuizResults } from '@teacher/services/quizService';
import toast from 'react-hot-toast';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

// ═════════════════════════════════════════════════════════
// LOADING STATE - Premium
// ═════════════════════════════════════════════════════════

const LoadingScreen = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center relative overflow-hidden">
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-700" />
    </div>

    <div className="text-center relative z-10">
      <div className="relative w-20 h-20 mx-auto mb-6">
        <div className="absolute inset-0 border-4 border-teal-500/20 rounded-full" />
        <div className="absolute inset-0 border-4 border-t-teal-500 border-r-teal-500 rounded-full animate-spin" />
      </div>
      <p className="text-sm font-bold text-white/80 tracking-wide">Calculating your results...</p>
    </div>
  </div>
);

// ═════════════════════════════════════════════════════════
// HERO SCORE CARD - FULLY FIXED with validation
// ═════════════════════════════════════════════════════════

const HeroScoreCard = ({ score = 0, correct = 0, total = 1, timeTaken = '0m' }) => {
  // Validate inputs
  const safeScore = typeof score === 'number' && !isNaN(score) ? Math.round(score) : 0;
  const safeCorrect = typeof correct === 'number' && !isNaN(correct) ? correct : 0;
  const safeTotal = typeof total === 'number' && !isNaN(total) && total > 0 ? total : 1;
  const safeTime = timeTaken || '0m';

  const getPerformance = () => {
    if (safeScore >= 90) return {
      grade: 'Outstanding!',
      emoji: '🏆',
      color1: '#fbbf24',
      color2: '#f59e0b',
      bgGradient: 'from-amber-500/10 via-orange-500/10 to-yellow-500/10',
      textColor: 'text-amber-600',
      glowColor: 'shadow-amber-500/20'
    };
    if (safeScore >= 80) return {
      grade: 'Excellent!',
      emoji: '⭐',
      color1: '#14b8a6',
      color2: '#06b6d4',
      bgGradient: 'from-teal-500/10 via-cyan-500/10 to-blue-500/10',
      textColor: 'text-teal-600',
      glowColor: 'shadow-teal-500/20'
    };
    if (safeScore >= 70) return {
      grade: 'Well Done!',
      emoji: '✨',
      color1: '#3b82f6',
      color2: '#6366f1',
      bgGradient: 'from-blue-500/10 via-indigo-500/10 to-purple-500/10',
      textColor: 'text-blue-600',
      glowColor: 'shadow-blue-500/20'
    };
    if (safeScore >= 60) return {
      grade: 'Good Effort!',
      emoji: '💪',
      color1: '#8b5cf6',
      color2: '#a855f7',
      bgGradient: 'from-purple-500/10 via-violet-500/10 to-fuchsia-500/10',
      textColor: 'text-purple-600',
      glowColor: 'shadow-purple-500/20'
    };
    return {
      grade: 'Keep Practicing!',
      emoji: '📚',
      color1: '#64748b',
      color2: '#475569',
      bgGradient: 'from-slate-500/10 via-gray-500/10 to-zinc-500/10',
      textColor: 'text-slate-600',
      glowColor: 'shadow-slate-500/20'
    };
  };

  const perf = getPerformance();
  const radius = 85;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (safeScore / 100) * circumference;
  const accuracy = safeTotal > 0 ? Math.round((safeCorrect / safeTotal) * 100) : 0;

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ duration: 0.6, type: 'spring', bounce: 0.4 }}
      className={`relative bg-gradient-to-br ${perf.bgGradient} backdrop-blur-xl rounded-3xl p-10 overflow-hidden border border-white/20 shadow-2xl ${perf.glowColor}`}
    >
      {/* Premium background patterns */}
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:20px_20px]" />
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-white/10 to-transparent rounded-full blur-3xl -mr-32 -mt-32" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-white/10 to-transparent rounded-full blur-3xl -ml-24 -mb-24" />

      <div className="relative">
        {/* Premium Grade Badge */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="inline-flex items-center gap-3 px-5 py-2.5 bg-white/90 backdrop-blur-md rounded-full mb-8 shadow-lg border border-white/40"
        >
          <span className="text-3xl">{perf.emoji}</span>
          <span className={`font-black text-xl ${perf.textColor}`}>{perf.grade}</span>
        </motion.div>

        {/* Score Display */}
        <div className="flex items-center gap-12">
          {/* Circular Progress - FIXED with unique IDs */}
          <div className="relative">
            <svg className="transform -rotate-90 drop-shadow-2xl" width="200" height="200">
              <defs>
                {/* FIXED: Unique gradient ID per component instance */}
                <linearGradient id={`scoreGradient-${safeScore}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: perf.color1, stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: perf.color2, stopOpacity: 1 }} />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Background circle */}
              <circle
                cx="100"
                cy="100"
                r={radius}
                stroke="#e5e7eb"
                strokeWidth="14"
                fill="transparent"
                opacity="0.2"
              />

              {/* Progress circle */}
              <motion.circle
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 2, ease: 'easeOut', delay: 0.5 }}
                cx="100"
                cy="100"
                r={radius}
                stroke={`url(#scoreGradient-${safeScore})`}
                strokeWidth="14"
                fill="transparent"
                strokeDasharray={circumference}
                strokeLinecap="round"
                filter="url(#glow)"
              />
            </svg>

            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.8, type: 'spring', bounce: 0.5 }}
                className="text-6xl font-black bg-gradient-to-br from-slate-900 to-slate-700 bg-clip-text text-transparent"
              >
                {safeScore}
              </motion.span>
              <span className="text-2xl font-bold text-slate-400">%</span>
            </div>
          </div>

          {/* Premium Stats Grid */}
          <div className="flex-1 space-y-4">
            <motion.div
              initial={{ x: 30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex items-center justify-between p-4 bg-white/70 backdrop-blur-md rounded-2xl border border-white/40 shadow-lg hover:shadow-xl transition-shadow group"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <CheckCircle2 size={20} className="text-white" />
                </div>
                <span className="text-sm font-bold text-slate-700">Correct Answers</span>
              </div>
              <span className="text-2xl font-black text-slate-900">{safeCorrect}<span className="text-slate-400">/{safeTotal}</span></span>
            </motion.div>

            <motion.div
              initial={{ x: 30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="flex items-center justify-between p-4 bg-white/70 backdrop-blur-md rounded-2xl border border-white/40 shadow-lg hover:shadow-xl transition-shadow group"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Clock size={20} className="text-white" />
                </div>
                <span className="text-sm font-bold text-slate-700">Time Taken</span>
              </div>
              <span className="text-2xl font-black text-slate-900">{safeTime}</span>
            </motion.div>

            <motion.div
              initial={{ x: 30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="flex items-center justify-between p-4 bg-white/70 backdrop-blur-md rounded-2xl border border-white/40 shadow-lg hover:shadow-xl transition-shadow group"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Target size={20} className="text-white" />
                </div>
                <span className="text-sm font-bold text-slate-700">Accuracy</span>
              </div>
              <span className="text-2xl font-black text-slate-900">
                {accuracy}<span className="text-slate-400">%</span>
              </span>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ═════════════════════════════════════════════════════════
// ACTION BUTTONS - Premium
// ═════════════════════════════════════════════════════════

const ActionButtons = ({ onShare, onRetake, copied }) => (
  <motion.div
    initial={{ y: 20, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    transition={{ delay: 0.9 }}
    className="flex gap-4"
  >
    <button
      onClick={onShare}
      className="flex-1 flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-600 text-white rounded-2xl font-bold hover:from-teal-600 hover:via-cyan-600 hover:to-blue-700 transition-all shadow-xl hover:shadow-2xl hover:scale-105 group relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform" />
      <div className="relative flex items-center gap-3">
        {copied ? <Check size={20} /> : <Share2 size={20} />}
        <span className="text-lg">{copied ? 'Copied!' : 'Share Result'}</span>
      </div>
    </button>

    <button
      onClick={onRetake}
      className="flex items-center justify-center gap-3 px-8 py-4 bg-white text-slate-800 rounded-2xl font-bold hover:bg-slate-50 transition-all border-2 border-slate-200 hover:border-slate-300 shadow-xl hover:shadow-2xl hover:scale-105 group relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-slate-50 to-slate-100 translate-y-full group-hover:translate-y-0 transition-transform" />
      <div className="relative flex items-center gap-3">
        <RotateCcw size={20} className="group-hover:rotate-180 transition-transform duration-700" />
        <span className="text-lg">Retake Quiz</span>
      </div>
    </button>
  </motion.div>
);

// ═════════════════════════════════════════════════════════
// AI INSIGHTS - Premium Design
// ═════════════════════════════════════════════════════════

const AIInsights = ({ isAnalyzing, aiAnalysis, onGenerate }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 1 }}
      className="bg-gradient-to-br from-white to-slate-50 rounded-2xl border border-slate-200/60 overflow-hidden shadow-lg hover:shadow-xl transition-all"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-5 flex items-center justify-between hover:bg-white/60 transition-colors group"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-purple-600 via-violet-600 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <Brain size={24} className="text-white" />
          </div>
          <div className="text-left">
            <h3 className="font-black text-lg text-slate-900">AI Performance Coach</h3>
            <p className="text-sm text-slate-500 font-medium">Get personalized insights & recommendations</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-purple-600 bg-purple-100 px-3 py-1 rounded-full">Premium</span>
          <ChevronDown
            size={20}
            className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="p-6 border-t border-slate-200 bg-gradient-to-br from-slate-50 to-white">
              {isAnalyzing ? (
                <div className="flex items-center gap-4 py-6">
                  <div className="relative w-6 h-6">
                    <div className="absolute inset-0 border-3 border-purple-200 rounded-full" />
                    <div className="absolute inset-0 border-3 border-t-purple-600 border-r-purple-600 rounded-full animate-spin" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">Analyzing your performance...</p>
                    <p className="text-sm text-slate-500">Our AI is reviewing your answers</p>
                  </div>
                </div>
              ) : aiAnalysis ? (
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown
                    components={{
                      h2: ({ children }) => (
                        <h4 className="text-sm font-black text-slate-900 mt-4 mb-2 first:mt-0">{children}</h4>
                      ),
                      ul: ({ children }) => (
                        <ul className="space-y-2 mb-4">{children}</ul>
                      ),
                      li: ({ children }) => (
                        <li className="flex items-start gap-2 text-sm text-slate-700">
                          <span className="text-purple-500 mt-1">•</span>
                          <span>{children}</span>
                        </li>
                      ),
                      p: ({ children }) => (
                        <p className="text-sm text-slate-700 mb-3 leading-relaxed">{children}</p>
                      ),
                      ol: ({ children }) => (
                        <ol className="space-y-2 mb-4 list-decimal list-inside">{children}</ol>
                      )
                    }}
                  >
                    {aiAnalysis}
                  </ReactMarkdown>
                </div>
              ) : (
                <button
                  onClick={onGenerate}
                  className="w-full p-4 bg-gradient-to-r from-purple-600 via-violet-600 to-pink-600 text-white rounded-xl font-bold hover:from-purple-700 hover:via-violet-700 hover:to-pink-700 transition-all flex items-center justify-center gap-3 shadow-lg hover:shadow-xl hover:scale-105 group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-white/20 translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
                  <div className="relative flex items-center gap-3">
                    <Sparkles size={20} className="animate-pulse" />
                    <span className="text-lg">Generate AI Insights</span>
                  </div>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ═════════════════════════════════════════════════════════
// QUESTION REVIEW CARD - Premium
// ═════════════════════════════════════════════════════════

const QuestionReviewCard = ({ question, index, isExpanded, onToggle }) => {
  const qNum = index + 1;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className={`bg-white rounded-2xl border-2 overflow-hidden transition-all ${question.isCorrect
          ? 'border-teal-200 hover:border-teal-300 hover:shadow-teal-100'
          : 'border-rose-200 hover:border-rose-300 hover:shadow-rose-100'
        } ${isExpanded ? 'shadow-xl' : 'shadow-md hover:shadow-lg'}`}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-5 p-5 text-left hover:bg-slate-50/50 transition-colors"
      >
        <div
          className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-black text-white shadow-lg ${question.isCorrect ? 'bg-gradient-to-br from-teal-500 to-emerald-500' : 'bg-gradient-to-br from-rose-500 to-red-500'
            }`}
        >
          {question.isCorrect ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-2">
            <span className="text-xs font-black text-slate-500 tracking-wider uppercase">Question {qNum}</span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-black shadow-sm ${question.isCorrect
                  ? 'bg-teal-100 text-teal-700'
                  : 'bg-rose-100 text-rose-700'
                }`}
            >
              {question.isCorrect ? '✓ Correct' : '✗ Incorrect'}
            </span>
          </div>
          <p className="text-base font-bold text-slate-900 leading-snug">
            {question.stem}
          </p>
        </div>

        <ChevronDown
          size={20}
          className={`text-slate-400 transition-transform flex-shrink-0 mt-3 ${isExpanded ? 'rotate-180' : ''
            }`}
        />
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-3 border-t border-slate-100 pt-4 bg-slate-50/30">
              {question.choices.map((choice, idx) => {
                const isUser = question.userAnswer === idx;
                const isCorrectAns = question.correctAnswer === idx;

                let bgClass = 'bg-white border-slate-200';
                let iconColor = 'text-slate-400';

                if (isCorrectAns) {
                  bgClass = 'bg-gradient-to-br from-teal-50 to-emerald-50 border-teal-300';
                  iconColor = 'text-teal-600';
                }
                if (isUser && !isCorrectAns) {
                  bgClass = 'bg-gradient-to-br from-rose-50 to-red-50 border-rose-300';
                  iconColor = 'text-rose-600';
                }

                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border-2 flex items-center gap-4 ${bgClass} transition-all hover:scale-[1.02]`}
                  >
                    <span className={`w-9 h-9 rounded-lg bg-white border-2 flex items-center justify-center font-black text-sm ${iconColor} flex-shrink-0 shadow-sm`}>
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="flex-1 text-sm font-semibold text-slate-900">
                      {choice}
                    </span>
                    {isCorrectAns && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs font-bold text-teal-700 bg-teal-100 px-2 py-1 rounded-full">Correct</span>
                        <CheckCircle2 size={18} className="text-teal-600" />
                      </div>
                    )}
                    {isUser && !isCorrectAns && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs font-bold text-rose-700 bg-rose-100 px-2 py-1 rounded-full">Your Answer</span>
                        <XCircle size={18} className="text-rose-600" />
                      </div>
                    )}
                  </div>
                );
              })}

              {question.explanation && (
                <div className="mt-4 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200/60 shadow-sm">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md">
                      <Sparkles size={16} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-black text-blue-900 text-sm mb-1.5">Explanation</h4>
                      <p className="text-sm text-blue-800 leading-relaxed">
                        {question.explanation}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ═════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════

const QuizResults = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [expandedQ, setExpandedQ] = useState(null);
  const [copied, setCopied] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // ═══ COMPUTE STATS FIRST (moved up to avoid undefined access)
  const stats = useMemo(() => {
    if (!data) return null;

    const { session, questions } = data;
    const correct = questions.filter(q => q.isCorrect).length;
    const total = questions.length;

    // Fixed time calculation
    let timeTakenMin = 0;
    if (session.startTime && session.endTime) {
      const start = session.startTime instanceof Date
        ? session.startTime
        : new Date(session.startTime.seconds * 1000);
      const end = session.endTime instanceof Date
        ? session.endTime
        : new Date(session.endTime.seconds * 1000);

      timeTakenMin = Math.max(0, Math.round((end - start) / 60000));
    }

    // Format time display
    let timeDisplay = '';
    if (timeTakenMin < 1) {
      timeDisplay = '< 1m';
    } else if (timeTakenMin < 60) {
      timeDisplay = `${timeTakenMin}m`;
    } else {
      const hours = Math.floor(timeTakenMin / 60);
      const mins = timeTakenMin % 60;
      timeDisplay = `${hours}h ${mins}m`;
    }

    return {
      correct,
      total,
      timeTaken: timeDisplay,
      incorrect: total - correct
    };
  }, [data]);

  // ═══ FETCH RESULTS ═══
  useEffect(() => {
    if (!sessionId || !user?.uid) return;

    const fetchResults = async () => {
      try {
        const resultData = await getQuizResults(sessionId);
        setData(resultData);

        if (location.state?.justCompleted && resultData.session.score >= 75) {
          setTimeout(() => triggerConfetti(), 800);
        }
      } catch (error) {
        console.error('Failed to load results:', error);
        toast.error('Failed to load results');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [sessionId, user, navigate, location]);

  // ═══ AI ANALYSIS ═══
  const generateAiAnalysis = useCallback(async (resultData) => {
    if (!resultData || !stats) return;

    try {
      setIsAnalyzing(true);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

      const wrongAnswers = resultData.questions
        .filter(q => !q.isCorrect)
        .slice(0, 3)
        .map(q => q.topic || 'General');

      const prompt = `Analyze this quiz performance and provide brief, motivating feedback:

Score: ${resultData.session.score}%
Correct: ${stats.correct}/${stats.total}
Weak topics: ${wrongAnswers.join(', ') || 'None'}

Provide in this format:
## 🎯 Performance Summary
[1 encouraging sentence about overall performance]

## 💪 Your Strengths  
- [1-2 specific strengths based on the score]

## 🎯 Areas to Improve
- [1-2 specific, actionable focus areas]

## 📚 Next Steps
1. [1 specific, practical action they can take]

Keep it under 100 words. Be motivating and specific.`;

      const result = await model.generateContent(prompt);
      setAiAnalysis(result.response.text());
    } catch (error) {
      console.error('AI failed:', error);
      toast.error('Failed to generate AI insights');
      setAiAnalysis('');
    } finally {
      setIsAnalyzing(false);
    }
  }, [stats]);

  // ═══ PREMIUM CONFETTI ═══
  const triggerConfetti = () => {
    const duration = 3000;
    const end = Date.now() + duration;
    const colors = ['#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef'];

    (function frame() {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 60,
        origin: { x: 0, y: 0.6 },
        colors,
        ticks: 200,
        gravity: 1.2,
        decay: 0.94,
        startVelocity: 30,
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 60,
        origin: { x: 1, y: 0.6 },
        colors,
        ticks: 200,
        gravity: 1.2,
        decay: 0.94,
        startVelocity: 30,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  };

  // ═══ SHARE ═══
  const handleShare = async () => {
    if (!data || !stats) return;

    const text = `🎯 I scored ${data.session.score}% on "${data.quizTitle}"!\n✅ ${stats.correct}/${stats.total} correct answers`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'My Quiz Result', text });
        return;
      } catch (e) {
        // Fall through to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copied to clipboard!', {
        icon: '📋',
        style: {
          borderRadius: '12px',
          background: '#333',
          color: '#fff',
        },
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  // ═══ FILTER QUESTIONS ═══
  const filteredQuestions = useMemo(() => {
    if (!data) return [];
    return filter === 'all'
      ? data.questions
      : data.questions.filter(q => !q.isCorrect);
  }, [data, filter]);

  if (loading) return <LoadingScreen />;
  if (!data || !stats) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 relative">
      {/* Premium background pattern */}
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] bg-[size:30px_30px]" />

      {/* ═══ PREMIUM HEADER ═══ */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-bold transition-all group bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl"
            >
              <Home size={18} className="group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm">Dashboard</span>
            </button>

            <div className="flex items-center gap-3">
              <Award size={20} className="text-teal-600" />
              <h1 className="text-base font-black text-slate-900 truncate max-w-md">
                {data.quizTitle}
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ MAIN CONTENT ═══ */}
      <div className="relative max-w-5xl mx-auto px-6 py-10 space-y-8">
        {/* Hero Score - Now with safe props */}
        <HeroScoreCard
          score={data.session.score}
          correct={stats.correct}
          total={stats.total}
          timeTaken={stats.timeTaken}
        />

        {/* Actions */}
        <ActionButtons
          onShare={handleShare}
          onRetake={() => navigate(`/quiz/${data.session.quizId}`)}
          copied={copied}
        />

        {/* AI Insights */}
        <AIInsights
          isAnalyzing={isAnalyzing}
          aiAnalysis={aiAnalysis}
          onGenerate={() => generateAiAnalysis(data)}
        />

        {/* Questions Review */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.1 }}
          className="space-y-5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-gradient-to-br from-slate-900 to-slate-700 rounded-xl flex items-center justify-center shadow-lg">
                <BookOpen size={20} className="text-white" />
              </div>
              <div>
                <h2 className="font-black text-xl text-slate-900">Review Answers</h2>
                <p className="text-sm text-slate-500 font-medium">Analyze your performance</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border-2 border-slate-200 p-1.5 inline-flex shadow-md">
              <button
                onClick={() => setFilter('all')}
                className={`px-5 py-2 rounded-lg text-sm font-black transition-all ${filter === 'all'
                    ? 'bg-gradient-to-r from-slate-900 to-slate-700 text-white shadow-lg'
                    : 'text-slate-600 hover:bg-slate-50'
                  }`}
              >
                All ({stats.total})
              </button>
              <button
                onClick={() => setFilter('incorrect')}
                className={`px-5 py-2 rounded-lg text-sm font-black transition-all ${filter === 'incorrect'
                    ? 'bg-gradient-to-r from-rose-500 to-red-500 text-white shadow-lg'
                    : 'text-slate-600 hover:bg-slate-50'
                  }`}
              >
                Wrong ({stats.incorrect})
              </button>
            </div>
          </div>

          {/* Questions List */}
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {filteredQuestions.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-20 bg-gradient-to-br from-teal-50 to-emerald-50 rounded-3xl border-2 border-dashed border-teal-300"
                >
                  <Trophy className="text-teal-500 mx-auto mb-4 drop-shadow-lg" size={56} />
                  <h3 className="text-2xl font-black text-slate-900 mb-2">Perfect Score! 🎉</h3>
                  <p className="text-sm text-slate-600 font-medium">No mistakes to review - you nailed it!</p>
                </motion.div>
              ) : (
                filteredQuestions.map((q, idx) => (
                  <QuestionReviewCard
                    key={idx}
                    question={q}
                    index={data.questions.findIndex(oq => oq.stem === q.stem)}
                    isExpanded={expandedQ === idx}
                    onToggle={() => setExpandedQ(expandedQ === idx ? null : idx)}
                  />
                ))
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Premium Footer CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="mt-16 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-12 text-center relative overflow-hidden shadow-2xl"
        >
          {/* Animated background */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-500 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500 rounded-full blur-3xl animate-pulse delay-700" />
          </div>

          <div className="relative">
            <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
              <Zap size={32} className="text-white" />
            </div>
            <h3 className="text-3xl font-black text-white mb-3">
              Ready for Your Next Challenge?
            </h3>
            <p className="text-slate-300 mb-8 text-base max-w-md mx-auto font-medium">
              Continue your learning journey with more quizzes tailored to your level
            </p>

            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-3 px-10 py-4 bg-white text-slate-900 rounded-2xl font-black text-lg hover:bg-slate-100 transition-all shadow-2xl hover:shadow-3xl hover:scale-105 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-teal-400/20 to-blue-400/20 translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
              <span className="relative">Explore More Quizzes</span>
              <ArrowRight size={20} className="relative group-hover:translate-x-2 transition-transform" />
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default QuizResults;
