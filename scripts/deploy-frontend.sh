#!/bin/bash
# ============================================================
# PayMe Africa — Deploy Frontend Web
# Sert l'app Expo (React Native Web) via nginx + Traefik
# Usage : bash scripts/deploy-frontend.sh [app.faymafrica.fr]
# ============================================================

set -e

APP_DIR="/opt/ai-factory/payme-africa"
DOMAIN="${1:-app.faymafrica.fr}"
IMAGE_NAME="payme-frontend"
CONTAINER_NAME="payme_frontend"

echo ""
echo "PayMe Africa Frontend Deploy"
echo "============================="
echo "Domain   : https://$DOMAIN"
echo "Image    : $IMAGE_NAME:latest"
echo ""

# 1. Se positionner dans le dossier projet
cd "$APP_DIR"

# 2. Pull du code (branche actuelle)
echo "[1/4] Git pull..."
git pull

# 3. Builder l'image Docker (sans docker-compose up --build)
echo "[2/4] Build de l'image Docker..."
docker build \
  -f mobile/Dockerfile.web \
  --build-arg EXPO_PUBLIC_API_URL=https://api.faymafrica.fr \
  -t "$IMAGE_NAME:latest" \
  ./mobile

echo "Build terminé."

# 4. Stopper et supprimer l'ancien container si existant
echo "[3/4] Remplacement du container..."
docker rm -f "$CONTAINER_NAME" 2>/dev/null && echo "  Ancien container supprimé." || echo "  Pas d'ancien container."

# 5. Démarrer le nouveau container avec labels Traefik
# Trouver le réseau Traefik
TRAEFIK_NETWORK=$(docker network ls --format "{{.Name}}" | grep -E "^traefik" | head -1)
if [ -z "$TRAEFIK_NETWORK" ]; then
  TRAEFIK_NETWORK="traefik_default"
  echo "  Réseau Traefik non détecté — utilisation de: $TRAEFIK_NETWORK"
else
  echo "  Réseau Traefik détecté: $TRAEFIK_NETWORK"
fi

echo "[4/4] Démarrage du container..."
docker run -d \
  --name "$CONTAINER_NAME" \
  --restart always \
  --network "$TRAEFIK_NETWORK" \
  -l "traefik.enable=true" \
  -l "traefik.http.routers.payme-app.rule=Host(\`$DOMAIN\`)" \
  -l "traefik.http.routers.payme-app.entrypoints=websecure" \
  -l "traefik.http.routers.payme-app.tls=true" \
  -l "traefik.http.routers.payme-app.tls.certresolver=letsencrypt" \
  -l "traefik.http.services.payme-app.loadbalancer.server.port=80" \
  "$IMAGE_NAME:latest"

echo ""
echo "Déployé ! L'app sera accessible sur :"
echo "  https://$DOMAIN"
echo ""
echo "Note : Assurez-vous que le DNS de $DOMAIN pointe vers l'IP de ce VPS."
echo "       Traefik obtiendra automatiquement le certificat SSL (Let's Encrypt)."
echo ""

# Vérification rapide
sleep 3
if docker ps --format "{{.Names}}" | grep -q "$CONTAINER_NAME"; then
  echo "Container $CONTAINER_NAME en cours d'exécution."
else
  echo "ERREUR : Container non démarré. Vérifiez les logs : docker logs $CONTAINER_NAME"
  exit 1
fi
