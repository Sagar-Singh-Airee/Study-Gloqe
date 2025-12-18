// src/features/study/services/smartFolderService.js
import { GoogleGenerativeAI } from '@google/generative-ai';
import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../shared/config/firebase';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

/**
 * AI extracts folder structure from user context
 */
export const parseFolderStructure = async (userContext) => {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

        const prompt = `
Analyze this user's learning context and extract folder structure:

User Context: "${userContext}"

Extract:
1. **Subject**: Main subject/category (e.g., Biology, Math, History)
2. **Topic**: Specific topic/chapter/unit (e.g., Chapter 5, Algebra, World War 2)
3. **Purpose**: What they're doing (exam, assignment, interview, etc.)

Return ONLY valid JSON:
{
  "subject": "Biology",
  "topic": "Chapter 5",
  "purpose": "Exam Preparation",
  "suggestedFolderPath": "Biology/Chapter 5",
  "tags": ["biology", "chapter-5", "exam"]
}

Examples:
- "Bio Chapter 5 exam prep" → Biology / Chapter 5
- "Calculus assignment" → Mathematics / Calculus
- "React hooks tutorial" → Computer Science / React Hooks
- "French vocabulary" → Language Studies / French Vocabulary
`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const cleanedText = text.replace(/``````\n?/g, '').trim();
        const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            console.log('✅ Folder structure parsed:', parsed);
            return parsed;
        }

        throw new Error('Failed to parse folder structure');

    } catch (error) {
        console.error('❌ Folder parsing error:', error);
        // Fallback: simple parsing
        return {
            subject: 'General Studies',
            topic: userContext.substring(0, 50),
            purpose: 'Study',
            suggestedFolderPath: `General Studies/${userContext.substring(0, 50)}`,
            tags: []
        };
    }
};

/**
 * Create or get existing folder
 */
export const getOrCreateFolder = async (userId, folderName, parentFolderId = null) => {
    try {
        // Check if folder exists
        const q = query(
            collection(db, 'folders'),
            where('userId', '==', userId),
            where('name', '==', folderName),
            where('parentId', '==', parentFolderId)
        );

        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            console.log('📁 Folder exists:', folderName);
            return snapshot.docs[0].id;
        }

        // Create new folder
        const folderData = {
            userId,
            name: folderName,
            parentId: parentFolderId,
            docCount: 0,
            quizCount: 0,
            flashcardCount: 0,
            color: getRandomColor(),
            icon: getFolderIcon(folderName),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        const docRef = await addDoc(collection(db, 'folders'), folderData);
        console.log('✅ Created folder:', folderName, docRef.id);

        return docRef.id;

    } catch (error) {
        console.error('❌ Error creating folder:', error);
        return null;
    }
};

/**
 * Create nested folder structure
 */
export const createFolderHierarchy = async (userId, structure) => {
    try {
        const { subject, topic } = structure;

        // Create subject folder (parent)
        const subjectFolderId = await getOrCreateFolder(userId, subject, null);

        // Create topic folder (child)
        let topicFolderId = null;
        if (topic && topic !== subject) {
            topicFolderId = await getOrCreateFolder(userId, topic, subjectFolderId);
        }

        return {
            subjectFolderId,
            topicFolderId: topicFolderId || subjectFolderId, // Use subject if no topic
            hierarchy: topicFolderId ? [subjectFolderId, topicFolderId] : [subjectFolderId]
        };

    } catch (error) {
        console.error('❌ Error creating hierarchy:', error);
        return { subjectFolderId: null, topicFolderId: null, hierarchy: [] };
    }
};

/**
 * Get random color for folder
 */
const getRandomColor = () => {
    const colors = [
        'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
        'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
};

/**
 * Get icon based on folder name
 */
const getFolderIcon = (folderName) => {
    const name = folderName.toLowerCase();

    if (name.includes('math') || name.includes('calculus') || name.includes('algebra')) return '🔢';
    if (name.includes('bio') || name.includes('science')) return '🧬';
    if (name.includes('physics')) return '⚛️';
    if (name.includes('chemistry')) return '🧪';
    if (name.includes('history')) return '📜';
    if (name.includes('computer') || name.includes('code')) return '💻';
    if (name.includes('language') || name.includes('english')) return '📖';
    if (name.includes('art')) return '🎨';
    if (name.includes('music')) return '🎵';

    return '📁';
};

export default {
    parseFolderStructure,
    getOrCreateFolder,
    createFolderHierarchy
};
