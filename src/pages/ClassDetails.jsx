// src/pages/ClassDetails.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    Users,
    Trophy,
    Copy,
    Check,
    BookOpen,
    TrendingUp
} from 'lucide-react';
import { getClassDetails } from '@/services/classService';
import { useAuth } from '@contexts/AuthContext';
import toast from 'react-hot-toast';

const ClassDetails = () => {
    const { classId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [classData, setClassData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [copiedCode, setCopiedCode] = useState(false);

    useEffect(() => {
        loadClassDetails();
    }, [classId]);

    const loadClassDetails = async () => {
        try {
            setLoading(true);
            const data = await getClassDetails(classId);
            setClassData(data);
        } catch (error) {
            console.error('Error loading class:', error);
            toast.error('Failed to load class details');
        } finally {
            setLoading(false);
        }
    };

    const copyClassCode = () => {
        navigator.clipboard.writeText(classData.classCode);
        setCopiedCode(true);
        toast.success('Class code copied!');
        setTimeout(() => setCopiedCode(false), 2000);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!classData) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-black mb-2">Class not found</h2>
                    <button
                        onClick={() => navigate('/classes')}
                        className="text-black underline"
                    >
                        Go back to classes
                    </button>
                </div>
            </div>
        );
    }

    // Sort students by XP
    const sortedStudents = [...(classData.students || [])].sort((a, b) => b.xp - a.xp);

    return (
        <div className="min-h-screen bg-white p-8">
            <div className="max-w-7xl mx-auto">
                
                {/* Header */}
                <button
                    onClick={() => navigate('/classes')}
                    className="flex items-center gap-2 text-gray-600 hover:text-black mb-6 transition-colors"
                >
                    <ArrowLeft size={20} />
                    Back to Classes
                </button>

                {/* Class Info Card */}
                <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl p-8 text-white mb-8">
                    <div className="flex items-start justify-between mb-6">
                        <div>
                            <h1 className="text-4xl font-black mb-2">{classData.name}</h1>
                            <p className="text-gray-400">{classData.subject} • Section {classData.section}</p>
                        </div>
                        <div className="text-right">
                            <div className="text-sm text-gray-400 mb-1">Class Code</div>
                            <button
                                onClick={copyClassCode}
                                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all"
                            >
                                <span className="text-2xl font-black tracking-widest">{classData.classCode}</span>
                                {copiedCode ? <Check size={18} /> : <Copy size={18} />}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white/10 rounded-xl p-4">
                            <Users size={24} className="mb-2" />
                            <div className="text-3xl font-black mb-1">{classData.studentCount}</div>
                            <div className="text-sm text-gray-400">Students</div>
                        </div>
                        <div className="bg-white/10 rounded-xl p-4">
                            <BookOpen size={24} className="mb-2" />
                            <div className="text-3xl font-black mb-1">{classData.grade || 'N/A'}</div>
                            <div className="text-sm text-gray-400">Grade</div>
                        </div>
                        <div className="bg-white/10 rounded-xl p-4">
                            <Trophy size={24} className="mb-2" />
                            <div className="text-sm text-gray-400">Teacher</div>
                            <div className="text-lg font-bold">{classData.teacherName}</div>
                        </div>
                    </div>
                </div>

                {/* Class Leaderboard */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                    <h2 className="text-2xl font-black text-black mb-6">Class Leaderboard</h2>

                    {sortedStudents.length > 0 ? (
                        <div className="space-y-3">
                            {sortedStudents.map((student, idx) => (
                                <motion.div
                                    key={student.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
                                        student.id === user.uid
                                            ? 'bg-black text-white'
                                            : 'bg-gray-50 hover:bg-gray-100'
                                    }`}
                                >
                                    {/* Rank */}
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl ${
                                        idx === 0 ? 'bg-yellow-400 text-black' :
                                        idx === 1 ? 'bg-gray-300 text-black' :
                                        idx === 2 ? 'bg-orange-400 text-black' :
                                        student.id === user.uid ? 'bg-white/20' : 'bg-white'
                                    }`}>
                                        {idx + 1}
                                    </div>

                                    {/* Student Info */}
                                    <div className="flex-1">
                                        <div className="font-bold">{student.name}</div>
                                        <div className={`text-sm ${student.id === user.uid ? 'text-gray-300' : 'text-gray-500'}`}>
                                            Level {student.level}
                                        </div>
                                    </div>

                                    {/* XP */}
                                    <div className="text-right">
                                        <div className="text-2xl font-black">{student.xp}</div>
                                        <div className={`text-xs ${student.id === user.uid ? 'text-gray-300' : 'text-gray-500'}`}>XP</div>
                                    </div>

                                    {/* Trophy for top 3 */}
                                    {idx < 3 && (
                                        <Trophy size={24} className={
                                            idx === 0 ? 'text-yellow-400' :
                                            idx === 1 ? 'text-gray-400' :
                                            'text-orange-400'
                                        } />
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <Users size={48} className="mx-auto text-gray-300 mb-4" />
                            <p className="text-gray-600">No students in this class yet</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ClassDetails;
