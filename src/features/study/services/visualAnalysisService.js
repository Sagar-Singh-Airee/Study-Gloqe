// src/features/study/services/visualAnalysisService.js
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as pdfjsLib from 'pdfjs-dist';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../shared/config/firebase';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;

/**
 * Convert PDF page to image
 */
export const convertPageToImage = async (pdfFile, pageNumber) => {
    try {
        const arrayBuffer = await pdfFile.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(pageNumber);

        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport }).promise;

        // Convert to base64
        const imageData = canvas.toDataURL('image/png').split(',')[1];
        return imageData;

    } catch (error) {
        console.error('Error converting page to image:', error);
        return null;
    }
};

/**
 * Analyze page with Gemini Vision and generate flowchart + questions
 */
export const analyzePageVisually = async (imageData, pageNumber, pageText) => {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `
Analyze this educational page (Page ${pageNumber}) and provide:

1. **Core Concept**: One clear sentence summarizing the main idea
2. **Key Topics**: List 3-5 main topics covered
3. **Flowchart**: Mermaid.js flowchart showing concept relationships (use "graph TD" format)
4. **Detailed Explanation**: 2-3 paragraphs explaining the content in simple terms
5. **Question Bank**: Generate 5 questions (mix of MCQ and short answer) with answers
6. **Flashcard Ideas**: 3-5 flashcard pairs (front/back)
7. **Learning Path**: Step-by-step breakdown (3-5 steps)

Return ONLY valid JSON (no markdown):
{
  "coreConcept": "Main concept in one sentence",
  "keyTopics": ["Topic 1", "Topic 2", "Topic 3"],
  "flowchart": "graph TD\\nA[Start]-->B[Main Concept]\\nB-->C[Sub Concept 1]\\nB-->D[Sub Concept 2]",
  "explanation": "Detailed explanation paragraphs",
  "questionBank": [
    {
      "type": "mcq",
      "question": "Question text?",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "B",
      "explanation": "Why B is correct"
    },
    {
      "type": "short",
      "question": "Question text?",
      "answer": "Expected answer",
      "keyPoints": ["Point 1", "Point 2"]
    }
  ],
  "flashcards": [
    {"front": "Question/Term", "back": "Answer/Definition"},
    {"front": "Question/Term", "back": "Answer/Definition"}
  ],
  "learningPath": [
    {"step": 1, "title": "Step title", "description": "What to learn", "duration": "5 min"},
    {"step": 2, "title": "Step title", "description": "What to learn", "duration": "3 min"}
  ],
  "complexity": "beginner|intermediate|advanced",
  "estimatedTime": 10
}

Page Text:
${pageText}
`;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: imageData,
                    mimeType: 'image/png'
                }
            }
        ]);

        const text = result.response.text();

        // Remove markdown code blocks if present
        const cleanedText = text.replace(/``````\n?/g, '').trim();

        const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                ...parsed,
                pageNumber,
                imageData, // Store for future reference
                generatedAt: new Date().toISOString()
            };
        }

        throw new Error('Failed to parse AI response');

    } catch (error) {
        console.error('Visual analysis error:', error);
        return null;
    }
};

/**
 * Process all pages of PDF and generate visual analysis
 */
export const processDocumentVisually = async (pdfFile, maxPages = 50, onProgress) => {
    try {
        const arrayBuffer = await pdfFile.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const totalPages = Math.min(pdf.numPages, maxPages);

        const visualPages = [];

        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            try {
                if (onProgress) {
                    onProgress({
                        current: pageNum,
                        total: totalPages,
                        status: `Analyzing page ${pageNum}...`
                    });
                }

                // Get page text
                const page = await pdf.getPage(pageNum);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');

                // Convert to image
                const imageData = await convertPageToImage(pdfFile, pageNum);

                if (!imageData) {
                    console.warn(`Failed to convert page ${pageNum} to image`);
                    continue;
                }

                // Analyze with AI
                const analysis = await analyzePageVisually(imageData, pageNum, pageText);

                if (analysis) {
                    visualPages.push(analysis);
                }

                // Rate limit: wait 1 second between pages
                if (pageNum < totalPages) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }

            } catch (pageError) {
                console.error(`Error processing page ${pageNum}:`, pageError);
            }
        }

        return {
            visualPages,
            totalProcessed: visualPages.length,
            totalPages: pdf.numPages
        };

    } catch (error) {
        console.error('Error processing document:', error);
        throw error;
    }
};

/**
 * Save flashcards from visual analysis
 */
export const saveFlashcardsFromVisual = async (userId, docId, flashcards, subject, topic) => {
    try {
        const deckData = {
            userId,
            documentId: docId,
            subject,
            topic,
            title: `${topic} - Flashcards`,
            cards: flashcards.map((card, index) => ({
                id: `card_${index}`,
                front: card.front,
                back: card.back,
                mastery: 0,
                lastReviewed: null,
                reviewCount: 0
            })),
            totalCards: flashcards.length,
            masteredCards: 0,
            source: 'visual_analysis',
            createdAt: serverTimestamp(),
            lastStudied: null
        };

        const docRef = await addDoc(collection(db, 'flashcards'), deckData);
        console.log('✅ Flashcards saved:', docRef.id);

        return { success: true, deckId: docRef.id };
    } catch (error) {
        console.error('Error saving flashcards:', error);
        throw error;
    }
};

/**
 * Save quiz questions from visual analysis
 */
export const saveQuizFromVisual = async (userId, docId, questions, subject, topic) => {
    try {
        const quizData = {
            userId,
            documentId: docId,
            subject,
            title: `${topic} - Quiz`,
            description: `Auto-generated quiz from visual analysis`,
            questions: questions.map((q, index) => ({
                id: `q_${index}`,
                type: q.type,
                question: q.question,
                options: q.options || [],
                correctAnswer: q.correctAnswer || q.answer,
                explanation: q.explanation || '',
                keyPoints: q.keyPoints || [],
                points: 10
            })),
            totalQuestions: questions.length,
            totalPoints: questions.length * 10,
            timeLimit: questions.length * 2, // 2 min per question
            difficulty: 'medium',
            source: 'visual_analysis',
            attempts: 0,
            highestScore: 0,
            createdAt: serverTimestamp()
        };

        const docRef = await addDoc(collection(db, 'quizzes'), quizData);
        console.log('✅ Quiz saved:', docRef.id);

        return { success: true, quizId: docRef.id };
    } catch (error) {
        console.error('Error saving quiz:', error);
        throw error;
    }
};

export default {
    analyzePageVisually,
    convertPageToImage,
    processDocumentVisually,
    saveFlashcardsFromVisual,
    saveQuizFromVisual
};
