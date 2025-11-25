# 🎓 StudyGloqe - AI-Powered Learning Platform

A comprehensive, modern learning platform that transforms PDFs into interactive quizzes, flashcards, and personalized learning paths using cutting-edge AI technology.

## ✨ Features

### Core Features (MVP)
- 📄 **PDF Upload & Processing** - Upload documents with auto-subject detection
- 🤖 **AI-Powered Quiz Generation** - Automatic MCQ creation from documents
- 📖 **Smart PDF Reader** - With AI tools (Summarize, Notes, Flow Charts)
- 🎮 **Gamification** - XP, levels, badges, and leaderboards
- 👨‍🏫 **Teacher Tools** - Create/assign quizzes, manage classes, view analytics
- ⏱️ **Interactive Quiz Experience** - Timed quizzes with instant feedback
- 🏆 **Monthly Rewards** - Teacher-configured prizes for top performers
- 📊 **Analytics Dashboard** - Track progress and performance

### Advanced Features (Phase 2)
- 🎥 **Study Rooms** - Real-time video/audio collaboration
- 🗂️ **Smart Flashcards** - With spaced repetition (SRS)
- 🗣️ **Voice Assistant** - TTS/STT for accessibility
- 🔍 **Advanced Search** - AI-powered recommendations
- 📈 **Deep Analytics** - BigQuery integration for insights

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Firebase account
- Google Cloud Platform account (for Vertex AI)
- Agora account (for video rooms - Phase 2)

### Installation

1. **Clone and install dependencies:**
```bash
npm install
```

2. **Set up Firebase:**
   - Create a new Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
   - Enable Authentication (Email/Password and Google)
   - Enable Firestore Database
   - Enable Storage
   - Enable Cloud Functions
   - Copy your Firebase config

3. **Configure environment variables:**
   - Copy `.env.example` to `.env`
   - Fill in your Firebase credentials
   - Add Google Cloud project ID for Vertex AI

4. **Add your logo:**
   - Place your logo files in `src/assets/logo/`
   - Update references in components

