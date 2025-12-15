// src/services/geminiAnalytics.js
import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
    console.error('❌ VITE_GEMINI_API_KEY not found in .env');
}

const genAI = new GoogleGenerativeAI(API_KEY);

/**
 * Generate AI insights for class analytics
 */
export const generateClassInsights = async (analyticsData) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        const prompt = `
You are an expert education analyst. Analyze this class data and provide 3-5 actionable insights.

CLASS ANALYTICS:
- Average Score: ${analyticsData.avgClassScore}%
- Active Students: ${analyticsData.activeStudents}/${analyticsData.totalStudents}
- Completion Rate: ${analyticsData.completionRate}%
- Average Study Time: ${analyticsData.avgStudyTime} minutes
- Improvement: ${analyticsData.improvement}%
- Student Engagement: ${JSON.stringify(analyticsData.studentEngagement)}
- Subject Performance: ${JSON.stringify(analyticsData.categoryScores)}

Provide insights in this JSON format:
{
  "insights": [
    {
      "icon": "emoji",
      "title": "Brief Title",
      "description": "Actionable insight",
      "type": "success|warning|info|danger",
      "priority": "high|medium|low"
    }
  ],
  "recommendations": [
    "Specific action item 1",
    "Specific action item 2"
  ],
  "summary": "One-sentence overall assessment"
}

Focus on: student engagement, performance trends, and specific teaching strategies.
`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Extract JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }

        // Fallback if JSON extraction fails
        return {
            insights: [{
                icon: "💡",
                title: "AI Analysis",
                description: text.substring(0, 200),
                type: "info",
                priority: "medium"
            }],
            recommendations: [],
            summary: "AI-generated insights available"
        };

    } catch (error) {
        console.error('Gemini AI Error:', error);
        throw error;
    }
};

/**
 * Generate personalized student recommendations
 */
export const generateStudentRecommendations = async (studentData) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        const prompt = `
Analyze this student's performance and suggest 3 personalized study strategies:

STUDENT DATA:
- Average Score: ${studentData.avgScore}%
- Quiz Count: ${studentData.quizCount}
- Study Time: ${studentData.studyTime} minutes
- Weak Subjects: ${studentData.weakSubjects?.join(', ') || 'None'}
- Strong Subjects: ${studentData.strongSubjects?.join(', ') || 'None'}
- Activity Level: ${studentData.activityLevel}

Return 3 specific, actionable recommendations as a JSON array:
["Recommendation 1", "Recommendation 2", "Recommendation 3"]
`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }

        return ["Review weak areas", "Practice more quizzes", "Join study groups"];

    } catch (error) {
        console.error('Gemini recommendation error:', error);
        return ["Continue current study plan", "Practice consistently", "Seek help when needed"];
    }
};

/**
 * Predict performance trends
 */
export const predictPerformanceTrends = async (performanceHistory) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        const prompt = `
Based on this performance history, predict the next 2 weeks trend:

PERFORMANCE DATA: ${JSON.stringify(performanceHistory)}

Respond with JSON:
{
  "trend": "improving|declining|stable",
  "confidence": "high|medium|low",
  "prediction": "Brief prediction",
  "factors": ["Factor 1", "Factor 2"]
}
`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }

        return {
            trend: "stable",
            confidence: "medium",
            prediction: "Performance likely to continue current pattern",
            factors: ["Consistent practice", "Regular attendance"]
        };

    } catch (error) {
        console.error('Prediction error:', error);
        return null;
    }
};

/**
 * Generate quiz questions from content
 */
export const generateQuizFromContent = async (content, difficulty = 'medium', count = 5) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        const prompt = `
Generate ${count} ${difficulty} difficulty multiple-choice questions from this content:

CONTENT:
${content}

Return JSON array:
[
  {
    "question": "Question text",
    "options": ["A", "B", "C", "D"],
    "correctAnswer": 0,
    "explanation": "Why this is correct"
  }
]
`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }

        return [];

    } catch (error) {
        console.error('Quiz generation error:', error);
        return [];
    }
};

export default {
    generateClassInsights,
    generateStudentRecommendations,
    predictPerformanceTrends,
    generateQuizFromContent
};
