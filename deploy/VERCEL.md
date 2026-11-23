# Desplegar Medida en Vercel

La app corre como una sola función de Vercel (`src/server.js`). La carpeta `public/` la sirve la CDN de Vercel. El uso local (`npm run dev`) y EC2 (`deploy/setup-ec2.sh`) siguen funcionando igual.

## Antes de empezar

La base de datos sigue en AWS RDS (`us-east-1`) y debe cumplir esto:

- **Lab activo.** Si el AWS Lab está detenido, RDS no responde y la app devuelve error.
- **Acceso público** habilitado en la instancia de RDS.
- **Regla de entrada 5432** en el Security Group. Vercel no tiene IP fija en los planes normales, así que la regla queda abierta a `0.0.0.0/0`. Usa una contraseña fuerte y un usuario sin más permisos de los necesarios.
- **Tablas y catálogo cargados** (ver "Migraciones").

## Importar el proyecto

1. En Vercel, elige **Add New > Project** e importa el repositorio de GitHub.
2. Deja **Root Directory** en la raíz. El framework se detecta como **Express**.
3. No configures Build Command ni Output Directory.
4. Agrega las variables de entorno de la siguiente sección.
5. Pulsa **Deploy**.
6. Abre `https://TU-PROYECTO.vercel.app/api/health`. Debe responder `"ok": true` y `"db": "ok"`.

## Variables de entorno

Configúralas en **Settings > Environment Variables**. No subas valores reales a Git.

| Variable | Obligatoria | Valor |
|---|---|---|
| `DATABASE_URL` | Sí | `postgres://USUARIO:CONTRASEÑA@ENDPOINT:5432/medida`, sin `?sslmode=...` |
| `GEMINI_API_KEY` | Recomendada | Clave de Google AI Studio. Sin ella, la app usa las reglas |
| `PGSSL` | No | `true` (valor por defecto) |
| `PGSSL_CA` | No | `certs/rds-global-bundle.pem` (en Vercel se usa este certificado aunque no la definas) |
| `GEMINI_MODEL` | No | `gemini-3.5-flash-lite` |
| `GEMINI_TIMEOUT_MS` | No | `8000` |
| `GEMINI_DAILY_CAP` | No | `500` |
| `GEMINI_CACHE_MAX` | No | `500` |
| `GEMINI_CACHE_TTL_MS` | No | `86400000` |
| `LOG_EVENTS` | No | `true` |

No configures `PORT` ni `GEMINI_RESPUESTAS_ARCHIVO`: Vercel no los usa.

`sslmode` en `DATABASE_URL` puede reemplazar la configuración de `PGSSL_CA`, por eso debe ir sin ese parámetro.

## Migraciones

Las migraciones **no** corren en Vercel. Ejecútalas desde tu computadora, con el `.env` apuntando a RDS:

```bash
npm run db:check
npm run db:migrate
```

Repite `db:migrate` cada vez que cambien `db/schema.sql` o `db/seed.sql`, antes de desplegar el código que dependa de esos cambios.

## Qué hace `vercel.json`

- **`regions: ["iad1"]`**: ejecuta la función en Washington D.C., cerca de RDS en `us-east-1`.
- **`headers`**: HTML, JS y CSS se revalidan en cada visita. `/` tiene su propia regla porque no termina en `.html`. Las imágenes se guardan 7 días, sin `immutable`, porque sus nombres no cambian al reemplazarlas.

Lo que no se agregó, y por qué:

- **`rewrites`**: Vercel sirve `public/` y envía el resto de las rutas, incluido `/api/*`, a Express.
- **`functions`**: el builder de Express ignora esa clave para `src/server.js`, así que `includeFiles` y `maxDuration` no tendrían efecto.
- **`maxDuration`**: la app ya corta sus esperas (Gemini a los 8 s y PostgreSQL a los 8 a 11 s). Si quieres un límite menor que los 300 s por defecto, configúralo en **Settings > Functions > Default Max Duration**.

El certificado se incluye porque `src/db.js` lo referencia con una ruta estática.

## Limitaciones en Vercel

Cada instancia tiene su propia memoria. Por eso estos valores son **por instancia** y no globales:

- El límite de solicitudes por minuto por IP.
- El tope diario `GEMINI_DAILY_CAP`.
- La caché de respuestas de Gemini y la del catálogo.

El modo `npm run dev:pruebas` graba en disco y queda desactivado en Vercel y con `NODE_ENV=production`.

## Probar en local con la CLI

Requiere Vercel CLI 47.0.5 o superior.

```bash
npm i -g vercel
vercel link
vercel env pull .env.local
vercel dev
```

`vercel env pull` escribe secretos en `.env.local`, que Git ignora.

En Windows, la CLI puede fallar con `EPERM ... symlink` al preparar el builder. Si pasa, ejecútala desde WSL o activa el **Modo de desarrollador** de Windows.
