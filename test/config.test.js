import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { archivoRespuestas, rutaDesdeRaiz } from '../src/config.js';

const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const archivo = '/ruta/respuestas.json';

test('config: PGSSL_CA relativa parte de la raíz del proyecto', () => {
  assert.equal(rutaDesdeRaiz('certs/rds-global-bundle.pem'), path.join(raiz, 'certs', 'rds-global-bundle.pem'));
});

test('config: PGSSL_CA absoluta se respeta y vacía sigue vacía', () => {
  const absoluta = path.resolve(raiz, '..', 'global-bundle.pem');
  assert.equal(rutaDesdeRaiz(absoluta), absoluta);
  assert.equal(rutaDesdeRaiz(''), '');
  assert.equal(rutaDesdeRaiz(undefined), '');
});

test('config: el archivo de respuestas funciona en local', () => {
  assert.equal(archivoRespuestas({ GEMINI_RESPUESTAS_ARCHIVO: archivo }), archivo);
});

test('config: el archivo de respuestas se desactiva en Vercel y en producción', () => {
  assert.equal(archivoRespuestas({ GEMINI_RESPUESTAS_ARCHIVO: archivo, VERCEL: '1' }), '');
  assert.equal(archivoRespuestas({ GEMINI_RESPUESTAS_ARCHIVO: archivo, NODE_ENV: 'production' }), '');
});
