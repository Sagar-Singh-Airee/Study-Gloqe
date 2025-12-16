// src/components/gamification/BadgeCard.jsx - ✅ FIXED VERSION
import { motion } from 'framer-motion';
import { 
  Lock, 
  Sparkles, 
  Trophy, 
  Star, 
  Zap, 
  Target, 
  Crown, 
  Award,
  BookOpen,  // ✅ Added
  Users,     // ✅ Added
  Brain,     // ✅ Added more icons
  Timer,
  Flame,
  Layers
} from 'lucide-react';
import { useState } from 'react';

// ✅ FIXED: Complete icon map with all badge icons
const ICON_MAP = {
  Star: Star,
  Zap: Zap,
  Trophy: Trophy,
  Target: Target,
  Crown: Crown,
  Award: Award,
  BookOpen: BookOpen,
  Users: Users,
  UsersIcon: Users,  // Alias for compatibility
  Brain: Brain,
  Timer: Timer,
  Clock: Timer,
  Flame: Flame,
  Layers: Layers
};

// ✅ IMPROVED: Better, more vibrant colors
const RARITY_COLORS = {
  common: {
    gradient: 'from-slate-50 via-gray-50 to-slate-100',
    border: 'border-slate-300',
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-600',
    glow: 'shadow-slate-200'
  },
  rare: {
    gradient: 'from-blue-50 via-cyan-50 to-blue-100',
    border: 'border-blue-400',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    glow: 'shadow-blue-300'
  },
  epic: {
    gradient: 'from-purple-50 via-pink-50 to-purple-100',
    border: 'border-purple-400',
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    glow: 'shadow-purple-300'
  },
  legendary: {
    gradient: 'from-yellow-50 via-amber-50 to-yellow-100',
    border: 'border-yellow-500',
    iconBg: 'bg-yellow-100',
    iconColor: 'text-yellow-700',
    glow: 'shadow-yellow-300'
  }
};

// ✅ NEW: Category colors and labels
const CATEGORY_COLORS = {
  learning: 'bg-blue-100 text-blue-700',
  dedication: 'bg-green-100 text-green-700',
  consistency: 'bg-orange-100 text-orange-700',
  content: 'bg-cyan-100 text-cyan-700',
  collaboration: 'bg-pink-100 text-pink-700',
  assistance: 'bg-violet-100 text-violet-700',
  progression: 'bg-yellow-100 text-yellow-700'
};

