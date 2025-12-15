// comprehensive-fix-imports.cjs - Fix ALL old import paths
const fs = require('fs');
const path = require('path');

let filesFixed = 0;
let totalReplacements = 0;

function updateFile(filePath) {
    if (!fs.existsSync(filePath)) {
        return false;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;
    let replacements = 0;

    // Context imports
    content = content.replace(/from ['"](@\/)?contexts\/AuthContext['"]/g, "from '@auth/contexts/AuthContext'");
    content = content.replace(/from ['"](@\/)?contexts\/ClassContext['"]/g, "from '@classroom/contexts/ClassContext'");

    // Config imports
    content = content.replace(/from ['"](@\/)?config\/firebase['"]/g, "from '@shared/config/firebase'");
    content = content.replace(/from ['"](@\/)?config\/gemini['"]/g, "from '@shared/config/gemini'");

    // Component imports - teacher
    content = content.replace(/from ['"]@\/components\/teacher\//g, "from '@teacher/components/dashboard/");

    // Component imports - gamification
    content = content.replace(/from ['"]@\/components\/gamification\//g, "from '@gamification/components/");

    // Component imports - features (student dashboard)
    content = content.replace(/from ['"]@\/components\/features\//g, "from '@student/components/dashboard/");

    // Component imports - study
    content = content.replace(/from ['"]@\/components\/study\//g, "from '@study/components/tools/");

    // Component imports - classroom
    content = content.replace(/from ['"]@\/components\/classroom\//g, "from '@classroom/components/");

    // Component imports - common/shared
    content = content.replace(/from ['"]@\/components\/common\//g, "from '@shared/components/");

    // Service imports - study
    content = content.replace(/from ['"]@\/services\/documentService['"]/g, "from '@study/services/documentService'");
    content = content.replace(/from ['"]@\/services\/flashcardService['"]/g, "from '@study/services/flashcardService'");
    content = content.replace(/from ['"]@\/services\/studySessionService['"]/g, "from '@study/services/studySessionService'");
    content = content.replace(/from ['"]@\/services\/googleTTS['"]/g, "from '@study/services/googleTTS'");

    // Service imports - teacher
    content = content.replace(/from ['"]@\/services\/classService['"]/g, "from '@teacher/services/classService'");
    content = content.replace(/from ['"]@\/services\/assignmentService['"]/g, "from '@teacher/services/assignmentService'");
    content = content.replace(/from ['"]@\/services\/quizService['"]/g, "from '@teacher/services/quizService'");
    content = content.replace(/from ['"]@\/services\/materialService['"]/g, "from '@teacher/services/materialService'");

    // Service imports - analytics
    content = content.replace(/from ['"]@\/services\/analyticsService['"]/g, "from '@analytics/services/analyticsService'");
    content = content.replace(/from ['"]@\/services\/geminiAnalytics['"]/g, "from '@analytics/services/geminiAnalytics'");
    content = content.replace(/from ['"]@\/services\/bigQueryService['"]/g, "from '@analytics/services/bigQueryService'");

    // Service imports - gamification
    content = content.replace(/from ['"]@\/services\/gamificationService['"]/g, "from '@gamification/services/gamificationService'");
    content = content.replace(/from ['"]@\/services\/challengeService['"]/g, "from '@gamification/services/challengeService'");
    content = content.replace(/from ['"]@\/services\/aiStudyCoach['"]/g, "from '@gamification/services/aiStudyCoach'");

    // Service imports - classroom
    content = content.replace(/from ['"]@\/services\/announcementService['"]/g, "from '@classroom/services/announcementService'");

    // Hooks - student
    content = content.replace(/from ['"]@\/hooks\/useDashboardData['"]/g, "from '@student/hooks/useDashboardData'");
    content = content.replace(/from ['"]@\/hooks\/useRecommendations['"]/g, "from '@student/hooks/useRecommendations'");
    content = content.replace(/from ['"]@\/hooks\/useAIInsights['"]/g, "from '@student/hooks/useAIInsights'");

    // Hooks - study
    content = content.replace(/from ['"]@\/hooks\/useFocusMode['"]/g, "from '@study/hooks/useFocusMode'");
    content = content.replace(/from ['"]@\/hooks\/useStudySessionManager['"]/g, "from '@study/hooks/useStudySessionManager'");
    content = content.replace(/from ['"]@\/hooks\/useWebRTC['"]/g, "from '@study/hooks/useWebRTC'");

    // Hooks - analytics
    content = content.replace(/from ['"]@\/hooks\/useAnalytics['"]/g, "from '@analytics/hooks/useAnalytics'");
    content = content.replace(/from ['"]@\/hooks\/useTrends['"]/g, "from '@analytics/hooks/useTrends'");

    // Hooks - gamification
    content = content.replace(/from ['"]@\/hooks\/useGamification['"]/g, "from '@gamification/hooks/useGamification'");

    // Utils imports
    content = content.replace(/from ['"]@\/utils\/idGenerator['"]/g, "from '@shared/utils/idGenerator'");
    content = content.replace(/from ['"]@\/utils\/helpers['"]/g, "from '@shared/utils/helpers'");
    content = content.replace(/from ['"]@\/utils\/vertexAI['"]/g, "from '@shared/utils/vertexAI'");
    content = content.replace(/from ['"](@\/)?utils\/useSessionCleanup['"]/g, "from '@shared/utils/sessionCleanup'");

    // Helpers imports
    content = content.replace(/from ['"]@\/helpers\/subjectDetection['"]/g, "from '@shared/utils/subjectDetection'");

    // Asset imports - keep as is but ensure they use @assets alias
    content = content.replace(/from ['"]@\/assets\//g, "from '@assets/");

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        filesFixed++;
        console.log(`Fixed: ${filePath}`);
        return true;
    }

    return false;
}

function walkDirectory(dir) {
    if (!fs.existsSync(dir)) {
        return;
    }

    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            walkDirectory(filePath);
        } else if (stat.isFile() && (file.endsWith('.js') || file.endsWith('.jsx'))) {
            updateFile(filePath);
        }
    });
}

console.log('Comprehensively fixing ALL import paths...\n');

walkDirectory('./src/features');
walkDirectory('./src/shared');
updateFile('./src/App.jsx');

console.log(`\n✅ Fixed ${filesFixed} files!`);
