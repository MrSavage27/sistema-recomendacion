// Requisitos concretos de hardware o marca que la persona pide con sus palabras.
// Valores cerrados: nunca se guarda texto libre del usuario.

export const MARCAS = ['Lenovo', 'HP', 'ASUS', 'Acer', 'Dell', 'MSI', 'Apple', 'Samsung', 'Huawei', 'Gigabyte', 'Razer', 'LG'];

const nulo = esquema => ({ anyOf: [esquema, { type: 'null' }] });
const LISTA_MARCAS = { type: 'array', items: { type: 'string', enum: MARCAS } };

export const esquemaRequisitos = {
  type: 'object',
  description: 'Características concretas que pide. null o lista vacía si no las menciona.',
  properties: {
    ram_min_gb: nulo({ type: 'integer' }),
    ssd_min_gb: nulo({ type: 'integer' }),
    memoria_min: nulo({ type: 'string', enum: ['ddr4', 'ddr5'] }),
    marcas: LISTA_MARCAS,
    marcas_excluidas: LISTA_MARCAS,
    grafica_dedicada: nulo({ type: 'boolean' }),
    grafica_min_gb: nulo({ type: 'integer' }),
    grafica_marca: nulo({ type: 'string', enum: ['nvidia', 'amd', 'intel'] }),
    cpu_marca: nulo({ type: 'string', enum: ['intel', 'amd'] }),
    cpu_nivel_min: nulo({ type: 'integer', enum: [2, 3] }),
    pantalla_min_pulgadas: nulo({ type: 'number' }),
    hz_min: nulo({ type: 'integer' }),
    peso_max_kg: nulo({ type: 'number' })
  }
};

const RANGOS = {
  ram_min_gb: [4, 128, true], ssd_min_gb: [64, 8192, true], grafica_min_gb: [1, 32, true],
  hz_min: [60, 500, true], pantalla_min_pulgadas: [10, 20, false], peso_max_kg: [0.5, 5, false]
};
const OPCIONES = {
  memoria_min: ['ddr4', 'ddr5'], grafica_marca: ['nvidia', 'amd', 'intel'],
  cpu_marca: ['intel', 'amd'], cpu_nivel_min: [2, 3]
};

export function sanearRequisitos(r) {
  const out = {};
  if (!r || typeof r !== 'object') return out;
  for (const [campo, [min, max, entero]] of Object.entries(RANGOS)) {
    const v = r[campo] == null ? NaN : Number(r[campo]);
    if (v >= min && v <= max && (!entero || Number.isInteger(v))) out[campo] = v;
  }
  for (const [campo, validos] of Object.entries(OPCIONES)) {
    if (validos.includes(r[campo])) out[campo] = r[campo];
  }
  if (r.grafica_dedicada === true) out.grafica_dedicada = true;
  const lista = v => [...new Set(Array.isArray(v) ? v.filter(x => MARCAS.includes(x)) : [])];
  const excluidas = lista(r.marcas_excluidas);
  const marcas = lista(r.marcas).filter(x => !excluidas.includes(x));
  if (marcas.length) out.marcas = marcas;
  if (excluidas.length) out.marcas_excluidas = excluidas;
  return out;
}

const capacidadGb = (n, unidad) => (unidad === 'tb' ? +n * 1024 : +n);

function extraerMarcas(t, r) {
  for (const marca of MARCAS) {
    const nombre = marca.toLowerCase();
    const negada = new RegExp(`\\bno\\s+(?:quiero|me gusta|busco)\\s+(?:una?\\s+)?(?:laptop\\s+)?(?:marca\\s+)?${nombre}\\b`);
    if (negada.test(t)) (r.marcas_excluidas ||= []).push(marca);
    else if (new RegExp(`\\b${nombre}\\b`).test(t)) (r.marcas ||= []).push(marca);
  }
}

function extraerProcesadorYGrafica(t, r) {
  if (/\b(?:i[79]|core ultra [79]|ryzen [79])\b/.test(t)) r.cpu_nivel_min = 3;
  else if (/\b(?:i5|core ultra 5|ryzen 5)\b/.test(t)) r.cpu_nivel_min = 2;
  if (/\b(?:intel|core i\d)\b/.test(t)) r.cpu_marca = 'intel';
  else if (/\b(?:amd|ryzen)\b/.test(t)) r.cpu_marca = 'amd';
  if (/\b(?:rtx|gtx|nvidia|geforce)\b/.test(t)) r.grafica_marca = 'nvidia';
  if (/\b(?:rtx|gtx|nvidia|geforce|grafica dedicada|tarjeta (?:de video|grafica))\b/.test(t)) r.grafica_dedicada = true;
  const vram = t.match(/\b(\d{1,2})\s*gb\s*(?:de\s+)?(?:vram|grafica|video)\b/);
  if (vram) r.grafica_min_gb = +vram[1];
}

// Respaldo sin IA: solo capta formas explícitas. El texto ya viene normalizado.
export function extraerRequisitos(t) {
  const r = {};
  const ram = t.match(/\b(\d{1,3})\s*gb\s*(?:de\s+)?(?:ram|memoria)\b/) || t.match(/\b(?:ram|memoria)\s*(?:de\s+)?(\d{1,3})\s*gb\b/);
  if (ram) r.ram_min_gb = +ram[1];
  const ssd = t.match(/\b(\d{1,4})\s*(gb|tb)\s*(?:de\s+)?(?:ssd|disco|almacenamiento)\b/) || t.match(/\b(\d{1,2})\s*(tb)\b/);
  if (ssd) r.ssd_min_gb = capacidadGb(ssd[1], ssd[2]);
  if (/\bddr5\b|\b(?:memoria|ram)\s+(?:mas\s+)?(?:nueva|moderna|reciente)\b/.test(t)) r.memoria_min = 'ddr5';
  else if (/\bddr4\b/.test(t)) r.memoria_min = 'ddr4';
  extraerMarcas(t, r);
  extraerProcesadorYGrafica(t, r);
  const pulgadas = t.match(/\b(\d{2}(?:[.,]\d)?)\s*(?:pulgadas|")/);
  if (pulgadas) r.pantalla_min_pulgadas = +pulgadas[1].replace(',', '.');
  const hz = t.match(/\b(\d{2,3})\s*hz\b/);
  if (hz) r.hz_min = +hz[1];
  const peso = t.match(/\b(?:menos de|maximo|hasta)\s+(\d(?:[.,]\d+)?)\s*(?:kg|kilos?)\b/);
  if (peso) r.peso_max_kg = +peso[1].replace(',', '.');
  return r;
}
