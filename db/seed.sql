-- Medida · datos iniciales (catálogo de referencia, Perú, noviembre 2026)
-- Upserts: volver a ejecutarlo actualiza los valores sin duplicar filas.

INSERT INTO tarea (id, etiqueta, descripcion_ia, ram_min_gb, cpu_tier_min, requiere_dedicada, gpu_mem_min_frecuente, patron, orden) VALUES
('docs', 'Documentos, Excel y navegar',
 'Ofimática y navegación: Word, Excel, PowerPoint, PDF, tareas, apuntes, investigar en internet.',
 8, 1, FALSE, NULL,
 '\b(word|document\w*|trabajos|pdf|navega\w*|apuntes|diapositivas|powerpoint|excel|ofimatica)\b', 1),
('calls', 'Zoom, Meet o Teams',
 'Videollamadas y clases o reuniones virtuales: Zoom, Google Meet, Microsoft Teams.',
 8, 1, FALSE, NULL,
 '\b(zoom|meet|teams|videollamada\w*|clases virtuales)\b', 2),
('many', 'Muchas pestañas o programas a la vez',
 'Multitarea intensa: muchas pestañas del navegador o varios programas abiertos al mismo tiempo.',
 16, 1, FALSE, NULL,
 '\b(muchas pestanas|varias pestanas|\d{2,} pestanas|multitarea|apps a la vez|varias apps|varios programas)\b', 3),
('edit', 'Editar fotos o videos cortos',
 'Edición de fotos o video: Photoshop, Lightroom, Premiere, CapCut, DaVinci, Illustrator, contenido para redes.',
 16, 2, FALSE, NULL,
 '\b(editar|edicion|fotos|video corto|videos cortos|premiere|photoshop|lightroom|capcut|davinci|illustrator)\b', 4),
('graphics', 'Juegos o diseño 3D',
 'Videojuegos o modelado/render 3D: Blender, Revit, SolidWorks, AutoCAD 3D, juegos de PC.',
 16, 2, TRUE, 6,
 '\b(3d|render\w*|blender|revit|solidworks|gaming|juegos?|jugar|videojuegos?)\b', 5)
ON CONFLICT (id) DO UPDATE SET
  etiqueta = EXCLUDED.etiqueta, descripcion_ia = EXCLUDED.descripcion_ia,
  ram_min_gb = EXCLUDED.ram_min_gb, cpu_tier_min = EXCLUDED.cpu_tier_min,
  requiere_dedicada = EXCLUDED.requiere_dedicada,
  gpu_mem_min_frecuente = EXCLUDED.gpu_mem_min_frecuente,
  patron = EXCLUDED.patron, orden = EXCLUDED.orden;

INSERT INTO perfil (id, nombre, orden) VALUES
('study', 'Estudio', 1), ('work', 'Trabajo remoto', 2),
('create', 'Diseño y edición', 3), ('three', 'Juegos y 3D', 4)
ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre, orden = EXCLUDED.orden;

INSERT INTO perfil_tarea (perfil_id, tarea_id) VALUES
('study','docs'), ('study','calls'),
('work','docs'), ('work','calls'), ('work','many'),
('create','edit'), ('create','many'),
('three','docs'), ('three','graphics')
ON CONFLICT DO NOTHING;

INSERT INTO prioridad (id, etiqueta, orden) VALUES
('price', 'Ahorrar', 1), ('mobile', 'Llevarla a diario', 2),
('screen', 'Calidad de pantalla', 3), ('speed', 'Que rinda más', 4)
ON CONFLICT (id) DO UPDATE SET etiqueta = EXCLUDED.etiqueta, orden = EXCLUDED.orden;

INSERT INTO tienda (nombre) VALUES
('Tottus Perú'), ('Falabella Perú'), ('Hiraoka'), ('Tiendas EFE')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO laptop (id, marca, nombre, modelo, cpu, cpu_tier, ram_gb, ssd_gb, gpu, gpu_mem_gb,
                    pantalla, pantalla_tier, peso_kg, peso_label, sistema, beneficio, nota, fuente_specs, imagen_url) VALUES
