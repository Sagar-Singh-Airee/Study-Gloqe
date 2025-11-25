import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, X, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '@contexts/AuthContext';
import { uploadDocument } from '@services/documentService';
import toast from 'react-hot-toast';

const PDFUpload = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    // Handle rejected files
    if (rejectedFiles.length > 0) {
      rejectedFiles.forEach(rejection => {
        const errors = rejection.errors.map(e => e.message).join(', ');
        toast.error(`${rejection.file.name}: ${errors}`);
      });
    }

    // Add accepted files
    const newFiles = acceptedFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      status: 'pending', // pending, uploading, processing, completed, error
      progress: 0,
      docId: null,
      error: null
    }));

    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    multiple: true
  });

  const removeFile = (fileId) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error('Please select at least one file');
      return;
    }

    setUploading(true);

    for (const fileObj of files) {
      if (fileObj.status !== 'pending') continue;

      try {
        // Update status
        setFiles(prev => prev.map(f => 
          f.id === fileObj.id ? { ...f, status: 'uploading' } : f
        ));

        // Upload file
        const docId = await uploadDocument(fileObj.file, user.uid, {
          title: fileObj.file.name.replace('.pdf', '')
        });

        // Update to processing
        setFiles(prev => prev.map(f => 
          f.id === fileObj.id ? { ...f, status: 'processing', docId } : f
        ));

        // Simulate processing (in real app, this would be triggered by Cloud Function)
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Update to completed
        setFiles(prev => prev.map(f => 
          f.id === fileObj.id ? { ...f, status: 'completed' } : f
        ));

        toast.success(`${fileObj.file.name} uploaded successfully!`);
      } catch (error) {
        console.error('Upload error:', error);
        setFiles(prev => prev.map(f => 
          f.id === fileObj.id ? { 
            ...f, 
            status: 'error', 
            error: error.message 
          } : f
        ));
        toast.error(`Failed to upload ${fileObj.file.name}`);
      }
    }

    setUploading(false);

    // Navigate to dashboard after all uploads
    const allCompleted = files.every(f => f.status === 'completed' || f.status === 'error');
    if (allCompleted) {
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="text-success" size={20} />;
      case 'error':
        return <AlertCircle className="text-error" size={20} />;
      case 'uploading':
      case 'processing':
        return <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>;
      default:
        return <FileText className="text-primary-400" size={20} />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'uploading':
        return 'Uploading...';
      case 'processing':
        return 'Processing with AI...';
      case 'completed':
        return 'Ready';
      case 'error':
        return 'Failed';
      default:
        return 'Pending';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-display font-bold mb-2">
          Upload <span className="gradient-text">Documents</span>
        </h1>
        <p className="text-primary-300">
          Upload your PDFs and let AI transform them into interactive learning materials
        </p>
      </motion.div>

      {/* Drop Zone */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="card"
      >
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
            isDragActive
              ? 'border-accent bg-accent/10'
              : 'border-white/20 hover:border-accent/50 hover:bg-white/5'
          }`}
        >
          <input {...getInputProps()} />
          
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-accent to-blue-600 flex items-center justify-center">
              <Upload size={32} />
            </div>

            {isDragActive ? (
              <div>
                <p className="text-xl font-semibold mb-2">Drop your PDFs here</p>
                <p className="text-primary-300">We'll process them instantly</p>
              </div>
            ) : (
              <div>
                <p className="text-xl font-semibold mb-2">
                  Drag & drop PDFs here, or click to browse
                </p>
                <p className="text-primary-300">
                  Supports: PDF files up to 50MB each
                </p>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm text-primary-400">
              <Sparkles size={16} />
              <span>AI will auto-detect subjects and generate quizzes</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* File List */}
      {files.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="card"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-display font-semibold">
              Selected Files ({files.length})
            </h2>
            <button
              onClick={() => setFiles([])}
              className="text-sm text-primary-400 hover:text-primary-200"
            >
              Clear All
            </button>
          </div>

          <div className="space-y-3">
            {files.map((fileObj) => (
              <div
                key={fileObj.id}
                className="flex items-center gap-4 p-4 rounded-xl glass-hover"
              >
                <div className="flex-shrink-0">
                  {getStatusIcon(fileObj.status)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{fileObj.file.name}</div>
                  <div className="text-sm text-primary-400">
                    {(fileObj.file.size / (1024 * 1024)).toFixed(2)} MB • {getStatusText(fileObj.status)}
                  </div>
                  {fileObj.error && (
                    <div className="text-sm text-error mt-1">{fileObj.error}</div>
                  )}
                </div>

                {fileObj.status === 'pending' && (
                  <button
                    onClick={() => removeFile(fileObj.id)}
                    className="p-2 rounded-lg hover:bg-error/10 text-error transition-colors"
                  >
                    <X size={18} />
                  </button>
                )}

                {fileObj.status === 'completed' && fileObj.docId && (
                  <button
                    onClick={() => navigate(`/reader/${fileObj.docId}`)}
                    className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-dark transition-colors text-sm font-medium"
                  >
                    Open
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Upload Button */}
          <div className="mt-6 pt-6 border-t border-white/10">
            <button
              onClick={handleUpload}
              disabled={uploading || files.every(f => f.status !== 'pending')}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  Upload & Process with AI
                </>
              )}
            </button>
          </div>
        </motion.div>
      )}

      {/* Features Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="grid md:grid-cols-3 gap-6"
      >
        {[
          {
            icon: Sparkles,
            title: 'Auto Subject Detection',
            description: 'AI automatically categorizes your documents'
          },
          {
            icon: FileText,
            title: 'Text Extraction',
            description: 'Extract all text, images, and tables'
          },
          {
            icon: CheckCircle2,
            title: 'Instant Quizzes',
            description: 'Generate MCQs and flashcards automatically'
          }
        ].map((feature, index) => (
          <div key={index} className="card text-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-accent to-blue-600 flex items-center justify-center mx-auto mb-4">
              <feature.icon size={24} />
            </div>
            <h3 className="font-semibold mb-2">{feature.title}</h3>
            <p className="text-sm text-primary-300">{feature.description}</p>
          </div>
        ))}
      </motion.div>
    </div>
  );
};

export default PDFUpload;