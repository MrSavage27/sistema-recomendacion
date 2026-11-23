import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, REGLA_SUFI_V, clasificarSuficiencia, tipoMemoria, compararRequisitos } from '../public/js/recomendador.js';
import { C, T } from './fixtures.js';

const base = { tasks: ['docs', 'graphics'], intens: {}, budget: 4500, prio: 'speed', win: false };
const top = st => evaluate(C, T, { ...base, ...st }).find(x => x.fit)?.m.id;

test('con S/ 3,800 y juegos ocasionales sale la TUF', () => {
  assert.equal(top({ budget: 3800, intens: { graphics: 'ocasional' } }), 'tuf');
});

test('si juega a diario, la TUF (4 GB de VRAM) deja de servir', () => {
  const r = evaluate(C, T, { ...base, budget: 3800, intens: { graphics: 'frecuente' } });
  assert.equal(r.find(x => x.fit), undefined);
  assert.match(r.find(x => x.m.id === 'tuf').gaps[0].g, /4 GB/);
});

test('priorizando llevarla a diario sale la más liviana (LOQ)', () => {
  assert.equal(top({ prio: 'mobile' }), 'loq');
});

test('priorizando ahorrar sale la más barata que cumple', () => {
  assert.equal(top({ prio: 'price' }), 'tuf');
});

test('sin presupuesto suficiente nadie encaja', () => {
  assert.equal(top({ budget: 2000 }), undefined);
});

test('suficiencia:docs+zoom marca exceso de gráfica en laptops gamer', () => {
  const r = evaluate(C, T, { tasks: ['docs', 'calls'], intens: {}, budget: 5000, prio: 'price', win: false });
  assert.equal(REGLA_SUFI_V, 2);
  const loq = r.find(x => x.m.id === 'loq');
  assert.equal(loq.suf.estado, 'mas_de_lo_necesario');
  assert.ok(loq.suf.sobras.some(s => s.dim === 'gpu'));
});

test('suficiencia:prioridad speed no marca exceso', () => {
  const r = evaluate(C, T, { tasks: ['docs', 'calls'], intens: {}, budget: 5000, prio: 'speed', win: false });
  const loq = r.find(x => x.m.id === 'loq');
  assert.equal(loq.suf.estado, 'a_medida');
});

test('suficiencia:fuera de presupuesto es marca aparte', () => {
  const r = evaluate(C, T, { tasks: ['docs', 'calls'], intens: {}, budget: 3000, prio: 'price', win: false });
  const tuf = r.find(x => x.m.id === 'tuf');
  assert.equal(tuf.suf.estado, 'a_medida');
  assert.equal(tuf.suf.fuera_presupuesto, true);
  assert.equal(tuf.fit, false);
});

test('suficiencia:insuficiente por requisito de tarea', () => {
  const r = evaluate(C, T, { tasks: ['graphics'], intens: { graphics: 'frecuente' }, budget: 5000, prio: 'price', win: false });
  const tuf = r.find(x => x.m.id === 'tuf');
  assert.equal(tuf.suf.estado, 'insuficiente');
  assert.ok(tuf.gaps.length > 0);
});

test('Necesito Windows excluye laptops no Windows', () => {
  const r = evaluate(C, T, { tasks: ['docs'], intens: {}, budget: 5000, prio: 'price', win: true });
  for (const id of ['cm14', 'slim3c']) {
    const item = r.find(x => x.m.id === id);
    assert.equal(item.sys, false);
    assert.equal(item.fit, false);
  }
  const win = r.find(x => x.m.id === 'hp15');
  assert.equal(win.sys, true);
  assert.equal(win.fit, true);
});

test('Linux excluye Chromebooks y deja las demás con compatibilidad por confirmar', () => {
  const r = evaluate(C, T, { tasks: ['docs'], intens: {}, budget: 5000, prio: 'price', so: 'linux' });
  for (const id of ['cm14', 'slim3c']) {
    assert.equal(r.find(x => x.m.id === id).fit, false);
  }
  const hp = r.find(x => x.m.id === 'hp15');
  assert.equal(hp.fit, true);
  assert.equal(hp.compat, true);
});

test('macOS sin Mac en el catálogo no recomienda ninguna laptop', () => {
  const r = evaluate(C, T, { tasks: ['docs'], intens: {}, budget: 9000, prio: 'price', so: 'macos' });
  assert.equal(r.find(x => x.fit), undefined);
});

