// src/services/documentService.js - AI-POWERED VERSION WITH GAMIFICATION
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
    writeBatch
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { db, storage, COLLECTIONS } from '@shared/config/firebase';
import { detectSubjectHybrid } from '@shared/utils/subjectDetection';
import { trackAction } from '@gamification/services/achievementTracker'; // ✅ NEW: Achievement tracking
import { generateQuizWithGemini, createQuiz } from '../../teacher/services/quizService'; // ✅ Auto-Quiz
import { generateFlashcardsWithGemini, createFlashcardDeck } from './flashcardService'; // ✅ Auto-Flashcards
import * as pdfjsLib from 'pdfjs-dist';
import toast from 'react-hot-toast';


// Setup PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;


// ==================== 📝 TEXT EXTRACTION ====================


/**
 * Extract text from PDF file with enhanced error handling
 * @param {File} file - PDF file to extract text from
 * @returns {Promise<Object>} Extracted text data
 */
export const extractTextFromPDF = async (file) => {
    try {
        console.log('📝 Starting PDF text extraction...');

        if (!file || file.size === 0) {
            throw new Error('Invalid or empty file');
        }

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        let fullText = '';
        const pageTexts = [];
        const maxPages = Math.min(pdf.numPages, 500); // Limit to 500 pages for performance

        console.log(`📖 Processing ${maxPages} pages...`);

        for (let i = 1; i <= maxPages; i++) {
            try {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items
                    .map(item => item.str)
                    .join(' ')
                    .trim();

                if (pageText) {
                    pageTexts.push({
                        pageNum: i,
                        text: pageText,
                        wordCount: pageText.split(/\s+/).length
                    });

                    fullText += pageText + '\n\n';
                }
            } catch (pageError) {
                console.warn(`⚠️ Failed to extract page ${i}:`, pageError.message);
            }
        }

        const result = {
            fullText: fullText.trim(),
            pageTexts,
            numPages: pdf.numPages,
            extractedPages: pageTexts.length,
            totalWords: fullText.split(/\s+/).filter(w => w.length > 0).length,
            success: true
        };

        console.log(`✅ Extracted ${result.totalWords} words from ${result.extractedPages} pages`);
        return result;

    } catch (error) {
        console.error('❌ PDF extraction error:', error);
        return {
            fullText: '',
            pageTexts: [],
            numPages: 0,
            extractedPages: 0,
            totalWords: 0,
            success: false,
            error: error.message
        };
    }
};


/**
 * Extract keywords for search optimization
 * @param {string} text - Text to extract keywords from
 * @param {number} maxKeywords - Maximum number of keywords to return
 * @returns {string[]} Array of keywords
 */
