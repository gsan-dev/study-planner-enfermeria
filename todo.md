# 📚 Study Planner - Task List

**Proyecto:** Study Planner para Enfermería (Web App PWA)
**Usuario:** Novia del developer (iPhone XR)
**Tipo:** Progressive Web App (PWA) - accesible desde cualquier dispositivo
**Objetivo:** App web de planificación de estudios con generador automático de planes

⚠️ **REQUISITOS IMPORTANTES:**
- ✅ **100% Responsive:** iPhone XR (375px) → Tablet → Chromebook → Desktop (2560px+)
- ✅ **Multi-dispositivo:** iOS Safari, Chrome, Firefox, Edge en todos los tamaños
- ✅ **Accesible desde cualquier lugar:** HTTPS, URL pública, sin VPN necesario
- ✅ **PWA:** Se puede "instalar" desde navegador sin App Store
- ✅ **Offline-ready:** Service Workers + IndexedDB para funcionar sin conexión
- ✅ **Cloud deployed:** Backend + Frontend en servidor accesible 24/7
- ✅ **CORS configurado:** Acceso desde cualquier dominio/dispositivo
- ✅ **No requiere dependencias nativas**

---

## **FASE 1: SETUP & INFRASTRUCTURE** ✅

### Docker & Despliegue
- [x] `docker-compose.yml` de producción: MongoDB 8 + API + Caddy (PWA, proxy `/api`, HTTPS automático)
- [x] `docker-compose.dev.yml` con hot reload (Vite + nodemon) y MongoDB expuesto
- [x] `.env.example` en la raíz, `scripts/deploy.sh`, `scripts/backup.sh`, `scripts/restore.sh`
- [x] Healthchecks (mongo, backend) y arranque ordenado; imágenes multi-stage, usuario no root

### Backend Setup
- [x] Crear estructura carpetas: `backend/` con `src/`, `config/`, `controllers/`, `models/`, `routes/`, `middlewares/`
- [x] Inicializar Node.js: `npm init`, instalar Express, MongoDB, JWT, bcrypt, dotenv, cors
  - Express 5, Mongoose 9, bcryptjs (JS puro, sin dependencias nativas)
- [x] Crear `.env.example` con variables necesarias (MONGO_URI, JWT_SECRET, PORT)
- [x] Configurar MongoDB connection en `config/database.js` (con reintentos)
- [x] Crear middleware de autenticación JWT (`middlewares/auth.js` → `requireAuth`)
- [x] Crear error handler centralizado (Mongoose, duplicados, JSON inválido, 404)
- [x] **CORS Configuration:** Permitir requests desde cualquier origen (para multi-dispositivo)
  - `Access-Control-Allow-Origin: *` o whitelist de dominios (`CORS_ORIGINS`)
  - Headers necesarios: Content-Type, Authorization
- [x] **Rate limiting:** Proteger API de abuso (general + `authLimiter` estricto para la fase 2)
- [x] Logging centralizado (requests, errores) con pino (JSON en producción)
- [x] Endpoint `GET /api/health` (usado por Docker y por el frontend)

### Frontend Setup
- [x] Crear React app con TypeScript + Vite (faster que CRA)
- [x] Instalar: Tailwind CSS, React Router, Axios, date-fns
- [x] Crear estructura: `src/components/`, `src/pages/`, `src/services/`, `src/hooks/`, `src/types/`
- [x] Configurar variables de entorno (VITE_API_URL)
- [x] Crear layout base (header, sidebar, responsive)
- [x] **RESPONSIVE DESIGN:** Breakpoints configurados (en `src/index.css`):
  - Mobile: 375px (iPhone XR)
  - Small Tablet: 768px
  - Large Tablet: 1024px
  - Desktop: 1366px+ (Chromebook)
  - Large Desktop: 1920px+
- [ ] **Testing en múltiples dispositivos:**
  - [x] iPhone XR (375px) — verificado en navegador headless
  - [x] iPad (768px) — verificado en navegador headless
  - [x] Chromebook (1366px) — verificado en navegador headless
  - [ ] Desktop grande (1920px)
  - [ ] Prueba en dispositivos reales
