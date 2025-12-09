// src/hooks/useAnalytics.js - COMPLETE WITH BIGQUERY STUDY SESSION TRACKING
import { useState, useEffect, useCallback } from 'react';
import {
  getFirestore,
  collection,
  doc,
  query,
  where,
  onSnapshot,
  getDocs,
  updateDoc,
  limit,
  Timestamp
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';
import { categorizeQuizSession } from '@/helpers/subjectDetection';

const db = getFirestore();

// ========== DOCUMENTS ==========
export const useDocumentsData = (userId) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const docsRef = collection(db, 'documents');
    const q = query(docsRef, where('userId', '==', userId), limit(100));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = [];
      snapshot.forEach((doc) => {
        docs.push({ id: doc.id, ...doc.data() });
      });
      docs.sort((a, b) => {
        const aTime = a.createdAt?.toMillis() || 0;
        const bTime = b.createdAt?.toMillis() || 0;
        return bTime - aTime;
      });
      setDocuments(docs.slice(0, 50));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  return { documents, totalDocuments: documents.length, loading };
};

// ========== QUIZZES ==========
export const useQuizzesData = (userId, dateRange = 30) => {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const quizzesRef = collection(db, 'quizzes');
    const q = query(quizzesRef, where('userId', '==', userId), limit(100));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const quizData = [];
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - dateRange);

      snapshot.forEach((doc) => {
        const data = doc.data();
        const attemptDate = data.lastAttemptAt?.toDate();
        if (!attemptDate || attemptDate >= cutoffDate) {
          quizData.push({ id: doc.id, ...data });
        }
      });

      quizData.sort((a, b) => {
        const aTime = a.lastAttemptAt?.toMillis() || a.createdAt?.toMillis() || 0;
        const bTime = b.lastAttemptAt?.toMillis() || b.createdAt?.toMillis() || 0;
        return bTime - aTime;
      });

      setQuizzes(quizData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId, dateRange]);

  return { quizzes, loading };
};

// ========== QUIZ SESSIONS ==========
export const useQuizSessionsData = (userId, dateRange = 30) => {
  const [quizSessions, setQuizSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const sessionsRef = collection(db, 'quizSessions');
    const q = query(sessionsRef, where('userId', '==', userId), limit(100));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sessions = [];
      snapshot.forEach((doc) => {
        sessions.push({ id: doc.id, ...doc.data() });
      });
      setQuizSessions(sessions);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId, dateRange]);

  return { quizSessions, loading };
};

// ========== STUDY SESSIONS ==========
export const useStudySessionsData = (userId, dateRange = 30) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const sessionsRef = collection(db, 'studySessions');
    const q = query(sessionsRef, where('userId', '==', userId), limit(200));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sessionData = [];
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - dateRange);

      snapshot.forEach((doc) => {
        const data = doc.data();
        const startTime = data.startTime?.toDate();

        if (!startTime || startTime >= cutoffDate) {
          sessionData.push({ id: doc.id, ...data });
        }
      });

      sessionData.sort((a, b) => {
        const aTime = a.startTime?.toMillis() || 0;
        const bTime = b.startTime?.toMillis() || 0;
        return bTime - aTime;
      });

      setSessions(sessionData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId, dateRange]);

  return { sessions, loading };
};

// ========== USER DATA ==========
export const useUserData = (userId) => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const userRef = doc(db, 'users', userId);

    const unsubscribe = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        setUserData(snapshot.data());
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  return { userData, loading };
};

