# Fase 0 — Diccionario de eventos y medición


## 1. Principios

- **Sin texto libre.** No se guarda nada que el usuario haya escrito. Donde antes había fragmentos de texto, se guarda una categoría de una lista cerrada o solo un conteo.
- **Anonimato.** `sesion` es un UUID válido o `null`. Las sesiones `null` se excluyen de los embudos.
- **Un evento, una pregunta.** Cada evento y campo responde a una pregunta ligada a P1, P2 o P3.
- **Versionado.** Todo evento lleva `v`. Un evento sin `v` se interpreta como versión 1. Los eventos y campos nuevos usan `v: 2`.
- **No guardar lo derivable.** Si un dato se obtiene con una consulta (por ejemplo, `jsonb_array_length`), no se almacena como campo.
- **Tope de payload.** Se mantiene el límite de 2000 caracteres. Si el catálogo crece, el objeto `estados` podría acercarse a ese límite.

## 2. Valores cerrados

| Lista | Valores |
|---|---|
| `motor` | `gemini`, `reglas` |
| `estado` de suficiencia | `insuficiente`, `a_medida`, `mas_de_lo_necesario` |
| `origen_ui` | `card`, `hero`, `compare`, `choice` |
| `no_entendido_cat` | `software_especifico`, `hardware_especifico`, `uso_profesional`, `otro` (ajustable) |
| `motivo` de elección | `precio`, `rendimiento`, `peso`, `marca`, `confianza`, `otro` |
| `dimension` de feedback | `claridad`, `confianza`, `suficiencia` |
| `valor` de feedback | `si`, `mas_o_menos`, `no` |

## 3. Eventos

### Existentes (extendidos)

| Evento | Campos | Cambios respecto a hoy |
|---|---|---|
| `interpretacion` | `v`, `motor`, `tareas[{id,intensidad}]`, `negadas[]`, `prioridad`, `presupuesto_detectado` (bool), `windows_detectado` (bool), `no_entendido_cat[]` | `fuente` pasa a `motor`. `no_entendido` (texto) se reemplaza por categorías. `presupuesto` se renombra a `presupuesto_detectado`. |
| `correccion` | `v`, `motor`, `tarea`, `accion` (`agregar/quitar`) | Solo se renombra `fuente` a `motor`. |
| `recomendacion` | `v`, `tareas[]` (IDs), `intensidad`, `presupuesto` (número o null), `prioridad`, `windows`, `recomendada`, `aptas` (conteo), `estados{id: estado}` | Se elimina `uso_texto`. `estados` registra la suficiencia de todas las opciones mostradas. Requiere la regla de Fase 1. |
| `comparacion` | `v`, `laptops[]`, `incluye_recomendada` (bool), `estados{id: estado}` | Se agregan los estados de lo comparado. |
| `eleccion` | `v`, `laptop`, `era_recomendada`, `estado_elegida`, `comparo_antes` (bool), `duracion_ms`, `motivo` (opcional) | `estado_elegida` reemplaza a `suficiencia_elegida`. `motivo` es una pregunta opcional con opciones cerradas, para interpretar elecciones no recomendadas. |

### Nuevos

| Evento | Campos | Para qué sirve | Estado |
|---|---|---|---|
| `fuente_vista` | `v`, `laptop`, `origen_ui` | P1: interés en verificar la información. | Activo en Fase 2. |
| `explicacion_vista` | `v`, `laptop`, `bloque` (`por_que`, `detalles_tecnicos`, `ten_en_cuenta`, `fuentes`) | P2: exposición a las explicaciones. | Activo en Fase 1. |
| `feedback` | `v`, `dimension`, `valor`, `contexto` (`recomendacion`, `comparacion`, `eleccion`, `fuentes`) | P1, P2 y P3: percepción declarada (confianza, claridad, suficiencia). | Activo en Fase 1; `confianza` activado en Fase 2. |
| `paso_visto` (opcional) | `v`, `paso` | Embudo; activarlo solo si el ruido es aceptable. | Allowlist listo; no emitido por defecto. |

## 4. Diccionario de campos

| Campo | Tipo | Regla |
|---|---|---|
| `sesion` | UUID o null | Válido o null. |
| `tipo` | string | En la lista de eventos permitidos. |
| `v` | entero | Se incrementa cuando cambia el significado. |
| `motor` | string | `gemini` o `reglas`. Evita confundirlo con las “fuentes” de información de P1. |
| `tareas` | array | Solo IDs del catálogo; en `interpretacion`, además la intensidad. |
| `negadas` | array | IDs de tareas que el usuario dijo que no hace. |
| `prioridad` | string | Una de las prioridades del producto. |
| `presupuesto` | número o null | Entero positivo. En `interpretacion` solo se guarda si se detectó (`presupuesto_detectado`). |
| `windows` | bool | Si el caso requiere Windows. |
| `no_entendido_cat` | array | Solo categorías de la lista cerrada. |
| `recomendada`, `laptop`, `laptops` | string / array | IDs del catálogo. |
| `aptas` | entero | Cuántas opciones cumplen el caso. |
| `estados` | objeto | `{id_laptop: estado}`. |
| `estado_elegida` | string | Un estado de suficiencia. |
| `era_recomendada`, `comparo_antes`, `incluye_recomendada` | bool | Booleanos. |
| `duracion_ms` | entero | Desde ver la recomendación hasta elegir; ≥ 0. |
| `origen_ui`, `bloque`, `motivo`, `dimension`, `valor`, `contexto` | string | De las listas cerradas. |

