// src/utils/idGenerator.js

/**
 * Generate a random 6-character class code (ABC123 format)
 * Ensures uniqueness by checking Firestore
 */
export const generateClassCode = async (db) => {
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    
    let code;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
        // Generate random 6-character code
        code = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        // Check if code already exists
        const classesRef = collection(db, 'classes');
        const q = query(classesRef, where('classCode', '==', code));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            isUnique = true;
        }
        
        attempts++;
    }

    if (!isUnique) {
        throw new Error('Failed to generate unique class code');
    }

    return code;
};

/**
 * Generate a unique session ID with timestamp prefix
 * Format: session_1732696800000_abc123
 */
export const generateSessionId = () => {
    const timestamp = Date.now();
    const randomPart = Math.random().toString(36).substring(2, 8);
    return `session_${timestamp}_${randomPart}`;
};

/**
 * Generate a document ID with custom prefix
 */
export const generateDocumentId = (prefix = 'doc') => {
    const timestamp = Date.now();
    const randomPart = Math.random().toString(36).substring(2, 11);
    return `${prefix}_${timestamp}_${randomPart}`;
};

/**
 * Generate a short unique ID (for URLs, codes, etc.)
 */
export const generateShortId = (length = 8) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

/**
 * Generate a quiz invite code
 */
export const generateQuizCode = () => {
    return generateShortId(6); // 6-digit code like "A3B9C1"
};

/**
 * Validate class code format
 */
export const isValidClassCode = (code) => {
    return /^[A-Z0-9]{6}$/.test(code);
};

/**
 * Format Firestore auto-generated ID to display format
 */
export const formatFirestoreId = (id) => {
    // Take first 8 characters for display
    return id.substring(0, 8).toUpperCase();
};
