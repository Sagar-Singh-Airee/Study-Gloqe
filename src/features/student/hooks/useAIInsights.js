// src/hooks/useAIInsights.js
import { useState, useEffect, useCallback } from 'react';
import { generateClassInsights, predictPerformanceTrends } from '@analytics/services/geminiAnalytics';

export const useAIInsights = (analyticsData, enabled = true) => {
    const [insights, setInsights] = useState(null);
    const [trends, setTrends] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const generateInsights = useCallback(async () => {
        if (!enabled || !analyticsData) return;

        setLoading(true);
        setError(null);

        try {
            // Generate insights
            const aiInsights = await generateClassInsights(analyticsData);
            setInsights(aiInsights);

            // Generate trends if performance data available
            if (analyticsData.performanceHistory) {
                const trendPrediction = await predictPerformanceTrends(
                    analyticsData.performanceHistory
                );
                setTrends(trendPrediction);
            }

        } catch (err) {
            console.error('AI Insights Error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [analyticsData, enabled]);

    useEffect(() => {
        generateInsights();
    }, [generateInsights]);

    return {
        insights,
        trends,
        loading,
        error,
        refresh: generateInsights
    };
};