export const extractKeywords = (text, maxKeywords = 30) => {
    if (!text || text.length < 10) return [];

    const stopWords = new Set([
        'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but', 'in',
        'with', 'to', 'for', 'of', 'as', 'by', 'this', 'that', 'from', 'are',
        'was', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did',
        'will', 'would', 'could', 'should', 'can', 'may', 'might', 'must',
        'it', 'its', 'they', 'them', 'their', 'we', 'our', 'you', 'your'
    ]);

    // Extract and clean words
    const words = text
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word =>
            word.length > 3 &&
            !stopWords.has(word) &&
            !/^\d+$/.test(word) // Exclude pure numbers
        );

    // Count frequency
    const wordFreq = {};
    words.forEach(word => {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    // Sort by frequency and return top keywords
    return Object.entries(wordFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, maxKeywords)
        .map(([word]) => word);
};


// ==================== 📤 UPLOAD FUNCTIONS ====================


/**
 * Initiate document upload to Firebase Storage
 * @param {File} file - PDF file to upload
 * @param {string} userId - User ID
 * @returns {Object} Upload task and metadata
 */
export const initiateDocumentUpload = (file, userId) => {
    // Validation
    if (!file) {
        throw new Error('No file provided');
    }

    if (!file.type.includes('pdf')) {
        throw new Error('Only PDF files are supported');
    }

    if (file.size > 50 * 1024 * 1024) {
        throw new Error('File size must be less than 50MB');
    }

    if (!userId) {
        throw new Error('User ID is required');
    }

    const timestamp = Date.now();
    const sanitizedFileName = file.name
        .replace(/[^a-zA-Z0-9.-]/g, '_')
        .substring(0, 100); // Limit filename length

    const storagePath = `documents/${userId}/${timestamp}_${sanitizedFileName}`;
    const storageRef = ref(storage, storagePath);

    const uploadTask = uploadBytesResumable(storageRef, file, {
        contentType: 'application/pdf',
        customMetadata: {
            userId: userId,
            originalName: file.name,
            uploadTimestamp: timestamp.toString()
        }
    });

    return { uploadTask, storageRef, storagePath };
};


/**
 * Create document record in Firestore with AI-powered subject detection
 * @param {string} userId - User ID
 * @param {File} file - Original file
 * @param {Object} data - Document data
 * @returns {Promise<Object>} Created document info
 */
export const createDocumentRecord = async (userId, file, data) => {
    try {
        console.log('💾 Creating document record with AI detection...');

        const {
            downloadURL,
            storagePath,
            extractedText,
            pageTexts,
            numPages,
            totalWords,
            context = {}
        } = data;

        // Extract keywords
        const keywords = extractedText ? extractKeywords(extractedText, 50) : [];

        // ✅ AI-POWERED SUBJECT DETECTION
        let subject = 'General Studies';
        let subjectConfidence = 0;
        let detectionMethod = 'default';

        if (extractedText && extractedText.length > 50) {
            try {
                console.log('🤖 Running AI subject detection...');

                const detection = await detectSubjectHybrid({
                    title: file.name.replace('.pdf', ''),
                    content: extractedText,
                    fileName: file.name
                });

                if (detection && detection.subject) {
                    subject = detection.subject;
                    subjectConfidence = detection.confidence || 0;
                    detectionMethod = detection.method || 'unknown';

                    console.log(`✅ AI detected: ${subject} (${subjectConfidence}% via ${detectionMethod})`);
                } else {
                    console.warn('⚠️ AI detection returned null, using default');
                }
            } catch (aiError) {
                console.error('❌ AI detection error:', aiError);
                console.log('⚠️ Falling back to General Studies');
            }
        } else {
            console.log('⚠️ Insufficient text for AI detection');
        }

        // Override with user-provided subject if available
        if (context.subject && context.subject !== 'General Studies') {
            console.log(`✏️ User override: ${context.subject}`);
            subject = context.subject;
            subjectConfidence = 100;
            detectionMethod = 'user_provided';
        }

        // Build document data
        const docData = {
            // Basic info
            title: file.name.replace('.pdf', ''),
            fileName: file.name,
            userId: userId,
            fileSize: file.size,
            downloadURL,
            storagePath,

            // Status
            status: 'completed',
            pages: numPages || 0,
            totalWords: totalWords || 0,

            // ✅ ENHANCED: Classification with AI metadata
            subject: subject,
            subjectConfidence: subjectConfidence,
            detectionMethod: detectionMethod,
            purpose: context.purpose || '',
            folderId: context.folderId || null,

            // Search & Discovery
            keywords,
            extractedText: extractedText || '',

            // Timestamps
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),

            // Study tracking
            totalStudyTime: 0,
            lastStudiedAt: null,
            readingProgress: 0,
            viewCount: 0,

            // Generated content
            quizCount: 0,
            flashcardCount: 0,
            summaryCount: 0,

            // Flags
            isArchived: false,
            isFavorite: false,
            tags: context.tags || []
        };

        // Create document
        const docRef = await addDoc(collection(db, 'documents'), docData);
        console.log('✅ Document record created:', docRef.id);

        // ✅ NEW: TRACK ACHIEVEMENT (NON-BLOCKING)
        trackAction(userId, 'DOCUMENT_UPLOADED').catch(err =>
            console.warn('⚠️ Achievement tracking warning:', err.message)
        );

        // Save pages in batches (non-blocking)
        if (pageTexts && pageTexts.length > 0) {
            savePages(docRef.id, pageTexts).catch(err =>
                console.warn('⚠️ Page save warning:', err.message)
            );
        }

        // Update statistics (non-blocking)
        updateStatistics(userId, context.folderId).catch(err =>
            console.warn('⚠️ Stats update warning:', err.message)
        );

        // ✅ AUTO-GENERATE CONTENT (QUIZ & FLASHCARDS)
        // Fire-and-forget background process
        if (extractedText && extractedText.length > 500) {
            (async () => {
                try {
                    console.log('🤖 Starting auto-generation for:', docRef.id);
                    // 1. Quiz Generation
                    toast.loading('Generating AI Quiz...', { id: 'gen-quiz' });
                    const questions = await generateQuizWithGemini(docRef.id, 'medium', 5);
                    await createQuiz(userId, docRef.id, questions, {
                        title: `Quiz: ${file.name.replace('.pdf', '')}`,
                        subject: subject,
                        difficulty: 'medium',
                        description: 'Auto-generated from upload'
                    });
                    toast.success('✨ AI Quiz Ready!', { id: 'gen-quiz' });

                    // 2. Flashcard Generation
                    toast.loading('Generating Flashcards...', { id: 'gen-flash' });
                    const cards = await generateFlashcardsWithGemini(docRef.id, 10);
                    await createFlashcardDeck(userId, docRef.id, cards, {
                        title: `Deck: ${file.name.replace('.pdf', '')}`,
                        subject: subject,
                        description: 'Auto-generated from upload'
                    });
                    toast.success('✨ Flashcards Ready!', { id: 'gen-flash' });

                } catch (genError) {
                    console.error('❌ Auto-generation failed:', genError);
                    // Don't show error toast to keep UI clean, just log it
                }
            })();
        }

        return {
            docId: docRef.id,
            subject,
            subjectConfidence,
            detectionMethod,
            folderId: context.folderId,
            success: true
        };

    } catch (error) {
        console.error('❌ Document record creation failed:', error);
        throw new Error(`Failed to create document record: ${error.message}`);
    }
};


