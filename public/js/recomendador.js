// Motor de recomendación por reglas (sin dependencias del DOM).
// Lo usa el navegador y también los tests (node --test).

export const REGLA_SUFI_V = 1;

// Puntaje de rendimiento: procesador pesa más, luego gráfica y RAM.
export const perf = m => m.ct * 3 + m.gm + (m.ram >= 16 ? 2 : 0);

// Devuelve "" si la laptop cubre la tarea, o el motivo por el que no.
export function gap(m, t, intensidad) {
  if (t.ded && !m.gm) return 'Necesita gráfica dedicada.';
  if (m.ram < t.ram) return `${m.ram} GB de RAM frente a ${t.ram} GB recomendados.`;
  if (m.ct < t.cpu) return 'Procesador con poco margen.';
  if (intensidad === 'frecuente' && t.gmFrecuente && m.gm < t.gmFrecuente)
    return `Gráfica de ${m.gm} GB: para uso frecuente se recomiendan ${t.gmFrecuente} GB.`;
  return '';
}

const CMP = {
  price: (a, b) => a.m.price - b.m.price,
  mobile: (a, b) => a.m.w - b.m.w,
  speed: (a, b) => perf(b.m) - perf(a.m),
  screen: (a, b) => b.m.sc - a.m.sc
};

// Suficiencia v1 (D1): exceso por capacidad frente al requisito de tareas.
// El precio no clasifica; el presupuesto es marca aparte (fuera_presupuesto).
export function clasificarSuficiencia(item, T, st) {
  const { m, gaps, ok, sys } = item;
  const tareas = st.tasks.map(id => T[id]).filter(Boolean);
  const maxRamReq = Math.max(0, ...tareas.map(t => t.ram || 0));
  const maxCpuReq = Math.max(0, ...tareas.map(t => t.cpu || 0));
  const tareasNecesitanGrafica = tareas.some(t => t.ded);
  const minGpuNecesaria = tareasNecesitanGrafica
    ? Math.max(...tareas.map(t => t.ded ? (st.intens?.[t.id] === 'frecuente' ? (t.gmFrecuente || 0) : 1) : 0), 0)
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

  const sobras = [];
  // Excepción global: prioridad "speed" pide holgura. Sin tareas, no clasificar exceso.
  if (st.prio !== 'speed' && tareas.length) {
    // RAM: >=32 GB y >=2 veces el requisito máximo de sus tareas.
    // Excepción: si la sobra está en una dimensión que sus tareas sí usan, no se marca.
    if (m.ram >= 32 && maxRamReq > 0 && m.ram >= maxRamReq * 2 && !tareas.some(t => t.ram >= 16)) {
      sobras.push({
        dim: 'ram', label: 'RAM',
        hoy: `Tiene ${m.ram} GB de RAM, más del doble de lo que piden tus tareas (${maxRamReq} GB).`,
        cuando: 'Te serviría si más adelante abres proyectos mucho más pesados o usas programas muy exigentes.'
      });
    }

    // Gráfica
    if (!tareasNecesitanGrafica) {
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
    if (maxCpuReq > 0 && m.ct >= maxCpuReq + 2 && !tareas.some(t => t.cpu >= 2)) {
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

// C: laptops · T: tareas indexadas por id · st: { tasks, intens, budget, prio, win }
export function evaluate(C, T, st) {
  const it = C.map(m => {
    const gaps = st.tasks
      .map(id => ({ id, g: gap(m, T[id], st.intens?.[id]) }))
      .filter(x => x.g);
    const ok = m.price <= st.budget;
    const sys = !st.win || m.os.startsWith('Windows 11');
    const item = { m, gaps, ok, sys, fit: !gaps.length && ok && sys };
    item.suf = clasificarSuficiencia(item, T, st);
    return item;
  });
  const cmp = CMP[st.prio] || CMP.speed;
  it.sort((a, b) =>
    a.fit !== b.fit ? b.fit - a.fit
      : a.fit ? (cmp(a, b) || a.m.price - b.m.price)
        : (a.gaps.length - b.gaps.length || a.m.price - b.m.price));
  return it;
}
