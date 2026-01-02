// src/features/study/components/visual/ConceptFlowchart.jsx
// 🎨 ULTIMATE EDITION - Premium Interactive Flowchart Component
// ✨ Features: Loading states | Error handling | Export | Zoom | Full-screen

import React, { useEffect, useRef, useState, useCallback } from 'react';
import mermaid from 'mermaid';
import { motion, AnimatePresence } from 'framer-motion';
import {
    GitBranch,
    Download,
    Maximize2,
    Minimize2,
    ZoomIn,
    ZoomOut,
    RotateCcw,
    Copy,
    Check,
    AlertCircle,
    Loader2,
    Sparkles
} from 'lucide-react';

// ════════════════════════════════════════════════════════════════════════════════
// 🎨 MERMAID CONFIGURATION
// ════════════════════════════════════════════════════════════════════════════════

mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    themeVariables: {
        primaryColor: '#0d9488',
        primaryTextColor: '#ffffff',
        primaryBorderColor: '#14b8a6',
        lineColor: '#64748b',
        secondaryColor: '#e0f2fe',
        tertiaryColor: '#f1f5f9',
        background: '#ffffff',
        mainBkg: '#14b8a6',
        secondBkg: '#06b6d4',
        tertiaryBkg: '#0ea5e9',
        fontSize: '15px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        nodeSpacing: 50,
        nodePadding: 15,
        edgeLabelBackground: '#ffffff',
        clusterBkg: '#f8fafc',
        clusterBorder: '#cbd5e1'
    },
    flowchart: {
        curve: 'basis',
        padding: 20,
        nodeSpacing: 50,
        rankSpacing: 50,
        diagramPadding: 20,
        htmlLabels: true,
        useMaxWidth: true
    },
    securityLevel: 'loose'
});

// ════════════════════════════════════════════════════════════════════════════════
// 🎯 MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════════

