import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { obtenerCatalogo, registrarEvento } from '../repositories/catalogo.js';
import { interpretar } from '../services/interpretar.js';
import { geminiDisponible } from '../services/gemini.js';
import { pool } from '../db.js';
import { config } from '../config.js';

export const api = Router();

api.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, db: 'ok', gemini: geminiDisponible() ? 'configurado' : 'sin clave o sin cupo (usa reglas)' });
  } catch (e) {
    res.status(503).json({ ok: false, db: e.message });
  }
});

api.get('/catalogo', async (_req, res, next) => {
  try {
    const { laptops, tareas, perfiles, prioridades } = await obtenerCatalogo();
    // El patrón regex y la descripción para la IA no hacen falta en el navegador.
    res.json({
      laptops,
      tareas: tareas.map(({ patron, descripcion, ...t }) => t),
      perfiles, prioridades
    });
  } catch (e) { next(e); }
});

const limiteIA = rateLimit({
  windowMs: 60_000, limit: 15, standardHeaders: 'draft-8', legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Espera un minuto.' }
});

api.post('/interpretar', limiteIA, async (req, res, next) => {
  try {
    const texto = typeof req.body?.texto === 'string' ? req.body.texto.trim().slice(0, 350) : '';
    if (!texto) return res.status(400).json({ error: 'Escribe qué harías con la laptop.' });
    const catalogo = await obtenerCatalogo();
    res.json(await interpretar(texto, catalogo));
  } catch (e) { next(e); }
});

const TIPOS = new Set(['interpretacion', 'correccion', 'recomendacion', 'comparacion', 'eleccion']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

api.post('/eventos', rateLimit({ windowMs: 60_000, limit: 60 }), async (req, res) => {
  const { sesion, tipo, datos } = req.body || {};
  if (!config.logEvents || !TIPOS.has(tipo)) return res.status(204).end();
  const json = JSON.stringify(datos ?? {});
  if (json.length > 2000) return res.status(413).end();
  try {
    await registrarEvento(UUID.test(sesion) ? sesion : null, tipo, JSON.parse(json));
  } catch (e) { console.warn('[eventos]', e.message); }
  res.status(204).end();
});
