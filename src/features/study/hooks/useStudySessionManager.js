// src/hooks/useStudySessionManager.js - ✅ SIMPLIFIED: Only end when told to

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
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import { db, COLLECTIONS } from '@shared/config/firebase';

export const useStudySessionManager = (userId, documentId, documentData) => {
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  const sessionEndedRef = useRef(false);
  const cleanupRanRef = useRef(false);
  const timerIntervalRef = useRef(null);
  const saveIntervalRef = useRef(null);
  const startTimeRef = useRef(null);
  const accumulatedTimeRef = useRef(0);
  const isProcessingRef = useRef(false);
  const isSavingRef = useRef(false);

  // ==========================================
  // CLEANUP ORPHANED SESSIONS (Run once)
  // ==========================================
  useEffect(() => {
    if (!userId || cleanupRanRef.current) return;

    const cleanupOrphanedSessions = async () => {
      try {
        cleanupRanRef.current = true;
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

        const batch = writeBatch(db);
        const now = Date.now();

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const sessionStart = data.startTime?.toMillis() || now;
          const ageHours = (now - sessionStart) / (1000 * 60 * 60);

          if (ageHours > 24) {
            batch.update(doc(db, COLLECTIONS.STUDY_SESSIONS, docSnap.id), {
              status: 'abandoned',
              endTime: serverTimestamp(),
              totalTime: 0,
              cleanupNote: 'Auto-cleaned: session expired >24h'
            });
          } else {
            const estimatedMinutes = Math.min(Math.round(ageHours * 60), 120);
            batch.update(doc(db, COLLECTIONS.STUDY_SESSIONS, docSnap.id), {
              status: 'completed',
              endTime: serverTimestamp(),
              totalTime: estimatedMinutes,
              progressPercentage: 100,
              cleanupNote: 'Auto-completed: app closed unexpectedly'
            });
          }
        });

        await batch.commit();
        console.log(`🧹 Cleaned up ${snapshot.size} orphaned session(s)`);
      } catch (error) {
        console.error('❌ Error cleaning orphaned sessions:', error);
      }
    };

    cleanupOrphanedSessions();
  }, [userId]);

  // ==========================================
  // TIMER - Updates UI every second
  // ==========================================
  useEffect(() => {
    if (isSessionActive && !isPaused) {
      timerIntervalRef.current = setInterval(() => {
        const now = Date.now();
        const currentSegment = startTimeRef.current
          ? Math.floor((now - startTimeRef.current) / 1000)
          : 0;
        setElapsedTime(accumulatedTimeRef.current + currentSegment);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [isSessionActive, isPaused]);

  // ==========================================
  // AUTO-SAVE EVERY 5 MINUTES
  // ==========================================
  useEffect(() => {
    if (!isSessionActive || !currentSessionId) return;

    const saveToDatabase = async () => {
      if (isSavingRef.current) {
        console.log('⚠️ Save already in progress, skipping...');
        return;
      }

      try {
        isSavingRef.current = true;
        const now = Date.now();

        let totalSeconds = accumulatedTimeRef.current;
        if (!isPaused && startTimeRef.current) {
          totalSeconds += Math.floor((now - startTimeRef.current) / 1000);
        }

        const totalMinutes = Math.floor(totalSeconds / 60);

        await updateDoc(doc(db, COLLECTIONS.STUDY_SESSIONS, currentSessionId), {
          lastHeartbeat: serverTimestamp(),
          totalTime: totalMinutes,
          isPaused
        });

        console.log(`💾 Auto-saved: ${totalMinutes} minutes`);
      } catch (error) {
        console.error('⚠️ Auto-save failed:', error);
      } finally {
        isSavingRef.current = false;
      }
    };

    saveToDatabase();
    saveIntervalRef.current = setInterval(saveToDatabase, 300000); // 5 min

    return () => {
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
        saveIntervalRef.current = null;
      }
    };
  }, [isSessionActive, currentSessionId, isPaused]);

  // ==========================================
  // START SESSION
  // ==========================================
  const startSession = useCallback(async () => {
    if (!userId || !documentId || sessionEndedRef.current || isProcessingRef.current) {
      return;
    }

    try {
      isProcessingRef.current = true;

      const sessionId = `${userId}_${documentId}_${Date.now()}`;
      const now = Timestamp.now();
      const wallClockTime = Date.now();

      const sessionData = {
        userId,
        documentId,
        documentTitle: documentData?.title || 'Untitled Document',
        subject: documentData?.subject || 'General Studies',
        startTime: now,
        endTime: null,
        status: 'active',
        totalTime: 0,
        progressPercentage: 0,
        isPaused: false,
        lastHeartbeat: now,
        createdAt: now,
        userAgent: navigator.userAgent
      };

      await setDoc(doc(db, COLLECTIONS.STUDY_SESSIONS, sessionId), sessionData);

      setCurrentSessionId(sessionId);
      setSessionStartTime(wallClockTime);
      setIsSessionActive(true);
      setIsPaused(false);
      setElapsedTime(0);

      startTimeRef.current = wallClockTime;
      accumulatedTimeRef.current = 0;
      sessionEndedRef.current = false;

      console.log('✅ Session started:', sessionId);

    } catch (error) {
      console.error('❌ Failed to start session:', error);
      sessionEndedRef.current = true;
    } finally {
      isProcessingRef.current = false;
    }
  }, [userId, documentId, documentData]);

  // ==========================================
  // PAUSE / RESUME
  // ==========================================
  const togglePause = useCallback(async () => {
    if (!currentSessionId || !isSessionActive || isProcessingRef.current) {
      return;
    }

    try {
      isProcessingRef.current = true;
      const shouldPause = !isPaused;

      if (shouldPause) {
        const now = Date.now();
        if (startTimeRef.current) {
          const currentSegment = Math.floor((now - startTimeRef.current) / 1000);
          accumulatedTimeRef.current += currentSegment;
        }
        startTimeRef.current = null;
        setIsPaused(true);

        await updateDoc(doc(db, COLLECTIONS.STUDY_SESSIONS, currentSessionId), {
          isPaused: true,
          lastPausedAt: serverTimestamp(),
          totalTime: Math.floor(accumulatedTimeRef.current / 60)
        });

        console.log('⏸️ Session paused');

      } else {
        startTimeRef.current = Date.now();
        setIsPaused(false);

        await updateDoc(doc(db, COLLECTIONS.STUDY_SESSIONS, currentSessionId), {
          isPaused: false,
          lastResumedAt: serverTimestamp()
        });

        console.log('▶️ Session resumed');
      }

    } catch (error) {
      console.error('❌ Toggle pause failed:', error);
      setIsPaused((prev) => !prev);
    } finally {
      isProcessingRef.current = false;
    }
  }, [currentSessionId, isSessionActive, isPaused]);

  // ==========================================
  // TAB VISIBILITY
  // ==========================================
  useEffect(() => {
    if (!isSessionActive) return;

    const handleVisibilityChange = () => {
      if (document.hidden && !isPaused) {
        console.log('👁️ Tab hidden - auto-pausing');
        togglePause();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isSessionActive, isPaused, togglePause]);

  // ==========================================
  // END SESSION - ONLY CALLED MANUALLY
  // ==========================================
  const endSession = useCallback(async () => {
    if (!currentSessionId || sessionEndedRef.current || isProcessingRef.current) {
      return null;
    }

    try {
      isProcessingRef.current = true;
      sessionEndedRef.current = true;

      // Calculate final time
      let finalTotalSeconds = accumulatedTimeRef.current;
      if (!isPaused && startTimeRef.current) {
        const currentSegment = Math.floor((Date.now() - startTimeRef.current) / 1000);
        finalTotalSeconds += currentSegment;
      }

      const totalMinutes = Math.floor(finalTotalSeconds / 60);
      const status = 'completed';

      // Save to database
      await updateDoc(doc(db, COLLECTIONS.STUDY_SESSIONS, currentSessionId), {
        endTime: serverTimestamp(),
        status,
        totalTime: totalMinutes,
        totalSeconds: finalTotalSeconds,
        progressPercentage: 100,
        isPaused: false
      });

      console.log(`✅ Session ended: ${totalMinutes}m ${finalTotalSeconds % 60}s`);
      console.log(`📊 Total study time: ${finalTotalSeconds} seconds`);

      // Clear state
      setCurrentSessionId(null);
      setIsSessionActive(false);
      setSessionStartTime(null);
      setIsPaused(false);
      setElapsedTime(0);

      startTimeRef.current = null;
      accumulatedTimeRef.current = 0;

      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
        saveIntervalRef.current = null;
      }

      // Return data for analytics
      return {
        totalMinutes,
        totalSeconds: finalTotalSeconds,
        status
      };

    } catch (error) {
      console.error('❌ Failed to end session:', error);
      return null;
    } finally {
      isProcessingRef.current = false;
    }
  }, [currentSessionId, isPaused]);

  // ==========================================
  // AUTO-START SESSION
  // ==========================================
  useEffect(() => {
    if (userId && documentId && !isSessionActive && !sessionEndedRef.current) {
      startSession();
    }
  }, [userId, documentId, isSessionActive, startSession]);

  // ==========================================
  // NO UNMOUNT CLEANUP - Session stays active
  // ==========================================

  return {
    currentSessionId,
    sessionStartTime,
    isSessionActive,
    elapsedTime,
    isPaused,
    togglePause,
    endSession, // ONLY call this manually from button click
    elapsedMinutes: Math.floor(elapsedTime / 60),
    elapsedSeconds: elapsedTime % 60
  };
};
