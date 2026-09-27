#!/usr/bin/env sh
# Copia de seguridad de MongoDB en ./backups/<fecha>.archive.gz
# Uso: ./scripts/backup.sh
set -eu

cd "$(dirname "$0")/.."
. ./.env

mkdir -p backups
file="backups/$(date +%Y%m%d-%H%M%S).archive.gz"

docker compose exec -T mongo mongodump \
  --username "${MONGO_ROOT_USER:-admin}" --password "$MONGO_ROOT_PASSWORD" --authenticationDatabase admin \
  --db "${MONGO_DB:-study-planner}" --archive --gzip > "$file"

echo "✔ Copia guardada en $file"
