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
('Tottus Perú'), ('Falabella Perú'), ('Hiraoka'), ('Tiendas EFE'), ('Ripley Perú'), ('Referencia Perú')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO laptop (id, marca, nombre, modelo, cpu, cpu_tier, ram_gb, ssd_gb, gpu, gpu_mem_gb,
                    pantalla, pantalla_tier, peso_kg, peso_label, sistema, beneficio, nota, fuente_specs, imagen_url) VALUES
('loq', 'Lenovo', 'LOQ Essential', '15ARP10E', 'AMD Ryzen 7 7735HS', 3, 16, 512, 'NVIDIA RTX 4050', 6,
 '15.6″ Full HD · 144 Hz', 2, 1.80, 'Desde 1,80 kg (familia)', 'Windows 11 Home',
 'Juegos y 3D con fluidez, y la más liviana',
 'El peso de 1,80 kg es el de la familia de modelos: confírmalo en la tienda.',
 'Lenovo PSREF · LOQ 15ARP10E', '/img/loq.webp'),
('victus', 'HP', 'Victus 15', '15-fb3021la · BT4F1LA', 'AMD Ryzen 7 7445HS', 3, 16, 512, 'NVIDIA RTX 4050', 6,
 '15.6″ Full HD IPS · 144 Hz', 2, 2.29, '2,29 kg', 'Windows 11 Home',
 'Juegos y 3D con fluidez',
 'Pesa 2,29 kg: no es lo ideal para cargarla todos los días.',
 'HP Perú · ficha BT4F1LA', '/img/victus.webp'),
('nitro', 'Acer', 'Nitro V 15', 'ANV15-51-515J', 'Intel Core i5-13420H', 2, 16, 512, 'NVIDIA RTX 4050', 6,
 '15.6″ Full HD IPS · 144 Hz', 2, 2.30, '2,30 kg', 'Windows 11 Home',
 'Cubre todo tu uso con velocidad media',
 'Su procesador tiene menos margen y pesa 2,30 kg.',
 'Hiraoka · ficha ANV15-51-515J', '/img/nitro.webp'),
('tuf', 'ASUS', 'TUF Gaming F15', 'FX507ZC4-HN005W', 'Intel Core i5-12500H', 2, 16, 512, 'NVIDIA RTX 3050', 4,
 '15.6″ Full HD · 144 Hz', 2, 2.20, '2,20 kg', 'Windows 11 Home',
 'La más barata: sirve para todo, con menos margen en juegos',
 'Su gráfica es de 4 GB: en juegos exigentes tendrás que bajar algunos detalles.',
 'Tiendas EFE / ASUS · FX507ZC4-HN005W', '/img/tuf.webp'),
('hp15', 'HP', 'Laptop 15', '15-fd0263la · B9TY2LA', 'Intel Core i5-1334U', 1, 16, 1024, 'Intel Iris Xe', 0,
 '15.6″ Full HD', 1, 1.59, '1,59 kg', 'Windows 11 Home',
 'Ligera, con buen espacio y lista para estudio o trabajo',
 'No tiene gráfica dedicada: no es para juegos exigentes ni 3D pesado. Verifica precio y disponibilidad antes de comprar.',
 'HP Perú · ficha B9TY2LA', '/img/hp15.webp'),
('slim3', 'Lenovo', 'IdeaPad Slim 3', '15IAH8 · 83ER00NKLM', 'Intel Core i5-12450H', 2, 16, 512, 'Intel UHD Graphics', 0,
 '15.6″ Full HD', 1, 1.62, '1,62 kg', 'Windows 11 Home',
 'Buena para estudio y trabajo, ligera y con 16 GB de RAM',
 'No tiene gráfica dedicada: no es para juegos exigentes ni 3D pesado. La RAM va soldada en esta configuración.',
 'Lenovo PSREF · IdeaPad Slim 3 15IAH8', '/img/slim3.webp'),
('cm14', 'ASUS', 'Chromebook CM14', 'CM1402CM2A', 'MediaTek Kompanio 520', 1, 8, 128, 'ARM Mali-G52 MC2', 0,
 '14″ Full HD', 1, 1.45, '1,45 kg', 'ChromeOS',
 'Simple, ligera y segura para estudio, navegación y tareas en la nube',
 'Usa ChromeOS, no Windows. 8 GB de RAM y 128 GB eMMC: buena para estudio/navegación; no para programas Windows ni juegos/3D exigentes. Verifica precio y configuración exacta antes de comprar.',
 'ASUS · Chromebook CM14 CM1402C', '/img/cm14.webp'),
