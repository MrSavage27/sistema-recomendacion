// Motor de recomendación por reglas (sin dependencias del DOM).
// Lo usa el navegador y también los tests (node --test).

export const REGLA_SUFI_V = 2;

// Puntaje de rendimiento: procesador pesa más, luego gráfica y RAM.
export const perf = m => m.ct * 3 + m.gm + (m.ram >= 16 ? 2 : 0);

const VRAM_POR_EXIGENCIA = { liviana: 1, media: 4 };
const MOTIVO_EXIGENCIA = { media: 'juegos de exigencia media', alta: 'juegos o 3D exigentes' };

// La frecuencia dice cuánto juega, no cuánto pide el juego: si se conoce la exigencia, manda ella.
export function graficaMinima(t, intensidad, exigencia) {
  if (!t.ded) return 0;
  if (exigencia === 'alta') return t.gmFrecuente || 1;
  if (VRAM_POR_EXIGENCIA[exigencia]) return VRAM_POR_EXIGENCIA[exigencia];
  return intensidad === 'frecuente' ? (t.gmFrecuente || 1) : 1;
}

// Devuelve "" si la laptop cubre la tarea, o el motivo por el que no.
export function gap(m, t, intensidad, exigencia) {
  if (t.ded && !m.gm) return 'Necesita gráfica dedicada.';
  if (m.ram < t.ram) return `${m.ram} GB de RAM frente a ${t.ram} GB recomendados.`;
  if (m.ct < t.cpu) return 'Procesador con poco margen.';
  const minima = graficaMinima(t, intensidad, exigencia);
  if (m.gm < minima)
    return `Gráfica de ${m.gm} GB: para ${MOTIVO_EXIGENCIA[exigencia] || 'uso frecuente'} se recomiendan ${minima} GB.`;
  return '';
}

const CMP = {
  price: (a, b) => a.m.price - b.m.price,
  mobile: (a, b) => a.m.w - b.m.w,
  speed: (a, b) => perf(b.m) - perf(a.m),
  screen: (a, b) => b.m.sc - a.m.sc
};

// ChromeOS queda fuera para Linux; en una laptop con Windows es instalable, pero sin compatibilidad confirmada.
const CUMPLE_SISTEMA = {
  windows: os => os.startsWith('Windows 11'),
  linux: os => !/chrome/i.test(os),
  macos: os => /mac/i.test(os)
};
export const sistemaRequerido = st => st.so || (st.win ? 'windows' : null);

// El tipo de memoria sale solo de fuentes verificadas: si no aparece, queda sin confirmar.
export function tipoMemoria(m) {
  const notas = (m.fuentes || []).filter(f => f.verificada).map(f => f.nota || '').join(' ');
  const x = notas.match(/\b(?:LP)?DDR(\d)X?/i);
  return x ? { texto: x[0].toUpperCase(), generacion: +x[1] } : null;
}

const pulgadas = m => parseFloat(m.screen) || 0;
const hercios = m => +(/(\d+)\s*Hz/i.exec(m.screen || '')?.[1] || 0);
const capacidad = gb => (gb >= 1024 ? `${gb / 1024} TB` : `${gb} GB`);
const NIVEL_CPU = { 2: 'gama media (i5 o Ryzen 5)', 3: 'gama alta (i7 o Ryzen 7)' };
const MARCA_TECNICA = { intel: 'Intel', amd: 'AMD', nvidia: 'NVIDIA' };
const grafica = m => (m.gm ? `${m.gpu} (${m.gm} GB)` : 'sin gráfica dedicada');
const pantalla = m => m.screen || 'pantalla sin dato';

