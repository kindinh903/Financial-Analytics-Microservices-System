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
      try {
        const userData = JSON.parse(message.value.toString());
        console.log('Received user event:', userData);

        // Upsert by authUserId to avoid duplicates and commit offset on success
        await User.findOneAndUpdate(
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
            },
          },
          { upsert: true, new: true }
        );
      } catch (err) {
        // Log and swallow to prevent infinite retries on the same offset
        console.error('Kafka consumer error processing message:', err && err.message ? err.message : err);
      }
    },
  });
}

module.exports = { startKafkaConsumer };