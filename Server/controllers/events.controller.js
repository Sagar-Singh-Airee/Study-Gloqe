import { addSSEClient, getTotalClients } from '../services/kafkaConsumer.js';

export const streamEvents = async (req, res) => {
  const userId = req.query.userId || '*';
  addSSEClient(userId, res);

  const heartbeat = setInterval(() => {
    try {
      res.write(`: heartbeat\n\n`);
    } catch (error) {
      clearInterval(heartbeat);
    }
  }, 30000);

  req.on('close', () => clearInterval(heartbeat));
};

export const getStats = async (req, res) => {
  try {
    res.json({
      success: true,
      stats: {
        connectedClients: getTotalClients(),
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get stats' });
  }
};

export const healthCheck = async (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    service: 'SSE Event Stream',
    timestamp: new Date().toISOString()
  });
};
