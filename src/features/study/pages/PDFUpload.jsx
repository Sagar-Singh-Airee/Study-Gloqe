// src/services/documentService.js - 🏆 ULTIMATE ENTERPRISE EDITION 2025 (FIXED)
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
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
  MAX_PAGES: 1000,
  BATCH_SIZE: 500,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  CACHE_TTL: 5 * 60 * 1000,
  CHUNK_SIZE: 50,
  MIN_TEXT_LENGTH: 30,
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

    for (let i = 1; i <= totalPages; i++) {
      try {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map(item => {
            if (item.fontName) {
              metadata.fonts.add(item.fontName);
            }
            return item.str;
          })
          .join(' ')
          .trim()
          .replace(/\s+/g, ' ');

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

        const operatorList = await page.getOperatorList();
        if (operatorList.fnArray.includes(pdfjsLib.OPS.paintImageXObject)) {
          metadata.hasImages = true;
        }

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

    const totalWords = fullText.split(/\s+/).filter(w => w.length > 0).length;
    metadata.averageWordsPerPage = Math.round(totalWords / pageTexts.length);

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

const calculateExtractionQuality = (pageTexts, totalWords) => {
  if (pageTexts.length === 0) return 0;

  const pagesWithContent = pageTexts.filter(p => p.hasContent).length;
  const coverageScore = (pagesWithContent / pageTexts.length) * 50;
  const densityScore = Math.min((totalWords / pageTexts.length / 100), 1) * 50;

  return Math.round(coverageScore + densityScore);
};

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

  const wordFreq = {};
  const totalWords = words.length;

  words.forEach(word => {
    wordFreq[word] = (wordFreq[word] || 0) + 1;
  });

  const scored = Object.entries(wordFreq).map(([word, freq]) => {
    const tf = freq / totalWords;
    const idf = Math.log(totalWords / freq);
    return {
      word,
      score: tf * idf,
      frequency: freq
    };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxKeywords)
    .map(item => item.word);
};

export const generateSummary = (text, maxSentences = 5) => {
  if (!text || text.length < 100) return '';

  const sentences = text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 20);

  if (sentences.length <= maxSentences) return text;

  const keywords = extractKeywords(text, 20);
  const keywordSet = new Set(keywords);

  const scored = sentences.map(sentence => {
    const words = sentence.toLowerCase().split(/\s+/);
    const score = words.filter(w => keywordSet.has(w)).length;
    return { sentence, score };
  });

  const topSentences = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSentences)
    .map(s => s.sentence);

  return topSentences.join('. ') + '.';
};

// ==================== 📤 ADVANCED UPLOAD SYSTEM ====================

export const initiateDocumentUpload = (file, userId, options = {}) => {
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

  const timestamp = Date.now();
  const sanitizedFileName = file.name
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 100);

  const fileHash = generateFileHash(file.name, file.size, timestamp);
  const storagePath = `documents/${userId}/${fileHash}/${sanitizedFileName}`;
  const storageRef = ref(storage, storagePath);

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

    const keywords = extractedText ? extractKeywords(extractedText, 50) : [];
    const summary = extractedText ? generateSummary(extractedText, 5) : '';

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

    if (context.subject && context.subject !== 'General Studies') {
      console.log(`✏️ User override: ${context.subject}`);
      subject = context.subject;
      subjectConfidence = 100;
      detectionMethod = 'user_provided';
    }

    const docData = {
      title: file.name.replace('.pdf', ''),
      fileName: file.name,
      userId: userId,
      fileSize: file.size,
      downloadURL,
      storagePath,
      status: 'completed',
      pages: numPages || 0,
      totalWords: totalWords || 0,
      quality: quality || 0,
      subject: subject,
      subjectConfidence: subjectConfidence,
      detectionMethod: detectionMethod,
      alternativeSubjects: alternativeSubjects,
      purpose: context.purpose || '',
      folderId: context.folderId || null,
      keywords,
      summary,
      extractedText: extractedText || '',
      metadata: metadata,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      totalStudyTime: 0,
      lastStudiedAt: null,
      readingProgress: 0,
      viewCount: 0,
      studySessions: 0,
      quizCount: 0,
      flashcardCount: 0,
      summaryCount: 0,
      notesCount: 0,
      isArchived: false,
      isFavorite: false,
      rating: 0,
      tags: context.tags || [],
      analytics: {
        uploadDuration: context.uploadDuration || 0,
        processingDuration: context.processingDuration || 0,
        extractionQuality: quality || 0,
        version: '2.0'
      }
    };

    const docRef = await retryOperation(async () => {
      return await addDoc(collection(db, 'documents'), docData);
    });

    console.log('✅ Document record created:', docRef.id);

    Promise.all([
      savePages(docRef.id, pageTexts),
      updateStatistics(userId, context.folderId, { subject }),
      createDocumentIndex(docRef.id, docData)
    ]).catch(err => console.warn('⚠️ Async operation warning:', err.message));

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

