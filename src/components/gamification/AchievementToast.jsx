// ACHIEVEMENT NOTIFICATION TOAST
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, X, Sparkles } from 'lucide-react';

const AchievementToast = ({ achievement, onClose }) => {
    if (!achievement) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ x: 400, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 400, opacity: 0 }}
                className="fixed top-20 right-4 z-50 w-80"
            >
                <div className="bg-gradient-to-br from-gray-900 to-black border border-white/20 rounded-xl p-4 shadow-2xl">
                    <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-white to-gray-400 flex items-center justify-center flex-shrink-0">
                            <Trophy className="text-black" size={24} />
                        </div>
                        
                        <div className="flex-1">
                            <h4 className="text-white font-bold text-sm mb-1">
                                Achievement Unlocked!
                            </h4>
                            <p className="text-gray-300 text-xs mb-2">
                                {achievement.title}
                            </p>
                            <div className="flex items-center gap-2 text-white text-xs">
                                <Sparkles size={14} />
                                <span>+{achievement.xp} XP</span>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-white/10 rounded transition-colors"
                        >
                            <X size={16} className="text-gray-400" />
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default AchievementToast;
