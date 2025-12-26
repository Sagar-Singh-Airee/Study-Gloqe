// src/components/teacher/TeacherNavbar.jsx - ULTRA MINIMAL (NO LOGO)
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bell, Plus, LogOut, BookOpen, ClipboardList,
    Brain, Video, BarChart3
} from 'lucide-react';
import { useAuth } from '@auth/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
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
            path: '/teacher/classes/create',
            gradient: 'from-blue-500 to-indigo-600',
            description: 'Start a new classroom'
        },
        {
            icon: ClipboardList,
            label: 'New Assignment',
            path: '/teacher/assignments/create',
            gradient: 'from-purple-500 to-pink-600',
            description: 'Assign work to students'
        },
        {
            icon: Brain,
            label: 'Create Quiz',
            path: '/teacher/quizzes/create',
            gradient: 'from-green-500 to-emerald-600',
            description: 'AI-powered quiz maker'
        },
        {
            icon: Video,
            label: 'Live Session',
            path: '/teacher/live-session',
            gradient: 'from-red-500 to-orange-600',
            description: 'Start teaching now'
        }
    ];

    return (
        <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-2xl border-b border-gray-100">
            <div className="max-w-[1920px] mx-auto px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">

                    {/* Left - Empty (Reserved for dashboard breadcrumbs if needed) */}
                    <div className="flex-1"></div>

                    {/* Right - Actions */}
                    <div className="flex items-center gap-3">

                        {/* Analytics Badge */}
                        <Link
                            to="/teacher/dashboard?tab=analytics"
                            className="hidden md:flex items-center gap-2.5 px-4 py-2.5 bg-gray-50/80 hover:bg-gray-100 rounded-xl transition-all duration-200 group border border-gray-200/50"
                        >
                            <BarChart3 size={18} className="text-gray-600 group-hover:text-black transition-colors" strokeWidth={2} />
                            <span className="text-sm font-semibold text-gray-700 group-hover:text-black">Analytics</span>
                        </Link>

                        {/* Quick Create Button */}
                        <div className="relative">
                            <button
                                onClick={() => setShowQuickActions(!showQuickActions)}
                                className="flex items-center gap-2.5 px-5 py-2.5 bg-gradient-to-r from-black via-gray-900 to-black hover:shadow-xl hover:shadow-black/20 text-white rounded-xl font-semibold hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg shadow-black/10"
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
                                            className="absolute right-0 mt-3 w-80 bg-white border border-gray-100 rounded-2xl shadow-2xl shadow-black/10 p-2 z-50"
                                        >
                                            <div className="px-4 py-3 border-b border-gray-100 mb-1">
                                                <h3 className="text-sm font-bold text-gray-900">Quick Actions</h3>
                                                <p className="text-xs text-gray-500 mt-0.5">Create something new</p>
                                            </div>

                                            <div className="space-y-1">
                                                {quickActions.map((action, idx) => (
                                                    <Link
                                                        key={idx}
                                                        to={action.path}
                                                        onClick={() => setShowQuickActions(false)}
                                                        className="flex items-center gap-3.5 p-3 rounded-xl hover:bg-gray-50 transition-all duration-200 group"
                                                    >
                                                        <div className={`w-11 h-11 bg-gradient-to-br ${action.gradient} rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 group-hover:shadow-lg transition-all duration-300`}>
                                                            <action.icon size={20} className="text-white" strokeWidth={2} />
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="text-sm font-semibold text-black">{action.label}</div>
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
                                className="relative p-3 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-all duration-200 group"
                            >
                                <Bell size={20} className="text-gray-600 group-hover:text-black transition-colors" strokeWidth={2} />
                                {notifications.length > 0 && (
                                    <div className="absolute top-1.5 right-1.5 min-w-[20px] h-5 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center border-2 border-white shadow-md">
                                        <span className="text-[10px] font-bold text-white px-1">
                                            {notifications.length > 9 ? '9+' : notifications.length}
                                        </span>
                                    </div>
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
                                            className="absolute right-0 mt-3 w-96 bg-white border border-gray-100 rounded-2xl shadow-2xl shadow-black/10 overflow-hidden z-50"
                                        >
                                            <div className="px-5 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <h3 className="text-sm font-bold text-black">Notifications</h3>
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
                                                        <div
                                                            key={notif.id}
                                                            className={`p-3.5 rounded-xl mb-2 border-l-4 cursor-pointer hover:bg-gray-50 transition-all ${notif.type === 'success' ? 'bg-green-50/50 border-green-500' :
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
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="text-center py-16">
                                                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                            <Bell size={28} className="text-gray-400" />
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
                        <div className="h-8 w-px bg-gray-200 mx-1" />

                        {/* Profile Avatar - Bigger & Round */}
                        <button
                            onClick={handleProfileClick}
                            className="flex items-center gap-3 px-2 py-2 rounded-2xl hover:bg-gray-50 transition-all duration-200 group"
                        >
                            <img
                                src={userData?.photoURL || `https://ui-avatars.com/api/?name=${userData?.name || 'T'}&background=000&color=fff&bold=true&size=128`}
                                alt={userData?.name || 'Teacher'}
                                className="w-10 h-10 rounded-full ring-2 ring-gray-200 group-hover:ring-gray-300 group-hover:scale-105 transition-all duration-200 object-cover shadow-sm"
                            />
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
