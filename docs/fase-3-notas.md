# Fase 3 — Notas de implementación

## Objetivo
Extender la confianza curada de Fase 2 con señales de consenso, independencia y posible sesgo en fuentes, incluyendo fuentes externas curadas como evidencia complementaria.

## Cambios implementados

- **DB/fuente**: nuevos campos `origen` (`curada/externa`), `independencia` (`fabricante/tienda/medio_independiente/sistema/otro`), `senal_sesgo` (`ninguna/patrocinado/solo_fabricante/desactualizada/configuracion_distinta/otra`), `valor_declarado`.
- **Migración idempotente**: `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` y constraints DO/EXCEPTION para BD existentes.
- **Seed**: se agregan referencias técnicas externas curadas por laptop (sin URL verificada en esta fase, marcadas como referenciales y con señal `configuracion_distinta`).
- **Agregación**: `src/services/fuentes.js` calcula `resumen_fuentes` por laptop/atributo (estado, verificadas, independientes, externas, alertas, nivel de confianza).
- **API**: catálogo incluye `resumen_fuentes` por laptop.
- **UI**: diálogo de fuentes muestra origen, independencia, valor declarado, alertas de sesgo y resumen por atributo; comparación muestra “Confianza de fuentes”.
- **Tests**: `test/fuentes.test.js` cubre verificación, discrepancia y alertas de sesgo.

## Expansión de catálogo (2026-11-22, curada)

- **Catálogo actual**: 9 laptops (`loq`, `victus`, `nitro`, `tuf`, `hp15`, `slim3`, `cm14`, `slim3c`, `g614fm`).
- **Política `verificada=true`**: solo cuando hay URL estable + configuración compatible/exacta confirmada + fecha de consulta. Si falta alguno, queda `verificada=false` y con nota.
- **Limpieza acotada**: `db/seed.sql` ejecuta `DELETE FROM fuente WHERE laptop_id IN (...)` para las laptops gestionadas por seed antes de reinsertar fuentes, evitando filas obsoletas por cambios de clave natural. Revisar impacto antes de ejecutar en BD real.
- **Nuevas laptops Windows seguras**: HP 15-fd0263la (B9TY2LA, estudio/oficina) y Lenovo IdeaPad Slim 3 15IAH8 (83ER00NKLM, estudio/trabajo). Se priorizaron modelos de baja ambigüedad.
- **Nuevas laptops no Windows (ChromeOS)**: ASUS Chromebook CM14 CM1402CM2A (`cm14`) y Lenovo IdeaPad Slim 3 Chromebook 14M868 82XJ (`slim3c`). Specs basadas en fichas oficiales ASUS/Lenovo PSREF; precios en Perú marcados como **referenciales no verificados** (`verificada=false`, sin URL de tienda estable) hasta confirmar oferta local. Sirven para que el filtro “Necesito Windows” las excluya correctamente.
- **Laptop premium para demostrar “Más de lo que necesitas”**: ASUS ROG Strix G16 G614FM-RV009W (`g614fm`, S/8399, Tiendas EFE, 2026-11-22). Specs/precio verificados con ficha EFE y referencia oficial ASUS ROG Perú; útil para mostrar sobras en casos básicos con presupuesto alto.
- **TUF FX507ZC4-HN005W**: Tiendas EFE confirma 16GB/512GB/RTX3050/i5 12va/SKU `FX507ZC4HN005W2`; CPU exacta `i5-12500H` se mantiene por referencia de familia ASUS y queda señalada en nota.
- **Imágenes**: `public/img/hp15.webp`, `public/img/slim3.webp`, `public/img/cm14.webp`, `public/img/slim3c.webp`, `public/img/g614fm.webp` son placeholders temporales (copias) hasta contar con assets de producto adecuados.
- **Interpretación**: “facilidad de uso/simplicidad/familiaridad/interfaz intuitiva” se mapea a `windows=true` en reglas y prompt Gemini como heurística conservadora para el MVP.

## Límites actuales (importante)

- No hay ingesta automática de internet/APIs externas en runtime; las fuentes externas están curadas en seed/BD.
- URLs externas no verificadas se mantienen en `NULL` y `verificada=false`.
- La detección de sesgo/consenso es heurística y determinista; requiere curación y revisión humana.
- La limpieza `DELETE FROM fuente ...` en seed es acotada al catálogo gestionado; en BD real debe revisarse antes de migrar.

## Go / No-Go Fase 3

| Señal | Criterio | Go | No-Go / ajustar |
|---|---|---|---|
| Cobertura externa | Laptops con >=1 fuente externa curada | 100% catálogo piloto (9/9) | Agregar curación antes de exponer |
| Calidad de evidencia | Fuentes con fecha, atributo, independencia y nota | Completo en seed/fixtures | No publicar fuentes ambiguas |
| Verificación | `verificada=true` solo con URL+config+fecha | Aplicado en catálogo actual | Bajar a `false` si cambia la fuente |
| Señales útiles | Usuarios entienden alertas/consenso en feedback cualitativo | Pendiente validación cualitativa | Simplificar etiquetas/copy |
| Mantenimiento | Cadencia definida para revisar vigencia/sesgo | Responsable/cadencia pendiente | Riesgo de datos obsoletos |