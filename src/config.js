require('dotenv').config();

module.exports = {
  kafka: {
    clientId: 'crypto-monitor',
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  },
  topics: {
    rawTrades: 'crypto.trades.raw',
  },
  api: {
    port: Number(process.env.API_PORT || 3000),
  },
};