/**
 * Save pages to subcollection (batched for performance)
 * @param {string} docId - Document ID
 * @param {Array} pageTexts - Array of page text objects
 */
const savePages = async (docId, pageTexts) => {
    const batchSize = 500; // Firestore batch limit
    const pages = pageTexts.slice(0, 100); // Limit to 100 pages for performance

    for (let i = 0; i < pages.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = pages.slice(i, i + batchSize);

        chunk.forEach(pageData => {
            const pageRef = doc(collection(db, 'documents', docId, 'pages'));
            batch.set(pageRef, {
                ...pageData,
                createdAt: serverTimestamp()
            });
        });

        await batch.commit();
    }

    console.log(`✅ Saved ${pages.length} pages`);
};


/**
 * Update user and folder statistics
 * @param {string} userId - User ID
 * @param {string|null} folderId - Folder ID (optional)
 */
const updateStatistics = async (userId, folderId) => {
    const batch = writeBatch(db);

    // Update user stats
    const userRef = doc(db, 'users', userId);
    batch.update(userRef, {
        totalDocuments: increment(1),
        lastUploadAt: serverTimestamp()
    });

    // Update folder stats if applicable
    if (folderId) {
        const folderRef = doc(db, COLLECTIONS.FOLDERS, folderId);
        batch.update(folderRef, {
            docCount: increment(1),
            updatedAt: serverTimestamp()
        });
    }

    await batch.commit();
};


// ==================== 🗑️ DELETE FUNCTION (ENHANCED) ====================


/**
 * Permanently delete document from Firestore and Storage
 * @param {string} documentId - Document ID to delete
 * @returns {Promise<Object>} Deletion result
 */
