const {Kafka} = require('kafkajs');
const brokerAddress = process.env.KAFKA_BROKER || 'kafka:29092';

const brokers = brokerAddress.split(',').map(b => b.trim()).filter(Boolean);

const kafka = new Kafka({brokers});

const producer = kafka.producer();
const topic = 'user-updates';

async function startKafkaProducer() {
    await producer.connect();
    console.log('Kafka producer connected');
}

async function publishUserUpdate(user) {
    try {
        await producer.send({
            topic,
            messages: [
                {value: JSON.stringify(user)}
            ]
        });
        console.log('Published user update to Kafka:', user);
    } catch (error) {
        console.error('Failed to publish user update to Kafka:', error);
    }
}

module.exports = {
    startKafkaProducer,
    publishUserUpdate
};