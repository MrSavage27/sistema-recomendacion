import { interpretarConGemini } from './gemini.js';
import { interpretarConReglas } from './reglas.js';

export const NO_ENTENDIDO_CAT = ['software_especifico', 'hardware_especifico', 'uso_profesional', 'otro'];

// Nunca confiamos ciegamente en la salida del modelo: se valida contra el catálogo.
export function sanear(r, tareas, prioridades) {
  const ids = new Set(tareas.map(t => t.id));
  const vistas = new Set();
  const out = {
    tareas: [], negadas: [], presupuesto: null, prioridad: null, windows: null, no_entendido_cat: []
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
  const cats = Array.isArray(r?.no_entendido_cat) ? r.no_entendido_cat : [];
  out.no_entendido_cat = [...new Set(cats.filter(c => NO_ENTENDIDO_CAT.includes(c)))].slice(0, 5);
  return out;
}

export async function interpretar(texto, { tareas, prioridades }) {
  try {
    const r = await interpretarConGemini(texto, tareas, prioridades);
    const s = sanear(r, tareas, prioridades);
    return { ...s, fuente: 'gemini', motor: 'gemini' };
  } catch (err) {
    if (err.message !== 'Gemini no disponible') console.warn('[gemini] fallback a reglas:', err.message);
    const s = sanear(interpretarConReglas(texto, tareas), tareas, prioridades);
    return { ...s, fuente: 'reglas', motor: 'reglas' };
  }
}
