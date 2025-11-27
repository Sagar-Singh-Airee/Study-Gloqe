// src/components/features/FlashcardsSection.jsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, Plus, RotateCcw, ChevronLeft, ChevronRight, Check, X } from 'lucide-react';

const FlashcardsSection = () => {
    const [decks, setDecks] = useState([
        {
            id: 1,
            title: 'Physics - Motion',
            cards: 15,
            mastered: 8,
            subject: 'Physics',
            color: 'from-blue-500 to-cyan-500'
        },
        {
            id: 2,
            title: 'Math - Calculus',
            cards: 20,
            mastered: 12,
            subject: 'Mathematics',
            color: 'from-purple-500 to-pink-500'
        },
        {
            id: 3,
            title: 'Chemistry - Atoms',
            cards: 18,
            mastered: 15,
            subject: 'Chemistry',
            color: 'from-green-500 to-emerald-500'
        }
    ]);

    const [studying, setStudying] = useState(false);
    const [currentDeck, setCurrentDeck] = useState(null);
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [flipped, setFlipped] = useState(false);
    const [answered, setAnswered] = useState([]);

    const sampleCards = [
        { question: 'What is Newton\'s First Law?', answer: 'An object at rest stays at rest, and an object in motion stays in motion unless acted upon by an external force.' },
        { question: 'Define velocity', answer: 'Velocity is the rate of change of position with respect to time, including direction.' },
        { question: 'What is acceleration?', answer: 'Acceleration is the rate of change of velocity with respect to time.' }
    ];

    const startStudying = (deck) => {
        setCurrentDeck(deck);
        setCurrentCardIndex(0);
        setStudying(true);
        setFlipped(false);
        setAnswered([]);
    };

    const nextCard = () => {
        if (currentCardIndex < sampleCards.length - 1) {
            setCurrentCardIndex(currentCardIndex + 1);
            setFlipped(false);
        }
    };

    const previousCard = () => {
        if (currentCardIndex > 0) {
            setCurrentCardIndex(currentCardIndex - 1);
            setFlipped(false);
        }
    };

    const markAnswer = (correct) => {
        setAnswered([...answered, { index: currentCardIndex, correct }]);
    };

    if (studying && currentDeck) {
        const currentCard = sampleCards[currentCardIndex];
        const progress = ((currentCardIndex + 1) / sampleCards.length) * 100;

        return (
            <div className="max-w-4xl mx-auto">
                {/* Progress */}
                <div className="mb-8">
                    <div className="flex justify-between text-sm mb-2">
                        <span className="font-bold text-black">Progress</span>
                        <span className="text-gray-600">{currentCardIndex + 1} / {sampleCards.length}</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            className="h-full bg-black"
                        />
                    </div>
                </div>

                {/* Card */}
                <motion.div
                    key={currentCardIndex}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <div
                        onClick={() => setFlipped(!flipped)}
                        className="relative h-96 cursor-pointer perspective-1000"
                    >
                        <motion.div
                            animate={{ rotateY: flipped ? 180 : 0 }}
                            transition={{ duration: 0.6 }}
                            className="w-full h-full preserve-3d"
                        >
                            {/* Front */}
                            <div className={`absolute inset-0 bg-gradient-to-br ${currentDeck.color} rounded-3xl p-8 backface-hidden flex items-center justify-center text-white`}>
                                <div className="text-center">
                                    <div className="text-sm font-bold mb-4 opacity-60">QUESTION</div>
                                    <h2 className="text-3xl font-black">{currentCard.question}</h2>
                                    <p className="mt-6 text-sm opacity-60">Click to reveal answer</p>
                                </div>
                            </div>

                            {/* Back */}
                            <div
                                className="absolute inset-0 bg-white border-4 border-black rounded-3xl p-8 backface-hidden rotate-y-180 flex items-center justify-center"
                            >
                                <div className="text-center">
                                    <div className="text-sm font-bold mb-4 text-gray-400">ANSWER</div>
                                    <p className="text-2xl font-bold text-black">{currentCard.answer}</p>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </motion.div>

                {/* Controls */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={previousCard}
                        disabled={currentCardIndex === 0}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-gray-200 font-bold hover:border-black transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <ChevronLeft size={20} />
                        Previous
                    </button>

                    <div className="flex gap-3">
                        <button
                            onClick={() => markAnswer(false)}
                            className="p-4 rounded-xl bg-red-500 text-white hover:scale-110 transition-all"
                        >
                            <X size={24} />
                        </button>
                        <button
                            onClick={() => markAnswer(true)}
                            className="p-4 rounded-xl bg-green-500 text-white hover:scale-110 transition-all"
                        >
                            <Check size={24} />
                        </button>
                    </div>

                    <button
                        onClick={nextCard}
                        disabled={currentCardIndex === sampleCards.length - 1}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-black text-white font-bold hover:scale-105 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        Next
                        <ChevronRight size={20} />
                    </button>
                </div>

                <button
                    onClick={() => setStudying(false)}
                    className="w-full mt-6 py-3 border-2 border-gray-200 rounded-xl font-bold hover:bg-gray-50 transition-all"
                >
                    Exit Study Mode
                </button>
            </div>
        );
    }

    return (
        <>
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-4xl font-black text-black mb-2">Flashcards</h1>
                    <p className="text-gray-600">Study with AI-generated flashcards</p>
                </div>
                <button className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl font-bold hover:scale-105 transition-all">
                    <Plus size={20} />
                    Create Deck
                </button>
            </div>

            {/* Decks Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {decks.map((deck, idx) => (
                    <motion.div
                        key={deck.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="bg-white border-2 border-gray-200 rounded-2xl p-6 hover:border-black hover:shadow-lg transition-all"
                    >
                        <div className={`w-16 h-16 bg-gradient-to-br ${deck.color} rounded-xl flex items-center justify-center mb-4`}>
                            <CreditCard size={32} className="text-white" />
                        </div>

                        <h3 className="text-xl font-bold text-black mb-1">{deck.title}</h3>
                        <p className="text-sm text-gray-500 mb-4">{deck.subject}</p>

                        <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                            <div>
                                <div className="text-xs text-gray-500">Total Cards</div>
                                <div className="text-lg font-black text-black">{deck.cards}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs text-gray-500">Mastered</div>
                                <div className="text-lg font-black text-black">{deck.mastered}</div>
                            </div>
                        </div>

                        <button
                            onClick={() => startStudying(deck)}
                            className="w-full py-3 bg-black text-white rounded-xl font-bold hover:scale-105 transition-all"
                        >
                            Study Now
                        </button>
                    </motion.div>
                ))}
            </div>
        </>
    );
};

export default FlashcardsSection;
