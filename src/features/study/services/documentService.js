// src/features/study/services/documentService.js
// 🎯 ULTIMATE PRODUCTION EDITION v4.0
// ✨ Real-time updates | 🛡️ Bulletproof error handling | 🚀 Maximum performance

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
import {
    ref,
    uploadBytesResumable,
    getDownloadURL,
    deleteObject,
    listAll
} from 'firebase/storage';
import { db, storage, COLLECTIONS } from '@shared/config/firebase';
import { detectSubjectHybrid } from '@shared/utils/subjectDetection';
import { trackAction } from '@gamification/services/achievementTracker';
import { eventBus, EVENT_TYPES } from '@shared/services/eventBus';
import * as pdfjsLib from 'pdfjs-dist';
import toast from 'react-hot-toast';

// Visual analysis service
import { analyzePageVisually } from './visualAnalysisService';

// ════════════════════════════════════════════════════════════════════════════════
// 🔧 CONFIGURATION & INITIALIZATION
// ════════════════════════════════════════════════════════════════════════════════

const CONFIG = {
    // File constraints
    MAX_FILE_SIZE: 50 * 1024 * 1024,        // 50MB
    MAX_PAGES_EXTRACT: 500,
    MAX_PAGES_VISUAL: 50,
    MAX_KEYWORDS: 50,
    BATCH_SIZE: 500,
    MAX_PAGES_SAVE: 100,

    // Content thresholds
    MIN_TEXT_LENGTH_FOR_AI: 50,
    MIN_PAGE_TEXT_LENGTH: 30,

    // Feature flags
    ENABLE_VISUAL_ANALYSIS: true,
    ENABLE_GAMIFICATION: true,
    ENABLE_ANALYTICS: true,
    ENABLE_AUTO_QUIZ: false,
    ENABLE_AUTO_FLASHCARDS: false,

    // Real-time updates (update Firestore every N pages)
    UPDATE_EVERY_N_PAGES: 1,                // Update after each page
    RATE_LIMIT_DELAY: 1500,                  // 1.5s between operations to ensure UI "tick" effect

    // Retry configuration
    MAX_RETRIES: 3,
    RETRY_DELAY_BASE: 1000,

    // Timeouts
    PAGE_TIMEOUT: 30000,                    // 30s per page
    UPLOAD_TIMEOUT: 300000,                 // 5min upload

    // Memory management
    ENABLE_GARBAGE_COLLECTION: true,
    GC_INTERVAL: 10                         // Run GC every 10 pages
};

// PDF.js worker configuration
pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

// Active process tracking for cancellation
const activeProcesses = new Map();

// Performance metrics
const performanceMetrics = {
    totalUploads: 0,
    successfulUploads: 0,
    failedUploads: 0,
    averageProcessingTime: 0
};

// ════════════════════════════════════════════════════════════════════════════════
// 🛡️ VALIDATION & ERROR HANDLING
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Validate PDF file before processing
 * @param {File} file - File to validate
 * @throws {Error} If validation fails
 */
const validateFile = (file) => {
    if (!file) {
        throw new Error('No file provided');
    }

    if (!(file instanceof File)) {
        throw new Error('Invalid file object');
    }

    if (!file.type.includes('pdf')) {
        throw new Error('Only PDF files are supported');
    }

    if (file.size === 0) {
        throw new Error('File is empty');
    }

    if (file.size > CONFIG.MAX_FILE_SIZE) {
        const maxSizeMB = CONFIG.MAX_FILE_SIZE / (1024 * 1024);
        throw new Error(`File size must be less than ${maxSizeMB}MB`);
    }
};

/**
 * Validate user ID
 * @param {string} userId - User ID to validate
 * @throws {Error} If validation fails
 */
const validateUserId = (userId) => {
    if (!userId || typeof userId !== 'string') {
        throw new Error('Valid user ID is required');
    }

    if (userId.trim().length === 0) {
        throw new Error('User ID cannot be empty');
    }
};

/**
 * Safe async operation with retry logic
 * @param {Function} operation - Async operation to execute
 * @param {number} maxRetries - Maximum retry attempts
 * @param {string} operationName - Name for logging
 * @returns {Promise<any>} Operation result
 */
