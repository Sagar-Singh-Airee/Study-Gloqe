// src/components/study/TextViewer.jsx - 🏆 ULTIMATE PREMIUM EDITION 2025
import { forwardRef, useMemo, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft, ChevronRight, Book, Bookmark, Eye,
    Settings, ZoomIn, ZoomOut, Maximize2, Sun, Moon,
    Coffee, BookOpen, Type, Minus, Plus, X
} from 'lucide-react';

const TextViewer = forwardRef(({
    text = '',
    images = [],
    fontSize: initialFontSize = 18,
    lineHeight: initialLineHeight = 1.8,
    fontFamily: initialFontFamily = 'serif',
    readingMode: initialReadingMode = 'light',
    onTextSelect,
    onPageChange,
    currentPage: externalPage,
    wordsPerPage = 500
}, ref) => {

    // State management
    const [loadedImages, setLoadedImages] = useState({});
    const [failedImages, setFailedImages] = useState({});
    const [isMobile, setIsMobile] = useState(false);
    const [internalPage, setInternalPage] = useState(0);
    const [direction, setDirection] = useState(0);
    const [bookmarks, setBookmarks] = useState(new Set());
    const [showSettings, setShowSettings] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // User customizable settings
    const [fontSize, setFontSize] = useState(initialFontSize);
    const [lineHeight, setLineHeight] = useState(initialLineHeight);
    const [fontFamily, setFontFamily] = useState(initialFontFamily);
    const [readingMode, setReadingMode] = useState(initialReadingMode);

    const currentPage = externalPage !== undefined ? externalPage : internalPage;

    // Responsive design
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Professional fonts
    const fontFamilyMap = useMemo(() => ({
        serif: '"Crimson Pro", "Literata", "Lora", "Georgia", serif',
        sans: '"Inter", "Source Sans Pro", "Helvetica Neue", sans-serif',
        mono: '"JetBrains Mono", "Fira Code", "Consolas", monospace',
        classic: '"Baskerville", "Palatino", "Book Antiqua", serif',
        modern: '"Montserrat", "Raleway", "Poppins", sans-serif'
    }), []);

    // Premium color schemes - ZERO TRANSPARENCY
    const getModeStyles = useCallback(() => {
        switch (readingMode) {
            case 'dark':
                return {
                    bg: '#0a0a0a',
                    pageBg: '#1a1a1a',
                    text: '#ffffff',
                    secondary: '#b0b0b0',
                    accent: '#fbbf24',
                    border: '#2d2d2d',
                    shadow: '0 25px 80px rgba(0, 0, 0, 0.95), 0 0 2px rgba(251, 191, 36, 0.2)',
                    navBg: '#262626',
                    navHover: '#333333',
                    decorLine: '#3d3d3d',
                    settingsBg: '#1f1f1f',
                    buttonBg: '#2d2d2d',
                    buttonHover: '#3d3d3d',
                };
            case 'sepia':
                return {
                    bg: '#e8dcc4',
                    pageBg: '#f5eedd',
                    text: '#3a2f26',
                    secondary: '#6b5d50',
                    accent: '#8b4513',
                    border: '#d4c4a8',
                    shadow: '0 25px 80px rgba(0, 0, 0, 0.2), 0 0 2px rgba(139, 69, 19, 0.1)',
                    navBg: '#ebe0cc',
                    navHover: '#dfd4be',
                    decorLine: '#c4b49a',
                    settingsBg: '#ebe0cc',
                    buttonBg: '#e0d4bc',
                    buttonHover: '#d4c4a8',
                };
            case 'night':
                return {
                    bg: '#1a1f2e',
                    pageBg: '#252b3b',
                    text: '#e1e4e8',
                    secondary: '#8b92a5',
                    accent: '#64b5f6',
                    border: '#353d50',
                    shadow: '0 25px 80px rgba(0, 0, 0, 0.9), 0 0 2px rgba(100, 181, 246, 0.2)',
                    navBg: '#2d3548',
                    navHover: '#353d50',
                    decorLine: '#404859',
                    settingsBg: '#1f2433',
                    buttonBg: '#2d3548',
                    buttonHover: '#353d50',
                };
            default: // light
                return {
                    bg: '#f5f5f5',
                    pageBg: '#ffffff',
                    text: '#1a1a1a',
                    secondary: '#6b7280',
                    accent: '#1e40af',
                    border: '#e5e7eb',
                    shadow: '0 25px 80px rgba(0, 0, 0, 0.15), 0 0 2px rgba(0, 0, 0, 0.1)',
                    navBg: '#f9fafb',
                    navHover: '#f3f4f6',
                    decorLine: '#d1d5db',
                    settingsBg: '#ffffff',
                    buttonBg: '#f3f4f6',
                    buttonHover: '#e5e7eb',
                };
        }
    }, [readingMode]);

    const styles = useMemo(() => getModeStyles(), [getModeStyles]);

    // Image handlers
    const handleImageLoad = useCallback((id) => {
        setLoadedImages(prev => ({ ...prev, [id]: true }));
    }, []);

    const handleImageError = useCallback((id) => {
        setFailedImages(prev => ({ ...prev, [id]: true }));
    }, []);

    // Bookmark management
    const toggleBookmark = useCallback(() => {
        setBookmarks(prev => {
            const newBookmarks = new Set(prev);
            if (newBookmarks.has(currentPage)) {
                newBookmarks.delete(currentPage);
            } else {
                newBookmarks.add(currentPage);
            }
            return newBookmarks;
        });
    }, [currentPage]);

    // Font size controls
    const increaseFontSize = () => setFontSize(prev => Math.min(prev + 2, 32));
    const decreaseFontSize = () => setFontSize(prev => Math.max(prev - 2, 12));

    // Line height controls
    const increaseLineHeight = () => setLineHeight(prev => Math.min(prev + 0.2, 3));
    const decreaseLineHeight = () => setLineHeight(prev => Math.max(prev - 0.2, 1.2));

    // Fullscreen toggle
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            ref?.current?.requestFullscreen?.();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen?.();
            setIsFullscreen(false);
        }
    };

    // Smart text pagination
    const pages = useMemo(() => {
        if (!text || typeof text !== 'string') return [[]];

        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        const allPages = [];
        let currentPageContent = [];
        let wordCount = 0;
        let figureNumber = 1;
        let imageIndex = 0;

        lines.forEach((line, idx) => {
            const isHeading = line.length < 80 && (
                /^[A-Z\s]{3,}$/.test(line) ||
                /^Chapter\s+\d+/i.test(line) ||
                /^[IVX]+\.\s/.test(line) ||
                (line.endsWith(':') && line.length < 60)
            );

            const isListItem = /^[\-\*\•]\s/.test(line) || /^\d+\.\s/.test(line);
            const lineWords = line.split(/\s+/).length;

            if (!isHeading && !isListItem && wordCount > wordsPerPage / 2 && imageIndex < images.length && currentPageContent.length > 3) {
                currentPageContent.push({
                    type: 'image',
                    src: images[imageIndex],
                    id: `img-${imageIndex}`,
                    figureNumber: figureNumber
                });
                imageIndex++;
                figureNumber++;
                wordCount += 50;
            }

            if (wordCount > wordsPerPage && currentPageContent.length > 0 && !isHeading) {
                allPages.push(currentPageContent);
                currentPageContent = [];
                wordCount = 0;
            }

            currentPageContent.push({
                type: isHeading ? 'heading' : isListItem ? 'list' : 'paragraph',
                content: line,
                id: `content-${idx}`
            });

            wordCount += lineWords;
        });

        if (currentPageContent.length > 0) {
            allPages.push(currentPageContent);
        }

        return allPages.length > 0 ? allPages : [[]];
    }, [text, images, wordsPerPage]);

    const totalPages = pages.length;

    // Navigation
    const goToNextPage = useCallback(() => {
        if (currentPage < totalPages - 1) {
            setDirection(1);
            const newPage = currentPage + 1;
            if (externalPage === undefined) {
                setInternalPage(newPage);
            }
            if (onPageChange) {
                onPageChange(newPage);
            }
        }
    }, [currentPage, totalPages, externalPage, onPageChange]);

    const goToPrevPage = useCallback(() => {
        if (currentPage > 0) {
            setDirection(-1);
            const newPage = currentPage - 1;
            if (externalPage === undefined) {
                setInternalPage(newPage);
            }
            if (onPageChange) {
                onPageChange(newPage);
            }
        }
    }, [currentPage, externalPage, onPageChange]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (showSettings) return;

            if (e.key === 'ArrowRight' || e.key === ' ') {
                e.preventDefault();
                goToNextPage();
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                goToPrevPage();
            } else if (e.key === 'b' || e.key === 'B') {
                toggleBookmark();
            } else if (e.key === 'f' || e.key === 'F') {
                toggleFullscreen();
            } else if (e.key === '+' || e.key === '=') {
                increaseFontSize();
            } else if (e.key === '-' || e.key === '_') {
                decreaseFontSize();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [goToNextPage, goToPrevPage, showSettings]);

    const handleTextSelection = useCallback((e) => {
        if (onTextSelect && typeof onTextSelect === 'function') {
            onTextSelect(e);
        }
    }, [onTextSelect]);

    // Responsive values
    const responsiveMaxWidth = isMobile ? '100%' : '850px';
    const responsiveInnerPadding = isMobile ? '60px 28px 80px' : '90px 90px 110px';
    const responsiveFontSize = isMobile ? Math.max(fontSize - 2, 12) : fontSize;

    // Enhanced animations
    const pageVariants = {
        enter: (direction) => ({
            x: direction > 0 ? 1000 : -1000,
            opacity: 0,
            scale: 0.85,
        }),
        center: {
            x: 0,
            opacity: 1,
            scale: 1,
        },
        exit: (direction) => ({
            x: direction > 0 ? -1000 : 1000,
            opacity: 0,
            scale: 0.85,
        })
    };

    const pageTransition = {
        type: "spring",
        stiffness: 280,
        damping: 28
    };

    return (
        <div
            ref={ref}
            style={{
                backgroundColor: styles.bg,
                minHeight: '100vh',
                padding: isMobile ? '16px 8px' : '50px 30px',
                transition: 'background-color 0.4s ease',
                fontFamily: fontFamilyMap[fontFamily] || fontFamilyMap.serif,
                position: 'relative',
            }}
            onMouseUp={handleTextSelection}
        >
            {/* Top Control Bar */}
            <div style={{
                maxWidth: responsiveMaxWidth,
                margin: '0 auto 30px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: styles.settingsBg,
                padding: isMobile ? '12px 16px' : '16px 24px',
                borderRadius: '16px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                border: `1px solid ${styles.border}`,
            }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                        onClick={toggleBookmark}
                        style={{
                            padding: '10px',
                            backgroundColor: bookmarks.has(currentPage) ? styles.accent : styles.buttonBg,
                            border: 'none',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                        title="Bookmark page (B)"
                    >
                        <Bookmark
                            size={20}
                            color={bookmarks.has(currentPage) ? '#fff' : styles.text}
                            fill={bookmarks.has(currentPage) ? '#fff' : 'none'}
                        />
                    </button>

                    {!isMobile && (
                        <>
                            <button
                                onClick={decreaseFontSize}
                                style={{
                                    padding: '10px',
                                    backgroundColor: styles.buttonBg,
                                    border: 'none',
                                    borderRadius: '10px',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                }}
                                title="Decrease font size (-)"
                            >
                                <Minus size={18} color={styles.text} />
                            </button>
                            <span style={{
                                color: styles.text,
                                fontSize: '14px',
                                fontWeight: 600,
                                minWidth: '35px',
                                textAlign: 'center'
                            }}>
                                {fontSize}px
                            </span>
                            <button
                                onClick={increaseFontSize}
                                style={{
                                    padding: '10px',
                                    backgroundColor: styles.buttonBg,
                                    border: 'none',
                                    borderRadius: '10px',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                }}
                                title="Increase font size (+)"
                            >
                                <Plus size={18} color={styles.text} />
                            </button>
                        </>
                    )}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                    {/* Reading Mode Toggles */}
                    <button
                        onClick={() => setReadingMode('light')}
                        style={{
                            padding: '10px',
                            backgroundColor: readingMode === 'light' ? styles.accent : styles.buttonBg,
                            border: 'none',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                        }}
                        title="Light mode"
                    >
                        <Sun size={18} color={readingMode === 'light' ? '#fff' : styles.text} />
                    </button>
                    <button
                        onClick={() => setReadingMode('sepia')}
                        style={{
                            padding: '10px',
                            backgroundColor: readingMode === 'sepia' ? styles.accent : styles.buttonBg,
                            border: 'none',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                        }}
                        title="Sepia mode"
                    >
                        <Coffee size={18} color={readingMode === 'sepia' ? '#fff' : styles.text} />
                    </button>
                    <button
                        onClick={() => setReadingMode('dark')}
                        style={{
                            padding: '10px',
                            backgroundColor: readingMode === 'dark' ? styles.accent : styles.buttonBg,
                            border: 'none',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                        }}
                        title="Dark mode"
                    >
                        <Moon size={18} color={readingMode === 'dark' ? '#fff' : styles.text} />
                    </button>
                    <button
                        onClick={() => setReadingMode('night')}
                        style={{
                            padding: '10px',
                            backgroundColor: readingMode === 'night' ? styles.accent : styles.buttonBg,
                            border: 'none',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                        }}
                        title="Night mode"
                    >
                        <Eye size={18} color={readingMode === 'night' ? '#fff' : styles.text} />
                    </button>

                    {!isMobile && (
                        <button
                            onClick={toggleFullscreen}
                            style={{
                                padding: '10px',
                                backgroundColor: styles.buttonBg,
                                border: 'none',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                            }}
                            title="Fullscreen (F)"
                        >
                            <Maximize2 size={18} color={styles.text} />
                        </button>
                    )}
                </div>
            </div>

            {/* Book Container */}
            <div style={{
                maxWidth: responsiveMaxWidth,
                margin: '0 auto',
                position: 'relative',
            }}>
                {/* Book Shadow and Binding */}
                <div style={{
                    position: 'relative',
                    boxShadow: readingMode === 'dark' || readingMode === 'night'
                        ? 'inset 10px 0 25px -12px rgba(0,0,0,0.6)'
                        : 'inset 10px 0 25px -12px rgba(0,0,0,0.2)',
                }}>
                    <AnimatePresence initial={false} custom={direction} mode="wait">
                        <motion.div
                            key={currentPage}
                            custom={direction}
                            variants={pageVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={pageTransition}
                            style={{
                                backgroundColor: styles.pageBg,
                                boxShadow: styles.shadow,
                                border: `1px solid ${styles.border}`,
                                borderRadius: '6px',
                                padding: responsiveInnerPadding,
                                position: 'relative',
                                minHeight: isMobile ? '75vh' : '85vh',
                            }}
                        >
                            {/* Bookmark Ribbon */}
                            {bookmarks.has(currentPage) && (
                                <div style={{
                                    position: 'absolute',
                                    top: 0,
                                    right: isMobile ? '35px' : '70px',
                                    width: '4px',
                                    height: '100px',
                                    background: `linear-gradient(180deg, ${styles.accent} 0%, transparent 100%)`,
                                }} />
                            )}

                            {/* Top Decoration */}
                            <div style={{
                                position: 'absolute',
                                top: isMobile ? '32px' : '45px',
                                left: isMobile ? '28px' : '90px',
                                right: isMobile ? '28px' : '90px',
                                height: '2px',
                                background: `linear-gradient(90deg, transparent, ${styles.decorLine}, transparent)`,
                            }} />

                            {/* Page Content */}
                            <article
                                style={{
                                    fontFamily: fontFamilyMap[fontFamily] || fontFamilyMap.serif,
                                    fontSize: `${responsiveFontSize}px`,
                                    lineHeight: lineHeight,
                                    color: styles.text,
                                    textAlign: 'justify',
                                    hyphens: 'auto',
                                    WebkitFontSmoothing: 'antialiased',
                                    MozOsxFontSmoothing: 'grayscale',
                                    textRendering: 'optimizeLegibility',
                                    minHeight: '55vh',
                                    wordSpacing: '0.1em',
                                    letterSpacing: '0.015em',
                                }}
                            >
                                {pages[currentPage].length === 0 ? (
                                    <div style={{
                                        textAlign: 'center',
                                        padding: '80px 20px',
                                        color: styles.secondary,
                                    }}>
                                        <BookOpen size={60} style={{ opacity: 0.3, margin: '0 auto 24px' }} />
                                        <p style={{ fontStyle: 'italic', fontSize: '18px', fontWeight: 600 }}>
                                            No content available
                                        </p>
                                    </div>
                                ) : (
                                    pages[currentPage].map((item, index) => {
                                        if (item.type === 'heading') {
                                            return (
                                                <h2
                                                    key={item.id}
                                                    style={{
                                                        fontSize: `${responsiveFontSize * 1.9}px`,
                                                        fontWeight: 800,
                                                        color: styles.accent,
                                                        marginTop: index === 0 ? '0' : '70px',
                                                        marginBottom: '36px',
                                                        textAlign: 'center',
                                                        letterSpacing: '0.8px',
                                                        lineHeight: 1.3,
                                                        textTransform: item.content.length < 30 ? 'uppercase' : 'none',
                                                        borderBottom: `4px solid ${styles.accent}`,
                                                        paddingBottom: '20px',
                                                    }}
                                                >
                                                    {item.content.replace(/^#{1,6}\s/, '').replace(/:$/, '')}
                                                </h2>
                                            );
                                        }

                                        if (item.type === 'image') {
                                            const hasError = failedImages[item.id];
                                            const isLoaded = loadedImages[item.id];

                                            return (
                                                <figure
                                                    key={item.id}
                                                    style={{
                                                        margin: isMobile ? '36px 0' : '52px 0',
                                                        textAlign: 'center',
                                                        pageBreakInside: 'avoid',
                                                    }}
                                                >
                                                    {!hasError ? (
                                                        <div style={{
                                                            position: 'relative',
                                                            display: 'inline-block',
                                                            maxWidth: '100%',
                                                            backgroundColor: styles.pageBg,
                                                            border: `3px solid ${styles.border}`,
                                                            padding: '16px',
                                                            boxShadow: `0 10px 40px ${styles.shadow.split(',')[0].replace('0 25px 80px', '0 8px 30px')}`,
                                                            borderRadius: '6px',
                                                        }}>
                                                            {!isLoaded && (
                                                                <div style={{
                                                                    width: '100%',
                                                                    height: '320px',
                                                                    backgroundColor: styles.buttonBg,
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    color: styles.secondary,
                                                                    fontSize: '15px',
                                                                    fontWeight: 600,
                                                                    borderRadius: '4px',
                                                                }}>
                                                                    <div>
                                                                        <Eye size={36} style={{ margin: '0 auto 16px', display: 'block' }} />
                                                                        <div>Loading image...</div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            <img
                                                                src={item.src}
                                                                alt={`Figure ${item.figureNumber}`}
                                                                onLoad={() => handleImageLoad(item.id)}
                                                                onError={() => handleImageError(item.id)}
                                                                style={{
                                                                    width: '100%',
                                                                    height: 'auto',
                                                                    display: isLoaded ? 'block' : 'none',
                                                                    borderRadius: '4px',
                                                                }}
                                                                loading="lazy"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div style={{
                                                            padding: '70px 50px',
                                                            backgroundColor: styles.buttonBg,
                                                            border: `3px dashed ${styles.secondary}`,
                                                            borderRadius: '6px',
                                                            color: styles.secondary,
                                                        }}>
                                                            <Eye size={36} style={{ margin: '0 auto 16px', opacity: 0.5, display: 'block' }} />
                                                            <div style={{ fontStyle: 'italic', fontSize: '15px', fontWeight: 600 }}>
                                                                Image could not be loaded
                                                            </div>
                                                        </div>
                                                    )}
                                                    <figcaption style={{
                                                        marginTop: '18px',
                                                        fontSize: `${responsiveFontSize * 0.85}px`,
                                                        color: styles.secondary,
                                                        fontStyle: 'italic',
                                                        fontWeight: 700,
                                                    }}>
                                                        Figure {item.figureNumber}
                                                    </figcaption>
                                                </figure>
                                            );
                                        }

                                        if (item.type === 'list') {
                                            return (
                                                <div
                                                    key={item.id}
                                                    style={{
                                                        marginLeft: isMobile ? '26px' : '44px',
                                                        marginBottom: '18px',
                                                        paddingLeft: '22px',
                                                        borderLeft: `5px solid ${styles.accent}`,
                                                        color: styles.text,
                                                    }}
                                                >
                                                    {item.content.replace(/^[\-\*\•]\s/, '').replace(/^\d+\.\s/, '')}
                                                </div>
                                            );
                                        }

                                        const isFirstPara = index === 0 || pages[currentPage][index - 1]?.type === 'heading';
                                        const firstChar = item.content.charAt(0);
                                        const restOfContent = item.content.slice(1);

                                        return (
                                            <p
                                                key={item.id}
                                                style={{
                                                    marginBottom: '26px',
                                                    textIndent: isFirstPara || isMobile ? '0' : '3em',
                                                    wordSpacing: '0.08em',
                                                    letterSpacing: '0.015em',
                                                    color: styles.text,
                                                }}
                                            >
                                                {index === 0 && currentPage === 0 && !isMobile && firstChar && (
                                                    <span
                                                        style={{
                                                            float: 'left',
                                                            fontSize: `${responsiveFontSize * 4.5}px`,
                                                            lineHeight: '0.8',
                                                            fontWeight: 900,
                                                            marginRight: '14px',
                                                            marginTop: '8px',
                                                            color: styles.accent,
                                                            textShadow: readingMode === 'dark' || readingMode === 'night'
                                                                ? '3px 3px 6px rgba(0,0,0,0.6)'
                                                                : 'none',
                                                        }}
                                                    >
                                                        {firstChar}
                                                    </span>
                                                )}
                                                {index === 0 && currentPage === 0 && !isMobile ? restOfContent : item.content}
                                            </p>
                                        );
                                    })
                                )}
                            </article>

                            {/* Bottom Decoration */}
                            <div style={{
                                position: 'absolute',
                                bottom: isMobile ? '55px' : '70px',
                                left: isMobile ? '28px' : '90px',
                                right: isMobile ? '28px' : '90px',
                                height: '2px',
                                background: `linear-gradient(90deg, transparent, ${styles.decorLine}, transparent)`,
                            }} />

                            {/* Page Number */}
                            <div style={{
                                position: 'absolute',
                                bottom: '28px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                fontSize: '14px',
                                fontWeight: 800,
                                color: styles.secondary,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                backgroundColor: styles.pageBg,
                                padding: '10px 28px',
                                borderRadius: '24px',
                                border: `2px solid ${styles.border}`,
                                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                            }}>
                                <Book size={16} />
                                <span>{currentPage + 1} / {totalPages}</span>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Navigation Buttons */}
                {totalPages > 1 && (
                    <>
                        <button
                            onClick={goToPrevPage}
                            disabled={currentPage === 0}
                            style={{
                                position: 'absolute',
                                left: isMobile ? '-14px' : '-75px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                width: isMobile ? '52px' : '60px',
                                height: isMobile ? '52px' : '60px',
                                borderRadius: '50%',
                                backgroundColor: styles.navBg,
                                border: `4px solid ${styles.accent}`,
                                boxShadow: styles.shadow,
                                cursor: currentPage === 0 ? 'not-allowed' : 'pointer',
                                opacity: currentPage === 0 ? 0.4 : 1,
                                transition: 'all 0.3s ease',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 10,
                            }}
                            onMouseEnter={(e) => {
                                if (currentPage > 0) {
                                    e.currentTarget.style.backgroundColor = styles.navHover;
                                    e.currentTarget.style.transform = 'translateY(-50%) scale(1.12)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = styles.navBg;
                                e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                            }}
                            title="Previous page (← or Left Arrow)"
                        >
                            <ChevronLeft size={30} color={styles.accent} strokeWidth={3.5} />
                        </button>

                        <button
                            onClick={goToNextPage}
                            disabled={currentPage === totalPages - 1}
                            style={{
                                position: 'absolute',
                                right: isMobile ? '-14px' : '-75px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                width: isMobile ? '52px' : '60px',
                                height: isMobile ? '52px' : '60px',
                                borderRadius: '50%',
                                backgroundColor: styles.navBg,
                                border: `4px solid ${styles.accent}`,
                                boxShadow: styles.shadow,
                                cursor: currentPage === totalPages - 1 ? 'not-allowed' : 'pointer',
                                opacity: currentPage === totalPages - 1 ? 0.4 : 1,
                                transition: 'all 0.3s ease',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 10,
                            }}
                            onMouseEnter={(e) => {
                                if (currentPage < totalPages - 1) {
                                    e.currentTarget.style.backgroundColor = styles.navHover;
                                    e.currentTarget.style.transform = 'translateY(-50%) scale(1.12)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = styles.navBg;
                                e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                            }}
                            title="Next page (→ or Right Arrow or Space)"
                        >
                            <ChevronRight size={30} color={styles.accent} strokeWidth={3.5} />
                        </button>
                    </>
                )}

                {/* Progress Indicator */}
                {totalPages > 1 && !isMobile && (
                    <div style={{
                        marginTop: '36px',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '18px 24px',
                        backgroundColor: styles.settingsBg,
                        borderRadius: '50px',
                        border: `1px solid ${styles.border}`,
                        boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                    }}>
                        {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
                            const pageIndex = totalPages <= 10 ? i :
                                currentPage < 5 ? i :
                                    currentPage > totalPages - 6 ? totalPages - 10 + i :
                                        currentPage - 5 + i;

                            return (
                                <button
                                    key={pageIndex}
                                    onClick={() => {
                                        setDirection(pageIndex > currentPage ? 1 : -1);
                                        if (externalPage === undefined) {
                                            setInternalPage(pageIndex);
                                        }
                                        if (onPageChange) {
                                            onPageChange(pageIndex);
                                        }
                                    }}
                                    style={{
                                        width: pageIndex === currentPage ? '36px' : '11px',
                                        height: '11px',
                                        borderRadius: '7px',
                                        backgroundColor: pageIndex === currentPage ? styles.accent : styles.secondary,
                                        opacity: pageIndex === currentPage ? 1 : 0.4,
                                        border: 'none',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease',
                                        boxShadow: pageIndex === currentPage
                                            ? `0 0 16px ${styles.accent}60, 0 2px 8px ${styles.accent}40`
                                            : 'none',
                                    }}
                                    title={`Page ${pageIndex + 1}${bookmarks.has(pageIndex) ? ' (Bookmarked)' : ''}`}
                                />
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Keyboard Shortcuts Help */}
            {!isMobile && (
                <div style={{
                    position: 'fixed',
                    bottom: '20px',
                    right: '20px',
                    backgroundColor: styles.settingsBg,
                    padding: '12px 20px',
                    borderRadius: '12px',
                    border: `1px solid ${styles.border}`,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                    fontSize: '12px',
                    color: styles.secondary,
                    fontWeight: 600,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                }}>
                    <div>⌨️ Shortcuts:</div>
                    <div>← → Space: Navigate</div>
                    <div>+ -: Font size</div>
                    <div>B: Bookmark</div>
                    <div>F: Fullscreen</div>
                </div>
            )}
        </div>
    );
});

TextViewer.displayName = 'TextViewer';

export default TextViewer;
