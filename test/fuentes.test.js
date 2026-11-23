import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resumirFuentes } from '../src/services/fuentes.js';

test('resumirFuentes: detecta verificada con fuentes suficientes', () => {
  const r = resumirFuentes([
    { tipo: 'fabricante', atributo: 'specs', verificada: true, origen: 'curada', independencia: 'fabricante', senal_sesgo: 'ninguna', valor_declarado: '16GB', fecha: '2026-11-01' },
    { tipo: 'tienda', atributo: 'specs', verificada: false, origen: 'curada', independencia: 'tienda', senal_sesgo: 'ninguna', valor_declarado: '16GB', fecha: '2026-11-01' }
  ], { price: 4000 });
  assert.equal(r.por_atributo.specs.estado, 'verificado');
  assert.equal(r.verificadas, 1);
});

test('resumirFuentes: marca discrepancia por valores declarados distintos', () => {
  const r = resumirFuentes([
    { tipo: 'tienda', atributo: 'precio', verificada: false, origen: 'curada', independencia: 'tienda', senal_sesgo: 'ninguna', valor_declarado: 'S/ 4000', fecha: '2026-11-01' },
    { tipo: 'tienda', atributo: 'precio', verificada: false, origen: 'externa', independencia: 'medio_independiente', senal_sesgo: 'ninguna', valor_declarado: 'S/ 4500', fecha: '2026-11-01' }
  ], { price: 4000 });
  assert.equal(r.por_atributo.precio.estado, 'discrepancia');
});

test('resumirFuentes: expone alertas de sesgo', () => {
  const r = resumirFuentes([
    { tipo: 'fabricante', atributo: 'specs', verificada: false, origen: 'curada', independencia: 'fabricante', senal_sesgo: 'solo_fabricante', valor_declarado: 'RTX 4050', fecha: '2026-11-01' }
  ], { price: 4000 });
  assert.ok(r.alertas.some(a => /fabricante/i.test(a)));
});