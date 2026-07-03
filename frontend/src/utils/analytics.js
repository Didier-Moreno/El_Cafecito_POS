/**
 * utilidades analíticas para el POS El Cafecito
 */

/**
 * Calcula el costo de ventas (COGS) estimado y el margen de ganancia.
 * @param {Array} productosMasVendidos - Lista de productos vendidos con su costo y precio actuales.
 * @param {number} totalVentas - Recaudación total del período.
 * @returns {Object} COGS, utilidad y margen porcentual.
 */
export function calcularMetricasGanancia(productosMasVendidos, totalVentas, cogsDb = null) {
  let cogsEstimado = cogsDb !== null ? Number(cogsDb) : 0;

  // Fallback si la base de datos no retorna el cogs_periodo (compatibilidad anterior)
  if (cogsDb === null && productosMasVendidos && Array.isArray(productosMasVendidos)) {
    productosMasVendidos.forEach((p) => {
      const costo = Number(p.costo_actual) || 0;
      const cantidad = Number(p.cantidad) || 0;
      cogsEstimado += costo * cantidad;
    });
  }

  const utilidadBruta = Math.max(0, totalVentas - cogsEstimado);
  const margenBrutoPorcentaje = totalVentas > 0 ? (utilidadBruta / totalVentas) * 100 : 0;

  return {
    cogsEstimado,
    utilidadBruta,
    margenBrutoPorcentaje,
  };
}

/**
 * Calcula la variación porcentual entre el valor actual y el valor previo.
 * Retorna un objeto con la diferencia formateada, el porcentaje y la tendencia.
 */
export function calcularCambioPorcentual(actual, previo) {
  const valActual = Number(actual) || 0;
  const valPrevio = Number(previo) || 0;

  if (valPrevio === 0) {
    return {
      porcentaje: valActual > 0 ? 100 : 0,
      formateado: valActual > 0 ? '+100%' : '0%',
      tendencia: valActual > 0 ? 'sube' : 'neutro',
      positivo: true
    };
  }

  const diff = ((valActual - valPrevio) / valPrevio) * 100;
  const signo = diff > 0 ? '+' : '';

  return {
    porcentaje: diff,
    formateado: `${signo}${diff.toFixed(1)}%`,
    tendencia: diff > 0 ? 'sube' : diff < 0 ? 'baja' : 'neutro',
    positivo: diff >= 0
  };
}


/**
 * Insights modulares para el Dashboard BI
 */

export function generarInsightGeneral(reportes) {
  return null;
}

export function generarInsightTemporal(reportes, tendenciaVentas) {
  if (!reportes) return null;
  
  if (tendenciaVentas === 'Creciente') {
    return { tipo: 'success', titulo: 'Crecimiento Sostenido', mensaje: 'El volumen diario de ingresos muestra una tendencia al alza estadísticamente positiva en este período.' };
  } else if (tendenciaVentas === 'Decreciente') {
    return { tipo: 'warning', titulo: 'Alerta de Ingresos', mensaje: 'Se observa una desaceleración progresiva en las ventas diarias. Revisa tus estrategias de promoción.' };
  } else {
    return { tipo: 'info', titulo: 'Ingresos Estables', mensaje: 'Las ventas diarias se mantienen regulares y predecibles sin fluctuaciones bruscas.' };
  }
}

export function generarInsightCategoria(reportes) {
  if (!reportes || !reportes.ventas_por_categoria || reportes.ventas_por_categoria.length === 0) return null;
  
  const ventasSuma = Number(reportes.ventas_periodo?.suma) || 0;
  const topCat = [...reportes.ventas_por_categoria].sort((a, b) => b.total - a.total)[0];
  const porcentajeCat = ventasSuma > 0 ? (topCat.total / ventasSuma) * 100 : 0;
  
  return {
    tipo: 'success',
    titulo: `Dominio de "${topCat.categoria}"`,
    mensaje: `Esta categoría aporta el ${porcentajeCat.toFixed(0)}% de la facturación total ($${new Intl.NumberFormat('es-CO').format(topCat.total)}).`
  };
}

export function generarInsightProducto(reportes) {
  if (!reportes || !reportes.productos_mas_vendidos || reportes.productos_mas_vendidos.length === 0) return null;
  
  const productosBajoMargen = reportes.productos_mas_vendidos
    .map(p => {
      const precio = Number(p.precio_actual) || 0;
      const costo = Number(p.costo_actual) || 0;
      const margenPorcentaje = precio > 0 ? ((precio - costo) / precio) * 100 : 0;
      return { nombre: p.nombre, margenPorcentaje };
    })
    .filter(p => p.margenPorcentaje > 0 && p.margenPorcentaje < 20);

  if (productosBajoMargen.length > 0) {
    const nombres = productosBajoMargen.map(p => p.nombre).slice(0, 2).join(', ');
    return {
      tipo: 'warning',
      titulo: 'Revisión de Márgenes',
      mensaje: `Productos como "${nombres}" tienen un margen de ganancia estimado inferior al 20%. Evalúa ajustar precios.`
    };
  }
  
  return null;
}

/**
 * Calcula la tendencia de las ventas en el tiempo basándose en una regresión lineal simple.
 * Retorna 'Creciente', 'Decreciente' o 'Estable'.
 */
export function calcularTendenciaVentas(ventasGrafico) {
  if (!ventasGrafico || !Array.isArray(ventasGrafico) || ventasGrafico.length < 3) {
    return 'Estable';
  }

  // Mapeamos los datos para obtener los totales de venta diarios
  const data = ventasGrafico.map((v, index) => ({
    x: index,
    y: Number(v.total) || 0
  }));

  const n = data.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  data.forEach((d) => {
    sumX += d.x;
    sumY += d.y;
    sumXY += d.x * d.y;
    sumXX += d.x * d.x;
  });

  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) return 'Estable';

  // Pendiente de la recta de regresión
  const slope = (n * sumXY - sumX * sumY) / denominator;
  const avgY = sumY / n;

  // Si la pendiente absoluta es menor al 1% de la media de ventas por día, es estable.
  const threshold = avgY * 0.01;

  if (slope > threshold) {
    return 'Creciente';
  } else if (slope < -threshold) {
    return 'Decreciente';
  } else {
    return 'Estable';
  }
}

