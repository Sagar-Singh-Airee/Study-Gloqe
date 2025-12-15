// src/services/documentService.js - COMPLETE VERSION WITH deleteDocument
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
    serverTimestamp,
    increment,
    setDoc
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage, COLLECTIONS } from '@shared/config/firebase'; // Added COLLECTIONS
import * as pdfjsLib from 'pdfjs-dist';
import toast from 'react-hot-toast';
import { detectSubjectFromContent, detectSubjectFromTitle, detectSubjectWithAI } from '@shared/utils/subjectDetection';

// Setup PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;

/**
 * Extract text from PDF file (Exported for use in UI)
 */
export const extractTextFromPDF = async (file) => {
    try {
        console.log('📝 Extracting text from PDF...');
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        let fullText = '';
        const pageTexts = [];

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');

            pageTexts.push({
                pageNum: i,
                text: pageText
            });

            fullText += pageText + '\n\n';
        }

        console.log(`✅ Extracted ${fullText.length} characters from ${pdf.numPages} pages`);

        return {
            fullText: fullText.trim(),
            pageTexts,
            numPages: pdf.numPages
        };
    } catch (error) {
        console.error('❌ PDF text extraction error:', error);
        return {
            fullText: '',
            pageTexts: [],
            numPages: 0,
            extractionError: error.message
        };
    }
};

/**
 * Extract keywords for search
 */
export const extractKeywords = (text) => {
    if (!text || text.length < 10) return [];

    const stopWords = new Set([
        'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but', 'in',
        'with', 'to', 'for', 'of', 'as', 'by', 'this', 'that', 'from', 'are',
        'was', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did'
    ]);

    const words = text
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 3 && !stopWords.has(word));

    const wordFreq = {};
    words.forEach(word => {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    return Object.entries(wordFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 30)
        .map(([word]) => word);
};

// ==================== 🚀 SMART UPLOAD FUNCTIONS (PARALLEL) ====================

/**
 * Step 1: Initiate Upload (Returns task for progress tracking)
 */
export const initiateDocumentUpload = (file, userId) => {
    // Validation
    if (!file.type.includes('pdf')) throw new Error('Only PDF files are supported');
    if (file.size > 50 * 1024 * 1024) throw new Error('File size must be less than 50MB');
    if (!userId) throw new Error('User ID is required');

    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `documents/${userId}/${timestamp}_${sanitizedFileName}`;
    const storageRef = ref(storage, storagePath);

    // Use uploadBytesResumable for progress monitoring
    const uploadTask = uploadBytesResumable(storageRef, file, {
        contentType: 'application/pdf',
        customMetadata: {
            userId: userId,
            originalName: file.name
        }
    });

    return { uploadTask, storageRef, storagePath };
};

/**
 * Step 2: Create Record (Called after Upload + Context + Extraction)
 */
export const createDocumentRecord = async (userId, file, data) => {
    // data contains: downloadURL, storagePath, extractedText, context (purpose, subject, folderId), etc.
    console.log('💾 Creating document record with context:', data.context);

    const {
        downloadURL, storagePath,
        extractedText, pageTexts, numPages, extractionError,
        context
    } = data;

    // Detect keywords
    const keywords = extractedText ? extractKeywords(extractedText) : [];

    // Final Subject Logic: User Context > AI Detection > Info
    const subject = context?.subject || 'General';
    const detectionMethod = context?.subject ? 'user_context' : 'ai_fallback';

    const docData = {
        title: file.name.replace('.pdf', ''),
        fileName: file.name,
        userId: userId,
        fileSize: file.size,
        downloadURL,
        storagePath,
        status: 'completed',
        pages: numPages || 0,

        // Smart Context Fields
        subject: subject,
        purpose: context?.purpose || '',
        folderId: context?.folderId || null,
        subjectDetectionMethod: detectionMethod,

        keywords,
        extractedText: extractedText || '',
        extractionError: extractionError || null,

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),

        // Stats
        totalStudyTime: 0,
        lastStudiedAt: null,
        readingProgress: 0,
        viewCount: 0,

        // Placeholders for auto-generated content
        quizCount: 0,
        flashcardCount: 0,
        autoGenerationRequested: context?.createOptions || null
    };

    // Save to Firestore
    const docRef = await addDoc(collection(db, 'documents'), docData);

    // Save pages (optional)
    if (pageTexts && pageTexts.length > 0) {
        const pagePromises = pageTexts.slice(0, 50).map(pageData =>
            addDoc(collection(db, 'documents', docRef.id, 'pages'), {
                ...pageData,
                createdAt: serverTimestamp()
            }).catch(e => console.warn('Page save failed', e))
        );
        Promise.allSettled(pagePromises); // Don't await
    }

    // Update Folder stats if folder selected
    if (context?.folderId) {
        const folderRef = doc(db, COLLECTIONS.FOLDERS, context.folderId);
        updateDoc(folderRef, {
            docCount: increment(1),
            updatedAt: serverTimestamp()
        }).catch(e => console.warn('Folder update failed', e));
    }

    // Update User Stats
    const userRef = doc(db, 'users', userId);
    updateDoc(userRef, {
        totalDocuments: increment(1),
        lastUploadAt: serverTimestamp()
    }).catch(e => console.warn('User stats update failed', e));

    return {
        docId: docRef.id,
        subject,
        folderId: context?.folderId,
        autoGenerationRequested: context?.createOptions
    };
};

