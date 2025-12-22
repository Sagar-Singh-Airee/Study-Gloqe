// src/components/features/FlashcardsSection.jsx - PREMIUM LIGHT COMPACT EDITION 💎

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard, Search, Brain, Loader2, Sparkles, BookOpen,
  Target, Play, Trash2, Award, Clock, Zap, TrendingUp,
  LayoutGrid, List, ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@auth/contexts/AuthContext';
import {
  collection, query, where, orderBy, onSnapshot, deleteDoc, doc
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
  const subjectColors = {
    'Mathematics': 'bg-blue-50 text-blue-700 border-blue-200',
    'Physics': 'bg-teal-50 text-teal-700 border-teal-200',
    'Chemistry': 'bg-cyan-50 text-cyan-700 border-cyan-200',
    'Biology': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Computer Science': 'bg-indigo-50 text-indigo-700 border-indigo-200',
    'History': 'bg-amber-50 text-amber-700 border-amber-200',
    'Economics': 'bg-violet-50 text-violet-700 border-violet-200',
    'Literature': 'bg-rose-50 text-rose-700 border-rose-200',
    'Psychology': 'bg-purple-50 text-purple-700 border-purple-200',
    'Engineering': 'bg-orange-50 text-orange-700 border-orange-200',
    'default': 'bg-slate-50 text-slate-700 border-slate-200'
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
      const subject = deck.subject || 'General';
      if (!grouped[subject]) grouped[subject] = [];
      grouped[subject].push(deck);
    });
    return grouped;
  }, [decks]);

  // Filter decks
  const filteredDecks = useMemo(() => {
    let filtered = decks;

    if (selectedSubject !== 'all') {
      filtered = filtered.filter(deck =>
        (deck.subject || 'General') === selectedSubject
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

  // Generate deck handler
  const handleGenerateDeck = async (document) => {
    if (!document?.id || !user?.uid) {
      toast.error('Invalid document or user');
      return;
    }

    const optimalCardCount = calculateOptimalCardCount(document);
    setGeneratingDeck(document.id);
    const toastId = toast.loading(`Generating ${optimalCardCount} flashcards...`);

    try {
      const flashcards = await generateFlashcardsWithGemini(document.id, optimalCardCount);

      if (!flashcards || flashcards.length === 0) {
        throw new Error('No flashcards generated. Please try again.');
      }

      const deckId = await createFlashcardDeck(user.uid, document.id, flashcards, {
        title: `${document.title || 'Flashcards'}`,
        description: `AI-generated flashcard deck with ${flashcards.length} cards`,
        subject: document.subject || 'General',
        cardCount: flashcards.length,
        masteredCount: 0,
        reviewCount: 0,
        lastStudied: null
      });

      toast.success(`Generated ${flashcards.length} flashcards!`, { id: toastId });

      setTimeout(() => {
        navigate(`/flashcards/${deckId}`, {
          state: {
            fromGeneration: true,
            cardCount: flashcards.length,
            documentTitle: document.title
          }
        });
      }, 500);

    } catch (error) {
      console.error('Flashcard generation error:', error);
      toast.error(error.message || 'Failed to generate flashcards', { id: toastId });
    } finally {
      setGeneratingDeck(null);
    }
  };

  // Delete deck handler
  const handleDeleteDeck = async (deckId, deckTitle) => {
    if (!confirm(`Delete "${deckTitle}"?`)) return;

    const toastId = toast.loading('Deleting deck...');
    try {
      await deleteDoc(doc(db, 'flashcardDecks', deckId));
      toast.success('Deck deleted', { id: toastId });
    } catch (error) {
      toast.error('Failed to delete deck', { id: toastId });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 bg-white">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-slate-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-600">Loading flashcards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Subtle background */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-white via-teal-50/20 to-blue-50/20" />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Compact Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-teal-500 to-blue-600 rounded-xl shadow-sm">
                <CreditCard className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  AI Flashcards
                </h1>
                <p className="text-xs text-slate-600 mt-0.5">
                  Master concepts with intelligent flashcards
                </p>
              </div>
            </div>
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all"
            >
              {viewMode === 'grid' ? (
                <List size={18} className="text-slate-700" />
              ) : (
                <LayoutGrid size={18} className="text-slate-700" />
              )}
            </button>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="mb-6 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search flashcard decks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl 
                       focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 
                       transition-all text-sm text-slate-900 placeholder:text-slate-400"
            />
          </div>

          {/* Subject Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedSubject('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${selectedSubject === 'all'
                  ? 'bg-gradient-to-r from-teal-500 to-blue-600 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
            >
              All ({decks.length})
            </button>

            {Object.entries(decksBySubject).map(([subject, subjectDecks]) => (
              <button
                key={subject}
                onClick={() => setSelectedSubject(subject)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap border ${selectedSubject === subject
                    ? subjectColors[subject] || subjectColors.default
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
              >
                {subject} ({subjectDecks.length})
              </button>
            ))}
          </div>
        </div>

        {/* Generate from Documents */}
        {documents.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={16} className="text-teal-600" strokeWidth={2.5} />
              <h3 className="text-sm font-bold text-slate-900">Generate New Deck</h3>
            </div>
            <div className={`grid gap-3 ${viewMode === 'grid' ? 'grid-cols-3' : 'grid-cols-1'}`}>
              {documents.slice(0, 6).map((doc) => {
                const optimalCount = calculateOptimalCardCount(doc);
                const subjectStyle = subjectColors[doc.subject] || subjectColors.default;

                return (
                  <motion.div
                    key={doc.id}
                    whileHover={{ y: -2 }}
                    className="bg-white border border-slate-200 rounded-xl p-3 hover:border-teal-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start gap-2 mb-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <BookOpen size={16} className="text-white" strokeWidth={2.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 truncate mb-1">
                          {doc.title}
                        </h4>
                        {doc.subject && (
                          <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md border ${subjectStyle}`}>
                            {doc.subject}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mb-2 flex items-center gap-1.5 text-[11px] text-slate-500">
                      <Zap size={10} className="text-teal-600" />
                      <span className="font-semibold">~{optimalCount} cards</span>
                    </div>

                    <button
                      onClick={() => handleGenerateDeck(doc)}
                      disabled={generatingDeck === doc.id}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-teal-500 to-blue-600 text-white rounded-lg text-xs font-bold hover:shadow-sm transition-all disabled:opacity-50"
                    >
                      {generatingDeck === doc.id ? (
                        <>
                          <Loader2 size={12} className="animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles size={12} />
                          Generate Deck
                        </>
                      )}
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Flashcard Decks */}
        {filteredDecks.length > 0 ? (
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-4">Your Flashcard Decks</h3>
            <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-3' : 'grid-cols-1'}`}>
              {filteredDecks.map((deck) => {
                const subject = deck.subject || 'General';
                const subjectStyle = subjectColors[subject] || subjectColors.default;
                const masteryPercentage = deck.cardCount > 0
                  ? Math.round((deck.masteredCount / deck.cardCount) * 100)
                  : 0;

                return (
                  <motion.div
                    key={deck.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ y: -2 }}
                    className="bg-white border border-slate-200 rounded-xl p-4 hover:border-teal-300 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start gap-2.5 mb-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                        <CreditCard size={18} className="text-white" strokeWidth={2.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-slate-900 mb-1.5 line-clamp-2 leading-tight">
                          {deck.title}
                        </h4>
                        <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md border ${subjectStyle}`}>
                          {subject}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5 mb-3">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-600 font-medium">Total Cards</span>
                        <span className="font-bold text-slate-900">{deck.cardCount || 0}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-600 font-medium">Mastered</span>
                        <span className="font-bold text-emerald-700">{deck.masteredCount || 0}</span>
                      </div>
                      {deck.reviewCount > 0 && (
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-600 font-medium">Reviews</span>
                          <span className="font-bold text-teal-700">{deck.reviewCount}</span>
                        </div>
                      )}
                      {deck.lastStudied && (
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 pt-1.5 border-t border-slate-100">
                          <Clock size={10} />
                          Last: {new Date(deck.lastStudied.seconds * 1000).toLocaleDateString()}
                        </div>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div className="flex justify-between text-[10px] font-semibold text-slate-600 mb-1">
                        <span>Mastery</span>
                        <span className={masteryPercentage === 100 ? 'text-emerald-600' : ''}>
                          {masteryPercentage}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${masteryPercentage}%` }}
                          transition={{ duration: 0.5 }}
                          className={`h-full ${masteryPercentage === 100
                              ? 'bg-gradient-to-r from-emerald-500 to-emerald-600'
                              : 'bg-gradient-to-r from-teal-500 to-blue-600'
                            }`}
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/flashcards/${deck.id}`)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-teal-500 to-blue-600 text-white rounded-lg text-xs font-bold hover:shadow-sm transition-all"
                      >
                        <Play size={12} />
                        Study Now
                      </button>
                      <button
                        onClick={() => handleDeleteDeck(deck.id, deck.title)}
                        className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 border border-rose-200 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 border border-slate-200">
              <CreditCard size={32} className="text-slate-400" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">No flashcard decks yet</h3>
            <p className="text-xs text-slate-600">
              {searchTerm ? `No results for "${searchTerm}"` : 'Generate your first deck from a document'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FlashcardsSection;
