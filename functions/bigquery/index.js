// functions/bigquery/index.js
// Central export for all BigQuery Cloud Functions
// Handles analytics, recommendations, dashboards, trends, and event tracking

const analytics = require('./analytics');
const recommendations = require('./recommendations');
const dashboards = require('./dashboards');
const trends = require('./trends');
const tracker = require('./tracker');

// ===================================
// 📊 ANALYTICS FUNCTIONS
// ===================================
exports.getStudentAnalytics = analytics.getStudentAnalytics;
exports.getClassAnalytics = analytics.getClassAnalytics;
exports.getLearningPatterns = analytics.getLearningPatterns;
exports.getPerformanceTrends = analytics.getPerformanceTrends;

// ===================================
// 🎯 RECOMMENDATION FUNCTIONS
// ===================================
exports.getPersonalizedRecommendations = recommendations.getPersonalizedRecommendations;
exports.getStudyPlanRecommendations = recommendations.getStudyPlanRecommendations;
exports.getPeerComparison = recommendations.getPeerComparison;

// ===================================
// 📈 DASHBOARD FUNCTIONS
// ===================================
exports.getTeacherDashboardData = dashboards.getTeacherDashboardData;
exports.getAdminMetrics = dashboards.getAdminMetrics;
exports.getSubjectInsights = dashboards.getSubjectInsights;

// ===================================
// 📉 TRENDS & COHORT FUNCTIONS
// ===================================
exports.getMonthlyTrends = trends.getMonthlyTrends;
exports.getRetentionCohorts = trends.getRetentionCohorts;
exports.getSubjectTrends = trends.getSubjectTrends;
exports.getChurnPredictionData = trends.getChurnPredictionData;

// ===================================
// 🔔 EVENT TRACKING FUNCTIONS
// ===================================
exports.trackQuizCompletion = tracker.trackQuizCompletion;
exports.trackStudySession = tracker.trackStudySession;
exports.trackDocumentUpload = tracker.trackDocumentUpload;

// ===================================
// 🆕 HEALTH CHECK (Optional but useful)
// ===================================
const functions = require('firebase-functions');

exports.bigQueryHealthCheck = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  }

  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    dataset: 'studygloqe_analytics',
    location: 'asia-south1',
    availableFunctions: [
      'getStudentAnalytics',
      'getClassAnalytics',
      'getLearningPatterns',
      'getPerformanceTrends',
      'getPersonalizedRecommendations',
      'getStudyPlanRecommendations',
      'getPeerComparison',
      'getTeacherDashboardData',
      'getAdminMetrics',
      'getSubjectInsights',
      'getMonthlyTrends',
      'getRetentionCohorts',
      'getSubjectTrends',
      'getChurnPredictionData',
      'trackQuizCompletion',
      'trackStudySession',
      'trackDocumentUpload'
    ]
  };
});
