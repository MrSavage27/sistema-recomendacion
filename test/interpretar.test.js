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

test('reglas: facilidad de uso se asocia a Windows', () => {
  const r = interpretarConReglas('Quiero una laptop fácil de usar para documentos y navegar', TAREAS);
  assert.equal(r.windows, true);
  assert.ok(r.tareas.some(t => t.id === 'docs'));
});

test('reglas: trabajo remoto detecta videollamadas', () => {
  const r = interpretarConReglas('Hago trabajo remoto todos los días', TAREAS);
  assert.deepEqual(r.tareas, [{ id: 'calls', intensidad: 'frecuente' }]);
});

test('reglas: detecta Linux como sistema requerido', () => {
  const r = interpretarConReglas('Necesito que mi laptop tenga el sistema operativo de Linux', TAREAS);
  assert.equal(r.sistema_requerido, 'linux');
});

test('reglas: no marca Linux si la persona lo rechaza', () => {
  const r = interpretarConReglas('No quiero Linux, uso Word', TAREAS);
  assert.equal(r.sistema_requerido, null);
});

test('reglas: extrae gamer, RAM, memoria nueva y marca', () => {
  const r = interpretarConReglas('Quiero una laptop gamer, 24 GB RAM, que tenga una memoria nueva y que sea marca Lenovo', TAREAS);
  assert.deepEqual(r.tareas.map(t => t.id), ['graphics']);
  assert.deepEqual(r.requisitos, { ram_min_gb: 24, memoria_min: 'ddr5', marcas: ['Lenovo'] });
});

test('reglas: extrae almacenamiento, procesador, gráfica, pantalla y marca rechazada', () => {
  const r = interpretarConReglas('No quiero HP. Con 1 TB SSD, Ryzen 7, RTX, 16 pulgadas, 144 Hz y menos de 2 kg', TAREAS);
  assert.deepEqual(r.requisitos, {
    ssd_min_gb: 1024, marcas_excluidas: ['HP'], cpu_nivel_min: 3, cpu_marca: 'amd', grafica_marca: 'nvidia',
    grafica_dedicada: true, pantalla_min_pulgadas: 16, hz_min: 144, peso_max_kg: 2
  });
});

test('reglas: entiende 1TB aunque no diga SSD ni disco', () => {
  const r = interpretarConReglas('Quiero 24 GB de RAM y de por lo menos un 1TB', TAREAS);
  assert.equal(r.requisitos.ssd_min_gb, 1024);
});

test('reglas: reuniones virtuales y Valorant se entienden aunque diga que consume mucho', () => {
  const r = interpretarConReglas('Uso reuniones virtuales de la chamba y juego Valorant, que consume mucho en graficos', TAREAS);
  assert.deepEqual(r.tareas.map(t => t.id).sort(), ['calls', 'graphics']);
  assert.equal(r.exigencia_grafica, 'liviana');
});

test('reglas: nombrar un juego implica la tarea y gana el más exigente', () => {
  const r = interpretarConReglas('A veces Minecraft y Cyberpunk', TAREAS);
  assert.deepEqual(r.tareas, [{ id: 'graphics', intensidad: 'ocasional' }]);
  assert.equal(r.exigencia_grafica, 'alta');
});

test('reglas: un juego negado no activa la tarea', () => {
  const r = interpretarConReglas('Uso Word. No juego Valorant', TAREAS);
  assert.deepEqual(r.tareas.map(t => t.id), ['docs']);
  assert.equal(r.exigencia_grafica, null);
});

test('sanear: exigencia solo vale con la tarea de juegos', () => {
  assert.equal(sanear({ tareas: [{ id: 'docs' }], exigencia_grafica: 'alta' }, TAREAS, PRIORIDADES).exigencia_grafica, null);
  assert.equal(sanear({ tareas: [{ id: 'graphics' }], exigencia_grafica: 'x' }, TAREAS, PRIORIDADES).exigencia_grafica, null);
  assert.equal(sanear({ tareas: [{ id: 'graphics' }], exigencia_grafica: 'media' }, TAREAS, PRIORIDADES).exigencia_grafica, 'media');
});

test('sanear: requisitos fuera de rango o inventados se descartan', () => {
  const r = sanear({ requisitos: {
    ram_min_gb: 9999, ssd_min_gb: 512, memoria_min: 'ddr9', marcas: ['Lenovo', 'Patito', 'HP'], marcas_excluidas: ['HP'],
    cpu_nivel_min: 7, peso_max_kg: 1.8, extra: 'texto libre'
  } }, TAREAS, PRIORIDADES);
  assert.deepEqual(r.requisitos, { ssd_min_gb: 512, peso_max_kg: 1.8, marcas: ['Lenovo'], marcas_excluidas: ['HP'] });
});

test('sanear: Linux explícito gana a la señal indirecta de Windows', () => {
  const r = sanear({ sistema_requerido: 'linux', windows: true }, TAREAS, PRIORIDADES);
  assert.equal(r.sistema_requerido, 'linux');
  assert.equal(r.windows, null);
});

test('sanear: windows true se refleja en sistema requerido y descarta valores inventados', () => {
  const r = sanear({ sistema_requerido: 'beos', windows: true }, TAREAS, PRIORIDADES);
  assert.equal(r.sistema_requerido, 'windows');
  assert.equal(r.windows, true);
});

test('sanear: descarta ids inventados, duplicados y valores fuera de rango', () => {
  const r = sanear({
    tareas: [{ id: 'docs', intensidad: 'frecuente' }, { id: 'hackear', intensidad: 'x' }, { id: 'docs', intensidad: 'ocasional' }],
    negadas: ['docs', 'graphics', 'otra'], presupuesto: -5, prioridad: 'barata', windows: 'si',
    no_entendido_cat: ['software_especifico', 'texto libre', '', 42, 'software_especifico']
  }, TAREAS, PRIORIDADES);
  assert.deepEqual(r.tareas, [{ id: 'docs', intensidad: 'frecuente' }]);
  assert.deepEqual(r.negadas, ['graphics']);
  assert.equal(r.presupuesto, null);
  assert.equal(r.prioridad, null);
  assert.equal(r.windows, null);
  assert.deepEqual(r.no_entendido_cat, ['software_especifico']);
});
