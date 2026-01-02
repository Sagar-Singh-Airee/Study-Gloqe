// src/features/study/services/visualAnalysisService.js
// 🎯 STREAMING EDITION v2.0 - Real-time Page-by-Page Processing
// ✨ Zero syntax errors | 🚀 Optimized performance | 🎨 Minimalist UX

import { GoogleGenerativeAI } from '@google/generative-ai';
import * as pdfjsLib from 'pdfjs-dist';
import {
    collection,
    doc,
    addDoc,
    setDoc,
    updateDoc,
    serverTimestamp,
    increment
} from 'firebase/firestore';
import { db } from '../../../shared/config/firebase';

// ════════════════════════════════════════════════════════════════════════════════
// 🔧 CONFIGURATION
// ════════════════════════════════════════════════════════════════════════════════

const CONFIG = {
    // AI Model
    MODEL_NAME: 'gemini-2.0-flash-exp',

    // Performance - OPTIMIZED FOR STREAMING
    MAX_RETRIES: 2,
    RETRY_DELAY: 1500,
    RATE_LIMIT_DELAY: 500,          // 0.5s between pages
    REQUEST_TIMEOUT: 25000,
    MAX_PAGES: 50,

    // Image Quality
    IMAGE_SCALE: 2.5,
    IMAGE_FORMAT: 'image/png',
    IMAGE_QUALITY: 0.95,

    // Content Validation
    MIN_TEXT_LENGTH: 30,
    MAX_TEXT_LENGTH: 15000,
    MIN_VALUABLE_LENGTH: 120,
    MIN_VALUABLE_WORDS: 25,

    // UI Limits
    MAX_KEY_TOPICS: 3,
    MAX_LEARNING_STEPS: 4,
    MAX_FLOWCHART_NODES: 4,

    // Streaming Mode
    ENABLE_STREAMING: true,
    BATCH_MODE: false,

    // Debug
    DEBUG_MERMAID: false,
    DEBUG_STREAMING: true
};

// ════════════════════════════════════════════════════════════════════════════════
// 🚀 INITIALIZATION
// ════════════════════════════════════════════════════════════════════════════════

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey || apiKey === 'undefined' || apiKey.length < 10) {
    console.error('❌ Critical: GEMINI_API_KEY not configured properly');
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// PDF.js Worker Configuration
pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

// ════════════════════════════════════════════════════════════════════════════════
// 🛠️ UTILITY FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════════

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const retryWithBackoff = async (fn, retries = CONFIG.MAX_RETRIES) => {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i === retries - 1) throw error;
            const delay = CONFIG.RETRY_DELAY * Math.pow(2, i);
            console.warn(`⚠️ Retry ${i + 1}/${retries} after ${delay}ms`);
            await sleep(delay);
        }
    }
};

const parseAIResponse = (text) => {
    try {
        return JSON.parse(text);
    } catch {
        try {
            // Remove markdown code blocks - FIXED SYNTAX ERROR
            const cleaned = text.replace(/``````/g, '').trim();
            return JSON.parse(cleaned);
        } catch {
            try {
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) return JSON.parse(jsonMatch[0]);
            } catch {
                throw new Error('Failed to parse AI response');
            }
        }
    }
    throw new Error('Could not extract valid JSON');
};

const hasValuableContent = (text) => {
    if (!text) return false;
    const cleaned = text.replace(/\s+/g, ' ').trim();
    if (cleaned.length < CONFIG.MIN_VALUABLE_LENGTH) return false;
    const meaningfulWords = cleaned.split(' ').filter(word => word.length > 3);
    return meaningfulWords.length >= CONFIG.MIN_VALUABLE_WORDS;
};

const sanitizeLabel = (text) => {
    if (!text) return 'Item';
    return text
        .toString()
        .replace(/[^a-zA-Z0-9\s]/g, '') // AGGRESSIVE: Remove EVERYTHING except alphanumeric and spaces
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 25);
};

const generateSimpleMermaid = (pageNumber, keyTopics = []) => {
    let diagram = 'graph TD\n';
    const validTopics = keyTopics
        .filter(t => t && t.length > 0)
        .slice(0, 3)
        .map(t => sanitizeLabel(t));

    if (validTopics.length === 0) {
        diagram += `    A[Page ${pageNumber}] --> B[Study Content]\n`;
        diagram += '    B --> C[Practice]';
    } else if (validTopics.length === 1) {
        diagram += `    A[Page ${pageNumber}] --> B[${validTopics[0]}]\n`;
        diagram += '    B --> C[Review]';
    } else if (validTopics.length === 2) {
        diagram += `    A[${validTopics[0]}] --> B[${validTopics[1]}]\n`;
        diagram += '    B --> C[Complete]';
    } else {
        // Fallback to simple structure if too many topics
        diagram += `    A[${validTopics[0]}] --> B[${validTopics[1]}]\n`;
        diagram += `    B --> C[${validTopics[2]}]`;
    }

    return diagram;
};