const BadgeCard = ({ badge, unlocked = false, userStats = {}, onClick }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  const Icon = ICON_MAP[badge.iconName] || Trophy;
  const colors = RARITY_COLORS[badge.rarity] || RARITY_COLORS.common;
  const categoryColor = CATEGORY_COLORS[badge.category] || 'bg-gray-100 text-gray-700';

  // ✅ FIXED: Calculate progress based on badge requirements
  const calculateProgress = () => {
    if (unlocked) return 100;
    if (!badge.requirement || !userStats) return 0;

    const { type, value } = badge.requirement;
    const currentValue = userStats[type] || 0;

    return Math.min((currentValue / value) * 100, 100);
  };

  const progress = calculateProgress();
  const currentValue = userStats[badge.requirement?.type] || 0;
  const requiredValue = badge.requirement?.value || 0;

  // ✅ NEW: Get requirement text
  const getRequirementText = () => {
    if (!badge.requirement) return '';
    
    const { type, value } = badge.requirement;
    
    const labels = {
      quiz_count: 'quizzes',
      study_time: 'minutes',
      streak: 'day streak',
      documents: 'documents',
      rooms_joined: 'rooms',
      ai_chats: 'AI chats',
      level: 'level'
    };

    return `${value} ${labels[type] || type}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: unlocked ? 1.05 : 1.02, y: unlocked ? -4 : -2 }}
      className={`group relative rounded-2xl p-5 border-2 transition-all cursor-pointer ${
        unlocked
          ? `bg-gradient-to-br ${colors.gradient} ${colors.border} shadow-lg hover:shadow-xl ${colors.glow}`
          : 'bg-gray-50/50 border-gray-200 opacity-70 hover:opacity-80'
      }`}
      onClick={onClick}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* ✅ NEW: Category tag */}
      <div className="absolute top-2 left-2">
        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-md ${categoryColor}`}>
          {badge.category}
        </span>
      </div>

      {/* Lock Overlay for Locked Badges */}
      {!unlocked && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-[2px] rounded-2xl z-10"
        >
          <div className="text-center">
            <Lock size={36} className="text-gray-400 mx-auto mb-2" />
            <p className="text-xs font-semibold text-gray-500">
              {Math.round(progress)}% Complete
            </p>
          </div>
        </motion.div>
      )}

      {/* Badge Icon */}
      <div className={`relative w-20 h-20 mx-auto mb-4 mt-6 rounded-2xl flex items-center justify-center transition-all ${
        unlocked 
          ? `${colors.iconBg} ring-4 ring-white shadow-lg` 
          : 'bg-gray-100'
      }`}>
        <Icon 
          size={36} 
          className={unlocked ? colors.iconColor : 'text-gray-400'}
          strokeWidth={2.5}
        />
        
        {/* ✅ Unlocked checkmark */}
        {unlocked && (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="absolute -top-2 -right-2 w-7 h-7 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center border-3 border-white shadow-lg"
          >
            <Sparkles size={14} className="text-white" strokeWidth={3} />
          </motion.div>
        )}
      </div>

      {/* Badge Info */}
      <div className="text-center relative z-0">
        <h3 className={`text-base font-black mb-1 ${unlocked ? 'text-gray-900' : 'text-gray-500'}`}>
          {badge.name}
        </h3>
        <p className={`text-xs mb-3 line-clamp-2 min-h-[32px] ${unlocked ? 'text-gray-600' : 'text-gray-400'}`}>
          {badge.desc}
        </p>

        {/* ✅ NEW: Requirement display */}
        {!unlocked && badge.requirement && (
          <div className="mb-3 px-3 py-2 bg-gray-100 rounded-lg border border-gray-200">
            <p className="text-[10px] font-semibold text-gray-500 mb-1">
              Requirement
            </p>
            <p className="text-xs font-bold text-gray-700">
              {getRequirementText()}
            </p>
            {currentValue > 0 && (
              <p className="text-[10px] text-gray-500 mt-1">
                {currentValue} / {requiredValue}
              </p>
            )}
          </div>
        )}

        {/* Rarity & XP */}
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border-2 ${
            unlocked
              ? `${colors.iconColor} border-current bg-white/70`
              : 'text-gray-400 border-gray-300 bg-gray-100'
          }`}>
            {badge.rarity}
          </span>
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${
            unlocked ? 'bg-yellow-100 border border-yellow-300' : 'bg-gray-100 border border-gray-200'
          }`}>
            <Sparkles size={10} className={unlocked ? 'text-yellow-600' : 'text-gray-400'} />
            <span className={`text-[10px] font-black ${unlocked ? 'text-yellow-700' : 'text-gray-400'}`}>
              +{badge.xpReward} XP
            </span>
          </div>
        </div>

        {/* ✅ IMPROVED: Progress Bar */}
        {!unlocked && progress > 0 && (
          <div className="mt-3">
            <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden border border-gray-300">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 relative"
              >
                {/* Shimmer effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                />
              </motion.div>
            </div>
            <p className="text-[10px] text-gray-600 mt-1.5 font-bold">
              {Math.round(progress)}% Complete
            </p>
          </div>
        )}
      </div>

      {/* ✅ FIXED: Shine effect with group class */}
      {unlocked && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent rounded-2xl pointer-events-none"
          initial={{ x: '-100%' }}
          animate={{ x: '200%' }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            repeatDelay: 3,
            ease: 'easeInOut'
          }}
        />
      )}

      {/* ✅ NEW: Hover tooltip */}
      {showTooltip && onClick && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -bottom-12 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap z-20 shadow-xl"
        >
          Click for details
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
        </motion.div>
      )}
    </motion.div>
  );
};

export default BadgeCard;
