// src/pages/QuizPage.jsx
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Flag,
  CheckCircle2,
  Lightbulb,
  AlertCircle,
  Save,
  X,
  WifiOff,
  LayoutGrid,
  BrainCircuit,
  Timer,
  Zap,
  Book,
  Eye,
  EyeOff,
  SkipForward,
  Volume2,

} from 'lucide-react';
import { useAuth } from '@auth/contexts/AuthContext';
import {
  getQuiz,
  startQuizSession,
  submitQuizAnswer,
  completeQuizSession,
  getQuizResults
} from '@teacher/services/quizService';
import { trackAction } from '@gamification/services/achievementTracker';
import toast from 'react-hot-toast';

// ============================================
// SKELETON LOADER
// ============================================

const SkeletonLoader = () => (
  <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="h-20 bg-gray-200 rounded-2xl animate-pulse" />
      <div className="h-2 bg-gray-200 rounded-full animate-pulse" />
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-96 bg-gray-200 rounded-3xl animate-pulse" />
        <div className="h-96 bg-gray-200 rounded-3xl animate-pulse" />
      </div>
    </div>
  </div>
);

// ============================================
// PROGRESS RING COMPONENT
// ============================================

const ProgressRing = ({ current, total, size = 60 }) => {
  const circumference = 2 * Math.PI * (size / 2);
  const offset = circumference - (current / total) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={size / 2 - 2} fill="none" stroke="#F3F4F6" strokeWidth="3" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 2}
          fill="none"
          stroke="#1F2937"
          strokeWidth="3"
          strokeDasharray={circumference}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.5 }}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center flex-col">
        <span className="text-xs font-black text-gray-900">{current}</span>
        <span className="text-xs text-gray-500">/{total}</span>
      </div>
    </div>
  );
};

// ============================================
// TIMER COMPONENT
// ============================================

