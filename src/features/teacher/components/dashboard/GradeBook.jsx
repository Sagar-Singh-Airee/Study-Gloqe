// src/components/teacher/GradeBook.jsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BookOpen, Search, Filter, Download, Edit, Save, X,
    TrendingUp, TrendingDown, Award, AlertCircle, CheckCircle2,
    BarChart3, Users, Target, Clock, Calendar, Eye,
    FileText, Printer, Mail, Star, Percent, Hash
} from 'lucide-react';
import { db } from '@shared/config/firebase';
import {
    collection, query, where, getDocs, doc, getDoc,
    updateDoc, onSnapshot
} from 'firebase/firestore';
import { useAuth } from '@auth/contexts/AuthContext';
import toast from 'react-hot-toast';

const GradeBook = ({ classId }) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [grades, setGrades] = useState({});
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [editingCell, setEditingCell] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [showStats, setShowStats] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);

    useEffect(() => {
        if (classId) {
            loadGradeBookData();
        }
    }, [classId]);

    const loadGradeBookData = async () => {
        setLoading(true);
        try {
            // Load class data
            const classDoc = await getDoc(doc(db, 'classes', classId));
            if (!classDoc.exists()) {
                toast.error('Class not found');
                return;
            }

            const classData = classDoc.data();
            const studentIds = classData.students || [];

            // Load student details
            const studentsData = await Promise.all(
                studentIds.map(async (studentId) => {
                    const userDoc = await getDoc(doc(db, 'users', studentId));
                    if (userDoc.exists()) {
                        return {
                            id: studentId,
                            ...userDoc.data()
                        };
                    }
                    return null;
                })
            );

            setStudents(studentsData.filter(s => s !== null));

            // Load assignments for this class
            const assignmentsQuery = query(
                collection(db, 'assignments'),
                where('classId', '==', classId)
            );
            const assignmentsSnap = await getDocs(assignmentsQuery);
            const assignmentsData = assignmentsSnap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setAssignments(assignmentsData);

            // Load all grades/submissions
            const gradesData = {};
            for (const assignment of assignmentsData) {
                for (const submission of assignment.submissions || []) {
                    const key = `${submission.studentId}_${assignment.id}`;
                    gradesData[key] = {
                        grade: submission.grade || null,
                        status: submission.status || 'not-submitted',
                        submittedAt: submission.submittedAt,
                        feedback: submission.feedback || '',
                        late: submission.late || false
                    };
                }
            }
            setGrades(gradesData);

        } catch (error) {
            console.error('Error loading gradebook:', error);
            toast.error('Failed to load gradebook');
        } finally {
            setLoading(false);
        }
    };

    const handleEditGrade = (studentId, assignmentId, currentGrade) => {
        setEditingCell(`${studentId}_${assignmentId}`);
        setEditValue(currentGrade !== null ? currentGrade.toString() : '');
    };

    const handleSaveGrade = async (studentId, assignmentId) => {
        const key = `${studentId}_${assignmentId}`;
        const gradeValue = parseFloat(editValue);

        if (isNaN(gradeValue) || gradeValue < 0 || gradeValue > 100) {
            toast.error('Please enter a valid grade (0-100)');
            return;
        }

        try {
            // Update assignment document
            const assignmentRef = doc(db, 'assignments', assignmentId);
            const assignmentDoc = await getDoc(assignmentRef);
            
            if (assignmentDoc.exists()) {
                const assignmentData = assignmentDoc.data();
                const submissions = assignmentData.submissions || [];
                
                const submissionIndex = submissions.findIndex(
                    s => s.studentId === studentId
                );

                if (submissionIndex >= 0) {
                    submissions[submissionIndex].grade = gradeValue;
                    submissions[submissionIndex].graded = true;
                    submissions[submissionIndex].gradedAt = new Date();
                } else {
                    submissions.push({
                        studentId,
                        grade: gradeValue,
                        status: 'graded',
                        graded: true,
                        gradedAt: new Date()
                    });
                }

                await updateDoc(assignmentRef, { submissions });

                // Update local state
                setGrades({
                    ...grades,
                    [key]: {
                        ...grades[key],
                        grade: gradeValue,
                        status: 'graded'
                    }
                });

                toast.success('✅ Grade saved!');
            }

            setEditingCell(null);
            setEditValue('');
        } catch (error) {
            console.error('Error saving grade:', error);
            toast.error('Failed to save grade');
        }
    };

    const handleCancelEdit = () => {
        setEditingCell(null);
        setEditValue('');
    };

    const calculateStudentAverage = (studentId) => {
        let total = 0;
        let count = 0;

        assignments.forEach(assignment => {
            const key = `${studentId}_${assignment.id}`;
            const grade = grades[key]?.grade;
            if (grade !== null && grade !== undefined) {
                total += grade;
                count++;
            }
        });

        return count > 0 ? (total / count).toFixed(1) : '-';
    };

    const calculateAssignmentAverage = (assignmentId) => {
        let total = 0;
        let count = 0;

        students.forEach(student => {
            const key = `${student.id}_${assignmentId}`;
            const grade = grades[key]?.grade;
            if (grade !== null && grade !== undefined) {
                total += grade;
                count++;
            }
        });

        return count > 0 ? (total / count).toFixed(1) : '-';
    };

    const getGradeColor = (grade) => {
        if (grade === null || grade === undefined) return 'text-gray-400';
        if (grade >= 90) return 'text-green-600 font-bold';
        if (grade >= 80) return 'text-blue-600 font-bold';
        if (grade >= 70) return 'text-yellow-600 font-bold';
        if (grade >= 60) return 'text-orange-600 font-bold';
        return 'text-red-600 font-bold';
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'graded':
                return <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-bold">Graded</span>;
            case 'submitted':
                return <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-bold">Submitted</span>;
            case 'late':
                return <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full font-bold">Late</span>;
            case 'not-submitted':
                return <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full font-bold">Not Submitted</span>;
            default:
                return <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full font-bold">-</span>;
        }
    };

    const exportToCSV = () => {
        let csv = 'Student Name,Email';
        assignments.forEach(a => {
            csv += `,${a.title}`;
        });
        csv += ',Average\n';

        students.forEach(student => {
            csv += `${student.name},${student.email}`;
            assignments.forEach(assignment => {
                const key = `${student.id}_${assignment.id}`;
                const grade = grades[key]?.grade;
                csv += `,${grade !== null && grade !== undefined ? grade : ''}`;
            });
            csv += `,${calculateStudentAverage(student.id)}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gradebook-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        toast.success('📥 Gradebook exported!');
    };

    const filteredStudents = students.filter(student =>
        student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                    <h3 className="text-2xl font-black text-black">Grade Book</h3>
                    <p className="text-gray-600 mt-1">
                        {students.length} students • {assignments.length} assignments
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowStats(!showStats)}
                        className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 hover:border-black rounded-xl transition-all"
                    >
                        <BarChart3 size={18} />
                        <span className="text-sm font-medium">Stats</span>
                    </button>
                    <button
                        onClick={exportToCSV}
                        className="flex items-center gap-2 px-4 py-2.5 bg-black text-white rounded-xl font-bold hover:scale-105 transition-transform"
                    >
                        <Download size={18} />
                        <span>Export CSV</span>
                    </button>
                </div>
            </div>

            {/* Statistics Panel */}
            <AnimatePresence>
                {showStats && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
                    >
                        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white">
                            <div className="flex items-center gap-3 mb-3">
                                <Award size={24} />
                                <span className="text-sm font-medium opacity-90">Class Average</span>
                            </div>
                            <div className="text-3xl font-black">
                                {(() => {
                                    let total = 0;
                                    let count = 0;
                                    students.forEach(student => {
                                        const avg = parseFloat(calculateStudentAverage(student.id));
                                        if (!isNaN(avg)) {
                                            total += avg;
                                            count++;
                                        }
                                    });
                                    return count > 0 ? (total / count).toFixed(1) : '-';
                                })()}%
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white">
                            <div className="flex items-center gap-3 mb-3">
                                <CheckCircle2 size={24} />
                                <span className="text-sm font-medium opacity-90">Graded</span>
                            </div>
                            <div className="text-3xl font-black">
                                {(() => {
                                    let graded = 0;
                                    Object.values(grades).forEach(g => {
                                        if (g.grade !== null && g.grade !== undefined) graded++;
                                    });
                                    return graded;
                                })()}
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-5 text-white">
                            <div className="flex items-center gap-3 mb-3">
                                <Clock size={24} />
                                <span className="text-sm font-medium opacity-90">Pending</span>
                            </div>
                            <div className="text-3xl font-black">
                                {(() => {
                                    let pending = 0;
                                    Object.values(grades).forEach(g => {
                                        if (g.status === 'submitted' && !g.grade) pending++;
                                    });
                                    return pending;
                                })()}
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-5 text-white">
                            <div className="flex items-center gap-3 mb-3">
                                <Target size={24} />
                                <span className="text-sm font-medium opacity-90">Completion</span>
                            </div>
                            <div className="text-3xl font-black">
                                {(() => {
                                    const total = students.length * assignments.length;
                                    if (total === 0) return '0';
                                    const completed = Object.values(grades).filter(
                                        g => g.grade !== null && g.grade !== undefined
                                    ).length;
                                    return ((completed / total) * 100).toFixed(0);
                                })()}%
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                    type="text"
                    placeholder="Search students..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-black focus:ring-2 focus:ring-black/5 transition-all"
                />
            </div>

            {/* Grade Table */}
            {assignments.length > 0 && students.length > 0 ? (
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                                        Student
                                    </th>
                                    {assignments.map(assignment => (
                                        <th
                                            key={assignment.id}
                                            className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider min-w-[120px]"
                                        >
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="truncate max-w-[100px]" title={assignment.title}>
                                                    {assignment.title}
                                                </span>
                                                <span className="text-xs text-gray-500 font-normal">
                                                    Avg: {calculateAssignmentAverage(assignment.id)}%
                                                </span>
                                            </div>
                                        </th>
                                    ))}
                                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider bg-gray-100">
                                        Average
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredStudents.map((student, idx) => (
                                    <motion.tr
                                        key={student.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="hover:bg-gray-50 transition-colors"
                                    >
                                        {/* Student Name */}
                                        <td className="px-4 py-4 sticky left-0 bg-white hover:bg-gray-50 z-10">
                                            <div className="flex items-center gap-3 min-w-[200px]">
                                                <img
                                                    src={student.photoURL || `https://ui-avatars.com/api/?name=${student.name}&background=000&color=fff&bold=true`}
                                                    alt={student.name}
                                                    className="w-8 h-8 rounded-full ring-2 ring-gray-200"
                                                />
                                                <div>
                                                    <div className="font-semibold text-black text-sm">{student.name}</div>
                                                    <div className="text-xs text-gray-500">{student.email}</div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Grades */}
                                        {assignments.map(assignment => {
                                            const key = `${student.id}_${assignment.id}`;
                                            const gradeData = grades[key];
                                            const grade = gradeData?.grade;
                                            const isEditing = editingCell === key;

                                            return (
                                                <td
                                                    key={assignment.id}
                                                    className="px-4 py-4 text-center"
                                                >
                                                    {isEditing ? (
                                                        <div className="flex items-center justify-center gap-2">
                                                            <input
                                                                type="number"
                                                                value={editValue}
                                                                onChange={(e) => setEditValue(e.target.value)}
                                                                min="0"
                                                                max="100"
                                                                className="w-16 px-2 py-1 border border-black rounded text-center text-sm focus:outline-none focus:ring-2 focus:ring-black/20"
                                                                autoFocus
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        handleSaveGrade(student.id, assignment.id);
                                                                    } else if (e.key === 'Escape') {
                                                                        handleCancelEdit();
                                                                    }
                                                                }}
                                                            />
                                                            <button
                                                                onClick={() => handleSaveGrade(student.id, assignment.id)}
                                                                className="p-1 hover:bg-green-100 rounded"
                                                            >
                                                                <CheckCircle2 size={16} className="text-green-600" />
                                                            </button>
                                                            <button
                                                                onClick={handleCancelEdit}
                                                                className="p-1 hover:bg-red-100 rounded"
                                                            >
                                                                <X size={16} className="text-red-600" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div
                                                            onClick={() => handleEditGrade(student.id, assignment.id, grade)}
                                                            className="cursor-pointer hover:bg-gray-100 rounded px-2 py-1 transition-all"
                                                        >
                                                            <div className={`text-lg font-bold ${getGradeColor(grade)}`}>
                                                                {grade !== null && grade !== undefined ? `${grade}%` : '-'}
                                                            </div>
                                                            <div className="mt-1">
                                                                {getStatusBadge(gradeData?.status || 'not-submitted')}
                                                            </div>
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}

                                        {/* Average */}
                                        <td className="px-4 py-4 text-center bg-gray-50">
                                            <div className={`text-xl font-black ${getGradeColor(parseFloat(calculateStudentAverage(student.id)))}`}>
                                                {calculateStudentAverage(student.id)}
                                                {calculateStudentAverage(student.id) !== '-' && '%'}
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="text-center py-20 bg-white border border-gray-200 rounded-2xl">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <BookOpen size={32} className="text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold text-black mb-2">No data available</h3>
                    <p className="text-gray-600">
                        {assignments.length === 0 
                            ? 'Create assignments to start grading'
                            : 'Add students to this class'
                        }
                    </p>
                </div>
            )}

            {/* Quick Tips */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                    <AlertCircle size={20} className="text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                        <h4 className="font-bold text-blue-900 mb-1">Quick Tips</h4>
                        <ul className="text-sm text-blue-800 space-y-1">
                            <li>• Click any grade cell to edit</li>
                            <li>• Press Enter to save, Escape to cancel</li>
                            <li>• Export to CSV for offline analysis</li>
                            <li>• Averages are calculated automatically</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GradeBook;
