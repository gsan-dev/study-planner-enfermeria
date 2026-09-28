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

**Con Cloudflare delante:** crea una regla de caché que **no guarde**
`/service-worker.js` (Caching › Cache Rules › «URI Path equals
/service-worker.js» → *Bypass cache*). Si no, Cloudflare lo sirve cacheado
horas y los móviles tardan en recibir la versión nueva de la app.

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
  models/        User, Session, Asignatura, Tema, Examen, PlanEstudio, Progreso, Tarea, EntradaDiario
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

### Modo oscuro

No se usan variantes `dark:` clase a clase: en `src/index.css`, con
`data-tema="oscuro"` en `<html>`, se **redefinen los colores de la paleta**
(los grises se invierten y los tintes de rojo, ámbar, verde y marca se
oscurecen o aclaran según sean de fondo o de texto). Para lo que no encaja en
ese esquema hay tokens semánticos: `bg-superficie` (tarjetas y modales),
`bg-primario` y `bg-peligro` (botones con texto blanco) y los colores de los
gráficos (`--color-grafico-*`). **En código nuevo, usa `bg-superficie` en vez de
`bg-white`** y no escribas colores fijos en `style` salvo el de cada asignatura.

`public/tema.js` aplica el tema antes de pintar (no hay destello), y
`src/lib/tema.ts` lo cambia desde la app (Claro / Oscuro / Automático).

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
| PATCH  | `/api/auth/me` 🔒                     | `{ horasEstudioDiarias }`                          |
| PATCH  | `/api/auth/me/nombre` 🔒              | `{ nombre, password }` (con la contraseña; límite de intentos como el login) |
| PATCH  | `/api/auth/me/email` 🔒               | `{ email, password }` (con la contraseña; 409 si ya lo usa otra cuenta) |
| PUT    | `/api/auth/me/foto` 🔒                | `{ foto }`: data URL JPEG/PNG/WebP (se comprueba que sea de verdad una imagen) |
| DELETE | `/api/auth/me/foto` 🔒                | Quitar la foto de perfil                           |
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
| GET    | `/api/examenes?estado=&desde=&asignaturaId=` 🔒 | `proximos` (defecto), `pasados` o `todos`; `desde` = hoy del usuario (AAAA-MM-DD). Incluye asignatura y `resumenTemas` |
| POST   | `/api/examenes` 🔒                   | `{ asignaturaId, fecha (AAAA-MM-DD), tipo?, titulo?, hora?, peso?, aula?, notas?, temas? }`; sin `temas` entran todos los de la asignatura |
| GET    | `/api/examenes/:id` 🔒               | Obtener uno                                        |
| PUT    | `/api/examenes/:id` 🔒               | Editar (reemplaza; sin `temas` se conservan, salvo si cambia la asignatura) |
| DELETE | `/api/examenes/:id` 🔒               | Eliminar (con su plan de estudio)                  |
| GET    | `/api/examenes/:id/detalles` 🔒      | Examen + asignatura + temas que entran + temario completo |
| POST   | `/api/examenes/:id/temas` 🔒         | `{ temas: [ids] }` → fija qué temas entran     |
| GET    | `/api/plan-estudio` 🔒                | Resumen de todos los planes (progreso, próxima sesión, atrasadas) |
| POST   | `/api/plan-estudio/generar-automatico` 🔒 | `{ examenId, horasPorDia?, fechaInicio?, diasDescanso?, repaso?, incluirEstudiados?, guardar? }` → `{ plan, resumen }`; sin `guardar` es solo vista previa |
| POST   | `/api/plan-estudio/crear-manual` 🔒  | `{ examenId, tipo?, horasPorDia?, fechaInicio?, diasPlan: [{ fecha, temaId, horas, tipo?, completado? }] }`; sustituye el plan del examen |
| GET    | `/api/plan-estudio/:examenId` 🔒     | Plan del examen (`{ plan: null }` si no tiene)  |
| PUT    | `/api/plan-estudio/:id/dia` 🔒       | `{ diaId, completado?, temaId?, horas?, fecha?, tipo?, notas? }` → `{ plan, temaEstudiado }` |
| DELETE | `/api/plan-estudio/:id` 🔒           | Eliminar plan                                      |
| GET    | `/api/agenda?desde=&hasta=&hoy=` 🔒  | Rango de días (máx. 62): `{ tareas, diario, examenes, sesiones, pendientes }`; con `hoy`, `pendientes` = tareas sin hacer de días anteriores |
| POST   | `/api/agenda/tareas` 🔒              | `{ fecha, texto, hora? }`                          |
| PATCH  | `/api/agenda/tareas/:id` 🔒          | `{ fecha?, texto?, hora? ("" la quita), hecho? }`   |
| DELETE | `/api/agenda/tareas/:id` 🔒          | Borrar tarea                                       |
| PUT    | `/api/agenda/diario/:fecha` 🔒       | `{ texto, animo? (1-5) }` → entrada del día (una por día); sin texto ni ánimo se borra |
| GET    | `/api/dashboard?hoy=` 🔒             | Inicio en una petición: resumen, 3 próximos exámenes (con progreso del plan), lo de hoy, la semana y el cumplimiento |
| GET    | `/api/calendario/mes?mes=AAAA-MM` 🔒 | Info por día de la cuadrícula del mes: exámenes, estudio por asignatura, tareas y diario; y la leyenda |
| POST   | `/api/progreso/registrar-horas` 🔒   | `{ fecha, horas (de 15 en 15 min), temaId? , asignaturaId?, notas? }` (tema o asignatura) |
| GET    | `/api/progreso?limite=` 🔒            | Últimos registros de horas (a mano y del plan)     |
| DELETE | `/api/progreso/:id` 🔒                | Borrar un registro a mano (los del plan se quitan desmarcando la sesión) |
| GET    | `/api/progreso/resumen?hoy=` 🔒       | Horas totales, de hoy, semana y mes, media diaria (30 días), racha y mejor racha, temas estudiados |
| GET    | `/api/progreso/por-asignatura?periodo=` 🔒 | `semana`, `mes` o `todo` (defecto).  Horas estudiadas, planificadas y recomendadas y temario estudiado por asignatura |
| GET    | `/api/estadisticas/semana-actual?hoy=` 🔒 | Horas estudiadas y planificadas por día (lunes a domingo) |
| GET    | `/api/estadisticas/por-tema?asignaturaId=` 🔒 | Horas invertidas vs planificadas vs recomendadas por tema |
| GET    | `/api/estadisticas/evolucion?desde=&hasta=` 🔒 | Horas por día y acumuladas (máx. un año; por defecto 30 días) |
| GET    | `/api/estadisticas/prediccion?hoy=` 🔒 | Preparación estimada (0-10) de cada examen próximo, ahora y si se cumple el plan |
| GET    | `/api/notificaciones?limite=&soloNoLeidas=` 🔒 | Recientes primero, con el total `noLeidas` |
| POST   | `/api/notificaciones` 🔒             | `{ titulo, mensaje, url? }` → recordatorio propio (también por push) |
| PATCH  | `/api/notificaciones/:id/leer` 🔒    | `{ leida? }` (por defecto `true`)            |
| PATCH  | `/api/notificaciones/leer-todas` 🔒  | Marca todas como leídas                            |
| DELETE | `/api/notificaciones/:id` 🔒         | Borrar                                             |
| POST   | `/api/notificaciones/prueba` 🔒      | Notificación de prueba a todos los dispositivos    |
| POST   | `/api/notificaciones/comprobar` 🔒   | Revisa ya los avisos programados de la usuaria     |
| GET/PUT | `/api/notificaciones/preferencias` 🔒 | `{ examenes, planDiario, retraso, logros, horaDiaria, zonaHoraria }` |
| GET    | `/api/notificaciones/push/clave` 🔒  | Clave pública VAPID                                |
| GET/POST/DELETE | `/api/notificaciones/push/suscripciones` 🔒 | Dispositivos suscritos; alta `{ endpoint, keys, dispositivo?, zonaHoraria? }` y baja `{ endpoint }` |

