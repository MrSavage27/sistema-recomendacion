import { interpretarConGemini } from './gemini.js';
import { interpretarConReglas } from './reglas.js';

// Nunca confiamos ciegamente en la salida del modelo: se valida contra el catálogo.
export function sanear(r, tareas, prioridades) {
  const ids = new Set(tareas.map(t => t.id));
  const vistas = new Set();
  const out = {
    tareas: [], negadas: [], presupuesto: null, prioridad: null, windows: null, no_entendido: []
  };
  for (const t of Array.isArray(r?.tareas) ? r.tareas : []) {
    if (ids.has(t?.id) && !vistas.has(t.id)) {
      vistas.add(t.id);
      out.tareas.push({ id: t.id, intensidad: t.intensidad === 'ocasional' ? 'ocasional' : 'frecuente' });
    }
  }
  out.negadas = [...new Set((r?.negadas || []).filter(id => ids.has(id) && !vistas.has(id)))];
  const p = Number(r?.presupuesto);
  if (Number.isInteger(p) && p > 0 && p <= 100000) out.presupuesto = p;
  if (prioridades.some(x => x.id === r?.prioridad)) out.prioridad = r.prioridad;
  if (r?.windows === true) out.windows = true;
  out.no_entendido = (r?.no_entendido || [])
    .filter(s => typeof s === 'string' && s.trim()).map(s => s.trim().slice(0, 60)).slice(0, 5);
  return out;
}

export async function interpretar(texto, { tareas, prioridades }) {
  try {
    const r = await interpretarConGemini(texto, tareas, prioridades);
    return { ...sanear(r, tareas, prioridades), fuente: 'gemini' };
  } catch (err) {
    if (err.message !== 'Gemini no disponible') console.warn('[gemini] fallback a reglas:', err.message);
    return { ...sanear(interpretarConReglas(texto, tareas), tareas, prioridades), fuente: 'reglas' };
  }
}
