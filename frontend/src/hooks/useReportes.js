import { useState, useEffect, useCallback } from 'react'
import { getReportesDashboard } from '../services/reportService'

export function useReportes(initialFechaInicio = null, initialFechaFin = null) {
  const [reportes, setReportes] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [fechaInicio, setFechaInicio] = useState(initialFechaInicio)
  const [fechaFin, setFechaFin] = useState(initialFechaFin)
  const [categoria, setCategoria] = useState(null)
  const [productoId, setProductoId] = useState(null)

  const fetchReportes = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getReportesDashboard(fechaInicio, fechaFin, categoria, productoId)
      setReportes(data)
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.detail || 'Error al cargar los reportes')
    } finally {
      setLoading(false)
    }
  }, [fechaInicio, fechaFin, categoria, productoId])

  useEffect(() => {
    fetchReportes()
  }, [fetchReportes])

  // Auto-refetch cuando el usuario vuelve a la pestaña (ej. después de registrar una venta en POS)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchReportes()
      }
    }
    const handleFocus = () => fetchReportes()

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('focus', handleFocus)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('focus', handleFocus)
    }
  }, [fetchReportes])

  return { 
    reportes, 
    loading, 
    error, 
    fechaInicio, 
    fechaFin, 
    categoria,
    productoId,
    setRangoFechas: (inicio, fin) => {
      setFechaInicio(inicio)
      setFechaFin(fin)
    },
    setFiltroCategoria: (cat) => setCategoria(cat),
    setFiltroProducto: (id) => setProductoId(id),
    refetch: fetchReportes 
  }
}

