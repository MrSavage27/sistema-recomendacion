import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { config } from './config.js';
import { api } from './routes/api.js';

const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1); // detrás de un balanceador (ALB/Elastic Beanstalk) para el rate limit
app.use(express.json({ limit: '10kb' }));
app.use('/api', api);
app.use(express.static(path.join(raiz, 'public'), {
  maxAge: '1h',
  // El código se revalida con ETag: si no, tras un despliegue el navegador mezcla versiones hasta por 1 hora.
  setHeaders(res, ruta) {
    if (/\.(?:html|js|css)$/.test(ruta)) res.setHeader('Cache-Control', 'no-cache');
  }
}));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno' });
});

app.listen(config.port, () => {
  console.log(`Medida escuchando en http://localhost:${config.port}`);
  if (!config.geminiApiKey) console.warn('GEMINI_API_KEY vacía: se usará la interpretación por reglas.');
  if (config.geminiRespuestasArchivo) console.log(`Modo pruebas: respuestas de Gemini en ${config.geminiRespuestasArchivo}`);
});
