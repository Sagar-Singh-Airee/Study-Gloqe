// src/components/study/TextViewer.jsx
import { forwardRef } from 'react';

const TextViewer = forwardRef(({ text, fontSize, onTextSelect, highlights }, ref) => {
    return (
        <div
            ref={ref}
            className="prose prose-lg max-w-none"
            style={{ fontSize: `${fontSize}px`, lineHeight: '1.8' }}
            onMouseUp={onTextSelect}
        >
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
                {text.split('\n\n').map((paragraph, idx) => (
                    <p key={idx} className="mb-4 text-gray-800 select-text">
                        {paragraph}
                    </p>
                ))}
            </div>
        </div>
    );
});

TextViewer.displayName = 'TextViewer';

export default TextViewer;