const retryOperation = async (operation, maxRetries = CONFIG.MAX_RETRIES, operationName = 'operation') => {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;

            if (attempt < maxRetries) {
                const delay = CONFIG.RETRY_DELAY_BASE * Math.pow(2, attempt - 1);
                console.warn(`⚠️ ${operationName} failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`);
                await sleep(delay);
            }
        }
    }

    throw new Error(`${operationName} failed after ${maxRetries} attempts: ${lastError.message}`);
};

/**
 * Sleep utility for delays
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Safe Firestore update with error handling
 */
const safeUpdateDoc = async (docRef, updates, operationName = 'update') => {
    try {
        await updateDoc(docRef, {
            ...updates,
            updatedAt: serverTimestamp()
        });
        return true;
    } catch (error) {
        console.error(`❌ ${operationName} failed:`, error);
        return false;
    }
};

// ════════════════════════════════════════════════════════════════════════════════
// 🛑 CANCELLATION SUPPORT
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Cancel ongoing background processing
 * @param {string} docId - Document ID
 * @returns {boolean} True if cancelled, false if not found
 */
export const cancelBackgroundProcessing = (docId) => {
    const controller = activeProcesses.get(docId);
    if (controller) {
        console.log('🛑 Cancelling background processing:', docId);
        controller.abort();
        activeProcesses.delete(docId);

        // Update document status
        safeUpdateDoc(doc(db, 'documents', docId), {
            status: 'cancelled',
            processingStage: 'cancelled',
            processingError: 'User cancelled processing'
        }).catch(err => console.warn('Failed to update cancel status:', err));

        return true;
    }
    return false;
};

/**
 * Check if processing should continue
 */
const shouldContinueProcessing = (docId, signal) => {
    if (signal?.aborted) {
        console.log('⏹️ Processing cancelled via signal:', docId);
        return false;
    }
    // Double check if it was removed from active processes (manual cancel)
    if (!activeProcesses.has(docId)) {
        console.log('⏹️ Processing cancelled via map removal:', docId);
        return false;
    }
    return true;
};

// ════════════════════════════════════════════════════════════════════════════════
// 📝 TEXT EXTRACTION
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Extract text from PDF with enhanced error handling
 * @param {File} file - PDF file
 * @param {Function} onProgress - Progress callback
 * @param {Object} options - Extraction options
 * @returns {Promise<Object>} Extraction result
 */
