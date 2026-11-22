// Prueba rápida de conexión: npm run db:check
import { pool } from '../src/db.js';
try {
  const { rows } = await pool.query('SELECT version(), current_database() AS bd');
  console.log('✓ Conectado a', rows[0].bd, '·', rows[0].version.split(',')[0]);
} catch (e) {
  console.error('✕ No se pudo conectar:', e.message);
  process.exitCode = 1;
} finally { await pool.end(); }