const TimerDisplay = ({ timeRemaining }) => {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const isLowTime = timeRemaining < 60;

  return (
    <motion.div
      animate={{
        scale: isLowTime ? [1, 1.05, 1] : 1,
      }}
      transition={{
        duration: isLowTime ? 1 : 0,
        repeat: isLowTime ? Infinity : 0,
      }}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 font-mono font-bold text-lg transition-all ${isLowTime
        ? 'bg-red-50 border-red-300 text-red-600 shadow-lg shadow-red-100'
        : timeRemaining < 300
          ? 'bg-yellow-50 border-yellow-200 text-yellow-600'
          : 'bg-gray-50 border-gray-200 text-gray-700'
        }`}
    >
      <Timer size={20} />
      <span>{minutes}:{seconds.toString().padStart(2, '0')}</span>
    </motion.div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

const QuizPage = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // State
  const [quiz, setQuiz] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [showHint, setShowHint] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [showExitModal, setShowExitModal] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showQuestionReview, setShowQuestionReview] = useState(false);

  const autoSaveTimerRef = useRef(null);

  // ============================================
  // NETWORK LISTENER
  // ============================================

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      toast.success('✅ Back online! Syncing answers...');
    };
    const handleOffline = () => {
      setIsOffline(true);
      toast.error('🔌 Offline mode activated. Answers will sync when connection returns.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ============================================
  // INITIALIZATION
  // ============================================

  useEffect(() => {
    if (!quizId || !user?.uid) return;

    const initQuiz = async () => {
      try {
        setLoading(true);

        const quizData = await getQuiz(quizId);
        setQuiz(quizData);

        const sessId = await startQuizSession(quizId, user.uid);
        setSessionId(sessId);

        try {
          const sessionData = await getQuizResults(sessId);
          if (sessionData?.session?.answers) {
            const loadedAnswers = {};
            Object.entries(sessionData.session.answers).forEach(([qId, val]) => {
              loadedAnswers[qId] = val.answer;
            });
            setAnswers(loadedAnswers);

            if (quizData.meta?.timeLimit && sessionData.session.startTime) {
              const elapsedSeconds = Math.floor(
                (Date.now() - sessionData.session.startTime.getTime()) / 1000
              );
              const totalSeconds = quizData.meta.timeLimit * 60;
              const remaining = Math.max(0, totalSeconds - elapsedSeconds);
              setTimeRemaining(remaining);
              toast.info('📝 Quiz resumed from previous session');
            } else if (quizData.meta?.timeLimit) {
              setTimeRemaining(quizData.meta.timeLimit * 60);
            }
          }
        } catch (e) {
          if (quizData.meta?.timeLimit) {
            setTimeRemaining(quizData.meta.timeLimit * 60);
          }
        }

        setLoading(false);
      } catch (error) {
        console.error(error);
        toast.error('Failed to load quiz');
        navigate('/dashboard');
      }
    };

    initQuiz();
  }, [quizId, user, navigate]);

  // ============================================
  // TIMER LOGIC
  // ============================================

  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit(true);
          return 0;
        }
        if (prev === 300) toast('⏰ 5 minutes remaining!');
        if (prev === 60) toast.error('⚠️ 1 minute remaining!');
        if (prev === 10) toast.error('🚨 10 seconds left!');
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleAnswer = useCallback(
    (questionId, answerIndex) => {
      setAnswers((prev) => ({ ...prev, [questionId]: answerIndex }));
      setSaveStatus('saving');

      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

      autoSaveTimerRef.current = setTimeout(async () => {
        if (isOffline) {
          setSaveStatus('error');
          return;
        }
        try {
          await submitQuizAnswer(sessionId, questionId, answerIndex);
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (error) {
          console.error(error);
          setSaveStatus('error');
        }
      }, 800);
    },
    [sessionId, isOffline]
  );

  const handleSubmit = async (autoSubmit = false) => {
    if (!autoSubmit) {
      const unanswered = quiz.questions.length - Object.keys(answers).length;
      if (unanswered > 0) {
        const confirmSubmit = window.confirm(
          `You have ${unanswered} unanswered question${unanswered > 1 ? 's' : ''}. Submit anyway?`
        );
        if (!confirmSubmit) return;
      }
    }

    setSubmitting(true);
    const toastId = toast.loading('⏳ Grading your quiz...');

    try {
      const result = await completeQuizSession(sessionId);

      // ✅ Track action for gamification & challenges
      await trackAction(user.uid, 'QUIZ_COMPLETED', {
        score: result.score,
        perfect: result.score === 100,
        quizId: quizId,
        subject: quiz.subject
      });

      toast.success(`🎉 Score: ${result.score}%`, { id: toastId, duration: 4000 });

      navigate(`/results/${sessionId}`, {
        replace: true,
        state: { justCompleted: true, ...result },
      });
    } catch (error) {
      toast.error('Submission failed. Please try again.', { id: toastId });
      setSubmitting(false);
    }
  };

  // ============================================
  // KEYBOARD NAVIGATION
  // ============================================

  useEffect(() => {
    const handleKey = (e) => {
      if (submitting || showExitModal || loading) return;

      if (e.key === 'ArrowRight' && currentQuestion < quiz.questions.length - 1) {
        setCurrentQuestion((c) => c + 1);
      }
      if (e.key === 'ArrowLeft' && currentQuestion > 0) {
        setCurrentQuestion((c) => c - 1);
      }
      if (['1', '2', '3', '4'].includes(e.key)) {
        const idx = parseInt(e.key) - 1;
        if (quiz.questions[currentQuestion]?.choices[idx]) {
          handleAnswer(quiz.questions[currentQuestion].id, idx);
        }
      }
      if (e.key === 'h' || e.key === 'H') {
        const qId = quiz.questions[currentQuestion]?.id;
        if (qId && quiz.questions[currentQuestion]?.hint) {
          setShowHint((p) => ({ ...p, [qId]: !p[qId] }));
        }
      }
      if (e.key === 'Escape') {
        setShowExitModal(true);
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [currentQuestion, quiz, submitting, showExitModal, loading, handleAnswer]);

  // ============================================
  // COMPUTED VALUES
  // ============================================

  const question = useMemo(
    () => quiz?.questions[currentQuestion],
    [quiz, currentQuestion]
  );

  const progress = useMemo(
    () => (Object.keys(answers).length / (quiz?.questions.length || 1)) * 100,
    [answers, quiz]
  );

  const answeredCount = Object.keys(answers).length;
  const isLastQuestion = currentQuestion === quiz?.questions.length - 1;
  const isAnswered = answers[question?.id] !== undefined;

  // ============================================
  // RENDER
  // ============================================

  if (loading) return <SkeletonLoader />;
  if (!quiz) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 font-sans text-gray-900 selection:bg-indigo-100">

      {/* ============================================ */}
      {/* OFFLINE BANNER */}
      {/* ============================================ */}

      <AnimatePresence>
        {isOffline && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-gradient-to-r from-gray-900 to-gray-800 text-white py-3 px-4 flex items-center justify-center gap-3 shadow-lg"
          >
            <WifiOff size={18} className="animate-pulse" />
            <span className="font-semibold">Offline mode active — answers saved locally</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================ */}
      {/* STICKY HEADER */}
      {/* ============================================ */}

      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4 mb-4">
            {/* Title */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 min-w-0"
            >
              <div className="p-2 bg-gray-900 text-white rounded-lg flex-shrink-0">
                <BrainCircuit size={20} />
              </div>
              <div className="min-w-0">
                <h1 className="font-black text-lg text-gray-900 truncate">{quiz.title}</h1>
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
                  <span className="px-2 py-0.5 bg-gray-100 rounded border border-gray-200 uppercase">
                    {quiz.difficulty || 'Medium'}
                  </span>
                  <span>•</span>
                  <span>{quiz.questions.length} Q</span>
                </div>
              </div>
            </motion.div>

            {/* Right Controls */}
            <div className="flex items-center gap-3">
              {/* Save Status */}
              <AnimatePresence mode="wait">
                {saveStatus === 'saving' && (
                  <motion.div
                    key="saving"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center gap-1.5 text-xs font-bold text-gray-500"
                  >
                    <div className="w-3 h-3 bg-gray-400 rounded-full animate-pulse" />
                    Saving
                  </motion.div>
                )}
                {saveStatus === 'saved' && (
                  <motion.div
                    key="saved"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center gap-1.5 text-xs font-bold text-green-600"
                  >
                    <CheckCircle2 size={14} />
                    Saved
                  </motion.div>
                )}
                {saveStatus === 'error' && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center gap-1.5 text-xs font-bold text-red-500"
                  >
                    <WifiOff size={14} />
                    Offline
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Timer */}
              {timeRemaining !== null && <TimerDisplay timeRemaining={timeRemaining} />}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-gray-600">{answeredCount} of {quiz.questions.length} answered</span>
              <span className="font-black text-gray-900">{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-gray-900 to-gray-700 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* MAIN CONTENT */}
      {/* ============================================ */}

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">

          {/* LEFT: Question Card */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuestion}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 min-h-[500px] flex flex-col"
              >
                {/* Question Header */}
                <div className="mb-8 pb-6 border-b border-gray-100">
                  <div className="flex items-start justify-between mb-4">
                    <span className="text-6xl font-black text-gray-100 select-none">
                      {(currentQuestion + 1).toString().padStart(2, '0')}
                    </span>
                    <div className="flex items-center gap-2">
                      {isAnswered && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="p-2 bg-green-50 rounded-lg"
                        >
                          <CheckCircle2 size={20} className="text-green-600" />
                        </motion.div>
                      )}
                      <span className="text-xs font-bold text-gray-500 px-3 py-1 bg-gray-100 rounded-lg">
                        Question {currentQuestion + 1}/{quiz.questions.length}
                      </span>
                    </div>
                  </div>

                  <h2 className="text-2xl md:text-3xl font-black text-gray-900 leading-tight mb-4">
                    {question.stem}
                  </h2>

                  {question.topic && (
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-bold border border-indigo-100">
                      <Book size={14} />
                      {question.topic}
                    </span>
                  )}
                </div>

                {/* Choices */}
                <div className="flex-1 space-y-3 mb-8">
                  {question.choices.map((choice, idx) => {
                    const isSelected = answers[question.id] === idx;
                    const label = String.fromCharCode(65 + idx);

                    return (
                      <motion.button
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        whileHover={{ scale: 1.01, x: 4 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => handleAnswer(question.id, idx)}
                        className={`w-full p-5 rounded-xl border-2 text-left transition-all flex items-start gap-4 group ${isSelected
                          ? 'border-gray-900 bg-gradient-to-br from-gray-900 to-gray-800 text-white shadow-lg shadow-gray-200'
                          : 'border-gray-200 bg-white hover:border-gray-400 text-gray-700 hover:shadow-md'
                          }`}
                      >
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold flex-shrink-0 transition-all ${isSelected
                            ? 'bg-white/20 text-white border border-white/30'
                            : 'bg-gray-100 text-gray-500 border border-gray-200 group-hover:bg-gray-200'
                            }`}
                        >
                          {label}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold leading-relaxed">{choice}</p>
                        </div>
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="flex-shrink-0 mt-1"
                          >
                            <CheckCircle2 size={24} className="text-white" />
                          </motion.div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                {/* Hint Section */}
                {question.hint && quiz.settings?.showHints && (
                  <div className="border-t border-gray-100 pt-6">
                    <button
                      onClick={() => setShowHint((p) => ({ ...p, [question.id]: !p[question.id] }))}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg border border-yellow-200 bg-yellow-50 text-yellow-700 font-bold text-sm hover:bg-yellow-100 transition-all"
                    >
                      <Lightbulb size={16} />
                      {showHint[question.id] ? 'Hide Hint' : 'Show Hint'}
                    </button>

                    <AnimatePresence>
                      {showHint[question.id] && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden mt-3"
                        >
                          <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl">
                            <div className="flex gap-3">
                              <Lightbulb className="text-yellow-600 flex-shrink-0 mt-0.5" size={18} />
                              <p className="text-sm text-yellow-900 leading-relaxed">{question.hint}</p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="mt-8 flex items-center justify-between gap-4">
              <button
                onClick={() => setCurrentQuestion((p) => Math.max(0, p - 1))}
                disabled={currentQuestion === 0}
                className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:border-gray-400 hover:shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={20} />
                Previous
              </button>

              <button
                onClick={() => setShowGrid(!showGrid)}
                className="p-3 text-gray-500 hover:text-gray-900 hover:bg-white rounded-xl border border-gray-200 transition-all lg:hidden"
              >
                <LayoutGrid size={20} />
              </button>

              {isLastQuestion ? (
                <button
                  onClick={() => handleSubmit(false)}
                  disabled={submitting}
                  className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-xl font-bold shadow-lg shadow-green-200 transition-all disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Flag size={20} />
                      Submit Quiz
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={() => setCurrentQuestion((p) => Math.min(quiz.questions.length - 1, p + 1))}
                  className="flex items-center gap-2 px-8 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-bold shadow-lg shadow-gray-200 transition-all"
                >
                  Next
                  <ChevronRight size={20} />
                </button>
              )}
            </div>
          </div>

          {/* RIGHT: Question Map */}
          <div className={`${showGrid ? 'block' : 'hidden'} lg:block`}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sticky top-28 space-y-6"
            >
              {/* Header */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-black text-gray-900">Question Map</h3>
                  <ProgressRing current={answeredCount} total={quiz.questions.length} />
                </div>
                <p className="text-xs text-gray-500 font-semibold">Click to navigate</p>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-5 gap-2 max-h-[350px] overflow-y-auto custom-scrollbar pr-1">
                {quiz.questions.map((q, idx) => {
                  const isActive = idx === currentQuestion;
                  const isAnsweredQ = answers[q.id] !== undefined;

                  return (
                    <motion.button
                      key={q.id}
                      onClick={() => setCurrentQuestion(idx)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`aspect-square rounded-lg font-bold text-sm transition-all border-2 ${isActive
                        ? 'bg-gray-900 text-white border-gray-900 shadow-lg scale-110 z-10'
                        : isAnsweredQ
                          ? 'bg-green-50 text-green-700 border-green-300 hover:shadow-md'
                          : 'bg-gray-50 text-gray-400 border-gray-200 hover:border-gray-400 hover:shadow-md'
                        }`}
                    >
                      {isAnsweredQ && isActive && <CheckCircle2 size={16} className="mx-auto" />}
                      {isAnsweredQ && !isActive && <CheckCircle2 size={14} className="mx-auto" />}
                      {!isAnsweredQ && idx + 1}
                    </motion.button>
                  );
                })}
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setShowExitModal(true)}
                  className="w-full py-2.5 px-4 rounded-lg border-2 border-red-200 text-red-600 font-bold hover:bg-red-50 transition-all text-sm flex items-center justify-center gap-2"
                >
                  <X size={16} />
                  Exit Quiz
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* EXIT MODAL */}
      {/* ============================================ */}

      <AnimatePresence>
        {showExitModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowExitModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-8 max-w-md w-full border border-gray-100 shadow-2xl"
            >
              <div className="w-14 h-14 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={28} />
              </div>

              <h3 className="text-2xl font-black text-center text-gray-900 mb-2">
                Exit this quiz?
              </h3>
              <p className="text-gray-600 text-center mb-8 text-sm leading-relaxed">
                Your progress is saved automatically. You can resume anytime from your dashboard.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowExitModal(false)}
                  className="py-3 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold transition-all"
                >
                  Keep Answering
                </button>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-all shadow-lg shadow-red-200"
                >
                  Exit Quiz
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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

export default QuizPage;