('slim3c', 'Lenovo', 'IdeaPad Slim 3 Chromebook', '14M868 · 82XJ', 'MediaTek Kompanio 520', 1, 8, 128, 'ARM Mali-G52 2EE MC2', 0,
 '14″ Full HD', 1, 1.30, '1,30 kg', 'ChromeOS',
 'Ligera, simple y cómoda para clases, documentos y navegación',
 'Usa ChromeOS, no Windows. 8 GB de RAM y 128 GB eMMC: buena para estudio/navegación; no para programas Windows ni juegos/3D exigentes. Verifica precio y configuración exacta antes de comprar.',
 'Lenovo PSREF · IdeaPad Slim 3 Chromebook 14M868', '/img/slim3c.webp'),
('g614fm', 'ASUS', 'ROG Strix G16', 'G614FM-RV009W', 'AMD Ryzen 9 9955HX', 3, 16, 1024, 'NVIDIA RTX 5060', 8,
 '16″ WUXGA IPS · 165 Hz', 2, 2.50, '2,50 kg', 'Windows 11 Home',
 'Potencia de sobra para tareas exigentes, creación y juegos de alta demanda',
 'Es muy potente y cara para uso básico: si solo haces documentos, clases o navegación, estarás pagando por capacidad que no usarás. Verifica precio y configuración exacta antes de comprar.',
 'Tiendas EFE / ASUS ROG · G614FM-RV009W', '/img/g614fm.webp')
ON CONFLICT (id) DO UPDATE SET
  marca = EXCLUDED.marca, nombre = EXCLUDED.nombre, modelo = EXCLUDED.modelo, cpu = EXCLUDED.cpu,
  cpu_tier = EXCLUDED.cpu_tier, ram_gb = EXCLUDED.ram_gb, ssd_gb = EXCLUDED.ssd_gb, gpu = EXCLUDED.gpu,
  gpu_mem_gb = EXCLUDED.gpu_mem_gb, pantalla = EXCLUDED.pantalla, pantalla_tier = EXCLUDED.pantalla_tier,
  peso_kg = EXCLUDED.peso_kg, peso_label = EXCLUDED.peso_label, sistema = EXCLUDED.sistema,
  beneficio = EXCLUDED.beneficio, nota = EXCLUDED.nota, fuente_specs = EXCLUDED.fuente_specs,
  imagen_url = EXCLUDED.imagen_url, actualizado = now();

INSERT INTO oferta (laptop_id, tienda_id, precio, referencia, fecha_consulta)
SELECT v.laptop_id, t.id, v.precio, v.referencia, DATE '2026-11-22'
FROM (VALUES
  ('loq',    'Tottus Perú',    4299, '149125539'),
  ('victus', 'Falabella Perú', 4199, '80025939'),
  ('nitro',  'Hiraoka',        4299, '133431'),
  ('tuf',    'Tiendas EFE',    3799, 'FX507ZC4HN005W2'),
  ('hp15',   'Ripley Perú',    2899, '2004358671798P'),
  ('slim3',  'Ripley Perú',    2999, '3238485'),
  ('cm14',   'Referencia Perú', 1499, 'CM1402CM2A-REF'),
  ('slim3c', 'Referencia Perú', 1599, '82XJ-REF'),
  ('g614fm', 'Tiendas EFE',    8399, 'G614FM-RV009W')
) AS v(laptop_id, tienda, precio, referencia)
JOIN tienda t ON t.nombre = v.tienda
ON CONFLICT (laptop_id, tienda_id, referencia) DO UPDATE SET
  precio = EXCLUDED.precio, fecha_consulta = EXCLUDED.fecha_consulta, vigente = TRUE;

-- Limpieza acotada: reemplaza fuentes curadas de laptops gestionadas por seed para evitar filas obsoletas por cambio de clave natural.
DELETE FROM fuente WHERE laptop_id IN ('loq','victus','nitro','tuf','hp15','slim3','cm14','slim3c','g614fm');

