// Server/test-kafka.js
import { publishEvent } from './services/kafkaProducer.js';

setTimeout(async () => {
  console.log('🧪 Testing Kafka connection...');
  
  await publishEvent('test.connection', {
    userId: 'test-user-123',
    message: 'Hello from StudyGloqe!',
    timestamp: new Date().toISOString()
  });
  
  console.log('✅ Test complete! Check Confluent Cloud.');
  process.exit(0);
}, 3000); // Wait 3s for Kafka to connect
