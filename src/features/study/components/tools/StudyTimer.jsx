// src/features/study/components/tools/StudyTimer.jsx
import { Clock, Play, Pause } from 'lucide-react';
import { motion } from 'framer-motion';

const StudyTimer = ({ elapsedTime, isPaused, onTogglePause }) => {

    const formatTime = (seconds) => {
        if (!seconds && seconds !== 0) return "--:--";
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hrs > 0) {
            return `${hrs}h ${mins}m ${secs}s`;
        }
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className={`flex items-center gap-3 px-4 py-2 rounded-xl border transition-all duration-300 ${isPaused
                ? 'bg-yellow-50 border-yellow-200 shadow-sm'
                : 'bg-white border-blue-100 shadow-md'
            }`}>
            <div className={`p-1.5 rounded-lg ${isPaused ? 'bg-yellow-100' : 'bg-blue-50'}`}>
                <Clock
                    size={18}
                    className={`${isPaused ? 'text-yellow-600' : 'text-blue-600 animate-pulse'}`}
                />
            </div>

            <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    {isPaused ? 'Paused' : 'Focus Time'}
                </span>
                <span className={`text-xl font-black font-mono leading-none ${isPaused ? 'text-gray-500' : 'text-gray-900'
                    }`}>
                    {formatTime(elapsedTime)}
                </span>
            </div>

            {onTogglePause && (
                <div className="w-px h-8 bg-gray-200 mx-1"></div>
            )}

            {onTogglePause && (
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onTogglePause}
                    className={`p-2 rounded-lg transition-colors ${isPaused
                            ? 'bg-green-50 text-green-600 hover:bg-green-100'
                            : 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'
                        }`}
                    title={isPaused ? "Resume Session" : "Pause Session"}
                >
                    {isPaused ? <Play size={18} fill="currentColor" /> : <Pause size={18} fill="currentColor" />}
                </motion.button>
            )}
        </div>
    );
};

export default StudyTimer;
