// src/pages/QuizResults.jsx
// 🎨 MINIMALIST REWRITE - Swiss Style + Dieter Rams
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { GoogleGenerativeAI } from '@google/generative-ai';
import ReactMarkdown from 'react-markdown';
import {
  Clock, CheckCircle2, XCircle, Share2, RotateCcw,
  ChevronDown, Brain, Sparkles, ArrowRight,
  Target, Zap, LayoutDashboard, Award, Lightbulb
} from 'lucide-react';
import { useAuth } from '@auth/contexts/AuthContext';
import { getQuizResults } from '@teacher/services/quizService';
import toast from 'react-hot-toast';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

// ═════════════════════════════════════════════════════════
// LOADING SKELETON - MINIMALIST
// ═════════════════════════════════════════════════════════
const LoadingSkeleton = () => (
  <div className="min-h-screen bg-white">
    <div className="h-16 bg-slate-50 animate-pulse" />
    <div className="max-w-5xl mx-auto px-8 py-16 space-y-12">
      <div className="h-8 w-48 bg-slate-100 animate-pulse" />
      <div className="h-80 bg-slate-50 animate-pulse" />
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-slate-50 animate-pulse" />
        ))}
      </div>
    </div>
  </div>
);

// ═════════════════════════════════════════════════════════
// HERO - ULTRA MINIMAL
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-12"
    >
      {/* Giant Score - Typography as Hero */}
      <div className="space-y-2">
        <div className="text-[140px] leading-none font-black tracking-tighter text-slate-900">
          {percentage}
          <span className="text-[80px] text-slate-400 ml-2">%</span>
        </div>
        <p className="text-lg text-slate-500 font-medium">
          {correct} of {total} correct
        </p>
      </div>

      {/* Stats Grid - Pure Typography */}
      <div className="grid grid-cols-4 gap-8">
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-widest text-slate-400 font-semibold">Time</div>
          <div className="text-2xl font-bold text-slate-900">{timeTaken}</div>
        </div>

        <div className="space-y-1">
          <div className="text-xs uppercase tracking-widest text-slate-400 font-semibold">Accuracy</div>
          <div className="text-2xl font-bold text-slate-900">{Math.round((correct / total) * 100)}%</div>
        </div>

        <div className="space-y-1">
          <div className="text-xs uppercase tracking-widest text-slate-400 font-semibold">XP Earned</div>
          <div className="text-2xl font-bold text-teal-600">+{percentage * 10}</div>
        </div>

        <div className="space-y-1">
          <div className="text-xs uppercase tracking-widest text-slate-400 font-semibold">Rank</div>
          <div className="text-2xl font-bold text-slate-900">Top 15%</div>
        </div>
      </div>

      {/* Actions - Functional Only */}
      <div className="flex items-center gap-4 pt-8">
        <button
          onClick={onRetake}
          className="px-6 py-3 bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors active:scale-[0.98]"
        >
          Retake Quiz
        </button>

        <button
          onClick={onShare}
          className="px-6 py-3 text-slate-900 text-sm font-semibold hover:bg-slate-100 transition-colors active:scale-[0.98]"
        >
          {copied ? 'Copied' : 'Share'}
        </button>
      </div>

      {/* AI Section - Minimal Card */}
      <div className="pt-12 space-y-6">
        <div className="flex items-center gap-3">
          <Brain size={20} className="text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">AI Coach</h3>
        </div>

        <AnimatePresence mode="wait">
          {isAnalyzing ? (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-12 text-center"
            >
              <div className="inline-block w-6 h-6 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin mb-4" />
              <p className="text-sm text-slate-500">Analyzing...</p>
            </motion.div>
          ) : aiAnalysis ? (
            <motion.div
              key="analysis"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="prose prose-slate max-w-none text-sm leading-relaxed"
            >
              <ReactMarkdown
                components={{
                  h2: ({ children }) => <h4 className="text-base font-bold text-slate-900 mt-6 mb-2 first:mt-0">{children}</h4>,
                  p: ({ children }) => <p className="text-slate-600 mb-3">{children}</p>,
                  ul: ({ children }) => <ul className="space-y-2 text-slate-600">{children}</ul>,
                  li: ({ children }) => <li className="pl-0">{children}</li>
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
            >
              <button
                onClick={onGenerateAI}
                className="text-sm font-semibold text-slate-900 hover:text-teal-600 transition-colors flex items-center gap-2"
              >
                Generate Insights
                <ArrowRight size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

// ═════════════════════════════════════════════════════════
// QUESTION ROW - PURE TYPOGRAPHIC HIERARCHY
// ═════════════════════════════════════════════════════════
const QuestionRow = ({ question, index, isExpanded, onToggle }) => {
  const isCorrect = question.isCorrect;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.03 }}
      className="py-8 hover:bg-slate-50 transition-colors"
    >
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-6 text-left"
      >
        {/* Minimal Status Indicator */}
        <div className="mt-1 flex-shrink-0">
          {isCorrect ? (
            <CheckCircle2 size={20} className="text-teal-600" />
          ) : (
            <XCircle size={20} className="text-slate-400" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 space-y-2">
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
            Question {index + 1}
          </div>
          <h3 className="text-base font-semibold text-slate-900 leading-relaxed">
            {question.stem}
          </h3>
        </div>

        {/* Expand Icon */}
        <ChevronDown
          size={20}
          className={`text-slate-400 mt-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Expanded Details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pl-[52px] pt-6 space-y-6">
              {/* Choices - Typography Only */}
              <div className="space-y-3">
                {question.choices.map((choice, idx) => {
                  const isUser = question.userAnswer === idx;
                  const isCorrectAns = question.correctAnswer === idx;

                  return (
                    <div
                      key={idx}
                      className={`text-sm py-3 flex items-center gap-3 ${isCorrectAns
                          ? 'text-teal-600 font-semibold'
                          : isUser
                            ? 'text-slate-400 line-through'
                            : 'text-slate-600'
                        }`}
                    >
                      <span className="w-6 text-xs text-slate-400 font-mono">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="flex-1">{choice}</span>
                      {isCorrectAns && <CheckCircle2 size={16} />}
                    </div>
                  );
                })}
              </div>

              {/* Explanation */}
              {question.explanation && (
                <div className="pt-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400 font-semibold">
                    <Lightbulb size={14} />
                    Explanation
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {question.explanation}
                  </p>
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
  const { user } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Calculate stats
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

  // Fetch results
  useEffect(() => {
    if (!sessionId || !user?.uid) {
      navigate('/dashboard');
      return;
    }

    const fetchData = async () => {
      try {
        const result = await getQuizResults(sessionId);
        setData(result);

        // Minimal confetti for high scores
        if (result.session.score >= 80) {
          setTimeout(() => {
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 },
              colors: ['#14b8a6', '#0f172a']
            });
          }, 300);
        }
      } catch (error) {
        toast.error('Failed to load results');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [sessionId, user, navigate]);

  // AI Analysis
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

      const prompt = `Analyze quiz: ${data.session.score}% (${stats.correct}/${stats.total}). Weak: ${weakTopics}.

Brief markdown feedback (under 80 words):
## Performance
[One sentence]

## Strengths
- [2 specific points]

## Focus
- [2 actionable improvements]

Be specific and encouraging.`;

      const result = await model.generateContent(prompt);
      setAiAnalysis(result.response.text());
    } catch (error) {
      toast.error('AI generation failed');
    } finally {
      setIsAnalyzing(false);
    }
  }, [data, stats]);

  // Share
  const handleShare = useCallback(async () => {
    if (!data || !stats) return;

    const text = `Scored ${data.session.score}% on "${data.quizTitle}" (${stats.correct}/${stats.total} correct)`;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Copy failed');
    }
  }, [data, stats]);

  if (loading || !data || !stats) return <LoadingSkeleton />;

  return (
    <div className="min-h-screen bg-white">
      {/* Minimal Header */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-8 h-16 flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-900">Quiz Results</div>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            Dashboard
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-16 pb-32">
        {/* Hero */}
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

        {/* Questions List - Pure Whitespace Separation */}
        <div className="mt-24 space-y-0 divide-y divide-slate-100">
          <div className="pb-6 mb-6">
            <h2 className="text-lg font-semibold text-slate-900">Question Analysis</h2>
            <p className="text-sm text-slate-500 mt-1">{stats.total} questions reviewed</p>
          </div>

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
      </div>
    </div>
  );
};

export default QuizResults;
