// src/components/features/ClassesSection.jsx - PREMIUM LIGHT COMPACT EDITION 💎

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Plus, BookOpen, LogOut, ChevronRight } from 'lucide-react';
import { useClasses } from '@classroom/contexts/ClassContext';
import toast from 'react-hot-toast';

// Skeleton Component
const ClassSkeleton = () => (
    <div className="bg-white border border-slate-200 rounded-xl p-4 animate-pulse">
        <div className="w-10 h-10 bg-slate-100 rounded-lg mb-3" />
        <div className="h-5 bg-slate-100 rounded w-3/4 mb-2" />
        <div className="h-3 bg-slate-50 rounded w-1/2 mb-3" />
        <div className="flex justify-between mb-3 pb-3 border-b border-slate-100">
            <div className="h-6 w-16 bg-slate-50 rounded" />
            <div className="h-6 w-16 bg-slate-50 rounded" />
        </div>
        <div className="h-8 bg-slate-100 rounded w-full" />
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
            toast.success(`Joined ${result.className}!`);
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
        if (!confirm(`Leave ${className}?`)) return;

        try {
            await leaveClass(classId);
            toast.success('Left class successfully');
        } catch (error) {
            toast.error('Failed to leave class');
        }
    };

    const handleEnterClassroom = (classId) => {
        navigate(`/classroom/${classId}`);
    };

    return (
        <div className="min-h-screen bg-white">
            {/* Subtle background */}
            <div className="fixed inset-0 -z-10 bg-gradient-to-br from-white via-teal-50/20 to-blue-50/20" />

            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 mb-0.5">My Classes</h1>
                        <p className="text-xs text-slate-600">{classes.length} class{classes.length !== 1 ? 'es' : ''} enrolled</p>
                    </div>
                    <button
                        onClick={() => setShowJoinModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-blue-600 text-white rounded-lg text-xs font-bold hover:shadow-sm transition-all"
                    >
                        <Plus size={14} />
                        Join Class
                    </button>
                </div>

                {/* Classes Grid */}
                {loading && classes.length === 0 ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3].map((i) => <ClassSkeleton key={i} />)}
                    </div>
                ) : classes.length > 0 ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {classes.map((classItem, idx) => (
                            <motion.div
                                key={classItem.id}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.04 }}
                                whileHover={{ y: -2 }}
                                className="bg-white border border-slate-200 rounded-xl p-4 hover:border-teal-300 hover:shadow-md transition-all cursor-pointer group"
                                onClick={() => handleEnterClassroom(classItem.id)}
                            >
                                <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-blue-600 rounded-lg flex items-center justify-center mb-3 shadow-sm group-hover:scale-105 transition-transform">
                                    <BookOpen size={18} className="text-white" strokeWidth={2.5} />
                                </div>

                                <h3 className="text-sm font-bold mb-1 truncate text-slate-900 leading-tight">
                                    {classItem.name}
                                </h3>
                                <p className="text-[10px] text-slate-600 mb-3 font-medium">
                                    {classItem.subject} • Section {classItem.section}
                                </p>

                                <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
                                    <div>
                                        <div className="text-[9px] text-slate-500 uppercase tracking-wider font-bold mb-0.5">Teacher</div>
                                        <div className="text-xs font-bold truncate max-w-[120px] text-slate-900">{classItem.teacherName}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[9px] text-slate-500 uppercase tracking-wider font-bold mb-0.5">Students</div>
                                        <div className="text-xs font-bold text-slate-900">{classItem.studentCount}</div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleEnterClassroom(classItem.id);
                                        }}
                                        className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 text-slate-700 group-hover:border-teal-300"
                                    >
                                        Enter Classroom
                                        <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                                    </button>
                                    <button
                                        onClick={(e) => handleLeaveClass(e, classItem.id, classItem.name)}
                                        className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-all border border-rose-200"
                                        title="Leave Class"
                                    >
                                        <LogOut size={14} />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200">
                            <Users size={32} className="text-slate-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-1">No Classes Yet</h3>
                        <p className="text-xs text-slate-600 mb-5 leading-relaxed">Join a class using a class code from your teacher</p>
                        <button
                            onClick={() => setShowJoinModal(true)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-500 to-blue-600 text-white rounded-lg text-xs font-bold hover:shadow-sm transition-all"
                        >
                            <Plus size={14} />
                            Join Your First Class
                        </button>
                    </div>
                )}
            </div>

            {/* Join Class Modal */}
            {showJoinModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-slate-200"
                    >
                        <h2 className="text-lg font-bold text-slate-900 mb-1">Join Class</h2>
                        <p className="text-xs text-slate-600 mb-5 leading-relaxed">Enter the 6-digit code provided by your teacher</p>

                        <input
                            type="text"
                            placeholder="AB12CD"
                            value={classCode}
                            onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                            maxLength={6}
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-center text-2xl font-bold tracking-[0.4em] uppercase focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all mb-5 placeholder:tracking-normal placeholder:text-sm placeholder:font-normal text-slate-900"
                        />

                        <div className="flex gap-2.5">
                            <button
                                onClick={() => setShowJoinModal(false)}
                                className="flex-1 py-2.5 border border-slate-200 rounded-lg text-xs font-bold hover:bg-slate-50 transition-all text-slate-700"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleJoinClass}
                                disabled={joining || classCode.length !== 6}
                                className="flex-1 py-2.5 bg-gradient-to-r from-teal-500 to-blue-600 text-white rounded-lg text-xs font-bold hover:shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {joining ? 'Joining...' : 'Join Class'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default ClassesSection;
