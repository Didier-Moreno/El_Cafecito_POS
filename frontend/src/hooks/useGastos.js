import { useState, useEffect, useCallback } from 'react'
import { getGastos, createGasto, updateGasto, deleteGasto } from '../services/api'

// ── Helpers de estado ────────────────────────────────────────────────────────

/**
 * Determina el estado efectivo de un gasto.
 * Si está Pendiente y la fecha_pago ya pasó → "Vencido".
 */
export function getEstadoEfectivo(gasto) {
  if (gasto.estado !== 'Pendiente') return gasto.estado
  if (!gasto.fecha_pago) return 'Pendiente'
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const fechaPago = new Date(gasto.fecha_pago + 'T00:00:00')
  return fechaPago < hoy ? 'Vencido' : 'Pendiente'
}

/**
 * Días restantes hasta la fecha de pago (puede ser negativo si ya venció).
 */
export function getDiasParaVencer(gasto) {
  if (!gasto.fecha_pago || gasto.estado !== 'Pendiente') return null
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const fechaPago = new Date(gasto.fecha_pago + 'T00:00:00')
  return Math.ceil((fechaPago - hoy) / (1000 * 60 * 60 * 24))
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useGastos() {
  const [gastos, setGastos]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const fetchGastos = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const { data } = await getGastos()
      setGastos(data)
    } catch (err) {
      setError('No se pudo cargar los gastos. Verifica que el servidor esté activo.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchGastos()
  }, [fetchGastos])

  const crear = async (data) => {
    const { data: nuevo } = await createGasto(data)
    setGastos((prev) => [nuevo, ...prev])
    return nuevo
  }

  const actualizar = async (id, data) => {
    const { data: actualizado } = await updateGasto(id, data)
    setGastos((prev) => prev.map((g) => (g.id === id ? actualizado : g)))
    return actualizado
  }

  const eliminar = async (id) => {
    await deleteGasto(id)
    setGastos((prev) => prev.filter((g) => g.id !== id))
  }

  const marcarPagado = async (id) => {
    return actualizar(id, { estado: 'Pagado' })
  }

  const duplicar = async (gasto) => {
    const { id, ...rest } = gasto
    return crear({ ...rest, estado: 'Pendiente' })
  }

  // ── Estadísticas derivadas ─────────────────────────────────────────────────
  const stats = {
    total: gastos.length,
    pendientes: gastos.filter((g) => getEstadoEfectivo(g) === 'Pendiente').length,
    pagados: gastos.filter((g) => g.estado === 'Pagado').length,
    valorPendiente: gastos
      .filter((g) => getEstadoEfectivo(g) === 'Pendiente' || getEstadoEfectivo(g) === 'Vencido')
      .reduce((sum, g) => sum + Number(g.valor), 0),
  }

  return { gastos, loading, error, stats, fetchGastos, crear, actualizar, eliminar, marcarPagado, duplicar }
}
