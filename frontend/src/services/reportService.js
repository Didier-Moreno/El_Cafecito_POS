import api from './api'

// ── Reportes Operacionales (vista del día) ────────────────────────────────────
export const getReporteOperacional = async (fecha) => {
  const params = fecha ? { fecha } : {}
  const response = await api.get('/reportes/operacional', { params })
  return response.data
}

// ── Análisis Estratégico (vista de rango de fechas) ───────────────────────────
export const getReportesDashboard = async (fechaInicio, fechaFin, categoria = null, productoId = null) => {
  const params = {}
  if (fechaInicio) params.fecha_inicio = fechaInicio
  if (fechaFin) params.fecha_fin = fechaFin
  if (categoria) params.categoria = categoria
  if (productoId) params.producto_id = productoId
  const response = await api.get('/reportes', { params })
  return response.data
}

// Alias semántico para el módulo Análisis
export const getAnalisis = getReportesDashboard
