import { config } from '../config.js';
import { crearCache, claveInterpretacion } from './cacheInterpretacion.js';
import { huellaGemini, interpretarConGemini } from './gemini.js';
import { interpretarConReglas } from './reglas.js';
import { sanearRequisitos } from './requisitos.js';

export const NO_ENTENDIDO_CAT = ['software_especifico', 'hardware_especifico', 'uso_profesional', 'otro'];
export const SISTEMAS_REQUERIDOS = ['windows', 'linux', 'macos'];
export const EXIGENCIAS_GRAFICAS = ['liviana', 'media', 'alta'];

// Nunca confiamos ciegamente en la salida del modelo: se valida contra el catálogo.
export function sanear(r, tareas, prioridades) {
  const ids = new Set(tareas.map(t => t.id));
  const vistas = new Set();
  const out = {
    tareas: [], negadas: [], presupuesto: null, prioridad: null, windows: null, sistema_requerido: null,
    no_entendido_cat: []
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
  // Un pedido explícito de Linux o macOS gana a la señal indirecta de Windows ("fácil de usar").
  const sistema = SISTEMAS_REQUERIDOS.includes(r?.sistema_requerido) ? r.sistema_requerido : null;
  out.sistema_requerido = sistema || (r?.windows === true ? 'windows' : null);
  if (out.sistema_requerido === 'windows') out.windows = true;
  out.exigencia_grafica = vistas.has('graphics') && EXIGENCIAS_GRAFICAS.includes(r?.exigencia_grafica)
    ? r.exigencia_grafica : null;
  out.requisitos = sanearRequisitos(r?.requisitos);
  const cats = Array.isArray(r?.no_entendido_cat) ? r.no_entendido_cat : [];
  out.no_entendido_cat = [...new Set(cats.filter(c => NO_ENTENDIDO_CAT.includes(c)))].slice(0, 5);
  return out;
}

// Solo se guarda lo que respondió Gemini: un respaldo por reglas no debe ocupar su lugar.
export function crearInterpretador({ llamarGemini, cache, huella }) {
  const enCurso = new Map();

  const consultar = (clave, texto, tareas, prioridades) => {
    if (enCurso.has(clave)) return enCurso.get(clave);
    const pedido = Promise.resolve()
      .then(() => llamarGemini(texto, tareas, prioridades))
      .then(r => {
        const s = sanear(r, tareas, prioridades);
        cache.guardar(clave, s);
        return s;
      })
      .finally(() => enCurso.delete(clave));
    enCurso.set(clave, pedido);
    return pedido;
  };

  return async function interpretar(texto, { tareas, prioridades }) {
    const clave = claveInterpretacion(texto, huella(tareas, prioridades));
    const guardada = cache.obtener(clave);
    if (guardada) return { ...guardada, fuente: 'gemini', motor: 'gemini', cache: true };
    try {
      const s = await consultar(clave, texto, tareas, prioridades);
      return { ...structuredClone(s), fuente: 'gemini', motor: 'gemini' };
    } catch (err) {
      if (err.message !== 'Gemini no disponible') console.warn('[gemini] fallback a reglas:', err.message);
      const s = sanear(interpretarConReglas(texto, tareas), tareas, prioridades);
      return { ...s, fuente: 'reglas', motor: 'reglas' };
    }
  };
}

export const interpretar = crearInterpretador({
  llamarGemini: interpretarConGemini,
  huella: huellaGemini,
  cache: crearCache({
    max: config.geminiCacheMax,
    ttlMs: config.geminiCacheTtlMs,
    archivo: config.geminiRespuestasArchivo
  })
});
