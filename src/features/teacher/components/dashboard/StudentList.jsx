// src/components/teacher/StudentList.jsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, Search, Filter, Mail, MessageSquare, MoreVertical,
    TrendingUp, TrendingDown, Award, Activity, Eye, Edit,
    Trash2, UserX, CheckCircle2, AlertCircle, Star,
    Calendar, Clock, Target, Download, Plus, X
} from 'lucide-react';
import { db } from '@shared/config/firebase';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

const StudentList = ({ classId, students = [] }) => {
    const [studentData, setStudentData] = useState([]);
    const [filteredStudents, setFilteredStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterPerformance, setFilterPerformance] = useState('all');
    const [sortBy, setSortBy] = useState('name');
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [showStudentModal, setShowStudentModal] = useState(false);
    const [showAddStudent, setShowAddStudent] = useState(false);
    const [newStudentEmail, setNewStudentEmail] = useState('');

    // Load student details
    useEffect(() => {
        if (!students || students.length === 0) {
            setStudentData([]);
            setFilteredStudents([]);
            setLoading(false);
            return;
        }

        loadStudentData();
    }, [students]);

    const loadStudentData = async () => {
        setLoading(true);
        try {
            const studentsWithData = await Promise.all(
                students.map(async (studentId) => {
                    try {
                        const userDoc = await getDoc(doc(db, 'users', studentId));
                        if (!userDoc.exists()) {
                            return null;
                        }

                        const userData = userDoc.data();

                        // Get student's quiz performance
                        const sessionsQuery = query(
                            collection(db, 'sessions'),
                            where('userId', '==', studentId)
                        );
                        const sessionsSnap = await getDocs(sessionsQuery);

                        let totalScore = 0;
                        let completedQuizzes = 0;
                        let lastActivity = null;

                        sessionsSnap.forEach(doc => {
                            const session = doc.data();
                            if (session.score !== undefined) {
                                totalScore += session.score;
                                completedQuizzes++;
                                const sessionDate = session.endTs?.toDate() || session.endTs;
                                if (!lastActivity || sessionDate > lastActivity) {
                                    lastActivity = sessionDate;
                                }
                            }
                        });

                        const avgScore = completedQuizzes > 0 ? Math.round(totalScore / completedQuizzes) : 0;

                        return {
                            id: studentId,
                            name: userData.name || 'Unknown',
                            email: userData.email || '',
                            photoURL: userData.photoURL || null,
                            avgScore,
                            completedQuizzes,
                            lastActivity,
                            xp: userData.xp || 0,
                            level: userData.level || 1,
                            streak: userData.streak || 0,
                            performance: avgScore >= 80 ? 'excellent' : avgScore >= 60 ? 'good' : 'needs-improvement'
                        };
                    } catch (error) {
                        console.error('Error loading student:', error);
                        return null;
                    }
                })
            );

            const validStudents = studentsWithData.filter(s => s !== null);
            setStudentData(validStudents);
            setFilteredStudents(validStudents);
        } catch (error) {
            console.error('Error loading student data:', error);
            toast.error('Failed to load student data');
        } finally {
            setLoading(false);
        }
    };

    // Filter and sort
    useEffect(() => {
        let filtered = [...studentData];

        // Search filter
        if (searchQuery.trim()) {
            filtered = filtered.filter(student =>
                student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                student.email.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Performance filter
        if (filterPerformance !== 'all') {
            filtered = filtered.filter(student => student.performance === filterPerformance);
        }

        // Sort
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'score':
                    return b.avgScore - a.avgScore;
                case 'activity':
                    return (b.lastActivity || 0) - (a.lastActivity || 0);
                default:
                    return 0;
            }
        });

        setFilteredStudents(filtered);
    }, [searchQuery, filterPerformance, sortBy, studentData]);

    const getTimeAgo = (date) => {
        if (!date) return 'Never';
        const d = date instanceof Date ? date : new Date(date);
        const seconds = Math.floor((new Date() - d) / 1000);
        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`;
        return d.toLocaleDateString();
    };

    const getPerformanceColor = (performance) => {
        switch (performance) {
            case 'excellent':
                return 'text-green-600 bg-green-50';
            case 'good':
                return 'text-blue-600 bg-blue-50';
            case 'needs-improvement':
                return 'text-orange-600 bg-orange-50';
            default:
                return 'text-gray-600 bg-gray-50';
        }
    };

    const getPerformanceIcon = (performance) => {
        switch (performance) {
            case 'excellent':
                return <Award size={14} />;
            case 'good':
                return <CheckCircle2 size={14} />;
            case 'needs-improvement':
                return <AlertCircle size={14} />;
            default:
                return null;
        }
    };

    const handleAddStudent = async () => {
        if (!newStudentEmail.trim()) {
            toast.error('Please enter a student email');
            return;
        }

        try {
            // Find user by email
            const usersQuery = query(
                collection(db, 'users'),
                where('email', '==', newStudentEmail.trim().toLowerCase())
            );
            const usersSnap = await getDocs(usersQuery);

            if (usersSnap.empty) {
                toast.error('Student not found');
                return;
            }

            const studentId = usersSnap.docs[0].id;

            // Add to class
            const classRef = doc(db, 'classes', classId);
            const updatedStudents = [...students, studentId];

            await updateDoc(classRef, {
                students: updatedStudents
            });

            toast.success('✅ Student added successfully!');
            setNewStudentEmail('');
            setShowAddStudent(false);
            loadStudentData();
        } catch (error) {
            console.error('Error adding student:', error);
            toast.error('Failed to add student');
        }
    };

    const handleRemoveStudent = async (studentId) => {
        if (!window.confirm('Remove this student from the class?')) return;

        try {
            const classRef = doc(db, 'classes', classId);
            const updatedStudents = students.filter(id => id !== studentId);

            await updateDoc(classRef, {
                students: updatedStudents
            });

            toast.success('Student removed');
            loadStudentData();
        } catch (error) {
            console.error('Error removing student:', error);
            toast.error('Failed to remove student');
        }
    };

    const handleViewStudent = (student) => {
        setSelectedStudent(student);
        setShowStudentModal(true);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-2xl font-black text-black">Students</h3>
                    <p className="text-gray-600 mt-1">{filteredStudents.length} of {studentData.length} students</p>
                </div>

                <button
                    onClick={() => setShowAddStudent(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-black text-white rounded-xl font-bold hover:scale-105 transition-transform"
                >
                    <Plus size={18} />
                    <span>Add Student</span>
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                {/* Search */}
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search students..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-black focus:ring-2 focus:ring-black/5 transition-all"
                    />
                </div>

                {/* Performance Filter */}
                <select
                    value={filterPerformance}
                    onChange={(e) => setFilterPerformance(e.target.value)}
                    className="px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-black focus:ring-2 focus:ring-black/5 transition-all font-medium"
                >
                    <option value="all">All Performance</option>
                    <option value="excellent">Excellent (80%+)</option>
                    <option value="good">Good (60-79%)</option>
                    <option value="needs-improvement">Needs Improvement (&lt;60%)</option>
                </select>

                {/* Sort */}
                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-black focus:ring-2 focus:ring-black/5 transition-all font-medium"
                >
                    <option value="name">Sort by Name</option>
                    <option value="score">Sort by Score</option>
                    <option value="activity">Sort by Activity</option>
                </select>
            </div>

            {/* Students List */}
            {filteredStudents.length > 0 ? (
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                        Student
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                        Performance
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                        Quizzes
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                        Last Active
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                        Level
                                    </th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredStudents.map((student, idx) => (
                                    <motion.tr
                                        key={student.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="hover:bg-gray-50 transition-colors"
                                    >
                                        {/* Student Info */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="relative">
                                                    <img
                                                        src={student.photoURL || `https://ui-avatars.com/api/?name=${student.name}&background=000&color=fff&bold=true`}
                                                        alt={student.name}
                                                        className="w-10 h-10 rounded-full ring-2 ring-gray-200"
                                                    />
                                                    {student.streak > 0 && (
                                                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                                            🔥
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-black">{student.name}</div>
                                                    <div className="text-xs text-gray-500">{student.email}</div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Performance */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${getPerformanceColor(student.performance)}`}>
                                                    {getPerformanceIcon(student.performance)}
                                                    {student.avgScore}%
                                                </span>
                                            </div>
                                        </td>

                                        {/* Quizzes */}
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-semibold text-black">{student.completedQuizzes}</div>
                                            <div className="text-xs text-gray-500">completed</div>
                                        </td>

                                        {/* Last Active */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                                <Clock size={14} />
                                                <span>{getTimeAgo(student.lastActivity)}</span>
                                            </div>
                                        </td>

                                        {/* Level */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center text-white text-xs font-bold">
                                                    {student.level}
                                                </div>
                                                <div>
                                                    <div className="text-xs font-bold text-black">Level {student.level}</div>
                                                    <div className="text-xs text-gray-500">{student.xp} XP</div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Actions */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleViewStudent(student)}
                                                    className="p-2 hover:bg-gray-100 rounded-lg transition-all"
                                                    title="View Details"
                                                >
                                                    <Eye size={16} className="text-gray-600" />
                                                </button>
                                                <button
                                                    onClick={() => window.location.href = `mailto:${student.email}`}
                                                    className="p-2 hover:bg-gray-100 rounded-lg transition-all"
                                                    title="Send Email"
                                                >
                                                    <Mail size={16} className="text-gray-600" />
                                                </button>
                                                <button
                                                    onClick={() => handleRemoveStudent(student.id)}
                                                    className="p-2 hover:bg-red-50 rounded-lg transition-all"
                                                    title="Remove from Class"
                                                >
                                                    <UserX size={16} className="text-red-600" />
                                                </button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-4 p-4">
                        {filteredStudents.map((student, idx) => (
                            <motion.div
                                key={student.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <img
                                                src={student.photoURL || `https://ui-avatars.com/api/?name=${student.name}&background=000&color=fff&bold=true`}
                                                alt={student.name}
                                                className="w-12 h-12 rounded-full ring-2 ring-gray-100"
                                            />
                                            {student.streak > 0 && (
                                                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                                    🔥
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-900">{student.name}</div>
                                            <div className="text-xs text-gray-500">{student.email}</div>
                                            <div className="flex items-center gap-1.5 mt-1">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${getPerformanceColor(student.performance)}`}>
                                                    {getPerformanceIcon(student.performance)}
                                                    {student.performance === 'needs-improvement' ? 'Needs Work' : student.performance}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleViewStudent(student)}
                                        className="p-2 bg-gray-50 rounded-lg text-gray-600"
                                    >
                                        <Eye size={20} />
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mb-4">
                                    <div className="bg-gray-50 rounded-lg p-2 text-center">
                                        <div className="text-lg font-black text-gray-900">{student.avgScore}%</div>
                                        <div className="text-[10px] uppercase font-bold text-gray-500">Avg Score</div>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-2 text-center">
                                        <div className="text-lg font-black text-gray-900">{student.completedQuizzes}</div>
                                        <div className="text-[10px] uppercase font-bold text-gray-500">Quizzes</div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-md flex items-center justify-center text-white text-[10px] font-bold">
                                            {student.level}
                                        </div>
                                        <span className="text-xs font-medium text-gray-600">{student.xp} XP</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => window.location.href = `mailto:${student.email}`}
                                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                        >
                                            <Mail size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleRemoveStudent(student.id)}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                        >
                                            <UserX size={18} />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

            ) : (
                <div className="text-center py-20 bg-white border border-gray-200 rounded-2xl">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users size={32} className="text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold text-black mb-2">No students found</h3>
                    <p className="text-gray-600 mb-6">
                        {searchQuery || filterPerformance !== 'all'
                            ? 'Try adjusting your filters'
                            : 'Add students to get started'
                        }
                    </p>
                </div>
            )}

            {/* Add Student Modal */}
            <AnimatePresence>
                {showAddStudent && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowAddStudent(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.95 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-2xl font-black text-black">Add Student</h3>
                                <button
                                    onClick={() => setShowAddStudent(false)}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-all"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-black mb-2">
                                        Student Email
                                    </label>
                                    <input
                                        type="email"
                                        value={newStudentEmail}
                                        onChange={(e) => setNewStudentEmail(e.target.value)}
                                        placeholder="student@example.com"
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-black focus:ring-2 focus:ring-black/5 transition-all"
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddStudent()}
                                    />
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowAddStudent(false)}
                                        className="flex-1 px-4 py-3 border border-gray-200 rounded-xl font-bold hover:bg-gray-50 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleAddStudent}
                                        className="flex-1 px-4 py-3 bg-black text-white rounded-xl font-bold hover:scale-105 transition-transform"
                                    >
                                        Add Student
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Student Detail Modal */}
            <AnimatePresence>
                {showStudentModal && selectedStudent && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowStudentModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.95 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                        >
                            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                                <h3 className="text-2xl font-black text-black">Student Details</h3>
                                <button
                                    onClick={() => setShowStudentModal(false)}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-all"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Profile Header */}
                                <div className="flex items-center gap-4">
                                    <img
                                        src={selectedStudent.photoURL || `https://ui-avatars.com/api/?name=${selectedStudent.name}&background=000&color=fff&bold=true`}
                                        alt={selectedStudent.name}
                                        className="w-20 h-20 rounded-full ring-4 ring-gray-200"
                                    />
                                    <div>
                                        <h4 className="text-2xl font-black text-black">{selectedStudent.name}</h4>
                                        <p className="text-gray-600">{selectedStudent.email}</p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-xs px-2.5 py-1 bg-black text-white rounded-full font-bold">
                                                Level {selectedStudent.level}
                                            </span>
                                            {selectedStudent.streak > 0 && (
                                                <span className="text-xs px-2.5 py-1 bg-orange-500 text-white rounded-full font-bold flex items-center gap-1">
                                                    🔥 {selectedStudent.streak} day streak
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="bg-gray-50 rounded-xl p-4">
                                        <div className="text-3xl font-black text-black mb-1">{selectedStudent.avgScore}%</div>
                                        <div className="text-sm text-gray-600">Avg Score</div>
                                    </div>
                                    <div className="bg-gray-50 rounded-xl p-4">
                                        <div className="text-3xl font-black text-black mb-1">{selectedStudent.completedQuizzes}</div>
                                        <div className="text-sm text-gray-600">Quizzes</div>
                                    </div>
                                    <div className="bg-gray-50 rounded-xl p-4">
                                        <div className="text-3xl font-black text-black mb-1">{selectedStudent.xp}</div>
                                        <div className="text-sm text-gray-600">Total XP</div>
                                    </div>
                                </div>

                                {/* Last Activity */}
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Clock size={16} />
                                    <span>Last active: {getTimeAgo(selectedStudent.lastActivity)}</span>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default StudentList;
