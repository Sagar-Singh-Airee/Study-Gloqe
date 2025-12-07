// src/hooks/useAnalytics.js - Updated for Cloud Functions
import { useState, useEffect, useCallback } from 'react';

// Base URL for Cloud Functions
const FUNCTIONS_URL = 'https://us-central1-studygloqe.cloudfunctions.net';

// Helper function to call Cloud Functions
const callFunction = async (functionName, userId, params = {}) => {
  try {
    const response = await fetch(`${FUNCTIONS_URL}/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, ...params }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error calling ${functionName}:`, error);
    throw error;
  }
};

/**
 * Main Analytics Hook - Comprehensive student data
 */
export const useAnalytics = (userId, dateRange = 30) => {
  const [analytics, setAnalytics] = useState(null);
  const [quizPerformance, setQuizPerformance] = useState(null);
  const [studyTime, setStudyTime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnalytics = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch from Cloud Functions
      const [
        analyticsData,
        quizData,
        studyData
      ] = await Promise.allSettled([
        callFunction('getStudentAnalytics', userId),
        callFunction('getQuizPerformance', userId),
        callFunction('getStudyTimeStats', userId, { period: dateRange })
      ]);

      setAnalytics(analyticsData.status === 'fulfilled' ? analyticsData.value : null);
      setQuizPerformance(quizData.status === 'fulfilled' ? quizData.value : null);
      setStudyTime(studyData.status === 'fulfilled' ? studyData.value : null);

    } catch (err) {
      console.error('Error in useAnalytics:', err);
      setError(err.message || 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  }, [userId, dateRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const refetch = useCallback(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return { 
    analytics, 
    quizPerformance,
    studyTime,
    loading, 
    error, 
    refetch 
  };
};

/**
 * Learning Patterns Hook - Study behavior analysis
 */
export const useLearningPatterns = (userId) => {
  const [patterns, setPatterns] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPatterns = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await callFunction('getLearningPatterns', userId);
      setPatterns(data);
    } catch (err) {
      console.error('Error fetching learning patterns:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchPatterns();
  }, [fetchPatterns]);

  const refetch = useCallback(() => {
    fetchPatterns();
  }, [fetchPatterns]);

  return { patterns, loading, error, refetch };
};

/**
 * Performance Trends Hook - Track progress over time
 */
export const usePerformanceTrends = (userId, period = 'weekly') => {
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTrends = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await callFunction('getPerformanceTrends', userId, { period });
      setTrends(data);
    } catch (err) {
      console.error('Error fetching performance trends:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId, period]);

  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

  const refetch = useCallback(() => {
    fetchTrends();
  }, [fetchTrends]);

  return { trends, loading, error, refetch };
};

/**
 * Study Streaks Hook - Track daily study consistency
 */
export const useStudyStreaks = (userId) => {
  const [streaks, setStreaks] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStreaks = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await callFunction('getStudyStreaks', userId);
      setStreaks(data);
    } catch (err) {
      console.error('Error fetching study streaks:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchStreaks();
  }, [fetchStreaks]);

  const refetch = useCallback(() => {
    fetchStreaks();
  }, [fetchStreaks]);

  return { streaks, loading, error, refetch };
};

/**
 * Subject Performance Hook - Track performance by subject
 */
export const useSubjectPerformance = (userId) => {
  const [performance, setPerformance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPerformance = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await callFunction('getSubjectPerformance', userId);
      setPerformance(result.performance || []);
    } catch (err) {
      console.error('Error fetching subject performance:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchPerformance();
  }, [fetchPerformance]);

  const refetch = useCallback(() => {
    fetchPerformance();
  }, [fetchPerformance]);

  return { performance, loading, error, refetch };
};

/**
 * Weak Areas Hook - Identify areas needing improvement
 */
export const useWeakAreas = (userId) => {
  const [weakAreas, setWeakAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchWeakAreas = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await callFunction('getWeakAreas', userId);
      setWeakAreas(result.weakAreas || []);
    } catch (err) {
      console.error('Error fetching weak areas:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchWeakAreas();
  }, [fetchWeakAreas]);

  const refetch = useCallback(() => {
    fetchWeakAreas();
  }, [fetchWeakAreas]);

  return { weakAreas, loading, error, refetch };
};

/**
 * Combined Analytics Hook - Get all analytics in one call
 */
export const useCompleteAnalytics = (userId, dateRange = 30) => {
  const analytics = useAnalytics(userId, dateRange);
  const patterns = useLearningPatterns(userId);
  const trends = usePerformanceTrends(userId);
  const streaks = useStudyStreaks(userId);
  const performance = useSubjectPerformance(userId);
  const weakAreas = useWeakAreas(userId);

  const loading = 
    analytics.loading || 
    patterns.loading || 
    trends.loading || 
    streaks.loading || 
    performance.loading || 
    weakAreas.loading;

  const error = 
    analytics.error || 
    patterns.error || 
    trends.error || 
    streaks.error || 
    performance.error || 
    weakAreas.error;

  const refetchAll = useCallback(() => {
    analytics.refetch();
    patterns.refetch();
    trends.refetch();
    streaks.refetch();
    performance.refetch();
    weakAreas.refetch();
  }, [analytics, patterns, trends, streaks, performance, weakAreas]);

  return {
    analytics: analytics.analytics,
    quizPerformance: analytics.quizPerformance,
    studyTime: analytics.studyTime,
    patterns: patterns.patterns,
    trends: trends.trends,
    streaks: streaks.streaks,
    performance: performance.performance,
    weakAreas: weakAreas.weakAreas,
    loading,
    error,
    refetchAll
  };
};
