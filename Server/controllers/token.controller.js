import jwt from 'jsonwebtoken';
import axios from 'axios';
import { hmsConfig } from '../config/hms.config.js';
import crypto from 'crypto';

// Generate Management Token (for API calls)
const getManagementToken = () => {
    return jwt.sign(
        {
            access_key: hmsConfig.appAccessKey,
            type: 'management',
            version: 2,
            iat: Math.floor(Date.now() / 1000),
            nbf: Math.floor(Date.now() / 1000)
        },
        hmsConfig.appSecret,
        {
            algorithm: 'HS256',
            expiresIn: '24h',
            jwtid: crypto.randomUUID()
        }
    );
};

// Create Room
export const createRoom = async (req, res) => {
    try {
        const { name, description } = req.body;
        const managementToken = getManagementToken();

        console.log('🔨 Creating 100ms room:', name);

        const response = await axios.post(
            'https://api.100ms.live/v2/rooms',
            {
                name: name || 'Study Room',
                description: description || 'A study session room',
                recording_info: {
                    enabled: false
                }
            },
            {
                headers: {
                    'Authorization': `Bearer ${managementToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('✅ Room created:', response.data.id);

        res.json({
            success: true,
            roomId: response.data.id,
            room: response.data
        });
    } catch (error) {
        console.error('❌ Error creating room:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to create room',
            details: error.response?.data || error.message
        });
    }
};

// Generate Auth Token
export const generateToken = async (req, res) => {
    try {
        const { roomId, userId, userName, role } = req.body;

        if (!roomId) {
            return res.status(400).json({
                success: false,
                error: 'roomId is required'
            });
        }

        console.log('🎫 Generating token for room:', roomId);

        const authToken = jwt.sign(
            {
                access_key: hmsConfig.appAccessKey,
                room_id: roomId,
                user_id: userId || crypto.randomUUID(),
                role: role || 'host',
                type: 'app',
                version: 2,
                iat: Math.floor(Date.now() / 1000),
                nbf: Math.floor(Date.now() / 1000)
            },
            hmsConfig.appSecret,
            {
                algorithm: 'HS256',
                expiresIn: '24h',
                jwtid: crypto.randomUUID()
            }
        );

        res.json({
            success: true,
            token: authToken
        });
    } catch (error) {
        console.error('❌ Error generating token:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate token'
        });
    }
};

// Health check
export const health = (req, res) => {
    res.json({
        success: true,
        message: 'Token service is running',
        timestamp: new Date().toISOString()
    });
};
