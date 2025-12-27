// src/features/teacher/pages/TeacherClassroom.jsx - TEACHER CLASSROOM MASTER VIEW 🎓

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, FileText, BookOpen, Brain, Users,
  Megaphone, Video, ArrowLeft, Settings, MoreVertical,
  TrendingUp, Clock, Award, MessageSquare, CheckCircle
} from 'lucide-react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/shared/config/firebase';
import { useAuth } from '../../auth/contexts/AuthContext';
import toast from 'react-hot-toast';

// Tab Components
import TeacherOverview from '@/features/teacher/components/classroom/TeacherOverview';
import TeacherAssignments from '@/features/teacher/components/classroom/TeacherAssignments';
import TeacherMaterials from '@/features/teacher/components/classroom/TeacherMaterials';
import TeacherQuizzes from '@/features/teacher/components/classroom/TeacherQuizzes';
import TeacherStudents from '@/features/teacher/components/classroom/TeacherStudents';
import TeacherAnnouncements from '@/features/teacher/components/classroom/TeacherAnnouncements';
import TeacherLive from '@/features/teacher/components/classroom/TeacherLive';

// Tab Configuration
const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, gradient: 'from-blue-500 to-cyan-500' },
  { id: 'assignments', label: 'Assignments', icon: FileText, gradient: 'from-purple-500 to-pink-500' },
  { id: 'materials', label: 'Materials', icon: BookOpen, gradient: 'from-green-500 to-teal-500' },
  { id: 'quizzes', label: 'Quizzes', icon: Brain, gradient: 'from-orange-500 to-red-500' },
  { id: 'students', label: 'Students', icon: Users, gradient: 'from-indigo-500 to-blue-500' },
  { id: 'announcements', label: 'Announcements', icon: Megaphone, gradient: 'from-yellow-500 to-orange-500' },
  { id: 'live', label: 'Live Sessions', icon: Video, gradient: 'from-red-500 to-pink-500' },
];

