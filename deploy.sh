#!/bin/bash
set -e

echo "🚀 Déploiement Oh My Brunch..."

git pull origin v8

docker compose down
docker compose build --no-cache
docker compose up -d

echo "✅ Déploiement terminé !"
echo "🌐 Backend : http://localhost/api/health"