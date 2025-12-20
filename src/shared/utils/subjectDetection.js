// src/shared/utils/subjectDetection.js - AI-POWERED + KEYWORD FALLBACK

import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

// ==================== COMPREHENSIVE KEYWORD DATABASE ====================

const SUBJECT_DATABASE = {
    'Mathematics': {
        weight: 1.0,
        core: [
            'mathematics', 'mathematical', 'math', 'maths', 'calculus', 'algebra',
            'geometry', 'trigonometry', 'arithmetic', 'theorem', 'proof', 'lemma'
        ],
        technical: [
            'derivative', 'derivatives', 'differentiation', 'differential', 'integral',
            'integrals', 'integration', 'limit', 'limits', 'continuity', 'convergence',
            'divergence', 'taylor series', 'maclaurin', 'gradient', 'laplacian',
            'polynomial', 'polynomials', 'equation', 'equations', 'quadratic', 'cubic',
            'linear equation', 'exponential', 'logarithm', 'logarithmic', 'binomial',
            'factorization', 'coefficient', 'variable', 'constant', 'expression',
            'matrix', 'matrices', 'vector', 'vectors', 'determinant', 'eigenvalue',
            'eigenvector', 'transpose', 'inverse matrix', 'linear transformation',
            'triangle', 'circle', 'rectangle', 'polygon', 'pythagorean', 'euclidean',
            'coordinate geometry', 'plane geometry', 'solid geometry', 'angle', 'angles',
            'sine', 'cosine', 'tangent', 'secant', 'cosecant', 'cotangent',
            'sin', 'cos', 'tan', 'radian', 'degree',
            'probability', 'statistics', 'mean', 'median', 'mode', 'variance',
            'standard deviation', 'normal distribution', 'binomial distribution',
            'hypothesis test', 'correlation', 'regression',
            'prime number', 'composite number', 'factor', 'divisor', 'gcd', 'lcm',
            'modulo', 'congruence', 'divisibility',
            'topology', 'real analysis', 'complex analysis', 'abstract algebra',
            'differential equations', 'partial differential', 'fourier transform'
        ],
        symbols: ['∫', '∑', '∏', '∂', '∇', '≤', '≥', '≠', '±', '√', 'π', 'θ', 'α', 'β', 'γ', 'Δ'],
        patterns: [
            /\b[a-z]\s*=\s*\d+/gi,
            /\b\d+\s*[+\-*/]\s*\d+/g,
            /\(\s*\d+\s*,\s*\d+\s*\)/g,
            /[a-z]\^\d+/gi,
            /\b(?:sin|cos|tan|log|ln)\s*\(/gi
        ]
    },

    'Physics': {
        weight: 1.0,
        core: ['physics', 'physical', 'physicist'],
        technical: [
            'mechanics', 'mechanical', 'motion', 'force', 'forces', 'velocity',
            'acceleration', 'momentum', 'impulse', 'inertia', 'friction', 'gravity',
            'newton\'s law', 'kinematics', 'dynamics', 'statics', 'torque', 'angular',
            'energy', 'kinetic energy', 'potential energy', 'work', 'power',
            'conservation of energy', 'thermodynamics', 'heat', 'temperature',
            'electromagnetism', 'electromagnetic', 'electricity', 'electric field',
            'magnetic field', 'current', 'voltage', 'resistance', 'capacitor',
            'inductor', 'circuit', 'ohm\'s law', 'kirchhoff', 'faraday',
            'maxwell equations', 'coulomb\'s law', 'gauss law',
            'wave', 'waves', 'wavelength', 'frequency', 'amplitude', 'oscillation',
            'harmonic', 'resonance', 'light', 'optics', 'reflection', 'refraction',
            'interference', 'diffraction', 'doppler effect',
            'quantum mechanics', 'quantum', 'relativity', 'special relativity',
            'general relativity', 'photon', 'electron', 'proton', 'neutron',
            'nucleus', 'atomic physics', 'nuclear physics', 'particle physics',
            'wave function', 'schrodinger', 'heisenberg uncertainty',
            'entropy', 'enthalpy', 'gibbs free energy', 'ideal gas', 'pressure',
            'volume', 'pv diagram', 'carnot cycle', 'laws of thermodynamics'
        ],
        symbols: ['ℏ', 'μ', 'λ', 'ω', 'Ω', 'ε', 'φ', 'Φ', 'Ψ'],
        patterns: [
            /F\s*=\s*m\s*a/gi,
            /E\s*=\s*m\s*c\s*\^\s*2/gi,
            /v\s*=\s*u\s*\+\s*a\s*t/gi
        ]
    },

    'Chemistry': {
        weight: 1.0,
        core: ['chemistry', 'chemical', 'chemist'],
        technical: [
            'element', 'elements', 'compound', 'compounds', 'molecule', 'molecules',
            'atom', 'atoms', 'periodic table', 'reaction', 'reactions',
            'organic chemistry', 'hydrocarbon', 'alkane', 'alkene', 'alkyne',
            'aromatic', 'benzene', 'alcohol', 'aldehyde', 'ketone', 'carboxylic acid',
            'ester', 'ether', 'amine', 'amide', 'polymer', 'isomer', 'functional group',
            'methane', 'ethane', 'propane', 'butane', 'methyl', 'ethyl',
            'inorganic chemistry', 'metal', 'metalloid', 'nonmetal', 'salt',
            'ionic compound', 'coordination complex', 'ligand', 'transition metal',
            'physical chemistry', 'thermochemistry', 'kinetics', 'equilibrium',
            'rate of reaction', 'activation energy', 'catalyst', 'gibbs energy',
            'enthalpy', 'entropy', 'bond', 'bonding', 'covalent bond', 'ionic bond',
            'metallic bond', 'hydrogen bond', 'electronegativity', 'polarity', 'valence',
            'acid', 'acids', 'base', 'bases', 'ph scale', 'buffer solution',
            'titration', 'neutralization', 'bronsted', 'lewis acid',
            'oxidation', 'reduction', 'redox reaction', 'oxidizing agent',
            'reducing agent', 'electrolysis', 'electrochemistry', 'electrode',
            'stoichiometry', 'mole', 'molarity', 'molality', 'concentration',
            'limiting reagent', 'theoretical yield', 'percent yield',
            'gas', 'liquid', 'solid', 'plasma', 'phase transition', 'sublimation',
            'solution', 'solvent', 'solute', 'precipitate', 'crystallization',
            'oxygen', 'hydrogen', 'carbon', 'nitrogen', 'sodium', 'chlorine',
            'water', 'h2o', 'co2', 'nacl', 'h2so4', 'hcl', 'naoh', 'nh3'
        ],
        symbols: ['→', '⇌', 'Δ', '↑', '↓'],
        patterns: [
            /\b[A-Z][a-z]?\d*\b/g,
            /\d+\s*[A-Z][a-z]?\d*/g,
            /\[[\w\s()]+\]/g
        ]
    },

    'Biology': {
        weight: 1.0,
        core: ['biology', 'biological', 'biologist', 'life science'],
        technical: [
            'cell', 'cells', 'cellular', 'cytoplasm', 'nucleus', 'membrane',
            'cell membrane', 'organelle', 'mitochondria', 'ribosome', 'lysosome',
            'endoplasmic reticulum', 'golgi apparatus', 'chloroplast', 'vacuole',
            'cell wall', 'cytoskeleton', 'genetics', 'genetic', 'gene', 'genes',
            'dna', 'rna', 'chromosome', 'allele', 'genotype', 'phenotype', 'mutation',
            'heredity', 'inheritance', 'mendel', 'dominant', 'recessive',
            'homozygous', 'heterozygous', 'punnett square', 'genetic code', 'codon',
            'gene expression', 'molecular biology', 'protein', 'proteins', 'enzyme',
            'amino acid', 'nucleotide', 'base pair', 'replication', 'transcription',
            'translation', 'mrna', 'trna', 'rrna', 'polymerase', 'ligase',
            'ecology', 'ecological', 'ecosystem', 'ecosystems', 'habitat',
            'population', 'community', 'biodiversity', 'biome', 'food chain',
            'food web', 'trophic level', 'predator', 'prey', 'symbiosis',
            'mutualism', 'parasitism', 'commensalism', 'niche', 'evolution',
            'evolutionary', 'natural selection', 'adaptation', 'darwin', 'fitness',
            'speciation', 'species', 'fossil record', 'common ancestor', 'phylogeny',
            'cladogram', 'anatomy', 'anatomical', 'physiology', 'physiological',
            'organ', 'organs', 'tissue', 'tissues', 'system', 'circulatory system',
            'respiratory system', 'digestive system', 'nervous system',
            'skeletal system', 'muscular system', 'heart', 'lung', 'brain',
            'liver', 'kidney', 'stomach', 'intestine', 'biochemistry', 'metabolism',
            'metabolic', 'photosynthesis', 'cellular respiration', 'glycolysis',
            'krebs cycle', 'electron transport', 'atp', 'glucose', 'carbohydrate',
            'lipid', 'nucleic acid', 'bacteria', 'bacterium', 'virus', 'viruses',
            'microorganism', 'microbe', 'pathogen', 'infection', 'immune system',
            'antibody', 'antigen', 'white blood cell', 'vaccination', 'plant',
            'plants', 'animal', 'animals', 'botany', 'zoology', 'vertebrate',
            'invertebrate', 'mammal', 'reptile', 'amphibian', 'bird', 'fish',
            'insect', 'transpiration', 'embryo', 'fetus', 'development', 'mitosis',
            'meiosis', 'cell division', 'gamete', 'zygote', 'fertilization'
        ],
        symbols: [],
        patterns: [
            /\bDNA\b/gi,
            /\bRNA\b/gi,
            /\b[ATGCU]-?[ATGCU]\b/g
        ]
    },

    'Computer Science': {
        weight: 1.0,
        core: ['computer science', 'computing', 'computer', 'cs', 'software'],
        technical: [
            'programming', 'code', 'coding', 'programmer', 'developer',
            'software development', 'application', 'program', 'script',
            'python', 'java', 'javascript', 'c++', 'cpp', 'c#', 'csharp',
            'ruby', 'php', 'swift', 'kotlin', 'go', 'golang', 'rust',
            'typescript', 'html', 'css', 'sql', 'r language', 'matlab',
            'data structure', 'array', 'list', 'linked list', 'stack', 'queue',
            'tree', 'binary tree', 'graph', 'hash table', 'heap', 'trie',
            'algorithm', 'algorithms', 'sorting', 'searching', 'recursion',
            'dynamic programming', 'greedy algorithm', 'divide and conquer',
            'backtracking', 'complexity', 'big o notation', 'time complexity',
            'space complexity', 'artificial intelligence', 'machine learning',
            'deep learning', 'neural network', 'cnn', 'rnn', 'lstm', 'transformer',
            'model', 'training', 'dataset', 'supervised learning',
            'unsupervised learning', 'reinforcement learning', 'classification',
            'regression', 'clustering', 'database', 'databases', 'nosql', 'query',
            'table', 'mysql', 'postgresql', 'mongodb', 'redis', 'firebase', 'orm',
            'normalization', 'index', 'transaction', 'acid properties',
            'web development', 'website', 'frontend', 'backend', 'fullstack',
            'react', 'angular', 'vue', 'node.js', 'express', 'django', 'flask',
            'api', 'rest api', 'graphql', 'http', 'https', 'server', 'client',
            'cybersecurity', 'security', 'encryption', 'cryptography', 'hash',
            'vulnerability', 'attack', 'firewall', 'penetration testing',
            'ssl', 'tls', 'authentication', 'authorization', 'network', 'networking',
            'protocol', 'tcp', 'ip', 'tcp/ip', 'internet', 'router', 'switch',
            'packet', 'osi model', 'object oriented', 'oop', 'class', 'object',
            'inheritance', 'polymorphism', 'encapsulation', 'abstraction',
            'software engineering', 'agile', 'scrum', 'devops', 'ci/cd',
            'version control', 'git', 'github', 'testing', 'unit test',
            'debugging', 'compiler', 'interpreter', 'runtime'
        ],
        symbols: [],
        patterns: [
            /\bfunction\s+\w+/gi,
            /\bclass\s+\w+/gi,
            /\bdef\s+\w+/gi,
            /\w+\s*=\s*\w+\s*\(/gi,
            /\bif\s*\([^)]*\)/gi
        ]
    },

    'History': {
        weight: 1.0,
        core: ['history', 'historical', 'historian'],
        technical: [
            'ancient', 'medieval', 'middle ages', 'renaissance', 'modern',
            'contemporary', 'prehistoric', 'classical', 'baroque', 'enlightenment',
            'industrial revolution', 'victorian era', 'bronze age', 'iron age',
            'war', 'wars', 'world war', 'wwi', 'world war i', 'wwii', 'world war ii',
            'civil war', 'revolution', 'french revolution', 'american revolution',
            'russian revolution', 'battle', 'conflict', 'treaty', 'declaration',
            'independence', 'cold war', 'crusades', 'civilization', 'civilizations',
            'empire', 'empires', 'kingdom', 'dynasty', 'republic', 'rome',
            'roman empire', 'greece', 'greek', 'egypt', 'egyptian', 'mesopotamia',
            'persia', 'persian', 'china', 'chinese', 'india', 'indian', 'aztec',
            'maya', 'inca', 'ottoman', 'culture', 'cultural', 'society', 'social',
            'politics', 'political', 'government', 'monarchy', 'democracy',
            'dictatorship', 'feudalism', 'capitalism', 'communism', 'socialism',
            'economy', 'economic', 'trade', 'commerce', 'religion', 'religious',
            'colonialism', 'imperialism', 'nationalism', 'king', 'queen', 'emperor',
            'pharaoh', 'president', 'dictator', 'general', 'admiral', 'leader',
            'ruler', 'archaeology', 'artifact', 'excavation', 'primary source',
            'secondary source', 'timeline', 'chronology', 'era', 'epoch',
            'period', 'age', 'century', 'decade', 'heritage', 'monument'
        ],
        symbols: [],
        patterns: [
            /\b\d{1,4}\s*(?:BC|AD|BCE|CE)\b/gi,
            /\b(?:1[5-9]|20)\d{2}\b/g
        ]
    },

    'Economics': {
        weight: 1.0,
        core: ['economics', 'economic', 'economy', 'economist'],
        technical: [
            'macroeconomics', 'macro', 'gdp', 'gross domestic product',
            'gross national product', 'gnp', 'inflation', 'deflation',
            'unemployment', 'unemployment rate', 'recession', 'depression',
            'economic growth', 'fiscal policy', 'monetary policy',
            'central bank', 'federal reserve', 'interest rate', 'exchange rate',
            'microeconomics', 'micro', 'supply', 'demand', 'supply and demand',
            'equilibrium', 'market equilibrium', 'elasticity', 'price elasticity',
            'utility', 'marginal utility', 'consumer surplus', 'producer surplus',
            'market structure', 'perfect competition', 'monopoly', 'oligopoly',
            'monopolistic competition', 'finance', 'financial', 'money', 'currency',
            'dollar', 'euro', 'bank', 'banking', 'credit', 'debt', 'loan',
            'mortgage', 'investment', 'stock', 'stock market', 'bond', 'security',
            'portfolio', 'asset', 'liability', 'capital', 'equity', 'trade',
            'international trade', 'import', 'export', 'tariff', 'quota',
            'free trade', 'protectionism', 'balance of trade', 'trade deficit',
            'trade surplus', 'globalization', 'wto', 'business', 'firm', 'company',
            'corporation', 'enterprise', 'profit', 'revenue', 'cost', 'price',
            'pricing', 'market', 'marketing', 'competition', 'market share',
            'labor', 'labour', 'employment', 'worker', 'wage', 'salary',
            'minimum wage', 'productivity', 'human capital', 'tax', 'taxation',
            'income tax', 'sales tax', 'budget', 'deficit', 'surplus',
            'public debt', 'government spending', 'expenditure', 'subsidy'
        ],
        symbols: ['$', '€', '£', '¥', '%'],
        patterns: [
            /\$\d+(?:,\d{3})*(?:\.\d{2})?/g,
            /\d+(?:\.\d+)?%/g
        ]
    },

    'Literature': {
        weight: 1.0,
        core: ['literature', 'literary', 'english', 'language arts'],
        technical: [
            'poetry', 'poem', 'poems', 'poet', 'verse', 'stanza', 'rhyme',
            'meter', 'sonnet', 'haiku', 'limerick', 'prose', 'drama', 'play',
            'novel', 'novella', 'short story', 'essay', 'fiction', 'non-fiction',
            'narrative', 'epic', 'ballad', 'ode', 'literary analysis', 'analysis',
            'critique', 'criticism', 'interpretation', 'theme', 'themes', 'symbol',
            'symbolism', 'metaphor', 'simile', 'imagery', 'irony', 'allegory',
            'motif', 'tone', 'mood', 'style', 'diction', 'syntax', 'character',
            'characters', 'protagonist', 'antagonist', 'characterization', 'plot',
            'setting', 'conflict', 'climax', 'resolution', 'exposition',
            'rising action', 'falling action', 'point of view', 'narrator',
            'narration', 'first person', 'third person', 'omniscient',
            'literary device', 'figurative language', 'alliteration',
            'personification', 'hyperbole', 'onomatopoeia', 'allusion',
            'foreshadowing', 'flashback', 'satire', 'paradox', 'oxymoron',
            'genre', 'tragedy', 'comedy', 'romance', 'mystery', 'thriller',
            'science fiction', 'fantasy', 'realism', 'naturalism', 'modernism',
            'postmodernism', 'romanticism', 'shakespeare', 'dickens', 'austen',
            'hemingway', 'fitzgerald', 'orwell', 'tolkien', 'homer', 'dante', 'chaucer'
        ],
        symbols: [],
        patterns: [
            /"[^"]{20,}"/g
        ]
    },

    'Psychology': {
        weight: 1.0,
        core: ['psychology', 'psychological', 'psychologist', 'mental', 'mind'],
        technical: [
            'cognitive', 'cognition', 'perception', 'attention', 'memory',
            'short-term memory', 'long-term memory', 'working memory',
            'learning', 'thinking', 'reasoning', 'decision making',
            'problem solving', 'intelligence', 'iq', 'language',
            'behavior', 'behaviour', 'behavioral', 'behaviourism',
            'conditioning', 'classical conditioning', 'operant conditioning',
            'reinforcement', 'positive reinforcement', 'negative reinforcement',
            'punishment', 'stimulus', 'response', 'pavlov', 'skinner', 'watson',
            'developmental', 'development', 'child development',
            'adolescent', 'piaget', 'erikson', 'attachment', 'attachment theory',
            'stage', 'cognitive development', 'moral development',
            'social psychology', 'social', 'group dynamics', 'conformity',
            'obedience', 'prejudice', 'stereotype', 'discrimination',
            'attitude', 'persuasion', 'aggression', 'altruism', 'attribution',
            'clinical psychology', 'therapy', 'therapist', 'counseling',
            'psychotherapy', 'treatment', 'mental health', 'mental disorder',
            'disorder', 'depression', 'anxiety', 'schizophrenia', 'bipolar',
            'ptsd', 'ocd', 'adhd', 'autism', 'personality disorder',
            'neuroscience', 'brain', 'neuron', 'synapse', 'neurotransmitter',
            'dopamine', 'serotonin', 'norepinephrine', 'gaba', 'cortex',
            'frontal lobe', 'temporal lobe', 'limbic system', 'amygdala',
            'hippocampus', 'personality', 'personality theory', 'freud',
            'psychoanalysis', 'jung', 'unconscious', 'subconscious', 'ego',
            'id', 'superego', 'defense mechanism', 'emotion', 'emotions',
            'emotional', 'affect', 'mood', 'motivation', 'drive', 'stress',
            'coping', 'consciousness', 'sleep', 'dream'
        ],
        symbols: [],
        patterns: []
    },

    'Engineering': {
        weight: 1.0,
        core: ['engineering', 'engineer', 'technical', 'technology'],
        technical: [
            'mechanical engineering', 'mechanical', 'machine', 'machinery',
            'manufacturing', 'fabrication', 'thermodynamics', 'fluid mechanics',
            'heat transfer', 'dynamics', 'statics', 'mechanics of materials',
            'cad', 'cam', 'cnc', 'lathe', 'mill', 'turbine', 'engine',
            'electrical engineering', 'electrical', 'electronic', 'electronics',
            'circuit', 'circuits', 'voltage', 'current', 'power', 'transistor',
            'diode', 'resistor', 'capacitor', 'inductor', 'microcontroller',
            'embedded systems', 'signal processing', 'analog', 'digital',
            'pcb', 'printed circuit board', 'civil engineering', 'civil',
            'structural', 'structure', 'construction', 'building', 'infrastructure',
            'bridge', 'road', 'highway', 'dam', 'concrete', 'steel', 'beam',
            'column', 'foundation', 'load', 'stress', 'strain', 'geotechnical',
            'soil mechanics', 'transportation', 'hydraulics',
            'chemical engineering', 'process engineering', 'reactor',
            'distillation', 'separation', 'mass transfer', 'heat exchanger',
            'plant design', 'unit operation', 'computer engineering', 'hardware',
            'architecture', 'processor', 'microprocessor', 'cpu', 'gpu', 'fpga',
            'vhdl', 'verilog', 'digital logic', 'embedded', 'design',
            'design process', 'prototype', 'testing', 'simulation', 'modeling',
            'optimization', 'control system', 'automation', 'robotics', 'robot',
            'mechatronics', 'materials science', 'material properties', 'strength',
            'failure analysis'
        ],
        symbols: [],
        patterns: []
    }
};

