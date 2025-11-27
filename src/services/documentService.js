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
    increment
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db, storage, COLLECTIONS } from '@config/firebase';
import * as pdfjsLib from 'pdfjs-dist';

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
 * AI-Powered Subject Detection using Firebase Cloud Function
 */
const detectSubjectWithAI = async (text, fileName) => {
    try {
        console.log('🤖 Calling AI subject detection...');
        
        const functions = getFunctions();
        const detectSubject = httpsCallable(functions, 'detectSubject');
        
        const result = await detectSubject({
            text: text.substring(0, 2000), // First 2000 chars
            fileName
        });

        console.log('✅ AI Response:', result.data);
        return result.data.subject || 'General';
    } catch (error) {
        console.error('❌ AI detection error:', error);
        // Fallback to filename detection
        return detectSubjectFromFilename(fileName);
    }
};

/**
 * Fallback: Simple filename-based detection
 */
const detectSubjectFromFilename = (fileName) => {
    const lowerName = fileName.toLowerCase();
    
    const subjectPatterns = {
        'Mathematics': ['math', 'calculus', 'algebra', 'geometry', 'trigonometry'],
        'Physics': ['physics', 'mechanics', 'quantum', 'thermodynamics'],
        'Chemistry': ['chemistry', 'organic', 'inorganic', 'chemical'],
        'Biology': ['biology', 'genetics', 'anatomy', 'botany', 'zoology'],
        'Computer Science': ['cs', 'programming', 'algorithm', 'software', 'coding'],
        'Engineering': ['engineering', 'mechanical', 'electrical', 'civil'],
        'Economics': ['economics', 'macro', 'micro', 'finance'],
        'History': ['history', 'historical'],
        'Literature': ['literature', 'english', 'novel', 'poetry']
    };

    for (const [subject, patterns] of Object.entries(subjectPatterns)) {
        if (patterns.some(pattern => lowerName.includes(pattern))) {
            return subject;
        }
    }

    return 'General';
};

/**
 * Extract keywords for search
 */
