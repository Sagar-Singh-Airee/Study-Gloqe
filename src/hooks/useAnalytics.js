// src/hooks/useAnalytics.js
import { useState, useEffect, useCallback } from 'react';
import bigQueryService from '../services/bigQueryService';

export const useAnalytics = (userId, dateRange = 30) => {
  const [analytics, setAnalytics] = useState(null);
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
      const data = await bigQueryService.getStudentAnalytics(userId, dateRange);
      setAnalytics(data);
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

  return { analytics, loading, error, refetch };
};

export const useLearningPatterns = (userId) => {
  const [patterns, setPatterns] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchPatterns = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await bigQueryService.getLearningPatterns(userId);
        setPatterns(data);
      } catch (err) {
        console.error('Error fetching learning patterns:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPatterns();
  }, [userId]);

  return { patterns, loading, error };
};

export const usePerformanceTrends = (userId, period = 'weekly') => {
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchTrends = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await bigQueryService.getPerformanceTrends(userId, period);
        setTrends(data);
      } catch (err) {
        console.error('Error fetching performance trends:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTrends();
  }, [userId, period]);

  return { trends, loading, error };
};
