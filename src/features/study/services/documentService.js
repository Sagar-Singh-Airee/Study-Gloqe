// src/services/documentService.js - 🏆 ULTIMATE ENTERPRISE EDITION 2025
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
    Timestamp,
    startAfter,
    setDoc
} from 'firebase/firestore';
import {
    ref,
    uploadBytesResumable,
    getDownloadURL,
    deleteObject,
    listAll,
    getMetadata
} from 'firebase/storage';
import { db, storage, COLLECTIONS } from '@shared/config/firebase';
import { detectSubjectHybrid } from '@shared/utils/subjectDetection';
import * as pdfjsLib from 'pdfjs-dist';
import toast from 'react-hot-toast';

// ==================== 🔧 CONFIGURATION ====================

const CONFIG = {
    MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB (increased)
    MAX_PAGES: 1000, // Process up to 1000 pages
    BATCH_SIZE: 500,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000,
    CACHE_TTL: 5 * 60 * 1000, // 5 minutes
    CHUNK_SIZE: 50, // Pages per chunk
    MIN_TEXT_LENGTH: 30, // Minimum text for AI detection
    KEYWORD_COUNT: 50,
    CONCURRENT_OPERATIONS: 5
};

// PDF.js worker setup
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;

// ==================== 💾 IN-MEMORY CACHE ====================

class DocumentCache {
    constructor(ttl = CONFIG.CACHE_TTL) {
        this.cache = new Map();
        this.ttl = ttl;
    }

    set(key, value) {
        this.cache.set(key, {
            value,
            timestamp: Date.now()
        });
    }

    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;

        if (Date.now() - item.timestamp > this.ttl) {
            this.cache.delete(key);
            return null;
        }

        return item.value;
    }

    delete(key) {
        this.cache.delete(key);
    }

    clear() {
        this.cache.clear();
    }

    has(key) {
        return this.cache.has(key) && this.get(key) !== null;
    }
}

const documentCache = new DocumentCache();

// ==================== 🔄 RETRY MECHANISM ====================

/**
 * Retry function with exponential backoff
 */
