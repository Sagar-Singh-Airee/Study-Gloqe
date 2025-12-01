// src/components/features/FlashcardsSection.jsx - AUTO-GENERATE VERSION
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard,
  Plus,
  Search,
  Brain,
  Loader2,
  Sparkles,
  BookOpen,
  Target,
  Play,
  Trash2,
  Award,
  Clock,
  Zap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@contexts/AuthContext';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  deleteDoc,
  doc
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { generateFlashcardsWithGemini, createFlashcardDeck } from '@/services/flashcardService';
import toast from 'react-hot-toast';

const FlashcardsSection = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [decks, setDecks] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [generatingDeck, setGeneratingDeck] = useState(null);

  // Subject configuration
  const subjectConfig = {
    'Mathematics': { color: 'text-gray-700', bg: 'bg-gray-100', border: 'border-gray-300' },
    'Physics': { color: 'text-gray-800', bg: 'bg-gray-50', border: 'border-gray-300' },
    'Chemistry': { color: 'text-gray-700', bg: 'bg-gray-100', border: 'border-gray-300' },
    'Biology': { color: 'text-gray-800', bg: 'bg-gray-50', border: 'border-gray-300' },
    'Computer Science': { color: 'text-gray-900', bg: 'bg-gray-100', border: 'border-gray-400' },
    'History': { color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-300' },
    'Economics': { color: 'text-gray-800', bg: 'bg-gray-100', border: 'border-gray-300' },
    'Literature': { color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-300' },
    'Psychology': { color: 'text-gray-800', bg: 'bg-gray-100', border: 'border-gray-300' },
    'Engineering': { color: 'text-gray-900', bg: 'bg-gray-100', border: 'border-gray-400' },
    'General Studies': { color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' }
  };

  // Calculate optimal flashcard count based on document length
  const calculateOptimalCardCount = (document) => {
    const content = document.content || document.text || '';
    const wordCount = content.trim().split(/\s+/).length;
    const charCount = content.length;

    // Research-based ratios: ~1 card per 50-100 words for optimal retention
    if (wordCount < 200) return 5;        // Very short: 5 cards
    if (wordCount < 500) return 10;       // Short: 10 cards
    if (wordCount < 1000) return 15;      // Medium: 15 cards
    if (wordCount < 2000) return 20;      // Long: 20 cards
    if (wordCount < 3500) return 25;      // Very long: 25 cards
    return 30;                            // Extra long: 30 cards (max)
  };

  // Real-time flashcard decks listener
  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'flashcardDecks'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const decksData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date()
      }));

      setDecks(decksData);
      setLoading(false);
    }, (error) => {
      console.error('Error loading decks:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  // Real-time documents listener
  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, 'documents'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date()
      }));

      setDocuments(docsData);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  // Group decks by subject
  const decksBySubject = useMemo(() => {
    const grouped = {};
    decks.forEach(deck => {
      const subject = deck.subject || 'General Studies';
      if (!grouped[subject]) {
        grouped[subject] = [];
      }
      grouped[subject].push(deck);
    });
    return grouped;
  }, [decks]);

  // Filter decks
  const filteredDecks = useMemo(() => {
    let filtered = decks;

    if (selectedSubject !== 'all') {
      filtered = filtered.filter(deck =>
        (deck.subject || 'General Studies') === selectedSubject
      );
    }

    if (searchTerm) {
      filtered = filtered.filter(deck =>
        deck.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        deck.subject?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [decks, selectedSubject, searchTerm]);

  // UPDATED: Auto-generate with optimal count
  const handleGenerateDeck = async (document) => {
    if (!document?.id || !user?.uid) {
      toast.error('Invalid document or user');
      return;
    }

    // Calculate optimal card count automatically
    const optimalCardCount = calculateOptimalCardCount(document);
    
    setGeneratingDeck(document.id);
    const toastId = toast.loading(`🧠 AI is generating ${optimalCardCount} flashcards...`);

    try {
      console.log('Starting flashcard generation for:', document.id, 'with', optimalCardCount, 'cards');

      // Generate flashcards with Gemini
      const flashcards = await generateFlashcardsWithGemini(document.id, optimalCardCount);

      if (!flashcards || flashcards.length === 0) {
        throw new Error('No flashcards generated. Please try again.');
      }

      console.log(`Generated ${flashcards.length} flashcards`);

      // Create deck in Firestore with subcollection
      const deckId = await createFlashcardDeck(user.uid, document.id, flashcards, {
        title: `${document.title || 'Flashcards'}`,
        description: `AI-generated flashcard deck with ${flashcards.length} cards`,
        subject: document.subject || 'General Studies',
        cardCount: flashcards.length,
        masteredCount: 0
      });

      console.log('Deck created with ID:', deckId);

      // Show success message
      toast.success(`✨ Generated ${flashcards.length} flashcards successfully!`, { id: toastId });

      // Navigate to flashcard study page
      setTimeout(() => {
        navigate(`/flashcards/${deckId}`, {
          replace: false,
          state: {
            fromGeneration: true,
            cardCount: flashcards.length,
            documentTitle: document.title
          }
        });
      }, 500);

    } catch (error) {
      console.error('Flashcard generation error:', error);

      let errorMessage = 'Failed to generate flashcards';

      if (error.message.includes('API key')) {
        errorMessage = 'AI service configuration error. Please contact support.';
      } else if (error.message.includes('too short')) {
        errorMessage = 'Document text is too short. Please upload a longer document.';
      } else if (error.message.includes('not found')) {
        errorMessage = 'Document not found. Please try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage, { id: toastId });
    } finally {
      setGeneratingDeck(null);
    }
  };

  // Delete deck handler
  const handleDeleteDeck = async (deckId, deckTitle) => {
    if (!confirm(`Are you sure you want to delete "${deckTitle}"?`)) {
      return;
    }

    const toastId = toast.loading('Deleting deck...');

    try {
      await deleteDoc(doc(db, 'flashcardDecks', deckId));
      toast.success('Deck deleted successfully', { id: toastId });
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete deck', { id: toastId });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-gray-700 rounded-full animate-spin" />
          <p className="text-gray-600 font-semibold">Loading flashcards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-gray-800 to-gray-700 rounded-xl shadow-lg">
            <CreditCard className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-gray-900">AI Flashcards</h2>
            <p className="text-gray-600 font-semibold">Master concepts with AI-generated flashcards</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 rounded-2xl p-5 hover:border-gray-300 hover:shadow-lg transition-all">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gray-100 rounded-lg">
              <CreditCard size={20} className="text-gray-700" />
            </div>
            <span className="text-sm font-bold text-gray-600">Total Decks</span>
          </div>
          <p className="text-3xl font-black text-gray-900">{decks.length}</p>
        </div>

        <div className="bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 rounded-2xl p-5 hover:border-gray-300 hover:shadow-lg transition-all">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gray-100 rounded-lg">
              <BookOpen size={20} className="text-gray-700" />
            </div>
            <span className="text-sm font-bold text-gray-600">Subjects</span>
          </div>
          <p className="text-3xl font-black text-gray-900">{Object.keys(decksBySubject).length}</p>
        </div>

        <div className="bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 rounded-2xl p-5 hover:border-gray-300 hover:shadow-lg transition-all">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Target size={20} className="text-gray-700" />
            </div>
            <span className="text-sm font-bold text-gray-600">Total Cards</span>
          </div>
          <p className="text-3xl font-black text-gray-900">
            {decks.reduce((sum, deck) => sum + (deck.cardCount || 0), 0)}
          </p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search flashcard decks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-gray-400 transition-all font-semibold text-gray-900 placeholder:text-gray-500"
          />
        </div>
      </div>

      {/* Subject Filter Tabs */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300">
        <button
          onClick={() => setSelectedSubject('all')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all shadow-sm ${
            selectedSubject === 'all'
              ? 'bg-gradient-to-r from-gray-800 to-gray-700 text-white'
              : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-gray-400'
          }`}
        >
          All ({decks.length})
        </button>

        {Object.entries(decksBySubject).map(([subject, subjectDecks]) => {
          const config = subjectConfig[subject] || subjectConfig['General Studies'];

          return (
            <button
              key={subject}
              onClick={() => setSelectedSubject(subject)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all shadow-sm ${
                selectedSubject === subject
                  ? `${config.bg} ${config.color} border-2 ${config.border}`
                  : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-gray-400'
              }`}
            >
              {subject} ({subjectDecks.length})
            </button>
          );
        })}
      </div>

      {/* Documents with Generate Flashcards Button - SIMPLIFIED */}
      {documents.length > 0 && (
        <div>
          <h3 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
            <Sparkles size={20} className="text-gray-700" />
            Generate New Flashcard Deck
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.slice(0, 6).map((doc) => {
              const optimalCount = calculateOptimalCardCount(doc);
              
              return (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white border-2 border-gray-200 rounded-2xl p-5 hover:border-gray-400 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center flex-shrink-0">
                      <BookOpen size={18} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-black text-gray-900 truncate mb-1">{doc.title}</h4>
                      {doc.subject && (
                        <span className={`inline-block text-xs font-bold px-2 py-1 rounded-lg ${subjectConfig[doc.subject]?.bg} ${subjectConfig[doc.subject]?.color} border ${subjectConfig[doc.subject]?.border}`}>
                          {doc.subject}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Show optimal card count preview */}
                  <div className="mb-3 flex items-center gap-2 text-xs text-gray-500">
                    <Zap size={12} className="text-gray-700" />
                    <span className="font-semibold">Will generate ~{optimalCount} cards</span>
                  </div>

                  <button
                    onClick={() => handleGenerateDeck(doc)}
                    disabled={generatingDeck === doc.id}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-gray-800 to-gray-700 text-white rounded-xl text-sm font-bold hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {generatingDeck === doc.id ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} />
                        Generate Flashcards
                      </>
                    )}
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Flashcard Decks List */}
      {filteredDecks.length > 0 ? (
        <div>
          <h3 className="text-xl font-black text-gray-900 mb-4">Your Flashcard Decks</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDecks.map((deck) => {
              const subject = deck.subject || 'General Studies';
              const config = subjectConfig[subject] || subjectConfig['General Studies'];
              const masteryPercentage = deck.cardCount > 0 
                ? Math.round((deck.masteredCount / deck.cardCount) * 100) 
                : 0;

              return (
                <motion.div
                  key={deck.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white border-2 border-gray-200 rounded-2xl p-5 hover:border-gray-400 hover:shadow-lg transition-all group"
                >
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-12 h-12 bg-gray-900 rounded-xl flex items-center justify-center flex-shrink-0">
                      <CreditCard size={22} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-base font-black text-gray-900 truncate mb-2">{deck.title}</h4>
                      <span className={`inline-block text-xs font-bold px-2 py-1 rounded-lg ${config.bg} ${config.color} border ${config.border}`}>
                        {subject}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4 text-xs text-gray-600 font-semibold">
                    <div className="flex items-center gap-2">
                      <Target size={12} />
                      {deck.cardCount || 0} Cards
                    </div>
                    <div className="flex items-center gap-2">
                      <Award size={12} />
                      {deck.masteredCount || 0} Mastered ({masteryPercentage}%)
                    </div>
                    {deck.lastStudied && (
                      <div className="flex items-center gap-2">
                        <Clock size={12} />
                        Last studied {new Date(deck.lastStudied.seconds * 1000).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-gray-800 to-gray-700 transition-all duration-500"
                        style={{ width: `${masteryPercentage}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/flashcards/${deckId}`)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-bold hover:scale-105 transition-all"
                    >
                      <Play size={14} />
                      Study Now
                    </button>
                    <button
                      onClick={() => handleDeleteDeck(deck.id, deck.title)}
                      className="p-2 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-gradient-to-br from-gray-50 to-white border-2 border-dashed border-gray-300 rounded-2xl p-16 text-center"
        >
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md border-2 border-gray-200">
            <CreditCard size={32} className="text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No flashcard decks yet</h3>
          <p className="text-gray-600 mb-6 font-semibold">Generate your first AI flashcard deck from a document!</p>
        </motion.div>
      )}
    </div>
  );
};

export default FlashcardsSection;
