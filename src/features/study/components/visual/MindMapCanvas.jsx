// src/features/study/components/visual/MindMapCanvas.jsx
// 🧠 ULTIMATE RADIAL MIND MAP - Enterprise Grade
// ✨ Gemini AI | Adaptive Layout | Smart Text Wrapping | Click-to-Expand

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Sparkles,
    Maximize2,
    Minimize2,
    RotateCcw,
    Plus,
    Minus,
    Loader2,
    Eye,
    X,
    Download,
    Share2,
    ChevronRight,
    Circle,
    Zap
} from 'lucide-react';

// ════════════════════════════════════════════════════════════════════════════════
// 🤖 GEMINI AI SERVICE
// ════════════════════════════════════════════════════════════════════════════════

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || process.env.REACT_APP_GEMINI_API_KEY;

const generateMindMapWithAI = async (visualPages, documentTitle) => {
    if (!GEMINI_API_KEY || !visualPages?.length) return null;

    try {
        const pagesText = visualPages.slice(0, 10).map((p, i) =>
            `Page ${i + 1}: ${p.coreConcept || ''} | Topics: ${p.keyTopics?.join(', ') || ''}`
        ).join('\n');

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `Create a hierarchical mind map from this study content. Generate 4-6 main branches, each with 2-4 sub-concepts. Keep labels SHORT (2-4 words max).

Document: ${documentTitle}
Content:
${pagesText}

Return ONLY valid JSON (no markdown):
{
  "root": {
    "id": "root",
    "label": "Short Title",
    "description": "One sentence overview",
    "branches": [
      {
        "id": "b1",
        "label": "Branch (2-3 words)",
        "description": "Brief summary (one sentence)",
        "importance": 5,
        "pageIndex": 0,
        "children": [
          {
            "id": "c1",
            "label": "Sub-concept",
            "description": "Brief note",
            "pageIndex": 0
          }
        ]
      }
    ]
  }
}`
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.4,
                        maxOutputTokens: 4096,
                    }
                })
            }
        );

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) return null;

        const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(cleaned);
        return parsed.root;
    } catch (error) {
        console.error('Gemini AI error:', error);
        return null;
    }
};

// ════════════════════════════════════════════════════════════════════════════════
// 🔧 BASIC GENERATOR - Fallback
// ════════════════════════════════════════════════════════════════════════════════

const generateBasicMindMap = (visualPages, documentTitle) => {
    if (!visualPages?.length) {
        return {
            id: 'root',
            label: documentTitle || 'Study Map',
            description: 'No content available',
            branches: []
        };
    }

    const branches = visualPages.slice(0, 8).map((page, index) => ({
        id: `b${index}`,
        label: page.coreConcept?.substring(0, 25) || `Topic ${index + 1}`,
        description: page.keyTopics?.[0]?.substring(0, 60) || '',
        importance: index < 2 ? 5 : 4,
        pageIndex: index,
        children: page.keyConcepts?.slice(0, 4).map((concept, i) => ({
            id: `b${index}c${i}`,
            label: concept.split(':')[0]?.substring(0, 20) || concept.substring(0, 20),
            description: concept.substring(0, 50),
            pageIndex: index
        })) || []
    }));

    return {
        id: 'root',
        label: documentTitle?.substring(0, 25) || 'Study Map',
        description: `${visualPages.length} pages`,
        branches
    };
};

// ════════════════════════════════════════════════════════════════════════════════
// 🎨 SMART TEXT WRAPPING UTILITY
// ════════════════════════════════════════════════════════════════════════════════

const wrapText = (text, maxWidth) => {
    if (!text) return [];

    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    words.forEach(word => {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        // Approximate character width (adjust based on font size)
        if (testLine.length * 7 <= maxWidth) {
            currentLine = testLine;
        } else {
            if (currentLine) lines.push(currentLine);
            currentLine = word;
        }
    });

    if (currentLine) lines.push(currentLine);
    return lines.slice(0, 3); // Max 3 lines
};

