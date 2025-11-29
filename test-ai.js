// test-ai.js
import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = 'AIzaSyC_your_key_here'; // Paste your actual key
const genAI = new GoogleGenerativeAI(API_KEY);

async function test() {
    try {
        console.log('Testing API key...');
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        const result = await model.generateContent('Say hello');
        const response = await result.response;
        console.log('✅ Success:', response.text());
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

test();
