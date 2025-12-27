// src/components/teacher/CreateClassModal.jsx - CLEAN & COMPACT ✨

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-inter">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-hidden"
                    >
                        {/* Header */}
                        <div className="relative bg-gradient-to-br from-teal-600 to-blue-700 px-6 py-4">
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-all"
                            >
                                <X size={16} className="text-white" />
                            </button>

                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                    <BookOpen size={20} className="text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white">
                                        Create Class
                                    </h2>
                                    <p className="text-xs text-white/80">
                                        Set up your classroom
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Form */}
                        <div className="overflow-y-auto max-h-[calc(85vh-180px)] px-6 py-5">
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <InputField
                                        label="Class Name"
                                        required
                                        placeholder="Math 101"
                                        value={formData.name}
                                        onChange={(e) => handleChange('name', e.target.value)}
                                    />

                                    <InputField
                                        label="Subject"
                                        required
                                        placeholder="Mathematics"
                                        value={formData.subject}
                                        onChange={(e) => handleChange('subject', e.target.value)}
                                    />
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <InputField
                                        label="Section"
                                        placeholder="A"
                                        value={formData.section}
                                        onChange={(e) => handleChange('section', e.target.value)}
                                    />

                                    <InputField
                                        label="Grade"
                                        placeholder="10"
                                        value={formData.grade}
                                        onChange={(e) => handleChange('grade', e.target.value)}
                                    />

                                    <InputField
                                        label="Room"
                                        placeholder="201"
                                        value={formData.room}
                                        onChange={(e) => handleChange('room', e.target.value)}
                                    />
                                </div>

                                <InputField
                                    label="School Name"
                                    placeholder="ABC High School"
                                    value={formData.schoolName}
                                    onChange={(e) => handleChange('schoolName', e.target.value)}
                                />

                                <TextareaField
                                    label="Description (optional)"
                                    placeholder="Brief overview..."
                                    value={formData.description}
                                    onChange={(e) => handleChange('description', e.target.value)}
                                />
                            </form>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                onClick={handleSubmit}
                                disabled={loading}
                                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-teal-600 to-blue-700 hover:from-teal-700 hover:to-blue-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader size={14} className="animate-spin" />
                                        <span>Creating...</span>
                                    </>
                                ) : (
                                    'Create Class'
                                )}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

// ============================================
// INPUT COMPONENTS
// ============================================

const InputField = ({ label, required, placeholder, value, onChange }) => (
    <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
            {label}
            {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        <input
            type="text"
            required={required}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all"
        />
    </div>
);

const TextareaField = ({ label, placeholder, value, onChange }) => (
    <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
            {label}
        </label>
        <textarea
            placeholder={placeholder}
            rows={2}
            value={value}
            onChange={onChange}
            className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all resize-none"
        />
    </div>
);

export default CreateClassModal;
