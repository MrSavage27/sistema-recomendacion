import { test } from 'node:test';
import assert from 'node:assert/strict';
import { interpretarConReglas } from '../src/services/reglas.js';
import { sanear } from '../src/services/interpretar.js';
import { TAREAS, PRIORIDADES } from './fixtures.js';

test('reglas: detecta tareas, intensidad, presupuesto y prioridad', () => {
  const r = interpretarConReglas('Uso Zoom y Excel. A veces juego. Presupuesto de 3,500 y la llevo en mochila', TAREAS);
  assert.deepEqual(r.tareas.map(t => t.id).sort(), ['calls', 'docs', 'graphics']);
  assert.equal(r.tareas.find(t => t.id === 'graphics').intensidad, 'ocasional');
  assert.equal(r.presupuesto, 3500);
  assert.equal(r.prioridad, 'mobile');
});

test('reglas: respeta negaciones', () => {
  const r = interpretarConReglas('Hago trabajos en Word. No juego nada', TAREAS);
  assert.deepEqual(r.tareas.map(t => t.id), ['docs']);
  assert.deepEqual(r.negadas, ['graphics']);
});

test('sanear: descarta ids inventados, duplicados y valores fuera de rango', () => {
  const r = sanear({
    tareas: [{ id: 'docs', intensidad: 'frecuente' }, { id: 'hackear', intensidad: 'x' }, { id: 'docs', intensidad: 'ocasional' }],
    negadas: ['docs', 'graphics', 'otra'], presupuesto: -5, prioridad: 'barata', windows: 'si',
    no_entendido: ['programar en Android Studio', '', 42]
  }, TAREAS, PRIORIDADES);
  assert.deepEqual(r.tareas, [{ id: 'docs', intensidad: 'frecuente' }]);
  assert.deepEqual(r.negadas, ['graphics']);
  assert.equal(r.presupuesto, null);
  assert.equal(r.prioridad, null);
  assert.equal(r.windows, null);
  assert.deepEqual(r.no_entendido, ['programar en Android Studio']);
});
