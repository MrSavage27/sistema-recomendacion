// Levanta la app guardando en disco las respuestas de Gemini, para repetir pruebas sin gastar cuota.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
process.env.GEMINI_RESPUESTAS_ARCHIVO ||= path.join(raiz, '.cache', 'gemini-respuestas.json');

await import('../src/server.js');