export const deleteDocument = async (documentId) => {
    try {
        console.log('🗑️ Starting deletion for:', documentId);

        if (!documentId) {
            throw new Error('Document ID is required');
        }

        // ===== STEP 1: GET DOCUMENT =====
        const docRef = doc(db, 'documents', documentId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            console.warn('⚠️ Document not found, may already be deleted');
            return { success: true, alreadyDeleted: true };
        }

        const docData = docSnap.data();
        console.log('📄 Document found:', {
            id: documentId,
            userId: docData.userId,
            fileName: docData.fileName,
            storagePath: docData.storagePath
        });

        // ===== STEP 2: DELETE STORAGE FILES =====
        let storageDeleted = false;
        if (docData.storagePath) {
            storageDeleted = await deleteStorageFiles(docData.storagePath);
        }

        // ===== STEP 3: DELETE SUBCOLLECTIONS =====
        await deleteSubcollections(documentId);

        // ===== STEP 4: DELETE FIRESTORE DOCUMENT =====
        try {
            await deleteDoc(docRef);
            console.log('✅ Firestore document deleted');
        } catch (firestoreError) {
            if (firestoreError.code === 'not-found') {
                console.warn('⚠️ Document already deleted');
                return { success: true, alreadyDeleted: true };
            }
            throw firestoreError;
        }

        // ===== STEP 5: UPDATE STATISTICS =====
        await updateStatisticsAfterDeletion(docData.userId, docData.folderId);

        console.log('🎉 Document deletion complete!');
        return {
            success: true,
            storageDeleted,
            documentId
        };

    } catch (error) {
        console.error('❌ DELETE ERROR:', error);

        // Format error message
        let errorMessage = 'Failed to delete document';

        if (error.code === 'permission-denied') {
            errorMessage = 'Permission denied. You do not own this document.';
        } else if (error.code === 'not-found') {
            errorMessage = 'Document not found';
        } else if (error.message) {
            errorMessage = error.message;
        }

        throw new Error(errorMessage);
    }
};


/**
 * Delete files from Storage (with folder cleanup)
 * @param {string} storagePath - Path to file in Storage
 * @returns {Promise<boolean>} Success status
 */
const deleteStorageFiles = async (storagePath) => {
    try {
        console.log('🗂️ Deleting from storage:', storagePath);

        // Delete main file
        try {
            const storageRef = ref(storage, storagePath);
            await deleteObject(storageRef);
            console.log('✅ Main file deleted');
        } catch (error) {
            if (error.code === 'storage/object-not-found') {
                console.warn('⚠️ File not found in storage');
            } else {
                throw error;
            }
        }

        // Delete entire folder
        try {
            const folderPath = storagePath.substring(0, storagePath.lastIndexOf('/'));
            const folderRef = ref(storage, folderPath);
            const filesList = await listAll(folderRef);

            if (filesList.items.length > 0) {
                console.log(`📂 Deleting ${filesList.items.length} files from folder`);

                const deletePromises = filesList.items.map(item =>
                    deleteObject(item).catch(err => {
                        console.warn(`⚠️ Failed to delete ${item.name}:`, err.message);
                    })
                );

                await Promise.allSettled(deletePromises);
                console.log('✅ Folder cleaned up');
            }
        } catch (folderError) {
            console.warn('⚠️ Folder cleanup warning:', folderError.message);
        }

        return true;

    } catch (error) {
        console.error('❌ Storage deletion error:', error);
        return false;
    }
};


/**
 * Delete all subcollections (pages, etc.)
 * @param {string} documentId - Document ID
 */
const deleteSubcollections = async (documentId) => {
    try {
        // Delete pages subcollection
        const pagesRef = collection(db, 'documents', documentId, 'pages');
        const pagesSnap = await getDocs(pagesRef);

        if (!pagesSnap.empty) {
            console.log(`📑 Deleting ${pagesSnap.size} pages...`);

            const batch = writeBatch(db);
            pagesSnap.docs.forEach(pageDoc => {
                batch.delete(doc(db, 'documents', documentId, 'pages', pageDoc.id));
            });

            await batch.commit();
            console.log('✅ Pages deleted');
        }

        // Add more subcollections here if needed (notes, annotations, etc.)

    } catch (error) {
        console.warn('⚠️ Subcollection deletion warning:', error.message);
        // Non-critical, continue
    }
};


