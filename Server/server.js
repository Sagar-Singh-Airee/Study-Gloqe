import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import tokenRoutes from './routes/token.routes.js';
import eventsRoutes from './routes/events.routes.js';
import './services/kafkaProducer.js';
import './services/kafkaConsumer.js';

dotenv.config();

const app = express();

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.json({ 
    success: true,
    message: 'StudyGloqe API Server',
    status: 'running',
    version: '2.0.0'
  });
});

app.use('/api/token', tokenRoutes);
app.use('/api/events', eventsRoutes);

app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(500).json({
    success: false,
    error: err.message
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║   🚀 StudyGloqe Backend - Port ${PORT}           ║
║   ✅ Agora Token Service                      ║
║   ⚡ Kafka Real-time Events                   ║
║   📊 SSE Streaming                            ║
╚═══════════════════════════════════════════════╝
  `);
});

process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));

export default app;
