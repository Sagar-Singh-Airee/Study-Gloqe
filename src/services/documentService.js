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
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '@/config/firebase';
import * as pdfjsLib from 'pdfjs-dist';
import toast from 'react-hot-toast';
import { detectSubjectFromContent, detectSubjectFromTitle, detectSubjectWithAI } from '@/helpers/subjectDetection';

// Setup PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;

/**
 * Extract text from PDF file
 */
const extractTextFromPDF = async (file) => {
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
const extractKeywords = (text) => {
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

/**
 * ✅ MAIN UPLOAD FUNCTION - RETURNS {docId, subject, downloadURL}
 */
export const uploadDocument = async (file, userId, metadata = {}) => {
    const toastId = toast.loading('Uploading document...');

    try {
        console.log('📤 Starting document upload:', file.name);
        console.log('👤 User ID:', userId);

        // ===== VALIDATION =====
        if (!file.type.includes('pdf')) {
            throw new Error('Only PDF files are supported');
        }

        if (file.size > 50 * 1024 * 1024) {
            throw new Error('File size must be less than 50MB');
        }

        if (!userId) {
            throw new Error('User ID is required');
        }

        // ===== STEP 1: EXTRACT TEXT =====
        toast.loading('Extracting text from PDF...', { id: toastId });
        const { fullText, pageTexts, numPages, extractionError } = await extractTextFromPDF(file);

        if (extractionError) {
            console.warn('⚠️ Text extraction had errors:', extractionError);
        }

        // ===== STEP 2: DETECT SUBJECT (AI + KEYWORD FALLBACK) =====
        toast.loading('🤖 AI analyzing content...', { id: toastId });
        console.log('🧠 Detecting subject...');

        let subject = 'General';
        let detectionMethod = 'default';
        let confidenceScore = 0;

        // Try AI detection first if text is available
        if (fullText && fullText.length > 100) {
            const aiSubject = await detectSubjectWithAI(fullText);

            if (aiSubject && aiSubject !== 'General') {
                subject = aiSubject;
                detectionMethod = 'ai';
                confidenceScore = 0.9;
            } else {
                console.log('⚠️ AI detection uncertain, using keyword fallback...');
                const detection = detectSubjectFromContent(fullText);
                subject = detection.subject;
                detectionMethod = 'keyword';
                confidenceScore = detection.confidence > 0 ? 0.7 : 0.3;
            }
        } else {
            // Fallback to filename detection
            subject = detectSubjectFromTitle(file.name);
            detectionMethod = 'filename_pattern';
            console.log(`✅ Filename detected: ${subject}`);
        }

        // Allow manual override from metadata
        if (metadata.subject) {
            subject = metadata.subject;
            detectionMethod = 'manual_override';
            console.log(`✅ Manual override: ${subject}`);
        }

        console.log(`✅ Final Subject: ${subject} (Method: ${detectionMethod})`);

        // ===== STEP 3: EXTRACT KEYWORDS =====
        const keywords = fullText ? extractKeywords(fullText) : [];

        // ===== STEP 4: UPLOAD TO STORAGE =====
        toast.loading('Uploading file to cloud...', { id: toastId });

        const timestamp = Date.now();
        const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const storagePath = `documents/${userId}/${timestamp}_${sanitizedFileName}`;

        console.log('📁 Storage path:', storagePath);

        const storageRef = ref(storage, storagePath);

        const uploadResult = await uploadBytes(storageRef, file, {
            contentType: 'application/pdf',
            customMetadata: {
                userId: userId,
                originalName: file.name,
                uploadDate: new Date().toISOString(),
                subject: subject
            }
        });

        console.log('✅ File uploaded to Storage');

        const downloadURL = await getDownloadURL(uploadResult.ref);
        console.log('✅ Download URL obtained:', downloadURL);

        // ===== STEP 5: CREATE FIRESTORE DOCUMENT =====
        toast.loading('Saving document metadata...', { id: toastId });

        const docData = {
            title: metadata.title || file.name.replace('.pdf', ''),
            fileName: file.name,
            userId: userId,
            fileSize: file.size,
            downloadURL,
            storagePath,
            status: 'completed',
            pages: numPages,
            subject: subject,
            subjectDetectionMethod: detectionMethod,
            subjectConfidence: confidenceScore,
            keywords,
            extractedText: fullText || '',
            extractionError: extractionError || null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            totalStudyTime: 0,
            lastStudiedAt: null,
            readingProgress: 0,
            viewCount: 0,
            quizCount: 0,
            flashcardCount: 0
        };

        console.log('💾 Saving to Firestore with subject:', subject);

        const docRef = await addDoc(collection(db, 'documents'), docData);
        console.log('✅ Document saved with Firestore ID:', docRef.id);

        // ===== STEP 6: SAVE PAGE TEXTS (Optional) =====
        if (pageTexts.length > 0 && pageTexts.length <= 100) {
            console.log(`📄 Saving ${pageTexts.length} page texts...`);

            const pagePromises = pageTexts.slice(0, 50).map(pageData =>
                addDoc(collection(db, 'documents', docRef.id, 'pages'), {
                    ...pageData,
                    createdAt: serverTimestamp()
                }).catch(err => {
                    console.warn('Failed to save page:', err);
                    return null;
                })
            );

            await Promise.allSettled(pagePromises);
        }

        // ===== STEP 7: UPDATE USER STATS =====
        console.log('📊 Updating user stats...');
        try {
            const userRef = doc(db, 'users', userId);
            const userDoc = await getDoc(userRef);

            if (userDoc.exists()) {
                await updateDoc(userRef, {
                    totalDocuments: increment(1),
                    lastUploadAt: serverTimestamp()
                });
                console.log('✅ User stats updated');
            } else {
                await setDoc(userRef, {
                    totalDocuments: 1,
                    lastUploadAt: serverTimestamp(),
                    totalStudyTime: 0,
                    createdAt: serverTimestamp()
                });
                console.log('✅ User document created with stats');
            }
        } catch (error) {
            console.warn('⚠️ User stats update failed (non-critical):', error);
        }

        toast.success(`✅ Uploaded & categorized as ${subject}!`, {
            id: toastId,
            duration: 4000
        });

        console.log('🎉 Upload complete! Firestore ID:', docRef.id);

        // ✅ CRITICAL FIX: Return object with docId, subject, and downloadURL
        return {
            docId: docRef.id,
            subject: subject,
            downloadURL: downloadURL
        };

    } catch (error) {
        console.error('❌ UPLOAD ERROR:', error);
        console.error('Error stack:', error.stack);

        let errorMessage = 'Failed to upload document';

        if (error.message.includes('permission')) {
            errorMessage = 'Permission denied. Please check your account.';
        } else if (error.message.includes('network')) {
            errorMessage = 'Network error. Please check your connection.';
        } else if (error.message) {
            errorMessage = error.message;
        }

        toast.error(errorMessage, { id: toastId });
        throw new Error(errorMessage);
    }
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
