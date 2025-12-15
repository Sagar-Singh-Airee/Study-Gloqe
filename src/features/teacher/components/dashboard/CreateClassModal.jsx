// src/components/teacher/CreateClassModal.jsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, BookOpen, Loader } from 'lucide-react';
import { createClass } from '@teacher/services/classService';
import { useAuth } from '@auth/contexts/AuthContext';
import toast from 'react-hot-toast';

const CreateClassModal = ({ isOpen, onClose, onSuccess }) => {
    const { user, userData } = useAuth();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        subject: '',
        section: 'A',
        schoolName: '',
        grade: '',
        room: '',
        description: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.name || !formData.subject) {
            toast.error('Please fill in required fields');
            return;
        }

        try {
            setLoading(true);
            
            const result = await createClass(user.uid, {
                ...formData,
                teacherName: userData?.name || 'Unknown Teacher'
            });

            toast.success(`Class created! Code: ${result.classCode}`);
            onSuccess?.(result);
            onClose();
            
            // Reset form
            setFormData({
                name: '',
                subject: '',
                section: 'A',
                schoolName: '',
                grade: '',
                room: '',
                description: ''
            });
        } catch (error) {
            console.error('Error creating class:', error);
            toast.error('Failed to create class');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto"
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center">
                            <BookOpen size={24} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-black">Create New Class</h2>
                            <p className="text-sm text-gray-600">Set up your classroom</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-all"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Required Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-black mb-2">
                                Class Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="e.g., Mathematics 101"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-black transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-black mb-2">
                                Subject <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="e.g., Mathematics"
                                value={formData.subject}
                                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-black transition-all"
                            />
                        </div>
                    </div>

                    {/* Optional Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-black mb-2">Section</label>
                            <input
                                type="text"
                                placeholder="A"
                                value={formData.section}
                                onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-black transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-black mb-2">Grade</label>
                            <input
                                type="text"
                                placeholder="e.g., 10"
                                value={formData.grade}
                                onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-black transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-black mb-2">Room</label>
                            <input
                                type="text"
                                placeholder="e.g., 201"
                                value={formData.room}
                                onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-black transition-all"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-black mb-2">School/Institution Name</label>
                        <input
                            type="text"
                            placeholder="e.g., ABC High School"
                            value={formData.schoolName}
                            onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-black transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-black mb-2">Description</label>
                        <textarea
                            placeholder="Brief description of the class..."
                            rows={3}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-black transition-all resize-none"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 border-2 border-gray-200 rounded-xl font-bold hover:bg-gray-50 transition-all text-gray-600"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-3 bg-black text-white rounded-xl font-bold hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader size={20} className="animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                'Create Class'
                            )}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default CreateClassModal;
