// src/utils/vertexAI.js - VERTEX AI INTEGRATION

// Vertex AI Configuration from environment variables
const PROJECT_ID = import.meta.env.VITE_VERTEX_PROJECT_ID;
const LOCATION = import.meta.env.VITE_VERTEX_LOCATION || 'us-central1';
const API_KEY = import.meta.env.VITE_VERTEX_API_KEY;

// Vertex AI REST API endpoint for Gemini Pro
const API_ENDPOINT = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/gemini-pro:generateContent`;

/**
 * Generate AI response using Vertex AI
 * @param {string} prompt - User's question or instruction
 * @param {string} documentId - Optional document ID for context (not used yet, but available for future)
 * @returns {Promise<string>} - AI generated response
 */
export const generateAIResponse = async (prompt, documentId = null) => {
    try {
        console.log('🤖 Generating with Vertex AI...');
        console.log('Prompt:', prompt.substring(0, 100) + '...');

        // Check if credentials exist
        if (!PROJECT_ID || !API_KEY) {
            throw new Error('Vertex AI credentials not configured. Add VITE_VERTEX_PROJECT_ID and VITE_VERTEX_API_KEY to .env file');
        }

        // Prepare request body for Vertex AI
        const requestBody = {
            contents: [{
                role: 'user',
                parts: [{ text: prompt }]
            }],
            generationConfig: {
                temperature: 0.7,
                topP: 0.95,
                topK: 40,
                maxOutputTokens: 1024,
            },
            safetySettings: [
                {
                    category: 'HARM_CATEGORY_HARASSMENT',
                    threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                },
                {
                    category: 'HARM_CATEGORY_HATE_SPEECH',
                    threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                },
                {
                    category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
                    threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                },
                {
                    category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
                    threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                }
            ]
        };

        // Call Vertex AI REST API
        const response = await fetch(`${API_ENDPOINT}?key=${API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ Vertex AI Error Response:', errorData);
            
            const errorMessage = errorData.error?.message || `API Error: ${response.status}`;
            throw new Error(errorMessage);
        }

        const data = await response.json();
        
        // Extract text from Vertex AI response structure
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!text || text.trim() === '') {
            throw new Error('Empty response from Vertex AI');
        }

        console.log('✅ Vertex AI Response received:', text.substring(0, 100) + '...');
        return text;

    } catch (error) {
        console.error('❌ Vertex AI Generation Error:', error);

        // Provide user-friendly error messages
        if (error.message?.includes('credentials') || error.message?.includes('not configured')) {
            throw new Error('Vertex AI not configured. Add VITE_VERTEX_PROJECT_ID, VITE_VERTEX_LOCATION, and VITE_VERTEX_API_KEY to .env file.');
        } else if (error.message?.includes('quota') || error.message?.includes('429')) {
            throw new Error('API quota exceeded. Please try again in a few minutes.');
        } else if (error.message?.includes('network') || error.message?.includes('fetch failed')) {
            throw new Error('Network error. Please check your internet connection.');
        } else if (error.message?.includes('401') || error.message?.includes('403')) {
            throw new Error('Invalid Vertex AI credentials. Check your API key and project ID.');
        } else if (error.message?.includes('404')) {
            throw new Error('Vertex AI endpoint not found. Verify project ID and location.');
        } else if (error.message?.includes('PERMISSION_DENIED')) {
            throw new Error('Permission denied. Enable Vertex AI API and check billing.');
        } else if (error.message?.includes('RESOURCE_EXHAUSTED')) {
            throw new Error('Rate limit exceeded. Please wait a moment and try again.');
        } else {
            throw new Error(error.message || 'Failed to generate AI response. Please try again.');
        }
    }
};

/**
 * Generate quiz questions from text
 * @param {string} text - Source text to generate questions from
 * @param {number} numQuestions - Number of questions to generate
 * @returns {Promise<string>} - Formatted quiz questions
 */
export const generateQuiz = async (text, numQuestions = 5) => {
    const prompt = `Generate ${numQuestions} multiple-choice questions from this text. Format each question exactly like this:

Q1: [Write the question here]
A) [Option A]
B) [Option B]
C) [Option C]
D) [Option D]
Correct Answer: [A/B/C/D]

Text to analyze:
"${text}"

Make sure questions test understanding, not just memorization.`;
    
    return await generateAIResponse(prompt);
};

/**
 * Generate summary of text
 * @param {string} text - Text to summarize
 * @returns {Promise<string>} - Summary in bullet points
 */
export const generateSummary = async (text) => {
    const prompt = `Summarize this text in 3-5 clear bullet points. Focus on main ideas and key takeaways:

"${text}"

Format as bullet points with • symbol.`;
    
    return await generateAIResponse(prompt);
};

/**
 * Explain concept in simple terms
 * @param {string} text - Concept to explain
 * @returns {Promise<string>} - Simple explanation
 */
export const explainConcept = async (text) => {
    const prompt = `Explain this concept in simple, clear language that a student can understand. Include examples if helpful:

"${text}"

Keep the explanation concise but thorough.`;
    
    return await generateAIResponse(prompt);
};

/**
 * Create mind map structure
 * @param {string} text - Text to create mind map from
 * @returns {Promise<string>} - Mind map outline
 */
export const generateMindMap = async (text) => {
    const prompt = `Create a hierarchical mind map outline for this text. Use indentation to show relationships:

"${text}"

Format:
Main Topic
  ├─ Subtopic 1
  │  ├─ Point A
  │  └─ Point B
  └─ Subtopic 2
     ├─ Point C
     └─ Point D`;
    
    return await generateAIResponse(prompt);
};

/**
 * Translate text to another language
 * @param {string} text - Text to translate
 * @param {string} targetLanguage - Target language (default: Hindi)
 * @returns {Promise<string>} - Translated text
 */
export const translateText = async (text, targetLanguage = 'Hindi') => {
    const prompt = `Translate this text to ${targetLanguage}. Maintain the original meaning and context:

"${text}"

Provide only the translation, no explanations.`;
    
    return await generateAIResponse(prompt);
};

/**
 * Get detailed explanation with examples
 * @param {string} text - Topic to elaborate on
 * @returns {Promise<string>} - Detailed explanation
 */
export const elaborateTopic = async (text) => {
    const prompt = `Provide a detailed, comprehensive explanation of this topic. Include:
1. Background context
2. Key concepts and definitions
3. Real-world applications or examples
4. Important points to remember

Topic: "${text}"

Keep it educational and engaging.`;
    
    return await generateAIResponse(prompt);
};

export default {
    generateAIResponse,
    generateQuiz,
    generateSummary,
    explainConcept,
    generateMindMap,
    translateText,
    elaborateTopic
};
