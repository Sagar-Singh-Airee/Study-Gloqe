// src/hooks/useTrends.js
import { useState, useEffect, useCallback } from 'react';
import bigQueryService from '../services/bigQueryService';

export const useMonthlyTrends = (months = 12) => {
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTrends = async () => {
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
    };

    fetchTrends();
  }, [months]);

  return { trends, loading, error };
};

export const useRetentionCohorts = (cohortType = 'monthly') => {
  const [cohorts, setCohorts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCohorts = async () => {
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
    };

    fetchCohorts();
  }, [cohortType]);

  return { cohorts, loading, error };
};

export const useSubjectTrends = (dateRange = 90) => {
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTrends = async () => {
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
    };

    fetchTrends();
  }, [dateRange]);

  return { trends, loading, error };
};

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
