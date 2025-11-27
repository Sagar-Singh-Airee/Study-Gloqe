// src/services/classService.js - COMPLETE VERSION
import { db } from '@/config/firebase';
import { 
    collection, 
    doc, 
    addDoc, 
    updateDoc, 
    getDoc, 
    getDocs,
    query, 
    where, 
    arrayUnion, 
    arrayRemove,
    increment,
    serverTimestamp 
} from 'firebase/firestore';
import { generateClassCode, isValidClassCode } from '@/utils/idGenerator'; // ← NEW IMPORT

// Create a new class (Teacher only)
export const createClass = async (teacherId, classData) => {
    try {
        console.log('📝 Creating class...');
        
        // Generate unique class code
        const classCode = await generateClassCode(db); // ← NOW ASYNC
        
        const classRef = await addDoc(collection(db, 'classes'), {
            name: classData.name,
            subject: classData.subject,
            section: classData.section || 'A',
            teacherId,
            teacherName: classData.teacherName,
            studentIds: [],
            studentCount: 0,
            classCode, // ← Unique verified code
            description: classData.description || '',
            schoolName: classData.schoolName || '',
            grade: classData.grade || '',
            active: true,
            rewardPolicy: classData.rewardPolicy || null,
            createdAt: serverTimestamp()
        });

        console.log(`✅ Class created: ${classRef.id} with code: ${classCode}`);

        return { 
            id: classRef.id, 
            classCode, // ← Return the code
            success: true 
        };
    } catch (error) {
        console.error('❌ Error creating class:', error);
        throw error;
    }
};

// Join class using class code (Student)
export const joinClassByCode = async (userId, classCode) => {
    try {
        console.log(`🔍 Joining class with code: ${classCode}`);
        
        // Validate code format first
        if (!isValidClassCode(classCode.toUpperCase())) { // ← NEW VALIDATION
            throw new Error('Invalid class code format. Must be 6 characters (A-Z, 0-9).');
        }

        const classesRef = collection(db, 'classes');
        const q = query(classesRef, where('classCode', '==', classCode.toUpperCase()));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            throw new Error('Invalid class code. Please check and try again.');
        }

        const classDoc = snapshot.docs[0];
        const classRef = doc(db, 'classes', classDoc.id);
        const classId = classDoc.id;

        // Check if already joined
        if (classDoc.data().studentIds?.includes(userId)) {
            throw new Error('You are already a member of this class');
        }

        // Add student to class
        await updateDoc(classRef, {
            studentIds: arrayUnion(userId),
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
            className: classDoc.data().name 
        };
    } catch (error) {
        console.error('❌ Error joining class:', error);
        throw error;
    }
};

// Get user's classes
export const getUserClasses = async (userId, role = 'student') => {
    try {
        console.log(`🔍 Fetching ${role} classes for user: ${userId}`);
        
        const classesRef = collection(db, 'classes');
        let q;

        if (role === 'teacher') {
            q = query(
                classesRef, 
                where('teacherId', '==', userId),
                where('active', '==', true)
            );
        } else {
            q = query(
                classesRef, 
                where('studentIds', 'array-contains', userId),
                where('active', '==', true)
            );
        }

        const snapshot = await getDocs(q);
        const classes = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        console.log(`✅ Found ${classes.length} classes`);
        return classes;
    } catch (error) {
        console.error('❌ Error getting classes:', error);
        throw error;
    }
};

// Get class details with students
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
            (classData.studentIds || []).map(async (studentId) => {
                const userRef = doc(db, 'users', studentId);
                const userSnap = await getDoc(userRef);
                const gamificationRef = doc(db, 'gamification', studentId);
                const gamificationSnap = await getDoc(gamificationRef);

                return {
                    id: studentId,
                    name: userSnap.data()?.name || 'Unknown Student',
                    email: userSnap.data()?.email || '',
                    xp: gamificationSnap.data()?.xp || 0,
                    level: gamificationSnap.data()?.level || 1
                };
            })
        );

        console.log(`✅ Loaded class with ${studentDetails.length} students`);

        return {
            id: classSnap.id,
            ...classData,
            students: studentDetails
        };
    } catch (error) {
        console.error('❌ Error getting class details:', error);
        throw error;
    }
};

// Leave class (Student)
export const leaveClass = async (userId, classId) => {
    try {
        console.log(`👋 User ${userId} leaving class ${classId}`);
        
        const classRef = doc(db, 'classes', classId);
        const userRef = doc(db, 'users', userId);

        await updateDoc(classRef, {
            studentIds: arrayRemove(userId),
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

// Delete class (Teacher only)
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
        const studentIds = classSnap.data().studentIds || [];
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