5. **Set up Spline (optional):**
   - Create 3D scenes at [spline.design](https://spline.design)
   - Export and get the scene URL
   - Update `LandingPage.jsx` with your Spline scene URL

6. **Run development server:**
```bash
npm run dev
```

## 📁 Project Structure

```
studygloqe/
├── src/
│   ├── assets/          # Static assets (logo, images)
│   ├── components/      # React components
│   │   ├── common/      # Reusable UI components
│   │   ├── pdf/         # PDF-related components
│   │   ├── quiz/        # Quiz components
│   │   ├── gamification/# Points, badges, leaderboard
│   │   └── teacher/     # Teacher-specific components
│   ├── contexts/        # React Context providers
│   ├── hooks/          # Custom React hooks
│   ├── pages/          # Page components
│   ├── services/       # API & Firebase services
│   ├── utils/          # Helper functions
│   ├── config/         # Configuration files
│   └── styles/         # Global styles
├── functions/          # Firebase Cloud Functions
├── public/            # Public assets
└── firestore.rules    # Firestore security rules
```

## 🔥 Firebase Setup Details

### Firestore Collections

Create these collections in your Firestore:
- `users` - User profiles
- `classes` - Teacher classes
- `documents` - Uploaded PDFs
- `quizzes` - Quiz data
- `assignments` - Quiz assignments
- `sessions` - Quiz sessions
- `alo` - Adaptive Learning Orchestrator data
- `gamification` - User XP, badges, levels
- `rewards` - Monthly reward tracking

### Security Rules

Deploy security rules:
```bash
firebase deploy --only firestore:rules
```

### Cloud Functions

Navigate to the functions directory and deploy:
```bash
cd functions
npm install
firebase deploy --only functions
```

## 🎨 Customization

### Theme Colors
Edit `tailwind.config.js` to customize the color scheme. The app uses a black/silver/white theme with accent colors.

### Spline Integration
1. Create your 3D scene at [spline.design](https://spline.design)
2. Export and get the scene URL
3. Replace placeholder in `LandingPage.jsx`:
```jsx
<Spline scene="YOUR_SPLINE_SCENE_URL" />
```

## 🔌 API Endpoints (Cloud Functions)

You'll need to implement these Cloud Functions:
- `POST /api/ingest` - Upload and process PDF
- `POST /api/generate-quiz` - Generate quiz from document
- `POST /api/quizzes/{id}/assign` - Assign quiz to class
- `POST /api/sessions` - Start/submit quiz session
- `GET /api/users/{uid}/progress` - Get user progress
- `POST /api/alo/next` - Get next recommended activity
- `POST /api/gamification/award` - Award points
- `GET /api/class/{id}/leaderboard` - Get class leaderboard
- `POST /api/rewards/{id}/finalize` - Finalize monthly winners
- `POST /api/rooms/token` - Get Agora token

## 🤖 AI Integration

### Vertex AI Setup
1. Enable Vertex AI API in Google Cloud Console
2. Set up authentication
3. Implement text generation for:
   - Subject classification
   - Quiz generation
   - Summaries
   - Notes generation
   - Flow chart creation

### Example Quiz Generation Flow
```javascript
// Cloud Function example
const generateQuiz = async (docId, settings) => {
  // 1. Get document text from Firestore
  // 2. Chunk text for token limits
  // 3. Call Vertex AI with prompt
  // 4. Parse and validate response
  // 5. Save quiz to Firestore
  // 6. Return quiz ID
}
```

## 📊 Analytics & Monitoring

### BigQuery Integration
1. Link Firestore to BigQuery
2. Set up scheduled exports
3. Create dashboards in Looker Studio

### Key Metrics to Track
- Upload success rate
- Quiz generation time
- Session completion rate
- User retention
- Mastery improvement

## 🎮 Gamification System

### XP Rules
- Correct answer: +10 XP
- Complete quiz: +20 XP
- Daily login: +5 XP
- Top 10% weekly: +30 XP

### Level System
- 100 XP per level
- Unlock badges at milestones
- Display on profile and leaderboard

## 🏆 Monthly Rewards

### Setup Flow
1. Teacher configures reward policy in class settings
2. At month-end, Cloud Scheduler triggers winner calculation
3. System checks eligibility (min attempts, time, no fraud)
4. Winners selected and notified
5. Teacher approves and collects delivery info
6. Mark as delivered in Firestore

## 🔐 Security & Privacy

### Best Practices
- Enable Firestore security rules
- Use Firebase Auth tokens for API calls
- Implement rate limiting
- Encrypt sensitive data
- Log audit trails for rewards
- COPPA/GDPR compliance checks

## 📱 Responsive Design

The app is fully responsive and works on:
- Desktop (1920px+)
- Laptop (1280px - 1919px)
- Tablet (768px - 1279px)
- Mobile (320px - 767px)

## 🧪 Testing

### Run Tests
```bash
npm run test
```

### Test Coverage
- Unit tests for services
- Component tests
- E2E tests for critical flows

## 📦 Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Firebase Hosting
```bash
firebase deploy --only hosting
```

### Deploy Everything
```bash
firebase deploy
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
- Open an issue on GitHub
- Check documentation
- Contact support

## 🚀 Next Steps

1. **Complete Authentication** - Implement password reset, email verification
2. **PDF Reader Component** - Build the actual PDF viewer with AI tools
3. **Quiz Taking UI** - Create interactive quiz interface
4. **Teacher Dashboard** - Build full analytics and class management
5. **Cloud Functions** - Implement all backend endpoints
6. **Vertex AI Integration** - Set up AI text generation
7. **Study Rooms** - Integrate Agora for video/audio
8. **Testing** - Write comprehensive tests
9. **Optimization** - Performance and bundle size
10. **Launch** - Deploy to production!

---

Built with ❤️ using React, Firebase, Tailwind CSS, and Spline