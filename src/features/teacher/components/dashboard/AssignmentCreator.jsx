// src/components/teacher/AssignmentCreator.jsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, X, Save, Calendar, Clock, FileText, Tag,
    Upload, Link as LinkIcon, AlertCircle, CheckCircle2,
    BookOpen, Users, Target, Zap, Loader, Trash2,
    PlusCircle, MinusCircle
} from 'lucide-react';
import { useAuth } from '@auth/contexts/AuthContext';
import { db, storage } from '@shared/config/firebase';
import {
    collection, addDoc, serverTimestamp, query,
    where, getDocs
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import toast from 'react-hot-toast';

const AssignmentCreator = ({ onClose, classId = null }) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [classes, setClasses] = useState([]);
    const [uploadingFile, setUploadingFile] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        type: 'homework', // homework, project, reading, practice
        classId: classId || '',
        dueDate: '',
        dueTime: '23:59',
        totalPoints: 100,
        instructions: '',
        attachments: [],
        links: [],
        rubric: [
            { criteria: 'Completion', points: 40 },
            { criteria: 'Quality', points: 40 },
            { criteria: 'Timeliness', points: 20 }
        ],
        allowLateSubmission: true,
        latePenalty: 10,
        notifyStudents: true
    });

    // Load teacher's classes
    useEffect(() => {
        loadClasses();
    }, [user]);

    const loadClasses = async () => {
        try {
            const classesQuery = query(
                collection(db, 'classes'),
                where('teacherId', '==', user.uid)
            );
            const classesSnap = await getDocs(classesQuery);
            const classesData = classesSnap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setClasses(classesData);
        } catch (error) {
            console.error('Error loading classes:', error);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    const handleFileUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setUploadingFile(true);

        try {
            const uploadPromises = files.map(async (file) => {
                const storageRef = ref(storage, `assignments/${user.uid}/${Date.now()}_${file.name}`);
                await uploadBytes(storageRef, file);
                const url = await getDownloadURL(storageRef);
                return {
                    name: file.name,
                    url,
                    size: file.size,
                    type: file.type
                };
            });

            const uploadedFiles = await Promise.all(uploadPromises);
            setFormData({
                ...formData,
                attachments: [...formData.attachments, ...uploadedFiles]
            });

            toast.success(`${uploadedFiles.length} file(s) uploaded`);
        } catch (error) {
            console.error('Error uploading files:', error);
            toast.error('Failed to upload files');
        } finally {
            setUploadingFile(false);
        }
    };

    const handleAddLink = () => {
        const link = prompt('Enter link URL:');
        if (link) {
            setFormData({
                ...formData,
                links: [...formData.links, { url: link, title: link }]
            });
        }
    };

    const handleRemoveAttachment = (index) => {
        const newAttachments = [...formData.attachments];
        newAttachments.splice(index, 1);
        setFormData({ ...formData, attachments: newAttachments });
    };

    const handleRemoveLink = (index) => {
        const newLinks = [...formData.links];
        newLinks.splice(index, 1);
        setFormData({ ...formData, links: newLinks });
    };

    const handleAddRubricItem = () => {
        setFormData({
            ...formData,
            rubric: [...formData.rubric, { criteria: '', points: 0 }]
        });
    };

    const handleRemoveRubricItem = (index) => {
        const newRubric = [...formData.rubric];
        newRubric.splice(index, 1);
        setFormData({ ...formData, rubric: newRubric });
    };

    const handleRubricChange = (index, field, value) => {
        const newRubric = [...formData.rubric];
        newRubric[index][field] = field === 'points' ? parseInt(value) || 0 : value;
        setFormData({ ...formData, rubric: newRubric });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.title || !formData.classId || !formData.dueDate) {
            toast.error('Please fill in all required fields');
            return;
        }

        setLoading(true);

        try {
            const dueDateTime = new Date(`${formData.dueDate}T${formData.dueTime}`);

            const assignmentData = {
                ...formData,
                teacherId: user.uid,
                teacherName: user.displayName || user.email,
                dueDate: dueDateTime,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                submissions: [],
                status: 'active'
            };

            await addDoc(collection(db, 'assignments'), assignmentData);

            toast.success('✅ Assignment created successfully!');
            onClose?.();
        } catch (error) {
            console.error('Error creating assignment:', error);
            toast.error('Failed to create assignment');
        } finally {
            setLoading(false);
        }
    };

    const totalRubricPoints = formData.rubric.reduce((sum, item) => sum + item.points, 0);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-8"
            >
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
                    <div>
                        <h3 className="text-2xl font-black text-black">Create Assignment</h3>
                        <p className="text-sm text-gray-600 mt-1">Add a new assignment for your students</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(90vh-120px)] overflow-y-auto">
                    
                    {/* Basic Info */}
                    <div className="space-y-4">
                        <h4 className="text-lg font-bold text-black flex items-center gap-2">
                            <FileText size={20} />
                            Basic Information
                        </h4>

                        <div>
                            <label className="block text-sm font-bold text-black mb-2">
                                Assignment Title *
                            </label>
                            <input
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleInputChange}
                                placeholder="e.g., Chapter 5 Homework"
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-black focus:ring-2 focus:ring-black/5 transition-all"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-black mb-2">
                                    Assignment Type *
                                </label>
                                <select
                                    name="type"
                                    value={formData.type}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-black focus:ring-2 focus:ring-black/5 transition-all"
                                >
                                    <option value="homework">Homework</option>
                                    <option value="project">Project</option>
                                    <option value="reading">Reading</option>
                                    <option value="practice">Practice</option>
                                    <option value="exam">Exam</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-black mb-2">
                                    Class *
                                </label>
                                <select
                                    name="classId"
                                    value={formData.classId}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-black focus:ring-2 focus:ring-black/5 transition-all"
                                    required
                                >
                                    <option value="">Select a class</option>
                                    {classes.map(cls => (
                                        <option key={cls.id} value={cls.id}>
                                            {cls.name} - {cls.subject}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-black mb-2">
                                Description
                            </label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                placeholder="Brief description of the assignment..."
                                rows={3}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-black focus:ring-2 focus:ring-black/5 transition-all resize-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-black mb-2">
                                Detailed Instructions
                            </label>
                            <textarea
                                name="instructions"
                                value={formData.instructions}
                                onChange={handleInputChange}
                                placeholder="Step-by-step instructions for students..."
                                rows={5}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-black focus:ring-2 focus:ring-black/5 transition-all resize-none"
                            />
                        </div>
                    </div>

                    {/* Due Date & Points */}
                    <div className="space-y-4">
                        <h4 className="text-lg font-bold text-black flex items-center gap-2">
                            <Calendar size={20} />
                            Due Date & Grading
                        </h4>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-black mb-2">
                                    Due Date *
                                </label>
                                <input
                                    type="date"
                                    name="dueDate"
                                    value={formData.dueDate}
                                    onChange={handleInputChange}
                                    min={new Date().toISOString().split('T')[0]}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-black focus:ring-2 focus:ring-black/5 transition-all"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-black mb-2">
                                    Due Time
                                </label>
                                <input
                                    type="time"
                                    name="dueTime"
                                    value={formData.dueTime}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-black focus:ring-2 focus:ring-black/5 transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-black mb-2">
                                    Total Points
                                </label>
                                <input
                                    type="number"
                                    name="totalPoints"
                                    value={formData.totalPoints}
                                    onChange={handleInputChange}
                                    min="0"
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-black focus:ring-2 focus:ring-black/5 transition-all"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="allowLateSubmission"
                                    checked={formData.allowLateSubmission}
                                    onChange={handleInputChange}
                                    className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black"
                                />
                                <span className="text-sm font-medium text-black">Allow late submission</span>
                            </label>

                            {formData.allowLateSubmission && (
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-600">Late penalty:</span>
                                    <input
                                        type="number"
                                        name="latePenalty"
                                        value={formData.latePenalty}
                                        onChange={handleInputChange}
                                        min="0"
                                        max="100"
                                        className="w-20 px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:border-black text-sm"
                                    />
                                    <span className="text-sm text-gray-600">% per day</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Grading Rubric */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-lg font-bold text-black flex items-center gap-2">
                                <Target size={20} />
                                Grading Rubric
                            </h4>
                            <button
                                type="button"
                                onClick={handleAddRubricItem}
                                className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-all"
                            >
                                <PlusCircle size={16} />
                                Add Criteria
                            </button>
                        </div>

                        <div className="space-y-2">
                            {formData.rubric.map((item, index) => (
                                <div key={index} className="flex items-center gap-3">
                                    <input
                                        type="text"
                                        value={item.criteria}
                                        onChange={(e) => handleRubricChange(index, 'criteria', e.target.value)}
                                        placeholder="Criteria name"
                                        className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-black focus:ring-2 focus:ring-black/5 transition-all"
                                    />
                                    <input
                                        type="number"
                                        value={item.points}
                                        onChange={(e) => handleRubricChange(index, 'points', e.target.value)}
                                        placeholder="Points"
                                        min="0"
                                        className="w-24 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-black focus:ring-2 focus:ring-black/5 transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveRubricItem(index)}
                                        className="p-2.5 hover:bg-red-50 text-red-600 rounded-xl transition-all"
                                    >
                                        <MinusCircle size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {totalRubricPoints !== formData.totalPoints && (
                            <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 px-4 py-2 rounded-lg">
                                <AlertCircle size={16} />
                                <span>Rubric total ({totalRubricPoints}) doesn't match total points ({formData.totalPoints})</span>
                            </div>
                        )}
                    </div>

                    {/* Attachments */}
                    <div className="space-y-4">
                        <h4 className="text-lg font-bold text-black flex items-center gap-2">
                            <Upload size={20} />
                            Attachments & Resources
                        </h4>

                        <div className="flex gap-3">
                            <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 hover:border-black rounded-xl cursor-pointer transition-all group">
                                <Upload size={18} className="text-gray-400 group-hover:text-black transition-colors" />
                                <span className="text-sm font-medium text-gray-600 group-hover:text-black transition-colors">
                                    {uploadingFile ? 'Uploading...' : 'Upload Files'}
                                </span>
                                <input
                                    type="file"
                                    multiple
                                    onChange={handleFileUpload}
                                    className="hidden"
                                    disabled={uploadingFile}
                                />
                            </label>

                            <button
                                type="button"
                                onClick={handleAddLink}
                                className="flex items-center gap-2 px-4 py-3 border border-gray-200 hover:border-black rounded-xl transition-all"
                            >
                                <LinkIcon size={18} />
                                <span className="text-sm font-medium">Add Link</span>
                            </button>
                        </div>

                        {/* Uploaded Files */}
                        {formData.attachments.length > 0 && (
                            <div className="space-y-2">
                                {formData.attachments.map((file, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <FileText size={18} className="text-gray-400" />
                                            <span className="text-sm font-medium text-black">{file.name}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveAttachment(index)}
                                            className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Links */}
                        {formData.links.length > 0 && (
                            <div className="space-y-2">
                                {formData.links.map((link, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <LinkIcon size={18} className="text-gray-400" />
                                            <span className="text-sm font-medium text-black truncate">{link.url}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveLink(index)}
                                            className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Notifications */}
                    <div className="space-y-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                name="notifyStudents"
                                checked={formData.notifyStudents}
                                onChange={handleInputChange}
                                className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black"
                            />
                            <span className="text-sm font-medium text-black">Notify students when assignment is created</span>
                        </label>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3 border border-gray-200 rounded-xl font-bold hover:bg-gray-50 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || uploadingFile}
                            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-black text-white rounded-xl font-bold hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                        >
                            {loading ? (
                                <>
                                    <Loader size={18} className="animate-spin" />
                                    <span>Creating...</span>
                                </>
                            ) : (
                                <>
                                    <Save size={18} />
                                    <span>Create Assignment</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
};

export default AssignmentCreator;
