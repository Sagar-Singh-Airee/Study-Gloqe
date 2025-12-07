// src/components/gamification/BadgeCard.jsx - Badge Display Component
import { motion } from 'framer-motion';
import { Lock, Sparkles, Trophy, Star, Zap, Target, Crown, Award } from 'lucide-react';

const ICON_MAP = {
  Star: Star,
  Zap: Zap,
  Trophy: Trophy,
  Target: Target,
  Crown: Crown,
  Award: Award,
  BookOpen: Trophy,
  UsersIcon: Star,
};

const RARITY_COLORS = {
  common: 'from-gray-100 to-gray-200 border-gray-300',
  rare: 'from-blue-100 to-blue-200 border-blue-300',
  epic: 'from-purple-100 to-purple-200 border-purple-300',
  legendary: 'from-yellow-100 to-yellow-200 border-yellow-300',
};

const RARITY_TEXT = {
  common: 'text-gray-700',
  rare: 'text-blue-700',
  epic: 'text-purple-700',
  legendary: 'text-yellow-700',
};

const BadgeCard = ({ badge, unlocked = false, progress = 0, onClick }) => {
  const Icon = ICON_MAP[badge.iconName] || Trophy;
  const rarityColor = RARITY_COLORS[badge.rarity] || RARITY_COLORS.common;
  const rarityText = RARITY_TEXT[badge.rarity] || RARITY_TEXT.common;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: unlocked ? 1.05 : 1.02 }}
      className={`relative rounded-2xl p-5 border-2 transition-all cursor-pointer ${
        unlocked
          ? `bg-gradient-to-br ${rarityColor} shadow-lg hover:shadow-xl`
          : 'bg-gray-50 border-gray-200 opacity-60'
      }`}
      onClick={onClick}
    >
      {/* Lock Overlay for Locked Badges */}
      {!unlocked && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm rounded-2xl">
          <Lock size={40} className="text-gray-400" />
        </div>
      )}

      {/* Badge Icon */}
      <div className={`relative w-16 h-16 mx-auto mb-4 rounded-xl flex items-center justify-center ${
        unlocked ? 'bg-white/50' : 'bg-gray-200'
      }`}>
        <Icon size={32} className={unlocked ? rarityText : 'text-gray-400'} />
        
        {unlocked && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-white"
          >
            <Sparkles size={12} className="text-white" />
          </motion.div>
        )}
      </div>

      {/* Badge Info */}
      <div className="text-center">
        <h3 className={`text-lg font-bold mb-1 ${unlocked ? 'text-gray-900' : 'text-gray-500'}`}>
          {badge.name}
        </h3>
        <p className={`text-xs mb-2 ${unlocked ? 'text-gray-700' : 'text-gray-400'}`}>
          {badge.desc}
        </p>

        {/* Rarity Badge */}
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-lg ${
            unlocked
              ? `${rarityText} bg-white/50`
              : 'text-gray-400 bg-gray-200'
          }`}>
            {badge.rarity}
          </span>
          <span className={`text-[10px] font-bold ${unlocked ? 'text-gray-700' : 'text-gray-400'}`}>
            +{badge.xpReward} XP
          </span>
        </div>

        {/* Progress Bar for Unlockable Badges */}
        {!unlocked && progress > 0 && (
          <div className="mt-3">
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-gradient-to-r from-gray-600 to-gray-700"
              />
            </div>
            <p className="text-[10px] text-gray-500 mt-1 font-semibold">
              {Math.round(progress)}% Complete
            </p>
          </div>
        )}
      </div>

      {/* Shine Effect */}
      {unlocked && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 rounded-2xl" />
      )}
    </motion.div>
  );
};

export default BadgeCard;