/**
 * Update statistics after document deletion
 * @param {string} userId - User ID
 * @param {string|null} folderId - Folder ID
 */
const updateStatisticsAfterDeletion = async (userId, folderId) => {
    try {
        const batch = writeBatch(db);

        // Update user stats
        if (userId) {
            const userRef = doc(db, 'users', userId);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                const currentCount = userSnap.data().totalDocuments || 0;
                if (currentCount > 0) {
                    batch.update(userRef, {
                        totalDocuments: increment(-1)
                    });
                }
            }
        }

        // Update folder stats
        if (folderId) {
            const folderRef = doc(db, COLLECTIONS.FOLDERS, folderId);
            const folderSnap = await getDoc(folderRef);

            if (folderSnap.exists()) {
                const currentCount = folderSnap.data().docCount || 0;
                if (currentCount > 0) {
                    batch.update(folderRef, {
                        docCount: increment(-1),
                        updatedAt: serverTimestamp()
                    });
                }
            }
        }

        await batch.commit();
        console.log('✅ Statistics updated');

    } catch (error) {
        console.warn('⚠️ Statistics update warning:', error.message);
        // Non-critical, don't throw
    }
};


// ==================== 📖 RETRIEVAL FUNCTIONS ====================


/**
 * Get document by ID
 * @param {string} documentId - Document ID
 * @returns {Promise<Object>} Document data
 */