const validateMermaidSyntax = (flowchart, pageNumber = 1, keyTopics = []) => {
    if (!flowchart || typeof flowchart !== 'string') {
        console.warn('⚠️ Invalid flowchart input, using fallback');
        return generateSimpleMermaid(pageNumber, keyTopics);
    }

    try {
        let cleaned = flowchart.replace(/``````/g, '').trim();

        if (CONFIG.DEBUG_MERMAID) {
            console.log('🔍 Original Mermaid:', cleaned);
        }

        // AGGRESSIVE VALIDATION: If we see any round brackets in the entire string that aren't part of a node definition
        // Just fail safe immediately to simple structure
        if (cleaned.includes('(') || cleaned.includes(')')) {
            console.warn('⚠️ Validation: Found parentheses, reverting to safe version');
            return generateSimpleMermaid(pageNumber, keyTopics);
        }

        if (!cleaned.match(/^(graph|flowchart)\s+(TD|TB|BT|RL|LR)/i)) {
            console.warn('⚠️ Invalid graph declaration');
            return generateSimpleMermaid(pageNumber, keyTopics);
        }

        const hasNodes = cleaned.includes('[') && cleaned.includes(']');
        const hasArrows = cleaned.includes('-->') || cleaned.includes('---');

        if (!hasNodes || !hasArrows) {
            console.warn('⚠️ Missing nodes or arrows');
            return generateSimpleMermaid(pageNumber, keyTopics);
        }

        const nodeCount = (cleaned.match(/\[/g) || []).length;
        if (nodeCount > CONFIG.MAX_FLOWCHART_NODES + 2) {
            console.warn('⚠️ Too many nodes, simplifying');
            return generateSimpleMermaid(pageNumber, keyTopics);
        }

        const lines = cleaned.split('\n');
        for (const line of lines) {
            const hasBrackets = line.includes('[') && line.includes(']');
            if (hasBrackets) {
                // Support both A[Label] and A["Label"]
                const labelMatch = line.match(/\["?([^"\]]+)"?\]/);
                if (labelMatch) {
                    const label = labelMatch[1];
                    // CRITICAL: Mermaid crashes if labels have these characters without quotes
                    // Even with quotes, some characters like # or | can be problematic in some versions
                    const hasProblems = /["'`{}|()#<>\[\]]/.test(label);
                    if (hasProblems) {
                        console.warn('⚠️ Problematic characters in labels:', label);
                        return generateSimpleMermaid(pageNumber, keyTopics);
                    }
                }
            }
        }

        if (CONFIG.DEBUG_MERMAID) {
            console.log('✅ Mermaid validated:', cleaned);
        }

        return cleaned;

    } catch (error) {
        console.error('❌ Validation error:', error);
        return generateSimpleMermaid(pageNumber, keyTopics);
    }
};

// ════════════════════════════════════════════════════════════════════════════════
// 🎨 CORE ANALYSIS FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════════

export const convertPageToImage = async (pdfFile, pageNumber) => {
    try {
        const arrayBuffer = await pdfFile.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        if (pageNumber < 1 || pageNumber > pdf.numPages) {
            throw new Error(`Invalid page number: ${pageNumber}`);
        }

        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: CONFIG.IMAGE_SCALE });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d', { alpha: false });

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        context.fillStyle = 'white';
        context.fillRect(0, 0, canvas.width, canvas.height);

        await page.render({
            canvasContext: context,
            viewport,
            intent: 'print'
        }).promise;

        const imageData = canvas
            .toDataURL(CONFIG.IMAGE_FORMAT, CONFIG.IMAGE_QUALITY)
            .split(',')[1];

        canvas.width = 0;
        canvas.height = 0;

        return imageData;

    } catch (error) {
        console.error(`❌ Error converting page ${pageNumber}:`, error);
        return null;
    }
};