**Confirmado en código (Fase 1):** en `interpretacion` `tareas` es array de objetos `{id, intensidad}` y `presupuesto` se reportó como booleano detectado; en `recomendacion` `tareas` es array de IDs y `presupuesto` es numérico. MVP v2 mantiene compatibilidad agregando campos y usando `presupuesto_detectado/windows_detectado` en interpretación.

## 5. Cobertura por POV

| POV | Qué se mide | Eventos | Límite |
|---|---|---|---|
| P1 (información confiable en un solo lugar) | Apertura de fuentes y confianza declarada. | `fuente_vista`, `feedback` con `dimension=confianza` | Abrir una fuente no prueba confianza. El “sesgo” y el “consenso” siguen pendientes (Fase 3). |
| P2 (entender qué significa cada característica) | Exposición a las explicaciones y claridad declarada. | `explicacion_vista`, `feedback` con `dimension=claridad` | La vista mide exposición, no comprensión; por eso se añade la pregunta corta. |
| P3 (distinguir insuficiente de excesivo) | Qué estado muestra el sistema, cuál elige el usuario y si lo percibe claro. | `estados`, `estado_elegida`, `feedback` con `dimension=suficiencia`, `motivo` | El arrepentimiento posterior no se puede medir con eventos; necesita un seguimiento aparte. |

La rapidez de decisión (`duracion_ms`) queda como métrica secundaria y no se asigna a ningún POV.

## 6. Métricas propuestas

| Métrica | Fórmula | Nota |
|---|---|---|
| Casos fuera de cobertura | Interpretaciones con `no_entendido_cat` no vacío / total | Backlog de cobertura (P2/P3). |
| Distribución de estados mostrados | Estados en `recomendacion.estados` | Verifica que el sistema discrimina y no etiqueta todo igual. |
| Elecciones “más de lo necesario” | `estado_elegida = mas_de_lo_necesario` / elecciones | Indicador de sobregasto (P3). |
| Claridad declarada | `feedback` con `claridad = si` / feedbacks de claridad | P2. |
| Confianza declarada | Igual, con `confianza` | P1. |
| Apertura de fuentes | Sesiones con `fuente_vista` / sesiones con `recomendacion` | P1; es un diagnóstico. |
| Elección no recomendada | `era_recomendada = false` / elecciones, cruzada con `motivo` | Se interpreta con el motivo, no como un fallo en sí. |
| Comparación antes de elegir | Sesiones con ambos eventos / sesiones con elección | Diagnóstico, no meta: comparar más no implica decidir mejor. |

**Sobre las metas:** con 6 eventos y 3 sesiones no hay base para fijar umbrales. Se deben fijar tras reunir un mínimo de sesiones y evitar metas que empujen a que el usuario elija lo recomendado: el POV 3 pide que distinga lo suficiente de lo excesivo, no que acepte la sugerencia.

## 7. Consultas base

```sql
-- Distribución de estados mostrados en recomendaciones
SELECT e.value AS estado, COUNT(*) AS total
FROM evento, jsonb_each_text(datos->'estados') e
WHERE tipo = 'recomendacion'
GROUP BY 1;

-- Elecciones por estado de la opción elegida
SELECT datos->>'estado_elegida' AS estado, COUNT(*) AS total
FROM evento
WHERE tipo = 'eleccion'
GROUP BY 1;

-- Embudo por sesión (excluye sesiones nulas)
SELECT
  sesion,
  bool_or(tipo='interpretacion') AS interpreto,
  bool_or(tipo='recomendacion') AS vio_recomendacion,
  bool_or(tipo='fuente_vista') AS vio_fuentes,
  bool_or(tipo='comparacion') AS comparo,
  bool_or(tipo='eleccion') AS eligio
FROM evento
WHERE sesion IS NOT NULL
GROUP BY sesion;

-- Feedback declarado por dimensión
SELECT datos->>'dimension' AS dimension, datos->>'valor' AS valor, COUNT(*) AS total
FROM evento
WHERE tipo = 'feedback'
GROUP BY 1, 2;
```

Las consultas asumen que `datos` es `jsonb` y que `estados` solo existe en eventos con `v >= 2`.