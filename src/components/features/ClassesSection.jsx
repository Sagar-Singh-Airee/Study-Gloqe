// src/components/features/ClassesSection.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Users,
    Plus,
    BookOpen,
    LogOut as LeaveIcon
} from 'lucide-react';
import { useAuth } from '@contexts/AuthContext';
import { getUserClasses, joinClassByCode, leaveClass } from '@/services/classService';
import toast from 'react-hot-toast';

const ClassesSection = () => {
    const { user, userData } = useAuth();
    const navigate = useNavigate();
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [classCode, setClassCode] = useState('');
    const [joining, setJoining] = useState(false);

    useEffect(() => {
        loadClasses();
    }, [user?.uid]);

    const loadClasses = async () => {
        try {
            setLoading(true);
            const userClasses = await getUserClasses(user.uid, 'student');
            setClasses(userClasses);
        } catch (error) {
            console.error('Error loading classes:', error);
            toast.error('Failed to load classes');
        } finally {
            setLoading(false);
        }
    };

    const handleJoinClass = async () => {
        if (!classCode.trim()) {
            toast.error('Please enter a class code');
            return;
        }

        try {
            setJoining(true);
            const result = await joinClassByCode(user.uid, classCode);
            toast.success(`Joined ${result.className}! 🎉`);
            setShowJoinModal(false);
            setClassCode('');
            loadClasses();
        } catch (error) {
            toast.error(error.message || 'Failed to join class');
        } finally {
            setJoining(false);
        }
    };

    const handleLeaveClass = async (classId, className) => {
        if (!confirm(`Are you sure you want to leave ${className}?`)) return;

        try {
            await leaveClass(user.uid, classId);
            toast.success('Left class successfully');
            loadClasses();
        } catch (error) {
            toast.error('Failed to leave class');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Loading classes...</p>
                </div>
            </div>
        );
    }

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
                    className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl font-bold hover:scale-105 transition-all"
                >
                    <Plus size={20} />
                    Join Class
                </button>
            </div>

            {/* Classes Grid */}
            {classes.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {classes.map((classItem, idx) => (
                        <motion.div
                            key={classItem.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="bg-gradient-to-br from-gray-900 to-black rounded-2xl p-6 text-white hover:scale-[1.02] transition-all cursor-pointer group"
                            onClick={() => navigate(`/classes/${classItem.id}`)}
                        >
                            {/* Class Icon */}
                            <div className="w-16 h-16 bg-white/10 rounded-xl flex items-center justify-center mb-4">
                                <BookOpen size={32} />
                            </div>

                            {/* Class Info */}
                            <h3 className="text-xl font-bold mb-1">{classItem.name}</h3>
                            <p className="text-sm text-gray-400 mb-4">
                                {classItem.subject} • Section {classItem.section}
                            </p>

                            {/* Stats */}
                            <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
                                <div>
                                    <div className="text-xs text-gray-500">Teacher</div>
                                    <div className="text-sm font-semibold">{classItem.teacherName}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-gray-500">Students</div>
                                    <div className="text-sm font-semibold">{classItem.studentCount}</div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/classes/${classItem.id}`);
                                    }}
                                    className="flex-1 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-semibold transition-all"
                                >
                                    View Details
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleLeaveClass(classItem.id, classItem.name);
                                    }}
                                    className="p-2 bg-white/10 hover:bg-red-500/20 rounded-lg transition-all"
                                >
                                    <LeaveIcon size={16} />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20">
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
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-2xl p-8 max-w-md w-full"
                    >
                        <h2 className="text-2xl font-black text-black mb-4">Join Class</h2>
                        <p className="text-gray-600 mb-6">Enter the class code provided by your teacher</p>

                        <input
                            type="text"
                            placeholder="Enter 6-digit code"
                            value={classCode}
                            onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                            maxLength={6}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-center text-2xl font-bold tracking-widest uppercase focus:outline-none focus:border-black transition-all mb-6"
                        />

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowJoinModal(false);
                                    setClassCode('');
                                }}
                                className="flex-1 py-3 border-2 border-gray-200 rounded-xl font-bold hover:bg-gray-50 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleJoinClass}
                                disabled={joining || classCode.length !== 6}
                                className="flex-1 py-3 bg-black text-white rounded-xl font-bold hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
