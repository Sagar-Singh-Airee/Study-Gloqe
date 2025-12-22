# 🚀 StudyGloqe - Complete Setup Guide

This guide will walk you through setting up your StudyGloqe application from scratch.

## 📋 Prerequisites

Before you begin, ensure you have:
- Node.js 18+ installed
- npm or yarn package manager
- A Firebase account
- A Google Cloud Platform account
- Git installed

## 🎯 Quick Start (5 minutes)

```bash
# 1. Install dependencies
npm install

# 2. Create environment file
cp .env.example .env

# 3. Add your Firebase credentials to .env

# 4. Start development server
npm run dev
```

The app will open at `http://localhost:3000`

## 🔥 Firebase Setup (15 minutes)

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add Project"
3. Enter project name: `studygloqe` (or your choice)
4. Disable Google Analytics (optional)
5. Click "Create Project"

### Step 2: Enable Authentication

1. In Firebase Console, go to **Authentication**
2. Click "Get Started"
3. Enable these sign-in methods:
   - **Email/Password** → Enable
   - **Google** → Enable → Add your email
4. Save changes

### Step 3: Create Firestore Database

1. Go to **Firestore Database**
2. Click "Create database"
3. Start in **Test mode** (we'll add security rules later)
4. Choose location closest to your users
5. Click "Enable"

### Step 4: Set Up Storage

1. Go to **Storage**
2. Click "Get Started"
3. Start in **Test mode**
4. Use same location as Firestore
5. Click "Done"

### Step 5: Get Firebase Configuration

1. Go to **Project Settings** (gear icon)
2. Scroll to "Your apps"
3. Click web icon `</>`
4. Register app name: `studygloqe-web`
5. Copy the `firebaseConfig` object
6. Add to your `.env` file:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### Step 6: Deploy Security Rules

```bash
# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Storage rules
firebase deploy --only storage:rules
```

## ☁️ Google Cloud Setup (20 minutes)

### Enable Vertex AI

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your Firebase project (it's automatically linked)
3. Enable these APIs:
   - **Vertex AI API**
   - **Cloud Functions API**
   - **Cloud Storage API**
   - **Document AI API** (for PDF processing)

```bash
gcloud services enable aiplatform.googleapis.com
gcloud services enable cloudfunctions.googleapis.com
gcloud services enable storage.googleapis.com
gcloud services enable documentai.googleapis.com
```

### Create Service Account

```bash
# Create service account
gcloud iam service-accounts create studygloqe-backend \
    --display-name="StudyGloqe Backend"

# Grant necessary permissions
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:studygloqe-backend@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/aiplatform.user"

# Download key (keep this secure!)
gcloud iam service-accounts keys create key.json \
    --iam-account=studygloqe-backend@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

Add to `.env`:
```env
VITE_GOOGLE_CLOUD_PROJECT_ID=your_gcp_project_id
VITE_VERTEX_AI_LOCATION=us-central1
```

## 🎨 Add Your Logo

Place your logo files in:
```
src/assets/logo/
├── logo.svg      # Main logo
├── logo.png      # PNG version
└── favicon.ico   # Favicon
```

Update references in:
- `public/index.html`
- `src/components/common/Navbar.jsx`
- `src/pages/LandingPage.jsx`

## 🌐 Spline 3D Integration (Optional)

### Create Spline Scene

1. Go to [spline.design](https://spline.design)
2. Create your 3D logo/scene
3. Export → "Get Link"
4. Copy the scene URL

### Add to Landing Page

Update `src/pages/LandingPage.jsx`:

```jsx
<Spline scene="https://prod.spline.design/YOUR_SCENE_ID/scene.splinecode" />
```

## 🎮 Agora Setup for Video Rooms (Optional)

1. Sign up at [Agora.io](https://www.agora.io)
2. Create new project
3. Get App ID
4. Add to `.env`:

```env
VITE_AGORA_APP_ID=your_agora_app_id
```

## 🔧 Cloud Functions Setup

### Install Firebase CLI

```bash
npm install -g firebase-tools
firebase login
```

### Initialize Functions

```bash
firebase init functions
# Select JavaScript
# Install dependencies: Yes
```

### Deploy Functions

```bash
cd functions
npm install

# Install additional dependencies
npm install @google-cloud/vertexai

# Deploy
firebase deploy --only functions
```

Add functions URL to `.env`:
```env
VITE_API_BASE_URL=https://us-central1-your_project.cloudfunctions.net
```

## 🎯 Test Your Setup

### 1. Test Authentication

```bash
npm run dev
```

- Go to `/register`
- Create test account
- Sign in
- Should redirect to `/dashboard`

### 2. Test PDF Upload

- Go to `/upload`
- Drop a PDF file
- Check Firebase Storage
- Verify document in Firestore

### 3. Test Quiz Generation

- Upload a PDF
- Wait for processing
- Generate quiz
- Take quiz
- Check results

## 🔒 Production Setup

### Update Security Rules

Before deploying to production, update `firestore.rules` to production mode:

```javascript
// Change from test mode
match /{document=**} {
  allow read, write: if false; // This closes everything
}

// To production rules (already in firestore.rules)
```

### Environment Variables for Production

Create `.env.production`:

```env
VITE_ENV=production
VITE_FIREBASE_API_KEY=your_prod_api_key
# ... other production keys
```

### Build for Production

```bash
npm run build
```

### Deploy to Firebase Hosting

```bash
firebase init hosting
# Build directory: dist
# Single-page app: Yes
# GitHub auto-deploy: Optional

firebase deploy --only hosting
```

Your app will be live at: `https://your_project.firebaseapp.com`

## 🎨 Customization

### Colors

Edit `tailwind.config.js`:

```javascript
colors: {
  primary: {...},    // Background colors
  accent: {...},     // Main accent color
  success: '...',    // Success color
  // etc.
}
```

### Fonts

Update `src/styles/index.css`:

```css
@import url('https://fonts.googleapis.com/css2?family=Your+Font');
```

### Logo

Replace files in `src/assets/logo/`

## 🐛 Troubleshooting

### Issue: Firebase connection fails

**Solution:**
```bash
# Check your .env file
cat .env

# Restart dev server
npm run dev
```

### Issue: PDF upload fails

**Solution:**
- Check Firebase Storage rules
- Verify file size < 50MB
- Check browser console for errors

### Issue: Quiz generation fails

**Solution:**
- Verify Vertex AI is enabled
- Check Cloud Function logs: `firebase functions:log`
- Ensure service account has correct permissions

### Issue: Build fails

**Solution:**
```bash
# Clear cache
rm -rf node_modules
rm package-lock.json
npm install

# Try build again
npm run build
```

## 📊 Monitoring & Analytics

### Firebase Analytics

1. Enable Analytics in Firebase Console
2. View dashboards for:
   - User engagement
   - Screen views
   - Conversion tracking

### Error Monitoring

Add error tracking:

```bash
npm install @sentry/react
```

Configure in `src/main.jsx`:

```javascript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  environment: import.meta.env.VITE_ENV
});
```

## 🚀 Performance Optimization

### 1. Code Splitting

Already configured in `vite.config.js`

### 2. Image Optimization

Use WebP format:
```bash
# Convert images
cwebp input.png -o output.webp
```

### 3. Lazy Loading

```jsx
const PDFReader = lazy(() => import('@pages/PDFReader'));
```

### 4. Caching

Enable service worker:
```bash
npm install workbox-cli
```

## 📝 Next Steps

1. ✅ Complete setup following this guide
2. ✅ Test all features locally
3. ✅ Add your branding (logo, colors)
4. ✅ Create test users and data
5. ✅ Deploy to Firebase Hosting
6. ✅ Set up custom domain (optional)
7. ✅ Configure analytics and monitoring
8. ✅ Launch! 🎉

## 🆘 Need Help?

- [Firebase Documentation](https://firebase.google.com/docs)
- [Vertex AI Documentation](https://cloud.google.com/vertex-ai/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## 🎓 Additional Resources

- **Video Tutorial**: [Coming Soon]
- **Community Discord**: [Coming Soon]
- **API Reference**: See `/functions/index.js`
- **Component Library**: See `/src/components/`

---

## ⚡ Quick Reference Commands

```bash
# Development
npm run dev                    # Start dev server
npm run build                  # Build for production
npm run preview                # Preview production build

# Firebase
firebase login                 # Login to Firebase
firebase deploy               # Deploy everything
firebase deploy --only hosting # Deploy only hosting
firebase deploy --only functions # Deploy only functions
firebase functions:log        # View function logs

# Git
git add .                     # Stage changes
git commit -m "message"       # Commit changes
git push                      # Push to remote
```

---

**Congratulations!** 🎉 You now have a fully functional AI-powered learning platform!

Remember to keep your API keys secure and never commit `.env` files to version control.