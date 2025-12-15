// src/pages/QuizResults.jsx
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { GoogleGenerativeAI } from '@google/generative-ai';
import ReactMarkdown from 'react-markdown';
import {
  Trophy,
  Clock,
  CheckCircle2,
  XCircle,
  Home,
  Share2,
  Brain,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Sparkles,
  RotateCcw,
  Target,
  Zap,
  BookOpen,
  ArrowRight,
  Copy,
  Check,
  TrendingUp,
  Award,
  BarChart3,
  AlertCircle,
  Flame
} from 'lucide-react';
import { useAuth } from '@auth/contexts/AuthContext';
import { getQuizResults } from '@teacher/services/quizService';
import toast from 'react-hot-toast';

// Your Logo
import LogoImage from '@assets/logo/logox.png';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

// ============================================
// SKELETON LOADER
// ============================================

const SkeletonLoader = () => (
  <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="h-10 w-32 bg-gray-200 rounded-lg mb-12 animate-pulse" />
      
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="h-40 bg-gray-200 rounded-3xl animate-pulse" />
          <div className="h-64 bg-gray-200 rounded-3xl animate-pulse" />
        </div>
        <div className="h-96 bg-gray-200 rounded-3xl animate-pulse" />
      </div>
    </div>
  </div>
);

// ============================================
// CIRCULAR PROGRESS COMPONENT
// ============================================

const CircularProgress = ({ score, size = 200 }) => {
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  
  const getColor = () => {
    if (score >= 90) return { stroke: '#10B981', glow: '#10B9815c' };
    if (score >= 70) return { stroke: '#3B82F6', glow: '#3B82F65c' };
    if (score >= 50) return { stroke: '#F59E0B', glow: '#F59E0B5c' };
    return { stroke: '#EF4444', glow: '#EF44445c' };
  };
  
  const colors = getColor();

  return (
    <div className="relative w-full flex justify-center" style={{ width: size, height: size, margin: '0 auto' }}>
      <svg className="transform -rotate-90 drop-shadow-lg" width={size} height={size}>
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#F3F4F6"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        
        <motion.circle
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 2, ease: "easeOut", delay: 0.3 }}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.stroke}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeLinecap="round"
          filter="url(#glow)"
        />
      </svg>
      
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 1 }}
          className="text-center"
        >
          <span className="text-6xl font-black text-gray-900">{score}</span>
          <span className="text-2xl font-bold text-gray-400 block">%</span>
        </motion.div>
      </div>
    </div>
  );
};

// ============================================
// STATS CARD COMPONENT
// ============================================

const MetricCard = ({ icon: Icon, label, value, subtext, color, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4 }}
    className={`bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all group overflow-hidden relative`}
  >
    <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-5 transition-opacity" style={{ backgroundImage: `linear-gradient(135deg, ${color} 0%, transparent 100%)` }} />
    
    <div className="relative flex items-start justify-between">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-3xl font-black text-gray-900">{value}</span>
        </div>
        <p className="text-sm font-bold text-gray-600 uppercase tracking-wider">{label}</p>
        {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
      </div>
      <div className={`p-3 rounded-xl transition-all group-hover:scale-110`} style={{ backgroundColor: `${color}20` }}>
        <Icon size={24} style={{ color }} strokeWidth={2.5} />
      </div>
    </div>
  </motion.div>
);

// ============================================
// GRADE BADGE
// ============================================