- [x] Usar Tailwind responsive classes (`sm:`, `md:`, `lg:`, `xl:`)
- [x] Sidebar/drawer que colapsa en mobile
- [x] Navigation adaptativa (bottom nav en mobile, sidebar en desktop)

### PWA Configuration (CRÍTICO)
- [x] Crear `public/manifest.json` con:
  - name, short_name, description, icons (192x192, 512x512)
  - start_url, display: "standalone"
  - theme_color, background_color
- [x] Crear `public/service-worker.js` para offline caching
- [x] Link manifest.json en HTML
- [x] Link service-worker.js en App.tsx (`useServiceWorker`, con aviso de nueva versión)
- [x] Crear `public/apple-touch-icon.png` (180x180) para iOS home screen (`npm run icons`)
- [x] Meta tags Apple específicos para iOS (apple-mobile-web-app-capable, etc)
- [ ] Testing: "Agregar a pantalla de inicio" en Safari iOS (requiere despliegue con HTTPS)
- [x] Asegurar HTTPS en producción (requerido para PWA) — Caddy + Let's Encrypt vía `SITE_ADDRESS`

### Database Design
- [x] Crear schema `User` (email, password, nombre, createdAt)
- [x] Crear schema `Asignatura` (nombre, profesor, créditos, horarios, color, userId)
- [x] Crear schema `Examen` (tipo, fecha, hora, peso, asignaturaId, userId)
- [x] Crear schema `Tema` (nombre, dificultad 1-5, horasEstimadas, asignaturaId, estudiado)
- [x] Crear schema `PlanEstudio` (examenId, userId, diasPlan array con {fecha, tema, horas, completado})
- [x] Crear schema `Progreso` (userId, horasEstudiadas, temasEstudiados, fechas registro)

---

## **FASE 2: AUTENTICACIÓN & CRUD ASIGNATURAS** ✅

### Authentication
- [x] Endpoint POST `/auth/register` - registro con validación (zod)
- [x] Endpoint POST `/auth/login` - login con JWT
- [x] Endpoint POST `/auth/refresh-token` - renovar token (rotación: cada refresh token vale una vez)
- [x] Endpoint POST `/auth/logout` - logout (cierra solo la sesión de ese dispositivo)
- [x] Extra: GET/PATCH `/auth/me` - perfil (nombre, horas de estudio diarias)
- [x] Frontend: crear página de login/register
- [x] Frontend: guardar token en localStorage seguro (+ CSP en Caddy contra XSS)
- [x] Frontend: interceptor Axios para agregar token a requests (+ renovación automática al caducar)
- [x] Extra: página de Ajustes y menú de usuario con cerrar sesión

### Gestión de Asignaturas
- [x] Endpoint GET `/asignaturas` - listar todas (usuario logueado), con resumen de temas
- [x] Endpoint POST `/asignaturas` - crear nueva
- [x] Endpoint PUT `/asignaturas/:id` - editar
- [x] Endpoint DELETE `/asignaturas/:id` - eliminar (en cascada: temas, exámenes y planes)
- [x] Endpoint PATCH `/asignaturas/:id/archivar` - archivar (no eliminar), con deshacer
- [x] Frontend: página de asignaturas (CRUD completo)
- [x] Frontend: modal para crear/editar asignaturas
- [x] Frontend: validar datos (profesor, horarios formato, franjas solapadas)

### Gestión de Temario
- [x] Endpoint POST `/asignaturas/:id/temas` - agregar tema
- [x] Endpoint GET `/asignaturas/:id/temas` - listar temas de asignatura
- [x] Endpoint PUT `/temas/:id` - editar tema
- [x] Endpoint DELETE `/temas/:id` - eliminar tema (lo quita también de exámenes y planes)
- [x] Endpoint PATCH `/temas/:id/marcar-estudiado` - marcar como estudiado
- [x] Frontend: dentro de asignatura, expandir y ver/crear temas