// ========== GAMIFICATION DATA ==========
export const useGamificationData = (userId) => {
  const [gamification, setGamification] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const gamificationRef = doc(db, 'gamification', userId);

    const unsubscribe = onSnapshot(gamificationRef, (snapshot) => {
      if (snapshot.exists()) {
        setGamification(snapshot.data());
      } else {
        setGamification({
          xp: 0,
          level: 1,
          currentStreak: 0,
          streakDays: 0,
          badges: {},
          achievements: {}
        });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  return { gamification, loading };
};

// ========== FLASHCARD DECKS ==========
export const useFlashcardDecks = (userId) => {
  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const decksRef = collection(db, 'flashcardDecks');
    const q = query(decksRef, where('userId', '==', userId), limit(50));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const deckData = [];
      snapshot.forEach((doc) => {
        deckData.push({ id: doc.id, ...doc.data() });
      });
      setDecks(deckData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  const totalCards = decks.reduce((sum, deck) => sum + (deck.cardCount || 0), 0);
  const totalMastered = decks.reduce((sum, deck) => sum + (deck.masteredCount || 0), 0);

  return { decks, deckCount: decks.length, totalCards, totalMastered, loading };
};

// ========== QUIZ PERFORMANCE ==========
export const useQuizPerformance = (userId, dateRange = 30) => {
  const { quizSessions, loading } = useQuizSessionsData(userId, dateRange);
  const [quizPerformance, setQuizPerformance] = useState(null);

  useEffect(() => {
    if (loading) return;

    let totalScore = 0;
    let totalCorrect = 0;
    let totalQuestions = 0;
    const subjectScores = {};

    quizSessions.forEach((session) => {
      const answers = session.answers || {};
      const answerKeys = Object.keys(answers);

      answerKeys.forEach((key) => {
        totalQuestions++;
        const answer = answers[key].answer;
        if (answer > 0) {
          totalCorrect++;
        }
      });

      const score = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
      totalScore += score;

      // Use centralized subject detection
      const subject = categorizeQuizSession(session);

      if (!subjectScores[subject]) {
        subjectScores[subject] = { total: 0, count: 0, scores: [] };
      }
      subjectScores[subject].total += score;
      subjectScores[subject].count += 1;
      subjectScores[subject].scores.push(score);
    });

    const averageScore = quizSessions.length > 0 ? totalScore / quizSessions.length : 0;
    const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

    setQuizPerformance({
      totalQuizzes: quizSessions.length,
      averageScore: Math.round(averageScore),
      totalCorrect,
      accuracy,
      recentQuizzes: quizSessions.slice(0, 10),
      subjectScores
    });
  }, [quizSessions, loading]);

  return { quizPerformance, loading };
};

// ========== STUDY TIME (FIRESTORE) ==========
export const useStudyTime = (userId, dateRange = 30) => {
  const { sessions, loading } = useStudySessionsData(userId, dateRange);
  const [studyTime, setStudyTime] = useState(null);

  useEffect(() => {
    if (loading) return;

    let totalMinutes = 0;
    let sessionCount = 0;
    const validSessions = [];

    sessions.forEach((session) => {
      if (session.status !== 'completed') return;

      let duration = session.totalTime || 0;

      if (!duration && session.startTime && session.endTime) {
        const start = session.startTime.toMillis();
        const end = session.endTime.toMillis();
        duration = Math.floor((end - start) / 1000 / 60);
      }

      if (duration >= 1 && duration <= 720) {
        totalMinutes += duration;
        sessionCount++;
        validSessions.push({ ...session, duration });
      } else if (duration > 720) {
        console.warn(`⚠️ Invalid session ${session.id}: ${duration} minutes (capped at 720)`);
      }
    });

    setStudyTime({
      totalMinutes: Math.round(totalMinutes),
      sessionCount,
      averageSessionLength: sessionCount > 0 ? Math.round(totalMinutes / sessionCount) : 0,
      sessions: validSessions.slice(0, 20)
    });
  }, [sessions, loading]);

  return { studyTime, loading };
};

// 🆕 NEW: STUDY TIME FROM BIGQUERY
export const useStudyTimeBigQuery = (userId, dateRange = 30) => {
  const [data, setData] = useState({
    totalMinutes: 0,
    totalSessions: 0,
    averagePerSession: 0,
    dailyBreakdown: [],
    loading: true,
    error: null
  });

  useEffect(() => {
    if (!userId) {
      setData(prev => ({ ...prev, loading: false }));
      return;
    }

    const fetchData = async () => {
      try {
        setData(prev => ({ ...prev, loading: true, error: null }));

        console.log('📊 Fetching study time from BigQuery...');

        const getStudyTime = httpsCallable(functions, 'getStudyTimeBigQuery');
        const result = await getStudyTime({ userId, timeframe: dateRange });

        setData({
          ...result.data.data,
          loading: false,
          error: null
        });

        console.log('✅ Study time from BigQuery:', result.data.data);
      } catch (error) {
        console.error('❌ Error fetching study time from BigQuery:', error);
        setData(prev => ({
          ...prev,
          loading: false,
          error: error.message
        }));
      }
    };

    fetchData();
  }, [userId, dateRange]);

  return data;
};

// 🆕 NEW: HYBRID STUDY TIME (BIGQUERY + FIRESTORE FALLBACK)
export const useStudyTimeHybrid = (userId, dateRange = 30, useBigQuery = true) => {
  const bigQueryData = useStudyTimeBigQuery(userId, dateRange);
  const firestoreData = useStudyTime(userId, dateRange);

  if (useBigQuery && !bigQueryData.error) {
    return {
      studyTime: {
        totalMinutes: bigQueryData.totalMinutes,
        sessionCount: bigQueryData.totalSessions,
        averageSessionLength: bigQueryData.averagePerSession,
        dailyBreakdown: bigQueryData.dailyBreakdown,
        source: 'bigquery'
      },
      loading: bigQueryData.loading,
      error: bigQueryData.error
    };
  }

  return {
    studyTime: {
      ...firestoreData.studyTime,
      source: 'firestore'
    },
    loading: firestoreData.loading,
    error: null
  };
};

// ========== SUBJECT PERFORMANCE ==========
export const useSubjectPerformance = (userId, dateRange = 30) => {
  const { quizSessions, loading } = useQuizSessionsData(userId, dateRange);
  const [performance, setPerformance] = useState([]);

  useEffect(() => {
    if (loading) return;

    const subjectData = {};

    quizSessions.forEach((session) => {
      // Use centralized subject detection
      const subject = categorizeQuizSession(session);

      const answers = session.answers || {};
      const answerKeys = Object.keys(answers);
      let correct = 0;
      let total = answerKeys.length;

      answerKeys.forEach((key) => {
        if (answers[key].answer > 0) correct++;
      });

      const score = total > 0 ? (correct / total) * 100 : 0;

      if (!subjectData[subject]) {
        subjectData[subject] = {
          name: subject,
          totalScore: 0,
          quizCount: 0,
          scores: []
        };
      }

      subjectData[subject].totalScore += score;
      subjectData[subject].quizCount += 1;
      subjectData[subject].scores.push(score);
    });

    const performanceArray = Object.entries(subjectData).map(([subject, data]) => ({
      id: subject,
      name: subject,
      score: Math.round(data.totalScore / data.quizCount),
      quizCount: data.quizCount,
      trend: data.scores.length >= 2
        ? (data.scores[data.scores.length - 1] > data.scores[0] ? 'up' : 'down')
        : 'stable'
    }));

    performanceArray.sort((a, b) => b.score - a.score);
    setPerformance(performanceArray);
  }, [quizSessions, loading]);

  return { performance, loading };
};

// ========== WEAK AREAS ==========
export const useWeakAreas = (userId, dateRange = 30) => {
  const { performance, loading } = useSubjectPerformance(userId, dateRange);
  const [weakAreas, setWeakAreas] = useState([]);

  useEffect(() => {
    if (loading) return;

    const weakAreasArray = performance
      .filter(area => area.score < 70)
      .map(area => ({
        ...area,
        topic: area.name,
        description: `${area.quizCount} quiz${area.quizCount !== 1 ? 'zes' : ''} taken`
      }))
      .sort((a, b) => a.score - b.score);

    setWeakAreas(weakAreasArray);
  }, [performance, loading]);

  return { weakAreas, loading };
};

// ========== STREAKS ==========
export const useStudyStreaks = (userId) => {
  const { gamification, loading } = useGamificationData(userId);
  const { sessions } = useStudySessionsData(userId, 90);
  const [streaks, setStreaks] = useState(null);

  useEffect(() => {
    if (loading) return;

    if (gamification) {
      setStreaks({
        currentStreak: gamification.currentStreak || 0,
        longestStreak: gamification.streakDays || 0,
        lastStudyDate: gamification.lastActiveDate?.toDate() || null
      });
    } else {
      const activityDates = new Set();
      sessions.forEach(session => {
        if (session.startTime && session.status === 'completed') {
          const date = new Date(session.startTime.toMillis());
          const dateStr = date.toISOString().split('T')[0];
          activityDates.add(dateStr);
        }
      });

      const sortedDates = Array.from(activityDates).sort().reverse();
      let currentStreak = 0;
      const today = new Date().toISOString().split('T')[0];
      let checkDate = new Date(today);

      for (let i = 0; i < 90; i++) {
        const dateStr = checkDate.toISOString().split('T')[0];
        if (sortedDates.includes(dateStr)) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }

      setStreaks({
        currentStreak,
        longestStreak: currentStreak,
        lastStudyDate: sortedDates[0] || null
      });
    }
  }, [gamification, sessions, loading]);

  return { streaks, loading };
};

// ========== TRENDS (FIRESTORE) ==========
export const usePerformanceTrends = (userId) => {
  const { sessions, loading: sessionsLoading } = useStudySessionsData(userId, 30);
  const { quizSessions, loading: quizzesLoading } = useQuizSessionsData(userId, 30);
  const [trends, setTrends] = useState([]);

  useEffect(() => {
    if (sessionsLoading || quizzesLoading) return;

    const dailyData = {};

    sessions.forEach(session => {
      if (session.startTime && session.status === 'completed') {
        const date = new Date(session.startTime.toMillis());
        const dateStr = date.toISOString().split('T')[0];

        if (!dailyData[dateStr]) {
          dailyData[dateStr] = {
            date: Timestamp.fromDate(new Date(dateStr)),
            studyMinutes: 0,
            quizzesCompleted: 0,
            totalScore: 0,
            quizCount: 0
          };
        }

        dailyData[dateStr].studyMinutes += session.totalTime || 0;
      }
    });

    quizSessions.forEach(session => {
      const answers = session.answers || {};
      const answerKeys = Object.keys(answers);
      let correct = 0;

      answerKeys.forEach(key => {
        if (answers[key].answer > 0) correct++;
      });

      const score = answerKeys.length > 0 ? (correct / answerKeys.length) * 100 : 0;

      const firstAnswer = answers[Object.keys(answers)[0]];
      if (firstAnswer?.timestamp) {
        const date = new Date(firstAnswer.timestamp.toMillis());
        const dateStr = date.toISOString().split('T')[0];

        if (!dailyData[dateStr]) {
          dailyData[dateStr] = {
            date: Timestamp.fromDate(new Date(dateStr)),
            studyMinutes: 0,
            quizzesCompleted: 0,
            totalScore: 0,
            quizCount: 0
          };
        }

        dailyData[dateStr].quizzesCompleted += 1;
        dailyData[dateStr].totalScore += score;
        dailyData[dateStr].quizCount += 1;
      }
    });

    const trendsArray = Object.entries(dailyData).map(([dateStr, data]) => ({
      id: dateStr,
      date: data.date,
      studyMinutes: Math.round(data.studyMinutes),
      quizzesCompleted: data.quizzesCompleted,
      avgScore: data.quizCount > 0 ? Math.round(data.totalScore / data.quizCount) : 0,
      period: 'daily'
    }));

    trendsArray.sort((a, b) => b.date.toMillis() - a.date.toMillis());
    setTrends(trendsArray);
  }, [sessions, quizSessions, sessionsLoading, quizzesLoading]);

  return { trends, loading: sessionsLoading || quizzesLoading };
};

// ========== LEARNING PATTERNS ==========
export const useLearningPatterns = (userId) => {
  const { sessions, loading } = useStudySessionsData(userId, 30);
  const { quizSessions } = useQuizSessionsData(userId, 30);
  const [patterns, setPatterns] = useState(null);

  useEffect(() => {
    if (loading) return;

    const hourCounts = {};
    const completedSessions = sessions.filter(s => s.status === 'completed');

    completedSessions.forEach(session => {
      if (session.startTime) {
        const hour = new Date(session.startTime.toMillis()).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      }
    });

    const bestHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
    const bestStudyTime = bestHour
      ? `${bestHour[0]}:00 - ${parseInt(bestHour[0]) + 1}:00`
      : 'Not enough data';

    const totalMinutes = completedSessions.reduce((sum, s) => sum + (s.totalTime || 0), 0);
    const avgSessionLength = completedSessions.length > 0 ? Math.round(totalMinutes / completedSessions.length) : 0;

    const uniqueDates = new Set();
    completedSessions.forEach(session => {
      if (session.startTime) {
        const date = new Date(session.startTime.toMillis()).toISOString().split('T')[0];
        uniqueDates.add(date);
      }
    });
    const studyDaysPerWeek = Math.min(7, Math.round((uniqueDates.size / 30) * 7));

    const completionRate = quizSessions.length > 0 ? 100 : 0;

    setPatterns({
      bestStudyTime,
      avgSessionLength,
      studyDaysPerWeek,
      completionRate
    });
  }, [sessions, quizSessions, loading]);

  return { patterns, loading };
};

// ========== GAMIFICATION ==========
export const useGamification = (passedUserId = null) => {
  const userId = passedUserId || localStorage.getItem('userId');
  const { userData, loading: userLoading } = useUserData(userId);
  const { gamification, loading: gamificationLoading } = useGamificationData(userId);
  const { documents } = useDocumentsData(userId);
  const { quizSessions } = useQuizSessionsData(userId, 365);
  const { sessions } = useStudySessionsData(userId, 365);
  const { decks, totalMastered } = useFlashcardDecks(userId);

  const [level, setLevel] = useState(1);
  const [xp, setXP] = useState(0);
  const [nextLevelXp, setNextLevelXp] = useState(1000);
  const [badges, setBadges] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    if (!userId || userLoading || gamificationLoading) return;

    if (gamification && gamification.xp > 0) {
      setXP(gamification.xp);
      setLevel(gamification.level || 1);
      setNextLevelXp((gamification.level || 1) * 1000);
      setStreak(gamification.currentStreak || 0);

      const badgesList = Object.values(gamification.badges || {});
      const achievementsList = Object.values(gamification.achievements || {});

      setBadges(badgesList);
      setAchievements(achievementsList);
    } else {
      let totalXP = 0;

      totalXP += documents.length * 50;
      totalXP += quizSessions.length * 100;
      totalXP += sessions.filter(s => s.status === 'completed').reduce((sum, s) => sum + (s.totalTime || 0), 0);
      totalXP += totalMastered * 10;

      const calculatedLevel = Math.floor(totalXP / 1000) + 1;
      const xpForNextLevel = calculatedLevel * 1000;

      setXP(totalXP);
      setLevel(calculatedLevel);
      setNextLevelXp(xpForNextLevel);

      const earnedAchievements = [];

      if (documents.length >= 1) earnedAchievements.push({ id: 'first_doc', name: 'First Document', icon: '📄', earnedAt: new Date() });
      if (documents.length >= 10) earnedAchievements.push({ id: 'doc_master', name: 'Document Master', icon: '📚', earnedAt: new Date() });
      if (quizSessions.length >= 1) earnedAchievements.push({ id: 'first_quiz', name: 'Quiz Beginner', icon: '🎯', earnedAt: new Date() });
      if (quizSessions.length >= 10) earnedAchievements.push({ id: 'quiz_expert', name: 'Quiz Expert', icon: '🏆', earnedAt: new Date() });
      if (totalXP >= 1000) earnedAchievements.push({ id: 'xp_1k', name: '1K XP', icon: '⚡', earnedAt: new Date() });
      if (totalXP >= 5000) earnedAchievements.push({ id: 'xp_5k', name: '5K XP', icon: '💎', earnedAt: new Date() });
      if (decks.length >= 5) earnedAchievements.push({ id: 'flashcard_pro', name: 'Flashcard Pro', icon: '🎴', earnedAt: new Date() });
      if (totalMastered >= 50) earnedAchievements.push({ id: 'master_50', name: 'Card Master', icon: '⭐', earnedAt: new Date() });

      setAchievements(earnedAchievements);
      setBadges(earnedAchievements);
    }
  }, [userId, userData, gamification, documents, quizSessions, sessions, decks, totalMastered, userLoading, gamificationLoading]);

  return { level, xp, nextLevelXp, badges, achievements, streak, loading: userLoading || gamificationLoading };
};

// ========== RECOMMENDATIONS ==========
export const useRecommendations = (userId) => {
  const { quizSessions } = useQuizSessionsData(userId, 30);
  const { sessions } = useStudySessionsData(userId, 7);
  const { documents } = useDocumentsData(userId);
  const { decks } = useFlashcardDecks(userId);
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    const recs = [];

    if (documents.length === 0) {
      recs.push({
        id: 'upload_doc',
        title: 'Upload Your First Document',
        description: 'Start by uploading a PDF to generate quizzes and flashcards',
        priority: 100
      });
    }

    if (quizSessions.length === 0 && documents.length > 0) {
      recs.push({
        id: 'take_quiz',
        title: 'Take Your First Quiz',
        description: 'Test your knowledge with AI-generated quizzes',
        priority: 95
      });
    }

    const completedSessions = sessions.filter(s => s.status === 'completed');
    if (completedSessions.length === 0 && documents.length > 0) {
      recs.push({
        id: 'start_studying',
        title: 'Start a Study Session',
        description: 'Open a document and begin tracking your study time',
        priority: 90
      });
    }

    if (decks.length === 0 && documents.length > 0) {
      recs.push({
        id: 'create_deck',
        title: 'Create Flashcard Deck',
        description: 'Generate flashcards from your documents',
        priority: 85
      });
    }

    const subjectScores = {};
    quizSessions.forEach(session => {
      // Use centralized subject detection
      const subject = categorizeQuizSession(session);

      const answers = session.answers || {};
      const answerKeys = Object.keys(answers);
      let correct = 0;

      answerKeys.forEach(key => {
        if (answers[key].answer > 0) correct++;
      });

      const score = answerKeys.length > 0 ? (correct / answerKeys.length) * 100 : 0;

      if (!subjectScores[subject]) {
        subjectScores[subject] = [];
      }
      subjectScores[subject].push(score);
    });

    Object.entries(subjectScores).forEach(([subject, scores]) => {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      if (avg < 70) {
        recs.push({
          id: `improve_${subject}`,
          title: `Improve ${subject}`,
          description: `Average score: ${Math.round(avg)}%. Review and practice more!`,
          priority: 80
        });
      }
    });

    recs.sort((a, b) => b.priority - a.priority);
    setRecommendations(recs.slice(0, 5));
  }, [quizSessions, sessions, documents, decks]);

  return { recommendations, loading: false };
};

