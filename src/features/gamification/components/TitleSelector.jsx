// src/components/gamification/TitleSelector.jsx - ✅ FIXED VERSION
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Crown, Check, Lock, X, Sparkles, Search, 
  Filter, CheckCircle, AlertCircle, Loader
} from 'lucide-react';
import toast from 'react-hot-toast';

// ✅ Better rarity colors with consistent styling
const RARITY_CONFIG = {
  common: {
    gradient: 'from-slate-50 via-gray-50 to-slate-100',
    border: 'border-slate-300',
    text: 'text-slate-700',
    iconBg: 'bg-slate-200',
    badge: 'bg-slate-100 text-slate-700'
  },
  rare: {
    gradient: 'from-blue-50 via-cyan-50 to-blue-100',
    border: 'border-blue-400',
    text: 'text-blue-700',
    iconBg: 'bg-blue-200',
    badge: 'bg-blue-100 text-blue-700'
  },
  epic: {
    gradient: 'from-purple-50 via-pink-50 to-purple-100',
    border: 'border-purple-400',
    text: 'text-purple-700',
    iconBg: 'bg-purple-200',
    badge: 'bg-purple-100 text-purple-700'
  },
  legendary: {
    gradient: 'from-yellow-50 via-amber-50 to-yellow-100',
    border: 'border-yellow-500',
    text: 'text-yellow-700',
    iconBg: 'bg-yellow-200',
    badge: 'bg-yellow-100 text-yellow-700'
  }
};

