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
  setDoc,
  onSnapshot
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@shared/config/firebase';
import { eventBus, EVENT_TYPES } from '@shared/services/eventBus';
import { trackAction } from '@gamification/services/achievementTracker';
import { calculateTrueStreak } from '@shared/utils/streakUtils';
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
  BATCH_SIZE: 500,
  MAX_ACTIVITY_LOG: 200, // Keep last 200 activities
  PERFORMANCE_MONITORING: true,
  OFFLINE_MODE: true,
  SESSION_VERSION: '2.0' // For migration support
};

// ==================== 📊 PERFORMANCE MONITOR ====================

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
  }

  start(operation) {
    if (!CONFIG.PERFORMANCE_MONITORING) return null;
    const startTime = performance.now();
    return {
      operation,
      startTime,
      end: () => {
        const duration = performance.now() - startTime;
        this.recordMetric(operation, duration);
        if (duration > 1000) {
          console.warn(`⚠️ Slow operation: ${operation} took ${duration.toFixed(2)}ms`);
        }
        return duration;
      }
    };
  }

  recordMetric(operation, duration) {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, {
        count: 0,
        totalTime: 0,
        avgTime: 0,
        maxTime: 0,
        minTime: Infinity
      });
    }

    const metric = this.metrics.get(operation);
    metric.count++;
    metric.totalTime += duration;
    metric.avgTime = metric.totalTime / metric.count;
    metric.maxTime = Math.max(metric.maxTime, duration);
    metric.minTime = Math.min(metric.minTime, duration);
  }

  getMetrics(operation) {
    return this.metrics.get(operation) || null;
  }

  getAllMetrics() {
    return Object.fromEntries(this.metrics);
  }

  reset() {
    this.metrics.clear();
  }
}

const performanceMonitor = new PerformanceMonitor();

// ==================== 🌐 NETWORK STATUS MONITOR ====================

class NetworkMonitor {
  constructor() {
    this.isOnline = navigator.onLine;
    this.listeners = new Set();
    this.setupListeners();
  }

  setupListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('🌐 Network: ONLINE');
      this.notifyListeners(true);
      toast.success('Back online! Syncing...', { icon: '🌐' });
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.warn('📴 Network: OFFLINE');
      this.notifyListeners(false);
      toast.error('No internet connection', { icon: '📴' });
    });
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners(status) {
    this.listeners.forEach(callback => callback(status));
  }

  getStatus() {
    return this.isOnline;
  }
}

const networkMonitor = new NetworkMonitor();

// ==================== 💾 ENHANCED SESSION CACHE ====================

class SessionCache {
  constructor() {
    this.cache = new Map();
    this.listeners = new Map();
    this.statistics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
  }

  set(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      hits: 0
    });
    this.statistics.sets++;
    this.notifyListeners(key, value);
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) {
      this.statistics.misses++;
      return null;
    }

    if (Date.now() - item.timestamp > CONFIG.CACHE_TTL) {
      this.cache.delete(key);
      this.statistics.misses++;
      return null;
    }

    item.hits++;
    this.statistics.hits++;
    return item.value;
  }

  delete(key) {
    this.cache.delete(key);
    this.statistics.deletes++;
    this.notifyListeners(key, null);
  }

  clear() {
    this.cache.clear();
    this.statistics = { hits: 0, misses: 0, sets: 0, deletes: 0 };
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

  getStatistics() {
    const hitRate = this.statistics.hits / (this.statistics.hits + this.statistics.misses) || 0;
    return {
      ...this.statistics,
      hitRate: (hitRate * 100).toFixed(2) + '%',
      cacheSize: this.cache.size
    };
  }

  // Clean expired entries
  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > CONFIG.CACHE_TTL) {
        this.cache.delete(key);
      }
    }
  }
}

const sessionCache = new SessionCache();

// Auto-cleanup cache every 5 minutes
setInterval(() => sessionCache.cleanup(), 5 * 60 * 1000);

// ==================== 🔄 ENHANCED RETRY MECHANISM ====================

const retryOperation = async (
  operation,
  attempts = CONFIG.RETRY_ATTEMPTS,
  delay = CONFIG.RETRY_DELAY,
  operationName = 'Operation'
) => {
  for (let i = 0; i < attempts; i++) {
    try {
      const perf = performanceMonitor.start(operationName);
      const result = await operation();
      perf?.end();
      return result;
    } catch (error) {
      if (i === attempts - 1) {
        console.error(`❌ ${operationName} failed after ${attempts} attempts:`, error);
        throw error;
      }

      const backoffDelay = delay * Math.pow(2, i);
      console.warn(`⚠️ ${operationName} attempt ${i + 1} failed, retrying in ${backoffDelay}ms...`);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
    }
  }
};

