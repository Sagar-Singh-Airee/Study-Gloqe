// test-gemini.js - Run this to check available models
import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = 'YOUR_API_KEY_HERE'; // Replace with your actual key

const genAI = new GoogleGenerativeAI(API_KEY);

const modelsToTest = [
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-1.5-flash-8b',
    'gemini-1.0-pro',
    'gemini-pro',
];

async function testModels() {
    console.log('🧪 Testing Gemini models...\n');
    
    for (const modelName of modelsToTest) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent('Hello');
            const response = await result.response;
            console.log(`✅ ${modelName} - WORKS`);
        } catch (error) {
            console.log(`❌ ${modelName} - FAILED: ${error.message.split('\n')[0]}`);
        }
    }
}

testModels();