export const getDocument = async (documentId) => {
    try {
        const docRef = doc(db, 'documents', documentId);
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
 * @param {string} userId - User ID
 * @param {number} limitCount - Maximum documents to return
 * @returns {Promise<Array>} Array of documents
 */
export const getUserDocuments = async (userId, limitCount = 100) => {
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
 * @param {string} userId - User ID
 * @param {string} subject - Subject name
 * @returns {Promise<Array>} Array of documents
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
 * Search documents by keyword
 * @param {string} userId - User ID
 * @param {string} searchTerm - Search term
 * @returns {Promise<Array>} Matching documents
 */
export const searchDocuments = async (userId, searchTerm) => {
    try {
        const allDocs = await getUserDocuments(userId);
        const searchLower = searchTerm.toLowerCase();

        return allDocs.filter(doc => {
            const title = (doc.title || '').toLowerCase();
            const fileName = (doc.fileName || '').toLowerCase();
            const subject = (doc.subject || '').toLowerCase();
            const keywords = (doc.keywords || []).join(' ').toLowerCase();

            return (
                title.includes(searchLower) ||
                fileName.includes(searchLower) ||
                subject.includes(searchLower) ||
                keywords.includes(searchLower)
            );
        });
    } catch (error) {
        console.error('Error searching documents:', error);
        return [];
    }
};


/**
 * Update document metadata
 * @param {string} documentId - Document ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<void>}
 */
export const updateDocument = async (documentId, updates) => {
    try {
        const docRef = doc(db, 'documents', documentId);
        await updateDoc(docRef, {
            ...updates,
            updatedAt: serverTimestamp()
        });
        console.log('✅ Document updated:', documentId);
    } catch (error) {
        console.error('Error updating document:', error);
        throw error;
    }
};


// ==================== 📊 STATISTICS & TRACKING ====================


/**
 * Increment view count
 * @param {string} documentId - Document ID
 */
export const incrementViewCount = async (documentId) => {
    try {
        const docRef = doc(db, 'documents', documentId);
        await updateDoc(docRef, {
            viewCount: increment(1),
            lastViewedAt: serverTimestamp()
        });
    } catch (error) {
        console.warn('Failed to update view count:', error);
    }
};


/**
 * Update study time (✅ NOW WITH ACHIEVEMENT TRACKING)
 * @param {string} documentId - Document ID
 * @param {number} seconds - Study time in seconds
 * @param {string} userId - User ID (optional, for tracking)
 */
export const updateStudyTime = async (documentId, seconds, userId = null) => {
    try {
        const docRef = doc(db, 'documents', documentId);
        await updateDoc(docRef, {
            totalStudyTime: increment(seconds),
            lastStudiedAt: serverTimestamp()
        });

        // ✅ NEW: Track study time achievement
        if (userId && seconds > 0) {
            trackAction(userId, 'STUDY_TIME', { seconds }).catch(err =>
                console.warn('⚠️ Achievement tracking warning:', err.message)
            );
        }
    } catch (error) {
        console.warn('Failed to update study time:', error);
    }
};


/**
 * Update reading progress
 * @param {string} documentId - Document ID
 * @param {number} progress - Progress percentage (0-100)
 */
export const updateReadingProgress = async (documentId, progress) => {
    try {
        const docRef = doc(db, 'documents', documentId);
        await updateDoc(docRef, {
            readingProgress: Math.min(100, Math.max(0, progress)),
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        console.warn('Failed to update reading progress:', error);
    }
};


// ==================== 🔄 RE-DETECT SUBJECT (NEW UTILITY) ====================


/**
 * Re-detect subject for existing document using AI
 * @param {string} documentId - Document ID
 * @returns {Promise<Object>} Updated subject info
 */
export const redetectDocumentSubject = async (documentId) => {
    try {
        console.log('🔄 Re-detecting subject for:', documentId);

        const docData = await getDocument(documentId);

        if (!docData.extractedText || docData.extractedText.length < 50) {
            throw new Error('Insufficient text for detection');
        }

        const detection = await detectSubjectHybrid({
            title: docData.title || docData.fileName,
            content: docData.extractedText,
            fileName: docData.fileName
        });

        if (detection && detection.subject) {
            await updateDocument(documentId, {
                subject: detection.subject,
                subjectConfidence: detection.confidence,
                detectionMethod: detection.method
            });

            console.log(`✅ Re-detected: ${detection.subject} (${detection.confidence}%)`);

            return {
                success: true,
                subject: detection.subject,
                confidence: detection.confidence,
                method: detection.method
            };
        }

        throw new Error('Detection failed');

    } catch (error) {
        console.error('❌ Re-detection error:', error);
        throw error;
    }
};


// ==================== 🎯 LEGACY COMPATIBILITY ====================


/**
 * Legacy upload function (wrapper for new implementation)
 * @deprecated Use initiateDocumentUpload + createDocumentRecord instead
 */
export const uploadDocument = async (file, userId, metadata = {}) => {
    console.warn('⚠️ Using deprecated uploadDocument function');

    const { uploadTask, storagePath } = initiateDocumentUpload(file, userId);

    // Wait for upload
    await new Promise((resolve, reject) => {
        uploadTask.on('state_changed', null, reject, resolve);
    });

    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

    // Extract text
    const extraction = await extractTextFromPDF(file);

    // Create record (now with AI detection + achievement tracking)
    return createDocumentRecord(userId, file, {
        downloadURL,
        storagePath,
        extractedText: extraction.fullText,
        pageTexts: extraction.pageTexts,
        numPages: extraction.numPages,
        totalWords: extraction.totalWords,
        context: { subject: metadata.subject }
    });
};


// ==================== 📦 EXPORTS ====================


export default {
    // Upload
    initiateDocumentUpload,
    createDocumentRecord,
    uploadDocument, // deprecated

    // Delete
    deleteDocument,

    // Retrieval
    getDocument,
    getUserDocuments,
    getDocumentsBySubject,
    searchDocuments,

    // Update
    updateDocument,
    redetectDocumentSubject,

    // Tracking
    incrementViewCount,
    updateStudyTime, // ✅ NOW WITH ACHIEVEMENT TRACKING
    updateReadingProgress,

    // Utilities
    extractTextFromPDF,
    extractKeywords
};
