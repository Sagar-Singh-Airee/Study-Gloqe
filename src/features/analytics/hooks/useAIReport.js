// src/features/analytics/hooks/useAIReport.js
// Hook for generating and caching AI analytics reports

import { useState, useCallback, useEffect } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@shared/config/firebase';
import { generateStudentAnalyticsReport } from '../services/geminiAnalytics';

// Cache duration in milliseconds (1 hour)
const CACHE_DURATION = 60 * 60 * 1000;

/**
 * Hook to generate and cache AI analytics reports
 * Reports are cached in Firestore and locally to prevent excessive API calls
 */
export const useAIReport = (userId, analyticsData) => {
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [lastGenerated, setLastGenerated] = useState(null);

    // Load cached report from Firestore on mount
    useEffect(() => {
        if (!userId) return;

        const loadCachedReport = async () => {
            try {
                const reportRef = doc(db, 'users', userId, 'aiReports', 'latestAnalytics');
                const reportSnap = await getDoc(reportRef);

                if (reportSnap.exists()) {
                    const data = reportSnap.data();
                    const generatedAt = data.generatedAt?.toDate?.() || new Date(data.generatedAt);
                    const age = Date.now() - generatedAt.getTime();

                    // Use cached if less than 1 hour old
                    if (age < CACHE_DURATION) {
                        setReport(data.report);
                        setLastGenerated(generatedAt);
                        console.log('✅ Loaded cached AI report');
                    }
                }
            } catch (err) {
                console.warn('Could not load cached report:', err.message);
            }
        };

        loadCachedReport();
    }, [userId]);

    // Generate new AI report
    const generateReport = useCallback(async () => {
        if (!userId || !analyticsData) {
            setError('Missing user or analytics data');
            return null;
        }

        // Rate limiting - don't generate more than once per 5 minutes
        if (lastGenerated) {
            const timeSinceLastGeneration = Date.now() - lastGenerated.getTime();
            if (timeSinceLastGeneration < 5 * 60 * 1000) {
                console.log('⏳ Rate limited - using cached report');
                return report;
            }
        }

        setLoading(true);
        setError(null);

        try {
            console.log('🤖 Generating AI analytics report...');

            // Prepare data for AI
            const dataForAI = {
                studyTime: analyticsData.studyTime || { totalMinutes: 0, sessionCount: 0, averageSessionLength: 0 },
                quizPerformance: analyticsData.quizPerformance || { averageScore: 0, totalQuizzes: 0, accuracy: 0 },
                subjectPerformance: analyticsData.performance || [],
                streak: analyticsData.streak || 0,
                level: analyticsData.level || 1,
                xp: analyticsData.xp || 0,
                weakAreas: analyticsData.weakAreas || [],
                badges: analyticsData.badges || []
            };

            const result = await generateStudentAnalyticsReport(dataForAI);

            if (result.success) {
                setReport(result.report);
                setLastGenerated(new Date());

                // Cache to Firestore
                try {
                    const reportRef = doc(db, 'users', userId, 'aiReports', 'latestAnalytics');
                    await setDoc(reportRef, {
                        report: result.report,
                        generatedAt: serverTimestamp(),
                        dataSnapshot: result.dataSnapshot
                    });
                    console.log('💾 AI report cached to Firestore');
                } catch (cacheError) {
                    console.warn('Could not cache report:', cacheError.message);
                }

                return result.report;
            } else {
                throw new Error('AI report generation failed');
            }

        } catch (err) {
            console.error('❌ AI Report error:', err);
            setError(err.message || 'Failed to generate AI report');
            return null;
        } finally {
            setLoading(false);
        }
    }, [userId, analyticsData, lastGenerated, report]);

    // Check if report is stale (older than cache duration)
    const isStale = lastGenerated ? (Date.now() - lastGenerated.getTime() > CACHE_DURATION) : true;

    // Check if can generate (not in cooldown)
    const canGenerate = !loading && (!lastGenerated || (Date.now() - lastGenerated.getTime() >= 5 * 60 * 1000));

    return {
        report,
        loading,
        error,
        lastGenerated,
        isStale,
        canGenerate,
        generateReport,
        hasReport: !!report
    };
};

export default useAIReport;
