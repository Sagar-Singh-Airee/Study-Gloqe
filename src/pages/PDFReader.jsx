import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Sparkles,
  FileText,
  GitBranch,
  Download,
  Share2,
  BookOpen
} from 'lucide-react';
import { getDocument } from '@services/documentService';
import toast from 'react-hot-toast';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

const PDFReader = () => {
  const { docId } = useParams();
  const navigate = useNavigate();
  const [document, setDocument] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [showAITools, setShowAITools] = useState(false);
  const [aiTool, setAiTool] = useState(null); // 'summarize', 'notes', 'flowchart'
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    loadDocument();
  }, [docId]);

  const loadDocument = async () => {
    try {
      const doc = await getDocument(docId);
      setDocument(doc);
      setLoading(false);
    } catch (error) {
      console.error('Error loading document:', error);
      toast.error('Failed to load document');
      navigate('/dashboard');
    }
  };

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  const changePage = (offset) => {
    setPageNumber(prevPageNumber => {
      const newPage = prevPageNumber + offset;
      return Math.min(Math.max(1, newPage), numPages);
    });
  };

  const zoomIn = () => setScale(prev => Math.min(prev + 0.2, 2.0));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));

  const handleAITool = async (tool) => {
    setAiTool(tool);
    setShowAITools(true);
    setAiLoading(true);

    try {
      // Simulate AI processing (replace with actual API call)
      await new Promise(resolve => setTimeout(resolve, 2000));

      switch (tool) {
        case 'summarize':
          setAiResult({
            type: 'text',
            content: 'This document covers fundamental concepts in physics, including Newton\'s laws of motion, energy conservation, and thermodynamics. Key topics include: force and acceleration relationships, kinetic and potential energy calculations, and heat transfer mechanisms.'
          });
          break;
        case 'notes':
          setAiResult({
            type: 'list',
            content: [
              { title: 'Newton\'s First Law', text: 'Objects remain at rest or in uniform motion unless acted upon by force' },
              { title: 'Newton\'s Second Law', text: 'F = ma - Force equals mass times acceleration' },
              { title: 'Newton\'s Third Law', text: 'For every action, there is an equal and opposite reaction' },
              { title: 'Energy Conservation', text: 'Energy cannot be created or destroyed, only transformed' }
            ]
          });
          break;
        case 'flowchart':
          setAiResult({
            type: 'flowchart',
            content: 'Flowchart visualization would appear here'
          });
          break;
      }
    } catch (error) {
      console.error('AI tool error:', error);
      toast.error('Failed to process document');
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-primary-300">Loading document...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card mb-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 rounded-lg hover:bg-white/5"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-display font-bold">{document?.title}</h1>
              <p className="text-sm text-primary-400">
                {document?.subject} • {numPages} pages
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="btn-ghost flex items-center gap-2">
              <Share2 size={18} />
              Share
            </button>
            <button className="btn-ghost flex items-center gap-2">
              <Download size={18} />
              Download
            </button>
          </div>
        </div>
      </motion.div>

      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* PDF Viewer */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex-1 card flex flex-col"
        >
          {/* Toolbar */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
            {/* Page Navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => changePage(-1)}
                disabled={pageNumber <= 1}
                className="p-2 rounded-lg hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="text-sm">
                Page {pageNumber} of {numPages}
              </span>
              <button
                onClick={() => changePage(1)}
                disabled={pageNumber >= numPages}
                className="p-2 rounded-lg hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={zoomOut}
                className="p-2 rounded-lg hover:bg-white/5"
              >
                <ZoomOut size={20} />
              </button>
              <span className="text-sm w-12 text-center">
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={zoomIn}
                className="p-2 rounded-lg hover:bg-white/5"
              >
                <ZoomIn size={20} />
              </button>
            </div>

            {/* AI Tools */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleAITool('summarize')}
                className="btn-secondary flex items-center gap-2"
              >
                <Sparkles size={18} />
                Summarize
              </button>
              <button
                onClick={() => handleAITool('notes')}
                className="btn-secondary flex items-center gap-2"
              >
                <FileText size={18} />
                Notes
              </button>
              <button
                onClick={() => handleAITool('flowchart')}
                className="btn-secondary flex items-center gap-2"
              >
                <GitBranch size={18} />
                Flowchart
              </button>
            </div>
          </div>

          {/* PDF Display */}
          <div className="flex-1 overflow-auto custom-scrollbar">
            <div className="flex justify-center">
              <Document
                file={document?.downloadURL}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={
                  <div className="flex items-center justify-center p-12">
                    <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
                  </div>
                }
                error={
                  <div className="text-center p-12 text-error">
                    Failed to load PDF
                  </div>
                }
              >
                <Page
                  pageNumber={pageNumber}
                  scale={scale}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                />
              </Document>
            </div>
          </div>
        </motion.div>

        {/* AI Tools Panel */}
        <AnimatePresence>
          {showAITools && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="w-96 card flex flex-col max-h-full"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                <h3 className="text-xl font-display font-semibold flex items-center gap-2">
                  {aiTool === 'summarize' && <><Sparkles size={20} /> Summary</>}
                  {aiTool === 'notes' && <><FileText size={20} /> Notes</>}
                  {aiTool === 'flowchart' && <><GitBranch size={20} /> Flowchart</>}
                </h3>
                <button
                  onClick={() => setShowAITools(false)}
                  className="p-2 rounded-lg hover:bg-white/5"
                >
                  ×
                </button>
              </div>

              <div className="flex-1 overflow-auto custom-scrollbar">
                {aiLoading ? (
                  <div className="flex items-center justify-center p-12">
                    <div>
                      <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-center text-primary-300">
                        AI is analyzing the document...
                      </p>
                    </div>
                  </div>
                ) : aiResult ? (
                  <div>
                    {aiResult.type === 'text' && (
                      <p className="text-primary-200 leading-relaxed">
                        {aiResult.content}
                      </p>
                    )}

                    {aiResult.type === 'list' && (
                      <div className="space-y-4">
                        {aiResult.content.map((item, index) => (
                          <div key={index} className="p-4 rounded-xl glass">
                            <h4 className="font-semibold mb-2">{item.title}</h4>
                            <p className="text-sm text-primary-300">{item.text}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {aiResult.type === 'flowchart' && (
                      <div className="p-12 text-center text-primary-400">
                        <GitBranch size={48} className="mx-auto mb-4" />
                        <p>Interactive flowchart visualization</p>
                        <p className="text-sm mt-2">
                          Spline 3D flowchart would be embedded here
                        </p>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              {/* Actions */}
              <div className="border-t border-white/10 pt-4 mt-4 space-y-2">
                <button className="btn-primary w-full">
                  Generate Quiz from This
                </button>
                <button className="btn-secondary w-full">
                  Save to Notes
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PDFReader;