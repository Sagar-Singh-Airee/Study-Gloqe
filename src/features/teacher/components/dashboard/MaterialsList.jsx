import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Plus, FileText, Link as LinkIcon,
    Video, File, Trash2, Download,
    ExternalLink, MoreVertical, BookOpen
} from 'lucide-react';
import { collection, query, where, getDocs, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { db } from '@shared/config/firebase';
import { useAuth } from '@auth/contexts/AuthContext';
import toast from 'react-hot-toast';

const MaterialsList = ({ classId = null }) => {
    const { user } = useAuth();
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadMaterials();
    }, [user]);

    const loadMaterials = async () => {
        try {
            setLoading(true);
            const constraints = [
                where('teacherId', '==', user.uid),
                where('status', '==', 'active'),
                orderBy('createdAt', 'desc')
            ];

            if (classId) {
                constraints.push(where('classId', '==', classId));
            }

            const q = query(
                collection(db, 'materials'),
                ...constraints
            );
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date()
            }));
            setMaterials(data);
        } catch (error) {
            console.error('Error loading materials:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this material?')) return;
        try {
            // Soft delete
            await deleteDoc(doc(db, 'materials', id));
            toast.success('Material deleted');
            loadMaterials();
        } catch (error) {
            toast.error('Failed to delete material');
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'document': return <FileText className="text-blue-500" />;
            case 'video': return <Video className="text-purple-500" />;
            case 'link': return <LinkIcon className="text-green-500" />;
            default: return <File className="text-gray-500" />;
        }
    };

    const filteredMaterials = materials.filter(m =>
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.fileName?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-black">Teaching Materials</h2>
                    <p className="text-gray-600 mt-1">Resource library for all your classes</p>
                </div>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                    type="text"
                    placeholder="Search materials..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-black transition-all"
                />
            </div>

            {filteredMaterials.length > 0 ? (
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-gray-500">Name</th>
                                <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-gray-500">Type</th>
                                <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-gray-500">Added On</th>
                                <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-gray-500">Downloads</th>
                                <th className="px-6 py-4 text-right text-xs font-black uppercase tracking-wider text-gray-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredMaterials.map((material) => (
                                <tr key={material.id} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                                {getIcon(material.type)}
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-black line-clamp-1">{material.title}</div>
                                                <div className="text-[10px] text-gray-400 font-medium">
                                                    {(material.fileSize / 1024 / 1024).toFixed(2)} MB • {material.fileType?.split('/')[1] || 'URL'}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2.5 py-1 bg-gray-100 rounded-lg text-[10px] font-black uppercase text-gray-600">
                                            {material.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                                        {material.createdAt.toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                                        {material.downloadCount || 0}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-end gap-2">
                                            {material.fileUrl && (
                                                <a
                                                    href={material.fileUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-2 hover:bg-black hover:text-white rounded-lg transition-all"
                                                >
                                                    {material.type === 'link' ? <ExternalLink size={16} /> : <Download size={16} />}
                                                </a>
                                            )}
                                            <button
                                                onClick={() => handleDelete(material.id)}
                                                className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-all"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                    <BookOpen className="mx-auto text-gray-400 mb-4" size={48} />
                    <h3 className="text-lg font-bold text-black">No materials found</h3>
                    <p className="text-gray-500">Upload documents or add links in your classrooms</p>
                </div>
            )}
        </div>
    );
};

export default MaterialsList;
