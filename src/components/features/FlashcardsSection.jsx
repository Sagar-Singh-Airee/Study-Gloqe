// src/components/features/FlashcardsSection.jsx - ULTIMATE CREATIVE VERSION
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    CreditCard, 
    Plus, 
    ChevronLeft, 
    ChevronRight, 
    Check, 
    X,
    Brain,
    Zap,
    Target,
    Star,
    TrendingUp,
    Loader2,
    Sparkles,
    RotateCw,
    Trash2,
    Calendar
} from 'lucide-react';
import { useAuth } from '@contexts/AuthContext';
import { 
    collection, 
    query, 
    where, 
    orderBy, 
    onSnapshot,
    doc,
    updateDoc,
    deleteDoc,
    addDoc,
    serverTimestamp
} from 'firebase/firestore';
import { db } from '@/config/firebase';

const FlashcardsSection = () => {
    const { currentUser } = useAuth();
    const [decks, setDecks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [studying, setStudying] = useState(false);
    const [currentDeck, setCurrentDeck] = useState(null);
    const [cards, setCards] = useState([]);
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [flipped, setFlipped] = useState(false);
    const [sessionStats, setSessionStats] = useState({ correct: 0, incorrect: 0 });
    const [showResults, setShowResults] = useState(false);

    // Real-time decks listener
    useEffect(() => {
        if (!currentUser) {
            setLoading(false);
            return;
        }

        console.log('🎴 Loading flashcard decks...');

        const decksRef = collection(db, 'flashcardDecks');
        const q = query(
            decksRef,
            where('userId', '==', currentUser.uid),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const decksData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                console.log('📊 Loaded decks:', decksData.length);
                setDecks(decksData);
                setLoading(false);
            },
            (error) => {
                console.error('❌ Error loading decks:', error);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [currentUser]);

    // Load cards when studying
    const startStudying = async (deck) => {
        console.log('🎯 Starting study session:', deck.title);
        
        // Load cards for this deck
        const cardsRef = collection(db, `flashcardDecks/${deck.id}/cards`);
        const q = query(cardsRef, orderBy('order', 'asc'));
        
        onSnapshot(q, (snapshot) => {
            const cardsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            setCards(cardsData);
            setCurrentDeck(deck);
            setCurrentCardIndex(0);
            setStudying(true);
            setFlipped(false);
            setSessionStats({ correct: 0, incorrect: 0 });
            setShowResults(false);
        });
    };

    const nextCard = () => {
        if (currentCardIndex < cards.length - 1) {
            setCurrentCardIndex(currentCardIndex + 1);
            setFlipped(false);
        } else {
            setShowResults(true);
        }
    };

    const previousCard = () => {
        if (currentCardIndex > 0) {
            setCurrentCardIndex(currentCardIndex - 1);
            setFlipped(false);
        }
    };

    const markAnswer = async (correct) => {
        setSessionStats(prev => ({
            correct: correct ? prev.correct + 1 : prev.correct,
            incorrect: correct ? prev.incorrect : prev.incorrect + 1
        }));

        // Update card mastery in Firestore
        const cardRef = doc(db, `flashcardDecks/${currentDeck.id}/cards`, cards[currentCardIndex].id);
        await updateDoc(cardRef, {
            mastered: correct,
            lastReviewed: serverTimestamp()
        });

        nextCard();
    };

    const deleteDeck = async (deckId) => {
        if (!confirm('Delete this deck? This cannot be undone.')) return;
        
        try {
            await deleteDoc(doc(db, 'flashcardDecks', deckId));
            console.log('✅ Deck deleted');
        } catch (error) {
            console.error('❌ Error deleting deck:', error);
        }
    };

    const resetProgress = () => {
        setCurrentCardIndex(0);
        setFlipped(false);
        setSessionStats({ correct: 0, incorrect: 0 });
        setShowResults(false);
    };

    // Gradient colors (black/silver/white theme)
    const getGradient = (index) => {
        const gradients = [
            'from-black via-gray-800 to-gray-900',
            'from-gray-700 via-gray-600 to-gray-500',
            'from-gray-600 via-gray-500 to-gray-400',
            'from-gray-500 via-gray-400 to-gray-300'
        ];
        return gradients[index % gradients.length];
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center">
                    <Loader2 size={48} className="animate-spin text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Loading flashcards...</p>
                </div>
            </div>
        );
    }

    // Study Mode - Results Screen
    if (showResults && currentDeck) {
        const accuracy = cards.length > 0 
            ? Math.round((sessionStats.correct / cards.length) * 100) 
            : 0;

        return (
            <div className="max-w-2xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-gradient-to-br from-black via-gray-900 to-gray-800 rounded-3xl p-12 text-white text-center shadow-2xl relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24" />
                    
                    <div className="relative">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: 'spring' }}
                            className="w-24 h-24 mx-auto bg-white rounded-full flex items-center justify-center mb-6"
                        >
                            <Star size={48} className="text-black" />
                        </motion.div>

                        <h2 className="text-4xl font-black mb-4">Session Complete!</h2>
                        <p className="text-gray-300 mb-8">Great work studying {currentDeck.title}</p>

                        <div className="grid grid-cols-3 gap-6 mb-8">
                            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                                <div className="text-3xl font-black mb-1">{cards.length}</div>
                                <div className="text-sm text-gray-300">Cards Reviewed</div>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                                <div className="text-3xl font-black mb-1 text-white">{sessionStats.correct}</div>
                                <div className="text-sm text-gray-300">Correct</div>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                                <div className="text-3xl font-black mb-1">{accuracy}%</div>
                                <div className="text-sm text-gray-300">Accuracy</div>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={resetProgress}
                                className="flex-1 py-4 bg-white text-black rounded-xl font-bold hover:scale-105 transition-all flex items-center justify-center gap-2"
                            >
                                <RotateCw size={20} />
                                Study Again
                            </button>
                            <button
                                onClick={() => setStudying(false)}
                                className="flex-1 py-4 bg-white/10 border-2 border-white/20 text-white rounded-xl font-bold hover:bg-white/20 transition-all"
                            >
                                Exit
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    }

    // Study Mode - Active Session
    if (studying && currentDeck && cards.length > 0) {
        const currentCard = cards[currentCardIndex];
        const progress = ((currentCardIndex + 1) / cards.length) * 100;

        return (
            <div className="max-w-4xl mx-auto">
                {/* Header Stats */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-black text-black">{currentDeck.title}</h2>
                        <p className="text-gray-600">{currentDeck.subject || 'Study Deck'}</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="text-center px-4 py-2 bg-white border-2 border-gray-200 rounded-xl">
                            <div className="text-xs text-gray-500">Correct</div>
                            <div className="text-xl font-black text-black">{sessionStats.correct}</div>
                        </div>
                        <div className="text-center px-4 py-2 bg-white border-2 border-gray-200 rounded-xl">
                            <div className="text-xs text-gray-500">Wrong</div>
                            <div className="text-xl font-black text-black">{sessionStats.incorrect}</div>
                        </div>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-8">
                    <div className="flex justify-between text-sm mb-2">
                        <span className="font-bold text-black">Progress</span>
                        <span className="text-gray-600">{currentCardIndex + 1} / {cards.length}</span>
                    </div>
                    <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.5 }}
                            className="h-full bg-gradient-to-r from-black to-gray-800"
                        />
                    </div>
                </div>

                {/* Flashcard */}
                <motion.div
                    key={currentCardIndex}
                    initial={{ opacity: 0, x: 100 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    className="mb-8"
                >
                    <div
                        onClick={() => setFlipped(!flipped)}
                        className="relative h-96 cursor-pointer"
                        style={{ perspective: '1000px' }}
                    >
                        <motion.div
                            animate={{ rotateY: flipped ? 180 : 0 }}
                            transition={{ duration: 0.6, type: 'spring' }}
                            style={{ 
                                transformStyle: 'preserve-3d',
                                position: 'relative',
                                width: '100%',
                                height: '100%'
                            }}
                        >
                            {/* Front - Question */}
                            <div 
                                className={`absolute inset-0 bg-gradient-to-br ${getGradient(currentCardIndex)} rounded-3xl p-12 flex items-center justify-center text-white shadow-2xl`}
                                style={{ backfaceVisibility: 'hidden' }}
                            >
                                <div className="text-center">
                                    <div className="flex items-center justify-center gap-2 mb-6">
                                        <Brain size={24} className="text-gray-300" />
                                        <span className="text-sm font-bold opacity-60">QUESTION</span>
                                    </div>
                                    <h2 className="text-4xl font-black leading-tight">
                                        {currentCard.question || 'No question'}
                                    </h2>
                                    <div className="mt-8 flex items-center justify-center gap-2 text-sm opacity-60">
                                        <Sparkles size={16} />
                                        <span>Tap to reveal answer</span>
                                    </div>
                                </div>
                            </div>

                            {/* Back - Answer */}
                            <div
                                className="absolute inset-0 bg-white border-4 border-black rounded-3xl p-12 flex items-center justify-center shadow-2xl"
                                style={{ 
                                    backfaceVisibility: 'hidden',
                                    transform: 'rotateY(180deg)'
                                }}
                            >
                                <div className="text-center">
                                    <div className="flex items-center justify-center gap-2 mb-6">
                                        <Target size={24} className="text-black" />
                                        <span className="text-sm font-bold text-gray-400">ANSWER</span>
                                    </div>
                                    <p className="text-3xl font-black text-black leading-tight">
                                        {currentCard.answer || 'No answer'}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </motion.div>

                {/* Controls */}
                <div className="flex items-center justify-between mb-6">
                    <button
                        onClick={previousCard}
                        disabled={currentCardIndex === 0}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-gray-200 font-bold hover:border-black transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <ChevronLeft size={20} />
                        Previous
                    </button>

                    <div className="flex gap-4">
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => markAnswer(false)}
                            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-700 to-gray-900 text-white hover:shadow-xl transition-all flex items-center justify-center"
                        >
                            <X size={32} />
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => markAnswer(true)}
                            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-black to-gray-800 text-white hover:shadow-xl transition-all flex items-center justify-center"
                        >
                            <Check size={32} />
                        </motion.button>
                    </div>

                    <button
                        onClick={nextCard}
                        disabled={currentCardIndex === cards.length - 1}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-black to-gray-800 text-white font-bold hover:scale-105 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        Next
                        <ChevronRight size={20} />
                    </button>
                </div>

                <button
                    onClick={() => setStudying(false)}
                    className="w-full py-3 border-2 border-gray-200 rounded-xl font-bold hover:bg-gray-50 transition-all"
                >
                    Exit Study Mode
                </button>
            </div>
        );
    }

    // Main Decks View
    return (
        <>
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between mb-8"
            >
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 bg-gradient-to-br from-black to-gray-800 rounded-2xl flex items-center justify-center shadow-lg">
                            <CreditCard className="text-white" size={28} />
                        </div>
                        <h1 className="text-4xl font-black text-black">Flashcards</h1>
                    </div>
                    <p className="text-gray-600">Study smarter with spaced repetition</p>
                </div>
                <button className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-black to-gray-800 text-white rounded-xl font-bold hover:scale-105 transition-all shadow-lg">
                    <Plus size={20} />
                    Create Deck
                </button>
            </motion.div>

            {/* Decks Grid */}
            {decks.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence>
                        {decks.map((deck, idx) => (
                            <motion.div
                                key={deck.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ delay: idx * 0.1 }}
                                className="bg-white border-2 border-gray-200 rounded-2xl p-6 hover:border-black hover:shadow-xl transition-all group relative"
                            >
                                <div className={`w-16 h-16 bg-gradient-to-br ${getGradient(idx)} rounded-xl flex items-center justify-center mb-4 shadow-lg`}>
                                    <CreditCard size={32} className="text-white" />
                                </div>

                                <h3 className="text-xl font-bold text-black mb-1">{deck.title}</h3>
                                <p className="text-sm text-gray-500 mb-4">{deck.subject || 'General'}</p>

                                <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                                    <div>
                                        <div className="text-xs text-gray-500">Cards</div>
                                        <div className="text-2xl font-black text-black">{deck.cardCount || 0}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs text-gray-500">Mastered</div>
                                        <div className="text-2xl font-black text-black">{deck.masteredCount || 0}</div>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => startStudying(deck)}
                                        className="flex-1 py-3 bg-gradient-to-r from-black to-gray-800 text-white rounded-xl font-bold hover:scale-105 transition-all shadow-md"
                                    >
                                        Study Now
                                    </button>
                                    <button
                                        onClick={() => deleteDeck(deck.id)}
                                        className="p-3 border-2 border-gray-200 rounded-xl hover:border-black hover:bg-gray-50 transition-all"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>

                                {deck.lastStudied && (
                                    <div className="flex items-center gap-1 text-xs text-gray-400 mt-3">
                                        <Calendar size={12} />
                                        Last studied {new Date(deck.lastStudied.seconds * 1000).toLocaleDateString()}
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            ) : (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-3xl p-16 text-center"
                >
                    <CreditCard size={64} className="mx-auto text-gray-300 mb-4" />
                    <h3 className="text-2xl font-bold text-black mb-2">No Flashcard Decks Yet</h3>
                    <p className="text-gray-600 mb-6">Create your first deck to start studying!</p>
                    <button className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-black to-gray-800 text-white rounded-xl font-bold hover:scale-105 transition-all shadow-lg">
                        <Plus size={20} />
                        Create Your First Deck
                    </button>
                </motion.div>
            )}
        </>
    );
};

export default FlashcardsSection;
