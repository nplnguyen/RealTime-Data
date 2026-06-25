const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Kafka } = require('kafkajs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});

// État en mémoire
const state = {
  trades: [],
  stats: {},
  alerts: []
};

// Consumer Kafka
const kafka = new Kafka({ clientId: 'api-server', brokers: ['localhost:9092'] });
const consumer = kafka.consumer({ groupId: 'api-group' });

async function startKafka() {
  await consumer.connect();
  await consumer.subscribe({ topic: 'crypto.trades.raw', fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const trade = JSON.parse(message.value.toString());
      
      // Garde les 100 derniers trades
      state.trades.unshift(trade);
      if (state.trades.length > 100) state.trades.pop();

      // Calcul stats fenêtre 1min
      const now = Date.now();
      const recent = state.trades.filter(t => now - t.timestamp < 60000);
      const prices = recent.map(t => t.price);
      state.stats = {
        lastPrice: trade.price,
        avgPrice: (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2),
        volume1min: recent.reduce((a, t) => a + t.quantity, 0).toFixed(5),
        tradeCount: recent.length,
        high: Math.max(...prices),
        low: Math.min(...prices)
      };

      // Détection anomalie
      if (trade.quantity > 0.5) {
        const alert = {
          type: 'BIG_VOLUME',
          message: `Gros volume: ${trade.quantity} BTC à $${trade.price}`,
          timestamp: new Date().toISOString()
        };
        state.alerts.unshift(alert);
        if (state.alerts.length > 20) state.alerts.pop();
        io.emit('alert', alert);
      }

      // Push live au dashboard
      io.emit('trade', trade);
      io.emit('stats', state.stats);
    }
  });
}

// REST endpoints
app.get('/trades', (req, res) => res.json(state.trades));
app.get('/stats', (req, res) => res.json(state.stats));
app.get('/alerts', (req, res) => res.json(state.alerts));

io.on('connection', (socket) => {
  console.log('Dashboard connecté');
  socket.emit('stats', state.stats);
  socket.emit('trades', state.trades);
});

server.listen(3000, () => {
  console.log('API server démarré sur http://localhost:3000');
  startKafka();
});
