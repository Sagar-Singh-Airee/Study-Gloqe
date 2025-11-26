import { Navigate } from 'react-router-dom';
import { useAuth } from '@contexts/AuthContext';

const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-black">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="mt-4 text-gray-300">Loading...</p>
                </div>
            </div>
        );
    }

    return user ? children : <Navigate to="/auth" replace />;
};

export default ProtectedRoute;
