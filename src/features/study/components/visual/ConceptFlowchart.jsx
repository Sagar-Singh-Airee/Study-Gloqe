// src/features/study/components/visual/ConceptFlowchart.jsx
// 🎓 ULTRA-PREMIUM CONCEPT MAP - Monochrome Minimal Edition
// ✨ Gemini AI | Clean Design | Black & White Aesthetic

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Sparkles,
    Download,
    Maximize2,
    Minimize2,
    ZoomIn,
    ZoomOut,
    RotateCcw,
    ChevronDown,
    ChevronRight,
    Loader2,
    Eye,
    X,
    Copy,
    Check,
    Share2,
    Plus,
    Minus
} from 'lucide-react';

// ════════════════════════════════════════════════════════════════════════════════
// 🤖 GEMINI AI SERVICE
// ════════════════════════════════════════════════════════════════════════════════

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || process.env.REACT_APP_GEMINI_API_KEY;

const parseWithGemini = async (mermaidCode) => {
    if (!GEMINI_API_KEY) return null;

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `Analyze this Mermaid diagram and create a hierarchical concept map structure. Extract ALL nodes and relationships.

Mermaid Code:
${mermaidCode}

Return ONLY valid JSON (no markdown):
{
  "root": {
    "id": "root_id",
    "label": "Main Concept",
    "description": "2-3 sentence explanation",
    "children": [
      {
        "id": "child_id",
        "label": "Sub Concept",
        "description": "Brief explanation",
        "relationLabel": "relationship type",
        "children": []
      }
    ]
  },
  "totalNodes": 0,
  "maxDepth": 0
}`
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.3,
                        maxOutputTokens: 8192,
                    }
                })
            }
        );

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) return null;

        const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        return JSON.parse(cleaned);
    } catch (error) {
        console.error('Gemini parsing failed:', error);
        return null;
    }
};

// ════════════════════════════════════════════════════════════════════════════════
// 🔧 BASIC PARSER - Fallback
// ════════════════════════════════════════════════════════════════════════════════

const parseBasicMermaid = (code) => {
    const lines = code.split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('graph') && !l.startsWith('flowchart') && !l.startsWith('mindmap') && !l.startsWith('%%'));

    const nodes = new Map();
    const edges = [];

    lines.forEach(line => {
        const match = line.match(/(\w+)(?:\[(.+?)\]|\((.+?)\)|{(.+?)})?[\s]*(?:-->|---|==>)[\s]*(\w+)(?:\[(.+?)\]|\((.+?)\)|{(.+?)})?(?:\|(.+?)\|)?/);

        if (match) {
            const [_, fromId, fromL1, fromL2, fromL3, toId, toL1, toL2, toL3, rel] = match;
            const fromLabel = fromL1 || fromL2 || fromL3 || fromId;
            const toLabel = toL1 || toL2 || toL3 || toId;

            if (!nodes.has(fromId)) {
                nodes.set(fromId, {
                    id: fromId,
                    label: fromLabel,
                    description: `Concept: ${fromLabel}`,
                    children: []
                });
            }
            if (!nodes.has(toId)) {
                nodes.set(toId, {
                    id: toId,
                    label: toLabel,
                    description: `Concept: ${toLabel}`,
                    children: []
                });
            }

            edges.push({ from: fromId, to: toId, label: rel?.trim() || '' });
        }
    });

    const childIds = new Set(edges.map(e => e.to));
    const rootNodes = Array.from(nodes.values()).filter(n => !childIds.has(n.id));
    const root = rootNodes[0] || Array.from(nodes.values())[0];

    if (!root) return null;

    edges.forEach(({ from, to, label }) => {
        const parent = nodes.get(from);
        const child = nodes.get(to);
        if (parent && child) {
            parent.children.push({ ...child, relationLabel: label });
        }
    });

    const calcDepth = (node, depth = 0) => {
        let maxDepth = depth;
        node.children?.forEach(child => {
            maxDepth = Math.max(maxDepth, calcDepth(child, depth + 1));
        });
        return maxDepth;
    };

    return {
        root,
        totalNodes: nodes.size,
        maxDepth: calcDepth(root)
    };
};

// ════════════════════════════════════════════════════════════════════════════════
// 🎨 MINIMAL NODE COMPONENT - Clean black & white
// ════════════════════════════════════════════════════════════════════════════════

