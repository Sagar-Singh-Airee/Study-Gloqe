import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from '@contexts/AuthContext';
import { ClassProvider } from '@contexts/ClassContext';

// Auth & Landing
import AuthPage from './pages/auth/AuthPage';
import LandingPage from './pages/LandingPage';

// Student Pages
import Dashboard from './pages/Dashboard';
import ClassDetails from './pages/ClassDetails';
import PDFUpload from './pages/PDFUpload';
import PDFReader from './pages/PDFReader';
import StudySession from './pages/StudySession';
import QuizPage from './pages/QuizPage';
import QuizResults from './pages/QuizResults';
import Flashcard from './pages/Flashcard'; // ✅ FIXED: Correct import name
import Profile from './pages/Profile';
import Settings from './pages/Settings';

// Study Room (WebRTC)
import StudyRoom from './pages/StudyRoom';

// Teacher Pages
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import ClassManagement from './pages/teacher/ClassManagement';

const ProtectedRoute = ({ children, teacherOnly = false }) => {
    const { user, userData, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
                    <p className="text-sm text-gray-600 font-semibold">Loading...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/auth" replace />;
    }

    if (teacherOnly && userData?.role !== 'teacher') {
        return <Navigate to="/dashboard" replace />;
    }

    if (!teacherOnly && userData?.role === 'teacher') {
        const currentPath = window.location.pathname;
        if (currentPath === '/dashboard' || currentPath.startsWith('/classes')) {
            return <Navigate to="/teacher/dashboard" replace />;
        }
    }

    return children;
};

const PublicRoute = ({ children }) => {
    const { user, userData, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
                    <p className="text-sm text-gray-600 font-semibold">Loading...</p>
                </div>
            </div>
        );
    }

    if (user) {
        if (userData?.role === 'teacher') {
            return <Navigate to="/teacher/dashboard" replace />;
        }
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};

function App() {
    return (
        <AuthProvider>
            <ClassProvider>
                <Router>
                    <Toaster
                        position="top-right"
                        toastOptions={{
                            duration: 3000,
                            style: {
                                background: 'rgba(255, 255, 255, 0.95)',
                                color: '#1f2937',
                                border: '1px solid #e5e7eb',
                                backdropFilter: 'blur(10px)',
                                fontWeight: '600'
                            },
                            success: {
                                iconTheme: {
                                    primary: '#374151',
                                    secondary: '#fff',
                                },
                            },
                        }}
                    />

                    <Routes>
                        {/* PUBLIC ROUTES */}
                        <Route path="/" element={<LandingPage />} />
                        <Route path="/auth" element={<PublicRoute><AuthPage /></PublicRoute>} />

                        {/* STUDENT ROUTES */}
                        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                        <Route path="/hub" element={<Navigate to="/dashboard" replace />} />

                        {/* Classes */}
                        <Route path="/classes" element={<Navigate to="/dashboard?tab=classes" replace />} />
                        <Route path="/classes/:classId" element={<ProtectedRoute><ClassDetails /></ProtectedRoute>} />

                        {/* Documents & PDFs */}
                        <Route path="/upload" element={<ProtectedRoute><PDFUpload /></ProtectedRoute>} />
                        <Route path="/documents" element={<Navigate to="/dashboard?tab=documents" replace />} />
                        <Route path="/documents/:docId" element={<ProtectedRoute><PDFReader /></ProtectedRoute>} />

                        {/* STUDY SESSION */}
                        <Route path="/study/:docId" element={<ProtectedRoute><StudySession /></ProtectedRoute>} />

                        {/* STUDY ROOM (WebRTC) */}
                        <Route path="/study-room/:roomId" element={<ProtectedRoute><StudyRoom /></ProtectedRoute>} />

                        {/* QUIZZES - FIXED ROUTES ✅ */}
                        <Route path="/quizzes" element={<Navigate to="/dashboard?tab=quizzes" replace />} />
                        
                        {/* Main quiz routes - both /quiz/:id and /quizzes/:id work */}
                        <Route path="/quiz/:quizId" element={<ProtectedRoute><QuizPage /></ProtectedRoute>} />
                        <Route path="/quizzes/:quizId" element={<ProtectedRoute><QuizPage /></ProtectedRoute>} />
                        
                        {/* Quiz Results */}
                        <Route path="/results/:sessionId" element={<ProtectedRoute><QuizResults /></ProtectedRoute>} />

                        {/* FLASHCARDS - FIXED ROUTES ✅ */}
                        <Route path="/flashcards" element={<Navigate to="/dashboard?tab=flashcards" replace />} />
                        
                        {/* Individual flashcard deck study page */}
                        <Route path="/flashcards/:deckId" element={<ProtectedRoute><Flashcard /></ProtectedRoute>} />

                        {/* Learning Tools */}
                        <Route path="/notes" element={<Navigate to="/dashboard?tab=notes" replace />} />

                        {/* Collaboration */}
                        <Route path="/study-rooms" element={<Navigate to="/dashboard?tab=rooms" replace />} />

                        {/* Gamification */}
                        <Route path="/leaderboard" element={<Navigate to="/dashboard?tab=leaderboard" replace />} />

                        {/* User */}
                        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                        <Route path="/analytics" element={<ProtectedRoute><ComingSoon page="Analytics" /></ProtectedRoute>} />

                        {/* TEACHER ROUTES */}
                        <Route path="/teacher/dashboard" element={<ProtectedRoute teacherOnly><TeacherDashboard /></ProtectedRoute>} />
                        <Route path="/teacher/classes" element={<ProtectedRoute teacherOnly><ClassManagement /></ProtectedRoute>} />

                        {/* CATCH ALL - Must be last */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </Router>
            </ClassProvider>
        </AuthProvider>
    );
}

const ComingSoon = ({ page }) => (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
            <div className="text-6xl mb-6">🚀</div>
            <h1 className="text-4xl font-black text-gray-900 mb-4">{page}</h1>
            <p className="text-gray-600 mb-8 font-medium">
                This feature is under development and will be available soon!
            </p>
            <a
                href="/dashboard"
                className="inline-block px-6 py-3 bg-gradient-to-r from-gray-800 to-gray-700 text-white rounded-xl font-bold hover:scale-105 transition-all shadow-xl"
            >
                ← Back to Dashboard
            </a>
        </div>
    </div>
);

export default App;