-- Fuentes trazables (Fase 2/3). verificada=true solo con URL estable + configuración compatible confirmada + fecha de consulta.
INSERT INTO fuente (laptop_id, tipo, nombre, url, fecha, atributo, nota, verificada, origen, independencia, senal_sesgo, valor_declarado) VALUES
('loq','fabricante','Lenovo PSREF · LOQ 15ARP10E','https://psref.lenovo.com/Product/LOQ/LOQ_15ARP10E',DATE '2026-11-22','specs','Ficha técnica oficial de la familia LOQ 15ARP10E. Confirma Ryzen 7 7735HS, 16GB DDR5, 512GB SSD, RTX 4050, 15.6 FHD 144Hz; verificar SKU exacto local antes de comprar.',TRUE,'curada','fabricante','solo_fabricante','Ryzen 7 7735HS, 16GB RAM, 512GB SSD, RTX 4050 6GB'),
('loq','tienda','Tottus Perú · ref. 149125539','https://tottus.falabella.com.pe/tottus-pe/product/149125538/laptop-lenovo-loq-essential-amd-ryzen-7-16gb-ram-512gb-ssd-rtx-4050-6gb-15-6-fhd-144hz/149125539',DATE '2026-11-22','precio','Precio publicado por tienda al 2026-11-22. Puede variar por stock, campaña o configuración.',TRUE,'curada','tienda','ninguna','S/ 4299'),
('loq','review_tecnica','Referencia técnica externa (curada)',NULL,DATE '2026-11-22','specs','Resumen curado de revisión técnica externa; sin URL estable verificada en esta fase. Usar como señal complementaria.',FALSE,'externa','medio_independiente','configuracion_distinta','RTX 4050 adecuada para juegos/3D moderados; confirmar configuración local'),

('victus','fabricante','HP Perú · ficha BT4F1LA','https://www.hp.com/pe-es/shop/laptop-gaming-victus-victus-gaming-15-fb3021la-amd-ryzen-7-16-gb-gpu-nvidiar-geforce-rtxtm-4050-512-gb-ssd-15-6-fhd-windows-11-home-bt4f1la.html',DATE '2026-11-22','specs','Ficha oficial HP Perú. Confirma Ryzen 7 7445HS, 16GB DDR5-5600, 512GB SSD, RTX 4050, 15.6 FHD 144Hz, Windows 11 Home, 2.29 kg.',TRUE,'curada','fabricante','solo_fabricante','Ryzen 7 7445HS, 16GB RAM, 512GB SSD, RTX 4050 6GB'),
('victus','tienda','Falabella Perú · ref. 80025939','https://www.falabella.com.pe/falabella-pe/product/80025939/victus-15-6-r7-7445hs-16gb-512/80025939',DATE '2026-11-22','precio','Precio publicado por tienda al 2026-11-22. Puede variar por stock o campaña.',TRUE,'curada','tienda','ninguna','S/ 4199'),
('victus','review_tecnica','Referencia técnica externa (curada)',NULL,DATE '2026-11-22','specs','Resumen curado de revisión técnica externa; sin URL estable verificada en esta fase. Usar como señal complementaria.',FALSE,'externa','medio_independiente','configuracion_distinta','Buen rendimiento en juegos; peso alto para movilidad diaria'),

('nitro','fabricante','Hiraoka · ficha ANV15-51-515J','https://hiraoka.com.pe/laptop-gamer-acer-nitro-v-de-15-6-modelo-anv15-51-515j-intel-core-i5-13420h-13va-gen-8-nucleos-nvidia-geforce-rtx-4050-16gb-ram-disco-solido-de-512gb',DATE '2026-11-22','specs','Ficha de tienda con especificaciones detalladas de la configuración ANV15-51-515J. Confirma i5-13420H, 16GB DDR5, 512GB SSD, RTX 4050 6GB, 15.6 FHD 144Hz, 2.3 kg, Windows 11.',TRUE,'curada','tienda','ninguna','Core i5-13420H, 16GB RAM, 512GB SSD, RTX 4050 6GB'),
('nitro','tienda','Hiraoka · ref. 133431','https://hiraoka.com.pe/laptop-gamer-acer-nitro-v-de-15-6-modelo-anv15-51-515j-intel-core-i5-13420h-13va-gen-8-nucleos-nvidia-geforce-rtx-4050-16gb-ram-disco-solido-de-512gb',DATE '2026-11-22','precio','Precio publicado por tienda al 2026-11-22. Puede variar por stock o campaña.',TRUE,'curada','tienda','ninguna','S/ 4299'),
('nitro','review_tecnica','Referencia técnica externa (curada)',NULL,DATE '2026-11-22','specs','Resumen curado de revisión técnica externa; sin URL estable verificada en esta fase. Usar como señal complementaria.',FALSE,'externa','medio_independiente','configuracion_distinta','Rendimiento CPU menor que opciones Ryzen 7; adecuada para juegos con ajustes'),

