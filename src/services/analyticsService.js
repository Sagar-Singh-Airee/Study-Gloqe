// src/services/analyticsService.js - BigQuery Analytics Integration
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/config/firebase';

/**
 * Get student analytics data
 */
export const getStudentAnalytics = async (userId, timeframe = '30d') => {
  try {
    const getAnalytics = httpsCallable(functions, 'getStudentAnalytics');
    const result = await getAnalytics({ userId, timeframe });
    return result.data;
  } catch (error) {
    console.error('Error fetching student analytics:', error);
    throw error;
  }
};

/**
 * Get class dashboard data
 */
export const getClassDashboard = async (classId) => {
  try {
    const getDashboard = httpsCallable(functions, 'getClassDashboard');
    const result = await getDashboard({ classId });
    return result.data;
  } catch (error) {
    console.error('Error fetching class dashboard:', error);
    throw error;
  }
};

/**
 * Get AI-powered recommendations
 */
export const getRecommendations = async (userId) => {
  try {
    const getRecos = httpsCallable(functions, 'getRecommendations');
    const result = await getRecos({ userId });
    return result.data;
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    throw error;
  }
};

/**
 * Get trends and retention data
 */
export const getTrends = async (timeframe = '7d', scope = 'global') => {
  try {
    const getTrendsData = httpsCallable(functions, 'getTrends');
    const result = await getTrendsData({ timeframe, scope });
    return result.data;
  } catch (error) {
    console.error('Error fetching trends:', error);
    throw error;
  }
};

/**
 * Get leaderboard rankings
 */
export const getLeaderboard = async (scope = 'global', classId = null, limit = 10) => {
  try {
    const getLeaderboardData = httpsCallable(functions, 'getLeaderboard');
    const result = await getLeaderboardData({ scope, classId, limit });
    return result.data;
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    throw error;
  }
};

/**
 * Get study time statistics
 */
export const getStudyTimeStats = async (userId, period = 'week') => {
  try {
    const getStats = httpsCallable(functions, 'getStudyTimeStats');
    const result = await getStats({ userId, period });
    return result.data;
  } catch (error) {
    console.error('Error fetching study time stats:', error);
    throw error;
  }
};

/**
 * Get quiz performance data
 */
export const getQuizPerformance = async (userId, timeframe = '30d') => {
  try {
    const getPerformance = httpsCallable(functions, 'getQuizPerformance');
    const result = await getPerformance({ userId, timeframe });
    return result.data;
  } catch (error) {
    console.error('Error fetching quiz performance:', error);
    throw error;
  }
};

/**
 * Export student report
 */
export const exportStudentReport = async (userId, format = 'pdf') => {
  try {
    const exportReport = httpsCallable(functions, 'exportStudentReport');
    const result = await exportReport({ userId, format });
    return result.data;
  } catch (error) {
    console.error('Error exporting report:', error);
    throw error;
  }
};
