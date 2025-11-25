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
    Sparkles
} from 'lucide-react';
import { useAuth } from '@contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const Sidebar = ({ isOpen }) => {
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
                    transition={{ type: 'spring', damping: 20 }}
                    className="fixed left-0 top-16 bottom-0 w-64 glass border-r border-white/10 overflow-y-auto custom-scrollbar z-40"
                >
                    <div className="p-4 space-y-2">
                        {/* Role Badge */}
                        <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-accent/20 to-blue-600/20 border border-accent/30">
                            <div className="text-xs text-primary-300 uppercase tracking-wider">Role</div>
                            <div className="text-sm font-semibold capitalize mt-1">{userData?.role}</div>
                        </div>

                        {/* Navigation Links */}
                        {links.map((link) => (
                            <NavLink
                                key={link.to}
                                to={link.to}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive
                                        ? 'bg-accent text-white shadow-lg shadow-accent/50'
                                        : 'hover:bg-white/5 text-primary-200 hover:text-white'
                                    }`
                                }
                            >
                                <link.icon size={20} />
                                <span className="font-medium">{link.label}</span>
                            </NavLink>
                        ))}

                        {/* Divider */}
                        <div className="my-4 h-px bg-white/10"></div>

                        {/* Settings */}
                        <NavLink
                            to="/settings"
                            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-primary-200 hover:text-white transition-all"
                        >
                            <Settings size={20} />
                            <span className="font-medium">Settings</span>
                        </NavLink>

                        {/* Progress Card */}
                        <div className="mt-6 p-4 rounded-xl bg-gradient-to-br from-accent/10 to-blue-600/10 border border-accent/20">
                            <div className="text-xs text-primary-300 uppercase tracking-wider mb-2">
                                Daily Goal
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>Progress</span>
                                    <span className="font-semibold">3/5 quizzes</span>
                                </div>
                                <div className="h-2 bg-primary-800 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: '60%' }}
                                        transition={{ duration: 1, ease: 'easeOut' }}
                                        className="h-full bg-gradient-to-r from-accent to-blue-600"
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