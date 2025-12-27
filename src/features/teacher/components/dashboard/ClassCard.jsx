// src/components/teacher/ClassCard.jsx - MINIMALIST EDITION ✨

import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Users, BookOpen, MoreVertical, Edit, Trash2, Archive,
    Clock, Activity, AlertCircle, Code, Building2, ArrowRight
} from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

const ClassCard = ({ classData, index = 0, onEdit, onDelete, onArchive }) => {
    const navigate = useNavigate();
    const [showMenu, setShowMenu] = useState(false);

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
        room
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

    const handleCardClick = () => {
        navigate(`/teacher/class/${id}`);
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
                if (window.confirm(`Delete "${name}"?`)) {
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.4 }}
            onClick={handleCardClick}
            className="group relative bg-white rounded-2xl border-2 border-gray-200 hover:border-gray-900 transition-all duration-300 cursor-pointer overflow-hidden"
        >
            {/* Menu Button */}
            <div className="absolute top-4 right-4 z-20">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(!showMenu);
                    }}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-all text-gray-600 hover:text-gray-900"
                >
                    <MoreVertical size={18} />
                </button>

                {/* Dropdown Menu */}
                {showMenu && (
                    <>
                        {/* Backdrop */}
                        <div
                            className="fixed inset-0 z-30"
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowMenu(false);
                            }}
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-40"
                        >
                            <button
                                onClick={(e) => handleMenuAction('edit', e)}
                                className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 transition-all text-left text-sm text-gray-700 font-medium"
                            >
                                <Edit size={14} />
                                <span>Edit</span>
                            </button>
                            <button
                                onClick={(e) => handleMenuAction('archive', e)}
                                className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 transition-all text-left text-sm text-gray-700 font-medium"
                            >
                                <Archive size={14} />
                                <span>Archive</span>
                            </button>
                            <div className="h-px bg-gray-200" />
                            <button
                                onClick={(e) => handleMenuAction('delete', e)}
                                className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-red-50 text-red-600 transition-all text-left text-sm font-medium"
                            >
                                <Trash2 size={14} />
                                <span>Delete</span>
                            </button>
                        </motion.div>
                    </>
                )}
            </div>

            {/* Low Engagement Alert */}
            {avgEngagement < 50 && studentCount > 0 && (
                <div className="absolute top-4 left-4 z-10">
                    <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center shadow-lg" title="Low engagement">
                        <AlertCircle size={16} className="text-white" />
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="p-6">
                {/* Header */}
                <div className="flex items-start gap-3 mb-5">
                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center group-hover:bg-gray-900 transition-colors">
                        <BookOpen size={24} className="text-gray-900 group-hover:text-white transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-black text-lg text-gray-900 mb-1 truncate group-hover:text-gray-700 transition-colors">
                            {name}
                        </h3>
                        <p className="text-sm text-gray-500 font-medium">{subject}</p>
                    </div>
                </div>

                {/* Meta Info */}
                <div className="flex flex-wrap items-center gap-2 mb-5 text-xs text-gray-500 font-medium">
                    <span className="px-2.5 py-1 bg-gray-100 rounded-full">
                        Section {section}
                    </span>
                    {grade && (
                        <span className="px-2.5 py-1 bg-gray-100 rounded-full">
                            Grade {grade}
                        </span>
                    )}
                    {room && (
                        <span className="px-2.5 py-1 bg-gray-100 rounded-full">
                            Room {room}
                        </span>
                    )}
                </div>

                {/* Class Code */}
                <button
                    onClick={copyClassCode}
                    className="w-full mb-5 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-all group/code"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Code size={14} className="text-gray-400" />
                            <span className="text-xs text-gray-500 font-medium">Class Code</span>
                        </div>
                        <span className="text-base font-black text-gray-900 tracking-wider group-hover/code:text-gray-700">
                            {classCode}
                        </span>
                    </div>
                </button>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                    <StatBox
                        icon={<Users size={14} />}
                        value={studentCount}
                        label="Students"
                    />
                    <StatBox
                        icon={<Activity size={14} />}
                        value={`${avgScore}%`}
                        label="Avg Score"
                    />
                    <StatBox
                        icon={<Activity size={14} />}
                        value={`${avgEngagement}%`}
                        label="Active"
                        highlight={avgEngagement >= 80}
                    />
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                        <Clock size={12} />
                        <span>{getTimeAgo(updatedAt)}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400 group-hover:text-gray-900 transition-colors">
                        <span>View</span>
                        <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                    </div>
                </div>
            </div>

            {/* Hover Border Effect */}
            <div className="absolute inset-0 border-2 border-transparent group-hover:border-gray-900 rounded-2xl pointer-events-none transition-colors" />
        </motion.div>
    );
};

// ============================================
// STAT BOX COMPONENT
// ============================================

const StatBox = ({ icon, value, label, highlight = false }) => (
    <div className={`p-3 rounded-xl border-2 text-center transition-all ${highlight
        ? 'bg-green-50 border-green-200'
        : 'bg-gray-50 border-gray-200'
        }`}>
        <div className={`flex items-center justify-center mb-1.5 ${highlight ? 'text-green-600' : 'text-gray-400'
            }`}>
            {icon}
        </div>
        <div className={`text-base font-black mb-0.5 ${highlight ? 'text-green-900' : 'text-gray-900'
            }`}>
            {value}
        </div>
        <div className={`text-xs font-medium ${highlight ? 'text-green-600' : 'text-gray-500'
            }`}>
            {label}
        </div>
    </div>
);

export default ClassCard;
