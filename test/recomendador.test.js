import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, REGLA_SUFI_V, clasificarSuficiencia } from '../public/js/recomendador.js';
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

test('suficiencia v1: docs+zoom marca exceso de gráfica en laptops gamer', () => {
  const r = evaluate(C, T, { tasks: ['docs', 'calls'], intens: {}, budget: 5000, prio: 'price', win: false });
  assert.equal(REGLA_SUFI_V, 1);
  const loq = r.find(x => x.m.id === 'loq');
  assert.equal(loq.suf.estado, 'mas_de_lo_necesario');
  assert.ok(loq.suf.sobras.some(s => s.dim === 'gpu'));
});

test('suficiencia v1: prioridad speed no marca exceso', () => {
  const r = evaluate(C, T, { tasks: ['docs', 'calls'], intens: {}, budget: 5000, prio: 'speed', win: false });
  const loq = r.find(x => x.m.id === 'loq');
  assert.equal(loq.suf.estado, 'a_medida');
});

test('suficiencia v1: fuera de presupuesto es marca aparte', () => {
  const r = evaluate(C, T, { tasks: ['docs', 'calls'], intens: {}, budget: 3000, prio: 'price', win: false });
  const tuf = r.find(x => x.m.id === 'tuf');
  assert.equal(tuf.suf.estado, 'a_medida');
  assert.equal(tuf.suf.fuera_presupuesto, true);
  assert.equal(tuf.fit, false);
});

test('suficiencia v1: insuficiente por requisito de tarea', () => {
  const r = evaluate(C, T, { tasks: ['graphics'], intens: { graphics: 'frecuente' }, budget: 5000, prio: 'price', win: false });
  const tuf = r.find(x => x.m.id === 'tuf');
  assert.equal(tuf.suf.estado, 'insuficiente');
  assert.ok(tuf.gaps.length > 0);
});
