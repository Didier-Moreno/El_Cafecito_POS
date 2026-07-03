import { useState, useEffect, useCallback } from 'react'
import { getReporteOperacional } from '../services/reportService'

/**
 * Hook para el módulo de Reportes Operacionales.
 * Administra la fecha seleccionada y los datos del día.
 */
export function useReporteOperacional() {
  // Fecha en formato YYYY-MM-DD (zona horaria local)
  const today = () => {
    const d = new Date()
    return d.toLocaleDateString('en-CA') // 'en-CA' usa formato YYYY-MM-DD
  }

  const [fecha, setFecha] = useState(today)
  const [data, setData]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await getReporteOperacional(fecha)
      setData(result)
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.detail || 'Error al cargar el reporte del día')
    } finally {
      setLoading(false)
    }
  }, [fecha])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, fecha, setFecha, refetch: fetchData }
}
