const { Kafka } = require('kafkajs');

const kafka = new Kafka({ clientId: 'anomalies', brokers: ['localhost:9092'] });
const consumer = kafka.consumer({ groupId: 'anomalies-group' });

const recentPrices = [];
const VOLUME_THRESHOLD = 0.5;
const PRICE_CHANGE_THRESHOLD = 0.001; // 0.1% en quelques secondes

async function start() {
  await consumer.connect();
  await consumer.subscribe({ topic: 'crypto.trades.raw', fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const trade = JSON.parse(message.value.toString());

      // Détection gros volume
      if (trade.quantity > VOLUME_THRESHOLD) {
        console.log(`GROS VOLUME détecté: ${trade.quantity} BTC à $${trade.price}`);
      }

      // Détection variation de prix rapide
      recentPrices.push({ price: trade.price, timestamp: trade.timestamp });
      const now = Date.now();
      // Garde 10 secondes
      const window = recentPrices.filter(p => now - p.timestamp < 10000);
      recentPrices.length = 0;
      recentPrices.push(...window);

      if (window.length >= 2) {
        const oldest = window[0].price;
        const latest = trade.price;
        const change = Math.abs((latest - oldest) / oldest);
        if (change > PRICE_CHANGE_THRESHOLD) {
          console.log(`⚡ VARIATION RAPIDE: ${(change * 100).toFixed(3)}% en ${window.length} trades`);
        }
      }
    }
  });
}

start().catch(console.error);