Los errores siempre tienen la forma
`{ "error": { "message": "...", "code": "...", "details": {...} } }`
(`details` lleva un mensaje por campo en los errores de validación). Un access
token caducado responde `401` con `code: "TOKEN_EXPIRED"`; el frontend lo
renueva solo con el refresh token.

### Horario y escaneo

El horario se edita como una tabla semanal (página **Horario**, el formulario de
cada asignatura y el widget de Inicio). Para rellenarlo de golpe se puede
**escanear** una foto o PDF del horario: el backend lo envía a una IA con visión
y salida JSON estructurada, limpia el resultado (une bloques contiguos, descarta
horas inválidas) y el usuario lo revisa en la tabla antes de guardar.

Proveedores (basta con una clave en `.env`; sin ninguna, el botón aparece
desactivado y todo lo demás funciona):

| Proveedor | Variables | Notas |
| --------- | --------- | ----- |
| **Gemini** (el que se usa) | `GEMINI_API_KEY`, `GEMINI_MODEL` (`gemini-3.8-flash`), `GEMINI_FALLBACK_MODELS` | Si un modelo está saturado (503), el SDK reintenta con espera; si sigue saturado o sin cuota (429), pasa al siguiente de la lista. Plan gratuito: **20 escaneos/día por modelo**. |
| Claude | `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` (`claude-opus-5`) | Alternativa de pago. |

