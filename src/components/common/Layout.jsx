import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { useState } from 'react';

const Layout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    return (
        <div className="min-h-screen relative overflow-hidden">
            {/* Animated background gradients */}
            <div className="fixed inset-0 -z-10">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse-slow"></div>
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse-slow delay-1000"></div>
            </div>

            {/* Navigation */}
            <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

            {/* Main Layout */}
            <div className="flex pt-16">
                {/* Sidebar */}
                <Sidebar isOpen={sidebarOpen} />

                {/* Main Content */}
                <motion.main
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-0'
                        }`}
                >
                    <div className="container mx-auto px-4 py-8 max-w-7xl">
                        <Outlet />
                    </div>
                </motion.main>
            </div>
        </div>
    );
};

export default Layout;