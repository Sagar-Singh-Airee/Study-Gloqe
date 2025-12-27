// src/components/teacher/ClassManagement.jsx - FIXED CARD RENDERING ✨

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Search, Grid, List, X, BookOpen, Loader
} from 'lucide-react';
import { useAuth } from '@auth/contexts/AuthContext';
import { createClass, updateClass, deleteClass } from '@teacher/services/classService';
import { db } from '@shared/config/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import toast from 'react-hot-toast';
import ClassCard from './ClassCard';

const ClassManagement = ({ triggerCreate }) => {
    const { user, userData } = useAuth();
    const navigate = useNavigate();
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
        schoolName: '',
        grade: '',
        room: '',
        description: ''
    });
    const [formLoading, setFormLoading] = useState(false);

    useEffect(() => {
        if (triggerCreate) {
            setShowCreateModal(true);
        }
    }, [triggerCreate]);

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

                console.log('📚 Loaded classes:', classesData); // DEBUG
                setClasses(classesData);
                setFilteredClasses(classesData);
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

        console.log('🔍 Filtered classes:', filtered); // DEBUG
        setFilteredClasses(filtered);
    }, [searchQuery, filterSubject, classes]);

    const subjects = ['all', ...new Set(classes.map(cls => cls.subject))];

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleCreateClass = async (e) => {
        e.preventDefault();

        if (!formData.name || !formData.subject) {
            toast.error('Please fill in required fields');
            return;
        }

        setFormLoading(true);

        try {
            if (editingClass) {
                await updateClass(editingClass.id, formData);
                toast.success('Class updated!');
            } else {
                const result = await createClass(user.uid, {
                    ...formData,
                    teacherName: userData?.name || user.displayName || user.email
                });
                toast.success(`Class created! Code: ${result.classCode}`);
            }

            setFormData({
                name: '',
                subject: '',
                section: 'A',
                schoolName: '',
                grade: '',
                room: '',
                description: ''
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
                room: classToEdit.room || ''
            });
            setShowCreateModal(true);
        }
    };

    const handleDeleteClass = async (classId) => {
        try {
            await deleteClass(classId, user.uid);
            toast.success('Class deleted');
        } catch (error) {
            console.error('Error deleting class:', error);
            toast.error(error.message || 'Failed to delete class');
        }
    };

    const handleArchiveClass = async (classId) => {
        try {
            await updateClass(classId, { active: false });
            toast.success('Class archived');
        } catch (error) {
            console.error('Error archiving class:', error);
            toast.error('Failed to archive class');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader className="w-8 h-8 animate-spin text-teal-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black text-gray-900">My Classes</h2>
                    <p className="text-sm text-gray-500 mt-1">{classes.length} active classes</p>
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
                            room: ''
                        });
                        setShowCreateModal(true);
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-600 to-blue-700 text-white rounded-xl text-sm font-semibold hover:from-teal-700 hover:to-blue-800 transition-all shadow-md"
                >
                    <Plus size={18} />
                    <span>Create Class</span>
                </button>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search classes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all"
                    />
                </div>

                <select
                    value={filterSubject}
                    onChange={(e) => setFilterSubject(e.target.value)}
                    className="px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all font-medium text-gray-700"
                >
                    {subjects.map(subject => (
                        <option key={subject} value={subject}>
                            {subject === 'all' ? 'All Subjects' : subject}
                        </option>
                    ))}
                </select>

                <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-white/50'
                            }`}
                    >
                        <Grid size={16} className={viewMode === 'grid' ? 'text-gray-900' : 'text-gray-500'} />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-white/50'
                            }`}
                    >
                        <List size={16} className={viewMode === 'list' ? 'text-gray-900' : 'text-gray-500'} />
                    </button>
                </div>
            </div>

            {/* Classes Grid/List - FIXED */}
            {filteredClasses.length > 0 ? (
                <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
                    {filteredClasses.map((classData, idx) => (
                        <ClassCard
                            key={classData.id}
                            classData={classData}
                            index={idx}
                            onEdit={handleEditClass}
                            onDelete={handleDeleteClass}
                            onArchive={handleArchiveClass}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center py-20">
                    <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <BookOpen size={32} className="text-gray-400" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">No classes found</h3>
                    <p className="text-sm text-gray-500 mb-6">
                        {searchQuery || filterSubject !== 'all'
                            ? 'Try adjusting your filters'
                            : 'Create your first class to get started'
                        }
                    </p>
                    {!searchQuery && filterSubject === 'all' && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-600 to-blue-700 text-white rounded-xl text-sm font-semibold hover:from-teal-700 hover:to-blue-800 transition-all"
                        >
                            <Plus size={18} />
                            Create Class
                        </button>
                    )}
                </div>
            )}

            {/* Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowCreateModal(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            onClick={(e) => e.stopPropagation()}
                            className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full"
                        >
                            {/* Header */}
                            <div className="relative bg-gradient-to-br from-teal-600 to-blue-700 px-5 py-3.5">
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="absolute top-3.5 right-4 p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-all"
                                >
                                    <X size={16} className="text-white" />
                                </button>

                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                        <BookOpen size={18} className="text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-bold text-white">
                                            {editingClass ? 'Edit Class' : 'Create Class'}
                                        </h2>
                                        <p className="text-[11px] text-white/80">
                                            {editingClass ? 'Update details' : 'Set up your classroom'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Form */}
                            <div className="p-5">
                                <form onSubmit={handleCreateClass} className="space-y-3.5">
                                    <div className="grid grid-cols-2 gap-3">
                                        <InputField
                                            label="Class Name"
                                            name="name"
                                            required
                                            placeholder="Math 101"
                                            value={formData.name}
                                            onChange={handleInputChange}
                                        />

                                        <InputField
                                            label="Subject"
                                            name="subject"
                                            required
                                            placeholder="Mathematics"
                                            value={formData.subject}
                                            onChange={handleInputChange}
                                        />
                                    </div>

                                    <div className="grid grid-cols-3 gap-2.5">
                                        <InputField
                                            label="Section"
                                            name="section"
                                            placeholder="A"
                                            value={formData.section}
                                            onChange={handleInputChange}
                                        />

                                        <InputField
                                            label="Grade"
                                            name="grade"
                                            placeholder="10"
                                            value={formData.grade}
                                            onChange={handleInputChange}
                                        />

                                        <InputField
                                            label="Room"
                                            name="room"
                                            placeholder="201"
                                            value={formData.room}
                                            onChange={handleInputChange}
                                        />
                                    </div>

                                    <InputField
                                        label="School Name"
                                        name="schoolName"
                                        placeholder="ABC High School"
                                        value={formData.schoolName}
                                        onChange={handleInputChange}
                                    />

                                    <TextareaField
                                        label="Description (optional)"
                                        name="description"
                                        placeholder="Brief overview..."
                                        value={formData.description}
                                        onChange={handleInputChange}
                                    />
                                </form>
                            </div>

                            {/* Footer */}
                            <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-200 flex gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    onClick={handleCreateClass}
                                    disabled={formLoading}
                                    className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-teal-600 to-blue-700 hover:from-teal-700 hover:to-blue-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                                >
                                    {formLoading ? (
                                        <>
                                            <Loader size={14} className="animate-spin" />
                                            <span>Saving...</span>
                                        </>
                                    ) : (
                                        <span>{editingClass ? 'Update' : 'Create'} Class</span>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Input Components
const InputField = ({ label, name, required, placeholder, value, onChange }) => (
    <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
            {label}
            {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        <input
            type="text"
            name={name}
            required={required}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all"
        />
    </div>
);

const TextareaField = ({ label, name, placeholder, value, onChange }) => (
    <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
            {label}
        </label>
        <textarea
            name={name}
            placeholder={placeholder}
            rows={2}
            value={value}
            onChange={onChange}
            className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all resize-none"
        />
    </div>
);

export default ClassManagement;