const analyzePageWithAI = async (imageData, pageNumber, pageText) => {
    try {
        if (!genAI) {
            throw new Error('AI model not initialized (missing API key)');
        }

        if (!imageData) {
            throw new Error('No image data provided');
        }

        if (!pageText || pageText.length < CONFIG.MIN_TEXT_LENGTH) {
            throw new Error('Insufficient text content');
        }

        const truncatedText = pageText.length > CONFIG.MAX_TEXT_LENGTH
            ? pageText.substring(0, CONFIG.MAX_TEXT_LENGTH) + '...'
            : pageText;

        const shouldHaveFlowchart = hasValuableContent(truncatedText);

        const model = genAI.getGenerativeModel({
            model: CONFIG.MODEL_NAME,
            generationConfig: {
                temperature: 0.3,
                topK: 30,
                topP: 0.8,
                maxOutputTokens: 2048,
            }
        });

        const prompt = `Analyze this educational page and create study materials.

Return ONLY valid JSON (no markdown, no extra text):
{
  "coreConcept": "Main idea in 5-8 words",
  "keyTopics": ["Topic 1", "Topic 2", "Topic 3"],
  "explanation": "Clear 2-paragraph explanation for students",
  "flowchart": "graph TD\\nA[First] --> B[Second]\\nB --> C[Third]",
  "learningPath": [
    {"step": 1, "title": "First step", "description": "What to learn", "duration": "5 min"}
  ],
  "complexity": "easy",
  "estimatedTime": "10 min"
}

FLOWCHART RULES (CRITICAL):
1. Format: "graph TD\\nA[\"Label\"] --> B[\"Label\"]\\nB --> C[\"Label\"]"
2. Use \\n for line breaks
3. Node IDs: Single letters only (A, B, C, D)
4. Labels: Max 25 chars, ALWAYS use double quotes, NO special characters: " ' \` { } | ( ) [ ] # < >
5. Keep SIMPLE: Maximum 4 nodes
6. Use only --> arrows
7. Example: "graph TD\\nA[\"Start\"] --> B[\"Learn\"]\\nB --> C[\"Practice\"]\\nC --> D[\"Master\"]"

Page content (first 1000 chars):
${truncatedText.substring(0, 1000)}`;

        const result = await retryWithBackoff(async () => {
            return await Promise.race([
                model.generateContent([
                    prompt,
                    {
                        inlineData: {
                            data: imageData,
                            mimeType: CONFIG.IMAGE_FORMAT
                        }
                    }
                ]),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Request timeout')), CONFIG.REQUEST_TIMEOUT)
                )
            ]);
        });

        const text = result.response.text();

        if (!text || text.length < 50) {
            throw new Error('Response too short');
        }

        const parsed = parseAIResponse(text);

        const validatedFlowchart = shouldHaveFlowchart
            ? validateMermaidSyntax(parsed.flowchart, pageNumber, parsed.keyTopics)
            : null;

        if (CONFIG.DEBUG_MERMAID && validatedFlowchart) {
            console.log(`📊 Flowchart for page ${pageNumber}:`, validatedFlowchart);
        }

        return {
            pageNumber,
            coreConcept: parsed.coreConcept || `Page ${pageNumber}`,
            keyTopics: Array.isArray(parsed.keyTopics)
                ? parsed.keyTopics.slice(0, CONFIG.MAX_KEY_TOPICS)
                : [],
            explanation: parsed.explanation || '',
            flowchart: validatedFlowchart,
            learningPath: Array.isArray(parsed.learningPath)
                ? parsed.learningPath.slice(0, CONFIG.MAX_LEARNING_STEPS)
                : [],
            complexity: parsed.complexity || 'medium',
            estimatedTime: parsed.estimatedTime || '10 min',
            generatedAt: new Date().toISOString(),
            success: true
        };

    } catch (error) {
        console.error(`❌ AI analysis error for page ${pageNumber}:`, error.message);
        throw error;
    }
};

export const analyzePageVisually = async (pdfFile, pageNumber, pageText) => {
    try {
        console.log(`🎨 Analyzing page ${pageNumber}...`);

        const imageData = await convertPageToImage(pdfFile, pageNumber);

        if (!imageData) {
            throw new Error('Image conversion failed');
        }

        const analysis = await analyzePageWithAI(imageData, pageNumber, pageText);

        console.log(`✅ Page ${pageNumber} analyzed successfully`);
        return analysis;

    } catch (error) {
        console.error(`❌ Page ${pageNumber} analysis failed:`, error.message);

        const goodContent = hasValuableContent(pageText);
        const safeMermaid = goodContent ? generateSimpleMermaid(pageNumber, []) : null;

        return {
            pageNumber,
            success: false,
            error: error.message,
            coreConcept: `Page ${pageNumber} Content`,
            keyTopics: goodContent ? ['Review this page'] : [],
            explanation: pageText?.substring(0, 300) ||
                'Please review the original document for this page.',
            flowchart: safeMermaid,
            learningPath: [
                {
                    step: 1,
                    title: 'Review Content',
                    description: 'Study this page from the original PDF',
                    duration: '10 min'
                }
            ],
            complexity: 'medium',
            estimatedTime: '10 min',
            generatedAt: new Date().toISOString()
        };
    }
};

