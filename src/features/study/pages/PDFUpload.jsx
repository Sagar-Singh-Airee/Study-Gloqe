
// src/pages/PDFUpload.jsx - 🚀 OPTIMIZED FAST TRACK EDITION
// Instant first page + Real-time background updates + Perfect cancellation

import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import {
  Upload, FileText, X, CheckCircle2, AlertCircle, Zap, Shield, Cloud,
  Award, BookOpen, Play, Sparkles, Brain, Palette, Lightbulb,
  TrendingUp, Target, Loader2, ArrowRight, Eye, Layers, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@auth/contexts/AuthContext';
import {
  initiateDocumentUpload,
  processDocumentFastTrack,
  cancelBackgroundProcessing
} from '@study/services/documentService';
import { awardDailyXP, DAILY_ACTIONS, XP_REWARDS } from '@gamification/services/gamificationService';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@shared/config/firebase';
import { getDownloadURL } from 'firebase/storage';
import toast from 'react-hot-toast';

// ==================== 🎨 PREMIUM TOAST ====================

const PremiumToast = ({ message, type, icon: Icon, progress }) => (
  <motion.div
    initial={{ opacity: 0, y: -20, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: -20, scale: 0.95 }}
    className={`relative overflow-hidden flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-3xl border ${type === 'success'
      ? 'bg-teal-500/10 border-teal-400/50'
      : type === 'error'
        ? 'bg-red-500/10 border-red-400/50'
        : type === 'loading'
          ? 'bg-blue-900/10 border-blue-600/50'
          : 'bg-white/10 border-white/30'
      }`}
  >
    {progress !== undefined && (
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-blue-600 via-teal-500 to-blue-600"
      />
    )}

    <div
      className={`p-2.5 rounded-xl backdrop-blur-xl ${type === 'success'
        ? 'bg-teal-500/20'
        : type === 'error'
          ? 'bg-red-500/20'
          : type === 'loading'
            ? 'bg-blue-600/20'
            : 'bg-white/20'
        }`}
    >
      {type === 'loading' ? (
        <Loader2 size={18} className="text-teal-400 animate-spin" />
      ) : (
        <Icon
          size={18}
          className={`${type === 'success'
            ? 'text-teal-400'
            : type === 'error'
              ? 'text-red-400'
              : 'text-white'
            }`}
        />
      )}
    </div>
    <p className="text-sm font-semibold text-white tracking-tight">{message}</p>
  </motion.div>
);

// ==================== 🎯 PROCESSING PHASES ====================

const PHASES = {
  UPLOAD: {
    label: 'Uploading',
    icon: Cloud,
    gradient: 'from-blue-600 via-blue-500 to-teal-500'
  },
  TEXT_EXTRACTION: {
    label: 'Reading',
    icon: FileText,
    gradient: 'from-teal-500 via-teal-600 to-blue-600'
  },
  AI_DETECTION: {
    label: 'AI Analysis',
    icon: Brain,
    gradient: 'from-blue-900 via-teal-700 to-blue-900'
  },
  VISUAL_ANALYSIS: {
    label: 'Creating Visuals',
    icon: Palette,
    gradient: 'from-teal-600 via-blue-600 to-teal-600'
  },
  SAVING: {
    label: 'Finalizing',
    icon: CheckCircle2,
    gradient: 'from-teal-500 to-blue-600'
  },
  COMPLETE: {
    label: 'Ready!',
    icon: Zap,
    gradient: 'from-teal-400 to-blue-500'
  },
  BACKGROUND: {
    label: 'Background Processing',
    icon: Clock,
    gradient: 'from-slate-600 to-blue-700'
  }
};

const PhaseIndicator = ({ phase, progress, status }) => {
  const phaseConfig = PHASES[phase?.toUpperCase().replace('-', '_')] || PHASES.UPLOAD;
  const Icon = phaseConfig.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-2.5"
    >
      <div className={`p-2 rounded-lg bg-gradient-to-br ${phaseConfig.gradient} shadow-lg`}>
        <Icon size={14} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-white/90 truncate tracking-wide">
          {status || phaseConfig.label}
        </p>
        {progress !== undefined && progress < 100 && (
          <div className="w-full h-1 bg-white/10 rounded-full mt-1.5 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
              className={`h-full bg-gradient-to-r ${phaseConfig.gradient}`}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ==================== 🎯 MAIN COMPONENT ====================

const PDFUpload = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [xpEarnedToday, setXpEarnedToday] = useState(false);
  const [uploadStats, setUploadStats] = useState({
    total: 0,
    successful: 0,
    failed: 0,
    totalXP: 0
  });

  const processingRef = useRef(false);
  const unsubscribersRef = useRef(new Map());

  const showToast = useCallback((message, type = 'default', icon = Sparkles, progress) => {
    toast.custom(
      () => <PremiumToast message={message} type={type} icon={icon} progress={progress} />,
      {
        duration: type === 'loading' ? Infinity : 3000,
        position: 'top-center'
      }
    );
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cancel all background processing
      files.forEach(fileObj => {
        if (fileObj.docId && fileObj.status !== 'error') {
          cancelBackgroundProcessing(fileObj.docId);
        }
      });

      // Unsubscribe from all listeners
      unsubscribersRef.current.forEach(unsubscribe => unsubscribe());
      unsubscribersRef.current.clear();
    };
  }, [files]);

  // Check daily XP status
  useEffect(() => {
    const checkDailyXP = async () => {
      if (!user?.uid) return;
      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('@shared/config/firebase');
        const today = new Date().toISOString().split('T')[0];
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        const lastUploadDate = userDoc.data()?.lastUploadXPDate;
        setXpEarnedToday(lastUploadDate === today);
      } catch (error) {
        console.error('Error checking daily XP:', error);
      }
    };
    checkDailyXP();
  }, [user?.uid]);

  // Real-time listener for document updates (background processing)
  const subscribeToDocumentUpdates = useCallback((fileId, docId) => {
    const docRef = doc(db, 'documents', docId);

    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();

        // Update file state with latest data
        setFiles(prev => prev.map(f => {
          if (f.id === fileId) {
            const visualPagesCount = data.visualPages?.length || 0;
            const isProcessing = data.status === 'processing';
            const isComplete = data.status === 'completed';

            return {
              ...f,
              hasVisualAnalysis: data.hasVisualAnalysis || false,
              visualPagesProcessed: visualPagesCount,
              backgroundProcessing: isProcessing,
              isFullyComplete: isComplete,
              totalPages: data.pages || 0
            };
          }
          return f;
        }));
      }
    }, (error) => {
      console.error('Listener error:', error);
    });

    unsubscribersRef.current.set(docId, unsubscribe);
  }, []);

  // File drop handler
  const onDrop = useCallback(
    (acceptedFiles, rejectedFiles) => {
      if (rejectedFiles.length > 0) {
        rejectedFiles.forEach((rejection) => {
          const errors = rejection.errors.map((e) => e.message).join(', ');
          showToast(`${rejection.file.name}: ${errors}`, 'error', AlertCircle);
        });
      }

      const newFiles = acceptedFiles.map((file) => ({
        file,
        id: Math.random().toString(36).substring(2, 11),
        status: 'pending',
        docId: null,
        error: null,
        subject: null,
        progress: 0,
        phase: null,
        phaseStatus: null,
        visualPagesProcessed: 0,
        hasVisualAnalysis: false,
        processingTime: 0,
        backgroundProcessing: false,
        isFullyComplete: false,
        totalPages: 0
      }));

      setFiles((prev) => [...prev, ...newFiles]);
    },
    [showToast]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxSize: 50 * 1024 * 1024,
    multiple: true,
    disabled: uploading
  });

  const removeFile = useCallback((fileId) => {
    const fileToRemove = files.find(f => f.id === fileId);

    // Cancel background processing if active
    if (fileToRemove?.docId) {
      cancelBackgroundProcessing(fileToRemove.docId);

      // Unsubscribe from listener
      const unsubscribe = unsubscribersRef.current.get(fileToRemove.docId);
      if (unsubscribe) {
        unsubscribe();
        unsubscribersRef.current.delete(fileToRemove.docId);
      }
    }

    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  }, [files]);

  const updateFileProgress = useCallback((fileId, updates) => {
    setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, ...updates } : f)));
  }, []);

  // Process single file with FAST TRACK
  const processSingleFile = async (fileObj) => {
    const startTime = Date.now();
    let toastId = null;

    try {
      // ===== PHASE 1: UPLOAD TO STORAGE =====
      updateFileProgress(fileObj.id, {
        status: 'uploading',
        phase: 'upload',
        phaseStatus: 'Uploading to cloud...',
        progress: 0
      });

      toastId = toast.loading(`📤 Uploading ${fileObj.file.name}...`, {
        id: `upload-${fileObj.id}`
      });

      const uploadData = initiateDocumentUpload(fileObj.file, user.uid);
      const { uploadTask } = uploadData;

      // Track upload progress
      await new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = Math.round(
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100
            );
            updateFileProgress(fileObj.id, {
              progress,
              phaseStatus: `Uploading... ${progress}%`
            });
          },
          reject,
          resolve
        );
      });

      const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
      uploadData.downloadURL = downloadURL;

      updateFileProgress(fileObj.id, { progress: 100 });

      // ===== PHASE 2: FAST TRACK PROCESSING (First Page Only) =====
      toast.loading(`⚡ Fast processing ${fileObj.file.name}...`, { id: toastId });

      updateFileProgress(fileObj.id, {
        phase: 'text-extraction',
        phaseStatus: 'Processing first page...',
        progress: 0
      });

      // Use FAST TRACK - Returns immediately after first page
      const result = await processDocumentFastTrack(
        user.uid,
        fileObj.file,
        uploadData,
        (progressData) => {
          const { phase, status, progress } = progressData;
          updateFileProgress(fileObj.id, {
            phase,
            phaseStatus: status,
            progress: progress || 50
          });
        }
      );

      // ===== SUCCESS - FIRST PAGE READY! =====
      const processingTime = Date.now() - startTime;

      toast.success(
        `⚡ Ready in ${(processingTime / 1000).toFixed(1)}s! Background processing continues...`,
        {
          id: toastId,
          duration: 4000
        }
      );

      updateFileProgress(fileObj.id, {
        status: 'completed',
        docId: result.docId,
        subject: result.subject || 'General Studies',
        subjectConfidence: result.subjectConfidence,
        hasVisualAnalysis: result.hasVisualAnalysis,
        visualPagesProcessed: result.visualPagesProcessed || 0,
        processingTime,
        phase: 'complete',
        phaseStatus: '✨ First page ready!',
        progress: 100,
        backgroundProcessing: result.totalPages > 1,
        totalPages: result.totalPages || 0
      });

      // Subscribe to real-time updates for background processing
      if (result.totalPages > 1) {
        subscribeToDocumentUpdates(fileObj.id, result.docId);

        toast.success(
          `📚 Processing remaining ${result.totalPages - 1} pages in background`,
          { duration: 3000 }
        );
      }



      return { success: true, result };

    } catch (error) {
      console.error('❌ Upload error:', error);

      if (toastId) {
        toast.error(`Failed: ${error.message}`, { id: toastId, duration: 4000 });
      }

      updateFileProgress(fileObj.id, {
        status: 'error',
        error: error.message,
        phase: 'error',
        phaseStatus: error.message,
        progress: 0
      });

      return { success: false, error };
    }
  };

  // Handle batch upload
  const handleUpload = async () => {
    if (files.length === 0) {
      showToast('Please select at least one file', 'error', AlertCircle);
      return;
    }

    if (!user?.uid) {
      showToast('Please log in to upload files', 'error', AlertCircle);
      return;
    }

    if (processingRef.current) {
      showToast('Upload already in progress', 'error', AlertCircle);
      return;
    }

    processingRef.current = true;
    setUploading(true);

    const stats = {
      total: 0,
      successful: 0,
      failed: 0,
      totalXP: 0
    };

    let xpAwarded = false;

    // Process files sequentially for better UX
    for (const fileObj of files) {
      if (fileObj.status !== 'pending') continue;

      stats.total++;
      const result = await processSingleFile(fileObj);

      if (result.success) {
        stats.successful++;

        // Award XP for first upload today
        if (!xpAwarded && !xpEarnedToday) {
          try {
            const xpResult = await awardDailyXP(
              user.uid,
              DAILY_ACTIONS.UPLOAD_DOCUMENT,
              'Uploaded PDF Document'
            );

            if (xpResult.success && xpResult.xpGained > 0) {
              xpAwarded = true;
              stats.totalXP = xpResult.xpGained;
              setXpEarnedToday(true);

              toast.success(`🎉 +${xpResult.xpGained} XP earned!`, {
                duration: 4000
              });
            }
          } catch (error) {
            console.error('XP award error:', error);
          }
        }
      } else {
        stats.failed++;
      }
    }

    setUploadStats(stats);
    setUploading(false);
    processingRef.current = false;

    // Summary toast
    if (stats.successful > 0) {
      const message =
        stats.failed > 0
          ? `✅ ${stats.successful} ready, ${stats.failed} failed`
          : `🎉 All ${stats.successful} documents ready to study!`;

      showToast(message, stats.failed > 0 ? 'default' : 'success', CheckCircle2);
    }
  };

  const getStatusIcon = (status, backgroundProcessing) => {
    if (status === 'uploading') {
      return <Loader2 className="text-blue-500 animate-spin" size={16} />;
    }

    if (status === 'completed' && backgroundProcessing) {
      return <Clock className="text-teal-400 animate-pulse" size={16} />;
    }

    switch (status) {
      case 'completed':
        return <CheckCircle2 className="text-emerald-500" size={16} />;
      case 'error':
        return <X className="text-red-500" size={16} />;
      default:
        return <FileText className="text-slate-400" size={16} />;
    }
  };

  const pendingFilesCount = files.filter((f) => f.status === 'pending').length;
  const completedFilesCount = files.filter((f) => f.status === 'completed').length;
  const errorFilesCount = files.filter((f) => f.status === 'error').length;
  const uploadingFilesCount = files.filter((f) => f.status === 'uploading').length;
  const backgroundProcessingCount = files.filter(
    (f) => f.status === 'completed' && f.backgroundProcessing && !f.isFullyComplete
  ).length;
  const completedFiles = files.filter((f) => f.status === 'completed');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 relative overflow-hidden">
      {/* Premium Font & Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        :root {
          --sg-radius-xl: 1.5rem;
          --sg-radius-2xl: 2rem;
        }

        * {
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
          letter-spacing: 0.01em;
        }

        .glass {
          background: radial-gradient(circle at top left, rgba(56, 189, 248, 0.04), transparent 55%),
                      radial-gradient(circle at bottom right, rgba(59, 130, 246, 0.03), transparent 55%),
                      rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(22px);
          -webkit-backdrop-filter: blur(22px);
          border: 1px solid rgba(148, 163, 184, 0.35);
          box-shadow:
            0 18px 60px rgba(15, 23, 42, 0.95),
            0 0 0 1px rgba(15, 23, 42, 0.8);
        }

        .glass-strong {
          background: radial-gradient(circle at top left, rgba(56, 189, 248, 0.10), transparent 60%),
                      radial-gradient(circle at bottom right, rgba(59, 130, 246, 0.12), transparent 60%),
                      rgba(15, 23, 42, 0.92);
          backdrop-filter: blur(30px);
          -webkit-backdrop-filter: blur(30px);
          border: 1px solid rgba(191, 219, 254, 0.35);
          box-shadow:
            0 22px 70px rgba(15, 23, 42, 1),
            0 0 0 1px rgba(37, 99, 235, 0.25);
        }

        .subtle-card {
          background: linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(15, 23, 42, 0.9));
          border: 1px solid rgba(148, 163, 184, 0.35);
        }

        .pill-soft {
          background: linear-gradient(135deg, rgba(30, 64, 175, 0.75), rgba(5, 150, 105, 0.75));
          box-shadow: 0 14px 45px rgba(15, 23, 42, 0.9);
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.9);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #2563eb, #14b8a6);
          border-radius: 10px;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-16px); }
        }

        .animate-float {
          animation: float 7s ease-in-out infinite;
        }

        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }

        .animate-shimmer {
          animation: shimmer 3s linear infinite;
          background: linear-gradient(
            to right,
            transparent 0%,
            rgba(255, 255, 255, 0.12) 50%,
            transparent 100%
          );
          background-size: 1000px 100%;
        }

        .headline-kern {
          letter-spacing: -0.04em;
        }

        @keyframes pulse-slow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .animate-pulse-slow {
          animation: pulse-slow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>

      {/* Ambient Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-40 w-80 h-80 bg-blue-500/25 rounded-full blur-3xl opacity-60 animate-float" />
        <div
          className="absolute top-1/3 -right-40 w-96 h-96 bg-teal-400/25 rounded-full blur-3xl opacity-60 animate-float"
          style={{ animationDelay: '2s' }}
        />
        <div
          className="absolute bottom-1/4 left-1/2 w-80 h-80 bg-sky-500/20 rounded-full blur-3xl opacity-40 animate-float"
          style={{ animationDelay: '4s' }}
        />
      </div>

      {/* Main Container */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-16 md:py-20">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-14 md:mb-16 space-y-6"
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 220, delay: 0.1 }}
            className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full glass-strong"
          >
            <Zap size={14} className="text-teal-300" fill="currentColor" />
            <span className="text-[10px] text-slate-100/70 font-semibold tracking-[0.24em] uppercase">
              Fast Track Upload · Instant First Page
            </span>
          </motion.div>

          <div className="space-y-2">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold mb-1 tracking-tight headline-kern">
              <span className="block bg-gradient-to-r from-slate-50 via-sky-100 to-teal-200 bg-clip-text text-transparent">
                Smart Document Upload
              </span>
            </h1>
            <p className="text-white/60 text-base md:text-lg max-w-2xl mx-auto font-medium">
              Start studying in seconds. First page loads instantly,{' '}
              <span className="text-teal-300">rest processes in background</span>.
            </p>
          </div>

          <AnimatePresence>
            {!xpEarnedToday && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="inline-flex items-center gap-3 px-6 py-3.5 rounded-full pill-soft"
              >
                <Zap size={16} className="text-amber-300" fill="currentColor" />
                <span className="text-sm font-semibold text-slate-50">
                  Earn {XP_REWARDS.UPLOAD_DOCUMENT} XP on your first upload today
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8 items-start">
          {/* LEFT: Upload Zone */}
          <motion.div
            initial={{ opacity: 0, x: -18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.18 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Drop Zone */}
            <div
              {...getRootProps()}
              className={`relative cursor-pointer rounded-[28px] px-6 py-10 md:p-16 border-2 border-dashed transition-all duration-400 ${uploading ? 'pointer-events-none opacity-60' : ''
                } ${isDragActive
                  ? 'border-teal-400/70 glass-strong scale-[1.01]'
                  : 'border-slate-400/30 glass hover:border-teal-400/50 hover:glass-strong'
                }`}
            >
              <input {...getInputProps()} />

              <motion.div
                animate={isDragActive ? { scale: 1.03 } : { scale: 1 }}
                className="text-center space-y-7"
              >
                <div className="relative w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-blue-600 to-teal-500 flex items-center justify-center shadow-[0_18px_60px_rgba(15,23,42,0.9)]">
                  <Cloud size={42} className="text-white" strokeWidth={1.5} />
                  <div className="absolute inset-0 rounded-3xl opacity-40 animate-shimmer" />
                </div>

                <div className="space-y-1">
                  <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-1">
                    {isDragActive ? 'Drop your PDFs here' : 'Upload study documents'}
                  </h2>
                  <p className="text-white/55 text-sm md:text-base">
                    Drag & drop your PDFs or{' '}
                    <span className="text-teal-300 font-semibold underline underline-offset-4">
                      browse from device
                    </span>
                    .
                  </p>
                </div>

                <div className="flex flex-wrap justify-center gap-3 text-[11px] font-semibold text-white/45">
                  <span className="px-4 py-2 rounded-xl subtle-card">
                    <span className="text-white/70">PDF</span> · Only
                  </span>
                  <span className="px-4 py-2 rounded-xl subtle-card">Up to 50 MB</span>
                  <span className="px-4 py-2 rounded-xl subtle-card">Multiple files</span>
                </div>

                <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full glass-strong">
                  <Zap size={14} className="text-teal-300" fill="currentColor" />
                  <span className="text-xs text-white/75 font-semibold">
                    ⚡ First page in 2-3 seconds · Rest in background
                  </span>
                </div>
              </motion.div>
            </div>

            {/* Features */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { icon: Zap, label: 'Instant Ready', color: 'from-amber-500 to-orange-500' },
                { icon: Palette, label: 'Visual AI', color: 'from-teal-500 to-blue-500' },
                { icon: Layers, label: 'Auto Sort', color: 'from-blue-700 to-teal-600' },
                { icon: Shield, label: 'Secure', color: 'from-slate-800 to-blue-800' }
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.26 + i * 0.05 }}
                  className="p-4 md:p-5 rounded-2xl glass hover:glass-strong transition-all text-center group"
                >
                  <div
                    className={`w-12 h-12 md:w-14 md:h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}
                  >
                    <item.icon size={22} className="text-white" />
                  </div>
                  <p className="text-[11px] md:text-xs font-semibold text-white/85">
                    {item.label}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* RIGHT: Queue */}
          <motion.div
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.24 }}
          >
            {files.length > 0 ? (
              <div className="glass-strong rounded-[26px] p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-5 pb-5 border-b border-white/10">
                  <div>
                    <h3 className="text-lg font-extrabold text-white mb-1.5">Upload queue</h3>
                    <div className="flex gap-3 text-[11px] font-semibold flex-wrap">
                      {pendingFilesCount > 0 && (
                        <span className="text-white/45">{pendingFilesCount} pending</span>
                      )}
                      {uploadingFilesCount > 0 && (
                        <span className="text-sky-300">{uploadingFilesCount} processing</span>
                      )}
                      {completedFilesCount > 0 && (
                        <span className="text-teal-300">{completedFilesCount} ready</span>
                      )}
                      {backgroundProcessingCount > 0 && (
                        <span className="text-amber-300 animate-pulse-slow">
                          {backgroundProcessingCount} background
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      // Cancel all before clearing
                      files.forEach(f => {
                        if (f.docId) cancelBackgroundProcessing(f.docId);
                      });
                      unsubscribersRef.current.forEach(u => u());
                      unsubscribersRef.current.clear();
                      setFiles([]);
                    }}
                    disabled={uploading}
                    className="px-3.5 py-2 rounded-xl glass text-white/60 hover:text-white text-[11px] font-semibold transition-all disabled:opacity-30"
                  >
                    Clear
                  </button>
                </div>

                <div className="space-y-3 mb-6 max-h-[480px] overflow-y-auto custom-scrollbar pr-2">
                  <AnimatePresence mode="popLayout">
                    {files.map((fileObj) => (
                      <motion.div
                        key={fileObj.id}
                        layout
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="relative rounded-2xl p-4 glass border border-white/5 hover:glass-strong transition-all"
                      >
                        {fileObj.status === 'uploading' && fileObj.progress < 100 && (
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5 rounded-b-2xl overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${fileObj.progress}%` }}
                              className="h-full bg-gradient-to-r from-blue-500 via-teal-400 to-blue-500"
                            />
                          </div>
                        )}

                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl glass flex items-center justify-center flex-shrink-0">
                            {getStatusIcon(fileObj.status, fileObj.backgroundProcessing)}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-white text-sm truncate mb-1.5">
                              {fileObj.file.name}
                            </p>

                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              <span className="text-[10px] text-white/35 font-medium">
                                {(fileObj.file.size / (1024 * 1024)).toFixed(2)} MB
                              </span>

                              {fileObj.subject && (
                                <span className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-teal-500/18 text-teal-300 border border-teal-400/35">
                                  {fileObj.subject}
                                </span>
                              )}

                              {fileObj.hasVisualAnalysis && (
                                <span className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-blue-500/18 text-blue-300 border border-blue-400/35 flex items-center gap-1">
                                  <Eye size={10} />
                                  {fileObj.visualPagesProcessed}
                                  {fileObj.totalPages > 0 && `/${fileObj.totalPages}`}
                                </span>
                              )}

                              {fileObj.backgroundProcessing && !fileObj.isFullyComplete && (
                                <span className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-amber-500/18 text-amber-300 border border-amber-400/35 flex items-center gap-1 animate-pulse-slow">
                                  <Clock size={10} />
                                  Processing...
                                </span>
                              )}

                              {fileObj.isFullyComplete && (
                                <span className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-emerald-500/18 text-emerald-300 border border-emerald-400/35">
                                  ✓ Complete
                                </span>
                              )}
                            </div>

                            {fileObj.status === 'uploading' && fileObj.phase && (
                              <PhaseIndicator
                                phase={fileObj.phase}
                                progress={fileObj.progress}
                                status={fileObj.phaseStatus}
                              />
                            )}

                            {fileObj.status !== 'uploading' && (
                              <span
                                className={`text-[10px] font-semibold px-2 py-1 rounded-lg inline-block ${fileObj.status === 'completed'
                                  ? 'bg-teal-500/18 text-teal-300 border border-teal-400/35'
                                  : fileObj.status === 'error'
                                    ? 'bg-red-500/18 text-red-300 border border-red-400/35'
                                    : 'bg-white/5 text-white/35 border border-white/10'
                                  }`}
                              >
                                {fileObj.status === 'completed' && '✓ Ready to study'}
                                {fileObj.status === 'error' && `✕ ${fileObj.error}`}
                                {fileObj.status === 'pending' && '○ Waiting'}
                              </span>
                            )}
                          </div>

                          <div className="flex-shrink-0">
                            {fileObj.status === 'pending' && (
                              <button
                                onClick={() => removeFile(fileObj.id)}
                                className="p-2 rounded-xl hover:bg-red-500/20 text-red-400 transition-all"
                              >
                                <X size={16} />
                              </button>
                            )}

                            {fileObj.status === 'completed' && fileObj.docId && (
                              <button
                                onClick={() => navigate(`/study/${fileObj.docId}`)}
                                className="mt-1 px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-400 hover:to-blue-500 text-white text-[11px] font-semibold transition-all flex items-center gap-2"
                              >
                                <Play size={12} />
                                Study
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                <button
                  onClick={handleUpload}
                  disabled={uploading || pendingFilesCount === 0}
                  className="w-full px-6 py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-teal-500 to-blue-600 bg-[length:200%_100%] hover:bg-right text-white font-extrabold text-sm md:text-base transition-all duration-500 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-3 group"
                >
                  {uploading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <Zap size={18} fill="currentColor" />
                      <span>
                        Fast Track {pendingFilesCount} file
                        {pendingFilesCount !== 1 ? 's' : ''}
                      </span>
                      <ArrowRight
                        size={18}
                        className="group-hover:translate-x-1 transition-transform"
                      />
                    </>
                  )}
                </button>

                {completedFilesCount > 0 && !uploading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-4 space-y-3"
                  >
                    <button
                      onClick={() => navigate(`/study/${completedFiles[0].docId}`)}
                      className="w-full px-5 py-4 rounded-xl bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-400 hover:to-blue-500 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-xl group"
                    >
                      <Play size={16} />
                      <span>Start studying now</span>
                      <ArrowRight
                        size={16}
                        className="group-hover:translate-x-1 transition-transform"
                      />
                    </button>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => navigate('/documents')}
                        className="px-4 py-3 rounded-xl glass hover:glass-strong text-white/75 hover:text-white font-semibold text-xs transition-all flex items-center justify-center gap-2"
                      >
                        <BookOpen size={16} />
                        Library
                      </button>
                      <button
                        onClick={() => navigate('/dashboard')}
                        className="px-4 py-3 rounded-xl glass hover:glass-strong text-white/75 hover:text-white font-semibold text-xs transition-all flex items-center justify-center gap-2"
                      >
                        <TrendingUp size={16} />
                        Dashboard
                      </button>
                    </div>
                  </motion.div>
                )}

                {completedFilesCount > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-5 pt-5 border-t border-white/10"
                  >
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-extrabold text-teal-300">
                          {completedFilesCount}
                        </p>
                        <p className="text-[11px] text-white/45 font-semibold mt-1">
                          Ready
                        </p>
                      </div>
                      <div>
                        <p className="text-2xl font-extrabold text-amber-300">
                          {backgroundProcessingCount}
                        </p>
                        <p className="text-[11px] text-white/45 font-semibold mt-1">
                          Processing
                        </p>
                      </div>
                      <div>
                        <p className="text-2xl font-extrabold text-sky-300">
                          {uploadStats.totalXP || 0}
                        </p>
                        <p className="text-[11px] text-white/45 font-semibold mt-1">
                          XP earned
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            ) : (
              <div className="glass rounded-[26px] p-10 text-center min-h-[460px] flex flex-col items-center justify-center space-y-4">
                <div className="w-16 h-16 rounded-2xl glass-strong flex items-center justify-center mb-2">
                  <Upload size={30} className="text-white/25" />
                </div>
                <h3 className="text-base md:text-lg font-semibold text-white/80">
                  No files selected
                </h3>
                <p className="text-sm text-white/40 max-w-xs">
                  Drop your PDFs to start. First page loads instantly, rest processes while you
                  study.
                </p>
              </div>
            )}
          </motion.div>
        </div>

        {/* Footer Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="mt-10 md:mt-12 p-6 md:p-8 rounded-2xl glass-strong"
        >
          <div className="flex items-center justify-between flex-wrap gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl glass">
                <Zap size={22} className="text-teal-300" fill="currentColor" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white mb-1">
                  ⚡ Fast Track Processing
                </h4>
                <p className="text-xs text-white/45">
                  First page ready in 2-3s → Start studying → Rest processes in background
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              {[
                { icon: Zap, label: 'Instant' },
                { icon: Palette, label: 'Visual AI' },
                { icon: Brain, label: 'Smart' }
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass"
                >
                  <item.icon size={16} className="text-teal-300" />
                  <span className="text-xs font-semibold text-white/70">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PDFUpload;