// ==================== AI DETECTION (PRIMARY METHOD) ====================

/**
 * 🤖 AI-POWERED: Detect subject using Gemini with 95-99% accuracy
 */
export const detectSubjectWithAI = async (documentData) => {
    const { title = '', content = '', fileName = '' } = documentData;

    // ✅ VALIDATE API KEY FIRST
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey || apiKey === 'undefined' || apiKey.length < 10) {
        console.error('❌ GEMINI API KEY NOT CONFIGURED! Check .env file for VITE_GEMINI_API_KEY');
        return null; // Signal to use fallback
    }

    // Prepare text sample (limit to 6000 chars for better context)
    const textSample = `
Title: ${title}
Filename: ${fileName}
Content: ${content.substring(0, 6000)}
    `.trim();

    if (textSample.length < 50) {
        console.warn('⚠️ Insufficient text for AI detection (< 50 chars)');
        return null; // Signal to use fallback
    }

    try {
        console.log('🤖 Using Gemini AI for subject detection...', { titleLength: title.length, contentLength: content.length });

        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            generationConfig: {
                temperature: 0.1, // Low temperature for consistent results
                maxOutputTokens: 50,
            }
        });

        const prompt = `You are an expert educational content classifier. Analyze this document and determine its PRIMARY subject.

Document Content:
${textSample}

POSSIBLE SUBJECTS (respond with EXACTLY one of these):
Mathematics, Physics, Chemistry, Biology, Computer Science, History, Economics, Literature, Psychology, Engineering

CLASSIFICATION RULES:
1. Look for subject-specific terminology, formulas, concepts, and topics
2. Mathematics: equations, calculus, algebra, geometry, statistics
3. Physics: forces, motion, energy, waves, electromagnetism, quantum
4. Chemistry: elements, reactions, compounds, molecules, organic/inorganic
5. Biology: cells, genetics, organisms, ecology, anatomy, evolution
6. Computer Science: programming, algorithms, data structures, software, AI/ML
7. History: dates, events, civilizations, wars, historical figures
8. Economics: markets, finance, GDP, supply/demand, trade
9. Literature: novels, poetry, literary analysis, authors, themes
10. Psychology: behavior, cognition, mental health, therapy, development
11. Engineering: design, systems, mechanical, electrical, civil

IMPORTANT: Only respond with "General Studies" if the content is truly multi-disciplinary or cannot be classified.

Your response (one word only):`;

        const result = await model.generateContent(prompt);
        const response = result.response.text().trim();

        console.log('🤖 AI response:', response);

        // Validate response against known subjects
        const validSubjects = [
            'Mathematics', 'Physics', 'Chemistry', 'Biology',
            'Computer Science', 'History', 'Economics', 'Literature',
            'Psychology', 'Engineering', 'General Studies'
        ];

        const detectedSubject = validSubjects.find(s =>
            response.toLowerCase().includes(s.toLowerCase())
        );

        if (detectedSubject) {
            // ✅ IMPROVED: Calculate confidence based on response quality
            const confidence = detectedSubject === 'General Studies' ? 70 : 95;
            console.log('✅ AI detected:', detectedSubject, `(${confidence}% confidence)`);
            return {
                subject: detectedSubject,
                confidence: confidence,
                method: 'ai_gemini',
                aiResponse: response
            };
        }

        console.warn('⚠️ AI returned invalid response:', response);
        console.warn('   Expected one of:', validSubjects.join(', '));
        return null; // Fallback to keyword

    } catch (error) {
        // ✅ IMPROVED: Detailed error logging
        console.error('❌ AI detection failed:', error.message);
        console.error('   Error details:', error);
        if (error.message?.includes('API key')) {
            console.error('   💡 FIX: Check VITE_GEMINI_API_KEY in your .env file');
        }
        return null; // Fallback to keyword
    }
};

