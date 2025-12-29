// src/features/teacher/components/dashboard/AssignmentsSection.jsx
// ✅ PROFESSIONAL ASSIGNMENTS SECTION - ENHANCED 2025

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Search, Filter, Calendar, Users, ClipboardList, BarChart3,
    Clock, AlertCircle, CheckCircle2, TrendingUp, X, FileText,
    Download, Eye, Edit, Trash2, MoreVertical, ArrowUpRight
} from 'lucide-react';
import { collection, query, where, getDocs, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@shared/config/firebase';
import { useAuth } from '@auth/contexts/AuthContext';
import AssignmentCreator from './AssignmentCreator';
import toast from 'react-hot-toast';

const AssignmentsSection = () => {
    const { user } = useAuth();
    const [showCreator, setShowCreator] = useState(false);
    const [editingAssignment, setEditingAssignment] = useState(null);
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('all'); // all, active, overdue, completed
    const [filterClass, setFilterClass] = useState('all');
    const [classes, setClasses] = useState([]);
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        overdue: 0,
        pending: 0,
        graded: 0,
    });

    useEffect(() => {
        loadData();
    }, [user?.uid]);

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
            setClasses(classesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

            // Load assignments
            const assignmentsQuery = query(
                collection(db, 'assignments'),
                where('teacherId', '==', user.uid),
                orderBy('createdAt', 'desc')
            );
            const assignmentsSnap = await getDocs(assignmentsQuery);
            const assignmentsData = assignmentsSnap.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                dueDate: doc.data().dueDate?.toDate() || new Date(doc.data().dueDate),
                createdAt: doc.data().createdAt?.toDate() || new Date(doc.data().createdAt),
            }));

            setAssignments(assignmentsData);
            calculateStats(assignmentsData);
        } catch (error) {
            console.error('Error loading assignments:', error);
            toast.error('Failed to load assignments');
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (data) => {
        const now = new Date();
        let totalPending = 0;
        let totalGraded = 0;

        const active = data.filter(a => a.dueDate >= now);
        const overdue = data.filter(a => a.dueDate < now && a.status !== 'completed');

        data.forEach(assignment => {
            const submissions = assignment.submissions || [];
            totalPending += submissions.filter(s => !s.graded).length;
            totalGraded += submissions.filter(s => s.graded).length;
        });

        setStats({
            total: data.length,
            active: active.length,
            overdue: overdue.length,
            pending: totalPending,
            graded: totalGraded,
        });
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this assignment? This cannot be undone.')) {
            return;
        }

        try {
            await deleteDoc(doc(db, 'assignments', id));
            toast.success('Assignment deleted successfully');
            loadData();
        } catch (error) {
            console.error('Error deleting assignment:', error);
            toast.error('Failed to delete assignment');
        }
    };

    const handleEdit = (assignment) => {
        setEditingAssignment(assignment);
        setShowCreator(true);
    };

    const handleCloseCreator = () => {
        setShowCreator(false);
        setEditingAssignment(null);
        loadData();
    };

    // Filter assignments
    const filteredAssignments = assignments.filter(assignment => {
        // Search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            if (
                !assignment.title.toLowerCase().includes(query) &&
                !assignment.description?.toLowerCase().includes(query)
            ) {
                return false;
            }
        }

        // Status filter
        const now = new Date();
        if (filterStatus === 'active' && assignment.dueDate < now) return false;
        if (filterStatus === 'overdue' && assignment.dueDate >= now) return false;
        if (filterStatus === 'completed' && assignment.status !== 'completed') return false;

        // Class filter
        if (filterClass !== 'all' && assignment.classId !== filterClass) return false;

        return true;
    });

    const statsCards = [
        {
            label: 'Total Assignments',
            value: stats.total,
            icon: ClipboardList,
            gradient: 'from-blue-500 to-cyan-500',
            bgColor: 'bg-blue-50',
        },
        {
            label: 'Active',
            value: stats.active,
            icon: CheckCircle2,
            gradient: 'from-green-500 to-emerald-500',
            bgColor: 'bg-green-50',
        },
        {
            label: 'Pending Reviews',
            value: stats.pending,
            icon: AlertCircle,
            gradient: 'from-orange-500 to-red-500',
            bgColor: 'bg-orange-50',
            alert: stats.pending > 0,
        },
        {
            label: 'Overdue',
            value: stats.overdue,
            icon: Clock,
            gradient: 'from-red-500 to-pink-500',
            bgColor: 'bg-red-50',
            alert: stats.overdue > 0,
        },
    ];

    const getStatusBadge = (assignment) => {
        const now = new Date();
        const isOverdue = assignment.dueDate < now;
        const pendingCount = (assignment.submissions || []).filter(s => !s.graded).length;

        if (isOverdue) {
            return (
                <span className="px-3 py-1 bg-red-100 text-red-600 rounded-full text-xs font-bold">
                    Overdue
                </span>
            );
        }

        if (pendingCount > 0) {
            return (
                <span className="px-3 py-1 bg-orange-100 text-orange-600 rounded-full text-xs font-bold">
                    {pendingCount} Pending
                </span>
            );
        }

        return (
            <span className="px-3 py-1 bg-green-100 text-green-600 rounded-full text-xs font-bold">
                Up to date
            </span>
        );
    };

    const getDaysUntilDue = (dueDate) => {
        const now = new Date();
        const diff = dueDate - now;
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

        if (days < 0) return `${Math.abs(days)} days overdue`;
        if (days === 0) return 'Due today';
        if (days === 1) return 'Due tomorrow';
        return `Due in ${days} days`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-4"
                    />
                    <p className="text-gray-600">Loading assignments...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Assignments</h1>
                    <p className="text-gray-600 font-medium mt-1">
                        Create, manage, and grade student assignments
                    </p>
                </div>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowCreator(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all"
                >
                    <Plus className="w-5 h-5" />
                    Create Assignment
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
                                    <div className={`w-11 h-11 bg-gradient-to-br ${stat.gradient} rounded-xl flex items-center justify-center`}>
                                        <Icon className="w-5 h-5 text-white" />
                                    </div>
                                    {stat.alert && (
                                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                    )}
                                </div>
                                <h3 className="text-3xl font-black text-gray-900 mb-1">{stat.value}</h3>
                                <p className="text-sm font-semibold text-gray-600">{stat.label}</p>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Filters & Search */}
            <div className="bg-white rounded-2xl p-4 border border-gray-200">
                <div className="flex flex-col lg:flex-row gap-4">

                    {/* Search */}
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search assignments..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                        />
                    </div>

                    {/* Status Filter */}
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all font-medium"
                    >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="overdue">Overdue</option>
                        <option value="completed">Completed</option>
                    </select>

                    {/* Class Filter */}
                    <select
                        value={filterClass}
                        onChange={(e) => setFilterClass(e.target.value)}
                        className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all font-medium"
                    >
                        <option value="all">All Classes</option>
                        {classes.map(cls => (
                            <option key={cls.id} value={cls.id}>
                                {cls.name} - {cls.section}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Assignments Grid */}
            {filteredAssignments.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {filteredAssignments.map((assignment, index) => {
                        const className = classes.find(c => c.id === assignment.classId)?.name || 'Unknown Class';
                        const totalSubmissions = assignment.submissions?.length || 0;
                        const gradedSubmissions = assignment.submissions?.filter(s => s.graded).length || 0;

                        return (
                            <motion.div
                                key={assignment.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="bg-white border-2 border-gray-200 rounded-2xl p-6 hover:border-teal-300 hover:shadow-lg transition-all group"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <h3 className="text-xl font-bold text-gray-900 group-hover:text-teal-600 transition-colors">
                                                {assignment.title}
                                            </h3>
                                        </div>
                                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                                            {assignment.description || 'No description'}
                                        </p>
                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                            <Users className="w-4 h-4" />
                                            <span>{className}</span>
                                        </div>
                                    </div>

                                    {/* Actions Dropdown */}
                                    <div className="relative">
                                        <button className="p-2 hover:bg-gray-100 rounded-lg transition-all">
                                            <MoreVertical className="w-5 h-5 text-gray-600" />
                                        </button>
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="flex items-center gap-4 mb-4 p-3 bg-gray-50 rounded-xl">
                                    <div className="flex items-center gap-2">
                                        <ClipboardList className="w-4 h-4 text-gray-600" />
                                        <span className="text-sm font-medium text-gray-700">
                                            {totalSubmissions} Submissions
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                                        <span className="text-sm font-medium text-gray-700">
                                            {gradedSubmissions} Graded
                                        </span>
                                    </div>
                                </div>

                                {/* Due Date & Status */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-sm">
                                        <Calendar className="w-4 h-4 text-gray-500" />
                                        <span className="text-gray-600 font-medium">
                                            {getDaysUntilDue(assignment.dueDate)}
                                        </span>
                                    </div>
                                    {getStatusBadge(assignment)}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200">
                                    <button
                                        onClick={() => handleEdit(assignment)}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-teal-50 hover:bg-teal-100 text-teal-600 rounded-xl font-bold transition-all"
                                    >
                                        <Edit className="w-4 h-4" />
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => {/* Navigate to grading */ }}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl font-bold transition-all"
                                    >
                                        <Eye className="w-4 h-4" />
                                        Grade
                                    </button>
                                    <button
                                        onClick={() => handleDelete(assignment.id)}
                                        className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold transition-all"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-gray-300">
                    <ClipboardList className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No assignments found</h3>
                    <p className="text-gray-600 mb-6">
                        {searchQuery || filterStatus !== 'all' || filterClass !== 'all'
                            ? 'Try adjusting your filters or search query'
                            : 'Create your first assignment to get started'}
                    </p>
                    <button
                        onClick={() => setShowCreator(true)}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-bold hover:shadow-lg transition-all"
                    >
                        <Plus className="w-5 h-5" />
                        Create Assignment
                    </button>
                </div>
            )}

            {/* Assignment Creator Modal */}
            <AnimatePresence>
                {showCreator && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={handleCloseCreator}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
                        >
                            <div className="flex items-center justify-between p-6 border-b border-gray-200">
                                <h2 className="text-2xl font-black text-gray-900">
                                    {editingAssignment ? 'Edit Assignment' : 'Create New Assignment'}
                                </h2>
                                <button
                                    onClick={handleCloseCreator}
                                    className="p-2 hover:bg-gray-100 rounded-xl transition-all"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
                                <AssignmentCreator
                                    assignment={editingAssignment}
                                    onClose={handleCloseCreator}
                                />
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AssignmentsSection;