export const extractTextFromPDF = async (file, onProgress = null, options = {}) => {
    const startTime = Date.now();

    try {
        if (!file || file.size === 0) {
            throw new Error('Invalid or empty file');
        }

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({
            data: arrayBuffer,
            useWorkerFetch: false,
            isEvalSupported: false,
            useSystemFonts: true
        }).promise;

        const startPage = options.startPage || 1;
        const endPage = options.endPage || Math.min(pdf.numPages, CONFIG.MAX_PAGES_EXTRACT);

        let fullText = '';
        const pageTexts = [];
        let extractedPages = 0;

        console.log(`📄 Extracting text from pages ${startPage}-${endPage}...`);

        for (let i = startPage; i <= endPage; i++) {
            // Check cancellation
            if (options.signal?.aborted) {
                console.log('⏹️ Text extraction cancelled at page', i);
                break;
            }

            try {
                // Progress update
                if (onProgress) {
                    onProgress({
                        current: i,
                        total: endPage,
                        status: `Extracting page ${i}/${endPage}...`,
                        phase: 'text-extraction',
                        progress: Math.round((i / endPage) * 100)
                    });
                }

                // Extract page with timeout
                const page = await Promise.race([
                    pdf.getPage(i),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Page load timeout')), CONFIG.PAGE_TIMEOUT)
                    )
                ]);

                const textContent = await page.getTextContent();
                const pageText = textContent.items
                    .map(item => item.str)
                    .join(' ')
                    .trim()
                    .replace(/\s+/g, ' ');

                if (pageText && pageText.length >= CONFIG.MIN_PAGE_TEXT_LENGTH) {
                    pageTexts.push({
                        pageNum: i,
                        text: pageText,
                        wordCount: pageText.split(/\s+/).length
                    });
                    fullText += pageText + '\n\n';
                    extractedPages++;
                } else {
                    console.warn(`⚠️ Page ${i} has insufficient text (${pageText.length} chars)`);
                }

            } catch (pageError) {
                console.warn(`⚠️ Failed to extract page ${i}:`, pageError.message);
                // Continue with next page
            }
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`✅ Text extraction complete: ${extractedPages} pages in ${duration}s`);

        return {
            fullText: fullText.trim(),
            pageTexts,
            numPages: pdf.numPages,
            extractedPages,
            totalWords: fullText.split(/\s+/).filter(w => w.length > 0).length,
            success: true,
            duration: parseFloat(duration)
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

/**
 * Extract keywords from text with improved algorithm
 * @param {string} text - Text to analyze
 * @param {number} maxKeywords - Maximum keywords to return
 * @returns {string[]} Array of keywords
 */
export const extractKeywords = (text, maxKeywords = CONFIG.MAX_KEYWORDS) => {
    if (!text || text.length < 10) return [];

    const stopWords = new Set([
        'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but', 'in',
        'with', 'to', 'for', 'of', 'as', 'by', 'this', 'that', 'from', 'are',
        'was', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did',
        'will', 'would', 'could', 'should', 'can', 'may', 'might', 'must',
        'it', 'its', 'they', 'them', 'their', 'we', 'our', 'you', 'your',
        'not', 'no', 'yes', 'all', 'when', 'where', 'why', 'how', 'what',
        'there', 'then', 'than', 'also', 'each', 'some', 'such', 'into',
        'just', 'only', 'more', 'most', 'many', 'much', 'very', 'so'
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

    // Count frequency
    const wordFreq = {};
    words.forEach(word => {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    // Return top keywords
    return Object.entries(wordFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, maxKeywords)
        .map(([word]) => word);
};

// ════════════════════════════════════════════════════════════════════════════════
// 📤 UPLOAD INITIALIZATION
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Initiate document upload to Firebase Storage
 * @param {File} file - PDF file to upload
 * @param {string} userId - User ID
 * @returns {Object} Upload task and metadata
 */
export const initiateDocumentUpload = (file, userId) => {
    validateFile(file);
    validateUserId(userId);

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
            uploadTimestamp: timestamp.toString(),
            fileSize: file.size.toString()
        }
    });

    console.log('📤 Upload initiated:', storagePath);

    return { uploadTask, storageRef, storagePath };
};

// ════════════════════════════════════════════════════════════════════════════════
// 🚀 FAST TRACK PROCESSING (First Page Only)
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Process document with fast-track mode (first page ready ASAP)
 * @param {string} userId - User ID
 * @param {File} file - PDF file
 * @param {Object} uploadData - Upload metadata
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Object>} Processing result
 */
export const processDocumentFastTrack = async (userId, file, uploadData, onProgress = null) => {
    const startTime = Date.now();
    let docId = null;
    const processingId = `proc_${Date.now()}`;

    try {
        console.log(`🚀 [${processingId}] Fast track processing started`);
        performanceMetrics.totalUploads++;

        validateUserId(userId);
        validateFile(file);

        const { downloadURL, storagePath, context = {} } = uploadData;

        if (!downloadURL) {
            throw new Error('Download URL is required');
        }

        // ═══ STEP 1: Extract first page only ═══
        if (onProgress) {
            onProgress({
                phase: 'text-extraction',
                status: 'Reading first page...',
                progress: 10
            });
        }

        const firstPageResult = await extractTextFromPDF(file, null, {
            startPage: 1,
            endPage: 1
        });

        if (!firstPageResult.success) {
            throw new Error('Failed to extract first page text');
        }

        const firstPageText = firstPageResult.fullText;
        const totalPages = firstPageResult.numPages;

        console.log(`📄 [${processingId}] Extracted first page (${firstPageResult.totalWords} words)`);

        // ═══ STEP 2: AI subject detection ═══
        if (onProgress) {
            onProgress({
                phase: 'ai-detection',
                status: 'Analyzing content...',
                progress: 30
            });
        }

        let subject = 'General Studies';
        let subjectConfidence = 0;
        let detectionMethod = 'default';

        if (firstPageText && firstPageText.length > CONFIG.MIN_TEXT_LENGTH_FOR_AI) {
            try {
                const detection = await retryOperation(
                    () => detectSubjectHybrid({
                        title: file.name.replace('.pdf', ''),
                        content: firstPageText,
                        fileName: file.name
                    }),
                    2,
                    'Subject detection'
                );

                if (detection?.subject) {
                    subject = detection.subject;
                    subjectConfidence = detection.confidence || 0;
                    detectionMethod = detection.method || 'ai';
                    console.log(`🎯 [${processingId}] Subject detected: ${subject} (${subjectConfidence}%)`);
                }
            } catch (detectionError) {
                console.warn('⚠️ AI detection failed, using default:', detectionError.message);
            }
        }

        // User override
        if (context.subject && context.subject !== 'General Studies') {
            subject = context.subject;
            subjectConfidence = 100;
            detectionMethod = 'user_provided';
        }

        // ═══ STEP 3: First page visual analysis ═══
        if (onProgress) {
            onProgress({
                phase: 'visual-analysis',
                status: 'Creating visual for page 1...',
                progress: 50
            });
        }

        let firstVisualPage = null;
        if (CONFIG.ENABLE_VISUAL_ANALYSIS && firstPageText) {
            try {
                firstVisualPage = await retryOperation(
                    () => analyzePageVisually(file, 1, firstPageText),
                    2,
                    'Visual analysis (page 1)'
                );
                console.log(`✅ [${processingId}] First page visual complete`);
            } catch (visualError) {
                console.warn('⚠️ First page visual failed:', visualError.message);
            }
        }

        // ═══ STEP 4: Create document record ═══
        if (onProgress) {
            onProgress({
                phase: 'saving',
                status: 'Saving document...',
                progress: 80
            });
        }

        const docData = {
            // Basic info
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
            keywords: extractKeywords(firstPageText, CONFIG.MAX_KEYWORDS),

            // Classification
            subject,
            subjectConfidence,
            detectionMethod,
            purpose: context.purpose || '',
            folderId: context.folderId || null,
            tags: context.tags || [],

            // Visual analysis
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
                processingId,
                version: '4.0'
            }
        };

        const docRef = await addDoc(collection(db, 'documents'), docData);
        docId = docRef.id;

        console.log(`💾 [${processingId}] Document created: ${docId}`);

        // Save first page text
        if (firstPageResult.pageTexts?.length > 0) {
            await savePages(docId, firstPageResult.pageTexts);
        }

        // Update statistics
        await updateStatistics(userId, context.folderId);

        // Track achievement
        if (CONFIG.ENABLE_GAMIFICATION) {
            trackAction(userId, 'DOCUMENT_UPLOADED', {
                documentId: docId,
                subject,
                hasVisualAnalysis: !!firstVisualPage
            }).catch(err => console.warn('Achievement tracking:', err.message));
        }

        // Final progress update
        if (onProgress) {
            onProgress({
                phase: 'complete',
                status: 'Ready!',
                progress: 100
            });
        }

        const processingTime = Date.now() - startTime;
        console.log(`✅ [${processingId}] Fast track complete in ${processingTime}ms`);

        performanceMetrics.successfulUploads++;
        updateAverageProcessingTime(processingTime);

        // ═══ STEP 5: Start background processing ═══
        if (totalPages > 1) {
            console.log(`📦 [${processingId}] Starting background for pages 2-${totalPages}`);

            const controller = new AbortController();
            activeProcesses.set(docId, controller);

            // Fire and forget
            processRemainingPagesBackground(
                docId,
                userId,
                file,
                subject,
                totalPages,
                processingId,
                controller.signal
            )
                .catch(err => {
                    console.error(`❌ [${processingId}] Background error:`, err);
                })
                .finally(() => {
                    activeProcesses.delete(docId);
                });
        }

        return {
            success: true,
            docId,
            subject,
            subjectConfidence,
            detectionMethod,
            hasVisualAnalysis: !!firstVisualPage,
            visualPagesProcessed: firstVisualPage ? 1 : 0,
            totalPages,
            processingTime,
            processingId
        };

    } catch (error) {
        console.error(`❌ [${processingId}] Fast track failed:`, error);
        performanceMetrics.failedUploads++;

        // Cleanup on failure
        if (docId) {
            try {
                await deleteDoc(doc(db, 'documents', docId));
                console.log(`🗑️ [${processingId}] Cleaned up failed document`);
            } catch (cleanupError) {
                console.warn('Cleanup warning:', cleanupError);
            }
        }

        throw new Error(`Failed to process document: ${error.message}`);
    }
};

// ════════════════════════════════════════════════════════════════════════════════
// 🏭 BACKGROUND PROCESSING (Page-by-Page Real-time Updates)
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Process remaining pages in background with real-time updates
 * @param {string} docId - Document ID
 * @param {string} userId - User ID
 * @param {File} file - PDF file
 * @param {string} subject - Detected subject
 * @param {number} totalPages - Total page count
 * @param {string} processingId - Processing identifier
 * @param {AbortSignal} signal - Cancellation signal
 */
const processRemainingPagesBackground = async (
    docId,
    userId,
    file,
    subject,
    totalPages,
    processingId,
    signal
) => {
    const startTime = Date.now();

    try {
        console.log(`🏭 [${processingId}] Background processing: pages 2-${totalPages}`);

        if (!shouldContinueProcessing(docId, signal)) {
            console.log(`⏹️ [${processingId}] Cancelled before start`);
            return;
        }

        let accumulatedText = '';
        const docRef = doc(db, 'documents', docId);
        let processedCount = 0;

        // Process each page one by one
        const maxPagesToProcess = Math.min(totalPages, CONFIG.MAX_PAGES_VISUAL);

        for (let pageNum = 2; pageNum <= maxPagesToProcess; pageNum++) {
            if (!shouldContinueProcessing(docId, signal)) {
                console.log(`⏹️ [${processingId}] Cancelled at page ${pageNum}`);
                break;
            }

            try {
                console.log(`📄 [${processingId}] Processing page ${pageNum}/${totalPages}...`);

                // Extract this page's text
                const pageResult = await extractTextFromPDF(file, null, {
                    startPage: pageNum,
                    endPage: pageNum,
                    signal
                });

                if (pageResult.success && pageResult.pageTexts.length > 0) {
                    const pageData = pageResult.pageTexts[0];
                    accumulatedText += pageData.text + '\n\n';

                    // Save page text
                    await savePages(docId, [pageData]);

                    // Visual analysis
                    let visualPage = null;
                    if (CONFIG.ENABLE_VISUAL_ANALYSIS) {
                        try {
                            visualPage = await analyzePageVisually(file, pageNum, pageData.text);
                            console.log(`✅ [${processingId}] Page ${pageNum} visual complete`);
                        } catch (visualError) {
                            console.warn(`⚠️ [${processingId}] Visual failed for page ${pageNum}:`, visualError.message);
                        }
                    }

                    // Real-time update to Firestore
                    const updates = {
                        currentPage: pageNum,
                        updatedAt: serverTimestamp()
                    };

                    if (visualPage) {
                        updates.visualPages = arrayUnion(visualPage);
                        updates.hasVisualAnalysis = true;
                        updates.visualPagesCount = increment(1);
                    }

                    await safeUpdateDoc(docRef, updates, `Page ${pageNum} update`);

                    processedCount++;
                    console.log(`✅ [${processingId}] Page ${pageNum} saved (${processedCount} total)`);
                }

                // Rate limiting
                await sleep(CONFIG.RATE_LIMIT_DELAY);

                // Memory management
                if (CONFIG.ENABLE_GARBAGE_COLLECTION && pageNum % CONFIG.GC_INTERVAL === 0) {
                    if (global.gc) {
                        global.gc();
                        console.log(`🧹 [${processingId}] GC at page ${pageNum}`);
                    }
                }

            } catch (pageError) {
                console.warn(`⚠️ [${processingId}] Page ${pageNum} failed:`, pageError.message);
                // Continue with next page
            }
        }

        if (!shouldContinueProcessing(docId, signal)) {
            console.log(`⏹️ [${processingId}] Cancelled before remaining text`);
            return;
        }

        // Extract remaining text (beyond visual analysis limit)
        if (totalPages > CONFIG.MAX_PAGES_VISUAL) {
            console.log(`📚 [${processingId}] Extracting text from pages ${CONFIG.MAX_PAGES_VISUAL + 1}-${totalPages}...`);

            const remainingResult = await extractTextFromPDF(file, null, {
                startPage: CONFIG.MAX_PAGES_VISUAL + 1,
                endPage: Math.min(totalPages, CONFIG.MAX_PAGES_EXTRACT),
                signal
            });

            if (remainingResult.success) {
                accumulatedText += remainingResult.fullText;

                if (remainingResult.pageTexts.length > 0) {
                    await savePages(docId, remainingResult.pageTexts);
                }
            }
        }

        // Final document update
        const finalUpdates = {
            extractedText: accumulatedText.trim(),
            totalWords: accumulatedText.split(/\s+/).filter(w => w.length > 0).length,
            keywords: extractKeywords(accumulatedText, CONFIG.MAX_KEYWORDS),
            status: 'completed',
            processingStage: 'complete',
            currentPage: totalPages,
            processingCompletedAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        // Re-detect subject with full text
        if (accumulatedText.length > 500) {
            try {
                const docSnap = await getDoc(docRef);
                const currentData = docSnap.data();

                const shouldRedetect = !currentData?.subject ||
                    currentData.subject === 'General Studies' ||
                    (currentData.subjectConfidence && currentData.subjectConfidence < 70);

                if (shouldRedetect) {
                    console.log(`🔄 [${processingId}] Re-detecting subject with full text...`);

                    const detection = await detectSubjectHybrid({
                        title: currentData?.title || '',
                        content: accumulatedText.substring(0, 15000),
                        fileName: currentData?.fileName || ''
                    });

                    if (detection?.subject && detection.subject !== 'General Studies') {
                        finalUpdates.subject = detection.subject;
                        finalUpdates.subjectConfidence = detection.confidence;
                        finalUpdates.detectionMethod = detection.method;
                        console.log(`✅ [${processingId}] Subject updated: ${detection.subject} (${detection.confidence}%)`);
                    }
                }
            } catch (redetectError) {
                console.warn('⚠️ Subject re-detection skipped:', redetectError.message);
            }
        }

        await safeUpdateDoc(docRef, finalUpdates, 'Final update');

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`✅ [${processingId}] Background complete in ${duration}s (${processedCount} pages processed)`);

        // Analytics
        if (CONFIG.ENABLE_ANALYTICS) {
            eventBus.publish(EVENT_TYPES.DOCUMENT_PROCESSED, {
                userId,
                documentId: docId,
                hasVisualAnalysis: true,
                totalPages,
                processingTime: parseFloat(duration)
            });
        }

    } catch (error) {
        console.error(`❌ [${processingId}] Background failed:`, error);

        // Update error status
        await safeUpdateDoc(doc(db, 'documents', docId), {
            status: 'error',
            processingStage: 'background_failed',
            processingError: error.message
        }, 'Error status update');
    }
};

// ════════════════════════════════════════════════════════════════════════════════
// 💾 STORAGE HELPERS
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Save page texts to Firestore subcollection
 */
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

/**
 * Update user and folder statistics
 */
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
        console.warn('⚠️ Statistics update failed:', error.message);
    }
};

