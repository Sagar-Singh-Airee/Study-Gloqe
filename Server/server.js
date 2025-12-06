// server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import tokenRoutes from './routes/token.routes.js';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Use routes
app.use('/api/token', tokenRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ 
    success: true,
    message: 'StudyGloqe API Server with Agora SDK',
    status: 'running',
    version: '1.0.0'
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📹 Agora Token Service enabled`);
  console.log(`🔗 API endpoint: http://localhost:${PORT}/api/token`);
});

export default app;
