// src/pages/PDFUpload.jsx - FIXED VERSION (Navigates to study session)
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, X, Sparkles, CheckCircle2, AlertCircle, Zap, Shield, Cloud, TrendingUp, Award } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { uploadDocument } from '@/services/documentService';
import { awardDailyXP, updateMission, DAILY_ACTIONS, XP_REWARDS } from '@/services/gamificationService';
import toast from 'react-hot-toast';

// Premium Glassmorphic Toast
const CustomToast = ({ message, type, icon: Icon }) => (
  <div className={`
    flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl backdrop-blur-2xl border
    ${type === 'success' 
      ? 'bg-white/5 border-blue-400/40' 
      : type === 'error'
      ? 'bg-white/5 border-red-400/40'
      : 'bg-white/5 border-blue-300/40'
    }
  `}>
    <div className={`p-2 rounded-xl backdrop-blur-xl ${type === 'success' ? 'bg-blue-500/20' : type === 'error' ? 'bg-red-500/20' : 'bg-blue-400/20'}`}>
      <Icon size={18} className={`${type === 'success' ? 'text-blue-400' : type === 'error' ? 'text-red-400' : 'text-blue-300'}`} />
    </div>
    <p className="text-white text-sm font-medium tracking-wide">{message}</p>
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
      error: null
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
    let lastDocId = null;
    let uploadCount = 0;
    let xpAwarded = false;

    for (const fileObj of files) {
      if (fileObj.status !== 'pending') continue;
      
      try {
        // Update status to uploading
        setFiles(prev => prev.map(f => 
          f.id === fileObj.id ? { ...f, status: 'uploading' } : f
        ));
        
        // ✅ uploadDocument handles EVERYTHING:
        // - Text extraction
        // - AI subject detection  
        // - Firebase Storage upload
        // - Firestore metadata save
        // - User stats update
        const docId = await uploadDocument(fileObj.file, user.uid, {
          title: fileObj.file.name.replace('.pdf', '')
        });
        
        lastDocId = docId;
        uploadCount++;
        
        // Mark as completed
        setFiles(prev => prev.map(f => 
          f.id === fileObj.id ? { ...f, status: 'completed', docId } : f
        ));

        // ✅ AWARD XP ONLY ONCE PER DAY
        if (!xpAwarded && !xpEarnedToday) {
          try {
            const result = await awardDailyXP(
              user.uid, 
              DAILY_ACTIONS.UPLOAD_DOCUMENT, 
              'Uploaded PDF Document'
            );
            
            if (result.success) {
              xpAwarded = true;
              setXpEarnedToday(true);
              showToast(`🎉 +${result.xpGained} XP for uploading!`, 'success', Zap);
              await updateMission(user.uid, 'daily_upload');
            } else if (result.alreadyEarned) {
              setXpEarnedToday(true);
            }
          } catch (error) {
            console.error('XP award error:', error);
          }
        }
        
      } catch (error) {
        console.error('Upload error:', error);
        setFiles(prev => prev.map(f => 
          f.id === fileObj.id ? { ...f, status: 'error', error: error.message } : f
        ));
        showToast(`Failed: ${error.message}`, 'error', AlertCircle);
      }
    }
    
    setUploading(false);
    
    if (uploadCount > 0) {
      const xpMessage = xpAwarded 
        ? `🚀 ${uploadCount} file(s) uploaded! +${XP_REWARDS.UPLOAD_DOCUMENT} XP earned!`
        : xpEarnedToday
        ? `🚀 ${uploadCount} file(s) uploaded!`
        : `🚀 ${uploadCount} file(s) uploaded!`;
      
      showToast(xpMessage, 'success', Award);
      
      // ✅ FIXED: Navigate directly to study session
      if (lastDocId) {
        setTimeout(() => { 
          navigate(`/study/${lastDocId}`);
        }, 1500);
      }
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="text-blue-400" size={16} />;
      case 'error':
        return <AlertCircle className="text-red-400" size={16} />;
      case 'uploading':
        return <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>;
      default:
        return <FileText className="text-gray-500" size={16} />;
    }
  };

  const pendingFilesCount = files.filter(f => f.status === 'pending').length;

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Subtle Background Gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gray-800/10 rounded-full blur-3xl"></div>
      
      {/* Main Container */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-10 md:py-12">
        
        {/* Premium Header Section */}
        <div className="text-center mb-12 space-y-4">
          {/* Trust Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-blue-500/30 backdrop-blur-2xl">
            <Shield size={14} className="text-blue-400" />
            <span className="text-[10px] text-gray-300 font-bold tracking-[0.15em] uppercase">AI-Powered • Auto-Categorized</span>
          </div>
          
          {/* Main Heading */}
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-black tracking-tight">
              <span className="text-white">Transform Your</span>
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-blue-300 to-gray-400 bg-clip-text text-transparent">Learning Journey</span>
            </h1>
            <p className="text-gray-400 text-sm md:text-base max-w-xl mx-auto leading-relaxed">
              Upload PDFs • AI detects subject • Auto-organizes • Instant study sessions
            </p>
          </div>

          {/* XP Earning Banner */}
          <div className={`inline-flex items-center gap-2 px-6 py-3 rounded-full border backdrop-blur-2xl ${
            xpEarnedToday 
              ? 'bg-gradient-to-r from-gray-500/10 to-gray-600/10 border-gray-500/30' 
              : 'bg-gradient-to-r from-green-500/10 to-blue-500/10 border-green-500/30'
          }`}>
            <Zap size={16} className={xpEarnedToday ? 'text-gray-400' : 'text-green-400'} fill="currentColor" />
            <span className={`text-sm font-bold ${xpEarnedToday ? 'text-gray-400' : 'text-white'}`}>
              {xpEarnedToday 
                ? `✓ Daily XP earned (+${XP_REWARDS.UPLOAD_DOCUMENT} XP)` 
                : `Earn +${XP_REWARDS.UPLOAD_DOCUMENT} XP today!`
              }
            </span>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          
          {/* LEFT: Upload Zone */}
          <div className="lg:col-span-7">
            <div
              {...getRootProps()}
              className={`
                relative cursor-pointer group
                rounded-3xl p-10 md:p-12
                border-2 border-dashed transition-all duration-500
                backdrop-blur-3xl
                ${isDragActive
                  ? 'border-blue-400 bg-white/10 shadow-2xl shadow-blue-500/20'
                  : 'border-gray-700/60 bg-white/5 hover:bg-white/8 hover:border-blue-500/40 hover:shadow-xl hover:shadow-blue-500/10'
                }
              `}
            >
              <input {...getInputProps()} />
              
              <div className="w-24 h-24 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-blue-500/90 via-blue-600/90 to-blue-700/90 backdrop-blur-xl flex items-center justify-center shadow-2xl shadow-blue-500/30 relative overflow-hidden border border-white/10">
                <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/5 to-white/10"></div>
                <Cloud size={48} className="text-white relative z-10" strokeWidth={1.5} />
              </div>

              <div className="text-center space-y-3">
                <h2 className="text-2xl md:text-3xl font-black text-white">
                  {isDragActive ? 'Drop Your Files' : 'Upload Documents'}
                </h2>
                <p className="text-gray-400 text-sm md:text-base">
                  Drag & drop PDFs here, or{' '}
                  <span className="text-blue-400 font-semibold cursor-pointer hover:text-blue-300 transition-colors">
                    browse files
                  </span>
                </p>
                <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                  <span>PDF up to 50MB</span>
                  <span className="text-gray-700">•</span>
                  <span>Multiple files</span>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-white/5 border border-blue-500/30 backdrop-blur-2xl mx-auto w-fit">
                <Sparkles size={14} className="text-blue-400" />
                <span className="text-xs text-gray-300 font-semibold">AI Auto-Categorization</span>
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
                  className="p-4 rounded-2xl bg-white/5 border border-gray-800/60 backdrop-blur-2xl hover:bg-white/8 hover:border-blue-500/30 transition-all text-center"
                >
                  <stat.icon size={20} className="text-blue-400 mx-auto mb-2" />
                  <p className="text-sm font-bold text-white mb-0.5">{stat.label}</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">{stat.sublabel}</p>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: File Queue */}
          <div className="lg:col-span-5 flex flex-col h-full">
            {files.length > 0 ? (
              <div className="flex flex-col h-full rounded-3xl bg-white/5 border border-gray-800/60 backdrop-blur-3xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-5 pb-5 border-b border-white/10">
                  <div>
                    <h3 className="text-xl font-black text-white mb-0.5">Upload Queue</h3>
                    <p className="text-xs text-gray-500 font-medium">
                      {files.length} file{files.length !== 1 ? 's' : ''} 
                      {!xpEarnedToday && ` • +${XP_REWARDS.UPLOAD_DOCUMENT} XP available`}
                    </p>
                  </div>
                  <button
                    onClick={() => setFiles([])}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-gray-700/60 text-gray-400 hover:text-white backdrop-blur-xl transition-all text-xs font-semibold"
                  >
                    Clear
                  </button>
                </div>

                <div className="flex-1 space-y-2.5 overflow-y-auto pr-2 mb-5 custom-scrollbar">
                  {files.map((fileObj) => (
                    <div
                      key={fileObj.id}
                      className="group relative rounded-xl p-3.5 bg-white/5 border border-white/10 backdrop-blur-2xl hover:bg-white/8 hover:border-blue-500/40 transition-all"
                    >
                      {fileObj.status === 'uploading' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-800 rounded-b-xl overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-blue-500 via-blue-400 to-blue-600 w-full animate-pulse"></div>
                        </div>
                      )}

                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-white/5 border border-white/10 backdrop-blur-xl flex items-center justify-center">
                          {getStatusIcon(fileObj.status)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white text-sm truncate mb-0.5">{fileObj.file.name}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] text-gray-500 font-medium">
                              {(fileObj.file.size / (1024 * 1024)).toFixed(2)} MB
                            </span>
                            
                            <span className={`
                              text-[10px] font-bold px-2 py-0.5 rounded-lg backdrop-blur-xl
                              ${fileObj.status === 'completed' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' : ''}
                              ${fileObj.status === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/40' : ''}
                              ${fileObj.status === 'uploading' ? 'bg-blue-500/20 text-blue-300 border border-blue-400/40' : ''}
                              ${fileObj.status === 'pending' ? 'bg-white/5 text-gray-400 border border-gray-600/40' : ''}
                            `}>
                              {fileObj.status === 'uploading' && '⚡ AI Processing'}
                              {fileObj.status === 'completed' && '✓ Done'}
                              {fileObj.status === 'error' && '✕ Failed'}
                              {fileObj.status === 'pending' && '◦ Pending'}
                            </span>
                          </div>
                        </div>

                        {fileObj.status === 'pending' && (
                          <button
                            onClick={() => removeFile(fileObj.id)}
                            className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400/70 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100"
                          >
                            <X size={16} />
                          </button>
                        )}

                        {fileObj.status === 'completed' && fileObj.docId && (
                          <button
                            onClick={() => navigate(`/study/${fileObj.docId}`)}
                            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-xs font-bold shadow-lg shadow-blue-500/30 backdrop-blur-xl transition-all"
                          >
                            Study
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleUpload}
                  disabled={uploading || pendingFilesCount === 0}
                  className="w-full px-6 py-4 rounded-2xl bg-gradient-to-r from-blue-500 via-blue-600 to-blue-500 hover:from-blue-600 hover:via-blue-700 hover:to-blue-600 text-white font-bold text-base shadow-2xl shadow-blue-500/40 backdrop-blur-xl border border-blue-400/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2.5"
                >
                  {uploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>AI Processing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      <span>
                        Upload {pendingFilesCount} File{pendingFilesCount !== 1 ? 's' : ''}
                        {!xpEarnedToday && ` (+${XP_REWARDS.UPLOAD_DOCUMENT} XP)`}
                      </span>
                      <TrendingUp size={18} />
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-gray-800/50 bg-white/5 backdrop-blur-3xl p-10 text-center">
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl flex items-center justify-center mb-5 shadow-lg">
                  <Upload size={28} className="text-gray-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-300 mb-1.5">No Files Selected</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Upload PDFs • AI auto-categorizes<br />by subject instantly
                </p>
                <div className={`mt-4 px-4 py-2 rounded-full border ${
                  xpEarnedToday 
                    ? 'bg-gray-500/10 border-gray-500/30' 
                    : 'bg-green-500/10 border-green-500/30'
                }`}>
                  <p className={`text-xs font-bold ${
                    xpEarnedToday ? 'text-gray-400' : 'text-green-400'
                  }`}>
                    {xpEarnedToday 
                      ? `✓ Daily XP earned (+${XP_REWARDS.UPLOAD_DOCUMENT} XP)`
                      : `Earn +${XP_REWARDS.UPLOAD_DOCUMENT} XP today!`
                    }
                  </p>
                </div>
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
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(59, 130, 246, 0.3);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(59, 130, 246, 0.5);
        }
      `}</style>
    </div>
  );
};

export default PDFUpload;
