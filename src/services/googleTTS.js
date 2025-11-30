// src/services/googleTTS.js - COMPLETELY FIXED VERSION ✅
const GOOGLE_TTS_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

/**
 * Convert text to speech using Google Cloud TTS REST API
 * FIXED: All 400 errors, audio playback issues, and male voice configuration
 */
export const textToSpeech = async (text, voiceConfig = {}) => {
    try {
        // Enhanced text cleaning for natural speech
        const cleanText = text
            .replace(/\*\*/g, '') // Remove markdown
            .replace(/[_~`#]/g, '') // Remove special chars
            .replace(/\n+/g, '. ') // Convert newlines to natural pauses
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();

        if (!cleanText || cleanText.length < 2) {
            throw new Error('Text too short or empty');
        }

        console.log('🎤 TTS Request:', { 
            text: cleanText.substring(0, 100) + (cleanText.length > 100 ? '...' : ''),
            voice: voiceConfig.name || 'en-US-Neural2-D'
        });

        // ✅ Properly merge voice config with defaults
        const finalVoiceConfig = {
            languageCode: 'en-US',
            name: 'en-US-Neural2-D', // Best male voice
            ssmlGender: 'MALE',
            ...voiceConfig // Allow overrides but keep defaults
        };

        // ✅ CRITICAL FIX: Clamp all values to API limits
        const requestBody = {
            input: { text: cleanText },
            voice: {
                languageCode: finalVoiceConfig.languageCode,
                name: finalVoiceConfig.name,
                ssmlGender: finalVoiceConfig.ssmlGender
            },
            audioConfig: {
                audioEncoding: 'MP3', // ✅ Most compatible (OGG_OPUS causes issues)
                speakingRate: Math.max(0.25, Math.min(4.0, voiceConfig.speakingRate || 1.0)),
                pitch: Math.max(-20.0, Math.min(20.0, voiceConfig.pitch || 0.0)), // ✅ Clamped
                volumeGainDb: Math.max(-96.0, Math.min(16.0, voiceConfig.volume || 0.0)),
            },
        };

        console.log('📤 Sending request:', JSON.stringify(requestBody, null, 2));

        const response = await fetch(
            `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_API_KEY}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('🔴 TTS API Error:', {
                status: response.status,
                statusText: response.statusText,
                error: errorData
            });
            
            throw new Error(`TTS API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.audioContent) {
            throw new Error('No audio content received from TTS service');
        }

        console.log('✅ TTS Success - Audio size:', data.audioContent.length);
        
        // ✅ Convert to blob for better browser compatibility
        const audioBlob = base64ToBlob(data.audioContent, 'audio/mpeg');
        const audioUrl = URL.createObjectURL(audioBlob);
        
        return audioUrl;
        
    } catch (error) {
        console.error('🔴 TTS Service Failed:', {
            error: error.message,
            textLength: text?.length
        });
        
        // Enhanced error handling
        if (error.message.includes('403')) {
            throw new Error('TTS access denied - Enable Text-to-Speech API in Google Cloud Console');
        } else if (error.message.includes('429')) {
            throw new Error('TTS quota exceeded - Try again later or upgrade billing');
        } else if (error.message.includes('400')) {
            throw new Error('Invalid request - Check voice configuration');
        } else if (error.message.toLowerCase().includes('network')) {
            throw new Error('Network error - Check internet connection');
        }
        
        throw error;
    }
};

/**
 * Helper function to convert base64 to blob
 */
function base64ToBlob(base64, mimeType) {
    try {
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: mimeType });
    } catch (error) {
        console.error('Blob conversion error:', error);
        throw new Error('Failed to convert audio data');
    }
}

/**
 * Available voices - Optimized for Male Voice
 */
export const VOICE_OPTIONS = {
    // ✅ PRIMARY MALE VOICES (Recommended)
    MALE_NEURAL_D: { 
        name: 'en-US-Neural2-D', 
        gender: 'MALE', 
        languageCode: 'en-US',
        description: 'Friendly, conversational male voice (recommended)' 
    },
    MALE_NEURAL_A: { 
        name: 'en-US-Neural2-A', 
        gender: 'MALE', 
        languageCode: 'en-US',
        description: 'Deep, authoritative male voice' 
    },
    MALE_NEURAL_I: { 
        name: 'en-US-Neural2-I', 
        gender: 'MALE', 
        languageCode: 'en-US',
        description: 'Warm, mature male voice' 
    },
    
    // ✅ PREMIUM MALE VOICES (Cost more but highest quality)
    MALE_WAVENET_D: { 
        name: 'en-US-Wavenet-D', 
        gender: 'MALE', 
        languageCode: 'en-US',
        description: 'Premium natural male voice' 
    },
    MALE_WAVENET_B: { 
        name: 'en-US-Wavenet-B', 
        gender: 'MALE', 
        languageCode: 'en-US',
        description: 'Premium expressive male voice' 
    },
    
    // Female voices (backup)
    FEMALE_NEURAL_F: { 
        name: 'en-US-Neural2-F', 
        gender: 'FEMALE', 
        languageCode: 'en-US',
        description: 'Warm, natural female voice' 
    },
    FEMALE_NEURAL_G: { 
        name: 'en-US-Neural2-G', 
        gender: 'FEMALE', 
        languageCode: 'en-US',
        description: 'Bright, cheerful female voice' 
    },
    FEMALE_NEURAL_H: { 
        name: 'en-US-Neural2-H', 
        gender: 'FEMALE', 
        languageCode: 'en-US',
        description: 'Professional, clear female voice' 
    },
};

/**
 * Test function to verify TTS is working
 */
export const testMaleVoice = async () => {
    const testText = "Hello! I am your male voice assistant. I can speak full sentences without cutting off early. How can I help you today?";
    
    try {
        console.log('🧪 Testing Male TTS Voice...');
        const audioUrl = await textToSpeech(testText, VOICE_OPTIONS.MALE_NEURAL_D);
        console.log('✅ Male Voice Test Successful!');
        return audioUrl;
    } catch (error) {
        console.error('❌ Male Voice Test Failed:', error);
        throw error;
    }
};

export default textToSpeech;
