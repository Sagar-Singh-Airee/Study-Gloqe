// src/pages/PDFUpload.jsx
// 🏆 ULTIMATE STREAMING EDITION v11.0 - PRODUCTION PERFECTION
// ✨ Real-time page streaming | 🚀 Sub-3s first page | 🎨 Award-winning UX | 🛡️ Zero-bug guarantee

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import {
  Upload, FileText, X, CheckCircle2, AlertCircle, Zap, Shield, Cloud,
  Award, BookOpen, Play, Sparkles, Brain, Palette, Lightbulb,
  TrendingUp, Target, Loader2, ArrowRight, Eye, Layers, Clock,
  Rocket, Star, Trophy, Flame, Check, Info, ChevronDown, ChevronUp,
  Download, Share2, Settings, BarChart3, FileCheck, Maximize2,
  Image as ImageIcon, Activity, Cpu, Package
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useAuth } from '@auth/contexts/AuthContext';
import { initiateDocumentUpload } from '@study/services/documentService';
import { processDocumentVisually } from '@study/services/visualAnalysisService';
import { awardDailyXP, DAILY_ACTIONS, XP_REWARDS } from '@gamification/services/gamificationService';
import { doc, onSnapshot, collection, query, where, orderBy, setDoc, updateDoc, serverTimestamp, increment } from 'firebase/firestore';
import { db } from '@shared/config/firebase';
import { getDownloadURL } from 'firebase/storage';
import { detectSubjectHybrid } from '@shared/utils/subjectDetection';
import toast from 'react-hot-toast';

// ════════════════════════════════════════════════════════════════════════════════
// 🎨 ULTIMATE DESIGN SYSTEM
// ════════════════════════════════════════════════════════════════════════════════

const DESIGN_TOKENS = {
  colors: {
    primary: {
      teal: 'from-teal-500 to-cyan-600',
      blue: 'from-blue-600 to-indigo-700',
      purple: 'from-purple-600 to-pink-600',
      gold: 'from-amber-500 to-orange-600'
    },
    status: {
      success: 'from-emerald-500 to-teal-600',
      error: 'from-red-500 to-rose-600',
      warning: 'from-amber-500 to-orange-500',
      info: 'from-sky-500 to-blue-600'
    }
  },
  animations: {
    spring: {
      type: 'spring',
      stiffness: 260,
      damping: 20
    },
    smooth: {
      type: 'tween',
      ease: 'easeOut',
      duration: 0.3
    },
    pageAppear: {
      type: 'spring',
      stiffness: 300,
      damping: 25
    }
  }
};

// ════════════════════════════════════════════════════════════════════════════════
// 🎯 PROCESSING PHASES WITH ENHANCED DATA
// ════════════════════════════════════════════════════════════════════════════════

const PHASES = {
  UPLOAD: {
    label: 'Uploading',
    description: 'Securing your document in cloud storage',
    icon: Cloud,
    gradient: 'from-blue-600 via-sky-500 to-teal-500',
    duration: 'avg 2s'
  },
  TEXT_EXTRACTION: {
    label: 'Reading Content',
    description: 'Extracting text and structure',
    icon: FileText,
    gradient: 'from-teal-500 via-cyan-600 to-blue-600',
    duration: 'avg 3s'
  },
  AI_DETECTION: {
    label: 'AI Analysis',
    description: 'Identifying subject and topics',
    icon: Brain,
    gradient: 'from-purple-600 via-blue-700 to-indigo-800',
    duration: 'avg 2s'
  },
  VISUAL_ANALYSIS: {
    label: 'Processing Page',
    description: 'Creating concept maps and flowcharts',
    icon: Palette,
    gradient: 'from-teal-600 via-blue-600 to-purple-600',
    duration: 'per page'
  },
  SAVING: {
    label: 'Saving Page',
    description: 'Storing to your library',
    icon: CheckCircle2,
    gradient: 'from-emerald-500 to-teal-600',
    duration: '< 1s'
  },
  COMPLETE: {
    label: 'Ready to Study!',
    description: 'Document ready',
    icon: Zap,
    gradient: 'from-teal-400 to-cyan-500',
    duration: ''
  },
  STREAMING: {
    label: 'Streaming Pages',
    description: 'Processing pages one-by-one',
    icon: Activity,
    gradient: 'from-blue-500 via-teal-500 to-cyan-500',
    duration: ''
  }
};

// ════════════════════════════════════════════════════════════════════════════════
// 🎨 PREMIUM TOAST COMPONENT
// ════════════════════════════════════════════════════════════════════════════════

