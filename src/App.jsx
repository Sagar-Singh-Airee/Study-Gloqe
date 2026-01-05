// src/App.jsx - UPDATED WITH STUDENT CLASSROOM
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './features/auth/contexts/AuthContext';
import { ClassProvider } from './features/classroom/contexts/ClassContext';

// Auth & Landing
import AuthPage from './features/auth/pages/AuthPage';
import LandingPage from './features/landing/pages/LandingPage';

// Student Pages
import Dashboard from './features/student/pages/Dashboard';
import StudentClassroom from './features/student/pages/StudentClassroom'; // ✅ NEW - Student LMS Portal
// import ClassDetails from './features/student/pages/ClassDetails'; // ⚠️ OLD - Kept as backup
import Profile from './features/student/pages/Profile';
import TeacherPublicProfile from './features/student/components/TeacherPublicProfile';

// Study Pages
import PDFUpload from './features/study/pages/PDFUpload';
import PDFReader from './features/study/pages/PDFReader';
import StudySession from './features/study/pages/StudySession';
import QuizPage from './features/study/pages/QuizPage';
import QuizResults from './features/study/pages/QuizResults';
import Flashcard from './features/study/pages/Flashcard';
import StudyRoom from './features/study/pages/StudyRoom';

// Analytics
import Analytics from './features/analytics/pages/Analytics';

// Teacher Pages
import TeacherDashboard from './features/teacher/pages/TeacherDashboard';
import TeacherClassroom from './features/teacher/pages/TeacherClassroom';

// Shared Classroom
import ClassroomPage from './features/classroom/pages/ClassroomPage';

// ==========================================
// LOADING COMPONENT
// ==========================================
const LoadingScreen = () => (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
        <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 border-4 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
            <p className="text-sm text-gray-600 font-semibold">Loading...</p>
        </div>
    </div>
);

// ==========================================
// STUDENT ONLY ROUTE
// ==========================================
const StudentRoute = ({ children }) => {
    const { user, userData, loading } = useAuth();

    if (loading) {
        return <LoadingScreen />;
    }

    if (!user) {
        return <Navigate to="/" replace />;
    }

    // Redirect teachers to teacher dashboard
    if (userData?.role === 'teacher') {
        return <Navigate to="/teacher/dashboard" replace />;
    }

    return <>{children}</>;
};

// ==========================================
// TEACHER ONLY ROUTE
// ==========================================
const TeacherRoute = ({ children }) => {
    const { user, userData, loading } = useAuth();

    if (loading) {
        return <LoadingScreen />;
    }

    if (!user) {
        return <Navigate to="/" replace />;
    }

    // Redirect students to student dashboard
    if (userData?.role !== 'teacher') {
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
};

// ==========================================
// PROTECTED ROUTE (Both roles allowed)
// ==========================================
const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return <LoadingScreen />;
    }

    if (!user) {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
};

