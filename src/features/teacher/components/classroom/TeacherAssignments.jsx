// src/features/teacher/components/classroom/TeacherAssignments.jsx - ASSIGNMENT MANAGEMENT HUB 📝

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, FileText, Calendar, Clock, Users, CheckCircle,
    XCircle, AlertCircle, Edit2, Trash2, Eye, Download,
    Filter, Search, BarChart3, TrendingUp, Award, ChevronDown
} from 'lucide-react';
import {
    collection, query, orderBy, onSnapshot, addDoc,
    updateDoc, deleteDoc, doc, serverTimestamp, where, getDocs
} from 'firebase/firestore';
import { db } from '@/shared/config/firebase';
import { format, isPast, isToday, isTomorrow } from 'date-fns';
import toast from 'react-hot-toast';

const TeacherAssignments = ({ classId, classData }) => {
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedAssignment, setSelectedAssignment] = useState(null);
    const [filterStatus, setFilterStatus] = useState('all'); // all, active, graded, overdue
    const [searchQuery, setSearchQuery] = useState('');
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        graded: 0,
        overdue: 0,
        avgSubmissionRate: 0,
    });

    // Fetch Assignments Real-time
    useEffect(() => {
        if (!classId) return;

        const assignmentsRef = collection(db, 'classes', classId, 'assignments');
        const q = query(assignmentsRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const assignmentList = await Promise.all(
                snapshot.docs.map(async (docSnap) => {
                    const data = docSnap.data();

                    // Get submission count
                    const submissionsRef = collection(db, 'classes', classId, 'assignments', docSnap.id, 'submissions');
                    const submissionsSnap = await getDocs(submissionsRef);
                    const submissionCount = submissionsSnap.size;
                    const gradedCount = submissionsSnap.docs.filter(s => s.data().grade !== undefined).length;

                    return {
                        id: docSnap.id,
                        ...data,
                        submissionCount,
                        gradedCount,
                    };
                })
            );

            setAssignments(assignmentList);
            calculateStats(assignmentList);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [classId]);

    // Calculate Stats
    const calculateStats = (assignmentList) => {
        const now = new Date();
        const active = assignmentList.filter(a => !isPast(a.dueDate?.toDate())).length;
        const overdue = assignmentList.filter(a => isPast(a.dueDate?.toDate()) && a.submissionCount < classData.studentCount).length;
        const graded = assignmentList.filter(a => a.gradedCount === a.submissionCount && a.submissionCount > 0).length;

        const totalSubmissionRate = assignmentList.reduce((sum, a) => {
            const rate = (a.submissionCount / (classData.studentCount || 1)) * 100;
            return sum + rate;
        }, 0);
        const avgSubmissionRate = assignmentList.length > 0 ? (totalSubmissionRate / assignmentList.length).toFixed(0) : 0;

        setStats({
            total: assignmentList.length,
            active,
            graded,
            overdue,
            avgSubmissionRate,
        });
    };

    // Filter & Search
    const filteredAssignments = assignments.filter(assignment => {
        const matchesSearch = assignment.title.toLowerCase().includes(searchQuery.toLowerCase());
        const now = new Date();
        const dueDate = assignment.dueDate?.toDate();

        if (!matchesSearch) return false;

        switch (filterStatus) {
            case 'active':
                return !isPast(dueDate);
            case 'overdue':
                return isPast(dueDate) && assignment.submissionCount < classData.studentCount;
            case 'graded':
                return assignment.gradedCount === assignment.submissionCount && assignment.submissionCount > 0;
            default:
                return true;
        }
    });

    // Delete Assignment
    const handleDeleteAssignment = async (assignmentId) => {
        if (!confirm('Delete this assignment? All submissions will be lost.')) return;

        try {
            await deleteDoc(doc(db, 'classes', classId, 'assignments', assignmentId));
            toast.success('Assignment deleted successfully');
        } catch (error) {
            console.error('Error deleting assignment:', error);
            toast.error('Failed to delete assignment');
        }
    };

    return (
        <div className="space-y-6">
            {/* Stats Overview */}
            <div className="grid md:grid-cols-5 gap-4">
                <StatCard
                    icon={FileText}
                    label="Total Assignments"
                    value={stats.total}
                    gradient="from-blue-500 to-cyan-500"
                />
                <StatCard
                    icon={Clock}
                    label="Active"
                    value={stats.active}
                    gradient="from-green-500 to-teal-500"
                />
                <StatCard
                    icon={CheckCircle}
                    label="Fully Graded"
                    value={stats.graded}
                    gradient="from-purple-500 to-pink-500"
                />
                <StatCard
                    icon={AlertCircle}
                    label="Overdue"
                    value={stats.overdue}
                    gradient="from-red-500 to-orange-500"
                />
                <StatCard
                    icon={TrendingUp}
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
                            placeholder="Search assignments..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all text-sm font-semibold"
                        />
                    </div>

                    {/* Filter */}
                    <div className="relative">
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="appearance-none pl-4 pr-10 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all text-sm font-bold text-gray-700 bg-white cursor-pointer"
                        >
                            <option value="all">All Assignments</option>
                            <option value="active">Active</option>
                            <option value="overdue">Overdue</option>
                            <option value="graded">Fully Graded</option>
                        </select>
                        <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                </div>

                {/* Create Button */}
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl text-sm font-bold hover:shadow-lg hover:scale-105 transition-all whitespace-nowrap"
                >
                    <Plus size={18} />
                    Create Assignment
                </button>
            </div>

            {/* Assignments List */}
            {loading ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => <AssignmentSkeleton key={i} />)}
                </div>
            ) : filteredAssignments.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-300">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-full flex items-center justify-center mx-auto mb-5 border-4 border-white shadow-lg">
                        <FileText size={40} className="text-blue-600" />
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 mb-2">
                        {searchQuery ? 'No Results Found' : 'No Assignments Yet'}
                    </h3>
                    <p className="text-sm text-gray-600 mb-6">
                        {searchQuery
                            ? 'Try adjusting your search or filters'
                            : 'Create your first assignment to get started!'}
                    </p>
                    {!searchQuery && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl text-sm font-bold hover:shadow-lg hover:scale-105 transition-all"
                        >
                            <Plus size={18} />
                            Create First Assignment
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredAssignments.map((assignment, idx) => (
                        <AssignmentCard
                            key={assignment.id}
                            assignment={assignment}
                            classData={classData}
                            onDelete={handleDeleteAssignment}
                            onEdit={setSelectedAssignment}
                            delay={idx * 0.05}
                        />
                    ))}
                </div>
            )}

            {/* Create Assignment Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <CreateAssignmentModal
                        classId={classId}
                        onClose={() => setShowCreateModal(false)}
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
                <Icon size={24} className="text-white" />
            </div>
            <div className="text-3xl font-black text-gray-900 mb-1">{value}</div>
            <div className="text-xs text-gray-600 font-semibold">{label}</div>
        </motion.div>
    );
};

// Assignment Card Component
const AssignmentCard = ({ assignment, classData, onDelete, onEdit, delay }) => {
    const dueDate = assignment.dueDate?.toDate();
    const isPastDue = isPast(dueDate);
    const isDueToday = isToday(dueDate);
    const isDueTomorrow = isTomorrow(dueDate);

    const submissionRate = ((assignment.submissionCount / (classData.studentCount || 1)) * 100).toFixed(0);
    const gradingProgress = assignment.submissionCount > 0
        ? ((assignment.gradedCount / assignment.submissionCount) * 100).toFixed(0)
        : 0;

    let dueDateText = format(dueDate, 'MMM d, h:mm a');
    if (isDueToday) dueDateText = 'Due Today';
    if (isDueTomorrow) dueDateText = 'Due Tomorrow';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
            whileHover={{ y: -4 }}
            className={`bg-white border-2 rounded-2xl p-5 hover:shadow-xl transition-all ${isPastDue ? 'border-red-200 bg-red-50/30' : 'border-gray-200'
                }`}
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                    <h3 className="text-base font-black text-gray-900 mb-1 line-clamp-2">
                        {assignment.title}
                    </h3>
                    <div className="flex items-center gap-2 text-xs">
                        <span className={`px-2 py-1 rounded-lg font-bold ${isPastDue ? 'bg-red-100 text-red-700' :
                                isDueToday ? 'bg-orange-100 text-orange-700' :
                                    'bg-blue-100 text-blue-700'
                            }`}>
                            {assignment.type || 'Assignment'}
                        </span>
                        <span className="text-gray-600 font-semibold">{assignment.points} pts</span>
                    </div>
                </div>
            </div>

            {/* Due Date */}
            <div className={`flex items-center gap-2 mb-4 px-3 py-2 rounded-xl ${isPastDue ? 'bg-red-100 border-red-200' :
                    isDueToday ? 'bg-orange-100 border-orange-200' :
                        'bg-gray-100 border-gray-200'
                } border`}>
                <Clock size={14} className={
                    isPastDue ? 'text-red-600' :
                        isDueToday ? 'text-orange-600' :
                            'text-gray-600'
                } />
                <span className={`text-xs font-bold ${isPastDue ? 'text-red-700' :
                        isDueToday ? 'text-orange-700' :
                            'text-gray-700'
                    }`}>
                    {dueDateText}
                </span>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="text-center p-3 bg-blue-50 rounded-xl border border-blue-200">
                    <Users size={16} className="text-blue-600 mx-auto mb-1" />
                    <div className="text-xl font-black text-gray-900">{assignment.submissionCount}/{classData.studentCount}</div>
                    <div className="text-[10px] text-gray-600 font-bold uppercase">Submitted</div>
                    <div className="mt-1 text-xs font-black text-blue-600">{submissionRate}%</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-xl border border-purple-200">
                    <Award size={16} className="text-purple-600 mx-auto mb-1" />
                    <div className="text-xl font-black text-gray-900">{assignment.gradedCount}/{assignment.submissionCount}</div>
                    <div className="text-[10px] text-gray-600 font-bold uppercase">Graded</div>
                    <div className="mt-1 text-xs font-black text-purple-600">{gradingProgress}%</div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
                <button className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl text-xs font-bold hover:shadow-lg transition-all flex items-center justify-center gap-1.5">
                    <Eye size={14} />
                    View Submissions
                </button>
                <button
                    onClick={() => onEdit(assignment)}
                    className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition-all"
                    title="Edit"
                >
                    <Edit2 size={14} />
                </button>
                <button
                    onClick={() => onDelete(assignment.id)}
                    className="p-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-all"
                    title="Delete"
                >
                    <Trash2 size={14} />
                </button>
            </div>
        </motion.div>
    );
};

