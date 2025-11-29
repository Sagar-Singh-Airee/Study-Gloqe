import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Trophy, Award, Gift, Crown, Star, Zap, BookOpen, Target, Lock 
} from 'lucide-react';

import { db } from '../../config/firebase'; 
import { useAuth } from '../../contexts/AuthContext'; 
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';

// --- UsersIcon Component (FIXED SVG) ---
function UsersIcon({ className }) {
    return (
        <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className={className}
        >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
            ircle cx="9" cy="7" r="4"/
            <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
    );
}

// --- ICONS MAPPING ---
const IconMap = {
    Zap: <Zap />,
    Star: <Star />,
    BookOpen: <BookOpen />,
    Target: <Target />,
    UsersIcon: <UsersIcon />,
    Crown: <Crown />,
    Trophy: <Trophy />
};

const AchievementsSection = () => {
    const { currentUser } = useAuth(); 
    const [activeTab, setActiveTab] = useState('badges');
    const [loading, setLoading] = useState(true);
    
    const [stats, setStats] = useState({
        level: 1, xp: 0, nextLevelXp: 100, globalRank: 0, totalBadges: 0, activeTitle: "Novice Learner"
    });
    const [badges, setBadges] = useState([]);
    const [gifts, setGifts] = useState([]);
    const [titles, setTitles] = useState([]);

    // --- REALTIME LISTENERS ---
    useEffect(() => {
        if (!currentUser?.uid) {
            setLoading(false);
            return;
        }

        setLoading(true);

        // 1. User Stats Listener
        const unsubStats = onSnapshot(doc(db, "users", currentUser.uid), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setStats({
                    level: data.level || 1,
                    xp: data.xp || 0,
                    nextLevelXp: data.nextLevelXp || 100,
                    globalRank: data.globalRank || '--',
                    totalBadges: data.badges?.length || 0,
                    activeTitle: data.activeTitle || "Novice Learner"
                });
            }
        });

        // 2. Badges Listener - OPTIMIZED to avoid nested snapshot
        let unsubBadges;
        const badgesUnsubscribe = onSnapshot(collection(db, "badges"), (snapshot) => {
            const allBadges = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            
            // Subscribe to user doc to get unlocked badges
            unsubBadges = onSnapshot(doc(db, "users", currentUser.uid), (userDoc) => {
                const userData = userDoc.data();
                const unlockedIds = userData?.unlockedBadges || [];

                const mergedBadges = allBadges.map(badge => ({
                    ...badge,
                    unlocked: unlockedIds.includes(badge.id)
                }));
                setBadges(mergedBadges);
            });
        });

        // 3. Gifts Listener
        const qGifts = query(collection(db, "teacher_gifts"), where("studentId", "==", currentUser.uid));
        const unsubGifts = onSnapshot(qGifts, (snapshot) => {
            setGifts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        // 4. Titles Listener
        const unsubTitles = onSnapshot(collection(db, "titles"), (snapshot) => {
            const allTitles = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setTitles(allTitles);
            setLoading(false);
        });

        return () => {
            unsubStats();
            badgesUnsubscribe();
            if (unsubBadges) unsubBadges();
            unsubGifts();
            unsubTitles();
        };
    }, [currentUser]);

    const progressPercent = Math.min((stats.xp / stats.nextLevelXp) * 100, 100);

    if (loading) {
        return (
            <div className="p-12 text-center">
                <div className="inline-block w-12 h-12 border-4 border-gray-200 border-t-black rounded-full animate-spin mb-4"></div>
                <p className="text-gray-500 font-medium">Syncing achievements...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 font-sans">
            {/* Header & Level Card */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-gray-900 via-black to-gray-800 rounded-3xl p-8 text-white shadow-2xl border border-white/10 relative overflow-hidden"
            >
                <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" 
                />
                
                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <span className="px-3 py-1 bg-gradient-to-r from-yellow-600 to-yellow-400 text-black border border-yellow-400/30 rounded-full text-xs font-bold tracking-wider uppercase shadow-[0_0_10px_rgba(250,204,21,0.4)]">
                                Level {stats.level}
                            </span>
                            <span className="text-gray-400 text-sm flex items-center gap-1">
                                <Trophy size={14} className="text-gray-500" /> 
                                Global Rank #{stats.globalRank}
                            </span>
                        </div>
                        <h1 className="text-4xl font-black mb-1 tracking-tight">My Journey</h1>
                        <p className="text-gray-400 flex items-center gap-2 text-sm">
                            Current Title: <span className="text-white font-semibold">{stats.activeTitle}</span>
                        </p>
                    </div>

                    <div className="w-full md:w-1/3 bg-white/5 p-4 rounded-2xl border border-white/5 backdrop-blur-sm">
                        <div className="flex justify-between text-sm font-bold mb-3">
                            <span className="text-gray-300">{stats.xp} XP</span>
                            <span className="text-gray-600">/ {stats.nextLevelXp} XP</span>
                        </div>
                        <div className="h-3 bg-gray-800 rounded-full overflow-hidden border border-white/5">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${progressPercent}%` }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                                className="h-full bg-gradient-to-r from-blue-400 via-purple-400 to-white relative"
                            >
                                <div className="absolute inset-0 bg-white/30 animate-pulse" />
                            </motion.div>
                        </div>
                        <p className="text-xs text-right mt-3 text-gray-500 font-medium">
                            {stats.nextLevelXp - stats.xp} XP until Level {stats.level + 1}
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-gray-200 pb-1 overflow-x-auto scrollbar-hide">
                {['badges', 'gifts', 'titles'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-3 font-bold text-sm transition-all rounded-xl relative z-0 flex items-center gap-2 ${
                            activeTab === tab 
                            ? 'text-black bg-gray-100' 
                            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        {tab === 'badges' && <Award size={16} />}
                        {tab === 'gifts' && <Gift size={16} />}
                        {tab === 'titles' && <Crown size={16} />}
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        
                        {activeTab === tab && (
                            <motion.div 
                                layoutId="activeTabIndicator"
                                className="absolute inset-0 border-2 border-black rounded-xl z-[-1]"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="min-h-[400px] relative">
                <AnimatePresence mode="wait">
                    
                    {/* BADGES TAB */}
                    {activeTab === 'badges' && (
                        <motion.div 
                            key="badges"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                        >
                            {badges.length > 0 ? badges.map((badge, idx) => (
                                <motion.div
                                    key={badge.id}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className={`p-6 rounded-2xl border transition-all group relative overflow-hidden ${
                                        badge.unlocked 
                                        ? 'bg-white border-gray-200 shadow-sm hover:shadow-xl hover:-translate-y-1' 
                                        : 'bg-gray-50 border-dashed border-gray-200 opacity-60 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-500'
                                    }`}
                                >
                                    {badge.unlocked && <div className={`absolute inset-0 bg-gradient-to-br ${badge.color || 'from-yellow-100/50'} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />}
                                    
                                    <div className="flex flex-col items-center text-center relative z-10">
                                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 shadow-inner ${
                                            badge.unlocked ? 'bg-black text-white' : 'bg-gray-200 text-gray-400'
                                        }`}>
                                            {badge.unlocked 
                                                ? (IconMap[badge.iconName] || <Star />) 
                                                : <Lock size={20} />
                                            }
                                        </div>
                                        <h3 className="font-bold text-md mb-1">{badge.name}</h3>
                                        <p className="text-xs text-gray-500 leading-relaxed">{badge.desc}</p>
                                    </div>
                                </motion.div>
                            )) : (
                                <div className="col-span-full text-center py-12 text-gray-400">
                                    <Award size={48} className="mx-auto mb-4 opacity-50" />
                                    <p>No badges available yet</p>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* TEACHER GIFTS TAB */}
                    {activeTab === 'gifts' && (
                        <motion.div 
                            key="gifts"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="grid md:grid-cols-2 gap-6"
                        >
                            {gifts.length > 0 ? gifts.map((gift, idx) => (
                                <motion.div
                                    key={gift.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="bg-black text-white p-6 rounded-3xl relative overflow-hidden group border border-gray-800"
                                >
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full blur-[60px] opacity-20 group-hover:opacity-40 transition-all duration-700" />
                                    
                                    <div className="relative z-10 flex items-start gap-5">
                                        <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10">
                                            <Gift size={28} className="text-purple-300" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded text-white uppercase tracking-wider">
                                                    From {gift.teacher}
                                                </span>
                                                <span className="text-[10px] text-gray-500">{gift.date}</span>
                                            </div>
                                            <h3 className="text-xl font-bold mb-2">{gift.type}</h3>
                                            <p className="text-gray-300 text-sm leading-relaxed border-l-2 border-purple-500/50 pl-3 italic">
                                                "{gift.note}"
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            )) : (
                                <div className="col-span-2 border-2 border-dashed border-gray-200 rounded-3xl p-12 flex flex-col items-center justify-center text-center">
                                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                        <Gift size={24} className="text-gray-300" />
                                    </div>
                                    <p className="text-gray-500 font-medium">No gifts received yet.</p>
                                    <p className="text-xs text-gray-400 mt-1">Impress your teachers to fill this space!</p>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* TITLES TAB */}
                    {activeTab === 'titles' && (
                        <motion.div 
                            key="titles"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="space-y-3"
                        >
                            {titles.length > 0 ? titles.map((title, idx) => {
                                const isUnlocked = stats.level >= (title.requiredLevel || 1);
                                const isEquipped = stats.activeTitle === title.text;

                                return (
                                    <motion.div
                                        key={title.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                                            isUnlocked 
                                            ? 'bg-white border-gray-200 shadow-sm hover:border-black/20' 
                                            : 'bg-gray-50 border-gray-100 opacity-70'
                                        } ${isEquipped ? 'ring-2 ring-black ring-offset-2' : ''}`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                                isUnlocked ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-400'
                                            }`}>
                                                {isUnlocked ? <Award size={20} /> : <Lock size={18} />}
                                            </div>
                                            <div>
                                                <h3 className={`font-bold text-sm ${!isUnlocked && 'text-gray-400'}`}>
                                                    {title.text}
                                                </h3>
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    {isUnlocked 
                                                        ? (isEquipped ? 'Currently equipped' : 'Available') 
                                                        : `Unlocks at Level ${title.requiredLevel || 1}`}
                                                </p>
                                            </div>
                                        </div>

                                        {isUnlocked && !isEquipped && (
                                            <button className="px-4 py-2 bg-gray-100 hover:bg-black hover:text-white text-xs font-bold rounded-lg transition-colors">
                                                Equip
                                            </button>
                                        )}
                                        {isEquipped && (
                                            <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full flex items-center gap-1">
                                                ✓ Active
                                            </span>
                                        )}
                                    </motion.div>
                                );
                            }) : (
                                <div className="text-center py-12 text-gray-400">
                                    <Crown size={48} className="mx-auto mb-4 opacity-50" />
                                    <p>No titles available yet</p>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default AchievementsSection;
