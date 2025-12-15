import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { useState } from 'react';

const Layout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false); // Changed to false for mobile-first

    return (
        <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-gray-900 via-black to-gray-900">
            {/* Animated background gradients */}
            <div className="fixed inset-0 -z-10">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>

            {/* Navigation */}
            <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

            {/* Main Layout */}
            <div className="flex pt-16">
                {/* Sidebar */}
                <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

                {/* Main Content */}
                <motion.main
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="flex-1 transition-all duration-300 w-full"
                >
                    <div className="container mx-auto px-4 py-8 max-w-7xl">
                        <Outlet />
                    </div>
                </motion.main>
            </div>

            {/* Sidebar overlay for mobile */}
            {sidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-30 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}
        </div>
    );
};

export default Layout;