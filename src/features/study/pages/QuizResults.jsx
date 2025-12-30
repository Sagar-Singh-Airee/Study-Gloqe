// src/pages/QuizResults.jsx
// 🎨 STUDYGLOQE ULTIMATE - FINAL PREMIUM VERSION
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { GoogleGenerativeAI } from '@google/generative-ai';
import ReactMarkdown from 'react-markdown';
import {
  Clock, CheckCircle2, XCircle, Share2, RotateCcw,
  ChevronDown, ChevronUp, Brain, Sparkles, ArrowRight,
  Target, Zap, LayoutDashboard, Award, TrendingUp, Check,
  Trophy, Flame, Star, BookOpen, AlertCircle, Lightbulb
} from 'lucide-react';
import { useAuth } from '@auth/contexts/AuthContext';
import { getQuizResults } from '@teacher/services/quizService';
import toast from 'react-hot-toast';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

// ═════════════════════════════════════════════════════════
// LOADING SKELETON
// ═════════════════════════════════════════════════════════
const LoadingSkeleton = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
    <div className="h-20 bg-white/80 backdrop-blur-xl border-b border-slate-200 animate-pulse" />
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
      <div className="h-10 w-56 bg-slate-200 rounded-2xl animate-pulse" />
      <div className="h-80 w-full bg-gradient-to-br from-[#0B1221] to-slate-900 rounded-[40px] animate-pulse" />
      <div className="bg-white rounded-[32px] border border-slate-200 p-8 space-y-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    </div>
  </div>
);

