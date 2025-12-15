import 'dotenv/config';
import { Kafka } from 'kafkajs';

process.env.KAFKAJS_NO_PARTITIONER_WARNING = '1';

const kafka = new Kafka({
  clientId: 'studygloqe-consumer',
  brokers: [process.env.KAFKA_BOOTSTRAP_SERVER],
  ssl: true,
  sasl: {
    mechanism: 'plain',
    username: process.env.KAFKA_API_KEY,
    password: process.env.KAFKA_API_SECRET,
  },
  retry: { initialRetryTime: 100, retries: 8 }
});

const consumer = kafka.consumer({ 
  groupId: 'studygloqe-web-clients',
  sessionTimeout: 30000,
  heartbeatInterval: 3000
});

// Store SSE connections
const eventListeners = new Map();
let isConnected = false;

// Broadcast event to all connected clients
const broadcastEvent = (event) => {
  const userId = event.data?.userId || '*';

  [userId, '*'].forEach(key => {
    if (eventListeners.has(key)) {
      eventListeners.get(key).forEach(res => {
        try {
          res.write(`data: ${JSON.stringify(event)}\n\n`);
        } catch (error) {
          eventListeners.get(key).delete(res);
        }
      });
    }
  });
};

// Connect to Kafka
export const connectConsumer = async () => {
  if (isConnected) return;

  try {
    await consumer.connect();
    await consumer.subscribe({ 
      topic: 'studygloqe-quiz-events',
      fromBeginning: false
    });

    console.log('✅ Kafka Consumer connected');
    isConnected = true;

    await consumer.run({
      eachMessage: async ({ message }) => {
        try {
          const event = JSON.parse(message.value.toString());
          console.log('📨 Kafka event:', event.type);
          broadcastEvent(event);
        } catch (error) {
          console.error('Error processing message:', error);
        }
      },
    });
  } catch (error) {
    console.error('❌ Kafka Consumer failed:', error.message);
    isConnected = false;
  }
};

// Add SSE client
export const addSSEClient = (userId, res) => {
  if (!eventListeners.has(userId)) {
    eventListeners.set(userId, new Set());
  }
  
  eventListeners.get(userId).add(res);
  console.log(`✅ SSE client connected: ${userId} (Total: ${getTotalClients()})`);

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'X-Accel-Buffering': 'no'
  });

  res.write(`data: ${JSON.stringify({ type: 'connected', userId })}\n\n`);

  res.on('close', () => {
    console.log(`🔌 SSE client disconnected: ${userId}`);
    const listeners = eventListeners.get(userId);
    if (listeners) {
      listeners.delete(res);
      if (listeners.size === 0) {
        eventListeners.delete(userId);
      }
    }
  });
};

// Get total connected clients
export const getTotalClients = () => {
  let total = 0;
  eventListeners.forEach(set => { total += set.size; });
  return total;
};

// Disconnect consumer
export const disconnectConsumer = async () => {
  if (isConnected) {
    await consumer.disconnect();
    isConnected = false;
    console.log('🔌 Kafka Consumer disconnected');
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  await disconnectConsumer();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnectConsumer();
  process.exit(0);
});

// Auto-connect on module load
connectConsumer();
