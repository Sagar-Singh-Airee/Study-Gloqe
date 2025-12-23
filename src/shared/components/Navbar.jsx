import { Link } from 'react-router-dom';
import { Menu, Bell, Search, User, LogOut, Settings } from 'lucide-react';
import { useAuth } from '@contexts/AuthContext';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const Navbar = ({ onMenuClick }) => {
    const { user, userData, logout } = useAuth();
    const [showProfile, setShowProfile] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const profileRef = useRef(null);
    const notifRef = useRef(null);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setShowProfile(false);
            }
            if (notifRef.current && !notifRef.current.contains(event.target)) {
                setShowNotifications(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10">
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-between h-16">
                    {/* Left side */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onMenuClick}
                            className="p-2 rounded-xl hover:bg-white/10 transition-colors"
                        >
                            <Menu size={24} />
                        </button>

                        <Link to="/dashboard" className="flex items-center gap-3">
                            <img
                                src="/src/assets/logo/loma.png"
                                alt="StudyGloqe"
                                className="h-8 w-8"
                            />
                            <span className="text-xl font-display font-bold gradient-text">
                                StudyGloqe
                            </span>
                        </Link>
                    </div>

                    {/* Center - Search */}
                    <div className="hidden md:flex flex-1 max-w-xl mx-8">
                        <div className="relative w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-400" size={20} />
                            <input
                                type="text"
                                placeholder="Search documents, quizzes, notes..."
                                className="input pl-10 w-full"
                            />
                        </div>
                    </div>

                    {/* Right side */}
                    <div className="flex items-center gap-4">
                        {/* XP Badge */}
                        <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full glass">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center justify-center font-bold text-sm">
                                {userData?.level || 1}
                            </div>
                            <div className="text-sm">
                                <div className="font-semibold">{userData?.xp || 0} XP</div>
                            </div>
                        </div>

                        {/* Notifications */}
                        <div className="relative" ref={notifRef}>
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                className="relative p-2 rounded-xl hover:bg-white/10 transition-colors"
                            >
                                <Bell size={22} />
                                <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full"></span>
                            </button>

                            <AnimatePresence>
                                {showNotifications && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="absolute right-0 mt-2 w-80 card"
                                    >
                                        <div className="p-4 border-b border-white/10">
                                            <h3 className="font-semibold">Notifications</h3>
                                        </div>
                                        <div className="max-h-96 overflow-y-auto custom-scrollbar">
                                            <div className="p-4 text-center text-primary-400">
                                                No new notifications
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Profile */}
                        <div className="relative" ref={profileRef}>
                            <button
                                onClick={() => setShowProfile(!showProfile)}
                                className="flex items-center gap-2 p-2 rounded-xl hover:bg-white/10 transition-colors"
                            >
                                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-accent to-blue-600 flex items-center justify-center">
                                    {userData?.name?.[0]?.toUpperCase() || <User size={18} />}
                                </div>
                            </button>

                            <AnimatePresence>
                                {showProfile && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="absolute right-0 mt-2 w-64 card"
                                    >
                                        <div className="p-4 border-b border-white/10">
                                            <div className="font-semibold">{userData?.name}</div>
                                            <div className="text-sm text-primary-400">{user?.email}</div>
                                            <div className="mt-1">
                                                <span className="badge badge-primary capitalize">{userData?.role}</span>
                                            </div>
                                        </div>
                                        <div className="p-2">
                                            <Link
                                                to="/profile"
                                                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
                                                onClick={() => setShowProfile(false)}
                                            >
                                                <User size={18} />
                                                <span>Profile</span>
                                            </Link>
                                            <Link
                                                to="/settings"
                                                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
                                                onClick={() => setShowProfile(false)}
                                            >
                                                <Settings size={18} />
                                                <span>Settings</span>
                                            </Link>
                                            <button
                                                onClick={logout}
                                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-error/10 text-error transition-colors"
                                            >
                                                <LogOut size={18} />
                                                <span>Logout</span>
                                            </button>
                                        </div>
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

export default Navbar;