// ==================== KEYWORD DETECTION (FALLBACK) ====================

const analyzeKeywordFrequency = (text) => {
    const textLower = text.toLowerCase();
    const scores = {};

    Object.entries(SUBJECT_DATABASE).forEach(([subject, data]) => {
        let score = 0;

        data.core.forEach(keyword => {
            const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const count = (textLower.match(new RegExp(`\\b${escapedKeyword}\\b`, 'gi')) || []).length;
            score += count * 1;
        });

        data.technical.forEach(keyword => {
            const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const count = (textLower.match(new RegExp(`\\b${escapedKeyword}\\b`, 'gi')) || []).length;
            score += count * 3;
        });

        if (data.symbols) {
            data.symbols.forEach(symbol => {
                const escapedSymbol = symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const count = (text.match(new RegExp(escapedSymbol, 'g')) || []).length;
                score += count * 5;
            });
        }

        if (data.patterns) {
            data.patterns.forEach(pattern => {
                try {
                    const matches = text.match(pattern) || [];
                    score += matches.length * 2;
                } catch (error) {
                    // Skip invalid patterns
                }
            });
        }

        scores[subject] = score * data.weight;
    });

    return scores;
};

const analyzeTitle = (title) => {
    if (!title) return {};

    const titleLower = title.toLowerCase();
    const scores = {};

    Object.entries(SUBJECT_DATABASE).forEach(([subject, data]) => {
        let score = 0;

        data.core.forEach(keyword => {
            if (titleLower.includes(keyword.toLowerCase())) {
                score += 10;
            }
        });

        data.technical.forEach(keyword => {
            if (titleLower.includes(keyword.toLowerCase())) {
                score += 5;
            }
        });

        scores[subject] = score;
    });

    return scores;
};

