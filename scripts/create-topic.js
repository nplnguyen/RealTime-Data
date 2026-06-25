const kafka = require('../src/kafka/client');
const config = require('../src/config');

async function run() {
  const admin = kafka.admin();
  await admin.connect();

  await admin.createTopics({
    topics: [{
      topic: config.topics.rawTrades,
      numPartitions: 3,
      replicationFactor: 1,
    }],
  });

  console.log(`✅ Topic "${config.topics.rawTrades}" créé (ou déjà existant)`);
  await admin.disconnect();
}

run().catch((e) => { console.error('❌', e); process.exit(1); });