// src/components/features/FlashcardsSection.jsx - PREMIUM CLEAN DESIGN ✨

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard,
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
  Zap,
  TrendingUp,
  LayoutGrid,
  List,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@auth/contexts/AuthContext';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  deleteDoc,
  doc
} from 'firebase/firestore';
import { db } from '@shared/config/firebase';
import { generateFlashcardsWithGemini, createFlashcardDeck } from '@study/services/flashcardService';
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
  const [viewMode, setViewMode] = useState('grid');

  // Clean subject config
  const subjectConfig = {
    'Mathematics': { color: 'blue', textColor: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
    'Physics': { color: 'teal', textColor: 'text-teal-700', bgColor: 'bg-teal-50', borderColor: 'border-teal-200' },
    'Chemistry': { color: 'cyan', textColor: 'text-cyan-700', bgColor: 'bg-cyan-50', borderColor: 'border-cyan-200' },
    'Biology': { color: 'emerald', textColor: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200' },
    'Computer Science': { color: 'indigo', textColor: 'text-indigo-700', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-200' },
    'History': { color: 'amber', textColor: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' },
    'Economics': { color: 'violet', textColor: 'text-violet-700', bgColor: 'bg-violet-50', borderColor: 'border-violet-200' },
    'Literature': { color: 'rose', textColor: 'text-rose-700', bgColor: 'bg-rose-50', borderColor: 'border-rose-200' },
    'Psychology': { color: 'purple', textColor: 'text-purple-700', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' },
    'Engineering': { color: 'orange', textColor: 'text-orange-700', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' },
    'General Studies': { color: 'slate', textColor: 'text-slate-700', bgColor: 'bg-slate-50', borderColor: 'border-slate-200' }
  };

  // Calculate optimal flashcard count
  const calculateOptimalCardCount = (document) => {
    const content = document.content || document.text || document.extractedText || '';
    const wordCount = content.trim().split(/\s+/).length;

    if (wordCount < 200) return 5;
    if (wordCount < 500) return 10;
    if (wordCount < 1000) return 15;
    if (wordCount < 2000) return 20;
    if (wordCount < 3500) return 25;
    return 30;
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
      const decksData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          cardCount: data.cardCount || 0,
          masteredCount: data.masteredCount || 0,
          reviewCount: data.reviewCount || 0,
          createdAt: data.createdAt?.toDate?.() || new Date(),
          lastStudied: data.lastStudied
        };
      });

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

  // Calculate stats
  const flashcardStats = useMemo(() => {
    const totalCards = decks.reduce((sum, deck) => sum + (deck.cardCount || 0), 0);
    const totalMastered = decks.reduce((sum, deck) => sum + (deck.masteredCount || 0), 0);
    const totalReviewed = decks.reduce((sum, deck) => sum + (deck.reviewCount || 0), 0);
    const masteryRate = totalCards > 0 ? Math.round((totalMastered / totalCards) * 100) : 0;

    return {
      totalCards,
      totalMastered,
      totalReviewed,
      masteryRate
    };
  }, [decks]);

  // Generate deck handler
  const handleGenerateDeck = async (document) => {
    if (!document?.id || !user?.uid) {
      toast.error('Invalid document or user');
      return;
    }

    const optimalCardCount = calculateOptimalCardCount(document);
    setGeneratingDeck(document.id);
    const toastId = toast.loading(`🧠 AI is generating ${optimalCardCount} flashcards...`);

    try {
      const flashcards = await generateFlashcardsWithGemini(document.id, optimalCardCount);

      if (!flashcards || flashcards.length === 0) {
        throw new Error('No flashcards generated. Please try again.');
      }

      const deckId = await createFlashcardDeck(user.uid, document.id, flashcards, {
        title: `${document.title || 'Flashcards'}`,
        description: `AI-generated flashcard deck with ${flashcards.length} cards`,
        subject: document.subject || 'General Studies',
        cardCount: flashcards.length,
        masteredCount: 0,
        reviewCount: 0,
        lastStudied: null
      });

      toast.success(`✨ Generated ${flashcards.length} flashcards successfully!`, { id: toastId });

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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-slate-200 border-t-teal-600 rounded-full"
          />
          <p className="text-slate-700 font-bold">Loading flashcards...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50 relative overflow-hidden">
      {/* Background orbs */}
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.25, 0.15] }}
        transition={{ duration: 8, repeat: Infinity }}
        className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-br from-blue-200/40 via-teal-200/40 to-transparent rounded-full blur-3xl pointer-events-none"
      />
      <motion.div
        animate={{ scale: [1, 1.3, 1], opacity: [0.1, 0.2, 0.1] }}
        transition={{ duration: 10, repeat: Infinity, delay: 1 }}
        className="absolute bottom-20 right-20 w-96 h-96 bg-gradient-to-br from-teal-200/40 via-blue-200/40 to-transparent rounded-full blur-3xl pointer-events-none"
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-blue-600 to-teal-600 rounded-2xl shadow-lg">
                <CreditCard className="w-7 h-7 text-white" strokeWidth={2} />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 via-teal-700 to-blue-700 bg-clip-text text-transparent">
                  AI Flashcards
                </h1>
                <p className="text-slate-600 font-medium mt-1">
                  Master concepts with intelligent flashcards
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <motion.div whileHover={{ y: -2 }} className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-50 rounded-xl">
                <CreditCard size={20} className="text-blue-600" />
              </div>
              <span className="text-sm font-semibold text-slate-600">Total Cards</span>
            </div>
            <p className="text-3xl font-bold text-slate-800">{flashcardStats.totalCards}</p>
          </motion.div>

          <motion.div whileHover={{ y: -2 }} className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-emerald-50 rounded-xl">
                <Award size={20} className="text-emerald-600" />
              </div>
              <span className="text-sm font-semibold text-slate-600">Mastered</span>
            </div>
            <p className="text-3xl font-bold text-slate-800">{flashcardStats.totalMastered}</p>
          </motion.div>

          <motion.div whileHover={{ y: -2 }} className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-teal-50 rounded-xl">
                <Zap size={20} className="text-teal-600" />
              </div>
              <span className="text-sm font-semibold text-slate-600">Reviewed</span>
            </div>
            <p className="text-3xl font-bold text-slate-800">{flashcardStats.totalReviewed}</p>
          </motion.div>

          <motion.div whileHover={{ y: -2 }} className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-purple-50 rounded-xl">
                <TrendingUp size={20} className="text-purple-600" />
              </div>
              <span className="text-sm font-semibold text-slate-600">Mastery Rate</span>
            </div>
            <p className="text-3xl font-bold text-slate-800">{flashcardStats.masteryRate}%</p>
          </motion.div>
        </div>

        {/* Search & Filters */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Search flashcard decks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-white rounded-2xl border border-slate-200/60 
                         focus:outline-none focus:border-teal-500/60 focus:shadow-lg transition-all 
                         font-medium text-slate-800 placeholder:text-slate-400"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="p-3.5 bg-white border border-slate-200/60 rounded-2xl hover:bg-slate-50 transition-all"
              >
                {viewMode === 'grid' ? <List size={20} className="text-slate-700" /> : <LayoutGrid size={20} className="text-slate-700" />}
              </button>
            </div>
          </div>
        </div>

        {/* Subject Filter Pills */}
        <div className="mb-8">
          <div className="flex items-center gap-2 overflow-x-auto pb-3 scrollbar-thin scrollbar-thumb-slate-300">
            <button
              onClick={() => setSelectedSubject('all')}
              className={`px-4 py-2 rounded-xl font-semibold text-sm whitespace-nowrap transition-all ${selectedSubject === 'all'
                  ? 'bg-gradient-to-r from-blue-600 to-teal-600 text-white shadow-md'
                  : 'bg-white border border-slate-200/60 text-slate-700 hover:border-slate-300'
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
                  className={`px-4 py-2 rounded-xl font-semibold text-sm whitespace-nowrap transition-all ${selectedSubject === subject
                      ? `${config.bgColor} ${config.textColor} border ${config.borderColor}`
                      : 'bg-white border border-slate-200/60 text-slate-700 hover:border-slate-300'
                    }`}
                >
                  {subject} ({subjectDecks.length})
                </button>
              );
            })}
          </div>
        </div>

        {/* Generate from Documents */}
        {documents.length > 0 && (
          <div className="mb-10">
            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Sparkles size={20} className="text-teal-600" />
              Generate New Flashcard Deck
            </h3>
            <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
              {documents.slice(0, 6).map((doc) => {
                const optimalCount = calculateOptimalCardCount(doc);
                const config = subjectConfig[doc.subject] || subjectConfig['General Studies'];

                return (
                  <motion.div
                    key={doc.id}
                    whileHover={{ y: -2 }}
                    className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm hover:shadow-lg hover:border-teal-400/60 transition-all"
                  >
                    <div className="flex items-start gap-3 mb-4">
                      <div className={`p-2.5 bg-gradient-to-br from-${config.color}-500 to-${config.color}-600 rounded-xl shadow-md`}>
                        <BookOpen size={20} className="text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-slate-800 truncate mb-1.5">{doc.title}</h4>
                        {doc.subject && (
                          <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-lg ${config.bgColor} ${config.textColor}`}>
                            {doc.subject}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mb-3 flex items-center gap-2 text-xs text-slate-500">
                      <Zap size={12} className="text-teal-600" />
                      <span className="font-semibold">Will generate ~{optimalCount} cards</span>
                    </div>

                    <button
                      onClick={() => handleGenerateDeck(doc)}
                      disabled={generatingDeck === doc.id}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-xl text-sm font-semibold hover:shadow-md transition-all disabled:opacity-50"
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
            <h3 className="text-xl font-bold text-slate-800 mb-4">Your Flashcard Decks</h3>
            <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
              {filteredDecks.map((deck) => {
                const subject = deck.subject || 'General Studies';
                const config = subjectConfig[subject] || subjectConfig['General Studies'];
                const masteryPercentage = deck.cardCount > 0
                  ? Math.round((deck.masteredCount / deck.cardCount) * 100)
                  : 0;

                return (
                  <motion.div
                    key={deck.id}
                    whileHover={{ y: -2 }}
                    className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm hover:shadow-lg hover:border-blue-400/60 transition-all"
                  >
                    <div className="flex items-start gap-3 mb-4">
                      <div className={`p-2.5 bg-gradient-to-br from-${config.color}-500 to-${config.color}-600 rounded-xl shadow-md`}>
                        <CreditCard size={22} className="text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-base font-bold text-slate-800 line-clamp-2 mb-2">{deck.title}</h4>
                        <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-lg ${config.bgColor} ${config.textColor}`}>
                          {subject}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2.5 mb-4 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 font-medium">Total Cards</span>
                        <span className="font-bold text-slate-800">{deck.cardCount || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 font-medium">Mastered</span>
                        <span className="font-bold text-emerald-700">{deck.masteredCount || 0}</span>
                      </div>
                      {deck.reviewCount > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600 font-medium">Reviews</span>
                          <span className="font-bold text-teal-700">{deck.reviewCount}</span>
                        </div>
                      )}
                      {deck.lastStudied && (
                        <div className="flex items-center gap-2 text-xs text-slate-500 pt-2 border-t border-slate-100">
                          <Clock size={12} />
                          Last studied {new Date(deck.lastStudied.seconds * 1000).toLocaleDateString()}
                        </div>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1.5">
                        <span>Mastery Progress</span>
                        <span className={masteryPercentage === 100 ? 'text-emerald-600' : ''}>{masteryPercentage}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${masteryPercentage}%` }}
                          transition={{ duration: 0.5 }}
                          className={`h-full ${masteryPercentage === 100
                              ? 'bg-gradient-to-r from-emerald-500 to-emerald-600'
                              : 'bg-gradient-to-r from-blue-600 to-teal-600'
                            }`}
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/flashcards/${deck.id}`)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-xl text-sm font-semibold hover:shadow-md transition-all"
                      >
                        <Play size={14} />
                        Study Now
                      </button>
                      <button
                        onClick={() => handleDeleteDeck(deck.id, deck.title)}
                        className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 border border-red-200/60 transition-all"
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
          <div className="bg-white border-2 border-dashed border-slate-300/60 rounded-3xl p-16 text-center">
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-5 border border-slate-200">
              <CreditCard size={40} className="text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">No flashcard decks yet</h3>
            <p className="text-slate-600 font-medium">
              {searchTerm ? `No results for "${searchTerm}"` : 'Generate your first AI flashcard deck from a document!'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FlashcardsSection;
