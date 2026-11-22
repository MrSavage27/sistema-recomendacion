# Fase 0 — Línea base y monitoreo por fases

## 1. Fuente de línea base

- Fecha de captura: 2026-11-21 (dump compartido por el usuario).
- Tabla: `public.evento`.
- Volumen: **6 eventos**, **3 sesiones**.
- Limitación: muestra muy pequeña; sirve como línea base inicial, no como evidencia estadística. No se fijan metas numéricas hasta reunir un mínimo de sesiones (propuesto: >= 30 sesiones con embudo completo).

## 2. Línea base observada

### Conteo por tipo

| Tipo | Total |
|---|---:|
| `interpretacion` | 2 |
| `recomendacion` | 2 |
| `comparacion` | 1 |
| `eleccion` | 1 |
| `correccion` | 0 |

### Hallazgos

| Hallazgo | Evidencia | Implicación |
|---|---|---|
| Caso fuera de cobertura detectado | Una interpretación registró un `no_entendido` correspondiente a la categoría **software específico** (detalle omitido aquí por la regla de no guardar texto crudo). | P2/P3: falta guía para usos no mapeados. **Problema de privacidad por resolver:** el evento actual almacenó texto libre; al implementar el diccionario v2 debe migrarse a `no_entendido_cat`. |
| Sin correcciones registradas en la muestra | 0 eventos `correccion` en 2 interpretaciones. | No permite concluir calidad de interpretación; falta volumen. |
| Comparación observada antes de elección | En la única sesión con elección registrada, hubo `comparacion` y luego `eleccion`. | Observación aislada; no se puede generalizar. Se mantiene como diagnóstico. |
| Elección distinta de la recomendada | En la única elección registrada, el usuario eligió `nitro` y la recomendada era `loq` (`era_recomendada:false`). | No se puede generalizar. Puede ser preferencia informada o falta de confianza/explicación; cruzar con `motivo` y `estado_elegida` cuando estén instrumentados. |
| Privacidad parcialmente cumplida | La mayoría de eventos contienen IDs/datos estructurados. | La excepción es `no_entendido` con texto libre en el esquema actual; debe corregirse en la migración a v2. |

## 3. Métricas y seguimiento por fase

> Sin metas numéricas hasta alcanzar el mínimo de sesiones acordado. Las métricas se usan primero como diagnóstico/línea base.

| Métrica | Fórmula / fuente | Línea base | Tipo | POV | Objetivo inicial |
|---|---|---:|---|---|---|
| Casos fuera de cobertura | Interpretaciones con `no_entendido_cat` no vacío / total | 50% (1/2), muestra pequeña | Diagnóstico | P2/P3 | Medir tras v2; fijar meta con volumen suficiente. |
| Correcciones por interpretación | `correccion` / `interpretacion` | 0% (0/2) | Diagnóstico | P2 | Medir; reducir correcciones evitables. |
| Claridad declarada | `feedback` `dimension=claridad, valor=si` / total claridad | N/D (no instrumentado) | Métrica directa | P2 | Instrumentar en Fase 1. |
| Confianza declarada | `feedback` `dimension=confianza, valor=si` / total confianza | N/D (no instrumentado) | Métrica directa | P1 | Instrumentar en Fase 1. |
| Apertura de fuentes | Sesiones con `fuente_vista` / sesiones con `recomendacion` | N/D (no instrumentado) | Diagnóstico | P1 | Instrumentar en Fase 1. |
| Distribución de estados mostrados | Conteo por estado en `recomendacion.estados` | N/D (requiere Fase 1) | Métrica directa | P3 | Verificar que el sistema discrimina; no debe etiquetar todo igual. |
| Elecciones “más de lo necesario” | `estado_elegida = mas_de_lo_necesario` / elecciones | N/D (requiere Fase 1) | Métrica directa | P3 | Medir sobregasto percibido; fijar meta tras volumen suficiente. |
| Cambio tras ver etiqueta | Sesiones que cambian selección tras ver suficiencia / sesiones expuestas | N/D (requiere Fase 1) | Diagnóstico | P3 | Evaluar si la etiqueta ayuda a distinguir. |
| Elección no recomendada | `era_recomendada=false` / elecciones, cruzada con `motivo` | 100% (1/1), muestra pequeña | Diagnóstico | P3 | Interpretar con motivo; no tratar como fallo por defecto. |
| Comparación antes de elegir | Sesiones con `comparacion` y `eleccion` / sesiones con `eleccion` | 100% (1/1), muestra pequeña | Diagnóstico | P2/P3 | Sin meta numérica: comparar más no implica decidir mejor. |
| Tiempo a elección | Mediana `duracion_ms` recomendación→elección | N/D (no instrumentado) | Métrica secundaria | Transversal | Instrumentar; no asignar a un POV específico. |

## 4. Consultas SQL de seguimiento

