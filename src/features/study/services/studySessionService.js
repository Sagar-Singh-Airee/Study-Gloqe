// src/services/studySessionService.js - 🏆 ULTIMATE ENTERPRISE EDITION 2025
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  writeBatch,
  increment,
  setDoc
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@shared/config/firebase';
import { eventBus, EVENT_TYPES } from '@shared/services/eventBus';
import toast from 'react-hot-toast';

// ==================== 🔧 CONFIGURATION ====================

const CONFIG = {
  MAX_SESSION_DURATION: 12 * 60, // 12 hours in minutes
  MIN_SESSION_DURATION: 1, // 1 minute minimum
  AUTO_SAVE_INTERVAL: 60 * 1000, // Auto-save every 60 seconds
  HEARTBEAT_INTERVAL: 30 * 1000, // Heartbeat every 30 seconds
  IDLE_TIMEOUT: 15 * 60 * 1000, // 15 minutes idle = pause
  SESSION_RECOVERY_WINDOW: 24 * 60 * 60 * 1000, // 24 hours
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  CACHE_TTL: 5 * 60 * 1000, // 5 minutes
  BATCH_SIZE: 500
};

// ==================== 💾 SESSION CACHE ====================

class SessionCache {
  constructor() {
    this.cache = new Map();
    this.listeners = new Map();
  }

  set(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
    this.notifyListeners(key, value);
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > CONFIG.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  delete(key) {
    this.cache.delete(key);
    this.notifyListeners(key, null);
  }

  clear() {
    this.cache.clear();
  }

  subscribe(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key).add(callback);

    return () => {
      const listeners = this.listeners.get(key);
      if (listeners) {
        listeners.delete(callback);
      }
    };
  }

  notifyListeners(key, value) {
    const listeners = this.listeners.get(key);
    if (listeners) {
      listeners.forEach(callback => callback(value));
    }
  }
}

const sessionCache = new SessionCache();

// ==================== 🔄 RETRY MECHANISM ====================

