import fs from 'node:fs';
import pg from 'pg';
import { config } from './config.js';

// DATE como texto 'YYYY-MM-DD' (evita corrimientos por zona horaria).
pg.types.setTypeParser(1082, v => v);

if (!config.databaseUrl) {
  console.error('Falta DATABASE_URL. Copia .env.example a .env y complétalo.');
  process.exit(1);
}

function sslOptions() {
  if (!config.pgSsl) return false;
  if (config.pgSslCaPath) return { ca: fs.readFileSync(config.pgSslCaPath, 'utf8') };
  // Sin bundle CA: cifra la conexión pero no verifica el certificado (aceptable en el AWS Lab).
  return { rejectUnauthorized: false };
}

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  ssl: sslOptions(),
  max: 5,
  connectionTimeoutMillis: 8000,
  idleTimeoutMillis: 30000,
  keepAlive: true,
  // Sin este retardo, el primer keepalive TCP usa el valor del sistema (~2 h) y no evita el corte del NAT.
  keepAliveInitialDelayMillis: 10000,
  statement_timeout: 10000,
  // Algo mayor que statement_timeout: solo actúa si el servidor no responde porque la conexión murió.
  query_timeout: 11000
});

pool.on('error', err => console.error('[pg] error inesperado en el pool:', err.message));
