// src/features/student/components/classroom/StudentMaterials.jsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Download, Eye, Search, Filter, FileText, Image as ImageIcon,
    Video, Link as LinkIcon, File, FolderOpen, Calendar,
    User, ExternalLink, Loader2, BookOpen, AlertCircle,
    CheckCircle, Star, Bookmark, Grid, List
} from 'lucide-react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@shared/config/firebase';
import { useAuth } from '@auth/contexts/AuthContext';
import toast from 'react-hot-toast';

const StudentMaterials = ({ classId, classData }) => {
    const { user } = useAuth();
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('all'); // all, document, video, link, image
    const [viewMode, setViewMode] = useState('grid'); // grid, list
    const [sortBy, setSortBy] = useState('recent'); // recent, name, type

    useEffect(() => {
        loadMaterials();
    }, [classId]);

    const loadMaterials = async () => {
        try {
            setLoading(true);

            const materialsQuery = query(
                collection(db, 'materials'),
                where('classId', '==', classId),
                where('status', '==', 'active'),
                orderBy('createdAt', 'desc')
            );

            const snapshot = await getDocs(materialsQuery);
            const materialsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate?.() || new Date()
            }));

            setMaterials(materialsData);
        } catch (error) {
            console.error('Error loading materials:', error);
            toast.error('Failed to load materials');
        } finally {
            setLoading(false);
        }
    };

    // Get filtered and sorted materials
    const getFilteredMaterials = () => {
        let filtered = [...materials];

        // Search filter
        if (searchQuery) {
            filtered = filtered.filter(m =>
                m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                m.description?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Type filter
        if (filterType !== 'all') {
            filtered = filtered.filter(m => m.type === filterType);
        }

        // Sort
        if (sortBy === 'recent') {
            filtered.sort((a, b) => b.createdAt - a.createdAt);
        } else if (sortBy === 'name') {
            filtered.sort((a, b) => a.title.localeCompare(b.title));
        } else if (sortBy === 'type') {
            filtered.sort((a, b) => a.type.localeCompare(b.type));
        }

        return filtered;
    };

    // Get icon based on material type
    const getTypeIcon = (type) => {
        const icons = {
            document: FileText,
            pdf: FileText,
            video: Video,
            link: LinkIcon,
            image: ImageIcon
        };
        return icons[type] || File;
    };

    // Get type color
    const getTypeColor = (type) => {
        const colors = {
            document: 'from-blue-500 to-cyan-500',
            pdf: 'from-red-500 to-pink-500',
            video: 'from-purple-500 to-pink-500',
            link: 'from-green-500 to-teal-500',
            image: 'from-yellow-500 to-orange-500'
        };
        return colors[type] || 'from-gray-500 to-gray-600';
    };

    // Format file size
    const formatFileSize = (bytes) => {
        if (!bytes) return 'N/A';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    // Handle download
    const handleDownload = (material) => {
        if (material.type === 'link') {
            window.open(material.fileUrl, '_blank');
            toast.success('Opening link...');
        } else {
            window.open(material.fileUrl, '_blank');
            toast.success('Downloading...');
        }
    };

    // Handle preview
    const handlePreview = (material) => {
        window.open(material.fileUrl, '_blank');
        toast.info('Opening preview...');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center">
                    <Loader2 size={48} className="text-blue-600 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600 font-semibold">Loading materials...</p>
                </div>
            </div>
        );
    }

    const filteredMaterials = getFilteredMaterials();

    // Count by type
    const typeCounts = materials.reduce((acc, m) => {
        acc[m.type] = (acc[m.type] || 0) + 1;
        return acc;
    }, {});

    return (
        <div className="space-y-6">
            {/* Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white border-2 border-gray-200 rounded-xl p-4"
                >
                    <p className="text-sm text-gray-600 font-semibold mb-1">Total</p>
                    <p className="text-3xl font-black text-gray-900">{materials.length}</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white border-2 border-blue-200 rounded-xl p-4"
                >
                    <p className="text-sm text-blue-600 font-semibold mb-1">Documents</p>
                    <p className="text-3xl font-black text-blue-700">{typeCounts.document || 0}</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white border-2 border-purple-200 rounded-xl p-4"
                >
                    <p className="text-sm text-purple-600 font-semibold mb-1">Videos</p>
                    <p className="text-3xl font-black text-purple-700">{typeCounts.video || 0}</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white border-2 border-green-200 rounded-xl p-4"
                >
                    <p className="text-sm text-green-600 font-semibold mb-1">Links</p>
                    <p className="text-3xl font-black text-green-700">{typeCounts.link || 0}</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white border-2 border-yellow-200 rounded-xl p-4"
                >
                    <p className="text-sm text-yellow-600 font-semibold mb-1">Images</p>
                    <p className="text-3xl font-black text-yellow-700">{typeCounts.image || 0}</p>
                </motion.div>
            </div>

            {/* Filters & Search */}
            <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search materials..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none font-medium"
                        />
                    </div>

                    {/* Type Filter */}
                    <div className="flex items-center gap-2">
                        <Filter size={20} className="text-gray-600" />
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none font-semibold"
                        >
                            <option value="all">All Types</option>
                            <option value="document">Documents</option>
                            <option value="video">Videos</option>
                            <option value="link">Links</option>
                            <option value="image">Images</option>
                        </select>
                    </div>

                    {/* Sort */}
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none font-semibold"
                    >
                        <option value="recent">Most Recent</option>
                        <option value="name">Name A-Z</option>
                        <option value="type">Type</option>
                    </select>

                    {/* View Toggle */}
                    <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                                }`}
                        >
                            <Grid size={20} className={viewMode === 'grid' ? 'text-blue-600' : 'text-gray-600'} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                                }`}
                        >
                            <List size={20} className={viewMode === 'list' ? 'text-blue-600' : 'text-gray-600'} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Materials Display */}
            {filteredMaterials.length > 0 ? (
                viewMode === 'grid' ? (
                    // Grid View
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredMaterials.map((material, idx) => {
                            const TypeIcon = getTypeIcon(material.type);
                            const gradientColor = getTypeColor(material.type);

                            return (
                                <motion.div
                                    key={material.id}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden hover:shadow-xl transition-all group"
                                >
                                    {/* Header with Icon */}
                                    <div className={`h-32 bg-gradient-to-br ${gradientColor} p-6 flex items-center justify-center relative`}>
                                        <TypeIcon size={48} className="text-white" strokeWidth={2} />

                                        {/* Type Badge */}
                                        <div className="absolute top-3 right-3 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-lg">
                                            <span className="text-xs font-bold text-white uppercase">{material.type}</span>
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="p-5">
                                        <h3 className="text-lg font-black text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                                            {material.title}
                                        </h3>

                                        {material.description && (
                                            <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                                                {material.description}
                                            </p>
                                        )}

                                        {/* Meta Info */}
                                        <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
                                            <span className="flex items-center gap-1">
                                                <Calendar size={12} />
                                                {material.createdAt.toLocaleDateString()}
                                            </span>
                                            {material.fileSize && (
                                                <>
                                                    <span>•</span>
                                                    <span>{formatFileSize(material.fileSize)}</span>
                                                </>
                                            )}
                                        </div>

                                        {/* Teacher */}
                                        <div className="flex items-center gap-2 text-xs text-gray-600 mb-4 pb-4 border-b border-gray-200">
                                            <User size={12} />
                                            <span className="font-semibold">{material.teacherName}</span>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handlePreview(material)}
                                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold transition-colors"
                                            >
                                                <Eye size={16} />
                                                Preview
                                            </button>
                                            <button
                                                onClick={() => handleDownload(material)}
                                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-bold hover:shadow-lg transition-all"
                                            >
                                                {material.type === 'link' ? (
                                                    <>
                                                        <ExternalLink size={16} />
                                                        Open
                                                    </>
                                                ) : (
                                                    <>
                                                        <Download size={16} />
                                                        Download
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                ) : (
                    // List View
                    <div className="space-y-3">
                        {filteredMaterials.map((material, idx) => {
                            const TypeIcon = getTypeIcon(material.type);
                            const gradientColor = getTypeColor(material.type);

                            return (
                                <motion.div
                                    key={material.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.03 }}
                                    className="bg-white border-2 border-gray-200 rounded-xl p-5 hover:shadow-lg transition-all"
                                >
                                    <div className="flex items-center gap-4">
                                        {/* Icon */}
                                        <div className={`w-16 h-16 bg-gradient-to-br ${gradientColor} rounded-xl flex items-center justify-center flex-shrink-0`}>
                                            <TypeIcon size={28} className="text-white" strokeWidth={2} />
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-base font-black text-gray-900 mb-1 truncate">
                                                {material.title}
                                            </h3>
                                            <p className="text-sm text-gray-600 mb-2 line-clamp-1">
                                                {material.description || 'No description'}
                                            </p>
                                            <div className="flex items-center gap-3 text-xs text-gray-500">
                                                <span className="px-2 py-1 bg-gray-100 rounded-lg font-bold uppercase">
                                                    {material.type}
                                                </span>
                                                <span>{material.createdAt.toLocaleDateString()}</span>
                                                {material.fileSize && (
                                                    <>
                                                        <span>•</span>
                                                        <span>{formatFileSize(material.fileSize)}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <button
                                                onClick={() => handlePreview(material)}
                                                className="p-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                                                title="Preview"
                                            >
                                                <Eye size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDownload(material)}
                                                className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all"
                                                title={material.type === 'link' ? 'Open' : 'Download'}
                                            >
                                                {material.type === 'link' ? (
                                                    <ExternalLink size={18} />
                                                ) : (
                                                    <Download size={18} />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )
            ) : (
                // Empty State
                <div className="bg-white rounded-xl border-2 border-gray-200 p-12 text-center">
                    <FolderOpen size={64} className="text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {searchQuery || filterType !== 'all'
                            ? 'No materials found'
                            : 'No materials yet'}
                    </h3>
                    <p className="text-gray-600">
                        {searchQuery || filterType !== 'all'
                            ? 'Try adjusting your search or filters'
                            : 'Your teacher hasn\'t uploaded any materials yet'}
                    </p>
                </div>
            )}
        </div>
    );
};

export default StudentMaterials;