const MinimalNode = ({ node, depth, isExpanded, onToggle, onSelect }) => {
    const hasChildren = node.children?.length > 0;
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div className="flex flex-col items-center">
            {/* Connection Line */}
            {depth > 0 && (
                <motion.div
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ duration: 0.4, delay: depth * 0.1 }}
                    className="w-0.5 h-16 bg-black/20"
                    style={{ transformOrigin: 'top' }}
                />
            )}

            {/* Relationship Label */}
            {node.relationLabel && depth > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: depth * 0.1 + 0.2 }}
                    className="mb-2 px-3 py-1 bg-white border border-black/40 rounded-full"
                >
                    <span className="text-xs font-medium text-black/70 uppercase tracking-wide">
                        {node.relationLabel}
                    </span>
                </motion.div>
            )}

            {/* Node Card */}
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                    duration: 0.5,
                    delay: depth * 0.08,
                    type: "spring",
                    stiffness: 200,
                    damping: 20
                }}
                whileHover={{ scale: 1.03, y: -2 }}
                onHoverStart={() => setIsHovered(true)}
                onHoverEnd={() => setIsHovered(false)}
                onClick={() => onSelect(node)}
                className="relative group cursor-pointer"
            >
                <div
                    className={`
                        relative px-8 py-5
                        bg-white border-2 border-black
                        rounded-2xl
                        shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
                        hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]
                        transition-all duration-200
                        ${depth === 0 ? 'min-w-[280px]' : 'min-w-[200px]'}
                        max-w-[320px]
                    `}
                >
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex-1">
                            <h3
                                className={`
                                    font-bold text-black leading-tight
                                    ${depth === 0 ? 'text-lg' : 'text-base'}
                                `}
                            >
                                {node.label}
                            </h3>

                            {isHovered && node.description && (
                                <motion.p
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="text-xs text-black/60 mt-2 leading-relaxed"
                                >
                                    {node.description}
                                </motion.p>
                            )}
                        </div>

                        {hasChildren && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onToggle(node.id);
                                }}
                                className="flex-shrink-0 p-2 bg-black text-white rounded-lg hover:bg-black/80 transition-colors"
                            >
                                <motion.div
                                    animate={{ rotate: isExpanded ? 180 : 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <ChevronDown className="w-4 h-4" />
                                </motion.div>
                            </button>
                        )}
                    </div>

                    {/* Sparkle on hover */}
                    {isHovered && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0 }}
                            className="absolute -top-3 -right-3"
                        >
                            <Sparkles className="w-6 h-6 text-black" />
                        </motion.div>
                    )}
                </div>
            </motion.div>

            {/* Children */}
            <AnimatePresence>
                {hasChildren && isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.4 }}
                        className="mt-8 flex flex-wrap justify-center gap-12"
                    >
                        {node.children.map((child) => (
                            <MinimalNode
                                key={child.id}
                                node={child}
                                depth={depth + 1}
                                isExpanded={isExpanded}
                                onToggle={onToggle}
                                onSelect={onSelect}
                            />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// ════════════════════════════════════════════════════════════════════════════════
// 🎯 MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════════

const ConceptFlowchart = ({ flowchartCode, title = 'Concept Map' }) => {
    const containerRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [aiProcessing, setAiProcessing] = useState(false);
    const [conceptData, setConceptData] = useState(null);
    const [metadata, setMetadata] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [zoom, setZoom] = useState(100);
    const [expandedNodes, setExpandedNodes] = useState(new Set());
    const [selectedNode, setSelectedNode] = useState(null);
    const [copied, setCopied] = useState(false);

    // Parse with AI
    useEffect(() => {
        if (!flowchartCode) return;

        const parse = async () => {
            setLoading(true);
            setAiProcessing(true);

            // Try Gemini first
            const aiResult = await parseWithGemini(flowchartCode);

            let result;
            if (aiResult?.root) {
                result = aiResult;
                console.log('✨ AI-enhanced concept map loaded');
            } else {
                result = parseBasicMermaid(flowchartCode);
                console.log('📝 Basic parser used');
            }

            setAiProcessing(false);

            if (result?.root) {
                setConceptData(result.root);
                setMetadata({ totalNodes: result.totalNodes, maxDepth: result.maxDepth });
                setExpandedNodes(new Set([result.root.id]));
            }

            setLoading(false);
        };

        parse();
    }, [flowchartCode]);

    // Toggle node
    const toggleNode = useCallback((nodeId) => {
        setExpandedNodes(prev => {
            const next = new Set(prev);
            next.has(nodeId) ? next.delete(nodeId) : next.add(nodeId);
            return next;
        });
    }, []);

    // Expand all
    const expandAll = useCallback(() => {
        const collectIds = (node, set) => {
            set.add(node.id);
            node.children?.forEach(child => collectIds(child, set));
        };
        const all = new Set();
        if (conceptData) collectIds(conceptData, all);
        setExpandedNodes(all);
    }, [conceptData]);

    // Collapse all
    const collapseAll = useCallback(() => {
        setExpandedNodes(conceptData ? new Set([conceptData.id]) : new Set());
    }, [conceptData]);

    // Handlers
    const handleZoomIn = () => setZoom(prev => Math.min(prev + 10, 150));
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 10, 60));
    const handleZoomReset = () => setZoom(100);
    const handleFullscreen = () => setIsFullscreen(prev => !prev);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(flowchartCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Copy failed');
        }
    };

    const handleExport = () => {
        if (!conceptData) return;
        const json = JSON.stringify(conceptData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `concept-map-${Date.now()}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    if (!flowchartCode?.trim()) return null;

    return (
        <div className={`${isFullscreen ? 'fixed inset-0 z-50' : 'relative'}`}>
            <motion.div
                ref={containerRef}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full bg-white rounded-3xl shadow-2xl border-2 border-black overflow-hidden"
            >
                {/* ═══ HEADER ═══ */}
                <div className="bg-white border-b-2 border-black px-6 py-4">
                    <div className="flex items-center justify-between">
                        {/* Title */}
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center">
                                <Sparkles className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-black">
                                    {title}
                                </h3>
                                <div className="flex items-center gap-2">
                                    <p className="text-xs font-medium text-black/60">
                                        {aiProcessing ? 'AI analyzing...' :
                                            metadata ? `${metadata.totalNodes} concepts • ${metadata.maxDepth} levels` :
                                                'Interactive visualization'}
                                    </p>
                                    {aiProcessing && (
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                        >
                                            <Loader2 className="w-3 h-3 text-black" />
                                        </motion.div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-3">
                            {/* Zoom */}
                            <div className="flex items-center gap-2 bg-white border-2 border-black rounded-xl px-3 py-2">
                                <button
                                    onClick={handleZoomOut}
                                    disabled={zoom <= 60}
                                    className="p-1 hover:bg-black/5 rounded transition-colors disabled:opacity-30"
                                >
                                    <Minus className="w-4 h-4 text-black" />
                                </button>
                                <span className="text-sm font-bold text-black px-2 min-w-[3.5rem] text-center">
                                    {zoom}%
                                </span>
                                <button
                                    onClick={handleZoomIn}
                                    disabled={zoom >= 150}
                                    className="p-1 hover:bg-black/5 rounded transition-colors disabled:opacity-30"
                                >
                                    <Plus className="w-4 h-4 text-black" />
                                </button>
                                <div className="w-px h-6 bg-black/20 mx-1" />
                                <button
                                    onClick={handleZoomReset}
                                    className="p-1 hover:bg-black/5 rounded transition-colors"
                                >
                                    <RotateCcw className="w-4 h-4 text-black" />
                                </button>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={expandAll}
                                    className="px-4 py-2 bg-white border-2 border-black rounded-xl text-sm font-bold text-black hover:bg-black hover:text-white transition-all"
                                >
                                    Expand All
                                </button>
                                <button
                                    onClick={collapseAll}
                                    className="px-4 py-2 bg-white border-2 border-black rounded-xl text-sm font-bold text-black hover:bg-black hover:text-white transition-all"
                                >
                                    Collapse
                                </button>
                            </div>

                            {/* More */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleCopy}
                                    className="p-2.5 bg-white border-2 border-black rounded-xl hover:bg-black hover:text-white transition-all"
                                    title="Copy code"
                                >
                                    {copied ?
                                        <Check className="w-5 h-5" /> :
                                        <Copy className="w-5 h-5" />
                                    }
                                </button>
                                <button
                                    onClick={handleExport}
                                    className="p-2.5 bg-white border-2 border-black rounded-xl hover:bg-black hover:text-white transition-all"
                                    title="Export JSON"
                                >
                                    <Download className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={handleFullscreen}
                                    className="p-2.5 bg-black text-white border-2 border-black rounded-xl hover:bg-white hover:text-black transition-all"
                                >
                                    {isFullscreen ?
                                        <Minimize2 className="w-5 h-5" /> :
                                        <Maximize2 className="w-5 h-5" />
                                    }
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ═══ CANVAS ═══ */}
                <div
                    className={`
                        ${isFullscreen ? 'h-[calc(100vh-96px)]' : 'min-h-[600px] max-h-[800px]'} 
                        overflow-auto
                        bg-[#FAFAFA]
                    `}
                >
                    <div className="p-16">
                        {loading && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex flex-col items-center justify-center h-full min-h-[500px] gap-6"
                            >
                                <div className="relative">
                                    <div className="w-20 h-20 border-4 border-black/10 rounded-full" />
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                        className="absolute inset-0 w-20 h-20 border-4 border-black rounded-full border-t-transparent"
                                    />
                                </div>
                                <div className="text-center">
                                    <p className="text-lg font-bold text-black">
                                        {aiProcessing ? '🤖 AI is analyzing your concept map...' : 'Building visualization...'}
                                    </p>
                                    <p className="text-sm text-black/60 mt-2">
                                        This will only take a moment
                                    </p>
                                </div>
                            </motion.div>
                        )}

                        {!loading && conceptData && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: zoom / 100 }}
                                transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                                className="flex justify-center"
                                style={{ transformOrigin: 'top center' }}
                            >
                                <MinimalNode
                                    node={conceptData}
                                    depth={0}
                                    isExpanded={expandedNodes.has(conceptData.id)}
                                    onToggle={toggleNode}
                                    onSelect={setSelectedNode}
                                />
                            </motion.div>
                        )}

                        {!loading && !conceptData && (
                            <div className="text-center py-20">
                                <p className="text-black/60 font-medium">No concept data available</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* ═══ DETAIL MODAL ═══ */}
                <AnimatePresence>
                    {selectedNode && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6"
                            onClick={() => setSelectedNode(null)}
                        >
                            <motion.div
                                initial={{ scale: 0.9, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.9, y: 20 }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-white rounded-3xl shadow-2xl max-w-xl w-full border-2 border-black overflow-hidden"
                            >
                                {/* Header */}
                                <div className="bg-black p-6">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                                                <Eye className="w-6 h-6 text-black" />
                                            </div>
                                            <div>
                                                <h4 className="text-lg font-bold text-white">Concept Details</h4>
                                                <p className="text-sm text-white/70">Explore this concept</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setSelectedNode(null)}
                                            className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                                        >
                                            <X className="w-5 h-5 text-white" />
                                        </button>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-8">
                                    <h3 className="text-3xl font-bold text-black mb-4">
                                        {selectedNode.label}
                                    </h3>

                                    {selectedNode.description && (
                                        <div className="bg-[#FAFAFA] border-2 border-black rounded-2xl p-5 mb-6">
                                            <p className="text-sm text-black/80 leading-relaxed">
                                                {selectedNode.description}
                                            </p>
                                        </div>
                                    )}

                                    {selectedNode.relationLabel && (
                                        <div className="flex items-center gap-3 mb-6">
                                            <span className="text-xs font-bold text-black/60 uppercase tracking-wider">
                                                Relationship:
                                            </span>
                                            <span className="px-4 py-2 bg-white border-2 border-black rounded-xl text-sm font-bold text-black">
                                                {selectedNode.relationLabel}
                                            </span>
                                        </div>
                                    )}

                                    {selectedNode.children?.length > 0 && (
                                        <div className="pt-6 border-t-2 border-black/10">
                                            <p className="text-sm font-bold text-black/60 uppercase tracking-wider mb-4">
                                                Connected to {selectedNode.children.length} concept{selectedNode.children.length !== 1 ? 's' : ''}
                                            </p>
                                            <div className="flex flex-wrap gap-3">
                                                {selectedNode.children.map(child => (
                                                    <button
                                                        key={child.id}
                                                        onClick={() => setSelectedNode(child)}
                                                        className="px-5 py-3 bg-black text-white rounded-xl text-sm font-bold hover:bg-white hover:text-black border-2 border-black transition-all"
                                                    >
                                                        {child.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};

export default ConceptFlowchart;
