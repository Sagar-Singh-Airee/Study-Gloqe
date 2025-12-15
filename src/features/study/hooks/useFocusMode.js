// src/hooks/useFocusMode.js - Focus Mode with Keyboard Shortcuts
import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';

const useFocusMode = (options = {}) => {
    const {
        minSessionMinutes = 5, // Minimum minutes before exit allowed
        onEnterFocus,
        onExitFocus,
        onBreak
    } = options;

    const [isFocusMode, setIsFocusMode] = useState(false);
    const [focusDuration, setFocusDuration] = useState(0); // seconds
    const [canExit, setCanExit] = useState(true);
    const [isLocked, setIsLocked] = useState(false);
    const [shortcutsEnabled, setShortcutsEnabled] = useState(true);

    const startTimeRef = useRef(null);
    const intervalRef = useRef(null);

    // Keyboard shortcuts
    const SHORTCUTS = {
        'ctrl+shift+f': 'toggleFocusMode',
        'ctrl+shift+b': 'takeBreak',
        'ctrl+shift+l': 'toggleLock',
        'escape': 'attemptExit'
    };

    // Start focus mode
    const enterFocusMode = useCallback((lockSession = false) => {
        setIsFocusMode(true);
        setIsLocked(lockSession);
        setCanExit(!lockSession);
        startTimeRef.current = Date.now();

        // Start duration counter
        intervalRef.current = setInterval(() => {
            setFocusDuration(prev => prev + 1);
        }, 1000);

        // Lock exit for minimum session time
        if (lockSession) {
            setCanExit(false);
            setTimeout(() => {
                setCanExit(true);
            }, minSessionMinutes * 60 * 1000);
        }

        onEnterFocus?.();

        toast.success('Focus Mode activated! 🎯', {
            icon: '🧠',
            style: { background: '#000', color: '#fff' }
        });

        // Request fullscreen for distraction-free experience
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(() => { });
        }
    }, [minSessionMinutes, onEnterFocus]);

    // Exit focus mode
    const exitFocusMode = useCallback((force = false) => {
        if (!canExit && !force) {
            const remainingTime = Math.ceil((minSessionMinutes * 60) - focusDuration);
            if (remainingTime > 0) {
                toast.error(`Session locked! ${Math.ceil(remainingTime / 60)} min remaining`, {
                    icon: '🔒'
                });
                return false;
            }
        }

        setIsFocusMode(false);
        setIsLocked(false);
        setFocusDuration(0);

        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }

        onExitFocus?.();

        // Exit fullscreen
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => { });
        }

        toast.success(`Focus session: ${Math.floor(focusDuration / 60)} min`, {
            icon: '✅'
        });

        return true;
    }, [canExit, focusDuration, minSessionMinutes, onExitFocus]);

    // Take a break (pause focus mode)
    const takeBreak = useCallback((durationMinutes = 5) => {
        if (!isFocusMode) return;

        onBreak?.(durationMinutes);

        toast.success(`Taking a ${durationMinutes} min break!`, {
            icon: '☕',
            duration: 3000
        });

        // Could pause the timer here if needed
    }, [isFocusMode, onBreak]);

    // Toggle lock
    const toggleLock = useCallback(() => {
        if (!isFocusMode) return;

        if (isLocked) {
            if (focusDuration >= minSessionMinutes * 60) {
                setIsLocked(false);
                setCanExit(true);
                toast.success('Session unlocked!', { icon: '🔓' });
            } else {
                toast.error('Complete minimum session first!', { icon: '🔒' });
            }
        } else {
            setIsLocked(true);
            setCanExit(false);
            toast.success('Session locked - no distractions!', { icon: '🔒' });
        }
    }, [isFocusMode, isLocked, focusDuration, minSessionMinutes]);

    // Handle keyboard shortcuts
    useEffect(() => {
        if (!shortcutsEnabled) return;

        const handleKeyDown = (e) => {
            const key = [];
            if (e.ctrlKey) key.push('ctrl');
            if (e.shiftKey) key.push('shift');
            if (e.altKey) key.push('alt');
            key.push(e.key.toLowerCase());

            const combo = key.join('+');
            const action = SHORTCUTS[combo];

            if (action) {
                e.preventDefault();

                switch (action) {
                    case 'toggleFocusMode':
                        if (isFocusMode) {
                            exitFocusMode();
                        } else {
                            enterFocusMode();
                        }
                        break;
                    case 'takeBreak':
                        takeBreak();
                        break;
                    case 'toggleLock':
                        toggleLock();
                        break;
                    case 'attemptExit':
                        if (isFocusMode) {
                            exitFocusMode();
                        }
                        break;
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [shortcutsEnabled, isFocusMode, enterFocusMode, exitFocusMode, takeBreak, toggleLock]);

    // Warn before leaving page during focus
    useEffect(() => {
        if (!isFocusMode) return;

        const handleBeforeUnload = (e) => {
            if (!canExit) {
                e.preventDefault();
                e.returnValue = 'You have an active focus session. Are you sure you want to leave?';
                return e.returnValue;
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isFocusMode, canExit]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, []);

    return {
        // State
        isFocusMode,
        focusDuration,
        isLocked,
        canExit,
        shortcutsEnabled,

        // Formatted duration
        formattedDuration: `${Math.floor(focusDuration / 60)}:${(focusDuration % 60).toString().padStart(2, '0')}`,

        // Actions
        enterFocusMode,
        exitFocusMode,
        takeBreak,
        toggleLock,
        setShortcutsEnabled,

        // Shortcuts info
        shortcuts: SHORTCUTS
    };
};

export default useFocusMode;
