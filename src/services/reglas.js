// Interpretación por palabras clave: respaldo cuando Gemini no está disponible.
// Es la misma lógica que tenía el HTML original (detect), movida al servidor.

export const normalizar = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const NEGACION = /\b(no uso|no juego|no hago|no edito|no necesito)\b/;
const OCASIONAL = /\b(a veces|de vez en cuando|ocasional\w*|rara vez|fines de semana)\b/;

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

  const windows = /\b(necesito windows|solo windows|requiere windows)\b/.test(a) ? true : null;

  return { tareas: encontradas, negadas, presupuesto, prioridad, windows, no_entendido_cat: [] };
}
