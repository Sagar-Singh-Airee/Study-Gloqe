// src/components/gamification/LevelProgress.jsx - ✅ FIXED VERSION
import { motion } from 'framer-motion';
import { TrendingUp, Zap, Award, Flame, Crown, Trophy, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { TITLE_DEFINITIONS, BADGE_DEFINITIONS } from '@gamification/services/gamificationService';

const LevelProgress = ({ 
  level = 1,
  currentXP = 0,
  nextLevelXP = 100,
  levelProgress = 0,
  streak = 0,
  className = '',
  showStats = true,
  compact = false,
  loading = false,
  onClick = null,
  equippedTitle = 'Novice Learner'
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // ✅ Prevent negative XP and overflow
  const safeXPToNextLevel = Math.max(0, nextLevelXP - currentXP);
  const safeLevelProgress = Math.min(Math.max(levelProgress, 0), 100);

  // ✅ Get next level rewards
  const getNextRewards = () => {
    const nextLevel = level + 1;
    
    const nextTitle = Object.values(TITLE_DEFINITIONS)
      .find(t => t.requiredLevel === nextLevel);

    const nextBadge = Object.values(BADGE_DEFINITIONS)
      .find(b => b.requirement.type === 'level' && b.requirement.value === nextLevel);

    return { nextTitle, nextBadge };
  };

  const { nextTitle, nextBadge } = getNextRewards();

  // ✅ Loading state
  if (loading) {
    return (
      <div className={`bg-white rounded-2xl border-2 border-gray-200 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
            <div className="flex-1">
              <div className="h-6 bg-gray-200 rounded w-24 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-32"></div>
            </div>
          </div>
          <div className="h-4 bg-gray-200 rounded-full mb-4"></div>
          {showStats && (
            <div className="grid grid-cols-2 gap-3">
              <div className="h-16 bg-gray-200 rounded-xl"></div>
              <div className="h-16 bg-gray-200 rounded-xl"></div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ✅ Compact variant
  if (compact) {
    return (
      <motion.div
        className={`bg-gradient-to-br from-white to-gray-50 rounded-xl border-2 border-gray-200 p-4 cursor-pointer hover:border-gray-300 transition-all ${className}`}
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-sm">{level}</span>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-semibold">Level {level}</p>
              <p className="text-sm font-black text-gray-900 truncate max-w-[120px]">
                {equippedTitle}
              </p>
            </div>
          </div>
          {streak > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-orange-100 to-red-100 border border-orange-300 rounded-lg">
              <Flame size={12} className="text-orange-600" />
              <span className="text-xs font-black text-orange-900">{streak}</span>
            </div>
          )}
        </div>

        <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden border border-gray-300 mb-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${safeLevelProgress}%` }}
            className="h-full bg-gradient-to-r from-gray-700 to-gray-900"
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600 font-semibold">
            {safeXPToNextLevel.toLocaleString()} XP to Lv{level + 1}
          </span>
          {onClick && <ChevronRight size={14} className="text-gray-400" />}
        </div>
      </motion.div>
    );
  }

  // ✅ Full variant
  return (
    <motion.div
      className={`bg-white rounded-2xl border-2 border-gray-200 p-6 transition-all ${
        onClick ? 'cursor-pointer hover:border-gray-300 hover:shadow-lg' : ''
      } ${className}`}
      whileHover={onClick ? { y: -4, scale: 1.01 } : {}}
      whileTap={onClick ? { scale: 0.99 } : {}}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <motion.div
            className="w-14 h-14 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl flex items-center justify-center shadow-lg border-2 border-gray-200"
            animate={isHovered ? { rotate: [0, -5, 5, 0] } : {}}
            transition={{ duration: 0.5 }}
          >
            <Award size={28} className="text-white" strokeWidth={2.5} />
          </motion.div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-2xl font-black text-gray-900">Level {level}</h3>
              {streak > 0 && (
                <motion.div
                  className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-orange-100 to-red-100 border border-orange-300 rounded-lg"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Flame size={14} className="text-orange-600" />
                  <span className="text-xs font-black text-orange-900">{streak}</span>
                </motion.div>
              )}
            </div>
            <p className="text-sm text-gray-600 font-semibold">{equippedTitle}</p>
          </div>
        </div>

        {showStats && (
          <div className="text-right">
            <p className="text-2xl font-black text-gray-900">
              {currentXP.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">
              Total XP
            </p>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-gray-700">
            Progress to Level {level + 1}
          </span>
          <span className="text-sm font-black text-gray-900">
            {Math.round(safeLevelProgress)}%
          </span>
        </div>
        
        <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden border-2 border-gray-300 shadow-inner">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${safeLevelProgress}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-gray-700 via-gray-800 to-gray-900 relative"
          >
            {/* Shine effect */}
            <motion.div
              animate={{
                x: ['-100%', '200%']
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'linear'
              }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            />

            {/* Pulse effect on edges */}
            <motion.div
              className="absolute right-0 top-0 bottom-0 w-1 bg-white/50"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </motion.div>
        </div>

        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-500 font-semibold">
            {currentXP.toLocaleString()} XP
          </span>
          <span className="text-xs text-gray-500 font-semibold">
            {nextLevelXP.toLocaleString()} XP
          </span>
        </div>
      </div>

      {/* ✅ Next Rewards Section */}
      {(nextTitle || nextBadge) && (
        <div className="mb-5 p-3 bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-xl">
          <p className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1">
            <Trophy size={12} className="text-blue-600" />
            Next Level Unlocks:
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            {nextTitle && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-white/80 rounded-lg border border-purple-200">
                <Crown size={12} className="text-purple-600" />
                <span className="text-xs font-black text-purple-900">
                  {nextTitle.text}
                </span>
              </div>
            )}
            {nextBadge && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-white/80 rounded-lg border border-blue-200">
                <Trophy size={12} className="text-blue-600" />
                <span className="text-xs font-black text-blue-900">
                  {nextBadge.name}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {showStats && (
        <div className="grid grid-cols-2 gap-3">
          <motion.div
            className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4 shadow-sm"
            whileHover={{ scale: 1.05, y: -2 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp size={16} className="text-green-600" strokeWidth={2.5} />
              </div>
              <p className="text-xs text-green-700 font-bold uppercase tracking-wide">
                Remaining
              </p>
            </div>
            <p className="text-xl font-black text-green-900">
              {safeXPToNextLevel.toLocaleString()}
            </p>
            <p className="text-[10px] text-green-700 font-semibold mt-0.5">
              XP to next level
            </p>
          </motion.div>

          <motion.div
            className="bg-gradient-to-br from-yellow-50 to-amber-50 border-2 border-yellow-200 rounded-xl p-4 shadow-sm"
            whileHover={{ scale: 1.05, y: -2 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Zap size={16} className="text-yellow-600" strokeWidth={2.5} />
              </div>
              <p className="text-xs text-yellow-700 font-bold uppercase tracking-wide">
                Target
              </p>
            </div>
            <p className="text-xl font-black text-yellow-900">
              Level {level + 1}
            </p>
            <p className="text-[10px] text-yellow-700 font-semibold mt-0.5">
              Next milestone
            </p>
          </motion.div>
        </div>
      )}

      {/* ✅ Click hint */}
      {onClick && isHovered && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-2 bg-gray-100 rounded-lg border border-gray-200 text-center"
        >
          <p className="text-xs text-gray-600 font-semibold flex items-center justify-center gap-1">
            Click to view details
            <ChevronRight size={14} />
          </p>
        </motion.div>
      )}
    </motion.div>
  );
};

export default LevelProgress;
