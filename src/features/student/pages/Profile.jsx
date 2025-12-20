import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Camera, Mail, User, Award, Trophy, Calendar, Edit2, Save, Flame, Zap } from 'lucide-react';
import { useAuth } from '@auth/contexts/AuthContext';
import { useGamification } from '@gamification/hooks/useGamification';
import toast from 'react-hot-toast';

const Profile = ({ embedded = false }) => {
  const { user, userData } = useAuth();
  const {
    xp,
    level,
    levelProgress,
    nextLevelXp,
    streak,
    totalBadges,
    allBadges,
    quizzesCompleted,
    flashcardsReviewed,
    loading: gamificationLoading
  } = useGamification();

  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: userData?.name || '',
    bio: userData?.bio || '',
    school: userData?.school || '',
    grade: userData?.grade || ''
  });

  // Transform real badges to achievements format
  const achievements = useMemo(() => {
    return allBadges.slice(0, 6).map((badge, index) => ({
      id: badge.id || index,
      title: badge.name,
      description: badge.description || badge.desc,
      earned: badge.unlocked,
      date: badge.unlockedAt ? new Date(badge.unlockedAt).toLocaleDateString() : null
    }));
  }, [allBadges]);

  // Real-time stats from gamification
  const stats = useMemo(() => [
    { label: 'Quizzes Completed', value: quizzesCompleted || 0 },
    { label: 'Total XP', value: xp || 0 },
    { label: 'Current Streak', value: `${streak || 0} days` },
    { label: 'Badges Earned', value: totalBadges || 0 }
  ], [quizzesCompleted, xp, streak, totalBadges]);

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
    <div className={embedded ? "w-full" : "max-w-6xl mx-auto space-y-8"}>
      {/* Header - Only show if not embedded (Dashboard has its own header) */}
      {!embedded && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-display font-bold mb-2">
            <span className="gradient-text">Profile</span>
          </h1>
          <p className="text-primary-300">Manage your account and view your achievements</p>
        </motion.div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Profile Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Profile Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className={`text-center ${embedded ? 'bg-white border border-gray-200 shadow-sm rounded-2xl p-6' : 'card'}`}
          >
            {/* Avatar */}
            <div className="relative inline-block mb-4">
              <div className="w-32 h-32 rounded-full bg-gradient-to-r from-teal-500 to-cyan-600 flex items-center justify-center text-4xl font-bold text-white shadow-lg">
                {userData?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <button className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-teal-500 flex items-center justify-center hover:bg-teal-600 transition-colors text-white shadow-md border-2 border-white">
                <Camera size={18} />
              </button>
            </div>

            <h2 className={`text-2xl font-bold mb-1 ${embedded ? 'text-gray-900' : 'text-white'}`}>{userData?.name || 'User'}</h2>
            <p className={`mb-4 ${embedded ? 'text-gray-500' : 'text-primary-400'}`}>{user?.email}</p>

            {/* Level Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 mb-6">
              <Trophy size={20} className="text-yellow-500" />
              <span className={`font-semibold ${embedded ? 'text-gray-800' : 'text-white'}`}>Level {level || 1}</span>
            </div>

            {/* XP Progress */}
            <div className="space-y-2 text-left">
              <div className="flex justify-between text-sm">
                <span className={embedded ? 'text-gray-500' : 'text-primary-400'}>Progress to Level {(level || 1) + 1}</span>
                <span className={`font-semibold ${embedded ? 'text-gray-700' : 'text-white'}`}>{xp || 0}/{nextLevelXp || 500} XP</span>
              </div>
              <div className={`h-2 rounded-full overflow-hidden ${embedded ? 'bg-gray-100' : 'bg-primary-800'}`}>
                <div
                  className="h-full bg-gradient-to-r from-teal-500 to-cyan-600 transition-all duration-500"
                  style={{ width: `${levelProgress || 0}%` }}
                ></div>
              </div>
            </div>
          </motion.div>

          {/* Stats Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={embedded ? 'bg-white border border-gray-200 shadow-sm rounded-2xl p-6' : 'card'}
          >
            <h3 className={`text-xl font-display font-semibold mb-4 ${embedded ? 'text-gray-900' : 'text-white'}`}>Statistics</h3>
            <div className="space-y-4">
              {stats.map((stat, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className={embedded ? 'text-gray-500' : 'text-primary-400'}>{stat.label}</span>
                  <span className={`font-bold text-lg ${embedded ? 'text-gray-900' : 'text-white'}`}>{stat.value}</span>
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
            className={embedded ? 'bg-white border border-gray-200 shadow-sm rounded-2xl p-6' : 'card'}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-xl font-display font-semibold ${embedded ? 'text-gray-900' : 'text-white'}`}>Account Details</h3>
              <button
                onClick={() => editing ? handleSave() : setEditing(true)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${embedded
                  ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900'
                  : 'btn-secondary'
                  }`}
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
                <label className={`block text-sm font-medium mb-2 ${embedded ? 'text-gray-700' : 'text-primary-200'}`}>Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={!editing}
                  className={embedded
                    ? "w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all disabled:bg-gray-50 disabled:text-gray-500"
                    : "input"
                  }
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${embedded ? 'text-gray-700' : 'text-primary-200'}`}>Email</label>
                <input
                  type="email"
                  value={user?.email}
                  disabled
                  className={embedded
                    ? "w-full px-4 py-2 rounded-xl border border-gray-300 bg-gray-50 text-gray-500 cursor-not-allowed outline-none"
                    : "input opacity-50 cursor-not-allowed"
                  }
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${embedded ? 'text-gray-700' : 'text-primary-200'}`}>Bio</label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  disabled={!editing}
                  rows={3}
                  className={embedded
                    ? "w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all disabled:bg-gray-50 disabled:text-gray-500"
                    : "input"
                  }
                  placeholder="Tell us about yourself..."
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${embedded ? 'text-gray-700' : 'text-primary-200'}`}>School</label>
                  <input
                    type="text"
                    name="school"
                    value={formData.school}
                    onChange={handleChange}
                    disabled={!editing}
                    className={embedded
                      ? "w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all disabled:bg-gray-50 disabled:text-gray-500"
                      : "input"
                    }
                    placeholder="Your school name"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${embedded ? 'text-gray-700' : 'text-primary-200'}`}>Grade</label>
                  <input
                    type="text"
                    name="grade"
                    value={formData.grade}
                    onChange={handleChange}
                    disabled={!editing}
                    className={embedded
                      ? "w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all disabled:bg-gray-50 disabled:text-gray-500"
                      : "input"
                    }
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
            className={embedded ? 'bg-white border border-gray-200 shadow-sm rounded-2xl p-6' : 'card'}
          >
            <h3 className={`text-xl font-display font-semibold mb-6 ${embedded ? 'text-gray-900' : 'text-white'}`}>Achievements</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {achievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className={`p-4 rounded-xl border transition-all ${achievement.earned
                    ? embedded
                      ? 'border-yellow-200 bg-yellow-50/50'
                      : 'border-accent/30 bg-accent/5'
                    : embedded
                      ? 'border-gray-100 bg-gray-50 opacity-60'
                      : 'border-white/10 bg-white/5 opacity-50'
                    }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${achievement.earned
                      ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-sm'
                      : embedded
                        ? 'bg-gray-200 text-gray-400'
                        : 'bg-primary-800 text-primary-600'
                      }`}>
                      <Award size={24} />
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-semibold mb-1 ${embedded ? 'text-gray-900' : 'text-white'}`}>{achievement.title}</h4>
                      <p className={`text-sm mb-2 ${embedded ? 'text-gray-500' : 'text-primary-400'}`}>{achievement.description}</p>
                      {achievement.earned && achievement.date && (
                        <div className="text-xs text-green-600 flex items-center gap-1 font-medium">
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