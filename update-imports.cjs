// update-imports.js - Automatically update all import paths in moved files
const fs = require('fs');
const path = require('path');

// Import path replacements
const importReplacements = [
    // Config imports
    { from: "from '@/config/firebase'", to: "from '@shared/config/firebase'" },
    { from: "from '@config/firebase'", to: "from '@shared/config/firebase'" },
    { from: "from '../../config/firebase'", to: "from '@shared/config/firebase'" },
    { from: "from '../../../config/firebase'", to: "from '@shared/config/firebase'" },
    { from: "from '../../../../config/firebase'", to: "from '@shared/config/firebase'" },

    // Context imports
    { from: "from '@contexts/AuthContext'", to: "from '@auth/contexts/AuthContext'" },
    { from: "from '@contexts/ClassContext'", to: "from '@classroom/contexts/ClassContext'" },

    // Component imports
    { from: "from '@components/common/", to: "from '@shared/components/" },
    { from: "from '../components/common/", to: "from '@shared/components/" },
    { from: "from '../../components/common/", to: "from '@shared/components/" },
    { from: "from '../../../components/common/", to: "from '@shared/components/" },

    // Utils imports
    { from: "from '@utils/", to: "from '@shared/utils/" },
    { from: "from '../utils/", to: "from '@shared/utils/" },
    { from: "from '../../utils/", to: "from '@shared/utils/" },
    { from: "from '../../../utils/", to: "from '@shared/utils/" },
    { from: "from '../../../../utils/", to: "from '@shared/utils/" },

    // Services - student related
    { from: "from '@services/documentService'", to: "from '@study/services/documentService'" },
    { from: "from '@services/flashcardService'", to: "from '@study/services/flashcardService'" },
    { from: "from '@services/studySessionService'", to: "from '@study/services/studySessionService'" },
    { from: "from '@services/googleTTS'", to: "from '@study/services/googleTTS'" },

    // Services - teacher related
    { from: "from '@services/classService'", to: "from '@teacher/services/classService'" },
    { from: "from '@services/assignmentService'", to: "from '@teacher/services/assignmentService'" },
    { from: "from '@services/quizService'", to: "from '@teacher/services/quizService'" },
    { from: "from '@services/materialService'", to: "from '@teacher/services/materialService'" },

    // Services - analytics
    { from: "from '@services/analyticsService'", to: "from '@analytics/services/analyticsService'" },
    { from: "from '@services/geminiAnalytics'", to: "from '@analytics/services/geminiAnalytics'" },
    { from: "from '@services/bigQueryService'", to: "from '@analytics/services/bigQueryService'" },

    // Services - gamification
    { from: "from '@services/gamificationService'", to: "from '@gamification/services/gamificationService'" },
    { from: "from '@services/challengeService'", to: "from '@gamification/services/challengeService'" },
    { from: "from '@services/aiStudyCoach'", to: "from '@gamification/services/aiStudyCoach'" },

    // Services - classroom
    { from: "from '@services/announcementService'", to: "from '@classroom/services/announcementService'" },

    // Hooks - student
    { from: "from '@hooks/useDashboardData'", to: "from '@student/hooks/useDashboardData'" },
    { from: "from '@hooks/useRecommendations'", to: "from '@student/hooks/useRecommendations'" },
    { from: "from '@hooks/useAIInsights'", to: "from '@student/hooks/useAIInsights'" },

    // Hooks - study
    { from: "from '@hooks/useFocusMode'", to: "from '@study/hooks/useFocusMode'" },
    { from: "from '@hooks/useStudySessionManager'", to: "from '@study/hooks/useStudySessionManager'" },
    { from: "from '@hooks/useWebRTC'", to: "from '@study/hooks/useWebRTC'" },

    // Hooks - analytics
    { from: "from '@hooks/useAnalytics'", to: "from '@analytics/hooks/useAnalytics'" },
    { from: "from '@hooks/useTrends'", to: "from '@analytics/hooks/useTrends'" },

    // Hooks - gamification
    { from: "from '@hooks/useGamification'", to: "from '@gamification/hooks/useGamification'" },
];

function updateImportsInFile(filePath) {
    if (!fs.existsSync(filePath)) {
        return false;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    importReplacements.forEach(({ from, to }) => {
        if (content.includes(from)) {
            content = content.replace(new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), to);
            modified = true;
        }
    });

    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated: ${filePath}`);
        return true;
    }

    return false;
}

function walkDirectory(dir, callback) {
    if (!fs.existsSync(dir)) {
        return;
    }

    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            walkDirectory(filePath, callback);
        } else if (stat.isFile() && (file.endsWith('.js') || file.endsWith('.jsx'))) {
            callback(filePath);
        }
    });
}

console.log('Starting import path updates...\n');

// Update all files in src/features
walkDirectory('./src/features', updateImportsInFile);

// Update App.jsx (already done manually, but just in case)
updateImportsInFile('./src/App.jsx');

// Update main.jsx
updateImportsInFile('./src/main.jsx');

console.log('\nImport path updates completed!');
