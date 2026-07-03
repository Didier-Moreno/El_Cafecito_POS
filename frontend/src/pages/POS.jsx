import { useState, useMemo } from 'react'
import { useProductos } from '../hooks/useProductos'
import PageContainer from '../components/ui/PageContainer'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import EmptyState from '../components/ui/EmptyState'
import { ShoppingCart, Plus, Minus, Trash2, CreditCard, Coffee } from 'lucide-react'
import { formatPrecio } from '../utils/format'
import { createVenta } from '../services/api'

const ProductImage = ({ nombre }) => {
  const [error, setError] = useState(false);

  if (error || !nombre) {
    return (
      <div className="w-full aspect-square bg-cafe-crema rounded-lg flex items-center justify-center mb-2 group-hover:bg-cafe-beige/30 transition-colors overflow-hidden">
        <Coffee size={36} className="text-cafe-beige group-hover:text-cafe-claro transition-colors" strokeWidth={1.5} />
      </div>
    );
  }

  let normalized = nombre.trim().toLowerCase();
  
  // Remover acentos de vocales pero mantener la 'ñ'
  normalized = normalized
    .replace(/[áàäâ]/g, 'a')
    .replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i')
    .replace(/[óòöô]/g, 'o')
    .replace(/[úùüû]/g, 'u')
    .replace(/\./g, '')
    .replace(/\s+/g, '_');
  
  let finalName = normalized.charAt(0).toUpperCase() + normalized.slice(1);

  const imageUrl = `/Fotos_productos_webp/${finalName}.webp`;

  return (
    <div className="w-full aspect-square bg-white rounded-lg flex items-center justify-center mb-2 group-hover:bg-cafe-beige/30 transition-colors overflow-hidden p-2 border border-cafe-beige/40">
      <img
        src={imageUrl}
        alt={nombre}
        className="w-full h-full object-contain mix-blend-multiply drop-shadow-sm hover:scale-110 transition-transform duration-300"
        onError={() => setError(true)}
      />
    </div>
  );
};