('loq', 'Lenovo', 'LOQ Essential', '15ARP10E', 'AMD Ryzen 7 7735HS', 3, 16, 512, 'NVIDIA RTX 4050', 6,
 '15.6″ Full HD · 144 Hz', 2, 1.80, 'Desde 1,80 kg (familia)', 'Windows 11 Home',
 'Juegos y 3D con fluidez, y la más liviana',
 'El peso de 1,80 kg es el de la familia de modelos: confírmalo en la tienda.',
 'Lenovo PSREF · LOQ 15ARP10E', '/img/loq.webp'),
('victus', 'HP', 'Victus 15', '15-fb3021la · BT4F1LA', 'AMD Ryzen 7 7445H', 3, 16, 512, 'NVIDIA RTX 4050', 6,
 '15.6″ Full HD IPS · 144 Hz', 2, 2.29, '2,29 kg', 'Windows 11 Home',
 'Juegos y 3D con fluidez',
 'Pesa 2,29 kg: no es lo ideal para cargarla todos los días.',
 'HP · Ficha del modelo BT4F1LA', '/img/victus.webp'),
('nitro', 'Acer', 'Nitro V 15', 'ANV15-51-515J', 'Intel Core i5-13420H', 2, 16, 512, 'NVIDIA RTX 4050', 6,
 '15.6″ Full HD IPS · 144 Hz', 2, 2.30, '2,30 kg', 'Windows 11 Home',
 'Cubre todo tu uso con velocidad media',
 'Su procesador tiene menos margen y pesa 2,30 kg.',
 'Hiraoka · Ficha de la configuración ANV15-51-515J', '/img/nitro.webp'),
('tuf', 'ASUS', 'TUF Gaming F15', 'FX507ZC4-HN005W', 'Intel Core i5-12500H', 2, 16, 512, 'NVIDIA RTX 3050', 4,
 '15.6″ Full HD · 144 Hz', 2, 2.20, '2,20 kg', 'Windows 11 Home',
 'La más barata: sirve para todo, con menos margen en juegos',
 'Su gráfica es de 4 GB: en juegos exigentes tendrás que bajar algunos detalles.',
 'ASUS Perú · FX507ZC4-HN005W. Memoria de 16 GB según la configuración de Tiendas EFE.', '/img/tuf.webp')
ON CONFLICT (id) DO UPDATE SET
  marca = EXCLUDED.marca, nombre = EXCLUDED.nombre, modelo = EXCLUDED.modelo, cpu = EXCLUDED.cpu,
  cpu_tier = EXCLUDED.cpu_tier, ram_gb = EXCLUDED.ram_gb, ssd_gb = EXCLUDED.ssd_gb, gpu = EXCLUDED.gpu,
  gpu_mem_gb = EXCLUDED.gpu_mem_gb, pantalla = EXCLUDED.pantalla, pantalla_tier = EXCLUDED.pantalla_tier,
  peso_kg = EXCLUDED.peso_kg, peso_label = EXCLUDED.peso_label, sistema = EXCLUDED.sistema,
  beneficio = EXCLUDED.beneficio, nota = EXCLUDED.nota, fuente_specs = EXCLUDED.fuente_specs,
  imagen_url = EXCLUDED.imagen_url, actualizado = now();

INSERT INTO oferta (laptop_id, tienda_id, precio, referencia, fecha_consulta)
SELECT v.laptop_id, t.id, v.precio, v.referencia, DATE '2026-11-01'
FROM (VALUES
  ('loq',    'Tottus Perú',    4249, '149125539'),
  ('victus', 'Falabella Perú', 4299, '80025939'),
  ('nitro',  'Hiraoka',        4299, '133431 · publicación con mochila'),
  ('tuf',    'Tiendas EFE',    3799, 'FX507ZC4HN005W2 · precio especial publicado')
) AS v(laptop_id, tienda, precio, referencia)
JOIN tienda t ON t.nombre = v.tienda
ON CONFLICT (laptop_id, tienda_id, referencia) DO UPDATE SET
  precio = EXCLUDED.precio, fecha_consulta = EXCLUDED.fecha_consulta, vigente = TRUE;
