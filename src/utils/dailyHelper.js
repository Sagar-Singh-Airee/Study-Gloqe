// src/utils/dailyHelper.js
const DAILY_API_KEY = import.meta.env.VITE_DAILY_API_KEY;

export const createDailyRoom = async (roomName) => {
    try {
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
                    enable_chat: true,
                    enable_screenshare: true,
                    enable_recording: 'cloud',
                    max_participants: 20
                }
            })
        });

        const room = await response.json();
        return room.url;
    } catch (error) {
        console.error('Error creating Daily room:', error);
        throw error;
    }
};

export const getDailyRoomUrl = async (roomName) => {
    try {
        // Check if room exists
        const response = await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
            headers: {
                'Authorization': `Bearer ${DAILY_API_KEY}`
            }
        });

        if (response.ok) {
            const room = await response.json();
            return room.url;
        } else {
            // Create new room
            return await createDailyRoom(roomName);
        }
    } catch (error) {
        console.error('Error getting Daily room:', error);
        throw error;
    }
};
