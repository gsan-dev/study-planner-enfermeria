#!/usr/bin/env sh
# Despliega (o actualiza) la app en el servidor actual.
# Uso: ./scripts/deploy.sh
set -eu

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "No existe .env. Creándolo a partir de .env.example con secretos aleatorios..."
  cp .env.example .env
  mongo_pass=$(openssl rand -hex 24)
  jwt_secret=$(openssl rand -hex 48)
  sed -i.bak "s/^MONGO_ROOT_PASSWORD=.*/MONGO_ROOT_PASSWORD=${mongo_pass}/" .env
  sed -i.bak "s/^JWT_SECRET=.*/JWT_SECRET=${jwt_secret}/" .env
  rm -f .env.bak
  echo "✔ .env creado. Revisa SITE_ADDRESS (tu dominio) antes de exponerlo a internet."
fi

# Si es un repositorio git, trae la última versión.
if [ -d .git ]; then
  git pull --ff-only
fi

docker compose up -d --build --remove-orphans
docker image prune -f >/dev/null

echo "Esperando a que la API esté lista..."
i=0
until [ "$(docker compose ps backend --format '{{.Health}}')" = "healthy" ]; do
  i=$((i + 1))
  if [ "$i" -gt 40 ]; then
    echo "✖ La API no arrancó a tiempo. Revisa: docker compose logs backend"
    exit 1
  fi
  sleep 3
done

docker compose ps
echo "✔ Desplegado."
