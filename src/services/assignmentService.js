// src/services/assignmentService.js

import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  arrayUnion
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/config/firebase';
import toast from 'react-hot-toast';

// ==========================================
// CREATE ASSIGNMENT (Teacher)
// ==========================================
export const createAssignment = async (assignmentData) => {
  try {
    const {
      teacherId,
      classId,
      title,
      description,
      dueDate,
      totalPoints,
      attachments = [],
      type = 'assignment' // 'assignment', 'quiz', 'test'
    } = assignmentData;

    // Validation
    if (!teacherId || !classId || !title || !dueDate) {
      throw new Error('Missing required fields');
    }

    const assignment = {
      teacherId,
      classId,
      title,
      description: description || '',
      dueDate: new Date(dueDate),
      totalPoints: totalPoints || 100,
      attachments,
      type,
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      submissions: [],
      submissionCount: 0
    };

    const docRef = await addDoc(collection(db, 'assignments'), assignment);
    
    // Update class with assignment reference
    const classRef = doc(db, 'classes', classId);
    await updateDoc(classRef, {
      assignments: arrayUnion(docRef.id),
      updatedAt: serverTimestamp()
    });

    console.log('✅ Assignment created:', docRef.id);
    toast.success('Assignment created successfully!');
    return docRef.id;
  } catch (error) {
    console.error('❌ Error creating assignment:', error);
    toast.error('Failed to create assignment');
    throw error;
  }
};

// ==========================================
// GET CLASS ASSIGNMENTS
// ==========================================
export const getClassAssignments = async (classId) => {
  try {
    const q = query(
      collection(db, 'assignments'),
      where('classId', '==', classId),
      where('status', '==', 'active'),
      orderBy('dueDate', 'desc')
    );

    const snapshot = await getDocs(q);
    const assignments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      dueDate: doc.data().dueDate?.toDate?.() || new Date(),
      createdAt: doc.data().createdAt?.toDate?.() || new Date()
    }));

    return assignments;
  } catch (error) {
    console.error('Error fetching assignments:', error);
    return [];
  }
};

// ==========================================
// GET SINGLE ASSIGNMENT
// ==========================================
export const getAssignment = async (assignmentId) => {
  try {
    const docRef = doc(db, 'assignments', assignmentId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error('Assignment not found');
    }

    return {
      id: docSnap.id,
      ...docSnap.data(),
      dueDate: docSnap.data().dueDate?.toDate?.() || new Date(),
      createdAt: docSnap.data().createdAt?.toDate?.() || new Date()
    };
  } catch (error) {
    console.error('Error fetching assignment:', error);
    throw error;
  }
};

// ==========================================
// SUBMIT ASSIGNMENT (Student)
// ==========================================
export const submitAssignment = async (assignmentId, userId, submissionData) => {
  try {
    const { text, files = [] } = submissionData;

    // Upload files if any
    let uploadedFiles = [];
    for (const file of files) {
      const fileRef = ref(storage, `submissions/${assignmentId}/${userId}/${file.name}`);
      await uploadBytes(fileRef, file);
      const downloadURL = await getDownloadURL(fileRef);
      uploadedFiles.push({
        name: file.name,
        url: downloadURL,
        size: file.size,
        type: file.type
      });
    }

    const submission = {
      assignmentId,
      userId,
      text: text || '',
      files: uploadedFiles,
      submittedAt: serverTimestamp(),
      status: 'submitted',
      grade: null,
      feedback: null
    };

    const docRef = await addDoc(collection(db, 'submissions'), submission);

    // Update assignment submission count
    const assignmentRef = doc(db, 'assignments', assignmentId);
    await updateDoc(assignmentRef, {
      submissions: arrayUnion(docRef.id),
      submissionCount: (await getDoc(assignmentRef)).data().submissionCount + 1,
      updatedAt: serverTimestamp()
    });

    console.log('✅ Assignment submitted:', docRef.id);
    toast.success('Assignment submitted successfully!');
    return docRef.id;
  } catch (error) {
    console.error('❌ Error submitting assignment:', error);
    toast.error('Failed to submit assignment');
    throw error;
  }
};

