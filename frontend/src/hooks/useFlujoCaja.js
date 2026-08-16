import { useState, useEffect, useCallback } from 'react'
import { getFlujoCaja, guardarAperturaCaja } from '../services/api'

/**
 * Hook para el módulo de Flujo de Caja.
 * Gestiona la fecha seleccionada, los datos del flujo y las operaciones
 * de apertura (dinero_inicial) y cierre (dinero_contado).
 */
export function useFlujoCaja() {
  const today = () => new Date().toLocaleDateString('en-CA')

  const [fecha, setFecha]       = useState(today)
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [guardando, setGuardando] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await getFlujoCaja(fecha)
      setData(res.data)
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.detail || 'Error al cargar el flujo de caja')
    } finally {
      setLoading(false)
    }
  }, [fecha])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  /**
   * Guarda/actualiza la apertura de caja (dinero inicial y/o contado).
   * @param {object} payload - { fecha, dinero_inicial, dinero_contado?, nota? }
   */
  const guardarCaja = useCallback(async (payload) => {
    setGuardando(true)
    try {
      await guardarAperturaCaja(payload)
      await fetchData()
    } finally {
      setGuardando(false)
    }
  }, [fetchData])

  return {
    data,
    loading,
    error,
    fecha,
    setFecha,
    refetch: fetchData,
    guardarCaja,
    guardando,
  }
}
