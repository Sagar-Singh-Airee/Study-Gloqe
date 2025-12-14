const { Kafka } = require('kafkajs');

console.log('🔧 Initializing Kafka service...');

// Initialize Kafka client
const kafka = new Kafka({
  clientId: 'studygloqe-firebase',
  brokers: [process.env.CONFLUENT_BOOTSTRAP_SERVER],
  ssl: true,
  sasl: {
    mechanism: 'plain',
    username: process.env.CONFLUENT_API_KEY,
    password: process.env.CONFLUENT_API_SECRET,
  },
  connectionTimeout: 30000,
  requestTimeout: 30000,
  retry: {
    initialRetryTime: 100,
    retries: 8,
  },
});

const producer = kafka.producer({
  allowAutoTopicCreation: false,
  transactionTimeout: 30000,
});

let isConnected = false;

/**
 * Connect Kafka producer
 */
const connectProducer = async () => {
  if (!isConnected) {
    try {
      console.log('🔌 Connecting to Kafka...');
      await producer.connect();
      isConnected = true;
      console.log('✅ Kafka producer connected!');
    } catch (error) {
      console.error('❌ Kafka connection failed:', error.message);
      throw error;
    }
  }
};

/**
 * Publish event to Kafka topic
 * @param {string} topic - Topic name WITHOUT prefix (e.g., 'quiz-events')
 * @param {object} event - Event data
 */
const publishEvent = async (topic, event) => {
  try {
    await connectProducer();
    
    const message = {
      key: event.userId || event.id || 'anonymous',
      value: JSON.stringify({
        ...event,
        timestamp: new Date().toISOString(),
        source: 'studygloqe-firebase',
      }),
      headers: {
        'event-type': event.type || 'unknown',
        'user-id': event.userId || 'anonymous',
      },
    };

    const topicName = `studygloqe-${topic}`;
    
    await producer.send({
      topic: topicName,
      messages: [message],
    });

    console.log(`✅ Published to ${topicName}: ${event.type}`);
    return { success: true };
    
  } catch (error) {
    console.error(`❌ Failed to publish to ${topic}:`, error.message);
    return { success: false, error: error.message };
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  if (isConnected) {
    await producer.disconnect();
    console.log('✅ Kafka producer disconnected');
  }
});

module.exports = { publishEvent };
