// src/components/gamification/LevelProgress.jsx - XP Progress Bar
import { motion } from 'framer-motion';
import { TrendingUp, Zap, Award } from 'lucide-react';

const LevelProgress = ({ 
  level, 
  currentXP, 
  nextLevelXP, 
  levelProgress, 
  className = '',
  showStats = true 
}) => {
  const xpToNextLevel = nextLevelXP - currentXP;

  return (
    <div className={`bg-white rounded-2xl border-2 border-gray-200 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl flex items-center justify-center">
            <Award size={24} className="text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-gray-900">Level {level}</h3>
            <p className="text-sm text-gray-600">Keep going!</p>
          </div>
        </div>

        {showStats && (
          <div className="text-right">
            <p className="text-2xl font-black text-gray-900">{currentXP.toLocaleString()}</p>
            <p className="text-xs text-gray-500 font-semibold">Total XP</p>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-gray-700">
            Progress to Level {level + 1}
          </span>
          <span className="text-sm font-bold text-gray-900">
            {Math.round(levelProgress)}%
          </span>
        </div>
        
        <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${levelProgress}%` }}
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

      {/* Stats Cards */}
      {showStats && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={16} className="text-green-600" />
              <p className="text-xs text-green-600 font-bold uppercase">Next Level</p>
            </div>
            <p className="text-xl font-black text-green-900">
              {xpToNextLevel.toLocaleString()} XP
            </p>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <Zap size={16} className="text-yellow-600" />
              <p className="text-xs text-yellow-600 font-bold uppercase">Target</p>
            </div>
            <p className="text-xl font-black text-yellow-900">
              Level {level + 1}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LevelProgress;
