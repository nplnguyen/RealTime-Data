# Real-Time Crypto Market Monitoring System

## Groupe
- Leon Nguyen
- Gael Djebar

## Description
Système de streaming de données temps réel basé sur les flux crypto Binance et Coinbase.

## Architecture
- **Ingestion** : WebSocket Binance (BTC/USDT) + Coinbase (BTC-USD)
- **Buffer** : Apache Kafka (topic crypto.trades.raw)
- **Consumers** : Processor (agrégations), Anomalies (détection), Storage (persistance)
- **Base de données** : MongoDB
- **API** : Express + Socket.IO (REST + WebSocket)
- **Dashboard** : React + Vite + Chart.js

## Lancement

### Prérequis
- Docker
- Node.js

### Démarrage

1. Lancer Kafka + MongoDB : docker compose up -d
2. Créer le topic Kafka : npm run topic
3. Producer Binance : npm run producer
4. Producer Coinbase : npm run coinbase
5. Stockage MongoDB : npm run storage
6. API serveur : npm run api
7. Dashboard : cd dashboard && npm run dev

Dashboard disponible sur http://localhost:5173
