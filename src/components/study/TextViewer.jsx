// src/components/study/TextViewer.jsx - FIXED
import { forwardRef, useMemo } from 'react';
import { motion } from 'framer-motion';

const TextViewer = forwardRef(({ 
    text, 
    fontSize = 18, 
    lineHeight = 1.8,
    fontFamily = 'serif',
    readingMode = 'light',
    onTextSelect, 
    highlights = [] 
}, ref) => {
    
    // Parse text into structured paragraphs
    const paragraphs = useMemo(() => {
        if (!text) return [];
        
        return text
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map((paragraph, index) => ({
                id: index,
                content: paragraph,
                isHeading: /^#{1,6}\s/.test(paragraph) || (paragraph.length < 60 && paragraph.endsWith(':')),
                isListItem: /^[\-\*\•]\s/.test(paragraph) || /^\d+\.\s/.test(paragraph),
                isCodeBlock: paragraph.startsWith('```')
            }));
    }, [text]);

    // Get reading mode styles
    const getModeStyles = () => {
        switch (readingMode) {
            case 'dark':
                return {
                    bg: 'bg-gradient-to-br from-gray-900 via-gray-950 to-black',
                    text: 'text-gray-100',
                    secondary: 'text-gray-400',
                    border: 'border-gray-800',
                    selection: 'selection:bg-blue-500/30',
                    cardBg: 'bg-gray-900/50',
                    cardBorder: 'border-gray-800/50'
                };
            case 'sepia':
                return {
                    bg: 'bg-gradient-to-br from-[#f4ecd8] via-[#f5ead0] to-[#f9f3e3]',
                    text: 'text-[#3d3229]',
                    secondary: 'text-[#6d5d4f]',
                    border: 'border-[#e0d5bb]',
                    selection: 'selection:bg-amber-500/30',
                    cardBg: 'bg-[#faf6ea]/80',
                    cardBorder: 'border-[#e8dfc8]'
                };
            case 'focus':
                return {
                    bg: 'bg-black',
                    text: 'text-gray-300',
                    secondary: 'text-gray-500',
                    border: 'border-gray-900',
                    selection: 'selection:bg-gray-700/50',
                    cardBg: 'bg-transparent',
                    cardBorder: 'border-transparent'
                };
            default: // light
                return {
                    bg: 'bg-gradient-to-br from-white via-gray-50 to-white',
                    text: 'text-gray-900',
                    secondary: 'text-gray-600',
                    border: 'border-gray-200',
                    selection: 'selection:bg-blue-400/30',
                    cardBg: 'bg-white/80',
                    cardBorder: 'border-gray-200/50'
                };
        }
    };

    const getFontClass = () => {
        switch (fontFamily) {
            case 'sans':
                return 'font-sans';
            case 'mono':
                return 'font-mono';
            default:
                return 'font-serif';
        }
    };

    const modeStyles = getModeStyles();

    const renderParagraph = (paragraph) => {
        const { id, content, isHeading, isListItem, isCodeBlock } = paragraph;

        // Apply highlights if any
        let displayContent = content;
        highlights.forEach((highlight) => {
            if (content.includes(highlight.text)) {
                displayContent = content.replace(
                    highlight.text,
                    `<mark class="bg-yellow-200 dark:bg-yellow-500/30 px-1 rounded">${highlight.text}</mark>`
                );
            }
        });

        // Render heading
        if (isHeading) {
            return (
                <motion.h3
                    key={id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: id * 0.02 }}
                    className={`text-xl md:text-2xl font-black mb-6 mt-8 ${modeStyles.text} tracking-tight`}
                    dangerouslySetInnerHTML={{ __html: displayContent.replace(/^#{1,6}\s/, '') }}
                />
            );
        }

        // Render list item
        if (isListItem) {
            return (
                <motion.li
                    key={id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: id * 0.02 }}
                    className={`mb-3 pl-2 ${modeStyles.text} leading-relaxed`}
                    dangerouslySetInnerHTML={{ 
                        __html: displayContent
                            .replace(/^[\-\*\•]\s/, '')
                            .replace(/^\d+\.\s/, '') 
                    }}
                />
            );
        }

        // Render code block
        if (isCodeBlock) {
            return (
                <motion.pre
                    key={id}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: id * 0.02 }}
                    className={`mb-6 p-4 rounded-xl ${
                        readingMode === 'dark' ? 'bg-black/50' : 'bg-gray-100'
                    } border ${modeStyles.border} overflow-x-auto`}
                >
                    <code className={`text-sm ${modeStyles.text} font-mono`}>
                        {displayContent.replace(/```/g, '')}
                    </code>
                </motion.pre>
            );
        }

        // Render normal paragraph
        return (
            <motion.p
                key={id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: id * 0.01 }}
                className={`mb-6 ${modeStyles.text} leading-relaxed font-medium tracking-wide first-letter:text-4xl first-letter:font-bold first-letter:mr-1 ${
                    id === 0 ? 'first-letter:float-left first-letter:leading-[0.9]' : ''
                }`}
                style={{ 
                    textAlign: 'justify',
                    hyphens: 'auto',
                    wordSpacing: '0.05em'
                }}
                dangerouslySetInnerHTML={{ __html: displayContent }}
            />
        );
    };

    return (
        <div
            ref={ref}
            className={`w-full ${modeStyles.bg} transition-colors duration-300`}
            onMouseUp={onTextSelect}
        >
            <div 
                className={`max-w-4xl mx-auto ${modeStyles.cardBg} backdrop-blur-sm rounded-3xl p-8 md:p-12 lg:p-16 shadow-2xl border ${modeStyles.cardBorder} transition-all duration-300`}
            >
                <article
                    className={`${getFontClass()} ${modeStyles.selection} antialiased`}
                    style={{
                        fontSize: `${fontSize}px`,
                        lineHeight: lineHeight,
                        textRendering: 'optimizeLegibility',
                        WebkitFontSmoothing: 'antialiased',
                        MozOsxFontSmoothing: 'grayscale',
                    }}
                >
                    {/* Document Start Indicator */}
                    <div className={`h-1 w-16 ${
                        readingMode === 'dark' ? 'bg-blue-500' : 'bg-gray-900'
                    } rounded-full mb-8`} />

                    {paragraphs.map((paragraph) => renderParagraph(paragraph))}

                    {/* Document End Indicator */}
                    <div className={`flex items-center justify-center mt-12 pt-8 border-t ${modeStyles.border}`}>
                        <div className={`flex gap-2 items-center ${modeStyles.secondary}`}>
                            <div className="w-2 h-2 rounded-full bg-current opacity-60" />
                            <div className="w-2 h-2 rounded-full bg-current opacity-40" />
                            <div className="w-2 h-2 rounded-full bg-current opacity-20" />
                        </div>
                    </div>

                    {/* Word Count Footer */}
                    <div className={`text-center mt-8 ${modeStyles.secondary} text-sm font-semibold`}>
                        {text ? text.split(/\s+/).length.toLocaleString() : 0} words • {text ? Math.ceil(text.split(/\s+/).length / 200) : 0} min read
                    </div>
                </article>
            </div>
        </div>
    );
});

TextViewer.displayName = 'TextViewer';

export default TextViewer;