const extractKeywords = (text) => {
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
 * Upload a PDF document - FIXED VERSION
 */
export const uploadDocument = async (file, userId, metadata = {}) => {
    try {
        console.log('📤 Starting document upload:', file.name);

        // Validate file
        if (!file.type.includes('pdf')) {
            throw new Error('Only PDF files are supported');
        }

        if (file.size > 50 * 1024 * 1024) {
            throw new Error('File size must be less than 50MB');
        }

        // Step 1: Extract text from PDF
        const { fullText, pageTexts, numPages, extractionError } = await extractTextFromPDF(file);

        // Step 2: AI-powered subject detection
        let subject = 'General';
        let aiDetected = false;
        
        if (fullText && fullText.length > 50) {
            console.log('🤖 Detecting subject with AI...');
            try {
                subject = await detectSubjectWithAI(fullText, file.name);
                aiDetected = true;
                console.log('✅ AI detected subject:', subject);
            } catch (error) {
                console.warn('⚠️ AI detection failed, using fallback');
                subject = detectSubjectFromFilename(file.name);
            }
        } else {
            console.log('⚠️ Not enough text, using filename detection');
            subject = detectSubjectFromFilename(file.name);
        }

        // Allow manual override
        if (metadata.subject) {
            subject = metadata.subject;
            aiDetected = false;
        }
        
        // Step 3: Extract keywords for search
        const keywords = fullText ? extractKeywords(fullText) : [];

        // Step 4: Generate unique document ID
        const docId = `${userId}_${Date.now()}`;
        
        // ✅ FIXED: Correct storage path with userId
        const storageRef = ref(storage, `documents/${userId}/${docId}.pdf`);
        
        console.log('📁 Upload path:', `documents/${userId}/${docId}.pdf`);

        // Step 5: Upload file to Firebase Storage
        console.log('☁️ Uploading to Firebase Storage...');
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        
        console.log('✅ File uploaded to Storage');

        // Step 6: Create Firestore document
        const docData = {
            docId,
            title: metadata.title || file.name.replace('.pdf', ''),
            fileName: file.name,
            uploaderId: userId,
            fileSize: file.size,
            downloadURL,
            status: extractionError ? 'completed-with-errors' : 'completed',
            pages: numPages,
            subject,
            subjectDetectionMethod: aiDetected ? 'ai' : 'fallback',
            keywords,
            extractedText: fullText,
            extractionError: extractionError || null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            totalStudyTime: 0,
            lastStudiedAt: null,
            viewCount: 0,
            quizCount: 0,
            flashcardCount: 0
        };

        console.log('💾 Saving to Firestore...');
        const docRef = await addDoc(collection(db, COLLECTIONS.DOCUMENTS), docData);

        // Step 7: Save individual page texts (for reasonable page counts)
        if (pageTexts.length > 0 && pageTexts.length <= 100) {
            console.log(`📄 Saving ${pageTexts.length} page texts...`);
            const pagePromises = pageTexts.map(pageData =>
                addDoc(collection(db, COLLECTIONS.DOCUMENTS, docRef.id, 'pages'), {
                    ...pageData,
                    createdAt: serverTimestamp()
                })
            );
            await Promise.all(pagePromises);
        }

        // Step 8: Award XP for uploading (optional - Cloud Function will also do this)
        try {
            const gamificationRef = doc(db, 'gamification', userId);
            const gamificationSnap = await getDoc(gamificationRef);
            
            if (gamificationSnap.exists()) {
                await updateDoc(gamificationRef, {
                    totalDocuments: increment(1)
                });
            }
        } catch (error) {
            console.warn('Could not update gamification:', error);
        }

        console.log('✅ Document uploaded successfully:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('❌ Error uploading document:', error);
        throw error;
    }
};

/**
 * Get document by Firestore ID
 */
export const getDocument = async (firestoreId) => {
    try {
        const docRef = doc(db, COLLECTIONS.DOCUMENTS, firestoreId);
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
        return [];
    }
};

/**
 * Get recent documents
 */
export const getRecentDocuments = async (userId, limitCount = 5) => {
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
        console.error('Error getting recent documents:', error);
        return [];
    }
};

/**
 * Update document metadata
 */
export const updateDocument = async (firestoreId, updates) => {
    try {
        const docRef = doc(db, COLLECTIONS.DOCUMENTS, firestoreId);
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
 * Update study stats (called from StudySession)
 */
export const updateStudyStats = async (firestoreId, studyDuration) => {
    try {
        const docRef = doc(db, COLLECTIONS.DOCUMENTS, firestoreId);
        await updateDoc(docRef, {
            totalStudyTime: increment(studyDuration),
            lastStudiedAt: serverTimestamp(),
            viewCount: increment(1),
            updatedAt: serverTimestamp()
        });

        return true;
    } catch (error) {
        console.error('Error updating study stats:', error);
        throw error;
    }
};

/**
 * Delete document
 */
export const deleteDocument = async (firestoreId) => {
    try {
        const docData = await getDocument(firestoreId);

        // Delete from Storage (with correct path)
        const storageRef = ref(storage, `documents/${docData.uploaderId}/${docData.docId}.pdf`);
        await deleteObject(storageRef).catch(err => {
            console.warn('Storage file may not exist:', err);
        });

        // Delete subcollections (pages)
        const pagesQuery = query(collection(db, COLLECTIONS.DOCUMENTS, firestoreId, 'pages'));
        const pagesSnapshot = await getDocs(pagesQuery);
        await Promise.all(pagesSnapshot.docs.map(doc => deleteDoc(doc.ref)));

        // Delete main document
        await deleteDoc(doc(db, COLLECTIONS.DOCUMENTS, firestoreId));

        return true;
    } catch (error) {
        console.error('Error deleting document:', error);
        throw error;
    }
};

/**
 * Search documents
 */
export const searchDocuments = async (userId, searchQuery) => {
    try {
        if (!searchQuery || searchQuery.trim() === '') {
            return await getUserDocuments(userId);
        }

        const lowerQuery = searchQuery.toLowerCase();
        const allDocs = await getUserDocuments(userId, 100);

        return allDocs.filter(doc => {
            const titleMatch = doc.title?.toLowerCase().includes(lowerQuery);
            const keywordMatch = doc.keywords?.some(kw => kw.includes(lowerQuery));
            const subjectMatch = doc.subject?.toLowerCase().includes(lowerQuery);
            
            return titleMatch || keywordMatch || subjectMatch;
        });
    } catch (error) {
        console.error('Error searching documents:', error);
        return [];
    }
};

/**
 * Get documents by subject
 */
export const getDocumentsBySubject = async (userId, subject) => {
    try {
        const q = query(
            collection(db, COLLECTIONS.DOCUMENTS),
            where('uploaderId', '==', userId),
            where('subject', '==', subject),
            orderBy('createdAt', 'desc'),
            limit(50)
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
 * Get document statistics
 */
export const getDocumentStats = async (userId) => {
    try {
        const docs = await getUserDocuments(userId, 1000);

        const stats = {
            totalDocuments: docs.length,
            totalPages: docs.reduce((sum, doc) => sum + (doc.pages || 0), 0),
            totalSize: docs.reduce((sum, doc) => sum + (doc.fileSize || 0), 0),
            totalStudyTime: docs.reduce((sum, doc) => sum + (doc.totalStudyTime || 0), 0),
            subjectBreakdown: {},
            aiDetected: docs.filter(doc => doc.subjectDetectionMethod === 'ai').length,
            recentUploads: docs.slice(0, 5)
        };

        docs.forEach(doc => {
            const subject = doc.subject || 'General';
            stats.subjectBreakdown[subject] = (stats.subjectBreakdown[subject] || 0) + 1;
        });

        return stats;
    } catch (error) {
        console.error('Error getting document stats:', error);
        return null;
    }
};

/**
 * Get document pages
 */
export const getDocumentPages = async (firestoreId) => {
    try {
        const q = query(
            collection(db, COLLECTIONS.DOCUMENTS, firestoreId, 'pages'),
            orderBy('pageNum')
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error getting document pages:', error);
        return [];
    }
};
