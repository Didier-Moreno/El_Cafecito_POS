import { useState, useEffect, useCallback, useMemo } from 'react'
import { getCreditos, createCredito, registrarPago, eliminarCredito } from '../services/api'

/**
 * Hook para gestionar el módulo de créditos.
 * Incluye lista de créditos con datos de cliente y pagos anidados,
 * estadísticas derivadas y acciones de mutación.
 */
export function useCreditos() {
  const [creditos, setCreditos] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  const fetchCreditos = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const { data } = await getCreditos()
      setCreditos(data)
    } catch (err) {
      setError('No se pudo cargar los créditos. Verifica que el servidor esté activo.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCreditos()
  }, [fetchCreditos])

  // ── Estadísticas derivadas ─────────────────────────────────────────────────
  const stats = useMemo(() => {
    const pendientes = creditos.filter((c) => c.estado === 'Pendiente')
    // Agrupar por cliente para contar clientes únicos con deuda
    const clientesConDeuda = new Set(pendientes.map((c) => c.cliente_id)).size
    const totalAdeudado = pendientes.reduce((sum, c) => sum + Number(c.saldo_pendiente), 0)
    const totalCreditos  = creditos.length
    const creditosPagados = creditos.filter((c) => c.estado === 'Pagado').length

    return { clientesConDeuda, totalAdeudado, totalCreditos, creditosPagados }
  }, [creditos])

  // ── Acciones ───────────────────────────────────────────────────────────────

  /**
   * Crea un crédito para una venta.
   * @param {{ cliente_id, venta_id, total, nota? }} data
   */
  const crear = async (data) => {
    const { data: nuevo } = await createCredito(data)
    setCreditos((prev) => [{ ...nuevo, clientes: null, pagos_credito: [] }, ...prev])
    // Refrescar para obtener el join con clientes
    await fetchCreditos()
    return nuevo
  }

  /**
   * Registra un pago sobre un crédito.
   * Actualiza el estado local optimistamente y luego refresca.
   */
  const pagar = async (creditoId, monto, nota = '') => {
    const { data: resultado } = await registrarPago(creditoId, { monto, nota })
    setCreditos((prev) =>
      prev.map((c) =>
        c.id === creditoId
          ? { ...c, saldo_pendiente: resultado.saldo_pendiente, estado: resultado.estado }
          : c
      )
    )
    // Refrescar para obtener los pagos_credito actualizados
    await fetchCreditos()
    return resultado
  }

  /**
   * Elimina un crédito.
   */
  const eliminar = async (creditoId) => {
    await eliminarCredito(creditoId)
    setCreditos((prev) => prev.filter((c) => c.id !== creditoId))
  }

  return { creditos, loading, error, stats, fetchCreditos, crear, pagar, eliminar }
}
