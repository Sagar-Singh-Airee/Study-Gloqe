// src/features/students/components/TeacherPublicProfile.jsx

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  User, Mail, School, Award, Briefcase, BookOpen,
  Users, Trophy, Globe, Linkedin, ExternalLink,
  ArrowLeft, Shield, AlertCircle, Loader, Clock,
  MessageSquare, Calendar, Star
} from 'lucide-react';
import { useAuth } from '@auth/contexts/AuthContext';
import { getPublicTeacherProfile } from '@teacher/services/profileService';
import { db } from '@shared/config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import toast from 'react-hot-toast';

const TeacherPublicProfile = () => {
  const { teacherId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [sharedClasses, setSharedClasses] = useState([]);

  // Check if student has access to view this teacher
  useEffect(() => {
    checkAccessAndLoadProfile();
  }, [teacherId, user]);

  const checkAccessAndLoadProfile = async () => {
    if (!user?.uid || !teacherId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Check if student is enrolled in any of teacher's classes
      const classesQuery = query(
        collection(db, 'classes'),
        where('teacherId', '==', teacherId),
        where('students', 'array-contains', user.uid),
        where('active', '==', true)
      );

      const classesSnap = await getDocs(classesQuery);
      
      if (classesSnap.empty) {
        // Student is NOT in any of this teacher's classes
        setHasAccess(false);
        setLoading(false);
        toast.error('You do not have access to view this profile');
        return;
      }

      // Student has access - get shared classes
      const classes = [];
      classesSnap.forEach(doc => {
        classes.push({
          id: doc.id,
          ...doc.data()
        });
      });
      setSharedClasses(classes);
      setHasAccess(true);

      // Load teacher's public profile
      const teacherProfile = await getPublicTeacherProfile(teacherId);
      setProfile(teacherProfile);

    } catch (error) {
      console.error('Error loading teacher profile:', error);
      toast.error('Failed to load teacher profile');
      setHasAccess(false);
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="w-16 h-16 border-4 border-gray-200 rounded-full"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-600 font-medium">Loading teacher profile...</p>
        </div>
      </div>
    );
  }

  // No access - show restricted message
  if (!hasAccess || !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white border-2 border-red-200 rounded-2xl p-8 text-center"
        >
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield size={32} className="text-red-600" />
          </div>
          <h2 className="text-2xl font-black text-black mb-2">Access Restricted</h2>
          <p className="text-gray-600 mb-6">
            You can only view profiles of teachers whose classes you're enrolled in.
          </p>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-black text-white rounded-xl font-bold hover:scale-105 transition-transform"
          >
            <ArrowLeft size={18} />
            Go Back
          </button>
        </motion.div>
      </div>
    );
  }

  // Main content - Student can view teacher profile
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Back Button */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-black font-medium transition-colors"
          >
            <ArrowLeft size={20} />
            Back to Classes
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="bg-gradient-to-br from-black via-gray-900 to-black text-white">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Profile Photo */}
            <img
              src={profile.photoURL || `https://ui-avatars.com/api/?name=${profile.name}&background=000&color=fff&bold=true&size=200`}
              alt={profile.name}
              className="w-28 h-28 rounded-2xl object-cover ring-4 ring-white/20"
            />

            {/* Name & Info */}
            <div className="flex-1">
              <h1 className="text-3xl font-black mb-2">{profile.name}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-300 mb-4">
                <div className="flex items-center gap-2">
                  <Mail size={16} />
                  <span>{profile.email}</span>
                </div>
                {profile.school && (
                  <div className="flex items-center gap-2">
                    <School size={16} />
                    <span>{profile.school}</span>
                  </div>
                )}
                {profile.experience > 0 && (
                  <div className="flex items-center gap-2">
                    <Briefcase size={16} />
                    <span>{profile.experience} years experience</span>
                  </div>
                )}
              </div>

              {/* Shared Classes Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl">
                <Users size={16} className="text-green-400" />
                <span className="text-sm font-bold">
                  You're in {sharedClasses.length} {sharedClasses.length === 1 ? 'class' : 'classes'} with this teacher
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 -mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Stats & Classes */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-gray-200 rounded-2xl p-6"
            >
              <h3 className="text-lg font-black mb-4 flex items-center gap-2">
                <Trophy size={20} />
                Statistics
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                      <BookOpen size={20} className="text-white" />
                    </div>
                    <span className="font-bold text-gray-700">Classes</span>
                  </div>
                  <span className="text-xl font-black text-blue-600">
                    {profile.stats.totalClasses}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                      <Users size={20} className="text-white" />
                    </div>
                    <span className="font-bold text-gray-700">Students</span>
                  </div>
                  <span className="text-xl font-black text-green-600">
                    {profile.stats.totalStudents}
                  </span>
                </div>

                {profile.stats.rating > 0 && (
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center">
                        <Star size={20} className="text-white" />
                      </div>
                      <span className="font-bold text-gray-700">Rating</span>
                    </div>
                    <span className="text-xl font-black text-yellow-600">
                      {profile.stats.rating.toFixed(1)} ⭐
                    </span>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Shared Classes */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white border border-gray-200 rounded-2xl p-6"
            >
              <h3 className="text-lg font-black mb-4 flex items-center gap-2">
                <BookOpen size={20} />
                Your Classes
              </h3>
              
              <div className="space-y-2">
                {sharedClasses.map((cls) => (
                  <div
                    key={cls.id}
                    className="p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                    onClick={() => navigate(`/student/class/${cls.id}`)}
                  >
                    <p className="font-bold text-black">{cls.name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {cls.subject} • {cls.section}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white border border-gray-200 rounded-2xl p-6"
            >
              <h3 className="text-lg font-black mb-4">Quick Actions</h3>
              
              <div className="space-y-2">
                <button
                  onClick={() => window.location.href = `mailto:${profile.email}`}
                  className="w-full flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors font-medium"
                >
                  <Mail size={18} className="text-blue-600" />
                  <span className="text-gray-700">Send Email</span>
                </button>
                
                <button
                  className="w-full flex items-center gap-3 p-3 bg-green-50 hover:bg-green-100 rounded-xl transition-colors font-medium"
                >
                  <MessageSquare size={18} className="text-green-600" />
                  <span className="text-gray-700">Send Message</span>
                </button>
              </div>
            </motion.div>
          </div>

          {/* Right Column - Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Bio */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white border border-gray-200 rounded-2xl p-6"
            >
              <h3 className="text-lg font-black mb-4">About</h3>
              {profile.bio ? (
                <p className="text-gray-700 leading-relaxed">{profile.bio}</p>
              ) : (
                <p className="text-gray-500 italic">No bio available</p>
              )}
            </motion.div>

            {/* Subjects */}
            {profile.subjects?.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="bg-white border border-gray-200 rounded-2xl p-6"
              >
                <h3 className="text-lg font-black mb-4">Subjects Taught</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.subjects.map((subject, idx) => (
                    <span
                      key={idx}
                      className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl font-bold text-sm"
                    >
                      {subject}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Qualifications */}
            {profile.qualifications?.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white border border-gray-200 rounded-2xl p-6"
              >
                <h3 className="text-lg font-black mb-4 flex items-center gap-2">
                  <Award size={20} />
                  Qualifications
                </h3>
                <ul className="space-y-2">
                  {profile.qualifications.map((qual, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl"
                    >
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-gray-700 font-medium">{qual}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}

            {/* Social Links */}
            {(profile.socialLinks?.linkedin || profile.socialLinks?.website) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="bg-white border border-gray-200 rounded-2xl p-6"
              >
                <h3 className="text-lg font-black mb-4 flex items-center gap-2">
                  <Globe size={20} />
                  Connect
                </h3>
                <div className="space-y-3">
                  {profile.socialLinks.linkedin && (
                    <a
                      href={profile.socialLinks.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <Linkedin size={20} className="text-blue-600" />
                        <span className="font-medium text-gray-700">LinkedIn</span>
                      </div>
                      <ExternalLink size={16} className="text-gray-400 group-hover:text-blue-600" />
                    </a>
                  )}
                  
                  {profile.socialLinks.website && (
                    <a
                      href={profile.socialLinks.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <Globe size={20} className="text-gray-600" />
                        <span className="font-medium text-gray-700">Website</span>
                      </div>
                      <ExternalLink size={16} className="text-gray-400 group-hover:text-gray-600" />
                    </a>
                  )}
                </div>
              </motion.div>
            )}

            {/* Member Since */}
            {profile.joinedDate && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex items-center justify-center gap-2 text-sm text-gray-500 py-4"
              >
                <Clock size={16} />
                <span>
                  Teaching on StudyGloqe since{' '}
                  {new Date(profile.joinedDate).toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric'
                  })}
                </span>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherPublicProfile;
