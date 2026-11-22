# Fase 0 — Definiciones de producto

Estado: **borrador operativo para validación**  
Fecha base: 2026-11-21  
Alcance: definir reglas y lenguaje antes de implementar cambios de UX/motor en Fase 1.

## 1. Objetivo

Alinear el producto con los POVs del proyecto INNOVA:

- **P1 (Confiar / fuentes)**: jóvenes que investigan necesitan información confiable de dispositivos en un solo lugar, y poder distinguir información confiable de sesgada.
- **P2 (Interpretar / tranquilidad)**: usuarios con poco conocimiento técnico deben entender qué significa cada característica para su uso diario.
- **P3 (Comparar / suficiencia)**: usuarios deben saber si una laptop es insuficiente, adecuada o excesiva para sus necesidades.

## 2. Estados de suficiencia (P3)

La etiqueta de suficiencia evalúa **capacidad frente al uso declarado** (`tareas`, `intensidad`, `prioridad`, `windows`). El presupuesto se maneja como marca aparte.

| Estado | Significado para el usuario | Regla inicial propuesta | Señal actual en código/datos |
|---|---|---|---|
| **Insuficiente** | No cubre lo que necesitas hacer. | No cubre al menos un requisito de sus tareas (RAM, procesador, gráfica) o no cumple Windows requerido. | `gap()` en `public/js/recomendador.js`; `sys` en `evaluate()`. |
| **A tu medida** | Cubre lo que necesitas para tu uso. | Cumple los requisitos de las tareas declaradas y Windows requerido, y no cae en “Más de lo que necesitas”. | `fit`/`gaps` actuales; `reason()/why()` en `public/js/app.js`. |
| **Más de lo que necesitas** | Tiene capacidad de sobra para tu uso actual. | Supera el requisito de todas sus tareas por un margen explícito y esa sobra no aporta a la prioridad elegida. Si no hay una opción base “A tu medida” para comparar, se compara contra los requisitos de las tareas, no contra otra laptop. | Base parcial: `perf()`, atributos de laptop, umbrales en `tarea`. |

### Marca independiente: presupuesto

| Marca | Significado | Regla |
|---|---|---|
| **Fuera de presupuesto** | Puede ser apta en capacidad, pero se pasa del tope. | `precio > presupuesto`. Se muestra junto al estado de suficiencia, no lo reemplaza. |

Esto evita dejar sin etiqueta un equipo apto que se pasa de presupuesto.

### Umbrales iniciales de “Más de lo que necesitas” (a validar)

> Valores iniciales para Fase 1; deben validarse con datos y pruebas de usuario antes de fijarlos.

| Criterio | Umbral inicial | Aplica cuando | Aporta a prioridad |
|---|---|---|---|
| Gráfica / VRAM | Diferencia >= 2 GB sobre el requisito aplicable de la tarea, o dedicada cuando la tarea no la requiere. | Tareas seleccionadas no son `graphics`/`edit` con necesidad equivalente. | No aporta si prioridad no es rendimiento/juegos. |
| RAM | RAM >= 16 GB cuando todas las tareas seleccionadas requieren 8 GB. | No hay `many/edit/graphics` exigiendo 16 GB. | Puede aportar si prioridad es `speed`; validar. |
| CPU | `cpu_tier` 2 niveles por encima del mínimo requerido, sin tareas exigentes. | Tareas con `cpu_tier_min` bajo. | Aporta solo si prioridad es `speed`; validar. |
| Rendimiento general | `perf()` notablemente mayor sin mejora explicable para el caso. | Siempre evaluar contra tareas/prioridad. | Definir “notable” con datos antes de usar en UI. |

**Regla de presentación:** no descalificar. Explicar **qué sobra hoy** y **cuándo sí valdría la pena** (ej. holgura futura, cambio de uso).

## 3. Traducción de specs a uso diario (P2)

Cada especificación visible debe responder:

1. **Qué es** (técnico, breve).
2. **Qué significa para tu uso** (contextualizado a tareas/prioridad).
3. **Cuándo te debería importar** (umbral o señal práctica).