const REQUISITOS = {
  marcas: { pide: v => `marca ${v.join(' o ')}`, cumple: (m, v) => v.includes(m.brand), tiene: m => m.brand },
  marcas_excluidas: { pide: v => `sin ${v.join(' ni ')}`, cumple: (m, v) => !v.includes(m.brand), tiene: m => m.brand },
  ram_min_gb: { pide: v => `${v} GB de RAM o más`, cumple: (m, v) => m.ram >= v, tiene: m => `${m.ram} GB de RAM` },
  memoria_min: {
    pide: v => `memoria ${v.toUpperCase()} o más nueva`,
    cumple: (m, v) => (tipoMemoria(m)?.generacion || 0) >= +v.slice(-1),
    tiene: m => tipoMemoria(m)?.texto || 'tipo de memoria sin confirmar'
  },
  ssd_min_gb: { pide: v => `${capacidad(v)} de almacenamiento o más`, cumple: (m, v) => m.ssd >= v, tiene: m => `${capacidad(m.ssd)}` },
  grafica_dedicada: { pide: () => 'gráfica dedicada', cumple: m => m.gm > 0, tiene: grafica },
  grafica_min_gb: { pide: v => `gráfica de ${v} GB o más`, cumple: (m, v) => m.gm >= v, tiene: grafica },
  grafica_marca: {
    pide: v => `gráfica ${MARCA_TECNICA[v]}`,
    cumple: (m, v) => new RegExp(v, 'i').test(m.gpu || ''),
    tiene: m => m.gpu
  },
  cpu_marca: { pide: v => `procesador ${MARCA_TECNICA[v]}`, cumple: (m, v) => new RegExp(v, 'i').test(m.cpu || ''), tiene: m => m.cpu },
  cpu_nivel_min: { pide: v => `procesador de ${NIVEL_CPU[v]}`, cumple: (m, v) => m.ct >= v, tiene: m => m.cpu },
  pantalla_min_pulgadas: { pide: v => `pantalla de ${v}″ o más`, cumple: (m, v) => pulgadas(m) >= v, tiene: pantalla },
  hz_min: { pide: v => `pantalla de ${v} Hz o más`, cumple: (m, v) => hercios(m) >= v, tiene: pantalla },
  peso_max_kg: { pide: v => `peso de hasta ${v} kg`, cumple: (m, v) => m.w <= v, tiene: m => `${m.w} kg` }
};

export const listarRequisitos = (req = {}) => Object.entries(req)
  .filter(([campo]) => REQUISITOS[campo])
  .map(([campo, valor]) => ({ campo, pide: REQUISITOS[campo].pide(valor) }));

export function compararRequisitos(m, req = {}) {
  const cumple = [];
  const faltan = [];
  for (const { campo, pide } of listarRequisitos(req)) {
    const regla = REQUISITOS[campo];
    (regla.cumple(m, req[campo]) ? cumple : faltan).push({ campo, pide, tiene: regla.tiene(m) });
  }
  return { cumple, faltan };
}

