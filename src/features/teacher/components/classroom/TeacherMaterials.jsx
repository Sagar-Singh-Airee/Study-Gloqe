// src/features/teacher/components/classroom/TeacherMaterials.jsx - MATERIALS MANAGEMENT 📚

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, BookOpen, FileText, Image, Video, Link as LinkIcon,
    Upload, Download, Eye, Edit2, Trash2, Search, Filter,
    Folder, FolderOpen, MoreVertical, Star, Clock, Users,
    ChevronDown, File, Paperclip, ExternalLink
} from 'lucide-react';
import {
    collection, query, orderBy, onSnapshot, addDoc,
    updateDoc, deleteDoc, doc, serverTimestamp, getDocs
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '@/shared/config/firebase';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const MATERIAL_TYPES = [
    { id: 'pdf', label: 'PDF Document', icon: FileText, color: 'red', accept: '.pdf' },
    { id: 'image', label: 'Image', icon: Image, color: 'blue', accept: 'image/*' },
    { id: 'video', label: 'Video', icon: Video, color: 'purple', accept: 'video/*' },
    { id: 'link', label: 'External Link', icon: LinkIcon, color: 'green', accept: null },
    { id: 'document', label: 'Document', icon: File, color: 'orange', accept: '.doc,.docx,.txt,.ppt,.pptx' },
];

const TeacherMaterials = ({ classId, classData }) => {
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [selectedMaterial, setSelectedMaterial] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploading, setUploading] = useState(false);
    const [stats, setStats] = useState({
        total: 0,
        pdfs: 0,
        images: 0,
        videos: 0,
        links: 0,
        totalViews: 0,
    });

    // Fetch Materials Real-time
    useEffect(() => {
        if (!classId) return;

        const materialsRef = collection(db, 'classes', classId, 'materials');
        const q = query(materialsRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const materialList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            setMaterials(materialList);
            calculateStats(materialList);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [classId]);

    // Calculate Stats
    const calculateStats = (materialList) => {
        const stats = {
            total: materialList.length,
            pdfs: materialList.filter(m => m.type === 'pdf').length,
            images: materialList.filter(m => m.type === 'image').length,
            videos: materialList.filter(m => m.type === 'video').length,
            links: materialList.filter(m => m.type === 'link').length,
            totalViews: materialList.reduce((sum, m) => sum + (m.views || 0), 0),
        };
        setStats(stats);
    };

    // Filter & Search
    const filteredMaterials = materials.filter(material => {
        const matchesSearch = material.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = filterType === 'all' || material.type === filterType;
        return matchesSearch && matchesType;
    });

    // Delete Material
    const handleDeleteMaterial = async (material) => {
        if (!confirm(`Delete "${material.title}"?`)) return;

        try {
            // Delete from Firestore
            await deleteDoc(doc(db, 'classes', classId, 'materials', material.id));

            // Delete from Storage if it's a file
            if (material.storageRef) {
                const fileRef = ref(storage, material.storageRef);
                await deleteObject(fileRef);
            }

            toast.success('Material deleted successfully');
        } catch (error) {
            console.error('Error deleting material:', error);
            toast.error('Failed to delete material');
        }
    };

    return (
        <div className="space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-6 gap-4">
                <StatCard
                    icon={BookOpen}
                    label="Total Materials"
                    value={stats.total}
                    gradient="from-blue-500 to-cyan-500"
                />
                <StatCard
                    icon={FileText}
                    label="PDFs"
                    value={stats.pdfs}
                    gradient="from-red-500 to-pink-500"
                />
                <StatCard
                    icon={Image}
                    label="Images"
                    value={stats.images}
                    gradient="from-purple-500 to-pink-500"
                />
                <StatCard
                    icon={Video}
                    label="Videos"
                    value={stats.videos}
                    gradient="from-orange-500 to-red-500"
                />
                <StatCard
                    icon={LinkIcon}
                    label="Links"
                    value={stats.links}
                    gradient="from-green-500 to-teal-500"
                />
                <StatCard
                    icon={Eye}
                    label="Total Views"
                    value={stats.totalViews}
                    gradient="from-indigo-500 to-purple-500"
                />
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 w-full">
                    {/* Search */}
                    <div className="relative flex-1 max-w-md">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search materials..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all text-sm font-semibold"
                        />
                    </div>

                    {/* Filter */}
                    <div className="relative">
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="appearance-none pl-4 pr-10 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all text-sm font-bold text-gray-700 bg-white cursor-pointer"
                        >
                            <option value="all">All Types</option>
                            <option value="pdf">PDFs</option>
                            <option value="image">Images</option>
                            <option value="video">Videos</option>
                            <option value="link">Links</option>
                            <option value="document">Documents</option>
                        </select>
                        <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                </div>

                {/* Upload Button */}
                <button
                    onClick={() => setShowUploadModal(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-xl text-sm font-bold hover:shadow-lg hover:scale-105 transition-all whitespace-nowrap"
                >
                    <Plus size={18} />
                    Upload Material
                </button>
            </div>

            {/* Materials Grid */}
            {loading ? (
                <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => <MaterialSkeleton key={i} />)}
                </div>
            ) : filteredMaterials.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-300">
                    <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-teal-100 rounded-full flex items-center justify-center mx-auto mb-5 border-4 border-white shadow-lg">
                        <BookOpen size={40} className="text-green-600" />
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 mb-2">
                        {searchQuery ? 'No Results Found' : 'No Materials Yet'}
                    </h3>
                    <p className="text-sm text-gray-600 mb-6">
                        {searchQuery
                            ? 'Try adjusting your search or filters'
                            : 'Upload study materials for your students!'}
                    </p>
                    {!searchQuery && (
                        <button
                            onClick={() => setShowUploadModal(true)}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-xl text-sm font-bold hover:shadow-lg hover:scale-105 transition-all"
                        >
                            <Plus size={18} />
                            Upload First Material
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredMaterials.map((material, idx) => (
                        <MaterialCard
                            key={material.id}
                            material={material}
                            onDelete={handleDeleteMaterial}
                            delay={idx * 0.05}
                        />
                    ))}
                </div>
            )}

            {/* Upload Modal */}
            <AnimatePresence>
                {showUploadModal && (
                    <UploadMaterialModal
                        classId={classId}
                        onClose={() => setShowUploadModal(false)}
                        uploadProgress={uploadProgress}
                        setUploadProgress={setUploadProgress}
                        uploading={uploading}
                        setUploading={setUploading}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

// Stat Card Component
const StatCard = ({ icon: Icon, label, value, gradient }) => {
    return (
        <motion.div
            whileHover={{ y: -4, scale: 1.02 }}
            className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-lg transition-all"
        >
            <div className={`w-12 h-12 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center mb-3`}>
                <Icon size={20} className="text-white" />
            </div>
            <div className="text-2xl font-black text-gray-900 mb-1">{value}</div>
            <div className="text-xs text-gray-600 font-semibold">{label}</div>
        </motion.div>
    );
};

// Material Card Component
const MaterialCard = ({ material, onDelete, delay }) => {
    const typeConfig = MATERIAL_TYPES.find(t => t.id === material.type) || MATERIAL_TYPES[0];
    const Icon = typeConfig.icon;

    const getFileSize = (bytes) => {
        if (!bytes) return null;
        const mb = (bytes / (1024 * 1024)).toFixed(2);
        return `${mb} MB`;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
            whileHover={{ y: -4 }}
            className="bg-white border-2 border-gray-200 rounded-2xl p-5 hover:shadow-xl transition-all group"
        >
            {/* Icon/Thumbnail */}
            <div className={`w-full h-32 bg-gradient-to-br from-${typeConfig.color}-400 to-${typeConfig.color}-600 rounded-xl flex items-center justify-center mb-4 relative overflow-hidden`}>
                {material.type === 'image' && material.url ? (
                    <img src={material.url} alt={material.title} className="w-full h-full object-cover" />
                ) : (
                    <Icon size={48} className="text-white" />
                )}

                {/* Type Badge */}
                <div className={`absolute top-2 right-2 px-2 py-1 bg-white/90 backdrop-blur-sm rounded-lg text-xs font-bold text-${typeConfig.color}-700 border border-${typeConfig.color}-200`}>
                    {typeConfig.label}
                </div>
            </div>

            {/* Title */}
            <h3 className="text-sm font-black text-gray-900 mb-2 line-clamp-2 min-h-[2.5rem]">
                {material.title}
            </h3>

            {/* Description */}
            {material.description && (
                <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                    {material.description}
                </p>
            )}

            {/* Meta Info */}
            <div className="flex items-center justify-between mb-4 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                    <Eye size={12} />
                    <span className="font-semibold">{material.views || 0} views</span>
                </div>
                {material.fileSize && (
                    <span className="font-semibold">{getFileSize(material.fileSize)}</span>
                )}
            </div>

            {/* Date */}
            <div className="text-xs text-gray-500 font-semibold mb-4">
                {material.createdAt && format(material.createdAt.toDate(), 'MMM d, yyyy')}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
                {material.type === 'link' ? (
                    <a
                        href={material.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2.5 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-xl text-xs font-bold hover:shadow-lg transition-all flex items-center justify-center gap-1.5"
                    >
                        <ExternalLink size={14} />
                        Open Link
                    </a>
                ) : (
                    <a
                        href={material.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl text-xs font-bold hover:shadow-lg transition-all flex items-center justify-center gap-1.5"
                    >
                        <Eye size={14} />
                        View
                    </a>
                )}
                <button
                    onClick={() => onDelete(material)}
                    className="p-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-all"
                    title="Delete"
                >
                    <Trash2 size={14} />
                </button>
            </div>
        </motion.div>
    );
};

// Material Skeleton
const MaterialSkeleton = () => (
    <div className="bg-white border-2 border-gray-200 rounded-2xl p-5 animate-pulse">
        <div className="w-full h-32 bg-gray-200 rounded-xl mb-4" />
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
        <div className="h-3 bg-gray-100 rounded w-full mb-3" />
        <div className="flex justify-between mb-4">
            <div className="h-3 bg-gray-100 rounded w-16" />
            <div className="h-3 bg-gray-100 rounded w-12" />
        </div>
        <div className="h-3 bg-gray-100 rounded w-24 mb-4" />
        <div className="flex gap-2">
            <div className="flex-1 h-10 bg-gray-200 rounded-xl" />
            <div className="w-10 h-10 bg-gray-100 rounded-xl" />
        </div>
    </div>
);

// Upload Material Modal
const UploadMaterialModal = ({ classId, onClose, uploadProgress, setUploadProgress, uploading, setUploading }) => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        type: 'pdf',
        url: '',
        file: null,
    });

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData(prev => ({ ...prev, file }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.title) {
            return toast.error('Please enter a title');
        }

        if (formData.type !== 'link' && !formData.file) {
            return toast.error('Please select a file');
        }

        if (formData.type === 'link' && !formData.url) {
            return toast.error('Please enter a URL');
        }

        setUploading(true);

        try {
            let downloadURL = formData.url;
            let storageRef = null;
            let fileSize = null;

            // Upload file if not a link
            if (formData.type !== 'link' && formData.file) {
                const fileName = `${Date.now()}_${formData.file.name}`;
                const fileRef = ref(storage, `classes/${classId}/materials/${fileName}`);

                const uploadTask = uploadBytesResumable(fileRef, formData.file);

                // Track upload progress
                await new Promise((resolve, reject) => {
                    uploadTask.on('state_changed',
                        (snapshot) => {
                            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                            setUploadProgress(progress);
                        },
                        (error) => reject(error),
                        async () => {
                            downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                            storageRef = fileRef.fullPath;
                            fileSize = formData.file.size;
                            resolve();
                        }
                    );
                });
            }

            // Add to Firestore
            await addDoc(collection(db, 'classes', classId, 'materials'), {
                title: formData.title,
                description: formData.description,
                type: formData.type,
                url: downloadURL,
                storageRef,
                fileSize,
                views: 0,
                createdAt: serverTimestamp(),
            });

            toast.success('Material uploaded successfully! 🎉');
            onClose();
        } catch (error) {
            console.error('Error uploading material:', error);
            toast.error('Failed to upload material');
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl"
            >
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <Upload size={32} className="text-white" />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900">Upload Material</h2>
                    <p className="text-sm text-gray-600 mt-2">Share resources with your students</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Title */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Title *</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                            placeholder="e.g., Chapter 5 Notes"
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all text-sm font-semibold"
                            disabled={uploading}
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Brief description..."
                            rows={3}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all text-sm font-semibold resize-none"
                            disabled={uploading}
                        />
                    </div>

                    {/* Type */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Type *</label>
                        <select
                            value={formData.type}
                            onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all text-sm font-bold bg-white"
                            disabled={uploading}
                        >
                            {MATERIAL_TYPES.map(type => (
                                <option key={type.id} value={type.id}>{type.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* File Upload or URL */}
                    {formData.type === 'link' ? (
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">URL *</label>
                            <input
                                type="url"
                                value={formData.url}
                                onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                                placeholder="https://..."
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all text-sm font-semibold"
                                disabled={uploading}
                            />
                        </div>
                    ) : (
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">File *</label>
                            <div className="relative">
                                <input
                                    type="file"
                                    onChange={handleFileChange}
                                    accept={MATERIAL_TYPES.find(t => t.id === formData.type)?.accept}
                                    className="hidden"
                                    id="file-upload"
                                    disabled={uploading}
                                />
                                <label
                                    htmlFor="file-upload"
                                    className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer"
                                >
                                    <Paperclip size={18} className="text-gray-600" />
                                    <span className="text-sm font-semibold text-gray-600">
                                        {formData.file ? formData.file.name : 'Choose file...'}
                                    </span>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Upload Progress */}
                    {uploading && (
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs font-bold text-gray-700">
                                <span>Uploading...</span>
                                <span>{Math.round(uploadProgress)}%</span>
                            </div>
                            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-gradient-to-r from-green-500 to-teal-500"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${uploadProgress}%` }}
                                    transition={{ duration: 0.3 }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 border-2 border-gray-200 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all text-gray-700"
                            disabled={uploading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={uploading}
                            className="flex-1 py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-xl text-sm font-bold hover:shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                        >
                            {uploading ? 'Uploading...' : 'Upload'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
};

export default TeacherMaterials;
