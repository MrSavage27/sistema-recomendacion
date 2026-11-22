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

const TIPOS = new Set(['interpretacion', 'correccion', 'recomendacion', 'comparacion', 'eleccion', 'explicacion_vista', 'feedback', 'paso_visto']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ESTADOS = new Set(['insuficiente', 'a_medida', 'mas_de_lo_necesario']);
const NO_CAT = new Set(['software_especifico', 'hardware_especifico', 'uso_profesional', 'otro']);
const FEEDBACK_DIM = new Set(['claridad', 'confianza', 'suficiencia']);
const FEEDBACK_VAL = new Set(['si', 'mas_o_menos', 'no']);
function sanearEvento(tipo, datos = {}) {
  const d = datos && typeof datos === 'object' && !Array.isArray(datos) ? { ...datos } : {};
  if (Array.isArray(d.no_entendido_cat)) d.no_entendido_cat = [...new Set(d.no_entendido_cat.filter(c => NO_CAT.has(c)))].slice(0, 5);
  if (d.estado_elegida && !ESTADOS.has(d.estado_elegida)) delete d.estado_elegida;
  if (d.estados && typeof d.estados === 'object') {
    d.estados = Object.fromEntries(Object.entries(d.estados).filter(([, v]) => ESTADOS.has(v)).slice(0, 20));
  }
  if (tipo === 'feedback') {
    if (!FEEDBACK_DIM.has(d.dimension)) return null;
    if (!FEEDBACK_VAL.has(d.valor)) return null;
  }
  return d;
}

api.post('/eventos', rateLimit({ windowMs: 60_000, limit: 60 }), async (req, res) => {
  const { sesion, tipo, datos } = req.body || {};
  if (!config.logEvents || !TIPOS.has(tipo)) return res.status(204).end();
  const saneado = sanearEvento(tipo, datos);
  if (saneado === null) return res.status(204).end();
  const json = JSON.stringify(saneado);
  if (json.length > 2000) return res.status(413).end();
  try {
    await registrarEvento(UUID.test(sesion) ? sesion : null, tipo, JSON.parse(json));
  } catch (e) { console.warn('[eventos]', e.message); }
  res.status(204).end();
});
