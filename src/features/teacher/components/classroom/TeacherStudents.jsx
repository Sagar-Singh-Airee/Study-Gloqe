// src/features/teacher/components/classroom/TeacherStudents.jsx - STUDENT MANAGEMENT & TRACKING 👥

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, Search, Filter, Download, Mail, MoreVertical,
    TrendingUp, Award, BookOpen, Brain, Clock, Target,
    CheckCircle, XCircle, AlertCircle, ChevronDown, Star,
    BarChart3, Eye, UserX, Send, MessageSquare
} from 'lucide-react';
import {
    collection, query, orderBy, onSnapshot, getDocs,
    doc, getDoc, deleteDoc, where
} from 'firebase/firestore';
import { db } from '@/shared/config/firebase';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const TeacherStudents = ({ classId, classData }) => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('name'); // name, xp, submissions, quizzes
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        inactive: 0,
        avgXP: 0,
        avgSubmissionRate: 0,
    });

    // Fetch Students Real-time
    useEffect(() => {
        if (!classId) return;

        const studentsRef = collection(db, 'classes', classId, 'students');
        const q = query(studentsRef, orderBy('joinedAt', 'desc'));

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const studentList = await Promise.all(
                snapshot.docs.map(async (docSnap) => {
                    const studentData = docSnap.data();

                    // Fetch user profile
                    const userDoc = await getDoc(doc(db, 'users', studentData.userId));
                    const userData = userDoc.exists() ? userDoc.data() : {};

                    // Get submission count
                    const submissionsQuery = query(
                        collection(db, 'classes', classId, 'assignments'),
                    );
                    const assignmentsSnap = await getDocs(submissionsQuery);

                    let submissionCount = 0;
                    for (const assignmentDoc of assignmentsSnap.docs) {
                        const submissionDoc = await getDoc(
                            doc(db, 'classes', classId, 'assignments', assignmentDoc.id, 'submissions', studentData.userId)
                        );
                        if (submissionDoc.exists()) submissionCount++;
                    }

                    // Get quiz attempts count
                    const quizzesQuery = query(
                        collection(db, 'classes', classId, 'quizzes'),
                    );
                    const quizzesSnap = await getDocs(quizzesQuery);

                    let quizAttemptCount = 0;
                    let totalQuizScore = 0;
                    for (const quizDoc of quizzesSnap.docs) {
                        const attemptQuery = query(
                            collection(db, 'classes', classId, 'quizzes', quizDoc.id, 'attempts'),
                            where('studentId', '==', studentData.userId)
                        );
                        const attemptSnap = await getDocs(attemptQuery);
                        if (!attemptSnap.empty) {
                            quizAttemptCount++;
                            const attempt = attemptSnap.docs[0].data();
                            totalQuizScore += attempt.score || 0;
                        }
                    }

                    const avgQuizScore = quizAttemptCount > 0 ? (totalQuizScore / quizAttemptCount).toFixed(1) : 0;

                    return {
                        id: docSnap.id,
                        userId: studentData.userId,
                        name: userData.displayName || studentData.name || 'Unknown',
                        email: userData.email || studentData.email,
                        photoURL: userData.photoURL || null,
                        xp: studentData.xp || 0,
                        level: studentData.level || 1,
                        joinedAt: studentData.joinedAt,
                        lastActive: studentData.lastActive,
                        submissionCount,
                        quizAttemptCount,
                        avgQuizScore,
                        totalAssignments: assignmentsSnap.size,
                        totalQuizzes: quizzesSnap.size,
                    };
                })
            );

            setStudents(studentList);
            calculateStats(studentList);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [classId]);

    // Calculate Stats
    const calculateStats = (studentList) => {
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const active = studentList.filter(s => {
            const lastActive = s.lastActive?.toDate();
            return lastActive && lastActive >= sevenDaysAgo;
        }).length;

        const totalXP = studentList.reduce((sum, s) => sum + (s.xp || 0), 0);
        const avgXP = studentList.length > 0 ? Math.round(totalXP / studentList.length) : 0;

        const totalSubmissionRate = studentList.reduce((sum, s) => {
            const rate = (s.submissionCount / (s.totalAssignments || 1)) * 100;
            return sum + rate;
        }, 0);
        const avgSubmissionRate = studentList.length > 0 ? Math.round(totalSubmissionRate / studentList.length) : 0;

        setStats({
            total: studentList.length,
            active,
            inactive: studentList.length - active,
            avgXP,
            avgSubmissionRate,
        });
    };

    // Search & Sort
    const filteredStudents = students
        .filter(student =>
            student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            student.email?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .sort((a, b) => {
            switch (sortBy) {
                case 'xp':
                    return (b.xp || 0) - (a.xp || 0);
                case 'submissions':
                    return (b.submissionCount || 0) - (a.submissionCount || 0);
                case 'quizzes':
                    return (b.avgQuizScore || 0) - (a.avgQuizScore || 0);
                default:
                    return a.name.localeCompare(b.name);
            }
        });

    // Remove Student
    const handleRemoveStudent = async (studentId, studentName) => {
        if (!confirm(`Remove ${studentName} from this class?`)) return;

        try {
            await deleteDoc(doc(db, 'classes', classId, 'students', studentId));
            toast.success(`${studentName} removed successfully`);
        } catch (error) {
            console.error('Error removing student:', error);
            toast.error('Failed to remove student');
        }
    };

    // Export to CSV
    const handleExportCSV = () => {
        const csvContent = [
            ['Name', 'Email', 'XP', 'Level', 'Submissions', 'Quiz Avg', 'Joined Date'].join(','),
            ...filteredStudents.map(s => [
                s.name,
                s.email,
                s.xp,
                s.level,
                `${s.submissionCount}/${s.totalAssignments}`,
                `${s.avgQuizScore}%`,
                s.joinedAt ? format(s.joinedAt.toDate(), 'MMM d, yyyy') : 'N/A'
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${classData.name}_students.csv`;
        a.click();
        toast.success('Student list exported! 📊');
    };

    return (
        <div className="space-y-6">
            {/* Stats Overview */}
            <div className="grid md:grid-cols-5 gap-4">
                <StatCard
                    icon={Users}
                    label="Total Students"
                    value={stats.total}
                    gradient="from-blue-500 to-cyan-500"
                />
                <StatCard
                    icon={TrendingUp}
                    label="Active (7d)"
                    value={stats.active}
                    gradient="from-green-500 to-teal-500"
                />
                <StatCard
                    icon={AlertCircle}
                    label="Inactive"
                    value={stats.inactive}
                    gradient="from-orange-500 to-red-500"
                />
                <StatCard
                    icon={Award}
                    label="Avg XP"
                    value={stats.avgXP}
                    gradient="from-purple-500 to-pink-500"
                />
                <StatCard
                    icon={CheckCircle}
                    label="Avg Submission"
                    value={`${stats.avgSubmissionRate}%`}
                    gradient="from-yellow-500 to-orange-500"
                />
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 w-full">
                    {/* Search */}
                    <div className="relative flex-1 max-w-md">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search students..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all text-sm font-semibold"
                        />
                    </div>

                    {/* Sort */}
                    <div className="relative">
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="appearance-none pl-4 pr-10 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all text-sm font-bold text-gray-700 bg-white cursor-pointer"
                        >
                            <option value="name">Sort by Name</option>
                            <option value="xp">Sort by XP</option>
                            <option value="submissions">Sort by Submissions</option>
                            <option value="quizzes">Sort by Quiz Score</option>
                        </select>
                        <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                </div>

                {/* Export Button */}
                <button
                    onClick={handleExportCSV}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-xl text-sm font-bold hover:shadow-lg hover:scale-105 transition-all whitespace-nowrap"
                >
                    <Download size={18} />
                    Export CSV
                </button>
            </div>

            {/* Students Table/Grid */}
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3, 4].map(i => <StudentSkeleton key={i} />)}
                </div>
            ) : filteredStudents.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-300">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-full flex items-center justify-center mx-auto mb-5 border-4 border-white shadow-lg">
                        <Users size={40} className="text-blue-600" />
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 mb-2">
                        {searchQuery ? 'No Results Found' : 'No Students Yet'}
                    </h3>
                    <p className="text-sm text-gray-600 mb-6">
                        {searchQuery
                            ? 'Try adjusting your search'
                            : 'Students will appear here when they join your class'}
                    </p>
                    <div className="inline-flex items-center gap-2 px-6 py-3 bg-blue-50 border-2 border-blue-200 rounded-xl">
                        <span className="text-sm font-semibold text-gray-700">Class Code:</span>
                        <span className="text-2xl font-black text-blue-600 tracking-wider">{classData.classCode}</span>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm overflow-hidden">
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-gray-50 border-b-2 border-gray-200 font-black text-xs text-gray-600 uppercase">
                        <div className="col-span-3">Student</div>
                        <div className="col-span-2 text-center">Level & XP</div>
                        <div className="col-span-2 text-center">Assignments</div>
                        <div className="col-span-2 text-center">Quizzes</div>
                        <div className="col-span-2 text-center">Last Active</div>
                        <div className="col-span-1 text-center">Actions</div>
                    </div>

                    {/* Student Rows */}
                    <div className="divide-y-2 divide-gray-100">
                        {filteredStudents.map((student, idx) => (
                            <StudentRow
                                key={student.id}
                                student={student}
                                onRemove={handleRemoveStudent}
                                onViewDetails={() => {
                                    setSelectedStudent(student);
                                    setShowDetailsModal(true);
                                }}
                                delay={idx * 0.03}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Student Details Modal */}
            <AnimatePresence>
                {showDetailsModal && selectedStudent && (
                    <StudentDetailsModal
                        student={selectedStudent}
                        classData={classData}
                        onClose={() => {
                            setShowDetailsModal(false);
                            setSelectedStudent(null);
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

// Stat Card Component
const StatCard = ({ icon: Icon, label, value, gradient }) => {
    return (
        <motion.div
            whileHover={{ y: -4, scale: 1.02 }}
            className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-lg transition-all"
        >
            <div className={`w-12 h-12 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center mb-3`}>
                <Icon size={20} className="text-white" />
            </div>
            <div className="text-2xl font-black text-gray-900 mb-1">{value}</div>
            <div className="text-xs text-gray-600 font-semibold">{label}</div>
        </motion.div>
    );
};

// Student Row Component
const StudentRow = ({ student, onRemove, onViewDetails, delay }) => {
    const submissionRate = ((student.submissionCount / (student.totalAssignments || 1)) * 100).toFixed(0);
    const quizRate = ((student.quizAttemptCount / (student.totalQuizzes || 1)) * 100).toFixed(0);

    const lastActive = student.lastActive?.toDate();
    const lastActiveText = lastActive ? format(lastActive, 'MMM d, yyyy') : 'Never';

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay }}
            className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 transition-colors items-center"
        >
            {/* Student Info */}
            <div className="col-span-3 flex items-center gap-3">
                <img
                    src={student.photoURL || `https://ui-avatars.com/api/?name=${student.name}&background=random`}
                    alt={student.name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-md"
                />
                <div className="min-w-0">
                    <h4 className="font-black text-gray-900 text-sm truncate">{student.name}</h4>
                    <p className="text-xs text-gray-600 font-semibold truncate">{student.email}</p>
                </div>
            </div>

            {/* Level & XP */}
            <div className="col-span-2 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-lg">
                    <Award size={14} className="text-purple-600" />
                    <span className="font-black text-gray-900">Lv {student.level}</span>
                </div>
                <div className="text-xs text-gray-600 font-bold mt-1">{student.xp} XP</div>
            </div>

            {/* Assignments */}
            <div className="col-span-2 text-center">
                <div className="text-lg font-black text-gray-900 mb-1">
                    {student.submissionCount}/{student.totalAssignments}
                </div>
                <div className={`text-xs font-bold ${submissionRate >= 80 ? 'text-green-600' :
                        submissionRate >= 50 ? 'text-yellow-600' :
                            'text-red-600'
                    }`}>
                    {submissionRate}% Complete
                </div>
            </div>

            {/* Quizzes */}
            <div className="col-span-2 text-center">
                <div className="text-lg font-black text-gray-900 mb-1">
                    {student.quizAttemptCount}/{student.totalQuizzes}
                </div>
                <div className={`text-xs font-bold ${student.avgQuizScore >= 80 ? 'text-green-600' :
                        student.avgQuizScore >= 50 ? 'text-yellow-600' :
                            'text-red-600'
                    }`}>
                    {student.avgQuizScore}% Avg
                </div>
            </div>

            {/* Last Active */}
            <div className="col-span-2 text-center">
                <div className="text-xs font-semibold text-gray-600">{lastActiveText}</div>
            </div>

            {/* Actions */}
            <div className="col-span-1 flex items-center justify-center gap-2">
                <button
                    onClick={onViewDetails}
                    className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-all"
                    title="View Details"
                >
                    <Eye size={14} />
                </button>
                <button
                    onClick={() => onRemove(student.id, student.name)}
                    className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-all"
                    title="Remove"
                >
                    <UserX size={14} />
                </button>
            </div>
        </motion.div>
    );
};

// Student Skeleton
const StudentSkeleton = () => (
    <div className="bg-white border-2 border-gray-200 rounded-xl p-4 animate-pulse">
        <div className="grid grid-cols-12 gap-4 items-center">
            <div className="col-span-3 flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-200 rounded-full" />
                <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
            </div>
            <div className="col-span-2"><div className="h-8 bg-gray-100 rounded mx-auto w-20" /></div>
            <div className="col-span-2"><div className="h-8 bg-gray-100 rounded mx-auto w-16" /></div>
            <div className="col-span-2"><div className="h-8 bg-gray-100 rounded mx-auto w-16" /></div>
            <div className="col-span-2"><div className="h-6 bg-gray-100 rounded mx-auto w-24" /></div>
            <div className="col-span-1 flex gap-2 justify-center">
                <div className="w-8 h-8 bg-gray-100 rounded-lg" />
                <div className="w-8 h-8 bg-gray-100 rounded-lg" />
            </div>
        </div>
    </div>
);

// Student Details Modal
const StudentDetailsModal = ({ student, classData, onClose }) => {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto"
            >
                {/* Header */}
                <div className="text-center mb-6">
                    <img
                        src={student.photoURL || `https://ui-avatars.com/api/?name=${student.name}&background=random&size=128`}
                        alt={student.name}
                        className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-xl mx-auto mb-4"
                    />
                    <h2 className="text-2xl font-black text-gray-900 mb-1">{student.name}</h2>
                    <p className="text-sm text-gray-600 font-semibold">{student.email}</p>
                    <div className="flex items-center justify-center gap-3 mt-4">
                        <div className="px-4 py-2 bg-purple-50 border-2 border-purple-200 rounded-xl">
                            <div className="text-xs text-purple-700 font-bold uppercase mb-1">Level</div>
                            <div className="text-2xl font-black text-gray-900">{student.level}</div>
                        </div>
                        <div className="px-4 py-2 bg-yellow-50 border-2 border-yellow-200 rounded-xl">
                            <div className="text-xs text-yellow-700 font-bold uppercase mb-1">XP</div>
                            <div className="text-2xl font-black text-gray-900">{student.xp}</div>
                        </div>
                    </div>
                </div>

                {/* Performance Stats */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-4 bg-blue-50 rounded-xl border-2 border-blue-200">
                        <div className="flex items-center gap-2 mb-2">
                            <BookOpen size={18} className="text-blue-600" />
                            <span className="text-sm font-bold text-gray-700">Assignments</span>
                        </div>
                        <div className="text-3xl font-black text-gray-900 mb-1">
                            {student.submissionCount}/{student.totalAssignments}
                        </div>
                        <div className="text-xs font-bold text-blue-600">
                            {((student.submissionCount / (student.totalAssignments || 1)) * 100).toFixed(0)}% Complete
                        </div>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-xl border-2 border-purple-200">
                        <div className="flex items-center gap-2 mb-2">
                            <Brain size={18} className="text-purple-600" />
                            <span className="text-sm font-bold text-gray-700">Quizzes</span>
                        </div>
                        <div className="text-3xl font-black text-gray-900 mb-1">
                            {student.avgQuizScore}%
                        </div>
                        <div className="text-xs font-bold text-purple-600">
                            {student.quizAttemptCount} Attempts
                        </div>
                    </div>
                </div>

                {/* Additional Info */}
                <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <span className="text-sm font-bold text-gray-700">Joined:</span>
                        <span className="text-sm font-black text-gray-900">
                            {student.joinedAt && format(student.joinedAt.toDate(), 'MMM d, yyyy')}
                        </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <span className="text-sm font-bold text-gray-700">Last Active:</span>
                        <span className="text-sm font-black text-gray-900">
                            {student.lastActive ? format(student.lastActive.toDate(), 'MMM d, yyyy') : 'Never'}
                        </span>
                    </div>
                </div>

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl text-sm font-bold hover:shadow-lg transition-all"
                >
                    Close
                </button>
            </motion.div>
        </motion.div>
    );
};

export default TeacherStudents;