Si hay varias claves se usa Gemini; `SCAN_PROVIDER=gemini|anthropic` lo fuerza.
`SCAN_RATE_LIMIT_MAX` limita los escaneos por hora e IP (15 por defecto). Las
fotos se reducen a 2000 px en el navegador antes de enviarse.

Precisión medida con un horario de prueba de 12 clases (siglas con leyenda,
celdas de varias horas): imagen nítida 12/12, PDF 11/12, foto inclinada y
borrosa 10/12. Los fallos son bloques desplazados una fila, fáciles de corregir
en la tabla.

### Fechas de examen

Son días de calendario: el API recibe `AAAA-MM-DD` y lo guarda a medianoche
UTC, y el frontend lo trata como texto (`fecha.slice(0, 10)`). Así el día
no se desplaza por la zona horaria del servidor ni del navegador.

### Generador de planes

`backend/src/services/planGenerator.js` (función pura, sin base de datos):

1. **Días:** desde `fechaInicio` hasta la víspera del examen, sin los días de
   descanso. La capacidad de cada día es `horasPorDia` menos lo que ya ocupan
   los planes de otros exámenes.
2. **Tiempo por tema:** `horasEstimadas × factor de dificultad` (1 → ×0,7,
   2 → ×0,85, 3 → ×1, 4 → ×1,25, 5 → ×1,5). Con repaso, un 25 % extra que se
   coloca al final. Los temas estudiados se saltan (o solo se repasan).
3. **Si no da tiempo** se recorta proporcionalmente (mínimo 15 min por tema)
   usando toda la capacidad, y se avisa. **Si sobra**, la carga se reparte de
   forma uniforme en vez de concentrarla al principio.
4. Se rellenan los días en el orden del temario, en cuartos de hora.

Al regenerar se conservan las sesiones completadas y se descuentan de lo que
falta. Completar la última sesión de estudio de un tema lo marca como
estudiado. Quitar un tema del examen lo quita también de su plan.

### Progreso y estadísticas

Las horas estudiadas son los registros de la colección `progresos`: los que
se apuntan a mano («Registrar horas») y los que se crean solos al completar
una sesión del plan (se borran al desmarcarla y se actualizan si cambian sus
horas o su día). Al arrancar, la API crea los registros de las sesiones que ya
estuvieran completadas (es idempotente).

La **preparación estimada** de un examen (0-10) es orientativa: la mitad por
las horas estudiadas de sus temas frente a las recomendadas (horas estimadas ×
dificultad, hasta el 100 %) y la mitad por la proporción de temas estudiados.
«Si cumples el plan» suma las horas pendientes del plan y da por estudiados los
temas con sesiones de estudio pendientes.

### Notificaciones (Web Push)

Llegan aunque la app esté cerrada: la API las envía con **Web Push** (VAPID)
al servicio de notificaciones del navegador (Apple, Google, Mozilla o
Microsoft) y el service worker las muestra; al tocarlas se abre la pantalla
correspondiente. Con la app abierta, además, la campana se actualiza al
momento y sale un aviso.

- **Claves VAPID**: sin `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` en `.env`, la API
  las genera en el primer arranque y las guarda en MongoDB (colección
  `config`). No cambies las claves: las suscripciones existentes dejarían de
  valer.
- **Avisos programados**: cada `NOTIFICACIONES_INTERVALO_MIN` minutos (5 por
  defecto) se revisan, en la zona horaria de cada usuaria y a partir de su
  hora de aviso: exámenes a 7, 3 y 1 día, el plan del día y los retrasos. Cada
  aviso lleva una clave (tipo + examen o día) para no repetirse. La
  felicitación al completar un plan se envía al momento.
- **Seguridad**: solo se aceptan suscripciones hacia los servicios de push
  conocidos (así la API no puede usarse para hacer peticiones a otras webs).
  Las suscripciones caducadas (404/410) se borran solas.
- **Etiqueta y prioridad**: cada notificación lleva su propia etiqueta (`tag`).
  Si dos compartieran etiqueta, el sistema sustituiría la anterior en silencio
  (sin sonido ni aviso emergente); por si acaso, el service worker usa
  `renotify`. Las que provoca la usuaria (prueba, recordatorio propio,
  felicitación) van con prioridad alta (`Urgency: high`).
- **Requisitos**: HTTPS (o `localhost`). En **iPhone/iPad** solo funciona con la
  app **añadida a la pantalla de inicio** (iOS 16.4+); la app lo detecta y
  explica los pasos.

### Sesiones

El access token dura 15 min y el refresh token 30 días. Cada inicio de sesión
crea una sesión por dispositivo (colección `sessions`); al renovar se rota y
al cerrar sesión se borra, así que cerrar sesión en el móvil no la cierra en el
Chromebook.
