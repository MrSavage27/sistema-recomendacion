# Medida

Asesor de compra de laptops: la persona cuenta qué hace con su laptop y Medida le recomienda cuál le conviene, explicando por qué.
Proyecto del curso **Innovación y Emprendimiento con TI (PUCP)**.

- **Monolito Node.js + Express**: sirve el frontend (`public/`) y la API (`/api`).
- **PostgreSQL en AWS RDS**: catálogo de laptops, ofertas por tienda, tareas, perfiles y eventos de uso.
- **Gemini**: solo *interpreta* el texto libre del usuario a datos estructurados. La recomendación la hace un motor de reglas visible (`public/js/recomendador.js`). Si Gemini falla o no hay clave, se usan reglas por palabras clave.

```
medida/
├── public/              Frontend (HTML, CSS, JS, imágenes)
│   └── js/recomendador.js   Motor de recomendación (puro, testeado)
├── src/
│   ├── server.js        Express
│   ├── routes/api.js    /api/catalogo, /api/interpretar, /api/eventos, /api/health
│   ├── services/        gemini.js · reglas.js (respaldo) · interpretar.js (valida la salida)
│   └── repositories/    Consultas a PostgreSQL
├── db/                  schema.sql · seed.sql
├── scripts/             migrate.js · check-db.js
└── test/                node --test
```

## Puesta en marcha

Requisitos: Node.js 20 o superior.

```bash
npm install
cp .env.example .env      # en Windows: copy .env.example .env
# completa DATABASE_URL y GEMINI_API_KEY en .env
npm run db:check          # prueba la conexión a RDS
npm run db:migrate        # crea tablas y carga el catálogo
npm run dev               # http://localhost:3000
npm test
```

## 1. Crear la base de datos en el AWS Learner Lab

1. Inicia el Lab (**Start Lab**) y entra a la consola con el botón **AWS**. Región: **us-east-1**.
2. **RDS → Crear base de datos**:
   - Creación estándar · Motor **PostgreSQL** · Plantilla **Desarrollo y pruebas** (o Capa gratuita).
   - Identificador: `medida-db` · Usuario maestro: `medida_admin` · Contraseña: elige una y guárdala.
   - Clase: **db.t3.micro** (o db.t4g.micro) · Almacenamiento: 20 GB gp2/gp3, sin escalado automático.
   - Conectividad: **Acceso público: Sí** · Grupo de seguridad: crea uno nuevo `medida-db-sg`.
   - Configuración adicional: **Nombre de base de datos inicial: `medida`**. Desactiva *Monitoreo mejorado* y *Performance Insights* (el Lab suele bloquearlos).
3. Espera a que el estado sea **Disponible** (5–10 min) y copia el **Endpoint**.
4. En el grupo de seguridad `medida-db-sg` → Reglas de entrada → **PostgreSQL (5432)** desde **Mi IP**.
5. Arma `DATABASE_URL` en `.env`:
   `postgres://medida_admin:TU_CONTRASEÑA@ENDPOINT:5432/medida` y deja `PGSSL=true`.
6. `npm run db:check` y luego `npm run db:migrate`.

> El Lab tiene sesiones con tiempo límite. Al volver a iniciarlo, revisa en RDS que la base esté *Disponible* y que tu IP no haya cambiado (si cambió, actualiza la regla del grupo de seguridad).

## 2. Clave de Gemini

1. Entra a <https://aistudio.google.com/apikey> y crea una API key (plan gratuito, sin tarjeta).
2. Pégala en `.env` como `GEMINI_API_KEY`. Nunca en el frontend ni en GitHub.
3. `GET /api/health` debe mostrar `"gemini": "configurado"`.

Notas del plan gratuito: los límites son por proyecto y cambian con el tiempo (revísalos en AI Studio), y Google puede usar los datos para mejorar sus productos, por eso **no se envían datos personales** y la app solo manda el texto de uso (máx. 350 caracteres). Hay un tope diario propio (`GEMINI_DAILY_CAP`) y un límite de 15 solicitudes por minuto por IP; al superarlos se usan las reglas.

## 3. Subir a GitHub

1. Crea un repositorio **vacío** en GitHub (sin README ni .gitignore), por ejemplo `medida`.
2. En VS Code: abre la carpeta → panel *Source Control* → **Publish Branch**, o en la terminal:
   ```bash
   git remote add origin https://github.com/TU_USUARIO/medida.git
   git push -u origin main
   ```

## API

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/health` | Estado de BD y Gemini |
| GET | `/api/catalogo` | Laptops con su oferta vigente más barata, tareas, perfiles y prioridades |
| POST | `/api/interpretar` | `{ "texto": "..." }` → `{ tareas[{id,intensidad}], negadas, presupuesto, prioridad, windows, no_entendido, fuente }` |
| POST | `/api/eventos` | Registro anónimo: `interpretacion`, `correccion`, `recomendacion`, `comparacion`, `eleccion` |

## Cómo se recomienda

1. **Interpretación** (Gemini o reglas): texto → tareas + intensidad (`ocasional`/`frecuente`), negaciones, presupuesto, prioridad, Windows y usos no reconocidos.
2. **Validación** (`sanear`): se descarta todo lo que no exista en el catálogo.
3. **Motor de reglas**: cada laptop se compara con los mínimos de cada tarea (RAM, nivel de CPU, gráfica dedicada y, si el uso es frecuente, VRAM mínima). Las que cumplen y entran en el presupuesto se ordenan según la prioridad.

Los umbrales están en la tabla `tarea`: se pueden ajustar sin tocar código.

## Datos para validar el producto

La tabla `evento` guarda, sin el texto completo del usuario (solo frases cortas de usos no reconocidos), qué se interpretó, qué corrigió el usuario y qué eligió. Consultas útiles:

```sql
-- ¿Cuántas interpretaciones corrigió el usuario?
SELECT datos->>'fuente' AS fuente, count(*) FROM evento WHERE tipo = 'correccion' GROUP BY 1;
-- ¿Eligen la recomendada?
SELECT datos->>'era_recomendada' AS recomendada, count(*) FROM evento WHERE tipo = 'eleccion' GROUP BY 1;
-- Usos que el catálogo aún no cubre
SELECT jsonb_array_elements_text(datos->'no_entendido') AS uso, count(*)
FROM evento WHERE tipo = 'interpretacion' GROUP BY 1 ORDER BY 2 DESC;
```

## Actualizar precios

Edita `db/seed.sql` (o inserta en `oferta`) con la fecha de consulta y ejecuta `npm run db:migrate`. Para retirar una oferta: `UPDATE oferta SET vigente = false WHERE ...`.
