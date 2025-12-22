
// src/features/study/services/documentService.js - 🚀 PERFECT EDITION
// ✅ Real-time page-by-page updates | ✅ Cancellation support | ✅ All exports included
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
    writeBatch,
    arrayUnion
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { db, storage, COLLECTIONS } from '@shared/config/firebase';
import { detectSubjectHybrid } from '@shared/utils/subjectDetection';
import { trackAction } from '@gamification/services/achievementTracker';
import { eventBus, EVENT_TYPES } from '@shared/services/eventBus';
import * as pdfjsLib from 'pdfjs-dist';
import toast from 'react-hot-toast';

// Visual analysis
import { analyzePageVisually } from './visualAnalysisService';

// PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;

// ==================== 📋 CONFIG ====================

const CONFIG = {
    MAX_FILE_SIZE: 50 * 1024 * 1024,
    MAX_PAGES_EXTRACT: 500,
    MAX_PAGES_VISUAL: 50,
    MAX_KEYWORDS: 50,
    BATCH_SIZE: 500,
    MAX_PAGES_SAVE: 100,
    MIN_TEXT_LENGTH_FOR_AI: 50,

    // Features
    ENABLE_VISUAL_ANALYSIS: true,
    ENABLE_GAMIFICATION: true,
    ENABLE_ANALYTICS: true,
    ENABLE_AUTO_QUIZ: false,
    ENABLE_AUTO_FLASHCARDS: false,

    // Real-time updates
    UPDATE_INTERVAL_MS: 100, // Update Firestore after each page
};

// ==================== 🛑 CANCELLATION ====================

const activeProcesses = new Map();

export const cancelBackgroundProcessing = (docId) => {
    const controller = activeProcesses.get(docId);
    if (controller) {
        console.log('🛑 Cancelling background processing:', docId);
        controller.abort();
        activeProcesses.delete(docId);
        return true;
    }
    return false;
};

const shouldContinueProcessing = (docId, signal) => {
    if (signal?.aborted) {
        console.log('⏹️ Processing cancelled:', docId);
        return false;
    }
    return true;
};

// ==================== 📝 TEXT EXTRACTION ====================

