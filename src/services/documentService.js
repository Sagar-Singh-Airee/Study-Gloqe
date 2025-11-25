import {
    collection,
    addDoc,
    doc,
    getDoc,
    getDocs,
    query,
    where,
    orderBy,
    limit,
    updateDoc,
    deleteDoc,
    serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage, COLLECTIONS } from '@config/firebase';

/**
 * Upload a PDF document to Firebase Storage and create a Firestore document
 */
export const uploadDocument = async (file, userId, metadata = {}) => {
    try {
        // Generate unique document ID
        const docId = `${userId}_${Date.now()}`;
        const storageRef = ref(storage, `documents/${docId}.pdf`);

        // Upload file to Firebase Storage
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);

        // Create Firestore document
        const docData = {
            docId,
            title: metadata.title || file.name,
            fileName: file.name,
            uploaderId: userId,
            fileSize: file.size,
            downloadURL,
            status: 'processing', // processing, completed, failed
            pages: 0,
            subject: metadata.subject || null,
            keywords: [],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        await addDoc(collection(db, COLLECTIONS.DOCUMENTS), docData);

        // Trigger Cloud Function for processing (text extraction, subject detection)
        // This would be handled by a Cloud Function listening to Firestore creates

        return docId;
    } catch (error) {
        console.error('Error uploading document:', error);
        throw error;
    }
};

/**
 * Get document by ID
 */
export const getDocument = async (docId) => {
    try {
        const q = query(
            collection(db, COLLECTIONS.DOCUMENTS),
            where('docId', '==', docId),
            limit(1)
        );

        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            throw new Error('Document not found');
        }

        return {
            id: snapshot.docs[0].id,
            ...snapshot.docs[0].data()
        };
    } catch (error) {
        console.error('Error getting document:', error);
        throw error;
    }
};

/**
 * Get all documents for a user
 */
export const getUserDocuments = async (userId, limitCount = 50) => {
    try {
        const q = query(
            collection(db, COLLECTIONS.DOCUMENTS),
            where('uploaderId', '==', userId),
            orderBy('createdAt', 'desc'),
            limit(limitCount)
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error getting user documents:', error);
        throw error;
    }
};

/**
 * Update document metadata
 */
export const updateDocument = async (docId, updates) => {
    try {
        const q = query(
            collection(db, COLLECTIONS.DOCUMENTS),
            where('docId', '==', docId),
            limit(1)
        );

        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            throw new Error('Document not found');
        }

        const docRef = doc(db, COLLECTIONS.DOCUMENTS, snapshot.docs[0].id);
        await updateDoc(docRef, {
            ...updates,
            updatedAt: serverTimestamp()
        });

        return true;
    } catch (error) {
        console.error('Error updating document:', error);
        throw error;
    }
};

/**
 * Delete document
 */
export const deleteDocument = async (docId) => {
    try {
        // Get document
        const docData = await getDocument(docId);

        // Delete from Storage
        const storageRef = ref(storage, `documents/${docId}.pdf`);
        await deleteObject(storageRef);

        // Delete from Firestore
        await deleteDoc(doc(db, COLLECTIONS.DOCUMENTS, docData.id));

        return true;
    } catch (error) {
        console.error('Error deleting document:', error);
        throw error;
    }
};

/**
 * Get document pages (for reading)
 */
export const getDocumentPages = async (docId) => {
    try {
        const q = query(
            collection(db, `${COLLECTIONS.DOCUMENTS}/${docId}/pages`),
            orderBy('pageNum')
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => doc.data());
    } catch (error) {
        console.error('Error getting document pages:', error);
        throw error;
    }
};

/**
 * Search documents
 */
export const searchDocuments = async (userId, searchQuery) => {
    try {
        const q = query(
            collection(db, COLLECTIONS.DOCUMENTS),
            where('uploaderId', '==', userId),
            where('keywords', 'array-contains', searchQuery.toLowerCase())
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error searching documents:', error);
        throw error;
    }
};