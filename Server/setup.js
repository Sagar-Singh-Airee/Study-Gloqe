import fs from 'fs';
import path from 'path';

// Create directories
const dirs = ['config', 'routes', 'controllers', 'middleware'];
dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
        console.log(`✅ Created ${dir}/ directory`);
    }
});

// File contents
const files = {
    'config/hms.config.js': `export const hmsConfig = {
    appAccessKey: process.env.HMS_APP_ACCESS_KEY,
    appSecret: process.env.HMS_APP_SECRET,
};

export const validateHmsConfig = () => {
    if (!hmsConfig.appAccessKey || !hmsConfig.appSecret) {
        throw new Error('HMS credentials not configured. Check your .env file.');
    }
};`,

    'controllers/token.controller.js': `import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import { hmsConfig } from '../config/hms.config.js';

export const generateToken = async (req, res) => {
    try {
        const { roomId, userId, userName, role } = req.body;

        if (!roomId || !userId) {
            return res.status(400).json({
                success: false,
                error: 'roomId and userId are required'
            });
        }

        console.log('🔑 Generating token for:', { roomId, userId, userName, role });

        const payload = {
            access_key: hmsConfig.appAccessKey,
            room_id: roomId,
            user_id: userId,
            role: role || 'host',
            type: 'app',
            version: 2,
            iat: Math.floor(Date.now() / 1000),
            nbf: Math.floor(Date.now() / 1000)
        };

        const token = jwt.sign(payload, hmsConfig.appSecret, {
            algorithm: 'HS256',
            expiresIn: '24h',
            jwtid: uuid()
        });

        console.log('✅ Token generated successfully');

        res.status(200).json({
            success: true,
            token,
            expiresIn: 86400
        });

    } catch (error) {
        console.error('❌ Error generating token:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate token',
            message: error.message
        });
    }
};

export const createRoom = async (req, res) => {
    try {
        const { roomName, description } = req.body;
        const roomId = \`room-\${Date.now()}\`;

        res.status(201).json({
            success: true,
            room: {
                id: roomId,
                name: roomName,
                description: description || '',
                createdAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('❌ Error creating room:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create room'
        });
    }
};`,

    'routes/token.routes.js': `import express from 'express';
import { generateToken, createRoom } from '../controllers/token.controller.js';

const router = express.Router();

router.post('/generate-token', generateToken);
router.post('/create-room', createRoom);

router.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Token service is running',
        timestamp: new Date().toISOString()
    });
});

export default router;`,

    'middleware/auth.middleware.js': `export const validateRequest = (req, res, next) => {
    const { roomId, userId } = req.body;

    if (!roomId || typeof roomId !== 'string') {
        return res.status(400).json({
            success: false,
            error: 'Valid roomId is required'
        });
    }

    if (!userId || typeof userId !== 'string') {
        return res.status(400).json({
            success: false,
            error: 'Valid userId is required'
        });
    }

    next();
};

const requestCounts = new Map();

export const rateLimiter = (req, res, next) => {
    const ip = req.ip;
    const now = Date.now();
    const windowMs = 60000;
    const maxRequests = 30;

    if (!requestCounts.has(ip)) {
        requestCounts.set(ip, { count: 1, resetTime: now + windowMs });
        return next();
    }

    const record = requestCounts.get(ip);

    if (now > record.resetTime) {
        record.count = 1;
        record.resetTime = now + windowMs;
        return next();
    }

    if (record.count >= maxRequests) {
        return res.status(429).json({
            success: false,
            error: 'Too many requests. Please try again later.'
        });
    }

    record.count++;
    next();
};`,

    '.env': `# Server Configuration
PORT=5000
NODE_ENV=development

# 100ms Credentials (get from dashboard -> Developer tab)
HMS_APP_ACCESS_KEY=your_app_access_key_here
HMS_APP_SECRET=your_app_secret_here

# CORS - Your frontend URL
CLIENT_URL=http://localhost:5173`
};

// Create files
Object.entries(files).forEach(([filepath, content]) => {
    fs.writeFileSync(filepath, content);
    console.log(`✅ Created ${filepath}`);
});

console.log('\n🎉 All files created successfully!');
console.log('\n⚠️  IMPORTANT: Update your .env file with your 100ms credentials');
console.log('   Get them from: https://dashboard.100ms.live -> Developer tab\n');