// ========== LIVE TIMER ==========
export const useRealtimeStudyTimer = (userId) => {
  const [displayTime, setDisplayTime] = useState('0h 0m 0s');
  const [isStudying, setIsStudying] = useState(false);
  const [currentSubject, setCurrentSubject] = useState(null);

  useEffect(() => {
    if (!userId) return;

    let intervalId = null;

    const sessionsRef = collection(db, 'studySessions');
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const q = query(
      sessionsRef,
      where('userId', '==', userId),
      where('status', '==', 'active'),
      where('startTime', '>=', Timestamp.fromDate(todayStart)),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }

      if (!snapshot.empty) {
        const sessionDoc = snapshot.docs[0];
        const session = sessionDoc.data();
        const startTime = session.startTime.toMillis();
        const nowMs = Date.now();
        const elapsed = nowMs - startTime;

        if (elapsed > 12 * 60 * 60 * 1000) {
          await updateDoc(doc(db, 'studySessions', sessionDoc.id), {
            status: 'completed',
            endTime: Timestamp.fromDate(new Date(startTime + 12 * 60 * 60 * 1000)),
            totalTime: 720
          });
          setIsStudying(false);
          setDisplayTime('0h 0m 0s');
          setCurrentSubject(null);
          return;
        }

        setIsStudying(true);
        setCurrentSubject(session.subject || session.documentTitle || 'Studying');

        intervalId = setInterval(() => {
          const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);

          const hours = Math.floor(elapsedSeconds / 3600);
          const minutes = Math.floor((elapsedSeconds % 3600) / 60);
          const seconds = elapsedSeconds % 60;

          setDisplayTime(`${hours}h ${minutes}m ${seconds}s`);
        }, 1000);
      } else {
        setIsStudying(false);
        setDisplayTime('0h 0m 0s');
        setCurrentSubject(null);
      }
    });

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      unsubscribe();
    };
  }, [userId]);

  return { displayTime, isStudying, currentSubject };
};

