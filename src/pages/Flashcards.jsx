import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, Plus, RotateCcw, ChevronLeft, ChevronRight, Check, X } from 'lucide-react';

const Flashcards = () => {
  const [decks, setDecks] = useState([
    {
      id: 1,
      name: 'Physics Fundamentals',
      cards: 25,
      mastered: 18,
      color: 'blue'
    },
    {
      id: 2,
      name: 'Math Formulas',
      cards: 30,
      mastered: 22,
      color: 'purple'
    },
    {
      id: 3,
      name: 'Chemistry Elements',
      cards: 40,
      mastered: 30,
      color: 'green'
    }
  ]);

  const [studyMode, setStudyMode] = useState(false);
  const [currentDeck, setCurrentDeck] = useState(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const mockCards = [
    { front: 'What is Newton\'s First Law?', back: 'An object at rest stays at rest, and an object in motion stays in motion with the same speed and direction unless acted upon by an external force.' },
    { front: 'Define velocity', back: 'Velocity is the rate of change of position with respect to time, including both speed and direction.' },
    { front: 'What is acceleration?', back: 'Acceleration is the rate of change of velocity with respect to time.' }
  ];

  const startStudying = (deck) => {
    setCurrentDeck(deck);
    setStudyMode(true);
    setCurrentCardIndex(0);
    setIsFlipped(false);
  };

  const nextCard = () => {
    if (currentCardIndex < mockCards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setIsFlipped(false);
    }
  };

  const previousCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
      setIsFlipped(false);
    }
  };

  const markAnswer = (correct) => {
    // Handle SRS logic here
    nextCard();
  };

  if (studyMode && currentDeck) {
    const currentCard = mockCards[currentCardIndex];

    return (
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold">{currentDeck.name}</h1>
            <p className="text-primary-400">
              Card {currentCardIndex + 1} of {mockCards.length}
            </p>
          </div>
          <button
            onClick={() => setStudyMode(false)}
            className="btn-secondary"
          >
            Exit Study Mode
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-primary-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-accent to-blue-600 transition-all duration-300"
            style={{ width: `${((currentCardIndex + 1) / mockCards.length) * 100}%` }}
          ></div>
        </div>

        {/* Flashcard */}
        <motion.div
          className="relative"
          style={{ perspective: '1000px' }}
        >
          <motion.div
            className="relative w-full h-96 cursor-pointer"
            onClick={() => setIsFlipped(!isFlipped)}
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ duration: 0.6 }}
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* Front */}
            <div
              className="absolute inset-0 card flex items-center justify-center text-center p-8"
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(0deg)'
              }}
            >
              <div>
                <div className="text-sm text-primary-400 mb-4">Question</div>
                <p className="text-2xl font-medium">{currentCard.front}</p>
                <p className="text-sm text-primary-400 mt-8">Click to reveal answer</p>
              </div>
            </div>

            {/* Back */}
            <div
              className="absolute inset-0 card flex items-center justify-center text-center p-8 bg-gradient-to-br from-accent/20 to-blue-600/20 border-accent/30"
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)'
              }}
            >
              <div>
                <div className="text-sm text-primary-400 mb-4">Answer</div>
                <p className="text-xl">{currentCard.back}</p>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Controls */}
        {isFlipped && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center gap-4"
          >
            <button
              onClick={() => markAnswer(false)}
              className="px-8 py-4 rounded-xl bg-error/20 border-2 border-error/30 hover:bg-error/30 transition-all flex items-center gap-2"
            >
              <X size={24} />
              Don't Know
            </button>
            <button
              onClick={() => markAnswer(true)}
              className="px-8 py-4 rounded-xl bg-success/20 border-2 border-success/30 hover:bg-success/30 transition-all flex items-center gap-2"
            >
              <Check size={24} />
              Know It
            </button>
          </motion.div>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={previousCard}
            disabled={currentCardIndex === 0}
            className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={18} />
            Previous
          </button>

          <div className="text-sm text-primary-400">
            {currentCardIndex + 1} / {mockCards.length}
          </div>

          <button
            onClick={nextCard}
            disabled={currentCardIndex === mockCards.length - 1}
            className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-display font-bold mb-2">
          <span className="gradient-text">Flashcards</span>
        </h1>
        <p className="text-primary-300">
          Master concepts with spaced repetition
        </p>
      </motion.div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="card"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
              <CreditCard size={20} className="text-accent" />
            </div>
            <div>
              <div className="text-2xl font-bold">95</div>
              <div className="text-sm text-primary-400">Total Cards</div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="card"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
              <Check size={20} className="text-success" />
            </div>
            <div>
              <div className="text-2xl font-bold">70</div>
              <div className="text-sm text-primary-400">Mastered</div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="card"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <RotateCcw size={20} className="text-yellow-400" />
            </div>
            <div>
              <div className="text-2xl font-bold">15</div>
              <div className="text-sm text-primary-400">Due Today</div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Decks */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-display font-semibold">My Decks</h2>
          <button className="btn-primary flex items-center gap-2">
            <Plus size={18} />
            Create Deck
          </button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {decks.map((deck, index) => (
            <motion.div
              key={deck.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
              className="card-hover"
            >
              <h3 className="text-xl font-semibold mb-4">{deck.name}</h3>

              {/* Progress */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-primary-400">Progress</span>
                  <span className="font-semibold">
                    {deck.mastered}/{deck.cards} mastered
                  </span>
                </div>
                <div className="h-2 bg-primary-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-accent to-blue-600"
                    style={{ width: `${(deck.mastered / deck.cards) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Actions */}
              <button
                onClick={() => startStudying(deck)}
                className="btn-primary w-full"
              >
                Study Now
              </button>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default Flashcards;