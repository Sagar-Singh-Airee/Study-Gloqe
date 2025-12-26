// src/features/teachers/services/profileService.js

import { db, storage } from '@shared/config/firebase';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  setDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs 
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';

/**
 * Get teacher's full profile
 */
export const getTeacherProfile = async (teacherId) => {
  try {
    const teacherRef = doc(db, 'users', teacherId);
    const teacherSnap = await getDoc(teacherRef);

    if (!teacherSnap.exists()) {
      throw new Error('Teacher not found');
    }

    const data = teacherSnap.data();
    
    // Ensure teacher role
    if (data.role !== 'teacher') {
      throw new Error('User is not a teacher');
    }

    return {
      id: teacherSnap.id,
      ...data,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate()
    };
  } catch (error) {
    console.error('Error getting teacher profile:', error);
    throw error;
  }
};

/**
 * Get public teacher profile (for students)
 */
export const getPublicTeacherProfile = async (teacherId) => {
  try {
    const profile = await getTeacherProfile(teacherId);

    // Get teacher's class statistics
    const classesQuery = query(
      collection(db, 'classes'),
      where('teacherId', '==', teacherId),
      where('active', '==', true)
    );
    const classesSnap = await getDocs(classesQuery);
    
    const totalClasses = classesSnap.size;
    let totalStudents = 0;
    
    classesSnap.forEach(doc => {
      const classData = doc.data();
      totalStudents += classData.students?.length || 0;
    });

    // Return only public fields
    return {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      photoURL: profile.photoURL,
      bio: profile.bio || '',
      subjects: profile.subjects || [],
      school: profile.school || '',
      qualifications: profile.qualifications || [],
      experience: profile.experience || 0,
      socialLinks: profile.socialLinks || {},
      stats: {
        totalClasses,
        totalStudents,
        rating: profile.stats?.rating || 0,
        reviewCount: profile.stats?.reviewCount || 0
      },
      joinedDate: profile.createdAt,
      isPublic: profile.visibility !== 'private'
    };
  } catch (error) {
    console.error('Error getting public teacher profile:', error);
    throw error;
  }
};

/**
 * Update teacher profile
 */
export const updateTeacherProfile = async (teacherId, updates) => {
  try {
    const teacherRef = doc(db, 'users', teacherId);
    
    // Validate updates
    const allowedFields = [
      'name',
      'bio',
      'subjects',
      'school',
      'qualifications',
      'experience',
      'socialLinks',
      'visibility',
      'photoURL'
    ];

    const validUpdates = {};
    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        validUpdates[key] = updates[key];
      }
    });

    // Check if profile is complete
    const isComplete = !!(
      validUpdates.name &&
      validUpdates.bio &&
      validUpdates.subjects?.length > 0 &&
      validUpdates.school
    );

    const updateData = {
      ...validUpdates,
      isProfileComplete: isComplete,
      updatedAt: serverTimestamp()
    };

    await updateDoc(teacherRef, updateData);

    return {
      success: true,
      message: 'Profile updated successfully',
      isProfileComplete: isComplete
    };
  } catch (error) {
    console.error('Error updating teacher profile:', error);
    throw new Error(error.message || 'Failed to update profile');
  }
};

/**
 * Upload profile photo
 */
export const uploadProfilePhoto = async (teacherId, file) => {
  try {
    // Validate file
    if (!file) {
      throw new Error('No file provided');
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      throw new Error('Invalid file type. Please upload JPG, PNG, or WEBP');
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error('File too large. Maximum size is 5MB');
    }

    // Create unique filename
    const timestamp = Date.now();
    const filename = `${teacherId}_${timestamp}.${file.name.split('.').pop()}`;
    const storageRef = ref(storage, `teachers/profiles/${filename}`);

    // Delete old photo if exists
    try {
      const teacherDoc = await getDoc(doc(db, 'users', teacherId));
      const oldPhotoURL = teacherDoc.data()?.photoURL;
      
      if (oldPhotoURL && oldPhotoURL.includes('firebase')) {
        const oldPhotoRef = ref(storage, oldPhotoURL);
        await deleteObject(oldPhotoRef);
      }
    } catch (err) {
      console.log('No old photo to delete or error deleting:', err);
    }

    // Upload new photo
    const snapshot = await uploadBytes(storageRef, file, {
      contentType: file.type,
      customMetadata: {
        teacherId,
        uploadedAt: new Date().toISOString()
      }
    });

    const photoURL = await getDownloadURL(snapshot.ref);

    // Update user document
    await updateDoc(doc(db, 'users', teacherId), {
      photoURL,
      updatedAt: serverTimestamp()
    });

    return {
      success: true,
      photoURL,
      message: 'Profile photo updated successfully'
    };
  } catch (error) {
    console.error('Error uploading profile photo:', error);
    throw new Error(error.message || 'Failed to upload photo');
  }
};

