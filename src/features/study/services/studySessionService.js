// src/services/studySessionService.js - COMPLETE WITH EVENT BUS 📤
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  getDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  Timestamp,
  limit
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@shared/config/firebase';
import toast from 'react-hot-toast';

// 📤 Event Bus for real-time streaming
import { eventBus, EVENT_TYPES } from '@shared/services/eventBus';

/**
 * Exit study session - Saves to Firestore, BigQuery, AND publishes event
 */
export const exitStudySession = async (sessionId, userId, documentId, documentTitle, subject) => {
  try {
    console.log('🔄 Exiting study session:', sessionId);

    // 1. Get session from Firestore
    const sessionRef = doc(db, 'studySessions', sessionId);
    const sessionSnap = await getDoc(sessionRef);

    if (!sessionSnap.exists()) {
      throw new Error('Session not found');
    }

    const sessionData = sessionSnap.data();
    const startTime = sessionData.startTime.toMillis();
    const endTime = Date.now();

    // 2. Calculate total time in minutes
    const totalTimeMinutes = Math.floor((endTime - startTime) / 1000 / 60);

    // Cap at 12 hours (720 minutes)
    const cappedTime = Math.min(Math.max(totalTimeMinutes, 1), 720);

    console.log(`⏱️ Session duration: ${cappedTime} minutes`);

    // 3. Update Firestore
    await updateDoc(sessionRef, {
      status: 'completed',
      endTime: Timestamp.now(),
      totalTime: cappedTime,
      updatedAt: serverTimestamp()
    });

    console.log('✅ Firestore updated');

    // 4. 📤 Publish STUDY_SESSION_ENDED event
    eventBus.publish(EVENT_TYPES.STUDY_SESSION_ENDED, {
      userId,
      sessionId,
      documentId: documentId || null,
      documentTitle: documentTitle || 'Untitled',
      subject: subject || 'General Studies',
      duration: cappedTime,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString()
    });

    console.log('📤 Event published: STUDY_SESSION_ENDED');

    // 5. Send to BigQuery via Cloud Function
    try {
      const syncToBigQuery = httpsCallable(functions, 'syncStudySessionToBigQuery');
      const result = await syncToBigQuery({
        userId,
        sessionId,
        documentId: documentId || null,
        documentTitle: documentTitle || 'Untitled',
        subject: subject || 'General Studies',
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        totalMinutes: cappedTime,
        status: 'completed'
      });

      console.log('✅ BigQuery synced:', result.data);
    } catch (bqError) {
      console.warn('⚠️ BigQuery sync failed (non-critical):', bqError.message);
      // Don't throw - Firestore is already updated
    }

    return {
      success: true,
      totalMinutes: cappedTime,
      sessionId
    };

  } catch (error) {
    console.error('❌ Error exiting study session:', error);
    throw error;
  }
};

/**
 * Get active session for user
 */
export const getActiveSession = async (userId) => {
  try {
    const q = query(
      collection(db, 'studySessions'),
      where('userId', '==', userId),
      where('status', '==', 'active'),
      limit(1)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;

    return {
      id: snapshot.docs[0].id,
      ...snapshot.docs[0].data()
    };
  } catch (error) {
    console.error('Error getting active session:', error);
    return null;
  }
};

/**
 * Start a new study session
 */
export const startStudySession = async (userId, documentId, documentTitle, subject) => {
  try {
    // Check for existing active session
    const activeSession = await getActiveSession(userId);

    if (activeSession) {
      console.log('📌 Existing session found, using it');
      return activeSession.id;
    }

    // Create new session
    const sessionData = {
      userId,
      documentId,
      documentTitle: documentTitle || 'Untitled',
      subject: subject || 'General Studies',
      status: 'active',
      startTime: serverTimestamp(),
      createdAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'studySessions'), sessionData);
    console.log('✅ New session started:', docRef.id);

    // 📤 Publish STUDY_SESSION_STARTED event
    eventBus.publish(EVENT_TYPES.STUDY_SESSION_STARTED, {
      userId,
      sessionId: docRef.id,
      documentId,
      documentTitle: documentTitle || 'Untitled',
      subject: subject || 'General Studies',
      startTime: new Date().toISOString()
    });

    console.log('📤 Event published: STUDY_SESSION_STARTED');

    return docRef.id;
  } catch (error) {
    console.error('Error starting session:', error);
    throw error;
  }
};

/**
 * Get user's completed sessions
 */
export const getUserStudySessions = async (userId, dateRange = 30) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - dateRange);

    const q = query(
      collection(db, 'studySessions'),
      where('userId', '==', userId),
      where('status', '==', 'completed'),
      where('endTime', '>=', Timestamp.fromDate(cutoffDate))
    );

    const snapshot = await getDocs(q);
    const sessions = [];

    snapshot.forEach((doc) => {
      sessions.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return sessions;
  } catch (error) {
    console.error('Error getting sessions:', error);
    return [];
  }
};

export default {
  exitStudySession,
  getActiveSession,
  startStudySession,
  getUserStudySessions
};
