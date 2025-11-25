import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Flag,
  CheckCircle2,
  Circle,
  Lightbulb,
  SkipForward
} from 'lucide-react';
import { useAuth } from '@contexts/AuthContext';
import { getQuiz, startQuizSession, submitQuizAnswer, completeQuizSession } from '@services/quizService';
import toast from 'react-hot-toast';

const QuizPage = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [quiz, setQuiz] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [showHint, setShowHint] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadQuiz();
  }, [quizId]);

  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining]);

  const loadQuiz = async () => {
    try {
      const quizData = await getQuiz(quizId);
      setQuiz(quizData);

      // Start session
      const sessionIdResponse = await startQuizSession(quizId, user.uid);
      setSessionId(sessionIdResponse);

      // Set timer
      if (quizData.timeLimit) {
        setTimeRemaining(quizData.timeLimit * 60); // Convert minutes to seconds
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading quiz:', error);
      toast.error('Failed to load quiz');
      navigate('/dashboard');
    }
  };

  const handleAnswer = async (questionId, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));

    // Auto-save answer
    try {
      await submitQuizAnswer(sessionId, questionId, answer);
    } catch (error) {
      console.error('Error saving answer:', error);
    }
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length === 0) {
      toast.error('Please answer at least one question');
      return;
    }

    setSubmitting(true);

    try {
      const results = await completeQuizSession(sessionId);
      toast.success('Quiz submitted successfully!');
      navigate(`/results/${sessionId}`);
    } catch (error) {
      console.error('Error submitting quiz:', error);
      toast.error('Failed to submit quiz');
      setSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-primary-300">Loading quiz...</p>
        </div>
      </div>
    );
  }

  const question = quiz.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / quiz.questions.length) * 100;
  const isAnswered = answers[question.id] !== undefined;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">{quiz.title}</h1>
            <p className="text-sm text-primary-400">
              Question {currentQuestion + 1} of {quiz.questions.length}
            </p>
          </div>

          {timeRemaining !== null && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${
              timeRemaining < 60 ? 'bg-error/20 text-error' : 'bg-accent/20 text-accent'
            }`}>
              <Clock size={20} />
              <span className="font-mono font-bold">
                {formatTime(timeRemaining)}
              </span>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mt-4 h-2 bg-primary-800 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-gradient-to-r from-accent to-blue-600"
          />
        </div>
      </motion.div>

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="card"
        >
          {/* Question */}
          <div className="mb-8">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-accent to-blue-600 flex items-center justify-center flex-shrink-0 font-bold">
                {currentQuestion + 1}
              </div>
              <div className="flex-1">
                <p className="text-xl font-medium leading-relaxed">{question.stem}</p>
                {question.tags && question.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {question.tags.map((tag, index) => (
                      <span key={index} className="badge badge-primary">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Choices */}
          <div className="space-y-3">
            {question.choices.map((choice, index) => {
              const isSelected = answers[question.id] === index;
              const choiceLabel = String.fromCharCode(65 + index); // A, B, C, D

              return (
                <button
                  key={index}
                  onClick={() => handleAnswer(question.id, index)}
                  className={`w-full p-4 rounded-xl text-left transition-all ${
                    isSelected
                      ? 'bg-accent/20 border-2 border-accent'
                      : 'border-2 border-white/10 hover:border-accent/50 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-semibold ${
                      isSelected
                        ? 'bg-accent text-white'
                        : 'bg-white/10'
                    }`}>
                      {choiceLabel}
                    </div>
                    <span className="flex-1">{choice}</span>
                    {isSelected && <CheckCircle2 size={24} className="text-accent" />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Hint */}
          {question.hint && (
            <div className="mt-6">
              <button
                onClick={() => setShowHint(!showHint)}
                className="btn-ghost flex items-center gap-2"
              >
                <Lightbulb size={18} />
                {showHint ? 'Hide' : 'Show'} Hint
              </button>

              <AnimatePresence>
                {showHint && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30"
                  >
                    <div className="flex items-start gap-2">
                      <Lightbulb size={18} className="text-yellow-500 flex-shrink-0 mt-1" />
                      <p className="text-sm text-primary-200">{question.hint}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
              disabled={currentQuestion === 0}
              className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={18} />
              Previous
            </button>

            {currentQuestion < quiz.questions.length - 1 ? (
              <button
                onClick={() => setCurrentQuestion(prev => prev + 1)}
                className="btn-secondary flex items-center gap-2"
              >
                Next
                <ChevronRight size={18} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="btn-primary flex items-center gap-2"
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
          </div>

          {/* Question Status */}
          <div className="flex items-center gap-1">
            {quiz.questions.map((q, index) => (
              <button
                key={q.id}
                onClick={() => setCurrentQuestion(index)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold transition-all ${
                  index === currentQuestion
                    ? 'bg-accent text-white scale-110'
                    : answers[q.id] !== undefined
                    ? 'bg-success/20 text-success border border-success/30'
                    : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>
        </div>

        {/* Answered Status */}
        <div className="mt-4 pt-4 border-t border-white/10 text-sm text-primary-400">
          Answered: {Object.keys(answers).length} of {quiz.questions.length} questions
        </div>
      </div>
    </div>
  );
};

export default QuizPage;