// src/components/study/StudyTimer.jsx
import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

const StudyTimer = ({ startTime }) => {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            if (startTime) {
                setElapsed(Math.floor((Date.now() - startTime) / 1000));
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [startTime]);

    const formatTime = (seconds) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hrs > 0) {
            return `${hrs}h ${mins}m ${secs}s`;
        }
        return `${mins}m ${secs}s`;
    };

    return (
        <div className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
            <Clock size={20} className="text-blue-600 animate-pulse" />
            <div>
                <div className="text-xs font-medium text-gray-600">Study Time</div>
                <div className="text-lg font-black text-black">{formatTime(elapsed)}</div>
            </div>
        </div>
    );
};

export default StudyTimer;
