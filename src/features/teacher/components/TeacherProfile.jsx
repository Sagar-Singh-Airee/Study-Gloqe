// src/features/teachers/components/TeacherProfile.jsx - REDESIGNED

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Mail, School, Award, Briefcase, Calendar, MapPin,
  Edit3, Camera, CheckCircle2, AlertCircle, Sparkles,
  BookOpen, Users, Trophy, Globe, Linkedin, ExternalLink,
  Shield, Eye, EyeOff, Share2, Copy, Check
} from 'lucide-react';
import { useAuth } from '@auth/contexts/AuthContext';
import {
  getTeacherProfile,
  uploadProfilePhoto,
  initializeTeacherProfile
} from '@teacher/services/profileService';
import toast from 'react-hot-toast';
import ProfileEditor from './ProfileEditor';

const TeacherProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState({
    totalClasses: 0,
    totalStudents: 0,
    rating: 0,
    reviewCount: 0
  });

  // Load profile
  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user?.uid) return;

    try {
      setLoading(true);

      // Initialize profile if needed
      await initializeTeacherProfile(user.uid);

      // Get full profile
      const profileData = await getTeacherProfile(user.uid);
      setProfile(profileData);

      // Set stats
      if (profileData.stats) {
        setStats(profileData.stats);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  // Handle photo upload
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingPhoto(true);
      const result = await uploadProfilePhoto(user.uid, file);

      setProfile(prev => ({ ...prev, photoURL: result.photoURL }));
      toast.success('Profile photo updated!');
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error(error.message || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Copy profile link
  const copyProfileLink = () => {
    const link = `${window.location.origin}/teacher/${user.uid}/public`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success('Profile link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  // Profile completion percentage
  const getCompletionPercentage = () => {
    if (!profile) return 0;

    const fields = [
      profile.name,
      profile.bio,
      profile.subjects?.length > 0,
      profile.school,
      profile.qualifications?.length > 0,
      profile.experience > 0,
      profile.photoURL
    ];

    const completed = fields.filter(Boolean).length;
    return Math.round((completed / fields.length) * 100);
  };

  const completionPercentage = getCompletionPercentage();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-white">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="w-16 h-16 border-4 border-gray-200 rounded-full"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-sm font-semibold text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Header - Royal Blue/Teal Gradient */}
      <div className="relative bg-gradient-to-br from-blue-600 via-blue-500 to-teal-500 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }} />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 py-12">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-8">
            {/* Profile Photo */}
            <div className="relative group">
              <div className="relative">
                <img
                  src={profile?.photoURL || `https://ui-avatars.com/api/?name=${profile?.name}&background=3B82F6&color=fff&bold=true&size=200`}
                  alt={profile?.name}
                  className="w-32 h-32 rounded-3xl object-cover ring-4 ring-white/30 shadow-2xl"
                />
                {uploadingPhoto && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-3xl flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>

              {/* Upload Photo Button */}
              <label className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <div className="text-center">
                  <Camera size={28} className="text-white mx-auto mb-1" />
                  <span className="text-xs font-bold text-white">Change Photo</span>
                </div>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/jpg,image/webp"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  disabled={uploadingPhoto}
                />
              </label>
            </div>

            {/* Name & Info */}
            <div className="flex-1">
              <h1 className="text-4xl font-black text-white mb-3 tracking-tight">
                {profile?.name || 'Teacher'}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-white/90 font-medium">
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-xl px-3 py-1.5 rounded-lg">
                  <Mail size={16} />
                  <span>{profile?.email}</span>
                </div>
                {profile?.school && (
                  <div className="flex items-center gap-2 bg-white/10 backdrop-blur-xl px-3 py-1.5 rounded-lg">
                    <School size={16} />
                    <span>{profile.school}</span>
                  </div>
                )}
                {profile?.experience > 0 && (
                  <div className="flex items-center gap-2 bg-white/10 backdrop-blur-xl px-3 py-1.5 rounded-lg">
                    <Briefcase size={16} />
                    <span>{profile.experience} years</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={copyProfileLink}
                className="flex items-center gap-2 px-5 py-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl font-bold text-white hover:bg-white/20 transition-all shadow-lg"
              >
                {copied ? <Check size={18} /> : <Share2 size={18} />}
                <span className="hidden sm:inline">{copied ? 'Copied!' : 'Share'}</span>
              </button>

              <button
                onClick={() => setShowEditor(true)}
                className="flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-xl font-bold hover:scale-105 active:scale-95 transition-transform shadow-xl"
              >
                <Edit3 size={18} />
                <span>Edit Profile</span>
              </button>
            </div>
          </div>

          {/* Profile Completion Bar */}
          {completionPercentage < 100 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center">
                    <Sparkles size={16} className="text-yellow-900" />
                  </div>
                  <span className="font-bold text-white">Complete Your Profile</span>
                </div>
                <span className="text-sm font-black text-white">{completionPercentage}%</span>
              </div>
              <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${completionPercentage}%` }}
                  transition={{ duration: 0.5 }}
                  className="h-full bg-gradient-to-r from-yellow-400 via-orange-400 to-orange-500 shadow-lg"
                />
              </div>
              <p className="text-sm text-white/80 mt-2 font-medium">
                Complete your profile to help students connect with you better
              </p>
            </motion.div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Stats */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-2 mb-5">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <Trophy size={20} className="text-white" />
                </div>
                <h3 className="text-lg font-black text-gray-900">Your Stats</h3>
              </div>

              <div className="space-y-3">
                <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                        <BookOpen size={22} className="text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Classes</p>
                        <p className="text-2xl font-black text-gray-900">{stats.totalClasses}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl border border-teal-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                        <Users size={22} className="text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-teal-600 uppercase tracking-wide">Students</p>
                        <p className="text-2xl font-black text-gray-900">{stats.totalStudents}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {stats.rating > 0 && (
                  <div className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl border border-amber-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg">
                          <Trophy size={22} className="text-white" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Rating</p>
                          <p className="text-2xl font-black text-gray-900">
                            {stats.rating.toFixed(1)} ⭐
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Visibility Status */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Shield size={20} className="text-white" />
                </div>
                <h3 className="text-lg font-black text-gray-900">Visibility</h3>
              </div>

              <div className={`p-4 rounded-xl border-2 ${profile?.visibility === 'public'
                  ? 'bg-green-50 border-green-300'
                  : 'bg-gray-50 border-gray-300'
                }`}>
                <div className="flex items-center gap-3 mb-2">
                  {profile?.visibility === 'public' ? (
                    <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                      <Eye size={20} className="text-white" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 bg-gray-500 rounded-lg flex items-center justify-center">
                      <EyeOff size={20} className="text-white" />
                    </div>
                  )}
                  <div>
                    <p className="font-black text-gray-900">
                      {profile?.visibility === 'public' ? 'Public' : 'Private'}
                    </p>
                    <p className="text-xs text-gray-600 font-medium">
                      {profile?.visibility === 'public'
                        ? 'Visible to enrolled students'
                        : 'Hidden from students'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Column - Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Bio */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <h3 className="text-xl font-black text-gray-900 mb-4">About Me</h3>
              {profile?.bio ? (
                <p className="text-gray-700 leading-relaxed font-medium">{profile.bio}</p>
              ) : (
                <div className="flex items-start gap-3 p-4 bg-amber-50 border-2 border-amber-200 rounded-xl">
                  <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-amber-900 mb-1">No bio yet</p>
                    <p className="text-sm text-amber-700">Add a bio to tell students about yourself</p>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Subjects */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <h3 className="text-xl font-black text-gray-900 mb-4">Subjects I Teach</h3>
              {profile?.subjects?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profile.subjects.map((subject, idx) => (
                    <span
                      key={idx}
                      className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-teal-500 text-white rounded-xl font-bold text-sm shadow-lg hover:scale-105 transition-transform"
                    >
                      {subject}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="flex items-start gap-3 p-4 bg-amber-50 border-2 border-amber-200 rounded-xl">
                  <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-amber-900 mb-1">No subjects added</p>
                    <p className="text-sm text-amber-700">Add subjects you teach</p>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Qualifications */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Award size={20} className="text-white" />
                </div>
                <h3 className="text-xl font-black text-gray-900">Qualifications</h3>
              </div>
              {profile?.qualifications?.length > 0 ? (
                <ul className="space-y-2">
                  {profile.qualifications.map((qual, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200"
                    >
                      <CheckCircle2 size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-900 font-semibold">{qual}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex items-start gap-3 p-4 bg-amber-50 border-2 border-amber-200 rounded-xl">
                  <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-amber-900 mb-1">No qualifications added</p>
                    <p className="text-sm text-amber-700">Add your educational qualifications</p>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Social Links */}
            {(profile?.socialLinks?.linkedin || profile?.socialLinks?.website) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-teal-500 rounded-xl flex items-center justify-center">
                    <Globe size={20} className="text-white" />
                  </div>
                  <h3 className="text-xl font-black text-gray-900">Connect</h3>
                </div>
                <div className="space-y-3">
                  {profile.socialLinks.linkedin && (
                    <a
                      href={profile.socialLinks.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-4 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors group border-2 border-blue-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                          <Linkedin size={20} className="text-white" />
                        </div>
                        <span className="font-bold text-gray-900">LinkedIn</span>
                      </div>
                      <ExternalLink size={18} className="text-gray-400 group-hover:text-blue-600 transition-colors" />
                    </a>
                  )}

                  {profile.socialLinks.website && (
                    <a
                      href={profile.socialLinks.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors group border-2 border-gray-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-600 rounded-lg flex items-center justify-center">
                          <Globe size={20} className="text-white" />
                        </div>
                        <span className="font-bold text-gray-900">Website</span>
                      </div>
                      <ExternalLink size={18} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
                    </a>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Profile Editor Modal */}
      <AnimatePresence>
        {showEditor && (
          <ProfileEditor
            profile={profile}
            onClose={() => setShowEditor(false)}
            onUpdate={loadProfile}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default TeacherProfile;