export default function POS() {
  const { productos, loading, actualizar, fetchProductos, marcarFavorito } = useProductos()
  const [categoriaActiva, setCategoriaActiva] = useState('Todos')
  const [carrito, setCarrito] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [cobrando, setCobrando] = useState(false)
  const [notificacion, setNotificacion] = useState(null)

  const mostrarNotificacion = (mensaje, tipo = 'success') => {
    setNotificacion({ mensaje, tipo })
    // Remover notificaciones anteriores si existen
    const timer = setTimeout(() => setNotificacion(null), 3000)
    return () => clearTimeout(timer)
  }

  // Categorías calculadas dinámicamente de los productos en stock
  const categoriasDinamicas = useMemo(() => {
    const cats = [...new Set(productos.map((p) => p.categoria).filter(Boolean))]
    return ['Todos', ...cats]
  }, [productos])

  const productosFavoritos = useMemo(() => {
    return productos.filter((p) => p.is_favorite && p.stock > 0)
  }, [productos])

  const handleToggleFavorito = async (e, producto) => {
    e.stopPropagation() // Evitar agregar al carrito
    try {
      const nuevoEstado = !producto.is_favorite
      await marcarFavorito(producto.id, nuevoEstado)
      if (nuevoEstado) {
        mostrarNotificacion('¡Agregado a favoritos!')
      } else {
        mostrarNotificacion('Removido de favoritos')
      }
    } catch (err) {
      const mensaje = err.message === 'Solo se permiten 10 productos favoritos.' 
        ? 'Solo se permiten 10 productos favoritos.'
        : 'Error al actualizar favorito'
      mostrarNotificacion(mensaje, 'error')
    }
  }

  const productosFiltrados = useMemo(() => {
    return productos.filter((p) => {
      const matchCat = categoriaActiva === 'Todos' || p.categoria === categoriaActiva
      const matchBusq = p.nombre?.toLowerCase().includes(busqueda.toLowerCase())
      return matchCat && matchBusq && p.stock > 0
    })
  }, [productos, categoriaActiva, busqueda])

  const agregarAlCarrito = (producto) => {
    setCarrito((prev) => {
      const existe = prev.find((i) => i.id === producto.id)
      if (existe) {
        if (existe.cantidad >= producto.stock) {
          mostrarNotificacion(`Stock máximo disponible: ${producto.stock}`, 'error')
          return prev
        }
        return prev.map((i) =>
          i.id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i
        )
      }
      return [...prev, { ...producto, cantidad: 1 }]
    })
  }

  const cambiarCantidad = (id, delta) => {
    setCarrito((prev) =>
      prev
        .map((i) => {
          if (i.id === id) {
            const nuevaCantidad = i.cantidad + delta
            if (delta > 0 && nuevaCantidad > i.stock) {
              mostrarNotificacion(`Solo hay ${i.stock} unidades en stock`, 'error')
              return i
            }
            return { ...i, cantidad: nuevaCantidad }
          }
          return i
        })
        .filter((i) => i.cantidad > 0)
    )
  }

  const vaciarCarrito = () => setCarrito([])

  const total = carrito.reduce((sum, i) => sum + i.precio * i.cantidad, 0)
  const totalItems = carrito.reduce((sum, i) => sum + i.cantidad, 0)

  const handleCobrar = async () => {
    if (carrito.length === 0) return

    // Doble chequeo de stock antes de efectuar el cobro
    for (const item of carrito) {
      const prodOriginal = productos.find((p) => p.id === item.id)
      if (!prodOriginal || prodOriginal.stock < item.cantidad) {
        mostrarNotificacion(`El producto "${item.nombre}" no cuenta con suficiente stock.`, 'error')
        return
      }
    }

    setCobrando(true)
    try {
      const payload = {
        total: total,
        items: carrito.map(item => ({
          producto_id: item.id,
          cantidad: item.cantidad,
          precio: item.precio
        }))
      }

      await createVenta(payload)
      
      mostrarNotificacion('¡Venta realizada con éxito!')
      vaciarCarrito()
      await fetchProductos()
    } catch (err) {
      console.error(err)
      const mensajeError = err.response?.data?.detail || 'Ocurrió un error al registrar la venta.'
      mostrarNotificacion(mensajeError, 'error')
    } finally {
      setCobrando(false)
    }
  }

  return (
    <div className="flex h-full overflow-hidden relative">
      {/* Notificación Toast flotante */}
      {notificacion && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg border transition-all duration-300 ${
          notificacion.tipo === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <span className="text-xs font-bold">{notificacion.mensaje}</span>
        </div>
      )}
      {/* ── Panel izquierdo: Productos ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Categorías */}
        <div className="bg-white border-b border-cafe-beige/50 px-4 py-3">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {categoriasDinamicas.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoriaActiva(cat)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  categoriaActiva === cat
                    ? 'bg-cafe-medio text-white shadow-sm'
                    : 'bg-cafe-crema text-cafe-claro hover:bg-cafe-beige/50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Buscar producto..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="mt-2 w-full px-3 py-2 text-sm border border-cafe-beige rounded-lg focus:outline-none focus:ring-2 focus:ring-cafe-medio/30"
          />
        </div>

        {/* Grid de productos */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center py-16"><LoadingSpinner /></div>
          ) : productosFiltrados.length === 0 ? (
            <EmptyState icon={Coffee} message="Sin productos disponibles" sub="Intenta otra categoría o revisa el inventario" />
          ) : (
            <div className="space-y-6">
              {/* Sección Favoritos */}
              {categoriaActiva === 'Todos' && productosFavoritos.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-cafe-oscuro mb-3 flex items-center gap-2">
                    <span className="text-lg">⭐</span> Favoritos
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {productosFavoritos.map((producto) => {
                      const enCarrito = carrito.find((i) => i.id === producto.id)
                      return (
                        <button
                          key={producto.id}
                          onClick={() => agregarAlCarrito(producto)}
                          className="bg-white rounded-xl border border-cafe-beige p-3 text-left hover:border-cafe-claro hover:shadow-md transition-all group relative"
                        >
                          {enCarrito && (
                            <span className="absolute top-2 right-2 w-5 h-5 bg-cafe-medio text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                              {enCarrito.cantidad}
                            </span>
                          )}
                          <ProductImage nombre={producto.nombre} />
                          <p className="text-xs font-semibold text-cafe-oscuro truncate">{producto.nombre}</p>
                          {producto.categoria && (
                            <p className="text-[10px] text-cafe-claro mt-0.5 truncate">{producto.categoria}</p>
                          )}
                          <div className="flex items-end justify-between mt-1">
                            <p className="text-sm font-bold text-cafe-medio">${formatPrecio(producto.precio)}</p>
                            <button
                              onClick={(e) => handleToggleFavorito(e, producto)}
                              className="text-lg hover:scale-125 transition-transform"
                              title="Remover de favoritos"
                            >
                              ⭐
                            </button>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Sección Productos Regulares */}
              <div>
                {categoriaActiva === 'Todos' && productosFavoritos.length > 0 && (
                  <h3 className="text-sm font-bold text-cafe-oscuro mb-3">Todos los productos</h3>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {productosFiltrados.map((producto) => {
                    const enCarrito = carrito.find((i) => i.id === producto.id)
                    return (
                      <button
                        key={producto.id}
                        onClick={() => agregarAlCarrito(producto)}
                        className="bg-white rounded-xl border border-cafe-beige p-3 text-left hover:border-cafe-claro hover:shadow-md transition-all group relative"
                      >
                        {enCarrito && (
                          <span className="absolute top-2 right-2 w-5 h-5 bg-cafe-medio text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                            {enCarrito.cantidad}
                          </span>
                        )}
                        <ProductImage nombre={producto.nombre} />
                        <p className="text-xs font-semibold text-cafe-oscuro truncate">{producto.nombre}</p>
                        {producto.categoria && (
                          <p className="text-[10px] text-cafe-claro mt-0.5 truncate">{producto.categoria}</p>
                        )}
                        <div className="flex items-end justify-between mt-1">
                          <p className="text-sm font-bold text-cafe-medio">${formatPrecio(producto.precio)}</p>
                          <button
                            onClick={(e) => handleToggleFavorito(e, producto)}
                            className="text-lg hover:scale-125 transition-transform"
                            title={producto.is_favorite ? 'Remover de favoritos' : 'Agregar a favoritos'}
                          >
                            {producto.is_favorite ? '⭐' : '☆'}
                          </button>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Panel derecho: Carrito ── */}
      <div className="w-72 xl:w-80 bg-white border-l border-cafe-beige flex flex-col flex-shrink-0">
        {/* Header carrito */}
        <div className="px-4 py-4 border-b border-cafe-beige flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart size={18} className="text-cafe-medio" />
            <span className="font-bold text-cafe-oscuro">Carrito</span>
            {totalItems > 0 && (
              <span className="bg-cafe-medio text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {totalItems}
              </span>
            )}
          </div>
          {carrito.length > 0 && (
            <button
              onClick={vaciarCarrito}
              className="text-xs text-red-400 hover:text-red-600 transition-colors"
            >
              Vaciar
            </button>
          )}
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto divide-y divide-cafe-beige/40 scrollbar-thin">
          {carrito.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
              <ShoppingCart size={36} className="text-cafe-beige mb-3" strokeWidth={1.5} />
              <p className="text-sm text-cafe-claro">El carrito está vacío</p>
              <p className="text-xs text-cafe-beige mt-1">Selecciona productos</p>
            </div>
          ) : (
            carrito.map((item) => (
              <div key={item.id} className="px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-cafe-oscuro truncate">{item.nombre}</p>
                  <p className="text-xs text-cafe-claro">${formatPrecio(item.precio)} c/u</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => cambiarCantidad(item.id, -1)}
                    className="w-8 h-8 rounded-md bg-cafe-crema hover:bg-cafe-beige/50 flex items-center justify-center transition-colors"
                  >
                    {item.cantidad === 1 ? <Trash2 size={14} className="text-red-400" /> : <Minus size={14} className="text-cafe-claro" />}
                  </button>
                  <span className="w-8 text-center text-base font-bold text-cafe-oscuro">{item.cantidad}</span>
                  <button
                    onClick={() => cambiarCantidad(item.id, 1)}
                    className="w-8 h-8 rounded-md bg-cafe-crema hover:bg-cafe-beige/50 flex items-center justify-center transition-colors"
                  >
                    <Plus size={14} className="text-cafe-claro" />
                  </button>
                </div>
                <p className="text-xs font-bold text-cafe-medio w-12 text-right">
                  ${formatPrecio(item.precio * item.cantidad)}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Resumen y cobrar */}
        <div className="border-t border-cafe-beige p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-cafe-claro">Subtotal</span>
            <span className="text-sm font-semibold text-cafe-oscuro">${formatPrecio(total)}</span>
          </div>
          <div className="flex justify-between items-center text-lg font-bold">
            <span className="text-cafe-oscuro">Total</span>
            <span className="text-cafe-medio">${formatPrecio(total)}</span>
          </div>
          <button
            disabled={carrito.length === 0 || cobrando}
            onClick={handleCobrar}
            className="w-full bg-cafe-medio text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2
              hover:bg-cafe-claro transition-all shadow-sm hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <CreditCard size={18} />
            {cobrando ? 'Procesando...' : `Cobrar $${formatPrecio(total)}`}
          </button>
        </div>
      </div>
    </div>
  )
}
