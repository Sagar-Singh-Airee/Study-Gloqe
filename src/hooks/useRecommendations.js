// src/hooks/useRecommendations.js
import { useState, useEffect } from 'react';

export const useRecommendations = (userId, limit = 5) => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchRecommendations = async () => {
      try {
        const response = await fetch(
          'https://us-central1-studygloqe.cloudfunctions.net/getPersonalizedRecommendations',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, limit })
          }
        );

        if (response.ok) {
          const data = await response.json();
          setRecommendations(data.recommendations || []);
        }
      } catch (error) {
        console.error('Error fetching recommendations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [userId, limit]);

  return { recommendations, loading };
};
