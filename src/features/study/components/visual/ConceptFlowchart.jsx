// src/features/study/components/visual/ConceptFlowchart.jsx
import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import { motion } from 'framer-motion';

mermaid.initialize({
    startOnLoad: true,
    theme: 'base',
    themeVariables: {
        primaryColor: '#14b8a6',
        primaryTextColor: '#fff',
        primaryBorderColor: '#0d9488',
        lineColor: '#64748b',
        secondaryColor: '#e2e8f0',
        tertiaryColor: '#f1f5f9',
        fontSize: '16px'
    }
});

const ConceptFlowchart = ({ flowchartCode, title }) => {
    const chartRef = useRef(null);

    useEffect(() => {
        if (chartRef.current && flowchartCode) {
            const renderChart = async () => {
                try {
                    const { svg } = await mermaid.render('mermaid-chart-' + Date.now(), flowchartCode);
                    chartRef.current.innerHTML = svg;
                } catch (error) {
                    console.error('Mermaid render error:', error);
                    chartRef.current.innerHTML = '<p class="text-red-500">Failed to render flowchart</p>';
                }
            };
            renderChart();
        }
    }, [flowchartCode]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-6 shadow-lg border border-slate-200"
        >
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-teal-500" />
                {title || 'Concept Flow'}
            </h3>

            <div
                ref={chartRef}
                className="overflow-x-auto bg-slate-50 rounded-2xl p-6 flex justify-center"
            />
        </motion.div>
    );
};

export default ConceptFlowchart;
