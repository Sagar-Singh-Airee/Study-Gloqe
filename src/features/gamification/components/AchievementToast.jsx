// ACHIEVEMENT NOTIFICATION TOAST - Enhanced for Multiple Types
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, X, Sparkles, Award, Crown, Star } from 'lucide-react';

const AchievementToast = ({ notification, onClose }) => {
    if (!notification) return null;

    const { type, data } = notification;

    // Different configurations for different notification types
    const config = {
        achievement: {
            icon: Trophy,
            title: 'Achievement Unlocked!',
            gradient: 'from-yellow-500/20 to-orange-500/20',
            iconBg: 'from-yellow-600 to-orange-600',
            iconColor: 'text-white'
        },
        badge: {
            icon: Award,
            title: 'Badge Unlocked!',
            gradient: 'from-blue-500/20 to-purple-500/20',
            iconBg: 'from-blue-600 to-purple-600',
            iconColor: 'text-white'
        },
        title: {
            icon: Crown,
            title: 'New Title Unlocked!',
            gradient: 'from-purple-500/20 to-pink-500/20',
            iconBg: 'from-purple-600 to-pink-600',
            iconColor: 'text-white'
        },
        levelup: {
            icon: Star,
            title: 'Level Up!',
            gradient: 'from-white/20 to-gray-400/20',
            iconBg: 'from-white to-gray-400',
            iconColor: 'text-black'
        }
    };

    const currentConfig = config[type] || config.achievement;
    const Icon = currentConfig.icon;

    // Get display text and XP based on notification type
    const getDisplayText = () => {
        switch (type) {
            case 'achievement':
                return data.title || data.name;
            case 'badge':
                return data.name;
            case 'title':
                return data.text;
            case 'levelup':
                return `Level ${data.level}`;
            default:
                return 'Progress Made!';
        }
    };

    const getXPReward = () => {
        if (type === 'levelup') return null;
        return data.xpReward || data.xp || 0;
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ x: 400, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 400, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed top-20 right-4 z-50 w-80"
            >
                <motion.div
                    className={`bg-gradient-to-br from-gray-900 to-black border border-white/20 rounded-xl p-4 shadow-2xl relative overflow-hidden`}
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1 }}
                >
                    {/* Animated background gradient */}
                    <motion.div
                        className={`absolute inset-0 bg-gradient-to-br ${currentConfig.gradient} opacity-50`}
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
                        className="absolute inset-0"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ duration: 1.5 }}
                    >
                        {[...Array(5)].map((_, i) => (
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

                    <div className="flex items-start gap-3 relative z-10">
                        {/* Icon */}
                        <motion.div
                            className={`w-12 h-12 rounded-full bg-gradient-to-br ${currentConfig.iconBg} flex items-center justify-center flex-shrink-0 shadow-lg`}
                            initial={{ rotate: -180, scale: 0 }}
                            animate={{ rotate: 0, scale: 1 }}
                            transition={{ type: 'spring', damping: 15 }}
                        >
                            <Icon className={currentConfig.iconColor} size={24} />
                        </motion.div>

                        <div className="flex-1">
                            <motion.h4
                                className="text-white font-bold text-sm mb-1"
                                initial={{ y: -10, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                            >
                                {currentConfig.title}
                            </motion.h4>
                            <motion.p
                                className="text-gray-300 text-xs mb-2"
                                initial={{ y: -10, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.3 }}
                            >
                                {getDisplayText()}
                            </motion.p>

                            {getXPReward() > 0 && (
                                <motion.div
                                    className="flex items-center gap-2 text-white text-xs font-bold"
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.4, type: 'spring' }}
                                >
                                    <Sparkles size={14} className="text-yellow-400" />
                                    <span className="text-yellow-400">+{getXPReward()} XP</span>
                                </motion.div>
                            )}
                        </div>

                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-white/10 rounded transition-colors flex-shrink-0"
                        >
                            <X size={16} className="text-gray-400" />
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default AchievementToast;
