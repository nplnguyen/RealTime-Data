const { Kafka } = require('kafkajs');
const WebSocket = require('ws');

const kafka = new Kafka({ clientId: 'coinbase-producer', brokers: ['localhost:9092'] });
const producer = kafka.producer();

async function start() {
  await producer.connect();
  console.log('Connecte a Kafka');

  const ws = new WebSocket('wss://advanced-trade-ws.coinbase.com');

  ws.on('open', () => {
    console.log('Connecte au stream Coinbase');
    ws.send(JSON.stringify({
      type: 'subscribe',
      product_ids: ['BTC-USD'],
      channel: 'market_trades'
    }));
  });

  ws.on('message', async (data) => {
    const msg = JSON.parse(data);
    if (msg.channel !== 'market_trades') return;
    if (!msg.events) return;

    for (const event of msg.events) {
      if (!event.trades) continue;
      for (const trade of event.trades) {
        const message = {
          symbol: 'BTC-USD',
          price: parseFloat(trade.price),
          quantity: parseFloat(trade.size),
          timestamp: new Date(trade.time).getTime(),
          tradeId: trade.trade_id,
          source: 'coinbase'
        };

        await producer.send({
          topic: 'crypto.trades.raw',
          messages: [{ key: message.symbol, value: JSON.stringify(message) }]
        });

        console.log(`Coinbase | $${message.price} | qty: ${message.quantity}`);
      }
    }
  });

  ws.on('error', (err) => console.error('Coinbase WebSocket error:', err.message));

  ws.on('close', () => {
    console.log('Coinbase deconnecte, reconnexion dans 5s...');
    setTimeout(start, 5000);
  });
}

start().catch(console.error);