// ==========================================
// PUBLIC ROUTE
// ==========================================
const PublicRoute = ({ children }) => {
    const { user, userData, loading } = useAuth();

    if (loading) {
        return <LoadingScreen />;
    }

    if (user) {
        if (userData?.role === 'teacher') {
            return <Navigate to="/teacher/dashboard" replace />;
        }
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
};

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
                        containerStyle={{
                            top: 20,
                            right: 20,
                        }}
                        toastOptions={{
                            duration: 3000,
                            style: {
                                background: 'rgba(17, 24, 39, 0.95)',
                                backdropFilter: 'blur(16px)',
                                color: '#fff',
                                borderRadius: '16px',
                                padding: '16px 20px',
                                fontSize: '14px',
                                fontWeight: '600',
                                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3), 0 0 1px rgba(255, 255, 255, 0.1) inset',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                maxWidth: '400px',
                            },
                            success: {
                                duration: 3500,
                                style: {
                                    background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.95) 0%, rgba(6, 182, 212, 0.95) 100%)',
                                    color: '#fff',
                                    boxShadow: '0 20px 40px rgba(20, 184, 166, 0.25), 0 8px 16px rgba(6, 182, 212, 0.2)',
                                    border: '1px solid rgba(255, 255, 255, 0.15)',
                                },
                                iconTheme: {
                                    primary: '#fff',
                                    secondary: 'rgba(20, 184, 166, 0.9)',
                                },
                            },
                            error: {
                                duration: 4000,
                                style: {
                                    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.95) 0%, rgba(220, 38, 38, 0.95) 100%)',
                                    color: '#fff',
                                    boxShadow: '0 20px 40px rgba(239, 68, 68, 0.25), 0 8px 16px rgba(220, 38, 38, 0.2)',
                                    border: '1px solid rgba(255, 255, 255, 0.15)',
                                },
                                iconTheme: {
                                    primary: '#fff',
                                    secondary: 'rgba(239, 68, 68, 0.9)',
                                },
                            },
                            loading: {
                                style: {
                                    background: 'rgba(17, 24, 39, 0.95)',
                                    color: '#fff',
                                    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
                                },
                            },
                        }}
                        gutter={12}
                    />
                    <Routes>
                        {/* PUBLIC ROUTES */}
                        <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />
                        <Route path="/auth" element={<PublicRoute><AuthPage /></PublicRoute>} />

                        {/* SHARED ROUTES */}
                        <Route
                            path="/classroom/:classId"
                            element={<ProtectedRoute><ClassroomPage /></ProtectedRoute>}
                        />

                        {/* STUDENT ROUTES */}
                        <Route
                            path="/dashboard"
                            element={<StudentRoute><Dashboard /></StudentRoute>}
                        />
                        <Route
                            path="/classes/:classId"
                            element={<StudentRoute><StudentClassroom /></StudentRoute>}
                        />
                        <Route
                            path="/upload"
                            element={<StudentRoute><PDFUpload /></StudentRoute>}
                        />
                        <Route
                            path="/documents/:docId"
                            element={<StudentRoute><PDFReader /></StudentRoute>}
                        />
                        <Route
                            path="/study/:docId"
                            element={<StudentRoute><StudySession /></StudentRoute>}
                        />
                        <Route
                            path="/study-room/:roomId"
                            element={<StudentRoute><StudyRoom /></StudentRoute>}
                        />
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
                        <Route
                            path="/flashcards/:deckId"
                            element={<StudentRoute><Flashcard /></StudentRoute>}
                        />
                        <Route
                            path="/profile"
                            element={<StudentRoute><Profile /></StudentRoute>}
                        />
                        <Route
                            path="/analytics"
                            element={<Navigate to="/dashboard?tab=analytics" replace />}
                        />

                        {/* ✅ NEW: TEACHER PUBLIC PROFILE (Student View) */}
                        <Route
                            path="/teacher/:teacherId/public"
                            element={<StudentRoute><TeacherPublicProfile /></StudentRoute>}
                        />

                        {/* TEACHER ROUTES */}
                        <Route
                            path="/teacher/dashboard"
                            element={<TeacherRoute><TeacherDashboard /></TeacherRoute>}
                        />
                        <Route
                            path="/teacher/class/:classId"
                            element={<TeacherRoute><TeacherClassroom /></TeacherRoute>}
                        />

                        {/* ✅ NEW: Teacher Profile Tab Redirect */}
                        <Route
                            path="/teacher/profile"
                            element={<Navigate to="/teacher/dashboard?tab=profile" replace />}
                        />

                        {/* Teacher Dashboard Tab Redirects */}
                        <Route path="/teacher/classes" element={<Navigate to="/teacher/dashboard?tab=classes" replace />} />
                        <Route path="/teacher/classes/:classId" element={<Navigate to="/teacher/dashboard?tab=classes" replace />} />
                        <Route path="/teacher/assignments" element={<Navigate to="/teacher/dashboard?tab=assignments" replace />} />
                        <Route path="/teacher/quizzes" element={<Navigate to="/teacher/dashboard?tab=quizzes" replace />} />
                        <Route path="/teacher/students" element={<Navigate to="/teacher/dashboard?tab=students" replace />} />
                        <Route path="/teacher/analytics" element={<Navigate to="/teacher/dashboard?tab=analytics" replace />} />
                        <Route path="/teacher/settings" element={<Navigate to="/teacher/dashboard?tab=settings" replace />} />

                        {/* CATCH-ALL */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </Router>
            </ClassProvider>
        </AuthProvider>
    );
}

export default App;