// ========== COMBINED ANALYTICS (FIRESTORE) ==========
export const useCompleteAnalytics = (userId, dateRange = 30) => {
  const { documents } = useDocumentsData(userId);
  const { decks, totalMastered } = useFlashcardDecks(userId);
  const quizPerformance = useQuizPerformance(userId, dateRange);
  const studyTime = useStudyTime(userId, dateRange);
  const patterns = useLearningPatterns(userId);
  const trends = usePerformanceTrends(userId);
  const streaks = useStudyStreaks(userId);
  const performance = useSubjectPerformance(userId, dateRange);
  const weakAreas = useWeakAreas(userId, dateRange);
  const { gamification } = useGamificationData(userId);

  const loading =
    quizPerformance.loading ||
    studyTime.loading ||
    patterns.loading ||
    trends.loading ||
    streaks.loading ||
    performance.loading ||
    weakAreas.loading;

  const error = null;

  const refetchAll = useCallback(() => {
    console.log('✅ Real-time listeners active');
    return Promise.resolve();
  }, []);

  const totalXP = gamification?.xp || 0;
  const userLevel = gamification?.level || 1;

  const analytics = {
    bigQuery: {
      totalXP,
      level: userLevel,
      nextLevelXP: userLevel * 1000,
      documentsRead: documents.length,
      flashcardsReviewed: totalMastered,
      roomsJoined: 0,
      xpFromQuizzes: (quizPerformance.quizPerformance?.totalQuizzes || 0) * 100,
      xpFromStudy: studyTime.studyTime?.totalMinutes || 0,
      xpFromAchievements: 0,
      xpFromFlashcards: totalMastered * 10
    }
  };

  return {
    analytics,
    quizPerformance: quizPerformance.quizPerformance,
    studyTime: studyTime.studyTime,
    patterns: patterns.patterns,
    trends: trends.trends,
    streaks: streaks.streaks,
    performance: performance.performance,
    weakAreas: weakAreas.weakAreas,
    loading,
    error,
    refetchAll
  };
};