const retryOperation = async (operation, attempts = CONFIG.RETRY_ATTEMPTS, delay = CONFIG.RETRY_DELAY) => {
  for (let i = 0; i < attempts; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === attempts - 1) throw error;

      console.warn(`⚠️ Attempt ${i + 1} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
};

// ==================== 📊 SESSION MANAGER CLASS ====================

class SessionManager {
  constructor() {
    this.activeSessionId = null;
    this.autoSaveTimer = null;
    this.heartbeatTimer = null;
    this.idleTimer = null;
    this.lastActivity = Date.now();
    this.activityLog = [];
    this.sessionMetrics = {
      pagesViewed: 0,
      notesCreated: 0,
      highlightsMade: 0,
      quizzesGenerated: 0,
      flashcardsCreated: 0
    };
  }

  trackActivity(activityType, metadata = {}) {
    this.lastActivity = Date.now();

    this.activityLog.push({
      type: activityType,
      timestamp: Date.now(),
      metadata
    });

    // Update metrics
    if (activityType === 'page_view') this.sessionMetrics.pagesViewed++;
    if (activityType === 'note_created') this.sessionMetrics.notesCreated++;
    if (activityType === 'highlight_made') this.sessionMetrics.highlightsMade++;
    if (activityType === 'quiz_generated') this.sessionMetrics.quizzesGenerated++;
    if (activityType === 'flashcard_created') this.sessionMetrics.flashcardsCreated++;

    this.resetIdleTimer();
  }

  resetIdleTimer() {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }

    this.idleTimer = setTimeout(() => {
      this.handleIdle();
    }, CONFIG.IDLE_TIMEOUT);
  }

  async handleIdle() {
    if (this.activeSessionId) {
      console.log('💤 User idle, pausing session...');
      await pauseStudySession(this.activeSessionId);

      eventBus.publish(EVENT_TYPES.STUDY_SESSION_PAUSED, {
        sessionId: this.activeSessionId,
        reason: 'idle',
        idleTime: CONFIG.IDLE_TIMEOUT
      });
    }
  }

  startAutoSave(sessionId) {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }

    this.autoSaveTimer = setInterval(async () => {
      try {
        await autoSaveSession(sessionId, this.sessionMetrics, this.activityLog);
      } catch (error) {
        console.warn('⚠️ Auto-save failed:', error);
      }
    }, CONFIG.AUTO_SAVE_INTERVAL);
  }

  startHeartbeat(sessionId) {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.heartbeatTimer = setInterval(async () => {
      try {
        await sendHeartbeat(sessionId);
      } catch (error) {
        console.warn('⚠️ Heartbeat failed:', error);
      }
    }, CONFIG.HEARTBEAT_INTERVAL);
  }

  stopTimers() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  reset() {
    this.activeSessionId = null;
    this.activityLog = [];
    this.sessionMetrics = {
      pagesViewed: 0,
      notesCreated: 0,
      highlightsMade: 0,
      quizzesGenerated: 0,
      flashcardsCreated: 0
    };
    this.stopTimers();
  }
}

const sessionManager = new SessionManager();

// ==================== 🚀 CORE FUNCTIONS ====================

/**
 * Start a new study session with advanced features
 */
export const startStudySession = async (userId, documentId, documentTitle, subject, options = {}) => {
  try {
    console.log('🚀 Starting advanced study session...');

    if (!userId) {
      throw new Error('User ID is required');
    }

    // Check for existing active session
    const activeSession = await getActiveSession(userId);

    if (activeSession) {
      console.log('📌 Existing active session found');

      // If same document, resume it
      if (activeSession.documentId === documentId) {
        console.log('▶️ Resuming existing session');
        await resumeStudySession(activeSession.id);

        sessionManager.activeSessionId = activeSession.id;
        sessionManager.startAutoSave(activeSession.id);
        sessionManager.startHeartbeat(activeSession.id);
        sessionManager.resetIdleTimer();

        return activeSession.id;
      } else {
        // Different document, exit old session and start new
        console.log('🔄 Switching documents, ending previous session');
        await exitStudySession(activeSession.id, userId, activeSession.documentId, activeSession.documentTitle, activeSession.subject);
      }
    }

    // Recover abandoned sessions if within recovery window
    await recoverAbandonedSessions(userId);

    // Create new session
    const sessionData = {
      userId,
      documentId: documentId || null,
      documentTitle: documentTitle || 'Untitled',
      subject: subject || 'General Studies',
      status: 'active',
      startTime: serverTimestamp(),
      lastHeartbeat: serverTimestamp(),
      lastActivity: serverTimestamp(),

      // Session metadata
      platform: detectPlatform(),
      userAgent: navigator.userAgent,
      screenResolution: `${window.screen.width}x${window.screen.height}`,

      // Metrics
      totalPauses: 0,
      pausedDuration: 0,
      pagesViewed: 0,
      notesCreated: 0,
      highlightsMade: 0,
      quizzesGenerated: 0,
      flashcardsCreated: 0,

      // Activity tracking
      activityLog: [],

      // Additional options
      ...options,

      // Timestamps
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await retryOperation(async () => {
      return await addDoc(collection(db, 'studySessions'), sessionData);
    });

    const sessionId = docRef.id;
    console.log('✅ Session created:', sessionId);

    // Cache session
    sessionCache.set(`session_${sessionId}`, {
      id: sessionId,
      ...sessionData,
      startTime: new Date()
    });

    // Update manager
    sessionManager.activeSessionId = sessionId;
    sessionManager.startAutoSave(sessionId);
    sessionManager.startHeartbeat(sessionId);
    sessionManager.resetIdleTimer();

    // Publish event
    eventBus.publish(EVENT_TYPES.STUDY_SESSION_STARTED, {
      userId,
      sessionId,
      documentId: documentId || null,
      documentTitle: documentTitle || 'Untitled',
      subject: subject || 'General Studies',
      startTime: new Date().toISOString(),
      platform: detectPlatform()
    });

    console.log('📤 Event published: STUDY_SESSION_STARTED');

    // Update user stats
    await updateUserSessionStats(userId, 'start');

    return sessionId;

  } catch (error) {
    console.error('❌ Error starting session:', error);
    throw error;
  }
};

/**
 * Exit study session with comprehensive cleanup
 */
export const exitStudySession = async (sessionId, userId, documentId, documentTitle, subject) => {
  try {
    console.log('🔄 Exiting study session:', sessionId);

    if (!sessionId) {
      throw new Error('Session ID is required');
    }

    // Get session
    const sessionRef = doc(db, 'studySessions', sessionId);
    const sessionSnap = await getDoc(sessionRef);

    if (!sessionSnap.exists()) {
      console.warn('⚠️ Session not found');
      return { success: false, error: 'Session not found' };
    }

    const sessionData = sessionSnap.data();

    // Calculate duration
    const startTime = sessionData.startTime.toMillis();
    const endTime = Date.now();
    const totalTimeMinutes = Math.floor((endTime - startTime) / 1000 / 60);

    // Cap duration
    const cappedTime = Math.min(
      Math.max(totalTimeMinutes - (sessionData.pausedDuration || 0), CONFIG.MIN_SESSION_DURATION),
      CONFIG.MAX_SESSION_DURATION
    );

    console.log(`⏱️ Session duration: ${cappedTime} minutes (${sessionData.pausedDuration || 0} minutes paused)`);

    // Calculate engagement score
    const engagementScore = calculateEngagementScore({
      duration: cappedTime,
      pagesViewed: sessionManager.sessionMetrics.pagesViewed || sessionData.pagesViewed || 0,
      notesCreated: sessionManager.sessionMetrics.notesCreated || sessionData.notesCreated || 0,
      highlightsMade: sessionManager.sessionMetrics.highlightsMade || sessionData.highlightsMade || 0,
      quizzesGenerated: sessionManager.sessionMetrics.quizzesGenerated || sessionData.quizzesGenerated || 0,
      flashcardsCreated: sessionManager.sessionMetrics.flashcardsCreated || sessionData.flashcardsCreated || 0
    });

    // Update Firestore
    const updateData = {
      status: 'completed',
      endTime: Timestamp.now(),
      totalTime: cappedTime,
      engagementScore,
      ...sessionManager.sessionMetrics,
      activityLog: sessionManager.activityLog,
      exitedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await retryOperation(async () => {
      await updateDoc(sessionRef, updateData);
    });

    console.log('✅ Firestore updated');

    // Publish event
    eventBus.publish(EVENT_TYPES.STUDY_SESSION_ENDED, {
      userId: userId || sessionData.userId,
      sessionId,
      documentId: documentId || sessionData.documentId,
      documentTitle: documentTitle || sessionData.documentTitle,
      subject: subject || sessionData.subject,
      duration: cappedTime,
      engagementScore,
      metrics: sessionManager.sessionMetrics,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString()
    });

    console.log('📤 Event published: STUDY_SESSION_ENDED');

    // Sync to BigQuery (non-blocking)
    syncToBigQuery({
      userId: userId || sessionData.userId,
      sessionId,
      documentId: documentId || sessionData.documentId,
      documentTitle: documentTitle || sessionData.documentTitle,
      subject: subject || sessionData.subject,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      totalMinutes: cappedTime,
      engagementScore,
      status: 'completed',
      ...sessionManager.sessionMetrics
    }).catch(err => console.warn('⚠️ BigQuery sync warning:', err.message));

    // Update document stats
    if (documentId || sessionData.documentId) {
      await updateDocumentStats(documentId || sessionData.documentId, cappedTime);
    }

    // Update user stats
    await updateUserSessionStats(userId || sessionData.userId, 'end', cappedTime);

    // Create session summary for analytics
    await createSessionSummary(sessionId, {
      ...sessionData,
      ...updateData,
      totalTime: cappedTime
    });

    // Clear cache and reset manager
    sessionCache.delete(`session_${sessionId}`);
    sessionManager.reset();

    console.log('🎉 Session exit complete!');

    return {
      success: true,
      totalMinutes: cappedTime,
      engagementScore,
      sessionId
    };

  } catch (error) {
    console.error('❌ Error exiting session:', error);
    throw error;
  }
};

/**
 * Pause study session
 */
export const pauseStudySession = async (sessionId) => {
  try {
    console.log('⏸️ Pausing session:', sessionId);

    const sessionRef = doc(db, 'studySessions', sessionId);
    const sessionSnap = await getDoc(sessionRef);

    if (!sessionSnap.exists()) {
      throw new Error('Session not found');
    }

    const sessionData = sessionSnap.data();

    if (sessionData.status !== 'active') {
      console.warn('⚠️ Session is not active');
      return;
    }

    await updateDoc(sessionRef, {
      status: 'paused',
      pausedAt: serverTimestamp(),
      totalPauses: increment(1),
      updatedAt: serverTimestamp()
    });

    sessionManager.stopTimers();

    eventBus.publish(EVENT_TYPES.STUDY_SESSION_PAUSED, {
      sessionId,
      pausedAt: new Date().toISOString()
    });

    console.log('✅ Session paused');

  } catch (error) {
    console.error('❌ Error pausing session:', error);
    throw error;
  }
};

/**
 * Resume paused session
 */
export const resumeStudySession = async (sessionId) => {
  try {
    console.log('▶️ Resuming session:', sessionId);

    const sessionRef = doc(db, 'studySessions', sessionId);
    const sessionSnap = await getDoc(sessionRef);

    if (!sessionSnap.exists()) {
      throw new Error('Session not found');
    }

    const sessionData = sessionSnap.data();

    if (sessionData.status !== 'paused') {
      console.warn('⚠️ Session is not paused');
      return;
    }

    // Calculate pause duration
    const pausedDuration = sessionData.pausedAt
      ? Math.floor((Date.now() - sessionData.pausedAt.toMillis()) / 1000 / 60)
      : 0;

    await updateDoc(sessionRef, {
      status: 'active',
      pausedDuration: increment(pausedDuration),
      lastActivity: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    sessionManager.startAutoSave(sessionId);
    sessionManager.startHeartbeat(sessionId);
    sessionManager.resetIdleTimer();

    eventBus.publish(EVENT_TYPES.STUDY_SESSION_RESUMED, {
      sessionId,
      resumedAt: new Date().toISOString(),
      pauseDuration: pausedDuration
    });

    console.log('✅ Session resumed');

  } catch (error) {
    console.error('❌ Error resuming session:', error);
    throw error;
  }
};

/**
 * Get active session for user
 */
export const getActiveSession = async (userId) => {
  try {
    // Check cache first
    const cacheKey = `active_session_${userId}`;
    const cached = sessionCache.get(cacheKey);
    if (cached) return cached;

    const q = query(
      collection(db, 'studySessions'),
      where('userId', '==', userId),
      where('status', '==', 'active'),
      orderBy('startTime', 'desc'),
      limit(1)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;

    const session = {
      id: snapshot.docs[0].id,
      ...snapshot.docs[0].data()
    };

    // Cache it
    sessionCache.set(cacheKey, session);

    return session;
  } catch (error) {
    console.error('Error getting active session:', error);
    return null;
  }
};

/**
 * Track activity in current session
 */
export const trackSessionActivity = (activityType, metadata = {}) => {
  sessionManager.trackActivity(activityType, metadata);
};

/**
 * Auto-save session progress
 */
const autoSaveSession = async (sessionId, metrics, activityLog) => {
  try {
    const sessionRef = doc(db, 'studySessions', sessionId);

    await updateDoc(sessionRef, {
      ...metrics,
      activityLog: activityLog.slice(-100), // Keep last 100 activities
      lastActivity: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    console.log('💾 Session auto-saved');
  } catch (error) {
    console.warn('⚠️ Auto-save failed:', error);
  }
};

/**
 * Send heartbeat to keep session alive
 */
const sendHeartbeat = async (sessionId) => {
  try {
    const sessionRef = doc(db, 'studySessions', sessionId);

    await updateDoc(sessionRef, {
      lastHeartbeat: serverTimestamp()
    });

    console.log('💓 Heartbeat sent');
  } catch (error) {
    console.warn('⚠️ Heartbeat failed:', error);
  }
};

/**
 * Recover abandoned sessions
 */
const recoverAbandonedSessions = async (userId) => {
  try {
    const cutoffTime = Date.now() - CONFIG.SESSION_RECOVERY_WINDOW;

    const q = query(
      collection(db, 'studySessions'),
      where('userId', '==', userId),
      where('status', '==', 'active'),
      where('startTime', '<', Timestamp.fromMillis(cutoffTime))
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) return;

    console.log(`🔧 Recovering ${snapshot.size} abandoned sessions...`);

    const batch = writeBatch(db);

    snapshot.forEach((docSnap) => {
      const sessionData = docSnap.data();
      const duration = Math.floor((Date.now() - sessionData.startTime.toMillis()) / 1000 / 60);
      const cappedDuration = Math.min(duration, CONFIG.MAX_SESSION_DURATION);

      batch.update(docSnap.ref, {
        status: 'abandoned',
        endTime: serverTimestamp(),
        totalTime: cappedDuration,
        recovered: true,
        updatedAt: serverTimestamp()
      });
    });

    await batch.commit();
    console.log('✅ Abandoned sessions recovered');

  } catch (error) {
    console.warn('⚠️ Session recovery failed:', error);
  }
};

/**
 * Sync session to BigQuery
 */
const syncToBigQuery = async (sessionData) => {
  try {
    const syncFunction = httpsCallable(functions, 'syncStudySessionToBigQuery');
    const result = await syncFunction(sessionData);
    console.log('✅ BigQuery synced:', result.data);
    return result.data;
  } catch (error) {
    console.error('❌ BigQuery sync failed:', error);
    throw error;
  }
};

/**
 * Calculate engagement score
 */
const calculateEngagementScore = (data) => {
  const {
    duration,
    pagesViewed,
    notesCreated,
    highlightsMade,
    quizzesGenerated,
    flashcardsCreated
  } = data;

  let score = 0;

  // Duration points (max 40)
  score += Math.min(duration / 30, 1) * 40;

  // Activity points (max 60)
  score += Math.min(pagesViewed / 10, 1) * 15;
  score += Math.min(notesCreated / 5, 1) * 15;
  score += Math.min(highlightsMade / 10, 1) * 10;
  score += Math.min(quizzesGenerated / 3, 1) * 10;
  score += Math.min(flashcardsCreated / 5, 1) * 10;

  return Math.round(Math.min(score, 100));
};

/**
 * Update document statistics
 */
const updateDocumentStats = async (documentId, studyTime) => {
  try {
    const docRef = doc(db, 'documents', documentId);
    await updateDoc(docRef, {
      totalStudyTime: increment(studyTime),
      lastStudiedAt: serverTimestamp(),
      studySessions: increment(1)
    });
  } catch (error) {
    console.warn('⚠️ Document stats update failed:', error);
  }
};

/**
 * Update user session statistics
 */
const updateUserSessionStats = async (userId, action, studyTime = 0) => {
  try {
    const userRef = doc(db, 'users', userId);

    const updates = {
      updatedAt: serverTimestamp()
    };

    if (action === 'start') {
      updates.totalSessions = increment(1);
      updates.lastSessionStarted = serverTimestamp();
    } else if (action === 'end') {
      updates.totalStudyTime = increment(studyTime);
      updates.lastSessionEnded = serverTimestamp();
    }

    await updateDoc(userRef, updates);
  } catch (error) {
    console.warn('⚠️ User stats update failed:', error);
  }
};

/**
 * Create session summary for analytics
 */
const createSessionSummary = async (sessionId, sessionData) => {
  try {
    const summaryRef = doc(db, 'sessionSummaries', sessionId);

    await setDoc(summaryRef, {
      sessionId,
      userId: sessionData.userId,
      documentId: sessionData.documentId,
      subject: sessionData.subject,
      duration: sessionData.totalTime,
      engagementScore: sessionData.engagementScore,
      date: Timestamp.now(),
      metrics: {
        pagesViewed: sessionData.pagesViewed || 0,
        notesCreated: sessionData.notesCreated || 0,
        highlightsMade: sessionData.highlightsMade || 0,
        quizzesGenerated: sessionData.quizzesGenerated || 0,
        flashcardsCreated: sessionData.flashcardsCreated || 0
      },
      createdAt: serverTimestamp()
    });

    console.log('✅ Session summary created');
  } catch (error) {
    console.warn('⚠️ Session summary creation failed:', error);
  }
};

/**
 * Get user's study sessions with advanced filtering
 */
export const getUserStudySessions = async (userId, options = {}) => {
  try {
    const {
      dateRange = 30,
      status = 'completed',
      subject = null,
      limitCount = 100,
      includeMetrics = false
    } = options;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - dateRange);

    let q = query(
      collection(db, 'studySessions'),
      where('userId', '==', userId),
      where('status', '==', status)
    );

    if (subject) {
      q = query(q, where('subject', '==', subject));
    }

    q = query(q, where('endTime', '>=', Timestamp.fromDate(cutoffDate)));
    q = query(q, orderBy('endTime', 'desc'));
    q = query(q, limit(limitCount));

    const snapshot = await getDocs(q);
    const sessions = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      sessions.push({
        id: doc.id,
        ...data,
        ...(includeMetrics && {
          engagementScore: calculateEngagementScore(data)
        })
      });
    });

    return sessions;
  } catch (error) {
    console.error('Error getting sessions:', error);
    return [];
  }
};

/**
 * Get session analytics
 */
export const getSessionAnalytics = async (userId, dateRange = 30) => {
  try {
    const sessions = await getUserStudySessions(userId, {
      dateRange,
      includeMetrics: true
    });

    const analytics = {
      totalSessions: sessions.length,
      totalMinutes: 0,
      averageSessionDuration: 0,
      averageEngagementScore: 0,
      subjectBreakdown: {},
      dailyActivity: {},
      weekdayDistribution: Array(7).fill(0),
      hourlyDistribution: Array(24).fill(0),
      longestSession: 0,
      mostProductiveDay: null,
      studyStreak: 0
    };

    sessions.forEach(session => {
      const duration = session.totalTime || 0;
      analytics.totalMinutes += duration;
      analytics.averageEngagementScore += session.engagementScore || 0;

      // Subject breakdown
      const subject = session.subject || 'Unknown';
      if (!analytics.subjectBreakdown[subject]) {
        analytics.subjectBreakdown[subject] = { count: 0, minutes: 0 };
      }
      analytics.subjectBreakdown[subject].count++;
      analytics.subjectBreakdown[subject].minutes += duration;

      // Daily activity
      if (session.endTime) {
        const date = session.endTime.toDate().toISOString().split('T')[0];
        analytics.dailyActivity[date] = (analytics.dailyActivity[date] || 0) + duration;
      }

      // Weekday distribution
      if (session.startTime) {
        const weekday = session.startTime.toDate().getDay();
        analytics.weekdayDistribution[weekday] += duration;
      }

      // Hourly distribution
      if (session.startTime) {
        const hour = session.startTime.toDate().getHours();
        analytics.hourlyDistribution[hour] += duration;
      }

      // Longest session
      if (duration > analytics.longestSession) {
        analytics.longestSession = duration;
      }
    });

    analytics.averageSessionDuration = sessions.length > 0
      ? Math.round(analytics.totalMinutes / sessions.length)
      : 0;

    analytics.averageEngagementScore = sessions.length > 0
      ? Math.round(analytics.averageEngagementScore / sessions.length)
      : 0;

    // Calculate study streak
    analytics.studyStreak = calculateStudyStreak(analytics.dailyActivity);

    // Find most productive day
    const maxMinutes = Math.max(...Object.values(analytics.dailyActivity));
    analytics.mostProductiveDay = Object.entries(analytics.dailyActivity)
      .find(([_, minutes]) => minutes === maxMinutes)?.[0] || null;

    return analytics;
  } catch (error) {
    console.error('Error getting analytics:', error);
    return null;
  }
};

/**
 * Calculate study streak
 */
const calculateStudyStreak = (dailyActivity) => {
  const dates = Object.keys(dailyActivity).sort().reverse();
  let streak = 0;
  const today = new Date().toISOString().split('T')[0];

  for (let i = 0; i < dates.length; i++) {
    const date = dates[i];
    const expectedDate = new Date();
    expectedDate.setDate(expectedDate.getDate() - i);
    const expected = expectedDate.toISOString().split('T')[0];

    if (date === expected) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
};

/**
 * Detect platform
 */
const detectPlatform = () => {
  const ua = navigator.userAgent;
  if (/mobile/i.test(ua)) return 'mobile';
  if (/tablet|ipad/i.test(ua)) return 'tablet';
  return 'desktop';
};

/**
 * Subscribe to session updates
 */
export const subscribeToSession = (sessionId, callback) => {
  return sessionCache.subscribe(`session_${sessionId}`, callback);
};

/**
 * Get current session manager state
 */
export const getSessionManagerState = () => {
  return {
    activeSessionId: sessionManager.activeSessionId,
    metrics: { ...sessionManager.sessionMetrics },
    activityCount: sessionManager.activityLog.length,
    lastActivity: sessionManager.lastActivity
  };
};

/**
 * Force save current session
 */
export const forceSaveSession = async () => {
  if (sessionManager.activeSessionId) {
    await autoSaveSession(
      sessionManager.activeSessionId,
      sessionManager.sessionMetrics,
      sessionManager.activityLog
    );
  }
};

/**
 * Clear session cache
 */
export const clearSessionCache = () => {
  sessionCache.clear();
  console.log('🗑️ Session cache cleared');
};

// ==================== 📦 EXPORTS ====================

export default {
  // Core functions
  startStudySession,
  exitStudySession,
  pauseStudySession,
  resumeStudySession,
  getActiveSession,

  // Activity tracking
  trackSessionActivity,
  forceSaveSession,

  // Analytics
  getUserStudySessions,
  getSessionAnalytics,

  // Utilities
  subscribeToSession,
  getSessionManagerState,
  clearSessionCache
};
