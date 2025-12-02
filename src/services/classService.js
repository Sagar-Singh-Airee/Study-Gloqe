// src/services/classService.js - COMPLETE FIXED VERSION
import { db } from '@/config/firebase';
import { 
    collection, 
    doc, 
    addDoc, 
    updateDoc, 
    deleteDoc,
    getDoc, 
    getDocs,
    query, 
    where, 
    orderBy,
    arrayUnion, 
    arrayRemove,
    increment,
    serverTimestamp 
} from 'firebase/firestore';
import { generateClassCode, isValidClassCode } from '@/utils/idGenerator';

// ==========================================
// CREATE CLASS (Teacher only)
// ==========================================
export const createClass = async (teacherId, classData) => {
    try {
        console.log('📝 Creating class for teacher:', teacherId);
        
        // Generate unique class code
        const classCode = await generateClassCode(db);
        
        const newClass = {
            name: classData.name,
            subject: classData.subject,
            section: classData.section || 'A',
            teacherId,
            teacherName: classData.teacherName || 'Unknown Teacher',
            students: [], // Changed from studentIds to match rules
            studentCount: 0,
            classCode,
            description: classData.description || '',
            schoolName: classData.schoolName || '',
            grade: classData.grade || '',
            room: classData.room || '',
            schedule: classData.schedule || '',
            active: true,
            rewardPolicy: classData.rewardPolicy || null,
            avgEngagement: 0,
            avgScore: 0,
            activeQuizzes: 0,
            pendingAssignments: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        const classRef = await addDoc(collection(db, 'classes'), newClass);

        console.log(`✅ Class created: ${classRef.id} with code: ${classCode}`);

        return { 
            id: classRef.id, 
            classCode,
            success: true 
        };
    } catch (error) {
        console.error('❌ Error creating class:', error);
        throw error;
    }
};

// ==========================================
// JOIN CLASS BY CODE (Student)
// ==========================================
export const joinClassByCode = async (userId, classCode) => {
    try {
        console.log(`🔍 Joining class with code: ${classCode}`);
        
        // Validate code format
        if (!isValidClassCode(classCode.toUpperCase())) {
            throw new Error('Invalid class code format. Must be 6 characters (A-Z, 0-9).');
        }

        const classesRef = collection(db, 'classes');
        const q = query(
            classesRef, 
            where('classCode', '==', classCode.toUpperCase()),
            where('active', '==', true)
        );
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            throw new Error('Invalid class code. Please check and try again.');
        }

        const classDoc = snapshot.docs[0];
        const classRef = doc(db, 'classes', classDoc.id);
        const classId = classDoc.id;
        const classDataSnap = classDoc.data();

        // Check if already joined
        if (classDataSnap.students?.includes(userId)) {
            throw new Error('You are already a member of this class');
        }

        // Add student to class
        await updateDoc(classRef, {
            students: arrayUnion(userId), // Changed from studentIds
            studentCount: increment(1),
            updatedAt: serverTimestamp()
        });

        // Add class to user's enrolled classes
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            classIds: arrayUnion(classId),
            updatedAt: serverTimestamp()
        });

        console.log(`✅ User ${userId} joined class ${classId} (${classCode})`);

        return { 
            success: true, 
            classId,
            className: classDataSnap.name 
        };
    } catch (error) {
        console.error('❌ Error joining class:', error);
        throw error;
    }
};

