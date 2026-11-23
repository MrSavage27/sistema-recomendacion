-- Fase 1 / D3: sanea eventos históricos para eliminar texto libre del usuario.
-- Ejecutar manualmente sobre la BD real tras revisar el resultado del SELECT.
-- No borra filas: solo normaliza datos JSONB.

BEGIN;

-- 1) Revisar filas afectadas antes de actualizar.
SELECT id, tipo, creado, datos->'no_entendido' AS no_entendido
FROM evento
WHERE tipo = 'interpretacion'
  AND jsonb_typeof(datos->'no_entendido') = 'array'
  AND jsonb_array_length(datos->'no_entendido') > 0;

-- 2) Migrar no_entendido (texto libre) -> no_entendido_cat (categorías cerradas).
--    Regla conservadora: cualquier texto previo se clasifica como 'otro'
--    salvo patrones conocidos revisados manualmente. Ajustar antes de ejecutar.
UPDATE evento
SET datos =
  (datos - 'no_entendido')
  || jsonb_build_object(
    'no_entendido_cat',
    CASE
      WHEN EXISTS (
        SELECT 1
        FROM jsonb_array_elements_text(datos->'no_entendido') AS t(txt)
        WHERE lower(txt) ~ '(android|studio|program|software|app|excel avanzado|sap|autocad|matlab|python|java)'
      ) THEN '["software_especifico"]'::jsonb
      WHEN EXISTS (
        SELECT 1
        FROM jsonb_array_elements_text(datos->'no_entendido') AS t(txt)
        WHERE lower(txt) ~ '(impresora|monitor|mouse|teclado|tablet|disco|usb|camara)'
      ) THEN '["hardware_especifico"]'::jsonb
      WHEN EXISTS (
        SELECT 1
        FROM jsonb_array_elements_text(datos->'no_entendido') AS t(txt)
        WHERE lower(txt) ~ '(ingenier|arquitect|diseñ|contab|medic|abog|empresa)'
      ) THEN '["uso_profesional"]'::jsonb
      WHEN jsonb_array_length(datos->'no_entendido') > 0 THEN '["otro"]'::jsonb
      ELSE '[]'::jsonb
    END
  )
WHERE tipo = 'interpretacion'
  AND jsonb_typeof(datos->'no_entendido') = 'array';

-- 3) Eliminar uso_texto histórico (booleano, no sensible, pero retirado en v2).
UPDATE evento
SET datos = datos - 'uso_texto'
WHERE tipo = 'recomendacion'
  AND datos ? 'uso_texto';

-- 4) Verificación.
SELECT id, tipo, datos
FROM evento
WHERE (datos ? 'no_entendido') OR (datos ? 'uso_texto')
ORDER BY id;

COMMIT;