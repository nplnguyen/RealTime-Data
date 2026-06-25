const { Kafka } = require('kafkajs');
const { MongoClient } = require('mongodb');

const kafka = new Kafka({ clientId: 'storage', brokers: ['localhost:9092'] });
const consumer = kafka.consumer({ groupId: 'storage-group' });

const client = new MongoClient('mongodb://localhost:27017');

async function start() {
  await client.connect();
  const db = client.db('crypto');
  const trades = db.collection('trades');
  console.log('✅ Connecté à MongoDB');

  await consumer.connect();
  await consumer.subscribe({ topic: 'crypto.trades.raw', fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const trade = JSON.parse(message.value.toString());
      await trades.insertOne(trade);
    }
  });
}

start().catch(console.error);
