// src/components/classroom/QuizzesTab.jsx - FIXED WITH REAL DATA
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Plus, Brain, Clock, CheckCircle2, Play, Award,
    Calendar, Users, Target, TrendingUp, Edit, Trash2, Eye, Loader2
} from 'lucide-react';
import { useAuth } from '@auth/contexts/AuthContext';
import { collection, query, where, getDocs, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@shared/config/firebase';
import toast from 'react-hot-toast';

const QuizzesTab = ({ classId, isTeacher }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [quizAttempts, setQuizAttempts] = useState({});
    const [stats, setStats] = useState({
        total: 0,
        completed: 0,
        active: 0,
        avgScore: 0
    });

    const getStatusColor = (status) => {
        switch (status) {
            case 'active': return 'bg-green-100 text-green-700 border-green-200';
            case 'completed': return 'bg-gray-100 text-gray-700 border-gray-200';
            case 'upcoming': return 'bg-blue-100 text-blue-700 border-blue-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const getTypeColor = (type) => {
        switch (type) {
            case 'timed': return 'bg-red-50 text-red-700';
            case 'practice': return 'bg-blue-50 text-blue-700';
            case 'graded': return 'bg-purple-50 text-purple-700';
            default: return 'bg-gray-50 text-gray-700';
        }
    };

    const getDaysLeft = (dueDate) => {
        if (!dueDate) return 'No due date';
        const days = Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24));
        if (days < 0) return 'Expired';
        if (days === 0) return 'Due today';
        if (days === 1) return 'Due tomorrow';
        return `${days} days left`;
    };

    // Load quizzes from Firebase
    useEffect(() => {
        if (!classId) {
            setLoading(false);
            return;
        }

        // Real-time listener for class quizzes
        const quizzesRef = collection(db, 'quizzes');
        const q = query(
            quizzesRef,
            where('classId', '==', classId),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            try {
                const quizzesData = snapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        ...data,
                        dueDate: data.dueDate?.toDate?.() || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                        createdAt: data.createdAt?.toDate?.() || new Date(),
                        questions: data.questionCount || data.questions?.length || 10,
                        duration: data.timeLimit || 15,
                        points: data.maxPoints || 100,
                        status: determineStatus(data),
                        type: data.type || 'practice',
                        attempts: 0,
                        totalStudents: 0,
                        avgScore: 0
                    };
                });

                // Get quiz attempts/submissions for stats
                if (isTeacher && quizzesData.length > 0) {
                    const quizIds = quizzesData.map(q => q.id);
                    const sessionsRef = collection(db, 'quizSessions');
                    const sessionsQuery = query(
                        sessionsRef,
                        where('quizId', 'in', quizIds.slice(0, 10)) // Firestore 'in' limit
                    );

                    const sessionsSnap = await getDocs(sessionsQuery);
                    const sessionsByQuiz = {};
                    let totalScore = 0;
                    let totalCompleted = 0;

                    sessionsSnap.docs.forEach(doc => {
                        const session = doc.data();
                        if (!sessionsByQuiz[session.quizId]) {
                            sessionsByQuiz[session.quizId] = { attempts: 0, scores: [] };
                        }
                        sessionsByQuiz[session.quizId].attempts++;
                        if (session.score !== undefined) {
                            sessionsByQuiz[session.quizId].scores.push(session.score);
                            totalScore += session.score;
                            totalCompleted++;
                        }
                    });

                    // Update quiz data with real stats
                    quizzesData.forEach(quiz => {
                        const quizStats = sessionsByQuiz[quiz.id];
                        if (quizStats) {
                            quiz.attempts = quizStats.attempts;
                            quiz.avgScore = quizStats.scores.length > 0
                                ? Math.round(quizStats.scores.reduce((a, b) => a + b, 0) / quizStats.scores.length)
                                : 0;
                        }
                    });

                    // Calculate overall stats
                    const activeCount = quizzesData.filter(q => q.status === 'active').length;
                    const completedCount = quizzesData.filter(q => q.status === 'completed').length;
                    const avgScore = totalCompleted > 0 ? Math.round(totalScore / totalCompleted) : 0;

                    setStats({
                        total: quizzesData.length,
                        completed: completedCount,
                        active: activeCount,
                        avgScore: avgScore
                    });
                }

                setQuizzes(quizzesData);
            } catch (error) {
                console.error('Error processing quizzes:', error);
            } finally {
                setLoading(false);
            }
        }, (error) => {
            console.error('Error listening to quizzes:', error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [classId, isTeacher]);

    // Determine quiz status based on dates
    const determineStatus = (quiz) => {
        const now = new Date();
        const dueDate = quiz.dueDate?.toDate?.() || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const startDate = quiz.startDate?.toDate?.() || new Date(0);

        if (now < startDate) return 'upcoming';
        if (now > dueDate) return 'completed';
        return 'active';
    };

    const handleStartQuiz = (quiz) => {
        navigate(`/quiz/${quiz.id}`);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-black">Quizzes & Tests</h2>
                    <p className="text-gray-600">AI-powered assessments and practice tests</p>
                </div>
                {isTeacher && (
                    <button
                        onClick={() => toast.info('Quiz creator coming soon!')}
                        className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl font-bold hover:scale-105 transition-all"
                    >
                        <Plus size={20} />
                        Create Quiz
                    </button>
                )}
            </div>

            {/* Quick Stats - Real Data */}
            {isTeacher && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white">
                        <div className="flex items-center justify-between mb-2">
                            <Brain size={24} />
                            <span className="text-sm font-bold opacity-80">Total</span>
                        </div>
                        <div className="text-3xl font-black">{stats.total}</div>
                        <div className="text-sm opacity-80">Quizzes Created</div>
                    </div>

                    <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white">
                        <div className="flex items-center justify-between mb-2">
                            <CheckCircle2 size={24} />
                            <span className="text-sm font-bold opacity-80">Completed</span>
                        </div>
                        <div className="text-3xl font-black">{stats.completed}</div>
                        <div className="text-sm opacity-80">Finished Tests</div>
                    </div>

                    <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white">
                        <div className="flex items-center justify-between mb-2">
                            <Clock size={24} />
                            <span className="text-sm font-bold opacity-80">Active</span>
                        </div>
                        <div className="text-3xl font-black">{stats.active}</div>
                        <div className="text-sm opacity-80">Ongoing Quizzes</div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white">
                        <div className="flex items-center justify-between mb-2">
                            <Target size={24} />
                            <span className="text-sm font-bold opacity-80">Average</span>
                        </div>
                        <div className="text-3xl font-black">{stats.avgScore}%</div>
                        <div className="text-sm opacity-80">Class Average</div>
                    </div>
                </div>
            )}

            {/* Quizzes List */}
            <div className="grid gap-4">
                {quizzes.map((quiz, idx) => (
                    <motion.div
                        key={quiz.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-lg transition-all"
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4 flex-1">
                                {/* Icon */}
                                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <Brain size={28} className="text-white" />
                                </div>

                                <div className="flex-1">
                                    {/* Title & Badges */}
                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                        <h3 className="text-lg font-bold text-black">{quiz.title}</h3>
                                        <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${getStatusColor(quiz.status)}`}>
                                            {quiz.status}
                                        </span>
                                        <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${getTypeColor(quiz.type)}`}>
                                            {quiz.type}
                                        </span>
                                    </div>

                                    <p className="text-gray-600 text-sm mb-3">{quiz.description || 'No description'}</p>

                                    {/* Quiz Stats */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                                        <div className="bg-gray-50 rounded-lg p-3">
                                            <div className="text-xs text-gray-500 mb-1">Questions</div>
                                            <div className="text-lg font-black text-black">{quiz.questions}</div>
                                        </div>
                                        <div className="bg-gray-50 rounded-lg p-3">
                                            <div className="text-xs text-gray-500 mb-1">Duration</div>
                                            <div className="text-lg font-black text-black">{quiz.duration} min</div>
                                        </div>
                                        <div className="bg-gray-50 rounded-lg p-3">
                                            <div className="text-xs text-gray-500 mb-1">Points</div>
                                            <div className="text-lg font-black text-black">{quiz.points}</div>
                                        </div>
                                        <div className="bg-gray-50 rounded-lg p-3">
                                            <div className="text-xs text-gray-500 mb-1">Due Date</div>
                                            <div className="text-sm font-bold text-black">
                                                {quiz.dueDate?.toLocaleDateString?.() || 'No date'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Meta Info */}
                                    <div className="flex flex-wrap items-center gap-4 text-sm">
                                        <span className="flex items-center gap-1 text-gray-500">
                                            <Calendar size={14} />
                                            {getDaysLeft(quiz.dueDate)}
                                        </span>
                                        {isTeacher && (
                                            <>
                                                <span className="flex items-center gap-1 text-gray-500">
                                                    <Users size={14} />
                                                    {quiz.attempts} attempted
                                                </span>
                                                <span className="flex items-center gap-1 text-green-600 font-bold">
                                                    <TrendingUp size={14} />
                                                    Avg: {quiz.avgScore}%
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 ml-4">
                                {isTeacher ? (
                                    <>
                                        <button className="p-2 hover:bg-gray-100 rounded-lg transition-all">
                                            <Eye size={18} className="text-gray-600" />
                                        </button>
                                        <button className="p-2 hover:bg-gray-100 rounded-lg transition-all">
                                            <Edit size={18} className="text-gray-600" />
                                        </button>
                                        <button className="p-2 hover:bg-red-50 rounded-lg transition-all">
                                            <Trash2 size={18} className="text-red-600" />
                                        </button>
                                    </>
                                ) : quiz.status === 'active' ? (
                                    <button
                                        onClick={() => handleStartQuiz(quiz)}
                                        className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl font-bold hover:scale-105 transition-all flex items-center gap-2"
                                    >
                                        <Play size={18} />
                                        Start Quiz
                                    </button>
                                ) : (
                                    <button
                                        className="px-6 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-bold flex items-center gap-2"
                                    >
                                        <Award size={18} />
                                        View Result
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Progress Bar (Teacher View) */}
                        {isTeacher && quiz.attempts > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                                <div className="flex items-center justify-between mb-2 text-sm">
                                    <span className="text-gray-600">Completion Rate</span>
                                    <span className="font-bold text-black">
                                        {quiz.attempts} submission{quiz.attempts !== 1 ? 's' : ''}
                                    </span>
                                </div>
                                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min(quiz.attempts * 10, 100)}%` }}
                                        transition={{ duration: 0.5, delay: idx * 0.1 }}
                                        className="h-full bg-gradient-to-r from-purple-500 to-purple-600"
                                    />
                                </div>
                            </div>
                        )}
                    </motion.div>
                ))}
            </div>

            {/* Empty State */}
            {quizzes.length === 0 && (
                <div className="text-center py-20 bg-white border border-gray-200 rounded-2xl">
                    <Brain size={64} className="mx-auto text-gray-300 mb-4" />
                    <h3 className="text-xl font-bold text-black mb-2">No Quizzes Yet</h3>
                    <p className="text-gray-600 mb-6">
                        {isTeacher
                            ? 'Create your first AI-powered quiz'
                            : 'Your teacher hasn\'t created any quizzes yet'}
                    </p>
                    {isTeacher && (
                        <button
                            onClick={() => toast.info('Quiz creator coming soon!')}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl font-bold hover:scale-105 transition-all"
                        >
                            <Plus size={20} />
                            Create Quiz
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default QuizzesTab;
