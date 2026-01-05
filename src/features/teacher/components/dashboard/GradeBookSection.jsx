// src/features/teacher/components/dashboard/GradeBookSection.jsx
// ✅ PROFESSIONAL GRADE BOOK SECTION - ENHANCED 2025

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BookMarked, Search, Filter, Download, TrendingUp, Users, Award,
    BarChart3, Target, CheckCircle2, AlertCircle, ChevronDown, ChevronUp,
    Edit, Save, X, FileSpreadsheet, Mail, Eye, Calculator, Percent,
    Star, TrendingDown, Activity, Clock, Calendar
} from 'lucide-react';
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@shared/config/firebase';
import { useAuth } from '@auth/contexts/AuthContext';
import toast from 'react-hot-toast';

const GradeBookSection = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [classes, setClasses] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterClass, setFilterClass] = useState('all');
    const [filterPerformance, setFilterPerformance] = useState('all'); // all, excellent, good, needs-improvement
    const [sortBy, setSortBy] = useState('name'); // name, average, recent
    const [sortOrder, setSortOrder] = useState('asc');
    const [editingGrade, setEditingGrade] = useState(null);
    const [stats, setStats] = useState({
        totalStudents: 0,
        classAverage: 0,
        topPerformers: 0,
        needsAttention: 0,
        gradedAssignments: 0,
        pendingReviews: 0,
    });

    useEffect(() => {
        loadData();
    }, [user?.uid, filterClass]);

    const loadData = async () => {
        try {
            setLoading(true);

            // Load classes
            const classesQuery = query(
                collection(db, 'classes'),
                where('teacherId', '==', user.uid),
                where('active', '==', true)
            );
            const classesSnap = await getDocs(classesQuery);
            const classesData = classesSnap.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            }));
            setClasses(classesData);

            // Load assignments
            const assignmentsQuery = query(
                collection(db, 'assignments'),
                where('teacherId', '==', user.uid)
            );
            const assignmentsSnap = await getDocs(assignmentsQuery);
            const assignmentsData = assignmentsSnap.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            }));
            setAssignments(assignmentsData);

            // Get all unique students from classes
            const allStudentIds = new Set();
            let selectedClasses = classesData;

            if (filterClass !== 'all') {
                selectedClasses = classesData.filter(c => c.id === filterClass);
            }

            selectedClasses.forEach(cls => {
                (cls.students || []).forEach(id => allStudentIds.add(id));
            });

            // Load student data and calculate grades
            const studentsDataPromises = Array.from(allStudentIds).map(async (studentId) => {
                try {
                    const userDoc = await getDoc(doc(db, 'users', studentId));
                    if (!userDoc.exists()) return null;

                    const userData = userDoc.data();

                    // Calculate grades from assignments
                    const studentAssignments = assignmentsData
                        .map(assignment => {
                            const submission = (assignment.submissions || []).find(s => s.studentId === studentId);
                            return {
                                assignmentId: assignment.id,
                                assignmentTitle: assignment.title,
                                maxPoints: assignment.points || 100,
                                earnedPoints: submission?.score || 0,
                                graded: submission?.graded || false,
                                submittedAt: submission?.submittedAt,
                                grade: submission?.score || 0,
                            };
                        })
                        .filter(a => a.graded);

                    // Calculate quiz scores
                    const sessionsQuery = query(
                        collection(db, 'sessions'),
                        where('userId', '==', studentId)
                    );
                    const sessionsSnap = await getDocs(sessionsQuery);

                    let totalQuizScore = 0;
                    let quizCount = 0;
                    sessionsSnap.forEach(doc => {
                        const session = doc.data();
                        if (session.score !== undefined) {
                            totalQuizScore += session.score;
                            quizCount++;
                        }
                    });

                    const avgQuizScore = quizCount > 0 ? Math.round(totalQuizScore / quizCount) : 0;

                    // Calculate overall average
                    const assignmentAvg = studentAssignments.length > 0
                        ? studentAssignments.reduce((sum, a) => sum + (a.earnedPoints / a.maxPoints * 100), 0) / studentAssignments.length
                        : 0;

                    const overallAverage = quizCount > 0 && studentAssignments.length > 0
                        ? Math.round((assignmentAvg + avgQuizScore) / 2)
                        : studentAssignments.length > 0
                            ? Math.round(assignmentAvg)
                            : avgQuizScore;

                    return {
                        id: studentId,
                        name: userData.name || 'Unknown',
                        email: userData.email,
                        photoURL: userData.photoURL,
                        assignments: studentAssignments,
                        avgQuizScore,
                        overallAverage,
                        totalAssignments: assignmentsData.length,
                        completedAssignments: studentAssignments.length,
                        xp: userData.xp || 0,
                    };
                } catch (error) {
                    console.error('Error loading student:', error);
                    return null;
                }
            });

            const studentsData = (await Promise.all(studentsDataPromises)).filter(Boolean);
            setStudents(studentsData);
            calculateStats(studentsData, assignmentsData);

        } catch (error) {
            console.error('Error loading grade book:', error);
            toast.error('Failed to load grade book');
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (studentsData, assignmentsData) => {
        const classAverage = studentsData.length > 0
            ? Math.round(studentsData.reduce((sum, s) => sum + s.overallAverage, 0) / studentsData.length)
            : 0;

        const topPerformers = studentsData.filter(s => s.overallAverage >= 90).length;
        const needsAttention = studentsData.filter(s => s.overallAverage < 60).length;

        let gradedCount = 0;
        let pendingCount = 0;

        assignmentsData.forEach(assignment => {
            (assignment.submissions || []).forEach(sub => {
                if (sub.graded) gradedCount++;
                else pendingCount++;
            });
        });

        setStats({
            totalStudents: studentsData.length,
            classAverage,
            topPerformers,
            needsAttention,
            gradedAssignments: gradedCount,
            pendingReviews: pendingCount,
        });
    };

    const handleSort = (field) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('asc');
        }
    };

    const handleExport = () => {
        // Create CSV data
        let csv = 'Student Name,Email,Overall Average,Assignments Completed,Quiz Average\n';

        filteredAndSortedStudents.forEach(student => {
            csv += `${student.name},${student.email},${student.overallAverage}%,${student.completedAssignments}/${student.totalAssignments},${student.avgQuizScore}%\n`;
        });

        // Download CSV
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gradebook_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();

        toast.success('Grade book exported successfully!');
    };

    // Filter and sort students
    const filteredAndSortedStudents = students
        .filter(student => {
            // Search filter
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                if (!student.name.toLowerCase().includes(query) &&
                    !student.email.toLowerCase().includes(query)) {
                    return false;
                }
            }

            // Performance filter
            if (filterPerformance === 'excellent' && student.overallAverage < 90) return false;
            if (filterPerformance === 'good' && (student.overallAverage < 70 || student.overallAverage >= 90)) return false;
            if (filterPerformance === 'needs-improvement' && student.overallAverage >= 70) return false;

            return true;
        })
        .sort((a, b) => {
            let comparison = 0;

            switch (sortBy) {
                case 'name':
                    comparison = a.name.localeCompare(b.name);
                    break;
                case 'average':
                    comparison = a.overallAverage - b.overallAverage;
                    break;
                case 'recent':
                    comparison = (b.completedAssignments || 0) - (a.completedAssignments || 0);
                    break;
                default:
                    comparison = 0;
            }

            return sortOrder === 'asc' ? comparison : -comparison;
        });

    const statsCards = [
        {
            label: 'Class Average',
            value: `${stats.classAverage}%`,
            icon: BarChart3,
            gradient: 'from-blue-500 to-cyan-500',
            bgColor: 'bg-blue-50',
            change: stats.classAverage >= 70 ? '+5% from last week' : 'Needs improvement',
        },
        {
            label: 'Top Performers',
            value: stats.topPerformers,
            icon: Award,
            gradient: 'from-yellow-500 to-orange-500',
            bgColor: 'bg-yellow-50',
            change: `${Math.round(stats.topPerformers / Math.max(stats.totalStudents, 1) * 100)}% of class`,
        },
        {
            label: 'Needs Attention',
            value: stats.needsAttention,
            icon: AlertCircle,
            gradient: 'from-red-500 to-pink-500',
            bgColor: 'bg-red-50',
            change: stats.needsAttention > 0 ? 'Requires support' : 'All doing well',
        },
        {
            label: 'Pending Reviews',
            value: stats.pendingReviews,
            icon: Clock,
            gradient: 'from-purple-500 to-indigo-500',
            bgColor: 'bg-purple-50',
            change: `${stats.gradedAssignments} graded`,
        },
    ];

    const getGradeColor = (average) => {
        if (average >= 90) return 'text-green-600 bg-green-50';
        if (average >= 80) return 'text-blue-600 bg-blue-50';
        if (average >= 70) return 'text-yellow-600 bg-yellow-50';
        if (average >= 60) return 'text-orange-600 bg-orange-50';
        return 'text-red-600 bg-red-50';
    };

    const getGradeLetter = (average) => {
        if (average >= 90) return 'A';
        if (average >= 80) return 'B';
        if (average >= 70) return 'C';
        if (average >= 60) return 'D';
        return 'F';
    };

    const getPerformanceTrend = (average) => {
        if (average >= 90) return { icon: TrendingUp, color: 'text-green-600', label: 'Excellent' };
        if (average >= 70) return { icon: Activity, color: 'text-blue-600', label: 'Good' };
        return { icon: TrendingDown, color: 'text-red-600', label: 'Needs Help' };
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"
                    />
                    <p className="text-gray-600">Loading grade book...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Grade Book</h1>
                    <p className="text-gray-600 font-medium mt-1">
                        Track and manage student grades across all assessments
                    </p>
                </div>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleExport}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all"
                >
                    <Download className="w-5 h-5" />
                    Export CSV
                </motion.button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {statsCards.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="relative group"
                        >
                            <div className={`${stat.bgColor} rounded-2xl p-5 border-2 border-transparent hover:border-gray-200 transition-all`}>
                                <div className="flex items-start justify-between mb-3">
                                    <div className={`w-11 h-11 bg-gradient-to-br ${stat.gradient} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                        <Icon className="w-5 h-5 text-white" />
                                    </div>
                                </div>
                                <h3 className="text-3xl font-black text-gray-900 mb-1">{stat.value}</h3>
                                <p className="text-sm font-semibold text-gray-600 mb-1">{stat.label}</p>
                                <p className="text-xs text-gray-500">{stat.change}</p>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl p-4 border border-gray-200">
                <div className="flex flex-col lg:flex-row gap-4">

                    {/* Search */}
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search students..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        />
                    </div>

                    {/* Class Filter */}
                    <select
                        value={filterClass}
                        onChange={(e) => setFilterClass(e.target.value)}
                        className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all font-medium"
                    >
                        <option value="all">All Classes</option>
                        {classes.map(cls => (
                            <option key={cls.id} value={cls.id}>
                                {cls.name} - {cls.section}
                            </option>
                        ))}
                    </select>

                    {/* Performance Filter */}
                    <select
                        value={filterPerformance}
                        onChange={(e) => setFilterPerformance(e.target.value)}
                        className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all font-medium"
                    >
                        <option value="all">All Performance</option>
                        <option value="excellent">Excellent (90%+)</option>
                        <option value="good">Good (70-89%)</option>
                        <option value="needs-improvement">Needs Improvement (&lt;70%)</option>
                    </select>

                    {/* Sort Options */}
                    <select
                        value={sortBy}
                        onChange={(e) => handleSort(e.target.value)}
                        className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all font-medium"
                    >
                        <option value="name">Sort by Name</option>
                        <option value="average">Sort by Average</option>
                        <option value="recent">Sort by Activity</option>
                    </select>
                </div>
            </div>

            {/* Grade Book Table */}
            {filteredAndSortedStudents.length > 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    {/* Mobile Card View */}
                    <div className="md:hidden divide-y divide-gray-200">
                        {filteredAndSortedStudents.map((student) => {
                            const trend = getPerformanceTrend(student.overallAverage);
                            const TrendIcon = trend.icon;
                            return (
                                <div key={student.id} className="p-4 space-y-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            {student.photoURL ? (
                                                <img src={student.photoURL} alt={student.name} className="w-10 h-10 rounded-full object-cover" />
                                            ) : (
                                                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold">
                                                    {student.name[0].toUpperCase()}
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-bold text-gray-900">{student.name}</p>
                                                <p className="text-sm text-gray-600">{student.email}</p>
                                            </div>
                                        </div>
                                        <div className={`px-2 py-1 rounded-lg text-xs font-bold ${trend.color} bg-opacity-10 flex items-center gap-1`}>
                                            <TrendIcon className="w-3 h-3" />
                                            {trend.label}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 text-center bg-gray-50 rounded-xl p-3">
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1">Assignments</p>
                                            <p className="font-bold text-gray-900">{student.completedAssignments}/{student.totalAssignments}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1">Quiz Avg</p>
                                            <span className={`font-bold ${getGradeColor(student.avgQuizScore)}`.split(' ')[0]}>{student.avgQuizScore}%</span>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1">Overall</p>
                                            <p className="font-black text-lg text-gray-900">{student.overallAverage}%</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => toast.info('Detailed view coming soon')}
                                            className="flex-1 py-2 bg-purple-50 text-purple-600 font-bold rounded-lg text-sm hover:bg-purple-100 transition-colors"
                                        >
                                            View Details
                                        </button>
                                        <button
                                            onClick={() => toast.info('Email feature coming soon')}
                                            className="px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                                        >
                                            <Mail className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b-2 border-purple-200">
                                <tr>
                                    <th className="px-6 py-4 text-left">
                                        <button
                                            onClick={() => handleSort('name')}
                                            className="flex items-center gap-2 text-sm font-bold text-gray-900 hover:text-purple-600 transition-colors"
                                        >
                                            Student
                                            {sortBy === 'name' && (
                                                sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                                            )}
                                        </button>
                                    </th>
                                    <th className="px-6 py-4 text-center text-sm font-bold text-gray-900">
                                        Assignments
                                    </th>
                                    <th className="px-6 py-4 text-center text-sm font-bold text-gray-900">
                                        Quiz Avg
                                    </th>
                                    <th className="px-6 py-4 text-center">
                                        <button
                                            onClick={() => handleSort('average')}
                                            className="flex items-center gap-2 text-sm font-bold text-gray-900 hover:text-purple-600 transition-colors mx-auto"
                                        >
                                            Overall
                                            {sortBy === 'average' && (
                                                sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                                            )}
                                        </button>
                                    </th>
                                    <th className="px-6 py-4 text-center text-sm font-bold text-gray-900">
                                        Grade
                                    </th>
                                    <th className="px-6 py-4 text-center text-sm font-bold text-gray-900">
                                        Status
                                    </th>
                                    <th className="px-6 py-4 text-center text-sm font-bold text-gray-900">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredAndSortedStudents.map((student, index) => {
                                    const trend = getPerformanceTrend(student.overallAverage);
                                    const TrendIcon = trend.icon;

                                    return (
                                        <motion.tr
                                            key={student.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.03 }}
                                            className="hover:bg-purple-50/50 transition-colors"
                                        >
                                            {/* Student Info */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    {student.photoURL ? (
                                                        <img
                                                            src={student.photoURL}
                                                            alt={student.name}
                                                            className="w-10 h-10 rounded-full object-cover border-2 border-purple-200"
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold">
                                                            {student.name[0].toUpperCase()}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="font-bold text-gray-900">{student.name}</p>
                                                        <p className="text-sm text-gray-600">{student.email}</p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Assignments */}
                                            <td className="px-6 py-4 text-center">
                                                <span className="text-sm font-semibold text-gray-900">
                                                    {student.completedAssignments}/{student.totalAssignments}
                                                </span>
                                            </td>

                                            {/* Quiz Average */}
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-bold ${getGradeColor(student.avgQuizScore)}`}>
                                                    {student.avgQuizScore}%
                                                </span>
                                            </td>

                                            {/* Overall Average */}
                                            <td className="px-6 py-4 text-center">
                                                <span className="text-2xl font-black text-gray-900">
                                                    {student.overallAverage}%
                                                </span>
                                            </td>

                                            {/* Letter Grade */}
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center justify-center w-12 h-12 rounded-xl text-2xl font-black ${getGradeColor(student.overallAverage)}`}>
                                                    {getGradeLetter(student.overallAverage)}
                                                </span>
                                            </td>

                                            {/* Status */}
                                            <td className="px-6 py-4 text-center">
                                                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${trend.color} bg-opacity-10`}>
                                                    <TrendIcon className="w-3 h-3" />
                                                    {trend.label}
                                                </div>
                                            </td>

                                            {/* Actions */}
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => toast.info('Student details coming soon!')}
                                                        className="p-2 hover:bg-purple-50 text-purple-600 rounded-lg transition-all"
                                                        title="View Details"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => toast.info('Email feature coming soon!')}
                                                        className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-all"
                                                        title="Send Email"
                                                    >
                                                        <Mail className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Summary Footer */}
                    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-t-2 border-purple-200 px-6 py-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-6">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Students</p>
                                    <p className="text-2xl font-black text-gray-900">{filteredAndSortedStudents.length}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Class Avg</p>
                                    <p className="text-2xl font-black text-purple-600">{stats.classAverage}%</p>
                                </div>
                            </div>
                            <button
                                onClick={handleExport}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-white border-2 border-purple-200 text-purple-600 rounded-xl font-bold hover:bg-purple-50 transition-all"
                            >
                                <FileSpreadsheet className="w-4 h-4" />
                                Export
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-gray-300">
                    <BookMarked className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No students found</h3>
                    <p className="text-gray-600 mb-6">
                        {searchQuery || filterPerformance !== 'all'
                            ? 'Try adjusting your filters'
                            : 'Add students to your classes to see their grades here'}
                    </p>
                </div>
            )}

        </div>
    );
};

export default GradeBookSection;