// Assignment Skeleton
const AssignmentSkeleton = () => (
    <div className="bg-white border-2 border-gray-200 rounded-2xl p-5 animate-pulse">
        <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
                <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-4 bg-gray-100 rounded w-1/2" />
            </div>
        </div>
        <div className="h-10 bg-gray-100 rounded-xl mb-4" />
        <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="h-24 bg-gray-100 rounded-xl" />
            <div className="h-24 bg-gray-100 rounded-xl" />
        </div>
        <div className="flex gap-2">
            <div className="flex-1 h-10 bg-gray-200 rounded-xl" />
            <div className="w-10 h-10 bg-gray-100 rounded-xl" />
            <div className="w-10 h-10 bg-gray-100 rounded-xl" />
        </div>
    </div>
);

// Create Assignment Modal (Simplified - uses existing AssignmentCreator)
const CreateAssignmentModal = ({ classId, onClose }) => {
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
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <Plus size={32} className="text-white" />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900">Create New Assignment</h2>
                    <p className="text-sm text-gray-600 mt-2">Use the Assignment Creator component here</p>
                </div>

                <button
                    onClick={onClose}
                    className="w-full py-3 border-2 border-gray-200 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all text-gray-700"
                >
                    Close
                </button>
            </motion.div>
        </motion.div>
    );
};

export default TeacherAssignments;