const ConceptFlowchart = ({ flowchartCode, title = 'Concept Map' }) => {
    // Refs
    const chartRef = useRef(null);
    const containerRef = useRef(null);
    const renderIdRef = useRef(0);

    // State
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [zoom, setZoom] = useState(100);
    const [copied, setCopied] = useState(false);
    const [retryCount, setRetryCount] = useState(0);

    // ════════════════════════════════════════════════════════════════════════════
    // 🎨 RENDER FLOWCHART
    // ════════════════════════════════════════════════════════════════════════════

    const renderChart = useCallback(async () => {
        if (!chartRef.current || !flowchartCode) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Increment render ID to ensure unique IDs
            renderIdRef.current += 1;
            const uniqueId = `mermaid-chart-${Date.now()}-${renderIdRef.current}`;

            // Clear previous content
            chartRef.current.innerHTML = '';

            // Render with Mermaid
            const { svg } = await mermaid.render(uniqueId, flowchartCode);

            // Check if component is still mounted
            if (chartRef.current) {
                chartRef.current.innerHTML = svg;

                // Apply zoom
                const svgElement = chartRef.current.querySelector('svg');
                if (svgElement) {
                    svgElement.style.transform = `scale(${zoom / 100})`;
                    svgElement.style.transformOrigin = 'center';
                    svgElement.style.transition = 'transform 0.3s ease';
                }

                setLoading(false);
                setError(null);
                setRetryCount(0);
            }
        } catch (err) {
            console.error('❌ Mermaid render error:', err);
            setError(err.message || 'Failed to render flowchart');
            setLoading(false);
        }
    }, [flowchartCode, zoom]);

    // ════════════════════════════════════════════════════════════════════════════
    // 🔄 EFFECTS
    // ════════════════════════════════════════════════════════════════════════════

    useEffect(() => {
        renderChart();
    }, [renderChart]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (chartRef.current) {
                chartRef.current.innerHTML = '';
            }
        };
    }, []);

    // ════════════════════════════════════════════════════════════════════════════
    // 🎮 INTERACTION HANDLERS
    // ════════════════════════════════════════════════════════════════════════════

    const handleZoomIn = () => {
        setZoom(prev => Math.min(prev + 20, 200));
    };

    const handleZoomOut = () => {
        setZoom(prev => Math.max(prev - 20, 50));
    };

    const handleZoomReset = () => {
        setZoom(100);
    };

    const handleRetry = () => {
        setRetryCount(prev => prev + 1);
        renderChart();
    };

    const handleFullscreen = () => {
        setIsFullscreen(prev => !prev);
    };

    const handleCopyCode = async () => {
        if (flowchartCode) {
            try {
                await navigator.clipboard.writeText(flowchartCode);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch (err) {
                console.error('Failed to copy:', err);
            }
        }
    };

    const handleExportSVG = () => {
        const svg = chartRef.current?.querySelector('svg');
        if (svg) {
            const svgData = new XMLSerializer().serializeToString(svg);
            const blob = new Blob([svgData], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `flowchart-${Date.now()}.svg`;
            link.click();
            URL.revokeObjectURL(url);
        }
    };

    const handleExportPNG = async () => {
        const svg = chartRef.current?.querySelector('svg');
        if (!svg) return;

        try {
            const svgData = new XMLSerializer().serializeToString(svg);
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);

            img.onload = () => {
                canvas.width = img.width * 2;
                canvas.height = img.height * 2;
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                canvas.toBlob(blob => {
                    const pngUrl = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = pngUrl;
                    link.download = `flowchart-${Date.now()}.png`;
                    link.click();
                    URL.revokeObjectURL(pngUrl);
                });

                URL.revokeObjectURL(url);
            };

            img.src = url;
        } catch (err) {
            console.error('Export PNG error:', err);
        }
    };

    // ════════════════════════════════════════════════════════════════════════════
    // 🎨 RENDER STATES
    // ════════════════════════════════════════════════════════════════════════════

    // Empty state
    if (!flowchartCode || flowchartCode.trim().length === 0) {
        return null; // Don't render anything if no flowchart
    }

    return (
        <AnimatePresence mode="wait">
            <motion.div
                ref={containerRef}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className={`
                    ${isFullscreen ? 'fixed inset-0 z-50 bg-white' : 'relative'}
                    bg-gradient-to-br from-white to-slate-50/50
                    rounded-3xl shadow-xl border border-slate-200/60
                    overflow-hidden
                `}
            >
                {/* ═══ HEADER ═══ */}
                <div className="relative bg-gradient-to-r from-teal-600 to-cyan-600 px-6 py-4">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute inset-0" style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                        }} />
                    </div>

                    <div className="relative flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                <GitBranch className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    {title}
                                    <Sparkles className="w-4 h-4 text-yellow-300" />
                                </h3>
                                <p className="text-xs text-teal-100">Interactive concept visualization</p>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-2">
                            {/* Zoom Controls */}
                            <div className="flex items-center gap-1 bg-white/10 backdrop-blur-sm rounded-xl p-1">
                                <button
                                    onClick={handleZoomOut}
                                    disabled={zoom <= 50}
                                    className="p-2 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Zoom Out"
                                    aria-label="Zoom out"
                                >
                                    <ZoomOut className="w-4 h-4 text-white" />
                                </button>

                                <span className="text-xs font-semibold text-white px-2 min-w-[3rem] text-center">
                                    {zoom}%
                                </span>

                                <button
                                    onClick={handleZoomIn}
                                    disabled={zoom >= 200}
                                    className="p-2 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Zoom In"
                                    aria-label="Zoom in"
                                >
                                    <ZoomIn className="w-4 h-4 text-white" />
                                </button>

                                <button
                                    onClick={handleZoomReset}
                                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                                    title="Reset Zoom"
                                    aria-label="Reset zoom"
                                >
                                    <RotateCcw className="w-4 h-4 text-white" />
                                </button>
                            </div>

                            {/* Export Menu */}
                            <div className="relative group">
                                <button
                                    className="p-2 bg-white/10 backdrop-blur-sm hover:bg-white/20 rounded-xl transition-colors"
                                    title="Export"
                                    aria-label="Export options"
                                >
                                    <Download className="w-4 h-4 text-white" />
                                </button>

                                {/* Dropdown */}
                                <div className="absolute right-0 top-full mt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                                    <div className="bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden min-w-[180px]">
                                        <button
                                            onClick={handleExportSVG}
                                            className="w-full px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-3"
                                        >
                                            <Download className="w-4 h-4 text-teal-600" />
                                            Export as SVG
                                        </button>
                                        <button
                                            onClick={handleExportPNG}
                                            className="w-full px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-3"
                                        >
                                            <Download className="w-4 h-4 text-teal-600" />
                                            Export as PNG
                                        </button>
                                        <button
                                            onClick={handleCopyCode}
                                            className="w-full px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-3"
                                        >
                                            {copied ? (
                                                <>
                                                    <Check className="w-4 h-4 text-green-600" />
                                                    Copied!
                                                </>
                                            ) : (
                                                <>
                                                    <Copy className="w-4 h-4 text-teal-600" />
                                                    Copy Code
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Fullscreen Toggle */}
                            <button
                                onClick={handleFullscreen}
                                className="p-2 bg-white/10 backdrop-blur-sm hover:bg-white/20 rounded-xl transition-colors"
                                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                                aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                            >
                                {isFullscreen ? (
                                    <Minimize2 className="w-4 h-4 text-white" />
                                ) : (
                                    <Maximize2 className="w-4 h-4 text-white" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* ═══ CONTENT ═══ */}
                <div className={`
                    ${isFullscreen ? 'h-[calc(100vh-80px)]' : 'h-auto'}
                    overflow-auto
                `}>
                    <div className="p-6">
                        {/* Loading State */}
                        {loading && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col items-center justify-center py-16 gap-4"
                            >
                                <div className="relative">
                                    <div className="w-16 h-16 border-4 border-slate-200 rounded-full" />
                                    <div className="absolute inset-0 w-16 h-16 border-4 border-teal-600 rounded-full border-t-transparent animate-spin" />
                                    <Loader2 className="absolute inset-0 m-auto w-6 h-6 text-teal-600 animate-pulse" />
                                </div>
                                <p className="text-sm font-medium text-slate-600">
                                    Rendering concept map...
                                </p>
                            </motion.div>
                        )}

                        {/* Error State - Fail Silent as per user request */}
                        {error && !loading && null}

                        {/* Chart Container */}
                        <div
                            ref={chartRef}
                            className={`
                                ${loading || error ? 'hidden' : 'block'}
                                overflow-x-auto
                                bg-gradient-to-br from-slate-50 to-white
                                rounded-2xl p-8
                                border border-slate-200/50
                                shadow-inner
                                min-h-[300px]
                                flex items-center justify-center
                            `}
                            style={{
                                maxHeight: isFullscreen ? 'calc(100vh - 200px)' : '600px'
                            }}
                            role="img"
                            aria-label={`Concept flowchart for ${title}`}
                        />

                        {/* Zoom Level Indicator */}
                        {!loading && !error && zoom !== 100 && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-4 flex justify-center"
                            >
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900/90 backdrop-blur-sm text-white rounded-full text-xs font-medium">
                                    <ZoomIn className="w-3 h-3" />
                                    Zoom: {zoom}%
                                </div>
                            </motion.div>
                        )}
                    </div>
                </div>

                {/* ═══ FOOTER (Fullscreen only) ═══ */}
                {isFullscreen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-3"
                    >
                        <p className="text-xs text-slate-500 text-center">
                            Use scroll to navigate • ESC to exit fullscreen
                        </p>
                    </motion.div>
                )}
            </motion.div>
        </AnimatePresence>
    );
};

export default ConceptFlowchart;
