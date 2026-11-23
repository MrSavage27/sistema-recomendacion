-- Medida · esquema PostgreSQL
-- Idempotente: se puede ejecutar varias veces sin perder datos.

CREATE TABLE IF NOT EXISTS tarea (
  id                 TEXT PRIMARY KEY,               -- docs, calls, many, edit, graphics
  etiqueta           TEXT NOT NULL,
  descripcion_ia     TEXT NOT NULL,                  -- cómo se le explica la tarea a Gemini
  ram_min_gb         SMALLINT NOT NULL,
  cpu_tier_min       SMALLINT NOT NULL,              -- 1 básico · 2 medio · 3 alto
  requiere_dedicada  BOOLEAN NOT NULL DEFAULT FALSE,
  gpu_mem_min_frecuente SMALLINT,                    -- VRAM mínima si la tarea es frecuente (NULL = no aplica)
  patron             TEXT NOT NULL,                  -- regex de respaldo cuando la IA no responde
  orden              SMALLINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS perfil (
  id     TEXT PRIMARY KEY,                           -- study, work, create, three
  nombre TEXT NOT NULL,
  orden  SMALLINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS perfil_tarea (
  perfil_id TEXT NOT NULL REFERENCES perfil(id) ON DELETE CASCADE,
  tarea_id  TEXT NOT NULL REFERENCES tarea(id)  ON DELETE CASCADE,
  PRIMARY KEY (perfil_id, tarea_id)
);

CREATE TABLE IF NOT EXISTS prioridad (
  id       TEXT PRIMARY KEY,                         -- price, mobile, screen, speed
  etiqueta TEXT NOT NULL,
  orden    SMALLINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tienda (
  id     SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS laptop (
  id            TEXT PRIMARY KEY,
  marca         TEXT NOT NULL,
  nombre        TEXT NOT NULL,
  modelo        TEXT NOT NULL,
  cpu           TEXT NOT NULL,
  cpu_tier      SMALLINT NOT NULL CHECK (cpu_tier BETWEEN 1 AND 3),
  ram_gb        SMALLINT NOT NULL,
  ssd_gb        SMALLINT NOT NULL,
  gpu           TEXT NOT NULL,
  gpu_mem_gb    SMALLINT NOT NULL DEFAULT 0,         -- 0 = gráfica integrada
  pantalla      TEXT NOT NULL,
  pantalla_tier SMALLINT NOT NULL DEFAULT 1,
  peso_kg       NUMERIC(4,2) NOT NULL,
  peso_label    TEXT NOT NULL,
  sistema       TEXT NOT NULL DEFAULT 'Windows 11 Home',
  beneficio     TEXT NOT NULL,
  nota          TEXT NOT NULL,
  fuente_specs  TEXT NOT NULL,
  imagen_url    TEXT,
  activo        BOOLEAN NOT NULL DEFAULT TRUE,
  actualizado   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS oferta (
  id             SERIAL PRIMARY KEY,
  laptop_id      TEXT NOT NULL REFERENCES laptop(id) ON DELETE CASCADE,
  tienda_id      INT  NOT NULL REFERENCES tienda(id),
  precio         NUMERIC(10,2) NOT NULL CHECK (precio > 0),
  referencia     TEXT NOT NULL,
  fecha_consulta DATE NOT NULL,
  vigente        BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (laptop_id, tienda_id, referencia)
);
CREATE INDEX IF NOT EXISTS oferta_vigente_idx ON oferta (laptop_id) WHERE vigente;

-- Fuentes trazables por laptop (Fase 2/3: curadas, externas, consenso y sesgo).
CREATE TABLE IF NOT EXISTS fuente (
  id              SERIAL PRIMARY KEY,
  laptop_id       TEXT NOT NULL REFERENCES laptop(id) ON DELETE CASCADE,
  tipo            TEXT NOT NULL CHECK (tipo IN ('fabricante','tienda','review_tecnica','interpretacion','otro')),
  nombre          TEXT NOT NULL,
  url             TEXT,
  fecha           DATE,
  atributo        TEXT NOT NULL DEFAULT 'general',
  nota            TEXT NOT NULL DEFAULT '',
  verificada      BOOLEAN NOT NULL DEFAULT FALSE,
  origen          TEXT NOT NULL DEFAULT 'curada' CHECK (origen IN ('curada','externa')),
  independencia   TEXT NOT NULL DEFAULT 'otro' CHECK (independencia IN ('fabricante','tienda','medio_independiente','sistema','otro')),
  senal_sesgo     TEXT NOT NULL DEFAULT 'ninguna' CHECK (senal_sesgo IN ('ninguna','patrocinado','solo_fabricante','desactualizada','configuracion_distinta','otra')),
  valor_declarado TEXT
);
CREATE INDEX IF NOT EXISTS fuente_laptop_idx ON fuente (laptop_id);
CREATE UNIQUE INDEX IF NOT EXISTS fuente_natural_idx ON fuente (laptop_id, tipo, nombre, atributo);

-- Migración idempotente para BD existentes (Fase 3).
ALTER TABLE fuente ADD COLUMN IF NOT EXISTS origen TEXT NOT NULL DEFAULT 'curada';
ALTER TABLE fuente ADD COLUMN IF NOT EXISTS independencia TEXT NOT NULL DEFAULT 'otro';
ALTER TABLE fuente ADD COLUMN IF NOT EXISTS senal_sesgo TEXT NOT NULL DEFAULT 'ninguna';
ALTER TABLE fuente ADD COLUMN IF NOT EXISTS valor_declarado TEXT;
DO $$ BEGIN
  ALTER TABLE fuente ADD CONSTRAINT fuente_origen_chk CHECK (origen IN ('curada','externa'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE fuente ADD CONSTRAINT fuente_independencia_chk CHECK (independencia IN ('fabricante','tienda','medio_independiente','sistema','otro'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE fuente ADD CONSTRAINT fuente_sesgo_chk CHECK (senal_sesgo IN ('ninguna','patrocinado','solo_fabricante','desactualizada','configuracion_distinta','otra'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Eventos anónimos para validar hipótesis (sin texto libre del usuario).
CREATE TABLE IF NOT EXISTS evento (
  id     BIGSERIAL PRIMARY KEY,
  sesion UUID,
  tipo   TEXT NOT NULL,
  datos  JSONB NOT NULL DEFAULT '{}'::jsonb,
  creado TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS evento_tipo_idx ON evento (tipo, creado);

-- Vista: cada laptop activa con su oferta vigente más barata.
CREATE OR REPLACE VIEW v_catalogo AS
SELECT DISTINCT ON (l.id)
  l.*, o.precio, o.referencia, o.fecha_consulta, t.nombre AS tienda
FROM laptop l
JOIN oferta o ON o.laptop_id = l.id AND o.vigente
JOIN tienda t ON t.id = o.tienda_id
WHERE l.activo
ORDER BY l.id, o.precio ASC;