// ═════════════════════════════════════════════════════════
// HERO CARD - The Ultimate Premium Card
// ═════════════════════════════════════════════════════════
const ResultHero = ({
  score,
  correct,
  total,
  timeTaken,
  quizTitle,
  onRetake,
  onShare,
  aiAnalysis,
  onGenerateAI,
  isAnalyzing,
  copied
}) => {
  const percentage = Math.round(score || 0);

  // Performance level with better icons
  const getPerformance = () => {
    if (percentage >= 90) return {
      icon: Trophy,
      emoji: '🏆',
      label: 'Outstanding!',
      gradient: 'from-amber-500 to-orange-600',
      glow: 'shadow-amber-500/20',
      textColor: 'text-amber-400'
    };
    if (percentage >= 80) return {
      icon: Star,
      emoji: '⭐',
      label: 'Excellent!',
      gradient: 'from-teal-500 to-cyan-600',
      glow: 'shadow-teal-500/20',
      textColor: 'text-teal-400'
    };
    if (percentage >= 70) return {
      icon: Sparkles,
      emoji: '✨',
      label: 'Great Job!',
      gradient: 'from-blue-500 to-indigo-600',
      glow: 'shadow-blue-500/20',
      textColor: 'text-blue-400'
    };
    if (percentage >= 60) return {
      icon: Flame,
      emoji: '💪',
      label: 'Good Try!',
      gradient: 'from-purple-500 to-fuchsia-600',
      glow: 'shadow-purple-500/20',
      textColor: 'text-purple-400'
    };
    return {
      icon: BookOpen,
      emoji: '📚',
      label: 'Keep Learning!',
      gradient: 'from-slate-500 to-slate-600',
      glow: 'shadow-slate-500/20',
      textColor: 'text-slate-400'
    };
  };

  const perf = getPerformance();
  const PerformanceIcon = perf.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, type: 'spring' }}
      className={`relative overflow-hidden rounded-[40px] bg-gradient-to-br from-[#0B1221] via-slate-900 to-[#0B1221] text-white p-10 md:p-14 shadow-2xl ${perf.glow}`}
    >
      {/* Advanced Background Effects */}
      <div className="absolute inset-0 bg-[size:60px_60px] opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)' }} />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-teal-500/10 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-purple-500/10 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />

      {/* Floating Orbs */}
      <motion.div
        animate={{ y: [0, -20, 0], x: [0, 10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-20 right-20 w-32 h-32 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-full blur-2xl"
      />
      <motion.div
        animate={{ y: [0, 20, 0], x: [0, -15, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        className="absolute bottom-20 left-20 w-40 h-40 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full blur-2xl"
      />

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">

        {/* LEFT: Big Score & Actions */}
        <div className="lg:col-span-4 flex flex-col space-y-6">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="space-y-4"
          >
            {/* Performance Badge */}
            <div className={`inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-gradient-to-r ${perf.gradient} shadow-lg`}>
              <PerformanceIcon size={20} className="text-white" />
              <span className="text-white text-sm font-black uppercase tracking-wide">{perf.label}</span>
            </div>

            {/* Big Score */}
            <div className="relative">
              <motion.h1
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4, type: 'spring', stiffness: 150 }}
                className="text-[120px] leading-none font-black tracking-tighter bg-gradient-to-br from-white via-slate-100 to-slate-300 bg-clip-text text-transparent"
                style={{ fontFamily: "'Inter', 'Plus Jakarta Sans', -apple-system, sans-serif" }}
              >
                {percentage}
              </motion.h1>
              <span className="absolute -top-4 -right-4 text-5xl font-black text-white/40">%</span>
            </div>

            {/* Stats Text */}
            <div className="space-y-1">
              <p className="text-slate-300 font-semibold text-lg" style={{ fontFamily: "'Inter', sans-serif" }}>
                <span className="text-white font-black">{correct}</span> correct out of{' '}
                <span className="text-white font-black">{total}</span> questions
              </p>
              <p className="text-slate-500 text-sm font-medium flex items-center gap-2">
                <BookOpen size={14} />
                {quizTitle}
              </p>
            </div>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <button
              onClick={onRetake}
              className="group relative overflow-hidden flex items-center justify-center gap-3 px-8 py-4 bg-white text-[#0B1221] rounded-2xl font-black hover:bg-slate-50 transition-all hover:scale-105 active:scale-95 shadow-2xl"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-teal-500/10 to-blue-500/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              <RotateCcw size={20} className="group-hover:rotate-180 transition-transform duration-500 relative z-10" />
              <span className="relative z-10">Retake Quiz</span>
            </button>

            <button
              onClick={onShare}
              className="group flex items-center justify-center gap-3 px-8 py-4 bg-white/10 backdrop-blur-xl text-white rounded-2xl font-black hover:bg-white/20 transition-all border-2 border-white/20 hover:border-white/30 hover:scale-105 active:scale-95"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              {copied ? (
                <>
                  <Check size={20} className="animate-bounce" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Share2 size={20} className="group-hover:rotate-12 transition-transform" />
                  <span>Share</span>
                </>
              )}
            </button>
          </motion.div>
        </div>

        {/* MIDDLE: Premium Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-4 grid grid-cols-2 gap-4"
        >
          {/* Time Card */}
          <motion.div
            whileHover={{ scale: 1.05, y: -5 }}
            className="group relative p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all cursor-default overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center mb-3 shadow-lg shadow-blue-500/50">
                <Clock size={20} className="text-white" />
              </div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1" style={{ fontFamily: "'Inter', sans-serif" }}>
                Time
              </span>
              <p className="text-3xl font-black text-white" style={{ fontFamily: "'Inter', sans-serif" }}>{timeTaken}</p>
            </div>
          </motion.div>

          {/* Accuracy Card */}
          <motion.div
            whileHover={{ scale: 1.05, y: -5 }}
            className="group relative p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all cursor-default overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center mb-3 shadow-lg shadow-teal-500/50">
                <Target size={20} className="text-white" />
              </div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1" style={{ fontFamily: "'Inter', sans-serif" }}>
                Accuracy
              </span>
              <p className="text-3xl font-black text-teal-400" style={{ fontFamily: "'Inter', sans-serif" }}>{Math.round((correct / total) * 100)}%</p>
            </div>
          </motion.div>

          {/* XP Card */}
          <motion.div
            whileHover={{ scale: 1.05, y: -5 }}
            className="group relative p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all cursor-default overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center mb-3 shadow-lg shadow-purple-500/50">
                <Zap size={20} className="text-white" />
              </div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1" style={{ fontFamily: "'Inter', sans-serif" }}>
                XP Earned
              </span>
              <p className="text-3xl font-black text-purple-400" style={{ fontFamily: "'Inter', sans-serif" }}>+{percentage * 10}</p>
            </div>
          </motion.div>

          {/* Rank Card */}
          <motion.div
            whileHover={{ scale: 1.05, y: -5 }}
            className="group relative p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all cursor-default overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mb-3 shadow-lg shadow-amber-500/50">
                <TrendingUp size={20} className="text-white" />
              </div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1" style={{ fontFamily: "'Inter', sans-serif" }}>
                Rank
              </span>
              <p className="text-3xl font-black text-amber-400" style={{ fontFamily: "'Inter', sans-serif" }}>Top 15%</p>
            </div>
          </motion.div>
        </motion.div>

        {/* RIGHT: AI Insights */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-4 h-full min-h-[320px] flex flex-col"
        >
          <div className="flex-1 rounded-3xl bg-gradient-to-br from-purple-900/40 via-violet-900/30 to-blue-900/40 border-2 border-purple-500/30 p-7 relative overflow-hidden group hover:border-purple-400/50 transition-all backdrop-blur-sm">
            {/* Animated Grid Background */}
            <div className="absolute inset-0 bg-[size:30px_30px] opacity-10" style={{ backgroundImage: 'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)' }} />

            {/* Glow Effect */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl" />

            <div className="relative z-10 h-full flex flex-col">
              {/* Header */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/50">
                  <Brain size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wide flex items-center gap-2" style={{ fontFamily: "'Inter', sans-serif" }}>
                    AI Coach
                    <Sparkles size={14} className="text-purple-300 animate-pulse" />
                  </h3>
                  <p className="text-xs text-purple-200 font-medium">Personalized Insights</p>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-hidden">
                <AnimatePresence mode="wait">
                  {isAnalyzing ? (
                    <motion.div
                      key="analyzing"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="flex flex-col items-center justify-center h-full"
                    >
                      <div className="relative mb-4">
                        <div className="w-16 h-16 border-4 border-purple-500/30 rounded-full" />
                        <div className="absolute inset-0 w-16 h-16 border-4 border-t-purple-500 border-r-purple-500 rounded-full animate-spin" />
                      </div>
                      <p className="text-sm font-semibold text-purple-200">Analyzing your performance...</p>
                    </motion.div>
                  ) : aiAnalysis ? (
                    <motion.div
                      key="analysis"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="prose prose-invert prose-sm max-w-none overflow-y-auto max-h-[200px] scrollbar-thin scrollbar-thumb-purple-500 scrollbar-track-transparent pr-3"
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    >
                      <ReactMarkdown
                        components={{
                          h2: ({ children }) => <h4 className="text-base font-black text-purple-100 mt-4 mb-2 first:mt-0 flex items-center gap-2">{children}</h4>,
                          p: ({ children }) => <p className="text-slate-200 text-sm leading-relaxed mb-3">{children}</p>,
                          ul: ({ children }) => <ul className="space-y-2 text-slate-200 text-sm mt-2">{children}</ul>,
                          li: ({ children }) => (
                            <li className="flex items-start gap-2">
                              <span className="text-purple-400 mt-1 flex-shrink-0">•</span>
                              <span>{children}</span>
                            </li>
                          )
                        }}
                      >
                        {aiAnalysis}
                      </ReactMarkdown>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="cta"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="h-full flex flex-col items-center justify-center text-center"
                    >
                      <Lightbulb size={48} className="text-purple-300 mb-4 opacity-60" />
                      <p className="text-slate-300 text-sm mb-5 max-w-[220px] font-medium">Get AI-powered insights on your weak spots and how to improve</p>
                      <button
                        onClick={onGenerateAI}
                        className="group text-sm font-black bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-6 py-3 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-purple-500/50 flex items-center gap-2"
                        style={{ fontFamily: "'Inter', sans-serif" }}
                      >
                        <Sparkles size={16} className="group-hover:rotate-12 transition-transform" />
                        Generate Insights
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

// ═════════════════════════════════════════════════════════
// QUESTION ROW - Premium List Item
// ═════════════════════════════════════════════════════════
const QuestionRow = ({ question, index, isExpanded, onToggle }) => {
  const isCorrect = question.isCorrect;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`group border-b border-slate-100 last:border-0 transition-all ${isExpanded ? 'bg-gradient-to-r from-slate-50 to-white' : 'hover:bg-slate-50/70'}`}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-5 p-6 text-left focus:outline-none focus:bg-slate-50 transition-all"
      >
        {/* Status Icon - More Premium */}
        <div className={`mt-1 flex-shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center transition-all shadow-lg ${isCorrect
          ? 'bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-teal-500/30 group-hover:scale-110'
          : 'bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-red-500/30 group-hover:scale-110'
          }`}>
          {isCorrect ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-4 mb-3">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest" style={{ fontFamily: "'Inter', sans-serif" }}>
              Question {index + 1}
            </span>
            <div className="flex items-center gap-3">
              {!isCorrect && (
                <span className="flex items-center gap-1.5 text-xs font-black text-red-600 bg-red-50 px-3 py-1.5 rounded-xl border border-red-200">
                  <AlertCircle size={12} />
                  Review
                </span>
              )}
              <div className={`text-slate-400 group-hover:text-slate-600 transition-all ${isExpanded ? 'rotate-180' : ''}`}>
                <ChevronDown size={20} />
              </div>
            </div>
          </div>

          <h3 className={`text-base font-bold leading-relaxed transition-colors ${isCorrect ? 'text-slate-700 group-hover:text-slate-900' : 'text-slate-900'
            }`} style={{ fontFamily: "'Inter', sans-serif" }}>
            {question.stem}
          </h3>
        </div>
      </button>

      {/* Expanded Details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-8 ml-15 space-y-5">
              {/* Choices Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {question.choices.map((choice, idx) => {
                  const isUser = question.userAnswer === idx;
                  const isCorrectAns = question.correctAnswer === idx;

                  let style = "border-2 border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:shadow-md";
                  if (isCorrectAns) style = "border-2 border-teal-400 bg-gradient-to-br from-teal-50 to-emerald-50 text-teal-900 font-bold shadow-lg shadow-teal-500/20";
                  else if (isUser) style = "border-2 border-red-400 bg-gradient-to-br from-red-50 to-rose-50 text-red-900 font-bold shadow-lg shadow-red-500/20";

                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.08 }}
                      className={`p-4 rounded-2xl text-sm flex items-center gap-4 transition-all ${style}`}
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    >
                      <span className="w-8 h-8 flex items-center justify-center rounded-xl border-2 border-current opacity-50 text-xs font-black flex-shrink-0 bg-white/50">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="flex-1 font-medium">{choice}</span>
                      {isCorrectAns && <CheckCircle2 size={18} className="text-teal-600 flex-shrink-0 animate-bounce" />}
                      {isUser && !isCorrectAns && <XCircle size={18} className="text-red-600 flex-shrink-0 animate-pulse" />}
                    </motion.div>
                  );
                })}
              </div>

              {/* Explanation */}
              {question.explanation && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="p-5 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 text-sm leading-relaxed flex gap-4 shadow-lg shadow-blue-500/10"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                    <Lightbulb size={18} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <span className="font-black text-slate-900 block mb-2 text-base">Explanation</span>
                    <p className="text-slate-700 font-medium">{question.explanation}</p>
                  </div>
                </motion.div>
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
  const [expandedId, setExpandedId] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Calculate stats safely
  const stats = useMemo(() => {
    if (!data) return null;

    const correct = data.questions.filter(q => q.isCorrect).length;
    const total = data.questions.length;

    let timeDisplay = '0m';
    if (data.session.startTime && data.session.endTime) {
      const start = data.session.startTime instanceof Date
        ? data.session.startTime
        : new Date(data.session.startTime.seconds * 1000);
      const end = data.session.endTime instanceof Date
        ? data.session.endTime
        : new Date(data.session.endTime.seconds * 1000);
      const mins = Math.round((end - start) / 60000);

      if (mins < 1) timeDisplay = '< 1m';
      else if (mins < 60) timeDisplay = `${mins}m`;
      else timeDisplay = `${Math.floor(mins / 60)}h ${mins % 60}m`;
    }

    return { correct, total, timeTaken: timeDisplay };
  }, [data]);

  // Fetch quiz results
  useEffect(() => {
    if (!sessionId || !user?.uid) {
      navigate('/dashboard');
      return;
    }

    const fetchData = async () => {
      try {
        const result = await getQuizResults(sessionId);
        setData(result);

        // Epic confetti for high scores
        if (result.session.score >= 80) {
          setTimeout(() => {
            const duration = 3000;
            const animationEnd = Date.now() + duration;
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

            function randomInRange(min, max) {
              return Math.random() * (max - min) + min;
            }

            const interval = setInterval(function () {
              const timeLeft = animationEnd - Date.now();

              if (timeLeft <= 0) {
                return clearInterval(interval);
              }

              const particleCount = 50 * (timeLeft / duration);
              confetti({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
                colors: ['#14b8a6', '#8b5cf6', '#f59e0b', '#3b82f6']
              });
              confetti({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
                colors: ['#14b8a6', '#8b5cf6', '#f59e0b', '#3b82f6']
              });
            }, 250);
          }, 500);
        }
      } catch (error) {
        console.error('Failed to load results:', error);
        toast.error('Failed to load quiz results');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [sessionId, user, navigate]);

  // Generate AI analysis
  const handleGenerateAI = useCallback(async () => {
    if (!data || !stats) return;

    setIsAnalyzing(true);
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const weakTopics = data.questions
        .filter(q => !q.isCorrect)
        .slice(0, 3)
        .map(q => q.topic || 'General')
        .join(', ');

      const prompt = `Analyze this quiz performance:
Score: ${data.session.score}%
Correct: ${stats.correct}/${stats.total}
Weak areas: ${weakTopics || 'None'}

Provide brief, encouraging feedback in markdown:
## 🎯 Performance Summary
[One encouraging sentence]

## 💪 Your Strengths
- [1-2 specific strengths]

## 📚 Focus Areas
- [1-2 actionable improvements]

Keep under 100 words total. Be specific and motivating.`;

      const result = await model.generateContent(prompt);
      setAiAnalysis(result.response.text());
      toast.success('AI insights generated!', { icon: '✨' });
    } catch (error) {
      console.error('AI generation failed:', error);
      toast.error('Unable to generate AI insights');
    } finally {
      setIsAnalyzing(false);
    }
  }, [data, stats]);

  // Share functionality
  const handleShare = useCallback(async () => {
    if (!data || !stats) return;

    const text = `🎯 I scored ${data.session.score}% on "${data.quizTitle}" on StudyGloqe!\n✅ ${stats.correct}/${stats.total} correct`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'My Quiz Result', text });
        return;
      } catch (e) {
        if (e.name !== 'AbortError') {
          console.error('Share failed:', e);
        }
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copied to clipboard!', {
        icon: '📋',
        style: {
          background: '#0B1221',
          color: '#fff',
          fontWeight: 'bold',
          borderRadius: '12px'
        }
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy');
    }
  }, [data, stats]);

  if (loading || !data || !stats) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50" style={{ fontFamily: "'Inter', 'Plus Jakarta Sans', -apple-system, sans-serif" }}>
      {/* Premium Header Bar */}
      <div className="sticky top-0 z-50 h-20 bg-white/80 backdrop-blur-2xl border-b border-slate-200/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-teal-500/30">
              <Award size={24} className="text-white" />
            </div>
            <div>
              <h1 className="font-black text-xl text-[#0B1221]">Quiz Results</h1>
              <p className="text-sm text-slate-500 font-semibold">Detailed Performance Analysis</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="group text-slate-600 hover:text-[#0B1221] font-bold text-sm flex items-center gap-2 px-5 py-3 hover:bg-slate-100 rounded-xl transition-all"
          >
            <LayoutDashboard size={20} className="group-hover:-rotate-12 transition-transform" />
            <span className="hidden sm:inline">Back to Dashboard</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12 pb-24 space-y-12">
        {/* Hero Section */}
        <ResultHero
          score={data.session.score}
          correct={stats.correct}
          total={stats.total}
          timeTaken={stats.timeTaken}
          quizTitle={data.quizTitle}
          onRetake={() => navigate(`/quiz/${data.session.quizId}`)}
          onShare={handleShare}
          aiAnalysis={aiAnalysis}
          onGenerateAI={handleGenerateAI}
          isAnalyzing={isAnalyzing}
          copied={copied}
        />

        {/* Questions List */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-[32px] border-2 border-slate-200/60 shadow-xl overflow-hidden"
        >
          {/* List Header */}
          <div className="px-8 py-6 border-b-2 border-slate-100 flex items-center justify-between bg-gradient-to-r from-white to-slate-50 sticky top-20 z-40 backdrop-blur-xl">
            <div className="flex items-center gap-4">
              <div className="w-2 h-10 bg-gradient-to-b from-teal-500 to-cyan-600 rounded-full shadow-lg shadow-teal-500/50" />
              <div>
                <h3 className="font-black text-xl text-[#0B1221]">Question Analysis</h3>
                <p className="text-sm text-slate-500 font-semibold">Review your answers in detail</p>
              </div>
            </div>
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-teal-600" />
                <span className="text-base font-black text-slate-700">
                  <span className="text-teal-600">{stats.correct}</span> / {stats.total}
                </span>
              </div>
              <span className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-black text-slate-600 uppercase tracking-wider">
                {stats.total} Questions
              </span>
            </div>
          </div>

          {/* Question Rows */}
          <div>
            {data.questions.map((q, idx) => (
              <QuestionRow
                key={idx}
                question={q}
                index={idx}
                isExpanded={expandedId === idx}
                onToggle={() => setExpandedId(expandedId === idx ? null : idx)}
              />
            ))}
          </div>
        </motion.div>

        {/* Footer CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center pt-12"
        >
          <p className="text-slate-400 mb-6 font-semibold text-lg">Ready to level up?</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="group inline-flex items-center gap-3 text-[#0B1221] font-black text-xl hover:gap-5 transition-all"
          >
            <span>Explore More Quizzes</span>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-teal-500/50">
              <ArrowRight size={20} className="text-white" />
            </div>
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default QuizResults;
