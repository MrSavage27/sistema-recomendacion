// Configuración central leída de variables de entorno (.env en desarrollo).
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const num = (v, d) => (v !== undefined && v !== '' && !Number.isNaN(+v) ? +v : d);

// En Vercel el directorio de trabajo no está garantizado: las rutas relativas parten de la raíz del proyecto.
export const rutaDesdeRaiz = ruta => (ruta ? path.resolve(raiz, ruta) : '');

// Grabar respuestas en disco es solo para pruebas, y en Vercel el sistema de archivos no es escribible.
export const archivoRespuestas = (env = process.env) =>
  (env.VERCEL || env.NODE_ENV === 'production' ? '' : env.GEMINI_RESPUESTAS_ARCHIVO || '');

export const config = {
  port: num(process.env.PORT, 3000),
  databaseUrl: process.env.DATABASE_URL,
  // RDS exige SSL por defecto en PostgreSQL 15+. PGSSL=false solo para una BD local.
  pgSsl: (process.env.PGSSL ?? 'true') !== 'false',
  pgSslCaPath: rutaDesdeRaiz(process.env.PGSSL_CA),   // opcional: bundle CA de RDS (absoluta o relativa a la raíz)
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
  geminiTimeoutMs: num(process.env.GEMINI_TIMEOUT_MS, 8000),
  geminiDailyCap: num(process.env.GEMINI_DAILY_CAP, 500), // tope propio para no agotar la cuota gratuita
  geminiCacheMax: num(process.env.GEMINI_CACHE_MAX, 500),
  geminiCacheTtlMs: num(process.env.GEMINI_CACHE_TTL_MS, 86_400_000),
  geminiRespuestasArchivo: archivoRespuestas(),
  logEvents: (process.env.LOG_EVENTS ?? 'true') !== 'false'
};
