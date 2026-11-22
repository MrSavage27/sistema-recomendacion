import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate } from '../public/js/recomendador.js';
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