const TitleSelector = ({ 
  titles = [], 
  equippedTitleId = null, 
  userLevel = 1, 
  onEquip, 
  onClose,
  autoCloseOnEquip = true 
}) => {
  const [equipping, setEquipping] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'unlocked' | 'locked'

  // ✅ Sort and filter titles
  const processedTitles = useMemo(() => {
    let filtered = [...titles];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(title => 
        title.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        title.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply unlock filter
    if (filter === 'unlocked') {
      filtered = filtered.filter(title => userLevel >= title.requiredLevel);
    } else if (filter === 'locked') {
      filtered = filtered.filter(title => userLevel < title.requiredLevel);
    }

    // Sort: unlocked first, then by level, then by rarity
    const rarityOrder = { common: 0, rare: 1, epic: 2, legendary: 3 };
    
    return filtered.sort((a, b) => {
      const aUnlocked = userLevel >= a.requiredLevel;
      const bUnlocked = userLevel >= b.requiredLevel;

      if (aUnlocked !== bUnlocked) return bUnlocked ? 1 : -1;
      if (a.requiredLevel !== b.requiredLevel) return a.requiredLevel - b.requiredLevel;
      return rarityOrder[a.rarity] - rarityOrder[b.rarity];
    });
  }, [titles, userLevel, searchQuery, filter]);

  const handleEquip = async (titleId) => {
    if (titleId === equippedTitleId || equipping) return;

    setEquipping(true);
    try {
      await onEquip(titleId);
      
      toast.success('Title equipped!', {
        icon: '👑',
        duration: 3000,
        style: {
          background: '#1a1a1a',
          color: '#fff',
          fontWeight: 'bold',
          borderRadius: '12px',
        },
      });

      // ✅ Auto-close after equipping
      if (autoCloseOnEquip) {
        setTimeout(() => onClose(), 1000);
      }
    } catch (error) {
      toast.error('Failed to equip title');
      console.error('Equip error:', error);
    } finally {
      setEquipping(false);
    }
  };

  // ✅ Stats
  const unlockedCount = titles.filter(t => userLevel >= t.requiredLevel).length;
  const totalCount = titles.length;

  // ✅ Empty state
  if (titles.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-3xl p-8 max-w-md w-full text-center"
        >
          <Crown size={48} className="text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-black text-gray-900 mb-2">No Titles Available</h2>
          <p className="text-sm text-gray-600 mb-6">Titles will unlock as you level up!</p>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-colors"
          >
            Close
          </button>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          transition={{ type: 'spring', damping: 25 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-3xl p-8 max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <motion.div
                className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-2xl flex items-center justify-center shadow-lg"
                animate={{ rotate: [0, -5, 5, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                <Crown size={28} className="text-white" strokeWidth={2.5} />
              </motion.div>
              <div>
                <h2 className="text-2xl font-black text-gray-900">Select Title</h2>
                <p className="text-sm text-gray-600">
                  {unlockedCount} of {totalCount} unlocked
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-xl transition-all"
              disabled={equipping}
            >
              <X size={24} className="text-gray-600" />
            </button>
          </div>

          {/* ✅ Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            {/* Search */}
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search titles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold transition-all ${
                  filter === 'all'
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Filter size={16} />
                All
              </button>
              <button
                onClick={() => setFilter('unlocked')}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold transition-all ${
                  filter === 'unlocked'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <CheckCircle size={16} />
                Unlocked
              </button>
              <button
                onClick={() => setFilter('locked')}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold transition-all ${
                  filter === 'locked'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Lock size={16} />
                Locked
              </button>
            </div>
          </div>

          {/* ✅ Titles Grid - Scrollable */}
          <div className="flex-1 overflow-y-auto pr-2 -mr-2">
            {processedTitles.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle size={48} className="text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600 font-semibold">No titles match your search</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {processedTitles.map((title) => {
                  const unlocked = userLevel >= title.requiredLevel;
                  const isEquipped = title.id === equippedTitleId;
                  const config = RARITY_CONFIG[title.rarity] || RARITY_CONFIG.common;

                  return (
                    <motion.button
                      key={title.id}
                      layout
                      whileHover={{ scale: unlocked ? 1.02 : 1, y: unlocked ? -4 : 0 }}
                      whileTap={{ scale: unlocked ? 0.98 : 1 }}
                      onClick={() => unlocked && handleEquip(title.id)}
                      disabled={!unlocked || equipping}
                      className={`group relative rounded-2xl p-5 border-2 transition-all text-left ${
                        unlocked
                          ? `bg-gradient-to-br ${config.gradient} ${config.border} hover:shadow-xl ${
                              isEquipped ? 'ring-4 ring-black/20 shadow-lg' : ''
                            }`
                          : 'bg-gray-50/50 border-gray-200 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      {/* Lock Icon */}
                      {!unlocked && (
                        <div className="absolute top-4 right-4">
                          <Lock size={20} className="text-gray-400" />
                        </div>
                      )}

                      {/* Equipped Badge */}
                      {isEquipped && (
                        <motion.div
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: 'spring' }}
                          className="absolute top-4 right-4 w-9 h-9 bg-gradient-to-br from-black to-gray-800 rounded-full flex items-center justify-center shadow-lg border-2 border-white"
                        >
                          <Check size={18} className="text-white" strokeWidth={3} />
                        </motion.div>
                      )}

                      {/* Equipping Spinner */}
                      {equipping && title.id === equippedTitleId && (
                        <div className="absolute top-4 right-4">
                          <Loader size={20} className="text-gray-600 animate-spin" />
                        </div>
                      )}

                      {/* Title Info */}
                      <div className="flex items-start gap-3 mb-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          unlocked ? config.iconBg : 'bg-gray-200'
                        }`}>
                          <Crown size={24} className={unlocked ? config.text : 'text-gray-400'} strokeWidth={2.5} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className={`text-lg font-black mb-1 truncate ${
                            unlocked ? 'text-gray-900' : 'text-gray-500'
                          }`}>
                            {title.text}
                          </h3>
                          <p className={`text-xs line-clamp-2 ${
                            unlocked ? 'text-gray-700' : 'text-gray-400'
                          }`}>
                            {title.description}
                          </p>
                        </div>
                      </div>

                      {/* ✅ Preview how title looks */}
                      {unlocked && !isEquipped && (
                        <div className="mb-3 p-2 bg-white/60 rounded-lg border border-gray-200">
                          <p className="text-[10px] text-gray-500 font-semibold mb-1">Preview:</p>
                          <p className={`text-sm font-bold ${config.text} truncate`}>
                            {title.text}
                          </p>
                        </div>
                      )}

                      {/* Requirements & Rarity */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold px-3 py-1 rounded-lg ${
                            unlocked
                              ? 'bg-white/70 text-gray-700 border border-gray-200'
                              : 'bg-gray-200 text-gray-500'
                          }`}>
                            Level {title.requiredLevel}
                          </span>
                          {!unlocked && (
                            <span className="text-xs text-red-600 font-semibold">
                              ({title.requiredLevel - userLevel} more)
                            </span>
                          )}
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-wide px-2 py-1 rounded-lg ${
                          unlocked ? config.badge : 'bg-gray-200 text-gray-400'
                        }`}>
                          {title.rarity}
                        </span>
                      </div>

                      {/* ✅ FIXED: Shine Effect with proper group class */}
                      {unlocked && (
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-2xl pointer-events-none"
                          initial={{ x: '-100%' }}
                          animate={{ x: '200%' }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            repeatDelay: 3,
                            ease: 'linear'
                          }}
                        />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ✅ Info Banner */}
          <div className="mt-6 p-4 bg-gradient-to-r from-gray-900 via-black to-gray-900 rounded-2xl border-2 border-gray-800">
            <div className="flex items-center gap-3 text-white">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              >
                <Sparkles size={20} />
              </motion.div>
              <p className="text-sm font-medium">
                Unlock titles by leveling up! Your level:{' '}
                <span className="font-black text-yellow-400">{userLevel}</span>
                {' · '}
                Next unlock:{' '}
                <span className="font-black text-blue-400">
                  Level {titles.find(t => t.requiredLevel > userLevel)?.requiredLevel || 'Max'}
                </span>
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default TitleSelector;