// ==========================================
// GET USER'S CLASSES
// ==========================================
export const getUserClasses = async (userId, role = 'student') => {
    try {
        console.log(`🔍 Fetching ${role} classes for user: ${userId}`);
        
        const classesRef = collection(db, 'classes');
        let q;

        if (role === 'teacher') {
            // Teachers: Get classes they created
            q = query(
                classesRef, 
                where('teacherId', '==', userId),
                where('active', '==', true),
                orderBy('createdAt', 'desc') // ✅ CHANGED BACK TO 'desc' - newest first
            );
        } else {
            // Students: Get classes they're enrolled in
            q = query(
                classesRef, 
                where('students', 'array-contains', userId),
                where('active', '==', true),
                orderBy('createdAt', 'desc') // ✅ CHANGED BACK TO 'desc' - newest first
            );
        }

        const snapshot = await getDocs(q);
        const classes = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate(),
            updatedAt: doc.data().updatedAt?.toDate()
        }));
        
        console.log(`✅ Found ${classes.length} classes`);
        return classes;
    } catch (error) {
        console.error('❌ Error getting classes:', error);
        throw error;
    }
};

// ==========================================
// GET CLASS DETAILS WITH STUDENTS
// ==========================================
export const getClassDetails = async (classId) => {
    try {
        console.log(`🔍 Fetching class details: ${classId}`);
        
        const classRef = doc(db, 'classes', classId);
        const classSnap = await getDoc(classRef);

        if (!classSnap.exists()) {
            throw new Error('Class not found');
        }

        const classData = classSnap.data();

        // Get student details with gamification data
        const studentDetails = await Promise.all(
            (classData.students || []).map(async (studentId) => {
                try {
                    const userRef = doc(db, 'users', studentId);
                    const userSnap = await getDoc(userRef);
                    
                    if (!userSnap.exists()) {
                        return null;
                    }

                    const gamificationRef = doc(db, 'gamification', studentId);
                    const gamificationSnap = await getDoc(gamificationRef);

                    return {
                        id: studentId,
                        name: userSnap.data()?.name || 'Unknown Student',
                        email: userSnap.data()?.email || '',
                        photoURL: userSnap.data()?.photoURL || null,
                        xp: gamificationSnap.data()?.xp || 0,
                        level: gamificationSnap.data()?.level || 1,
                        streak: gamificationSnap.data()?.streak || 0
                    };
                } catch (error) {
                    console.error(`Error loading student ${studentId}:`, error);
                    return null;
                }
            })
        );

        // Filter out null students
        const validStudents = studentDetails.filter(s => s !== null);

        console.log(`✅ Loaded class with ${validStudents.length} students`);

        return {
            id: classSnap.id,
            ...classData,
            createdAt: classData.createdAt?.toDate(),
            updatedAt: classData.updatedAt?.toDate(),
            students: validStudents
        };
    } catch (error) {
        console.error('❌ Error getting class details:', error);
        throw error;
    }
};

// ==========================================
// GET CLASS BY ID (Simple version)
// ==========================================
export const getClassById = async (classId) => {
    try {
        const classRef = doc(db, 'classes', classId);
        const classSnap = await getDoc(classRef);

        if (!classSnap.exists()) {
            throw new Error('Class not found');
        }

        return {
            id: classSnap.id,
            ...classSnap.data(),
            createdAt: classSnap.data().createdAt?.toDate(),
            updatedAt: classSnap.data().updatedAt?.toDate()
        };
    } catch (error) {
        console.error('Error getting class:', error);
        throw error;
    }
};

// ==========================================
// UPDATE CLASS (Teacher only)
// ==========================================
export const updateClass = async (classId, updates) => {
    try {
        console.log(`📝 Updating class: ${classId}`);
        
        const classRef = doc(db, 'classes', classId);
        
        await updateDoc(classRef, {
            ...updates,
            updatedAt: serverTimestamp()
        });

        console.log('✅ Class updated successfully');
        return { success: true };
    } catch (error) {
        console.error('❌ Error updating class:', error);
        throw error;
    }
};

// ==========================================
// LEAVE CLASS (Student)
// ==========================================
export const leaveClass = async (userId, classId) => {
    try {
        console.log(`👋 User ${userId} leaving class ${classId}`);
        
        const classRef = doc(db, 'classes', classId);
        const userRef = doc(db, 'users', userId);

        await updateDoc(classRef, {
            students: arrayRemove(userId), // Changed from studentIds
            studentCount: increment(-1),
            updatedAt: serverTimestamp()
        });

        await updateDoc(userRef, {
            classIds: arrayRemove(classId),
            updatedAt: serverTimestamp()
        });

        console.log('✅ Successfully left class');
        return { success: true };
    } catch (error) {
        console.error('❌ Error leaving class:', error);
        throw error;
    }
};

