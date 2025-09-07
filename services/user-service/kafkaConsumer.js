const { Kafka } = require('kafkajs');
const User = require('./models/User');

// Read broker list from env (comma-separated). Default to docker network name and port 29092
const brokerEnv = process.env.KAFKA_BROKER || 'kafka:29092';
const brokers = brokerEnv.split(',').map(b => b.trim()).filter(Boolean);

const kafka = new Kafka({ 
  brokers,
  clientId: 'user-service',
  retry: {
    initialRetryTime: 100,
    retries: 8
  }
});
const consumer = kafka.consumer({ 
  groupId: `user-service-group-${Date.now()}`,
  sessionTimeout: 30000,
  heartbeatInterval: 3000
});

async function startKafkaConsumer() {
  try {
    console.log('Connecting to Kafka with brokers:', brokers);
    await consumer.connect();
    console.log('Connected to Kafka successfully');
    
    await consumer.subscribe({ topic: 'UserRegistered', fromBeginning: false });
    console.log('Subscribed to UserRegistered topic');

    await consumer.run({
      eachMessage: async ({ message }) => {
        try {
          const userData = JSON.parse(message.value.toString());
          console.log('Received user event:', userData);

          // Upsert by authUserId to avoid duplicates and commit offset on success
          const result = await User.findOneAndUpdate(
            { authUserId: userData.authUserId },
            {
              $set: {
                firstName: userData.firstName,
                lastName: userData.lastName,
                email: userData.email,
              },
              $setOnInsert: {
                permissions: ['free'],
                features: ['basic-dashboard', 'news'],
                isActive: true,
                preferences: {
                  theme: 'light',
                  timezone: 'UTC',
                  currency: 'USD',
                  notifications: {
                    email: true,
                    push: true,
                    sms: false
                  }
                },
                subscription: {
                  plan: 'free',
                  isActive: true,
                  startDate: new Date(),
                  endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                }
              },
            },
            { upsert: true, new: true }
          );
          console.log('User profile created/updated:', result.email);
        } catch (err) {
          // Log and swallow to prevent infinite retries on the same offset
          console.error('Kafka consumer error processing message:', err && err.message ? err.message : err);
        }
      },
    });
    console.log('Kafka consumer started successfully');
  } catch (error) {
    console.error('Failed to start Kafka consumer:', error.message);
    // Don't throw - let the service continue without Kafka
  }
}

module.exports = { startKafkaConsumer };