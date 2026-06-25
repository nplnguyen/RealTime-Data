const { Kafka } = require('kafkajs');

const kafka = new Kafka({ clientId: 'processor', brokers: ['localhost:9092'] });
const consumer = kafka.consumer({ groupId: 'processor-group' });

// Fenêtre glissante 1 minute
const trades = [];
const WINDOW_MS = 60 * 1000;

function getStats() {
  const now = Date.now();
  const recent = trades.filter(t => now - t.timestamp < WINDOW_MS);
  if (recent.length === 0) return null;

  const prices = recent.map(t => t.price);
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
  const totalVolume = recent.reduce((a, t) => a + t.quantity, 0);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  return {
    avgPrice: avgPrice.toFixed(2),
    totalVolume: totalVolume.toFixed(5),
    minPrice, maxPrice,
    tradeCount: recent.length,
    window: '1min'
  };
}

async function start() {
  await consumer.connect();
  await consumer.subscribe({ topic: 'crypto.trades.raw', fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const trade = JSON.parse(message.value.toString());
      trades.push(trade);

      // Affiche les stats toutes les 10 trades
      if (trades.length % 10 === 0) {
        const stats = getStats();
        if (stats) console.log('Stats 1min:', stats);
      }
    }
  });
}

start().catch(console.error);
