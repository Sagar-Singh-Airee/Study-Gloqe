// src/services/flashcardService.js
import { db } from '@/config/firebase';
import {
  collection,
  doc,
  getDoc,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

/**
 * Extract text content from document with multiple fallback strategies
 * @param {Object} documentData - Firestore document data
 * @returns {string} - Extracted text content
 */
const extractDocumentContent = (documentData) => {
  // Try multiple possible field names
  const possibleFields = [
    'content',
    'text',
    'extractedText',
    'body',
    'description',
    'summary',
    'notes',
    'fileContent',
    'pageContent',
    'data'
  ];

  for (const field of possibleFields) {
    const value = documentData[field];
    if (value && typeof value === 'string' && value.trim().length > 0) {
      console.log(`✓ Found content in field: ${field} (${value.length} chars)`);
      return value.trim();
    }
  }

  // Try nested content
  if (documentData.file?.content) {
    console.log('✓ Found content in file.content');
    return documentData.file.content.trim();
  }

  // Try to extract from any string field
  const allStringFields = Object.entries(documentData)
    .filter(([key, value]) => typeof value === 'string' && value.length > 50)
    .map(([key, value]) => ({ key, value, length: value.length }))
    .sort((a, b) => b.length - a.length);

  if (allStringFields.length > 0) {
    console.log(`✓ Found text in field: ${allStringFields[0].key}`);
    return allStringFields[0].value.trim();
  }

  // Log available fields for debugging
  console.error('Available document fields:', Object.keys(documentData));
  console.error('Document data sample:', JSON.stringify(documentData, null, 2).slice(0, 500));
  
  return '';
};

/**
 * Generate flashcards using Gemini 2.0 Flash
 * @param {string} documentId - Firestore document ID
 * @param {number} cardCount - Number of flashcards to generate
 * @param {number} minLength - Minimum content length required
 * @returns {Promise<Array<{question: string, answer: string}>>}
 */
export const generateFlashcardsWithGemini = async (
  documentId, 
  cardCount = 20,
  minLength = 50 // Reduced from 100 for more flexibility
) => {
  try {
    // Validate inputs
    if (!documentId) {
      throw new Error('Document ID is required');
    }

    if (cardCount < 1 || cardCount > 100) {
      throw new Error('Card count must be between 1 and 100');
    }

    // Validate API key
    if (!import.meta.env.VITE_GEMINI_API_KEY) {
      throw new Error('Gemini API key is not configured. Please add VITE_GEMINI_API_KEY to your .env file');
    }

    console.log(`Fetching document: ${documentId}`);

    // Fetch document
    const docRef = doc(db, 'documents', documentId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error(`Document not found: ${documentId}`);
    }

    const documentData = docSnap.data();
    console.log('Document retrieved successfully');

    // Extract content with multiple fallbacks
    const content = extractDocumentContent(documentData);

    if (!content) {
      throw new Error(
        'Could not find text content in document. ' +
        'Please ensure your document has a "content", "text", or similar field with the text to study. ' +
        `Available fields: ${Object.keys(documentData).join(', ')}`
      );
    }

    const contentLength = content.length;
    console.log(`Content length: ${contentLength} characters`);

    if (contentLength < minLength) {
      throw new Error(
        `Document content is too short (${contentLength} characters). ` +
        `Minimum required: ${minLength} characters. ` +
        `Please add more content to generate meaningful flashcards.`
      );
    }

    // Adjust card count based on content length
    const recommendedCards = Math.min(
      cardCount,
      Math.floor(contentLength / 100) // ~1 card per 100 chars
    );

    if (recommendedCards < cardCount) {
      console.warn(`Content length suggests ${recommendedCards} cards instead of ${cardCount}`);
    }

    const finalCardCount = Math.max(1, Math.min(cardCount, recommendedCards));
    console.log(`Generating ${finalCardCount} flashcards...`);

    // Prepare Gemini prompt
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
      }
    });

    const prompt = `You are an expert educator creating high-quality flashcards for students.

Based on the following educational content, generate exactly ${finalCardCount} flashcards.

STRICT REQUIREMENTS:
1. Return ONLY a valid JSON array, no markdown, no additional text
2. Each flashcard must have "question" and "answer" fields
3. Questions should be clear, concise, and test understanding
4. Answers should be accurate and educational
5. Cover key concepts, definitions, and important details
6. Use spaced repetition principles - vary difficulty
7. Include both factual recall and conceptual understanding questions
8. Make questions specific and unambiguous
9. Keep answers concise but complete

JSON FORMAT (return ONLY this, nothing else):
[
  {
    "question": "What is [specific concept]?",
    "answer": "Clear, accurate answer"
  }
]

CONTENT TO LEARN:
${content.slice(0, 30000)}

Generate exactly ${finalCardCount} high-quality flashcards as a JSON array:`;

    console.log('Calling Gemini API...');
    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();
    console.log('Gemini API response received');

    // Parse JSON response with robust error handling
    let flashcards;
    try {
      // Clean response - remove all markdown code blocks
      let jsonText = responseText
        .replace(/```json\s*/gi, '')
        .replace(/```javascript\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();
      
      // Remove any leading/trailing text that's not JSON
      const jsonStart = jsonText.indexOf('[');
      const jsonEnd = jsonText.lastIndexOf(']');
      
      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error('No JSON array found in response');
      }
      
      jsonText = jsonText.substring(jsonStart, jsonEnd + 1);
      
      flashcards = JSON.parse(jsonText);
      console.log(`Parsed ${flashcards.length} flashcards from response`);
      
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw response (first 500 chars):', responseText.slice(0, 500));
      
      throw new Error(
        'AI generated invalid response format. This usually means:\n' +
        '1. The AI API is overloaded - try again\n' +
        '2. The content is too complex - try with fewer cards\n' +
        `Parse error: ${parseError.message}`
      );
    }

    // Validate response structure
    if (!Array.isArray(flashcards)) {
      throw new Error('AI response is not an array. Please try again.');
    }

    if (flashcards.length === 0) {
      throw new Error('AI generated no flashcards. Please try again with different content.');
    }

    // Validate and sanitize each flashcard
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
          console.warn(`Skipping invalid flashcard at index ${index}:`, card);
        }
        
        return isValid;
      })
      .map((card, index) => ({
        question: card.question.trim(),
        answer: card.answer.trim(),
        originalIndex: index
      }));

    if (validFlashcards.length === 0) {
      throw new Error(
        'All generated flashcards were invalid. Please try again or use different content.'
      );
    }

    const successRate = ((validFlashcards.length / flashcards.length) * 100).toFixed(0);
    console.log(
      `✓ Successfully generated ${validFlashcards.length}/${flashcards.length} ` +
      `valid flashcards (${successRate}%)`
    );

    return validFlashcards;

  } catch (error) {
    console.error('Gemini flashcard generation error:', error);
    
    // Provide specific, actionable error messages
    if (error.message?.includes('API key')) {
      throw new Error(
        'Invalid Gemini API key. Please check your .env file and ensure ' +
        'VITE_GEMINI_API_KEY is set correctly.'
      );
    }
    
    if (error.message?.includes('quota') || error.message?.includes('429')) {
      throw new Error(
        'Gemini API quota exceeded. Please wait a few minutes and try again, ' +
        'or check your API usage at https://makersuite.google.com/app/apikey'
      );
    }
    
    if (error.message?.includes('400')) {
      throw new Error(
        'Bad request to Gemini API. The content might contain invalid characters. ' +
        'Please try with different content.'
      );
    }

    if (error.message?.includes('500') || error.message?.includes('503')) {
      throw new Error(
        'Gemini API is temporarily unavailable. Please try again in a few moments.'
      );
    }
    
    // Re-throw with original message if already user-friendly
    if (error.message?.includes('Document') || 
        error.message?.includes('content') ||
        error.message?.includes('required')) {
      throw error;
    }
    
    throw new Error(`Flashcard generation failed: ${error.message}`);
  }
};

