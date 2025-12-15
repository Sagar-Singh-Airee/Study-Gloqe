// src/config/gemini.js
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

// ✅ BEST CHOICE - Fast & Stable
export const geminiModel = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash"
});
