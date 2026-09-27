# Study Planner · Enfermería

PWA para planificar asignaturas, exámenes y horas de estudio.

| Parte    | Tecnología                                                        |
| -------- | ----------------------------------------------------------------- |
| Frontend | React 19 + TypeScript + Vite, Tailwind CSS 4, React Router, Axios |
| Backend  | Node 22 + Express 5, Mongoose (MongoDB), JWT, pino               |
| Servidor | Docker Compose: MongoDB + API + Caddy (estáticos, proxy y HTTPS)  |

```
navegador ──HTTPS──► Caddy (web) ──/api/*──► backend:4000 ──► mongo:27017
                        └── resto ──► PWA compilada (/srv)
```

Todo sale por un único dominio, así que no hay problemas de CORS y el
navegador ve la app y el API como el mismo origen.

---

## Desplegar en un servidor

Requisitos: cualquier Linux (x64 o ARM64) con Docker y el plugin Compose.
MongoDB 8 necesita una CPU con AVX (cualquier VPS actual la tiene).

```bash
git clone <repo> study-planner && cd study-planner
./scripts/deploy.sh
```

La primera vez, `deploy.sh` crea `.env` con contraseñas aleatorias. Después:

1. Apunta el DNS de tu dominio (registro A/AAAA) a la IP del servidor.
2. En `.env`, pon `SITE_ADDRESS=estudio.midominio.com`.
3. Abre los puertos 80 y 443 del firewall.
4. Vuelve a ejecutar `./scripts/deploy.sh`.

Caddy obtiene y renueva el certificado HTTPS solo (lo exige la PWA para
instalarse en el iPhone). Para actualizar la app, vuelve a ejecutar
`./scripts/deploy.sh`: hace `git pull`, reconstruye y reinicia.

**Sin dominio propio:** deja `SITE_ADDRESS=:80` y pon delante un túnel con
HTTPS (Cloudflare Tunnel, Tailscale Funnel…).

### Comandos útiles

```bash
docker compose ps                  # estado de los servicios
docker compose logs -f backend     # logs del API (JSON)
docker compose restart backend
docker compose down                # parar (los datos se conservan)
./scripts/backup.sh                # copia de MongoDB en ./backups/
./scripts/restore.sh backups/X.archive.gz
```

### Migrar a otro servidor

1. En el antiguo: `./scripts/backup.sh`
2. Copia el repo, el `.env` y el archivo de `backups/` al nuevo.
3. En el nuevo: `./scripts/deploy.sh` y luego `./scripts/restore.sh backups/X.archive.gz`
4. Cambia el DNS.

---

## Desarrollo

### Con Docker (hot reload)

```bash
docker compose -f docker-compose.dev.yml up --build
```

- Frontend: http://localhost:5173
- API: http://localhost:4000/api/health
- MongoDB: `mongodb://localhost:27017` (sin contraseña)

### Sin Docker

Necesitas Node 22+ y un MongoDB (local o Atlas).

```bash
cd backend && cp .env.example .env && npm install && npm run dev
cd frontend && npm install && npm run dev
```

Vite redirige `/api` a `http://localhost:4000`.

### Probar en el móvil desde tu red local

Con `npm run dev`, Vite muestra una URL `Network: http://192.168.x.x:5173`
que puedes abrir en el iPhone. El service worker solo se registra en el build
de producción: para probar la instalación como app hace falta HTTPS
(despliegue real o túnel).

---

## Estructura

```
backend/src/
  config/        env, logger (pino), database (MongoDB con reintentos)
  controllers/   lógica de cada endpoint
  middlewares/   auth JWT, CORS, rate limiting, logging, errores
  models/        User, Session, Asignatura, Tema, Examen, PlanEstudio, Progreso
  routes/        /api/*
  validators/    esquemas zod de cada petición
  utils/         AppError, jwt, findOwned
frontend/
  public/        manifest.json, service-worker.js, iconos
  scripts/       generate-icons.mjs (npm run icons)
  src/
    auth/        AuthProvider, useAuth, rutas protegidas
    components/  layout, ui (Button, Field, Modal…), asignaturas, iconos
    hooks/       service worker, estado online, datos de asignaturas
    pages/       páginas por sección
    schemas/     validación de formularios (zod)
    services/    cliente Axios (token + renovación automática), servicios del API
    types/       tipos de los modelos y del API
```

### Breakpoints

