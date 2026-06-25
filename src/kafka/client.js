const { Kafka, logLevel } = require('kafkajs');
const config = require('../config');

const kafka = new Kafka({
  clientId: config.kafka.clientId,
  brokers: config.kafka.brokers,
  logLevel: logLevel.ERROR,
});

module.exports = kafka;