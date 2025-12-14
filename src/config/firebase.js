// src/config/firebase.js - ENHANCED VERSION ✨
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { 
  getFirestore, 
  connectFirestoreEmulator,
  enableIndexedDbPersistence,
  CACHE_SIZE_UNLIMITED 
} from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getAnalytics, isSupported } from 'firebase/analytics';

// ==================== ENVIRONMENT VALIDATION ====================
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
  console.error('📝 Please create a .env file with:');
  missingVars.forEach(varName => {
    console.error(`   ${varName}=your_value_here`);
  });
  throw new Error('Missing Firebase configuration. Check your .env file.');
}

// ==================== FIREBASE CONFIGURATION ====================
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// ==================== INITIALIZE FIREBASE ====================
let app;
try {
  app = initializeApp(firebaseConfig);
  
  if (import.meta.env.DEV) {
    console.log('🔥 Firebase initialized successfully');
    console.log('📦 Project:', firebaseConfig.projectId);
  }
} catch (error) {
  console.error('❌ Firebase initialization failed:', error);
  throw error;
}

// ==================== INITIALIZE SERVICES ====================

// Auth
export const auth = getAuth(app);

// Firestore with offline persistence
export const db = getFirestore(app);

// Enable offline persistence (IMPROVED!)
if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db, {
    cacheSizeBytes: CACHE_SIZE_UNLIMITED
  }).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('⚠️ Persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
      console.warn('⚠️ Persistence not available in this browser');
    }
  });
}

// Storage
export const storage = getStorage(app);

// Functions (FIXED: Added region for India)
export const functions = getFunctions(app, 'asia-south1');

// Analytics (only if supported)
export let analytics = null;
if (typeof window !== 'undefined') {
  isSupported().then(supported => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

// ==================== EMULATORS (for local development) ====================
const USE_EMULATORS = import.meta.env.VITE_USE_EMULATORS === 'true';

if (USE_EMULATORS && import.meta.env.DEV) {
  console.log('🔧 Using Firebase Emulators');
  
  try {
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectStorageEmulator(storage, 'localhost', 9199);
    connectFunctionsEmulator(functions, 'localhost', 5001);
    console.log('✅ Emulators connected');
  } catch (error) {
    console.warn('⚠️ Emulator connection failed:', error);
  }
}

// ==================== COLLECTION NAMES (EXPANDED!) ====================
export const COLLECTIONS = {
  // User & Auth
  USERS: 'users',
  USER_PROFILES: 'userProfiles',
  
  // Education
  CLASSES: 'classes',
  DOCUMENTS: 'documents',
  NOTES: 'notes',
  FLASHCARDS: 'flashcards',
  QUIZZES: 'quizzes',
  ASSIGNMENTS: 'assignments',
  SUMMARIES: 'summaries',
  FLOWCHARTS: 'flowcharts',
  
  // Study Tracking
  STUDY_SESSIONS: 'studySessions',
  QUIZ_SESSIONS: 'quizSessions',
  SESSIONS: 'sessions',
  
  // Gamification
  GAMIFICATION: 'gamification',
  ACHIEVEMENTS: 'achievements',
  REWARDS: 'rewards',
  BADGES: 'badges',
  LEADERBOARD: 'leaderboard',
  
  // Communication
  ROOMS: 'rooms',
  MESSAGES: 'messages',
  ANNOUNCEMENTS: 'announcements',
  NOTIFICATIONS: 'notifications',
  
  // AI & Learning
  ALO: 'alo',
  SRS: 'srs',
  RECOMMENDATIONS: 'recommendations',
  
  // Analytics
  ANALYTICS: 'analytics',
  USER_EVENTS: 'userEvents',
  
  // Materials
  MATERIALS: 'materials',
  RESOURCES: 'resources'
};

// ==================== HELPER FUNCTIONS (BONUS!) ====================

/**
 * Check if Firebase is ready
 */
export const isFirebaseReady = () => {
  return !!app;
};

/**
 * Get current user ID safely
 */
export const getCurrentUserId = () => {
  return auth.currentUser?.uid || null;
};

/**
 * Get current user email safely
 */
export const getCurrentUserEmail = () => {
  return auth.currentUser?.email || null;
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = () => {
  return !!auth.currentUser;
};

/**
 * Wait for auth to be ready
 */
export const waitForAuth = () => {
  return new Promise((resolve) => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      unsubscribe();
      resolve(user);
    });
  });
};

/**
 * Get Firebase timestamp
 */
export const getTimestamp = () => {
  const { serverTimestamp } = require('firebase/firestore');
  return serverTimestamp();
};

/**
 * Check if running in production
 */
export const isProduction = () => {
  return import.meta.env.PROD;
};

/**
 * Get Firebase config info (safe for logging)
 */
export const getConfigInfo = () => ({
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  region: 'asia-south1',
  environment: import.meta.env.MODE
});

// ==================== EXPORT DEFAULT APP ====================
export default app;

// ==================== DEV LOGGING ====================
if (import.meta.env.DEV) {
  console.log('📊 Firebase Services:', {
    auth: '✅',
    firestore: '✅',
    storage: '✅',
    functions: '✅ (asia-south1)',
    analytics: analytics ? '✅' : '⏳',
    persistence: '✅'
  });
}
