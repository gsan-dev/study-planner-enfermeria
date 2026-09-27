import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const required = ['MONGO_URI', 'JWT_SECRET'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`Faltan variables de entorno obligatorias: ${missing.join(', ')}`);
  process.exit(1);
}

const nodeEnv = process.env.NODE_ENV || 'development';

if (nodeEnv === 'production' && process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET debe tener al menos 32 caracteres en producción');
  process.exit(1);
}

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

export const env = Object.freeze({
  nodeEnv,
  isProduction: nodeEnv === 'production',
  port: toInt(process.env.PORT, 4000),
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  // "*" permite cualquier origen; si no, lista separada por comas.
  corsOrigins: (process.env.CORS_ORIGINS || '*')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  rateLimitWindowMs: toInt(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  rateLimitMax: toInt(process.env.RATE_LIMIT_MAX, 300),
  authRateLimitMax: toInt(process.env.AUTH_RATE_LIMIT_MAX, 20),
  // Número de proxies inversos delante de la API (Caddy en Docker = 1).
  trustProxy: toInt(process.env.TRUST_PROXY, 0),
  logLevel: process.env.LOG_LEVEL || (nodeEnv === 'production' ? 'info' : 'debug'),
  // Escaneo de horarios con IA (opcional: sin ninguna clave, la función se desactiva).
  // SCAN_PROVIDER fuerza "gemini" o "anthropic"; vacío = el primero con clave.
  scanProvider: (process.env.SCAN_PROVIDER || '').trim().toLowerCase(),
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
  // Alternativos si el principal está saturado (lista separada por comas).
  geminiFallbackModels: (process.env.GEMINI_FALLBACK_MODELS ?? 'gemini-3.6-flash,gemini-flash-latest')
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean),
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-opus-5',
  scanRateLimitMax: toInt(process.env.SCAN_RATE_LIMIT_MAX, 15),
});
