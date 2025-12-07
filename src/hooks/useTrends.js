// src/hooks/useTrends.js - Comprehensive Trends & Retention Analytics
import { useState, useEffect, useCallback } from 'react';
import bigQueryService from '../services/bigQueryService';
import { getTrends } from '@/services/analyticsService';

/**
 * Monthly Trends Hook - Overall platform performance
 */
export const useMonthlyTrends = (months = 12) => {
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTrends = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await bigQueryService.getMonthlyTrends(months);
      setTrends(data);
    } catch (err) {
      console.error('Error fetching monthly trends:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [months]);

  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

  const refetch = useCallback(() => {
    fetchTrends();
  }, [fetchTrends]);

  return { trends, loading, error, refetch };
};

/**
 * Retention Cohorts Hook - Track user retention over time
 */
export const useRetentionCohorts = (cohortType = 'monthly') => {
  const [cohorts, setCohorts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCohorts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await bigQueryService.getRetentionCohorts(cohortType);
      setCohorts(data);
    } catch (err) {
      console.error('Error fetching retention cohorts:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [cohortType]);

  useEffect(() => {
    fetchCohorts();
  }, [fetchCohorts]);

  const refetch = useCallback(() => {
    fetchCohorts();
  }, [fetchCohorts]);

  return { cohorts, loading, error, refetch };
};

/**
 * Subject Trends Hook - Popular subjects and performance
 */
export const useSubjectTrends = (dateRange = 90) => {
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTrends = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await bigQueryService.getSubjectTrends(dateRange);
      setTrends(data);
    } catch (err) {
      console.error('Error fetching subject trends:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

  const refetch = useCallback(() => {
    fetchTrends();
  }, [fetchTrends]);

  return { trends, loading, error, refetch };
};

/**
 * Churn Prediction Hook - Identify at-risk students
 */
export const useChurnPrediction = () => {
  const [churnData, setChurnData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchChurnData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await bigQueryService.getChurnPredictionData();
      setChurnData(data);
    } catch (err) {
      console.error('Error fetching churn prediction:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChurnData();
  }, [fetchChurnData]);

  const refetch = useCallback(() => {
    fetchChurnData();
  }, [fetchChurnData]);

  return { churnData, loading, error, refetch };
};

/**
 * General Trends Hook - Cloud Functions integration
 */
export const useTrends = (timeframe = '7d', scope = 'global') => {
  const [trends, setTrends] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTrends = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getTrends(timeframe, scope);
      setTrends(data);
    } catch (err) {
      console.error('Error fetching trends:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [timeframe, scope]);

  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

  const refetch = useCallback(() => {
    fetchTrends();
  }, [fetchTrends]);

  return { trends, loading, error, refetch };
};

/**
 * Engagement Trends Hook - User activity patterns
 */
export const useEngagementTrends = (period = 'daily', days = 30) => {
  const [engagement, setEngagement] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchEngagement = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await bigQueryService.getEngagementTrends(period, days);
      setEngagement(data);
    } catch (err) {
      console.error('Error fetching engagement trends:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [period, days]);

  useEffect(() => {
    fetchEngagement();
  }, [fetchEngagement]);

  const refetch = useCallback(() => {
    fetchEngagement();
  }, [fetchEngagement]);

  return { engagement, loading, error, refetch };
};

/**
 * Growth Metrics Hook - User and content growth
 */
export const useGrowthMetrics = (timeframe = 'monthly') => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await bigQueryService.getGrowthMetrics(timeframe);
      setMetrics(data);
    } catch (err) {
      console.error('Error fetching growth metrics:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [timeframe]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const refetch = useCallback(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return { metrics, loading, error, refetch };
};

/**
 * Performance Trends Hook - Quiz and study performance over time
 */
export const usePerformanceTrends = (metric = 'quiz_accuracy', period = 'weekly') => {
  const [performance, setPerformance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPerformance = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await bigQueryService.getPerformanceTrendsByMetric(metric, period);
      setPerformance(data);
    } catch (err) {
      console.error('Error fetching performance trends:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [metric, period]);

  useEffect(() => {
    fetchPerformance();
  }, [fetchPerformance]);

  const refetch = useCallback(() => {
    fetchPerformance();
  }, [fetchPerformance]);

  return { performance, loading, error, refetch };
};

/**
 * Peak Hours Hook - When are users most active?
 */
export const usePeakHours = (days = 30) => {
  const [peakHours, setPeakHours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPeakHours = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await bigQueryService.getPeakActivityHours(days);
      setPeakHours(data);
    } catch (err) {
      console.error('Error fetching peak hours:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchPeakHours();
  }, [fetchPeakHours]);

  const refetch = useCallback(() => {
    fetchPeakHours();
  }, [fetchPeakHours]);

  return { peakHours, loading, error, refetch };
};

/**
 * Feature Usage Hook - Track which features are most used
 */
export const useFeatureUsage = (timeframe = '30d') => {
  const [usage, setUsage] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUsage = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await bigQueryService.getFeatureUsage(timeframe);
      setUsage(data);
    } catch (err) {
      console.error('Error fetching feature usage:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [timeframe]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  const refetch = useCallback(() => {
    fetchUsage();
  }, [fetchUsage]);

  return { usage, loading, error, refetch };
};

/**
 * Completion Rates Hook - Track quiz and document completion
 */
export const useCompletionRates = (period = 'weekly') => {
  const [rates, setRates] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await bigQueryService.getCompletionRates(period);
      setRates(data);
    } catch (err) {
      console.error('Error fetching completion rates:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  const refetch = useCallback(() => {
    fetchRates();
  }, [fetchRates]);

  return { rates, loading, error, refetch };
};

/**
 * Complete Trends Hook - All trends in one call
 */
export const useCompleteTrends = (timeframe = '30d') => {
  const monthly = useMonthlyTrends(12);
  const cohorts = useRetentionCohorts();
  const subjects = useSubjectTrends(90);
  const churn = useChurnPrediction();
  const general = useTrends('7d', 'global');
  const engagement = useEngagementTrends('daily', 30);
  const growth = useGrowthMetrics('monthly');
  const performance = usePerformanceTrends('quiz_accuracy', 'weekly');
  const peakHours = usePeakHours(30);
  const features = useFeatureUsage(timeframe);
  const completion = useCompletionRates('weekly');

  const loading = 
    monthly.loading || 
    cohorts.loading || 
    subjects.loading || 
    churn.loading || 
    general.loading || 
    engagement.loading || 
    growth.loading || 
    performance.loading || 
    peakHours.loading || 
    features.loading || 
    completion.loading;

  const error = 
    monthly.error || 
    cohorts.error || 
    subjects.error || 
    churn.error || 
    general.error || 
    engagement.error || 
    growth.error || 
    performance.error || 
    peakHours.error || 
    features.error || 
    completion.error;

  const refetchAll = useCallback(() => {
    monthly.refetch();
    cohorts.refetch();
    subjects.refetch();
    churn.refetch();
    general.refetch();
    engagement.refetch();
    growth.refetch();
    performance.refetch();
    peakHours.refetch();
    features.refetch();
    completion.refetch();
  }, [monthly, cohorts, subjects, churn, general, engagement, growth, performance, peakHours, features, completion]);

  return {
    monthlyTrends: monthly.trends,
    retentionCohorts: cohorts.cohorts,
    subjectTrends: subjects.trends,
    churnData: churn.churnData,
    generalTrends: general.trends,
    engagementTrends: engagement.engagement,
    growthMetrics: growth.metrics,
    performanceTrends: performance.performance,
    peakHours: peakHours.peakHours,
    featureUsage: features.usage,
    completionRates: completion.rates,
    loading,
    error,
    refetchAll
  };
};
