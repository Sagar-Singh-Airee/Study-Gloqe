// Server/services/kafkaProducer.js
import 'dotenv/config';  // 👈 ADD THIS LINE AT THE TOP
import { Kafka } from 'kafkajs';

// Silence the partitioner warning
process.env.KAFKAJS_NO_PARTITIONER_WARNING = '1';

// ===========================
// KAFKA CONFIGURATION
// ===========================
const kafka = new Kafka({
  clientId: 'studygloqe-producer',
  brokers: [process.env.KAFKA_BOOTSTRAP_SERVER],
  ssl: true,
  sasl: {
    mechanism: 'plain',
    username: process.env.KAFKA_API_KEY,
    password: process.env.KAFKA_API_SECRET,
  },
  retry: {
    initialRetryTime: 100,
    retries: 8
  }
});

const producer = kafka.producer();

// ===========================
// INITIALIZATION
// ===========================
let isConnected = false;

export const connectProducer = async () => {
  if (isConnected) return;
  
  try {
    await producer.connect();
    isConnected = true;
    console.log('✅ Kafka Producer connected successfully');
  } catch (error) {
    console.error('❌ Kafka Producer connection failed:', error.message);
  }
};

// Connect on module load
connectProducer();

// ===========================
// PUBLISH EVENT FUNCTION
// ===========================
export const publishEvent = async (eventType, eventData) => {
  if (!isConnected) {
    console.warn('⚠️ Kafka not connected. Event not published:', eventType);
    return false;
  }

  try {
    const message = {
      type: eventType,
      data: eventData,
      timestamp: new Date().toISOString(),
      source: 'studygloqe-backend'
    };

    await producer.send({
      topic: 'studygloqe-quiz-events',
      messages: [
        {
          key: eventData.userId || 'anonymous',
          value: JSON.stringify(message),
          headers: {
            'event-type': eventType,
            'user-id': eventData.userId || 'unknown'
          }
        }
      ]
    });

    console.log(`📤 Event published: ${eventType}`, {
      userId: eventData.userId,
      timestamp: message.timestamp
    });

    return true;
  } catch (error) {
    console.error(`❌ Failed to publish event ${eventType}:`, error.message);
    return false;
  }
};

// ===========================
// GRACEFUL SHUTDOWN
// ===========================
export const disconnectProducer = async () => {
  if (!isConnected) return;
  
  try {
    await producer.disconnect();
    isConnected = false;
    console.log('🔌 Kafka Producer disconnected');
  } catch (error) {
    console.error('Error disconnecting producer:', error.message);
  }
};

// Handle process termination
process.on('SIGINT', async () => {
  await disconnectProducer();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnectProducer();
  process.exit(0);
});
