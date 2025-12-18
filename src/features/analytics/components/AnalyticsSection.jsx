import React from 'react';
import SubjectAnalytics from './SubjectAnalytics';
import { motion } from 'framer-motion';

const AnalyticsSection = () => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-6 space-y-8 pb-32"
        >
            <div className="mb-8">
                <h1 className="text-4xl font-black text-gray-900 mb-2">Analytics Dashboard</h1>
                <p className="text-gray-600 text-lg">Track your learning progress and mastery across all subjects.</p>
            </div>

            <SubjectAnalytics />
        </motion.div>
    );
};

export default AnalyticsSection;
