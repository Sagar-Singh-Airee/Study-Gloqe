// src/pages/Flashcard.jsx - MODERN GLASSMORPHISM DESIGN
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ArrowLeft, RotateCw, Star, Award, TrendingUp, 
    Sparkles, Zap, CheckCircle2, Circle, Home, Eye,
    ChevronLeft, ChevronRight
} from 'lucide-react';
import { doc, getDoc, collection, query, orderBy, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@shared/config/firebase';
import { useAuth } from '@auth/contexts/AuthContext';
import toast from 'react-hot-toast';

const Flashcard = () => {
    const { deckId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    
    const [deck, setDeck] = useState(null);
    const [cards, setCards] = useState([]);
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [flipped, setFlipped] = useState(false);
    const [masteredCards, setMasteredCards] = useState(new Set());
    const [showResults, setShowResults] = useState(false);
    const [loading, setLoading] = useState(true);
    const [direction, setDirection] = useState(0);

    // Load deck and cards
    useEffect(() => {
        if (!deckId || !user?.uid) {
            setLoading(false);
            return;
        }

        const loadDeck = async () => {
            try {
                const deckRef = doc(db, 'flashcardDecks', deckId);
                const deckSnap = await getDoc(deckRef);
                
                if (!deckSnap.exists()) {
                    toast.error('Flashcard deck not found');
                    navigate('/dashboard?tab=flashcards');
                    return;
                }

                const deckData = { id: deckSnap.id, ...deckSnap.data() };
                
                if (deckData.userId !== user.uid) {
                    toast.error('Access denied');
                    navigate('/dashboard?tab=flashcards');
                    return;
                }

                setDeck(deckData);
            } catch (error) {
                console.error('Error loading deck:', error);
                toast.error('Failed to load deck');
                setLoading(false);
            }
        };

        const cardsRef = collection(db, `flashcardDecks/${deckId}/cards`);
        const q = query(cardsRef, orderBy('order', 'asc'));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const cardsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setCards(cardsData);
            
            const mastered = new Set();
            cardsData.forEach((card, idx) => {
                if (card.mastered) mastered.add(idx);
            });
            setMasteredCards(mastered);
            
            setLoading(false);
        }, (error) => {
            console.error('Error loading cards:', error);
            toast.error('Failed to load flashcards');
            setLoading(false);
        });

        loadDeck();
        return () => unsubscribe();
    }, [deckId, user, navigate]);

    const navigateCard = (newIndex) => {
        if (newIndex >= 0 && newIndex < cards.length) {
            setDirection(newIndex > currentCardIndex ? 1 : -1);
            setCurrentCardIndex(newIndex);
            setFlipped(false);
        } else if (newIndex >= cards.length) {
            setShowResults(true);
        }
    };

    const markMastered = async (mastered) => {
        try {
            const cardRef = doc(db, `flashcardDecks/${deckId}/cards`, cards[currentCardIndex].id);
            await updateDoc(cardRef, {
                mastered: mastered,
                lastReviewed: serverTimestamp()
            });

            setMasteredCards(prev => {
                const newSet = new Set(prev);
                if (mastered) {
                    newSet.add(currentCardIndex);
                } else {
                    newSet.delete(currentCardIndex);
                }
                return newSet;
            });

            toast.success(mastered ? '✓ Mastered!' : '○ Unmarked', { 
                duration: 1000,
                style: {
                    background: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    color: '#1a1a1a',
                    fontSize: '14px',
                    fontWeight: '600'
                }
            });
        } catch (error) {
            console.error('Error updating card:', error);
        }
    };

    const resetProgress = () => {
        setCurrentCardIndex(0);
        setFlipped(false);
        setShowResults(false);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-silver-50 to-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="w-20 h-20 relative mx-auto mb-6"
                    >
                        <div className="absolute inset-0 bg-gradient-to-tr from-gray-800 to-gray-600 rounded-2xl opacity-20" />
                        <Sparkles className="absolute inset-0 m-auto text-gray-800" size={32} />
                    </motion.div>
                    <p className="text-gray-600 font-semibold text-lg">Loading your flashcards...</p>
                </div>
            </div>
        );
    }

    if (!deck || cards.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-silver-50 to-gray-100 flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <div className="w-24 h-24 mx-auto mb-6 bg-white/60 backdrop-blur-xl rounded-full flex items-center justify-center border border-white/50 shadow-lg">
                        <Circle size={48} className="text-gray-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">No Flashcards Found</h3>
                    <p className="text-gray-600 mb-8">This deck appears to be empty.</p>
                    <button
                        onClick={() => navigate('/dashboard?tab=flashcards')}
                        className="px-8 py-4 bg-white/80 backdrop-blur-xl text-gray-900 rounded-2xl font-semibold hover:scale-105 transition-all shadow-lg border border-white/50 hover:border-white/70"
                    >
                        ← Back to Flashcards
                    </button>
                </div>
            </div>
        );
    }

    const currentCard = cards[currentCardIndex];
    const progress = ((currentCardIndex + 1) / cards.length) * 100;
    const masteryCount = masteredCards.size;
    const masteryPercent = Math.round((masteryCount / cards.length) * 100);

    // Results Screen
    if (showResults) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-silver-50 to-gray-100 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 50 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: 'spring', duration: 0.6 }}
                    className="max-w-2xl w-full"
                >
                    {/* Celebration Icon */}
                    <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                        className="w-32 h-32 mx-auto mb-8 bg-white/80 backdrop-blur-xl rounded-full flex items-center justify-center shadow-2xl border border-white/50"
                    >
                        <Award size={64} className="text-gray-800" />
                    </motion.div>

                    {/* Main Results Card */}
                    <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-10 shadow-2xl border border-white/50">
                        <h2 className="text-4xl font-bold text-gray-900 text-center mb-3">
                            Deck Complete! 🎉
                        </h2>
                        <p className="text-gray-600 text-center mb-8 text-lg">
                            You've reviewed all <span className="font-semibold text-gray-900">{cards.length}</span> cards in {deck.title}
                        </p>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-3 gap-4 mb-8">
                            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/50 shadow-lg">
                                <CheckCircle2 size={32} className="text-gray-800 mx-auto mb-2" />
                                <div className="text-3xl font-bold text-gray-900">{masteryCount}</div>
                                <div className="text-sm text-gray-600 font-semibold">Mastered</div>
                            </div>
                            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/50 shadow-lg">
                                <TrendingUp size={32} className="text-gray-800 mx-auto mb-2" />
                                <div className="text-3xl font-bold text-gray-900">{masteryPercent}%</div>
                                <div className="text-sm text-gray-600 font-semibold">Progress</div>
                            </div>
                            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/50 shadow-lg">
                                <Star size={32} className="text-gray-800 mx-auto mb-2" />
                                <div className="text-3xl font-bold text-gray-900">{cards.length}</div>
                                <div className="text-sm text-gray-600 font-semibold">Total Cards</div>
                            </div>
                        </div>

                        {/* Mastery Progress Bar */}
                        <div className="mb-8">
                            <div className="flex justify-between text-sm font-semibold text-gray-600 mb-2">
                                <span>Mastery Progress</span>
                                <span>{masteryCount}/{cards.length}</span>
                            </div>
                            <div className="h-3 bg-white/80 backdrop-blur-sm rounded-full overflow-hidden border border-white/50">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${masteryPercent}%` }}
                                    transition={{ duration: 1, delay: 0.5 }}
                                    className="h-full bg-gradient-to-r from-gray-800 via-gray-700 to-gray-600"
                                />
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-4">
                            <button
                                onClick={resetProgress}
                                className="flex-1 py-4 bg-white/80 backdrop-blur-xl text-gray-900 rounded-2xl font-semibold hover:scale-105 transition-all flex items-center justify-center gap-2 shadow-lg border border-white/50 hover:border-white/70"
                            >
                                <RotateCw size={20} />
                                Study Again
                            </button>
                            <button
                                onClick={() => navigate('/dashboard?tab=flashcards')}
                                className="flex-1 py-4 bg-white/60 backdrop-blur-xl border border-white/50 text-gray-700 rounded-2xl font-semibold hover:border-white/70 hover:bg-white/80 transition-all flex items-center justify-center gap-2"
                            >
                                <Home size={20} />
                                Back Home
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    }

    // Main Flashcard Study Interface
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-silver-50 to-gray-100">
            {/* Header with Back Button */}
            <div className="bg-white/60 backdrop-blur-xl border-b border-white/50 sticky top-0 z-10 shadow-sm">
                <div className="max-w-5xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => navigate('/dashboard?tab=flashcards')}
                            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-semibold transition-all group bg-white/50 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/50 hover:border-white/70"
                        >
                            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                            Back
                        </button>
                        
                        <div className="text-center flex-1 mx-8">
                            <h1 className="text-xl font-bold text-gray-900">{deck.title}</h1>
                            <p className="text-sm text-gray-500 font-medium">{deck.subject || 'Flashcard Deck'}</p>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <div className="text-xs text-gray-500 font-semibold">Mastered</div>
                                <div className="text-lg font-bold text-gray-900">{masteryCount}/{cards.length}</div>
                            </div>
                            <div className="w-12 h-12 bg-white/80 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/50 shadow-lg">
                                <CheckCircle2 size={24} className="text-gray-800" />
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4">
                        <div className="flex justify-between text-xs font-semibold text-gray-600 mb-1.5">
                            <span>Card {currentCardIndex + 1} of {cards.length}</span>
                            <span>{Math.round(progress)}%</span>
                        </div>
                        <div className="h-2 bg-white/80 backdrop-blur-sm rounded-full overflow-hidden border border-white/50">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                className="h-full bg-gradient-to-r from-gray-800 via-gray-700 to-gray-600"
                                transition={{ duration: 0.3 }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Card Area */}
            <div className="max-w-4xl mx-auto px-6 py-12">
                {/* Card Counter Pills */}
                <div className="flex items-center justify-center gap-2 mb-8">
                    {cards.map((_, idx) => (
                        <div
                            key={idx}
                            className={`h-2 rounded-full transition-all ${
                                idx === currentCardIndex 
                                    ? 'w-8 bg-gradient-to-r from-gray-800 to-gray-700' 
                                    : masteredCards.has(idx)
                                    ? 'w-2 bg-gray-600'
                                    : 'w-2 bg-gray-300'
                            }`}
                        />
                    ))}
                </div>

                {/* Flashcard */}
                <AnimatePresence mode="wait" custom={direction}>
                    <motion.div
                        key={currentCardIndex}
                        custom={direction}
                        initial={{ opacity: 0, x: direction > 0 ? 300 : -300 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: direction > 0 ? -300 : 300 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="mb-8"
                    >
                        <div
                            onClick={() => setFlipped(!flipped)}
                            className="relative cursor-pointer group"
                            style={{ perspective: '1200px' }}
                        >
                            {/* Flip Indicator */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-2 text-sm text-gray-500 font-semibold bg-white/60 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/50"
                            >
                                <Eye size={14} />
                                <span>Click to flip</span>
                            </motion.div>

                            <motion.div
                                animate={{ rotateY: flipped ? 180 : 0 }}
                                transition={{ duration: 0.6, type: 'spring' }}
                                style={{ 
                                    transformStyle: 'preserve-3d',
                                    height: '500px'
                                }}
                                className="relative w-full"
                            >
                                {/* Front Side - Question */}
                                <div 
                                    className="absolute inset-0 bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl group-hover:shadow-3xl transition-shadow border-2 border-white/70"
                                    style={{ 
                                        backfaceVisibility: 'hidden',
                                        WebkitBackfaceVisibility: 'hidden'
                                    }}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent rounded-3xl" />
                                    <div className="relative h-full flex flex-col items-center justify-center p-12 text-gray-900">
                                        <div className="mb-6 px-4 py-2 bg-white/60 backdrop-blur-sm rounded-full border border-white/50">
                                            <span className="text-xs font-semibold uppercase tracking-wider text-gray-600">Question</span>
                                        </div>
                                        <h2 className="text-4xl font-bold leading-tight text-center mb-8">
                                            {currentCard.question}
                                        </h2>
                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                            <Sparkles size={16} />
                                            <span className="font-medium">Tap to reveal answer</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Back Side - Answer */}
                                <div
                                    className="absolute inset-0 bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border-2 border-white/70"
                                    style={{ 
                                        backfaceVisibility: 'hidden',
                                        WebkitBackfaceVisibility: 'hidden',
                                        transform: 'rotateY(180deg)'
                                    }}
                                >
                                    <div className="h-full flex flex-col items-center justify-center p-12">
                                        <div className="mb-6 px-4 py-2 bg-gray-900 rounded-full">
                                            <span className="text-xs font-semibold uppercase tracking-wider text-white">Answer</span>
                                        </div>
                                        <p className="text-4xl font-bold text-gray-900 leading-tight text-center">
                                            {currentCard.answer}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>
                </AnimatePresence>

                {/* Navigation & Mastery Controls */}
                <div className="flex items-center justify-center gap-4">
                    {/* Previous Button */}
                    <button
                        onClick={() => navigateCard(currentCardIndex - 1)}
                        disabled={currentCardIndex === 0}
                        className="px-8 py-4 bg-white/80 backdrop-blur-xl border border-white/50 text-gray-700 rounded-2xl font-semibold hover:border-white/70 hover:bg-white/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg flex items-center gap-2"
                    >
                        <ChevronLeft size={20} />
                        Previous
                    </button>

                    {/* Mastery Toggle */}
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => markMastered(!masteredCards.has(currentCardIndex))}
                        className={`p-4 rounded-2xl font-semibold transition-all shadow-lg border ${
                            masteredCards.has(currentCardIndex)
                                ? 'bg-white/90 backdrop-blur-xl text-gray-900 border-white/70'
                                : 'bg-white/80 backdrop-blur-xl border-white/50 text-gray-700 hover:border-white/70'
                        }`}
                    >
                        {masteredCards.has(currentCardIndex) ? (
                            <CheckCircle2 size={28} className="text-gray-800" />
                        ) : (
                            <Circle size={28} className="text-gray-600" />
                        )}
                    </motion.button>

                    {/* Next Button */}
                    <button
                        onClick={() => navigateCard(currentCardIndex + 1)}
                        className="px-8 py-4 bg-white/80 backdrop-blur-xl text-gray-900 rounded-2xl font-semibold hover:scale-105 transition-all shadow-lg border border-white/50 hover:border-white/70 flex items-center gap-2"
                    >
                        {currentCardIndex === cards.length - 1 ? 'Finish' : 'Next'}
                        <ChevronRight size={20} />
                    </button>
                </div>

                {/* Quick Stats */}
                <div className="mt-8 flex items-center justify-center gap-6 text-sm text-gray-600">
                    <div className="flex items-center gap-2 bg-white/60 backdrop-blur-sm px-3 py-2 rounded-xl border border-white/50">
                        <div className="w-3 h-3 bg-gray-600 rounded-full" />
                        <span className="font-semibold">Mastered: {masteryCount}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white/60 backdrop-blur-sm px-3 py-2 rounded-xl border border-white/50">
                        <div className="w-3 h-3 bg-gray-300 rounded-full" />
                        <span className="font-semibold">Remaining: {cards.length - masteryCount}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Flashcard;