| Spec | Traducción esperada | Tipo | Criterio inicial | Responsable |
|---|---|---|---|---|
| RAM | “Para Zoom + Excel + muchas pestañas, 16 GB da margen; 8 GB puede quedarse justo”. | Interpretación | Basado en `ram_min_gb` por tarea; validar con casos reales. | Producto + Ingeniería |
| CPU | “Afecta qué tan fluido se siente con varias cosas abiertas; para edición/juegos importa más”. | Interpretación | `cpu_tier` vs `cpu_tier_min`; umbral de percepción a validar. | Producto + Ingeniería |
| GPU / VRAM | “Para juegos/3D importa; para documentos/Zoom casi no cambia tu experiencia”. | Mixto (dato + interpretación) | `gpu_mem_gb`, `requiere_dedicada`, `gpu_mem_min_frecuente`. | Producto + Ingeniería |
| SSD | “512 GB alcanza para estudio/trabajo típico; si guardas muchos archivos/juegos puede quedarse corto”. | Interpretación | Capacidad nominal; no mide velocidad real. | Producto |
| Pantalla | “144 Hz se nota más en juegos; para estudio/oficina la diferencia puede no ser prioritaria”. | Interpretación | `pantalla_tier`; percepción a validar. | Producto |
| Peso | “Si la llevas a diario, la diferencia de peso se nota en mochila”. | Interpretación | `peso_kg`; umbral perceptible (ej. ~0.5 kg) a validar con usuarios. | Producto + UX |
| Sistema | “Solo importa como filtro si necesitas Windows por un programa específico”. | Dato | `sistema` y requisito `windows`. | Ingeniería |

Los umbrales marcados como “a validar” no se presentan como hechos absolutos en UI hasta tener evidencia o criterio aprobado.

## 4. Confianza de fuente (P1)

P1 tiene dos preguntas: **(a)** información relevante en un solo lugar; **(b)** distinguir información confiable de sesgada. La pregunta (b) queda **parcialmente cubierta** hasta Fase 3. En Fase 1 se incluye una señal mínima: etiquetar cada dato visible como **fabricante**, **tienda** o **interpretación**.

| Señal | Pregunta que responde | Estado actual | Fase objetivo |
|---|---|---|---|
| **Tipo de fuente** | ¿Quién lo dice? | `fuente_specs`, `tienda`, `referencia` como texto. | Fase 1: etiqueta mínima fabricante/tienda/interpretación. Fase 2: modelo estructurado. |
| **Fecha/vigencia** | ¿Sigue vigente? | `fecha_consulta` en oferta. | Fase 2: vigencia e historial. |
| **Evidencia/URL** | ¿Puedo verificarlo? | No hay URL clicable en UI. | Fase 2. |
| **Independencia/sesgo** | ¿Tiene incentivo comercial? | No modelado. | Fase 3. |
| **Consenso** | ¿Otras fuentes coinciden? | No modelado. | Fase 3. |

### Regla de presentación

- Toda afirmación importante debe indicar su **origen y fecha**.
- Separar: **dato verificado** (spec/precio/fuente) de **interpretación** (traducción/recomendación).
- La IA puede resumir o clasificar evidencia en fases futuras, pero **no decide la recomendación**.

## 5. Criterios de salida de Fase 0

Fase 0 se considera completa cuando:

- [ ] Las definiciones de suficiencia están acordadas por el equipo. **Responsable:** Producto + Ingeniería.
- [ ] La tabla de traducción de specs tiene dueño y formato aprobado. **Responsable:** Producto + UX.
- [ ] El diccionario de eventos está aprobado y respeta privacidad. **Responsable:** Ingeniería + Producto.
- [ ] Existe línea base medida sobre `evento`. **Responsable:** Ingeniería.
- [ ] Se define un mínimo de sesiones para fijar metas (propuesto: >= 30 sesiones con embudo completo antes de fijar umbrales objetivo). **Responsable:** Producto.
- [ ] Se validan los umbrales iniciales de “Más de lo que necesitas” antes de implementarlos en UI. **Responsable:** Producto + Ingeniería.