// ==========================================
// ADD STUDENT TO CLASS (Teacher)
// ==========================================
export const addStudentToClass = async (classId, studentId) => {
    try {
        console.log(`➕ Adding student ${studentId} to class ${classId}`);
        
        const classRef = doc(db, 'classes', classId);
        
        await updateDoc(classRef, {
            students: arrayUnion(studentId),
            studentCount: increment(1),
            updatedAt: serverTimestamp()
        });

        // Add class to student's enrolled classes
        const userRef = doc(db, 'users', studentId);
        await updateDoc(userRef, {
            classIds: arrayUnion(classId),
            updatedAt: serverTimestamp()
        });

        console.log('✅ Student added to class');
        return { success: true };
    } catch (error) {
        console.error('❌ Error adding student:', error);
        throw error;
    }
};

// ==========================================
// REMOVE STUDENT FROM CLASS (Teacher)
// ==========================================
export const removeStudentFromClass = async (classId, studentId) => {
    try {
        console.log(`➖ Removing student ${studentId} from class ${classId}`);
        
        const classRef = doc(db, 'classes', classId);
        
        await updateDoc(classRef, {
            students: arrayRemove(studentId),
            studentCount: increment(-1),
            updatedAt: serverTimestamp()
        });

        // Remove class from student's enrolled classes
        const userRef = doc(db, 'users', studentId);
        await updateDoc(userRef, {
            classIds: arrayRemove(classId),
            updatedAt: serverTimestamp()
        });

        console.log('✅ Student removed from class');
        return { success: true };
    } catch (error) {
        console.error('❌ Error removing student:', error);
        throw error;
    }
};

// ==========================================
// DELETE CLASS (Teacher only)
// ==========================================
export const deleteClass = async (classId, teacherId) => {
    try {
        console.log(`🗑️ Deleting class: ${classId}`);
        
        const classRef = doc(db, 'classes', classId);
        const classSnap = await getDoc(classRef);

        if (!classSnap.exists()) {
            throw new Error('Class not found');
        }

        if (classSnap.data().teacherId !== teacherId) {
            throw new Error('Unauthorized: You can only delete your own classes');
        }

        // Remove class from all students
        const studentIds = classSnap.data().students || [];
        await Promise.all(
            studentIds.map(studentId => {
                const userRef = doc(db, 'users', studentId);
                return updateDoc(userRef, {
                    classIds: arrayRemove(classId)
                });
            })
        );

        // Soft delete (set inactive)
        await updateDoc(classRef, {
            active: false,
            deletedAt: serverTimestamp()
        });

        console.log('✅ Class deleted successfully');
        return { success: true };
    } catch (error) {
        console.error('❌ Error deleting class:', error);
        throw error;
    }
};

// ==========================================
// GET CLASS STUDENTS (Teacher)
// ==========================================
export const getClassStudents = async (classId) => {
    try {
        const classDoc = await getClassById(classId);
        const studentIds = classDoc.students || [];

        if (studentIds.length === 0) {
            return [];
        }

        // Fetch student details
        const students = await Promise.all(
            studentIds.map(async (studentId) => {
                try {
                    const userRef = doc(db, 'users', studentId);
                    const userSnap = await getDoc(userRef);
                    
                    if (userSnap.exists()) {
                        return {
                            id: userSnap.id,
                            ...userSnap.data()
                        };
                    }
                    return null;
                } catch (error) {
                    console.error(`Error loading student ${studentId}:`, error);
                    return null;
                }
            })
        );

        return students.filter(s => s !== null);
    } catch (error) {
        console.error('Error getting class students:', error);
        throw error;
    }
};