/**
 * Update average processing time metric
 */
const updateAverageProcessingTime = (newTime) => {
    const { successfulUploads, averageProcessingTime } = performanceMetrics;

    performanceMetrics.averageProcessingTime =
        (averageProcessingTime * (successfulUploads - 1) + newTime) / successfulUploads;
};

// ════════════════════════════════════════════════════════════════════════════════
// 🔄 SUBJECT RE-DETECTION
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Re-detect subject for existing document
 * @param {string} documentId - Document ID
 * @returns {Promise<Object>} Detection result
 */
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

        const detection = await retryOperation(
            () => detectSubjectHybrid({
                title,
                content: content.substring(0, 15000),
                fileName
            }),
            3,
            'Subject re-detection'
        );

        if (!detection || !detection.subject) {
            throw new Error('Detection failed');
        }

        await safeUpdateDoc(docRef, {
            subject: detection.subject,
            subjectConfidence: detection.confidence || 0,
            detectionMethod: detection.method || 'ai'
        }, 'Subject re-detection');

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

// ════════════════════════════════════════════════════════════════════════════════
// 🗑️ DELETION
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Delete document completely
 * @param {string} documentId - Document ID
 * @returns {Promise<Object>} Deletion result
 */
export const deleteDocument = async (documentId) => {
    try {
        console.log('🗑️ Deleting document:', documentId);

        // Cancel any ongoing processing
        cancelBackgroundProcessing(documentId);

        if (!documentId) {
            throw new Error('Document ID required');
        }

        const docRef = doc(db, 'documents', documentId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            return { success: true, alreadyDeleted: true };
        }

        const docData = docSnap.data();

        // Delete storage files
        let storageDeleted = false;
        if (docData.storagePath) {
            storageDeleted = await deleteStorageFiles(docData.storagePath);
        }

        // Delete subcollections
        await deleteSubcollections(documentId);

        // Delete document
        await deleteDoc(docRef);

        // Update statistics
        await updateStatisticsAfterDeletion(docData.userId, docData.folderId);

        // Analytics
        if (CONFIG.ENABLE_ANALYTICS) {
            eventBus.publish(EVENT_TYPES.DOCUMENT_DELETED, {
                userId: docData.userId,
                documentId,
                fileName: docData.fileName,
                subject: docData.subject
            });
        }

        console.log('✅ Document deleted successfully');

        return {
            success: true,
            storageDeleted,
            documentId
        };

    } catch (error) {
        console.error('❌ Delete error:', error);
        throw new Error(`Failed to delete document: ${error.message}`);
    }
};

