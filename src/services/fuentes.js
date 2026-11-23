const SESGO_LABEL = {
  ninguna: '',
  patrocinado: 'Posible contenido patrocinado',
  solo_fabricante: 'Proviene solo del fabricante',
  desactualizada: 'Puede estar desactualizada',
  configuracion_distinta: 'Puede referirse a otra configuración',
  otra: 'Posible sesgo'
};

function frescura(fecha) {
  if (!fecha) return 'desconocida';
  const t = Date.parse(fecha);
  if (Number.isNaN(t)) return 'desconocida';
  const dias = (Date.now() - t) / 86400000;
  if (dias <= 45) return 'reciente';
  if (dias <= 120) return 'media';
  return 'antigua';
}

export function resumirFuentes(fuentes = [], laptop = {}) {
  const porAtributo = {};
  for (const f of fuentes) {
    const atr = f.atributo || 'general';
    (porAtributo[atr] ||= []).push(f);
  }

  const resumen = {};
  for (const [atributo, fs] of Object.entries(porAtributo)) {
    const verificadas = fs.filter(f => f.verificada).length;
    const independientes = fs.filter(f => ['medio_independiente', 'tienda'].includes(f.independencia)).length;
    const externas = fs.filter(f => f.origen === 'externa').length;
    const alertas = [];
    const valores = fs.map(f => (f.valor_declarado || '').trim().toLowerCase()).filter(Boolean);
    const valoresUnicos = [...new Set(valores)];

    for (const f of fs) {
      const label = SESGO_LABEL[f.senal_sesgo] || '';
      if (label) alertas.push(label);
      const fr = frescura(f.fecha);
      if (fr === 'antigua') alertas.push('Fuente antigua');
      if (fr === 'desconocida') alertas.push('Fuente sin fecha clara');
    }

    let estado = 'limitado';
    if (valoresUnicos.length > 1) estado = 'discrepancia';
    else if (verificadas > 0 && fs.length >= 2) estado = 'verificado';
    else if (independientes > 0 && fs.length >= 2) estado = 'coinciden';
    else if (fs.length >= 2) estado = 'parcial';

    // Señal específica para precio: comparar con precio actual si existe
    if (atributo === 'precio' && laptop.price != null) {
      const precioCanon = String(Number(laptop.price));
      const hayDistinto = valores.some(v => v.replace(/[^0-9]/g, '') && v.replace(/[^0-9]/g, '') !== precioCanon.replace(/[^0-9]/g, ''));
      if (hayDistinto) estado = 'discrepancia';
    }

    resumen[atributo] = {
      atributo,
      estado,
      total: fs.length,
      verificadas,
      independientes,
      externas,
      alertas: [...new Set(alertas)].slice(0, 4)
    };
  }

  const todasAlertas = [...new Set(Object.values(resumen).flatMap(r => r.alertas))].slice(0, 6);
  const verificadas = fuentes.filter(f => f.verificada).length;
  const externas = fuentes.filter(f => f.origen === 'externa').length;
  const independientes = fuentes.filter(f => ['medio_independiente', 'tienda'].includes(f.independencia)).length;
  let nivel = 'bajo';
  if (verificadas >= 2 && independientes >= 2 && !todasAlertas.some(a => /discrep|antigua|patrocinado/i.test(a))) nivel = 'alto';
  else if (verificadas >= 1 || independientes >= 1) nivel = 'medio';

  return {
    nivel_confianza: nivel,
    total: fuentes.length,
    verificadas,
    externas,
    independientes,
    alertas: todasAlertas,
    por_atributo: resumen
  };
}