### Horario semanal (añadido)
- [x] Horario como tabla semanal tipo calendario (días × horas): tocar un hueco añade una clase, tocar una clase la edita
- [x] Página `/horario` con todas las asignaturas; el formulario de asignatura usa la misma tabla (las demás en gris)
- [x] Escanear foto/PDF de un horario con Claude → revisar asignaturas detectadas → retocar en la tabla → guardar
- [x] Endpoint PUT `/horario` (guardado conjunto) y POST `/horario/escanear` (con rate limit propio)
- [x] Inicio: horario abajo a la izquierda (debajo de "Para empezar"); a la derecha, hueco reservado
- [x] Escaneo con Gemini (`GEMINI_API_KEY`), con reintentos y modelos alternativos; Claude queda como opción
- [x] Probado con horario de prueba: imagen 12/12, PDF 11/12, foto inclinada 10/12
- [ ] Probar el escaneo con el horario real de la universidad
- [ ] Decidir qué va en el hueco reservado de Inicio

---

## **FASE 3: GESTIÓN DE EXÁMENES** ✅

### CRUD Exámenes
- [x] Endpoint GET `/examenes` - listar exámenes próximos (ordenados por fecha)
- [x] Endpoint POST `/examenes` - crear examen
- [x] Endpoint PUT `/examenes/:id` - editar
- [x] Endpoint DELETE `/examenes/:id` - eliminar
- [x] Endpoint GET `/examenes/:id/detalles` - obtener examen con asignatura y temas asociados
- [x] Frontend: página de exámenes (calendario mensual + lista próximos/pasados, filtro por asignatura; recuerda la vista)
- [x] Frontend: modal para crear/editar examen
- [x] Frontend: mostrar examen con asignatura color-coded

### Lógica de Relaciones
- [x] Al crear examen, asociar con asignatura automáticamente
- [x] Al crear examen, sugerir temas de esa asignatura (todos marcados; se pueden quitar o añadir temas nuevos al temario desde el propio examen)
- [x] Endpoint POST `/examenes/:id/temas` - asignar temas al examen (cuáles entra)
- [x] Extra: detalle del examen con cuenta atrás y temas para marcar como estudiados
- [x] Arreglado (Fase 2): al editar una asignatura, vaciar profesor o créditos no los borraba

---

## **FASE 4: GENERADOR DE PLAN DE ESTUDIO**

### Motor de Recomendaciones
- [ ] Crear algoritmo que calcule: días hasta examen, horas disponibles, dificultad de temas
- [ ] Endpoint POST `/plan-estudio/generar-automatico` - genera plan según:
  - Temas a estudiar
  - Dificultad de cada tema
  - Horas disponibles por día
  - Días hasta examen
- [ ] Algoritmo: distribuye horas de forma inteligente (temas difíciles más tiempo)
- [ ] Endpoint GET `/plan-estudio/:examenId` - obtener plan generado
- [ ] Endpoint PUT `/plan-estudio/:id/dia` - actualizar un día del plan (marcar completado, cambiar tema)

### Plan Manual
- [ ] Endpoint POST `/plan-estudio/crear-manual` - usuario crea su propio plan
- [ ] Frontend: interfaz tipo "calendario" donde ella puede arrastrar temas a días
- [ ] Frontend: validar que no hay overlap y que cubra todos los temas

### Frontend - Generador
- [ ] Página "Crear Plan": elegir examen
- [ ] Opción A: "Generar automático" (un clic)
- [ ] Opción B: "Crear manual" (interfaz drag-drop)
- [ ] Preview del plan generado antes de guardar
- [ ] Poder regenerar con diferentes parámetros

---

## **FASE 5: DASHBOARD & VISUALIZACIÓN**

### Dashboard Principal
- [ ] Mostrar próximos 3 exámenes (tarjetas grandes)
- [ ] Widget "¿Qué estudiar hoy?" (basado en plan)
- [ ] Resumen semanal de horas estudiadas
- [ ] Indicador de cumplimiento de plan

