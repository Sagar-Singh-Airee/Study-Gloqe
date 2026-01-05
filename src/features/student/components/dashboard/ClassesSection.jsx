// src/components/features/ClassesSection.jsx - ULTIMATE PREMIUM EDITION 🎨

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Users, Plus, BookOpen, LogOut, ChevronRight,
    Clock, TrendingUp, Award, MessageSquare
} from 'lucide-react';
import { useClasses } from '@classroom/contexts/ClassContext';
import toast from 'react-hot-toast';

// Color palettes for classes (auto-assigned based on index)
const CLASS_THEMES = [
    { gradient: 'from-blue-500 to-cyan-500', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
    { gradient: 'from-purple-500 to-pink-500', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' },
    { gradient: 'from-green-500 to-teal-500', bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700' },
    { gradient: 'from-orange-500 to-red-500', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700' },
    { gradient: 'from-indigo-500 to-blue-500', bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700' },
    { gradient: 'from-teal-500 to-green-500', bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-700' },
];

// Avatar Component
const TeacherAvatar = ({ name, photoURL, theme }) => {
    const getInitials = (name) => {
        if (!name) return '?';
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    if (photoURL) {
        return (
            <img
                src={photoURL}
                alt={name}
                className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-lg"
            />
        );
    }

    return (
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg bg-gradient-to-br ${theme.gradient}`}>
            {getInitials(name)}
        </div>
    );
};

// Skeleton Component
const ClassSkeleton = () => (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 animate-pulse">
        <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gray-100 rounded-full" />
            <div className="flex-1">
                <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-50 rounded w-1/2" />
            </div>
        </div>
        <div className="h-24 bg-gray-50 rounded-xl mb-4" />
        <div className="flex gap-2">
            <div className="flex-1 h-10 bg-gray-100 rounded-lg" />
            <div className="w-10 h-10 bg-gray-100 rounded-lg" />
        </div>
    </div>
);

const ClassesSection = () => {
    const navigate = useNavigate();
    const { classes, loading, joinClass, leaveClass } = useClasses();

    const [showJoinModal, setShowJoinModal] = useState(false);
    const [classCode, setClassCode] = useState('');
    const [joining, setJoining] = useState(false);

    const handleJoinClass = async () => {
        if (!classCode.trim()) return toast.error('Please enter a class code');

        try {
            setJoining(true);
            const result = await joinClass(classCode);
            toast.success(`🎉 Joined ${result.className}!`);
            setShowJoinModal(false);
            setClassCode('');
        } catch (error) {
            toast.error(error.message || 'Failed to join class');
        } finally {
            setJoining(false);
        }
    };

    const handleLeaveClass = async (e, classId, className) => {
        e.stopPropagation();
        if (!confirm(`Leave ${className}? You'll lose access to all materials and assignments.`)) return;

        try {
            await leaveClass(classId);
            toast.success('👋 Left class successfully');
        } catch (error) {
            toast.error('Failed to leave class');
        }
    };

    const handleEnterClassroom = (classId) => {
        navigate(`/classes/${classId}`); // ✅ FIXED - Now goes to StudentClassroom
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-10 gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 mb-2">My Classes 📚</h1>
                        <p className="text-sm text-gray-600">
                            {classes.length === 0
                                ? 'No classes yet. Join your first class below!'
                                : `You're enrolled in ${classes.length} class${classes.length !== 1 ? 'es' : ''}`}
                        </p>
                    </div>
                    <button
                        onClick={() => setShowJoinModal(true)}
                        className="group flex items-center gap-2.5 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl text-sm font-bold hover:shadow-lg hover:scale-105 transition-all"
                    >
                        <Plus size={18} className="group-hover:rotate-90 transition-transform" />
                        Join Class
                    </button>
                </div>

                {/* Classes Grid */}
                {loading && classes.length === 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map((i) => <ClassSkeleton key={i} />)}
                    </div>
                ) : classes.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {classes.map((classItem, idx) => {
                            const theme = CLASS_THEMES[idx % CLASS_THEMES.length];

                            return (
                                <motion.div
                                    key={classItem.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    whileHover={{ y: -4, scale: 1.02 }}
                                    className="group bg-white border-2 border-gray-200 rounded-2xl p-6 hover:border-blue-300 hover:shadow-2xl transition-all cursor-pointer overflow-hidden relative"
                                    onClick={() => handleEnterClassroom(classItem.id)}
                                >
                                    {/* Decorative gradient background */}
                                    <div className={`absolute top-0 left-0 right-0 h-32 bg-gradient-to-br ${theme.gradient} opacity-5 group-hover:opacity-10 transition-opacity`} />

                                    {/* Header with Teacher Avatar */}
                                    <div className="relative flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <TeacherAvatar
                                                name={classItem.teacherName}
                                                photoURL={classItem.teacherPhotoURL}
                                                theme={theme}
                                            />
                                            <div className="flex-1">
                                                <h3 className="text-base font-black text-gray-900 leading-tight mb-0.5 group-hover:text-blue-600 transition-colors">
                                                    {classItem.name}
                                                </h3>
                                                <p className="text-xs text-gray-600 font-semibold">
                                                    {classItem.teacherName}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Subject Badge */}
                                        <div className={`px-2.5 py-1 ${theme.bg} ${theme.border} border rounded-lg text-[10px] font-bold ${theme.text} uppercase tracking-wide`}>
                                            {classItem.subject}
                                        </div>
                                    </div>

                                    {/* Section Badge */}
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg mb-4">
                                        <BookOpen size={12} className="text-gray-600" />
                                        <span className="text-xs font-bold text-gray-700">Section {classItem.section}</span>
                                    </div>

                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-3 gap-2 mb-5">
                                        <div className="text-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                                            <Users size={14} className="text-gray-600 mx-auto mb-1" />
                                            <div className="text-lg font-black text-gray-900">{classItem.studentCount || 0}</div>
                                            <div className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">Students</div>
                                        </div>

                                        <div className="text-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                                            <Award size={14} className="text-gray-600 mx-auto mb-1" />
                                            <div className="text-lg font-black text-gray-900">{classItem.assignmentCount || 0}</div>
                                            <div className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">Tasks</div>
                                        </div>

                                        <div className="text-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                                            <MessageSquare size={14} className="text-gray-600 mx-auto mb-1" />
                                            <div className="text-lg font-black text-gray-900">{classItem.announcementCount || 0}</div>
                                            <div className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">Posts</div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleEnterClassroom(classItem.id);
                                            }}
                                            className={`flex-1 py-3 bg-gradient-to-r ${theme.gradient} text-white rounded-xl text-sm font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2 group/btn`}
                                        >
                                            <span>Enter Classroom</span>
                                            <ChevronRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                                        </button>
                                        <button
                                            onClick={(e) => handleLeaveClass(e, classItem.id, classItem.name)}
                                            className="p-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-all border border-red-200 hover:border-red-300 hover:scale-105"
                                            title="Leave Class"
                                        >
                                            <LogOut size={16} />
                                        </button>
                                    </div>

                                    {/* Active Indicator */}
                                    {classItem.isActive && (
                                        <div className="absolute top-3 right-3">
                                            <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 border border-green-200 rounded-full">
                                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                                <span className="text-[9px] font-bold text-green-700 uppercase tracking-wide">Active</span>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-300"
                    >
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-full flex items-center justify-center mx-auto mb-5 border-4 border-white shadow-lg">
                            <Users size={40} className="text-blue-600" />
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 mb-2">No Classes Yet</h3>
                        <p className="text-sm text-gray-600 mb-8 max-w-md mx-auto leading-relaxed">
                            Join your first class using a class code from your teacher to get started with assignments, materials, and more!
                        </p>
                        <button
                            onClick={() => setShowJoinModal(true)}
                            className="group inline-flex items-center gap-2.5 px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl text-base font-bold hover:shadow-xl hover:scale-105 transition-all"
                        >
                            <Plus size={20} className="group-hover:rotate-90 transition-transform" />
                            Join Your First Class
                        </button>
                    </motion.div>
                )}
            </div>

            {/* Join Class Modal - Enhanced */}
            {showJoinModal && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4"
                    onClick={() => setShowJoinModal(false)}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border-2 border-gray-200 relative overflow-hidden"
                    >
                        {/* Decorative background */}
                        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-blue-500 to-cyan-500 opacity-5" />

                        <div className="relative">
                            {/* Icon */}
                            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg">
                                <Plus size={32} className="text-white" strokeWidth={3} />
                            </div>

                            <h2 className="text-2xl font-black text-gray-900 mb-2 text-center">Join a Class</h2>
                            <p className="text-sm text-gray-600 mb-6 text-center leading-relaxed">
                                Enter the 6-character code provided by your teacher
                            </p>

                            <input
                                type="text"
                                placeholder="AB12CD"
                                value={classCode}
                                onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                                maxLength={6}
                                autoFocus
                                className="w-full px-6 py-4 border-2 border-gray-200 rounded-2xl text-center text-3xl font-black tracking-[0.3em] uppercase focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all mb-6 placeholder:tracking-normal placeholder:text-base placeholder:font-normal text-gray-900"
                            />

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowJoinModal(false)}
                                    className="flex-1 py-3.5 border-2 border-gray-200 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all text-gray-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleJoinClass}
                                    disabled={joining || classCode.length !== 6}
                                    className="flex-1 py-3.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl text-sm font-bold hover:shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                                >
                                    {joining ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            Joining...
                                        </span>
                                    ) : (
                                        'Join Class'
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default ClassesSection;