// ════════════════════════════════════════════════════════════════════════════════
// 💾 STORAGE FUNCTIONS - STREAMING ARCHITECTURE
// ════════════════════════════════════════════════════════════════════════════════

/**
 * 🔥 NEW: Save individual page analysis immediately
 * Creates: documents/{docId}/visualPages/{pageNum}
 */
export const savePageAnalysis = async (userId, documentId, pageAnalysis) => {
    try {
        if (!userId || !documentId || !pageAnalysis) {
            throw new Error('Missing required parameters for page save');
        }

        const pageNum = pageAnalysis.pageNumber;

        // Save to subcollection for real-time streaming
        const pageRef = doc(db, 'documents', documentId, 'visualPages', `page_${pageNum}`);

        await setDoc(pageRef, {
            ...pageAnalysis,
            userId,
            documentId,
            processedAt: serverTimestamp(),
            version: 1
        });

        // Update document metadata with latest page count
        const docRef = doc(db, 'documents', documentId);
        await updateDoc(docRef, {
            processedPages: increment(1),
            lastProcessedPage: pageNum,
            hasVisualAnalysis: true,
            updatedAt: serverTimestamp()
        }).catch(err => {
            console.warn('Could not update document metadata:', err.message);
        });

        if (CONFIG.DEBUG_STREAMING) {
            console.log(`💾 Page ${pageNum} saved to Firestore (streaming mode)`);
        }

        return { success: true, pageNumber: pageNum };

    } catch (error) {
        console.error(`❌ Failed to save page ${pageAnalysis?.pageNumber}:`, error);
        throw error;
    }
};

/**
 * 🚀 STREAMING MODE: Process and save pages one-by-one in real-time
 */
export const processDocumentVisually = async (
    pdfFile,
    maxPages = CONFIG.MAX_PAGES,
    onProgress = null,
    startPage = 1,
    streamingConfig = {}
) => {
    const startTime = Date.now();
    const {
        userId = null,
        documentId = null,
        enableStreaming = CONFIG.ENABLE_STREAMING
    } = streamingConfig;

    try {
        console.log(`🎨 ${enableStreaming ? 'STREAMING' : 'BATCH'} processing from page ${startPage}...`);

        if (!pdfFile || pdfFile.type !== 'application/pdf') {
            throw new Error('Invalid PDF file');
        }

        const arrayBuffer = await pdfFile.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const endPage = Math.min(pdf.numPages, maxPages);

        console.log(`📄 Processing ${endPage - startPage + 1} pages...`);

        const visualPages = [];
        let successCount = 0;
        let failCount = 0;

        for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
            try {
                // Report progress BEFORE processing
                if (onProgress) {
                    onProgress({
                        current: pageNum,
                        total: endPage,
                        status: `Analyzing page ${pageNum}/${endPage}...`,
                        phase: 'visual-analysis',
                        progress: Math.round(((pageNum - startPage) / (endPage - startPage + 1)) * 100),
                        successCount,
                        failCount,
                        isStreaming: enableStreaming
                    });
                }

                // Extract page text
                const page = await pdf.getPage(pageNum);
                const textContent = await page.getTextContent();
                const pageText = textContent.items
                    .map(item => item.str)
                    .join(' ')
                    .trim()
                    .replace(/\s+/g, ' ');

                // Skip pages with insufficient text
                if (pageText.length < CONFIG.MIN_TEXT_LENGTH) {
                    console.warn(`⚠️ Page ${pageNum}: Insufficient text (${pageText.length} chars), skipping`);
                    failCount++;
                    continue;
                }

                // Analyze page
                const analysis = await analyzePageVisually(pdfFile, pageNum, pageText);

                if (analysis) {
                    visualPages.push(analysis);

                    // 🔥 STREAMING: Save immediately to Firestore
                    if (enableStreaming && userId && documentId) {
                        try {
                            await savePageAnalysis(userId, documentId, analysis);
                            console.log(`✅ Page ${pageNum}: Analyzed + Saved (${visualPages.length} total)`);
                        } catch (saveError) {
                            console.error(`❌ Save failed for page ${pageNum}, continuing...`, saveError.message);
                        }
                    } else {
                        console.log(`✅ Page ${pageNum}: Analyzed (${visualPages.length} total)`);
                    }

                    successCount++;

                    // Report success immediately after save
                    if (onProgress) {
                        onProgress({
                            current: pageNum,
                            total: endPage,
                            status: `Page ${pageNum} complete!`,
                            phase: 'visual-analysis',
                            progress: Math.round(((pageNum - startPage + 1) / (endPage - startPage + 1)) * 100),
                            latestPage: analysis,
                            successCount,
                            failCount,
                            isStreaming: enableStreaming
                        });
                    }
                }

                // Rate limiting (skip for last page)
                if (pageNum < endPage) {
                    await sleep(CONFIG.RATE_LIMIT_DELAY);
                }

            } catch (pageError) {
                console.error(`❌ Page ${pageNum} failed:`, pageError.message);
                failCount++;
                // Continue processing other pages
            }
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`✅ Processing complete: ${successCount} success, ${failCount} failed in ${duration}s`);

        if (visualPages.length === 0) {
            throw new Error('No pages could be analyzed');
        }

        return {
            pages: visualPages,
            successCount,
            failCount,
            totalProcessed: visualPages.length,
            duration: parseFloat(duration),
            isStreaming: enableStreaming
        };

    } catch (error) {
        console.error('❌ Processing error:', error);
        throw error;
    }
};