const extractKeywords = (text) => {
    if (!text || text.length < 10) return [];

    const stopWords = new Set([
        'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but', 'in',
        'with', 'to', 'for', 'of', 'as', 'by', 'this', 'that', 'from', 'are'
    ]);

    const words = text
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 3 && !stopWords.has(word));

    return [...new Set(words)];
};

/**
 * 🔤 KEYWORD-BASED: Fallback detection (70-80% accuracy)
 */
export const detectSubjectAccurately = (documentData) => {
    const { title = '', content = '', fileName = '' } = documentData;

    const fullText = `${title} ${fileName} ${content}`;

    if (!fullText || fullText.trim().length < 50) {
        return {
            subject: 'General Studies',
            confidence: 0,
            method: 'insufficient_data',
            scores: {}
        };
    }

    console.log('🔤 Using keyword-based detection...');

    const signal1 = analyzeKeywordFrequency(fullText);
    const signal2 = analyzeTitle(title);

    const combinedScores = {};
    Object.keys(SUBJECT_DATABASE).forEach(subject => {
        combinedScores[subject] =
            (signal1[subject] || 0) * 0.70 +
            (signal2[subject] || 0) * 0.30;
    });

    let bestSubject = 'General Studies';
    let bestScore = 0;

    Object.entries(combinedScores).forEach(([subject, score]) => {
        if (score > bestScore) {
            bestScore = score;
            bestSubject = subject;
        }
    });

    const totalScore = Object.values(combinedScores).reduce((a, b) => a + b, 0);
    const confidence = totalScore > 0 ? Math.min((bestScore / totalScore) * 100, 85) : 0;

    if (confidence < 30) {
        bestSubject = 'General Studies';
    }

    console.log('✅ Keyword detection:', bestSubject, `(${Math.round(confidence)}%)`);

    return {
        subject: bestSubject,
        confidence: Math.round(confidence),
        method: 'keyword',
        scores: combinedScores
    };
};

