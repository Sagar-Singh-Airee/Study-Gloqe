// src/utils/vertexAI.js - USING GEMINI 2.5 FLASH (Latest Stable)
import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

export const generateAIResponse = async (prompt, documentId = null) => {
    try {
        console.log('🤖 Generating with Gemini 2.5 Flash...');
        console.log('Prompt:', prompt.substring(0, 100) + '...');

        if (!API_KEY) {
            throw new Error('VITE_GEMINI_API_KEY is not defined in .env file');
        }

        // Use gemini-2.5-flash - YOUR NEWEST AVAILABLE MODEL!
        const model = genAI.getGenerativeModel({ 
            model: 'gemini-2.5-flash',
            generationConfig: {
                temperature: 0.7,
                topK: 64,
                topP: 0.95,
                maxOutputTokens: 8192,
            }
        });

        // Generate content
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        if (!text || text.trim() === '') {
            throw new Error('Empty response from AI');
        }

        console.log('✅ AI Response received');
        return text;

    } catch (error) {
        console.error('❌ AI Error:', error);
        
        if (error.message?.includes('API_KEY') || error.message?.includes('not defined')) {
            throw new Error('AI API key not configured. Add VITE_GEMINI_API_KEY to .env file.');
        } else if (error.message?.includes('quota') || error.message?.includes('429')) {
            throw new Error('API quota exceeded. Try again in a few minutes.');
        } else if (error.message?.includes('401') || error.message?.includes('403')) {
            throw new Error('Invalid API key. Check your Gemini API key.');
        } else {
            throw new Error(error.message || 'Failed to generate response. Try again.');
        }
    }
};

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

export const generateSummary = async (text) => {
    const prompt = `Summarize this text in 3-5 clear bullet points. Focus on main ideas and key takeaways:

"${text}"

Format as bullet points with • symbol.`;
    
    return await generateAIResponse(prompt);
};

export const explainConcept = async (text) => {
    const prompt = `Explain this concept in simple, clear language that a student can understand. Include examples if helpful:

"${text}"

Keep the explanation concise but thorough.`;
    
    return await generateAIResponse(prompt);
};

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

export const translateText = async (text, targetLanguage = 'Hindi') => {
    const prompt = `Translate this text to ${targetLanguage}. Maintain the original meaning and context:

"${text}"

Provide only the translation, no explanations.`;
    
    return await generateAIResponse(prompt);
};

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
