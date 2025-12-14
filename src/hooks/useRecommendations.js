// src/hooks/useRecommendations.js - ✅ ENHANCED VERSION
import { useState, useEffect } from 'react';
import { functions } from '@/config/firebase'; // ✅ Import from config
import { httpsCallable } from 'firebase/functions';

export const useRecommendations = (userId, limit = 5) => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        setError(null);

        // ✅ Use Firebase Functions SDK instead of direct fetch
        const getRecommendations = httpsCallable(
          functions, 
          'getPersonalizedRecommendations'
        );
        
        const result = await getRecommendations({ userId, limit });
        
        setRecommendations(result.data?.recommendations || []);
      } catch (err) {
        console.error('❌ Error fetching recommendations:', err);
        setError(err.message);
        setRecommendations([]); // Fallback to empty array
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [userId, limit]);

  return { 
    recommendations, 
    loading, 
    error // ✅ Return error state
  };
};
