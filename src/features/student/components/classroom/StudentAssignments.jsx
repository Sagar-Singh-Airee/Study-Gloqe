// src/features/student/components/classroom/StudentAssignments.jsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FileText, Clock, CheckCircle2, AlertCircle, Calendar,
    Search, Filter, Upload, Download, Eye, Send,
    Award, TrendingUp, X, Paperclip, Loader2, ArrowRight
} from 'lucide-react';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '@shared/config/firebase';
import { useAuth } from '@auth/contexts/AuthContext';
import toast from 'react-hot-toast';
import AssignmentSubmitModal from './AssignmentSubmitModal';

const StudentAssignments = ({ classId, classData }) => {
    const { user } = useAuth();
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('all'); // all, pending, submitted, graded, overdue
    const [sortBy, setSortBy] = useState('dueDate'); // dueDate, title, status

    // Submission modal state
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [selectedAssignment, setSelectedAssignment] = useState(null);

    // Stats
    const [stats, setStats] = useState({
        total: 0,
        completed: 0,
        pending: 0,
        overdue: 0,
        avgGrade: 0
    });

    useEffect(() => {
        loadAssignments();
    }, [classId, user?.uid]);

    const loadAssignments = async () => {
        try {
            setLoading(true);

            // Load all assignments for this class
            const assignmentsQuery = query(
                collection(db, 'assignments'),
                where('classId', '==', classId),
                orderBy('dueDate', 'desc')
            );

            const snapshot = await getDocs(assignmentsQuery);
            const assignmentsData = [];

            let completedCount = 0;
            let overdueCount = 0;
            let totalGrade = 0;
            let gradedCount = 0;

            for (const docSnap of snapshot.docs) {
                const assignmentData = docSnap.data();
                const dueDate = assignmentData.dueDate?.toDate?.() || new Date(assignmentData.dueDate);

                // Check if student has submitted
                const submissionQuery = query(
                    collection(db, 'submissions'),
                    where('assignmentId', '==', docSnap.id),
                    where('studentId', '==', user.uid)
                );

                const submissionSnap = await getDocs(submissionQuery);
                const submission = submissionSnap.docs.length > 0
                    ? { id: submissionSnap.docs[0].id, ...submissionSnap.docs[0].data() }
                    : null;

                // Calculate status
                let status = 'pending';
                if (submission) {
                    if (submission.grade !== undefined) {
                        status = 'graded';
                        totalGrade += submission.grade;
                        gradedCount++;
                    } else {
                        status = 'submitted';
                    }
                    completedCount++;
                } else if (dueDate < new Date()) {
                    status = 'overdue';
                    overdueCount++;
                }

                assignmentsData.push({
                    id: docSnap.id,
                    ...assignmentData,
                    dueDate,
                    status,
                    submission
                });
            }

            setAssignments(assignmentsData);
            setStats({
                total: assignmentsData.length,
                completed: completedCount,
                pending: assignmentsData.length - completedCount - overdueCount,
                overdue: overdueCount,
                avgGrade: gradedCount > 0 ? Math.round(totalGrade / gradedCount) : 0
            });

        } catch (error) {
            console.error('Error loading assignments:', error);
            toast.error('Failed to load assignments');
        } finally {
            setLoading(false);
        }
    };

    const getFilteredAssignments = () => {
        let filtered = [...assignments];

        // Search filter
        if (searchQuery) {
            filtered = filtered.filter(a =>
                a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                a.description?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Status filter
        if (filterStatus !== 'all') {
            filtered = filtered.filter(a => a.status === filterStatus);
        }

        // Sort
        if (sortBy === 'dueDate') {
            filtered.sort((a, b) => a.dueDate - b.dueDate);
        } else if (sortBy === 'title') {
            filtered.sort((a, b) => a.title.localeCompare(b.title));
        } else if (sortBy === 'status') {
            const statusOrder = { overdue: 0, pending: 1, submitted: 2, graded: 3 };
            filtered.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
        }

        return filtered;
    };

    const handleSubmit = (assignment) => {
        setSelectedAssignment(assignment);
        setShowSubmitModal(true);
    };

    const handleViewSubmission = (assignment) => {
        if (!assignment.submission) return;
        // Open submission details
        toast.info('Viewing submission details');
    };

    const getStatusConfig = (status) => {
        const configs = {
            pending: {
                label: 'Pending',
                color: 'bg-blue-100 text-blue-700 border-blue-300',
                icon: Clock,
                iconColor: 'text-blue-600'
            },
            submitted: {
                label: 'Submitted',
                color: 'bg-green-100 text-green-700 border-green-300',
                icon: CheckCircle2,
                iconColor: 'text-green-600'
            },
            graded: {
                label: 'Graded',
                color: 'bg-purple-100 text-purple-700 border-purple-300',
                icon: Award,
                iconColor: 'text-purple-600'
            },
            overdue: {
                label: 'Overdue',
                color: 'bg-red-100 text-red-700 border-red-300',
                icon: AlertCircle,
                iconColor: 'text-red-600'
            }
        };
        return configs[status] || configs.pending;
    };

    const getDaysUntil = (date) => {
        const now = new Date();
        const diff = date - now;
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

        if (days < 0) return `${Math.abs(days)} days ago`;
        if (days === 0) return 'Due today';
        if (days === 1) return 'Due tomorrow';
        return `${days} days left`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center">
                    <Loader2 size={48} className="text-blue-600 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600 font-semibold">Loading assignments...</p>
                </div>
            </div>
        );
    }

    const filteredAssignments = getFilteredAssignments();

    return (
        <div className="space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white border-2 border-gray-200 rounded-xl p-4"
                >
                    <p className="text-sm text-gray-600 font-semibold mb-1">Total</p>
                    <p className="text-3xl font-black text-gray-900">{stats.total}</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white border-2 border-green-200 rounded-xl p-4"
                >
                    <p className="text-sm text-green-600 font-semibold mb-1">Completed</p>
                    <p className="text-3xl font-black text-green-700">{stats.completed}</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white border-2 border-blue-200 rounded-xl p-4"
                >
                    <p className="text-sm text-blue-600 font-semibold mb-1">Pending</p>
                    <p className="text-3xl font-black text-blue-700">{stats.pending}</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white border-2 border-red-200 rounded-xl p-4"
                >
                    <p className="text-sm text-red-600 font-semibold mb-1">Overdue</p>
                    <p className="text-3xl font-black text-red-700">{stats.overdue}</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white border-2 border-purple-200 rounded-xl p-4"
                >
                    <p className="text-sm text-purple-600 font-semibold mb-1">Avg Grade</p>
                    <p className="text-3xl font-black text-purple-700">{stats.avgGrade}%</p>
                </motion.div>
            </div>

            {/* Search and Filters */}
            <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search assignments..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none font-medium"
                        />
                    </div>

                    {/* Status Filter */}
                    <div className="flex items-center gap-2">
                        <Filter size={20} className="text-gray-600" />
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none font-semibold"
                        >
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="submitted">Submitted</option>
                            <option value="graded">Graded</option>
                            <option value="overdue">Overdue</option>
                        </select>
                    </div>

                    {/* Sort By */}
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none font-semibold"
                    >
                        <option value="dueDate">Sort by Due Date</option>
                        <option value="title">Sort by Title</option>
                        <option value="status">Sort by Status</option>
                    </select>
                </div>
            </div>

            {/* Assignments List */}
            {filteredAssignments.length > 0 ? (
                <div className="space-y-4">
                    {filteredAssignments.map((assignment, idx) => {
                        const statusConfig = getStatusConfig(assignment.status);
                        const StatusIcon = statusConfig.icon;

                        return (
                            <motion.div
                                key={assignment.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:shadow-xl transition-all"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    {/* Left: Assignment Info */}
                                    <div className="flex-1">
                                        <div className="flex items-start gap-4 mb-4">
                                            {/* Icon */}
                                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                                                <FileText size={24} className="text-white" strokeWidth={2.5} />
                                            </div>

                                            {/* Title & Description */}
                                            <div className="flex-1">
                                                <h3 className="text-lg font-black text-gray-900 mb-2">{assignment.title}</h3>
                                                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                                                    {assignment.description || 'No description provided'}
                                                </p>

                                                {/* Meta Info */}
                                                <div className="flex flex-wrap items-center gap-4 text-sm">
                                                    {/* Due Date */}
                                                    <div className="flex items-center gap-1.5">
                                                        <Calendar size={16} className="text-gray-500" />
                                                        <span className="font-semibold text-gray-700">
                                                            {assignment.dueDate.toLocaleDateString()}
                                                        </span>
                                                        <span className={`font-bold ${assignment.status === 'overdue' ? 'text-red-600' : 'text-blue-600'
                                                            }`}>
                                                            • {getDaysUntil(assignment.dueDate)}
                                                        </span>
                                                    </div>

                                                    {/* Points */}
                                                    <div className="flex items-center gap-1.5">
                                                        <Award size={16} className="text-gray-500" />
                                                        <span className="font-semibold text-gray-700">
                                                            {assignment.totalPoints || 100} points
                                                        </span>
                                                    </div>

                                                    {/* Type */}
                                                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold uppercase">
                                                        {assignment.type || 'Assignment'}
                                                    </span>
                                                </div>

                                                {/* Grade (if graded) */}
                                                {assignment.status === 'graded' && assignment.submission && (
                                                    <div className="mt-3 p-3 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg">
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <p className="text-xs text-purple-600 font-bold mb-1">Your Grade</p>
                                                                <p className="text-2xl font-black text-purple-700">
                                                                    {assignment.submission.grade}/{assignment.totalPoints}
                                                                    <span className="text-sm ml-2">
                                                                        ({Math.round((assignment.submission.grade / assignment.totalPoints) * 100)}%)
                                                                    </span>
                                                                </p>
                                                            </div>
                                                            {assignment.submission.feedback && (
                                                                <button
                                                                    onClick={() => handleViewSubmission(assignment)}
                                                                    className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700"
                                                                >
                                                                    View Feedback
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Status & Actions */}
                                    <div className="flex flex-col items-end gap-3">
                                        {/* Status Badge */}
                                        <div className={`flex items-center gap-2 px-4 py-2 border-2 rounded-xl ${statusConfig.color}`}>
                                            <StatusIcon size={18} strokeWidth={2.5} />
                                            <span className="font-black text-sm">{statusConfig.label}</span>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex flex-col gap-2 w-full min-w-[140px]">
                                            {assignment.status === 'pending' && (
                                                <button
                                                    onClick={() => handleSubmit(assignment)}
                                                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-bold hover:shadow-lg transition-all"
                                                >
                                                    <Upload size={16} />
                                                    Submit
                                                </button>
                                            )}

                                            {assignment.status === 'submitted' && (
                                                <button
                                                    onClick={() => handleViewSubmission(assignment)}
                                                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-colors"
                                                >
                                                    <Eye size={16} />
                                                    View
                                                </button>
                                            )}

                                            {assignment.status === 'graded' && (
                                                <button
                                                    onClick={() => handleViewSubmission(assignment)}
                                                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 transition-colors"
                                                >
                                                    <Eye size={16} />
                                                    Details
                                                </button>
                                            )}

                                            {assignment.status === 'overdue' && (
                                                <button
                                                    onClick={() => handleSubmit(assignment)}
                                                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors"
                                                >
                                                    <Upload size={16} />
                                                    Late Submit
                                                </button>
                                            )}

                                            {/* Attachments */}
                                            {assignment.attachments?.length > 0 && (
                                                <button className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors">
                                                    <Download size={14} />
                                                    Files ({assignment.attachments.length})
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-white rounded-xl border-2 border-gray-200 p-12 text-center">
                    <FileText size={64} className="text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {searchQuery || filterStatus !== 'all'
                            ? 'No assignments found'
                            : 'No assignments yet'}
                    </h3>
                    <p className="text-gray-600">
                        {searchQuery || filterStatus !== 'all'
                            ? 'Try adjusting your search or filters'
                            : 'Your teacher hasn\'t posted any assignments yet'}
                    </p>
                </div>
            )}

            {/* Submit Modal */}
            <AnimatePresence>
                {showSubmitModal && selectedAssignment && (
                    <AssignmentSubmitModal
                        assignment={selectedAssignment}
                        onClose={() => {
                            setShowSubmitModal(false);
                            setSelectedAssignment(null);
                        }}
                        onSuccess={() => {
                            setShowSubmitModal(false);
                            setSelectedAssignment(null);
                            loadAssignments(); // Reload to show updated status
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default StudentAssignments;