const retryOperation = async (operation, attempts = CONFIG.RETRY_ATTEMPTS, delay = CONFIG.RETRY_DELAY) => {
    for (let i = 0; i < attempts; i++) {
        try {
            return await operation();
        } catch (error) {
            if (i === attempts - 1) throw error;

            console.warn(`⚠️ Attempt ${i + 1} failed, retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
        }
    }
};

// ==================== 📝 ADVANCED TEXT EXTRACTION ====================

/**
 * Extract text from PDF with advanced features
 * @param {File} file - PDF file
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Object>} Extraction result
 */
export const extractTextFromPDF = async (file, onProgress = null) => {
    try {
        console.log('📝 Starting advanced PDF extraction...');

        if (!file || file.size === 0) {
            throw new Error('Invalid or empty file');
        }

        if (file.size > CONFIG.MAX_FILE_SIZE) {
            throw new Error(`File size exceeds ${CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB limit`);
        }

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({
            data: arrayBuffer,
            useWorkerFetch: false,
            isEvalSupported: false,
            useSystemFonts: true
        }).promise;

        const totalPages = Math.min(pdf.numPages, CONFIG.MAX_PAGES);
        let fullText = '';
        const pageTexts = [];
        const metadata = {
            hasImages: false,
            hasTables: false,
            languages: new Set(),
            fonts: new Set(),
            averageWordsPerPage: 0
        };

        console.log(`📖 Processing ${totalPages} pages...`);

        // Process pages in chunks for better performance
        for (let i = 1; i <= totalPages; i++) {
            try {
                const page = await pdf.getPage(i);

                // Extract text content
                const textContent = await page.getTextContent();
                const pageText = textContent.items
                    .map(item => {
                        // Track fonts
                        if (item.fontName) {
                            metadata.fonts.add(item.fontName);
                        }
                        return item.str;
                    })
                    .join(' ')
                    .trim()
                    .replace(/\s+/g, ' '); // Normalize whitespace

                if (pageText) {
                    const wordCount = pageText.split(/\s+/).length;

                    pageTexts.push({
                        pageNum: i,
                        text: pageText,
                        wordCount,
                        hasContent: wordCount > 10
                    });

                    fullText += pageText + '\n\n';
                }

                // Check for images
                const operatorList = await page.getOperatorList();
                if (operatorList.fnArray.includes(pdfjsLib.OPS.paintImageXObject)) {
                    metadata.hasImages = true;
                }

                // Report progress
                if (onProgress) {
                    onProgress({
                        current: i,
                        total: totalPages,
                        percentage: Math.round((i / totalPages) * 100)
                    });
                }

            } catch (pageError) {
                console.warn(`⚠️ Page ${i} extraction failed:`, pageError.message);
                pageTexts.push({
                    pageNum: i,
                    text: '',
                    wordCount: 0,
                    hasContent: false,
                    error: pageError.message
                });
            }
        }

        // Calculate statistics
        const totalWords = fullText.split(/\s+/).filter(w => w.length > 0).length;
        metadata.averageWordsPerPage = Math.round(totalWords / pageTexts.length);

        // Detect language (simple heuristic)
        const sampleText = fullText.substring(0, 1000).toLowerCase();
        if (/[а-яё]/.test(sampleText)) metadata.languages.add('Russian');
        if (/[一-龯]/.test(sampleText)) metadata.languages.add('Chinese');
        if (/[ぁ-ゔ]|[ァ-ヴー]/.test(sampleText)) metadata.languages.add('Japanese');
        if (/[가-힣]/.test(sampleText)) metadata.languages.add('Korean');
        if (/[a-z]/.test(sampleText)) metadata.languages.add('English');

        const result = {
            fullText: fullText.trim(),
            pageTexts: pageTexts.filter(p => p.hasContent),
            numPages: pdf.numPages,
            extractedPages: pageTexts.filter(p => p.hasContent).length,
            totalWords,
            metadata: {
                ...metadata,
                languages: Array.from(metadata.languages),
                fonts: Array.from(metadata.fonts)
            },
            quality: calculateExtractionQuality(pageTexts, totalWords),
            success: true
        };

        console.log(`✅ Extracted ${result.totalWords} words from ${result.extractedPages} pages`);
        console.log(`📊 Quality score: ${result.quality}%`);

        return result;

    } catch (error) {
        console.error('❌ PDF extraction error:', error);
        return {
            fullText: '',
            pageTexts: [],
            numPages: 0,
            extractedPages: 0,
            totalWords: 0,
            metadata: {},
            quality: 0,
            success: false,
            error: error.message
        };
    }
};

/**
 * Calculate extraction quality score
 */
const calculateExtractionQuality = (pageTexts, totalWords) => {
    if (pageTexts.length === 0) return 0;

    const pagesWithContent = pageTexts.filter(p => p.hasContent).length;
    const coverageScore = (pagesWithContent / pageTexts.length) * 50;
    const densityScore = Math.min((totalWords / pageTexts.length / 100), 1) * 50;

    return Math.round(coverageScore + densityScore);
};

/**
 * Advanced keyword extraction with TF-IDF weighting
 */
export const extractKeywords = (text, maxKeywords = CONFIG.KEYWORD_COUNT) => {
    if (!text || text.length < 10) return [];

    const stopWords = new Set([
        'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but', 'in',
        'with', 'to', 'for', 'of', 'as', 'by', 'this', 'that', 'from', 'are',
        'was', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did',
        'will', 'would', 'could', 'should', 'can', 'may', 'might', 'must',
        'it', 'its', 'they', 'them', 'their', 'we', 'our', 'you', 'your',
        'when', 'where', 'who', 'what', 'why', 'how', 'there', 'here',
        'then', 'than', 'these', 'those', 'such', 'some', 'more', 'most',
        'all', 'both', 'each', 'few', 'many', 'other', 'another', 'any'
    ]);

    // Tokenize and clean
    const words = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, ' ')
        .split(/\s+/)
        .filter(word =>
            word.length > 3 &&
            word.length < 20 &&
            !stopWords.has(word) &&
            !/^\d+$/.test(word) &&
            !/^[^a-z0-9]+$/.test(word)
        );

    // Count frequency
    const wordFreq = {};
    const totalWords = words.length;

    words.forEach(word => {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    // Calculate TF-IDF score (simplified)
    const scored = Object.entries(wordFreq).map(([word, freq]) => {
        const tf = freq / totalWords;
        const idf = Math.log(totalWords / freq); // Simplified IDF
        return {
            word,
            score: tf * idf,
            frequency: freq
        };
    });

    // Sort by score and return top keywords
    return scored
        .sort((a, b) => b.score - a.score)
        .slice(0, maxKeywords)
        .map(item => item.word);
};

/**
 * Generate document summary using extractive summarization
 */
export const generateSummary = (text, maxSentences = 5) => {
    if (!text || text.length < 100) return '';

    // Split into sentences
    const sentences = text
        .split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => s.length > 20);

    if (sentences.length <= maxSentences) return text;

    // Score sentences by keyword density
    const keywords = extractKeywords(text, 20);
    const keywordSet = new Set(keywords);

    const scored = sentences.map(sentence => {
        const words = sentence.toLowerCase().split(/\s+/);
        const score = words.filter(w => keywordSet.has(w)).length;
        return { sentence, score };
    });

    // Return top sentences in original order
    const topSentences = scored
        .sort((a, b) => b.score - a.score)
        .slice(0, maxSentences)
        .map(s => s.sentence);

    return topSentences.join('. ') + '.';
};

// ==================== 📤 ADVANCED UPLOAD SYSTEM ====================

/**
 * Initiate document upload with validation and optimization
 */
export const initiateDocumentUpload = (file, userId, options = {}) => {
    // Enhanced validation
    if (!file) {
        throw new Error('No file provided');
    }

    if (!file.type.includes('pdf')) {
        throw new Error('Only PDF files are supported');
    }

    if (file.size === 0) {
        throw new Error('File is empty');
    }

    if (file.size > CONFIG.MAX_FILE_SIZE) {
        throw new Error(`File size must be less than ${CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    if (!userId) {
        throw new Error('User ID is required');
    }

    // Generate optimized storage path
    const timestamp = Date.now();
    const sanitizedFileName = file.name
        .replace(/[^a-zA-Z0-9.-]/g, '_')
        .replace(/_{2,}/g, '_')
        .substring(0, 100);

    const fileHash = generateFileHash(file.name, file.size, timestamp);
    const storagePath = `documents/${userId}/${fileHash}/${sanitizedFileName}`;
    const storageRef = ref(storage, storagePath);

    // Create upload task with metadata
    const uploadTask = uploadBytesResumable(storageRef, file, {
        contentType: 'application/pdf',
        customMetadata: {
            userId: userId,
            originalName: file.name,
            uploadTimestamp: timestamp.toString(),
            fileSize: file.size.toString(),
            version: '2.0'
        }
    });

    console.log('📤 Upload initiated:', storagePath);

    return {
        uploadTask,
        storageRef,
        storagePath,
        fileHash
    };
};

/**
 * Generate unique file hash
 */
const generateFileHash = (fileName, fileSize, timestamp) => {
    const str = `${fileName}-${fileSize}-${timestamp}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
};

/**
 * Create document record with AI detection and advanced features
 */
export const createDocumentRecord = async (userId, file, data) => {
    try {
        console.log('💾 Creating advanced document record...');

        const {
            downloadURL,
            storagePath,
            extractedText,
            pageTexts,
            numPages,
            totalWords,
            metadata = {},
            quality = 0,
            context = {}
        } = data;

        // Generate keywords and summary
        const keywords = extractedText ? extractKeywords(extractedText, 50) : [];
        const summary = extractedText ? generateSummary(extractedText, 5) : '';

        // AI-POWERED SUBJECT DETECTION with enhanced fallbacks
        let subject = 'General Studies';
        let subjectConfidence = 0;
        let detectionMethod = 'default';
        let alternativeSubjects = [];

        if (extractedText && extractedText.length >= CONFIG.MIN_TEXT_LENGTH) {
            try {
                console.log('🤖 Running AI subject detection...');

                const detection = await retryOperation(async () => {
                    return await detectSubjectHybrid({
                        title: file.name.replace('.pdf', ''),
                        content: extractedText,
                        fileName: file.name,
                        keywords: keywords.slice(0, 10)
                    });
                });

                if (detection && detection.subject) {
                    subject = detection.subject;
                    subjectConfidence = detection.confidence || 0;
                    detectionMethod = detection.method || 'ai';
                    alternativeSubjects = detection.alternatives || [];

                    console.log(`✅ AI detected: ${subject} (${subjectConfidence}% via ${detectionMethod})`);
                } else {
                    console.warn('⚠️ AI detection returned null');
                    subject = await fallbackSubjectDetection(file.name, keywords);
                    detectionMethod = 'fallback';
                }
            } catch (aiError) {
                console.error('❌ AI detection failed:', aiError);
                subject = await fallbackSubjectDetection(file.name, keywords);
                detectionMethod = 'fallback';
            }
        }

        // User override takes precedence
        if (context.subject && context.subject !== 'General Studies') {
            console.log(`✏️ User override: ${context.subject}`);
            subject = context.subject;
            subjectConfidence = 100;
            detectionMethod = 'user_provided';
        }

        // Build comprehensive document data
        const docData = {
            // Basic info
            title: file.name.replace('.pdf', ''),
            fileName: file.name,
            userId: userId,
            fileSize: file.size,
            downloadURL,
            storagePath,

            // Status and metrics
            status: 'completed',
            pages: numPages || 0,
            totalWords: totalWords || 0,
            quality: quality || 0,

            // Classification
            subject: subject,
            subjectConfidence: subjectConfidence,
            detectionMethod: detectionMethod,
            alternativeSubjects: alternativeSubjects,
            purpose: context.purpose || '',
            folderId: context.folderId || null,

            // Content analysis
            keywords,
            summary,
            extractedText: extractedText || '',
            metadata: metadata,

            // Timestamps
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),

            // Study tracking
            totalStudyTime: 0,
            lastStudiedAt: null,
            readingProgress: 0,
            viewCount: 0,
            studySessions: 0,

            // Generated content counters
            quizCount: 0,
            flashcardCount: 0,
            summaryCount: 0,
            notesCount: 0,

            // User interactions
            isArchived: false,
            isFavorite: false,
            rating: 0,
            tags: context.tags || [],

            // Analytics
            analytics: {
                uploadDuration: context.uploadDuration || 0,
                processingDuration: context.processingDuration || 0,
                extractionQuality: quality || 0,
                version: '2.0'
            }
        };

        // Create document with retry
        const docRef = await retryOperation(async () => {
            return await addDoc(collection(db, 'documents'), docData);
        });

        console.log('✅ Document record created:', docRef.id);

        // Async operations (non-blocking)
        Promise.all([
            savePages(docRef.id, pageTexts),
            updateStatistics(userId, context.folderId, { subject }),
            createDocumentIndex(docRef.id, docData) // For advanced search
        ]).catch(err => console.warn('⚠️ Async operation warning:', err.message));

        // Clear cache for this user
        documentCache.delete(`user_docs_${userId}`);

        return {
            docId: docRef.id,
            subject,
            subjectConfidence,
            detectionMethod,
            alternativeSubjects,
            folderId: context.folderId,
            quality,
            success: true
        };

    } catch (error) {
        console.error('❌ Document creation failed:', error);
        throw new Error(`Failed to create document: ${error.message}`);
    }
};

/**
 * Fallback subject detection using keyword matching
 */
const fallbackSubjectDetection = async (fileName, keywords) => {
    const subjectKeywords = {
        'Mathematics': ['math', 'calculus', 'algebra', 'geometry', 'equation', 'theorem', 'integral'],
        'Physics': ['physics', 'force', 'energy', 'motion', 'quantum', 'wave', 'particle'],
        'Chemistry': ['chemistry', 'molecule', 'atom', 'reaction', 'element', 'compound'],
        'Biology': ['biology', 'cell', 'organism', 'dna', 'protein', 'evolution'],
        'Computer Science': ['programming', 'algorithm', 'code', 'software', 'computer', 'data'],
        'History': ['history', 'war', 'century', 'civilization', 'empire', 'revolution'],
        'Literature': ['literature', 'novel', 'poetry', 'author', 'story', 'character']
    };

    const text = (fileName + ' ' + keywords.join(' ')).toLowerCase();
    let bestMatch = 'General Studies';
    let maxScore = 0;

    for (const [subject, subjectWords] of Object.entries(subjectKeywords)) {
        const score = subjectWords.filter(word => text.includes(word)).length;
        if (score > maxScore) {
            maxScore = score;
            bestMatch = subject;
        }
    }

    return bestMatch;
};

/**
 * Save pages in optimized batches
 */
const savePages = async (docId, pageTexts) => {
    if (!pageTexts || pageTexts.length === 0) return;

    try {
        const pages = pageTexts.slice(0, 100); // Limit to 100 pages
        const chunks = [];

        // Split into chunks
        for (let i = 0; i < pages.length; i += CONFIG.BATCH_SIZE) {
            chunks.push(pages.slice(i, i + CONFIG.BATCH_SIZE));
        }

        // Process chunks concurrently (max 5 at a time)
        for (let i = 0; i < chunks.length; i += CONFIG.CONCURRENT_OPERATIONS) {
            const chunkBatch = chunks.slice(i, i + CONFIG.CONCURRENT_OPERATIONS);

            await Promise.all(chunkBatch.map(async (chunk) => {
                const batch = writeBatch(db);

                chunk.forEach(pageData => {
                    const pageRef = doc(collection(db, 'documents', docId, 'pages'));
                    batch.set(pageRef, {
                        ...pageData,
                        createdAt: serverTimestamp()
                    });
                });

                await batch.commit();
            }));
        }

        console.log(`✅ Saved ${pages.length} pages in ${chunks.length} batches`);
    } catch (error) {
        console.error('❌ Page save error:', error);
        throw error;
    }
};

/**
 * Create search index for advanced queries
 */
const createDocumentIndex = async (docId, docData) => {
    try {
        const indexRef = doc(db, 'documentIndex', docId);
        await setDoc(indexRef, {
            docId,
            userId: docData.userId,
            title: docData.title,
            subject: docData.subject,
            keywords: docData.keywords,
            summary: docData.summary,
            createdAt: serverTimestamp()
        });
        console.log('✅ Search index created');
    } catch (error) {
        console.warn('⚠️ Index creation failed:', error);
    }
};

/**
 * Update statistics with detailed tracking
 */
const updateStatistics = async (userId, folderId, extras = {}) => {
    try {
        const batch = writeBatch(db);

        // Update user stats
        const userRef = doc(db, 'users', userId);
        batch.update(userRef, {
            totalDocuments: increment(1),
            lastUploadAt: serverTimestamp(),
            [`subjectCounts.${extras.subject || 'General Studies'}`]: increment(1)
        });

        // Update folder stats
        if (folderId) {
            const folderRef = doc(db, COLLECTIONS.FOLDERS, folderId);
            batch.update(folderRef, {
                docCount: increment(1),
                updatedAt: serverTimestamp()
            });
        }

        await batch.commit();
        console.log('✅ Statistics updated');
    } catch (error) {
        console.warn('⚠️ Stats update failed:', error);
    }
};

// ==================== 🗑️ ADVANCED DELETE SYSTEM ====================

/**
 * Delete document with complete cleanup and validation
 */
export const deleteDocument = async (documentId) => {
    try {
        console.log('🗑️ Starting enhanced deletion:', documentId);

        if (!documentId) {
            throw new Error('Document ID is required');
        }

        // Get document data
        const docRef = doc(db, 'documents', documentId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            console.warn('⚠️ Document not found');
            documentCache.delete(documentId);
            return { success: true, alreadyDeleted: true };
        }

        const docData = docSnap.data();
        console.log('📄 Document found:', documentId);

        // Delete in parallel for speed
        const deletionResults = await Promise.allSettled([
            deleteStorageFiles(docData.storagePath),
            deleteSubcollections(documentId),
            deleteSearchIndex(documentId),
            deleteRelatedContent(documentId) // Quizzes, flashcards, etc.
        ]);

        // Log results
        deletionResults.forEach((result, index) => {
            if (result.status === 'rejected') {
                console.warn(`⚠️ Deletion step ${index} failed:`, result.reason);
            }
        });

        // Delete main document
        await deleteDoc(docRef);
        console.log('✅ Firestore document deleted');

        // Update statistics
        await updateStatisticsAfterDeletion(docData.userId, docData.folderId, docData.subject);

        // Clear cache
        documentCache.delete(documentId);
        documentCache.delete(`user_docs_${docData.userId}`);

        console.log('🎉 Deletion complete!');
        return {
            success: true,
            documentId,
            storageDeleted: deletionResults[0].status === 'fulfilled'
        };

    } catch (error) {
        console.error('❌ DELETE ERROR:', error);

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
 * Enhanced storage deletion with retry
 */
const deleteStorageFiles = async (storagePath) => {
    if (!storagePath) return false;

    try {
        console.log('🗂️ Deleting storage files:', storagePath);

        // Delete main file
        const storageRef = ref(storage, storagePath);
        await retryOperation(() => deleteObject(storageRef));

        // Delete entire folder
        const folderPath = storagePath.substring(0, storagePath.lastIndexOf('/'));
        const folderRef = ref(storage, folderPath);

        try {
            const filesList = await listAll(folderRef);

            if (filesList.items.length > 0) {
                console.log(`📂 Deleting ${filesList.items.length} files`);

                // Delete in batches
                const chunks = [];
                for (let i = 0; i < filesList.items.length; i += CONFIG.CONCURRENT_OPERATIONS) {
                    chunks.push(filesList.items.slice(i, i + CONFIG.CONCURRENT_OPERATIONS));
                }

                for (const chunk of chunks) {
                    await Promise.allSettled(
                        chunk.map(item => deleteObject(item))
                    );
                }
            }
        } catch (folderError) {
            console.warn('⚠️ Folder cleanup warning:', folderError.message);
        }

        console.log('✅ Storage files deleted');
        return true;

    } catch (error) {
        if (error.code === 'storage/object-not-found') {
            console.warn('⚠️ File not found in storage');
            return true;
        }
        console.error('❌ Storage deletion error:', error);
        return false;
    }
};

/**
 * Delete all subcollections
 */
const deleteSubcollections = async (documentId) => {
    const subcollections = ['pages', 'notes', 'annotations', 'highlights'];

    for (const subCol of subcollections) {
        try {
            const colRef = collection(db, 'documents', documentId, subCol);
            const snapshot = await getDocs(colRef);

            if (!snapshot.empty) {
                console.log(`📑 Deleting ${snapshot.size} ${subCol}...`);

                const chunks = [];
                const docs = snapshot.docs;

                for (let i = 0; i < docs.length; i += CONFIG.BATCH_SIZE) {
                    chunks.push(docs.slice(i, i + CONFIG.BATCH_SIZE));
                }

                for (const chunk of chunks) {
                    const batch = writeBatch(db);
                    chunk.forEach(docSnap => {
                        batch.delete(doc(db, 'documents', documentId, subCol, docSnap.id));
                    });
                    await batch.commit();
                }
            }
        } catch (error) {
            console.warn(`⚠️ ${subCol} deletion warning:`, error.message);
        }
    }
};

/**
 * Delete search index
 */
const deleteSearchIndex = async (documentId) => {
    try {
        const indexRef = doc(db, 'documentIndex', documentId);
        await deleteDoc(indexRef);
        console.log('✅ Search index deleted');
    } catch (error) {
        console.warn('⚠️ Index deletion warning:', error);
    }
};

/**
 * Delete related content (quizzes, flashcards, etc.)
 */
const deleteRelatedContent = async (documentId) => {
    const relatedCollections = [
        { name: 'quizzes', field: 'documentId' },
        { name: 'flashcards', field: 'documentId' },
        { name: 'summaries', field: 'documentId' }
    ];

    for (const { name, field } of relatedCollections) {
        try {
            const q = query(
                collection(db, name),
                where(field, '==', documentId),
                limit(100)
            );

            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                console.log(`🗑️ Deleting ${snapshot.size} related ${name}...`);

                const batch = writeBatch(db);
                snapshot.docs.forEach(docSnap => {
                    batch.delete(doc(db, name, docSnap.id));
                });

                await batch.commit();
            }
        } catch (error) {
            console.warn(`⚠️ ${name} cleanup warning:`, error);
        }
    }
};

/**
 * Update statistics after deletion
 */
const updateStatisticsAfterDeletion = async (userId, folderId, subject) => {
    try {
        const batch = writeBatch(db);

        if (userId) {
            const userRef = doc(db, 'users', userId);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                const updates = {
                    totalDocuments: increment(-1)
                };

                if (subject) {
                    updates[`subjectCounts.${subject}`] = increment(-1);
                }

                batch.update(userRef, updates);
            }
        }

        if (folderId) {
            const folderRef = doc(db, COLLECTIONS.FOLDERS, folderId);
            const folderSnap = await getDoc(folderRef);

            if (folderSnap.exists()) {
                batch.update(folderRef, {
                    docCount: increment(-1),
                    updatedAt: serverTimestamp()
                });
            }
        }

        await batch.commit();
        console.log('✅ Statistics updated after deletion');

    } catch (error) {
        console.warn('⚠️ Stats update warning:', error);
    }
};

// ==================== 📖 ADVANCED RETRIEVAL ====================

/**
 * Get document with caching
 */
export const getDocument = async (documentId, useCache = true) => {
    try {
        // Check cache first
        if (useCache && documentCache.has(documentId)) {
            console.log('💾 Cache hit:', documentId);
            return documentCache.get(documentId);
        }

        const docRef = doc(db, 'documents', documentId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            throw new Error('Document not found');
        }

        const docData = {
            id: docSnap.id,
            ...docSnap.data()
        };

        // Cache the result
        documentCache.set(documentId, docData);

        return docData;
    } catch (error) {
        console.error('Error getting document:', error);
        throw error;
    }
};

/**
 * Get user documents with advanced filtering and caching
 */
export const getUserDocuments = async (userId, options = {}) => {
    try {
        const {
            limitCount = 100,
            orderByField = 'createdAt',
            orderDirection = 'desc',
            subject = null,
            folderId = null,
            useCache = true,
            startAfterDoc = null
        } = options;

        const cacheKey = `user_docs_${userId}_${subject || 'all'}_${folderId || 'all'}`;

        // Check cache
        if (useCache && !startAfterDoc && documentCache.has(cacheKey)) {
            console.log('💾 Cache hit for user documents');
            return documentCache.get(cacheKey);
        }

        // Build query
        let q = query(
            collection(db, 'documents'),
            where('userId', '==', userId)
        );

        if (subject) {
            q = query(q, where('subject', '==', subject));
        }

        if (folderId) {
            q = query(q, where('folderId', '==', folderId));
        }

        q = query(q, orderBy(orderByField, orderDirection));

        if (startAfterDoc) {
            q = query(q, startAfter(startAfterDoc));
        }

        q = query(q, limit(limitCount));

        const snapshot = await getDocs(q);
        const documents = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Cache results
        if (!startAfterDoc) {
            documentCache.set(cacheKey, documents);
        }

        return documents;
    } catch (error) {
        console.error('Error getting user documents:', error);
        return [];
    }
};

/**
 * Advanced search with multiple filters
 */
export const searchDocuments = async (userId, searchTerm, filters = {}) => {
    try {
        const allDocs = await getUserDocuments(userId, { useCache: true });
        const searchLower = searchTerm.toLowerCase().trim();

        if (!searchLower) return allDocs;

        let results = allDocs.filter(doc => {
            const title = (doc.title || '').toLowerCase();
            const fileName = (doc.fileName || '').toLowerCase();
            const subject = (doc.subject || '').toLowerCase();
            const keywords = (doc.keywords || []).join(' ').toLowerCase();
            const summary = (doc.summary || '').toLowerCase();

            return (
                title.includes(searchLower) ||
                fileName.includes(searchLower) ||
                subject.includes(searchLower) ||
                keywords.includes(searchLower) ||
                summary.includes(searchLower)
            );
        });

        // Apply additional filters
        if (filters.subject) {
            results = results.filter(doc => doc.subject === filters.subject);
        }

        if (filters.minQuality) {
            results = results.filter(doc => (doc.quality || 0) >= filters.minQuality);
        }

        if (filters.isFavorite) {
            results = results.filter(doc => doc.isFavorite === true);
        }

        if (filters.minRating) {
            results = results.filter(doc => (doc.rating || 0) >= filters.minRating);
        }

        return results;
    } catch (error) {
        console.error('Error searching documents:', error);
        return [];
    }
};

/**
 * Get documents by multiple subjects
 */
export const getDocumentsBySubjects = async (userId, subjects) => {
    try {
        const allDocs = await getUserDocuments(userId);
        return allDocs.filter(doc => subjects.includes(doc.subject));
    } catch (error) {
        console.error('Error getting documents by subjects:', error);
        return [];
    }
};

/**
 * Get recent documents
 */
export const getRecentDocuments = async (userId, limitCount = 10) => {
    return getUserDocuments(userId, {
        limitCount,
        orderByField: 'lastStudiedAt',
        orderDirection: 'desc'
    });
};

/**
 * Get favorite documents
 */
export const getFavoriteDocuments = async (userId) => {
    try {
        const allDocs = await getUserDocuments(userId);
        return allDocs.filter(doc => doc.isFavorite === true);
    } catch (error) {
        console.error('Error getting favorite documents:', error);
        return [];
    }
};

// ==================== 📊 ADVANCED ANALYTICS ====================

/**
 * Get document statistics
 */
export const getDocumentStats = async (userId) => {
    try {
        const docs = await getUserDocuments(userId, { limitCount: 1000 });

        const stats = {
            total: docs.length,
            bySubject: {},
            totalWords: 0,
            totalPages: 0,
            totalStudyTime: 0,
            averageQuality: 0,
            favoriteCount: 0,
            recentlyStudied: 0
        };

        const now = Date.now();
        const weekAgo = now - (7 * 24 * 60 * 60 * 1000);

        docs.forEach(doc => {
            // By subject
            stats.bySubject[doc.subject] = (stats.bySubject[doc.subject] || 0) + 1;

            // Totals
            stats.totalWords += doc.totalWords || 0;
            stats.totalPages += doc.pages || 0;
            stats.totalStudyTime += doc.totalStudyTime || 0;
            stats.averageQuality += doc.quality || 0;

            // Favorites
            if (doc.isFavorite) stats.favoriteCount++;

            // Recently studied
            if (doc.lastStudiedAt && doc.lastStudiedAt.toMillis() > weekAgo) {
                stats.recentlyStudied++;
            }
        });

        stats.averageQuality = docs.length > 0
            ? Math.round(stats.averageQuality / docs.length)
            : 0;

        return stats;
    } catch (error) {
        console.error('Error getting document stats:', error);
        return null;
    }
};

// ==================== 🔄 UPDATE OPERATIONS ====================

/**
 * Update document with validation
 */
export const updateDocument = async (documentId, updates) => {
    try {
        const docRef = doc(db, 'documents', documentId);

        await updateDoc(docRef, {
            ...updates,
            updatedAt: serverTimestamp()
        });

        // Clear cache
        documentCache.delete(documentId);

        console.log('✅ Document updated:', documentId);
    } catch (error) {
        console.error('Error updating document:', error);
        throw error;
    }
};

/**
 * Batch update documents
 */
export const batchUpdateDocuments = async (documentIds, updates) => {
    try {
        const chunks = [];
        for (let i = 0; i < documentIds.length; i += CONFIG.BATCH_SIZE) {
            chunks.push(documentIds.slice(i, i + CONFIG.BATCH_SIZE));
        }

        for (const chunk of chunks) {
            const batch = writeBatch(db);

            chunk.forEach(docId => {
                const docRef = doc(db, 'documents', docId);
                batch.update(docRef, {
                    ...updates,
                    updatedAt: serverTimestamp()
                });
                documentCache.delete(docId);
            });

            await batch.commit();
        }

        console.log(`✅ Batch updated ${documentIds.length} documents`);
    } catch (error) {
        console.error('Error in batch update:', error);
        throw error;
    }
};

/**
 * Toggle favorite status
 */
export const toggleFavorite = async (documentId) => {
    try {
        const doc = await getDocument(documentId);
        await updateDocument(documentId, {
            isFavorite: !doc.isFavorite
        });
        return !doc.isFavorite;
    } catch (error) {
        console.error('Error toggling favorite:', error);
        throw error;
    }
};

/**
 * Update document rating
 */
export const updateRating = async (documentId, rating) => {
    if (rating < 0 || rating > 5) {
        throw new Error('Rating must be between 0 and 5');
    }
    await updateDocument(documentId, { rating });
};

/**
 * Add tags to document
 */
export const addTags = async (documentId, newTags) => {
    try {
        const doc = await getDocument(documentId);
        const existingTags = doc.tags || [];
        const uniqueTags = [...new Set([...existingTags, ...newTags])];

        await updateDocument(documentId, { tags: uniqueTags });
    } catch (error) {
        console.error('Error adding tags:', error);
        throw error;
    }
};

// ==================== 📈 TRACKING & METRICS ====================

/**
 * Increment view count
 */
export const incrementViewCount = async (documentId) => {
    try {
        const docRef = doc(db, 'documents', documentId);
        await updateDoc(docRef, {
            viewCount: increment(1),
            lastViewedAt: serverTimestamp()
        });
        documentCache.delete(documentId);
    } catch (error) {
        console.warn('Failed to update view count:', error);
    }
};

/**
 * Update study time
 */
export const updateStudyTime = async (documentId, seconds) => {
    try {
        const docRef = doc(db, 'documents', documentId);
        await updateDoc(docRef, {
            totalStudyTime: increment(seconds),
            lastStudiedAt: serverTimestamp(),
            studySessions: increment(1)
        });
        documentCache.delete(documentId);
    } catch (error) {
        console.warn('Failed to update study time:', error);
    }
};

/**
 * Update reading progress
 */
export const updateReadingProgress = async (documentId, progress) => {
    try {
        const validProgress = Math.min(100, Math.max(0, progress));
        const docRef = doc(db, 'documents', documentId);
        await updateDoc(docRef, {
            readingProgress: validProgress,
            updatedAt: serverTimestamp()
        });
        documentCache.delete(documentId);
    } catch (error) {
        console.warn('Failed to update reading progress:', error);
    }
};

/**
 * Increment content counter
 */
export const incrementContentCounter = async (documentId, type) => {
    const field = `${type}Count`;
    try {
        const docRef = doc(db, 'documents', documentId);
        await updateDoc(docRef, {
            [field]: increment(1)
        });
        documentCache.delete(documentId);
    } catch (error) {
        console.warn(`Failed to update ${type} count:`, error);
    }
};

// ==================== 🔧 UTILITY FUNCTIONS ====================

/**
 * Re-detect subject for document
 */
export const redetectDocumentSubject = async (documentId) => {
    try {
        console.log('🔄 Re-detecting subject:', documentId);

        const docData = await getDocument(documentId, false);

        if (!docData.extractedText || docData.extractedText.length < CONFIG.MIN_TEXT_LENGTH) {
            throw new Error('Insufficient text for detection');
        }

        const detection = await detectSubjectHybrid({
            title: docData.title || docData.fileName,
            content: docData.extractedText,
            fileName: docData.fileName,
            keywords: docData.keywords
        });

        if (detection && detection.subject) {
            await updateDocument(documentId, {
                subject: detection.subject,
                subjectConfidence: detection.confidence,
                detectionMethod: detection.method,
                alternativeSubjects: detection.alternatives || []
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

/**
 * Get document storage info
 */
export const getDocumentStorageInfo = async (documentId) => {
    try {
        const docData = await getDocument(documentId);

        if (!docData.storagePath) {
            throw new Error('Storage path not found');
        }

        const storageRef = ref(storage, docData.storagePath);
        const metadata = await getMetadata(storageRef);

        return {
            size: metadata.size,
            contentType: metadata.contentType,
            created: metadata.timeCreated,
            updated: metadata.updated,
            md5Hash: metadata.md5Hash
        };
    } catch (error) {
        console.error('Error getting storage info:', error);
        throw error;
    }
};

/**
 * Clear cache
 */
export const clearDocumentCache = () => {
    documentCache.clear();
    console.log('🗑️ Document cache cleared');
};

/**
 * Export document data
 */
export const exportDocumentData = async (documentId) => {
    try {
        const docData = await getDocument(documentId, false);

        // Get pages
        const pagesRef = collection(db, 'documents', documentId, 'pages');
        const pagesSnap = await getDocs(pagesRef);
        const pages = pagesSnap.docs.map(doc => doc.data());

        return {
            document: docData,
            pages,
            exportedAt: new Date().toISOString()
        };
    } catch (error) {
        console.error('Error exporting document:', error);
        throw error;
    }
};

// ==================== 📦 EXPORTS ====================

export default {
    // Upload
    initiateDocumentUpload,
    createDocumentRecord,

    // Delete
    deleteDocument,

    // Retrieval
    getDocument,
    getUserDocuments,
    getDocumentsBySubjects,
    searchDocuments,
    getRecentDocuments,
    getFavoriteDocuments,

    // Update
    updateDocument,
    batchUpdateDocuments,
    toggleFavorite,
    updateRating,
    addTags,
    redetectDocumentSubject,

    // Tracking
    incrementViewCount,
    updateStudyTime,
    updateReadingProgress,
    incrementContentCounter,

    // Analytics
    getDocumentStats,

    // Utilities
    extractTextFromPDF,
    extractKeywords,
    generateSummary,
    getDocumentStorageInfo,
    exportDocumentData,
    clearDocumentCache
};
