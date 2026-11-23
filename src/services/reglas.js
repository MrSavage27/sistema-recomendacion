// Interpretación por palabras clave: respaldo cuando Gemini no está disponible.
// Es la misma lógica que tenía el HTML original (detect), movida al servidor.

import { extraerRequisitos } from './requisitos.js';

export const normalizar = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const NEGACION = /\b(no uso|no juego|no hago|no edito|no necesito)\b/;
const OCASIONAL = /\b(a veces|de vez en cuando|ocasional\w*|rara vez|fines de semana)\b/;
const SISTEMA_NEGADO = /\bno\s+(?:quiero|necesito|uso)(?:\s+usar)?\s+(?:(?:una?|el|la|sistema|operativo|de)\s+){0,4}(?:linux|ubuntu|debian|fedora|macos|mac os|macbook|mac)\b/g;
const LINUX = /\b(linux|ubuntu|debian|fedora)\b/;
const MACOS = /\b(macos|mac os|(?:necesito|quiero)\s+(?:una?\s+)?(?:mac|macbook))\b/;

// Ordenadas de mayor a menor: si nombra varios, cuenta el más exigente.
const EXIGENCIAS = [
  ['alta', /\b(aaa|cyberpunk|elden ring|warzone|call of duty|red dead|starfield|gta (?:6|vi)|black myth|blender|render\w*|revit|solidworks|3d)\b/],
  ['media', /\b(fortnite|apex|gta (?:5|v)|rocket league|cs2|counter strike|overwatch|fifa|ea fc|pubg|genshin)\b/],
  ['liviana', /\b(valorant|league of legends|lol|minecraft|dota|roblox|among us|stardew|terraria|juegos? (?:livianos?|ligeros?))\b/]
];
const detectarExigencia = texto => EXIGENCIAS.find(([, re]) => re.test(texto))?.[0] || null;

function detectarSistema(texto, windows) {
  const afirmado = texto.replace(SISTEMA_NEGADO, ' ');
  if (LINUX.test(afirmado)) return 'linux';
  if (MACOS.test(afirmado)) return 'macos';
  return windows ? 'windows' : null;
}

export function interpretarConReglas(texto, tareas) {
  const t = normalizar(texto);
  const clausulas = t.split(/[.,;!?]|\bpero\b/);
  const afirmadas = clausulas.filter(c => !NEGACION.test(c));
  const negadasTxt = clausulas.filter(c => NEGACION.test(c)).join(' ');
  const a = afirmadas.join(' ');

  const encontradas = [];
  const negadas = [];
  for (const tarea of tareas) {
    const re = new RegExp(tarea.patron);
    if (re.test(a)) {
      const clausula = afirmadas.find(c => re.test(c)) || '';
      encontradas.push({ id: tarea.id, intensidad: OCASIONAL.test(clausula) ? 'ocasional' : 'frecuente' });
    } else if (re.test(negadasTxt)) {
      negadas.push(tarea.id);
    }
  }

  // Nombrar un juego ya implica la tarea, aunque no diga "juego" ni "jugar".
  const exigencia_grafica = detectarExigencia(a);
  if (exigencia_grafica && !encontradas.some(x => x.id === 'graphics') && tareas.some(x => x.id === 'graphics')) {
    const clausula = afirmadas.find(c => detectarExigencia(c)) || '';
    encontradas.push({ id: 'graphics', intensidad: OCASIONAL.test(clausula) ? 'ocasional' : 'frecuente' });
  }

  let presupuesto = null;
  const b = t.match(/(?:s\/\s*|presupuesto(?:\s+de)?\s*)(\d{1,3}(?:[.,]\d{3})+|\d{3,6})/);
  if (b) {
    const v = +b[1].replace(/[.,]/g, '');
    if (v > 0 && v <= 100000) presupuesto = v;
  }

  let prioridad = null;
  if (/\b(mochila|liviana|ligera|llevo|portatil|peso)\b/.test(a)) prioridad = 'mobile';
  else if (/\b(pantalla oled|nitidez|calidad de pantalla|fidelidad de color)\b/.test(a)) prioridad = 'screen';
  else if (/\b(ahorrar|economica|mas barata)\b/.test(a)) prioridad = 'price';

  const windows = /\b(necesito windows|solo windows|requiere windows|facil de usar|facilidad de uso|sencill[ao] de usar|facil de manejar|uso facil|intuitiv[ao]|que sea simple)\b/.test(a) ? true : null;

  const sistema_requerido = detectarSistema(t, windows);
  return {
    tareas: encontradas, negadas, presupuesto, prioridad, windows, sistema_requerido,
    exigencia_grafica, requisitos: extraerRequisitos(t), no_entendido_cat: []
  };
}