/**
 * ✅ DELETE DOCUMENT - Removes from Firestore AND Storage
 */
export const deleteDocument = async (documentId, userId) => {
    const toastId = toast.loading('Deleting document...');

    try {
        console.log('🗑️ Starting document deletion:', documentId);

        // ===== STEP 1: GET DOCUMENT DATA =====
        const docRef = doc(db, 'documents', documentId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            throw new Error('Document not found');
        }

        const docData = docSnap.data();

        // ===== STEP 2: VERIFY OWNERSHIP =====
        if (docData.userId !== userId) {
            throw new Error('You do not have permission to delete this document');
        }

        // ===== STEP 3: DELETE FROM STORAGE =====
        if (docData.storagePath) {
            try {
                console.log('🗑️ Deleting file from Storage:', docData.storagePath);
                const storageRef = ref(storage, docData.storagePath);
                await deleteObject(storageRef);
                console.log('✅ Storage file deleted');
            } catch (storageError) {
                console.warn('⚠️ Storage deletion failed (file may not exist):', storageError);
                // Continue with Firestore deletion even if storage fails
            }
        }

        // ===== STEP 4: DELETE SUBCOLLECTIONS (pages) =====
        try {
            const pagesQuery = query(collection(db, 'documents', documentId, 'pages'));
            const pagesSnapshot = await getDocs(pagesQuery);

            const deletePagePromises = pagesSnapshot.docs.map(pageDoc =>
                deleteDoc(doc(db, 'documents', documentId, 'pages', pageDoc.id))
            );

            await Promise.allSettled(deletePagePromises);
            console.log(`✅ Deleted ${pagesSnapshot.size} page documents`);
        } catch (pageError) {
            console.warn('⚠️ Page deletion failed (non-critical):', pageError);
        }

        // ===== STEP 5: DELETE FIRESTORE DOCUMENT =====
        await deleteDoc(docRef);
        console.log('✅ Firestore document deleted');

        // ===== STEP 6: UPDATE USER STATS =====
        try {
            const userRef = doc(db, 'users', userId);
            const userDoc = await getDoc(userRef);

            if (userDoc.exists()) {
                const currentCount = userDoc.data().totalDocuments || 0;
                if (currentCount > 0) {
                    await updateDoc(userRef, {
                        totalDocuments: increment(-1)
                    });
                    console.log('✅ User stats updated');
                }
            }
        } catch (error) {
            console.warn('⚠️ User stats update failed (non-critical):', error);
        }

        toast.success('✅ Document deleted successfully', { id: toastId });
        console.log('🎉 Document deletion complete!');

        return { success: true };

    } catch (error) {
        console.error('❌ DELETE ERROR:', error);

        let errorMessage = 'Failed to delete document';

        if (error.message.includes('permission')) {
            errorMessage = 'Permission denied. Please check your account.';
        } else if (error.message.includes('not found')) {
            errorMessage = 'Document not found';
        } else if (error.message) {
            errorMessage = error.message;
        }

        toast.error(errorMessage, { id: toastId });
        throw new Error(errorMessage);
    }
};

/**
 * Get document by Firestore ID
 */
export const getDocument = async (firestoreId) => {
    try {
        const docRef = doc(db, 'documents', firestoreId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            throw new Error('Document not found');
        }

        return {
            id: docSnap.id,
            ...docSnap.data()
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
            collection(db, 'documents'),
            where('userId', '==', userId),
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
        return [];
    }
};

/**
 * Get documents by subject
 */
export const getDocumentsBySubject = async (userId, subject) => {
    try {
        const q = query(
            collection(db, 'documents'),
            where('userId', '==', userId),
            where('subject', '==', subject),
            orderBy('createdAt', 'desc')
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error getting documents by subject:', error);
        return [];
    }
};

// Deprecated (Keep for legacy until full migration)
export const uploadDocument = async (file, userId, metadata = {}) => {
    // Legacy wrappers call new functions
    const { uploadTask, storagePath } = initiateDocumentUpload(file, userId);

    // Wait for upload
    await new Promise((resolve, reject) => {
        uploadTask.on('state_changed', null, reject, resolve);
    });
    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

    // Extract text
    const { fullText, pageTexts, numPages, extractionError } = await extractTextFromPDF(file);

    // Create record
    return createDocumentRecord(userId, file, {
        downloadURL,
        storagePath,
        extractedText: fullText,
        pageTexts,
        numPages,
        extractionError,
        context: { subject: metadata.subject }
    });
};