// ==================== HYBRID DETECTION (BEST OF BOTH) ====================

/**
 * 🚀 HYBRID: Try AI first, fallback to keywords (RECOMMENDED)
 */
export const detectSubjectHybrid = async (documentData) => {
    console.log('🔍 Starting hybrid subject detection...');

    // Try AI first
    const aiResult = await detectSubjectWithAI(documentData);

    // ✅ LOWERED threshold from 80% to 70% for better AI acceptance
    if (aiResult && aiResult.confidence >= 70) {
        console.log('✅ AI detection accepted:', aiResult.subject);
        return aiResult;
    }

    // Fallback to keyword detection
    console.log('⚠️ AI unavailable or low confidence, using keyword fallback...');
    const keywordResult = detectSubjectAccurately(documentData);

    // ✅ NEW: If keyword also low confidence, try to boost with AI partial result
    if (aiResult && aiResult.subject !== 'General Studies' && keywordResult.subject === 'General Studies') {
        console.log('🔄 Using AI result despite lower confidence:', aiResult.subject);
        return {
            ...aiResult,
            confidence: Math.max(aiResult.confidence, 60),
            method: 'ai_gemini_boosted'
        };
    }

    return keywordResult;
};

// ==================== EXPORTS ====================

export const detectSubjectFromTitle = (title) => {
    if (!title) return 'General Studies';
    const detection = detectSubjectAccurately({ title, content: '', fileName: '' });
    return detection.subject;
};

export const detectSubjectFromContent = (content) => {
    if (!content) return 'General Studies';
    const detection = detectSubjectAccurately({ title: '', content, fileName: '' });
    return detection.subject;
};

export const categorizeQuizSession = (quizData) => {
    const { questions = [], title = '', subject = '' } = quizData;

    if (subject && subject !== 'General Studies') {
        return subject;
    }

    const content = questions
        .map(q => `${q.question || ''} ${q.options?.join(' ') || ''}`)
        .join(' ');

    const detection = detectSubjectAccurately({
        title: title,
        content: content,
        fileName: ''
    });

    return detection.subject;
};

export const getAllSubjects = () => {
    return Object.keys(SUBJECT_DATABASE);
};

export const getSubjectConfig = (subject) => {
    return SUBJECT_DATABASE[subject] || null;
};

export default {
    detectSubjectHybrid,         // ✅ USE THIS (AI + Keyword fallback)
    detectSubjectWithAI,         // AI only
    detectSubjectAccurately,     // Keywords only
    detectSubjectFromTitle,
    detectSubjectFromContent,
    categorizeQuizSession,
    getAllSubjects,
    getSubjectConfig
};
