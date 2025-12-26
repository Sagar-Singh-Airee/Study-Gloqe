import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Filter, Plus, Calendar, Users,
    ClipboardList, MoreVertical, Eye, Edit,
    Trash2, AlertCircle, CheckCircle2, Clock
} from 'lucide-react';
import { collection, query, where, getDocs, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { db } from '@shared/config/firebase';
import { useAuth } from '@auth/contexts/AuthContext';
import toast from 'react-hot-toast';

const AssignmentList = ({ onCreateNew }) => {
    const { user } = useAuth();
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    useEffect(() => {
        loadAssignments();
    }, [user]);

    const loadAssignments = async () => {
        try {
            setLoading(true);
            const q = query(
                collection(db, 'assignments'),
                where('teacherId', '==', user.uid),
                orderBy('dueDate', 'desc')
            );
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                dueDate: doc.data().dueDate?.toDate() || new Date(doc.data().dueDate)
            }));
            setAssignments(data);
        } catch (error) {
            console.error('Error loading assignments:', error);
            toast.error('Failed to load assignments');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this assignment?')) return;
        try {
            await deleteDoc(doc(db, 'assignments', id));
            toast.success('Assignment deleted');
            loadAssignments();
        } catch (error) {
            toast.error('Failed to delete assignment');
        }
    };

    const filteredAssignments = assignments.filter(a => {
        const matchesSearch = a.title.toLowerCase().includes(searchQuery.toLowerCase());
        const now = new Date();
        const isOverdue = a.dueDate < now;

        if (filterStatus === 'active') return matchesSearch && !isOverdue;
        if (filterStatus === 'overdue') return matchesSearch && isOverdue;
        return matchesSearch;
    });

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-black">Assignments</h2>
                    <p className="text-gray-600 mt-1">Manage all assignments across your classes</p>
                </div>
                <button
                    onClick={onCreateNew}
                    className="flex items-center gap-2 px-5 py-2.5 bg-black text-white rounded-xl font-bold hover:scale-105 transition-transform"
                >
                    <Plus size={18} />
                    New Assignment
                </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search assignments..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-black transition-all"
                    />
                </div>
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-black font-medium"
                >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="overdue">Overdue</option>
                </select>
            </div>

            {filteredAssignments.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredAssignments.map((assignment) => {
                        const isOverdue = assignment.dueDate < new Date();
                        return (
                            <motion.div
                                key={assignment.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
                            >
                                <div className={`absolute top-0 right-0 px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-bl-xl ${isOverdue ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                                    }`}>
                                    {isOverdue ? 'Overdue' : 'Active'}
                                </div>

                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-12 h-12 bg-gray-900 text-white rounded-xl flex items-center justify-center">
                                        <ClipboardList size={22} />
                                    </div>
                                </div>

                                <h3 className="text-lg font-bold text-black mb-1 line-clamp-1">{assignment.title}</h3>
                                <p className="text-sm text-gray-500 mb-4 line-clamp-2">{assignment.description}</p>

                                <div className="space-y-2 mb-6">
                                    <div className="flex items-center gap-2 text-xs text-gray-600">
                                        <Calendar size={14} />
                                        <span>Due: {assignment.dueDate.toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-600">
                                        <Users size={14} />
                                        <span>{assignment.submissions?.length || 0} Submissions</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-bold transition-colors">
                                        View
                                    </button>
                                    <button
                                        onClick={() => handleDelete(assignment.id)}
                                        className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors border border-transparent hover:border-red-100"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                    <ClipboardList className="mx-auto text-gray-400 mb-4" size={48} />
                    <h3 className="text-lg font-bold text-black">No assignments found</h3>
                    <p className="text-gray-500">Create your first assignment to get started</p>
                </div>
            )}
        </div>
    );
};

export default AssignmentList;
