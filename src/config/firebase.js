// src/config/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { getAnalytics } from 'firebase/analytics';

// Validate environment variables
const requiredEnvVars = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID'
];

const missingVars = requiredEnvVars.filter(varName => !import.meta.env[varName]);

if (missingVars.length > 0) {
    console.error('❌ Missing Firebase environment variables:', missingVars);
    console.error('📝 Please create a .env file in your project root with the following variables:');
    missingVars.forEach(varName => {
        console.error(`   ${varName}=your_value_here`);
    });
    throw new Error(`Missing Firebase configuration. Please check your .env file.`);
}

// Firebase configuration
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Log config status (only in development)
if (import.meta.env.DEV) {
    console.log('🔥 Firebase Config Loaded Successfully');
    console.log('📦 Project ID:', firebaseConfig.projectId);
}

// Initialize Firebase
let app;
try {
    app = initializeApp(firebaseConfig);
    console.log('✅ Firebase initialized successfully');
} catch (error) {
    console.error('❌ Firebase initialization error:', error);
    throw error;
}

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

// Firestore collection names
export const COLLECTIONS = {
    USERS: 'users',
    CLASSES: 'classes',
    DOCUMENTS: 'documents',
    QUIZZES: 'quizzes',
    ASSIGNMENTS: 'assignments',
    SESSIONS: 'sessions',
    ALO: 'alo',
    GAMIFICATION: 'gamification',
    REWARDS: 'rewards',
    NOTES: 'notes',
    FLASHCARDS: 'flashcards',
    SRS: 'srs',
    ROOMS: 'rooms',
    SUMMARIES: 'summaries',
    FLOWCHARTS: 'flowcharts'
};

export default app;
