// src/components/teacher/ClassManagement.jsx - FIXED NAVIGATION

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // ✅ ADD THIS
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Search, Filter, Grid, List, X, Save,
    BookOpen, Users, Calendar, Tag, FileText,
    AlertCircle, Loader, CheckCircle2, Trash2,
    Edit, Archive, MoreVertical, Building2
} from 'lucide-react';
import { useAuth } from '@auth/contexts/AuthContext';
import {
    createClass,
    updateClass,
    deleteClass
} from '@teacher/services/classService';
import { db } from '@shared/config/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import toast from 'react-hot-toast';
import ClassCard from './ClassCard';

const ClassManagement = () => {
    const { user, userData } = useAuth();
    const navigate = useNavigate(); // ✅ ADD THIS
    const [classes, setClasses] = useState([]);
    const [filteredClasses, setFilteredClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterSubject, setFilterSubject] = useState('all');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingClass, setEditingClass] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        subject: '',
        section: 'A',
        description: '',
        schoolName: '',
        grade: '',
        room: '',
        schedule: ''
    });
    const [formLoading, setFormLoading] = useState(false);

    useEffect(() => {
        if (!user?.uid) return;

        setLoading(true);

        const q = query(
            collection(db, 'classes'),
            where('teacherId', '==', user.uid),
            where('active', '==', true),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q,
            (snapshot) => {
                const classesData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    createdAt: doc.data().createdAt?.toDate(),
                    updatedAt: doc.data().updatedAt?.toDate()
                }));

                setClasses(classesData);
                setFilteredClasses(classesData); // Initial set, useEffect below will filter it
                setLoading(false);
            },
            (error) => {
                console.error("Error listening to classes:", error);
                toast.error("Failed to sync classes");
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [user?.uid]);

    useEffect(() => {
        let filtered = [...classes];

        if (searchQuery.trim()) {
            filtered = filtered.filter(cls =>
                cls.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                cls.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                cls.section.toLowerCase().includes(searchQuery.toLowerCase()) ||
                cls.schoolName?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        if (filterSubject !== 'all') {
            filtered = filtered.filter(cls => cls.subject === filterSubject);
        }

        setFilteredClasses(filtered);
    }, [searchQuery, filterSubject, classes]);

    const subjects = ['all', ...new Set(classes.map(cls => cls.subject))];

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleCreateClass = async (e) => {
        e.preventDefault();

        if (!formData.name || !formData.subject) {
            toast.error('Please fill in all required fields');
            return;
        }

        setFormLoading(true);

        try {
            if (editingClass) {
                await updateClass(editingClass.id, formData);
                toast.success('✅ Class updated successfully!');
            } else {
                const result = await createClass(user.uid, {
                    ...formData,
                    teacherName: userData?.name || user.displayName || user.email
                });
                toast.success(`✅ Class created! Code: ${result.classCode}`);
            }

            // await loadClasses(); // Removed: Handled by listener

            setFormData({
                name: '',
                subject: '',
                section: 'A',
                description: '',
                schoolName: '',
                grade: '',
                room: '',
                schedule: ''
            });
            setShowCreateModal(false);
            setEditingClass(null);
        } catch (error) {
            console.error('Error creating/updating class:', error);
            toast.error(error.message || 'Failed to save class');
        } finally {
            setFormLoading(false);
        }
    };

    const handleEditClass = (classId) => {
        const classToEdit = classes.find(cls => cls.id === classId);
        if (classToEdit) {
            setEditingClass(classToEdit);
            setFormData({
                name: classToEdit.name,
                subject: classToEdit.subject,
                section: classToEdit.section || 'A',
                description: classToEdit.description || '',
                schoolName: classToEdit.schoolName || '',
                grade: classToEdit.grade || '',
                room: classToEdit.room || '',
                schedule: classToEdit.schedule || ''
            });
            setShowCreateModal(true);
        }
    };

    const handleDeleteClass = async (classId) => {
        try {
            await deleteClass(classId, user.uid);
            toast.success('Class deleted successfully');
            // await loadClasses(); // Removed: Handled by listener
        } catch (error) {
            console.error('Error deleting class:', error);
            toast.error(error.message || 'Failed to delete class');
        }
    };

    const handleArchiveClass = async (classId) => {
        try {
            await updateClass(classId, { active: false });
            toast.success('Class archived');
            // await loadClasses(); // Removed: Handled by listener
        } catch (error) {
            console.error('Error archiving class:', error);
            toast.error('Failed to archive class');
        }
    };

    // ✅ ADD THIS HANDLER
    const handleViewClass = (classId) => {
        navigate(`/teacher/class/${classId}`);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader className="w-8 h-8 animate-spin text-black" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black text-black">My Classes</h2>
                    <p className="text-gray-600 mt-1">{classes.length} active classes</p>
                </div>

                <button
                    onClick={() => {
                        setEditingClass(null);
                        setFormData({
                            name: '',
                            subject: '',
                            section: 'A',
                            description: '',
                            schoolName: '',
                            grade: '',
                            room: '',
                            schedule: ''
                        });
                        setShowCreateModal(true);
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl font-bold hover:scale-105 transition-transform"
                >
                    <Plus size={20} />
                    <span>Create New Class</span>
                </button>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search classes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-black focus:ring-2 focus:ring-black/5 transition-all"
                    />
                </div>

                <select
                    value={filterSubject}
                    onChange={(e) => setFilterSubject(e.target.value)}
                    className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-black focus:ring-2 focus:ring-black/5 transition-all font-medium"
                >
                    {subjects.map(subject => (
                        <option key={subject} value={subject}>
                            {subject === 'all' ? 'All Subjects' : subject}
                        </option>
                    ))}
                </select>

                <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-1">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-white/50'
                            }`}
                    >
                        <Grid size={18} className={viewMode === 'grid' ? 'text-black' : 'text-gray-500'} />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-white/50'
                            }`}
                    >
                        <List size={18} className={viewMode === 'list' ? 'text-black' : 'text-gray-500'} />
                    </button>
                </div>
            </div>

            {/* Classes Grid/List */}
            {filteredClasses.length > 0 ? (
                <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
                    {filteredClasses.map((classData, idx) => (
                        <ClassCard
                            key={classData.id}
                            classData={classData}
                            index={idx}
                            onView={handleViewClass} // ✅ ADD THIS
                            onEdit={handleEditClass}
                            onDelete={handleDeleteClass}
                            onArchive={handleArchiveClass}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center py-20">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <BookOpen size={40} className="text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold text-black mb-2">No classes found</h3>
                    <p className="text-gray-600 mb-6">
                        {searchQuery || filterSubject !== 'all'
                            ? 'Try adjusting your filters'
                            : 'Create your first class to get started'
                        }
                    </p>
                    {!searchQuery && filterSubject === 'all' && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl font-bold hover:scale-105 transition-transform"
                        >
                            <Plus size={20} />
                            Create Class
                        </button>
                    )}
                </div>
            )}

            {/* Modal remains the same... */}
            <AnimatePresence>
                {showCreateModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowCreateModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                        >
                            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                                <div>
                                    <h3 className="text-2xl font-black text-black">
                                        {editingClass ? 'Edit Class' : 'Create New Class'}
                                    </h3>
                                    <p className="text-sm text-gray-600 mt-1">
                                        {editingClass ? 'Update class details' : 'Class code will be generated automatically'}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-all"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleCreateClass} className="p-6 space-y-5">
                                <div>
                                    <label className="block text-sm font-bold text-black mb-2">
                                        Class Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        placeholder="e.g., Advanced Physics"
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-black transition-all"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-black mb-2">
                                            Subject <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="subject"
                                            value={formData.subject}
                                            onChange={handleInputChange}
                                            placeholder="e.g., Physics"
                                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-black transition-all"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-black mb-2">
                                            Section
                                        </label>
                                        <input
                                            type="text"
                                            name="section"
                                            value={formData.section}
                                            onChange={handleInputChange}
                                            placeholder="A"
                                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-black transition-all"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-black mb-2">
                                        School/Institution Name
                                    </label>
                                    <input
                                        type="text"
                                        name="schoolName"
                                        value={formData.schoolName}
                                        onChange={handleInputChange}
                                        placeholder="e.g., ABC High School"
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-black transition-all"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-black mb-2">
                                            Grade/Level
                                        </label>
                                        <input
                                            type="text"
                                            name="grade"
                                            value={formData.grade}
                                            onChange={handleInputChange}
                                            placeholder="e.g., 10"
                                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-black transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-black mb-2">
                                            Room/Location
                                        </label>
                                        <input
                                            type="text"
                                            name="room"
                                            value={formData.room}
                                            onChange={handleInputChange}
                                            placeholder="Room 101"
                                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-black transition-all"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-black mb-2">
                                        Schedule
                                    </label>
                                    <input
                                        type="text"
                                        name="schedule"
                                        value={formData.schedule}
                                        onChange={handleInputChange}
                                        placeholder="Mon, Wed, Fri 10:00 AM"
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-black transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-black mb-2">
                                        Description
                                    </label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        placeholder="Brief description of the class..."
                                        rows={3}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-black transition-all resize-none"
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateModal(false)}
                                        className="flex-1 px-6 py-3 border-2 border-gray-200 rounded-xl font-bold hover:bg-gray-50 transition-all text-gray-600"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={formLoading}
                                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-black text-white rounded-xl font-bold hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {formLoading ? (
                                            <>
                                                <Loader size={18} className="animate-spin" />
                                                <span>Saving...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Save size={18} />
                                                <span>{editingClass ? 'Update' : 'Create'} Class</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ClassManagement;