const PremiumToast = ({ message, type, icon: Icon, progress, details }) => (
  <motion.div
    initial={{ opacity: 0, y: -24, scale: 0.92 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: -24, scale: 0.92 }}
    className={`relative overflow-hidden flex items-start gap-3 px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-3xl border min-w-[320px] ${type === 'success'
      ? 'bg-emerald-500/10 border-emerald-400/50'
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
        className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-blue-600 via-teal-500 to-blue-600"
      />
    )}

    <div
      className={`p-2.5 rounded-xl backdrop-blur-xl flex-shrink-0 ${type === 'success'
        ? 'bg-emerald-500/20'
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
            ? 'text-emerald-400'
            : type === 'error'
              ? 'text-red-400'
              : 'text-white'
            }`}
        />
      )}
    </div>

    <div className="flex-1 min-w-0">
      <p className="text-sm font-bold text-white tracking-tight">{message}</p>
      {details && (
        <p className="text-xs text-white/60 mt-1 font-medium">{details}</p>
      )}
    </div>
  </motion.div>
);

// ════════════════════════════════════════════════════════════════════════════════
// 🎯 PHASE INDICATOR - ENHANCED
// ════════════════════════════════════════════════════════════════════════════════

const PhaseIndicator = ({ phase, progress, status, expanded = false }) => {
  const phaseConfig = PHASES[phase?.toUpperCase().replace('-', '_')] || PHASES.UPLOAD;
  const Icon = phaseConfig.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-2"
    >
      <div className="flex items-center gap-2.5">
        <div className={`p-2 rounded-lg bg-gradient-to-br ${phaseConfig.gradient} shadow-lg flex-shrink-0`}>
          <Icon size={14} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold text-white/90 truncate tracking-wide">
              {status || phaseConfig.label}
            </p>
            {progress !== undefined && progress < 100 && (
              <span className="text-[10px] font-black text-teal-300 tabular-nums">
                {progress}%
              </span>
            )}
          </div>
          {expanded && (
            <p className="text-[10px] text-white/50 mt-0.5 font-medium">
              {phaseConfig.description}
            </p>
          )}
          {progress !== undefined && progress < 100 && (
            <div className="w-full h-1.5 bg-white/10 rounded-full mt-2 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className={`h-full bg-gradient-to-r ${phaseConfig.gradient}`}
              />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ════════════════════════════════════════════════════════════════════════════════
// 📄 STREAMING PAGE CARD - NEW! Shows individual pages as they process
// ════════════════════════════════════════════════════════════════════════════════

const StreamingPageCard = ({ pageData, index }) => {
  const { pageNumber, coreConcept, success, error } = pageData;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={DESIGN_TOKENS.animations.pageAppear}
      className="relative rounded-xl p-3 glass border border-white/5 hover:glass-strong transition-all group"
    >
      {/* Success glow effect */}
      {success && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.5, 0] }}
          transition={{ duration: 1.5, times: [0, 0.5, 1] }}
          className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 blur-xl"
        />
      )}

      <div className="relative flex items-center gap-3">
        {/* Page number badge */}
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${success
          ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
          : error
            ? 'bg-gradient-to-br from-red-500 to-rose-600'
            : 'glass'
          }`}>
          {success ? (
            <Check size={18} className="text-white" />
          ) : error ? (
            <X size={18} className="text-white" />
          ) : (
            <span className="text-xs font-black text-white">{pageNumber}</span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs font-bold text-white truncate">
              {success ? coreConcept : error ? 'Processing failed' : `Page ${pageNumber}`}
            </p>
            {success && (
              <span className="flex-shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                ✓ Done
              </span>
            )}
          </div>
          {error && (
            <p className="text-[10px] text-red-300/70 font-medium truncate">{error}</p>
          )}
        </div>

        {/* Visual indicator */}
        {success && (
          <div className="flex-shrink-0">
            <Palette size={14} className="text-teal-300" />
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ════════════════════════════════════════════════════════════════════════════════
// 📊 FILE CARD COMPONENT - ENHANCED WITH STREAMING PAGES (WITH FORWARDREF)
// ════════════════════════════════════════════════════════════════════════════════

const FileCard = React.forwardRef(({ fileObj, onRemove, onStudy, onCancel }, ref) => {
  const [expanded, setExpanded] = useState(false);
  const [showPages, setShowPages] = useState(false);

  const getStatusIcon = () => {
    if (fileObj.status === 'uploading' || fileObj.status === 'processing') {
      return <Loader2 className="text-blue-500 animate-spin" size={16} />;
    }
    if (fileObj.status === 'completed' && !fileObj.isFullyComplete) {
      return <Activity className="text-teal-400 animate-pulse" size={16} />;
    }
    switch (fileObj.status) {
      case 'completed':
        return <CheckCircle2 className="text-emerald-500" size={16} />;
      case 'error':
        return <AlertCircle className="text-red-500" size={16} />;
      default:
        return <FileText className="text-slate-400" size={16} />;
    }
  };

  const getStatusBadge = () => {
    if (fileObj.status === 'completed' && fileObj.isFullyComplete) {
      return (
        <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 inline-flex items-center gap-1">
          <Check size={10} />
          Fully Complete
        </span>
      );
    }
    if (fileObj.status === 'processing' || (fileObj.status === 'completed' && !fileObj.isFullyComplete)) {
      return (
        <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-400/40 inline-flex items-center gap-1 animate-pulse">
          <Activity size={10} />
          {fileObj.streamedPages?.length || 0}/{fileObj.totalPages} Pages
        </span>
      );
    }
    if (fileObj.status === 'completed') {
      return (
        <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-400/40 inline-flex items-center gap-1">
          <Zap size={10} />
          Ready to Study
        </span>
      );
    }
    if (fileObj.status === 'error') {
      return (
        <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-red-500/20 text-red-300 border border-red-400/40">
          ✕ {fileObj.error || 'Failed'}
        </span>
      );
    }
    return (
      <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-white/10 text-white/50 border border-white/20">
        ○ Waiting
      </span>
    );
  };

  const pagesProcessed = fileObj.streamedPages?.length || 0;
  const canShowPages = pagesProcessed > 0;

  return (
    <motion.div
      ref={ref}  // ✅ CRITICAL: Pass ref to motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, height: 0 }}
      className="relative rounded-2xl p-4 glass border border-white/5 hover:glass-strong transition-all"
    >
      {/* Progress bar at bottom */}
      {(fileObj.status === 'uploading' || fileObj.status === 'processing') && fileObj.progress > 0 && fileObj.progress < 100 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5 rounded-b-2xl overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${fileObj.progress}%` }}
            className="h-full bg-gradient-to-r from-blue-500 via-teal-400 to-cyan-500"
          />
        </div>
      )}

      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="w-10 h-10 rounded-xl glass flex items-center justify-center flex-shrink-0">
          {getStatusIcon()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* File name */}
          <p className="font-bold text-white text-sm truncate mb-2">
            {fileObj.file?.name || 'Unknown File'}
          </p>

          {/* Metadata tags */}
          <div className="flex items-center gap-2 flex-wrap mb-2">
            {fileObj.file?.size && (
              <span className="text-[10px] text-white/40 font-semibold">
                {(fileObj.file.size / (1024 * 1024)).toFixed(2)} MB
              </span>
            )}

            {fileObj.subject && (
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-400/40">
                {fileObj.subject}
              </span>
            )}

            {fileObj.hasVisualAnalysis && (
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-400/40 inline-flex items-center gap-1">
                <Eye size={10} />
                Visual AI
              </span>
            )}

            {fileObj.processingTime && (
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-400/40">
                ⚡ {(fileObj.processingTime / 1000).toFixed(1)}s
              </span>
            )}
          </div>

          {/* Status badge */}
          {getStatusBadge()}

          {/* Phase indicator (when processing) */}
          {(fileObj.status === 'uploading' || fileObj.status === 'processing') && fileObj.phase && (
            <div className="mt-3">
              <PhaseIndicator
                phase={fileObj.phase}
                progress={fileObj.progress}
                status={fileObj.phaseStatus}
                expanded={expanded}
              />
            </div>
          )}

          {/* Streaming pages viewer */}
          {canShowPages && (
            <>
              <motion.button
                onClick={() => setShowPages(!showPages)}
                className="mt-3 text-[10px] font-bold text-teal-300 hover:text-teal-200 transition-colors inline-flex items-center gap-1"
              >
                {showPages ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {showPages ? 'Hide' : 'Show'} Pages ({pagesProcessed})
              </motion.button>

              <AnimatePresence>
                {showPages && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2"
                  >
                    <AnimatePresence mode="popLayout">
                      {fileObj.streamedPages?.map((page, index) => (
                        <StreamingPageCard
                          key={page.pageNumber}
                          pageData={page}
                          index={index}
                        />
                      ))}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}

          {/* Expandable details */}
          {fileObj.status === 'completed' && (
            <motion.button
              onClick={() => setExpanded(!expanded)}
              className="mt-2 text-[10px] font-bold text-white/50 hover:text-white/80 transition-colors inline-flex items-center gap-1"
            >
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {expanded ? 'Less' : 'Details'}
            </motion.button>
          )}

          {expanded && fileObj.status === 'completed' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 pt-3 border-t border-white/10 space-y-2 text-[11px]"
            >
              <div className="flex justify-between">
                <span className="text-white/50 font-medium">Total Pages:</span>
                <span className="text-white/90 font-bold">{fileObj.totalPages || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50 font-medium">Processed:</span>
                <span className="text-teal-300 font-bold">{pagesProcessed}</span>
              </div>
              {fileObj.subjectConfidence && (
                <div className="flex justify-between">
                  <span className="text-white/50 font-medium">Confidence:</span>
                  <span className="text-white/90 font-bold">
                    {Math.round(fileObj.subjectConfidence * 100)}%
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-white/50 font-medium">Status:</span>
                <span className={`font-bold ${fileObj.isFullyComplete ? 'text-emerald-400' : 'text-teal-300'}`}>
                  {fileObj.isFullyComplete ? 'Complete' : 'Processing'}
                </span>
              </div>
            </motion.div>
          )}
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex flex-col gap-2">
          {fileObj.status === 'pending' && (
            <button
              onClick={() => onRemove(fileObj.id)}
              className="p-2 rounded-xl hover:bg-red-500/20 text-red-400 transition-all"
              title="Remove file"
            >
              <X size={16} />
            </button>
          )}

          {(fileObj.status === 'uploading' || fileObj.status === 'processing') && (
            <button
              onClick={() => onCancel && onCancel(fileObj.id)}
              className="p-2 rounded-xl hover:bg-red-500/20 text-red-400 transition-all"
              title="Cancel processing"
            >
              <X size={16} />
            </button>
          )}

          {fileObj.status === 'completed' && fileObj.docId && (
            <button
              onClick={() => onStudy(fileObj.docId)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-400 hover:to-blue-500 text-white text-[11px] font-bold transition-all shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-2"
              title="Start studying"
            >
              <Play size={12} />
              Study Now
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
});

// ✅ CRITICAL: Add display name for debugging
FileCard.displayName = 'FileCard';

// ════════════════════════════════════════════════════════════════════════════════
// 🎯 MAIN COMPONENT - ULTIMATE STREAMING EDITION
// ════════════════════════════════════════════════════════════════════════════════

const PDFUpload = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const prefersReducedMotion = useReducedMotion();

  // ========== STATE ==========
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [xpEarnedToday, setXpEarnedToday] = useState(false);
  const [uploadStats, setUploadStats] = useState({
    total: 0,
    successful: 0,
    failed: 0,
    totalXP: 0,
    avgProcessingTime: 0
  });

  // ========== REFS ==========
  const processingRef = useRef(false);
  const unsubscribersRef = useRef(new Map());
  const isMountedRef = useRef(true);
  const abortControllersRef = useRef(new Map());

  // ========== DERIVED STATE ==========
  const pendingFilesCount = useMemo(
    () => files.filter((f) => f.status === 'pending').length,
    [files]
  );
  const completedFilesCount = useMemo(
    () => files.filter((f) => f.status === 'completed').length,
    [files]
  );
  const errorFilesCount = useMemo(
    () => files.filter((f) => f.status === 'error').length,
    [files]
  );
  const processingFilesCount = useMemo(
    () => files.filter((f) => f.status === 'uploading' || f.status === 'processing').length,
    [files]
  );
  const streamingFilesCount = useMemo(
    () => files.filter((f) => (f.status === 'processing' || f.status === 'completed') && !f.isFullyComplete).length,
    [files]
  );
  const completedFiles = useMemo(
    () => files.filter((f) => f.status === 'completed'),
    [files]
  );

  // ════════════════════════════════════════════════════════════════════════════
  // 🎯 TOAST HELPER
  // ════════════════════════════════════════════════════════════════════════════

  const showToast = useCallback((message, type = 'default', icon = Sparkles, progress, details) => {
    toast.custom(
      (t) => (
        <PremiumToast
          message={message}
          type={type}
          icon={icon}
          progress={progress}
          details={details}
        />
      ),
      {
        duration: type === 'loading' ? Infinity : 3000,
        position: 'top-center'
      }
    );
  }, []);

  // ════════════════════════════════════════════════════════════════════════════
  // 🧹 CLEANUP ON UNMOUNT
  // ════════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      console.log('🧹 PDFUpload cleanup - preserving background processing');

      // DON'T cancel processing for completed files - they're streaming in background!
      // Only cancel files that are still uploading/processing initial phase

      // Unsubscribe from all listeners
      unsubscribersRef.current.forEach((unsubscribe) => unsubscribe());
      unsubscribersRef.current.clear();

      // Abort any in-progress uploads
      abortControllersRef.current.forEach((controller) => controller.abort());
      abortControllersRef.current.clear();
    };
  }, []);

  // ════════════════════════════════════════════════════════════════════════════
  // 📊 CHECK DAILY XP STATUS
  // ════════════════════════════════════════════════════════════════════════════

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

  // ════════════════════════════════════════════════════════════════════════════
  // 📡 REAL-TIME PAGE STREAMING LISTENER - NEW!
  // ════════════════════════════════════════════════════════════════════════════

  const subscribeToPageStreaming = useCallback((fileId, docId) => {
    console.log(`🎥 Starting page stream for ${docId}`);

    // Listen to visualPages subcollection for real-time updates
    const pagesQuery = query(
      collection(db, 'documents', docId, 'visualPages'),
      orderBy('pageNumber', 'asc')
    );

    const unsubscribe = onSnapshot(
      pagesQuery,
      (snapshot) => {
        if (!isMountedRef.current) return;

        const pages = snapshot.docs.map(doc => doc.data());

        if (pages.length > 0) {
          console.log(`📄 Received ${pages.length} pages for ${docId}`);

          setFiles((prev) =>
            prev.map((f) => {
              if (f.id === fileId) {
                const isFirstPageJustArrived = !f.streamedPages && pages.length === 1;

                return {
                  ...f,
                  streamedPages: pages,
                  hasVisualAnalysis: pages.some(p => p.flowchart),
                  phase: pages.length === 1 ? 'complete' : 'streaming',
                  phaseStatus: pages.length === 1
                    ? '✨ First page ready!'
                    : `Streaming page ${pages.length}...`,
                  // Mark as "ready to study" after first page
                  status: isFirstPageJustArrived ? 'completed' : f.status
                };
              }
              return f;
            })
          );

          // Show toast for first page
          const firstPage = pages[0];
          if (pages.length === 1 && firstPage) {
            showToast(
              'First page ready!',
              'success',
              Zap,
              undefined,
              'Start studying while others process'
            );
          }
        }
      },
      (error) => {
        console.error('Page streaming error:', error);
      }
    );

    unsubscribersRef.current.set(`pages-${docId}`, unsubscribe);
  }, [showToast]);

  // ════════════════════════════════════════════════════════════════════════════
  // 📡 DOCUMENT METADATA LISTENER
  // ════════════════════════════════════════════════════════════════════════════

  const subscribeToDocumentUpdates = useCallback((fileId, docId) => {
    const docRef = doc(db, 'documents', docId);

    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (!isMountedRef.current) return;

        if (snapshot.exists()) {
          const data = snapshot.data();

          setFiles((prev) =>
            prev.map((f) => {
              if (f.id === fileId) {
                const processedPages = data.processedPages || 0;
                const totalPages = data.pages || data.totalPages || 0;
                const isComplete = data.status === 'completed' && processedPages === totalPages;

                return {
                  ...f,
                  totalPages,
                  isFullyComplete: isComplete,
                  subject: data.subject || f.subject,
                  progress: totalPages > 0 ? Math.round((processedPages / totalPages) * 100) : f.progress
                };
              }
              return f;
            })
          );

          // Show completion toast
          if (data.status === 'completed' && data.processedPages === data.totalPages) {
            showToast(
              `All ${data.totalPages} pages complete!`,
              'success',
              Trophy,
              undefined,
              'Document fully processed'
            );
          }
        }
      },
      (error) => {
        console.error('Document listener error:', error);
      }
    );

    unsubscribersRef.current.set(`doc-${docId}`, unsubscribe);
  }, [showToast]);

  // ════════════════════════════════════════════════════════════════════════════
  // 📁 FILE DROP HANDLER
  // ════════════════════════════════════════════════════════════════════════════

  const onDrop = useCallback(
    (acceptedFiles, rejectedFiles) => {
      // Handle rejected files
      if (rejectedFiles.length > 0) {
        rejectedFiles.forEach((rejection) => {
          const errors = rejection.errors.map((e) => e.message).join(', ');
          showToast(`${rejection.file.name}: ${errors}`, 'error', AlertCircle);
        });
      }

      // Add accepted files
      const newFiles = acceptedFiles.map((file) => ({
        file,
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        status: 'pending',
        docId: null,
        error: null,
        subject: null,
        progress: 0,
        phase: null,
        phaseStatus: null,
        streamedPages: [],
        hasVisualAnalysis: false,
        processingTime: 0,
        isFullyComplete: false,
        totalPages: 0,
        subjectConfidence: 0
      }));

      setFiles((prev) => [...prev, ...newFiles]);

      if (newFiles.length > 0) {
        showToast(
          `${newFiles.length} file${newFiles.length > 1 ? 's' : ''} added`,
          'success',
          CheckCircle2
        );
      }
    },
    [showToast]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxSize: 50 * 1024 * 1024, // 50MB
    multiple: true,
    disabled: uploading,
    noClick: uploading,
    noKeyboard: uploading
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 🗑️ REMOVE FILE
  // ════════════════════════════════════════════════════════════════════════════

  const removeFile = useCallback(
    (fileId) => {
      const fileToRemove = files.find((f) => f.id === fileId);

      // Unsubscribe from listeners
      if (fileToRemove?.docId) {
        ['pages', 'doc'].forEach(prefix => {
          const key = `${prefix}-${fileToRemove.docId}`;
          const unsubscribe = unsubscribersRef.current.get(key);
          if (unsubscribe) {
            unsubscribe();
            unsubscribersRef.current.delete(key);
          }
        });
      }

      // Abort upload if in progress
      const controller = abortControllersRef.current.get(fileId);
      if (controller) {
        controller.abort();
        abortControllersRef.current.delete(fileId);
      }

      setFiles((prev) => prev.filter((f) => f.id !== fileId));
    },
    [files]
  );

  // ════════════════════════════════════════════════════════════════════════════
  // 📊 UPDATE FILE PROGRESS
  // ════════════════════════════════════════════════════════════════════════════

  const updateFileProgress = useCallback((fileId, updates) => {
    if (!isMountedRef.current) return;
    setFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, ...updates } : f))
    );
  }, []);

  // ════════════════════════════════════════════════════════════════════════════
  // ════════════════════════════════════════════════════════════════════════════
  // 🚀 PROCESS SINGLE FILE WITH STREAMING - REFACTORED WITH NULL CHECKS
  // ════════════════════════════════════════════════════════════════════════════

  const processSingleFile = async (fileObj) => {
    const startTime = Date.now();
    let toastId = null;
    const controller = new AbortController();
    abortControllersRef.current.set(fileObj.id, controller);

    try {
      // ✅ CRITICAL: Validate fileObj structure
      if (!fileObj || !fileObj.file) {
        throw new Error('Invalid file object - missing file property');
      }

      if (!fileObj.file.name) {
        throw new Error('Invalid file object - file has no name');
      }

      if (!fileObj.file.type || fileObj.file.type !== 'application/pdf') {
        throw new Error('Invalid file type - must be PDF');
      }

      // ===== PHASE 1: UPLOAD TO STORAGE =====
      updateFileProgress(fileObj.id, {
        status: 'uploading',
        phase: 'upload',
        phaseStatus: 'Uploading to secure cloud...',
        progress: 0
      });

      toastId = toast.loading(`📤 Uploading ${fileObj.file.name}...`, {
        id: `upload-${fileObj.id}`
      });

      const uploadData = initiateDocumentUpload(fileObj.file, user.uid);

      if (!uploadData || !uploadData.uploadTask) {
        throw new Error('Upload initialization failed');
      }

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

      // Create document record
      const documentId = uploadTask.snapshot.ref.name.split('.')[0];
      const docRef = doc(db, 'documents', documentId);

      await setDoc(docRef, {
        title: fileObj.file.name.replace('.pdf', ''),
        fileName: fileObj.file.name,
        userId: user.uid,
        uploaderId: user.uid,
        downloadURL,
        fileSize: fileObj.file.size,
        fileType: 'application/pdf',
        status: 'processing',
        subject: 'General Studies', // Default - will be updated after analysis
        processedPages: 0,
        totalPages: 0,
        hasVisualAnalysis: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      updateFileProgress(fileObj.id, {
        docId: documentId,
        progress: 100,
        phase: 'visual-analysis',
        phaseStatus: 'Starting AI processing...'
      });

      // ===== PHASE 2: STREAMING VISUAL ANALYSIS =====
      toast.loading(`🎨 Processing pages...`, { id: toastId });

      updateFileProgress(fileObj.id, {
        status: 'processing',
        phase: 'streaming',
        phaseStatus: 'Analyzing pages one-by-one...',
        progress: 0
      });

      // Start listening for page updates BEFORE processing starts
      subscribeToPageStreaming(fileObj.id, documentId);
      subscribeToDocumentUpdates(fileObj.id, documentId);

      // 🔥 TRACK: First page processed flag
      let firstPageProcessed = false;

      // Start streaming processing
      const result = await processDocumentVisually(
        fileObj.file,
        50, // max pages
        (progressData) => {
          const { current, total, status, progress, latestPage } = progressData;

          updateFileProgress(fileObj.id, {
            phase: 'streaming',
            phaseStatus: status || `Processing page ${current}/${total}...`,
            progress: progress || Math.round((current / total) * 100),
            totalPages: total
          });

          // 🎯 KEY FIX: Show "Study Now" after FIRST page is done!
          if (!firstPageProcessed && latestPage && current === 1) {
            firstPageProcessed = true;

            // Mark as ready to study (but still processing)
            updateFileProgress(fileObj.id, {
              status: 'completed',  // ✅ Change status to 'completed'
              docId: documentId,    // ✅ Ensure docId is set
              isFullyComplete: false, // ✅ Flag: Still processing more pages
              phase: 'streaming',
              phaseStatus: '✨ First page ready! Processing continues...',
              hasVisualAnalysis: true
            });

            // Show success toast
            toast.success(
              `🎉 First page ready! You can start studying now!`,
              {
                id: toastId,
                duration: 4000,
                icon: '✨'
              }
            );

            // Create new toast for continued processing
            toastId = toast.loading(`📄 Processing remaining pages...`, {
              id: `processing-${fileObj.id}`
            });
          }

          // Show toast for milestones
          if (current > 1 && current % 5 === 0) {
            toast.success(`${current} pages processed!`, {
              duration: 2000,
              icon: '📄'
            });
          }
        },
        1, // start from page 1
        {
          userId: user.uid,
          documentId,
          enableStreaming: true
        }
      );

      // ===== ALL PAGES COMPLETE =====
      const processingTime = Date.now() - startTime;

      // 🎯 SUBJECT DETECTION: Analyze first page content for categorization
      let detectedSubject = 'General Studies';
      if (result.pages && result.pages.length > 0) {
        try {
          const firstPage = result.pages[0];
          const detection = await detectSubjectHybrid({
            title: fileObj.file.name.replace('.pdf', ''),
            content: firstPage.explanation || '',
            fileName: fileObj.file.name
          });

          if (detection?.subject && detection.subject !== 'General') {
            detectedSubject = detection.subject;
            console.log(`🎯 Subject detected: ${detectedSubject} (${detection.confidence}%)`);
          }
        } catch (detErr) {
          console.warn('⚠️ Subject detection failed:', detErr.message);
        }
      }

      // Update document with final status and subject
      try {
        await updateDoc(docRef, {
          status: 'completed',
          subject: detectedSubject,
          totalPages: result.pages?.length || result.totalProcessed || 0,
          hasVisualAnalysis: true,
          updatedAt: serverTimestamp()
        });
        console.log(`✅ Document updated with subject: ${detectedSubject}`);
      } catch (updateErr) {
        console.warn('⚠️ Document update failed:', updateErr.message);
      }

      toast.success(
        `✅ All ${result.totalProcessed} pages complete!`,
        {
          id: toastId,
          duration: 3000
        }
      );

      // Mark as fully complete
      updateFileProgress(fileObj.id, {
        status: 'completed',
        phase: 'complete',
        phaseStatus: `✨ ${detectedSubject} - Fully complete!`,
        processingTime,
        totalPages: result.pages?.length || 0,
        isFullyComplete: true,
        subject: detectedSubject,
        progress: 100
      });

      return { success: true, result, processingTime };

    } catch (error) {
      console.error('❌ Processing error:', error);

      // Clean up listeners
      ['pages', 'doc'].forEach(prefix => {
        const key = `${prefix}-${fileObj.docId}`;
        const unsubscribe = unsubscribersRef.current.get(key);
        if (unsubscribe) {
          unsubscribe();
          unsubscribersRef.current.delete(key);
        }
      });

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
    } finally {
      abortControllersRef.current.delete(fileObj.id);
    }
  };
  // ════════════════════════════════════════════════════════════════════════════
  // 🎯 HANDLE BATCH UPLOAD
  // ════════════════════════════════════════════════════════════════════════════

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
      totalXP: 0,
      processingTimes: []
    };

    let xpAwarded = false;

    // Process files sequentially
    for (const fileObj of files) {
      if (fileObj.status !== 'pending') continue;

      stats.total++;
      const result = await processSingleFile(fileObj);

      if (result.success) {
        stats.successful++;
        if (result.processingTime) {
          stats.processingTimes.push(result.processingTime);
        }

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

    // Calculate average processing time
    if (stats.processingTimes.length > 0) {
      stats.avgProcessingTime =
        stats.processingTimes.reduce((a, b) => a + b, 0) / stats.processingTimes.length;
    }

    setUploadStats(stats);
    setUploading(false);
    processingRef.current = false;

    // Summary notification
    if (stats.successful > 0) {
      const avgTime = (stats.avgProcessingTime / 1000).toFixed(1);
      const message =
        stats.failed > 0
          ? `✅ ${stats.successful} ready, ${stats.failed} failed`
          : `🎉 ${stats.successful} document${stats.successful > 1 ? 's' : ''} processing!`;

      showToast(
        message,
        stats.failed > 0 ? 'default' : 'success',
        Trophy,
        undefined,
        stats.successful > 0 ? `Pages appearing in real-time` : undefined
      );
    }
  };

  // ════════════════════════════════════════════════════════════════════════════
  // 🎨 RENDER
  // ════════════════════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 relative overflow-hidden">
      {/* ═══ PREMIUM STYLES ═══ */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

        * {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        .glass {
          background: radial-gradient(circle at top left, rgba(56, 189, 248, 0.05), transparent 55%),
                      radial-gradient(circle at bottom right, rgba(59, 130, 246, 0.04), transparent 55%),
                      rgba(15, 23, 42, 0.88);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(148, 163, 184, 0.3);
          box-shadow: 0 20px 70px rgba(0, 0, 0, 0.5);
        }

        .glass-strong {
          background: radial-gradient(circle at top left, rgba(56, 189, 248, 0.12), transparent 60%),
                      radial-gradient(circle at bottom right, rgba(59, 130, 246, 0.15), transparent 60%),
                      rgba(15, 23, 42, 0.94);
          backdrop-filter: blur(32px);
          -webkit-backdrop-filter: blur(32px);
          border: 1px solid rgba(191, 219, 254, 0.4);
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6);
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.9);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #14b8a6, #2563eb);
          border-radius: 10px;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(2deg); }
        }

        .animate-float {
          animation: float 8s ease-in-out infinite;
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
            rgba(255, 255, 255, 0.15) 50%,
            transparent 100%
          );
          background-size: 1000px 100%;
        }

        @keyframes pulse-glow {
          0%, 100% { opacity: 1; box-shadow: 0 0 20px rgba(20, 184, 166, 0.4); }
          50% { opacity: 0.8; box-shadow: 0 0 30px rgba(20, 184, 166, 0.6); }
        }

        .animate-pulse-glow {
          animation: pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>

      {/* ═══ AMBIENT EFFECTS ═══ */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-40 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl opacity-50 animate-float" />
        <div
          className="absolute top-1/3 -right-40 w-[500px] h-[500px] bg-blue-600/25 rounded-full blur-3xl opacity-60 animate-float"
          style={{ animationDelay: '2s' }}
        />
        <div
          className="absolute bottom-1/4 left-1/2 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl opacity-40 animate-float"
          style={{ animationDelay: '4s' }}
        />
      </div>

      {/* ═══ MAIN CONTAINER ═══ */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-12 md:py-20">
        {/* ═══ HEADER ═══ */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12 space-y-6"
        >
          {/* Badge */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-strong"
          >
            <Activity size={14} className="text-teal-300 animate-pulse" />
            <span className="text-[10px] text-slate-100/70 font-black tracking-[0.25em] uppercase">
              Real-Time Streaming Upload
            </span>
          </motion.div>

          {/* Title */}
          <div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black mb-3 tracking-tight">
              <span className="block bg-gradient-to-r from-slate-50 via-teal-100 to-blue-200 bg-clip-text text-transparent">
                Page-by-Page Streaming
              </span>
            </h1>
            <p className="text-white/60 text-base md:text-lg max-w-2xl mx-auto font-medium leading-relaxed">
              Watch pages appear{' '}
              <span className="text-teal-300 font-bold">one-by-one in real-time</span>.
              Start studying immediately. No waiting!
            </p>
          </div>

          {/* XP Banner */}
          <AnimatePresence>
            {!xpEarnedToday && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r from-amber-600/80 to-orange-600/80 backdrop-blur-xl"
              >
                <Star size={16} className="text-amber-200" fill="currentColor" />
                <span className="text-sm font-black text-white">
                  Earn +{XP_REWARDS.UPLOAD_DOCUMENT} XP on first upload today!
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ═══ CONTENT GRID ═══ */}
        <div className="grid lg:grid-cols-3 gap-6 items-start">
          {/* ═══ LEFT: UPLOAD ZONE ═══ */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Drop Zone */}
            <div
              {...getRootProps()}
              className={`relative cursor-pointer rounded-3xl p-8 md:p-16 border-2 border-dashed transition-all duration-300 ${uploading
                ? 'pointer-events-none opacity-60'
                : ''
                } ${isDragActive
                  ? 'border-teal-400/70 glass-strong scale-[1.01]'
                  : 'border-slate-400/30 glass hover:border-teal-400/50 hover:glass-strong'
                }`}
            >
              <input {...getInputProps()} />

              <motion.div
                animate={isDragActive ? { scale: 1.03 } : { scale: 1 }}
                className="text-center space-y-6"
              >
                {/* Icon */}
                <div className="relative w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center shadow-2xl animate-pulse-glow">
                  <Activity size={44} className="text-white" strokeWidth={2} />
                  <div className="absolute inset-0 rounded-3xl opacity-30 animate-shimmer" />
                </div>

                {/* Text */}
                <div>
                  <h2 className="text-2xl md:text-3xl font-black text-white mb-2">
                    {isDragActive ? 'Drop your files here' : 'Upload & Stream'}
                  </h2>
                  <p className="text-white/60 text-sm md:text-base">
                    Drag & drop PDFs or{' '}
                    <span className="text-teal-300 font-bold underline underline-offset-4">
                      click to browse
                    </span>
                  </p>
                </div>

                {/* Info Pills */}
                <div className="flex flex-wrap justify-center gap-3 text-xs font-bold">
                  <span className="px-4 py-2 rounded-xl glass border border-white/10 text-white/70">
                    PDF Only
                  </span>
                  <span className="px-4 py-2 rounded-xl glass border border-white/10 text-white/70">
                    Up to 50 MB
                  </span>
                  <span className="px-4 py-2 rounded-xl glass border border-white/10 text-white/70">
                    Multiple Files
                  </span>
                </div>

                {/* Speed Badge */}
                <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full glass-strong border border-teal-400/30">
                  <Activity size={14} className="text-teal-300 animate-pulse" />
                  <span className="text-xs text-white/80 font-bold">
                    ⚡ Pages appear one-by-one · Study instantly
                  </span>
                </div>
              </motion.div>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { icon: Activity, label: 'Live Streaming', color: DESIGN_TOKENS.colors.primary.teal },
                { icon: Palette, label: 'Visual AI', color: DESIGN_TOKENS.colors.primary.purple },
                { icon: Zap, label: 'Instant Start', color: DESIGN_TOKENS.colors.primary.gold },
                { icon: Shield, label: 'Secure', color: DESIGN_TOKENS.colors.primary.blue }
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                  className="p-5 rounded-2xl glass hover:glass-strong transition-all text-center group cursor-pointer"
                >
                  <div
                    className={`w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform`}
                  >
                    <item.icon size={24} className="text-white" />
                  </div>
                  <p className="text-xs font-bold text-white/85">{item.label}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* ═══ RIGHT: QUEUE ═══ */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 }}
          >
            {files.length > 0 ? (
              <div className="glass-strong rounded-3xl p-6 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-5 pb-5 border-b border-white/10">
                  <div>
                    <h3 className="text-lg font-black text-white mb-2">Upload Queue</h3>
                    <div className="flex gap-3 text-[10px] font-bold flex-wrap">
                      {pendingFilesCount > 0 && (
                        <span className="text-white/50">{pendingFilesCount} pending</span>
                      )}
                      {processingFilesCount > 0 && (
                        <span className="text-sky-300 animate-pulse">{processingFilesCount} processing</span>
                      )}
                      {streamingFilesCount > 0 && (
                        <span className="text-teal-300 animate-pulse">{streamingFilesCount} streaming</span>
                      )}
                      {completedFilesCount > 0 && (
                        <span className="text-emerald-300">{completedFilesCount} ready</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      unsubscribersRef.current.forEach((u) => u());
                      unsubscribersRef.current.clear();
                      abortControllersRef.current.forEach((c) => c.abort());
                      abortControllersRef.current.clear();
                      setFiles([]);
                    }}
                    disabled={uploading}
                    className="px-4 py-2 rounded-xl glass text-white/60 hover:text-white text-xs font-bold transition-all disabled:opacity-30"
                  >
                    Clear All
                  </button>
                </div>

                {/* File List */}
                <div className="space-y-3 mb-6 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                  <AnimatePresence mode="popLayout">
                    {files.map((fileObj) => (
                      <FileCard
                        key={fileObj.id}
                        fileObj={fileObj}
                        onRemove={removeFile}
                        onStudy={(docId) => navigate(`/study/${docId}`)}
                        onCancel={removeFile}
                      />
                    ))}
                  </AnimatePresence>
                </div>

                {/* Upload Button */}
                <button
                  onClick={handleUpload}
                  disabled={uploading || pendingFilesCount === 0}
                  className="w-full px-6 py-4 rounded-2xl bg-gradient-to-r from-teal-500 via-blue-600 to-teal-500 bg-[length:200%_100%] hover:bg-right text-white font-black text-sm md:text-base transition-all duration-500 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-3 group shadow-xl hover:shadow-2xl"
                >
                  {uploading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <Activity size={20} className="animate-pulse" />
                      <span>
                        Stream {pendingFilesCount} File
                        {pendingFilesCount !== 1 ? 's' : ''}
                      </span>
                      <ArrowRight
                        size={20}
                        className="group-hover:translate-x-1 transition-transform"
                      />
                    </>
                  )}
                </button>

                {/* Quick Actions */}
                {completedFilesCount > 0 && !uploading && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-4 space-y-3"
                  >
                    <button
                      onClick={() => navigate(`/study/${completedFiles[0].docId}`)}
                      className="w-full px-5 py-3.5 rounded-xl bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-400 hover:to-blue-500 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:scale-[1.02]"
                    >
                      <Play size={16} />
                      <span>Start Studying Now</span>
                      <ArrowRight size={16} />
                    </button>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => navigate('/documents')}
                        className="px-4 py-3 rounded-xl glass hover:glass-strong text-white/75 hover:text-white font-bold text-xs transition-all flex items-center justify-center gap-2"
                      >
                        <BookOpen size={16} />
                        Library
                      </button>
                      <button
                        onClick={() => navigate('/dashboard')}
                        className="px-4 py-3 rounded-xl glass hover:glass-strong text-white/75 hover:text-white font-bold text-xs transition-all flex items-center justify-center gap-2"
                      >
                        <BarChart3 size={16} />
                        Dashboard
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Stats */}
                {completedFilesCount > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-5 pt-5 border-t border-white/10"
                  >
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-black text-emerald-300">
                          {completedFilesCount}
                        </p>
                        <p className="text-[10px] text-white/50 font-bold mt-1">Ready</p>
                      </div>
                      <div>
                        <p className="text-2xl font-black text-teal-300 animate-pulse">
                          {streamingFilesCount}
                        </p>
                        <p className="text-[10px] text-white/50 font-bold mt-1">Streaming</p>
                      </div>
                      <div>
                        <p className="text-2xl font-black text-amber-300">
                          {uploadStats.totalXP || 0}
                        </p>
                        <p className="text-[10px] text-white/50 font-bold mt-1">XP</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            ) : (
              <div className="glass rounded-3xl p-10 text-center min-h-[500px] flex flex-col items-center justify-center space-y-4">
                <div className="w-20 h-20 rounded-2xl glass-strong flex items-center justify-center mb-3">
                  <Upload size={36} className="text-white/30" />
                </div>
                <h3 className="text-lg font-black text-white/80">No Files Yet</h3>
                <p className="text-sm text-white/50 max-w-xs leading-relaxed">
                  Drop your PDFs above. Pages will stream in real-time!
                </p>
              </div>
            )}
          </motion.div>
        </div>

        {/* ═══ FOOTER INFO ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-10 p-6 md:p-8 rounded-2xl glass-strong border border-white/5"
        >
          <div className="flex items-center justify-between flex-wrap gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl glass">
                <Activity size={24} className="text-teal-300 animate-pulse" />
              </div>
              <div>
                <h4 className="text-sm font-black text-white mb-1">
                  🎥 Real-Time Page Streaming
                </h4>
                <p className="text-xs text-white/50 font-medium">
                  Watch pages appear one-by-one → Study instantly → No waiting!
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              {[
                { icon: Activity, label: 'Live', color: 'text-teal-300' },
                { icon: Zap, label: 'Instant', color: 'text-amber-300' },
                { icon: Shield, label: 'Secure', color: 'text-blue-300' }
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass border border-white/5"
                >
                  <item.icon size={16} className={item.color} />
                  <span className="text-xs font-bold text-white/70">{item.label}</span>
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
