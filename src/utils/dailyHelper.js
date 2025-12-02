// src/utils/dailyHelper.js - COMPLETE FIXED VERSION
const DAILY_API_KEY = import.meta.env.VITE_DAILY_API_KEY;

export const createDailyRoom = async (roomName) => {
    try {
        console.log('🔨 Creating Daily room:', roomName);
        
        const response = await fetch('https://api.daily.co/v1/rooms', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DAILY_API_KEY}`
            },
            body: JSON.stringify({
                name: roomName,
                privacy: 'public',
                properties: {
                    enable_chat: false, // Using our own chat
                    enable_screenshare: true,
                    enable_recording: false,
                    max_participants: 20,
                    start_video_off: false,
                    start_audio_off: false,
                    enable_knocking: false,
                    enable_prejoin_ui: false
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ Create room failed:', errorData);
            throw new Error(errorData.error || `Failed to create room: ${response.status}`);
        }

        const room = await response.json();
        console.log('✅ Room created successfully:', room.url);
        return room.url;
    } catch (error) {
        console.error('❌ Error creating Daily room:', error);
        throw error;
    }
};

export const getDailyRoomUrl = async (roomName) => {
    try {
        console.log('🔍 Checking if room exists:', roomName);
        
        // Check if room exists
        const response = await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${DAILY_API_KEY}`
            }
        });

        if (response.ok) {
            const room = await response.json();
            console.log('✅ Room already exists:', room.url);
            return room.url;
        } 
        
        if (response.status === 404) {
            // Room doesn't exist, create it
            console.log('📝 Room not found, creating new one...');
            return await createDailyRoom(roomName);
        }

        // Handle other errors (like 401 Unauthorized)
        const errorData = await response.json();
        console.error('❌ API Error:', errorData);
        throw new Error(errorData.error || `API Error: ${response.status}`);

    } catch (error) {
        console.error('❌ Error getting Daily room:', error.message);
        
        // If API fails, provide a fallback error message
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
            throw new Error('Invalid Daily.co API key. Please check your .env file.');
        }
        
        throw error;
    }
};

// Optional: Delete room when done (call this when room closes)
export const deleteDailyRoom = async (roomName) => {
    try {
        const response = await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${DAILY_API_KEY}`
            }
        });

        if (response.ok) {
            console.log('✅ Room deleted:', roomName);
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('❌ Error deleting room:', error);
        return false;
    }
};
