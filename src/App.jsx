// src/App.jsx - COMPLETE WITH ROLE-BASED ROUTING
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from '@contexts/AuthContext';
import AuthPage from './pages/auth/AuthPage';
import Dashboard from './pages/Dashboard';
import LandingPage from './pages/LandingPage';
import Classes from './pages/Classes';
import ClassDetails from './pages/ClassDetails';
import TeacherDashboard from './pages/teacher/TeacherDashboard'; // ← NEW IMPORT
import ClassManagement from './pages/teacher/ClassManagement';

// ===== ENHANCED PROTECTED ROUTE WITH ROLE CHECK =====
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
    
    // Not logged in - redirect to auth
    if (!user) {
        console.log('❌ No user, redirecting to /auth');
        return <Navigate to="/auth" replace />;
    }

    // Teacher-only route protection
    if (teacherOnly && userData?.role !== 'teacher') {
        console.log('❌ Teacher-only route, but user is student');
        return <Navigate to="/dashboard" replace />;
    }

    // Redirect teachers from student dashboard to teacher dashboard
    if (!teacherOnly && userData?.role === 'teacher') {
        const currentPath = window.location.pathname;
        if (currentPath === '/dashboard' || currentPath.startsWith('/classes')) {
            console.log('🔀 Redirecting teacher to teacher dashboard');
            return <Navigate to="/teacher/dashboard" replace />;
        }
    }
    
    return children;
};

// ===== PUBLIC ROUTE WITH ROLE-BASED REDIRECT =====
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
    
    // Already logged in - redirect based on role
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
                    {/* ===== PUBLIC ROUTES ===== */}
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/auth" element={<PublicRoute><AuthPage /></PublicRoute>} />
                    
                    {/* ===== STUDENT ROUTES ===== */}
                    <Route 
                        path="/dashboard" 
                        element={
                            <ProtectedRoute>
                                <Dashboard />
                            </ProtectedRoute>
                        } 
                    />
                    <Route 
                        path="/classes" 
                        element={
                            <ProtectedRoute>
                                <Classes />
                            </ProtectedRoute>
                        } 
                    />
                    <Route 
                        path="/classes/:classId" 
                        element={
                            <ProtectedRoute>
                                <ClassDetails />
                            </ProtectedRoute>
                        } 
                    />
                    
                    {/* ===== TEACHER ROUTES (ROLE-PROTECTED) ===== */}
                    <Route 
                        path="/teacher/dashboard" 
                        element={
                            <ProtectedRoute teacherOnly>
                                <TeacherDashboard />
                            </ProtectedRoute>
                        } 
                    />
                    <Route 
                        path="/teacher/classes" 
                        element={
                            <ProtectedRoute teacherOnly>
                                <ClassManagement />
                            </ProtectedRoute>
                        } 
                    />
                    
                    {/* ===== PLACEHOLDER ROUTES ===== */}
                    <Route path="/upload" element={<ProtectedRoute><ComingSoon page="Upload PDF" /></ProtectedRoute>} />
                    <Route path="/documents" element={<ProtectedRoute><ComingSoon page="My Documents" /></ProtectedRoute>} />
                    <Route path="/quizzes" element={<ProtectedRoute><ComingSoon page="AI Quizzes" /></ProtectedRoute>} />
                    <Route path="/flashcards" element={<ProtectedRoute><ComingSoon page="Flashcards" /></ProtectedRoute>} />
                    <Route path="/study-rooms" element={<ProtectedRoute><ComingSoon page="Study Rooms" /></ProtectedRoute>} />
                    <Route path="/leaderboard" element={<ProtectedRoute><ComingSoon page="Leaderboard" /></ProtectedRoute>} />
                    <Route path="/analytics" element={<ProtectedRoute><ComingSoon page="Analytics" /></ProtectedRoute>} />
                    
                    {/* ===== CATCH ALL ===== */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Router>
        </AuthProvider>
    );
}

// Coming Soon Placeholder Component
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
