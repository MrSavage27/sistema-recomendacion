# Fase 2 — Notas de implementación

#Segundo commit de la rama.
## Objetivo
Agregar confianza curada y trazable: cada laptop expone fuentes estructuradas con tipo, fecha, atributo respaldado, nota y estado de verificación. No incluye agregación automática de fuentes externas ni detección de sesgo/consenso (Fase 3).

## Cambios implementados

- **DB**: tabla `fuente` (`tipo`, `nombre`, `url`, `fecha`, `atributo`, `nota`, `verificada`) con índice por laptop y unique natural `(laptop_id, tipo, nombre, atributo)`.
- **Seed**: fuentes curadas iniciales por laptop (fabricante + tienda) con URLs `NULL` cuando no se verificó un enlace estable.
- **API/Catálogo**: `/api/catalogo` incluye `fuentes[]` por laptop; se mantiene `spec/fuente_specs` por compatibilidad.
- **UI**: diálogo “Fuentes y evidencia” muestra tipo, atributo, fecha, verificación y enlace cuando existe; distingue dato referencial/verificado de interpretación del sistema.
- **Eventos**: se activa `fuente_vista` (`v:2`, `laptop`, `origen_ui`) y feedback `confianza` en contexto `fuentes` y `eleccion`.

## Proceso de curación (mínimo)

1. **Alta/cambio de laptop u oferta**: actualizar `laptop`, `oferta` y agregar/ajustar `fuente` correspondiente.
2. **Verificación**: antes de marcar `verificada=true`, confirmar URL estable, fecha de consulta y que la configuración (RAM/SSD/GPU/CPU) coincida con el catálogo.
3. **Precios**: revisar vigencia periódicamente; si cambia, actualizar `oferta.precio`, `fecha_consulta` y la fuente de tipo `tienda`. Si no se confirma, mantener como referencial.
4. **Trazabilidad**: no publicar datos sin al menos una fuente de atributo `specs` o `precio`; si falta URL, dejar `verificada=false` y nota clara.

## Go / No-Go Fase 2

| Señal | Métrica / criterio | Go | No-Go / ajustar |
|---|---|---|---|
| Fuentes visibles | % laptops con fuentes `specs` y `precio` | 100% del catálogo publicado | Alguna laptop sin fuente clave |
| Uso de fuentes | Sesiones con `fuente_vista` / sesiones con `recomendacion` | Tendencia positiva tras baseline | Cercano a 0: revisar visibilidad/copy |
| Confianza declarada | `feedback.dimension=confianza`, valor `si` | Mayoría positiva con muestra mínima | Predomina `no/mas_o_menos`: revisar calidad/claridad |
| Calidad de datos | Fuentes con fecha y nota; verificadas cuando hay URL estable | Sin fuentes ambiguas | Fuentes sin fecha/atributo o desactualizadas |
| Cobertura catálogo | Laptops activas suficientes para caso objetivo | Definir mínimo con negocio/PO | 4 laptops solo para piloto técnico |

## Pendientes / siguientes

- Completar URLs verificadas y marcar `verificada=true` cuando corresponda.
- Definir cadencia de revisión de precios y responsable.
- Evaluar historial de ofertas (Fase 2 extendida) antes de Fase 3.
- Fase 3: fuentes externas, consenso/sesgo y evidencia agregada.