('tuf','fabricante','ASUS · TUF Gaming F15 FX507ZC4 (referencia)','https://www.asus.com/us/laptops/for-gaming/tuf-gaming/asus-tuf-gaming-f15-2022/techspec/',DATE '2026-11-22','specs','Referencia oficial de familia ASUS TUF Gaming F15 FX507ZC4. Confirma combinación i5-12500H/RTX 3050/15.6 FHD 144Hz en la familia; la configuración exacta 16GB/512GB se verifica en tienda.',TRUE,'curada','fabricante','solo_fabricante','i5-12500H, RTX 3050 4GB, 15.6 FHD 144Hz (familia FX507ZC4)'),
('tuf','tienda','Tiendas EFE · ref. FX507ZC4HN005W2','https://www.efe.com.pe/lapg-15f-i5-12-16gb-512ssd-rtx3050-fx507zc4hn005w2.html',DATE '2026-11-22','precio','Precio publicado por tienda al 2026-11-22. La página indica 16GB, 512GB SSD, RTX3050 e i5 12va gen; confirmar CPU exacto antes de comprar.',TRUE,'curada','tienda','ninguna','S/ 3799'),
('tuf','review_tecnica','Referencia técnica externa (curada)',NULL,DATE '2026-11-22','specs','Resumen curado de revisión técnica externa; sin URL estable verificada en esta fase. Usar como señal complementaria.',FALSE,'externa','medio_independiente','configuracion_distinta','RTX 3050 4GB limita juegos exigentes; buena relación precio para uso mixto'),

('hp15','fabricante','HP Perú · ficha B9TY2LA','https://www.hp.com/pe-es/shop/laptop-hp-15-fd0263la-intel-core-i5-16-gb-1-tb-ssd-15-6-fhd-windows-11-home-b9ty2la.html',DATE '2026-11-22','specs','Ficha oficial HP Perú. Confirma i5-1334U, 16GB DDR4-3200, 1TB SSD, Intel Iris Xe, 15.6 FHD, Windows 11 Home, 1.59 kg.',TRUE,'curada','fabricante','solo_fabricante','i5-1334U, 16GB RAM, 1TB SSD, Intel Iris Xe'),
('hp15','tienda','Ripley Perú · ref. 2004358671798P','https://simple.ripley.com.pe/laptop-hp-15-fd0263la-inte-core-i5-16gb-ram-1tb-ssd-156-2004358671798p',DATE '2026-11-22','precio','Precio publicado por tienda al 2026-11-22. Puede variar por stock o campaña.',TRUE,'curada','tienda','ninguna','S/ 2899'),
('hp15','review_tecnica','Referencia técnica externa (curada)',NULL,DATE '2026-11-22','specs','Resumen curado: laptop de oficina/estudio ligera; sin gráfica dedicada para juegos/3D exigentes.',FALSE,'externa','medio_independiente','configuracion_distinta','Adecuada para estudio/oficina; no para juegos exigentes ni 3D pesado'),

('slim3','fabricante','Lenovo PSREF · IdeaPad Slim 3 15IAH8','https://psref.lenovo.com/Detail/IdeaPad/IdeaPad_Slim_3_15IAH8?M=83ER00NKLM',DATE '2026-11-22','specs','Ficha oficial Lenovo PSREF para 83ER00NKLM. Confirma i5-12450H, 16GB LPDDR5-4800 soldada, 512GB SSD, Intel UHD, 15.6 FHD, 1.62 kg.',TRUE,'curada','fabricante','solo_fabricante','i5-12450H, 16GB RAM, 512GB SSD, Intel UHD Graphics'),
('slim3','tienda','Ripley Perú · ref. 3238485','https://simple.ripley.com.pe/laptop-lenovo-ideapad-slim-3-15iah8-core-i5-12450h-16gb-ram-512gb-ssd-156-ip-156-fullhd-lpddr5-win11-pmp20000230923',DATE '2026-11-22','precio','Precio publicado por tienda al 2026-11-22. La publicación indica 16GB/512GB/Win11; confirmar SKU exacto y condición del vendedor antes de comprar.',TRUE,'curada','tienda','ninguna','S/ 2998.90'),
('slim3','review_tecnica','Referencia técnica externa (curada)',NULL,DATE '2026-11-22','specs','Resumen curado: laptop de estudio/trabajo con buen CPU para productividad; sin gráfica dedicada.',FALSE,'externa','medio_independiente','configuracion_distinta','Buena para productividad; no para juegos exigentes ni 3D pesado'),

