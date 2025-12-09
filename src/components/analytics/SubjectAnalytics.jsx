// src/components/analytics/SubjectAnalytics.jsx - Industry-Ready with AI Detection
import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Folder, ChevronRight, ArrowLeft, Brain, BookOpen, Atom, FlaskConical,
    Dna, Code, Landmark, TrendingUp as TrendIcon, BookMarked, Hammer, GraduationCap,
    Target, Trophy, Clock, CheckCircle2, XCircle, Zap, BarChart3, Award,
    TrendingUp, TrendingDown, Minus
} from 'lucide-react';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { categorizeQuizSession } from '@/helpers/subjectDetection';

// Subject icons - matching DocumentsSection
const SUBJECT_ICONS = {
    'Mathematics': BookOpen,
    'Physics': Atom,
    'Chemistry': FlaskConical,
    'Biology': Dna,
    'Computer Science': Code,
    'History': Landmark,
    'Economics': TrendIcon,
    'Literature': BookMarked,
    'Psychology': Brain,
    'Engineering': Hammer,
    'General': GraduationCap
};

// Get color based on score (professional color palette)
const getScoreColor = (score) => {
    if (score >= 90) return { text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', gradient: 'from-emerald-500 to-emerald-600' };
    if (score >= 75) return { text: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', gradient: 'from-blue-500 to-blue-600' };
    if (score >= 60) return { text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', gradient: 'from-amber-500 to-amber-600' };
    return { text: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', gradient: 'from-red-500 to-red-600' };
};

const SubjectAnalytics = () => {
    const { user } = useAuth();
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [sortBy, setSortBy] = useState('recent');
    const [quizSessions, setQuizSessions] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch quiz sessions with real-time updates
    useEffect(() => {
        if (!user?.uid) {
            setLoading(false);
            return;
        }

        console.log('📊 SubjectAnalytics: Fetching quiz sessions for user:', user.uid);

        const sessionsRef = collection(db, 'quizSessions');
        const q = query(
            sessionsRef,
            where('userId', '==', user.uid),
            limit(200)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const sessions = [];
            snapshot.forEach((doc) => {
                const data = doc.data();

                // AI-based subject categorization
                const categorizedSubject = categorizeQuizSession(data);

                sessions.push({
                    id: doc.id,
                    ...data,
                    subject: categorizedSubject, // Override with AI detection
                    completedAt: data.completedAt?.toDate?.() || data.createdAt?.toDate?.() || new Date(),
                    createdAt: data.createdAt?.toDate?.() || new Date()
                });
            });

            sessions.sort((a, b) => b.completedAt - a.completedAt);

            console.log('✅ SubjectAnalytics: Categorized', sessions.length, 'quiz sessions');
            console.log('📁 Subjects found:', [...new Set(sessions.map(s => s.subject))]);

            setQuizSessions(sessions);
            setLoading(false);
        }, (error) => {
            console.error('❌ SubjectAnalytics: Error:', error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user?.uid]);

    // Group and calculate stats by subject
    const subjectStats = useMemo(() => {
        const stats = {};

        quizSessions.forEach(session => {
            const subject = session.subject || 'General';

            if (!stats[subject]) {
                stats[subject] = {
                    quizzes: [],
                    scores: [],
                    totalScore: 0,
                    quizCount: 0,
                    bestScore: 0,
                    worstScore: 100,
                    totalCorrect: 0,
                    totalQuestions: 0,
                    lastAttempt: null,
                    totalTimeSpent: 0
                };
            }

            const score = session.score ?? session.progressPercentage ?? 0;

            stats[subject].quizzes.push(session);
            stats[subject].scores.push(score);
            stats[subject].totalScore += score;
            stats[subject].quizCount++;
            stats[subject].bestScore = Math.max(stats[subject].bestScore, score);

            if (score > 0) {
                stats[subject].worstScore = Math.min(stats[subject].worstScore, score);
            }

            // Count correct answers
            const answers = session.answers || {};
            Object.values(answers).forEach(a => {
                stats[subject].totalQuestions++;
                if (a.correct || a.answer > 0) {
                    stats[subject].totalCorrect++;
                }
            });

            // Time tracking
            if (session.duration) {
                stats[subject].totalTimeSpent += session.duration;
            }

            // Track last attempt
            const attemptDate = session.completedAt || session.createdAt;
            if (!stats[subject].lastAttempt || attemptDate > stats[subject].lastAttempt) {
                stats[subject].lastAttempt = attemptDate;
            }
        });

        // Calculate averages and trends
        Object.keys(stats).forEach(subject => {
            const s = stats[subject];
            s.avgScore = s.quizCount > 0 ? Math.round(s.totalScore / s.quizCount) : 0;
            s.accuracy = s.totalQuestions > 0 ? Math.round((s.totalCorrect / s.totalQuestions) * 100) : s.avgScore;

            // Calculate trend (last 5 quizzes)
            const recentScores = s.scores.slice(-5);
            if (recentScores.length >= 2) {
                const firstHalf = recentScores.slice(0, Math.ceil(recentScores.length / 2));
                const secondHalf = recentScores.slice(Math.ceil(recentScores.length / 2));
                const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
                const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
                s.trend = Math.round(secondAvg - firstAvg);
            } else {
                s.trend = 0;
            }

            s.avgTimePerQuiz = s.quizCount > 0 ? Math.round(s.totalTimeSpent / s.quizCount) : 0;
        });

        return stats;
    }, [quizSessions]);

    // Sort subjects
    const sortedSubjects = useMemo(() => {
        return Object.entries(subjectStats)
            .filter(([_, stats]) => stats.quizCount > 0)
            .sort((a, b) => {
                if (sortBy === 'score') return b[1].avgScore - a[1].avgScore;
                if (sortBy === 'count') return b[1].quizCount - a[1].quizCount;
                return (b[1].lastAttempt?.getTime() || 0) - (a[1].lastAttempt?.getTime() || 0);
            });
    }, [subjectStats, sortBy]);

    // Selected subject quizzes
    const selectedQuizzes = useMemo(() => {
        if (!selectedSubject) return [];
        return subjectStats[selectedSubject]?.quizzes || [];
    }, [selectedSubject, subjectStats]);

    // Render subject folder (Apple-style)
    const renderSubjectFolder = ([subject, stats], idx) => {
        const Icon = SUBJECT_ICONS[subject] || SUBJECT_ICONS['General'];
        const scoreColors = getScoreColor(stats.avgScore);

        return (
            <motion.div
                key={subject}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.04, duration: 0.3 }}
                onClick={() => setSelectedSubject(subject)}
                className="group relative cursor-pointer"
            >
                {/* Main card with glassmorphism */}
                <div className="relative bg-gradient-to-br from-white/95 via-white/90 to-gray-50/95 
                              backdrop-blur-xl rounded-3xl p-6 
                              border border-gray-200/60 hover:border-gray-300
                              shadow-lg hover:shadow-2xl hover:shadow-gray-300/40
                              transition-all duration-500 hover:-translate-y-2">

                    {/* Top accent bar */}
                    <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${scoreColors.gradient} rounded-t-3xl`} />

                    {/* Header with icon */}
                    <div className="flex items-start justify-between mb-5">
                        <div className={`w-16 h-16 bg-gradient-to-br ${scoreColors.gradient} rounded-2xl 
                                       flex items-center justify-center shadow-xl shadow-gray-300/30
                                       group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                            <Icon className="text-white" size={28} strokeWidth={2} />
                        </div>

                        {/* Trend badge */}
                        {stats.trend !== 0 && (
                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold
                                ${stats.trend > 0
                                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                    : 'bg-red-100 text-red-600 border border-red-200'
                                }`}>
                                {stats.trend > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                {Math.abs(stats.trend)}%
                            </div>
                        )}
                    </div>

                    {/* Subject name */}
                    <h3 className="text-xl font-black text-gray-900 mb-1 group-hover:text-gray-700 transition-colors">
                        {subject}
                    </h3>
                    <p className="text-sm text-gray-500 mb-4 font-medium">
                        {stats.quizCount} quiz{stats.quizCount !== 1 ? 'zes' : ''} completed
                    </p>

                    {/* Stats grid */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className={`${scoreColors.bg} ${scoreColors.border} border rounded-xl p-3.5 text-center`}>
                            <p className={`text-3xl font-black ${scoreColors.text} mb-1`}>
                                {stats.avgScore}%
                            </p>
                            <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">Average</p>
                        </div>
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-center">
                            <p className="text-3xl font-black text-gray-900 mb-1">{stats.bestScore}%</p>
                            <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">Best</p>
                        </div>
                    </div>

                    {/* Progress bar */}
                    <div className="space-y-2.5">
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-600 font-bold uppercase tracking-wide">Mastery Level</span>
                            <span className={`font-black ${scoreColors.text}`}>{stats.avgScore}%</span>
                        </div>
                        <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${stats.avgScore}%` }}
                                transition={{ duration: 1, delay: idx * 0.1 + 0.2, ease: "easeOut" }}
                                className={`h-full bg-gradient-to-r ${scoreColors.gradient} shadow-lg`}
                            />
                        </div>
                    </div>

                    {/* Footer info */}
                    <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-1.5">
                            <Clock size={13} className="text-gray-400" />
                            <span className="font-medium">
                                {stats.lastAttempt?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                        </div>
                        <ChevronRight className="text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all" size={18} />
                    </div>
                </div>
            </motion.div>
        );
    };

    // Render individual quiz card
    const renderQuizCard = (quiz, idx) => {
        const score = quiz.score ?? quiz.progressPercentage ?? 0;
        const scoreColors = getScoreColor(score);
        const date = quiz.completedAt || quiz.createdAt || new Date();
        const isPassed = score >= 70;

        return (
            <motion.div
                key={quiz.id || idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03, duration: 0.25 }}
                className="bg-white/95 backdrop-blur-sm rounded-2xl p-5 
                          border border-gray-200/70 hover:border-gray-300
                          hover:shadow-xl hover:shadow-gray-200/50
                          transition-all duration-300 group"
            >
                <div className="flex items-center gap-4">
                    {/* Score badge */}
                    <div className={`relative w-20 h-20 bg-gradient-to-br ${scoreColors.gradient} rounded-2xl 
                                   flex items-center justify-center shadow-lg flex-shrink-0
                                   group-hover:scale-105 transition-transform`}>
                        <div className="text-center">
                            <p className="text-2xl font-black text-white leading-none">{Math.round(score)}</p>
                            <p className="text-xs font-bold text-white/80">%</p>
                        </div>
                    </div>

                    {/* Quiz info */}
                    <div className="flex-1 min-w-0">
                        <h4 className="text-base font-bold text-gray-900 truncate mb-1.5 group-hover:text-gray-700">
                            {quiz.quizTitle || quiz.title || quiz.documentTitle || 'Unnamed Quiz'}
                        </h4>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1.5 font-medium">
                                <Clock size={13} className="text-gray-400" />
                                {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                            {quiz.totalQuestions && (
                                <span className="flex items-center gap-1.5 font-medium">
                                    <Target size={13} className="text-gray-400" />
                                    {quiz.correctAnswers || 0}/{quiz.totalQuestions}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Status badge */}
                    <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm
                        ${isPassed
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-red-50 text-red-600 border border-red-200'
                        }`}>
                        {isPassed ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                        <span>{isPassed ? 'Passed' : 'Review'}</span>
                    </div>
                </div>
            </motion.div>
        );
    };

    // Loading skeleton
    if (loading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white/60 rounded-3xl p-6 animate-pulse border border-gray-200">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-16 h-16 bg-gray-300 rounded-2xl" />
                            <div className="flex-1">
                                <div className="h-5 bg-gray-300 rounded w-1/3 mb-2" />
                                <div className="h-3 bg-gray-200 rounded w-1/2" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="h-20 bg-gray-200 rounded-xl" />
                            <div className="h-20 bg-gray-200 rounded-xl" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    // Empty state
    if (sortedSubjects.length === 0) {
        return (
            <div className="text-center py-20">
                <div className="w-24 h-24 bg-gradient-to-br from-gray-200 to-gray-100 rounded-full
                              flex items-center justify-center mx-auto mb-6 shadow-2xl">
                    <BarChart3 size={42} className="text-gray-400" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-3">No Quiz Analytics Yet</h3>
                <p className="text-gray-600 text-sm max-w-md mx-auto leading-relaxed">
                    Complete quizzes to see your performance analytics organized by subject with AI-powered categorization.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-7">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {selectedSubject && (
                        <button
                            onClick={() => setSelectedSubject(null)}
                            className="w-11 h-11 rounded-xl bg-white border border-gray-200
                                     hover:bg-gray-50 hover:border-gray-300 hover:shadow-md 
                                     transition-all flex items-center justify-center group"
                        >
                            <ArrowLeft size={20} className="text-gray-600 group-hover:text-gray-900" />
                        </button>
                    )}
                    <div>
                        <h3 className="text-2xl font-black text-gray-900">
                            {selectedSubject || 'Subject Performance'}
                        </h3>
                        <p className="text-sm text-gray-600 font-medium mt-0.5">
                            {selectedSubject
                                ? `${selectedQuizzes.length} quiz${selectedQuizzes.length !== 1 ? 'zes' : ''} • ${subjectStats[selectedSubject]?.avgScore || 0}% average`
                                : `${sortedSubjects.length} subject${sortedSubjects.length !== 1 ? 's' : ''} • ${quizSessions.length} total quizzes`
                            }
                        </p>
                    </div>
                </div>

                {/* Sort buttons */}
                {!selectedSubject && (
                    <div className="flex items-center gap-2">
                        {[
                            { value: 'recent', label: 'Recent', icon: Clock },
                            { value: 'score', label: 'Score', icon: Trophy },
                            { value: 'count', label: 'Count', icon: BarChart3 }
                        ].map(option => (
                            <button
                                key={option.value}
                                onClick={() => setSortBy(option.value)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all
                                    ${sortBy === option.value
                                        ? 'bg-gray-900 text-white shadow-lg'
                                        : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <option.icon size={16} />
                                {option.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Subject summary stats when drilling down */}
            {selectedSubject && subjectStats[selectedSubject] && (
                <div className="grid grid-cols-4 gap-4">
                    {[
                        { label: 'Best Score', value: `${subjectStats[selectedSubject].bestScore}%`, icon: Trophy, color: 'emerald' },
                        { label: 'Average', value: `${subjectStats[selectedSubject].avgScore}%`, icon: Target, color: 'blue' },
                        { label: 'Accuracy', value: `${subjectStats[selectedSubject].accuracy}%`, icon: CheckCircle2, color: 'purple' },
                        { label: 'XP Earned', value: (subjectStats[selectedSubject].quizCount * 50).toLocaleString(), icon: Zap, color: 'amber' }
                    ].map((stat, idx) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className={`bg-${stat.color}-50 border border-${stat.color}-200 rounded-2xl p-4`}
                        >
                            <div className="flex items-center gap-3">
                                <stat.icon size={22} className={`text-${stat.color}-600`} />
                                <div>
                                    <p className={`text-2xl font-black text-${stat.color}-900`}>{stat.value}</p>
                                    <p className="text-xs text-gray-600 font-bold uppercase tracking-wide">{stat.label}</p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Content */}
            <AnimatePresence mode="wait">
                {!selectedSubject ? (
                    <motion.div
                        key="folders"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    >
                        {sortedSubjects.map((entry, idx) => renderSubjectFolder(entry, idx))}
                    </motion.div>
                ) : (
                    <motion.div
                        key="quizzes"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-3"
                    >
                        {selectedQuizzes.length > 0 ? (
                            selectedQuizzes.map((quiz, idx) => renderQuizCard(quiz, idx))
                        ) : (
                            <div className="text-center py-16 bg-white/50 rounded-2xl border border-gray-200">
                                <Award size={48} className="text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500 font-medium">No quiz details available</p>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SubjectAnalytics;