/**
 * Create flashcard deck with subcollection of cards
 * @param {string} userId - User ID who owns the deck
 * @param {string} documentId - Source document ID
 * @param {Array<{question: string, answer: string}>} flashcards - Array of flashcards
 * @param {Object} metadata - Deck metadata (title, description, subject)
 * @returns {Promise<string>} - Created deck ID
 */
export const createFlashcardDeck = async (userId, documentId, flashcards, metadata = {}) => {
  try {
    // Validate inputs
    if (!userId) {
      throw new Error('User ID is required');
    }

    if (!documentId) {
      throw new Error('Document ID is required');
    }

    if (!Array.isArray(flashcards) || flashcards.length === 0) {
      throw new Error('At least one flashcard is required to create a deck');
    }

    // Validate flashcards structure
    const invalidCards = flashcards.filter(
      card => !card.question || !card.answer
    );

    if (invalidCards.length > 0) {
      throw new Error(
        `${invalidCards.length} flashcard(s) are missing question or answer. ` +
        `Please ensure all flashcards are valid.`
      );
    }

    console.log(`Creating deck with ${flashcards.length} cards...`);

    const batch = writeBatch(db);

    // Create deck document
    const deckRef = doc(collection(db, 'flashcardDecks'));
    batch.set(deckRef, {
      userId,
      documentId,
      title: metadata.title || 'Untitled Deck',
      description: metadata.description || '',
      subject: metadata.subject || 'General Studies',
      cardCount: flashcards.length,
      masteredCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastStudied: null,
      isActive: true,
      difficulty: metadata.difficulty || 'medium',
      tags: metadata.tags || []
    });

    // Create cards subcollection with better structure
    flashcards.forEach((card, index) => {
      const cardRef = doc(collection(db, `flashcardDecks/${deckRef.id}/cards`));
      batch.set(cardRef, {
        question: card.question,
        answer: card.answer,
        order: index,
        mastered: false,
        lastReviewed: null,
        reviewCount: 0,
        correctCount: 0,
        incorrectCount: 0,
        confidenceLevel: 0,
        nextReviewDate: null,
        easeFactor: 2.5, // For spaced repetition
        interval: 0,
        createdAt: serverTimestamp()
      });
    });

    await batch.commit();
    console.log(`✓ Flashcard deck created successfully: ${deckRef.id}`);
    
    return deckRef.id;

  } catch (error) {
    console.error('Error creating flashcard deck:', error);
    
    // Provide specific error messages
    if (error.code === 'permission-denied') {
      throw new Error(
        'Permission denied. Please ensure you are logged in and have ' +
        'permission to create flashcard decks.'
      );
    }
    
    if (error.code === 'unavailable') {
      throw new Error(
        'Database is temporarily unavailable. Please check your connection and try again.'
      );
    }

    if (error.code === 'resource-exhausted') {
      throw new Error(
        'Operation too large. Try creating a deck with fewer flashcards.'
      );
    }
    
    throw new Error(`Failed to create flashcard deck: ${error.message}`);
  }
};

/**
 * Helper function to validate Gemini API key
 * @returns {boolean}
 */
export const validateGeminiApiKey = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  return apiKey && apiKey.trim().length > 0;
};

/**
 * Estimate optimal number of flashcards based on content length
 * @param {string} content - Text content
 * @returns {number} - Recommended number of cards
 */
export const estimateOptimalCardCount = (content) => {
  if (!content) return 0;
  
  const length = content.length;
  
  if (length < 100) return 1;
  if (length < 500) return 3;
  if (length < 1000) return 5;
  if (length < 2000) return 10;
  if (length < 5000) return 15;
  if (length < 10000) return 20;
  
  return 30;
};