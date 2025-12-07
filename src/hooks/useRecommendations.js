// src/hooks/useRecommendations.js
import { useState, useEffect, useCallback } from 'react';
import bigQueryService from '../services/bigQueryService';

export const useRecommendations = (userId, limit = 10) => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRecommendations = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await bigQueryService.getPersonalizedRecommendations(userId, limit);
      setRecommendations(data);
    } catch (err) {
      console.error('Error fetching recommendations:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId, limit]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const refetch = useCallback(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  return { recommendations, loading, error, refetch };
};

export const useStudyPlan = (userId) => {
  const [studyPlan, setStudyPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchStudyPlan = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await bigQueryService.getStudyPlanRecommendations(userId);
        setStudyPlan(data);
      } catch (err) {
        console.error('Error fetching study plan:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStudyPlan();
  }, [userId]);

  return { studyPlan, loading, error };
};

export const usePeerComparison = (userId) => {
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchComparison = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await bigQueryService.getPeerComparison(userId);
        setComparison(data);
      } catch (err) {
        console.error('Error fetching peer comparison:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchComparison();
  }, [userId]);

  return { comparison, loading, error };
};
