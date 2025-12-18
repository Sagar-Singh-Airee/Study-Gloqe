// src/services/flashcardService.js - 🏆 ULTIMATE ENTERPRISE EDITION 2025
import { db, functions } from '@shared/config/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch,
  updateDoc,
  deleteDoc,
  increment,
  Timestamp
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { eventBus, EVENT_TYPES } from '@shared/services/eventBus';

// ==================== 🔧 CONFIGURATION ====================

const CONFIG = {
  MIN_CONTENT_LENGTH: 50,
  MAX_CONTENT_LENGTH: 50000,
  MAX_CARDS_PER_DECK: 100,
  MIN_CARDS_PER_DECK: 1,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  CACHE_TTL: 10 * 60 * 1000, // 10 minutes
  AI_TIMEOUT: 60000, // 60 seconds
  BATCH_SIZE: 500,

  // Spaced Repetition (SM-2 Algorithm)
  SM2: {
    INITIAL_INTERVAL: 1,
    INITIAL_EASE_FACTOR: 2.5,
    MIN_EASE_FACTOR: 1.3,
    EASE_BONUS: 0.15,
    EASE_PENALTY: 0.2,
    HARD_INTERVAL_MULTIPLIER: 1.2,
    GOOD_INTERVAL_MULTIPLIER: 2.5,
    EASY_INTERVAL_MULTIPLIER: 4.0
  },

  // AI Models
  AI_MODELS: {
    GEMINI_FLASH: 'gemini-2.0-flash-exp',
    GEMINI_PRO: 'gemini-1.5-pro-latest',
    GEMINI_FLASH_THINKING: 'gemini-2.0-flash-thinking-exp'
  }
};

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

// ==================== 💾 CACHE SYSTEM ====================

class FlashcardCache {
  constructor() {
    this.cache = new Map();
    this.generationCache = new Map();
  }

  set(key, value, ttl = CONFIG.CACHE_TTL) {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl
    });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  delete(key) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
    this.generationCache.clear();
  }

  setGenerationCache(documentId, cardCount, flashcards) {
    const key = `gen_${documentId}_${cardCount}`;
    this.generationCache.set(key, {
      flashcards,
      timestamp: Date.now()
    });
  }

  getGenerationCache(documentId, cardCount) {
    const key = `gen_${documentId}_${cardCount}`;
    const item = this.generationCache.get(key);

    if (!item) return null;
    if (Date.now() - item.timestamp > 5 * 60 * 1000) { // 5 min TTL
      this.generationCache.delete(key);
      return null;
    }

    return item.flashcards;
  }
}

const flashcardCache = new FlashcardCache();

// ==================== 🔄 RETRY MECHANISM ====================

