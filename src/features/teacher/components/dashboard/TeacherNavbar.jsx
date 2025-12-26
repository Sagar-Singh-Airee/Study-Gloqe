// src/components/teacher/TeacherNavbar.jsx
// ✨ ULTRA-PROFESSIONAL - ROYAL BLUE THEME - v2.0

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bell, Plus, LogOut, BookOpen, ClipboardList,
    Brain, Video, BarChart3
} from 'lucide-react';
import { useAuth } from '@auth/contexts/AuthContext';
import toast from 'react-hot-toast';

const TeacherNavbar = ({ notifications = [], onProfileClick }) => {
    const { user, userData, logout } = useAuth();
    const navigate = useNavigate();
    const [showNotifications, setShowNotifications] = useState(false);
    const [showQuickActions, setShowQuickActions] = useState(false);

    const handleLogout = async () => {
        try {
            await logout();
            toast.success('Logged out successfully');
            navigate('/auth');
        } catch (error) {
            toast.error('Failed to logout');
        }
    };

    const handleProfileClick = () => {
        if (onProfileClick) {
            onProfileClick();
        } else {
            navigate('/teacher/profile');
        }
    };

    const quickActions = [
        {
            icon: BookOpen,
            label: 'Create Class',
            path: '/teacher/dashboard?tab=classes&action=create',
            gradient: 'from-blue-500 to-blue-600',
            description: 'Start a new classroom'
        },
        {
            icon: ClipboardList,
            label: 'New Assignment',
            path: '/teacher/dashboard?tab=assignments&action=create',
            gradient: 'from-purple-500 to-purple-600',
            description: 'Set new tasks'
        },
        {
            icon: Video,
            label: 'Live Session',
            path: '/teacher/dashboard?tab=live-sessions&action=create',
            gradient: 'from-orange-500 to-red-600',
            description: 'Start a meeting'
        },
        {
            icon: Brain,
            label: 'Create Quiz',
            path: '/teacher/dashboard?tab=quizzes&action=create',
            gradient: 'from-teal-500 to-teal-600',
            description: 'AI-powered quiz maker'
        },
        {
            icon: Video,
            label: 'Live Session',
            path: '/teacher/dashboard?tab=live-sessions&action=start',
            gradient: 'from-indigo-500 to-indigo-600',
            description: 'Start teaching now'
        }
    ];

    return (
        <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-2xl border-b border-blue-100/50 shadow-sm">
            <div className="max-w-[1920px] mx-auto px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">

                    {/* Left - Empty (Reserved for breadcrumbs) */}
                    <div className="flex-1"></div>

                    {/* Right - Actions */}
                    <div className="flex items-center gap-3">

                        {/* Analytics Badge */}
                        <Link
                            to="/teacher/dashboard?tab=analytics"
                            className="hidden md:flex items-center gap-2.5 px-4 py-2.5 bg-gradient-to-r from-blue-50 to-teal-50 hover:from-blue-100 hover:to-teal-100 rounded-xl transition-all duration-200 group border border-blue-200/50"
                        >
                            <BarChart3 size={18} className="text-blue-600 group-hover:text-blue-700 transition-colors" strokeWidth={2} />
                            <span className="text-sm font-semibold text-blue-700 group-hover:text-blue-800">Analytics</span>
                        </Link>

                        {/* Quick Create Button - ROYAL BLUE GRADIENT */}
                        <div className="relative">
                            <button
                                onClick={() => setShowQuickActions(!showQuickActions)}
                                className="flex items-center gap-2.5 px-5 py-2.5 bg-gradient-to-r from-blue-600 via-blue-700 to-teal-600 hover:shadow-xl hover:shadow-blue-500/30 text-white rounded-xl font-semibold hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg shadow-blue-500/20"
                            >
                                <Plus size={20} strokeWidth={2.5} />
                                <span className="hidden sm:inline text-sm">Create</span>
                            </button>

                            <AnimatePresence>
                                {showQuickActions && (
                                    <>
                                        <div
                                            className="fixed inset-0 z-40"
                                            onClick={() => setShowQuickActions(false)}
                                        />

                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                            transition={{ duration: 0.2, ease: "easeOut" }}
                                            className="absolute right-0 mt-3 w-80 bg-white border border-blue-100 rounded-2xl shadow-2xl shadow-blue-500/10 p-2 z-50"
                                        >
                                            <div className="px-4 py-3 border-b border-blue-50 mb-1">
                                                <h3 className="text-sm font-bold text-gray-900">Quick Actions</h3>
                                                <p className="text-xs text-gray-500 mt-0.5">Create something new</p>
                                            </div>

                                            <div className="space-y-1">
                                                {quickActions.map((action, idx) => (
                                                    <Link
                                                        key={idx}
                                                        to={action.path}
                                                        onClick={() => setShowQuickActions(false)}
                                                        className="flex items-center gap-3.5 p-3 rounded-xl hover:bg-blue-50/50 transition-all duration-200 group"
                                                    >
                                                        <div className={`w-11 h-11 bg-gradient-to-br ${action.gradient} rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 group-hover:shadow-lg transition-all duration-300`}>
                                                            <action.icon size={20} className="text-white" strokeWidth={2} />
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="text-sm font-semibold text-gray-900">{action.label}</div>
                                                            <div className="text-xs text-gray-500 mt-0.5">{action.description}</div>
                                                        </div>
                                                    </Link>
                                                ))}
                                            </div>
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Notifications */}
                        <div className="relative">
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                className="relative p-3 rounded-xl hover:bg-blue-50 active:bg-blue-100 transition-all duration-200 group"
                            >
                                <Bell size={20} className="text-gray-600 group-hover:text-blue-600 transition-colors" strokeWidth={2} />
                                {notifications.length > 0 && (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="absolute top-1.5 right-1.5 min-w-[20px] h-5 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center border-2 border-white shadow-md"
                                    >
                                        <span className="text-[10px] font-bold text-white px-1">
                                            {notifications.length > 9 ? '9+' : notifications.length}
                                        </span>
                                    </motion.div>
                                )}
                            </button>

                            <AnimatePresence>
                                {showNotifications && (
                                    <>
                                        <div
                                            className="fixed inset-0 z-40"
                                            onClick={() => setShowNotifications(false)}
                                        />

                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                            transition={{ duration: 0.2, ease: "easeOut" }}
                                            className="absolute right-0 mt-3 w-96 bg-white border border-blue-100 rounded-2xl shadow-2xl shadow-blue-500/10 overflow-hidden z-50"
                                        >
                                            <div className="px-5 py-4 bg-gradient-to-r from-blue-50 to-teal-50 border-b border-blue-100">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <h3 className="text-sm font-bold text-gray-900">Notifications</h3>
                                                        <p className="text-xs text-gray-500 mt-0.5">{notifications.length} unread</p>
                                                    </div>
                                                    {notifications.length > 0 && (
                                                        <button className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                                                            Mark all read
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="max-h-[420px] overflow-y-auto p-2">
                                                {notifications.length > 0 ? (
                                                    notifications.map(notif => (
                                                        <motion.div
                                                            key={notif.id}
                                                            initial={{ opacity: 0, x: -20 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            className={`p-3.5 rounded-xl mb-2 border-l-4 cursor-pointer hover:bg-blue-50/50 transition-all ${notif.type === 'success' ? 'bg-green-50/50 border-green-500' :
                                                                notif.type === 'warning' ? 'bg-yellow-50/50 border-yellow-500' :
                                                                    'bg-blue-50/50 border-blue-500'
                                                                }`}
                                                        >
                                                            <div className="flex items-start gap-3">
                                                                <span className="text-xl">{notif.icon}</span>
                                                                <div className="flex-1">
                                                                    <p className="text-sm font-semibold text-gray-900">{notif.message}</p>
                                                                    <p className="text-xs text-gray-500 mt-1">Just now</p>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    ))
                                                ) : (
                                                    <div className="text-center py-16">
                                                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                            <Bell size={28} className="text-blue-400" />
                                                        </div>
                                                        <p className="text-sm font-semibold text-gray-900 mb-1">All caught up!</p>
                                                        <p className="text-xs text-gray-500">No new notifications</p>
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Divider */}
                        <div className="h-8 w-px bg-blue-100 mx-1" />

                        {/* Profile Avatar */}
                        <button
                            onClick={handleProfileClick}
                            className="flex items-center gap-3 px-2 py-2 rounded-2xl hover:bg-blue-50 transition-all duration-200 group"
                        >
                            <div className="relative">
                                <img
                                    src={userData?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData?.name || 'T')}&background=3b82f6&color=fff&bold=true&size=128`}
                                    alt={userData?.name || 'Teacher'}
                                    className="w-10 h-10 rounded-full ring-2 ring-blue-200 group-hover:ring-blue-300 group-hover:scale-105 transition-all duration-200 object-cover shadow-sm"
                                />
                                {/* Online indicator */}
                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                            </div>
                        </button>

                        {/* Logout Button */}
                        <button
                            onClick={handleLogout}
                            className="p-3 rounded-xl hover:bg-red-50 active:bg-red-100 transition-all duration-200 group"
                            title="Logout"
                        >
                            <LogOut size={20} className="text-gray-600 group-hover:text-red-600 transition-colors" strokeWidth={2} />
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default TeacherNavbar;
