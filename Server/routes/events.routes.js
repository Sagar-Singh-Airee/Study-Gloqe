// Server/routes/events.routes.js
import express from 'express';
import { streamEvents, getStats, healthCheck } from '../controllers/events.controller.js';

const router = express.Router();

// SSE stream endpoint
router.get('/stream', streamEvents);

// Stats endpoint
router.get('/stats', getStats);

// Health check
router.get('/health', healthCheck);

export default router;
