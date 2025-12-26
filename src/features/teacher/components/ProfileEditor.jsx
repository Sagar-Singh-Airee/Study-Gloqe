// src/features/teachers/components/ProfileEditor.jsx - FIXED

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Save, Loader, Plus, Trash2, Eye, EyeOff,
  User, Briefcase, School, Award, Link as LinkIcon,
  AlertCircle, CheckCircle2, Linkedin, Globe, BookOpen
} from 'lucide-react';
import { updateTeacherProfile } from '@teacher/services/profileService';
import { useAuth } from '@auth/contexts/AuthContext';
import toast from 'react-hot-toast';

const ProfileEditor = ({ profile, onClose, onUpdate }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    subjects: [],
    school: '',
    qualifications: [],
    experience: 0,
    socialLinks: {
      linkedin: '',
      website: ''
    },
    visibility: 'public'
  });

  const [newSubject, setNewSubject] = useState('');
  const [newQualification, setNewQualification] = useState('');

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        bio: profile.bio || '',
        subjects: profile.subjects || [],
        school: profile.school || '',
        qualifications: profile.qualifications || [],
        experience: profile.experience || 0,
        socialLinks: {
          linkedin: profile.socialLinks?.linkedin || '',
          website: profile.socialLinks?.website || ''
        },
        visibility: profile.visibility || 'public'
      });
    }
  }, [profile]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSocialLinkChange = (platform, value) => {
    setFormData(prev => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        [platform]: value
      }
    }));
  };

  const addSubject = () => {
    if (!newSubject.trim()) return;
    if (formData.subjects.includes(newSubject.trim())) {
      toast.error('Subject already added');
      return;
    }
    setFormData(prev => ({
      ...prev,
      subjects: [...prev.subjects, newSubject.trim()]
    }));
    setNewSubject('');
  };

  const removeSubject = (index) => {
    setFormData(prev => ({
      ...prev,
      subjects: prev.subjects.filter((_, i) => i !== index)
    }));
  };

  const addQualification = () => {
    if (!newQualification.trim()) return;
    if (formData.qualifications.includes(newQualification.trim())) {
      toast.error('Qualification already added');
      return;
    }
    setFormData(prev => ({
      ...prev,
      qualifications: [...prev.qualifications, newQualification.trim()]
    }));
    setNewQualification('');
  };

  const removeQualification = (index) => {
    setFormData(prev => ({
      ...prev,
      qualifications: prev.qualifications.filter((_, i) => i !== index)
    }));
  };

  const validateForm = () => {
    if (!formData.name?.trim()) {
      toast.error('Name is required');
      return false;
    }

    if (formData.bio && formData.bio.length > 500) {
      toast.error('Bio must be less than 500 characters');
      return false;
    }

    if (formData.experience < 0 || formData.experience > 50) {
      toast.error('Experience must be between 0 and 50 years');
      return false;
    }

    if (formData.socialLinks.linkedin && formData.socialLinks.linkedin.trim()) {
      try {
        new URL(formData.socialLinks.linkedin);
      } catch {
        toast.error('Invalid LinkedIn URL');
        return false;
      }
    }

    if (formData.socialLinks.website && formData.socialLinks.website.trim()) {
      try {
        new URL(formData.socialLinks.website);
      } catch {
        toast.error('Invalid website URL');
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      await updateTeacherProfile(user.uid, formData);
      toast.success('Profile updated successfully!');
      await onUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-teal-600 px-8 py-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-black text-white">Edit Profile</h2>
            <p className="text-sm text-white/90 mt-1 font-medium">Update your teaching profile</p>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 hover:bg-white/20 rounded-xl transition-all"
          >
            <X size={22} className="text-white" />
          </button>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8">
          {/* Basic Information */}
          <div className="space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
                <User size={20} className="text-white" />
              </div>
              <h3 className="text-lg font-black text-gray-900">Basic Information</h3>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="John Doe"
                className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all font-medium text-gray-900"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Bio
                <span className="text-gray-500 font-medium ml-2">
                  ({formData.bio.length}/500)
                </span>
              </label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                placeholder="Tell students about yourself, your teaching philosophy, and experience..."
                rows={4}
                maxLength={500}
                className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all resize-none font-medium text-gray-900"
              />
            </div>
          </div>

          {/* Teaching Details */}
          <div className="space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-600 to-teal-700 rounded-xl flex items-center justify-center">
                <BookOpen size={20} className="text-white" />
              </div>
              <h3 className="text-lg font-black text-gray-900">Teaching Details</h3>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                School/Institution
              </label>
              <div className="relative">
                <School size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  name="school"
                  value={formData.school}
                  onChange={handleChange}
                  placeholder="ABC High School"
                  className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all font-medium text-gray-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Years of Experience
              </label>
              <div className="relative">
                <Briefcase size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="number"
                  name="experience"
                  value={formData.experience}
                  onChange={handleChange}
                  min="0"
                  max="50"
                  placeholder="5"
                  className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all font-medium text-gray-900"
                />
              </div>
            </div>

            {/* Subjects */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Subjects You Teach
              </label>

              {formData.subjects.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {formData.subjects.map((subject, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-xl font-bold text-sm shadow-md"
                    >
                      <span>{subject}</span>
                      <button
                        onClick={() => removeSubject(idx)}
                        className="hover:bg-white/20 rounded-lg p-1 transition-all"
                      >
                        <X size={14} />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSubject())}
                  placeholder="e.g., Mathematics"
                  className="flex-1 px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all font-medium text-gray-900"
                />
                <button
                  onClick={addSubject}
                  className="px-6 py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-bold hover:shadow-lg active:scale-95 transition-all flex items-center gap-2"
                >
                  <Plus size={18} />
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Qualifications */}
          <div className="space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl flex items-center justify-center">
                <Award size={20} className="text-white" />
              </div>
              <h3 className="text-lg font-black text-gray-900">Qualifications</h3>
            </div>

            {formData.qualifications.length > 0 && (
              <div className="space-y-2 mb-3">
                {formData.qualifications.map((qual, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -20, opacity: 0 }}
                    className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-xl group border border-gray-100"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle2 size={20} className="text-green-600 flex-shrink-0" />
                      <span className="text-gray-900 font-semibold">{qual}</span>
                    </div>
                    <button
                      onClick={() => removeQualification(idx)}
                      className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 size={18} className="text-red-600" />
                    </button>
                  </motion.div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                value={newQualification}
                onChange={(e) => setNewQualification(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addQualification())}
                placeholder="e.g., MSc in Mathematics"
                className="flex-1 px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all font-medium text-gray-900"
              />
              <button
                onClick={addQualification}
                className="px-6 py-3.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl font-bold hover:shadow-lg active:scale-95 transition-all flex items-center gap-2"
              >
                <Plus size={18} />
                Add
              </button>
            </div>
          </div>

          {/* Social Links */}
          <div className="space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl flex items-center justify-center">
                <LinkIcon size={20} className="text-white" />
              </div>
              <h3 className="text-lg font-black text-gray-900">Social Links</h3>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                LinkedIn Profile
              </label>
              <div className="relative">
                <Linkedin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600" />
                <input
                  type="url"
                  value={formData.socialLinks.linkedin}
                  onChange={(e) => handleSocialLinkChange('linkedin', e.target.value)}
                  placeholder="https://linkedin.com/in/yourprofile"
                  className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all font-medium text-gray-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Personal Website
              </label>
              <div className="relative">
                <Globe size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" />
                <input
                  type="url"
                  value={formData.socialLinks.website}
                  onChange={(e) => handleSocialLinkChange('website', e.target.value)}
                  placeholder="https://yourwebsite.com"
                  className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all font-medium text-gray-900"
                />
              </div>
            </div>
          </div>

          {/* Visibility */}
          <div className="space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
              <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-green-700 rounded-xl flex items-center justify-center">
                <Eye size={20} className="text-white" />
              </div>
              <h3 className="text-lg font-black text-gray-900">Privacy Settings</h3>
            </div>

            <div className="p-5 bg-gray-50 border-2 border-gray-200 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${formData.visibility === 'public' ? 'bg-green-600' : 'bg-gray-400'
                    }`}>
                    {formData.visibility === 'public' ? (
                      <Eye size={22} className="text-white" />
                    ) : (
                      <EyeOff size={22} className="text-white" />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">Profile Visibility</p>
                    <p className="text-sm text-gray-600 mt-0.5">
                      {formData.visibility === 'public'
                        ? 'Students can view your profile'
                        : 'Your profile is hidden'
                      }
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    visibility: prev.visibility === 'public' ? 'private' : 'public'
                  }))}
                  className={`relative w-16 h-8 rounded-full transition-colors ${formData.visibility === 'public' ? 'bg-green-600' : 'bg-gray-300'
                    }`}
                >
                  <motion.div
                    animate={{ x: formData.visibility === 'public' ? 32 : 4 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-lg"
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="flex items-start gap-4 p-5 bg-gradient-to-br from-blue-50 to-teal-50 border-2 border-blue-200 rounded-xl">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <AlertCircle size={20} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-gray-900 mb-2">Profile Tips</p>
              <ul className="space-y-1.5 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>Complete all sections for better visibility</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-1">•</span>
                  <span>Add at least 3 subjects for better matching</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Include qualifications to build trust</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-8 py-5 flex items-center justify-between shadow-lg">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-6 py-3 border-2 border-gray-300 rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2.5 px-8 py-3 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-xl font-bold hover:shadow-xl active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader size={18} className="animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save size={18} />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ProfileEditor;