/**
 * Initialize teacher profile with defaults
 */
export const initializeTeacherProfile = async (teacherId, initialData = {}) => {
  try {
    const teacherRef = doc(db, 'users', teacherId);
    const teacherSnap = await getDoc(teacherRef);

    if (!teacherSnap.exists()) {
      throw new Error('Teacher not found');
    }

    const existingData = teacherSnap.data();

    // Only initialize if fields don't exist
    const updates = {};
    
    if (!existingData.bio) updates.bio = initialData.bio || '';
    if (!existingData.subjects) updates.subjects = initialData.subjects || [];
    if (!existingData.school) updates.school = initialData.school || '';
    if (!existingData.qualifications) updates.qualifications = initialData.qualifications || [];
    if (!existingData.experience) updates.experience = initialData.experience || 0;
    if (!existingData.socialLinks) updates.socialLinks = initialData.socialLinks || {};
    if (!existingData.visibility) updates.visibility = initialData.visibility || 'public';
    if (!existingData.isProfileComplete) updates.isProfileComplete = false;

    if (Object.keys(updates).length > 0) {
      updates.updatedAt = serverTimestamp();
      await updateDoc(teacherRef, updates);
    }

    return { success: true, message: 'Profile initialized' };
  } catch (error) {
    console.error('Error initializing teacher profile:', error);
    throw error;
  }
};

/**
 * Update teacher statistics (called internally)
 */
export const updateTeacherStats = async (teacherId, stats) => {
  try {
    const teacherRef = doc(db, 'users', teacherId);
    
    await updateDoc(teacherRef, {
      'stats.totalClasses': stats.totalClasses || 0,
      'stats.totalStudents': stats.totalStudents || 0,
      'stats.rating': stats.rating || 0,
      'stats.reviewCount': stats.reviewCount || 0,
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating teacher stats:', error);
    throw error;
  }
};

/**
 * Search teachers by subject or school
 */
export const searchTeachers = async (searchTerm, filters = {}) => {
  try {
    let q = query(
      collection(db, 'users'),
      where('role', '==', 'teacher'),
      where('visibility', '==', 'public')
    );

    // Apply filters
    if (filters.subject) {
      q = query(q, where('subjects', 'array-contains', filters.subject));
    }

    if (filters.school) {
      q = query(q, where('school', '==', filters.school));
    }

    const snapshot = await getDocs(q);
    const teachers = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      
      // Filter by search term (client-side)
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesName = data.name?.toLowerCase().includes(term);
        const matchesSubjects = data.subjects?.some(s => 
          s.toLowerCase().includes(term)
        );
        
        if (!matchesName && !matchesSubjects) return;
      }

      teachers.push({
        id: doc.id,
        name: data.name,
        photoURL: data.photoURL,
        subjects: data.subjects || [],
        school: data.school,
        experience: data.experience || 0,
        stats: data.stats || {}
      });
    });

    return teachers;
  } catch (error) {
    console.error('Error searching teachers:', error);
    throw error;
  }
};

/**
 * Check if student has access to view teacher profile
 * Returns true if student is enrolled in at least one of teacher's classes
 */
export const canStudentViewTeacher = async (studentId, teacherId) => {
  try {
    if (!studentId || !teacherId) {
      return false;
    }

    const classesQuery = query(
      collection(db, 'classes'),
      where('teacherId', '==', teacherId),
      where('students', 'array-contains', studentId),
      where('active', '==', true)
    );

    const classesSnap = await getDocs(classesQuery);
    return !classesSnap.empty;
  } catch (error) {
    console.error('Error checking student access:', error);
    return false;
  }
};

/**
 * Get all classes shared between student and teacher
 * Useful for displaying which classes they have together
 */
export const getSharedClasses = async (studentId, teacherId) => {
  try {
    if (!studentId || !teacherId) {
      return [];
    }

    const classesQuery = query(
      collection(db, 'classes'),
      where('teacherId', '==', teacherId),
      where('students', 'array-contains', studentId),
      where('active', '==', true)
    );

    const classesSnap = await getDocs(classesQuery);
    const classes = [];

    classesSnap.forEach(doc => {
      classes.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      });
    });

    return classes;
  } catch (error) {
    console.error('Error getting shared classes:', error);
    return [];
  }
};
