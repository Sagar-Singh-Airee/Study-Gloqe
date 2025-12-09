// src/helpers/subjectDetection.js - AI-Based Subject Detection
// Shared helper for categorizing content by subject

/**
 * Detect subject from quiz content using keyword analysis
 * Same logic as documentService.js for consistency
 */
export const detectSubjectFromContent = (text) => {
    if (!text || text.length < 10) {
        return { subject: 'General', confidence: 0 };
    }

    const subjects = {
        'Mathematics': [
            'equation', 'theorem', 'calculus', 'algebra', 'geometry', 'derivative',
            'integral', 'matrix', 'function', 'proof', 'polynomial', 'trigonometry',
            'vector', 'limit', 'solve', 'calculate', 'formula', 'number'
        ],
        'Physics': [
            'force', 'energy', 'momentum', 'velocity', 'acceleration', 'quantum',
            'newton', 'gravity', 'wave', 'particle', 'motion', 'thermodynamics',
            'electromagnetic', 'kinetic', 'potential', 'mass', 'speed'
        ],
        'Chemistry': [
            'molecule', 'atom', 'reaction', 'compound', 'element', 'acid', 'base',
            'electron', 'bond', 'periodic', 'chemical', 'solution', 'oxidation',
            'reduction', 'ion', 'catalyst', 'organic'
        ],
        'Biology': [
            'cell', 'organism', 'evolution', 'gene', 'protein', 'DNA', 'species',
            'tissue', 'enzyme', 'bacteria', 'mitochondria', 'photosynthesis',
            'chromosome', 'mutation', 'membrane', 'nucleus'
        ],
        'Computer Science': [
            'algorithm', 'programming', 'database', 'software', 'code', 'data structure',
            'function', 'class', 'variable', 'loop', 'array', 'compile', 'syntax',
            'binary', 'recursion', 'debugging', 'API'
        ],
        'History': [
            'century', 'war', 'empire', 'revolution', 'ancient', 'medieval', 'dynasty',
            'civilization', 'treaty', 'battle', 'kingdom', 'colonial', 'historical',
            'era', 'period'
        ],
        'Economics': [
            'market', 'supply', 'demand', 'economy', 'trade', 'inflation', 'GDP',
            'capitalism', 'investment', 'revenue', 'fiscal', 'monetary', 'economic',
            'price', 'cost', 'profit'
        ],
        'Literature': [
            'novel', 'poem', 'author', 'character', 'narrative', 'metaphor', 'plot',
            'theme', 'protagonist', 'verse', 'poetry', 'literary', 'prose',
            'symbolism', 'story'
        ],
        'Psychology': [
            'behavior', 'cognitive', 'mental', 'therapy', 'consciousness', 'emotion',
            'brain', 'perception', 'personality', 'disorder', 'psychological',
            'neuroscience', 'anxiety', 'depression', 'memory'
        ],
        'Engineering': [
            'design', 'circuit', 'mechanical', 'electrical', 'system', 'structure',
            'load', 'stress', 'material', 'engineering', 'CAD', 'blueprint',
            'manufacturing', 'assembly', 'build'
        ]
    };

    let maxScore = 0;
    let detectedSubject = 'General';
    const lowerText = text.toLowerCase();

    for (const [subject, keywords] of Object.entries(subjects)) {
        let score = 0;
        keywords.forEach(keyword => {
            const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
            const matches = lowerText.match(regex);
            if (matches) score += matches.length;
        });

        if (score > maxScore) {
            maxScore = score;
            detectedSubject = subject;
        }
    }

    return { subject: detectedSubject, confidence: maxScore };
};

/**
 * Detect subject from quiz title (fallback method)
 */
export const detectSubjectFromTitle = (title) => {
    if (!title) return 'General';

    const lowerTitle = title.toLowerCase();

    const subjectPatterns = {
        'Mathematics': ['math', 'calculus', 'algebra', 'geometry', 'trigonometry', 'arithmetic'],
        'Physics': ['physics', 'mechanics', 'quantum', 'thermodynamics', 'optics'],
        'Chemistry': ['chemistry', 'organic', 'inorganic', 'chemical', 'chem'],
        'Biology': ['biology', 'genetics', 'anatomy', 'botany', 'zoology', 'bio'],
        'Computer Science': ['cs', 'programming', 'algorithm', 'software', 'coding', 'python', 'java', 'javascript'],
        'Engineering': ['engineering', 'mechanical', 'electrical', 'civil', 'structural'],
        'Economics': ['economics', 'macro', 'micro', 'finance', 'econ'],
        'History': ['history', 'historical', 'world history', 'ancient'],
        'Literature': ['literature', 'english', 'novel', 'poetry', 'lit'],
        'Psychology': ['psychology', 'psych', 'cognitive', 'behavioral']
    };

    for (const [subject, patterns] of Object.entries(subjectPatterns)) {
        if (patterns.some(pattern => lowerTitle.includes(pattern))) {
            return subject;
        }
    }

    return 'General';
};

/**
 * Intelligently categorize a quiz session
 * Priority: manual subject > AI detection > title detection > default
 */
export const categorizeQuizSession = (session) => {
    // 1. Check if subject is already set
    if (session.subject && session.subject !== 'General Studies' && session.subject !== 'General') {
        return session.subject;
    }

    // 2. Try AI detection from quiz questions
    if (session.questions && Array.isArray(session.questions)) {
        const questionsText = session.questions
            .map(q => `${q.question || ''} ${q.options?.join(' ') || ''}`)
            .join(' ');

        if (questionsText.length > 50) {
            const result = detectSubjectFromContent(questionsText);
            if (result.confidence > 3) {
                return result.subject;
            }
        }
    }

    // 3. Try title detection
    const titleFromQuiz = session.quizTitle || session.title || session.documentTitle || '';
    if (titleFromQuiz) {
        const detectedFromTitle = detectSubjectFromTitle(titleFromQuiz);
        if (detectedFromTitle !== 'General') {
            return detectedFromTitle;
        }
    }

    // 4. Default
    return 'General';
};
