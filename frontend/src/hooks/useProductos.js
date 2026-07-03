import { useState, useEffect, useCallback } from 'react'
import { getProductos, createProducto, updateProducto, deleteProducto } from '../services/api'

export function useProductos() {
  const [productos, setProductos]   = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)

  const fetchProductos = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const { data } = await getProductos()
      setProductos(data)
    } catch (err) {
      setError('No se pudo cargar el inventario. Verifica que el servidor esté activo.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProductos()
  }, [fetchProductos])

  const crear = async (data) => {
    const { data: nuevo } = await createProducto(data)
    setProductos((prev) => [...prev, nuevo])
    return nuevo
  }

  const actualizar = async (id, data) => {
    const { data: actualizado } = await updateProducto(id, data)
    setProductos((prev) => prev.map((p) => (p.id === id ? actualizado : p)))
    return actualizado
  }

  const eliminar = async (id) => {
    await deleteProducto(id)
    setProductos((prev) => prev.filter((p) => p.id !== id))
  }

  const marcarFavorito = async (id, isFavorite) => {
    // Validar límite de 10 favoritos
    if (isFavorite) {
      const favoritos = productos.filter((p) => p.is_favorite).length
      if (favoritos >= 10) {
        throw new Error('Solo se permiten 10 productos favoritos.')
      }
    }
    // Actualizar en la base de datos
    const { data: actualizado } = await updateProducto(id, { is_favorite: isFavorite })
    setProductos((prev) => prev.map((p) => (p.id === id ? actualizado : p)))
    return actualizado
  }

  // Estadísticas derivadas
  const stats = {
    total:      productos.length,
    stockBajo:  productos.filter((p) => p.stock > 0 && p.stock <= 5).length,
    agotados:   productos.filter((p) => p.stock === 0).length,
    categorias: [...new Set(productos.map((p) => p.categoria).filter(Boolean))].length,
  }

  return { productos, loading, error, stats, fetchProductos, crear, actualizar, eliminar, marcarFavorito }
}
