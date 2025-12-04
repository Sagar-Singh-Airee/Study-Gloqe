// src/components/classroom/AssignmentsTab.jsx - COMPLETE WITH EXPORT
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Plus, FileText, Clock, CheckCircle2, AlertCircle,
    Calendar, Download, Upload, Eye, Edit, Trash2, Loader2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getClassAssignments, getStudentSubmission, submitAssignment } from '@/services/assignmentService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import toast from 'react-hot-toast';

const AssignmentsTab = ({ classId, isTeacher }) => {
    const { user } = useAuth();
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submissions, setSubmissions] = useState({});
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [submittingAssignment, setSubmittingAssignment] = useState(null);

    const getStatusColor = (status) => {
        switch (status) {
            case 'active': return 'bg-green-100 text-green-700';
            case 'completed': return 'bg-gray-100 text-gray-700';
            case 'overdue': return 'bg-red-100 text-red-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const getDaysLeft = (dueDate) => {
        const days = Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24));
        if (days < 0) return 'Overdue';
        if (days === 0) return 'Due today';
        if (days === 1) return 'Due tomorrow';
        return `${days} days left`;
    };

    // Load assignments and submissions
    useEffect(() => {
        if (classId) {
            loadAssignments();
        }
    }, [classId]);

    const loadAssignments = async () => {
        try {
            setLoading(true);
            const assignmentsData = await getClassAssignments(classId);
            setAssignments(assignmentsData);

            // Load student submissions if not teacher
            if (!isTeacher && user?.uid) {
                const submissionsData = {};
                for (const assignment of assignmentsData) {
                    const submission = await getStudentSubmission(assignment.id, user.uid);
                    if (submission) {
                        submissionsData[assignment.id] = submission;
                    }
                }
                setSubmissions(submissionsData);
            }
        } catch (error) {
            console.error('Error loading assignments:', error);
            toast.error('Failed to load assignments');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitAssignment = async (assignmentId) => {
        // For now, just show a placeholder
        toast.info('Assignment submission feature coming soon!');
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-black">Assignments</h2>
                    <p className="text-gray-600">Manage class assignments and submissions</p>
                </div>
                {isTeacher && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl font-bold hover:scale-105 transition-all"
                    >
                        <Plus size={20} />
                        Create Assignment
                    </button>
                )}
            </div>

            {/* Assignments List */}
            <div className="grid gap-4">
                {assignments.map((assignment, idx) => {
                    const studentSubmission = submissions[assignment.id];
                    const isSubmitted = !!studentSubmission;
                    const isOverdue = new Date() > assignment.dueDate;

                    return (
                        <motion.div
                            key={assignment.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-lg transition-all"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-start gap-4 flex-1">
                                    <div className="w-12 h-12 bg-gradient-to-br from-black to-gray-800 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <FileText size={24} className="text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <h3 className="text-lg font-bold text-black">{assignment.title}</h3>
                                            <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${getStatusColor(assignment.status)}`}>
                                                {assignment.status}
                                            </span>
                                            {!isTeacher && isSubmitted && (
                                                <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-blue-100 text-blue-700">
                                                    Submitted
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-gray-600 text-sm mb-3">{assignment.description}</p>

                                        {/* Meta Info */}
                                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                                            <span className="flex items-center gap-1">
                                                <Calendar size={14} />
                                                Due: {assignment.dueDate.toLocaleDateString()}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock size={14} />
                                                {getDaysLeft(assignment.dueDate)}
                                            </span>
                                            <span className="flex items-center gap-1 font-bold text-black">
                                                {assignment.totalPoints} points
                                            </span>
                                            {isTeacher && (
                                                <span className="flex items-center gap-1">
                                                    <CheckCircle2 size={14} />
                                                    {assignment.submissionCount || 0} submitted
                                                </span>
                                            )}
                                        </div>

                                        {/* Attachments */}
                                        {assignment.attachments && assignment.attachments.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mt-3">
                                                {assignment.attachments.map((file, i) => (
                                                    <button
                                                        key={i}
                                                        className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium transition-all"
                                                    >
                                                        <Download size={12} />
                                                        {file.name || file}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2">
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
                                    ) : (
                                        <button
                                            onClick={() => handleSubmitAssignment(assignment.id)}
                                            disabled={submittingAssignment === assignment.id}
                                            className="px-4 py-2 bg-black text-white rounded-lg font-bold hover:scale-105 transition-all flex items-center gap-2 disabled:opacity-50"
                                        >
                                            {submittingAssignment === assignment.id ? (
                                                <Loader2 size={16} className="animate-spin" />
                                            ) : isSubmitted ? (
                                                <>
                                                    <CheckCircle2 size={16} />
                                                    View Submission
                                                </>
                                            ) : (
                                                <>
                                                    <Upload size={16} />
                                                    Submit
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Progress Bar (Teacher View) */}
                            {isTeacher && (
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                    <div className="flex items-center justify-between mb-2 text-sm">
                                        <span className="text-gray-600">Submission Progress</span>
                                        <span className="font-bold text-black">
                                            {assignment.submissionCount || 0} submissions
                                        </span>
                                    </div>
                                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min((assignment.submissionCount || 0) / 25 * 100, 100)}%` }}
                                            transition={{ duration: 0.5, delay: idx * 0.1 }}
                                            className="h-full bg-gradient-to-r from-black to-gray-700"
                                        />
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    );
                })}
            </div>

            {/* Empty State */}
            {assignments.length === 0 && (
                <div className="text-center py-20 bg-white border border-gray-200 rounded-2xl">
                    <FileText size={64} className="mx-auto text-gray-300 mb-4" />
                    <h3 className="text-xl font-bold text-black mb-2">No Assignments Yet</h3>
                    <p className="text-gray-600 mb-6">
                        {isTeacher 
                            ? 'Create your first assignment to get started' 
                            : 'Your teacher hasn\'t posted any assignments yet'}
                    </p>
                    {isTeacher && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl font-bold hover:scale-105 transition-all"
                        >
                            <Plus size={20} />
                            Create Assignment
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

// ✅ MAKE SURE THIS LINE EXISTS
export default AssignmentsTab;
