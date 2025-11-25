import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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
  TrendingUp
} from 'lucide-react';
import { getQuizResults } from '@services/quizService';
import toast from 'react-hot-toast';

const QuizResults = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadResults();
  }, [sessionId]);

  const loadResults = async () => {
    try {
      const data = await getQuizResults(sessionId);
      setResults(data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading results:', error);
      toast.error('Failed to load results');
      navigate('/dashboard');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-primary-300">Loading results...</p>
        </div>
      </div>
    );
  }

  const { session, quiz, questionResults } = results;
  const percentage = (session.score / session.maxScore) * 100;
  const correctAnswers = questionResults.filter(r => r.isCorrect).length;
  const incorrectAnswers = questionResults.length - correctAnswers;

  const getGrade = (percentage) => {
    if (percentage >= 90) return { label: 'Excellent!', color: 'text-green-400', emoji: '🎉' };
    if (percentage >= 80) return { label: 'Great Job!', color: 'text-blue-400', emoji: '👏' };
    if (percentage >= 70) return { label: 'Good Work!', color: 'text-yellow-400', emoji: '👍' };
    if (percentage >= 60) return { label: 'Keep Trying!', color: 'text-orange-400', emoji: '💪' };
    return { label: 'Need More Practice', color: 'text-red-400', emoji: '📚' };
  };

  const grade = getGrade(percentage);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Results Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="card bg-gradient-to-br from-accent/20 to-blue-600/20 border-accent/30 text-center"
      >
        <div className="mb-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-r from-accent to-blue-600 flex items-center justify-center mx-auto mb-4">
            <Trophy size={40} />
          </div>
          <h1 className="text-4xl font-display font-bold mb-2">
            Quiz Complete! {grade.emoji}
          </h1>
          <p className={`text-2xl font-semibold ${grade.color}`}>
            {grade.label}
          </p>
        </div>

        {/* Score Display */}
        <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto">
          <div className="p-6 rounded-2xl glass">
            <div className="text-4xl font-bold gradient-text mb-2">
              {Math.round(percentage)}%
            </div>
            <div className="text-sm text-primary-300">Score</div>
          </div>

          <div className="p-6 rounded-2xl glass">
            <div className="text-4xl font-bold text-success mb-2">
              {correctAnswers}
            </div>
            <div className="text-sm text-primary-300">Correct</div>
          </div>

          <div className="p-6 rounded-2xl glass">
            <div className="text-4xl font-bold text-error mb-2">
              {incorrectAnswers}
            </div>
            <div className="text-sm text-primary-300">Incorrect</div>
          </div>
        </div>

        {/* XP Earned */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8 p-6 rounded-2xl bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30"
        >
          <div className="flex items-center justify-center gap-3">
            <Award size={32} className="text-yellow-400" />
            <div className="text-left">
              <div className="text-2xl font-bold text-yellow-400">
                +{session.score * 10} XP
              </div>
              <div className="text-sm text-primary-300">Experience Points Earned</div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
              <Target size={20} className="text-accent" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {session.score}/{session.maxScore}
              </div>
              <div className="text-sm text-primary-400">Points</div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Clock size={20} className="text-blue-400" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {Math.round((new Date(session.endTs?.seconds * 1000) - new Date(session.startTs?.seconds * 1000)) / 60000)} min
              </div>
              <div className="text-sm text-primary-400">Time Taken</div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <TrendingUp size={20} className="text-purple-400" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {Math.round((correctAnswers / questionResults.length) * 100)}%
              </div>
              <div className="text-sm text-primary-400">Accuracy</div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="card"
      >
        <div className="flex flex-wrap gap-4 justify-center">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="btn-primary flex items-center gap-2"
          >
            {showDetails ? 'Hide' : 'Show'} Detailed Results
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-secondary flex items-center gap-2"
          >
            <Home size={18} />
            Back to Dashboard
          </button>
          {quiz.settings?.allowRetake && (
            <button
              onClick={() => navigate(`/quiz/${quiz.id}`)}
              className="btn-secondary flex items-center gap-2"
            >
              <RotateCcw size={18} />
              Retake Quiz
            </button>
          )}
          <button className="btn-ghost flex items-center gap-2">
            <Share2 size={18} />
            Share Results
          </button>
        </div>
      </motion.div>

      {/* Detailed Results */}
      {showDetails && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card"
        >
          <h2 className="text-2xl font-display font-bold mb-6">Question Review</h2>

          <div className="space-y-6">
            {questionResults.map((result, index) => (
              <div
                key={index}
                className={`p-6 rounded-xl border-2 ${
                  result.isCorrect
                    ? 'border-success/30 bg-success/5'
                    : 'border-error/30 bg-error/5'
                }`}
              >
                {/* Question */}
                <div className="flex items-start gap-3 mb-4">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    result.isCorrect ? 'bg-success' : 'bg-error'
                  }`}>
                    {result.isCorrect ? (
                      <CheckCircle2 size={18} />
                    ) : (
                      <XCircle size={18} />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium mb-2">
                      Question {index + 1}: {result.question.stem}
                    </div>

                    {/* User Answer */}
                    <div className="space-y-2 mb-3">
                      <div className={`p-3 rounded-lg ${
                        result.isCorrect ? 'bg-success/20' : 'bg-error/20'
                      }`}>
                        <div className="text-sm text-primary-400 mb-1">Your Answer:</div>
                        <div>
                          {result.question.choices[result.userAnswer]}
                        </div>
                      </div>

                      {!result.isCorrect && (
                        <div className="p-3 rounded-lg bg-success/20">
                          <div className="text-sm text-primary-400 mb-1">Correct Answer:</div>
                          <div>
                            {result.question.choices[result.correctAnswer]}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Explanation */}
                    {result.explanation && (
                      <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                        <div className="text-sm text-primary-400 mb-1">Explanation:</div>
                        <div className="text-sm text-primary-200">
                          {result.explanation}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default QuizResults;