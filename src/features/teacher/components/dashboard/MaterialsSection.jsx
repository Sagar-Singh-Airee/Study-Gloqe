// src/features/teacher/components/dashboard/MaterialsSection.jsx
// ✅ PROFESSIONAL MATERIALS SECTION - ENHANCED 2025

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FileText, Upload, Search, Filter, Grid, List, FolderOpen,
    File, Link as LinkIcon, Video, Image, Download, ExternalLink,
    Trash2, Edit, Share2, Eye, MoreVertical, Plus, Clock, Users,
    BookOpen, TrendingUp, Zap, CheckCircle2, Folders, Tag, X
} from 'lucide-react';
import { collection, query, where, getDocs, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '@shared/config/firebase';
import { useAuth } from '@auth/contexts/AuthContext';
import toast from 'react-hot-toast';

const MaterialsSection = () => {
    const { user } = useAuth();
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [viewMode, setViewMode] = useState('grid'); // grid or list
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('all'); // all, document, link, video, image
    const [filterClass, setFilterClass] = useState('all');
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [classes, setClasses] = useState([]);
    const [uploadData, setUploadData] = useState({
        title: '',
        description: '',
        type: 'document',
        classId: '',
        file: null,
        url: '',
    });
    const [stats, setStats] = useState({
        total: 0,
        documents: 0,
        links: 0,
        videos: 0,
        totalDownloads: 0,
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

            // Load materials
            const materialsQuery = query(
                collection(db, 'materials'),
                where('teacherId', '==', user.uid),
                where('status', '==', 'active'),
                orderBy('createdAt', 'desc')
            );
            const materialsSnap = await getDocs(materialsQuery);
            const materialsData = materialsSnap.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date(doc.data().createdAt),
            }));

            setMaterials(materialsData);
            calculateStats(materialsData);
        } catch (error) {
            console.error('Error loading materials:', error);
            toast.error('Failed to load materials');
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (data) => {
        const documents = data.filter(m => m.type === 'document').length;
        const links = data.filter(m => m.type === 'link').length;
        const videos = data.filter(m => m.type === 'video').length;
        const totalDownloads = data.reduce((sum, m) => sum + (m.downloadCount || 0), 0);

        setStats({
            total: data.length,
            documents,
            links,
            videos,
            totalDownloads,
        });
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file size (max 50MB)
        if (file.size > 50 * 1024 * 1024) {
            toast.error('File size must be less than 50MB');
            return;
        }

        setUploadData({ ...uploadData, file, title: uploadData.title || file.name });
    };

    const handleUpload = async (e) => {
        e.preventDefault();

        if (!uploadData.title || !uploadData.classId) {
            toast.error('Please fill in all required fields');
            return;
        }

        if (uploadData.type !== 'link' && !uploadData.file) {
            toast.error('Please select a file to upload');
            return;
        }

        if (uploadData.type === 'link' && !uploadData.url) {
            toast.error('Please enter a URL');
            return;
        }

        setUploading(true);
        const toastId = toast.loading('Uploading material...');

        try {
            let fileUrl = uploadData.url;
            let fileSize = 0;
            let fileType = '';

            // Upload file to storage if not a link
            if (uploadData.type !== 'link' && uploadData.file) {
                const timestamp = Date.now();
                const fileName = `${timestamp}_${uploadData.file.name}`;
                const fileRef = ref(storage, `materials/${user.uid}/${fileName}`);

                await uploadBytes(fileRef, uploadData.file);
                fileUrl = await getDownloadURL(fileRef);
                fileSize = uploadData.file.size;
                fileType = uploadData.file.type;
            }

            // Add material to Firestore
            await addDoc(collection(db, 'materials'), {
                title: uploadData.title,
                description: uploadData.description,
                type: uploadData.type,
                classId: uploadData.classId,
                teacherId: user.uid,
                teacherName: user.displayName || user.email,
                fileUrl,
                fileSize,
                fileType,
                downloadCount: 0,
                status: 'active',
                createdAt: new Date(),
            });

            toast.success('Material uploaded successfully!', { id: toastId });
            setShowUploadModal(false);
            setUploadData({
                title: '',
                description: '',
                type: 'document',
                classId: '',
                file: null,
                url: '',
            });
            loadData();
        } catch (error) {
            console.error('Error uploading material:', error);
            toast.error('Failed to upload material', { id: toastId });
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (material) => {
        if (!window.confirm('Are you sure you want to delete this material?')) return;

        try {
            // Delete file from storage if it exists
            if (material.fileUrl && material.type !== 'link') {
                try {
                    const fileRef = ref(storage, material.fileUrl);
                    await deleteObject(fileRef);
                } catch (error) {
                    console.warn('Could not delete file from storage:', error);
                }
            }

            // Delete from Firestore
            await deleteDoc(doc(db, 'materials', material.id));
            toast.success('Material deleted successfully');
            loadData();
        } catch (error) {
            console.error('Error deleting material:', error);
            toast.error('Failed to delete material');
        }
    };

    const handleDownload = async (material) => {
        if (material.type === 'link') {
            window.open(material.fileUrl, '_blank');
        } else {
            window.open(material.fileUrl, '_blank');
        }

        // Increment download count
        try {
            await updateDoc(doc(db, 'materials', material.id), {
                downloadCount: (material.downloadCount || 0) + 1,
            });
            loadData();
        } catch (error) {
            console.error('Error updating download count:', error);
        }
    };

    // Filter materials
    const filteredMaterials = materials.filter(material => {
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            if (
                !material.title.toLowerCase().includes(query) &&
                !material.description?.toLowerCase().includes(query)
            ) {
                return false;
            }
        }

        if (filterType !== 'all' && material.type !== filterType) return false;
        if (filterClass !== 'all' && material.classId !== filterClass) return false;

        return true;
    });

    const statsCards = [
        {
            label: 'Total Materials',
            value: stats.total,
            icon: Folders,
            gradient: 'from-blue-500 to-cyan-500',
            bgColor: 'bg-blue-50',
        },
        {
            label: 'Documents',
            value: stats.documents,
            icon: FileText,
            gradient: 'from-green-500 to-emerald-500',
            bgColor: 'bg-green-50',
        },
        {
            label: 'Links & Videos',
            value: stats.links + stats.videos,
            icon: LinkIcon,
            gradient: 'from-purple-500 to-pink-500',
            bgColor: 'bg-purple-50',
        },
        {
            label: 'Total Downloads',
            value: stats.totalDownloads,
            icon: Download,
            gradient: 'from-orange-500 to-red-500',
            bgColor: 'bg-orange-50',
        },
    ];

    const getTypeIcon = (type) => {
        switch (type) {
            case 'document': return <FileText className="w-5 h-5" />;
            case 'link': return <LinkIcon className="w-5 h-5" />;
            case 'video': return <Video className="w-5 h-5" />;
            case 'image': return <Image className="w-5 h-5" />;
            default: return <File className="w-5 h-5" />;
        }
    };

    const getTypeColor = (type) => {
        switch (type) {
            case 'document': return 'text-blue-600 bg-blue-50';
            case 'link': return 'text-purple-600 bg-purple-50';
            case 'video': return 'text-red-600 bg-red-50';
            case 'image': return 'text-green-600 bg-green-50';
            default: return 'text-gray-600 bg-gray-50';
        }
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return 'N/A';
        const mb = bytes / (1024 * 1024);
        return `${mb.toFixed(2)} MB`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"
                    />
                    <p className="text-gray-600">Loading materials...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Materials</h1>
                    <p className="text-gray-600 font-medium mt-1">
                        Upload and organize study materials for your students
                    </p>
                </div>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowUploadModal(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all"
                >
                    <Upload className="w-5 h-5" />
                    Upload Material
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
                                    <div className={`w-11 h-11 bg-gradient-to-br ${stat.gradient} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                        <Icon className="w-5 h-5 text-white" />
                                    </div>
                                </div>
                                <h3 className="text-3xl font-black text-gray-900 mb-1">{stat.value}</h3>
                                <p className="text-sm font-semibold text-gray-600">{stat.label}</p>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Filters & View Toggle */}
            <div className="bg-white rounded-2xl p-4 border border-gray-200">
                <div className="flex flex-col lg:flex-row gap-4">

                    {/* Search */}
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search materials..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                    </div>

                    {/* Type Filter */}
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-medium"
                    >
                        <option value="all">All Types</option>
                        <option value="document">Documents</option>
                        <option value="link">Links</option>
                        <option value="video">Videos</option>
                        <option value="image">Images</option>
                    </select>

                    {/* Class Filter */}
                    <select
                        value={filterClass}
                        onChange={(e) => setFilterClass(e.target.value)}
                        className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-medium"
                    >
                        <option value="all">All Classes</option>
                        {classes.map(cls => (
                            <option key={cls.id} value={cls.id}>
                                {cls.name} - {cls.section}
                            </option>
                        ))}
                    </select>

                    {/* View Toggle */}
                    <div className="flex bg-gray-100 p-1 rounded-xl">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-gray-600'
                                }`}
                        >
                            <Grid className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-600'
                                }`}
                        >
                            <List className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Materials Display */}
            {filteredMaterials.length > 0 ? (
                viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredMaterials.map((material, index) => {
                            const className = classes.find(c => c.id === material.classId)?.name || 'Unknown';
                            return (
                                <motion.div
                                    key={material.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="bg-white border-2 border-gray-200 rounded-2xl p-5 hover:border-blue-300 hover:shadow-lg transition-all group"
                                >
                                    {/* Type Icon */}
                                    <div className={`w-12 h-12 ${getTypeColor(material.type)} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                        {getTypeIcon(material.type)}
                                    </div>

                                    {/* Title & Description */}
                                    <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1 group-hover:text-blue-600 transition-colors">
                                        {material.title}
                                    </h3>
                                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                                        {material.description || 'No description'}
                                    </p>

                                    {/* Meta Info */}
                                    <div className="flex items-center gap-3 mb-4 text-xs text-gray-500">
                                        <div className="flex items-center gap-1">
                                            <BookOpen className="w-3 h-3" />
                                            <span>{className}</span>
                                        </div>
                                        {material.fileSize && (
                                            <div className="flex items-center gap-1">
                                                <File className="w-3 h-3" />
                                                <span>{formatFileSize(material.fileSize)}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-1">
                                            <Download className="w-3 h-3" />
                                            <span>{material.downloadCount || 0}</span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleDownload(material)}
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl font-bold transition-all"
                                        >
                                            {material.type === 'link' ? <ExternalLink className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                                            {material.type === 'link' ? 'Open' : 'Download'}
                                        </button>
                                        <button
                                            onClick={() => handleDelete(material)}
                                            className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Material</th>
                                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Type</th>
                                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Class</th>
                                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Size</th>
                                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Downloads</th>
                                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredMaterials.map((material) => {
                                    const className = classes.find(c => c.id === material.classId)?.name || 'Unknown';
                                    return (
                                        <tr key={material.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 ${getTypeColor(material.type)} rounded-lg flex items-center justify-center`}>
                                                        {getTypeIcon(material.type)}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900">{material.title}</p>
                                                        <p className="text-sm text-gray-600 line-clamp-1">{material.description}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="capitalize text-sm font-medium text-gray-700">{material.type}</span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-700">{className}</td>
                                            <td className="px-6 py-4 text-sm text-gray-700">{formatFileSize(material.fileSize)}</td>
                                            <td className="px-6 py-4 text-sm font-bold text-gray-900">{material.downloadCount || 0}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleDownload(material)}
                                                        className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-all"
                                                    >
                                                        {material.type === 'link' ? <ExternalLink className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(material)}
                                                        className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-all"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )
            ) : (
                <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-gray-300">
                    <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No materials found</h3>
                    <p className="text-gray-600 mb-6">
                        {searchQuery || filterType !== 'all' || filterClass !== 'all'
                            ? 'Try adjusting your filters or search query'
                            : 'Upload study materials to share with your students'}
                    </p>
                    <button
                        onClick={() => setShowUploadModal(true)}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-bold hover:shadow-lg transition-all"
                    >
                        <Upload className="w-5 h-5" />
                        Upload Material
                    </button>
                </div>
            )}

            {/* Upload Modal */}
            <AnimatePresence>
                {showUploadModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowUploadModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
                        >
                            <div className="flex items-center justify-between p-6 border-b border-gray-200">
                                <h2 className="text-2xl font-black text-gray-900">Upload Material</h2>
                                <button
                                    onClick={() => setShowUploadModal(false)}
                                    className="p-2 hover:bg-gray-100 rounded-xl transition-all"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <form onSubmit={handleUpload} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-900 mb-2">
                                        Title *
                                    </label>
                                    <input
                                        type="text"
                                        value={uploadData.title}
                                        onChange={(e) => setUploadData({ ...uploadData, title: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-all"
                                        placeholder="Enter material title"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-900 mb-2">
                                        Description
                                    </label>
                                    <textarea
                                        value={uploadData.description}
                                        onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-all resize-none"
                                        rows="3"
                                        placeholder="Enter description (optional)"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-900 mb-2">
                                            Type *
                                        </label>
                                        <select
                                            value={uploadData.type}
                                            onChange={(e) => setUploadData({ ...uploadData, type: e.target.value })}
                                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-all"
                                            required
                                        >
                                            <option value="document">Document</option>
                                            <option value="link">Link</option>
                                            <option value="video">Video</option>
                                            <option value="image">Image</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-900 mb-2">
                                            Class *
                                        </label>
                                        <select
                                            value={uploadData.classId}
                                            onChange={(e) => setUploadData({ ...uploadData, classId: e.target.value })}
                                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-all"
                                            required
                                        >
                                            <option value="">Select class</option>
                                            {classes.map(cls => (
                                                <option key={cls.id} value={cls.id}>
                                                    {cls.name} - {cls.section}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {uploadData.type === 'link' ? (
                                    <div>
                                        <label className="block text-sm font-bold text-gray-900 mb-2">
                                            URL *
                                        </label>
                                        <input
                                            type="url"
                                            value={uploadData.url}
                                            onChange={(e) => setUploadData({ ...uploadData, url: e.target.value })}
                                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-all"
                                            placeholder="https://example.com"
                                            required
                                        />
                                    </div>
                                ) : (
                                    <div>
                                        <label className="block text-sm font-bold text-gray-900 mb-2">
                                            File *
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="file"
                                                onChange={handleFileSelect}
                                                className="hidden"
                                                id="file-upload"
                                                required
                                            />
                                            <label
                                                htmlFor="file-upload"
                                                className="flex items-center justify-center gap-3 w-full px-4 py-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-500 transition-all cursor-pointer"
                                            >
                                                <Upload className="w-6 h-6 text-gray-400" />
                                                <div>
                                                    <p className="font-bold text-gray-900">
                                                        {uploadData.file ? uploadData.file.name : 'Choose file or drag here'}
                                                    </p>
                                                    <p className="text-sm text-gray-500">Max file size: 50MB</p>
                                                </div>
                                            </label>
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowUploadModal(false)}
                                        className="flex-1 px-6 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-all"
                                        disabled={uploading}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={uploading}
                                        className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {uploading ? 'Uploading...' : 'Upload'}
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

export default MaterialsSection;
