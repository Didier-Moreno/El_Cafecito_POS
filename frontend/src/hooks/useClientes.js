import { useState, useEffect, useCallback } from 'react'
import { getClientes, createCliente } from '../services/api'

/**
 * Hook para gestionar clientes.
 * Expone la lista de clientes, estado de carga y función para crear.
 */
export function useClientes() {
  const [clientes, setClientes] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  const fetchClientes = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const { data } = await getClientes()
      setClientes(data)
    } catch (err) {
      setError('No se pudo cargar los clientes.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchClientes()
  }, [fetchClientes])

  const crear = async (data) => {
    const { data: nuevo } = await createCliente(data)
    setClientes((prev) => [...prev, nuevo].sort((a, b) => a.nombre.localeCompare(b.nombre)))
    return nuevo
  }

  return { clientes, loading, error, fetchClientes, crear }
}
