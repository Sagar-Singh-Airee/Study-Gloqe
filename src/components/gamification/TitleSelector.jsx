// src/components/gamification/TitleSelector.jsx - Title Selection & Equipment
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Check, Lock, X, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

const RARITY_COLORS = {
  common: 'from-gray-100 to-gray-200 border-gray-300 text-gray-700',
  rare: 'from-blue-100 to-blue-200 border-blue-300 text-blue-700',
  epic: 'from-purple-100 to-purple-200 border-purple-300 text-purple-700',
  legendary: 'from-yellow-100 to-yellow-200 border-yellow-300 text-yellow-700',
};

const TitleSelector = ({ titles, equippedTitleId, userLevel, onEquip, onClose }) => {
  const [selectedTitle, setSelectedTitle] = useState(equippedTitleId);
  const [equipping, setEquipping] = useState(false);

  const handleEquip = async (titleId) => {
    if (titleId === equippedTitleId) return;

    setEquipping(true);
    try {
      await onEquip(titleId);
      setSelectedTitle(titleId);
      toast.success('Title equipped!', {
        icon: '👑',
        style: {
          background: '#1a1a1a',
          color: '#fff',
          fontWeight: 'bold',
          borderRadius: '12px',
        },
      });
    } catch (error) {
      toast.error('Failed to equip title');
      console.error('Equip error:', error);
    } finally {
      setEquipping(false);
    }
  };

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
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl p-8 max-w-3xl w-full max-h-[80vh] overflow-y-auto shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-2xl flex items-center justify-center">
              <Crown size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900">Select Title</h2>
              <p className="text-sm text-gray-600">Choose your display title</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-all"
          >
            <X size={24} className="text-gray-600" />
          </button>
        </div>

        {/* Titles Grid */}
        <div className="grid md:grid-cols-2 gap-4">
          {titles.map((title) => {
            const unlocked = userLevel >= title.requiredLevel;
            const isEquipped = title.id === equippedTitleId;
            const isSelected = title.id === selectedTitle;
            const rarityColor = RARITY_COLORS[title.rarity] || RARITY_COLORS.common;

            return (
              <motion.button
                key={title.id}
                whileHover={{ scale: unlocked ? 1.02 : 1 }}
                whileTap={{ scale: unlocked ? 0.98 : 1 }}
                onClick={() => unlocked && handleEquip(title.id)}
                disabled={!unlocked || equipping}
                className={`relative rounded-2xl p-5 border-2 transition-all text-left ${
                  unlocked
                    ? `bg-gradient-to-br ${rarityColor} hover:shadow-lg ${
                        isEquipped ? 'ring-2 ring-black' : ''
                      }`
                    : 'bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed'
                }`}
              >
                {/* Lock Icon */}
                {!unlocked && (
                  <div className="absolute top-3 right-3">
                    <Lock size={20} className="text-gray-400" />
                  </div>
                )}

                {/* Equipped Badge */}
                {isEquipped && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-3 right-3 w-8 h-8 bg-black rounded-full flex items-center justify-center"
                  >
                    <Check size={16} className="text-white" />
                  </motion.div>
                )}

                {/* Title Info */}
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    unlocked ? 'bg-white/50' : 'bg-gray-200'
                  }`}>
                    <Crown size={20} className={unlocked ? 'text-gray-700' : 'text-gray-400'} />
                  </div>
                  <div className="flex-1">
                    <h3 className={`text-lg font-bold mb-1 ${
                      unlocked ? 'text-gray-900' : 'text-gray-500'
                    }`}>
                      {title.text}
                    </h3>
                    <p className={`text-xs ${unlocked ? 'text-gray-700' : 'text-gray-400'}`}>
                      {title.description}
                    </p>
                  </div>
                </div>

                {/* Requirements */}
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                    unlocked
                      ? 'bg-white/50 text-gray-700'
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    Level {title.requiredLevel}
                  </span>
                  <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-lg ${
                    unlocked
                      ? 'bg-white/50 text-gray-700'
                      : 'bg-gray-200 text-gray-400'
                  }`}>
                    {title.rarity}
                  </span>
                </div>

                {/* Shine Effect */}
                {unlocked && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 rounded-2xl pointer-events-none" />
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Info Banner */}
        <div className="mt-6 p-4 bg-gradient-to-r from-gray-900 to-black rounded-2xl">
          <div className="flex items-center gap-3 text-white">
            <Sparkles size={20} />
            <p className="text-sm font-medium">
              Unlock titles by leveling up! Your level: <span className="font-bold">{userLevel}</span>
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default TitleSelector;
