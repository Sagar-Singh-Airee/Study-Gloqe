// src/components/ui/AchievementToast.jsx - ✅ FIXED VERSION
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, X, Sparkles, Award, Crown, Star, Zap } from 'lucide-react';
import { useEffect } from 'react';

const AchievementToast = ({ notification, onClose }) => {
    // ✅ Auto-dismiss after 5 seconds
    useEffect(() => {
        if (!notification) return;

        const timer = setTimeout(() => {
            if (onClose) onClose();
        }, 5000);

        return () => clearTimeout(timer);
    }, [notification, onClose]);

    if (!notification) return null;

    const { type, data } = notification;

    // ✅ FIXED: Added default values and better type handling
    if (!data) {
        console.warn('⚠️ AchievementToast: No data provided');
        return null;
    }

    // Different configurations for different notification types
    const config = {
        achievement: {
            icon: Trophy,
            title: 'Achievement Unlocked!',
            gradient: 'from-yellow-500/20 to-orange-500/20',
            iconBg: 'from-yellow-600 to-orange-600',
            iconColor: 'text-white',
            borderColor: 'border-yellow-500/30'
        },
        badge: {
            icon: Award,
            title: 'Badge Unlocked!',
            gradient: 'from-blue-500/20 to-purple-500/20',
            iconBg: 'from-blue-600 to-purple-600',
            iconColor: 'text-white',
            borderColor: 'border-blue-500/30'
        },
        title: {
            icon: Crown,
            title: 'New Title Unlocked!',
            gradient: 'from-purple-500/20 to-pink-500/20',
            iconBg: 'from-purple-600 to-pink-600',
            iconColor: 'text-white',
            borderColor: 'border-purple-500/30'
        },
        // ✅ FIXED: Handle both 'levelUp' and 'levelup'
        levelUp: {
            icon: Star,
            title: 'Level Up!',
            gradient: 'from-yellow-500/20 to-yellow-400/20',
            iconBg: 'from-yellow-500 to-yellow-600',
            iconColor: 'text-white',
            borderColor: 'border-yellow-500/30'
        },
        levelup: {
            icon: Star,
            title: 'Level Up!',
            gradient: 'from-yellow-500/20 to-yellow-400/20',
            iconBg: 'from-yellow-500 to-yellow-600',
            iconColor: 'text-white',
            borderColor: 'border-yellow-500/30'
        },
        xp: {
            icon: Zap,
            title: 'XP Earned!',
            gradient: 'from-green-500/20 to-emerald-500/20',
            iconBg: 'from-green-600 to-emerald-600',
            iconColor: 'text-white',
            borderColor: 'border-green-500/30'
        }
    };

    const currentConfig = config[type] || config.achievement;
    const Icon = currentConfig.icon;

    // ✅ FIXED: Better display text with descriptions
    const getDisplayText = () => {
        switch (type) {
            case 'achievement':
                return {
                    title: data.title || data.name || 'Achievement',
                    description: data.description || data.desc || ''
                };
            case 'badge':
                return {
                    title: data.name || 'Badge',
                    description: data.desc || data.description || ''
                };
            case 'title':
                return {
                    title: data.text || data.title || 'Title',
                    description: data.description || `Unlocked at Level ${data.requiredLevel || 1}`
                };
            case 'levelUp':
            case 'levelup':
                return {
                    title: `Level ${data.newLevel || data.level || '?'}`,
                    description: data.oldLevel 
                        ? `Leveled up from ${data.oldLevel}!` 
                        : 'Congratulations!'
                };
            case 'xp':
                return {
                    title: `+${data.amount || data.xpAmount || 0} XP`,
                    description: data.reason || 'XP Earned'
                };
            default:
                return {
                    title: 'Progress Made!',
                    description: ''
                };
        }
    };

    // ✅ FIXED: Better XP display logic
    const getXPReward = () => {
        if (type === 'levelUp' || type === 'levelup' || type === 'xp') return null;
        return data.xpReward || data.xp || 0;
    };

    const displayContent = getDisplayText();
    const xpReward = getXPReward();

    return (
        <motion.div
            initial={{ x: 400, opacity: 0, scale: 0.9 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: 400, opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-20 right-4 z-[9999] w-96 max-w-[calc(100vw-2rem)]"
        >
            <motion.div
                className={`bg-gradient-to-br from-gray-900 via-gray-900 to-black border-2 ${currentConfig.borderColor} rounded-2xl p-5 shadow-2xl relative overflow-hidden backdrop-blur-xl`}
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1 }}
            >
                {/* Animated background gradient */}
                <motion.div
                    className={`absolute inset-0 bg-gradient-to-br ${currentConfig.gradient}`}
                    animate={{
                        opacity: [0.3, 0.6, 0.3]
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />

                {/* Sparkle animation overlay */}
                <motion.div
                    className="absolute inset-0 pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 1.5 }}
                >
                    {[...Array(8)].map((_, i) => (
                        <motion.div
                            key={i}
                            className="absolute w-1 h-1 bg-white rounded-full"
                            style={{
                                top: `${Math.random() * 100}%`,
                                left: `${Math.random() * 100}%`
                            }}
                            animate={{
                                scale: [0, 1.5, 0],
                                opacity: [0, 1, 0]
                            }}
                            transition={{
                                duration: 1,
                                delay: i * 0.1,
                                repeat: Infinity,
                                repeatDelay: 1
                            }}
                        />
                    ))}
                </motion.div>

                <div className="flex items-start gap-4 relative z-10">
                    {/* Icon */}
                    <motion.div
                        className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${currentConfig.iconBg} flex items-center justify-center flex-shrink-0 shadow-xl`}
                        initial={{ rotate: -180, scale: 0 }}
                        animate={{ rotate: 0, scale: 1 }}
                        transition={{ type: 'spring', damping: 15, stiffness: 200 }}
                    >
                        <Icon className={currentConfig.iconColor} size={28} strokeWidth={2.5} />
                    </motion.div>

                    <div className="flex-1 min-w-0">
                        <motion.h4
                            className="text-white font-black text-base mb-1"
                            initial={{ y: -10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                        >
                            {currentConfig.title}
                        </motion.h4>
                        
                        <motion.p
                            className="text-white/90 font-bold text-sm mb-1"
                            initial={{ y: -10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.25 }}
                        >
                            {displayContent.title}
                        </motion.p>

                        {displayContent.description && (
                            <motion.p
                                className="text-gray-400 text-xs mb-2 line-clamp-2"
                                initial={{ y: -10, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.3 }}
                            >
                                {displayContent.description}
                            </motion.p>
                        )}

                        {xpReward > 0 && (
                            <motion.div
                                className="flex items-center gap-2 mt-2"
                                initial={{ scale: 0, x: -20 }}
                                animate={{ scale: 1, x: 0 }}
                                transition={{ delay: 0.4, type: 'spring', stiffness: 300 }}
                            >
                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-lg">
                                    <Sparkles size={14} className="text-yellow-400" />
                                    <span className="text-yellow-400 font-black text-sm">
                                        +{xpReward} XP
                                    </span>
                                </div>
                            </motion.div>
                        )}
                    </div>

                    {/* Close button */}
                    <motion.button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0 group"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                    >
                        <X size={18} className="text-gray-400 group-hover:text-white transition-colors" />
                    </motion.button>
                </div>

                {/* Progress bar for auto-dismiss */}
                <motion.div
                    className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white to-transparent"
                    initial={{ scaleX: 1 }}
                    animate={{ scaleX: 0 }}
                    transition={{ duration: 5, ease: "linear" }}
                />
            </motion.div>
        </motion.div>
    );
};

export default AchievementToast;
