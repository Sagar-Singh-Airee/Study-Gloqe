import { db } from '@shared/config/firebase';
import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    where,
    getDocs,
    orderBy,
    serverTimestamp
} from 'firebase/firestore';

const SESSIONS_COLLECTION = 'live_sessions';

/**
 * Creates a new live session
 */
export const createLiveSession = async (sessionData) => {
    try {
        const docRef = await addDoc(collection(db, SESSIONS_COLLECTION), {
            ...sessionData,
            status: 'upcoming',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        return { id: docRef.id, ...sessionData };
    } catch (error) {
        console.error('Error creating live session:', error);
        throw error;
    }
};

/**
 * Fetches sessions for a specific teacher
 */
export const getTeacherSessions = async (teacherId) => {
    try {
        const q = query(
            collection(db, SESSIONS_COLLECTION),
            where('teacherId', '==', teacherId),
            orderBy('startTime', 'desc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error fetching teacher sessions:', error);
        throw error;
    }
};

/**
 * Fetches sessions for a specific class
 */
export const getClassSessions = async (classId) => {
    try {
        const q = query(
            collection(db, SESSIONS_COLLECTION),
            where('classId', '==', classId),
            orderBy('startTime', 'desc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error fetching class sessions:', error);
        throw error;
    }
};

/**
 * Updates a session status (e.g., 'upcoming' to 'live' or 'past')
 */
export const updateSessionStatus = async (sessionId, status) => {
    try {
        const docRef = doc(db, SESSIONS_COLLECTION, sessionId);
        await updateDoc(docRef, {
            status,
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        console.error('Error updating session status:', error);
        throw error;
    }
};

/**
 * Deletes a session
 */
export const deleteSession = async (sessionId) => {
    try {
        const docRef = doc(db, SESSIONS_COLLECTION, sessionId);
        await deleteDoc(docRef);
    } catch (error) {
        console.error('Error deleting session:', error);
        throw error;
    }
};
