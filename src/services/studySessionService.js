// src/services/studySessionService.js - COMPLETE
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
import { db, functions } from '@/config/firebase';
import toast from 'react-hot-toast';

/**
 * Exit study session - Saves to Firestore AND BigQuery
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

    // 4. Send to BigQuery
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
