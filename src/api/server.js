const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Kafka } = require('kafkajs');
const { MongoClient } = require('mongodb');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});

const mongoClient = new MongoClient('mongodb://localhost:27017');
let tradesCollection;

async function connectMongo() {
  await mongoClient.connect();
  const db = mongoClient.db('crypto');
  tradesCollection = db.collection('trades');
  console.log('Connecte a MongoDB');
}

function movingAverage(prices, window) {
  if (prices.length < window) return null;
  const slice = prices.slice(-window);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

async function computeStats() {
  const now = Date.now();
  const since1min = now - 60000;
  const since5min = now - 300000;
  const since15min = now - 900000;
  const since1h = now - 3600000;

  const recent1min = await tradesCollection.find({ timestamp: { $gt: since1min } }).toArray();
  const recent5min = await tradesCollection.find({ timestamp: { $gt: since5min } }).toArray();
  const recent15min = await tradesCollection.find({ timestamp: { $gt: since15min } }).toArray();
  const recent1h = await tradesCollection.find({ timestamp: { $gt: since1h } }).toArray();
  const lastTrade = await tradesCollection.findOne({}, { sort: { timestamp: -1 } });

  if (recent1min.length === 0) return null;

  const prices1min = recent1min.map(t => t.price);
  const ma7 = movingAverage(prices1min, 7);
  const ma25 = movingAverage(prices1min, 25);

  return {
    lastPrice: lastTrade?.price ?? 0,
    avgPrice: (prices1min.reduce((a, b) => a + b, 0) / prices1min.length).toFixed(2),
    volume1min: recent1min.reduce((a, t) => a + t.quantity, 0).toFixed(5),
    volume5min: recent5min.reduce((a, t) => a + t.quantity, 0).toFixed(5),
    volume15min: recent15min.reduce((a, t) => a + t.quantity, 0).toFixed(5),
    volume1h: recent1h.reduce((a, t) => a + t.quantity, 0).toFixed(5),
    tradeCount: recent1min.length,
    high: Math.max(...prices1min),
    low: Math.min(...prices1min),
    ma7: ma7 ? ma7.toFixed(2) : null,
    ma25: ma25 ? ma25.toFixed(2) : null,
  };
}

const kafka = new Kafka({ clientId: 'api-server', brokers: ['localhost:9092'] });
const consumer = kafka.consumer({ groupId: 'api-group' });

async function startKafka() {
  await consumer.connect();
  await consumer.subscribe({ topic: 'crypto.trades.raw', fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const trade = JSON.parse(message.value.toString());
      io.emit('trade', trade);

      const stats = await computeStats();
      if (stats) io.emit('stats', stats);

      if (trade.quantity > 0.5) {
        const alert = {
          type: 'BIG_VOLUME',
          message: `Gros volume: ${trade.quantity} BTC a $${trade.price}`,
          timestamp: new Date().toISOString()
        };
        io.emit('alert', alert);
      }
    }
  });
}

app.get('/trades', async (req, res) => {
  const trades = await tradesCollection.find({}).sort({ timestamp: -1 }).limit(100).toArray();
  res.json(trades);
});

app.get('/stats', async (req, res) => {
  const stats = await computeStats();
  res.json(stats);
});

app.get('/alerts', async (req, res) => {
  const since = Date.now() - 600000;
  const bigTrades = await tradesCollection.find({ quantity: { $gt: 0.5 }, timestamp: { $gt: since } }).sort({ timestamp: -1 }).limit(20).toArray();
  res.json(bigTrades.map(t => ({
    type: 'BIG_VOLUME',
    message: `Gros volume: ${t.quantity} BTC a $${t.price}`,
    timestamp: new Date(t.timestamp).toISOString()
  })));
});

io.on('connection', async (socket) => {
  console.log('Dashboard connecte');
  const trades = await tradesCollection.find({}).sort({ timestamp: -1 }).limit(30).toArray();
  const stats = await computeStats();
  socket.emit('trades', trades);
  if (stats) socket.emit('stats', stats);
});

async function start() {
  await connectMongo();
  server.listen(3000, () => {
    console.log('API server demarre sur http://localhost:3000');
    startKafka();
  });
}

start().catch(console.error);
