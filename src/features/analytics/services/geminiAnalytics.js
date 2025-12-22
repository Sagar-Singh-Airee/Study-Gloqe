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
 * 🆕 Generate comprehensive student analytics report
 * Uses real-time data from Firestore (study sessions, quizzes, documents)
 */
export const generateStudentAnalyticsReport = async (analyticsData) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

        // Prepare data summary
        const dataContext = {
            studyTime: analyticsData.studyTime || {},
            quizPerformance: analyticsData.quizPerformance || {},
            subjectPerformance: analyticsData.subjectPerformance || [],
            streak: analyticsData.streak || 0,
            level: analyticsData.level || 1,
            xp: analyticsData.xp || 0,
            weakAreas: analyticsData.weakAreas || [],
            recentActivity: analyticsData.recentActivity || []
        };

        const prompt = `
You are an expert AI study coach analyzing a student's learning performance. Generate a comprehensive, personalized analytics report.

📊 STUDENT ANALYTICS DATA:
- Total Study Time: ${dataContext.studyTime.totalMinutes || 0} minutes
- Sessions: ${dataContext.studyTime.sessionCount || 0}
- Average Session: ${dataContext.studyTime.averageSessionLength || 0} minutes
- Quiz Average Score: ${dataContext.quizPerformance.averageScore || 0}%
- Total Quizzes: ${dataContext.quizPerformance.totalQuizzes || 0}
- Accuracy: ${dataContext.quizPerformance.accuracy || 0}%
- Current Streak: ${dataContext.streak} days
- Level: ${dataContext.level}
- XP: ${dataContext.xp}
- Subject Performance: ${JSON.stringify(dataContext.subjectPerformance.slice(0, 6))}
- Weak Areas: ${JSON.stringify(dataContext.weakAreas)}

Generate a detailed JSON report with this EXACT structure:
{
  "overallGrade": "A+ to F grade",
  "summaryHeadline": "Catchy one-line summary of performance",
  "insights": [
    {
      "icon": "🎯|📚|⚡|🔥|💡|⚠️|✨|🧠",
      "title": "Short insight title",
      "description": "2-3 sentence actionable insight",
      "type": "success|warning|info|celebration",
      "priority": "high|medium|low",
      "metric": "Related metric value"
    }
  ],
  "strengths": ["Strength 1", "Strength 2", "Strength 3"],
  "improvements": ["Area 1", "Area 2", "Area 3"],
  "recommendations": [
    {
      "action": "Specific action to take",
      "reason": "Why this helps",
      "priority": "high|medium|low",
      "timeframe": "This week|Today|This month"
    }
  ],
  "predictions": {
    "trend": "improving|stable|declining",
    "confidence": "high|medium|low",
    "nextWeekForecast": "Brief prediction for next week",
    "monthlyGoal": "Suggested monthly goal"
  },
  "motivationalMessage": "Encouraging message based on their data",
  "studyTip": "One specific, actionable study tip"
}

Be specific, encouraging, and base everything on the actual data provided. Use emojis appropriately.
`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Extract JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                success: true,
                report: parsed,
                generatedAt: new Date().toISOString(),
                dataSnapshot: {
                    studyMinutes: dataContext.studyTime.totalMinutes || 0,
                    quizScore: dataContext.quizPerformance.averageScore || 0,
                    streak: dataContext.streak
                }
            };
        }

        // Fallback if JSON extraction fails
        return {
            success: true,
            report: {
                overallGrade: "B",
                summaryHeadline: "Making steady progress! 📈",
                insights: [{
                    icon: "💡",
                    title: "AI Analysis",
                    description: "Your learning journey is on track. Keep up the consistent effort!",
                    type: "info",
                    priority: "medium",
                    metric: `${dataContext.studyTime.totalMinutes}m studied`
                }],
                strengths: ["Consistent study habits"],
                improvements: ["Try more quizzes"],
                recommendations: [{
                    action: "Complete 2 quizzes this week",
                    reason: "Boost retention and track progress",
                    priority: "medium",
                    timeframe: "This week"
                }],
                predictions: {
                    trend: "stable",
                    confidence: "medium",
                    nextWeekForecast: "Expected to maintain current pace",
                    monthlyGoal: "Increase study time by 15%"
                },
                motivationalMessage: "Every session counts! You're building great habits. 🌟",
                studyTip: "Try studying in 25-minute focused blocks with 5-minute breaks."
            },
            generatedAt: new Date().toISOString()
        };

    } catch (error) {
        console.error('❌ AI Report generation error:', error);
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
    generateStudentAnalyticsReport,
    generateStudentRecommendations,
    predictPerformanceTrends,
    generateQuizFromContent
};
