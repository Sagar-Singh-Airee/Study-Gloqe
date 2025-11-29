import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from '@contexts/AuthContext';
import { ClassProvider } from '@contexts/ClassContext'; // <--- IMPORTED HERE

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
import Profile from './pages/Profile';
import Settings from './pages/Settings';

// Study Room (WebRTC)
import StudyRoom from './pages/StudyRoom';

// Teacher Pages
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import ClassManagement from './pages/teacher/ClassManagement';

const ProtectedRoute = ({ children, teacherOnly = false }) => {
    const { user, userData, loading } = useAuth();

    console.log('🛡️ ProtectedRoute:', {
        hasUser: !!user,
        role: userData?.role,
        teacherOnly,
        loading
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-black text-white">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm">Loading...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        console.log('❌ No user, redirecting to /auth');
        return <Navigate to="/auth" replace />;
    }

    if (teacherOnly && userData?.role !== 'teacher') {
        console.log('❌ Teacher-only route, but user is student');
        return <Navigate to="/dashboard" replace />;
    }

    if (!teacherOnly && userData?.role === 'teacher') {
        const currentPath = window.location.pathname;
        if (currentPath === '/dashboard' || currentPath.startsWith('/classes')) {
            console.log('🔀 Redirecting teacher to teacher dashboard');
            return <Navigate to="/teacher/dashboard" replace />;
        }
    }

    return children;
};

const PublicRoute = ({ children }) => {
    const { user, userData, loading } = useAuth();

    console.log('🌐 PublicRoute:', { hasUser: !!user, role: userData?.role, loading });

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-black text-white">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm">Loading...</p>
                </div>
            </div>
        );
    }

    if (user) {
        if (userData?.role === 'teacher') {
            console.log('🔀 Teacher logged in, redirecting to teacher dashboard');
            return <Navigate to="/teacher/dashboard" replace />;
        }
        console.log('🔀 Student logged in, redirecting to dashboard');
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};

function App() {
    return (
        <AuthProvider>
            {/* ClassProvider must be INSIDE AuthProvider so it can access the user */}
            <ClassProvider>
                <Router>
                    <Toaster
                        position="top-right"
                        toastOptions={{
                            duration: 3000,
                            style: {
                                background: '#000',
                                color: '#fff',
                            },
                            success: {
                                iconTheme: {
                                    primary: '#fff',
                                    secondary: '#000',
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

                        {/* Redirect /hub to dashboard */}
                        <Route path="/hub" element={<Navigate to="/dashboard" replace />} />

                        {/* Classes */}
                        <Route path="/classes" element={<Navigate to="/dashboard?tab=classes" replace />} />
                        <Route path="/classes/:classId" element={<ProtectedRoute><ClassDetails /></ProtectedRoute>} />

                        {/* Documents & PDFs */}
                        <Route path="/upload" element={<ProtectedRoute><PDFUpload /></ProtectedRoute>} />
                        <Route path="/documents" element={<Navigate to="/dashboard?tab=documents" replace />} />
                        <Route path="/documents/:docId" element={<ProtectedRoute><PDFReader /></ProtectedRoute>} />

                        {/* STUDY SESSION (PDF → Text Study Mode) */}
                        <Route path="/study/:docId" element={<ProtectedRoute><StudySession /></ProtectedRoute>} />

                        {/* STUDY ROOM (WebRTC Video/Audio Collaboration) */}
                        <Route path="/study-room/:roomId" element={<ProtectedRoute><StudyRoom /></ProtectedRoute>} />

                        {/* Quizzes */}
                        <Route path="/quizzes" element={<Navigate to="/dashboard?tab=quizzes" replace />} />
                        <Route path="/quizzes/:quizId" element={<ProtectedRoute><QuizPage /></ProtectedRoute>} />
                        <Route path="/results/:sessionId" element={<ProtectedRoute><QuizResults /></ProtectedRoute>} />

                        {/* Learning Tools */}
                        <Route path="/flashcards" element={<Navigate to="/dashboard?tab=flashcards" replace />} />
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

                        {/* CATCH ALL */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </Router>
            </ClassProvider>
        </AuthProvider>
    );
}

const ComingSoon = ({ page }) => (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center max-w-md">
            <div className="text-6xl mb-6">🚀</div>
            <h1 className="text-4xl font-black text-black mb-4">{page}</h1>
            <p className="text-gray-600 mb-8">
                This feature is under development and will be available soon!
            </p>
            <a
                href="/dashboard"
                className="inline-block px-6 py-3 bg-black text-white rounded-xl font-bold hover:scale-105 transition-all"
            >
                ← Back to Dashboard
            </a>
        </div>
    </div>
);

export default App;
