import express from 'express';
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

export default router;