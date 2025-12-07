// src/components/gamification/XPNotification.jsx - Floating XP Gain Toast
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Trophy, Award, Crown, Star } from 'lucide-react';

const XPNotification = ({ notification, onDismiss }) => {
  if (!notification) return null;

  const getIcon = () => {
    switch (notification.type) {
      case 'badge':
        return Trophy;
      case 'title':
        return Crown;
      case 'achievement':
        return Award;
      case 'levelUp':
        return Star;
      default:
        return Zap;
    }
  };

  const Icon = getIcon();

  return (
    <AnimatePresence>
      {notification && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.8 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50"
        >
          <motion.div
            animate={{
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 0.5,
              repeat: 2,
            }}
            className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white rounded-2xl px-6 py-4 shadow-2xl border-2 border-white/10 backdrop-blur-xl"
          >
            <div className="flex items-center gap-4">
              {/* Icon */}
              <motion.div
                animate={{
                  rotate: [0, 360],
                }}
                transition={{
                  duration: 0.6,
                  ease: 'easeInOut',
                }}
                className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center"
              >
                <Icon size={24} className="text-white" />
              </motion.div>

              {/* Content */}
              <div>
                {notification.type === 'levelUp' && (
                  <>
                    <h3 className="text-lg font-black mb-1">
                      🎉 Level Up!
                    </h3>
                    <p className="text-sm text-gray-300">
                      You reached Level {notification.data.newLevel}
                    </p>
                  </>
                )}

                {notification.type === 'badge' && (
                  <>
                    <h3 className="text-lg font-black mb-1">
                      🏆 Badge Unlocked!
                    </h3>
                    <p className="text-sm text-gray-300">
                      {notification.data.name}
                    </p>
                  </>
                )}

                {notification.type === 'title' && (
                  <>
                    <h3 className="text-lg font-black mb-1">
                      👑 New Title!
                    </h3>
                    <p className="text-sm text-gray-300">
                      {notification.data.text}
                    </p>
                  </>
                )}

                {notification.type === 'achievement' && (
                  <>
                    <h3 className="text-lg font-black mb-1">
                      ⭐ Achievement!
                    </h3>
                    <p className="text-sm text-gray-300">
                      {notification.data.title}
                    </p>
                  </>
                )}

                {notification.type === 'xp' && (
                  <>
                    <h3 className="text-lg font-black mb-1">
                      ⚡ +{notification.data.amount} XP
                    </h3>
                    <p className="text-sm text-gray-300">
                      {notification.data.reason}
                    </p>
                  </>
                )}
              </div>

              {/* Sparkles Effect */}
              <motion.div
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0.8, 1.2, 0.8],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                }}
                className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 via-transparent to-yellow-400/20 rounded-2xl pointer-events-none"
              />
            </div>
          </motion.div>

          {/* Close button */}
          <button
            onClick={onDismiss}
            className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center text-gray-900 text-xs font-bold hover:bg-gray-100 transition-all"
          >
            ×
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default XPNotification;