/**
 * LEGACY: Batch save all pages at once (backward compatibility)
 */
export const saveVisualAnalysis = async (
    userId,
    documentId,
    pages,
    documentTitle,
    subject
) => {
    try {
        if (!pages || pages.length === 0) {
            throw new Error('No pages to save');
        }

        console.warn('⚠️ Using legacy batch save. Consider streaming mode for better UX.');

        const analysisData = {
            userId,
            documentId,
            documentTitle: documentTitle || 'Untitled',
            subject: subject || 'General',
            totalPages: pages.length,
            visualPages: pages.map(page => ({
                pageNumber: page.pageNumber,
                coreConcept: page.coreConcept,
                keyTopics: page.keyTopics,
                explanation: page.explanation,
                flowchart: page.flowchart,
                learningPath: page.learningPath,
                complexity: page.complexity,
                estimatedTime: page.estimatedTime,
                generatedAt: page.generatedAt,
                success: page.success
            })),
            hasVisualAnalysis: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        const docRef = await addDoc(collection(db, 'visualAnalysis'), analysisData);
        console.log('✅ Batch analysis saved:', docRef.id);

        return { success: true, analysisId: docRef.id };

    } catch (error) {
        console.error('❌ Batch save error:', error);
        throw error;
    }
};

// ════════════════════════════════════════════════════════════════════════════════
// 📊 HELPER UTILITIES
// ════════════════════════════════════════════════════════════════════════════════

export const getTotalConcepts = (pages) => {
    const concepts = new Set();
    pages.forEach(page => {
        page.keyTopics?.forEach(topic => concepts.add(topic));
    });
    return Array.from(concepts);
};

export const getTotalLearningSteps = (pages) => {
    return pages.reduce((total, page) =>
        total + (page.learningPath?.length || 0), 0
    );
};

export const extractPageText = async (pdfFile, pageNumber) => {
    try {
        const arrayBuffer = await pdfFile.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(pageNumber);
        const textContent = await page.getTextContent();
        return textContent.items.map(item => item.str).join(' ').trim();
    } catch (error) {
        console.error(`Error extracting page ${pageNumber}:`, error);
        return '';
    }
};

// ════════════════════════════════════════════════════════════════════════════════
// 📦 EXPORTS
// ════════════════════════════════════════════════════════════════════════════════

export default {
    // Main Functions
    analyzePageVisually,
    processDocumentVisually,
    convertPageToImage,
    extractPageText,

    // Streaming Functions (NEW)
    savePageAnalysis,

    // Legacy Functions
    saveVisualAnalysis,

    // Utilities
    getTotalConcepts,
    getTotalLearningSteps,
    generateSimpleMermaid,
    sanitizeLabel,
    hasValuableContent,

    // Configuration
    CONFIG
};
