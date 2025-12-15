// src/components/teacher/TeacherNavbar.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Bell, Search, Plus, ChevronDown, LogOut, Settings, 
    User, BookOpen, ClipboardList, Brain, Video 
} from 'lucide-react';
import { useAuth } from '@auth/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const TeacherNavbar = ({ notifications = [], searchQuery, setSearchQuery }) => {
    const { user, userData, logout } = useAuth();
    const navigate = useNavigate();
    const [showNotifications, setShowNotifications] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
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

    const quickActions = [
        { icon: BookOpen, label: 'Create Class', path: '/teacher/classes/create', color: 'from-blue-500 to-blue-600' },
        { icon: ClipboardList, label: 'New Assignment', path: '/teacher/assignments/create', color: 'from-purple-500 to-purple-600' },
        { icon: Brain, label: 'New Quiz', path: '/teacher/quizzes/create', color: 'from-green-500 to-green-600' },
        { icon: Video, label: 'Live Session', path: '/teacher/live-session', color: 'from-red-500 to-red-600' }
    ];

    return (
        <nav className="sticky top-0 z-50 bg-white/70 backdrop-blur-2xl border-b border-gray-200/50 shadow-sm">
            <div className="px-6 py-3">
                <div className="flex items-center justify-between">
                    
                    {/* Left - Greeting */}
                    <div className="hidden lg:block">
                        <h1 className="text-xl font-black text-black tracking-tight">
                            Welcome back, {userData?.name?.split(' ')[0] || 'Teacher'}! 👋
                        </h1>
                        <p className="text-xs text-gray-600 font-medium">
                            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </p>
                    </div>

                    {/* Right - Actions */}
                    <div className="flex items-center gap-3 ml-auto">
                        
                        {/* Search Bar */}
                        <div className="relative group hidden md:block">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-gray-600 transition-colors" size={16} />
                            <input
                                type="text"
                                placeholder="Search classes, students..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-64 pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-black focus:ring-2 focus:ring-black/5 transition-all"
                            />
                        </div>

                        {/* Quick Create Button */}
                        <div className="relative">
                            <button
                                onClick={() => setShowQuickActions(!showQuickActions)}
                                className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl text-sm font-bold hover:scale-105 transition-transform"
                            >
                                <Plus size={16} />
                                <span className="hidden sm:inline">Create</span>
                                <ChevronDown size={14} />
                            </button>

                            <AnimatePresence>
                                {showQuickActions && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-2xl shadow-2xl p-2 z-50"
                                    >
                                        {quickActions.map((action, idx) => (
                                            <Link
                                                key={idx}
                                                to={action.path}
                                                onClick={() => setShowQuickActions(false)}
                                                className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-all group"
                                            >
                                                <div className={`w-10 h-10 bg-gradient-to-br ${action.color} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                                    <action.icon size={18} className="text-white" />
                                                </div>
                                                <span className="text-sm font-semibold text-black">{action.label}</span>
                                            </Link>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Notifications */}
                        <div className="relative">
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                className="relative p-2.5 rounded-xl hover:bg-gray-100 transition-all group"
                            >
                                <Bell size={20} className="text-gray-600 group-hover:text-black transition-colors" />
                                {notifications.length > 0 && (
                                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-600 rounded-full animate-pulse" />
                                )}
                            </button>

                            <AnimatePresence>
                                {showNotifications && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-2xl shadow-2xl p-4 space-y-2 max-h-96 overflow-y-auto z-50"
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="font-bold text-black">Notifications</h3>
                                            <span className="text-xs text-gray-500">{notifications.length} new</span>
                                        </div>
                                        {notifications.length > 0 ? (
                                            notifications.map(notif => (
                                                <div key={notif.id} className={`p-3 rounded-lg border-l-4 ${
                                                    notif.type === 'success' ? 'bg-green-50 border-green-500' :
                                                    notif.type === 'warning' ? 'bg-yellow-50 border-yellow-500' :
                                                    'bg-blue-50 border-blue-500'
                                                }`}>
                                                    <p className="font-medium text-sm">{notif.icon} {notif.message}</p>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-center text-gray-500 text-sm py-8">No new notifications</p>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Profile Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setShowProfile(!showProfile)}
                                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-gray-100 transition-all"
                            >
                                <img
                                    src={userData?.photoURL || `https://ui-avatars.com/api/?name=${userData?.name || 'T'}&background=000&color=fff&bold=true`}
                                    alt="Profile"
                                    className="w-8 h-8 rounded-full ring-2 ring-gray-200"
                                />
                                <ChevronDown size={14} className="text-gray-600" />
                            </button>

                            <AnimatePresence>
                                {showProfile && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-2xl shadow-2xl p-2 z-50"
                                    >
                                        <div className="px-3 py-2 border-b border-gray-200 mb-2">
                                            <p className="text-sm font-bold text-black">{userData?.name || 'Teacher'}</p>
                                            <p className="text-xs text-gray-500">{userData?.email}</p>
                                        </div>
                                        <Link
                                            to="/teacher/profile"
                                            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-all"
                                            onClick={() => setShowProfile(false)}
                                        >
                                            <User size={16} />
                                            <span className="text-sm font-medium">Profile</span>
                                        </Link>
                                        <Link
                                            to="/teacher/settings"
                                            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-all"
                                            onClick={() => setShowProfile(false)}
                                        >
                                            <Settings size={16} />
                                            <span className="text-sm font-medium">Settings</span>
                                        </Link>
                                        <div className="h-px bg-gray-200 my-2" />
                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-50 hover:text-red-600 transition-all text-left"
                                        >
                                            <LogOut size={16} />
                                            <span className="text-sm font-medium">Logout</span>
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default TeacherNavbar;
