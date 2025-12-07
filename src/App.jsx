// src/App.jsx - CLEAN FINAL VERSION
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
import Analytics from './pages/Analytics'; // ✅ ADDED

// Study Room (WebRTC)
import StudyRoom from './pages/StudyRoom';

// Teacher Pages
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import TeacherClassroom from './pages/teacher/TeacherClassroom';

// Shared Classroom
import ClassroomPage from './pages/ClassroomPage';

// ==========================================
// STUDENT ONLY ROUTE
// ==========================================
const StudentRoute = ({ children }) => {
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

    // Redirect teachers to teacher dashboard
    if (userData?.role === 'teacher') {
        return <Navigate to="/teacher/dashboard" replace />;
    }

    return children;
};

// ==========================================
// TEACHER ONLY ROUTE
// ==========================================
const TeacherRoute = ({ children }) => {
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

    // Redirect students to student dashboard
    if (userData?.role !== 'teacher') {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};

// ==========================================
// PROTECTED ROUTE (Both roles allowed)
// ==========================================
const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();

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

    return children;
};

// ==========================================
// PUBLIC ROUTE
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
// COMING SOON
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
// MAIN APP
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
                            SHARED ROUTES (Both Teacher & Student)
                        ======================================== */}
                        
                        <Route 
                            path="/classroom/:classId" 
                            element={<ProtectedRoute><ClassroomPage /></ProtectedRoute>} 
                        />

                        {/* ========================================
                            STUDENT ROUTES
                        ======================================== */}
                        
                        {/* Main Dashboard (handles analytics tab internally) */}
                        <Route 
                            path="/dashboard" 
                            element={<StudentRoute><Dashboard /></StudentRoute>} 
                        />

                        {/* Class Details */}
                        <Route 
                            path="/classes/:classId" 
                            element={<StudentRoute><ClassDetails /></StudentRoute>} 
                        />

                        {/* Document Management */}
                        <Route 
                            path="/upload" 
                            element={<StudentRoute><PDFUpload /></StudentRoute>} 
                        />
                        <Route 
                            path="/documents/:docId" 
                            element={<StudentRoute><PDFReader /></StudentRoute>} 
                        />

                        {/* Study Session */}
                        <Route 
                            path="/study/:docId" 
                            element={<StudentRoute><StudySession /></StudentRoute>} 
                        />

                        {/* Study Rooms (WebRTC) */}
                        <Route 
                            path="/study-room/:roomId" 
                            element={<StudentRoute><StudyRoom /></StudentRoute>} 
                        />

                        {/* Quizzes */}
                        <Route 
                            path="/quiz/:quizId" 
                            element={<StudentRoute><QuizPage /></StudentRoute>} 
                        />
                        <Route 
                            path="/quizzes/:quizId" 
                            element={<StudentRoute><QuizPage /></StudentRoute>} 
                        />
                        <Route 
                            path="/results/:sessionId" 
                            element={<StudentRoute><QuizResults /></StudentRoute>} 
                        />

                        {/* Flashcards */}
                        <Route 
                            path="/flashcards/:deckId" 
                            element={<StudentRoute><Flashcard /></StudentRoute>} 
                        />

                        {/* User Pages */}
                        <Route 
                            path="/profile" 
                            element={<StudentRoute><Profile /></StudentRoute>} 
                        />
                        <Route 
                            path="/settings" 
                            element={<StudentRoute><Settings /></StudentRoute>} 
                        />

                        {/* ✅ Analytics - Standalone Route (Optional - mainly accessed via Dashboard tab) */}
                        <Route 
                            path="/analytics" 
                            element={<StudentRoute><Analytics /></StudentRoute>} 
                        />

                        {/* ========================================
                            TEACHER ROUTES
                        ======================================== */}
                        
                        {/* Main Teacher Dashboard */}
                        <Route 
                            path="/teacher/dashboard" 
                            element={<TeacherRoute><TeacherDashboard /></TeacherRoute>} 
                        />

                        {/* Teacher's Classroom Page */}
                        <Route 
                            path="/teacher/class/:classId" 
                            element={<TeacherRoute><TeacherClassroom /></TeacherRoute>} 
                        />

                        {/* Teacher Dashboard Tab Redirects */}
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
                            CATCH-ALL
                        ======================================== */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </Router>
            </ClassProvider>
        </AuthProvider>
    );
}

export default App;
