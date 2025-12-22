// src/features/study/services/visualAnalysisService.js - 🛡️ BULLETPROOF MERMAID EDITION
// Guaranteed valid Mermaid diagrams + Strict validation + Debug mode

import { GoogleGenerativeAI } from '@google/generative-ai';
import * as pdfjsLib from 'pdfjs-dist';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../shared/config/firebase';

// ==================== 🔧 CONFIGURATION ====================

const CONFIG = {
    MODEL_NAME: 'gemini-2.0-flash-exp',
    MAX_RETRIES: 3,
    RETRY_DELAY: 2000,
    RATE_LIMIT_DELAY: 1500,
    REQUEST_TIMEOUT: 30000,
    MAX_PAGES: 50,
    IMAGE_SCALE: 2.5,
    IMAGE_FORMAT: 'image/png',
    IMAGE_QUALITY: 0.95,
    MIN_TEXT_LENGTH: 30,
    MAX_TEXT_LENGTH: 15000,
    DEBUG_MERMAID: true // Set to false in production
};

// ==================== 🚀 INITIALIZATION ====================

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
if (!apiKey || apiKey === 'undefined' || apiKey.length < 10) {
    console.error('❌ GEMINI_API_KEY not configured!');
}

const genAI = new GoogleGenerativeAI(apiKey);
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;

// ==================== 🛠️ UTILITIES ====================

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
    } catch (e) {
        try {
            const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            return JSON.parse(cleaned);
        } catch (e) {
            try {
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    return JSON.parse(jsonMatch[0]);
                }
            } catch (e) {
                throw new Error('Failed to parse AI response');
            }
        }
    }
    throw new Error('Could not extract valid JSON');
};

/**
 * Sanitize text for Mermaid node labels
 * Removes special characters that break Mermaid
 */
