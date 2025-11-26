import { NavLink } from 'react-router-dom';
import {
    Home,
    Upload,
    BookOpen,
    Users,
    Trophy,
    StickyNote,
    CreditCard,
    GraduationCap,
    BarChart3,
    Settings,
    Sparkles,
    X
} from 'lucide-react';
import { useAuth } from '@contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const Sidebar = ({ isOpen, onClose }) => {
    const { userData } = useAuth();
    const isTeacher = userData?.role === 'teacher' || userData?.role === 'admin';

    const studentLinks = [
        { to: '/dashboard', icon: Home, label: 'Dashboard' },
        { to: '/upload', icon: Upload, label: 'Upload PDF' },
        { to: '/notes', icon: StickyNote, label: 'My Notes' },
        { to: '/flashcards', icon: CreditCard, label: 'Flashcards' },
        { to: '/rooms', icon: Users, label: 'Study Rooms' },
        { to: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
    ];

    const teacherLinks = [
        { to: '/teacher', icon: GraduationCap, label: 'Dashboard' },
        { to: '/teacher/classes', icon: Users, label: 'Classes' },
        { to: '/teacher/create-quiz', icon: Sparkles, label: 'Create Quiz' },
        { to: '/teacher/analytics', icon: BarChart3, label: 'Analytics' },
    ];

    const links = isTeacher ? teacherLinks : studentLinks;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.aside
                    initial={{ x: -300, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -300, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="fixed left-0 top-16 bottom-0 w-64 bg-gradient-to-b from-gray-900 to-black border-r border-gray-800 overflow-y-auto z-40 shadow-2xl"
                >
                    {/* Close button for mobile */}
                    <button
                        onClick={onClose}
                        className="lg:hidden absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 transition-colors"
                    >
                        <X size={20} />
                    </button>

                    <div className="p-4 space-y-2">
                        {/* Role Badge */}
                        <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30">
                            <div className="text-xs text-gray-400 uppercase tracking-wider">Role</div>
                            <div className="text-sm font-semibold capitalize mt-1">{userData?.role || 'Student'}</div>
                        </div>

                        {/* Navigation Links */}
                        {links.map((link) => (
                            <NavLink
                                key={link.to}
                                to={link.to}
                                onClick={() => onClose()}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                                        isActive
                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/50'
                                            : 'hover:bg-white/5 text-gray-300 hover:text-white'
                                    }`
                                }
                            >
                                <link.icon size={20} />
                                <span className="font-medium">{link.label}</span>
                            </NavLink>
                        ))}

                        {/* Divider */}
                        <div className="my-4 h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent"></div>

                        {/* Settings */}
                        <NavLink
                            to="/settings"
                            onClick={() => onClose()}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-gray-300 hover:text-white transition-all"
                        >
                            <Settings size={20} />
                            <span className="font-medium">Settings</span>
                        </NavLink>

                        {/* Progress Card */}
                        <div className="mt-6 p-4 rounded-xl bg-gradient-to-br from-blue-600/10 to-purple-600/10 border border-blue-500/20">
                            <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">
                                Daily Goal
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>Progress</span>
                                    <span className="font-semibold">3/5 quizzes</span>
                                </div>
                                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: '60%' }}
                                        transition={{ duration: 1, ease: 'easeOut' }}
                                        className="h-full bg-gradient-to-r from-blue-500 to-purple-600"
                                    ></motion.div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.aside>
            )}
        </AnimatePresence>
    );
};

export default Sidebar;