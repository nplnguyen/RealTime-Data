const { Kafka } = require('kafkajs');
const WebSocket = require('ws');

const kafka = new Kafka({
  clientId: 'binance-producer',
  brokers: ['localhost:9092']
});

const producer = kafka.producer();

async function start() {
  await producer.connect();
  console.log('Connecté à Kafka');

  const ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@trade');

  ws.on('open', () => {
    console.log('Connecté au stream Binance BTC/USDT');
  });

  ws.on('message', async (data) => {
    const trade = JSON.parse(data);

    const message = {
      symbol: trade.s,
      price: parseFloat(trade.p),
      quantity: parseFloat(trade.q),
      timestamp: trade.T,
      tradeId: trade.t,
      isBuyerMaker: trade.m
    };

    await producer.send({
      topic: 'crypto.trades.raw',
      messages: [{ 
        key: message.symbol,
        value: JSON.stringify(message) 
      }]
    });

    console.log(`${message.symbol} | $${message.price} | qty: ${message.quantity}`);
  });

  ws.on('error', (err) => console.error('WebSocket error:', err));
  
  ws.on('close', () => {
    console.log('WebSocket fermé, reconnexion dans 5s...');
    setTimeout(start, 5000);
  });
}

start().catch(console.error);
