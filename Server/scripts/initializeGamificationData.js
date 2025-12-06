// Server/scripts/initializeGamificationData.js
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from Server/.env
dotenv.config({ path: join(__dirname, '../.env') });

// Firebase configuration
const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID
};

// Validate configuration
function validateConfig() {
    const required = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
    const missing = required.filter(key => !firebaseConfig[key]);
    
    if (missing.length > 0) {
        console.error('❌ Missing Firebase config in .env:');
        missing.forEach(key => console.error(`   - VITE_FIREBASE_${key.toUpperCase()}`));
        return false;
    }
    return true;
}

// Badge definitions
const badges = [
    // Study Badges
    {
        id: 'first-study-session',
        name: 'First Steps',
        description: 'Completed your first study session',
        category: 'study',
        icon: '📚',
        xpReward: 10,
        requirement: { type: 'sessions', count: 1 }
    },
    {
        id: 'study-streak-7',
        name: 'Week Warrior',
        description: 'Studied for 7 days in a row',
        category: 'study',
        icon: '🔥',
        xpReward: 50,
        requirement: { type: 'streak', count: 7 }
    },
    {
        id: 'study-hours-10',
        name: 'Dedicated Learner',
        description: 'Completed 10 hours of study',
        category: 'study',
        icon: '⏰',
        xpReward: 100,
        requirement: { type: 'hours', count: 10 }
    },
    {
        id: 'night-owl',
        name: 'Night Owl',
        description: 'Studied after midnight',
        category: 'study',
        icon: '🦉',
        xpReward: 25,
        requirement: { type: 'timeOfDay', value: 'night' }
    },
    {
        id: 'early-bird',
        name: 'Early Bird',
        description: 'Studied before 6 AM',
        category: 'study',
        icon: '🌅',
        xpReward: 25,
        requirement: { type: 'timeOfDay', value: 'early' }
    },

    // Video Call Badges (Agora)
    {
        id: 'first-video-call',
        name: 'Video Starter',
        description: 'Joined your first Agora study room',
        category: 'video',
        icon: '📹',
        xpReward: 15,
        requirement: { type: 'videoCalls', count: 1 }
    },
    {
        id: 'group-study-master',
        name: 'Group Study Master',
        description: 'Participated in 10 group video sessions',
        category: 'video',
        icon: '👥',
        xpReward: 75,
        requirement: { type: 'videoCalls', count: 10 }
    },
    {
        id: 'long-session',
        name: 'Marathon Studier',
        description: 'Stayed in a video call for 3+ hours',
        category: 'video',
        icon: '⚡',
        xpReward: 50,
        requirement: { type: 'videoHours', count: 3 }
    },
    {
        id: 'camera-on-champion',
        name: 'Camera On Champion',
        description: 'Kept camera on for 5 sessions',
        category: 'video',
        icon: '🎥',
        xpReward: 30,
        requirement: { type: 'cameraOn', count: 5 }
    },

    // Achievement Badges
    {
        id: 'goal-crusher',
        name: 'Goal Crusher',
        description: 'Completed 5 study goals',
        category: 'achievement',
        icon: '🎯',
        xpReward: 60,
        requirement: { type: 'goals', count: 5 }
    },
    {
        id: 'quiz-master',
        name: 'Quiz Master',
        description: 'Scored 100% on 3 quizzes',
        category: 'achievement',
        icon: '💯',
        xpReward: 80,
        requirement: { type: 'perfectQuizzes', count: 3 }
    },
    {
        id: 'note-taker',
        name: 'Note Taker',
        description: 'Created 20 study notes',
        category: 'achievement',
        icon: '📝',
        xpReward: 40,
        requirement: { type: 'notes', count: 20 }
    },
    {
        id: 'helper',
        name: 'Helpful Peer',
        description: 'Helped 5 other students',
        category: 'social',
        icon: '🤝',
        xpReward: 70,
        requirement: { type: 'helpedPeers', count: 5 }
    },
    {
        id: 'consistent-learner',
        name: 'Consistent Learner',
        description: 'Studied 30 days in a month',
        category: 'achievement',
        icon: '📆',
        xpReward: 150,
        requirement: { type: 'monthlyDays', count: 30 }
    },
    {
        id: 'level-10',
        name: 'Expert',
        description: 'Reached level 10',
        category: 'achievement',
        icon: '⭐',
        xpReward: 200,
        requirement: { type: 'level', count: 10 }
    }
];