// ════════════════════════════════════════════════════════════════════════════════
// 🎨 PREMIUM NODE COMPONENT
// ════════════════════════════════════════════════════════════════════════════════

const MindMapNode = ({
    node,
    x,
    y,
    isRoot = false,
    depth = 0,
    isExpanded = false,
    onClick,
    onToggle,
    isSelected = false,
    hasChildren = false
}) => {
    const [isHovered, setIsHovered] = useState(false);

    // Size based on depth
    const getNodeDimensions = () => {
        if (isRoot) return { width: 180, height: 70, fontSize: 15, padding: 10 };
        if (depth === 1) return { width: 140, height: 60, fontSize: 13, padding: 8 };
        return { width: 120, height: 50, fontSize: 11, padding: 6 };
    };

    const dims = getNodeDimensions();
    const textLines = wrapText(node.label, dims.width - dims.padding * 2);

    return (
        <g
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => {
                if (node.pageIndex !== undefined) {
                    onClick?.(node.pageIndex);
                }
                if (hasChildren) {
                    onToggle?.(node.id);
                }
            }}
            style={{ cursor: 'pointer' }}
        >
            {/* Shadow */}
            <motion.rect
                x={x - dims.width / 2 + 4}
                y={y - dims.height / 2 + 4}
                width={dims.width}
                height={dims.height}
                rx={isRoot ? 16 : 12}
                fill="black"
                initial={{ opacity: 0 }}
                animate={{ opacity: isHovered ? 0.15 : 0.1 }}
            />

            {/* Main node */}
            <motion.rect
                x={x - dims.width / 2}
                y={y - dims.height / 2}
                width={dims.width}
                height={dims.height}
                rx={isRoot ? 16 : 12}
                fill={isSelected ? '#F0FDF4' : 'white'}
                stroke={isSelected ? '#10B981' : 'black'}
                strokeWidth={isRoot ? 3 : 2}
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                    scale: isHovered ? 1.05 : 1,
                    opacity: 1
                }}
                transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 20
                }}
            />

            {/* Text - Multi-line support */}
            {textLines.map((line, index) => (
                <text
                    key={index}
                    x={x}
                    y={y - (textLines.length - 1) * 6 + index * 12}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="black"
                    fontSize={dims.fontSize}
                    fontWeight={isRoot ? "700" : depth === 1 ? "600" : "500"}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                    {line}
                </text>
            ))}

            {/* Expand indicator */}
            {hasChildren && (
                <g>
                    <motion.circle
                        cx={x + dims.width / 2 - 12}
                        cy={y}
                        r={10}
                        fill={isExpanded ? 'black' : 'white'}
                        stroke="black"
                        strokeWidth={2}
                        animate={{
                            scale: isHovered ? 1.2 : 1,
                        }}
                    />
                    <motion.path
                        d={isExpanded
                            ? `M ${x + dims.width / 2 - 15} ${y} L ${x + dims.width / 2 - 9} ${y}`
                            : `M ${x + dims.width / 2 - 14} ${y - 3} L ${x + dims.width / 2 - 10} ${y} L ${x + dims.width / 2 - 14} ${y + 3}`
                        }
                        stroke={isExpanded ? 'white' : 'black'}
                        strokeWidth={2}
                        strokeLinecap="round"
                        style={{ pointerEvents: 'none' }}
                    />
                </g>
            )}

            {/* Importance star */}
            {node.importance === 5 && !isRoot && (
                <motion.path
                    d={`M ${x - dims.width / 2 + 12} ${y - dims.height / 2 + 8} 
                        L ${x - dims.width / 2 + 14} ${y - dims.height / 2 + 12} 
                        L ${x - dims.width / 2 + 18} ${y - dims.height / 2 + 12} 
                        L ${x - dims.width / 2 + 15} ${y - dims.height / 2 + 14} 
                        L ${x - dims.width / 2 + 16} ${y - dims.height / 2 + 18} 
                        L ${x - dims.width / 2 + 12} ${y - dims.height / 2 + 16} 
                        L ${x - dims.width / 2 + 8} ${y - dims.height / 2 + 18} 
                        L ${x - dims.width / 2 + 9} ${y - dims.height / 2 + 14} 
                        L ${x - dims.width / 2 + 6} ${y - dims.height / 2 + 12} 
                        L ${x - dims.width / 2 + 10} ${y - dims.height / 2 + 12} Z`}
                    fill="black"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                />
            )}

            {/* Hover tooltip */}
            <AnimatePresence>
                {isHovered && node.description && (
                    <motion.g
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                    >
                        <rect
                            x={x - 120}
                            y={y - dims.height / 2 - 40}
                            width={240}
                            height={35}
                            rx={8}
                            fill="black"
                        />
                        {wrapText(node.description, 230).map((line, i) => (
                            <text
                                key={i}
                                x={x}
                                y={y - dims.height / 2 - 25 + i * 12}
                                textAnchor="middle"
                                fill="white"
                                fontSize={10}
                                fontWeight="500"
                            >
                                {line}
                            </text>
                        ))}
                    </motion.g>
                )}
            </AnimatePresence>

            {/* Click indicator animation */}
            {isHovered && (
                <motion.circle
                    cx={x}
                    cy={y}
                    r={dims.width / 2 + 5}
                    fill="none"
                    stroke={isSelected ? '#10B981' : 'black'}
                    strokeWidth={1}
                    strokeDasharray="4 4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.3 }}
                />
            )}
        </g>
    );
};