### Calendario Visual
- [ ] Endpoint GET `/calendario/mes` - obtener info por día del mes
- [ ] Frontend: calendario tipo Google Calendar
- [ ] Color por asignatura
- [ ] Mostrar exámenes en fechas
- [ ] Mostrar días del plan de estudio

### Vista de Asignatura
- [ ] Página asignatura: mostrar todos sus temas, exámenes, progreso
- [ ] Barra de progreso: % temario estudiado
- [ ] Próximo examen de esa asignatura

---

## **FASE 6: ESTADÍSTICAS & PROGRESO**

### Tracking de Progreso
- [ ] Endpoint POST `/progreso/registrar-horas` - registrar X horas estudiadas en Y tema
- [ ] Endpoint GET `/progreso/resumen` - obtener datos de progreso del usuario
- [ ] Endpoint GET `/progreso/por-asignatura` - desglose de progreso por asignatura

### Gráficos & Estadísticas
- [ ] Endpoint GET `/estadisticas/semana-actual` - horas por día
- [ ] Endpoint GET `/estadisticas/por-tema` - horas inversión vs horas planificadas
- [ ] Frontend: gráfico barras (horas/día)
- [ ] Frontend: gráfico pastel (horas por asignatura)
- [ ] Frontend: gráfico línea (progreso acumulado en tiempo)
- [ ] Mostrar predicción de nota (horas estudiadas vs requeridas)

---

## **FASE 7: NOTIFICACIONES & AVISOS**

### Sistema de Notificaciones
- [ ] Crear modelo `Notificacion` en BD
- [ ] Endpoint POST `/notificaciones` - crear notificación
- [ ] Endpoint GET `/notificaciones` - listar notificaciones no leídas
- [ ] Endpoint PATCH `/notificaciones/:id/leer` - marcar como leída

### Reglas de Notificación
- [ ] 7 días antes del examen: "Tu examen de [Asignatura] es en 7 días"
- [ ] 3 días antes: "Deberías empezar a estudiar si no lo has hecho"
- [ ] Diario: "Estudia [Tema] hoy según tu plan"
- [ ] Si se atrasa: "Vas retrasado 1 día en tu plan. Aumenta horas"
- [ ] Si completa todo: "¡Felicidades! Completaste el plan de [Examen]"

### Frontend - Notificaciones
- [ ] Bell icon en header
- [ ] Dropdown con notificaciones recientes
- [ ] Toast notifications para eventos en tiempo real
- [ ] Página de historial de notificaciones

---

## **FASE 8: RECOMENDACIONES AUTOMÁTICAS**

### Motor de Recomendaciones
- [ ] Endpoint GET `/recomendaciones` - obtener recomendaciones personalizadas
- [ ] Lógica:
  - Si aún no empezó a estudiar: "Deberías empezar tema X pronto"
  - Si va atrasado: "Aumenta horas de estudio"
  - Si hay mucho por estudiar: "Tema X es difícil, dedica más tiempo"
  - Si va adelantado: "Vas bien, puedes revisar y reforzar"

### Frontend
- [ ] Card "Recomendaciones" en dashboard
- [ ] Mostrar recomendación principal arriba
- [ ] Listado de todas las recomendaciones
- [ ] Botón "Seguir recomendación" que abre plan/tema

---

## **FASE 9: REFINAMIENTO & UX**

### Mejoras de UX
- [ ] **Responsive Design Multi-Dispositivo:**
  - iPhone XR: bottom navigation, single column, toque optimizado
  - Tablet (iPad): 2-column layout, sidebar, toque optimizado
  - Chromebook/Desktop: 3-column layout, sidebar collapsible, mouse/keyboard friendly
- [ ] Dark mode toggle (nice to have)
- [ ] Animaciones suaves (transiciones, skeleton loaders)
- [ ] Validaciones de formularios claras
- [ ] Mensajes de error/éxito informativos
- [ ] Loading states en todas las acciones
- [ ] Bottom navigation en mobile (vs top bar)
- [ ] **Touch-friendly UI en mobile:** botones 44x44px mínimo
- [ ] **Mouse-friendly en desktop:** hover effects, cursors adecuados
- [ ] **Keyboard navigation:** Tab order lógico, accesibilidad
- [ ] Zoom/scale soportado en todos los navegadores
- [ ] Testing en DevTools con múltiples resoluciones

