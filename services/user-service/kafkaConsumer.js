const { Kafka } = require('kafkajs');
const User = require('./models/User');

// Read broker list from env (comma-separated). Default to docker network name and port 29092
const brokerEnv = process.env.KAFKA_BROKER || 'kafka:29092';
const brokers = brokerEnv.split(',').map(b => b.trim()).filter(Boolean);

const kafka = new Kafka({ brokers });
const consumer = kafka.consumer({ groupId: 'user-service-group' });

async function startKafkaConsumer() {
  await consumer.connect();
  await consumer.subscribe({ topic: 'UserRegistered', fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const userData = JSON.parse(message.value.toString());
      // Tạo user profile
      console.log('Received user event:', userData);
      await User.create({
        authUserId: userData.authUserId,
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        permissions: ['free'],
        features: ['basic-dashboard', 'news'],
        });
    },
  });
}

module.exports = { startKafkaConsumer };