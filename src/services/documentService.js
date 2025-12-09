// src/services/documentService.js - FIXED VERSION
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
import { detectSubjectFromContent, detectSubjectFromTitle } from '@/helpers/subjectDetection';

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

        // ===== STEP 2: AI SUBJECT DETECTION =====
        toast.loading('🤖 AI analyzing content...', { id: toastId });
        let subject = 'General Studies';
        let detectionMethod = 'default';
        let confidenceScore = 0;

        // First, try AI detection from text content
        if (fullText && fullText.length > 100) {
            const aiResult = detectSubjectFromContent(fullText);
            subject = aiResult.subject;
            confidenceScore = aiResult.confidence;
            detectionMethod = 'ai_text_analysis';
            console.log(`✅ AI detected: ${subject} (score: ${confidenceScore})`);
        }
        // Fallback to filename detection
        else {
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

/**
 * Delete document
 */
export const deleteDocument = async (firestoreId) => {
    try {
        const docData = await getDocument(firestoreId);

        // Delete from Storage
        if (docData.storagePath) {
            const storageRef = ref(storage, docData.storagePath);
            await deleteObject(storageRef).catch(err => {
                console.warn('Storage file deletion failed:', err);
            });
        }

        // Delete subcollections (pages)
        const pagesQuery = query(collection(db, 'documents', firestoreId, 'pages'));
        const pagesSnapshot = await getDocs(pagesQuery);
        await Promise.all(pagesSnapshot.docs.map(doc => deleteDoc(doc.ref)));

        // Delete main document
        await deleteDoc(doc(db, 'documents', firestoreId));

        toast.success('Document deleted successfully');
        return true;
    } catch (error) {
        console.error('Error deleting document:', error);
        toast.error('Failed to delete document');
        throw error;
    }
};

/**
 * Update document subject manually
 */
export const updateDocumentSubject = async (firestoreId, newSubject) => {
    try {
        const docRef = doc(db, 'documents', firestoreId);
        await updateDoc(docRef, {
            subject: newSubject,
            subjectDetectionMethod: 'manual_override',
            updatedAt: serverTimestamp()
        });

        toast.success(`Subject updated to ${newSubject}`);
        return true;
    } catch (error) {
        console.error('Error updating subject:', error);
        toast.error('Failed to update subject');
        throw error;
    }
};
