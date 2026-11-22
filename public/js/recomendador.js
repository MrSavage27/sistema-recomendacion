// Motor de recomendación por reglas (sin dependencias del DOM).
// Lo usa el navegador y también los tests (node --test).

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

// C: laptops · T: tareas indexadas por id · st: { tasks, intens, budget, prio, win }
export function evaluate(C, T, st) {
  const it = C.map(m => {
    const gaps = st.tasks
      .map(id => ({ id, g: gap(m, T[id], st.intens?.[id]) }))
      .filter(x => x.g);
    const ok = m.price <= st.budget;
    const sys = !st.win || m.os.startsWith('Windows 11');
    return { m, gaps, ok, sys, fit: !gaps.length && ok && sys };
  });
  const cmp = CMP[st.prio] || CMP.speed;
  it.sort((a, b) =>
    a.fit !== b.fit ? b.fit - a.fit
      : a.fit ? (cmp(a, b) || a.m.price - b.m.price)
        : (a.gaps.length - b.gaps.length || a.m.price - b.m.price));
  return it;
}
