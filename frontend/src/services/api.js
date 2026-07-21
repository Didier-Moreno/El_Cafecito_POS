import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// ─── Productos ───────────────────────────────────────────────────────────────

export const getProductos = () => api.get('/productos')
export const getProducto  = (id) => api.get(`/productos/${id}`)
export const createProducto = (data) => api.post('/productos', data)
export const updateProducto = (id, data) => api.put(`/productos/${id}`, data)
export const deleteProducto = (id) => api.delete(`/productos/${id}`)
export const updateProductoFavorite = (id, isFavorite) => api.put(`/productos/${id}`, { is_favorite: isFavorite })

// ─── Gastos ──────────────────────────────────────────────────────────────────

export const getGastos    = () => api.get('/gastos')
export const getGasto     = (id) => api.get(`/gastos/${id}`)
export const createGasto  = (data) => api.post('/gastos', data)
export const updateGasto  = (id, data) => api.put(`/gastos/${id}`, data)
export const deleteGasto  = (id) => api.delete(`/gastos/${id}`)

// ─── Ventas ──────────────────────────────────────────────────────────────────

export const getVentas   = () => api.get('/ventas')
export const createVenta = (data) => api.post('/ventas', data)
export const deleteVenta = (id) => api.delete(`/ventas/${id}`)

// ─── Clientes ─────────────────────────────────────────────────────────────────

export const getClientes    = () => api.get('/clientes')
export const createCliente  = (data) => api.post('/clientes', data)

// ─── Créditos ─────────────────────────────────────────────────────────────────

export const getCreditos       = () => api.get('/creditos')
export const createCredito     = (data) => api.post('/creditos', data)
export const registrarPago     = (creditoId, data) => api.post(`/creditos/${creditoId}/pagos`, data)
export const eliminarCredito   = (creditoId) => api.delete(`/creditos/${creditoId}`)

export default api