('cm14','fabricante','ASUS · Chromebook CM14 CM1402C (tech specs)','https://www.asus.com/laptops/for-home/chromebook/asus-chromebook-cm14-cm1402c/techspec/',DATE '2026-11-22','specs','Ficha oficial ASUS de la familia CM1402C. Confirma Kompanio 520, 8GB LPDDR4X, 128GB eMMC, 14" FHD 1920x1080 TN 250 nits, ChromeOS, 1.45 kg; verificar SKU/config exacta local antes de comprar.',TRUE,'curada','fabricante','solo_fabricante','Kompanio 520, 8GB RAM, 128GB eMMC, 14 FHD, ChromeOS'),
('cm14','tienda','Referencia de precio Perú (curada)',NULL,DATE '2026-11-22','precio','Precio referencial estimado para Perú al 2026-11-22; no se encontró URL estable con precio verificable para esta configuración. Confirmar precio, stock y configuración antes de comprar.',FALSE,'curada','otro','configuracion_distinta','S/ 1499 (referencial)'),
('cm14','review_tecnica','Referencia técnica externa (curada)',NULL,DATE '2026-11-22','specs','Resumen curado: Chromebook simple y ligera para estudio/navegación; no ejecuta programas Windows nativos ni sirve para juegos/3D exigentes.',FALSE,'externa','medio_independiente','configuracion_distinta','Buena para estudio y tareas web; no para software Windows ni 3D'),

('slim3c','fabricante','Lenovo PSREF · IdeaPad Slim 3 Chromebook 14M868','https://psref.lenovo.com/Detail/IdeaPad/IP_Slim_3_Chrome_14M868?M=82XJ003QPB',DATE '2026-11-22','specs','Ficha oficial Lenovo PSREF para 82XJ003QPB. Confirma Kompanio 520, 8GB LPDDR4X-3600, 128GB eMMC, 14" FHD TN 250 nits, ChromeOS, 1.3 kg; verificar disponibilidad/config local antes de comprar.',TRUE,'curada','fabricante','solo_fabricante','Kompanio 520, 8GB RAM, 128GB eMMC, 14 FHD, ChromeOS'),
('slim3c','tienda','Referencia de precio Perú (curada)',NULL,DATE '2026-11-22','precio','Precio referencial estimado para Perú al 2026-11-22; no se encontró URL estable con precio verificable para esta configuración. Confirmar precio, stock y configuración antes de comprar.',FALSE,'curada','otro','configuracion_distinta','S/ 1599 (referencial)'),
('slim3c','review_tecnica','Referencia técnica externa (curada)',NULL,DATE '2026-11-22','specs','Resumen curado: Chromebook ligera para clases, documentos y navegación; no ejecuta programas Windows nativos ni sirve para juegos/3D exigentes.',FALSE,'externa','medio_independiente','configuracion_distinta','Buena para estudio y tareas web; no para software Windows ni 3D'),

('g614fm','fabricante','ASUS ROG Perú · Strix G16 G614 (2025)','https://rog.asus.com/pe/laptops/rog-strix/rog-strix-g16-2025-g614/',DATE '2026-11-22','specs','Página oficial ASUS ROG Perú para la familia Strix G16 G614 (2025). Confirma configuración G614FM-RV009W con Ryzen 9 9955HX, RTX 5060, pantalla 16" y Windows 11; verificar especificaciones exactas de RAM/SSD en la ficha de tienda antes de comprar.',TRUE,'curada','fabricante','solo_fabricante','Ryzen 9 9955HX, RTX 5060 8GB, 16 WUXGA, Windows 11 Home'),
('g614fm','tienda','Tiendas EFE · ref. G614FM-RV009W','https://www.efe.com.pe/lapg-16w-r9-99-16gb-1tbssd-rtx5060-g614fm-rv009w.html',DATE '2026-11-22','precio','Precio publicado por tienda al 2026-11-22. Confirma Ryzen 9 9955HX, 16GB DDR5, 1TB SSD, RTX 5060 8GB, 16" WUXGA IPS, Windows 11 Home. Puede variar por stock o campaña.',TRUE,'curada','tienda','ninguna','S/ 8399'),
('g614fm','review_tecnica','Referencia técnica externa (curada)',NULL,DATE '2026-11-22','specs','Resumen curado: laptop gamer/potente con gran margen para tareas exigentes; para uso básico suele ser más capacidad y costo de lo necesario.',FALSE,'externa','medio_independiente','configuracion_distinta','Muy potente para estudio/oficina básico; mejor para juegos, creación o cargas exigentes')
ON CONFLICT (laptop_id, tipo, nombre, atributo) DO UPDATE SET
  url = EXCLUDED.url, fecha = EXCLUDED.fecha, nota = EXCLUDED.nota, verificada = EXCLUDED.verificada,
  origen = EXCLUDED.origen, independencia = EXCLUDED.independencia, senal_sesgo = EXCLUDED.senal_sesgo, valor_declarado = EXCLUDED.valor_declarado;