```sql
-- 1) Conteo por tipo
SELECT tipo, COUNT(*) AS total
FROM evento
GROUP BY tipo
ORDER BY total DESC;

-- 2) Interpretaciones con casos no entendidos (v1: texto; v2: categorías)
-- v1 (legado, usar solo para auditoría controlada; no exponer texto crudo en reportes)
SELECT
  COUNT(*) AS total,
  COUNT(*) FILTER (
    WHERE jsonb_array_length(COALESCE(datos->'no_entendido','[]'::jsonb)) > 0
  ) AS con_no_entendido
FROM evento
WHERE tipo = 'interpretacion';

-- v2 (objetivo)
SELECT cat AS no_entendido_cat, COUNT(*) AS total
FROM evento, jsonb_array_elements_text(COALESCE(datos->'no_entendido_cat','[]'::jsonb)) cat
WHERE tipo = 'interpretacion'
GROUP BY 1
ORDER BY total DESC;

-- 3) Tasa de elección recomendada (diagnóstico, cruzar con motivo)
SELECT
  COUNT(*) AS elecciones,
  COUNT(*) FILTER (WHERE (datos->>'era_recomendada')::boolean) AS recomendada,
  COUNT(*) FILTER (WHERE NOT (datos->>'era_recomendada')::boolean) AS no_recomendada
FROM evento
WHERE tipo = 'eleccion';

-- 4) Embudo por sesión (excluye sesiones nulas)
SELECT
  sesion,
  bool_or(tipo='interpretacion') AS interpreto,
  bool_or(tipo='correccion') AS corrigio,
  bool_or(tipo='recomendacion') AS vio_recomendacion,
  bool_or(tipo='fuente_vista') AS vio_fuentes,
  bool_or(tipo='comparacion') AS comparo,
  bool_or(tipo='eleccion') AS eligio
FROM evento
WHERE sesion IS NOT NULL
GROUP BY sesion
ORDER BY MAX(creado) DESC;

-- 5) Distribución de estados mostrados (v2+)
SELECT e.value AS estado, COUNT(*) AS total
FROM evento, jsonb_each_text(datos->'estados') e
WHERE tipo = 'recomendacion'
GROUP BY 1;

-- 6) Elecciones por estado elegido (v2+)
SELECT datos->>'estado_elegida' AS estado, COUNT(*) AS total
FROM evento
WHERE tipo = 'eleccion'
GROUP BY 1;

-- 7) Feedback declarado por dimensión (v2+)
SELECT datos->>'dimension' AS dimension, datos->>'valor' AS valor, COUNT(*) AS total
FROM evento
WHERE tipo = 'feedback'
GROUP BY 1, 2;
```

## 5. Cadencia de monitoreo

| Ritmo | Responsable sugerido | Revisión |
|---|---|---|
| Semanal | Producto + dev | Conteos, embudo, no_entendidos, elecciones no recomendadas. |
| Por fase / release | Equipo INNOVA | Comparar contra línea base y criterios go/no-go. |
| Tras pruebas con usuarios | UX/Producto | Cruzar métricas con feedback cualitativo. Decidir alcance de prueba: mantener Rosa (46, asistente administrativa) y/o ajustar/ampliar a jóvenes según los POVs del proyecto. |

## 6. Criterios go/no-go para iniciar Fase 1

- [ ] Definiciones de Fase 0 aprobadas (`docs/fase-0-definiciones.md`). **Responsable:** Producto + Ingeniería.
- [ ] Diccionario de eventos aprobado (`docs/fase-0-eventos.md`). **Responsable:** Ingeniería + Producto.
- [ ] Consultas de línea base ejecutables sobre la BD real. **Responsable:** Ingeniería.
- [ ] Se acuerda el conjunto mínimo de eventos/campos a agregar antes o durante Fase 1. **Responsable:** Producto + Ingeniería.
- [ ] Se define la regla determinista de “Más de lo que necesitas” con umbrales iniciales a validar. **Responsable:** Producto + Ingeniería.
- [ ] Se confirma que no se capturará texto crudo del usuario; migración de `no_entendido` a `no_entendido_cat` planificada. **Responsable:** Ingeniería.
- [ ] Se define un mínimo de sesiones antes de fijar metas numéricas (propuesto: >= 30 sesiones con embudo completo). **Responsable:** Producto.

## 7. Riesgos de la línea base

- **Muestra pequeña**: 6 eventos no permiten decidir UX ni fijar metas; solo orientan.
- **Sesiones incompletas**: una sesión puede no pasar por todos los pasos.
- **Elección no recomendada ambigua**: puede ser buena decisión informada; hay que cruzarla con `motivo`, comparación y estado elegido.
- **Sin duración**: no se puede medir aún rapidez de decisión; se instrumentará como métrica secundaria.
- **Privacidad en esquema v1**: `no_entendido` contiene texto libre; es un problema de privacidad por resolver antes de escalar captura de eventos.