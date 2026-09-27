# syntax=docker/dockerfile:1

# ---------- Dependencias ----------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---------- Desarrollo (Vite con hot reload) ----------
FROM deps AS dev
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ---------- Build de producción ----------
FROM deps AS build
# URL del API vista desde el navegador. "/api" = mismo dominio (Caddy hace de proxy).
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
COPY . .
RUN npm run build

# ---------- Producción: Caddy sirve la PWA, hace proxy de /api y gestiona HTTPS ----------
FROM caddy:2-alpine AS prod
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
EXPOSE 80 443 443/udp
