// src/components/study/PomodoroTimer.jsx - Smart Pomodoro with XP Multiplier
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Play, Pause, RotateCcw, Coffee, Brain, Volume2, VolumeX,
    Settings, Zap, Timer, CheckCircle2, Music, Waves, ChevronUp, ChevronDown
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { awardXP } from '@/services/gamificationService';
import toast from 'react-hot-toast';

// Pomodoro presets
const PRESETS = {
    classic: { work: 25, shortBreak: 5, longBreak: 15, label: 'Classic (25/5)' },
    extended: { work: 50, shortBreak: 10, longBreak: 20, label: 'Extended (50/10)' },
    quick: { work: 15, shortBreak: 3, longBreak: 10, label: 'Quick (15/3)' },
    custom: { work: 25, shortBreak: 5, longBreak: 15, label: 'Custom' }
};

// Ambient sounds (using free sound URLs)
const AMBIENT_SOUNDS = [
    { id: 'none', name: 'No Sound', icon: VolumeX },
    { id: 'rain', name: 'Rain', icon: Waves },
    { id: 'cafe', name: 'Café', icon: Coffee },
    { id: 'focus', name: 'Focus Music', icon: Music }
];

const PomodoroTimer = ({
    onSessionComplete,
    onXPMultiplier,
    isCollapsed = false,
    onToggleCollapse
}) => {
    const { user } = useAuth();
    const [preset, setPreset] = useState('classic');
    const [customMinutes, setCustomMinutes] = useState({ work: 25, shortBreak: 5, longBreak: 15 });
    const [mode, setMode] = useState('work'); // work, shortBreak, longBreak
    const [timeLeft, setTimeLeft] = useState(25 * 60); // seconds
    const [isRunning, setIsRunning] = useState(false);
    const [sessionsCompleted, setSessionsCompleted] = useState(0);
    const [totalFocusTime, setTotalFocusTime] = useState(0);
    const [ambientSound, setAmbientSound] = useState('none');
    const [showSettings, setShowSettings] = useState(false);
    const [xpMultiplier, setXpMultiplier] = useState(1);
    const [autoStart, setAutoStart] = useState(false);

    const audioRef = useRef(null);
    const intervalRef = useRef(null);
    const startTimeRef = useRef(null);

    // Get current timing based on preset
    const getCurrentTiming = useCallback(() => {
        if (preset === 'custom') return customMinutes;
        return PRESETS[preset];
    }, [preset, customMinutes]);

    // Format time as MM:SS
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Calculate XP multiplier based on focus streaks
    useEffect(() => {
        if (sessionsCompleted >= 4) {
            setXpMultiplier(2);
        } else if (sessionsCompleted >= 2) {
            setXpMultiplier(1.5);
        } else if (sessionsCompleted >= 1) {
            setXpMultiplier(1.25);
        } else {
            setXpMultiplier(1);
        }
        onXPMultiplier?.(xpMultiplier);
    }, [sessionsCompleted, xpMultiplier, onXPMultiplier]);

    // Timer logic
    useEffect(() => {
        if (isRunning && timeLeft > 0) {
            intervalRef.current = setInterval(() => {
                setTimeLeft(prev => prev - 1);
                if (mode === 'work') {
                    setTotalFocusTime(prev => prev + 1);
                }
            }, 1000);
        } else if (timeLeft === 0) {
            handleSessionEnd();
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isRunning, timeLeft, mode]);

    // Handle session end
    const handleSessionEnd = async () => {
        setIsRunning(false);

        if (mode === 'work') {
            const newSessionsCompleted = sessionsCompleted + 1;
            setSessionsCompleted(newSessionsCompleted);

            // Award XP for completing a focus session
            if (user?.uid) {
                const baseXP = 50;
                const bonusXP = Math.round(baseXP * xpMultiplier);
                try {
                    await awardXP(user.uid, bonusXP, 'Pomodoro focus session completed');
                    toast.success(`Focus session complete! +${bonusXP} XP 🍅`, {
                        icon: '🎉',
                        duration: 4000,
                        style: { background: '#000', color: '#fff' }
                    });
                } catch (error) {
                    console.error('Failed to award XP:', error);
                }
            }

            onSessionComplete?.();

            // Determine next break type
            if (newSessionsCompleted % 4 === 0) {
                setMode('longBreak');
                setTimeLeft(getCurrentTiming().longBreak * 60);
                toast('Time for a long break! 🌟', { icon: '☕' });
            } else {
                setMode('shortBreak');
                setTimeLeft(getCurrentTiming().shortBreak * 60);
                toast('Short break time! 💪', { icon: '⏸️' });
            }
        } else {
            // Break ended
            setMode('work');
            setTimeLeft(getCurrentTiming().work * 60);
            toast('Break\'s over! Ready to focus? 🧠', { icon: '🚀' });
        }

        // Auto-start next session if enabled
        if (autoStart) {
            setTimeout(() => setIsRunning(true), 1000);
        }
    };

    // Start/Pause timer
    const toggleTimer = () => {
        if (!isRunning) {
            startTimeRef.current = Date.now();
        }
        setIsRunning(!isRunning);
    };

    // Reset timer
    const resetTimer = () => {
        setIsRunning(false);
        setTimeLeft(getCurrentTiming().work * 60);
        setMode('work');
    };

    // Skip to next phase
    const skipToNext = () => {
        if (mode === 'work') {
            if ((sessionsCompleted + 1) % 4 === 0) {
                setMode('longBreak');
                setTimeLeft(getCurrentTiming().longBreak * 60);
            } else {
                setMode('shortBreak');
                setTimeLeft(getCurrentTiming().shortBreak * 60);
            }
        } else {
            setMode('work');
            setTimeLeft(getCurrentTiming().work * 60);
        }
        setIsRunning(false);
    };

    // Change preset
    const handlePresetChange = (newPreset) => {
        setPreset(newPreset);
        setIsRunning(false);
        const timing = newPreset === 'custom' ? customMinutes : PRESETS[newPreset];
        setTimeLeft(timing.work * 60);
        setMode('work');
    };

    // Progress percentage
    const progress = (() => {
        const timing = getCurrentTiming();
        const totalSeconds = mode === 'work'
            ? timing.work * 60
            : mode === 'shortBreak'
                ? timing.shortBreak * 60
                : timing.longBreak * 60;
        return ((totalSeconds - timeLeft) / totalSeconds) * 100;
    })();

    // Mode colors
    const getModeColor = () => {
        switch (mode) {
            case 'work': return 'from-red-500 to-orange-500';
            case 'shortBreak': return 'from-green-500 to-emerald-500';
            case 'longBreak': return 'from-blue-500 to-cyan-500';
            default: return 'from-gray-500 to-gray-600';
        }
    };

    const getModeLabel = () => {
        switch (mode) {
            case 'work': return 'Focus Time';
            case 'shortBreak': return 'Short Break';
            case 'longBreak': return 'Long Break';
            default: return 'Focus';
        }
    };

    if (isCollapsed) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-black/90 backdrop-blur-xl rounded-xl p-3 border border-white/10 flex items-center gap-3"
            >
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${getModeColor()} flex items-center justify-center`}>
                    {mode === 'work' ? <Brain size={18} className="text-white" /> : <Coffee size={18} className="text-white" />}
                </div>
                <div className="flex-1">
                    <p className="text-white font-bold text-lg tabular-nums">{formatTime(timeLeft)}</p>
                    <p className="text-white/50 text-xs">{getModeLabel()}</p>
                </div>
                <button
                    onClick={toggleTimer}
                    className={`p-2 rounded-lg ${isRunning ? 'bg-yellow-500' : 'bg-green-500'}`}
                >
                    {isRunning ? <Pause size={16} className="text-white" /> : <Play size={16} className="text-white" />}
                </button>
                <button onClick={onToggleCollapse} className="p-2 hover:bg-white/10 rounded-lg">
                    <ChevronDown size={16} className="text-white/60" />
                </button>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-black/90 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden"
        >
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getModeColor()} flex items-center justify-center`}>
                        <Timer size={16} className="text-white" />
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-sm">Pomodoro Timer</h3>
                        <p className="text-white/50 text-xs">{getModeLabel()}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {xpMultiplier > 1 && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-yellow-500/20 rounded-full">
                            <Zap size={12} className="text-yellow-400" />
                            <span className="text-yellow-400 text-xs font-bold">{xpMultiplier}x XP</span>
                        </div>
                    )}
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className="p-1.5 hover:bg-white/10 rounded-lg transition-all"
                    >
                        <Settings size={14} className="text-white/60" />
                    </button>
                    {onToggleCollapse && (
                        <button onClick={onToggleCollapse} className="p-1.5 hover:bg-white/10 rounded-lg">
                            <ChevronUp size={14} className="text-white/60" />
                        </button>
                    )}
                </div>
            </div>

            {/* Timer Display */}
            <div className="p-6 text-center">
                {/* Circular Progress */}
                <div className="relative w-40 h-40 mx-auto mb-4">
                    <svg className="w-full h-full transform -rotate-90">
                        <circle
                            cx="80"
                            cy="80"
                            r="70"
                            fill="none"
                            stroke="rgba(255,255,255,0.1)"
                            strokeWidth="8"
                        />
                        <circle
                            cx="80"
                            cy="80"
                            r="70"
                            fill="none"
                            stroke="url(#gradient)"
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray={`${2 * Math.PI * 70}`}
                            strokeDashoffset={`${2 * Math.PI * 70 * (1 - progress / 100)}`}
                            className="transition-all duration-1000"
                        />
                        <defs>
                            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" className={mode === 'work' ? 'stop-red-500' : mode === 'shortBreak' ? 'stop-green-500' : 'stop-blue-500'} style={{ stopColor: mode === 'work' ? '#ef4444' : mode === 'shortBreak' ? '#22c55e' : '#3b82f6' }} />
                                <stop offset="100%" className={mode === 'work' ? 'stop-orange-500' : mode === 'shortBreak' ? 'stop-emerald-500' : 'stop-cyan-500'} style={{ stopColor: mode === 'work' ? '#f97316' : mode === 'shortBreak' ? '#10b981' : '#06b6d4' }} />
                            </linearGradient>
                        </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-4xl font-black text-white tabular-nums">{formatTime(timeLeft)}</span>
                        <span className="text-white/50 text-xs font-medium mt-1">{getModeLabel()}</span>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-3">
                    <button
                        onClick={resetTimer}
                        className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all"
                        title="Reset"
                    >
                        <RotateCcw size={18} className="text-white" />
                    </button>
                    <button
                        onClick={toggleTimer}
                        className={`p-4 rounded-xl font-bold transition-all ${isRunning
                                ? 'bg-yellow-500 hover:bg-yellow-600'
                                : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'
                            }`}
                    >
                        {isRunning ? <Pause size={24} className="text-white" /> : <Play size={24} className="text-white" />}
                    </button>
                    <button
                        onClick={skipToNext}
                        className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all"
                        title="Skip"
                    >
                        <CheckCircle2 size={18} className="text-white" />
                    </button>
                </div>
            </div>

            {/* Session Stats */}
            <div className="px-4 pb-4">
                <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white/5 rounded-lg p-3 text-center">
                        <p className="text-white/50 text-xs mb-1">Sessions</p>
                        <p className="text-white font-bold text-lg">{sessionsCompleted}</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3 text-center">
                        <p className="text-white/50 text-xs mb-1">Focus Time</p>
                        <p className="text-white font-bold text-lg">{Math.floor(totalFocusTime / 60)}m</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3 text-center">
                        <p className="text-white/50 text-xs mb-1">XP Bonus</p>
                        <p className="text-yellow-400 font-bold text-lg">{xpMultiplier}x</p>
                    </div>
                </div>
            </div>

            {/* Settings Panel */}
            <AnimatePresence>
                {showSettings && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="p-4 border-t border-white/10 space-y-4">
                            {/* Presets */}
                            <div>
                                <p className="text-white/50 text-xs mb-2 font-semibold">Timer Preset</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {Object.entries(PRESETS).map(([key, value]) => (
                                        <button
                                            key={key}
                                            onClick={() => handlePresetChange(key)}
                                            className={`p-2 rounded-lg text-xs font-bold transition-all ${preset === key
                                                    ? 'bg-white text-black'
                                                    : 'bg-white/10 text-white hover:bg-white/20'
                                                }`}
                                        >
                                            {value.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Auto-start toggle */}
                            <div className="flex items-center justify-between">
                                <span className="text-white/50 text-xs font-semibold">Auto-start next session</span>
                                <button
                                    onClick={() => setAutoStart(!autoStart)}
                                    className={`w-10 h-6 rounded-full transition-all ${autoStart ? 'bg-green-500' : 'bg-white/20'
                                        }`}
                                >
                                    <div className={`w-4 h-4 bg-white rounded-full transition-all ${autoStart ? 'translate-x-5' : 'translate-x-1'
                                        }`} />
                                </button>
                            </div>

                            {/* Ambient Sounds */}
                            <div>
                                <p className="text-white/50 text-xs mb-2 font-semibold">Ambient Sound</p>
                                <div className="flex gap-2">
                                    {AMBIENT_SOUNDS.map((sound) => (
                                        <button
                                            key={sound.id}
                                            onClick={() => setAmbientSound(sound.id)}
                                            className={`flex-1 p-2 rounded-lg flex flex-col items-center gap-1 transition-all ${ambientSound === sound.id
                                                    ? 'bg-white text-black'
                                                    : 'bg-white/10 text-white hover:bg-white/20'
                                                }`}
                                        >
                                            <sound.icon size={14} />
                                            <span className="text-[10px] font-bold">{sound.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default PomodoroTimer;
