// src/features/teacher/components/dashboard/ClassesSection.jsx
// ✅ PROFESSIONAL CLASSES SECTION - ENHANCED 2025

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BookOpen, Plus, Search, Filter, Users, TrendingUp, Award, Clock,
    Edit, Trash2, Settings, Copy, Share2, ExternalLink, MoreVertical,
    CheckCircle2, AlertCircle, Calendar, Target, BarChart3, Key,
    UserPlus, Mail, X, Eye, Activity, Star, Zap, QrCode
} from 'lucide-react';
import { collection, query, where, getDocs, orderBy, deleteDoc, doc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '@shared/config/firebase';
import { useAuth } from '@auth/contexts/AuthContext';
import toast from 'react-hot-toast';
import QRCode from 'qrcode';

const ClassesSection = () => {
    const { user } = useAuth();
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('all'); // all, active, archived
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showQRModal, setShowQRModal] = useState(false);
    const [selectedClass, setSelectedClass] = useState(null);
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [editingClass, setEditingClass] = useState(null);
    const [classData, setClassData] = useState({
        name: '',
        section: '',
        subject: '',
        description: '',
        schedule: '',
        room: '',
        active: true,
    });
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        totalStudents: 0,
        avgClassSize: 0,
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
                orderBy('createdAt', 'desc')
            );
            const classesSnap = await getDocs(classesQuery);
            const classesData = classesSnap.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date(doc.data().createdAt),
            }));

            setClasses(classesData);
            calculateStats(classesData);
        } catch (error) {
            console.error('Error loading classes:', error);
            toast.error('Failed to load classes');
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (classesData) => {
        const active = classesData.filter(c => c.active).length;
        const totalStudents = classesData.reduce((sum, c) => sum + (c.students?.length || 0), 0);
        const avgClassSize = classesData.length > 0 ? Math.round(totalStudents / classesData.length) : 0;

        setStats({
            total: classesData.length,
            active,
            totalStudents,
            avgClassSize,
        });
    };

    const generateClassCode = () => {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    };

    const handleCreateClass = async (e) => {
        e.preventDefault();

        if (!classData.name || !classData.section || !classData.subject) {
            toast.error('Please fill in all required fields');
            return;
        }

        try {
            const classCode = generateClassCode();
            const newClass = {
                ...classData,
                teacherId: user.uid,
                teacherName: user.displayName || user.email,
                classCode,
                students: [],
                createdAt: new Date(),
            };

            if (editingClass) {
                await updateDoc(doc(db, 'classes', editingClass.id), classData);
                toast.success('Class updated successfully!');
            } else {
                await addDoc(collection(db, 'classes'), newClass);
                toast.success('Class created successfully!');
            }

            setShowCreateModal(false);
            setEditingClass(null);
            setClassData({
                name: '',
                section: '',
                subject: '',
                description: '',
                schedule: '',
                room: '',
                active: true,
            });
            loadData();
        } catch (error) {
            console.error('Error creating class:', error);
            toast.error('Failed to create class');
        }
    };

    const handleEdit = (cls) => {
        setEditingClass(cls);
        setClassData({
            name: cls.name,
            section: cls.section,
            subject: cls.subject,
            description: cls.description || '',
            schedule: cls.schedule || '',
            room: cls.room || '',
            active: cls.active,
        });
        setShowCreateModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this class? This will remove all associated data.')) {
            return;
        }

        try {
            await deleteDoc(doc(db, 'classes', id));
            toast.success('Class deleted successfully');
            loadData();
        } catch (error) {
            console.error('Error deleting class:', error);
            toast.error('Failed to delete class');
        }
    };

    const handleToggleStatus = async (cls) => {
        try {
            await updateDoc(doc(db, 'classes', cls.id), { active: !cls.active });
            toast.success(cls.active ? 'Class archived' : 'Class activated');
            loadData();
        } catch (error) {
            toast.error('Failed to update class status');
        }
    };

    const handleCopyCode = (code) => {
        navigator.clipboard.writeText(code);
        toast.success('Class code copied to clipboard!');
    };

    const handleGenerateQR = async (cls) => {
        try {
            const joinUrl = `${window.location.origin}/join/${cls.classCode}`;
            const qrUrl = await QRCode.toDataURL(joinUrl, {
                width: 400,
                margin: 2,
                color: {
                    dark: '#0f766e',
                    light: '#ffffff',
                },
            });
            setQrCodeUrl(qrUrl);
            setSelectedClass(cls);
            setShowQRModal(true);
        } catch (error) {
            toast.error('Failed to generate QR code');
        }
    };

    const handleDownloadQR = () => {
        const link = document.createElement('a');
        link.download = `${selectedClass.name}_QR.png`;
        link.href = qrCodeUrl;
        link.click();
        toast.success('QR code downloaded!');
    };

    // Filter classes
    const filteredClasses = classes.filter(cls => {
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            if (!cls.name.toLowerCase().includes(query) &&
                !cls.section.toLowerCase().includes(query) &&
                !cls.subject.toLowerCase().includes(query)) {
                return false;
            }
        }

        if (filterStatus === 'active' && !cls.active) return false;
        if (filterStatus === 'archived' && cls.active) return false;

        return true;
    });

    const statsCards = [
        {
            label: 'Total Classes',
            value: stats.total,
            icon: BookOpen,
            gradient: 'from-blue-500 to-cyan-500',
            bgColor: 'bg-blue-50',
        },
        {
            label: 'Active Classes',
            value: stats.active,
            icon: CheckCircle2,
            gradient: 'from-green-500 to-emerald-500',
            bgColor: 'bg-green-50',
        },
        {
            label: 'Total Students',
            value: stats.totalStudents,
            icon: Users,
            gradient: 'from-purple-500 to-pink-500',
            bgColor: 'bg-purple-50',
        },
        {
            label: 'Avg Class Size',
            value: stats.avgClassSize,
            icon: BarChart3,
            gradient: 'from-orange-500 to-red-500',
            bgColor: 'bg-orange-50',
        },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-4"
                    />
                    <p className="text-gray-600">Loading classes...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Classes</h1>
                    <p className="text-gray-600 font-medium mt-1">
                        Manage your classrooms and student enrollment
                    </p>
                </div>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                        setEditingClass(null);
                        setClassData({
                            name: '',
                            section: '',
                            subject: '',
                            description: '',
                            schedule: '',
                            room: '',
                            active: true,
                        });
                        setShowCreateModal(true);
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all"
                >
                    <Plus className="w-5 h-5" />
                    Create Class
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

            {/* Filters */}
            <div className="bg-white rounded-2xl p-4 border border-gray-200">
                <div className="flex flex-col lg:flex-row gap-4">

                    {/* Search */}
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search classes..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                        />
                    </div>

                    {/* Status Filter */}
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all font-medium"
                    >
                        <option value="all">All Classes</option>
                        <option value="active">Active</option>
                        <option value="archived">Archived</option>
                    </select>
                </div>
            </div>

            {/* Classes Grid */}
            {filteredClasses.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredClasses.map((cls, index) => {
                        const studentCount = cls.students?.length || 0;

                        return (
                            <motion.div
                                key={cls.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className={`bg-white border-2 rounded-2xl p-6 transition-all group relative ${cls.active
                                        ? 'border-gray-200 hover:border-teal-300 hover:shadow-lg'
                                        : 'border-gray-300 bg-gray-50 opacity-75'
                                    }`}
                            >
                                {/* Status Badge */}
                                {!cls.active && (
                                    <div className="absolute top-4 right-4">
                                        <span className="px-3 py-1 bg-gray-200 text-gray-600 rounded-full text-xs font-bold">
                                            Archived
                                        </span>
                                    </div>
                                )}

                                {/* Header */}
                                <div className="flex items-start gap-4 mb-4">
                                    <div className={`w-14 h-14 bg-gradient-to-br ${cls.active ? 'from-teal-500 to-cyan-500' : 'from-gray-400 to-gray-500'} rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                                        <BookOpen className="w-7 h-7 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-xl font-bold text-gray-900 truncate group-hover:text-teal-600 transition-colors">
                                            {cls.name}
                                        </h3>
                                        <p className="text-sm text-gray-600">{cls.section}</p>
                                        <p className="text-sm font-semibold text-teal-600 mt-1">{cls.subject}</p>
                                    </div>
                                </div>

                                {/* Description */}
                                {cls.description && (
                                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                                        {cls.description}
                                    </p>
                                )}

                                {/* Info Grid */}
                                <div className="grid grid-cols-2 gap-3 mb-4">
                                    <div className="p-3 bg-blue-50 rounded-xl">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Users className="w-4 h-4 text-blue-600" />
                                            <span className="text-xs font-medium text-blue-600">Students</span>
                                        </div>
                                        <p className="text-xl font-black text-gray-900">{studentCount}</p>
                                    </div>
                                    {cls.schedule && (
                                        <div className="p-3 bg-purple-50 rounded-xl">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Clock className="w-4 h-4 text-purple-600" />
                                                <span className="text-xs font-medium text-purple-600">Schedule</span>
                                            </div>
                                            <p className="text-sm font-bold text-gray-900 truncate">{cls.schedule}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Class Code */}
                                <div className="mb-4 p-3 bg-gradient-to-r from-teal-50 to-cyan-50 border-2 border-teal-200 rounded-xl">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-medium text-teal-600 mb-1">Class Code</p>
                                            <p className="text-2xl font-black text-teal-700 tracking-wider">{cls.classCode}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleCopyCode(cls.classCode)}
                                                className="p-2 bg-white hover:bg-teal-50 text-teal-600 rounded-lg transition-all"
                                                title="Copy Code"
                                            >
                                                <Copy className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleGenerateQR(cls)}
                                                className="p-2 bg-white hover:bg-teal-50 text-teal-600 rounded-lg transition-all"
                                                title="Generate QR"
                                            >
                                                <QrCode className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleEdit(cls)}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-50 hover:bg-teal-100 text-teal-600 rounded-xl font-bold transition-all"
                                    >
                                        <Edit className="w-4 h-4" />
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleToggleStatus(cls)}
                                        className={`px-4 py-2.5 rounded-xl font-bold transition-all ${cls.active
                                                ? 'bg-orange-50 hover:bg-orange-100 text-orange-600'
                                                : 'bg-green-50 hover:bg-green-100 text-green-600'
                                            }`}
                                        title={cls.active ? 'Archive' : 'Activate'}
                                    >
                                        {cls.active ? <Archive className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                                    </button>
                                    <button
                                        onClick={() => handleDelete(cls.id)}
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
                <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-gray-300">
                    <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No classes found</h3>
                    <p className="text-gray-600 mb-6">
                        {searchQuery || filterStatus !== 'all'
                            ? 'Try adjusting your filters'
                            : 'Create your first class to start teaching'}
                    </p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-bold hover:shadow-lg transition-all"
                    >
                        <Plus className="w-5 h-5" />
                        Create Class
                    </button>
                </div>
            )}

            {/* Create/Edit Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowCreateModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl"
                        >
                            <div className="flex items-center justify-between p-6 border-b border-gray-200">
                                <h2 className="text-2xl font-black text-gray-900">
                                    {editingClass ? 'Edit Class' : 'Create New Class'}
                                </h2>
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="p-2 hover:bg-gray-100 rounded-xl transition-all"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <form onSubmit={handleCreateClass} className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-900 mb-2">
                                            Class Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={classData.name}
                                            onChange={(e) => setClassData({ ...classData, name: e.target.value })}
                                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:outline-none transition-all"
                                            placeholder="e.g., Mathematics"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-900 mb-2">
                                            Section *
                                        </label>
                                        <input
                                            type="text"
                                            value={classData.section}
                                            onChange={(e) => setClassData({ ...classData, section: e.target.value })}
                                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:outline-none transition-all"
                                            placeholder="e.g., Grade 10-A"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-900 mb-2">
                                        Subject *
                                    </label>
                                    <input
                                        type="text"
                                        value={classData.subject}
                                        onChange={(e) => setClassData({ ...classData, subject: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:outline-none transition-all"
                                        placeholder="e.g., Algebra & Calculus"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-900 mb-2">
                                        Description
                                    </label>
                                    <textarea
                                        value={classData.description}
                                        onChange={(e) => setClassData({ ...classData, description: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:outline-none transition-all resize-none"
                                        rows="3"
                                        placeholder="Brief description of the class..."
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-900 mb-2">
                                            Schedule
                                        </label>
                                        <input
                                            type="text"
                                            value={classData.schedule}
                                            onChange={(e) => setClassData({ ...classData, schedule: e.target.value })}
                                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:outline-none transition-all"
                                            placeholder="e.g., Mon-Fri 9:00 AM"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-900 mb-2">
                                            Room
                                        </label>
                                        <input
                                            type="text"
                                            value={classData.room}
                                            onChange={(e) => setClassData({ ...classData, room: e.target.value })}
                                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:outline-none transition-all"
                                            placeholder="e.g., Room 301"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 p-4 bg-teal-50 border-2 border-teal-200 rounded-xl">
                                    <input
                                        type="checkbox"
                                        id="active"
                                        checked={classData.active}
                                        onChange={(e) => setClassData({ ...classData, active: e.target.checked })}
                                        className="w-5 h-5 text-teal-500 border-gray-300 rounded focus:ring-teal-500"
                                    />
                                    <label htmlFor="active" className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-teal-600" />
                                            <span className="font-bold text-teal-900">Active Class</span>
                                        </div>
                                        <p className="text-sm text-teal-700 mt-1">Students can join and view this class</p>
                                    </label>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateModal(false)}
                                        className="flex-1 px-6 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-bold hover:shadow-lg transition-all"
                                    >
                                        {editingClass ? 'Update Class' : 'Create Class'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* QR Code Modal */}
            <AnimatePresence>
                {showQRModal && selectedClass && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowQRModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-md"
                        >
                            <div className="flex items-center justify-between p-6 border-b border-gray-200">
                                <h2 className="text-2xl font-black text-gray-900">QR Code</h2>
                                <button
                                    onClick={() => setShowQRModal(false)}
                                    className="p-2 hover:bg-gray-100 rounded-xl transition-all"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="p-6 text-center">
                                <div className="mb-4">
                                    <h3 className="text-xl font-bold text-gray-900 mb-1">{selectedClass.name}</h3>
                                    <p className="text-gray-600">{selectedClass.section}</p>
                                </div>

                                <div className="bg-white p-6 rounded-2xl border-2 border-teal-200 inline-block mb-6">
                                    <img src={qrCodeUrl} alt="QR Code" className="w-64 h-64" />
                                </div>

                                <p className="text-sm text-gray-600 mb-4">
                                    Students can scan this QR code to join your class
                                </p>

                                <div className="flex gap-3">
                                    <button
                                        onClick={handleDownloadQR}
                                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-bold hover:shadow-lg transition-all"
                                    >
                                        <Download className="w-5 h-5" />
                                        Download QR
                                    </button>
                                    <button
                                        onClick={() => handleCopyCode(selectedClass.classCode)}
                                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-all"
                                    >
                                        <Copy className="w-5 h-5" />
                                        Copy Code
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
};

export default ClassesSection;
