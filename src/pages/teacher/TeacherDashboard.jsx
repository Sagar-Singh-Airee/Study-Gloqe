import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users,
  FileText,
  Award,
  TrendingUp,
  Plus,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@contexts/AuthContext';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const TeacherDashboard = () => {
  const { userData } = useAuth();
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalClasses: 0,
    activeQuizzes: 0,
    avgCompletion: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [performanceData, setPerformanceData] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = () => {
    // Mock data (replace with actual API calls)
    setStats({
      totalStudents: 156,
      totalClasses: 5,
      activeQuizzes: 12,
      avgCompletion: 87
    });

    setRecentActivity([
      { id: 1, type: 'submission', student: 'Alice Johnson', quiz: 'Physics Chapter 5', score: 95, time: '2 hours ago' },
      { id: 2, type: 'submission', student: 'Bob Smith', quiz: 'Math Quiz', score: 88, time: '3 hours ago' },
      { id: 3, type: 'new_student', student: 'Charlie Brown', class: 'Class A', time: '5 hours ago' },
      { id: 4, type: 'submission', student: 'Diana Prince', quiz: 'Chemistry Test', score: 92, time: '1 day ago' }
    ]);

    setPerformanceData([
      { name: 'Mon', completed: 45, pending: 15 },
      { name: 'Tue', completed: 52, pending: 12 },
      { name: 'Wed', completed: 48, pending: 18 },
      { name: 'Thu', completed: 61, pending: 9 },
      { name: 'Fri', completed: 55, pending: 14 },
      { name: 'Sat', completed: 38, pending: 8 },
      { name: 'Sun', completed: 42, pending: 10 }
    ]);
  };

  const quickStats = [
    {
      icon: Users,
      label: 'Total Students',
      value: stats.totalStudents,
      change: '+12 this month',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: FileText,
      label: 'Active Quizzes',
      value: stats.activeQuizzes,
      change: '3 due this week',
      color: 'from-purple-500 to-pink-500'
    },
    {
      icon: CheckCircle2,
      label: 'Completion Rate',
      value: `${stats.avgCompletion}%`,
      change: '+5% from last week',
      color: 'from-green-500 to-emerald-500'
    },
    {
      icon: Award,
      label: 'Classes',
      value: stats.totalClasses,
      change: 'All active',
      color: 'from-yellow-500 to-orange-500'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-display font-bold mb-2">
          Welcome back, <span className="gradient-text">{userData?.name || 'Teacher'}</span>!
        </h1>
        <p className="text-primary-300">Here's what's happening with your classes today</p>
      </motion.div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {quickStats.map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="card-hover"
          >
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${stat.color} flex items-center justify-center mb-4`}>
              <stat.icon size={24} />
            </div>
            <div className="text-3xl font-bold mb-1">{stat.value}</div>
            <div className="text-sm text-primary-400 mb-2">{stat.label}</div>
            <div className="text-xs text-success">{stat.change}</div>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="card"
      >
        <h2 className="text-2xl font-display font-semibold mb-4">Quick Actions</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <Link
            to="/teacher/create-quiz"
            className="p-6 rounded-xl glass-hover text-center group"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-accent to-blue-600 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
              <Plus size={24} />
            </div>
            <div className="font-semibold">Create New Quiz</div>
            <div className="text-sm text-primary-400 mt-1">Generate or build from scratch</div>
          </Link>

          <Link
            to="/teacher/classes"
            className="p-6 rounded-xl glass-hover text-center group"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
              <Users size={24} />
            </div>
            <div className="font-semibold">Manage Classes</div>
            <div className="text-sm text-primary-400 mt-1">View and organize students</div>
          </Link>

          <Link
            to="/teacher/analytics"
            className="p-6 rounded-xl glass-hover text-center group"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
              <TrendingUp size={24} />
            </div>
            <div className="font-semibold">View Analytics</div>
            <div className="text-sm text-primary-400 mt-1">Track performance metrics</div>
          </Link>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Performance Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="card"
        >
          <h2 className="text-2xl font-display font-semibold mb-6">Weekly Performance</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Bar dataKey="completed" fill="#3b82f6" name="Completed" radius={[8, 8, 0, 0]} />
              <Bar dataKey="pending" fill="#64748b" name="Pending" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="card"
        >
          <h2 className="text-2xl font-display font-semibold mb-6">Recent Activity</h2>
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start gap-4 p-4 rounded-xl glass-hover">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  activity.type === 'submission'
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-blue-500/20 text-blue-400'
                }`}>
                  {activity.type === 'submission' ? (
                    <CheckCircle2 size={20} />
                  ) : (
                    <Users size={20} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-medium">
                    {activity.type === 'submission' ? (
                      <>
                        <span className="text-accent">{activity.student}</span> completed{' '}
                        <span className="text-primary-200">{activity.quiz}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-accent">{activity.student}</span> joined{' '}
                        <span className="text-primary-200">{activity.class}</span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-sm text-primary-400">
                      <Clock size={14} className="inline mr-1" />
                      {activity.time}
                    </span>
                    {activity.score && (
                      <span className={`text-sm font-semibold ${
                        activity.score >= 90 ? 'text-success' :
                        activity.score >= 70 ? 'text-yellow-400' :
                        'text-error'
                      }`}>
                        Score: {activity.score}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Upcoming Deadlines */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.7 }}
        className="card"
      >
        <h2 className="text-2xl font-display font-semibold mb-6">Upcoming Quiz Deadlines</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { title: 'Physics Midterm', class: 'Class A', due: '2 days', submissions: 45, total: 50 },
            { title: 'Math Quiz 5', class: 'Class B', due: '5 days', submissions: 28, total: 35 },
            { title: 'Chemistry Lab', class: 'Class C', due: '1 week', submissions: 20, total: 30 }
          ].map((quiz, index) => (
            <div key={index} className="p-4 rounded-xl glass">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs px-2 py-1 rounded-full bg-accent/20 text-accent">
                  {quiz.class}
                </span>
                <span className="text-xs text-primary-400 flex items-center gap-1">
                  <Calendar size={12} />
                  {quiz.due}
                </span>
              </div>

              <h3 className="font-semibold mb-3">{quiz.title}</h3>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-primary-400">Submissions:</span>
                  <span className="font-semibold">{quiz.submissions}/{quiz.total}</span>
                </div>
                <div className="h-2 bg-primary-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-accent to-blue-600"
                    style={{ width: `${(quiz.submissions / quiz.total) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default TeacherDashboard;