test('sin prioridad elegida ordena por precio y sí marca exceso', () => {
  const r = evaluate(C, T, { tasks: ['docs', 'calls'], intens: {}, budget: 5000, prio: null });
  assert.equal(r.find(x => x.fit).m.id, 'cm14');
  assert.equal(r.find(x => x.m.id === 'loq').suf.estado, 'mas_de_lo_necesario');
});

test('sin presupuesto no descarta ninguna laptop por precio', () => {
  const r = evaluate(C, T, { tasks: ['docs'], intens: {}, budget: null, prio: null });
  assert.ok(r.every(x => x.ok && !x.suf.fuera_presupuesto));
  assert.equal(r.find(x => x.m.id === 'g614fm').fit, true);
});

const juegos = (exigencia, intensidad, budget) => evaluate(C, T, {
  tasks: ['calls', 'graphics'], intens: { calls: 'frecuente', graphics: intensidad }, budget, prio: null, exigencia
});

test('exigencia liviana: jugar a diario no obliga a 6 GB y sale la TUF', () => {
  const r = juegos('liviana', 'frecuente', 3800);
  assert.equal(r[0].m.id, 'tuf');
  assert.equal(r[0].fit, true);
});

test('exigencia liviana: igual necesita gráfica dedicada', () => {
  const hp = juegos('liviana', 'frecuente', 5000).find(x => x.m.id === 'hp15');
  assert.equal(hp.fit, false);
  assert.match(hp.gaps[0].g, /dedicada/);
});

test('exigencia media: 4 GB alcanzan', () => {
  assert.equal(juegos('media', 'frecuente', 3800).find(x => x.m.id === 'tuf').fit, true);
});

test('exigencia alta: pide 6 GB aunque juegue a veces', () => {
  const tuf = juegos('alta', 'ocasional', 5000).find(x => x.m.id === 'tuf');
  assert.equal(tuf.fit, false);
  assert.match(tuf.gaps[0].g, /exigentes se recomiendan 6 GB/);
});

test('exigencia liviana: una gráfica de 6 GB se marca como exceso', () => {
  const victus = juegos('liviana', 'frecuente', 5000).find(x => x.m.id === 'victus');
  assert.equal(victus.suf.estado, 'mas_de_lo_necesario');
});

const conMarca = C.map(m => ({ ...m, brand: ['loq', 'slim3', 'slim3c'].includes(m.id) ? 'Lenovo' : 'Otra' }));

test('requisitos: sin coincidencia exacta sube el sustituto más cercano', () => {
  const r = evaluate(conMarca, T, {
    tasks: ['graphics'], intens: { graphics: 'frecuente' }, budget: 5000, prio: null,
    req: { ram_min_gb: 24, marcas: ['Lenovo'], memoria_min: 'ddr5' }
  });
  assert.equal(r.some(x => x.exacta), false);
  assert.equal(r[0].m.id, 'loq');
  assert.deepEqual(r[0].reqFaltan.map(f => f.campo), ['ram_min_gb']);
  assert.equal(r.find(x => x.m.id === 'victus').fit, true);
});

test('requisitos: si una laptop cumple todo queda como exacta', () => {
  const r = evaluate(conMarca, T, { tasks: ['docs'], intens: {}, budget: null, prio: null, req: { ram_min_gb: 16, marcas: ['Lenovo'] } });
  assert.equal(r[0].m.id, 'slim3');
  assert.equal(r[0].exacta, true);
});

test('requisitos: el tipo de memoria sin fuente queda sin confirmar', () => {
  assert.equal(tipoMemoria(C.find(m => m.id === 'loq')).generacion, 5);
  assert.equal(tipoMemoria(C.find(m => m.id === 'hp15')).generacion, 4);
  assert.equal(tipoMemoria(C.find(m => m.id === 'tuf')), null);
  assert.equal(compararRequisitos(C.find(m => m.id === 'tuf'), { memoria_min: 'ddr5' }).faltan.length, 1);
});

test('requisitos: la gráfica pedida no se marca como exceso', () => {
  const r = evaluate(C, T, { tasks: ['docs'], intens: {}, budget: null, prio: null, req: { grafica_dedicada: true } });
  assert.equal(r.find(x => x.m.id === 'loq').suf.sobras.some(s => s.dim === 'gpu'), false);
});

test('laptop premium muestra Más de lo que necesitas para uso básico', () => {
  const r = evaluate(C, T, { tasks: ['docs', 'calls'], intens: {}, budget: 9000, prio: 'price', win: false });
  const premium = r.find(x => x.m.id === 'g614fm');
  assert.equal(premium.fit, true);
  assert.equal(premium.suf.estado, 'mas_de_lo_necesario');
  assert.ok(premium.suf.sobras.length > 0);
});