// Title definitions
const titles = [
    {
        id: 'newbie',
        name: 'Newbie',
        description: 'Just getting started',
        tier: 'bronze',
        xpRequired: 0,
        icon: '🌱'
    },
    {
        id: 'student',
        name: 'Student',
        description: 'Active learner',
        tier: 'bronze',
        xpRequired: 100,
        icon: '📖'
    },
    {
        id: 'scholar',
        name: 'Scholar',
        description: 'Dedicated to learning',
        tier: 'silver',
        xpRequired: 500,
        icon: '🎓'
    },
    {
        id: 'expert',
        name: 'Expert',
        description: 'Highly knowledgeable',
        tier: 'silver',
        xpRequired: 1000,
        icon: '👨‍🎓'
    },
    {
        id: 'master',
        name: 'Master',
        description: 'Mastered the craft',
        tier: 'gold',
        xpRequired: 2500,
        icon: '🏆'
    },
    {
        id: 'legend',
        name: 'Legend',
        description: 'Legendary status',
        tier: 'gold',
        xpRequired: 5000,
        icon: '👑'
    },
    {
        id: 'guru',
        name: 'Study Guru',
        description: 'Ultimate knowledge seeker',
        tier: 'platinum',
        xpRequired: 10000,
        icon: '✨'
    }
];

// Initialize badges
async function initializeBadges(db) {
    const badgesRef = doc(db, 'gamification', 'badges');
    const badgeData = {};
    
    badges.forEach(badge => {
        badgeData[badge.id] = badge;
    });

    await setDoc(badgesRef, { badges: badgeData }, { merge: true });
    return { success: true, count: badges.length, badges };
}

// Initialize titles
async function initializeTitles(db) {
    const titlesRef = doc(db, 'gamification', 'titles');
    const titleData = {};
    
    titles.forEach(title => {
        titleData[title.id] = title;
    });

    await setDoc(titlesRef, { titles: titleData }, { merge: true });
    return { success: true, count: titles.length, titles };
}

// Main function
async function initializeGamificationSystem() {
    console.log('═══════════════════════════════════════════════');
    console.log('🎮 StudyGloqe Gamification System Initializer');
    console.log('═══════════════════════════════════════════════\n');

    try {
        // Validate config
        console.log('🔍 Step 1: Validating Firebase configuration...');
        if (!validateConfig()) {
            throw new Error('Invalid Firebase configuration');
        }
        console.log('✅ Configuration validated\n');

        // Initialize Firebase
        console.log('🔥 Step 2: Connecting to Firebase...');
        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);
        console.log(`✅ Connected to project: ${firebaseConfig.projectId}\n`);

        // Initialize badges
        console.log('📛 Step 3: Initializing badges...');
        const badgesResult = await initializeBadges(db);
        console.log(`✅ Successfully initialized ${badgesResult.count} badges`);
        
        const categories = [...new Set(badges.map(b => b.category))];
        console.log('   Badge categories:');
        categories.forEach(cat => {
            const count = badges.filter(b => b.category === cat).length;
            console.log(`   - ${cat}: ${count} badges`);
        });
        console.log('');

        // Initialize titles
        console.log('👑 Step 4: Initializing titles...');
        const titlesResult = await initializeTitles(db);
        console.log(`✅ Successfully initialized ${titlesResult.count} titles`);
        
        const tiers = [...new Set(titles.map(t => t.tier))];
        console.log('   Title tiers:');
        tiers.forEach(tier => {
            const count = titles.filter(t => t.tier === tier).length;
            console.log(`   - ${tier}: ${count} titles`);
        });
        console.log('');

        // Success
        console.log('═══════════════════════════════════════════════');
        console.log('🎉 Gamification System Initialized Successfully!');
        console.log('═══════════════════════════════════════════════');
        console.log('\n📊 Summary:');
        console.log(`   ├─ Badges:  ${badgesResult.count} items`);
        console.log(`   ├─ Titles:  ${titlesResult.count} items`);
        console.log(`   └─ Project: ${firebaseConfig.projectId}`);
        console.log('\n✨ Your gamification system is ready!');
        console.log('🚀 Users can now earn badges in Agora study rooms.\n');

        process.exit(0);

    } catch (error) {
        console.error('\n═══════════════════════════════════════════════');
        console.error('❌ Initialization Failed');
        console.error('═══════════════════════════════════════════════');
        console.error(`\n🔴 Error: ${error.message}\n`);
        
        if (error.stack) {
            console.error('Stack trace:');
            console.error(error.stack);
        }

        process.exit(1);
    }
}

// Run
initializeGamificationSystem();
