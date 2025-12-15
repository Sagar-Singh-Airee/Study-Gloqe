// src/services/bigQueryService.js
import { httpsCallable } from 'firebase/functions';
import { functions } from '@shared/config/firebase';

class BigQueryService {
  // ✅ 1. ANALYTICS METHODS
  
  async getStudentAnalytics(userId, dateRange = 30) {
    try {
      const callable = httpsCallable(functions, 'getStudentAnalytics');
      const result = await callable({ userId, dateRange });
      return result.data;
    } catch (error) {
      console.error('Error fetching student analytics:', error);
      throw error;
    }
  }

  async getClassAnalytics(classId, dateRange = 30) {
    try {
      const callable = httpsCallable(functions, 'getClassAnalytics');
      const result = await callable({ classId, dateRange });
      return result.data;
    } catch (error) {
      console.error('Error fetching class analytics:', error);
      throw error;
    }
  }

  async getLearningPatterns(userId) {
    try {
      const callable = httpsCallable(functions, 'getLearningPatterns');
      const result = await callable({ userId });
      return result.data;
    } catch (error) {
      console.error('Error fetching learning patterns:', error);
      throw error;
    }
  }

  async getPerformanceTrends(userId, period = 'weekly') {
    try {
      const callable = httpsCallable(functions, 'getPerformanceTrends');
      const result = await callable({ userId, period });
      return result.data;
    } catch (error) {
      console.error('Error fetching performance trends:', error);
      throw error;
    }
  }

  // ✅ 2. RECOMMENDATION METHODS

  async getPersonalizedRecommendations(userId, limit = 10) {
    try {
      const callable = httpsCallable(functions, 'getPersonalizedRecommendations');
      const result = await callable({ userId, limit });
      return result.data;
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      throw error;
    }
  }

  async getStudyPlanRecommendations(userId) {
    try {
      const callable = httpsCallable(functions, 'getStudyPlanRecommendations');
      const result = await callable({ userId });
      return result.data;
    } catch (error) {
      console.error('Error fetching study plan:', error);
      throw error;
    }
  }

  async getPeerComparison(userId) {
    try {
      const callable = httpsCallable(functions, 'getPeerComparison');
      const result = await callable({ userId });
      return result.data;
    } catch (error) {
      console.error('Error fetching peer comparison:', error);
      throw error;
    }
  }

  // ✅ 3. DASHBOARD METHODS

  async getTeacherDashboardData(teacherId, dateRange = 30) {
    try {
      const callable = httpsCallable(functions, 'getTeacherDashboardData');
      const result = await callable({ teacherId, dateRange });
      return result.data;
    } catch (error) {
      console.error('Error fetching teacher dashboard:', error);
      throw error;
    }
  }

  async getAdminMetrics(dateRange = 30) {
    try {
      const callable = httpsCallable(functions, 'getAdminMetrics');
      const result = await callable({ dateRange });
      return result.data;
    } catch (error) {
      console.error('Error fetching admin metrics:', error);
      throw error;
    }
  }

  async getSubjectInsights(subject, dateRange = 30) {
    try {
      const callable = httpsCallable(functions, 'getSubjectInsights');
      const result = await callable({ subject, dateRange });
      return result.data;
    } catch (error) {
      console.error('Error fetching subject insights:', error);
      throw error;
    }
  }

  // ✅ 4. TRENDS METHODS

  async getMonthlyTrends(months = 12) {
    try {
      const callable = httpsCallable(functions, 'getMonthlyTrends');
      const result = await callable({ months });
      return result.data;
    } catch (error) {
      console.error('Error fetching monthly trends:', error);
      throw error;
    }
  }

  async getRetentionCohorts(cohortType = 'monthly') {
    try {
      const callable = httpsCallable(functions, 'getRetentionCohorts');
      const result = await callable({ cohortType });
      return result.data;
    } catch (error) {
      console.error('Error fetching retention cohorts:', error);
      throw error;
    }
  }

  async getSubjectTrends(dateRange = 90) {
    try {
      const callable = httpsCallable(functions, 'getSubjectTrends');
      const result = await callable({ dateRange });
      return result.data;
    } catch (error) {
      console.error('Error fetching subject trends:', error);
      throw error;
    }
  }

  async getChurnPredictionData() {
    try {
      const callable = httpsCallable(functions, 'getChurnPredictionData');
      const result = await callable({});
      return result.data;
    } catch (error) {
      console.error('Error fetching churn prediction:', error);
      throw error;
    }
  }

  // 🆕 NEW: Sync study session to BigQuery
  async syncStudySessionToBigQuery(sessionData) {
    try {
      const callable = httpsCallable(functions, 'syncStudySessionToBigQuery');
      const result = await callable(sessionData);
      return result.data;
    } catch (error) {
      console.error('Error syncing study session to BigQuery:', error);
      throw error;
    }
  }

  // 🆕 NEW: Get study time from BigQuery
  async getStudyTimeBigQuery(userId, timeframe = 30) {
    try {
      const callable = httpsCallable(functions, 'getStudyTimeBigQuery');
      const result = await callable({ userId, timeframe });
      return result.data;
    } catch (error) {
      console.error('Error fetching study time from BigQuery:', error);
      throw error;
    }
  }
}

export default new BigQueryService();
