// src/features/student/components/classroom/AssignmentSubmitModal.jsx
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Upload, FileText, Paperclip, Trash2, Send,
    AlertCircle, CheckCircle2, Loader2, File, Image,
    Video as VideoIcon, Link as LinkIcon
} from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@shared/config/firebase';
import { useAuth } from '@auth/contexts/AuthContext';
import toast from 'react-hot-toast';

const AssignmentSubmitModal = ({ assignment, onClose, onSuccess }) => {
    const { user } = useAuth();
    const fileInputRef = useRef(null);

    const [submissionText, setSubmissionText] = useState('');
    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    // Handle file selection
    const handleFileSelect = (e) => {
        const selectedFiles = Array.from(e.target.files);

        // Validate file size (max 10MB per file)
        const maxSize = 10 * 1024 * 1024; // 10MB
        const validFiles = selectedFiles.filter(file => {
            if (file.size > maxSize) {
                toast.error(`${file.name} is too large (max 10MB)`);
                return false;
            }
            return true;
        });

        // Check total files (max 5)
        if (files.length + validFiles.length > 5) {
            toast.error('Maximum 5 files allowed');
            return;
        }

        setFiles(prev => [...prev, ...validFiles]);
    };

    // Remove file
    const handleRemoveFile = (index) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    // Get file icon based on type
    const getFileIcon = (file) => {
        const type = file.type;
        if (type.startsWith('image/')) return Image;
        if (type.startsWith('video/')) return VideoIcon;
        if (type.includes('pdf')) return FileText;
        return File;
    };

    // Format file size
    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    // Handle submission
    const handleSubmit = async () => {
        // Validation
        if (!submissionText.trim() && files.length === 0) {
            toast.error('Please provide submission text or upload files');
            return;
        }

        if (submissionText.length > 5000) {
            toast.error('Submission text too long (max 5000 characters)');
            return;
        }

        try {
            setUploading(true);
            setUploadProgress(10);

            // Upload files to Firebase Storage
            const uploadedFiles = [];

            if (files.length > 0) {
                const totalFiles = files.length;

                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    const fileName = `submissions/${assignment.id}/${user.uid}/${Date.now()}_${file.name}`;
                    const storageRef = ref(storage, fileName);

                    // Upload file
                    await uploadBytes(storageRef, file);

                    // Get download URL
                    const downloadURL = await getDownloadURL(storageRef);

                    uploadedFiles.push({
                        name: file.name,
                        url: downloadURL,
                        type: file.type,
                        size: file.size
                    });

                    // Update progress
                    setUploadProgress(10 + ((i + 1) / totalFiles) * 70);
                }
            }

            setUploadProgress(85);

            // Create submission document in Firestore
            await addDoc(collection(db, 'submissions'), {
                assignmentId: assignment.id,
                classId: assignment.classId,
                studentId: user.uid,
                studentName: user.displayName || user.email,
                studentEmail: user.email,
                submissionText: submissionText.trim(),
                files: uploadedFiles,
                submittedAt: serverTimestamp(),
                status: 'submitted',
                isLate: new Date() > assignment.dueDate
            });

            setUploadProgress(100);

            // Success feedback
            toast.success('🎉 Assignment submitted successfully!');

            // Close modal after short delay
            setTimeout(() => {
                onSuccess();
            }, 500);

        } catch (error) {
            console.error('Submission error:', error);
            toast.error('Failed to submit assignment. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    // Check if late submission
    const isLateSubmission = new Date() > assignment.dueDate;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-5">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <h2 className="text-2xl font-black text-white mb-2">Submit Assignment</h2>
                            <p className="text-blue-100 font-semibold">{assignment.title}</p>
                        </div>
                        <button
                            onClick={onClose}
                            disabled={uploading}
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
                        >
                            <X size={24} className="text-white" />
                        </button>
                    </div>

                    {/* Late Warning */}
                    {isLateSubmission && (
                        <div className="mt-4 p-3 bg-red-500 rounded-lg flex items-center gap-2">
                            <AlertCircle size={20} className="text-white flex-shrink-0" />
                            <p className="text-sm text-white font-bold">
                                This is a late submission. It may affect your grade.
                            </p>
                        </div>
                    )}

                    {/* Assignment Info */}
                    <div className="mt-4 flex items-center gap-4 text-sm text-blue-100">
                        <span>Due: {assignment.dueDate.toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{assignment.totalPoints || 100} points</span>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Text Submission */}
                    <div>
                        <label className="block text-sm font-bold text-gray-900 mb-2">
                            Your Answer
                        </label>
                        <textarea
                            value={submissionText}
                            onChange={(e) => setSubmissionText(e.target.value)}
                            placeholder="Type your answer here... (Optional if you're uploading files)"
                            disabled={uploading}
                            className="w-full h-48 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none resize-none font-medium disabled:bg-gray-50 disabled:cursor-not-allowed"
                        />
                        <div className="flex justify-between items-center mt-2">
                            <p className="text-xs text-gray-500">
                                {submissionText.length}/5000 characters
                            </p>
                            {submissionText.length > 4500 && (
                                <p className="text-xs text-orange-600 font-semibold">
                                    Approaching character limit
                                </p>
                            )}
                        </div>
                    </div>

                    {/* File Upload */}
                    <div>
                        <label className="block text-sm font-bold text-gray-900 mb-3">
                            Attachments <span className="text-gray-500 font-normal">(Max 5 files, 10MB each)</span>
                        </label>

                        {/* Upload Button */}
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading || files.length >= 5}
                            className="w-full p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                        >
                            <Upload size={32} className="text-gray-400 group-hover:text-blue-600 mx-auto mb-2" />
                            <p className="text-sm font-bold text-gray-700 group-hover:text-blue-600">
                                Click to upload or drag and drop
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                PDF, DOC, DOCX, JPG, PNG, MP4 (max 10MB)
                            </p>
                        </button>

                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.mp4,.mov,.txt"
                            onChange={handleFileSelect}
                            className="hidden"
                        />

                        {/* File List */}
                        {files.length > 0 && (
                            <div className="mt-4 space-y-2">
                                {files.map((file, index) => {
                                    const FileIcon = getFileIcon(file);
                                    return (
                                        <motion.div
                                            key={index}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg group hover:border-blue-300 transition-all"
                                        >
                                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <FileIcon size={20} className="text-blue-600" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-gray-900 truncate">{file.name}</p>
                                                <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                                            </div>
                                            <button
                                                onClick={() => handleRemoveFile(index)}
                                                disabled={uploading}
                                                className="p-2 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                                            >
                                                <Trash2 size={16} className="text-red-600" />
                                            </button>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Upload Progress */}
                    {uploading && (
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                            <div className="flex items-center gap-3 mb-3">
                                <Loader2 size={20} className="text-blue-600 animate-spin" />
                                <p className="text-sm font-bold text-blue-900">
                                    Submitting your assignment...
                                </p>
                            </div>
                            <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${uploadProgress}%` }}
                                    className="h-full bg-gradient-to-r from-blue-600 to-purple-600"
                                />
                            </div>
                            <p className="text-xs text-blue-700 mt-2 font-semibold">{uploadProgress}% complete</p>
                        </div>
                    )}

                    {/* Instructions (if any) */}
                    {assignment.description && (
                        <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                            <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Assignment Instructions</p>
                            <p className="text-sm text-gray-700">{assignment.description}</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
                    <div className="flex items-center justify-between gap-4">
                        <button
                            onClick={onClose}
                            disabled={uploading}
                            className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-100 transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>

                        <button
                            onClick={handleSubmit}
                            disabled={uploading || (!submissionText.trim() && files.length === 0)}
                            className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {uploading ? (
                                <>
                                    <Loader2 size={20} className="animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <Send size={20} />
                                    Submit Assignment
                                </>
                            )}
                        </button>
                    </div>

                    {/* Submission Info */}
                    <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                        <CheckCircle2 size={14} />
                        <span>You can only submit once. Make sure everything is correct.</span>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default AssignmentSubmitModal;
