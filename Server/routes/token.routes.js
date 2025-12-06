// routes/token.routes.js
import express from 'express';
import { 
  generateRTCToken, 
  generateStudyRoomToken, 
  testTokenGeneration 
} from '../controllers/token.controller.js';
import { validateRequest, rateLimiter } from '../middleware/auth.middleware.js';

const router = express.Router();

// Apply rate limiter to all token routes
router.use(rateLimiter);

// Test endpoint (no auth required)
router.get('/test', testTokenGeneration);

// Generate RTC token - flexible endpoint
router.get('/rtc/:channelName/:role/:uid', generateRTCToken);
router.post('/rtc', generateRTCToken);

// Study room specific endpoint (with validation middleware)
router.post('/study-room', validateRequest, generateStudyRoomToken);

export default router;
