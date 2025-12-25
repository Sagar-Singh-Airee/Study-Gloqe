// src/pages/QuizResults.jsx
// 🎨 ULTIMATE MODERN DESIGN - Inspired by Duolingo + Kahoot
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { GoogleGenerativeAI } from '@google/generative-ai';
import ReactMarkdown from 'react-markdown';
import {
  Trophy, Clock, CheckCircle2, XCircle, Home, Share2,
  Sparkles, RotateCcw, Zap, BookOpen, ArrowRight, Check,
  Target, ChevronDown, Brain
} from 'lucide-react';
import { useAuth } from '@auth/contexts/AuthContext';
import { getQuizResults } from '@teacher/services/quizService';
import toast from 'react-hot-toast';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

// ═════════════════════════════════════════════════════════
// LOADING STATE
// ═════════════════════════════════════════════════════════

const LoadingScreen = () => (
  <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p className="text-sm font-semibold text-slate-600">Loading results...</p>
    </div>
  </div>
);

// ═════════════════════════════════════════════════════════
// HERO SCORE CARD (Duolingo-inspired)
// ═════════════════════════════════════════════════════════

const HeroScoreCard = ({ score, correct, total, timeTaken }) => {
  const getPerformance = () => {
    if (score >= 90) return {
      grade: 'Amazing!',
      emoji: '🎉',
      color: 'from-yellow-400 to-orange-500',
      bgColor: 'from-yellow-50 to-orange-50',
      textColor: 'text-yellow-700'
    };
    if (score >= 80) return {
      grade: 'Great Job!',
      emoji: '⭐',
      color: 'from-teal-400 to-cyan-500',
      bgColor: 'from-teal-50 to-cyan-50',
      textColor: 'text-teal-700'
    };
    if (score >= 70) return {
      grade: 'Good Work!',
      emoji: '✨',
      color: 'from-blue-400 to-indigo-500',
      bgColor: 'from-blue-50 to-indigo-50',
      textColor: 'text-blue-700'
    };
    if (score >= 60) return {
      grade: 'Keep Going!',
      emoji: '💪',
      color: 'from-purple-400 to-pink-500',
      bgColor: 'from-purple-50 to-pink-50',
      textColor: 'text-purple-700'
    };
    return {
      grade: 'Try Again!',
      emoji: '📚',
      color: 'from-slate-400 to-slate-500',
      bgColor: 'from-slate-50 to-slate-100',
      textColor: 'text-slate-700'
    };
  };

  const perf = getPerformance();
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5, type: 'spring' }}
      className={`relative bg-gradient-to-br ${perf.bgColor} rounded-2xl p-8 overflow-hidden border-2 border-white shadow-xl`}
    >
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/30 rounded-full -mr-16 -mt-16" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/20 rounded-full -ml-12 -mb-12" />

      <div className="relative">
        {/* Grade Badge */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur rounded-full mb-6 shadow-sm"
        >
          <span className="text-2xl">{perf.emoji}</span>
          <span className={`font-black text-lg ${perf.textColor}`}>{perf.grade}</span>
        </motion.div>

        {/* Score Display */}
        <div className="flex items-center gap-8">
          {/* Circular Progress */}
          <div className="relative">
            <svg className="transform -rotate-90" width="180" height="180">
              <circle
                cx="90"
                cy="90"
                r={radius}
                stroke="#e5e7eb"
                strokeWidth="12"
                fill="transparent"
              />
              <motion.circle
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
                cx="90"
                cy="90"
                r={radius}
                stroke="url(#scoreGradient)"
                strokeWidth="12"
                fill="transparent"
                strokeDasharray={circumference}
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" className={`${perf.color.split(' ')[0].replace('from-', 'stop-color-')}`} />
                  <stop offset="100%" className={`${perf.color.split(' ')[2].replace('to-', 'stop-color-')}`} />
                </linearGradient>
              </defs>
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.6, type: 'spring' }}
                className="text-5xl font-black text-slate-900"
              >
                {score}%
              </motion.span>
            </div>
          </div>

          {/* Stats */}
          <div className="flex-1 space-y-3">
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex items-center justify-between p-3 bg-white/60 backdrop-blur rounded-xl"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-teal-600" />
                <span className="text-sm font-semibold text-slate-700">Correct</span>
              </div>
              <span className="text-xl font-black text-slate-900">{correct}/{total}</span>
            </motion.div>

            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex items-center justify-between p-3 bg-white/60 backdrop-blur rounded-xl"
            >
              <div className="flex items-center gap-2">
                <Clock size={18} className="text-blue-600" />
                <span className="text-sm font-semibold text-slate-700">Time</span>
              </div>
              <span className="text-xl font-black text-slate-900">{timeTaken}</span>
            </motion.div>

            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex items-center justify-between p-3 bg-white/60 backdrop-blur rounded-xl"
            >
              <div className="flex items-center gap-2">
                <Target size={18} className="text-purple-600" />
                <span className="text-sm font-semibold text-slate-700">Accuracy</span>
              </div>
              <span className="text-xl font-black text-slate-900">
                {Math.round((correct / total) * 100)}%
              </span>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ═════════════════════════════════════════════════════════