const TeacherClassroom = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { currentUser, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState('overview');
  const [classData, setClassData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    studentCount: 0,
    assignmentCount: 0,
    materialCount: 0,
    announcementCount: 0,
    quizCount: 0,
    liveSessionCount: 0,
  });

  // ✅ AUTH GUARD: Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !currentUser) {
      toast.error('Please log in to access this classroom');
      navigate('/login');
    }
  }, [authLoading, currentUser, navigate]);

  // Fetch Class Data
  useEffect(() => {
    // ✅ Guard: Wait for auth to complete
    if (authLoading || !currentUser || !classId) {
      return;
    }

    const classRef = doc(db, 'classes', classId);

    // Real-time listener for class data
    const unsubscribe = onSnapshot(
      classRef,
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();

          // ✅ Verify teacher access with safe uid check
          if (data.teacherId !== currentUser.uid) {
            toast.error('You do not have access to this class');
            navigate('/teacher/dashboard');
            return;
          }

          setClassData({ id: doc.id, ...data });
          setLoading(false);
        } else {
          toast.error('Class not found');
          navigate('/teacher/dashboard');
        }
      },
      (error) => {
        console.error('Error fetching class:', error);
        toast.error('Failed to load class data');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [classId, currentUser, authLoading, navigate]);

  // Fetch Class Stats
  useEffect(() => {
    if (!classId || !classData) return;

    const fetchStats = async () => {
      try {
        const classDoc = await getDoc(doc(db, 'classes', classId));
        const data = classDoc.data();

        if (data) {
          setStats({
            studentCount: data.studentCount || 0,
            assignmentCount: data.assignmentCount || 0,
            materialCount: data.materialCount || 0,
            announcementCount: data.announcementCount || 0,
            quizCount: data.quizCount || 0,
            liveSessionCount: data.liveSessionCount || 0,
          });
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
        toast.error('Failed to load class statistics');
      }
    };

    fetchStats();
  }, [classId, classData]);

  // ✅ Combined Loading State - handles both auth and data loading
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">
            {authLoading ? 'Authenticating...' : 'Loading classroom...'}
          </p>
        </div>
      </div>
    );
  }

  // ✅ Guard: Don't render if no user or classData
  if (!currentUser || !classData) {
    return null;
  }

  const currentTabData = TABS.find(tab => tab.id === activeTab);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30">
      {/* Header Section */}
      <div className="bg-white border-b-2 border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-6">
          {/* Back Button & Class Info */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/teacher/dashboard')}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                aria-label="Back to dashboard"
              >
                <ArrowLeft size={20} className="text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-black text-gray-900 mb-1">
                  {classData.name}
                </h1>
                <div className="flex items-center gap-3 text-sm">
                  <span className="px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg font-bold">
                    {classData.subject}
                  </span>
                  <span className="text-gray-600 font-semibold">
                    Section {classData.section}
                  </span>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-600 font-semibold">
                    Code: <span className="font-black text-gray-900">{classData.classCode}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveTab('live')}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl text-sm font-bold hover:shadow-lg transition-all"
              >
                <Video size={16} />
                Start Live
              </button>
              <button
                className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors"
                aria-label="Settings"
              >
                <Settings size={18} className="text-gray-600" />
              </button>
              <button
                className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors"
                aria-label="More options"
              >
                <MoreVertical size={18} className="text-gray-600" />
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-6 gap-4 mb-6">
            <StatCard icon={Users} label="Students" value={stats.studentCount} color="blue" />
            <StatCard icon={FileText} label="Assignments" value={stats.assignmentCount} color="purple" />
            <StatCard icon={BookOpen} label="Materials" value={stats.materialCount} color="green" />
            <StatCard icon={Brain} label="Quizzes" value={stats.quizCount} color="orange" />
            <StatCard icon={Megaphone} label="Posts" value={stats.announcementCount} color="yellow" />
            <StatCard icon={Video} label="Live" value={stats.liveSessionCount} color="red" />
          </div>

          {/* Tabs Navigation */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${isActive
                    ? 'bg-gradient-to-r ' + tab.gradient + ' text-white shadow-lg scale-105'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                >
                  <Icon size={18} />
                  {tab.label}
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-white/20 rounded-xl"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'overview' && <TeacherOverview classData={classData} stats={stats} />}
            {activeTab === 'assignments' && <TeacherAssignments classId={classId} classData={classData} />}
            {activeTab === 'materials' && <TeacherMaterials classId={classId} classData={classData} />}
            {activeTab === 'quizzes' && <TeacherQuizzes classId={classId} classData={classData} />}
            {activeTab === 'students' && <TeacherStudents classId={classId} classData={classData} />}
            {activeTab === 'announcements' && <TeacherAnnouncements classId={classId} classData={classData} />}
            {activeTab === 'live' && <TeacherLive classId={classId} classData={classData} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

// Stat Card Component
const StatCard = ({ icon: Icon, label, value, color }) => {
  const colorClasses = {
    blue: 'from-blue-500 to-cyan-500 bg-blue-50 border-blue-200',
    purple: 'from-purple-500 to-pink-500 bg-purple-50 border-purple-200',
    green: 'from-green-500 to-teal-500 bg-green-50 border-green-200',
    orange: 'from-orange-500 to-red-500 bg-orange-50 border-orange-200',
    yellow: 'from-yellow-500 to-orange-500 bg-yellow-50 border-yellow-200',
    red: 'from-red-500 to-pink-500 bg-red-50 border-red-200',
  };

  const [gradient, bg, border] = colorClasses[color].split(' ');

  return (
    <div className={`${bg} border-2 ${border} rounded-xl p-4 text-center`}>
      <div className={`w-10 h-10 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center mx-auto mb-2`}>
        <Icon size={18} className="text-white" />
      </div>
      <div className="text-2xl font-black text-gray-900 mb-1">{value}</div>
      <div className="text-xs text-gray-600 font-semibold">{label}</div>
    </div>
  );
};

export default TeacherClassroom;
