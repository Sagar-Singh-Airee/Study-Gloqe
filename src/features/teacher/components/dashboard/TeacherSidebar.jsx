// src/components/teacher/TeacherSidebar.jsx
// 🎨 ULTRA-COMPACT MINIMALIST - v15.0 FINAL

import { motion } from 'framer-motion';
import {
    Home, BookOpen, Users, ClipboardList, FileText, BarChart3,
    Trophy, Settings, Video, Calendar, Bell, MessageSquare,
    FolderOpen, Target
} from 'lucide-react';
import logoImage from '@assets/logo/loma.png';

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
        <div className="w-64 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 fixed h-screen flex flex-col border-r border-white/5 backdrop-blur-xl z-50">

            {/* Logo - JUST IMAGE, CLEAN & COMPACT */}
            <div className="h-16 px-5 border-b border-white/5 flex items-center">
                <button
                    onClick={() => setActiveTab('overview')}
                    className="flex items-center gap-3 group"
                >
                    {/* Just the logo image - no background box */}
                    <img
                        src={logoImage}
                        alt="StudyGloqe"
                        className="h-10 w-10 transition-transform group-hover:scale-105"
                    />
                    <div>
                        <div className="text-lg font-black text-white tracking-tight">StudyGloqe</div>
                        <div className="text-xs text-white/40 font-medium">Teacher Portal</div>
                    </div>
                </button>
            </div>

            {/* Navigation - CUSTOM SCROLLBAR */}
            <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto custom-scrollbar">
                {navItems.map((section, sectionIdx) => (
                    <div key={sectionIdx}>
                        {/* Section Label */}
                        <div className="px-3 mb-2">
                            <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">
                                {section.section}
                            </span>
                        </div>

                        {/* Section Items */}
                        <div className="space-y-0.5">
                            {section.items.map((item, idx) => {
                                const active = isActive(item.tab);
                                return (
                                    <motion.button
                                        key={idx}
                                        onClick={() => setActiveTab(item.tab)}
                                        className={`
                      group relative flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 w-full
                      ${active
                                                ? 'bg-gradient-to-r from-blue-500/20 to-teal-500/20 text-white shadow-lg shadow-blue-500/10 border border-blue-500/30'
                                                : 'text-white/60 hover:bg-white/5 hover:text-white'
                                            }
                    `}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        {/* Active Indicator */}
                                        {active && (
                                            <motion.div
                                                layoutId="activeTab"
                                                className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-teal-500 rounded-r"
                                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                            />
                                        )}

                                        <div className="flex items-center gap-3">
                                            <item.icon
                                                size={18}
                                                className={`${active ? 'drop-shadow' : ''} transition-transform group-hover:scale-110`}
                                                strokeWidth={active ? 2.5 : 2}
                                            />
                                            <span className="font-medium">{item.label}</span>
                                        </div>

                                        {/* Badge */}
                                        {item.badge !== undefined && item.badge > 0 && (
                                            <motion.span
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className="px-2 py-0.5 bg-gradient-to-r from-blue-500 to-teal-500 text-white text-xs font-black rounded-full shadow-md"
                                            >
                                                {item.badge}
                                            </motion.span>
                                        )}

                                        {/* Pending indicator for assignments */}
                                        {item.label === 'Assignments' && item.badge > 0 && (
                                            <motion.div
                                                animate={{ opacity: [0.5, 1, 0.5] }}
                                                transition={{ duration: 1.5, repeat: Infinity }}
                                                className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"
                                            />
                                        )}
                                    </motion.button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Bottom Padding */}
            <div className="h-4"></div>
        </div>
    );
};

export default TeacherSidebar;