// ==========================================
// 🆕 NEW: BIGQUERY-POWERED ANALYTICS
// ==========================================
export const useCompleteAnalyticsBigQuery = (userId, dateRange = 30) => {
  const [data, setData] = useState({
    analytics: null,
    trends: [],
    performance: [],
    studyTime: null,
    loading: true,
    error: null
  });

  const refetchAll = useCallback(async () => {
    if (!userId) {
      setData({
        analytics: null,
        trends: [],
        performance: [],
        studyTime: null,
        loading: false,
        error: 'No user ID provided'
      });
      return;
    }

    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      console.log('🔄 Fetching BigQuery analytics...');

      const getAnalytics = httpsCallable(functions, 'getAnalyticsBigQuery');
      const getTrends = httpsCallable(functions, 'getTrendsBigQuery');
      const getSubjectPerformance = httpsCallable(functions, 'getSubjectPerformanceBigQuery');
      const getStudyTime = httpsCallable(functions, 'getStudyTimeBigQuery');

      const [analyticsRes, trendsRes, performanceRes, studyTimeRes] = await Promise.all([
        getAnalytics({ uid: userId, timeframe: dateRange }),
        getTrends({ uid: userId, timeframe: dateRange }),
        getSubjectPerformance({ uid: userId }),
        getStudyTime({ userId, timeframe: dateRange })
      ]);

      setData({
        analytics: analyticsRes.data,
        trends: trendsRes.data.trends || [],
        performance: performanceRes.data.performance || [],
        studyTime: studyTimeRes.data.data || null,
        loading: false,
        error: null
      });

      console.log('✅ BigQuery analytics loaded successfully');
      console.log('📊 Analytics:', analyticsRes.data);
      console.log('📈 Trends:', trendsRes.data.trends);
      console.log('🎯 Performance:', performanceRes.data.performance);
      console.log('⏱️ Study Time:', studyTimeRes.data.data);
    } catch (error) {
      console.error('❌ BigQuery analytics error:', error);
      setData(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to load BigQuery analytics'
      }));
    }
  }, [userId, dateRange]);

  useEffect(() => {
    refetchAll();
  }, [refetchAll]);

  return {
    analytics: data.analytics,
    trends: data.trends,
    performance: data.performance,
    studyTime: data.studyTime,
    loading: data.loading,
    error: data.error,
    refetchAll
  };
};

// ==========================================
// EXPORT ALL HOOKS
// ==========================================
export default {
  useDocumentsData,
  useQuizzesData,
  useQuizSessionsData,
  useStudySessionsData,
  useUserData,
  useGamificationData,
  useFlashcardDecks,
  useQuizPerformance,
  useStudyTime,
  useStudyTimeBigQuery,
  useStudyTimeHybrid,
  useSubjectPerformance,
  useWeakAreas,
  useStudyStreaks,
  usePerformanceTrends,
  useLearningPatterns,
  useGamification,
  useRecommendations,
  useRealtimeStudyTimer,
  useCompleteAnalytics,
  useCompleteAnalyticsBigQuery
};
