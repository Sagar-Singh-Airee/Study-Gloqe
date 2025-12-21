import { useState, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { Camera, User, Award, Trophy, Calendar, Edit2, Save, Trash2, Loader2 } from 'lucide-react';
import { useAuth } from '@auth/contexts/AuthContext';
import { useGamification } from '@gamification/hooks/useGamification';
import { storage, db, auth } from '@shared/config/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
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
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

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
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        name: formData.name,
        bio: formData.bio,
        school: formData.school,
        grade: formData.grade
      });

      if (auth.currentUser && formData.name !== user.displayName) {
        await updateProfile(auth.currentUser, {
          displayName: formData.name
        });
      }

      toast.success('Profile updated successfully');
      setEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size should be less than 5MB');
      return;
    }

    setUploading(true);
    const toastId = toast.loading('Uploading photo...');

    try {
      const fileRef = ref(storage, `avatars/${user.uid}/profile_${Date.now()}.jpg`);
      await uploadBytes(fileRef, file);
      const photoURL = await getDownloadURL(fileRef);

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { photoURL });
      }

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { photoURL });

      toast.success('Profile photo updated', { id: toastId });
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Failed to upload photo', { id: toastId });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeletePhoto = async () => {
    if (!user?.photoURL) return;
    if (!confirm('Remove your profile photo?')) return;

    setUploading(true);
    const toastId = toast.loading('Removing photo...');

    try {
      if (user.photoURL.includes('firebasestorage')) {
        try {
          const fileRef = ref(storage, user.photoURL);
          await deleteObject(fileRef);
        } catch (e) {
          console.warn('Could not delete file from storage', e);
        }
      }

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { photoURL: '' });
      }

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { photoURL: null });

      toast.success('Photo removed', { id: toastId });
    } catch (error) {
      console.error('Error removing photo:', error);
      toast.error('Failed to remove photo', { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={`font-['Inter',sans-serif] ${embedded ? 'w-full' : 'max-w-6xl mx-auto px-4 sm:px-6 lg:px-8'}`}>
      {/* Header - Only show if not embedded */}
      {!embedded && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-semibold text-gray-900 tracking-tight mb-2">
            Profile
          </h1>
          <p className="text-gray-500 text-sm">Manage your account and view your achievements</p>
        </motion.div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Profile Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Profile Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="bg-white border border-gray-200 rounded-2xl p-8 text-center hover:border-gray-300 transition-colors"
          >
            {/* Avatar & Upload Controls */}
            <div className="relative inline-block mb-6 group">
              <div className="w-32 h-32 rounded-full flex items-center justify-center overflow-hidden border-2 border-gray-200 shadow-sm">
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-600 text-3xl font-semibold">
                    {userData?.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}

                {uploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm rounded-full">
                    <Loader2 className="animate-spin text-white" size={32} strokeWidth={2} />
                  </div>
                )}
              </div>

              {/* Upload Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center hover:bg-gray-800 transition-colors text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={uploading}
                title="Upload Photo"
              >
                <Camera size={18} strokeWidth={2} />
              </button>

              {/* Delete Button */}
              {user?.photoURL && (
                <button
                  onClick={handleDeletePhoto}
                  className="absolute bottom-0 left-0 w-10 h-10 rounded-full bg-red-600 flex items-center justify-center hover:bg-red-700 transition-all text-white shadow-lg disabled:opacity-50 opacity-0 group-hover:opacity-100"
                  disabled={uploading}
                  title="Remove Photo"
                >
                  <Trash2 size={18} strokeWidth={2} />
                </button>
              )}

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/jpeg, image/png, image/webp"
                className="hidden"
              />
            </div>

            <h2 className="text-2xl font-semibold text-gray-900 mb-1">
              {userData?.name || 'User'}
            </h2>
            <p className="text-sm text-gray-500 mb-6">{user?.email}</p>

            {/* Level Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-50 border border-amber-200 mb-6">
              <Trophy size={18} className="text-amber-600" strokeWidth={2} />
              <span className="font-semibold text-gray-900 text-sm">Level {level || 1}</span>
            </div>

            {/* XP Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Progress to Level {(level || 1) + 1}</span>
                <span className="font-semibold text-gray-900">{xp || 0}/{nextLevelXp || 500}</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full bg-gray-900 transition-all duration-500"
                  style={{ width: `${levelProgress || 0}%` }}
                />
              </div>
            </div>
          </motion.div>

          {/* Stats Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="bg-white border border-gray-200 rounded-2xl p-6 hover:border-gray-300 transition-colors"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistics</h3>
            <div className="space-y-3">
              {stats.map((stat, index) => (
                <div key={index} className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-600">{stat.label}</span>
                  <span className="font-semibold text-gray-900">{stat.value}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Right Column - Details & Achievements */}
        <div className="lg:col-span-2 space-y-6">
          {/* Account Details */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="bg-white border border-gray-200 rounded-2xl p-8 hover:border-gray-300 transition-colors"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Account Details</h3>
              <button
                onClick={() => editing ? handleSave() : setEditing(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-900 text-sm font-medium transition-colors"
              >
                {editing ? (
                  <>
                    <Save size={16} strokeWidth={2} />
                    Save
                  </>
                ) : (
                  <>
                    <Edit2 size={16} strokeWidth={2} />
                    Edit
                  </>
                )}
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={!editing}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-900 text-sm focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 outline-none transition-all disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={user?.email}
                  disabled
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-gray-50 text-gray-500 text-sm cursor-not-allowed outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bio
                </label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  disabled={!editing}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-900 text-sm focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 outline-none transition-all disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed resize-none"
                  placeholder="Tell us about yourself..."
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    School
                  </label>
                  <input
                    type="text"
                    name="school"
                    value={formData.school}
                    onChange={handleChange}
                    disabled={!editing}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-900 text-sm focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 outline-none transition-all disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
                    placeholder="Your school name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Grade
                  </label>
                  <input
                    type="text"
                    name="grade"
                    value={formData.grade}
                    onChange={handleChange}
                    disabled={!editing}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-900 text-sm focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 outline-none transition-all disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
                    placeholder="Grade level"
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Achievements */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.4 }}
            className="bg-white border border-gray-200 rounded-2xl p-8 hover:border-gray-300 transition-colors"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Achievements</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {achievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className={`p-4 rounded-xl border transition-all ${achievement.earned
                      ? 'border-amber-200 bg-amber-50/50'
                      : 'border-gray-100 bg-gray-50 opacity-60'
                    }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${achievement.earned
                          ? 'bg-amber-100 text-amber-600'
                          : 'bg-gray-200 text-gray-400'
                        }`}
                    >
                      <Award size={20} strokeWidth={2} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 mb-1 text-sm">
                        {achievement.title}
                      </h4>
                      <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                        {achievement.description}
                      </p>
                      {achievement.earned && achievement.date && (
                        <div className="text-xs text-green-600 flex items-center gap-1 font-medium">
                          <Calendar size={12} strokeWidth={2} />
                          {achievement.date}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {achievements.length === 0 && (
              <div className="text-center py-12">
                <Award size={32} className="mx-auto text-gray-300 mb-3" strokeWidth={2} />
                <p className="text-sm text-gray-500">No achievements yet</p>
                <p className="text-xs text-gray-400 mt-1">Complete activities to earn badges</p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