const retryOperation = async (operation, attempts = CONFIG.RETRY_ATTEMPTS, delay = CONFIG.RETRY_DELAY) => {
  for (let i = 0; i < attempts; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === attempts - 1) throw error;

      console.warn(`⚠️ Attempt ${i + 1} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
};

// ==================== 📝 CONTENT EXTRACTION ====================

/**
 * Extract text content with intelligent fallbacks
 */
const extractDocumentContent = (documentData) => {
  const possibleFields = [
    'extractedText',
    'content',
    'text',
    'body',
    'fullText',
    'description',
    'summary',
    'notes',
    'fileContent',
    'pageContent',
    'data'
  ];

  for (const field of possibleFields) {
    const value = documentData[field];
    if (value && typeof value === 'string' && value.trim().length >= CONFIG.MIN_CONTENT_LENGTH) {
      console.log(`✓ Found content in field: ${field} (${value.length} chars)`);
      return value.trim();
    }
  }

  // Try nested content
  if (documentData.file?.content) {
    console.log('✓ Found content in file.content');
    return documentData.file.content.trim();
  }

  // Extract from largest string field
  const allStringFields = Object.entries(documentData)
    .filter(([key, value]) => typeof value === 'string' && value.length >= CONFIG.MIN_CONTENT_LENGTH)
    .sort((a, b) => b[1].length - a[1].length);

  if (allStringFields.length > 0) {
    console.log(`✓ Using largest text field: ${allStringFields[0][0]}`);
    return allStringFields[0][1].trim();
  }

  console.error('Available fields:', Object.keys(documentData));
  return '';
};

/**
 * Preprocess content for better AI generation
 */
const preprocessContent = (content) => {
  let processed = content;

  // Remove excessive whitespace
  processed = processed.replace(/\s+/g, ' ');

  // Remove URLs
  processed = processed.replace(/https?:\/\/\S+/g, '');

  // Remove excessive punctuation
  processed = processed.replace(/[!.?]{3,}/g, '.');

  // Split into sentences and remove very short ones
  const sentences = processed.split(/[.!?]+/).filter(s => s.trim().length > 10);

  return sentences.join('. ') + '.';
};

/**
 * Analyze content and suggest optimal parameters
 */
export const analyzeContent = (content) => {
  const analysis = {
    length: content.length,
    wordCount: content.split(/\s+/).length,
    sentenceCount: content.split(/[.!?]+/).filter(s => s.trim().length > 5).length,
    paragraphCount: content.split(/\n\n+/).length,
    complexity: 'medium',
    suggestedCardCount: 10,
    estimatedGenerationTime: 15
  };

  // Calculate complexity
  const avgWordLength = content.split(/\s+/).reduce((sum, word) => sum + word.length, 0) / analysis.wordCount;
  const avgSentenceLength = analysis.wordCount / analysis.sentenceCount;

  if (avgWordLength > 6 || avgSentenceLength > 20) {
    analysis.complexity = 'high';
  } else if (avgWordLength < 4 || avgSentenceLength < 10) {
    analysis.complexity = 'low';
  }

  // Suggest card count based on content
  if (analysis.wordCount < 100) {
    analysis.suggestedCardCount = 3;
  } else if (analysis.wordCount < 300) {
    analysis.suggestedCardCount = 5;
  } else if (analysis.wordCount < 500) {
    analysis.suggestedCardCount = 8;
  } else if (analysis.wordCount < 1000) {
    analysis.suggestedCardCount = 12;
  } else if (analysis.wordCount < 2000) {
    analysis.suggestedCardCount = 20;
  } else {
    analysis.suggestedCardCount = 30;
  }

  // Estimate generation time
  analysis.estimatedGenerationTime = Math.ceil(analysis.suggestedCardCount * 1.5);

  return analysis;
};

// ==================== 🤖 AI GENERATION ====================

/**
 * Generate flashcards with advanced AI (Gemini 2.0)
 */
export const generateFlashcardsWithGemini = async (
  documentId,
  cardCount = 20,
  options = {}
) => {
  try {
    const {
      difficulty = 'medium',
      focusArea = null,
      includeExamples = false,
      language = 'English',
      aiModel = CONFIG.AI_MODELS.GEMINI_FLASH
    } = options;

    console.log('🤖 Starting flashcard generation...');

    // Check cache first
    const cached = flashcardCache.getGenerationCache(documentId, cardCount);
    if (cached && !options.forceRegenerate) {
      console.log('💾 Using cached flashcards');
      return cached;
    }

    // Validate inputs
    if (!documentId) throw new Error('Document ID is required');
    if (cardCount < CONFIG.MIN_CARDS_PER_DECK || cardCount > CONFIG.MAX_CARDS_PER_DECK) {
      throw new Error(`Card count must be between ${CONFIG.MIN_CARDS_PER_DECK} and ${CONFIG.MAX_CARDS_PER_DECK}`);
    }
    if (!import.meta.env.VITE_GEMINI_API_KEY) {
      throw new Error('Gemini API key not configured. Add VITE_GEMINI_API_KEY to .env');
    }

    // Fetch document
    console.log(`📄 Fetching document: ${documentId}`);
    const docRef = doc(db, 'documents', documentId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error(`Document not found: ${documentId}`);
    }

    const documentData = docSnap.data();

    // Extract and preprocess content
    let content = extractDocumentContent(documentData);

    if (!content) {
      throw new Error(
        `No text content found in document. Available fields: ${Object.keys(documentData).join(', ')}`
      );
    }

    if (content.length < CONFIG.MIN_CONTENT_LENGTH) {
      throw new Error(
        `Content too short (${content.length} chars). Minimum: ${CONFIG.MIN_CONTENT_LENGTH} chars.`
      );
    }

    content = preprocessContent(content);

    // Analyze content
    const analysis = analyzeContent(content);
    console.log(`📊 Content analysis:`, analysis);

    // Adjust card count
    const optimalCardCount = Math.min(cardCount, analysis.suggestedCardCount);
    if (optimalCardCount < cardCount) {
      console.warn(`Adjusting from ${cardCount} to ${optimalCardCount} cards based on content`);
    }

    // Prepare AI model
    const model = genAI.getGenerativeModel({
      model: aiModel,
      generationConfig: {
        temperature: difficulty === 'easy' ? 0.5 : difficulty === 'hard' ? 0.9 : 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 8192
      }
    });

    // Craft enhanced prompt
    const prompt = buildEnhancedPrompt(content, optimalCardCount, {
      difficulty,
      focusArea,
      includeExamples,
      language,
      subject: documentData.subject || 'General Studies'
    });

    console.log('🚀 Calling Gemini API...');

    // Call AI with timeout
    const result = await Promise.race([
      model.generateContent(prompt),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('AI generation timeout')), CONFIG.AI_TIMEOUT)
      )
    ]);

    const responseText = result.response.text().trim();
    console.log('✅ AI response received');

    // Parse and validate flashcards
    const flashcards = parseAndValidateFlashcards(responseText, optimalCardCount);

    // Calculate quality score
    const qualityScore = calculateFlashcardQuality(flashcards, content);
    console.log(`⭐ Quality score: ${qualityScore}%`);

    // Cache the result
    flashcardCache.setGenerationCache(documentId, cardCount, flashcards);

    // Publish event
    eventBus.publish(EVENT_TYPES.FLASHCARDS_GENERATED, {
      documentId,
      cardCount: flashcards.length,
      qualityScore,
      difficulty,
      timestamp: new Date().toISOString()
    });

    console.log(`🎉 Generated ${flashcards.length} flashcards successfully`);

    return flashcards;

  } catch (error) {
    console.error('❌ Flashcard generation error:', error);

    // Handle specific errors
    if (error.message?.includes('API key')) {
      throw new Error('Invalid Gemini API key. Check your .env configuration.');
    }

    if (error.message?.includes('quota') || error.message?.includes('429')) {
      throw new Error('API quota exceeded. Please wait and try again.');
    }

    if (error.message?.includes('timeout')) {
      throw new Error('Generation took too long. Try with fewer cards or shorter content.');
    }

    throw new Error(`Generation failed: ${error.message}`);
  }
};

/**
 * Build enhanced AI prompt
 */
const buildEnhancedPrompt = (content, cardCount, options) => {
  const { difficulty, focusArea, includeExamples, language, subject } = options;

  let difficultyInstructions = '';
  if (difficulty === 'easy') {
    difficultyInstructions = 'Focus on basic definitions and simple recall questions.';
  } else if (difficulty === 'hard') {
    difficultyInstructions = 'Create challenging questions that require deep understanding and critical thinking.';
  } else {
    difficultyInstructions = 'Mix of factual recall and conceptual understanding questions.';
  }

  let focusInstruction = focusArea
    ? `Pay special attention to topics related to: ${focusArea}.`
    : '';

  let exampleInstruction = includeExamples
    ? 'Include concrete examples in answers when helpful.'
    : 'Keep answers concise and focused.';

  return `You are an expert educator creating ${difficulty} difficulty flashcards for ${subject}.

Generate EXACTLY ${cardCount} high-quality flashcards in ${language}.

REQUIREMENTS:
1. Return ONLY valid JSON array - no markdown, no explanations
2. Each card: {"question": "...", "answer": "...", "difficulty": "${difficulty}", "category": "..."}
3. ${difficultyInstructions}
4. ${focusInstruction}
5. ${exampleInstruction}
6. Questions must be specific, clear, and unambiguous
7. Answers must be accurate and complete
8. Use spaced repetition principles - vary question types
9. Cover all key concepts from the content
10. Add "category" field to organize cards by topic

JSON FORMAT (return ONLY this):
[
  {
    "question": "Clear, specific question?",
    "answer": "Accurate, complete answer",
    "difficulty": "${difficulty}",
    "category": "Topic name"
  }
]

CONTENT:
${content.slice(0, CONFIG.MAX_CONTENT_LENGTH)}

Generate ${cardCount} flashcards as JSON array:`;
};

/**
 * Parse and validate AI response
 */
const parseAndValidateFlashcards = (responseText, expectedCount) => {
  try {
    // Clean response
    let jsonText = responseText
      .replace(/```/g, '')
      .replace(/```javascript\s*/gi, '')
      .trim();

    // Extract JSON array
    const jsonStart = jsonText.indexOf('[');
    const jsonEnd = jsonText.lastIndexOf(']');

    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error('No JSON array found in AI response');
    }

    jsonText = jsonText.substring(jsonStart, jsonEnd + 1);
    const flashcards = JSON.parse(jsonText);

    if (!Array.isArray(flashcards)) {
      throw new Error('Response is not an array');
    }

    // Validate and enhance each card
    const validFlashcards = flashcards
      .filter((card, index) => {
        const isValid =
          card &&
          card.question &&
          card.answer &&
          typeof card.question === 'string' &&
          typeof card.answer === 'string' &&
          card.question.trim().length > 5 &&
          card.answer.trim().length > 3;

        if (!isValid) {
          console.warn(`Skipping invalid card at index ${index}`);
        }

        return isValid;
      })
      .map((card, index) => ({
        question: card.question.trim(),
        answer: card.answer.trim(),
        difficulty: card.difficulty || 'medium',
        category: card.category || 'General',
        order: index,
        generatedAt: new Date().toISOString()
      }));

    if (validFlashcards.length === 0) {
      throw new Error('No valid flashcards generated');
    }

    const successRate = Math.round((validFlashcards.length / flashcards.length) * 100);
    console.log(`✓ Validated ${validFlashcards.length}/${flashcards.length} cards (${successRate}%)`);

    return validFlashcards;

  } catch (error) {
    console.error('Parse error:', error);
    console.error('Response preview:', responseText.slice(0, 500));
    throw new Error(`Failed to parse AI response: ${error.message}`);
  }
};

/**
 * Calculate flashcard quality score
 */
const calculateFlashcardQuality = (flashcards, originalContent) => {
  let score = 0;

  // Diversity score (30 points)
  const uniqueCategories = new Set(flashcards.map(c => c.category)).size;
  score += Math.min(uniqueCategories / flashcards.length, 0.5) * 30;

  // Completeness score (30 points)
  const avgQuestionLength = flashcards.reduce((sum, c) => sum + c.question.length, 0) / flashcards.length;
  const avgAnswerLength = flashcards.reduce((sum, c) => sum + c.answer.length, 0) / flashcards.length;

  if (avgQuestionLength > 20 && avgQuestionLength < 150) score += 15;
  if (avgAnswerLength > 10 && avgAnswerLength < 300) score += 15;

  // Coverage score (40 points)
  const contentWords = new Set(originalContent.toLowerCase().split(/\s+/).filter(w => w.length > 4));
  const cardWords = new Set(
    flashcards.flatMap(c =>
      (c.question + ' ' + c.answer).toLowerCase().split(/\s+/).filter(w => w.length > 4)
    )
  );

  const overlap = [...cardWords].filter(w => contentWords.has(w)).length;
  const coverageRatio = overlap / Math.min(contentWords.size, 100);
  score += Math.min(coverageRatio, 1) * 40;

  return Math.round(score);
};

// ==================== 📚 DECK MANAGEMENT ====================

/**
 * Create flashcard deck with enhanced features
 */
export const createFlashcardDeck = async (userId, documentId, flashcards, metadata = {}) => {
  try {
    console.log(`📚 Creating deck with ${flashcards.length} cards...`);

    // Validate inputs
    if (!userId) throw new Error('User ID required');
    if (!documentId) throw new Error('Document ID required');
    if (!Array.isArray(flashcards) || flashcards.length === 0) {
      throw new Error('At least one flashcard required');
    }

    // Validate flashcards
    const invalidCards = flashcards.filter(c => !c.question || !c.answer);
    if (invalidCards.length > 0) {
      throw new Error(`${invalidCards.length} invalid card(s) found`);
    }

    const batch = writeBatch(db);

    // Create deck document
    const deckRef = doc(collection(db, 'flashcardDecks'));
    const deckData = {
      userId,
      documentId,
      title: metadata.title || 'Untitled Deck',
      description: metadata.description || '',
      subject: metadata.subject || 'General Studies',

      // Card statistics
      cardCount: flashcards.length,
      masteredCount: 0,
      learningCount: 0,
      newCount: flashcards.length,

      // Study statistics
      totalReviews: 0,
      correctReviews: 0,
      averageAccuracy: 0,

      // Metadata
      difficulty: metadata.difficulty || 'medium',
      tags: metadata.tags || [],
      categories: [...new Set(flashcards.map(c => c.category || 'General'))],

      // Status
      isActive: true,
      isPublic: metadata.isPublic || false,

      // Timestamps
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastStudied: null,
      nextReviewDate: null,

      // Analytics
      analytics: {
        qualityScore: metadata.qualityScore || 0,
        generatedBy: 'ai',
        version: '2.0'
      }
    };

    batch.set(deckRef, deckData);

    // Create cards with SM-2 algorithm initialization
    flashcards.forEach((card, index) => {
      const cardRef = doc(collection(db, `flashcardDecks/${deckRef.id}/cards`));
      batch.set(cardRef, {
        question: card.question,
        answer: card.answer,
        difficulty: card.difficulty || 'medium',
        category: card.category || 'General',
        order: index,

        // SM-2 Algorithm fields
        easeFactor: CONFIG.SM2.INITIAL_EASE_FACTOR,
        interval: 0,
        repetitions: 0,
        nextReview: null,

        // Performance tracking
        reviewCount: 0,
        correctCount: 0,
        incorrectCount: 0,
        consecutiveCorrect: 0,
        confidenceLevel: 0,

        // Status
        status: 'new', // new, learning, review, mastered
        lastReviewed: null,
        lastResult: null,

        // Timestamps
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    });

    await retryOperation(() => batch.commit());
    console.log(`✅ Deck created: ${deckRef.id}`);

    // Clear cache
    flashcardCache.delete(`deck_${deckRef.id}`);
    flashcardCache.delete(`user_decks_${userId}`);

    // Update document stats
    await updateDocumentFlashcardCount(documentId, 1);

    // Publish event
    eventBus.publish(EVENT_TYPES.FLASHCARD_DECK_CREATED, {
      userId,
      deckId: deckRef.id,
      documentId,
      cardCount: flashcards.length,
      timestamp: new Date().toISOString()
    });

    return deckRef.id;

  } catch (error) {
    console.error('❌ Deck creation error:', error);

    if (error.code === 'permission-denied') {
      throw new Error('Permission denied. Check authentication.');
    }

    if (error.code === 'resource-exhausted') {
      throw new Error('Too many cards. Try creating smaller decks.');
    }

    throw new Error(`Failed to create deck: ${error.message}`);
  }
};

/**
 * Get deck with cards
 */
export const getDeckWithCards = async (deckId, options = {}) => {
  try {
    const { includeCards = true, status = null } = options;

    // Check cache
    const cacheKey = `deck_${deckId}_${includeCards}_${status}`;
    const cached = flashcardCache.get(cacheKey);
    if (cached) {
      console.log('💾 Using cached deck');
      return cached;
    }

    // Get deck
    const deckRef = doc(db, 'flashcardDecks', deckId);
    const deckSnap = await getDoc(deckRef);

    if (!deckSnap.exists()) {
      throw new Error('Deck not found');
    }

    const deck = {
      id: deckSnap.id,
      ...deckSnap.data()
    };

    // Get cards if requested
    if (includeCards) {
      let q = query(
        collection(db, `flashcardDecks/${deckId}/cards`),
        orderBy('order', 'asc')
      );

      if (status) {
        q = query(q, where('status', '==', status));
      }

      const cardsSnap = await getDocs(q);
      deck.cards = cardsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    }

    // Cache result
    flashcardCache.set(cacheKey, deck);

    return deck;

  } catch (error) {
    console.error('Error getting deck:', error);
    throw error;
  }
};

/**
 * Get user's flashcard decks
 */
export const getUserDecks = async (userId, options = {}) => {
  try {
    const { limitCount = 50, includeStats = true } = options;

    const cacheKey = `user_decks_${userId}`;
    const cached = flashcardCache.get(cacheKey);
    if (cached) return cached;

    const q = query(
      collection(db, 'flashcardDecks'),
      where('userId', '==', userId),
      where('isActive', '==', true),
      orderBy('updatedAt', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    const decks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    flashcardCache.set(cacheKey, decks);

    return decks;

  } catch (error) {
    console.error('Error getting user decks:', error);
    return [];
  }
};

/**
 * Update card after review (SM-2 Algorithm)
 */
export const reviewCard = async (deckId, cardId, quality) => {
  try {
    // Quality: 0 = fail, 1 = hard, 2 = good, 3 = easy
    if (quality < 0 || quality > 3) {
      throw new Error('Quality must be 0-3');
    }

    const cardRef = doc(db, `flashcardDecks/${deckId}/cards`, cardId);
    const cardSnap = await getDoc(cardRef);

    if (!cardSnap.exists()) {
      throw new Error('Card not found');
    }

    const card = cardSnap.data();

    // Calculate new values using SM-2
    const sm2Result = calculateSM2(card, quality);

    // Update card
    await updateDoc(cardRef, {
      ...sm2Result,
      reviewCount: increment(1),
      correctCount: quality >= 2 ? increment(1) : card.correctCount,
      incorrectCount: quality < 2 ? increment(1) : card.incorrectCount,
      consecutiveCorrect: quality >= 2 ? increment(1) : 0,
      lastReviewed: serverTimestamp(),
      lastResult: quality >= 2 ? 'correct' : 'incorrect',
      confidenceLevel: Math.round((sm2Result.repetitions / (sm2Result.repetitions + 5)) * 100),
      updatedAt: serverTimestamp()
    });

    // Update deck statistics
    await updateDeckStats(deckId);

    // Publish event
    eventBus.publish(EVENT_TYPES.FLASHCARD_REVIEWED, {
      deckId,
      cardId,
      quality,
      nextReview: sm2Result.nextReview,
      timestamp: new Date().toISOString()
    });

    console.log(`✅ Card reviewed: quality=${quality}, nextReview=${sm2Result.nextReview}`);

    return sm2Result;

  } catch (error) {
    console.error('Error reviewing card:', error);
    throw error;
  }
};

/**
 * SM-2 Spaced Repetition Algorithm
 */
const calculateSM2 = (card, quality) => {
  const { easeFactor, interval, repetitions } = card;

  let newEaseFactor = easeFactor;
  let newInterval = interval;
  let newRepetitions = repetitions;
  let newStatus = card.status;

  // Update ease factor
  if (quality >= 2) {
    newEaseFactor = Math.max(
      CONFIG.SM2.MIN_EASE_FACTOR,
      easeFactor + (0.1 - (3 - quality) * (0.08 + (3 - quality) * 0.02))
    );
    newRepetitions++;
  } else {
    newEaseFactor = Math.max(
      CONFIG.SM2.MIN_EASE_FACTOR,
      easeFactor - CONFIG.SM2.EASE_PENALTY
    );
    newRepetitions = 0;
  }

  // Calculate new interval
  if (quality < 2) {
    // Failed - reset to 1 day
    newInterval = 1;
    newStatus = 'learning';
  } else if (newRepetitions === 1) {
    // First success
    newInterval = CONFIG.SM2.INITIAL_INTERVAL;
    newStatus = 'learning';
  } else if (newRepetitions === 2) {
    // Second success
    newInterval = 6;
    newStatus = 'review';
  } else {
    // Subsequent reviews
    if (quality === 1) {
      newInterval = Math.ceil(newInterval * CONFIG.SM2.HARD_INTERVAL_MULTIPLIER);
    } else if (quality === 2) {
      newInterval = Math.ceil(newInterval * CONFIG.SM2.GOOD_INTERVAL_MULTIPLIER);
    } else {
      newInterval = Math.ceil(newInterval * CONFIG.SM2.EASY_INTERVAL_MULTIPLIER);
    }

    if (newRepetitions >= 5 && newEaseFactor > 2.3) {
      newStatus = 'mastered';
    }
  }

  // Calculate next review date
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + newInterval);

  return {
    easeFactor: newEaseFactor,
    interval: newInterval,
    repetitions: newRepetitions,
    status: newStatus,
    nextReview: Timestamp.fromDate(nextReview)
  };
};

/**
 * Update deck statistics
 */
const updateDeckStats = async (deckId) => {
  try {
    const cardsSnap = await getDocs(
      collection(db, `flashcardDecks/${deckId}/cards`)
    );

    let newCount = 0;
    let learningCount = 0;
    let reviewCount = 0;
    let masteredCount = 0;
    let totalReviews = 0;
    let correctReviews = 0;

    cardsSnap.forEach(doc => {
      const card = doc.data();

      if (card.status === 'new') newCount++;
      else if (card.status === 'learning') learningCount++;
      else if (card.status === 'review') reviewCount++;
      else if (card.status === 'mastered') masteredCount++;

      totalReviews += card.reviewCount || 0;
      correctReviews += card.correctCount || 0;
    });

    const averageAccuracy = totalReviews > 0
      ? Math.round((correctReviews / totalReviews) * 100)
      : 0;

    await updateDoc(doc(db, 'flashcardDecks', deckId), {
      newCount,
      learningCount,
      masteredCount,
      totalReviews,
      correctReviews,
      averageAccuracy,
      updatedAt: serverTimestamp()
    });

    flashcardCache.delete(`deck_${deckId}`);

  } catch (error) {
    console.warn('Failed to update deck stats:', error);
  }
};

/**
 * Get cards due for review
 */
export const getCardsForReview = async (deckId, limitCount = 20) => {
  try {
    const now = Timestamp.now();

    const q = query(
      collection(db, `flashcardDecks/${deckId}/cards`),
      where('nextReview', '<=', now),
      orderBy('nextReview', 'asc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

  } catch (error) {
    console.error('Error getting review cards:', error);
    return [];
  }
};

/**
 * Delete flashcard deck
 */
export const deleteDeck = async (deckId, userId) => {
  try {
    const deckRef = doc(db, 'flashcardDecks', deckId);
    const deckSnap = await getDoc(deckRef);

    if (!deckSnap.exists()) {
      throw new Error('Deck not found');
    }

    const deckData = deckSnap.data();

    if (deckData.userId !== userId) {
      throw new Error('Permission denied');
    }

    // Delete all cards
    const cardsSnap = await getDocs(
      collection(db, `flashcardDecks/${deckId}/cards`)
    );

    const batch = writeBatch(db);

    cardsSnap.forEach(doc => {
      batch.delete(doc.ref);
    });

    batch.delete(deckRef);

    await batch.commit();

    // Clear cache
    flashcardCache.delete(`deck_${deckId}`);
    flashcardCache.delete(`user_decks_${userId}`);

    // Update document count
    await updateDocumentFlashcardCount(deckData.documentId, -1);

    console.log(`✅ Deck deleted: ${deckId}`);

    return { success: true };

  } catch (error) {
    console.error('Error deleting deck:', error);
    throw error;
  }
};

/**
 * Update document flashcard count
 */
const updateDocumentFlashcardCount = async (documentId, delta) => {
  try {
    const docRef = doc(db, 'documents', documentId);
    await updateDoc(docRef, {
      flashcardCount: increment(delta)
    });
  } catch (error) {
    console.warn('Failed to update document count:', error);
  }
};

/**
 * Export deck as JSON
 */
export const exportDeck = async (deckId) => {
  try {
    const deck = await getDeckWithCards(deckId, { includeCards: true });

    const exportData = {
      title: deck.title,
      description: deck.description,
      subject: deck.subject,
      cards: deck.cards.map(card => ({
        question: card.question,
        answer: card.answer,
        category: card.category
      })),
      exportedAt: new Date().toISOString(),
      version: '2.0'
    };

    return JSON.stringify(exportData, null, 2);

  } catch (error) {
    console.error('Error exporting deck:', error);
    throw error;
  }
};

/**
 * Clear flashcard cache
 */
export const clearFlashcardCache = () => {
  flashcardCache.clear();
  console.log('🗑️ Flashcard cache cleared');
};

// ==================== 📦 EXPORTS ====================

export default {
  // Generation
  generateFlashcardsWithGemini,
  analyzeContent,

  // Deck management
  createFlashcardDeck,
  getDeckWithCards,
  getUserDecks,
  deleteDeck,
  exportDeck,

  // Review system
  reviewCard,
  getCardsForReview,

  // Utilities
  clearFlashcardCache,
  validateGeminiApiKey: () => !!import.meta.env.VITE_GEMINI_API_KEY
};