export const extractTextFromPDF = async (file, onProgress = null, options = {}) => {
    try {
        if (!file || file.size === 0) {
            throw new Error('Invalid or empty file');
        }

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        const startPage = options.startPage || 1;
        const endPage = options.endPage || Math.min(pdf.numPages, CONFIG.MAX_PAGES_EXTRACT);

        let fullText = '';
        const pageTexts = [];

        for (let i = startPage; i <= endPage; i++) {
            if (options.signal?.aborted) {
                console.log('⏹️ Text extraction cancelled at page', i);
                break;
            }

            try {
                if (onProgress) {
                    onProgress({
                        current: i,
                        total: endPage,
                        status: `Extracting page ${i}/${endPage}...`,
                        phase: 'text-extraction',
                        progress: Math.round((i / endPage) * 100)
                    });
                }

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

        return {
            fullText: fullText.trim(),
            pageTexts,
            numPages: pdf.numPages,
            extractedPages: pageTexts.length,
            totalWords: fullText.split(/\s+/).filter(w => w.length > 0).length,
            success: true
        };

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

export const extractKeywords = (text, maxKeywords = CONFIG.MAX_KEYWORDS) => {
    if (!text || text.length < 10) return [];

    const stopWords = new Set([
        'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but', 'in',
        'with', 'to', 'for', 'of', 'as', 'by', 'this', 'that', 'from', 'are',
        'was', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did',
        'will', 'would', 'could', 'should', 'can', 'may', 'might', 'must',
        'it', 'its', 'they', 'them', 'their', 'we', 'our', 'you', 'your'
    ]);

    const words = text
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word =>
            word.length > 3 &&
            !stopWords.has(word) &&
            !/^\d+$/.test(word)
        );

    const wordFreq = {};
    words.forEach(word => {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    return Object.entries(wordFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, maxKeywords)
        .map(([word]) => word);
};

// ==================== 📤 UPLOAD ====================

const validateFile = (file) => {
    if (!file) throw new Error('No file provided');
    if (!file.type.includes('pdf')) throw new Error('Only PDF files supported');
    if (file.size > CONFIG.MAX_FILE_SIZE) {
        throw new Error(`File must be less than ${CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB`);
    }
    if (file.size === 0) throw new Error('File is empty');
};

export const initiateDocumentUpload = (file, userId) => {
    validateFile(file);
    if (!userId) throw new Error('User ID required');

    const timestamp = Date.now();
    const sanitizedFileName = file.name
        .replace(/[^a-zA-Z0-9.-]/g, '_')
        .substring(0, 100);

    const storagePath = `documents/${userId}/${timestamp}_${sanitizedFileName}`;
    const storageRef = ref(storage, storagePath);

    const uploadTask = uploadBytesResumable(storageRef, file, {
        contentType: 'application/pdf',
        customMetadata: {
            userId,
            originalName: file.name,
            uploadTimestamp: timestamp.toString()
        }
    });

    return { uploadTask, storageRef, storagePath };
};

// ==================== 🚀 FAST TRACK ====================

export const processDocumentFastTrack = async (userId, file, uploadData, onProgress = null) => {
    const startTime = Date.now();
    let docId = null;

    try {
        console.log('🚀 FAST TRACK: Processing first page...');
        const { downloadURL, storagePath, context = {} } = uploadData;

        // ===== STEP 1: Extract FIRST PAGE =====
        if (onProgress) onProgress({ phase: 'text-extraction', status: 'Reading first page...', progress: 10 });

        const firstPageResult = await extractTextFromPDF(file, null, {
            startPage: 1,
            endPage: 1
        });

        const firstPageText = firstPageResult.fullText;
        const totalPages = firstPageResult.numPages;

        // ===== STEP 2: Subject detection =====
        if (onProgress) onProgress({ phase: 'ai-detection', status: 'Analyzing content...', progress: 30 });

        let subject = 'General Studies';
        let subjectConfidence = 0;
        let detectionMethod = 'default';

        if (firstPageText && firstPageText.length > CONFIG.MIN_TEXT_LENGTH_FOR_AI) {
            try {
                const detection = await detectSubjectHybrid({
                    title: file.name.replace('.pdf', ''),
                    content: firstPageText,
                    fileName: file.name
                });
                if (detection?.subject) {
                    subject = detection.subject;
                    subjectConfidence = detection.confidence || 0;
                    detectionMethod = detection.method || 'ai';
                }
            } catch (e) {
                console.warn('AI detection failed, using default');
            }
        }

        if (context.subject && context.subject !== 'General Studies') {
            subject = context.subject;
            subjectConfidence = 100;
            detectionMethod = 'user_provided';
        }

        // ===== STEP 3: First page visual analysis =====
        if (onProgress) onProgress({ phase: 'visual-analysis', status: 'Creating visual for page 1...', progress: 50 });

        let firstVisualPage = null;
        if (CONFIG.ENABLE_VISUAL_ANALYSIS) {
            try {
                firstVisualPage = await analyzePageVisually(file, 1, firstPageText);
                console.log('✅ First page visual complete');
            } catch (e) {
                console.warn('First page visual failed:', e);
            }
        }

        // ===== STEP 4: Create document =====
        if (onProgress) onProgress({ phase: 'saving', status: 'Saving document...', progress: 80 });

        const docData = {
            title: file.name.replace('.pdf', ''),
            fileName: file.name,
            userId,
            fileSize: file.size,
            downloadURL,
            storagePath,

            // Status
            status: totalPages > 1 ? 'processing' : 'completed',
            processingStage: 'fast-track-complete',
            currentPage: 1,
            totalPages,

            // Content
            pages: totalPages,
            totalWords: firstPageResult.totalWords,
            extractedText: firstPageText,
            keywords: extractKeywords(firstPageText),

            // Classification
            subject,
            subjectConfidence,
            detectionMethod,
            purpose: context.purpose || '',
            folderId: context.folderId || null,
            tags: context.tags || [],

            // Visual
            hasVisualAnalysis: !!firstVisualPage,
            visualPages: firstVisualPage ? [firstVisualPage] : [],
            visualPagesCount: firstVisualPage ? 1 : 0,
            visualAnalysisDate: firstVisualPage ? serverTimestamp() : null,

            // Timestamps
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            processingStartedAt: serverTimestamp(),

            // Stats
            totalStudyTime: 0,
            lastStudiedAt: null,
            readingProgress: 0,
            viewCount: 0,
            quizCount: 0,
            flashcardCount: 0,
            summaryCount: 0,

            // Flags
            isArchived: false,
            isFavorite: false,

            // Metadata
            processingMetadata: {
                fastTrackUsed: true,
                firstPageReady: true,
                backgroundProcessing: totalPages > 1,
                version: '3.0'
            }
        };

        const docRef = await addDoc(collection(db, 'documents'), docData);
        docId = docRef.id;

        // Save first page
        if (firstPageResult.pageTexts?.length > 0) {
            await savePages(docId, firstPageResult.pageTexts);
        }

        await updateStatistics(userId, context.folderId);

        if (CONFIG.ENABLE_GAMIFICATION) {
            trackAction(userId, 'DOCUMENT_UPLOADED', {
                documentId: docId,
                subject,
                hasVisualAnalysis: !!firstVisualPage
            }).catch(err => console.warn('Achievement tracking:', err.message));
        }

        if (onProgress) onProgress({ phase: 'complete', status: 'Ready!', progress: 100 });

        const processingTime = Date.now() - startTime;
        console.log(`✅ Fast track complete in ${processingTime}ms. Doc: ${docId}`);

        // ===== STEP 5: Background processing =====
        if (totalPages > 1) {
            console.log(`📦 Starting background processing for pages 2-${totalPages}`);

            const controller = new AbortController();
            activeProcesses.set(docId, controller);

            // Fire and forget
            processRemainingPagesBackground(
                docId,
                userId,
                file,
                subject,
                totalPages,
                controller.signal
            ).catch(err => {
                console.error('Background error:', err);
            }).finally(() => {
                activeProcesses.delete(docId);
            });
        }

        return {
            success: true,
            docId,
            subject,
            subjectConfidence,
            hasVisualAnalysis: !!firstVisualPage,
            visualPagesProcessed: firstVisualPage ? 1 : 0,
            totalPages,
            processingTime
        };

    } catch (error) {
        console.error('❌ Fast track failed:', error);

        if (docId) {
            try {
                await deleteDoc(doc(db, 'documents', docId));
            } catch (cleanupError) {
                console.warn('Cleanup warning:', cleanupError);
            }
        }

        throw new Error(`Failed to process: ${error.message}`);
    }
};

// ==================== 🏭 BACKGROUND PROCESSING (ONE PAGE AT A TIME) ====================

const processRemainingPagesBackground = async (docId, userId, file, subject, totalPages, signal) => {
    try {
        console.log(`🏭 BACKGROUND: Processing pages 2-${totalPages} ONE BY ONE`);

        if (!shouldContinueProcessing(docId, signal)) {
            console.log('⏹️ Cancelled before start');
            return;
        }

        let accumulatedText = '';
        const docRef = doc(db, 'documents', docId);

        // ===== PROCESS EACH PAGE INDIVIDUALLY =====
        for (let pageNum = 2; pageNum <= Math.min(totalPages, CONFIG.MAX_PAGES_VISUAL); pageNum++) {
            if (!shouldContinueProcessing(docId, signal)) {
                console.log(`⏹️ Stopped at page ${pageNum}`);
                break;
            }

            try {
                console.log(`📄 Processing page ${pageNum}/${totalPages}...`);

                // Extract THIS page
                const pageTextResult = await extractTextFromPDF(file, null, {
                    startPage: pageNum,
                    endPage: pageNum,
                    signal
                });

                if (pageTextResult.success && pageTextResult.pageTexts.length > 0) {
                    const pageData = pageTextResult.pageTexts[0];
                    accumulatedText += pageData.text + '\n\n';

                    // Save page text
                    await savePages(docId, [pageData]);

                    // Analyze visually
                    let visualPage = null;
                    if (CONFIG.ENABLE_VISUAL_ANALYSIS) {
                        try {
                            visualPage = await analyzePageVisually(file, pageNum, pageData.text);
                            console.log(`✅ Page ${pageNum} visual complete`);
                        } catch (visualError) {
                            console.warn(`Visual failed for page ${pageNum}:`, visualError.message);
                        }
                    }

                    // ===== UPDATE FIRESTORE IMMEDIATELY (REAL-TIME) =====
                    const updates = {
                        currentPage: pageNum, // Track progress
                        updatedAt: serverTimestamp()
                    };

                    if (visualPage) {
                        updates.visualPages = arrayUnion(visualPage);
                        updates.hasVisualAnalysis = true;
                        updates.visualPagesCount = increment(1);
                    }

                    await updateDoc(docRef, updates);

                    console.log(`✅ Page ${pageNum} saved to Firestore (REAL-TIME UPDATE)`);
                }

                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, CONFIG.UPDATE_INTERVAL_MS));

            } catch (pageError) {
                console.warn(`⚠️ Page ${pageNum} failed:`, pageError.message);
                // Continue with next page
            }
        }

        if (!shouldContinueProcessing(docId, signal)) {
            console.log('⏹️ Cancelled before completion');
            return;
        }

        // ===== Extract remaining text (no visual analysis) =====
        if (totalPages > CONFIG.MAX_PAGES_VISUAL) {
            console.log(`📚 Extracting text from pages ${CONFIG.MAX_PAGES_VISUAL + 1}-${totalPages}...`);

            const remainingTextResult = await extractTextFromPDF(file, null, {
                startPage: CONFIG.MAX_PAGES_VISUAL + 1,
                endPage: Math.min(totalPages, CONFIG.MAX_PAGES_EXTRACT),
                signal
            });

            if (remainingTextResult.success) {
                accumulatedText += remainingTextResult.fullText;

                if (remainingTextResult.pageTexts.length > 0) {
                    await savePages(docId, remainingTextResult.pageTexts);
                }
            }
        }

        // ===== FINAL UPDATE =====
        const finalUpdates = {
            extractedText: accumulatedText.trim(),
            totalWords: accumulatedText.split(/\s+/).filter(w => w.length > 0).length,
            keywords: extractKeywords(accumulatedText),
            status: 'completed',
            processingStage: 'complete',
            currentPage: totalPages,
            processingCompletedAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        // ===== SUBJECT RE-DETECTION (with full document text) =====
        // Only re-detect if current subject is 'General Studies' or confidence is low
        try {
            const docSnap = await getDoc(docRef);
            const currentData = docSnap.data();
            const shouldRedetect = !currentData?.subject ||
                currentData.subject === 'General Studies' ||
                (currentData.subjectConfidence && currentData.subjectConfidence < 70);

            if (shouldRedetect && accumulatedText.length > 500) {
                console.log('🔄 Re-detecting subject with full document text...');
                const detection = await detectSubjectHybrid({
                    title: currentData?.title || '',
                    content: accumulatedText.substring(0, 15000),
                    fileName: currentData?.fileName || ''
                });

                if (detection?.subject && detection.subject !== 'General Studies') {
                    finalUpdates.subject = detection.subject;
                    finalUpdates.subjectConfidence = detection.confidence;
                    finalUpdates.detectionMethod = detection.method;
                    console.log(`✅ Subject updated to: ${detection.subject} (${detection.confidence}%)`);
                }
            }
        } catch (redetectError) {
            console.warn('Subject re-detection skipped:', redetectError.message);
        }

        await updateDoc(docRef, finalUpdates);

        console.log('✅ Background processing complete for', docId);

        if (CONFIG.ENABLE_ANALYTICS) {
            eventBus.publish(EVENT_TYPES.DOCUMENT_PROCESSED, {
                userId,
                documentId: docId,
                hasVisualAnalysis: true,
                totalPages
            });
        }

    } catch (error) {
        console.error('❌ Background failed:', error);

        await updateDoc(doc(db, 'documents', docId), {
            status: 'error',
            processingStage: 'background_failed',
            processingError: error.message,
            updatedAt: serverTimestamp()
        }).catch(e => console.warn('Failed to update error status:', e));
    }
};

// ==================== 💾 HELPERS ====================

const savePages = async (docId, pageTexts) => {
    if (!pageTexts || pageTexts.length === 0) return;

    const batchSize = CONFIG.BATCH_SIZE;
    const pages = pageTexts.slice(0, CONFIG.MAX_PAGES_SAVE);

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
};

const updateStatistics = async (userId, folderId) => {
    const batch = writeBatch(db);

    try {
        const userRef = doc(db, 'users', userId);
        batch.update(userRef, {
            totalDocuments: increment(1),
            lastUploadAt: serverTimestamp()
        });

        if (folderId) {
            const folderRef = doc(db, COLLECTIONS.FOLDERS, folderId);
            batch.update(folderRef, {
                docCount: increment(1),
                updatedAt: serverTimestamp()
            });
        }

        await batch.commit();
    } catch (error) {
        console.warn('Statistics update:', error.message);
    }
};

// ==================== 🔄 SUBJECT REDETECTION ====================

export const redetectDocumentSubject = async (documentId) => {
    try {
        console.log('🔄 Re-detecting subject for:', documentId);

        const docRef = doc(db, 'documents', documentId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            throw new Error('Document not found');
        }

        const docData = docSnap.data();
        const content = docData.extractedText || '';
        const title = docData.title || '';
        const fileName = docData.fileName || '';

        if (!content || content.length < CONFIG.MIN_TEXT_LENGTH_FOR_AI) {
            throw new Error('Insufficient text for AI detection');
        }

        const detection = await detectSubjectHybrid({
            title,
            content: content.substring(0, 15000), // First 15k chars
            fileName
        });

        if (!detection || !detection.subject) {
            throw new Error('Detection failed');
        }

        await updateDoc(docRef, {
            subject: detection.subject,
            subjectConfidence: detection.confidence || 0,
            detectionMethod: detection.method || 'ai',
            updatedAt: serverTimestamp()
        });

        console.log(`✅ Subject updated to: ${detection.subject}`);

        return {
            success: true,
            subject: detection.subject,
            confidence: detection.confidence,
            method: detection.method
        };

    } catch (error) {
        console.error('❌ Re-detection failed:', error);
        throw new Error(`Failed to re-detect subject: ${error.message}`);
    }
};

// ==================== 🗑️ DELETE ====================

export const deleteDocument = async (documentId) => {
    try {
        console.log('🗑️ Deleting document:', documentId);

        cancelBackgroundProcessing(documentId);

        if (!documentId) throw new Error('Document ID required');

        const docRef = doc(db, 'documents', documentId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            return { success: true, alreadyDeleted: true };
        }

        const docData = docSnap.data();

        if (docData.storagePath) {
            await deleteStorageFiles(docData.storagePath);
        }

        await deleteSubcollections(documentId);
        await deleteDoc(docRef);
        await updateStatisticsAfterDeletion(docData.userId, docData.folderId);

        console.log('✅ Document deleted');
        return { success: true, documentId };

    } catch (error) {
        console.error('❌ Delete error:', error);
        throw new Error(`Failed to delete: ${error.message}`);
    }
};

const deleteStorageFiles = async (storagePath) => {
    try {
        const storageRef = ref(storage, storagePath);
        await deleteObject(storageRef).catch(err => {
            if (err.code !== 'storage/object-not-found') throw err;
        });

        const folderPath = storagePath.substring(0, storagePath.lastIndexOf('/'));
        const folderRef = ref(storage, folderPath);
        const filesList = await listAll(folderRef);

        if (filesList.items.length > 0) {
            await Promise.allSettled(
                filesList.items.map(item => deleteObject(item))
            );
        }

        return true;
    } catch (error) {
        console.error('Storage deletion error:', error);
        return false;
    }
};

const deleteSubcollections = async (documentId) => {
    try {
        const pagesRef = collection(db, 'documents', documentId, 'pages');
        const pagesSnap = await getDocs(pagesRef);

        if (!pagesSnap.empty) {
            const batch = writeBatch(db);
            pagesSnap.docs.forEach(pageDoc => {
                batch.delete(doc(db, 'documents', documentId, 'pages', pageDoc.id));
            });
            await batch.commit();
        }
    } catch (error) {
        console.warn('Subcollection deletion:', error.message);
    }
};

const updateStatisticsAfterDeletion = async (userId, folderId) => {
    try {
        const batch = writeBatch(db);

        if (userId) {
            const userRef = doc(db, 'users', userId);
            batch.update(userRef, { totalDocuments: increment(-1) });
        }

        if (folderId) {
            const folderRef = doc(db, COLLECTIONS.FOLDERS, folderId);
            batch.update(folderRef, {
                docCount: increment(-1),
                updatedAt: serverTimestamp()
            });
        }

        await batch.commit();
    } catch (error) {
        console.warn('Statistics update:', error.message);
    }
};

// ==================== 📖 RETRIEVAL ====================

export const getDocument = async (documentId, includePages = false) => {
    try {
        const docRef = doc(db, 'documents', documentId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            throw new Error('Document not found');
        }

        const docData = {
            id: docSnap.id,
            ...docSnap.data()
        };

        if (includePages) {
            const pagesRef = collection(db, 'documents', documentId, 'pages');
            const pagesSnap = await getDocs(pagesRef);

            docData.pages = pagesSnap.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .sort((a, b) => a.pageNum - b.pageNum);
        }

        return docData;
    } catch (error) {
        console.error('Error getting document:', error);
        throw error;
    }
};

export const getUserDocuments = async (userId, options = {}) => {
    try {
        const {
            limitCount = 100,
            subject = null,
            folderId = null,
            includeArchived = false,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = options;

        let q = query(
            collection(db, 'documents'),
            where('userId', '==', userId)
        );

        if (subject) q = query(q, where('subject', '==', subject));
        if (folderId) q = query(q, where('folderId', '==', folderId));
        if (!includeArchived) q = query(q, where('isArchived', '==', false));

        q = query(q, orderBy(sortBy, sortOrder));
        q = query(q, limit(limitCount));

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

export const searchDocuments = async (userId, searchTerm) => {
    try {
        const allDocs = await getUserDocuments(userId, { limitCount: 500 });
        const searchLower = searchTerm.toLowerCase().trim();

        if (!searchLower) return allDocs;

        return allDocs.filter(doc => {
            const title = (doc.title || '').toLowerCase();
            const fileName = (doc.fileName || '').toLowerCase();
            const subject = (doc.subject || '').toLowerCase();
            const keywords = (doc.keywords || []).join(' ').toLowerCase();
            const tags = (doc.tags || []).join(' ').toLowerCase();

            return (
                title.includes(searchLower) ||
                fileName.includes(searchLower) ||
                subject.includes(searchLower) ||
                keywords.includes(searchLower) ||
                tags.includes(searchLower)
            );
        });
    } catch (error) {
        console.error('Error searching:', error);
        return [];
    }
};

export const updateDocument = async (documentId, updates) => {
    try {
        const docRef = doc(db, 'documents', documentId);
        await updateDoc(docRef, {
            ...updates,
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        console.error('Error updating:', error);
        throw error;
    }
};

// ==================== 📊 TRACKING ====================

export const incrementViewCount = async (documentId) => {
    try {
        const docRef = doc(db, 'documents', documentId);
        await updateDoc(docRef, {
            viewCount: increment(1),
            lastViewedAt: serverTimestamp()
        });
    } catch (error) {
        console.warn('View count update failed:', error);
    }
};

export const updateStudyTime = async (documentId, seconds, userId = null) => {
    try {
        const docRef = doc(db, 'documents', documentId);
        await updateDoc(docRef, {
            totalStudyTime: increment(seconds),
            lastStudiedAt: serverTimestamp()
        });

        if (userId && seconds > 0 && CONFIG.ENABLE_GAMIFICATION) {
            trackAction(userId, 'STUDY_TIME', {
                seconds,
                documentId
            }).catch(err => console.warn('Achievement tracking:', err.message));
        }

        if (CONFIG.ENABLE_ANALYTICS) {
            eventBus.publish(EVENT_TYPES.STUDY_SESSION_ENDED, {
                userId,
                documentId,
                duration: seconds
            });
        }
    } catch (error) {
        console.warn('Study time update failed:', error);
    }
};

export const updateReadingProgress = async (documentId, progress) => {
    try {
        const docRef = doc(db, 'documents', documentId);
        await updateDoc(docRef, {
            readingProgress: Math.min(100, Math.max(0, progress)),
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        console.warn('Reading progress update failed:', error);
    }
};

// ==================== 📦 EXPORTS ====================

export default {
    // Upload
    initiateDocumentUpload,
    processDocumentFastTrack,

    // Cancellation
    cancelBackgroundProcessing,

    // Subject detection
    redetectDocumentSubject,

    // Delete
    deleteDocument,

    // Retrieval
    getDocument,
    getUserDocuments,
    searchDocuments,

    // Update
    updateDocument,

    // Tracking
    incrementViewCount,
    updateStudyTime,
    updateReadingProgress,

    // Utilities
    extractTextFromPDF,
    extractKeywords
};