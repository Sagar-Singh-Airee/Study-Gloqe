// src/App.jsx - FULLY OPTIMIZED VERSION WITH CLASSROOM
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
import Flashcard from './pages/Flashcard';
import Profile from './pages/Profile';
import Settings from './pages/Settings';

// Study Room (WebRTC)
import StudyRoom from './pages/StudyRoom';

// Teacher Pages
import TeacherDashboard from './pages/teacher/TeacherDashboard';

// Classroom Hub (Shared - Teacher & Student)
import ClassroomPage from './pages/ClassroomPage';

// ==========================================
// PROTECTED ROUTE COMPONENT
// ==========================================
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

    // Teacher-only routes
    if (teacherOnly && userData?.role !== 'teacher') {
        return <Navigate to="/dashboard" replace />;
    }

    // Redirect teachers to their dashboard (except for shared routes like /classroom)
    if (!teacherOnly && userData?.role === 'teacher') {
        const currentPath = window.location.pathname;
        // Allow teachers to access shared classroom route
        if (!currentPath.startsWith('/classroom') && !currentPath.startsWith('/teacher')) {
            return <Navigate to="/teacher/dashboard" replace />;
        }
    }

    return children;
};

// ==========================================
// PUBLIC ROUTE COMPONENT
// ==========================================
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

// ==========================================
// COMING SOON COMPONENT
// ==========================================
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

// ==========================================
// MAIN APP COMPONENT
// ==========================================
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
                        {/* ========================================
                            PUBLIC ROUTES
                        ======================================== */}
                        <Route path="/" element={<LandingPage />} />
                        <Route path="/auth" element={<PublicRoute><AuthPage /></PublicRoute>} />

                        {/* ========================================
                            SHARED ROUTES (Teacher & Student)
                        ======================================== */}
                        
                        {/* Classroom Hub - Accessible by both teachers and students */}
                        <Route 
                            path="/classroom/:classId" 
                            element={<ProtectedRoute><ClassroomPage /></ProtectedRoute>} 
                        />

                        {/* ========================================
                            STUDENT ROUTES
                        ======================================== */}
                        
                        {/* Main Dashboard */}
                        <Route 
                            path="/dashboard" 
                            element={<ProtectedRoute><Dashboard /></ProtectedRoute>} 
                        />

                        {/* Classes - Old route (kept for backward compatibility) */}
                        <Route 
                            path="/classes/:classId" 
                            element={<ProtectedRoute><ClassDetails /></ProtectedRoute>} 
                        />

                        {/* Documents & PDFs */}
                        <Route 
                            path="/upload" 
                            element={<ProtectedRoute><PDFUpload /></ProtectedRoute>} 
                        />
                        <Route 
                            path="/documents/:docId" 
                            element={<ProtectedRoute><PDFReader /></ProtectedRoute>} 
                        />

                        {/* Study Session */}
                        <Route 
                            path="/study/:docId" 
                            element={<ProtectedRoute><StudySession /></ProtectedRoute>} 
                        />

                        {/* Study Room (WebRTC) */}
                        <Route 
                            path="/study-room/:roomId" 
                            element={<ProtectedRoute><StudyRoom /></ProtectedRoute>} 
                        />

                        {/* Quizzes */}
                        <Route 
                            path="/quiz/:quizId" 
                            element={<ProtectedRoute><QuizPage /></ProtectedRoute>} 
                        />
                        <Route 
                            path="/quizzes/:quizId" 
                            element={<ProtectedRoute><QuizPage /></ProtectedRoute>} 
                        />
                        <Route 
                            path="/results/:sessionId" 
                            element={<ProtectedRoute><QuizResults /></ProtectedRoute>} 
                        />

                        {/* Flashcards */}
                        <Route 
                            path="/flashcards/:deckId" 
                            element={<ProtectedRoute><Flashcard /></ProtectedRoute>} 
                        />

                        {/* User Pages */}
                        <Route 
                            path="/profile" 
                            element={<ProtectedRoute><Profile /></ProtectedRoute>} 
                        />
                        <Route 
                            path="/settings" 
                            element={<ProtectedRoute><Settings /></ProtectedRoute>} 
                        />

                        {/* Coming Soon */}
                        <Route 
                            path="/analytics" 
                            element={<ProtectedRoute><ComingSoon page="Analytics" /></ProtectedRoute>} 
                        />

                        {/* ========================================
                            TEACHER ROUTES
                        ======================================== */}
                        
                        {/* Main Teacher Dashboard (handles all tabs) */}
                        <Route 
                            path="/teacher/dashboard" 
                            element={<ProtectedRoute teacherOnly><TeacherDashboard /></ProtectedRoute>} 
                        />

                        {/* Teacher redirects to dashboard tabs */}
                        <Route 
                            path="/teacher/classes" 
                            element={<Navigate to="/teacher/dashboard?tab=classes" replace />} 
                        />
                        <Route 
                            path="/teacher/classes/:classId" 
                            element={<Navigate to="/teacher/dashboard?tab=classes" replace />} 
                        />
                        <Route 
                            path="/teacher/assignments" 
                            element={<Navigate to="/teacher/dashboard?tab=assignments" replace />} 
                        />
                        <Route 
                            path="/teacher/quizzes" 
                            element={<Navigate to="/teacher/dashboard?tab=quizzes" replace />} 
                        />
                        <Route 
                            path="/teacher/students" 
                            element={<Navigate to="/teacher/dashboard?tab=students" replace />} 
                        />
                        <Route 
                            path="/teacher/analytics" 
                            element={<Navigate to="/teacher/dashboard?tab=analytics" replace />} 
                        />
                        <Route 
                            path="/teacher/settings" 
                            element={<Navigate to="/teacher/dashboard?tab=settings" replace />} 
                        />

                        {/* ========================================
                            CATCH-ALL / 404
                        ======================================== */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </Router>
            </ClassProvider>
        </AuthProvider>
    );
}

export default App;
