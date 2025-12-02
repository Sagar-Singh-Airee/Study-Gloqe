// src/components/teacher/ClassCard.jsx - UPDATED WITH CLASSROOM NAVIGATION
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Users, BookOpen, MoreVertical, Edit, Trash2, Archive, 
    Clock, Activity, AlertCircle, Award, Target, Code, Building2
} from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

const ClassCard = ({ classData, index = 0, onEdit, onDelete, onArchive }) => {
    const navigate = useNavigate();
    const [showMenu, setShowMenu] = useState(false);
    const [showCode, setShowCode] = useState(false);

    const {
        id,
        name,
        subject,
        section = 'A',
        studentCount = 0,
        avgEngagement = 0,
        avgScore = 0,
        updatedAt,
        classCode,
        schoolName,
        grade,
        room,
        description
    } = classData;

    const getTimeAgo = (date) => {
        if (!date) return 'Just now';
        const d = date instanceof Date ? date : new Date(date);
        const seconds = Math.floor((new Date() - d) / 1000);
        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    };

    const getEngagementColor = (engagement) => {
        if (engagement >= 80) return 'text-green-400';
        if (engagement >= 60) return 'text-yellow-400';
        return 'text-red-400';
    };

    const handleCardClick = () => {
        navigate(`/classroom/${id}`);
    };

    const handleMenuAction = (action, e) => {
        e.stopPropagation();
        setShowMenu(false);

        switch (action) {
            case 'edit':
                onEdit?.(id);
                break;
            case 'archive':
                onArchive?.(id);
                toast.success('Class archived');
                break;
            case 'delete':
                if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
                    onDelete?.(id);
                    toast.success('Class deleted');
                }
                break;
            default:
                break;
        }
    };

    const copyClassCode = (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(classCode);
        toast.success('Class code copied!');
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            onClick={handleCardClick}
            className="group relative bg-gradient-to-br from-gray-900 to-black rounded-2xl p-6 text-white hover:scale-[1.02] transition-all duration-300 cursor-pointer overflow-hidden"
        >
            {/* Background Effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl" />
            
            {/* Alert Badge for Low Engagement */}
            {avgEngagement < 50 && studentCount > 0 && (
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-4 left-4 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center z-10"
                    title="Low engagement"
                >
                    <AlertCircle size={16} className="text-white" />
                </motion.div>
            )}

            {/* Menu Button */}
            <div className="absolute top-4 right-4 z-20">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(!showMenu);
                    }}
                    className="p-2 rounded-lg hover:bg-white/10 transition-all"
                >
                    <MoreVertical size={18} />
                </button>

                {/* Dropdown Menu */}
                {showMenu && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute right-0 mt-2 w-40 bg-white text-black rounded-xl shadow-2xl overflow-hidden"
                    >
                        <button
                            onClick={(e) => handleMenuAction('edit', e)}
                            className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 transition-all text-left text-sm"
                        >
                            <Edit size={14} />
                            <span>Edit</span>
                        </button>
                        <button
                            onClick={(e) => handleMenuAction('archive', e)}
                            className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 transition-all text-left text-sm"
                        >
                            <Archive size={14} />
                            <span>Archive</span>
                        </button>
                        <button
                            onClick={(e) => handleMenuAction('delete', e)}
                            className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-red-50 text-red-600 transition-all text-left text-sm"
                        >
                            <Trash2 size={14} />
                            <span>Delete</span>
                        </button>
                    </motion.div>
                )}
            </div>

            {/* Content */}
            <div className="relative">
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-xl group-hover:scale-110 transition-transform">
                        <BookOpen size={28} />
                    </div>
                    <div className="flex-1">
                        <span className="text-xs px-2.5 py-1 bg-white/20 rounded-full font-bold backdrop-blur-xl">
                            Section {section}
                        </span>
                    </div>
                </div>

                {/* Class Name & Info */}
                <div className="mb-4">
                    <h3 className="font-bold text-xl mb-1 line-clamp-1 group-hover:text-gray-200 transition-colors">
                        {name}
                    </h3>
                    <p className="text-sm text-gray-300 mb-1">{subject}</p>
                    
                    {/* School & Grade */}
                    <div className="flex items-center gap-3 text-xs text-gray-400 mt-2">
                        {schoolName && (
                            <span className="flex items-center gap-1">
                                <Building2 size={12} />
                                {schoolName}
                            </span>
                        )}
                        {grade && (
                            <>
                                <span>•</span>
                                <span>Grade {grade}</span>
                            </>
                        )}
                        {room && (
                            <>
                                <span>•</span>
                                <span>Room {room}</span>
                            </>
                        )}
                    </div>
                </div>

                {/* Class Code Display */}
                <div className="mb-4 p-3 bg-white/5 rounded-lg backdrop-blur-xl border border-white/10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Code size={14} className="text-gray-400" />
                            <span className="text-xs text-gray-400">Class Code</span>
                        </div>
                        <button
                            onClick={copyClassCode}
                            className="text-lg font-black tracking-wider hover:text-gray-200 transition-colors"
                        >
                            {classCode}
                        </button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="bg-white/5 rounded-lg p-3 backdrop-blur-xl text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                            <Users size={12} className="text-blue-400" />
                        </div>
                        <div className="text-lg font-black">{studentCount}</div>
                        <div className="text-xs text-gray-400">Students</div>
                    </div>

                    <div className="bg-white/5 rounded-lg p-3 backdrop-blur-xl text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                            <Target size={12} className="text-purple-400" />
                        </div>
                        <div className="text-lg font-black">{avgScore}%</div>
                        <div className="text-xs text-gray-400">Avg Score</div>
                    </div>

                    <div className="bg-white/5 rounded-lg p-3 backdrop-blur-xl text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                            <Activity size={12} className={getEngagementColor(avgEngagement)} />
                        </div>
                        <div className="text-lg font-black">{avgEngagement}%</div>
                        <div className="text-xs text-gray-400">Active</div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-white/10">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Clock size={12} />
                        <span>{getTimeAgo(updatedAt)}</span>
                    </div>
                    
                    {avgEngagement >= 80 && studentCount > 0 && (
                        <div className="flex items-center gap-1 text-xs text-green-400 font-bold">
                            <Award size={12} />
                            <span>High Engagement</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center rounded-2xl">
                <motion.button
                    initial={{ scale: 0.8, opacity: 0 }}
                    whileHover={{ scale: 1.05 }}
                    className="bg-white text-black px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-xl"
                >
                    <BookOpen size={18} />
                    <span>Enter Classroom</span>
                </motion.button>
            </div>
        </motion.div>
    );
};

export default ClassCard;
