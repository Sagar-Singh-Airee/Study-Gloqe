// src/hooks/useSessionCleanup.js
import { useEffect } from 'react';
import { getFirestore, collection, query, where, getDocs, updateDoc, doc, Timestamp } from 'firebase/firestore';

export const useSessionCleanup = (userId) => {
  useEffect(() => {
    if (!userId) return;

    const cleanupOldSessions = async () => {
      try {
        const db = getFirestore();
        const sessionsRef = collection(db, 'studySessions');
        
        // Find sessions older than 24 hours that are still active
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        const q = query(
          sessionsRef,
          where('userId', '==', userId),
          where('status', '==', 'active'),
          where('startTime', '<', Timestamp.fromDate(yesterday))
        );

        const snapshot = await getDocs(q);
        
        if (snapshot.size > 0) {
          console.log(`🧹 Found ${snapshot.size} old active sessions to clean up`);
        }
        
        for (const docSnap of snapshot.docs) {
          const data = docSnap.data();
          const startTime = data.startTime.toMillis();
          const duration = Math.min(720, Math.floor((Date.now() - startTime) / 1000 / 60));
          
          await updateDoc(doc(db, 'studySessions', docSnap.id), {
            status: 'completed',
            endTime: Timestamp.fromDate(new Date(startTime + duration * 60 * 1000)),
            totalTime: duration
          });
          
          console.log(`✅ Closed session ${docSnap.id} (${duration} min)`);
        }
        
        if (snapshot.size > 0) {
          console.log(`✅ Cleaned up ${snapshot.size} old sessions`);
        }
      } catch (error) {
        console.error('Error cleaning up sessions:', error);
      }
    };

    // Run immediately
    cleanupOldSessions();
    
    // Run every hour
    const interval = setInterval(cleanupOldSessions, 60 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [userId]);
};
