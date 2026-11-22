// Crea las tablas (db/schema.sql) y carga el catálogo (db/seed.sql).
// Uso: npm run db:migrate
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../src/db.js';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'db');
const client = await pool.connect();
try {
  for (const f of ['schema.sql', 'seed.sql']) {
    await client.query('BEGIN');
    await client.query(fs.readFileSync(path.join(dir, f), 'utf8'));
    await client.query('COMMIT');
    console.log(`✓ ${f}`);
  }
  const { rows } = await client.query('SELECT id, precio, tienda FROM v_catalogo ORDER BY precio');
  console.table(rows);
} catch (e) {
  await client.query('ROLLBACK').catch(() => {});
  console.error('✕ Error en la migración:', e.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
