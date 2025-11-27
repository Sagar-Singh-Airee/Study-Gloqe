// src/components/features/DocumentsSection.jsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Upload, Search, Trash2, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DocumentsSection = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [documents, setDocuments] = useState([
        {
            id: 1,
            title: 'Physics Chapter 5 - Thermodynamics',
            subject: 'Physics',
            pages: 24,
            createdAt: new Date('2024-11-20'),
            size: '2.4 MB'
        },
        {
            id: 2,
            title: 'Math - Calculus Notes',
            subject: 'Mathematics',
            pages: 18,
            createdAt: new Date('2024-11-22'),
            size: '1.8 MB'
        },
        {
            id: 3,
            title: 'Chemistry - Organic Reactions',
            subject: 'Chemistry',
            pages: 32,
            createdAt: new Date('2024-11-25'),
            size: '3.1 MB'
        }
    ]);

    const filteredDocs = documents.filter(doc =>
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.subject.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <>
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-4xl font-black text-black mb-2">My Documents</h1>
                    <p className="text-gray-600">Upload and manage your study materials</p>
                </div>
                <button
                    onClick={() => navigate('/upload')}
                    className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl font-bold hover:scale-105 transition-all"
                >
                    <Upload size={20} />
                    Upload PDF
                </button>
            </div>

            {/* Search */}
            <div className="mb-6">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search documents..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-black transition-all"
                    />
                </div>
            </div>

            {/* Documents List */}
            {filteredDocs.length > 0 ? (
                <div className="space-y-3">
                    {filteredDocs.map((doc, idx) => (
                        <motion.div
                            key={doc.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-black hover:shadow-lg transition-all group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-gradient-to-br from-gray-900 to-black rounded-xl flex items-center justify-center flex-shrink-0">
                                    <FileText size={24} className="text-white" />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-sm font-bold text-black truncate">{doc.title}</h3>
                                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600 flex-shrink-0">
                                            {doc.subject}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs text-gray-500">
                                        <span>{doc.pages} pages</span>
                                        <span>•</span>
                                        <span>{doc.createdAt.toLocaleDateString()}</span>
                                        <span>•</span>
                                        <span>{doc.size}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => navigate(`/documents/${doc.id}`)}
                                        className="px-4 py-2 bg-black text-white rounded-lg text-sm font-bold opacity-0 group-hover:opacity-100 transition-all hover:scale-105 flex items-center gap-1"
                                    >
                                        <Eye size={16} />
                                        Open
                                    </button>
                                    <button className="p-2 rounded-lg hover:bg-red-50 text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-16 text-center">
                    <FileText size={64} className="mx-auto text-gray-300 mb-4" />
                    <h3 className="text-xl font-bold text-black mb-2">No documents found</h3>
                    <p className="text-gray-600 mb-6">
                        {searchTerm ? 'Try a different search term' : 'Upload your first PDF to get started'}
                    </p>
                    <button
                        onClick={() => navigate('/upload')}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl font-bold hover:scale-105 transition-all"
                    >
                        <Upload size={18} />
                        Upload PDF
                    </button>
                </div>
            )}
        </>
    );
};

export default DocumentsSection;
