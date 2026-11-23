import { pool } from '../db.js';
import { resumirFuentes } from '../services/fuentes.js';

// Cache en memoria: el catálogo cambia poco y así no consultamos RDS en cada visita.
let cache = null;
let cacheAt = 0;
const TTL_MS = 60_000;

export async function obtenerCatalogo({ fresco = false } = {}) {
  if (!fresco && cache && Date.now() - cacheAt < TTL_MS) return cache;

  const [laptops, tareas, perfiles, prioridades, fuentes] = await Promise.all([
    pool.query('SELECT * FROM v_catalogo ORDER BY precio'),
    pool.query('SELECT * FROM tarea ORDER BY orden'),
    pool.query(`SELECT p.id, p.nombre, array_agg(pt.tarea_id ORDER BY t.orden) AS tareas
                FROM perfil p JOIN perfil_tarea pt ON pt.perfil_id = p.id
                JOIN tarea t ON t.id = pt.tarea_id
                GROUP BY p.id, p.nombre, p.orden ORDER BY p.orden`),
    pool.query('SELECT id, etiqueta FROM prioridad ORDER BY orden'),
    pool.query(`SELECT laptop_id, tipo, nombre, url, fecha, atributo, nota, verificada, origen, independencia, senal_sesgo, valor_declarado
                FROM fuente ORDER BY laptop_id, tipo, fecha DESC NULLS LAST, id`)
  ]);

  const fuentesPorLaptop = new Map();
  for (const f of fuentes.rows) {
    const arr = fuentesPorLaptop.get(f.laptop_id) || [];
    arr.push({
      tipo: f.tipo, nombre: f.nombre, url: f.url || null,
      fecha: f.fecha, atributo: f.atributo, nota: f.nota || '',
      verificada: Boolean(f.verificada),
      origen: f.origen || 'curada',
      independencia: f.independencia || 'otro',
      senal_sesgo: f.senal_sesgo || 'ninguna',
      valor_declarado: f.valor_declarado || null
    });
    fuentesPorLaptop.set(f.laptop_id, arr);
  }

  cache = {
    laptops: laptops.rows.map(r => ({
      id: r.id, brand: r.marca, name: r.nombre, model: r.modelo,
      cpu: r.cpu, ct: r.cpu_tier, ram: r.ram_gb, ssd: r.ssd_gb,
      gpu: r.gpu, gm: r.gpu_mem_gb, screen: r.pantalla, sc: r.pantalla_tier,
      w: Number(r.peso_kg), wl: r.peso_label, os: r.sistema,
      benefit: r.beneficio, note: r.nota, spec: r.fuente_specs, img: r.imagen_url,
      price: Number(r.precio), store: r.tienda, ref: r.referencia,
      fecha: r.fecha_consulta,
      fuentes: fuentesPorLaptop.get(r.id) || [],
      resumen_fuentes: resumirFuentes(fuentesPorLaptop.get(r.id) || [], { price: Number(r.precio) })
    })),
    tareas: tareas.rows.map(r => ({
      id: r.id, l: r.etiqueta, ram: r.ram_min_gb, cpu: r.cpu_tier_min,
      ded: r.requiere_dedicada, gmFrecuente: r.gpu_mem_min_frecuente,
      descripcion: r.descripcion_ia, patron: r.patron
    })),
    perfiles: perfiles.rows,
    prioridades: prioridades.rows
  };
  cacheAt = Date.now();
  return cache;
}

export async function registrarEvento(sesion, tipo, datos) {
  await pool.query('INSERT INTO evento (sesion, tipo, datos) VALUES ($1, $2, $3)', [sesion, tipo, datos]);
}
