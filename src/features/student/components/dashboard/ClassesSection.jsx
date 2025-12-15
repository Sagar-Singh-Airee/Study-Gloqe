// src/components/features/ClassesSection.jsx - UPDATED WITH CLASSROOM NAVIGATION
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Plus, BookOpen, LogOut, ChevronRight } from 'lucide-react';
import { useClasses } from '@classroom/contexts/ClassContext';
import toast from 'react-hot-toast';

// Skeleton Component
const ClassSkeleton = () => (
    <div className="bg-gray-900/50 rounded-2xl p-6 animate-pulse border border-white/5">
        <div className="w-16 h-16 bg-white/10 rounded-xl mb-4" />
        <div className="h-6 bg-white/10 rounded w-3/4 mb-2" />
        <div className="h-4 bg-white/5 rounded w-1/2 mb-4" />
        <div className="flex justify-between mb-4 pb-4 border-b border-white/5">
            <div className="h-8 w-16 bg-white/5 rounded" />
            <div className="h-8 w-16 bg-white/5 rounded" />
        </div>
        <div className="h-10 bg-white/10 rounded w-full" />
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
            toast.success(`Joined ${result.className}! 🎉`);
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
        if (!confirm(`Are you sure you want to leave ${className}?`)) return;

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
        <>
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-4xl font-black text-black mb-2">My Classes</h1>
                    <p className="text-gray-600">Manage your enrolled classes</p>
                </div>
                <button
                    onClick={() => setShowJoinModal(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl font-bold hover:scale-105 transition-all shadow-lg hover:shadow-xl"
                >
                    <Plus size={20} />
                    Join Class
                </button>
            </div>

            {/* Classes Grid */}
            {loading && classes.length === 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => <ClassSkeleton key={i} />)}
                </div>
            ) : classes.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {classes.map((classItem, idx) => (
                        <motion.div
                            key={classItem.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="bg-gradient-to-br from-gray-900 to-black rounded-2xl p-6 text-white hover:scale-[1.02] transition-all cursor-pointer group shadow-xl relative overflow-hidden"
                            onClick={() => handleEnterClassroom(classItem.id)}
                        >
                            {/* Decorative glow */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

                            <div className="w-16 h-16 bg-white/10 rounded-xl flex items-center justify-center mb-4 backdrop-blur-sm group-hover:scale-110 transition-transform">
                                <BookOpen size={32} className="text-white" />
                            </div>

                            <h3 className="text-xl font-bold mb-1 truncate group-hover:text-gray-200 transition-colors">
                                {classItem.name}
                            </h3>
                            <p className="text-sm text-gray-400 mb-4 font-medium">
                                {classItem.subject} • Section {classItem.section}
                            </p>

                            <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
                                <div>
                                    <div className="text-xs text-gray-500 uppercase tracking-wider">Teacher</div>
                                    <div className="text-sm font-semibold truncate max-w-[120px]">{classItem.teacherName}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-gray-500 uppercase tracking-wider">Students</div>
                                    <div className="text-sm font-semibold">{classItem.studentCount}</div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleEnterClassroom(classItem.id);
                                    }}
                                    className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 group-hover:bg-white/20"
                                >
                                    Enter Classroom
                                    <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                                <button
                                    onClick={(e) => handleLeaveClass(e, classItem.id, classItem.name)}
                                    className="p-2.5 bg-white/10 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-all"
                                    title="Leave Class"
                                >
                                    <LogOut size={16} />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                    <Users size={64} className="mx-auto text-gray-300 mb-4" />
                    <h3 className="text-2xl font-bold text-black mb-2">No Classes Yet</h3>
                    <p className="text-gray-600 mb-6">Join a class using a class code from your teacher</p>
                    <button
                        onClick={() => setShowJoinModal(true)}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl font-bold hover:scale-105 transition-all"
                    >
                        <Plus size={20} />
                        Join Your First Class
                    </button>
                </div>
            )}

            {/* Join Class Modal */}
            {showJoinModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl"
                    >
                        <h2 className="text-2xl font-black text-black mb-2">Join Class</h2>
                        <p className="text-gray-600 mb-6">Enter the 6-digit code provided by your teacher</p>

                        <input
                            type="text"
                            placeholder="AB12CD"
                            value={classCode}
                            onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                            maxLength={6}
                            className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl text-center text-3xl font-black tracking-[0.5em] uppercase focus:outline-none focus:border-black transition-all mb-6 placeholder:tracking-normal placeholder:text-lg placeholder:font-normal"
                        />

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowJoinModal(false)}
                                className="flex-1 py-3 border-2 border-gray-200 rounded-xl font-bold hover:bg-gray-50 transition-all text-gray-600"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleJoinClass}
                                disabled={joining || classCode.length !== 6}
                                className="flex-1 py-3 bg-black text-white rounded-xl font-bold hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
                            >
                                {joining ? 'Joining...' : 'Join Class'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </>
    );
};

export default ClassesSection;
