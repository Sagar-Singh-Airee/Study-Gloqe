# Gamification System Initialization Guide

## Overview
This script initializes the Firestore database with badge and title definitions for the gamification system.

## Prerequisites
- Firebase project set up
- Environment variables configured in `.env`
- Node.js and npm installed

## How to Run

### Option 1: Using Node with ES Modules
```bash
# From the project root directory
cd Server/scripts
node --experimental-modules initializeGamificationData.js
```

### Option 2: Manual Initialization via Browser Console
If you encounter module issues, you can initialize directly from the browser:

1. Open your app in the browser
2. Log in as an admin/user
3. Open browser console (F12)
4. Run the following code:

```javascript
import { initializeBadges, initializeTitles } from '/src/services/gamificationService.js';

async function init() {
  console.log('Initializing badges...');
  await initializeBadges();
  
  console.log('Initializing titles...');
  await initializeTitles();
  
  console.log('✅ Complete!');
}

init();
```

### Option 3: Call from React Component
Temporarily add this to a component (like Dashboard.jsx):

```javascript
import { initializeBadges, initializeTitles } from '@/services/gamificationService';

useEffect(() => {
  const initialize = async () => {
    try {
      await initializeBadges();
      await initializeTitles();
      console.log('✅ Gamification data initialized!');
    } catch (error) {
      console.error('Error:', error);
    }
  };
  
  // Uncomment to run:
  // initialize();
}, []);
```

## What Gets Created

### Badges (16 total)
- Learning badges (First Steps, Quick Learner, Quiz Master)
- Dedication badges (Dedicated Scholar, Knowledge Seeker)
- Consistency badges (Streak Starter, On Fire!, Unstoppable)
- Content badges (Content Creator, Library Builder)
- Social badges (Social Learner, Community Champion)
- AI badges (AI Enthusiast)
- Progression badges (Rising Star, Elite Scholar, Legendary Master)

### Titles (10 total)
- Novice Learner (Level 1)
- Student (Level 3)
- Scholar (Level 5)
- Expert (Level 10)
- Master (Level 15)
- Sage (Level 20)
- Virtuoso (Level 25)
- Prodigy (Level 30)
- Legend (Level 40)
- Immortal Scholar (Level 50)

## Verification

After running, verify in Firebase Console:
1. Go to Firestore Database
2. Check for `badges` collection (should have 16 documents)
3. Check for `titles` collection (should have 10 documents)

## Notes
- This script is idempotent - safe to run multiple times
- Existing badges/titles will be overwritten with latest definitions
- User progress (unlocked badges/titles) is stored in user documents and won't be affected
