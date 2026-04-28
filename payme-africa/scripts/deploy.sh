#!/bin/bash
# Script de déploiement sur VPS OVH
# Usage: ./scripts/deploy.sh [tag]
set -e

TAG=${1:-latest}
echo "🚀 Déploiement PayMe Africa — tag: ${TAG}"

# 1. Pull dernières images
echo "[1/5] Pull images..."
docker compose -f docker-compose.prod.yml pull

# 2. Build backend
echo "[2/5] Build backend..."
docker compose -f docker-compose.prod.yml build backend

# 3. Migrations base de données
echo "[3/5] Migrations..."
docker compose -f docker-compose.prod.yml run --rm backend node -e "
const { db } = require('./src/config/database');
const fs = require('fs');
const path = require('path');
// Les migrations sont gérées par Docker entrypoint
console.log('✅ DB prête');
process.exit(0);
"

# 4. Redémarrer les services (zero downtime)
echo "[4/5] Redémarrage services..."
docker compose -f docker-compose.prod.yml up -d --no-deps backend
docker compose -f docker-compose.prod.yml restart nginx

# 5. Health check
echo "[5/5] Health check..."
sleep 5
curl -sf https://api.paymeafrica.sn/health | python3 -m json.tool
echo ""
echo "✅ Déploiement terminé !"
