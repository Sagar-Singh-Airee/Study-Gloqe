// src/pages/QuizPage.jsx - PREMIUM QUIZ EXPERIENCE
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Flag,
  CheckCircle2,
  Circle,
  Lightbulb,
  AlertCircle,
  Save,
  X,
  Check,
  Brain,
  Target,
  TrendingUp
} from 'lucide-react';
import { useAuth } from '@contexts/AuthContext';
import { getQuiz, startQuizSession, submitQuizAnswer, completeQuizSession } from '@services/quizService';
import toast from 'react-hot-toast';


const QuizPage = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  const [quiz, setQuiz] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [showHint, setShowHint] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  
  const autoSaveTimerRef = useRef(null);
  const questionRefs = useRef([]);


  // Load quiz and start session
  useEffect(() => {
    if (!quizId || !user?.uid) {
      toast.error('Invalid quiz or user');
      navigate('/dashboard', { replace: true });
      return;
    }

    loadQuiz();
  }, [quizId, user]);


  // Timer effect
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleSubmit(true); // Auto-submit when time runs out
          return 0;
        }
        
        // Warning at 5 minutes
        if (prev === 300) {
          toast.warning('⏰ 5 minutes remaining!', { duration: 5000 });
        }
        
        // Warning at 1 minute
        if (prev === 60) {
          toast.error('⚠️ Only 1 minute left!', { duration: 5000 });
        }
        
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining]);


  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (submitting || showExitModal) return;

      // Number keys (1-4) to select answers
      if (e.key >= '1' && e.key <= '4') {
        const choiceIndex = parseInt(e.key) - 1;
        if (quiz?.questions[currentQuestion]?.choices[choiceIndex]) {
          handleAnswer(quiz.questions[currentQuestion].id, choiceIndex);
        }
      }
      
      // Arrow keys for navigation
      if (e.key === 'ArrowLeft' && currentQuestion > 0) {
        setCurrentQuestion(prev => prev - 1);
      }
      if (e.key === 'ArrowRight' && currentQuestion < quiz?.questions.length - 1) {
        setCurrentQuestion(prev => prev + 1);
      }
      
      // H for hint toggle
      if (e.key === 'h' || e.key === 'H') {
        const questionId = quiz?.questions[currentQuestion]?.id;
        if (questionId && quiz.questions[currentQuestion].hint) {
          setShowHint(prev => ({ ...prev, [questionId]: !prev[questionId] }));
        }
      }
      
      // Escape to show exit modal
      if (e.key === 'Escape') {
        setShowExitModal(true);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentQuestion, quiz, submitting, showExitModal]);


  // Prevent accidental page close
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (!submitting && Object.keys(answers).length > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [answers, submitting]);


  // Welcome message
  useEffect(() => {
    if (quiz && location.state?.fromGeneration) {
      toast.success(
        `✨ Welcome to your ${location.state.difficulty || 'custom'} quiz! Good luck!`,
        { duration: 4000, icon: '🎯' }
      );
    }
  }, [quiz, location.state]);


  const loadQuiz = async () => {
    try {
      setLoading(true);
      const quizData = await getQuiz(quizId);
      
      if (!quizData) {
        throw new Error('Quiz not found');
      }

      setQuiz(quizData);

      // Start session
      const sessionIdResponse = await startQuizSession(quizId, user.uid);
      setSessionId(sessionIdResponse);

      // Set timer if quiz has time limit
      if (quizData.timeLimit) {
        setTimeRemaining(quizData.timeLimit * 60); // Convert minutes to seconds
      }

      console.log('Quiz loaded:', quizData.title);
      setLoading(false);
    } catch (error) {
      console.error('Error loading quiz:', error);
      toast.error(error.message || 'Failed to load quiz');
      navigate('/dashboard', { replace: true });
    }
  };


  // Auto-save with debounce
  const autoSaveAnswer = useCallback(async (questionId, answer) => {
    if (!sessionId) return;

    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Set saving state
    setAutoSaving(true);

    // Debounce auto-save by 1 second
    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        await submitQuizAnswer(sessionId, questionId, answer);
        setLastSaved(new Date());
        setAutoSaving(false);
      } catch (error) {
        console.error('Auto-save error:', error);
        setAutoSaving(false);
        toast.error('Failed to save answer', { duration: 2000 });
      }
    }, 1000);
  }, [sessionId]);


  const handleAnswer = (questionId, answerIndex) => {
    // Update local state immediately
    setAnswers(prev => ({
      ...prev,
      [questionId]: answerIndex
    }));

    // Trigger auto-save
    autoSaveAnswer(questionId, answerIndex);

    // Haptic feedback (if supported)
    if (window.navigator.vibrate) {
      window.navigator.vibrate(10);
    }
  };


  const handleSubmit = async (autoSubmit = false) => {
    const answeredCount = Object.keys(answers).length;
    const totalQuestions = quiz.questions.length;

    // Confirmation if not all questions answered (unless auto-submit)
    if (!autoSubmit && answeredCount < totalQuestions) {
      const unanswered = totalQuestions - answeredCount;
      const confirmSubmit = window.confirm(
        `You have ${unanswered} unanswered question${unanswered > 1 ? 's' : ''}. Submit anyway?`
      );
      if (!confirmSubmit) return;
    }

    setSubmitting(true);
    const toastId = toast.loading('Submitting your quiz...');

    try {
      // Clear auto-save timer
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      const results = await completeQuizSession(sessionId);
      
      toast.success(
        `Quiz submitted! Score: ${results.score}%`,
        { id: toastId, duration: 5000, icon: '🎉' }
      );

      // Navigate to results page
      setTimeout(() => {
        navigate(`/results/${sessionId}`, {
          replace: true,
          state: { 
            justCompleted: true,
            score: results.score,
            correct: results.correct,
            total: results.total
          }
        });
      }, 1000);

    } catch (error) {
      console.error('Error submitting quiz:', error);
      toast.error(error.message || 'Failed to submit quiz', { id: toastId });
      setSubmitting(false);
    }
  };


  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };


  const getTimeColor = () => {
    if (timeRemaining === null) return 'text-gray-700';
    if (timeRemaining < 60) return 'text-red-600';
    if (timeRemaining < 300) return 'text-yellow-600';
    return 'text-gray-700';
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-gray-700 rounded-full animate-spin mx-auto"></div>
          <p className="mt-6 text-gray-600 font-semibold">Loading your quiz...</p>
          <p className="mt-2 text-sm text-gray-400">Preparing questions</p>
        </div>
      </div>
    );
  }


  if (!quiz) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Quiz Not Found</h2>
          <p className="text-gray-600 mb-6">The quiz you're looking for doesn't exist.</p>
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


  const question = quiz.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / quiz.questions.length) * 100;
  const isAnswered = answers[question.id] !== undefined;
  const answeredCount = Object.keys(answers).length;
  const isLastQuestion = currentQuestion === quiz.questions.length - 1;


  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        
        {/* Header Card */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-2xl p-6 shadow-lg"
        >
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gray-900 rounded-xl">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-black text-gray-900">{quiz.title}</h1>
                  <p className="text-sm text-gray-600 font-semibold">
                    Question {currentQuestion + 1} of {quiz.questions.length}
                  </p>
                </div>
              </div>
            </div>

            {/* Timer & Stats */}
            <div className="flex flex-col gap-3">
              {timeRemaining !== null && (
                <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 ${
                  timeRemaining < 60 
                    ? 'bg-red-50 border-red-300 text-red-700' 
                    : timeRemaining < 300
                    ? 'bg-yellow-50 border-yellow-300 text-yellow-700'
                    : 'bg-gray-50 border-gray-200 text-gray-700'
                }`}>
                  <Clock size={20} className={getTimeColor()} />
                  <span className="font-mono font-bold text-lg">
                    {formatTime(timeRemaining)}
                  </span>
                </div>
              )}

              {/* Auto-save indicator */}
              <div className="flex items-center justify-end gap-2 text-xs">
                {autoSaving ? (
                  <>
                    <Save size={14} className="text-gray-400 animate-pulse" />
                    <span className="text-gray-500 font-semibold">Saving...</span>
                  </>
                ) : lastSaved ? (
                  <>
                    <Check size={14} className="text-green-600" />
                    <span className="text-gray-500 font-semibold">Saved</span>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-6 h-2.5 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 rounded-full"
            />
          </div>

          {/* Progress Text */}
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-gray-600 font-semibold">
              {answeredCount} of {quiz.questions.length} answered
            </span>
            <span className="text-gray-700 font-bold">
              {Math.round(progress)}% Complete
            </span>
          </div>
        </motion.div>

        {/* Question Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-2xl p-8 shadow-lg"
          >
            {/* Question Header */}
            <div className="flex items-start gap-4 mb-8">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-900 to-gray-700 flex items-center justify-center flex-shrink-0 shadow-md">
                <span className="text-white font-black text-lg">{currentQuestion + 1}</span>
              </div>
              <div className="flex-1">
                <p className="text-xl font-semibold text-gray-900 leading-relaxed mb-3">
                  {question.stem}
                </p>
                {question.topic && (
                  <span className="inline-block px-3 py-1 bg-gray-100 border border-gray-300 rounded-lg text-xs font-bold text-gray-700">
                    {question.topic}
                  </span>
                )}
              </div>
            </div>

            {/* Choices */}
            <div className="space-y-3 mb-6">
              {question.choices.map((choice, index) => {
                const isSelected = answers[question.id] === index;
                const choiceLabel = String.fromCharCode(65 + index); // A, B, C, D

                return (
                  <motion.button
                    key={index}
                    ref={(el) => (questionRefs.current[index] = el)}
                    onClick={() => handleAnswer(question.id, index)}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className={`w-full p-5 rounded-xl text-left transition-all duration-200 ${
                      isSelected
                        ? 'bg-gray-900 border-2 border-gray-900 text-white shadow-lg'
                        : 'bg-white border-2 border-gray-200 hover:border-gray-400 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-gray-100 text-gray-700 border border-gray-200'
                      }`}>
                        {choiceLabel}
                      </div>
                      <span className={`flex-1 font-semibold ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                        {choice}
                      </span>
                      {isSelected && (
                        <CheckCircle2 size={24} className="text-white flex-shrink-0" />
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Keyboard Shortcuts Hint */}
            <div className="mb-6 p-3 bg-gray-50 border border-gray-200 rounded-xl">
              <p className="text-xs text-gray-600 font-semibold">
                💡 <span className="font-bold">Keyboard shortcuts:</span> Press 1-4 to select answers, ← → to navigate, H for hint
              </p>
            </div>

            {/* Hint Section */}
            {question.hint && quiz.settings?.showHints && (
              <div className="mt-6">
                <button
                  onClick={() => setShowHint(prev => ({ 
                    ...prev, 
                    [question.id]: !prev[question.id] 
                  }))}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl font-semibold hover:bg-yellow-100 transition-all text-sm"
                >
                  <Lightbulb size={16} />
                  {showHint[question.id] ? 'Hide' : 'Show'} Hint
                </button>

                <AnimatePresence>
                  {showHint[question.id] && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="mt-4 p-4 rounded-xl bg-yellow-50 border-2 border-yellow-200"
                    >
                      <div className="flex items-start gap-3">
                        <Lightbulb size={18} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-gray-700 font-medium leading-relaxed">
                          {question.hint}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-2xl p-6 shadow-lg"
        >
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            {/* Navigation Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
                disabled={currentQuestion === 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 border-2 border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={18} />
                Previous
              </button>

              {!isLastQuestion ? (
                <button
                  onClick={() => setCurrentQuestion(prev => prev + 1)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-all shadow-md"
                >
                  Next
                  <ChevronRight size={18} />
                </button>
              ) : (
                <button
                  onClick={() => handleSubmit(false)}
                  disabled={submitting}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-bold hover:from-green-700 hover:to-green-800 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Flag size={18} />
                      Submit Quiz
                    </>
                  )}
                </button>
              )}

              <button
                onClick={() => setShowExitModal(true)}
                disabled={submitting}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-50 border-2 border-red-200 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-all disabled:opacity-50"
              >
                <X size={18} />
                Exit
              </button>
            </div>

            {/* Question Grid */}
            <div className="flex items-center gap-2 flex-wrap">
              {quiz.questions.map((q, index) => {
                const isCurrentQ = index === currentQuestion;
                const isAnsweredQ = answers[q.id] !== undefined;

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQuestion(index)}
                    disabled={submitting}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold transition-all ${
                      isCurrentQ
                        ? 'bg-gray-900 text-white scale-110 shadow-lg'
                        : isAnsweredQ
                        ? 'bg-green-100 text-green-700 border-2 border-green-300 hover:scale-105'
                        : 'bg-gray-50 text-gray-500 border-2 border-gray-200 hover:bg-gray-100 hover:scale-105'
                    }`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>

      </div>

      {/* Exit Confirmation Modal */}
      <AnimatePresence>
        {showExitModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowExitModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border-2 border-gray-200"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-red-100 rounded-xl">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-2xl font-black text-gray-900">Exit Quiz?</h3>
              </div>

              <p className="text-gray-600 mb-6 font-semibold">
                Your progress has been saved. You can resume this quiz later from your dashboard.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all"
                >
                  Exit Quiz
                </button>
                <button
                  onClick={() => setShowExitModal(false)}
                  className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};


export default QuizPage;
