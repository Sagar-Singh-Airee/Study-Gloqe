// src/hooks/useStudySessionManager.js - ✅ FIXED: Proper imports + COLLECTIONS
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  doc,
  setDoc,
  updateDoc,
  Timestamp,
  collection,
  query,
  where,
  getDocs,
  writeBatch
} from 'firebase/firestore';
// ✅ FIXED: Import db and COLLECTIONS from config
import { db, COLLECTIONS } from '@shared/config/firebase';

/**
 * Hook to manage study sessions with proper lifecycle handling.
 * FIXES:
 * - Orphaned sessions (status='active') are cleaned up on startup
 * - Sessions are properly ended on page close/refresh
 * - No more "continuously increasing" study time bug
 */
export const useStudySessionManager = (userId, documentId, documentData) => {
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const sessionEndedRef = useRef(false);
  const cleanupRanRef = useRef(false);

  // ==========================================
  // CLEANUP ORPHANED SESSIONS (Run once on mount)
  // ==========================================
  useEffect(() => {
    if (!userId || cleanupRanRef.current) return;

    const cleanupOrphanedSessions = async () => {
      try {
        cleanupRanRef.current = true;

        // ✅ FIXED: Use COLLECTIONS.STUDY_SESSIONS
        const sessionsRef = collection(db, COLLECTIONS.STUDY_SESSIONS);
        const q = query(
          sessionsRef,
          where('userId', '==', userId),
          where('status', '==', 'active')
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          console.log('✅ No orphaned sessions found');
          return;
        }

        const now = Timestamp.now();
        const batch = writeBatch(db);
        let cleanedCount = 0;

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const sessionStart = data.startTime?.toMillis() || 0;

          // If session is older than 24 hours, mark as abandoned
          // If session has a startTime, calculate reasonable duration (max 4 hours)
          const ageHours = (Date.now() - sessionStart) / (1000 * 60 * 60);

          if (ageHours > 24) {
            // Very old session - mark as abandoned, don't count time
            // ✅ FIXED: Use COLLECTIONS.STUDY_SESSIONS
            batch.update(doc(db, COLLECTIONS.STUDY_SESSIONS, docSnap.id), {
              status: 'abandoned',
              endTime: now,
              totalTime: 0,
              progressPercentage: 0,
              cleanupNote: 'Auto-cleaned: session older than 24 hours'
            });
          } else {
            // Recent orphan - estimate reasonable duration (max 2 hours)
            const estimatedMinutes = Math.min(Math.round(ageHours * 60), 120);
            // ✅ FIXED: Use COLLECTIONS.STUDY_SESSIONS
            batch.update(doc(db, COLLECTIONS.STUDY_SESSIONS, docSnap.id), {
              status: 'completed',
              endTime: now,
              totalTime: estimatedMinutes > 1 ? estimatedMinutes : 0,
              progressPercentage: 100,
              cleanupNote: 'Auto-completed: orphaned session'
            });
          }
          cleanedCount++;
        });

        if (cleanedCount > 0) {
          await batch.commit();
          console.log(`🧹 Cleaned up ${cleanedCount} orphaned sessions`);
        }
      } catch (error) {
        console.error('❌ Error cleaning up sessions:', error);
      }
    };

    cleanupOrphanedSessions();
  }, [userId]);

  // ==========================================
  // START SESSION
  // ==========================================
  const startSession = useCallback(async () => {
    if (!userId || !documentId || sessionEndedRef.current) return;

    try {
      const sessionId = `${userId}_${Date.now()}`;
      const now = Timestamp.now();

      const sessionData = {
        userId,
        documentId,
        documentTitle: documentData?.name || documentData?.title || 'Untitled Document',
        subject: documentData?.subject || 'General',
        startTime: now,
        endTime: null,
        status: 'active',
        totalTime: 0,
        progressPercentage: 0,
        createdAt: now
      };

      // ✅ FIXED: Use COLLECTIONS.STUDY_SESSIONS
      await setDoc(doc(db, COLLECTIONS.STUDY_SESSIONS, sessionId), sessionData);

      // Store session info in sessionStorage for recovery
      sessionStorage.setItem('activeStudySession', JSON.stringify({
        sessionId,
        startTime: Date.now(),
        documentId
      }));

      setCurrentSessionId(sessionId);
      setSessionStartTime(Date.now());
      setIsSessionActive(true);
      sessionEndedRef.current = false;

      console.log('✅ Study session started:', sessionId);
    } catch (error) {
      console.error('❌ Error starting session:', error);
    }
  }, [userId, documentId, documentData]);

  // ==========================================
  // END SESSION
  // ==========================================
  const endSession = useCallback(async () => {
    if (!currentSessionId || !sessionStartTime || sessionEndedRef.current) return;

    try {
      sessionEndedRef.current = true;

      const now = Timestamp.now();
      const durationMinutes = Math.floor((Date.now() - sessionStartTime) / 1000 / 60);

      // Only save if duration is reasonable (1 min to 4 hours)
      if (durationMinutes >= 1 && durationMinutes <= 240) {
        // ✅ FIXED: Use COLLECTIONS.STUDY_SESSIONS
        await updateDoc(doc(db, COLLECTIONS.STUDY_SESSIONS, currentSessionId), {
          endTime: now,
          status: 'completed',
          totalTime: durationMinutes,
          progressPercentage: 100
        });

        console.log('✅ Study session ended. Duration:', durationMinutes, 'minutes');
      } else if (durationMinutes < 1) {
        // Very short session - mark as abandoned
        // ✅ FIXED: Use COLLECTIONS.STUDY_SESSIONS
        await updateDoc(doc(db, COLLECTIONS.STUDY_SESSIONS, currentSessionId), {
          endTime: now,
          status: 'abandoned',
          totalTime: 0,
          progressPercentage: 0
        });
        console.log('⚠️ Session too short, marked as abandoned');
      } else {
        // Session too long (over 4 hours) - cap at 4 hours
        // ✅ FIXED: Use COLLECTIONS.STUDY_SESSIONS
        await updateDoc(doc(db, COLLECTIONS.STUDY_SESSIONS, currentSessionId), {
          endTime: now,
          status: 'completed',
          totalTime: 240, // 4 hours max
          progressPercentage: 100,
          note: 'Duration capped at 4 hours'
        });
        console.log('⚠️ Long session capped at 4 hours');
      }

      // Clear session storage
      sessionStorage.removeItem('activeStudySession');

      setCurrentSessionId(null);
      setSessionStartTime(null);
      setIsSessionActive(false);
    } catch (error) {
      console.error('❌ Error ending session:', error);
    }
  }, [currentSessionId, sessionStartTime]);

  // ==========================================
  // AUTO-START ON MOUNT
  // ==========================================
  useEffect(() => {
    if (userId && documentId && !isSessionActive && !sessionEndedRef.current) {
      startSession();
    }

    // Cleanup: end session on unmount
    return () => {
      if (isSessionActive && !sessionEndedRef.current) {
        endSession();
      }
    };
  }, [userId, documentId, startSession, endSession]); // ✅ Added deps

  // ==========================================
  // HANDLE PAGE CLOSE/REFRESH - IMPROVED
  // ==========================================
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (isSessionActive && !sessionEndedRef.current && currentSessionId) {
        sessionEndedRef.current = true;

        // Use sendBeacon for reliable async request on page unload
        const durationMinutes = Math.floor((Date.now() - (sessionStartTime || Date.now())) / 1000 / 60);

        // Store data in sessionStorage for next page load to clean up
        sessionStorage.setItem('pendingSessionEnd', JSON.stringify({
          sessionId: currentSessionId,
          duration: Math.min(Math.max(durationMinutes, 0), 240),
          timestamp: Date.now()
        }));

        // Clear active session marker
        sessionStorage.removeItem('activeStudySession');

        console.log('🔔 Session marked for cleanup on page unload');
      }
    };

    // Handle visibility change (user switches tabs - still count time but check)
    const handleVisibilityChange = () => {
      // Don't end session on visibility change - just log
      if (document.visibilityState === 'hidden' && isSessionActive) {
        console.log('👁️ Tab hidden - session continues');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isSessionActive, currentSessionId, sessionStartTime]);

  // ==========================================
  // RECOVER PENDING SESSION END FROM PREVIOUS PAGE
  // ==========================================
  useEffect(() => {
    const pendingEnd = sessionStorage.getItem('pendingSessionEnd');

    if (pendingEnd && userId) {
      try {
        const { sessionId, duration, timestamp } = JSON.parse(pendingEnd);

        // Only process if less than 1 hour old
        if (Date.now() - timestamp < 60 * 60 * 1000) {
          // ✅ FIXED: Use COLLECTIONS.STUDY_SESSIONS
          updateDoc(doc(db, COLLECTIONS.STUDY_SESSIONS, sessionId), {
            endTime: Timestamp.now(),
            status: 'completed',
            totalTime: duration,
            progressPercentage: 100,
            note: 'Completed on next page load'
          }).then(() => {
            console.log('✅ Recovered and closed pending session:', sessionId);
          }).catch(console.error);
        }

        sessionStorage.removeItem('pendingSessionEnd');
      } catch (e) {
        sessionStorage.removeItem('pendingSessionEnd');
      }
    }
  }, [userId]);

  return {
    currentSessionId,
    isSessionActive,
    sessionStartTime,
    startSession,
    endSession
  };
};