### Offline & PWA
- [ ] Service Worker cacheando assets estáticos
- [ ] Stratégia de cache: StaleWhileRevalidate para API calls
- [ ] Indicador "sin conexión" en UI
- [ ] Guardar datos en localStorage/IndexedDB mientras está offline
- [ ] Sincronización automática cuando vuelve conexión
- [ ] Testing offline en Safari iOS DevTools

### Accesibilidad
- [ ] Labels en formularios
- [ ] Contrastes de color adecuados
- [ ] Focus states visibles
- [ ] Textos alt en imágenes

### Performance
- [ ] Lazy loading de componentes
- [ ] Cacheo de requests (react-query o SWR)
- [ ] Compresión de imágenes
- [ ] Code splitting en rutas

---

## **FASE 10: TESTING & DOCUMENTACIÓN**

### Testing Backend
- [ ] Tests de autenticación (login, register, refresh)
- [ ] Tests de CRUD asignaturas
- [ ] Tests del generador de plan
- [ ] Tests de notificaciones

### Testing Frontend
- [ ] Componentes principales testeados
- [ ] Flujos principales (login → crear asignatura → crear examen → plan)

### Documentación
- [ ] README.md con setup (backend + frontend)
- [ ] API docs (Postman collection o Swagger)
- [ ] Guía de uso para la novia

---

## **FASE 11: DEPLOY & PWA FINALIZACIÓN**

### Deploy Web (Cloud - Accesible desde cualquier lugar)
- [ ] Backend: Deploy a Vercel, Railway, Render, o Heroku (HTTPS obligatorio)
  - Base de datos MongoDB Atlas (cloud MongoDB)
  - Variables de entorno configuradas
  - Health check endpoint
- [ ] Frontend: Deploy a Vercel, Netlify, o GitHub Pages
  - HTTPS automático
  - CDN global (rápido desde cualquier país)
  - Auto-deploy en cada push a main
- [ ] **URL pública:**
  - Backend: `https://api-study.tudominio.com` (o similar)
  - Frontend: `https://study.tudominio.com` (o similar)
- [ ] Testing desde múltiples ubicaciones/dispositivos:
  - iPhone XR (Safari)
  - Chromebook (Chrome)
  - Desktop (Firefox, Edge)
  - Red diferente (móvil data)

### PWA en Producción
- [ ] HTTPS en ambos (backend + frontend)
- [ ] Service Worker registrado y funcionando
- [ ] Manifest.json en frontend/public
- [ ] Testing "Agregar a pantalla de inicio" en iPhone XR
- [ ] Testing "Instalar app" en Chromebook
- [ ] Apple touch icon visible al instalar
- [ ] Nombre de app bonito en home screen
- [ ] Testing offline: desactivar wifi y verificar funcionalidad
- [ ] Testing en Safari, Chrome, Firefox iOS y Chromebook

### Documentación para la novia
- [ ] Link directo: `https://estudio.tudominio.com` (fácil de recordar)
- [ ] QR code para acceder rápido
- [ ] Tutorial: "Cómo agregar a pantalla de inicio" (iPhone + Chromebook)
- [ ] Guía de uso de la app
- [ ] Cómo contactarte si hay bugs
- [ ] Video tutorial (opcional)

---

## **EXTRAS (Nice to Have)**

- [ ] Compartir plan por link con amigos
- [ ] Exportar plan a PDF
- [ ] Integración con Google Calendar (mostrar exámenes)
- [ ] Modo offline con Service Workers
- [ ] Gamificación (badges por completar planes)
- [ ] Importar horarios automáticamente
- [ ] Recordatorios por email o push notifications reales

---

**Prioridad:** Terminar Fase 1-5 es el MVP funcional. Fase 6-8 lo hace especial.

¿Listo? 🚀