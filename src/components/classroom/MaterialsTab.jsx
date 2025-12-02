// src/components/classroom/MaterialsTab.jsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
    Plus, FileText, Download, Eye, Trash2, FolderOpen,
    Upload, File, Image, Video, Link, Search 
} from 'lucide-react';
import toast from 'react-hot-toast';

const MaterialsTab = ({ classId, isTeacher }) => {
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Mock materials data
    const materials = [
        {
            id: 1,
            name: 'Course Syllabus 2025',
            type: 'pdf',
            size: '2.4 MB',
            uploadedBy: 'Teacher',
            uploadDate: new Date('2025-11-15'),
            downloads: 25,
            category: 'Syllabus'
        },
        {
            id: 2,
            name: 'Chapter 6 Lecture Notes',
            type: 'pdf',
            size: '5.1 MB',
            uploadedBy: 'Teacher',
            uploadDate: new Date('2025-11-28'),
            downloads: 18,
            category: 'Notes'
        },
        {
            id: 3,
            name: 'Practice Problems Set',
            type: 'pdf',
            size: '1.8 MB',
            uploadedBy: 'Teacher',
            uploadDate: new Date('2025-12-01'),
            downloads: 12,
            category: 'Exercises'
        },
        {
            id: 4,
            name: 'Video Lecture - Unit 7',
            type: 'video',
            size: '125 MB',
            uploadedBy: 'Teacher',
            uploadDate: new Date('2025-11-30'),
            downloads: 20,
            category: 'Videos',
            duration: '45:20'
        },
        {
            id: 5,
            name: 'Reference Book Chapter',
            type: 'pdf',
            size: '8.3 MB',
            uploadedBy: 'Teacher',
            uploadDate: new Date('2025-11-20'),
            downloads: 15,
            category: 'References'
        },
    ];

    const getFileIcon = (type) => {
        switch (type) {
            case 'pdf': return <FileText size={24} className="text-red-500" />;
            case 'video': return <Video size={24} className="text-purple-500" />;
            case 'image': return <Image size={24} className="text-blue-500" />;
            case 'link': return <Link size={24} className="text-green-500" />;
            default: return <File size={24} className="text-gray-500" />;
        }
    };

    const categories = ['All', 'Syllabus', 'Notes', 'Exercises', 'Videos', 'References'];
    const [activeCategory, setActiveCategory] = useState('All');

    const filteredMaterials = materials.filter(m => 
        (activeCategory === 'All' || m.category === activeCategory) &&
        m.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-black">Study Materials</h2>
                    <p className="text-gray-600">Access course resources and documents</p>
                </div>
                {isTeacher && (
                    <button
                        onClick={() => setShowUploadModal(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl font-bold hover:scale-105 transition-all"
                    >
                        <Upload size={20} />
                        Upload Material
                    </button>
                )}
            </div>

            {/* Search & Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search materials..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-black transition-all"
                    />
                </div>

                {/* Category Filters */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-all ${
                                activeCategory === cat
                                    ? 'bg-black text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Materials Grid */}
            <div className="grid gap-4">
                {filteredMaterials.map((material, idx) => (
                    <motion.div
                        key={material.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-lg transition-all"
                    >
                        <div className="flex items-center gap-4">
                            {/* File Icon */}
                            <div className="w-14 h-14 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0">
                                {getFileIcon(material.type)}
                            </div>

                            {/* File Info */}
                            <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-bold text-black mb-1 truncate">{material.name}</h3>
                                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                                    <span className="px-2.5 py-1 bg-gray-100 rounded-full text-xs font-bold">
                                        {material.category}
                                    </span>
                                    <span>{material.size}</span>
                                    <span>•</span>
                                    <span>{material.uploadDate.toLocaleDateString()}</span>
                                    {material.duration && (
                                        <>
                                            <span>•</span>
                                            <span>{material.duration}</span>
                                        </>
                                    )}
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                        <Download size={12} />
                                        {material.downloads} downloads
                                    </span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => toast.success('Viewing file...')}
                                    className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all"
                                >
                                    <Eye size={18} className="text-gray-600" />
                                </button>
                                <button
                                    onClick={() => toast.success('Downloading...')}
                                    className="p-2.5 bg-black hover:bg-gray-900 rounded-lg transition-all"
                                >
                                    <Download size={18} className="text-white" />
                                </button>
                                {isTeacher && (
                                    <button className="p-2.5 bg-red-50 hover:bg-red-100 rounded-lg transition-all">
                                        <Trash2 size={18} className="text-red-600" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Empty State */}
            {filteredMaterials.length === 0 && (
                <div className="text-center py-20 bg-white border border-gray-200 rounded-2xl">
                    <FolderOpen size={64} className="mx-auto text-gray-300 mb-4" />
                    <h3 className="text-xl font-bold text-black mb-2">
                        {searchQuery ? 'No materials found' : 'No Materials Yet'}
                    </h3>
                    <p className="text-gray-600 mb-6">
                        {searchQuery 
                            ? 'Try a different search term' 
                            : isTeacher 
                                ? 'Upload your first study material' 
                                : 'Your teacher hasn\'t uploaded any materials yet'}
                    </p>
                    {isTeacher && !searchQuery && (
                        <button
                            onClick={() => setShowUploadModal(true)}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl font-bold hover:scale-105 transition-all"
                        >
                            <Upload size={20} />
                            Upload Material
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default MaterialsTab;