// ==================== 📊 ENHANCED SESSION MANAGER ====================

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
    this.offlineQueue = [];
    this.listeners = new Set();
    this.setupVisibilityListener();
    this.setupNetworkListener();
    this.restoreFromLocalStorage();
  }

  // 🔄 Restore session from localStorage on reload
  restoreFromLocalStorage() {
    try {
      const stored = localStorage.getItem('activeSession');
      if (stored) {
        const session = JSON.parse(stored);
        if (Date.now() - session.timestamp < 30 * 60 * 1000) { // 30 minutes
          this.activeSessionId = session.sessionId;
          this.sessionMetrics = session.metrics || this.sessionMetrics;
          console.log('🔄 Restored session from localStorage:', this.activeSessionId);
        } else {
          localStorage.removeItem('activeSession');
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to restore session:', error);
    }
  }

  // 💾 Save to localStorage
  saveToLocalStorage() {
    try {
      localStorage.setItem('activeSession', JSON.stringify({
        sessionId: this.activeSessionId,
        metrics: this.sessionMetrics,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.warn('⚠️ Failed to save session to localStorage:', error);
    }
  }

  // 👁️ Handle page visibility changes
  setupVisibilityListener() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        console.log('👁️ Page hidden - auto-saving...');
        this.handlePageHidden();
      } else {
        console.log('👁️ Page visible - resuming...');
        this.handlePageVisible();
      }
    });
  }

  // 🌐 Handle network changes
  setupNetworkListener() {
    networkMonitor.subscribe((isOnline) => {
      if (isOnline && this.offlineQueue.length > 0) {
        this.processOfflineQueue();
      }
    });
  }

  async handlePageHidden() {
    if (this.activeSessionId) {
      await forceSaveSession();
      this.pauseTimers();
    }
  }

  async handlePageVisible() {
    if (this.activeSessionId) {
      this.resumeTimers();
      this.resetIdleTimer();
    }
  }

  pauseTimers() {
    if (this.autoSaveTimer) clearInterval(this.autoSaveTimer);
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
  }

  resumeTimers() {
    if (this.activeSessionId) {
      this.startAutoSave(this.activeSessionId);
      this.startHeartbeat(this.activeSessionId);
    }
  }

  trackActivity(activityType, metadata = {}) {
    this.lastActivity = Date.now();

    const activity = {
      type: activityType,
      timestamp: Date.now(),
      metadata
    };

    this.activityLog.push(activity);

    // Keep only recent activities
    if (this.activityLog.length > CONFIG.MAX_ACTIVITY_LOG) {
      this.activityLog = this.activityLog.slice(-CONFIG.MAX_ACTIVITY_LOG);
    }

    // Update metrics
    if (activityType === 'pageview') this.sessionMetrics.pagesViewed++;
    if (activityType === 'notecreated') this.sessionMetrics.notesCreated++;
    if (activityType === 'highlightmade') this.sessionMetrics.highlightsMade++;
    if (activityType === 'quizgenerated') this.sessionMetrics.quizzesGenerated++;
    if (activityType === 'flashcardcreated') this.sessionMetrics.flashcardsCreated++;

    this.saveToLocalStorage();
    this.resetIdleTimer();
    this.notifyListeners('activity', activity);
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

      try {
        await pauseStudySession(this.activeSessionId);

        eventBus.publish(EVENT_TYPES.STUDY_SESSION_PAUSED, {
          sessionId: this.activeSessionId,
          reason: 'idle',
          idleTime: CONFIG.IDLE_TIMEOUT
        });

        toast('Session paused due to inactivity', {
          icon: '💤',
          duration: 3000
        });
      } catch (error) {
        console.error('❌ Failed to pause idle session:', error);
      }
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
        if (!networkMonitor.getStatus()) {
          this.queueOfflineOperation('autosave', { sessionId, metrics: this.sessionMetrics });
        }
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

  queueOfflineOperation(type, data) {
    this.offlineQueue.push({
      type,
      data,
      timestamp: Date.now()
    });
    console.log(`📴 Queued offline operation: ${type}`);
  }

  async processOfflineQueue() {
    console.log(`🔄 Processing ${this.offlineQueue.length} offline operations...`);

    while (this.offlineQueue.length > 0) {
      const operation = this.offlineQueue.shift();

      try {
        if (operation.type === 'autosave') {
          await autoSaveSession(
            operation.data.sessionId,
            operation.data.metrics,
            this.activityLog
          );
        }
      } catch (error) {
        console.error('❌ Failed to process offline operation:', error);
        // Re-queue if failed
        this.offlineQueue.unshift(operation);
        break;
      }
    }
  }

  subscribe(event, callback) {
    this.listeners.add({ event, callback });
    return () => this.listeners.delete({ event, callback });
  }

  notifyListeners(event, data) {
    this.listeners.forEach(listener => {
      if (listener.event === event) {
        listener.callback(data);
      }
    });
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
    localStorage.removeItem('activeSession');
  }

  getState() {
    return {
      activeSessionId: this.activeSessionId,
      metrics: { ...this.sessionMetrics },
      activityCount: this.activityLog.length,
      lastActivity: this.lastActivity,
      isOnline: networkMonitor.getStatus(),
      offlineQueueSize: this.offlineQueue.length
    };
  }
}

const sessionManager = new SessionManager();

// ==================== 🚀 CORE FUNCTIONS ====================

/**
 * Start a new study session with advanced features
 * @param {string} userId - User ID
 * @param {string} documentId - Document ID
 * @param {string} documentTitle - Document title
 * @param {string} subject - Subject
 * @param {object} options - Additional options
 * @returns {Promise<string>} Session ID
 */
export const startStudySession = async (userId, documentId, documentTitle, subject, options = {}) => {
  const perf = performanceMonitor.start('startStudySession');

  try {
    console.log('🚀 Starting advanced study session...');

    if (!userId) {
      throw new Error('User ID is required');
    }

    // Validate network connectivity
    if (!networkMonitor.getStatus() && !CONFIG.OFFLINE_MODE) {
      throw new Error('Cannot start session while offline');
    }

    // Check for existing active session
    const activeSession = await getActiveSession(userId);

    if (activeSession) {
      console.log('📌 Existing active session found:', activeSession.id);

      // If same document, resume it
      if (activeSession.documentId === documentId) {
        console.log('▶️ Resuming existing session');
        await resumeStudySession(activeSession.id);

        sessionManager.activeSessionId = activeSession.id;
        sessionManager.startAutoSave(activeSession.id);
        sessionManager.startHeartbeat(activeSession.id);
        sessionManager.resetIdleTimer();
        sessionManager.saveToLocalStorage();

        perf?.end();
        return activeSession.id;
      } else {
        // Different document, exit old session and start new
        console.log('🔄 Switching documents, ending previous session');
        await exitStudySession(
          activeSession.id,
          userId,
          activeSession.documentId,
          activeSession.documentTitle,
          activeSession.subject
        );
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
      sessionVersion: CONFIG.SESSION_VERSION,

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

    const docRef = await retryOperation(
      async () => await addDoc(collection(db, 'studySessions'), sessionData),
      CONFIG.RETRY_ATTEMPTS,
      CONFIG.RETRY_DELAY,
      'createSession'
    );

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
    sessionManager.saveToLocalStorage();

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

    perf?.end();
    return sessionId;

  } catch (error) {
    console.error('❌ Error starting session:', error);
    perf?.end();
    throw error;
  }
};

/**
 * Exit study session with comprehensive cleanup
 * @param {string} sessionId - Session ID
 * @param {string} userId - User ID
 * @param {string} documentId - Document ID
 * @param {string} documentTitle - Document title
 * @param {string} subject - Subject
 * @returns {Promise<object>} Exit result
 */
export const exitStudySession = async (sessionId, userId, documentId, documentTitle, subject) => {
  const perf = performanceMonitor.start('exitStudySession');

  try {
    console.log('🔄 Exiting study session:', sessionId);

    if (!sessionId) {
      throw new Error('Session ID is required');
    }

    // Get session
    const sessionRef = doc(db, 'studySessions', sessionId);
    const sessionSnap = await retryOperation(
      async () => await getDoc(sessionRef),
      CONFIG.RETRY_ATTEMPTS,
      CONFIG.RETRY_DELAY,
      'getSession'
    );

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

    await retryOperation(
      async () => await updateDoc(sessionRef, updateData),
      CONFIG.RETRY_ATTEMPTS,
      CONFIG.RETRY_DELAY,
      'updateSession'
    );

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

    // Parallelize auxiliary updates for performance
    const updatesPromises = [];

    // Update document stats
    if (documentId || sessionData.documentId) {
      updatesPromises.push(
        updateDocumentStats(documentId || sessionData.documentId, cappedTime)
          .catch(e => console.warn('⚠️ Doc stats update failed:', e))
      );
    }

    // Update user stats
    updatesPromises.push(
      updateUserSessionStats(userId || sessionData.userId, 'end', cappedTime)
        .catch(e => console.warn('⚠️ User stats update failed:', e))
    );

    // Create session summary for analytics
    updatesPromises.push(
      createSessionSummary(sessionId, {
        ...sessionData,
        ...updateData,
        totalTime: cappedTime
      }).catch(e => console.warn('⚠️ Session summary failed:', e))
    );

    // Wait for all updates (or fail gracefully)
    await Promise.all(updatesPromises);

    // Clear cache and reset manager
    sessionCache.delete(`session_${sessionId}`);
    sessionManager.reset();

    console.log('🎉 Session exit complete!');

    perf?.end();

    return {
      success: true,
      totalMinutes: cappedTime,
      engagementScore,
      sessionId
    };

  } catch (error) {
    console.error('❌ Error exiting session:', error);
    perf?.end();
    throw error;
  }
};

/**
 * Pause study session
 */
export const pauseStudySession = async (sessionId) => {
  const perf = performanceMonitor.start('pauseStudySession');

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
      perf?.end();
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
    perf?.end();

  } catch (error) {
    console.error('❌ Error pausing session:', error);
    perf?.end();
    throw error;
  }
};

/**
 * Resume paused session
 */
export const resumeStudySession = async (sessionId) => {
  const perf = performanceMonitor.start('resumeStudySession');

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
      perf?.end();
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
    perf?.end();

  } catch (error) {
    console.error('❌ Error resuming session:', error);
    perf?.end();
    throw error;
  }
};

/**
 * Get active session for user
 */
export const getActiveSession = async (userId) => {
  const perf = performanceMonitor.start('getActiveSession');

  try {
    // Check cache first
    const cacheKey = `active_session_${userId}`;
    const cached = sessionCache.get(cacheKey);
    if (cached) {
      perf?.end();
      return cached;
    }

    const q = query(
      collection(db, 'studySessions'),
      where('userId', '==', userId),
      where('status', '==', 'active'),
      orderBy('startTime', 'desc'),
      limit(1)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      perf?.end();
      return null;
    }

    const session = {
      id: snapshot.docs[0].id,
      ...snapshot.docs[0].data()
    };

    // Cache it
    sessionCache.set(cacheKey, session);

    perf?.end();
    return session;
  } catch (error) {
    console.error('Error getting active session:', error);
    perf?.end();
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
      activityLog: activityLog.slice(-CONFIG.MAX_ACTIVITY_LOG),
      lastActivity: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    console.log('💾 Session auto-saved');
  } catch (error) {
    console.warn('⚠️ Auto-save failed:', error);
    throw error;
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
    throw error;
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
 * Calculate engagement score (0-100)
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

      // ✅ Track study time for gamification
      if (studyTime > 0) {
        trackAction(userId, 'STUDY_TIME', { minutes: studyTime }).catch(console.error);
      }
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
  const perf = performanceMonitor.start('getSessionAnalytics');

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

    perf?.end();
    return analytics;
  } catch (error) {
    console.error('Error getting analytics:', error);
    perf?.end();
    return null;
  }
};

/**
 * Calculate study streak
 */
const calculateStudyStreak = (dailyActivity) => {
  return calculateTrueStreak(dailyActivity);
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
  return sessionManager.getState();
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

/**
 * Get performance metrics
 */
export const getPerformanceMetrics = () => {
  return {
    operations: performanceMonitor.getAllMetrics(),
    cache: sessionCache.getStatistics()
  };
};

/**
 * Export session data
 */
export const exportSessionData = async (sessionId) => {
  try {
    const sessionRef = doc(db, 'studySessions', sessionId);
    const sessionSnap = await getDoc(sessionRef);

    if (!sessionSnap.exists()) {
      throw new Error('Session not found');
    }

    const data = {
      ...sessionSnap.data(),
      id: sessionId,
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session-${sessionId}.json`;
    a.click();
    URL.revokeObjectURL(url);

    console.log('✅ Session data exported');
  } catch (error) {
    console.error('❌ Export failed:', error);
    throw error;
  }
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
  clearSessionCache,
  getPerformanceMetrics,
  exportSessionData,

  // Monitoring
  networkMonitor,
  performanceMonitor
};
