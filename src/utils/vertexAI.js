// src/utils/vertexAI.js
export const generateAIResponse = async (prompt, documentId) => {
    try {
        // Replace with your Vertex AI endpoint
        const response = await fetch('YOUR_VERTEX_AI_ENDPOINT', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${YOUR_API_KEY}`
            },
            body: JSON.stringify({
                prompt,
                documentId,
                max_tokens: 500,
                temperature: 0.7
            })
        });

        const data = await response.json();
        return data.text || data.response || 'No response from AI';
    } catch (error) {
        console.error('Vertex AI Error:', error);
        throw error;
    }
};
