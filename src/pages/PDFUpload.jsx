import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, X, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '@contexts/AuthContext';
import { uploadDocument } from '@services/documentService';
import * as pdfjsLib from 'pdfjs-dist';
import toast from 'react-hot-toast';

// Setup PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;

const PDFUpload = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  // Extract text from PDF
  const extractTextFromPDF = async (file) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n\n';
      }
      
      return {
        text: fullText,
        numPages: pdf.numPages
      };
    } catch (error) {
      console.error('PDF text extraction error:', error);
      return {
        text: 'Text extraction failed. You can still view the PDF.',
        numPages: 0
      };
    }
  };

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    if (rejectedFiles.length > 0) {
      rejectedFiles.forEach(rejection => {
        const errors = rejection.errors.map(e => e.message).join(', ');
        toast.error(`${rejection.file.name}: ${errors}`);
      });
    }

    const newFiles = acceptedFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      status: 'pending',
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
    let lastDocId = null;

    for (const fileObj of files) {
      if (fileObj.status !== 'pending') continue;

      try {
        // Update status to uploading
        setFiles(prev => prev.map(f => 
          f.id === fileObj.id ? { ...f, status: 'uploading' } : f
        ));

        // Extract text from PDF
        toast.loading(`Extracting text from ${fileObj.file.name}...`, { id: `extract-${fileObj.id}` });
        const { text: extractedText, numPages } = await extractTextFromPDF(fileObj.file);
        toast.dismiss(`extract-${fileObj.id}`);

        // Upload file with extracted text
        const docId = await uploadDocument(fileObj.file, user.uid, {
          title: fileObj.file.name.replace('.pdf', ''),
          extractedText, // ← Save extracted text to Firestore
          pages: numPages
        });

        lastDocId = docId; // Store last uploaded doc ID

        // Update to completed
        setFiles(prev => prev.map(f => 
          f.id === fileObj.id ? { ...f, status: 'completed', docId } : f
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

    // AUTO-REDIRECT TO STUDY SESSION for last uploaded file
    if (lastDocId) {
      toast.success('🎓 Opening study session...', {
        duration: 2000,
        style: {
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: '#fff',
          fontWeight: 'bold',
          borderRadius: '12px',
          padding: '16px 24px',
        },
      });
      
      setTimeout(() => {
        navigate(`/study/${lastDocId}`);
      }, 1500);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="text-green-500" size={20} />;
      case 'error':
        return <AlertCircle className="text-red-500" size={20} />;
      case 'uploading':
      case 'processing':
        return <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>;
      default:
        return <FileText className="text-gray-400" size={20} />;
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
    <div className="max-w-4xl mx-auto space-y-8 p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-black mb-2">
          Upload <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Documents</span>
        </h1>
        <p className="text-gray-600">
          Upload your PDFs and let AI transform them into interactive learning materials
        </p>
      </motion.div>

      {/* Drop Zone */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
      >
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
            isDragActive
              ? 'border-purple-500 bg-purple-50'
              : 'border-gray-300 hover:border-purple-400 hover:bg-gray-50'
          }`}
        >
          <input {...getInputProps()} />
          
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center">
              <Upload size={32} className="text-white" />
            </div>

            {isDragActive ? (
              <div>
                <p className="text-xl font-semibold mb-2 text-black">Drop your PDFs here</p>
                <p className="text-gray-600">We'll process them instantly</p>
              </div>
            ) : (
              <div>
                <p className="text-xl font-semibold mb-2 text-black">
                  Drag & drop PDFs here, or click to browse
                </p>
                <p className="text-gray-600">
                  Supports: PDF files up to 50MB each
                </p>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm text-purple-600">
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
          className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-black">
              Selected Files ({files.length})
            </h2>
            <button
              onClick={() => setFiles([])}
              className="text-sm text-gray-600 hover:text-black transition-colors"
            >
              Clear All
            </button>
          </div>

          <div className="space-y-3">
            {files.map((fileObj) => (
              <div
                key={fileObj.id}
                className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all"
              >
                <div className="flex-shrink-0">
                  {getStatusIcon(fileObj.status)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate text-black">{fileObj.file.name}</div>
                  <div className="text-sm text-gray-600">
                    {(fileObj.file.size / (1024 * 1024)).toFixed(2)} MB • {getStatusText(fileObj.status)}
                  </div>
                  {fileObj.error && (
                    <div className="text-sm text-red-600 mt-1">{fileObj.error}</div>
                  )}
                </div>

                {fileObj.status === 'pending' && (
                  <button
                    onClick={() => removeFile(fileObj.id)}
                    className="p-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                  >
                    <X size={18} />
                  </button>
                )}

                {fileObj.status === 'completed' && fileObj.docId && (
                  <button
                    onClick={() => navigate(`/study/${fileObj.docId}`)}
                    className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 transition-colors text-sm font-medium text-white"
                  >
                    Study
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Upload Button */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={handleUpload}
              disabled={uploading || files.every(f => f.status !== 'pending')}
              className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
            description: 'Extract all text for AI-powered studying'
          },
          {
            icon: CheckCircle2,
            title: 'Instant Study Session',
            description: 'Start studying immediately after upload'
          }
        ].map((feature, index) => (
          <div key={index} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center mx-auto mb-4">
              <feature.icon size={24} className="text-white" />
            </div>
            <h3 className="font-semibold mb-2 text-black">{feature.title}</h3>
            <p className="text-sm text-gray-600">{feature.description}</p>
          </div>
        ))}
      </motion.div>
    </div>
  );
};

export default PDFUpload;
