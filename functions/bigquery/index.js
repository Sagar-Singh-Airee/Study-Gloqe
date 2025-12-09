// functions/bigquery/index.js
// Main export file for all BigQuery functions

const analytics = require('./analytics');
const recommendations = require('./recommendations');
const dashboards = require('./dashboards');
const trends = require('./trends');
const tracker = require('./tracker'); // 🆕 NEW

module.exports = {
  // 🆕 NEW: Tracking Functions
  trackQuizCompletion: tracker.trackQuizCompletion,
  trackStudySession: tracker.trackStudySession,
  trackDocumentUpload: tracker.trackDocumentUpload,
  
  // Analytics Functions
  getStudentAnalytics: analytics.getStudentAnalytics,
  getClassAnalytics: analytics.getClassAnalytics,
  getLearningPatterns: analytics.getLearningPatterns,
  getPerformanceTrends: analytics.getPerformanceTrends,

  // Recommendation Functions
  getPersonalizedRecommendations: recommendations.getPersonalizedRecommendations,
  getStudyPlanRecommendations: recommendations.getStudyPlanRecommendations,
  getPeerComparison: recommendations.getPeerComparison,

  // Dashboard Functions
  getTeacherDashboardData: dashboards.getTeacherDashboardData,
  getAdminMetrics: dashboards.getAdminMetrics,
  getSubjectInsights: dashboards.getSubjectInsights,

  // Trends Functions
  getMonthlyTrends: trends.getMonthlyTrends,
  getRetentionCohorts: trends.getRetentionCohorts,
  getSubjectTrends: trends.getSubjectTrends,
  getChurnPredictionData: trends.getChurnPredictionData
};
