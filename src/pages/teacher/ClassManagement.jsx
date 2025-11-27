// src/pages/teacher/ClassManagement.jsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Plus,
    Users,
    Copy,
    Check,
    Trash2,
    Edit
} from 'lucide-react';
import { useAuth } from '@contexts/AuthContext';
import { createClass, getUserClasses, getClassDetails } from '@/services/classService';
import toast from 'react-hot-toast';

const ClassManagement = () => {
    const { user, userData } = useAuth();
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newClass, setNewClass] = useState({
        name: '',
        subject: '',
        section: 'A',
        grade: '',
        schoolName: '',
        description: ''
    });

    useEffect(() => {
        loadClasses();
    }, [user?.uid]);

    const loadClasses = async () => {
        try {
            setLoading(true);
            const teacherClasses = await getUserClasses(user.uid, 'teacher');
            setClasses(teacherClasses);
        } catch (error) {
            console.error('Error loading classes:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateClass = async () => {
        if (!newClass.name || !newClass.subject) {
            toast.error('Please fill in required fields');
            return;
        }

        try {
            await createClass(user.uid, {
                ...newClass,
                teacherName: userData?.name || user.email
            });
            toast.success('Class created successfully! 🎉');
            setShowCreateModal(false);
            setNewClass({ name: '', subject: '', section: 'A', grade: '', schoolName: '', description: '' });
            loadClasses();
        } catch (error) {
            toast.error('Failed to create class');
        }
    };

    const copyClassCode = (code) => {
        navigator.clipboard.writeText(code);
        toast.success('Class code copied!');
    };

    return (
        <div className="min-h-screen bg-white p-8">
            <div className="max-w-7xl mx-auto">
                
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-4xl font-black text-black mb-2">My Classes</h1>
                        <p className="text-gray-600">Manage your classes and students</p>
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl font-bold hover:scale-105 transition-all"
                    >
                        <Plus size={20} />
                        Create Class
                    </button>
                </div>

                {/* Classes Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {classes.map((classItem, idx) => (
                        <motion.div
                            key={classItem.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="bg-gradient-to-br from-gray-900 to-black rounded-2xl p-6 text-white"
                        >
                            <h3 className="text-xl font-bold mb-2">{classItem.name}</h3>
                            <p className="text-sm text-gray-400 mb-4">
                                {classItem.subject} • Section {classItem.section}
                            </p>

                            {/* Class Code */}
                            <div className="bg-white/10 rounded-xl p-4 mb-4">
                                <div className="text-xs text-gray-400 mb-1">Class Code</div>
                                <div className="flex items-center justify-between">
                                    <span className="text-2xl font-black tracking-widest">{classItem.classCode}</span>
                                    <button
                                        onClick={() => copyClassCode(classItem.classCode)}
                                        className="p-2 hover:bg-white/10 rounded-lg transition-all"
                                    >
                                        <Copy size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Users size={16} />
                                    <span className="text-sm">{classItem.studentCount} students</span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Create Class Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-2xl p-8 max-w-md w-full"
                    >
                        <h2 className="text-2xl font-black text-black mb-6">Create New Class</h2>

                        <div className="space-y-4">
                            <input
                                type="text"
                                placeholder="Class Name *"
                                value={newClass.name}
                                onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-black transition-all"
                            />
                            <input
                                type="text"
                                placeholder="Subject *"
                                value={newClass.subject}
                                onChange={(e) => setNewClass({ ...newClass, subject: e.target.value })}
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-black transition-all"
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <input
                                    type="text"
                                    placeholder="Section"
                                    value={newClass.section}
                                    onChange={(e) => setNewClass({ ...newClass, section: e.target.value })}
                                    className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-black transition-all"
                                />
                                <input
                                    type="text"
                                    placeholder="Grade"
                                    value={newClass.grade}
                                    onChange={(e) => setNewClass({ ...newClass, grade: e.target.value })}
                                    className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-black transition-all"
                                />
                            </div>
                            <input
                                type="text"
                                placeholder="School Name"
                                value={newClass.schoolName}
                                onChange={(e) => setNewClass({ ...newClass, schoolName: e.target.value })}
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-black transition-all"
                            />
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="flex-1 py-3 border-2 border-gray-200 rounded-xl font-bold hover:bg-gray-50 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateClass}
                                className="flex-1 py-3 bg-black text-white rounded-xl font-bold hover:scale-105 transition-all"
                            >
                                Create Class
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default ClassManagement;
