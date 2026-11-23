import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { attachDatabasePool } from '@vercel/functions';
import pg from 'pg';
import { config } from './config.js';

// DATE como texto 'YYYY-MM-DD' (evita corrimientos por zona horaria).
pg.types.setTypeParser(1082, v => v);

if (!config.databaseUrl) {
  // En una función serverless, process.exit mataría la instancia sin dejar el motivo en los logs.
  throw new Error('Falta DATABASE_URL. En local copia .env.example a .env; en Vercel agrégala en Environment Variables.');
}

// Ruta estática a propósito: Vercel solo empaqueta el archivo si puede deducirla del código.
const CA_RDS = fileURLToPath(new URL('../certs/rds-global-bundle.pem', import.meta.url));

function sslOptions() {
  if (!config.pgSsl) return false;
  const rutaCa = config.pgSslCaPath || (process.env.VERCEL ? CA_RDS : '');
  if (rutaCa) {
    if (!fs.existsSync(rutaCa)) throw new Error(`No se encontró el certificado PGSSL_CA: ${rutaCa}`);
    return { ca: fs.readFileSync(rutaCa, 'utf8') };
  }
  // Sin bundle CA: cifra la conexión pero no verifica el certificado (aceptable en el AWS Lab).
  return { rejectUnauthorized: false };
}

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  ssl: sslOptions(),
  // Cada instancia de la función tiene su propio pool y una db.t3.micro admite pocas conexiones.
  max: 3,
  connectionTimeoutMillis: 8000,
  idleTimeoutMillis: 10000,
  keepAlive: true,
  // Sin este retardo, el primer keepalive TCP usa el valor del sistema (~2 h) y no evita el corte del NAT.
  keepAliveInitialDelayMillis: 10000,
  statement_timeout: 10000,
  // Algo mayor que statement_timeout: solo actúa si el servidor no responde porque la conexión murió.
  query_timeout: 11000
});

pool.on('error', err => console.error('[pg] error inesperado en el pool:', err.message));

// Libera las conexiones inactivas antes de que Fluid compute suspenda la instancia.
if (process.env.VERCEL) attachDatabasePool(pool);
