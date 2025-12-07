// src/components/study/TextViewer.jsx
import { forwardRef, useMemo, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Book } from 'lucide-react';

const TextViewer = forwardRef(({ 
    text = '', 
    images = [],
    fontSize = 18, 
    lineHeight = 1.8,
    fontFamily = 'serif',
    readingMode = 'light',
    onTextSelect,
    onPageChange,
    currentPage: externalPage,
    wordsPerPage = 500
}, ref) => {
    
    const [loadedImages, setLoadedImages] = useState({});
    const [failedImages, setFailedImages] = useState({});
    const [isMobile, setIsMobile] = useState(false);
    const [internalPage, setInternalPage] = useState(0);
    const [direction, setDirection] = useState(0);
    
    const currentPage = externalPage !== undefined ? externalPage : internalPage;

    // Handle responsive design
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Classic book fonts
    const fontFamilyMap = useMemo(() => ({
        serif: '"Crimson Text", "Baskerville", "Georgia", "Times New Roman", serif',
        sans: '"Inter", "Helvetica Neue", "Arial", sans-serif',
        mono: '"IBM Plex Mono", "Courier New", monospace'
    }), []);

    // Book-like color schemes
    const getModeStyles = useCallback(() => {
        switch (readingMode) {
            case 'dark':
                return {
                    bg: '#1a1a1a',
                    text: '#e8e8e8',
                    secondary: '#a0a0a0',
                    accent: '#d4af37',
                    paper: 'rgba(40, 40, 40, 0.5)',
                    shadow: 'rgba(0, 0, 0, 0.5)',
                    navBg: 'rgba(30, 30, 30, 0.9)'
                };
            case 'sepia':
                return {
                    bg: '#f4ecd8',
                    text: '#3d3229',
                    secondary: '#6d5d4f',
                    accent: '#8b4513',
                    paper: 'rgba(250, 246, 234, 0.8)',
                    shadow: 'rgba(0, 0, 0, 0.1)',
                    navBg: 'rgba(244, 236, 216, 0.9)'
                };
            default:
                return {
                    bg: '#ffffff',
                    text: '#2d2d2d',
                    secondary: '#6b7280',
                    accent: '#1e3a8a',
                    paper: 'rgba(255, 255, 255, 0.9)',
                    shadow: 'rgba(0, 0, 0, 0.08)',
                    navBg: 'rgba(255, 255, 255, 0.9)'
                };
        }
    }, [readingMode]);

    const styles = useMemo(() => getModeStyles(), [getModeStyles]);

    // Image loading handlers
    const handleImageLoad = useCallback((id) => {
        setLoadedImages(prev => ({ ...prev, [id]: true }));
    }, []);

    const handleImageError = useCallback((id) => {
        setFailedImages(prev => ({ ...prev, [id]: true }));
    }, []);

    // Split text into pages
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

            // Check if we should add an image
            if (!isHeading && !isListItem && wordCount > wordsPerPage / 2 && imageIndex < images.length && currentPageContent.length > 3) {
                currentPageContent.push({
                    type: 'image',
                    src: images[imageIndex],
                    id: `img-${imageIndex}`,
                    figureNumber: figureNumber
                });
                imageIndex++;
                figureNumber++;
                wordCount += 50; // Images count as words for pagination
            }

            // Start new page if word limit exceeded (but not in middle of heading)
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

        // Add last page
        if (currentPageContent.length > 0) {
            allPages.push(currentPageContent);
        }

        return allPages.length > 0 ? allPages : [[]];
    }, [text, images, wordsPerPage]);

    const totalPages = pages.length;

    // Navigation functions
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

    // Keyboard navigation [web:28][web:31]
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowRight') {
                e.preventDefault();
                goToNextPage();
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                goToPrevPage();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [goToNextPage, goToPrevPage]);

    const handleTextSelection = useCallback((e) => {
        if (onTextSelect && typeof onTextSelect === 'function') {
            onTextSelect(e);
        }
    }, [onTextSelect]);

    // Responsive values
    const responsivePadding = isMobile ? '20px 16px' : '40px 20px';
    const responsiveMaxWidth = isMobile ? '100%' : '720px';
    const responsiveInnerPadding = isMobile ? '40px 24px 80px' : '80px 60px 100px';
    const responsiveFontSize = isMobile ? Math.max(fontSize - 2, 14) : fontSize;

    // Page flip animation variants [web:23][web:26]
    const pageVariants = {
        enter: (direction) => ({
            rotateY: direction > 0 ? 90 : -90,
            opacity: 0,
            scale: 0.9
        }),
        center: {
            rotateY: 0,
            opacity: 1,
            scale: 1
        },
        exit: (direction) => ({
            rotateY: direction > 0 ? -90 : 90,
            opacity: 0,
            scale: 0.9
        })
    };

    const pageTransition = {
        duration: 0.6,
        ease: [0.43, 0.13, 0.23, 0.96]
    };

    return (
        <div
            ref={ref}
            style={{
                backgroundColor: styles.bg,
                minHeight: '100vh',
                padding: responsivePadding,
                transition: 'background-color 0.3s ease',
                perspective: '1500px'
            }}
            onMouseUp={handleTextSelection}
            role="article"
            aria-label="Text content viewer"
        >
            {/* Book Page Container */}
            <div style={{
                maxWidth: responsiveMaxWidth,
                margin: '0 auto',
                position: 'relative'
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
                            backgroundColor: styles.paper,
                            boxShadow: `0 2px 20px ${styles.shadow}, 0 0 0 1px rgba(0,0,0,0.05)`,
                            borderRadius: '2px',
                            padding: responsiveInnerPadding,
                            position: 'relative',
                            backdropFilter: 'blur(10px)',
                            transformStyle: 'preserve-3d'
                        }}
                    >
                        {/* Page decoration - top */}
                        {!isMobile && (
                            <div 
                                style={{
                                    position: 'absolute',
                                    top: '30px',
                                    left: '60px',
                                    right: '60px',
                                    height: '1px',
                                    background: `linear-gradient(to right, transparent, ${styles.accent}, transparent)`,
                                    opacity: 0.3
                                }}
                                aria-hidden="true"
                            />
                        )}

                        {/* Content */}
                        <article 
                            style={{
                                fontFamily: fontFamilyMap[fontFamily] || fontFamilyMap.serif,
                                fontSize: `${responsiveFontSize}px`,
                                lineHeight: lineHeight,
                                color: styles.text,
                                textAlign: isMobile ? 'left' : 'justify',
                                hyphens: 'auto',
                                WebkitFontSmoothing: 'antialiased',
                                MozOsxFontSmoothing: 'grayscale',
                                textRendering: 'optimizeLegibility',
                                minHeight: '60vh'
                            }}
                            aria-live="polite"
                        >
                            {pages[currentPage].length === 0 ? (
                                <p style={{ 
                                    color: styles.secondary, 
                                    fontStyle: 'italic',
                                    textAlign: 'center' 
                                }}>
                                    No content available
                                </p>
                            ) : (
                                pages[currentPage].map((item, index) => {
                                    // Render Heading
                                    if (item.type === 'heading') {
                                        return (
                                            <h2
                                                key={item.id}
                                                style={{
                                                    fontSize: `${responsiveFontSize * 1.5}px`,
                                                    fontWeight: 700,
                                                    color: styles.accent,
                                                    marginTop: index === 0 ? '0' : isMobile ? '32px' : '48px',
                                                    marginBottom: isMobile ? '16px' : '24px',
                                                    textAlign: 'center',
                                                    letterSpacing: '0.5px',
                                                    textTransform: item.content.length < 30 ? 'uppercase' : 'none'
                                                }}
                                                role="heading"
                                                aria-level="2"
                                            >
                                                {item.content.replace(/^#{1,6}\s/, '').replace(/:$/, '')}
                                            </h2>
                                        );
                                    }

                                    // Render Image
                                    if (item.type === 'image') {
                                        const hasError = failedImages[item.id];
                                        const isLoaded = loadedImages[item.id];
                                        
                                        return (
                                            <figure
                                                key={item.id}
                                                style={{
                                                    margin: isMobile ? '24px 0' : '40px 0',
                                                    textAlign: 'center'
                                                }}
                                                role="figure"
                                                aria-label={`Figure ${item.figureNumber}`}
                                            >
                                                {!hasError ? (
                                                    <div style={{
                                                        position: 'relative',
                                                        display: 'inline-block',
                                                        maxWidth: '100%',
                                                        boxShadow: `0 4px 20px ${styles.shadow}`,
                                                        borderRadius: '4px',
                                                        overflow: 'hidden',
                                                        backgroundColor: readingMode === 'dark' ? '#2a2a2a' : '#f5f5f5'
                                                    }}>
                                                        <img
                                                            src={item.src}
                                                            alt={`Figure ${item.figureNumber}`}
                                                            onLoad={() => handleImageLoad(item.id)}
                                                            onError={() => handleImageError(item.id)}
                                                            style={{
                                                                width: '100%',
                                                                height: 'auto',
                                                                display: 'block',
                                                                opacity: isLoaded ? 1 : 0,
                                                                transition: 'opacity 0.3s ease'
                                                            }}
                                                            loading="lazy"
                                                        />
                                                        {!isLoaded && (
                                                            <div 
                                                                style={{
                                                                    position: 'absolute',
                                                                    top: '50%',
                                                                    left: '50%',
                                                                    transform: 'translate(-50%, -50%)',
                                                                    color: styles.secondary,
                                                                    fontSize: '14px'
                                                                }}
                                                                aria-live="polite"
                                                            >
                                                                Loading image...
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div 
                                                        style={{
                                                            padding: '40px',
                                                            backgroundColor: readingMode === 'dark' ? '#2a2a2a' : '#f5f5f5',
                                                            borderRadius: '4px',
                                                            color: styles.secondary,
                                                            fontStyle: 'italic'
                                                        }}
                                                        role="alert"
                                                    >
                                                        Image failed to load
                                                    </div>
                                                )}
                                                <figcaption style={{
                                                    marginTop: '12px',
                                                    fontSize: `${responsiveFontSize * 0.85}px`,
                                                    color: styles.secondary,
                                                    fontStyle: 'italic',
                                                    textAlign: 'center'
                                                }}>
                                                    Figure {item.figureNumber}
                                                </figcaption>
                                            </figure>
                                        );
                                    }

                                    // Render List Item
                                    if (item.type === 'list') {
                                        return (
                                            <div
                                                key={item.id}
                                                style={{
                                                    marginLeft: isMobile ? '20px' : '30px',
                                                    marginBottom: '12px',
                                                    paddingLeft: '15px',
                                                    borderLeft: `2px solid ${styles.accent}`,
                                                    opacity: 0.9
                                                }}
                                                role="listitem"
                                            >
                                                {item.content.replace(/^[\-\*\•]\s/, '').replace(/^\d+\.\s/, '')}
                                            </div>
                                        );
                                    }

                                    // Render Paragraph
                                    const isFirstPara = index === 0 || pages[currentPage][index - 1]?.type === 'heading';
                                    const firstChar = item.content.charAt(0);
                                    const restOfContent = item.content.slice(1);
                                    
                                    return (
                                        <p
                                            key={item.id}
                                            style={{
                                                marginBottom: '18px',
                                                textIndent: isFirstPara || isMobile ? '0' : '2em',
                                                wordSpacing: '0.05em',
                                                letterSpacing: '0.01em'
                                            }}
                                        >
                                            {/* Drop cap for first paragraph */}
                                            {index === 0 && currentPage === 0 && !isMobile && firstChar && (
                                                <span 
                                                    style={{
                                                        float: 'left',
                                                        fontSize: `${responsiveFontSize * 3.5}px`,
                                                        lineHeight: '0.8',
                                                        fontWeight: 700,
                                                        marginRight: '8px',
                                                        marginTop: '4px',
                                                        color: styles.accent
                                                    }}
                                                    aria-hidden="true"
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

                        {/* Page decoration - bottom */}
                        {!isMobile && (
                            <div 
                                style={{
                                    position: 'absolute',
                                    bottom: '30px',
                                    left: '60px',
                                    right: '60px',
                                    height: '1px',
                                    background: `linear-gradient(to right, transparent, ${styles.accent}, transparent)`,
                                    opacity: 0.3
                                }}
                                aria-hidden="true"
                            />
                        )}

                        {/* Page number */}
                        <div 
                            style={{
                                position: 'absolute',
                                bottom: '15px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                fontSize: '12px',
                                color: styles.secondary,
                                fontFamily: fontFamilyMap[fontFamily] || fontFamilyMap.serif,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                            aria-label={`Page ${currentPage + 1} of ${totalPages}`}
                        >
                            <Book size={12} />
                            <span>{currentPage + 1} / {totalPages}</span>
                        </div>
                    </motion.div>
                </AnimatePresence>

                {/* Navigation Arrows [web:30] */}
                {totalPages > 1 && (
                    <>
                        {/* Previous Page Button */}
                        <button
                            onClick={goToPrevPage}
                            disabled={currentPage === 0}
                            style={{
                                position: 'absolute',
                                left: isMobile ? '-10px' : '-60px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                width: isMobile ? '40px' : '48px',
                                height: isMobile ? '40px' : '48px',
                                borderRadius: '50%',
                                backgroundColor: styles.navBg,
                                backdropFilter: 'blur(10px)',
                                border: `2px solid ${styles.accent}`,
                                boxShadow: `0 4px 12px ${styles.shadow}`,
                                cursor: currentPage === 0 ? 'not-allowed' : 'pointer',
                                opacity: currentPage === 0 ? 0.3 : 1,
                                transition: 'all 0.3s ease',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 10
                            }}
                            aria-label="Previous page"
                            title="Previous page (←)"
                        >
                            <ChevronLeft size={24} color={styles.accent} />
                        </button>

                        {/* Next Page Button */}
                        <button
                            onClick={goToNextPage}
                            disabled={currentPage === totalPages - 1}
                            style={{
                                position: 'absolute',
                                right: isMobile ? '-10px' : '-60px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                width: isMobile ? '40px' : '48px',
                                height: isMobile ? '40px' : '48px',
                                borderRadius: '50%',
                                backgroundColor: styles.navBg,
                                backdropFilter: 'blur(10px)',
                                border: `2px solid ${styles.accent}`,
                                boxShadow: `0 4px 12px ${styles.shadow}`,
                                cursor: currentPage === totalPages - 1 ? 'not-allowed' : 'pointer',
                                opacity: currentPage === totalPages - 1 ? 0.3 : 1,
                                transition: 'all 0.3s ease',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 10
                            }}
                            aria-label="Next page"
                            title="Next page (→)"
                        >
                            <ChevronRight size={24} color={styles.accent} />
                        </button>
                    </>
                )}

                {/* Page Progress Indicator */}
                {totalPages > 1 && !isMobile && (
                    <div
                        style={{
                            marginTop: '24px',
                            display: 'flex',
                            justifyContent: 'center',
                            gap: '6px',
                            flexWrap: 'wrap'
                        }}
                    >
                        {Array.from({ length: Math.min(totalPages, 15) }, (_, i) => {
                            const pageIndex = totalPages <= 15 ? i : 
                                currentPage < 7 ? i :
                                currentPage > totalPages - 8 ? totalPages - 15 + i :
                                currentPage - 7 + i;
                            
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
                                        width: pageIndex === currentPage ? '24px' : '8px',
                                        height: '8px',
                                        borderRadius: '4px',
                                        backgroundColor: pageIndex === currentPage ? styles.accent : styles.secondary,
                                        opacity: pageIndex === currentPage ? 1 : 0.3,
                                        border: 'none',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease'
                                    }}
                                    aria-label={`Go to page ${pageIndex + 1}`}
                                />
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
});

TextViewer.displayName = 'TextViewer';

export default TextViewer;