const savePages = async (docId, pageTexts) => {
  if (!pageTexts || pageTexts.length === 0) return;

  try {
    const pages = pageTexts.slice(0, 100);
    const chunks = [];

    for (let i = 0; i < pages.length; i += CONFIG.BATCH_SIZE) {
      chunks.push(pages.slice(i, i + CONFIG.BATCH_SIZE));
    }

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

const updateStatistics = async (userId, folderId, extras = {}) => {
  try {
    const batch = writeBatch(db);

    const userRef = doc(db, 'users', userId);
    batch.update(userRef, {
      totalDocuments: increment(1),
      lastUploadAt: serverTimestamp(),
      [`subjectCounts.${extras.subject || 'General Studies'}`]: increment(1)
    });

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

// ==================== 🔄 LEGACY COMPATIBILITY ====================

/**
 * ✅ LEGACY UPLOAD FUNCTION - For backward compatibility with PDFUpload.jsx
 * This wraps the new API to maintain compatibility
 */
export const uploadDocument = async (file, userId, metadata = {}) => {
  console.log('📤 Using legacy uploadDocument wrapper');

  try {
    const startTime = Date.now();

    // 1. Initiate upload
    const { uploadTask, storagePath } = initiateDocumentUpload(file, userId);

    // 2. Wait for upload to complete
    await new Promise((resolve, reject) => {
      uploadTask.on('state_changed', null, reject, resolve);
    });

    const uploadDuration = Date.now() - startTime;

    // 3. Get download URL
    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

    // 4. Extract text
    const extractionStart = Date.now();
    const extraction = await extractTextFromPDF(file);
    const processingDuration = Date.now() - extractionStart;

    // 5. Create record with AI detection
    const result = await createDocumentRecord(userId, file, {
      downloadURL,
      storagePath,
      extractedText: extraction.fullText,
      pageTexts: extraction.pageTexts,
      numPages: extraction.numPages,
      totalWords: extraction.totalWords,
      metadata: extraction.metadata,
      quality: extraction.quality,
      context: {
        subject: metadata.subject,
        purpose: metadata.purpose,
        tags: metadata.tags,
        folderId: metadata.folderId,
        uploadDuration,
        processingDuration
      }
    });

    console.log('✅ Legacy upload complete:', result.docId);

    return {
      success: true,
      docId: result.docId,
      subject: result.subject,
      subjectConfidence: result.subjectConfidence,
      detectionMethod: result.detectionMethod,
      downloadURL,
      ...result
    };

  } catch (error) {
    console.error('❌ Legacy upload error:', error);
    throw error;
  }
};

// ==================== 🗑️ ADVANCED DELETE SYSTEM ====================

export const deleteDocument = async (documentId) => {
  try {
    console.log('🗑️ Starting enhanced deletion:', documentId);

    if (!documentId) {
      throw new Error('Document ID is required');
    }

    const docRef = doc(db, 'documents', documentId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      console.warn('⚠️ Document not found');
      documentCache.delete(documentId);
      return { success: true, alreadyDeleted: true };
    }

    const docData = docSnap.data();
    console.log('📄 Document found:', documentId);

    const deletionResults = await Promise.allSettled([
      deleteStorageFiles(docData.storagePath),
      deleteSubcollections(documentId),
      deleteSearchIndex(documentId),
      deleteRelatedContent(documentId)
    ]);

    deletionResults.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.warn(`⚠️ Deletion step ${index} failed:`, result.reason);
      }
    });

    await deleteDoc(docRef);
    console.log('✅ Firestore document deleted');

    await updateStatisticsAfterDeletion(docData.userId, docData.folderId, docData.subject);

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

const deleteStorageFiles = async (storagePath) => {
  if (!storagePath) return false;

  try {
    console.log('🗂️ Deleting storage files:', storagePath);

    const storageRef = ref(storage, storagePath);
    await retryOperation(() => deleteObject(storageRef));

    const folderPath = storagePath.substring(0, storagePath.lastIndexOf('/'));
    const folderRef = ref(storage, folderPath);

    try {
      const filesList = await listAll(folderRef);

      if (filesList.items.length > 0) {
        console.log(`📂 Deleting ${filesList.items.length} files`);

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

const deleteSearchIndex = async (documentId) => {
  try {
    const indexRef = doc(db, 'documentIndex', documentId);
    await deleteDoc(indexRef);
    console.log('✅ Search index deleted');
  } catch (error) {
    console.warn('⚠️ Index deletion warning:', error);
  }
};

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

// ==================== 📖 RETRIEVAL FUNCTIONS ====================

export const getDocument = async (documentId, useCache = true) => {
  try {
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

    documentCache.set(documentId, docData);

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
      orderByField = 'createdAt',
      orderDirection = 'desc',
      subject = null,
      folderId = null,
      useCache = true,
      startAfterDoc = null
    } = options;

    const cacheKey = `user_docs_${userId}_${subject || 'all'}_${folderId || 'all'}`;

    if (useCache && !startAfterDoc && documentCache.has(cacheKey)) {
      console.log('💾 Cache hit for user documents');
      return documentCache.get(cacheKey);
    }

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

    if (!startAfterDoc) {
      documentCache.set(cacheKey, documents);
    }

    return documents;
  } catch (error) {
    console.error('Error getting user documents:', error);
    return [];
  }
};

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

export const getDocumentsBySubject = async (userId, subject) => {
  return getUserDocuments(userId, { subject });
};

// ==================== 📊 UPDATE & TRACKING ====================

export const updateDocument = async (documentId, updates) => {
  try {
    const docRef = doc(db, 'documents', documentId);

    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });

    documentCache.delete(documentId);

    console.log('✅ Document updated:', documentId);
  } catch (error) {
    console.error('Error updating document:', error);
    throw error;
  }
};

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

export const clearDocumentCache = () => {
  documentCache.clear();
  console.log('🗑️ Document cache cleared');
};

// ==================== 📦 EXPORTS ====================

export default {
  // Upload
  initiateDocumentUpload,
  createDocumentRecord,
  uploadDocument, // ✅ LEGACY COMPATIBILITY

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
  updateStudyTime,
  updateReadingProgress,

  // Utilities
  extractTextFromPDF,
  extractKeywords,
  generateSummary,
  clearDocumentCache
};
