// Configuración central leída de variables de entorno (.env en desarrollo).
const num = (v, d) => (v !== undefined && v !== '' && !Number.isNaN(+v) ? +v : d);

export const config = {
  port: num(process.env.PORT, 3000),
  databaseUrl: process.env.DATABASE_URL,
  // RDS exige SSL por defecto en PostgreSQL 15+. PGSSL=false solo para una BD local.
  pgSsl: (process.env.PGSSL ?? 'true') !== 'false',
  pgSslCaPath: process.env.PGSSL_CA || '',            // opcional: ruta al bundle CA de RDS
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
  geminiTimeoutMs: num(process.env.GEMINI_TIMEOUT_MS, 8000),
  geminiDailyCap: num(process.env.GEMINI_DAILY_CAP, 500), // tope propio para no agotar la cuota gratuita
  logEvents: (process.env.LOG_EVENTS ?? 'true') !== 'false'
};