/**
 * Delete files from Firebase Storage
 */
const deleteStorageFiles = async (storagePath) => {
    try {
        const storageRef = ref(storage, storagePath);

        // Delete main file
        await deleteObject(storageRef).catch(err => {
            if (err.code !== 'storage/object-not-found') throw err;
        });

        // Delete folder
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
        console.error('❌ Storage deletion error:', error);
        return false;
    }
};

/**
 * Delete Firestore subcollections
 */
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
        console.warn('⚠️ Subcollection deletion:', error.message);
    }
};

/**
 * Update statistics after deletion
 */
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
        console.warn('⚠️ Statistics update:', error.message);
    }
};

// ════════════════════════════════════════════════════════════════════════════════
// 📖 RETRIEVAL FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Get document by ID
 * @param {string} documentId - Document ID
 * @param {boolean} includePages - Include pages subcollection
 * @returns {Promise<Object>} Document data
 */
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
        console.error('❌ Error getting document:', error);
        throw error;
    }
};

/**
 * Get user documents with filtering
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of documents
 */
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
        console.error('❌ Error getting user documents:', error);
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
        console.error('❌ Error searching:', error);
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
        await safeUpdateDoc(docRef, updates, 'Document update');
    } catch (error) {
        console.error('❌ Error updating document:', error);
        throw error;
    }
};