const sanitizeLabel = (text) => {
    if (!text) return 'Item';

    return text
        .toString()
        .replace(/[\[\]{}()#<>|]/g, '') // Remove special chars
        .replace(/["'`]/g, '') // Remove quotes
        .replace(/\n/g, ' ') // Replace newlines with space
        .replace(/\s+/g, ' ') // Normalize spaces
        .trim()
        .substring(0, 25); // Max 25 chars for clean display
};

/**
 * Generate SIMPLE, GUARANTEED-VALID Mermaid flowchart
 */
const generateSimpleMermaid = (pageNumber, keyTopics = []) => {
    // Start with basic structure
    let diagram = 'graph TD\n';

    // Filter and limit topics
    const validTopics = keyTopics
        .filter(t => t && t.length > 0)
        .slice(0, 3) // Max 3 topics for simplicity
        .map(t => sanitizeLabel(t));

    if (validTopics.length === 0) {
        // Ultra-simple fallback
        diagram += '    A[Page ' + pageNumber + '] --> B[Study Content]\n';
        diagram += '    B --> C[Practice]';
    } else if (validTopics.length === 1) {
        diagram += '    A[Page ' + pageNumber + '] --> B[' + validTopics[0] + ']\n';
        diagram += '    B --> C[Review]';
    } else if (validTopics.length === 2) {
        diagram += '    A[' + validTopics[0] + '] --> B[' + validTopics[1] + ']\n';
        diagram += '    B --> C[Complete]';
    } else {
        // 3 topics - linear flow
        diagram += '    A[' + validTopics[0] + '] --> B[' + validTopics[1] + ']\n';
        diagram += '    B --> C[' + validTopics[2] + ']';
    }

    return diagram;
};

/**
 * Validate Mermaid syntax with STRICT rules
 */
const validateMermaidSyntax = (flowchart, pageNumber = 1, keyTopics = []) => {
    if (!flowchart || typeof flowchart !== 'string') {
        console.warn('⚠️ Invalid flowchart input, using fallback');
        return generateSimpleMermaid(pageNumber, keyTopics);
    }

    try {
        // Remove markdown blocks
        let cleaned = flowchart
            .replace(/```mermaid/g, '')
            .replace(/```/g, '')
            .trim();

        if (CONFIG.DEBUG_MERMAID) {
            console.log('🔍 Original Mermaid:', cleaned);
        }

        // Check for valid start
        if (!cleaned.match(/^(graph|flowchart)\s+(TD|TB|BT|RL|LR)/i)) {
            console.warn('⚠️ Invalid graph declaration, using fallback');
            return generateSimpleMermaid(pageNumber, keyTopics);
        }

        // Check for essential elements
        const hasNodes = cleaned.includes('[') && cleaned.includes(']');
        const hasArrows = cleaned.includes('-->') || cleaned.includes('---');

        if (!hasNodes || !hasArrows) {
            console.warn('⚠️ Missing nodes/arrows, using fallback');
            return generateSimpleMermaid(pageNumber, keyTopics);
        }

        // Count nodes - if too many, simplify
        const nodeCount = (cleaned.match(/\[/g) || []).length;
        if (nodeCount > 6) {
            console.warn('⚠️ Too many nodes, using fallback');
            return generateSimpleMermaid(pageNumber, keyTopics);
        }

        // Check for problematic characters in labels
        const lines = cleaned.split('\n');
        let hasProblems = false;

        for (const line of lines) {
            // Check for unescaped quotes or special chars in labels
            if (line.includes('[')) {
                const labelMatch = line.match(/\[([^\]]+)\]/);
                if (labelMatch) {
                    const label = labelMatch[1];
                    // Check for problematic characters
                    if (label.includes('"') || label.includes("'") || label.includes('`') ||
                        label.includes('{') || label.includes('}') || label.includes('|')) {
                        hasProblems = true;
                        break;
                    }
                }
            }
        }

        if (hasProblems) {
            console.warn('⚠️ Problematic characters in labels, using fallback');
            return generateSimpleMermaid(pageNumber, keyTopics);
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

// ==================== 🎨 CORE FUNCTIONS ====================

/**
 * Convert PDF page to base64 image
 */
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

        const imageData = canvas.toDataURL(CONFIG.IMAGE_FORMAT, CONFIG.IMAGE_QUALITY).split(',')[1];

        canvas.width = 0;
        canvas.height = 0;

        return imageData;

    } catch (error) {
        console.error(`❌ Error converting page ${pageNumber}:`, error);
        return null;
    }
};

/**
 * Analyze page with AI (SIMPLIFIED PROMPT - focuses on simple diagrams)
 */
const analyzePageWithAI = async (imageData, pageNumber, pageText) => {
    try {
        if (!imageData) {
            throw new Error('No image data provided');
        }

        if (!pageText || pageText.length < CONFIG.MIN_TEXT_LENGTH) {
            throw new Error('Insufficient text content');
        }

        const truncatedText = pageText.length > CONFIG.MAX_TEXT_LENGTH
            ? pageText.substring(0, CONFIG.MAX_TEXT_LENGTH) + '...'
            : pageText;

        const model = genAI.getGenerativeModel({
            model: CONFIG.MODEL_NAME,
            generationConfig: {
                temperature: 0.3,
                topK: 30,
                topP: 0.8,
                maxOutputTokens: 2048,
            }
        });

        // ULTRA-SIMPLIFIED PROMPT for reliable diagrams
        const prompt = `Analyze this educational page and create study content.

Return ONLY valid JSON (no markdown, no code blocks):
{
  "coreConcept": "Main idea in 5-8 words",
  "keyTopics": ["Topic 1", "Topic 2", "Topic 3"],
  "explanation": "2 paragraph explanation for students",
  "flowchart": "graph TD\nA[First] --> B[Second]\nB --> C[Third]",
  "learningPath": [
    {"step": 1, "title": "First step", "description": "What to learn", "duration": "5 min"}
  ],
  "complexity": "easy",
  "estimatedTime": "10 min"
}

CRITICAL FLOWCHART RULES (MUST FOLLOW):
1. Use EXACTLY this format: "graph TD\nA[Label] --> B[Label]\nB --> C[Label]"
2. Use \n for line breaks (backslash + n, NOT actual newlines)
3. Node IDs: Use only A, B, C, D (single letters)
4. Labels: Max 20 characters, NO special characters: " ' \` { } | [ ]
5. Keep it SIMPLE: Maximum 4 nodes
6. Use only --> arrows (no other arrow types)
7. Example: "graph TD\nA[Start] --> B[Learn]\nB --> C[Practice]\nC --> D[Master]"

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

        // ALWAYS validate and potentially replace the flowchart
        const validatedFlowchart = validateMermaidSyntax(
            parsed.flowchart,
            pageNumber,
            parsed.keyTopics
        );

        if (CONFIG.DEBUG_MERMAID) {
            console.log('📊 Final Mermaid for page', pageNumber + ':', validatedFlowchart);
        }

        return {
            pageNumber,
            coreConcept: parsed.coreConcept || `Page ${pageNumber}`,
            keyTopics: Array.isArray(parsed.keyTopics) ? parsed.keyTopics.slice(0, 5) : [],
            explanation: parsed.explanation || '',
            flowchart: validatedFlowchart, // ALWAYS valid
            learningPath: Array.isArray(parsed.learningPath) ? parsed.learningPath.slice(0, 4) : [],
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

/**
 * Analyze a single page (main public function)
 */
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

        // Create safe fallback with guaranteed-valid Mermaid
        const safeMermaid = generateSimpleMermaid(pageNumber, []);

        return {
            pageNumber,
            success: false,
            error: error.message,
            coreConcept: `Page ${pageNumber} Content`,
            keyTopics: ['Review this page'],
            explanation: pageText?.substring(0, 300) || 'Please review the original document for this page.',
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

/**
 * Process multiple pages (batch mode)
 */
export const processDocumentVisually = async (pdfFile, maxPages = CONFIG.MAX_PAGES, onProgress = null, startPage = 1) => {
    const startTime = Date.now();

    try {
        console.log(`🎨 Batch processing from page ${startPage}...`);

        if (!pdfFile || pdfFile.type !== 'application/pdf') {
            throw new Error('Invalid PDF file');
        }

        const arrayBuffer = await pdfFile.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const endPage = Math.min(pdf.numPages, maxPages);

        console.log(`📄 Processing ${endPage - startPage + 1} pages...`);

        const visualPages = [];

        for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
            try {
                if (onProgress) {
                    onProgress({
                        current: pageNum,
                        total: endPage,
                        status: `Analyzing page ${pageNum}/${endPage}...`,
                        phase: 'visual-analysis',
                        progress: Math.round(((pageNum - startPage + 1) / (endPage - startPage + 1)) * 100)
                    });
                }

                const page = await pdf.getPage(pageNum);
                const textContent = await page.getTextContent();
                const pageText = textContent.items
                    .map(item => item.str)
                    .join(' ')
                    .trim()
                    .replace(/\s+/g, ' ');

                if (pageText.length < CONFIG.MIN_TEXT_LENGTH) {
                    console.warn(`⚠️ Page ${pageNum}: Insufficient text`);
                    continue;
                }

                const analysis = await analyzePageVisually(pdfFile, pageNum, pageText);

                if (analysis) {
                    visualPages.push(analysis);
                    console.log(`✅ Page ${pageNum}: Complete`);
                }

                if (pageNum < endPage) {
                    await sleep(CONFIG.RATE_LIMIT_DELAY);
                }

            } catch (pageError) {
                console.error(`❌ Page ${pageNum}:`, pageError.message);
            }
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`✅ Batch complete: ${visualPages.length} pages in ${duration}s`);

        if (visualPages.length === 0) {
            throw new Error('No pages analyzed');
        }

        return visualPages;

    } catch (error) {
        console.error('❌ Batch error:', error);
        throw error;
    }
};

/**
 * Save to Firestore
 */
export const saveVisualAnalysis = async (userId, documentId, pages, documentTitle, subject) => {
    try {
        if (!pages || pages.length === 0) {
            throw new Error('No pages to save');
        }

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
        console.log('✅ Saved:', docRef.id);

        return { success: true, analysisId: docRef.id };

    } catch (error) {
        console.error('❌ Save error:', error);
        throw error;
    }
};

/**
 * Utilities
 */
export const getTotalConcepts = (pages) => {
    const concepts = new Set();
    pages.forEach(page => {
        page.keyTopics?.forEach(topic => concepts.add(topic));
    });
    return Array.from(concepts);
};

export const getTotalLearningSteps = (pages) => {
    return pages.reduce((total, page) => total + (page.learningPath?.length || 0), 0);
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

// ==================== 📦 EXPORTS ====================

export default {
    analyzePageVisually,
    processDocumentVisually,
    convertPageToImage,
    extractPageText,
    saveVisualAnalysis,
    getTotalConcepts,
    getTotalLearningSteps,
    generateSimpleMermaid,
    sanitizeLabel,
    CONFIG
};