// Suficiencia v1 (D1): exceso por capacidad frente al requisito de tareas.
// El precio no clasifica; el presupuesto es marca aparte (fuera_presupuesto).
export function clasificarSuficiencia(item, T, st) {
  const { m, gaps, ok, sys } = item;
  const tareas = st.tasks.map(id => T[id]).filter(Boolean);
  const maxRamReq = Math.max(0, ...tareas.map(t => t.ram || 0));
  const maxCpuReq = Math.max(0, ...tareas.map(t => t.cpu || 0));
  const tareasNecesitanGrafica = tareas.some(t => t.ded);
  const minGpuNecesaria = tareasNecesitanGrafica
    ? Math.max(...tareas.map(t => graficaMinima(t, st.intens?.[t.id], st.exigencia)), 0)
    : 0;

  if (gaps.length || !sys) {
    return {
      estado: 'insuficiente',
      fuera_presupuesto: !ok,
      sobras: [],
      texto: !sys
        ? 'No cumple el requisito de sistema que pediste.'
        : 'No cubre al menos un requisito de las tareas que seleccionaste.'
    };
  }

  const pedido = st.req || {};
  const sobras = [];
  // Excepción global: prioridad "speed" pide holgura. Sin tareas, no clasificar exceso.
  if (st.prio !== 'speed' && tareas.length) {
    // RAM: >=32 GB y >=2 veces el requisito máximo de sus tareas.
    // Excepción: si la sobra está en una dimensión que sus tareas sí usan, no se marca.
    if (!pedido.ram_min_gb && m.ram >= 32 && maxRamReq > 0 && m.ram >= maxRamReq * 2 && !tareas.some(t => t.ram >= 16)) {
      sobras.push({
        dim: 'ram', label: 'RAM',
        hoy: `Tiene ${m.ram} GB de RAM, más del doble de lo que piden tus tareas (${maxRamReq} GB).`,
        cuando: 'Te serviría si más adelante abres proyectos mucho más pesados o usas programas muy exigentes.'
      });
    }

    // Gráfica
    const pidioGrafica = pedido.grafica_dedicada || pedido.grafica_min_gb || pedido.grafica_marca;
    if (pidioGrafica) {
      // Lo que pidió expresamente no se le presenta como exceso.
    } else if (!tareasNecesitanGrafica) {
      if (m.gm >= 6) sobras.push({
        dim: 'gpu', label: 'gráfica',
        hoy: `Tiene gráfica dedicada de ${m.gm} GB, pero tus tareas no la necesitan.`,
        cuando: 'Te valdría la pena si más adelante quieres jugar o trabajar en 3D/edición pesada.'
      });
    } else if (m.gm >= minGpuNecesaria + 4) {
      // Umbral específico de la tabla: puede ser exceso aunque las tareas usen gráfica.
      sobras.push({
        dim: 'gpu', label: 'gráfica',
        hoy: `Su gráfica de ${m.gm} GB supera con margen lo que piden tus tareas.`,
        cuando: 'Te valdría la pena si planeas juegos o proyectos 3D más exigentes que los actuales.'
      });
    }

    // Procesador: nivel supera en >=2 niveles el mayor nivel mínimo que piden las tareas.
    if (!pedido.cpu_nivel_min && maxCpuReq > 0 && m.ct >= maxCpuReq + 2 && !tareas.some(t => t.cpu >= 2)) {
      sobras.push({
        dim: 'cpu', label: 'procesador',
        hoy: `Su procesador está ${m.ct - maxCpuReq} niveles por encima de lo que piden tus tareas.`,
        cuando: 'Te valdría la pena si más adelante haces edición pesada, 3D o programas muy exigentes.'
      });
    }
  }

  if (sobras.length) {
    return {
      estado: 'mas_de_lo_necesario',
      fuera_presupuesto: !ok,
      sobras,
      texto: `Qué sobra hoy: ${sobras.map(s => s.hoy).join(' ')} Cuándo sí valdría la pena: ${sobras.map(s => s.cuando).join(' ')}`
    };
  }

  return {
    estado: 'a_medida',
    fuera_presupuesto: !ok,
    sobras: [],
    texto: ok ? 'Cubre lo que necesitas para tu uso.' : 'Cubre lo que necesitas, pero está fuera de tu presupuesto.'
  };
}

// C: laptops · T: tareas indexadas por id · st: { tasks, intens, budget, prio, so } (win: forma anterior de so)
export function evaluate(C, T, st) {
  const so = sistemaRequerido(st);
  const it = C.map(m => {
    const gaps = st.tasks
      .map(id => ({ id, g: gap(m, T[id], st.intens?.[id], st.exigencia) }))
      .filter(x => x.g);
    const ok = st.budget == null || m.price <= st.budget;
    const sys = !so || CUMPLE_SISTEMA[so](m.os);
    const compat = so === 'linux' && sys && !/linux/i.test(m.os);
    const fit = !gaps.length && ok && sys;
    const { cumple: reqCumple, faltan: reqFaltan } = compararRequisitos(m, st.req);
    // Un requisito no cumplido no descarta la laptop: la baja y permite ofrecerla como sustituta.
    const item = { m, gaps, ok, sys, compat, fit, reqCumple, reqFaltan, exacta: fit && !reqFaltan.length };
    item.suf = clasificarSuficiencia(item, T, st);
    return item;
  });
  // Sin prioridad elegida no se asume que quiera más potencia: primero lo que cubre su uso al menor precio.
  const cmp = CMP[st.prio] || CMP.price;
  it.sort((a, b) =>
    a.fit !== b.fit ? b.fit - a.fit
      : a.fit ? (a.reqFaltan.length - b.reqFaltan.length || cmp(a, b) || a.m.price - b.m.price)
        : (a.gaps.length - b.gaps.length || a.reqFaltan.length - b.reqFaltan.length || a.m.price - b.m.price));
  return it;
}
