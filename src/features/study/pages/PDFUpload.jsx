// src/pages/PDFUpload.jsx - STANDARD UPLOAD
import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, X, CheckCircle2, AlertCircle, Zap, Shield, Cloud, Award, BookOpen, Play, Sparkles } from 'lucide-react';
import { useAuth } from '@auth/contexts/AuthContext';
import { uploadDocument } from '@study/services/documentService';
import { awardDailyXP, DAILY_ACTIONS, XP_REWARDS } from '@gamification/services/gamificationService';
import toast from 'react-hot-toast';

// Premium Toast Component
const CustomToast = ({ message, type, icon: Icon }) => (
  <div className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl backdrop-blur-2xl border ${type === 'success'
    ? 'bg-white/90 border-gray-300'
    : type === 'error'
      ? 'bg-red-50/90 border-red-300'
      : 'bg-white/90 border-gray-300'
    }`}>
    <div className={`p-2 rounded-xl ${type === 'success' ? 'bg-gray-100' : type === 'error' ? 'bg-red-100' : 'bg-gray-100'
      }`}>
      <Icon size={18} className={`${type === 'success' ? 'text-gray-700' : type === 'error' ? 'text-red-600' : 'text-gray-600'
        }`} />
    </div>
    <p className={`text-sm font-semibold ${type === 'success' ? 'text-gray-900' : type === 'error' ? 'text-red-900' : 'text-gray-800'
      }`}>{message}</p>
  </div>
);

const PDFUpload = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [xpEarnedToday, setXpEarnedToday] = useState(false);

  const showToast = useCallback((message, type = 'default', icon = Sparkles) => {
    toast.custom(() => <CustomToast message={message} type={type} icon={icon} />, {
      duration: 3000,
      position: 'top-center',
    });
  }, []);

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

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    if (rejectedFiles.length > 0) {
      rejectedFiles.forEach(rejection => {
        const errors = rejection.errors.map(e => e.message).join(', ');
        showToast(`${rejection.file.name}: ${errors}`, 'error', AlertCircle);
      });
    }
    const newFiles = acceptedFiles.map(file => ({
      file,
      id: Math.random().toString(36).substring(2, 11),
      status: 'pending',
      docId: null,
      error: null,
      subject: null
    }));
    setFiles(prev => [...prev, ...newFiles]);
  }, [showToast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxSize: 50 * 1024 * 1024,
    multiple: true
  });

  const removeFile = useCallback((fileId) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  }, []);

  const handleUpload = async () => {
    if (files.length === 0) {
      showToast('Please select at least one file', 'error', AlertCircle);
      return;
    }

    if (!user?.uid) {
      showToast('Please log in to upload files', 'error', AlertCircle);
      return;
    }

    setUploading(true);
    let uploadCount = 0;
    let xpAwarded = false;

    for (const fileObj of files) {
      if (fileObj.status !== 'pending') continue;

      try {
        setFiles(prev => prev.map(f =>
          f.id === fileObj.id ? { ...f, status: 'uploading' } : f
        ));

        // Use standard uploadDocument service
        const result = await uploadDocument(fileObj.file, user.uid);

        uploadCount++;

        setFiles(prev => prev.map(f =>
          f.id === fileObj.id ? {
            ...f,
            status: 'completed',
            docId: result.docId,
            subject: result.subject || 'General Studies'
          } : f
        ));

        // Award XP (once per day)
        if (!xpAwarded && !xpEarnedToday) {
          try {
            const xpResult = await awardDailyXP(
              user.uid,
              DAILY_ACTIONS.UPLOAD_DOCUMENT,
              'Uploaded PDF Document'
            );

            if (xpResult.success) {
              xpAwarded = true;
              setXpEarnedToday(true);
              showToast(`+${xpResult.xpGained} XP earned!`, 'success', Zap);
            }
          } catch (error) {
            console.error('XP award error:', error);
          }
        }

      } catch (error) {
        console.error('❌ Upload error:', error);
        setFiles(prev => prev.map(f =>
          f.id === fileObj.id ? { ...f, status: 'error', error: error.message } : f
        ));
        showToast(`Failed: ${error.message}`, 'error', AlertCircle);
      }
    }

    setUploading(false);

    if (uploadCount > 0) {
      showToast(`${uploadCount} file(s) uploaded successfully!`, 'success', CheckCircle2);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="text-gray-700" size={16} />;
      case 'error':
        return <AlertCircle className="text-red-600" size={16} />;
      case 'uploading':
        return <div className="w-4 h-4 border-2 border-gray-700 border-t-transparent rounded-full animate-spin"></div>;
      default:
        return <FileText className="text-gray-500" size={16} />;
    }
  };

  const pendingFilesCount = files.filter(f => f.status === 'pending').length;
  const completedFilesCount = files.filter(f => f.status === 'completed').length;
  const completedFiles = files.filter(f => f.status === 'completed');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 relative overflow-hidden">

      {/* Subtle glassmorphic background */}
      <div className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-br from-gray-200/30 to-transparent rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-gradient-to-br from-gray-300/20 to-transparent rounded-full blur-3xl" />

      {/* Main Container */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-10 md:py-12">

        {/* Premium Header */}
        <div className="text-center mb-12 space-y-4">
          {/* Trust Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-2xl border border-gray-200 shadow-lg">
            <Shield size={14} className="text-gray-700" />
            <span className="text-[10px] text-gray-700 font-bold tracking-[0.15em] uppercase">AI-Powered • Secure</span>
          </div>

          {/* Main Heading */}
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900">
              Upload Documents
            </h1>
            <p className="text-gray-600 text-sm md:text-base max-w-xl mx-auto leading-relaxed font-medium">
              AI automatically categorizes your PDFs by subject
            </p>
          </div>

          {/* XP Banner */}
          {!xpEarnedToday && (
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-gray-100 to-white backdrop-blur-2xl border border-gray-300 shadow-lg">
              <Zap size={16} className="text-gray-700" fill="currentColor" />
              <span className="text-sm font-bold text-gray-900">
                Earn +{XP_REWARDS.UPLOAD_DOCUMENT} XP for your first upload today
              </span>
            </div>
          )}
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-12 gap-6 lg:gap-8 items-start">

          {/* LEFT: Upload Zone */}
          <div className="lg:col-span-7">
            <div
              {...getRootProps()}
              className={`relative cursor-pointer group rounded-3xl p-10 md:p-12
                border-2 border-dashed transition-all duration-500 backdrop-blur-2xl
                ${isDragActive
                  ? 'border-gray-400 bg-white/90 shadow-2xl'
                  : 'border-gray-300 bg-white/70 hover:bg-white/90 hover:border-gray-400 hover:shadow-xl'
                }`}
            >
              <input {...getInputProps()} />

              <div className="w-24 h-24 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-gray-700 via-gray-600 to-gray-800 flex items-center justify-center shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/5 to-white/10"></div>
                <Cloud size={48} className="text-white relative z-10" strokeWidth={1.5} />
              </div>

              <div className="text-center space-y-3">
                <h2 className="text-2xl md:text-3xl font-black text-gray-900">
                  {isDragActive ? 'Drop Your Files' : 'Upload Documents'}
                </h2>
                <p className="text-gray-600 text-sm md:text-base font-medium">
                  Drag & drop PDFs here, or{' '}
                  <span className="text-gray-900 font-bold cursor-pointer hover:text-gray-700 transition-colors">
                    browse files
                  </span>
                </p>
                <div className="flex items-center justify-center gap-2 text-xs text-gray-500 font-medium">
                  <span>PDF up to 50MB</span>
                  <span className="text-gray-400">•</span>
                  <span>Multiple files</span>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-gray-100 to-white border border-gray-300 backdrop-blur-2xl mx-auto w-fit shadow-md">
                <Sparkles size={14} className="text-gray-700" />
                <span className="text-xs text-gray-800 font-bold">AI Auto-Categorization</span>
              </div>
            </div>

            {/* Feature Stats */}
            <div className="grid grid-cols-4 gap-3 mt-6">
              {[
                { icon: Award, label: '99%', sublabel: 'Accurate' },
                { icon: Zap, label: '<3s', sublabel: 'Fast' },
                { icon: Shield, label: 'Secure', sublabel: 'Enterprise' },
                { icon: Sparkles, label: 'AI', sublabel: 'Powered' },
              ].map((stat, i) => (
                <div
                  key={i}
                  className="p-4 rounded-2xl bg-white/70 backdrop-blur-2xl border border-gray-200 hover:bg-white/90 hover:border-gray-300 hover:shadow-lg transition-all text-center"
                >
                  <stat.icon size={20} className="text-gray-700 mx-auto mb-2" />
                  <p className="text-sm font-bold text-gray-900 mb-0.5">{stat.label}</p>
                  <p className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold">{stat.sublabel}</p>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: File Queue */}
          <div className="lg:col-span-5 flex flex-col h-full">
            {files.length > 0 ? (
              <div className="flex flex-col h-full rounded-3xl bg-white/80 backdrop-blur-2xl border border-gray-200 p-6 shadow-xl">
                <div className="flex items-center justify-between mb-5 pb-5 border-b border-gray-200">
                  <div>
                    <h3 className="text-xl font-black text-gray-900 mb-0.5">Upload Queue</h3>
                    <p className="text-xs text-gray-600 font-semibold">
                      {files.length} file{files.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => setFiles([])}
                    className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 hover:text-gray-900 transition-all text-xs font-bold"
                  >
                    Clear
                  </button>
                </div>

                <div className="flex-1 space-y-2.5 overflow-y-auto pr-2 mb-5 custom-scrollbar">
                  {files.map((fileObj) => (
                    <div
                      key={fileObj.id}
                      className="group relative rounded-xl p-3.5 bg-gradient-to-br from-white/90 to-gray-50/90 border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all"
                    >
                      {fileObj.status === 'uploading' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-200 rounded-b-xl overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-gray-600 via-gray-700 to-gray-600 w-full animate-pulse"></div>
                        </div>
                      )}

                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-gray-100 border border-gray-300 flex items-center justify-center">
                          {getStatusIcon(fileObj.status)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 text-sm truncate mb-0.5">{fileObj.file.name}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] text-gray-600 font-semibold">
                              {(fileObj.file.size / (1024 * 1024)).toFixed(2)} MB
                            </span>

                            {fileObj.subject && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-gray-200 text-gray-800 border border-gray-300">
                                📚 {fileObj.subject}
                              </span>
                            )}

                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${fileObj.status === 'completed' ? 'bg-gray-200 text-gray-900 border border-gray-300' : ''
                              }${fileObj.status === 'error' ? 'bg-red-100 text-red-700 border border-red-300' : ''
                              }${fileObj.status === 'uploading' ? 'bg-gray-100 text-gray-700 border border-gray-300' : ''
                              }${fileObj.status === 'pending' ? 'bg-gray-50 text-gray-500 border border-gray-200' : ''
                              }`}>
                              {fileObj.status === 'uploading' && '⚡ Processing'}
                              {fileObj.status === 'completed' && '✓ Uploaded'}
                              {fileObj.status === 'error' && '✕ Failed'}
                              {fileObj.status === 'pending' && '◦ Pending'}
                            </span>
                          </div>
                        </div>

                        {fileObj.status === 'pending' && (
                          <button
                            onClick={() => removeFile(fileObj.id)}
                            className="p-1.5 rounded-lg hover:bg-red-100 text-red-600 hover:text-red-700 transition-all opacity-0 group-hover:opacity-100"
                          >
                            <X size={16} />
                          </button>
                        )}

                        {fileObj.status === 'completed' && fileObj.docId && (
                          <button
                            onClick={() => navigate(`/study/${fileObj.docId}`)}
                            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-gray-800 to-gray-700 hover:from-gray-900 hover:to-gray-800 text-white text-xs font-bold shadow-lg transition-all flex items-center gap-1"
                          >
                            <Play size={12} />
                            Study
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <button
                    onClick={handleUpload}
                    disabled={uploading || pendingFilesCount === 0}
                    className="w-full px-6 py-4 rounded-2xl bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 hover:from-gray-900 hover:via-gray-800 hover:to-gray-900 text-white font-bold text-base shadow-2xl transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2.5"
                  >
                    {uploading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Processing Files...</span>
                      </>
                    ) : (
                      <>
                        <Upload size={18} />
                        <span>Upload {pendingFilesCount} File{pendingFilesCount !== 1 ? 's' : ''}</span>
                      </>
                    )}
                  </button>

                  {/* Quick Actions after upload */}
                  {completedFilesCount > 0 && !uploading && (
                    <div className="space-y-2">
                      <button
                        onClick={() => navigate(`/study/${completedFiles[0].docId}`)}
                        className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-gray-800 to-gray-700 hover:from-gray-900 hover:to-gray-800 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg"
                      >
                        <Play size={16} />
                        <span>Start Study Session</span>
                      </button>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => navigate('/documents')}
                          className="px-4 py-3 rounded-xl bg-white/80 hover:bg-white border border-gray-300 hover:border-gray-400 text-gray-700 hover:text-gray-900 font-bold text-sm transition-all flex items-center justify-center gap-2"
                        >
                          <BookOpen size={16} />
                          <span>Library</span>
                        </button>
                        <button
                          onClick={() => navigate('/quiz')}
                          className="px-4 py-3 rounded-xl bg-white/80 hover:bg-white border border-gray-300 hover:border-gray-400 text-gray-700 hover:text-gray-900 font-bold text-sm transition-all flex items-center justify-center gap-2"
                        >
                          <Sparkles size={16} />
                          <span>Quiz</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-gray-300 bg-white/70 backdrop-blur-2xl p-10 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 border border-gray-300 flex items-center justify-center mb-5 shadow-lg">
                  <Upload size={28} className="text-gray-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1.5">No Files Selected</h3>
                <p className="text-xs text-gray-600 leading-relaxed font-medium">
                  Upload PDFs • AI categorizes automatically
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(229, 231, 235, 0.5);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(107, 114, 128, 0.5);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(107, 114, 128, 0.7);
        }
      `}</style>
    </div>
  );
};

export default PDFUpload;