// ==========================================
// GET STUDENT SUBMISSION
// ==========================================
export const getStudentSubmission = async (assignmentId, userId) => {
  try {
    const q = query(
      collection(db, 'submissions'),
      where('assignmentId', '==', assignmentId),
      where('userId', '==', userId)
    );

    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
      submittedAt: doc.data().submittedAt?.toDate?.() || new Date()
    };
  } catch (error) {
    console.error('Error fetching submission:', error);
    return null;
  }
};

// ==========================================
// GET ALL SUBMISSIONS FOR ASSIGNMENT (Teacher)
// ==========================================
export const getAssignmentSubmissions = async (assignmentId) => {
  try {
    const q = query(
      collection(db, 'submissions'),
      where('assignmentId', '==', assignmentId),
      orderBy('submittedAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const submissions = [];

    for (const docSnap of snapshot.docs) {
      const submissionData = docSnap.data();
      
      // Fetch user details
      const userRef = doc(db, 'users', submissionData.userId);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.exists() ? userSnap.data() : {};

      submissions.push({
        id: docSnap.id,
        ...submissionData,
        submittedAt: submissionData.submittedAt?.toDate?.() || new Date(),
        studentName: userData.name || 'Unknown Student',
        studentEmail: userData.email || ''
      });
    }

    return submissions;
  } catch (error) {
    console.error('Error fetching submissions:', error);
    return [];
  }
};

// ==========================================
// GRADE SUBMISSION (Teacher)
// ==========================================
export const gradeSubmission = async (submissionId, gradeData) => {
  try {
    const { grade, feedback, totalPoints } = gradeData;

    if (grade < 0 || grade > totalPoints) {
      throw new Error(`Grade must be between 0 and ${totalPoints}`);
    }

    const submissionRef = doc(db, 'submissions', submissionId);
    await updateDoc(submissionRef, {
      grade,
      feedback: feedback || '',
      gradedAt: serverTimestamp(),
      status: 'graded'
    });

    console.log('✅ Submission graded');
    toast.success('Graded successfully!');
  } catch (error) {
    console.error('❌ Error grading submission:', error);
    toast.error('Failed to grade submission');
    throw error;
  }
};

// ==========================================
// UPDATE ASSIGNMENT (Teacher)
// ==========================================
export const updateAssignment = async (assignmentId, updates) => {
  try {
    const assignmentRef = doc(db, 'assignments', assignmentId);
    await updateDoc(assignmentRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });

    console.log('✅ Assignment updated');
    toast.success('Assignment updated successfully!');
  } catch (error) {
    console.error('❌ Error updating assignment:', error);
    toast.error('Failed to update assignment');
    throw error;
  }
};

// ==========================================
// DELETE ASSIGNMENT (Teacher)
// ==========================================
export const deleteAssignment = async (assignmentId, classId) => {
  try {
    const assignmentRef = doc(db, 'assignments', assignmentId);
    await updateDoc(assignmentRef, {
      status: 'deleted',
      updatedAt: serverTimestamp()
    });

    // Remove from class
    const classRef = doc(db, 'classes', classId);
    const classSnap = await getDoc(classRef);
    const classData = classSnap.data();
    const updatedAssignments = (classData.assignments || []).filter(id => id !== assignmentId);
    
    await updateDoc(classRef, {
      assignments: updatedAssignments,
      updatedAt: serverTimestamp()
    });

    console.log('✅ Assignment deleted');
    toast.success('Assignment deleted successfully!');
  } catch (error) {
    console.error('❌ Error deleting assignment:', error);
    toast.error('Failed to delete assignment');
    throw error;
  }
};

// ==========================================
// ASSIGN QUIZ TO CLASS (Teacher)
// ==========================================
export const assignQuizToClass = async (quizId, classId, dueDate) => {
  try {
    const quizRef = doc(db, 'quizzes', quizId);
    const quizSnap = await getDoc(quizRef);

    if (!quizSnap.exists()) {
      throw new Error('Quiz not found');
    }

    const quizData = quizSnap.data();

    // Create assignment from quiz
    const assignmentData = {
      teacherId: quizData.userId || quizData.teacherId,
      classId,
      title: `Quiz: ${quizData.title}`,
      description: quizData.description || '',
      dueDate,
      totalPoints: quizData.totalPoints || quizData.questions.length,
      type: 'quiz',
      quizId: quizId
    };

    return await createAssignment(assignmentData);
  } catch (error) {
    console.error('❌ Error assigning quiz:', error);
    toast.error('Failed to assign quiz');
    throw error;
  }
};
