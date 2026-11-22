// Mismos datos que db/seed.sql, en la forma que devuelve /api/catalogo.
export const C = [
  { id: 'loq', ct: 3, ram: 16, gm: 6, w: 1.8, sc: 2, price: 4249, os: 'Windows 11 Home' },
  { id: 'victus', ct: 3, ram: 16, gm: 6, w: 2.29, sc: 2, price: 4299, os: 'Windows 11 Home' },
  { id: 'nitro', ct: 2, ram: 16, gm: 6, w: 2.3, sc: 2, price: 4299, os: 'Windows 11 Home' },
  { id: 'tuf', ct: 2, ram: 16, gm: 4, w: 2.2, sc: 2, price: 3799, os: 'Windows 11 Home' }
];
export const TAREAS = [
  { id: 'docs', l: 'Documentos', ram: 8, cpu: 1, ded: false, gmFrecuente: null,
    patron: '\\b(word|document\\w*|trabajos|pdf|navega\\w*|apuntes|diapositivas|powerpoint|excel|ofimatica)\\b' },
  { id: 'calls', l: 'Zoom', ram: 8, cpu: 1, ded: false, gmFrecuente: null,
    patron: '\\b(zoom|meet|teams|videollamada\\w*|clases virtuales)\\b' },
  { id: 'many', l: 'Pestañas', ram: 16, cpu: 1, ded: false, gmFrecuente: null,
    patron: '\\b(muchas pestanas|varias pestanas|\\d{2,} pestanas|multitarea|apps a la vez|varias apps|varios programas)\\b' },
  { id: 'edit', l: 'Edición', ram: 16, cpu: 2, ded: false, gmFrecuente: null,
    patron: '\\b(editar|edicion|fotos|video corto|videos cortos|premiere|photoshop|lightroom|capcut|davinci|illustrator)\\b' },
  { id: 'graphics', l: 'Juegos', ram: 16, cpu: 2, ded: true, gmFrecuente: 6,
    patron: '\\b(3d|render\\w*|blender|revit|solidworks|gaming|juegos?|jugar|videojuegos?)\\b' }
];
export const T = Object.fromEntries(TAREAS.map(t => [t.id, t]));
export const PRIORIDADES = ['price', 'mobile', 'screen', 'speed'].map(id => ({ id, etiqueta: id }));
