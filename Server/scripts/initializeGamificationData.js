// Server/scripts/initializeGamificationData.js
// One-time script to populate Firestore with badge and title definitions

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { initializeBadges, initializeTitles } from '../../src/services/gamificationService.js';

// Firebase configuration
// Note: Update these values from your .env file
const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID
};

async function initializeGamificationSystem() {
    console.log('🚀 Starting gamification system initialization...\n');

    try {
        // Initialize Firebase
        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);

        console.log('✅ Firebase connection established\n');

        // Initialize badges
        console.log('📛 Initializing badges...');
        const badgesResult = await initializeBadges();
        console.log(`✅ ${badgesResult.count} badges initialized successfully\n`);

        // Initialize titles
        console.log('👑 Initializing titles...');
        const titlesResult = await initializeTitles();
        console.log(`✅ ${titlesResult.count} titles initialized successfully\n`);

        console.log('🎉 Gamification system initialization complete!');
        console.log('\nSummary:');
        console.log(`  - Badges: ${badgesResult.count}`);
        console.log(`  - Titles: ${titlesResult.count}`);
        console.log('\n✨ Your gamification system is now ready to use!');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error initializing gamification system:', error);
        process.exit(1);
    }
}

// Run the initialization
initializeGamificationSystem();