// ════════════════════════════════════════════════════════════════════════════════
// 📊 TRACKING & ANALYTICS
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Increment document view count
 */
export const incrementViewCount = async (documentId) => {
    try {
        const docRef = doc(db, 'documents', documentId);
        await safeUpdateDoc(docRef, {
            viewCount: increment(1),
            lastViewedAt: serverTimestamp()
        }, 'View count');
    } catch (error) {
        console.warn('⚠️ View count update failed:', error);
    }
};

/**
 * Update study time
 */
export const updateStudyTime = async (documentId, seconds, userId = null) => {
    try {
        const docRef = doc(db, 'documents', documentId);
        await safeUpdateDoc(docRef, {
            totalStudyTime: increment(seconds),
            lastStudiedAt: serverTimestamp()
        }, 'Study time');

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
        console.warn('⚠️ Study time update failed:', error);
    }
};

/**
 * Update reading progress
 */
export const updateReadingProgress = async (documentId, progress) => {
    try {
        const docRef = doc(db, 'documents', documentId);
        await safeUpdateDoc(docRef, {
            readingProgress: Math.min(100, Math.max(0, progress))
        }, 'Reading progress');
    } catch (error) {
        console.warn('⚠️ Reading progress update failed:', error);
    }
};

/**
 * Get performance metrics
 */
export const getPerformanceMetrics = () => ({
    ...performanceMetrics,
    successRate: performanceMetrics.totalUploads > 0
        ? (performanceMetrics.successfulUploads / performanceMetrics.totalUploads * 100).toFixed(2)
        : 0
});

// ════════════════════════════════════════════════════════════════════════════════
// 📦 EXPORTS
// ════════════════════════════════════════════════════════════════════════════════

export default {
    // Upload & Processing
    initiateDocumentUpload,
    processDocumentFastTrack,

    // Cancellation
    cancelBackgroundProcessing,

    // Subject Detection
    redetectDocumentSubject,

    // Deletion
    deleteDocument,

    // Retrieval
    getDocument,
    getUserDocuments,
    searchDocuments,

    // Updates
    updateDocument,

    // Tracking
    incrementViewCount,
    updateStudyTime,
    updateReadingProgress,

    // Utilities
    extractTextFromPDF,
    extractKeywords,

    // Metrics
    getPerformanceMetrics,

    // Config (read-only)
    CONFIG: { ...CONFIG }
};
