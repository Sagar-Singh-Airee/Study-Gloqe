import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from '@contexts/AuthContext';
import AuthPage from './pages/auth/AuthPage';
import Dashboard from './pages/Dashboard';

const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();
    
    console.log('🛡️ ProtectedRoute:', { hasUser: !!user, loading });
    
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-black text-white">
                <div>Loading...</div>
            </div>
        );
    }
    
    return user ? children : <Navigate to="/auth" replace />;
};

const PublicRoute = ({ children }) => {
    const { user, loading } = useAuth();
    
    console.log('🌐 PublicRoute:', { hasUser: !!user, loading });
    
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-black text-white">
                <div>Loading...</div>
            </div>
        );
    }
    
    return !user ? children : <Navigate to="/dashboard" replace />;
};

function App() {
    return (
        <AuthProvider>
            <Router>
                <Toaster position="top-right" />

                <Routes>
                    <Route path="/" element={<Navigate to="/auth" replace />} />
                    <Route path="/auth" element={<PublicRoute><AuthPage /></PublicRoute>} />
                    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                    <Route path="*" element={<Navigate to="/auth" replace />} />
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;
