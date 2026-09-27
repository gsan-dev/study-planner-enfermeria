#!/usr/bin/env sh
# Restaura una copia creada con backup.sh (sirve también para migrar de servidor).
# Uso: ./scripts/restore.sh backups/20260101-120000.archive.gz
set -eu

if [ $# -ne 1 ] || [ ! -f "$1" ]; then
  echo "Uso: $0 <archivo.archive.gz>"
  exit 1
fi

cd "$(dirname "$0")/.."
. ./.env

printf "Esto reemplazará los datos actuales de '%s'. ¿Continuar? [s/N] " "${MONGO_DB:-study-planner}"
read -r answer
[ "$answer" = "s" ] || [ "$answer" = "S" ] || exit 1

docker compose exec -T mongo mongorestore \
  --username "${MONGO_ROOT_USER:-admin}" --password "$MONGO_ROOT_PASSWORD" --authenticationDatabase admin \
  --nsInclude "${MONGO_DB:-study-planner}.*" --drop --archive --gzip < "$1"

echo "✔ Datos restaurados."
