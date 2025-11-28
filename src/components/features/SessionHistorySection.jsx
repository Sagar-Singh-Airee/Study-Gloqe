import React from 'react';
import { Clock } from 'lucide-react';

const SessionHistorySection = () => {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-black rounded-xl">
                    <Clock className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-black">Study Session History</h2>
                    <p className="text-gray-500">Track your past learning sessions</p>
                </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-12 text-center">
                <Clock size={48} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-bold text-black mb-2">No History Yet</h3>
                <p className="text-gray-500">Your completed study sessions will appear here.</p>
            </div>
        </div>
    );
};

export default SessionHistorySection;