const GradeBadge = ({ score }) => {
  const getGrade = () => {
    if (score >= 90) return { label: 'Outstanding', emoji: '🏆', bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700' };
    if (score >= 80) return { label: 'Excellent', emoji: '🌟', bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700' };
    if (score >= 70) return { label: 'Good Work', emoji: '✨', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' };
    if (score >= 60) return { label: 'Keep Going', emoji: '💪', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' };
    return { label: 'Keep Trying', emoji: '📚', bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700' };
  };
  
  const grade = getGrade();
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.4, type: 'spring' }}
      className={`inline-flex items-center gap-3 px-4 py-2 rounded-full ${grade.bg} border ${grade.border}`}
    >
      <span className="text-2xl">{grade.emoji}</span>
      <span className={`font-bold text-sm uppercase tracking-wide ${grade.text}`}>{grade.label}</span>
    </motion.div>
  );
};

// ============================================
// PERFORMANCE BAR
// ============================================

const PerformanceBar = ({ correct, total, delay }) => {
  const percentage = (correct / total) * 100;
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay }}
      className="space-y-2"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold text-gray-600">Question Accuracy</span>
        <span className="text-lg font-black text-gray-900">{correct}/{total}</span>
      </div>
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1.5, ease: 'easeOut', delay: delay + 0.3 }}
          className="h-full bg-gradient-to-r from-green-500 to-emerald-600 rounded-full"
        />
      </div>
    </motion.div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

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
  const [showAiPanel, setShowAiPanel] = useState(true);
  const aiPanelRef = useRef(null);

  // ============================================
  // FETCH RESULTS
  // ============================================
  
  useEffect(() => {
    if (!sessionId || !user?.uid) return;

    const fetchResults = async () => {
      try {
        const resultData = await getQuizResults(sessionId);
        setData(resultData);
        
        if (location.state?.justCompleted && resultData.session.score >= 75) {
          setTimeout(triggerConfetti, 800);
        }

        if (location.state?.justCompleted) {
          generateAiAnalysis(resultData);
        }
      } catch (error) {
        console.error(error);
        toast.error('Could not load results');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [sessionId, user]);

  // ============================================
  // AI ANALYSIS
  // ============================================
  
  const generateAiAnalysis = useCallback(async (resultData) => {
    if (!resultData) return;
    
    try {
      setIsAnalyzing(true);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      
      const wrongAnswers = resultData.questions
        .filter(q => !q.isCorrect)
        .map(q => ({
          topic: q.topic || 'General',
          question: q.stem,
          userAnswer: q.choices[q.userAnswer] || 'Skipped',
          correctAnswer: q.choices[q.correctAnswer]
        }));

      const correctTopics = resultData.questions
        .filter(q => q.isCorrect)
        .map(q => q.topic || 'General');

      const prompt = `You are an expert educational coach analyzing quiz performance.

Quiz: "${resultData.quizTitle}"
Score: ${resultData.session.score}%
Correct: ${resultData.questions.filter(q => q.isCorrect).length}/${resultData.questions.length}
Topics Mastered: ${[...new Set(correctTopics)].join(', ') || 'None'}

Mistakes: ${wrongAnswers.length > 0 ? JSON.stringify(wrongAnswers.slice(0, 3)) : 'None'}

Provide feedback in this EXACT markdown format:

## 🎯 Performance Snapshot
[1-2 sentences: encouraging summary and key observation]

## 💡 Your Strengths
- [Specific strength #1]
- [Specific strength #2]

## 🎯 Focus Areas
- [Topic to improve #1]
- [Topic to improve #2]

## 📚 Next Steps
1. [Specific action to improve]
2. [Study resource or technique]

Keep it motivating, concise, and actionable.`;

      const result = await model.generateContent(prompt);
      setAiAnalysis(result.response.text());
    } catch (error) {
      console.error("AI failed:", error);
      setAiAnalysis("Unable to generate insights. Try again!");
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  // ============================================
  // UTILITIES
  // ============================================
  
  const triggerConfetti = () => {
    const colors = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899'];
    const end = Date.now() + 3500;

    (function frame() {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 60,
        origin: { x: 0, y: 0.6 },
        colors,
        gravity: 1
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 60,
        origin: { x: 1, y: 0.6 },
        colors,
        gravity: 1
      });

      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  };

  const handleShare = async () => {
    const text = `🎯 I scored ${data.session.score}% on "${data.quizTitle}"!\n✅ ${stats.correct}/${stats.total} answers correct\n⏱️ ${stats.timeTakenMin}m\n\nBeat my score!`;
    
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Quiz Result', text });
      } catch (e) {
        copyToClipboard(text);
      }
    } else {
      copyToClipboard(text);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  // ============================================
  // COMPUTED VALUES
  // ============================================
  
  const stats = useMemo(() => {
    if (!data) return null;
    const { session, questions } = data;
    
    const correct = questions.filter(q => q.isCorrect).length;
    const total = questions.length;
    const startTime = session.startTime?.getTime?.() || Date.now();
    const endTime = session.endTime?.getTime?.() || Date.now();
    const timeTakenMin = Math.max(1, Math.round((endTime - startTime) / 60000));
    const avgTime = Math.round(timeTakenMin / total);
    
    return { correct, total, timeTakenMin, avgTime, incorrect: total - correct };
  }, [data]);

  const filteredQuestions = useMemo(() => {
    if (!data) return [];
    return filter === 'all' ? data.questions : data.questions.filter(q => !q.isCorrect);
  }, [data, filter]);

  if (loading) return <SkeletonLoader />;
  if (!data) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 font-sans selection:bg-indigo-100">
      
      {/* ============================================ */}
      {/* HEADER & NAVIGATION */}
      {/* ============================================ */}
      
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-semibold group transition-colors"
          >
            <Home size={18} className="group-hover:-translate-x-1 transition-transform" />
            Dashboard
          </motion.button>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <h1 className="text-lg font-black text-gray-900 truncate max-w-sm">{data.quizTitle}</h1>
          </motion.div>
          
          <div className="w-10" />
        </div>
      </div>

      {/* ============================================ */}
      {/* MAIN CONTENT */}
      {/* ============================================ */}
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        
        {/* Top Section: Score + AI */}
        <div className="grid lg:grid-cols-3 gap-8 mb-12">
          
          {/* LEFT: Score & Stats */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Hero Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm"
            >
              <GradeBadge score={data.session.score} />
              
              <div className="mt-6">
                <PerformanceBar correct={stats.correct} total={stats.total} delay={0.2} />
              </div>
              
              <div className="mt-8 pt-8 border-t border-gray-100 flex flex-wrap gap-3">
                <button
                  onClick={handleShare}
                  className="flex-1 min-w-max flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-all shadow-lg shadow-gray-200 hover:shadow-xl group"
                >
                  {copied ? <Check size={18} /> : <Share2 size={18} />}
                  {copied ? 'Copied!' : 'Share Result'}
                </button>
                
                <button
                  onClick={() => navigate(`/quiz/${data.session.quizId}`)}
                  className="flex-1 min-w-max flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-700 rounded-xl font-bold border-2 border-gray-200 hover:border-gray-300 transition-all"
                >
                  <RotateCcw size={18} />
                  Retake
                </button>
              </div>
            </motion.div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard 
                icon={CheckCircle2} 
                label="Correct" 
                value={stats.correct}
                color="#10B981"
                delay={0.1}
              />
              <MetricCard 
                icon={XCircle} 
                label="Incorrect" 
                value={stats.incorrect}
                color="#EF4444"
                delay={0.2}
              />
              <MetricCard 
                icon={Clock} 
                label="Total Time" 
                value={`${stats.timeTakenMin}m`}
                subtext={`${stats.avgTime}s/q`}
                color="#3B82F6"
                delay={0.3}
              />
              <MetricCard 
                icon={Flame} 
                label="Accuracy" 
                value={`${Math.round((stats.correct / stats.total) * 100)}%`}
                color="#F59E0B"
                delay={0.4}
              />
            </div>
          </div>

          {/* RIGHT: AI Coach */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden"
          >
            {/* AI Header */}
            <button
              onClick={() => setShowAiPanel(!showAiPanel)}
              className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors border-b border-gray-100"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img 
                    src={LogoImage} 
                    alt="AI Coach" 
                    className="w-12 h-12 rounded-xl object-contain bg-gradient-to-br from-gray-50 to-gray-100 p-2 border border-gray-100"
                  />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center border-2 border-white">
                    <Sparkles size={8} className="text-white" />
                  </div>
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-gray-900">AI Coach</h3>
                  <p className="text-xs text-gray-500">Performance Analysis</p>
                </div>
              </div>
              <ChevronDown 
                size={20} 
                className={`text-gray-400 transition-transform ${showAiPanel ? 'rotate-180' : ''}`} 
              />
            </button>

            {/* AI Content */}
            <AnimatePresence>
              {showAiPanel && (
                <motion.div
                  ref={aiPanelRef}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="p-6 max-h-96 overflow-y-auto custom-scrollbar">
                    {isAnalyzing ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                          <span className="text-sm text-gray-500 font-semibold">Analyzing...</span>
                        </div>
                        <div className="space-y-2">
                          <div className="h-3 bg-gray-100 rounded-full animate-pulse" />
                          <div className="h-3 bg-gray-100 rounded-full animate-pulse w-4/5" />
                          <div className="h-3 bg-gray-100 rounded-full animate-pulse w-3/5" />
                        </div>
                      </div>
                    ) : aiAnalysis ? (
                      <div className="prose prose-sm prose-gray max-w-none text-gray-700 space-y-2">
                        <ReactMarkdown
                          components={{
                            h2: ({ children }) => <h4 className="text-sm font-bold text-gray-900 mt-3 mb-1">{children}</h4>,
                            ul: ({ children }) => <ul className="space-y-1 list-disc list-inside text-sm">{children}</ul>,
                            li: ({ children }) => <li className="text-sm text-gray-600">{children}</li>,
                            p: ({ children }) => <p className="text-sm text-gray-600 mb-2">{children}</p>
                          }}
                        >
                          {aiAnalysis}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <button
                        onClick={() => generateAiAnalysis(data)}
                        className="w-full p-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-bold hover:from-indigo-600 hover:to-purple-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
                      >
                        <Sparkles size={18} />
                        Generate Insights
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* ============================================ */}
        {/* REVIEW SECTION */}
        {/* ============================================ */}
        
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gray-900 rounded-xl text-white">
                <BookOpen size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-gray-900">Question Breakdown</h2>
                <p className="text-gray-500 text-sm">Learn from each answer</p>
              </div>
            </div>
            
            <div className="bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm inline-flex self-start">
              <button 
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  filter === 'all' 
                    ? 'bg-gray-900 text-white shadow-md' 
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                All ({stats.total})
              </button>
              <button 
                onClick={() => setFilter('incorrect')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  filter === 'incorrect' 
                    ? 'bg-red-500 text-white shadow-md' 
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                Mistakes ({stats.incorrect})
              </button>
            </div>
          </div>

          {/* Questions */}
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {filteredQuestions.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200"
                >
                  <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Trophy className="text-green-500" size={48} />
                  </div>
                  <h3 className="text-xl font-black text-gray-900 mb-1">Perfect Score! 🎉</h3>
                  <p className="text-gray-500">No mistakes to review.</p>
                </motion.div>
              ) : (
                filteredQuestions.map((q, idx) => {
                  const isExpanded = expandedQ === idx;
                  const qNum = data.questions.findIndex(oq => oq.stem === q.stem) + 1;
                  
                  return (
                    <motion.div
                      key={idx}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`bg-white rounded-2xl border overflow-hidden transition-all ${
                        q.isCorrect 
                          ? 'border-green-100 hover:border-green-200' 
                          : 'border-red-100 hover:border-red-200'
                      } ${isExpanded ? 'shadow-lg' : 'shadow-sm hover:shadow-md'}`}
                    >
                      {/* Question Header */}
                      <button 
                        onClick={() => setExpandedQ(isExpanded ? null : idx)}
                        className="w-full flex items-start gap-4 p-6 text-left transition-colors hover:bg-gray-50/50"
                      >
                        <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-sm ${
                          q.isCorrect ? 'bg-green-500' : 'bg-red-500'
                        }`}>
                          {qNum}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-base font-bold text-gray-900 leading-snug mb-3">
                            {q.stem}
                          </p>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold ${
                              q.isCorrect 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {q.isCorrect ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                              {q.isCorrect ? 'Correct' : 'Incorrect'}
                            </span>
                            {q.topic && (
                              <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold">
                                {q.topic}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex-shrink-0">
                          <ChevronDown 
                            size={20} 
                            className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                          />
                        </div>
                      </button>

                      {/* Expanded Detail */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                          >
                            <div className="px-6 pb-6 pt-4 space-y-4 border-t border-gray-100 bg-gray-50/30">
                              
                              {/* Options */}
                              <div className="space-y-2">
                                <p className="text-xs font-bold text-gray-600 uppercase">Options</p>
                                {q.choices.map((choice, idx) => {
                                  const isUser = q.userAnswer === idx;
                                  const isCorrect = q.correctAnswer === idx;
                                  
                                  let style = 'bg-white border-gray-200 text-gray-700';
                                  if (isCorrect) style = 'bg-green-50 border-green-300 text-green-900';
                                  if (isUser && !isCorrect) style = 'bg-red-50 border-red-300 text-red-900';
                                  
                                  return (
                                    <div key={idx} className={`p-3 rounded-xl border-2 flex items-center gap-3 ${style}`}>
                                      <span className="w-7 h-7 rounded-lg bg-white border border-gray-300 flex items-center justify-center font-bold text-xs text-gray-600">
                                        {String.fromCharCode(65 + idx)}
                                      </span>
                                      <span className="flex-1 font-semibold text-sm">{choice}</span>
                                      {isCorrect && <CheckCircle2 size={18} className="text-green-600" />}
                                      {isUser && !isCorrect && <XCircle size={18} className="text-red-600" />}
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Explanation */}
                              {q.explanation && (
                                <div className="flex gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                                  <Lightbulb className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
                                  <div>
                                    <h4 className="font-bold text-blue-900 text-sm mb-1">Explanation</h4>
                                    <p className="text-sm text-blue-800 leading-relaxed">{q.explanation}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* ============================================ */}
        {/* FOOTER CTA */}
        {/* ============================================ */}
        
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          className="mt-16 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl p-10 md:p-16 text-center relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-full blur-3xl -z-10" />
          
          <div className="relative">
            <Zap size={40} className="text-yellow-400 mx-auto mb-6" />
            <h3 className="text-3xl md:text-4xl font-black text-white mb-4">
              Keep Learning! 🚀
            </h3>
            <p className="text-gray-300 mb-8 max-w-md mx-auto text-lg">
              Every quiz brings you closer to mastery. Ready to challenge yourself further?
            </p>
            
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-gray-900 rounded-xl font-bold hover:bg-gray-100 transition-all shadow-xl hover:shadow-2xl group"
            >
              Explore More Quizzes
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </motion.div>
      </div>

      {/* Custom Scrollbar Styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
      `}</style>
    </div>
  );
};

export default QuizResults;
