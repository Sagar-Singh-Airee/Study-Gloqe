// server/server.js
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import tokenRoutes from './routes/token.routes.js';
import { validateHmsConfig } from './config/hms.config.js';
import { rateLimiter } from './middleware/auth.middleware.js';

// Load environment variables FIRST
dotenv.config();

// DEBUG: Check what's loaded
console.log('🔍 Debug - Environment Variables:');
console.log('HMS_APP_ACCESS_KEY:', process.env.HMS_APP_ACCESS_KEY);
console.log('HMS_APP_SECRET:', process.env.HMS_APP_SECRET);
console.log('HMS_APP_ACCESS_KEY length:', process.env.HMS_APP_ACCESS_KEY?.length);
console.log('HMS_APP_SECRET length:', process.env.HMS_APP_SECRET?.length);

// Validate HMS configuration
try {
    validateHmsConfig();
    console.log('✅ HMS configuration validated');
} catch (error) {
    console.error('❌ Configuration error:', error.message);
    process.exit(1);
}


// Create Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use('/api/token', rateLimiter);

// Routes
app.use('/api/token', tokenRoutes);

// Root route
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Study-Gloqe Token Server',
        version: '1.0.0',
        endpoints: {
            health: '/api/token/health',
            generateToken: 'POST /api/token/generate-token',
            createRoom: 'POST /api/token/create-room'
        }
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found'
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('❌ Server error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════╗
║   🚀 Study-Gloqe Token Server Running    ║
║   Port: ${PORT}                           ║
║   Environment: ${process.env.NODE_ENV || 'development'}    ║
║   URL: http://localhost:${PORT}           ║
╚═══════════════════════════════════════════╝
    `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('👋 SIGTERM received. Shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('👋 SIGINT received. Shutting down gracefully...');
    process.exit(0);
});
