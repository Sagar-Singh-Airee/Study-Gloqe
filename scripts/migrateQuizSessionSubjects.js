// scripts/migrateQuizSessionSubjects.js
import { initializeApp } from 'firebase/app';
import {
    getFirestore,
    collection,
    getDocs,
    doc,
    updateDoc,
    getDoc,
    writeBatch
} from 'firebase/firestore';
import { categorizeQuizSession } from '../src/helpers/subjectDetection.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const migrateQuizSessions = async () => {
    console.log('🚀 Starting Quiz Session Subject Migration...');

    try {
        // 1. Fetch all quiz sessions
        const sessionsRef = collection(db, 'quizSessions');
        const snapshot = await getDocs(sessionsRef);

        console.log(`📊 Found ${snapshot.size} quiz sessions to check.`);

        let updatedCount = 0;
        let batch = writeBatch(db);
        let batchCount = 0;

        for (const sessionDoc of snapshot.docs) {
            const sessionData = sessionDoc.data();
            const quizSnapshot = sessionData.quizSnapshot;

            if (!quizSnapshot) {
                console.warn(`⚠️ Session ${sessionDoc.id} has no quizSnapshot. Skipping.`);
                continue;
            }

            // Check if subject is missing or generic 'General Knowledge' when it could be better
            const currentSubject = quizSnapshot.subject;

            // We need to fetch the original quiz to get questions for better categorization
            // if they aren't in the snapshot (snapshot usually has title/subject/stats)
            // But wait, categorizeQuizSession needs questions or title.
            // Let's try to improve it based on title if questions aren't available in snapshot.

            // Ideally we'd have questions in the snapshot, but we might not.
            // Let's fetch the original quiz if needed, but that's expensive for many sessions.
            // Let's rely on the title for now if questions are missing.

            const newSubject = categorizeQuizSession({
                subject: currentSubject, // Pass current as fallback/hint
                title: quizSnapshot.title,
                questions: [] // We might not have questions easily available without extra fetches
            });

            if (newSubject !== currentSubject) {
                console.log(`🔄 Updating Session ${sessionDoc.id}: "${quizSnapshot.title}" | ${currentSubject} -> ${newSubject}`);

                const sessionRef = doc(db, 'quizSessions', sessionDoc.id);

                // Update the subject in the quizSnapshot map
                batch.update(sessionRef, {
                    'quizSnapshot.subject': newSubject
                });

                updatedCount++;
                batchCount++;

                // Commit batch every 500 updates
                if (batchCount >= 400) {
                    await batch.commit();
                    console.log('💾 Committed batch of updates...');
                    batch = writeBatch(db);
                    batchCount = 0;
                }
            }
        }

        if (batchCount > 0) {
            await batch.commit();
            console.log('💾 Committed final batch...');
        }

        console.log(`✅ Migration Complete! Updated ${updatedCount} sessions.`);

    } catch (error) {
        console.error('❌ Migration failed:', error);
    }
};

migrateQuizSessions();
