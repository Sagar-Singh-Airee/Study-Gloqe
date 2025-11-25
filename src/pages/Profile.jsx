import { useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, Mail, User, Award, Trophy, Calendar, Edit2, Save } from 'lucide-react';
import { useAuth } from '@contexts/AuthContext';
import toast from 'react-hot-toast';

const Profile = () => {
  const { user, userData } = useAuth();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: userData?.name || '',
    bio: userData?.bio || '',
    school: userData?.school || '',
    grade: userData?.grade || ''
  });

  const achievements = [
    { id: 1, title: 'First Quiz', description: 'Complete your first quiz', earned: true, date: '2024-01-15' },
    { id: 2, title: '7 Day Streak', description: 'Study for 7 days in a row', earned: true, date: '2024-01-20' },
    { id: 3, title: 'Perfect Score', description: 'Get 100% on a quiz', earned: true, date: '2024-01-25' },
    { id: 4, title: 'Top 10', description: 'Reach top 10 in leaderboard', earned: false },
    { id: 5, title: 'Quiz Master', description: 'Complete 50 quizzes', earned: false },
    { id: 6, title: 'Note Taker', description: 'Create 100 notes', earned: false }
  ];

  const stats = [
    { label: 'Quizzes Completed', value: 47 },
    { label: 'Total XP', value: userData?.xp || 0 },
    { label: 'Current Streak', value: '12 days' },
    { label: 'Badges Earned', value: 8 }
  ];

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSave = async () => {
    try {
      // Update user profile (implement actual Firebase update)
      toast.success('Profile updated successfully!');
      setEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-display font-bold mb-2">
          <span className="gradient-text">Profile</span>
        </h1>
        <p className="text-primary-300">Manage your account and view your achievements</p>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Profile Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Profile Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="card text-center"
          >
            {/* Avatar */}
            <div className="relative inline-block mb-4">
              <div className="w-32 h-32 rounded-full bg-gradient-to-r from-accent to-blue-600 flex items-center justify-center text-4xl font-bold">
                {userData?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <button className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-accent flex items-center justify-center hover:bg-accent-dark transition-colors">
                <Camera size={18} />
              </button>
            </div>

            <h2 className="text-2xl font-bold mb-1">{userData?.name || 'User'}</h2>
            <p className="text-primary-400 mb-4">{user?.email}</p>

            {/* Level Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 mb-6">
              <Trophy size={20} className="text-yellow-400" />
              <span className="font-semibold">Level {userData?.level || 1}</span>
            </div>

            {/* XP Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-primary-400">Progress to Level {(userData?.level || 1) + 1}</span>
                <span className="font-semibold">{userData?.xp || 0}/500 XP</span>
              </div>
              <div className="h-2 bg-primary-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-accent to-blue-600 transition-all duration-500"
                  style={{ width: `${((userData?.xp || 0) / 500) * 100}%` }}
                ></div>
              </div>
            </div>
          </motion.div>

          {/* Stats Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="card"
          >
            <h3 className="text-xl font-display font-semibold mb-4">Statistics</h3>
            <div className="space-y-4">
              {stats.map((stat, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-primary-400">{stat.label}</span>
                  <span className="font-bold text-lg">{stat.value}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Right Column - Details & Achievements */}
        <div className="lg:col-span-2 space-y-6">
          {/* Account Details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="card"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-display font-semibold">Account Details</h3>
              <button
                onClick={() => editing ? handleSave() : setEditing(true)}
                className="btn-secondary flex items-center gap-2"
              >
                {editing ? (
                  <>
                    <Save size={18} />
                    Save
                  </>
                ) : (
                  <>
                    <Edit2 size={18} />
                    Edit
                  </>
                )}
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={!editing}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={user?.email}
                  disabled
                  className="input opacity-50 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Bio</label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  disabled={!editing}
                  rows={3}
                  className="input"
                  placeholder="Tell us about yourself..."
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">School</label>
                  <input
                    type="text"
                    name="school"
                    value={formData.school}
                    onChange={handleChange}
                    disabled={!editing}
                    className="input"
                    placeholder="Your school name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Grade</label>
                  <input
                    type="text"
                    name="grade"
                    value={formData.grade}
                    onChange={handleChange}
                    disabled={!editing}
                    className="input"
                    placeholder="Grade level"
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Achievements */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="card"
          >
            <h3 className="text-xl font-display font-semibold mb-6">Achievements</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {achievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    achievement.earned
                      ? 'border-accent/30 bg-accent/5'
                      : 'border-white/10 bg-white/5 opacity-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      achievement.earned
                        ? 'bg-gradient-to-r from-yellow-400 to-orange-500'
                        : 'bg-primary-800'
                    }`}>
                      <Award size={24} className={achievement.earned ? 'text-white' : 'text-primary-600'} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1">{achievement.title}</h4>
                      <p className="text-sm text-primary-400 mb-2">{achievement.description}</p>
                      {achievement.earned && achievement.date && (
                        <div className="text-xs text-success flex items-center gap-1">
                          <Calendar size={12} />
                          Earned {achievement.date}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Profile;