| Prefijo  | Desde  | Dispositivo            | Navegación                   |
| -------- | ------ | ---------------------- | ---------------------------- |
| (base)   | 0      | iPhone XR (375px)      | barra inferior + menú lateral |
| `md:`    | 768px  | iPad                   | sidebar de iconos            |
| `lg:`    | 1024px | tablet grande          | sidebar completa, plegable   |
| `xl:`    | 1366px | Chromebook / portátil  | ídem                         |
| `2xl:`   | 1920px | escritorio grande      | ídem                         |

### API

🔒 = requiere `Authorization: Bearer <accessToken>`.

| Método | Ruta                                  | Descripción                                        |
| ------ | ------------------------------------- | -------------------------------------------------- |
| GET    | `/api/health`                         | Estado de la API y de MongoDB (sin rate limit)     |
| POST   | `/api/auth/register`                  | `{ nombre, email, password }` → usuario + tokens   |
| POST   | `/api/auth/login`                     | `{ email, password }` → usuario + tokens           |
| POST   | `/api/auth/refresh-token`             | `{ refreshToken }` → tokens nuevos (rota el refresh) |
| POST   | `/api/auth/logout`                    | `{ refreshToken }` → cierra la sesión del dispositivo |
| GET    | `/api/auth/me` 🔒                     | Usuario actual                                     |
| PATCH  | `/api/auth/me` 🔒                     | `{ nombre?, horasEstudioDiarias? }`                |
| GET    | `/api/asignaturas?archivadas=` 🔒     | `false` (defecto), `true` o `todas`; incluye `resumenTemas` |
| POST   | `/api/asignaturas` 🔒                 | Crear                                              |
| GET    | `/api/asignaturas/:id` 🔒             | Obtener una                                        |
| PUT    | `/api/asignaturas/:id` 🔒             | Editar                                             |
| DELETE | `/api/asignaturas/:id` 🔒             | Eliminar (con sus temas, exámenes y planes)        |
| PATCH  | `/api/asignaturas/:id/archivar` 🔒    | `{ archivada?: boolean }` (por defecto `true`)     |
| GET    | `/api/asignaturas/:id/temas` 🔒       | Temario ordenado                                   |
| POST   | `/api/asignaturas/:id/temas` 🔒       | `{ nombre, dificultad?, horasEstimadas? }`         |
| PUT    | `/api/temas/:id` 🔒                   | Editar tema                                        |
| DELETE | `/api/temas/:id` 🔒                   | Eliminar tema                                      |
| PATCH  | `/api/temas/:id/marcar-estudiado` 🔒  | `{ estudiado?: boolean }` (por defecto `true`)     |
| PUT    | `/api/horario` 🔒                     | Guarda el horario de la tabla: `{ asignaturas: [{ _id, horarios } \| { nombre, color, horarios }] }` |
| GET    | `/api/horario/escanear` 🔒            | `{ disponible }`: si el escaneo está configurado   |
| POST   | `/api/horario/escanear` 🔒            | `{ archivo: { mediaType, data (base64) } }` → clases detectadas (no guarda nada) |

Los errores siempre tienen la forma
`{ "error": { "message": "...", "code": "...", "details": {...} } }`
(`details` lleva un mensaje por campo en los errores de validación). Un access
token caducado responde `401` con `code: "TOKEN_EXPIRED"`; el frontend lo
renueva solo con el refresh token.

### Horario y escaneo

El horario se edita como una tabla semanal (página **Horario**, el formulario de
cada asignatura y el widget de Inicio). Para rellenarlo de golpe se puede
**escanear** una foto o PDF del horario: el backend lo envía a la API de Claude
(`claude-opus-5` por defecto, configurable con `ANTHROPIC_MODEL`) con salida
estructurada, limpia el resultado (une bloques contiguos, descarta horas
inválidas) y el usuario lo revisa antes de guardar.

Para activarlo, pon una clave de https://console.anthropic.com en
`ANTHROPIC_API_KEY` (en `.env`) y vuelve a desplegar. Sin clave, el botón
aparece desactivado y todo lo demás funciona. Cada escaneo consume créditos de
la API; `SCAN_RATE_LIMIT_MAX` limita los escaneos por hora (15 por defecto).
Las fotos se reducen a 2000 px en el navegador antes de enviarse.

### Sesiones

El access token dura 15 min y el refresh token 30 días. Cada inicio de sesión
crea una sesión por dispositivo (colección `sessions`); al renovar se rota y
al cerrar sesión se borra, así que cerrar sesión en el móvil no la cierra en el
Chromebook.
