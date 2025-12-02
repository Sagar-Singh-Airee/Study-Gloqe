// src/pages/ClassroomPage.jsx - UNIFIED CLASSROOM HUB
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ArrowLeft, Users, BookOpen, Video, ClipboardList, 
    FileText, Trophy, Bell, BarChart3, Settings 
} from 'lucide-react';
import { useAuth } from '@contexts/AuthContext';
import { db } from '@/config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

// Import tab components
import ClassroomHeader from '@/components/classroom/ClassroomHeader';
import OverviewTab from '@/components/classroom/OverviewTab';
import VideoCallSection from '@/components/classroom/VideoCallSection';
import AssignmentsTab from '@/components/classroom/AssignmentsTab';
import QuizzesTab from '@/components/classroom/QuizzesTab';
import MaterialsTab from '@/components/classroom/MaterialsTab';
import LeaderboardTab from '@/components/classroom/LeaderboardTab';
import AnnouncementsTab from '@/components/classroom/AnnouncementsTab';
import AnalyticsTab from '@/components/classroom/AnalyticsTab';

const ClassroomPage = () => {
    const { classId } = useParams();
    const navigate = useNavigate();
    const { user, userData } = useAuth();
    
    const [classData, setClassData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [isTeacher, setIsTeacher] = useState(false);

    useEffect(() => {
        loadClassroom();
    }, [classId, user?.uid]);

    const loadClassroom = async () => {
        try {
            setLoading(true);
            
            const classRef = doc(db, 'classes', classId);
            const classSnap = await getDoc(classRef);
            
            if (!classSnap.exists()) {
                toast.error('Class not found');
                navigate('/dashboard');
                return;
            }

            const data = classSnap.data();
            
            // Check if user is teacher or student
            const userIsTeacher = data.teacherId === user?.uid;
            const userIsStudent = data.students?.includes(user?.uid);
            
            if (!userIsTeacher && !userIsStudent) {
                toast.error('You are not a member of this class');
                navigate('/dashboard');
                return;
            }

            setIsTeacher(userIsTeacher);
            setClassData({ id: classSnap.id, ...data });
            setLoading(false);
        } catch (error) {
            console.error('Error loading classroom:', error);
            toast.error('Failed to load classroom');
            navigate('/dashboard');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">Loading classroom...</p>
                </div>
            </div>
        );
    }

    const tabs = [
        { id: 'overview', label: 'Overview', icon: BookOpen },
        { id: 'video', label: 'Live Session', icon: Video },
        { id: 'assignments', label: 'Assignments', icon: ClipboardList },
        { id: 'quizzes', label: 'Quizzes', icon: FileText },
        { id: 'materials', label: 'Materials', icon: BookOpen },
        { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
        { id: 'announcements', label: 'Announcements', icon: Bell },
        ...(isTeacher ? [{ id: 'analytics', label: 'Analytics', icon: BarChart3 }] : []),
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
            {/* Back Button */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <button
                        onClick={() => navigate(isTeacher ? '/teacher/dashboard' : '/dashboard')}
                        className="flex items-center gap-2 text-gray-600 hover:text-black font-medium transition-all"
                    >
                        <ArrowLeft size={20} />
                        Back to {isTeacher ? 'Teacher Dashboard' : 'Dashboard'}
                    </button>
                </div>
            </div>

            {/* Classroom Header */}
            <ClassroomHeader 
                classData={classData} 
                isTeacher={isTeacher}
                onRefresh={loadClassroom}
            />

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Tab Navigation */}
                <div className="bg-white border border-gray-200 rounded-2xl p-2 mb-6 overflow-x-auto">
                    <div className="flex gap-2 min-w-max">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap ${
                                        activeTab === tab.id
                                            ? 'bg-black text-white'
                                            : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                                >
                                    <Icon size={18} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Tab Content */}
                <AnimatePresence mode="wait">
                    {activeTab === 'overview' && (
                        <motion.div
                            key="overview"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <OverviewTab classData={classData} isTeacher={isTeacher} />
                        </motion.div>
                    )}

                    {activeTab === 'video' && (
                        <motion.div
                            key="video"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <VideoCallSection classId={classId} isTeacher={isTeacher} />
                        </motion.div>
                    )}

                    {activeTab === 'assignments' && (
                        <motion.div
                            key="assignments"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <AssignmentsTab classId={classId} isTeacher={isTeacher} />
                        </motion.div>
                    )}

                    {activeTab === 'quizzes' && (
                        <motion.div
                            key="quizzes"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <QuizzesTab classId={classId} isTeacher={isTeacher} />
                        </motion.div>
                    )}

                    {activeTab === 'materials' && (
                        <motion.div
                            key="materials"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <MaterialsTab classId={classId} isTeacher={isTeacher} />
                        </motion.div>
                    )}

                    {activeTab === 'leaderboard' && (
                        <motion.div
                            key="leaderboard"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <LeaderboardTab classId={classId} />
                        </motion.div>
                    )}

                    {activeTab === 'announcements' && (
                        <motion.div
                            key="announcements"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <AnnouncementsTab classId={classId} isTeacher={isTeacher} />
                        </motion.div>
                    )}

                    {activeTab === 'analytics' && isTeacher && (
                        <motion.div
                            key="analytics"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <AnalyticsTab classId={classId} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default ClassroomPage;
