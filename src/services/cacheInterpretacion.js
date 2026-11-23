import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { normalizar } from './reglas.js';

// La clave es un hash: ni la memoria ni el archivo guardan lo que escribió la persona.
export function claveInterpretacion(texto, huella) {
  const limpio = normalizar(texto).replace(/\s+/g, ' ').trim();
  return crypto.createHash('sha256').update(`${huella}\n${limpio}`).digest('hex');
}

function leerArchivo(archivo) {
  if (!archivo || !fs.existsSync(archivo)) return [];
  try {
    const datos = JSON.parse(fs.readFileSync(archivo, 'utf8'));
    return Array.isArray(datos?.entradas) ? datos.entradas : [];
  } catch (err) {
    console.warn('[cache] archivo de respuestas ilegible, se empieza vacío:', err.message);
    return [];
  }
}

function escribirArchivo(archivo, entradas) {
  try {
    fs.mkdirSync(path.dirname(archivo), { recursive: true });
    const temporal = `${archivo}.tmp`;
    fs.writeFileSync(temporal, JSON.stringify({ version: 1, entradas: [...entradas] }));
    fs.renameSync(temporal, archivo);
  } catch (err) {
    console.warn('[cache] no se pudo guardar el archivo de respuestas:', err.message);
  }
}

// Con archivo (modo pruebas) las respuestas no vencen; en memoria vencen a los ttlMs.
export function crearCache({ max = 500, ttlMs = 86_400_000, archivo = '', ahora = Date.now } = {}) {
  const entradas = new Map(leerArchivo(archivo));
  const vence = !archivo;

  return {
    obtener(clave) {
      const entrada = entradas.get(clave);
      if (!entrada) return null;
      if (vence && ahora() - entrada.guardado >= ttlMs) {
        entradas.delete(clave);
        return null;
      }
      // Reinsertar la deja como la más reciente para el descarte por antigüedad.
      entradas.delete(clave);
      entradas.set(clave, entrada);
      return structuredClone(entrada.valor);
    },
    guardar(clave, valor) {
      entradas.delete(clave);
      entradas.set(clave, { valor: structuredClone(valor), guardado: ahora() });
      while (entradas.size > max) entradas.delete(entradas.keys().next().value);
      if (archivo) escribirArchivo(archivo, entradas);
    },
    get tamano() {
      return entradas.size;
    }
  };
}
