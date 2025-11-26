import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@contexts/AuthContext';

// Layout
import Layout from '@components/common/Layout';
import ProtectedRoute from '@components/common/ProtectedRoute';

// Pages
import LandingPage from '@pages/LandingPage';
import AuthPage from '@pages/auth/AuthPage';  // ✅ Single auth page
import Dashboard from '@pages/Dashboard';

function App() {
    return (
        <AuthProvider>
            <Router>
                <Toaster
                    position="top-right"
                    toastOptions={{
                        duration: 3000,
                        style: {
                            background: 'rgba(13, 15, 17, 0.95)',
                            color: '#f1f5f9',
                            border: '1px solid rgba(229, 231, 235, 0.1)',
                            backdropFilter: 'blur(12px)',
                        },
                        success: {
                            iconTheme: {
                                primary: '#10b981',
                                secondary: '#f1f5f9',
                            },
                        },
                        error: {
                            iconTheme: {
                                primary: '#ef4444',
                                secondary: '#f1f5f9',
                            },
                        },
                    }}
                />

                <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/auth" element={<AuthPage />} />
                    <Route path="/login" element={<AuthPage />} />
                    <Route path="/register" element={<AuthPage />} />

                    {/* Protected Student Routes */}
                    <Route
                        path="/dashboard"
                        element={
                            <ProtectedRoute>
                                <Layout />
                            </ProtectedRoute>
                        }
                    >
                        <Route index element={<Dashboard />} />
                        {/* TODO: Add more routes as pages are created */}
                    </Route>

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;