// ════════════════════════════════════════════════════════════════════════════════
// 🎯 MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════════

const MindMapCanvas = ({
    document,
    visualPages = [],
    currentPageIndex = 0,
    onNodeClick
}) => {
    const svgRef = useRef(null);
    const [mindMapData, setMindMapData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [aiProcessing, setAiProcessing] = useState(false);
    const [expandedNodes, setExpandedNodes] = useState(new Set(['root']));
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [zoom, setZoom] = useState(1);
    const [selectedNode, setSelectedNode] = useState(null);
    const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: 1200, height: 800 });

    // Generate mind map
    useEffect(() => {
        const generate = async () => {
            setLoading(true);
            setAiProcessing(true);

            const aiResult = await generateMindMapWithAI(visualPages, document?.title);

            let result;
            if (aiResult) {
                result = aiResult;
                console.log('✨ AI-generated mind map');
            } else {
                result = generateBasicMindMap(visualPages, document?.title);
                console.log('📝 Basic mind map');
            }

            setAiProcessing(false);
            setMindMapData(result);

            // Auto-expand first level
            const initialExpanded = new Set(['root']);
            result.branches?.forEach(b => initialExpanded.add(b.id));
            setExpandedNodes(initialExpanded);

            setLoading(false);
        };

        if (visualPages?.length > 0) {
            generate();
        } else {
            setLoading(false);
        }
    }, [visualPages, document]);

    // Toggle node expansion
    const toggleNode = useCallback((nodeId) => {
        setExpandedNodes(prev => {
            const next = new Set(prev);
            if (next.has(nodeId)) {
                // Collapse: also collapse all children
                next.delete(nodeId);
            } else {
                next.add(nodeId);
            }
            return next;
        });
    }, []);

    // Expand/collapse all
    const expandAll = useCallback(() => {
        const collectIds = (node, set) => {
            set.add(node.id);
            (node.branches || node.children || []).forEach(child => collectIds(child, set));
        };
        const all = new Set();
        if (mindMapData) collectIds(mindMapData, all);
        setExpandedNodes(all);
    }, [mindMapData]);

    const collapseAll = useCallback(() => {
        setExpandedNodes(new Set(['root']));
    }, []);

    // Calculate adaptive radial layout
    const layoutData = useMemo(() => {
        if (!mindMapData) return { nodes: [], connections: [], bounds: { minX: 0, maxX: 1200, minY: 0, maxY: 800 } };

        const centerX = 600;
        const centerY = 400;
        const nodes = [];
        const connections = [];
        let minX = centerX, maxX = centerX, minY = centerY, maxY = centerY;

        // Helper to update bounds
        const updateBounds = (x, y, width, height) => {
            minX = Math.min(minX, x - width / 2 - 50);
            maxX = Math.max(maxX, x + width / 2 + 50);
            minY = Math.min(minY, y - height / 2 - 50);
            maxY = Math.max(maxY, y + height / 2 + 50);
        };

        // Root node
        nodes.push({
            ...mindMapData,
            x: centerX,
            y: centerY,
            depth: 0,
            isRoot: true,
            hasChildren: (mindMapData.branches || []).length > 0
        });
        updateBounds(centerX, centerY, 180, 70);

        // Branches (level 1)
        const branches = mindMapData.branches || [];
        const isRootExpanded = expandedNodes.has('root');

        if (isRootExpanded && branches.length > 0) {
            const branchCount = branches.length;
            const angleStep = (Math.PI * 2) / branchCount;
            const branchDistance = 220; // Increased distance

            branches.forEach((branch, index) => {
                const angle = angleStep * index - Math.PI / 2; // Start from top
                const branchX = centerX + Math.cos(angle) * branchDistance;
                const branchY = centerY + Math.sin(angle) * branchDistance;

                nodes.push({
                    ...branch,
                    x: branchX,
                    y: branchY,
                    depth: 1,
                    isRoot: false,
                    hasChildren: (branch.children || []).length > 0
                });
                updateBounds(branchX, branchY, 140, 60);

                connections.push({
                    id: `conn-root-${branch.id}`,
                    x1: centerX,
                    y1: centerY,
                    x2: branchX,
                    y2: branchY,
                    depth: 1
                });

                // Children (level 2)
                const isBranchExpanded = expandedNodes.has(branch.id);
                const children = branch.children || [];

                if (isBranchExpanded && children.length > 0) {
                    const childCount = children.length;
                    const childAngleSpan = Math.PI / 2; // 90 degree span
                    const childAngleStep = childCount > 1 ? childAngleSpan / (childCount - 1) : 0;
                    const childDistance = 150;

                    children.forEach((child, childIndex) => {
                        const childAngle = angle + (childIndex * childAngleStep) - (childAngleSpan / 2);
                        const childX = branchX + Math.cos(childAngle) * childDistance;
                        const childY = branchY + Math.sin(childAngle) * childDistance;

                        nodes.push({
                            ...child,
                            x: childX,
                            y: childY,
                            depth: 2,
                            isRoot: false,
                            hasChildren: false
                        });
                        updateBounds(childX, childY, 120, 50);

                        connections.push({
                            id: `conn-${branch.id}-${child.id}`,
                            x1: branchX,
                            y1: branchY,
                            x2: childX,
                            y2: childY,
                            depth: 2
                        });
                    });
                }
            });
        }

        return {
            nodes,
            connections,
            bounds: {
                minX: minX - 100,
                maxX: maxX + 100,
                minY: minY - 100,
                maxY: maxY + 100
            }
        };
    }, [mindMapData, expandedNodes]);

    // Update viewBox based on layout
    useEffect(() => {
        if (layoutData.bounds) {
            const { minX, maxX, minY, maxY } = layoutData.bounds;
            const width = maxX - minX;
            const height = maxY - minY;
            const padding = 100;

            setViewBox({
                x: minX - padding,
                y: minY - padding,
                width: width + padding * 2,
                height: height + padding * 2
            });
        }
    }, [layoutData]);

    // Handlers
    const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.15, 2.5));
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.15, 0.5));
    const handleZoomReset = () => setZoom(1);

    const handleReset = () => {
        setZoom(1);
        const initialExpanded = new Set(['root']);
        mindMapData?.branches?.forEach(b => initialExpanded.add(b.id));
        setExpandedNodes(initialExpanded);
    };

    const handleExport = () => {
        if (!svgRef.current) return;
        const svgData = new XMLSerializer().serializeToString(svgRef.current);
        const blob = new Blob([svgData], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `mindmap-${Date.now()}.svg`;
        link.click();
        URL.revokeObjectURL(url);
    };

    // Empty state
    if (!visualPages?.length) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border-2 border-black">
                <div className="w-20 h-20 bg-black rounded-2xl flex items-center justify-center mb-6">
                    <Sparkles className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-bold text-black mb-2">No Content Yet</h3>
                <p className="text-sm text-black/60 max-w-xs text-center">
                    Mind map will appear once your study material is processed
                </p>
            </div>
        );
    }

    return (
        <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-white' : 'relative'}`}>
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="h-full bg-white rounded-3xl shadow-2xl border-2 border-black overflow-hidden flex flex-col"
            >
                {/* ═══ HEADER ═══ */}
                <div className="bg-white border-b-2 border-black px-6 py-4 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        {/* Title */}
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center">
                                <Sparkles className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-black">
                                    Interactive Mind Map
                                </h3>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <p className="text-xs font-medium text-black/60">
                                        {aiProcessing ? (
                                            <span className="flex items-center gap-2">
                                                <motion.div
                                                    animate={{ rotate: 360 }}
                                                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                                >
                                                    <Loader2 className="w-3 h-3" />
                                                </motion.div>
                                                AI analyzing...
                                            </span>
                                        ) : (
                                            `${visualPages.length} pages • Click nodes to explore`
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-3">
                            {/* Zoom Controls */}
                            <div className="flex items-center gap-2 bg-white border-2 border-black rounded-xl px-3 py-2">
                                <button
                                    onClick={handleZoomOut}
                                    disabled={zoom <= 0.5}
                                    className="p-1.5 hover:bg-black/5 rounded-lg transition-colors disabled:opacity-30"
                                    title="Zoom Out"
                                >
                                    <Minus className="w-4 h-4 text-black" />
                                </button>
                                <span className="text-sm font-bold text-black px-3 min-w-[4rem] text-center">
                                    {Math.round(zoom * 100)}%
                                </span>
                                <button
                                    onClick={handleZoomIn}
                                    disabled={zoom >= 2.5}
                                    className="p-1.5 hover:bg-black/5 rounded-lg transition-colors disabled:opacity-30"
                                    title="Zoom In"
                                >
                                    <Plus className="w-4 h-4 text-black" />
                                </button>
                                <div className="w-px h-6 bg-black/20 mx-1" />
                                <button
                                    onClick={handleZoomReset}
                                    className="p-1.5 hover:bg-black/5 rounded-lg transition-colors"
                                    title="Reset Zoom"
                                >
                                    <RotateCcw className="w-4 h-4 text-black" />
                                </button>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={expandAll}
                                    className="px-4 py-2 bg-white border-2 border-black rounded-xl text-sm font-bold text-black hover:bg-black hover:text-white transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                                >
                                    Expand All
                                </button>
                                <button
                                    onClick={collapseAll}
                                    className="px-4 py-2 bg-white border-2 border-black rounded-xl text-sm font-bold text-black hover:bg-black hover:text-white transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                                >
                                    Collapse
                                </button>
                                <button
                                    onClick={handleReset}
                                    className="px-4 py-2 bg-white border-2 border-black rounded-xl text-sm font-bold text-black hover:bg-black hover:text-white transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                                    title="Reset View"
                                >
                                    Reset
                                </button>
                            </div>

                            {/* More Actions */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleExport}
                                    className="p-2.5 bg-white border-2 border-black rounded-xl hover:bg-black hover:text-white transition-all"
                                    title="Export as SVG"
                                >
                                    <Download className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => setIsFullscreen(!isFullscreen)}
                                    className="p-2.5 bg-black text-white border-2 border-black rounded-xl hover:bg-white hover:text-black transition-all"
                                    title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                                >
                                    {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ═══ CANVAS ═══ */}
                <div className={`flex-1 overflow-hidden bg-[#FAFAFA] relative`}>
                    {loading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
                            <div className="relative">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                    className="w-20 h-20 border-4 border-black rounded-full border-t-transparent"
                                />
                            </div>
                            <div className="text-center">
                                <p className="text-lg font-bold text-black mb-2">
                                    {aiProcessing ? '🤖 AI is organizing your mind map...' : 'Building mind map...'}
                                </p>
                                <p className="text-sm text-black/60">
                                    Creating optimal layout for your study content
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center overflow-auto p-8">
                            <motion.svg
                                ref={svgRef}
                                viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
                                className="w-full h-full"
                                style={{
                                    transform: `scale(${zoom})`,
                                    transformOrigin: 'center',
                                    transition: 'transform 0.3s ease-out',
                                    maxWidth: '100%',
                                    maxHeight: '100%'
                                }}
                            >
                                {/* Background Grid */}
                                <defs>
                                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                                        <circle cx="1" cy="1" r="1" fill="black" opacity="0.05" />
                                    </pattern>
                                </defs>
                                <rect
                                    x={viewBox.x}
                                    y={viewBox.y}
                                    width={viewBox.width}
                                    height={viewBox.height}
                                    fill="url(#grid)"
                                />

                                {/* Connection Lines */}
                                <g className="connections">
                                    {layoutData.connections.map((conn) => (
                                        <motion.line
                                            key={conn.id}
                                            x1={conn.x1}
                                            y1={conn.y1}
                                            x2={conn.x2}
                                            y2={conn.y2}
                                            stroke="black"
                                            strokeWidth={conn.depth === 1 ? 2.5 : 1.5}
                                            strokeDasharray={conn.depth === 2 ? "6 4" : "none"}
                                            strokeLinecap="round"
                                            opacity={0.3}
                                            initial={{ pathLength: 0, opacity: 0 }}
                                            animate={{ pathLength: 1, opacity: 0.3 }}
                                            transition={{
                                                duration: 0.6,
                                                delay: conn.depth * 0.1,
                                                ease: "easeOut"
                                            }}
                                        />
                                    ))}
                                </g>

                                {/* Nodes */}
                                <g className="nodes">
                                    <AnimatePresence mode="sync">
                                        {layoutData.nodes.map((node) => (
                                            <MindMapNode
                                                key={node.id}
                                                node={node}
                                                x={node.x}
                                                y={node.y}
                                                isRoot={node.isRoot}
                                                depth={node.depth}
                                                isExpanded={expandedNodes.has(node.id)}
                                                onClick={onNodeClick}
                                                onToggle={toggleNode}
                                                isSelected={node.pageIndex === currentPageIndex}
                                                hasChildren={node.hasChildren}
                                            />
                                        ))}
                                    </AnimatePresence>
                                </g>
                            </motion.svg>
                        </div>
                    )}
                </div>

                {/* ═══ FOOTER ═══ */}
                <div className="bg-white border-t-2 border-black px-6 py-3 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-6 text-xs text-black/60">
                        <span className="flex items-center gap-2 font-medium">
                            <span className="w-4 h-4 bg-black rounded border-2 border-black" />
                            Main Topic
                        </span>
                        <span className="flex items-center gap-2 font-medium">
                            <span className="w-4 h-4 bg-white rounded border-2 border-black" />
                            Branch
                        </span>
                        <span className="flex items-center gap-2 font-medium">
                            <span className="w-3 h-3 bg-white rounded border border-black" />
                            Sub-concept
                        </span>
                        <span className="flex items-center gap-2 font-medium">
                            <Circle className="w-3 h-3" fill="black" />
                            Click to expand
                        </span>
                        <span className="flex items-center gap-2 font-medium">
                            <Zap className="w-3 h-3" fill="black" />
                            Important
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-xs font-bold text-black">
                            Page {currentPageIndex + 1} / {visualPages.length}
                        </span>
                        {expandedNodes.size > 0 && (
                            <span className="text-xs font-medium text-black/60">
                                {expandedNodes.size} nodes expanded
                            </span>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default MindMapCanvas;