// ACTION BUTTONS
// ═════════════════════════════════════════════════════════

const ActionButtons = ({ onShare, onRetake, copied }) => (
  <motion.div
    initial={{ y: 20, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    transition={{ delay: 0.7 }}
    className="flex gap-3"
  >
    <button
      onClick={onShare}
      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-blue-600 text-white rounded-xl font-bold hover:from-teal-600 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl group"
    >
      {copied ? <Check size={18} /> : <Share2 size={18} />}
      <span>{copied ? 'Copied!' : 'Share Result'}</span>
    </button>

    <button
      onClick={onRetake}
      className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-all border-2 border-slate-200 hover:border-slate-300 group"
    >
      <RotateCcw size={18} className="group-hover:rotate-180 transition-transform duration-500" />
      <span>Retake Quiz</span>
    </button>
  </motion.div>
);

// ═════════════════════════════════════════════════════════
// AI INSIGHTS (Minimalist)
// ═════════════════════════════════════════════════════════

const AIInsights = ({ isAnalyzing, aiAnalysis, onGenerate }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.8 }}
      className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
            <Brain size={20} className="text-white" />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-slate-900">AI Coach</h3>
            <p className="text-xs text-slate-500">Get personalized tips</p>
          </div>
        </div>
        <ChevronDown
          size={18}
          className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 border-t border-slate-100 bg-slate-50">
              {isAnalyzing ? (
                <div className="flex items-center gap-3 py-4">
                  <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-slate-600">Analyzing your performance...</span>
                </div>
              ) : aiAnalysis ? (
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown
                    components={{
                      h2: ({ children }) => (
                        <h4 className="text-xs font-bold text-slate-900 mt-2 mb-1">{children}</h4>
                      ),
                      ul: ({ children }) => (
                        <ul className="space-y-1 list-disc list-inside text-xs text-slate-600">
                          {children}
                        </ul>
                      ),
                      li: ({ children }) => (
                        <li className="text-xs text-slate-600">{children}</li>
                      ),
                      p: ({ children }) => (
                        <p className="text-xs text-slate-600 mb-2">{children}</p>
                      )
                    }}
                  >
                    {aiAnalysis}
                  </ReactMarkdown>
                </div>
              ) : (
                <button
                  onClick={onGenerate}
                  className="w-full p-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-sm font-bold hover:from-purple-600 hover:to-pink-600 transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles size={16} />
                  Generate AI Insights
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
// QUESTION REVIEW CARD (Clean & Simple)
// ═════════════════════════════════════════════════════════

const QuestionReviewCard = ({ question, index, isExpanded, onToggle }) => {
  const qNum = index + 1;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`bg-white rounded-xl border-2 overflow-hidden transition-all ${question.isCorrect
          ? 'border-teal-200 hover:border-teal-300'
          : 'border-red-200 hover:border-red-300'
        } ${isExpanded ? 'shadow-lg' : 'shadow-sm hover:shadow-md'}`}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-4 p-4 text-left hover:bg-slate-50/50 transition-colors"
      >
        <div
          className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white ${question.isCorrect ? 'bg-teal-500' : 'bg-red-500'
            }`}
        >
          {question.isCorrect ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <span className="text-xs font-bold text-slate-500">Question {qNum}</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-bold ${question.isCorrect
                  ? 'bg-teal-100 text-teal-700'
                  : 'bg-red-100 text-red-700'
                }`}
            >
              {question.isCorrect ? 'Correct' : 'Wrong'}
            </span>
          </div>
          <p className="text-sm font-semibold text-slate-900 leading-snug">
            {question.stem}
          </p>
        </div>

        <ChevronDown
          size={18}
          className={`text-slate-400 transition-transform flex-shrink-0 mt-2 ${isExpanded ? 'rotate-180' : ''
            }`}
        />
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2 border-t border-slate-100 pt-3">
              {question.choices.map((choice, idx) => {
                const isUser = question.userAnswer === idx;
                const isCorrectAns = question.correctAnswer === idx;

                let bgClass = 'bg-slate-50 border-slate-200';
                if (isCorrectAns) bgClass = 'bg-teal-50 border-teal-300';
                if (isUser && !isCorrectAns) bgClass = 'bg-red-50 border-red-300';

                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border-2 flex items-center gap-3 ${bgClass}`}
                  >
                    <span className="w-7 h-7 rounded-lg bg-white border border-slate-300 flex items-center justify-center font-bold text-xs text-slate-600 flex-shrink-0">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="flex-1 text-sm font-medium text-slate-900">
                      {choice}
                    </span>
                    {isCorrectAns && (
                      <CheckCircle2 size={16} className="text-teal-600 flex-shrink-0" />
                    )}
                    {isUser && !isCorrectAns && (
                      <XCircle size={16} className="text-red-600 flex-shrink-0" />
                    )}
                  </div>
                );
              })}

              {question.explanation && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex gap-2">
                    <Sparkles size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-blue-900 text-xs mb-1">Explanation</h4>
                      <p className="text-xs text-blue-800 leading-relaxed">
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
    if (!resultData) return;

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
## 🎯 Summary
[1 encouraging sentence]

## 💪 Strengths  
- [1 strength]

## 🎯 Improve
- [1-2 focus areas]

## 📚 Next Step
1. [1 specific action]

Max 80 words. Be brief and motivating.`;

      const result = await model.generateContent(prompt);
      setAiAnalysis(result.response.text());
    } catch (error) {
      console.error('AI failed:', error);
      setAiAnalysis('');
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  // ═══ CONFETTI ═══
  const triggerConfetti = () => {
    const duration = 2000;
    const end = Date.now() + duration;

    const colors = ['#14b8a6', '#2563eb', '#8b5cf6', '#f59e0b'];

    (function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        colors,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        colors,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  };

  // ═══ SHARE ═══
  const handleShare = async () => {
    const text = `🎯 I scored ${data.session.score}% on "${data.quizTitle}"!\n✅ ${stats.correct}/${stats.total} correct`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'My Quiz Result', text });
        return;
      } catch (e) {
        // Fall through to clipboard
      }
    }

    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  // ═══ COMPUTE STATS ═══
  const stats = useMemo(() => {
    if (!data) return null;

    const { session, questions } = data;
    const correct = questions.filter(q => q.isCorrect).length;
    const total = questions.length;

    // FIX: Better time calculation
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

    // Format time nicely
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* ═══ HEADER ═══ */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-semibold transition-colors group"
            >
              <Home size={18} className="group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm">Back to Dashboard</span>
            </button>

            <h1 className="text-sm font-bold text-slate-900 truncate max-w-xs">
              {data.quizTitle}
            </h1>
          </div>
        </div>
      </div>

      {/* ═══ MAIN CONTENT ═══ */}
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Hero Score */}
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
          transition={{ delay: 0.9 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen size={20} className="text-slate-600" />
              <h2 className="font-black text-lg text-slate-900">Review Answers</h2>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-1 inline-flex shadow-sm">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${filter === 'all'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50'
                  }`}
              >
                All ({stats.total})
              </button>
              <button
                onClick={() => setFilter('incorrect')}
                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${filter === 'incorrect'
                    ? 'bg-red-500 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50'
                  }`}
              >
                Wrong ({stats.incorrect})
              </button>
            </div>
          </div>

          {/* Questions List */}
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filteredQuestions.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-slate-200"
                >
                  <Trophy className="text-teal-500 mx-auto mb-4" size={48} />
                  <h3 className="text-lg font-bold text-slate-900 mb-1">Perfect Score! 🎉</h3>
                  <p className="text-sm text-slate-500">No mistakes to review</p>
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

        {/* Footer CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-12 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-10 text-center relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 to-blue-500/10" />

          <div className="relative">
            <Zap size={32} className="text-teal-400 mx-auto mb-4" />
            <h3 className="text-2xl font-black text-white mb-2">
              Ready for More?
            </h3>
            <p className="text-slate-300 mb-6 text-sm">
              Challenge yourself with another quiz
            </p>

            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-2 px-8 py-3 bg-white text-slate-900 rounded-xl font-bold hover:bg-slate-100 transition-all shadow-xl hover:shadow-2xl group"
            >
              <span>Explore Quizzes</span>
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default QuizResults;