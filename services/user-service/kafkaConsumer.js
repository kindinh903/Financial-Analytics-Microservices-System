const { Kafka } = require('kafkajs');
const User = require('./models/User');
const kafka = new Kafka({ brokers: ['localhost:9092'] });
const consumer = kafka.consumer({ groupId: 'user-service-group' });

async function runConsumer() {
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

runConsumer();