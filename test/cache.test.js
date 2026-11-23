import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { crearCache, claveInterpretacion } from '../src/services/cacheInterpretacion.js';
import { crearInterpretador } from '../src/services/interpretar.js';
import { TAREAS, PRIORIDADES } from './fixtures.js';

const catalogo = { tareas: TAREAS, prioridades: PRIORIDADES };
const respuesta = { tareas: [{ id: 'docs', intensidad: 'frecuente' }], negadas: [] };

function preparar({ llamar = async () => respuesta, huella = () => 'h1', cache = crearCache() } = {}) {
  const estado = { llamadas: 0 };
  const interpretar = crearInterpretador({
    cache, huella,
    llamarGemini: async (...args) => { estado.llamadas++; return llamar(...args); }
  });
  return { interpretar, estado };
}

const carpetaTemporal = () => fs.mkdtempSync(path.join(os.tmpdir(), 'medida-cache-'));

test('cache: el mismo texto no vuelve a llamar a Gemini', async () => {
  const { interpretar, estado } = preparar();
  const a = await interpretar('Uso Word', catalogo);
  const b = await interpretar('Uso Word', catalogo);
  assert.equal(estado.llamadas, 1);
  assert.equal(a.cache, undefined);
  assert.equal(b.cache, true);
  assert.equal(b.motor, 'gemini');
  assert.deepEqual(b.tareas, a.tareas);
});

test('cache: mayúsculas, tildes y espacios no cambian la clave', async () => {
  const { interpretar, estado } = preparar();
  await interpretar('Reunión  en Zoom', catalogo);
  await interpretar('reunion en zoom', catalogo);
  assert.equal(estado.llamadas, 1);
});

test('cache: pedidos simultáneos del mismo texto hacen una sola llamada', async () => {
  const { interpretar, estado } = preparar();
  await Promise.all([interpretar('Uso Word', catalogo), interpretar('Uso Word', catalogo), interpretar('Uso Word', catalogo)]);
  assert.equal(estado.llamadas, 1);
});

test('cache: un fallo cae a reglas y no se guarda', async () => {
  let falla = true;
  const { interpretar, estado } = preparar({
    llamar: async () => {
      if (falla) throw new Error('503');
      return respuesta;
    }
  });
  const a = await interpretar('Uso Word', catalogo);
  falla = false;
  const b = await interpretar('Uso Word', catalogo);
  assert.equal(a.motor, 'reglas');
  assert.equal(b.motor, 'gemini');
  assert.equal(estado.llamadas, 2);
});

test('cache: si cambia la huella del prompt se consulta de nuevo', async () => {
  let huella = 'h1';
  const { interpretar, estado } = preparar({ huella: () => huella });
  await interpretar('Uso Word', catalogo);
  huella = 'h2';
  await interpretar('Uso Word', catalogo);
  assert.equal(estado.llamadas, 2);
});

test('cache: en memoria vence y descarta la menos usada', () => {
  let reloj = 0;
  const cache = crearCache({ max: 2, ttlMs: 100, ahora: () => reloj });
  cache.guardar('a', 1);
  cache.guardar('b', 2);
  assert.equal(cache.obtener('a'), 1);
  cache.guardar('c', 3);
  assert.equal(cache.obtener('b'), null);
  reloj = 100;
  assert.equal(cache.obtener('a'), null);
});

test('cache: el archivo sobrevive al reinicio, no vence y no guarda el texto', async () => {
  const archivo = path.join(carpetaTemporal(), 'respuestas.json');
  const primero = preparar({ cache: crearCache({ archivo, ttlMs: 1 }) });
  await primero.interpretar('Texto privado de la persona', catalogo);
  assert.equal(fs.readFileSync(archivo, 'utf8').includes('privado'), false);

  const segundo = preparar({
    cache: crearCache({ archivo, ttlMs: 1, ahora: () => Date.now() + 1_000_000 }),
    llamar: async () => { throw new Error('503'); }
  });
  const r = await segundo.interpretar('Texto privado de la persona', catalogo);
  assert.equal(r.motor, 'gemini');
  assert.equal(r.cache, true);
  assert.equal(segundo.estado.llamadas, 0);
});

test('cache: un archivo dañado no rompe la app', () => {
  const archivo = path.join(carpetaTemporal(), 'respuestas.json');
  fs.writeFileSync(archivo, '{no es json');
  const cache = crearCache({ archivo });
  assert.equal(cache.tamano, 0);
  assert.equal(cache.obtener(claveInterpretacion('hola', 'h')), null);
});
