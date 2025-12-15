// src/components/classroom/AnalyticsTab.jsx - REAL-TIME + GEMINI AI VERSION
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    TrendingUp, Users, Target, Clock, Award,
    Activity, BarChart3, Calendar, AlertTriangle,
    RefreshCw, Sparkles, UserCheck, UserX, Brain,
    Lightbulb, Zap, TrendingDown
} from 'lucide-react';
import {
    collection, query, where, onSnapshot, getDocs,
    orderBy, limit
} from 'firebase/firestore';
import { db } from '@shared/config/firebase';
import { useAIInsights } from '@student/hooks/useAIInsights';


// Skeleton Loader
const SkeletonCard = () => (
    <div className="bg-gray-100 rounded-2xl p-6 animate-pulse">
        <div className="flex items-center justify-between mb-4">
            <div className="w-6 h-6 bg-gray-200 rounded" />
            <div className="h-4 w-16 bg-gray-200 rounded" />
        </div>
        <div className="h-10 w-20 bg-gray-200 rounded mb-1" />
        <div className="h-3 w-24 bg-gray-200 rounded" />
    </div>
);


const AnalyticsTab = ({ classId, classData }) => {
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [timeframe, setTimeframe] = useState(30);

    // Real data state
    const [classMembers, setClassMembers] = useState([]);
    const [quizSessions, setQuizSessions] = useState([]);
    const [studySessions, setStudySessions] = useState([]);

    // Fetch class members
    useEffect(() => {
        if (!classId) {
            setLoading(false);
            return;
        }

        const unsubscribers = [];

        // Get class members (students)
        const membersQuery = query(
            collection(db, 'users'),
            where('classIds', 'array-contains', classId),
            limit(100)
        );

        const unsubMembers = onSnapshot(membersQuery, (snapshot) => {
            const members = [];
            snapshot.forEach((doc) => {
                members.push({ id: doc.id, ...doc.data() });
            });
            setClassMembers(members);
        }, (error) => {
            console.error('Error fetching class members:', error);
            // Fallback: try to get from class data
            if (classData?.students) {
                setClassMembers(classData.students.map(id => ({ id })));
            }
        });
        unsubscribers.push(unsubMembers);

        // Get quiz sessions for this class
        const quizQuery = query(
            collection(db, 'quizSessions'),
            where('classId', '==', classId),
            limit(200)
        );

        const unsubQuiz = onSnapshot(quizQuery, (snapshot) => {
            const sessions = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                sessions.push({ id: doc.id, ...data });
            });
            setQuizSessions(sessions);
        }, (error) => {
            console.error('Error fetching quiz sessions:', error);
        });
        unsubscribers.push(unsubQuiz);

        // Get study sessions for this class
        const studyQuery = query(
            collection(db, 'studySessions'),
            where('classId', '==', classId),
            limit(200)
        );

        const unsubStudy = onSnapshot(studyQuery, (snapshot) => {
            const sessions = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                if (data.status === 'completed') {
                    sessions.push({ id: doc.id, ...data });
                }
            });
            setStudySessions(sessions);
            setLoading(false);
        }, (error) => {
            console.error('Error fetching study sessions:', error);
            setLoading(false);
        });
        unsubscribers.push(unsubStudy);

        return () => {
            unsubscribers.forEach(unsub => unsub());
        };
    }, [classId, classData, timeframe]);

    // Calculate real stats
    const stats = useMemo(() => {
        const totalStudents = classMembers.length || classData?.studentCount || 0;

        // Get unique active students (had activity in timeframe)
        const activeStudentIds = new Set();
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - timeframe);

        quizSessions.forEach(session => {
            const sessionDate = session.createdAt?.toDate?.() || new Date(session.createdAt);
            if (sessionDate >= cutoffDate && session.userId) {
                activeStudentIds.add(session.userId);
            }
        });

        studySessions.forEach(session => {
            const sessionDate = session.startTime?.toDate?.() || new Date(session.startTime);
            if (sessionDate >= cutoffDate && session.userId) {
                activeStudentIds.add(session.userId);
            }
        });

        // Calculate average quiz score
        const recentQuizzes = quizSessions.filter(s => {
            if (!s.answers) return false;
            const sessionDate = s.createdAt?.toDate?.() || new Date(s.createdAt);
            return sessionDate >= cutoffDate;
        });

        let totalScore = 0;
        let quizCount = 0;
        recentQuizzes.forEach(session => {
            const answers = session.answers || {};
            const answerKeys = Object.keys(answers);
            let correct = 0;
            answerKeys.forEach(key => {
                if (answers[key]?.isCorrect) correct++;
            });
            if (answerKeys.length > 0) {
                totalScore += (correct / answerKeys.length) * 100;
                quizCount++;
            }
        });

        // Calculate average study time
        const totalStudyMinutes = studySessions.reduce((sum, s) => {
            const sessionDate = s.startTime?.toDate?.() || new Date(s.startTime);
            if (sessionDate >= cutoffDate) {
                return sum + (s.totalTime || 0);
            }
            return sum;
        }, 0);

        // Calculate completion rate (% of students who completed at least one quiz)
        const completionStudents = new Set(recentQuizzes.map(q => q.userId).filter(Boolean));
        const completionRate = totalStudents > 0
            ? Math.round((completionStudents.size / totalStudents) * 100)
            : 0;

        return {
            avgClassScore: quizCount > 0 ? Math.round(totalScore / quizCount) : 0,
            avgAttendance: totalStudents > 0
                ? Math.round((activeStudentIds.size / totalStudents) * 100)
                : 0,
            activeStudents: activeStudentIds.size,
            totalStudents,
            completionRate,
            avgStudyTime: activeStudentIds.size > 0
                ? Math.round(totalStudyMinutes / activeStudentIds.size)
                : 0,
            improvement: calculateImprovement(quizSessions, cutoffDate),
            topPerformers: getTopPerformers(quizSessions, 5)
        };
    }, [classMembers, classData, quizSessions, studySessions, timeframe]);

    // Calculate weekly performance data
    const performanceData = useMemo(() => {
        const weeks = [];
        const now = new Date();

        for (let i = 4; i >= 0; i--) {
            const weekStart = new Date(now);
            weekStart.setDate(weekStart.getDate() - (i * 7 + 7));
            const weekEnd = new Date(now);
            weekEnd.setDate(weekEnd.getDate() - (i * 7));

            const weekQuizzes = quizSessions.filter(s => {
                const date = s.createdAt?.toDate?.() || new Date(s.createdAt);
                return date >= weekStart && date < weekEnd && s.answers;
            });

            let totalScore = 0;
            let count = 0;
            weekQuizzes.forEach(session => {
                const answers = session.answers || {};
                const keys = Object.keys(answers);
                let correct = 0;
                keys.forEach(k => { if (answers[k]?.isCorrect) correct++; });
                if (keys.length > 0) {
                    totalScore += (correct / keys.length) * 100;
                    count++;
                }
            });

            weeks.push({
                week: `Week ${5 - i}`,
                score: count > 0 ? Math.round(totalScore / count) : 0
            });
        }

        return weeks;
    }, [quizSessions]);

    // Calculate category scores (based on subjects)
    const categoryScores = useMemo(() => {
        const subjectScores = {};

        quizSessions.forEach(session => {
            const subject = session.subject || 'General';
            const answers = session.answers || {};
            const keys = Object.keys(answers);
            let correct = 0;
            keys.forEach(k => { if (answers[k]?.isCorrect) correct++; });

            if (keys.length > 0) {
                if (!subjectScores[subject]) {
                    subjectScores[subject] = { total: 0, count: 0 };
                }
                subjectScores[subject].total += (correct / keys.length) * 100;
                subjectScores[subject].count++;
            }
        });

        return Object.entries(subjectScores)
            .map(([category, data]) => ({
                category,
                score: Math.round(data.total / data.count),
                total: 100
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 4);
    }, [quizSessions]);

    // Calculate student engagement levels
    const studentEngagement = useMemo(() => {
        const engagement = {
            high: new Set(),
            moderate: new Set(),
            low: new Set()
        };

        const studentActivity = {};

        quizSessions.forEach(s => {
            if (s.userId) {
                studentActivity[s.userId] = (studentActivity[s.userId] || 0) + 1;
            }
        });

        studySessions.forEach(s => {
            if (s.userId) {
                studentActivity[s.userId] = (studentActivity[s.userId] || 0) + 1;
            }
        });

        Object.entries(studentActivity).forEach(([userId, count]) => {
            if (count >= 10) engagement.high.add(userId);
            else if (count >= 3) engagement.moderate.add(userId);
            else engagement.low.add(userId);
        });

        // Students with no activity at all
        classMembers.forEach(member => {
            if (!studentActivity[member.id]) {
                engagement.low.add(member.id);
            }
        });

        const total = engagement.high.size + engagement.moderate.size + engagement.low.size;

        return [
            {
                name: 'Highly Active',
                count: engagement.high.size,
                percentage: total > 0 ? Math.round((engagement.high.size / total) * 100) : 0,
                color: 'bg-green-500'
            },
            {
                name: 'Moderately Active',
                count: engagement.moderate.size,
                percentage: total > 0 ? Math.round((engagement.moderate.size / total) * 100) : 0,
                color: 'bg-yellow-500'
            },
            {
                name: 'Low Activity',
                count: engagement.low.size,
                percentage: total > 0 ? Math.round((engagement.low.size / total) * 100) : 0,
                color: 'bg-red-500'
            },
        ];
    }, [classMembers, quizSessions, studySessions]);

    // Prepare data for AI
    const aiAnalyticsData = useMemo(() => ({
        avgClassScore: stats.avgClassScore,
        activeStudents: stats.activeStudents,
        totalStudents: stats.totalStudents,
        completionRate: stats.completionRate,
        avgStudyTime: stats.avgStudyTime,
        improvement: stats.improvement,
        studentEngagement,
        categoryScores,
        performanceHistory: performanceData
    }), [stats, studentEngagement, categoryScores, performanceData]);

    // Get AI insights using Gemini
    const { 
        insights: aiInsights, 
        trends: aiTrends, 
        loading: aiLoading,
        error: aiError,
        refresh: refreshAI 
    } = useAIInsights(aiAnalyticsData, !loading);

    // Generate fallback insights based on real data
    const fallbackInsights = useMemo(() => {
        const result = [];

        // Performance insight
        if (stats.avgClassScore >= 80) {
            result.push({
                icon: '📈',
                title: 'Strong Performance',
                description: `Class is performing well with ${stats.avgClassScore}% average score`,
                type: 'success'
            });
        } else if (stats.avgClassScore >= 60) {
            result.push({
                icon: '👍',
                title: 'Good Progress',
                description: `Class average is ${stats.avgClassScore}%. Encourage more practice.`,
                type: 'info'
            });
        } else if (stats.avgClassScore > 0) {
            result.push({
                icon: '⚠️',
                title: 'Needs Improvement',
                description: `Class average is ${stats.avgClassScore}%. Consider review sessions.`,
                type: 'warning'
            });
        }

        // Engagement insight
        const lowEngagement = studentEngagement.find(e => e.name === 'Low Activity');
        if (lowEngagement && lowEngagement.count > 0) {
            result.push({
                icon: '⚠️',
                title: 'Attention Needed',
                description: `${lowEngagement.count} student${lowEngagement.count !== 1 ? 's' : ''} showing low engagement - consider personalized check-ins`,
                type: 'warning'
            });
        }

        // Completion insight
        if (stats.completionRate >= 80) {
            result.push({
                icon: '💡',
                title: 'High Completion Rate',
                description: `${stats.completionRate}% of students have completed quizzes - great participation!`,
                type: 'success'
            });
        } else if (stats.completionRate > 0) {
            result.push({
                icon: '💡',
                title: 'Recommendation',
                description: `Only ${stats.completionRate}% completion rate. Try assigning shorter, more frequent quizzes.`,
                type: 'info'
            });
        }

        // Study time insight
        if (stats.avgStudyTime > 30) {
            result.push({
                icon: '✨',
                title: 'Great Study Habits',
                description: `Students average ${stats.avgStudyTime} minutes of study time`,
                type: 'success'
            });
        }

        return result.slice(0, 3);
    }, [stats, studentEngagement]);

    // Handle refresh
    const handleRefresh = async () => {
        setIsRefreshing(true);
        await refreshAI();
        await new Promise(resolve => setTimeout(resolve, 1000));
        setIsRefreshing(false);
    };

    // Loading state
    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2" />
                        <div className="h-4 w-64 bg-gray-100 rounded animate-pulse" />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-black">Class Analytics</h2>
                    <p className="text-gray-600">Real-time insights powered by AI</p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={timeframe}
                        onChange={(e) => setTimeframe(Number(e.target.value))}
                        className="px-4 py-2 bg-gray-100 border border-gray-200 rounded-xl font-bold text-sm focus:outline-none"
                    >
                        <option value={7}>Last 7 Days</option>
                        <option value={30}>Last 30 Days</option>
                        <option value={90}>Last 90 Days</option>
                    </select>
                    <button
                        onClick={handleRefresh}
                        disabled={isRefreshing || aiLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl font-bold hover:scale-105 transition-all disabled:opacity-50"
                    >
                        <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white"
                >
                    <div className="flex items-center justify-between mb-4">
                        <Target size={24} />
                        <div className="text-sm font-bold opacity-80">Class Avg</div>
                    </div>
                    <div className="text-4xl font-black mb-1">
                        {stats.avgClassScore > 0 ? `${stats.avgClassScore}%` : '--'}
                    </div>
                    <div className="text-sm opacity-80">Average Score</div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white"
                >
                    <div className="flex items-center justify-between mb-4">
                        <Users size={24} />
                        <div className="text-sm font-bold opacity-80">Active</div>
                    </div>
                    <div className="text-4xl font-black mb-1">{stats.activeStudents}/{stats.totalStudents}</div>
                    <div className="text-sm opacity-80">Active Students</div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white"
                >
                    <div className="flex items-center justify-between mb-4">
                        <Activity size={24} />
                        <div className="text-sm font-bold opacity-80">Completion</div>
                    </div>
                    <div className="text-4xl font-black mb-1">{stats.completionRate}%</div>
                    <div className="text-sm opacity-80">Quiz Completion</div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white"
                >
                    <div className="flex items-center justify-between mb-4">
                        <Clock size={24} />
                        <div className="text-sm font-bold opacity-80">Study Time</div>
                    </div>
                    <div className="text-4xl font-black mb-1">{stats.avgStudyTime}</div>
                    <div className="text-sm opacity-80">Avg Min/Student</div>
                </motion.div>
            </div>

            {/* AI-Generated Insights - Gemini Powered */}
            <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-6 text-white">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-xl">
                            <Brain size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black">Gemini AI Insights</h3>
                            <p className="text-xs text-white/80">Powered by Google Gemini</p>
                        </div>
                    </div>
                    <button
                        onClick={refreshAI}
                        disabled={aiLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl font-bold text-sm backdrop-blur-xl transition-all disabled:opacity-50"
                    >
                        <Sparkles size={16} className={aiLoading ? 'animate-spin' : ''} />
                        {aiLoading ? 'Analyzing...' : 'Refresh AI'}
                    </button>
                </div>

                <AnimatePresence mode="wait">
                    {aiLoading ? (
                        <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center justify-center py-12"
                        >
                            <div className="flex flex-col items-center gap-3">
                                <Zap size={40} className="animate-pulse" />
                                <p className="font-bold">AI analyzing your class data...</p>
                            </div>
                        </motion.div>
                    ) : aiError ? (
                        <motion.div
                            key="error"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <div className="bg-white/10 backdrop-blur-xl rounded-xl p-4 mb-4">
                                <div className="font-bold mb-1">⚠️ AI Temporarily Unavailable</div>
                                <div className="text-sm text-white/90">
                                    {aiError || 'Using fallback insights'}
                                </div>
                            </div>
                            {/* Show fallback insights */}
                            <div className="space-y-3">
                                {fallbackInsights.map((insight, idx) => (
                                    <div key={idx} className="bg-white/10 backdrop-blur-xl rounded-xl p-4">
                                        <div className="font-bold mb-1">{insight.icon} {insight.title}</div>
                                        <div className="text-sm text-white/90">{insight.description}</div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    ) : aiInsights ? (
                        <motion.div
                            key="insights"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="space-y-4"
                        >
                            {/* Summary */}
                            {aiInsights.summary && (
                                <div className="bg-white/15 backdrop-blur-xl rounded-xl p-4 border-2 border-white/30">
                                    <div className="font-black text-lg mb-2">📊 Overall Assessment</div>
                                    <div className="text-white/95">{aiInsights.summary}</div>
                                </div>
                            )}

                            {/* Insights */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {aiInsights.insights?.map((insight, idx) => (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.1 }}
                                        className={`bg-white/10 backdrop-blur-xl rounded-xl p-4 border-l-4 ${
                                            insight.type === 'success' ? 'border-green-400' :
                                            insight.type === 'warning' ? 'border-yellow-400' :
                                            insight.type === 'danger' ? 'border-red-400' :
                                            'border-blue-400'
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <span className="text-2xl">{insight.icon}</span>
                                            <div className="flex-1">
                                                <div className="font-bold mb-1">{insight.title}</div>
                                                <div className="text-sm text-white/90">{insight.description}</div>
                                                {insight.priority === 'high' && (
                                                    <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-red-500/30 rounded-full text-xs font-bold">
                                                        🔥 High Priority
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            {/* Recommendations */}
                            {aiInsights.recommendations?.length > 0 && (
                                <div className="bg-white/10 backdrop-blur-xl rounded-xl p-4">
                                    <div className="flex items-center gap-2 font-bold mb-3">
                                        <Lightbulb size={18} />
                                        <span>Recommended Actions</span>
                                    </div>
                                    <ul className="space-y-2">
                                        {aiInsights.recommendations.map((rec, idx) => (
                                            <li key={idx} className="flex items-start gap-2 text-sm text-white/95">
                                                <span className="text-yellow-300 font-bold">→</span>
                                                <span>{rec}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Trend Prediction */}
                            {aiTrends && (
                                <div className="bg-white/10 backdrop-blur-xl rounded-xl p-4">
                                    <div className="font-bold mb-2">📈 Performance Prediction</div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                            aiTrends.trend === 'improving' ? 'bg-green-500/30' :
                                            aiTrends.trend === 'declining' ? 'bg-red-500/30' :
                                            'bg-gray-500/30'
                                        }`}>
                                            {aiTrends.trend.toUpperCase()}
                                        </span>
                                        <span className="text-xs opacity-80">
                                            {aiTrends.confidence} confidence
                                        </span>
                                    </div>
                                    <div className="text-sm text-white/95 mb-2">{aiTrends.prediction}</div>
                                    {aiTrends.factors?.length > 0 && (
                                        <div className="text-xs text-white/80">
                                            Key factors: {aiTrends.factors.join(', ')}
                                        </div>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="bg-white/10 backdrop-blur-xl rounded-xl p-4"
                        >
                            <div className="font-bold mb-1">🤖 AI Ready</div>
                            <div className="text-sm text-white/90">
                                Click "Refresh AI" to generate insights
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Performance Trend */}
                <div className="bg-white rounded-2xl p-6 border border-gray-200">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
                            <TrendingUp size={20} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-black">Performance Trend</h3>
                            <p className="text-xs text-gray-500">Weekly average scores</p>
                        </div>
                    </div>

                    {performanceData.some(d => d.score > 0) ? (
                        <>
                            <div className="space-y-3">
                                {performanceData.map((data, idx) => (
                                    <div key={idx}>
                                        <div className="flex items-center justify-between mb-1 text-sm">
                                            <span className="font-medium text-gray-600">{data.week}</span>
                                            <span className="font-bold text-black">{data.score > 0 ? `${data.score}%` : '--'}</span>
                                        </div>
                                        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${data.score}%` }}
                                                transition={{ duration: 0.5, delay: idx * 0.1 }}
                                                className="h-full bg-gradient-to-r from-black to-gray-700"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-4 pt-4 border-t border-gray-200">
                                <div className={`flex items-center gap-2 ${stats.improvement >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {stats.improvement >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                    <span className="text-sm font-bold">
                                        {stats.improvement >= 0 ? '+' : ''}{stats.improvement}% from last period
                                    </span>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-48 text-center">
                            <AlertTriangle size={32} className="text-gray-300 mb-3" />
                            <p className="text-gray-500 font-medium">No quiz data yet</p>
                            <p className="text-gray-400 text-sm">Assign quizzes to see performance trends</p>
                        </div>
                    )}
                </div>

                {/* Category Performance */}
                <div className="bg-white rounded-2xl p-6 border border-gray-200">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
                            <BarChart3 size={20} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-black">Subject Performance</h3>
                            <p className="text-xs text-gray-500">Scores by subject</p>
                        </div>
                    </div>

                    {categoryScores.length > 0 ? (
                        <div className="space-y-4">
                            {categoryScores.map((cat, idx) => (
                                <div key={idx}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-bold text-black">{cat.category}</span>
                                        <span className="text-lg font-black text-black">{cat.score}%</span>
                                    </div>
                                    <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(cat.score / cat.total) * 100}%` }}
                                            transition={{ duration: 0.5, delay: idx * 0.1 }}
                                            className={`h-full ${
                                                cat.score >= 85 ? 'bg-green-500' :
                                                cat.score >= 70 ? 'bg-yellow-500' :
                                                'bg-red-500'
                                            }`}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-40 text-center">
                            <BarChart3 size={32} className="text-gray-300 mb-3" />
                            <p className="text-gray-500 font-medium">No subject data</p>
                            <p className="text-gray-400 text-sm">Complete quizzes to see breakdown</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Student Engagement */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
                        <Activity size={20} className="text-white" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-black">Student Engagement</h3>
                        <p className="text-xs text-gray-500">Activity levels breakdown</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {studentEngagement.map((level, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.1 }}
                            className="bg-gray-50 rounded-xl p-6 text-center"
                        >
                            <div className={`w-16 h-16 ${level.color} rounded-full flex items-center justify-center mx-auto mb-4`}>
                                <span className="text-2xl font-black text-white">{level.count}</span>
                            </div>
                            <div className="text-lg font-black text-black mb-1">{level.percentage}%</div>
                            <div className="text-sm text-gray-600 font-medium">{level.name}</div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// Helper functions
function calculateImprovement(quizSessions, cutoffDate) {
    if (!quizSessions || quizSessions.length < 2) return 0;

    const midpoint = new Date(cutoffDate);
    midpoint.setDate(midpoint.getDate() + 15);

    const recent = quizSessions.filter(s => {
        const date = s.createdAt?.toDate?.() || new Date(s.createdAt);
        return date >= midpoint;
    });

    const older = quizSessions.filter(s => {
        const date = s.createdAt?.toDate?.() || new Date(s.createdAt);
        return date < midpoint && date >= cutoffDate;
    });

    const calcAvg = (sessions) => {
        if (sessions.length === 0) return 0;
        let total = 0;
        let count = 0;
        sessions.forEach(s => {
            const answers = s.answers || {};
            const keys = Object.keys(answers);
            let correct = 0;
            keys.forEach(k => { if (answers[k]?.isCorrect) correct++; });
            if (keys.length > 0) {
                total += (correct / keys.length) * 100;
                count++;
            }
        });
        return count > 0 ? total / count : 0;
    };

    const recentAvg = calcAvg(recent);
    const olderAvg = calcAvg(older);

    if (olderAvg === 0) return recentAvg > 0 ? 100 : 0;
    return Math.round(((recentAvg - olderAvg) / olderAvg) * 100);
}

function getTopPerformers(quizSessions, limit = 5) {
    const userScores = {};

    quizSessions.forEach(s => {
        if (!s.userId || !s.answers) return;
        const answers = s.answers;
        const keys = Object.keys(answers);
        let correct = 0;
        keys.forEach(k => { if (answers[k]?.isCorrect) correct++; });

        if (keys.length > 0) {
            if (!userScores[s.userId]) {
                userScores[s.userId] = { total: 0, count: 0 };
            }
            userScores[s.userId].total += (correct / keys.length) * 100;
            userScores[s.userId].count++;
        }
    });

    return Object.entries(userScores)
        .map(([userId, data]) => ({
            userId,
            avgScore: Math.round(data.total / data.count),
            quizCount: data.count
        }))
        .sort((a, b) => b.avgScore - a.avgScore)
        .slice(0, limit);
}

export default AnalyticsTab;
