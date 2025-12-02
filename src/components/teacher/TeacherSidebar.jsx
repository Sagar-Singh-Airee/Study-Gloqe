// src/components/teacher/TeacherSidebar.jsx - FIXED VERSION
import { motion } from 'framer-motion';
import {
    Home, BookOpen, Users, ClipboardList, FileText, BarChart3,
    Trophy, Settings, Video, Calendar, Bell, MessageSquare,
    FolderOpen, Target, Zap
} from 'lucide-react';
import logoImage from '@/assets/logo/logo.svg';

const TeacherSidebar = ({ stats = {}, activeTab, setActiveTab }) => {

    const navItems = [
        {
            section: 'Main',
            items: [
                { icon: Home, label: 'Dashboard', tab: 'overview' },
                { icon: BookOpen, label: 'My Classes', tab: 'classes', badge: stats.totalClasses },
                { icon: Users, label: 'Students', tab: 'students', badge: stats.totalStudents },
            ]
        },
        {
            section: 'Teaching',
            items: [
                { icon: ClipboardList, label: 'Assignments', tab: 'assignments', badge: stats.pendingReviews },
                { icon: FileText, label: 'Quizzes', tab: 'quizzes', badge: stats.activeQuizzes },
                { icon: FolderOpen, label: 'Materials', tab: 'materials' },
                { icon: Video, label: 'Live Sessions', tab: 'live-sessions' },
            ]
        },
        {
            section: 'Analytics',
            items: [
                { icon: BarChart3, label: 'Analytics', tab: 'analytics' },
                { icon: Trophy, label: 'Leaderboard', tab: 'leaderboard' },
                { icon: Target, label: 'Performance', tab: 'performance' },
            ]
        },
        {
            section: 'Communication',
            items: [
                { icon: MessageSquare, label: 'Messages', tab: 'messages', badge: 0 },
                { icon: Bell, label: 'Announcements', tab: 'announcements' },
                { icon: Calendar, label: 'Schedule', tab: 'schedule' },
            ]
        },
        {
            section: 'Settings',
            items: [
                { icon: Settings, label: 'Settings', tab: 'settings' },
            ]
        }
    ];

    const isActive = (tab) => activeTab === tab;

    return (
        <div className="w-64 bg-gradient-to-b from-black via-gray-950 to-black fixed h-screen flex flex-col shadow-2xl border-r border-white/5 overflow-hidden z-50">
            
            {/* Logo */}
            <div className="p-5 border-b border-white/10">
                <button 
                    onClick={() => setActiveTab('overview')}
                    className="flex items-center gap-2 group w-full"
                >
                    <div className="relative">
                        <div className="absolute inset-0 bg-white blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
                        <img src={logoImage} alt="Logo" className="h-8 w-8 relative z-10" />
                    </div>
                    <div>
                        <div className="text-lg font-black text-white tracking-tight">StudyGloqe</div>
                        <div className="text-xs text-gray-500 font-medium">Teacher Portal</div>
                    </div>
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {navItems.map((section, sectionIdx) => (
                    <div key={sectionIdx}>
                        {/* Section Label */}
                        <div className="px-3 mb-2">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                {section.section}
                            </span>
                        </div>

                        {/* Section Items */}
                        <div className="space-y-1">
                            {section.items.map((item, idx) => {
                                const active = isActive(item.tab);
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => setActiveTab(item.tab)}
                                        className={`group relative flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 w-full ${
                                            active
                                                ? 'bg-white/10 text-white shadow-lg shadow-white/5'
                                                : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                        }`}
                                    >
                                        {/* Active Indicator */}
                                        {active && (
                                            <motion.div
                                                layoutId="activeTab"
                                                className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full"
                                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                            />
                                        )}

                                        <div className="flex items-center gap-3">
                                            <item.icon 
                                                size={18} 
                                                className={`${active ? 'drop-shadow-lg' : ''} transition-transform group-hover:scale-110`} 
                                            />
                                            <span>{item.label}</span>
                                        </div>

                                        {/* Badge */}
                                        {item.badge !== undefined && item.badge > 0 && (
                                            <motion.span
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className="px-2 py-0.5 bg-white/20 text-white text-xs font-bold rounded-full"
                                            >
                                                {item.badge}
                                            </motion.span>
                                        )}

                                        {/* Pending indicator for assignments */}
                                        {item.label === 'Assignments' && item.badge > 0 && (
                                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Quick Stats Footer */}
            <div className="p-4 border-t border-white/10 space-y-3">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white/5 backdrop-blur-xl rounded-lg p-3 border border-white/10">
                        <div className="flex items-center gap-2 mb-1">
                            <BookOpen size={14} className="text-blue-400" />
                            <span className="text-xs text-gray-400">Classes</span>
                        </div>
                        <div className="text-lg font-black text-white">{stats.totalClasses || 0}</div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-xl rounded-lg p-3 border border-white/10">
                        <div className="flex items-center gap-2 mb-1">
                            <Users size={14} className="text-green-400" />
                            <span className="text-xs text-gray-400">Students</span>
                        </div>
                        <div className="text-lg font-black text-white">{stats.totalStudents || 0}</div>
                    </div>
                </div>

                {/* Upgrade Prompt */}
                <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg p-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full blur-2xl" />
                    <div className="relative">
                        <Zap size={20} className="text-white mb-2" />
                        <div className="text-xs font-bold text-white mb-1">Upgrade to Pro</div>
                        <div className="text-xs text-purple-200 mb-3">Get unlimited features</div>
                        <button className="w-full py-1.5 bg-white text-purple-600 rounded-lg text-xs font-bold hover:bg-purple-50 transition-all">
                            Learn More
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeacherSidebar;
