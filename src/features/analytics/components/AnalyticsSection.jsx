// src/features/analytics/components/AnalyticsSection.jsx
// Wrapper that embeds the full Analytics page for Dashboard integration

import React from 'react';
import Analytics from '../pages/Analytics';

/**
 * AnalyticsSection - Used within the Student Dashboard
 * This wraps the full Analytics page component for seamless dashboard integration
 */
const AnalyticsSection = () => {
    return <Analytics embedded={true} />;
};

export default AnalyticsSection;
