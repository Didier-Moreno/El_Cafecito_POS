import { useState, useMemo, useEffect, useRef } from 'react'
import { useProductos } from '../hooks/useProductos'
import { useCuentas } from '../hooks/useCuentas'
import CuentasPanel from '../components/layout/CuentasPanel'
import PageContainer from '../components/ui/PageContainer'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import EmptyState from '../components/ui/EmptyState'
import { ShoppingCart, Plus, Minus, Trash2, CreditCard, Coffee, BookmarkPlus, Receipt, Send, UserPlus, Check, X } from 'lucide-react'
import { formatPrecio } from '../utils/format'
import { createVenta, createCredito } from '../services/api'
import Modal from '../components/ui/Modal'
import { useClientes } from '../hooks/useClientes'

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

  // ── Cuentas abiertas (Elevado al inicio para permitir inicializar el carrito) ──
  const {
    cuentas,
    cuentaActivaId,
    cuentaActiva,
    guardarComoCuenta,
    seleccionarCuenta,
    renombrarCuenta,
    actualizarItemsCuenta,
    eliminarCuenta,
  } = useCuentas()

  const [categoriaActiva, setCategoriaActiva] = useState('Todos')
  
  // Inicializar el carrito con los productos de la cuenta activa si existe
  const [carrito, setCarrito] = useState(() => {
    return cuentaActiva ? cuentaActiva.items.map((i) => ({ ...i })) : []
  })

  const [busqueda, setBusqueda] = useState('')
  const [cobrando, setCobrando] = useState(false)
  const [notificacion, setNotificacion] = useState(null)

  // Sincronizar carrito → cuenta activa (cuando cambia el carrito con cuenta cargada)
  const prevCuentaActivaIdRef = useRef(null)
  useEffect(() => {
    if (cuentaActivaId) {
      actualizarItemsCuenta(cuentaActivaId, carrito)
    }
    prevCuentaActivaIdRef.current = cuentaActivaId
  }, [carrito]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Panel de cuentas (visible/oculto) ──────────────────────────────────
  const [panelCuentasVisible, setPanelCuentasVisible] = useState(false)
  const [cuentaAEliminar, setCuentaAEliminar] = useState(null)

  // ── Módulo de créditos ───────────────────────────────────────────────────
  const { clientes, crear: crearCliente } = useClientes()
  const [creditoModal, setCreditoModal] = useState(false)
  const [creditoClienteId, setCreditoClienteId] = useState('')
  const [creditoNuevoNombre, setCreditoNuevoNombre] = useState('')
  const [creditoNuevoTel, setCreditoNuevoTel] = useState('')
  const [creditoModo, setCreditoModo] = useState('existente') // 'existente' | 'nuevo'
  const [creditoError, setCreditoError] = useState('')
  const [enviandoCredito, setEnviandoCredito] = useState(false)

  // ── Notificaciones ───────────────────────────────────────────────────────
  const mostrarNotificacion = (mensaje, tipo = 'success') => {
    setNotificacion({ mensaje, tipo })
    const timer = setTimeout(() => setNotificacion(null), 3000)
    return () => clearTimeout(timer)
  }

  // ── Categorías dinámicas ─────────────────────────────────────────────────
  const categoriasDinamicas = useMemo(() => {
    const cats = [...new Set(productos.map((p) => p.categoria).filter(Boolean))]
    return ['Todos', ...cats]
  }, [productos])

  const productosFavoritos = useMemo(() => {
    return productos.filter((p) => p.is_favorite && p.stock > 0)
  }, [productos])

  const handleToggleFavorito = async (e, producto) => {
    e.stopPropagation()
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

  // ── Selección de variantes ───────────────────────────────────────────────
  const [varianteModal, setVarianteModal] = useState({ open: false, producto: null })

  const abrirSelectorVariante = (producto) => {
    setVarianteModal({ open: true, producto })
  }

  const cerrarSelectorVariante = () => {
    setVarianteModal({ open: false, producto: null })
  }

  // ── Carrito ──────────────────────────────────────────────────────────────
  const agregarAlCarrito = (producto, variante = null) => {
    if (producto.tiene_variantes && !variante) {
      abrirSelectorVariante(producto)
      return
    }

    setCarrito((prev) => {
      // Un producto en el carrito es único por su ID *y* su Variante ID
      const cartKey = (item) => `${item.id}-${item.variante_id || 'base'}`
      const targetKey = `${producto.id}-${variante ? variante.id : 'base'}`

      const existe = prev.find((i) => cartKey(i) === targetKey)
      
      const stockDisponible = variante ? variante.stock : producto.stock

      if (existe) {
        if (existe.cantidad >= stockDisponible) {
          mostrarNotificacion(`Stock máximo disponible: ${stockDisponible}`, 'error')
          return prev
        }
        return prev.map((i) =>
          cartKey(i) === targetKey ? { ...i, cantidad: i.cantidad + 1 } : i
        )
      }

      // Nuevo item en el carrito
      return [...prev, {
        id: producto.id,
        variante_id: variante ? variante.id : null,
        nombre: variante ? `${producto.nombre} - ${variante.nombre}` : producto.nombre,
        precio: producto.precio,
        stock: stockDisponible,
        cantidad: 1
      }]
    })

    if (variante) cerrarSelectorVariante()
  }

  const cambiarCantidad = (id, varianteId, delta) => {
    setCarrito((prev) =>
      prev
        .map((i) => {
          if (i.id === id && i.variante_id === varianteId) {
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

  // ── Guardar como cuenta ──────────────────────────────────────────────────
  const handleGuardarComoCuenta = () => {
    if (carrito.length === 0) return
    guardarComoCuenta(carrito)
    vaciarCarrito()
    setPanelCuentasVisible(true)   // abrir el panel automáticamente
    mostrarNotificacion('Cuenta guardada correctamente')
  }

  // ── Seleccionar cuenta ────────────────────────────────────────────────────
  const handleSeleccionarCuenta = (id) => {
    const items = seleccionarCuenta(id)
    setCarrito(items) // [] si se deseleccionó, o los items de la cuenta
  }

  // ── Cobrar ───────────────────────────────────────────────────────────────
  const handleCobrar = async () => {
    if (carrito.length === 0) return

    // Doble chequeo de stock antes de efectuar el cobro
    for (const item of carrito) {
      const prodOriginal = productos.find((p) => p.id === item.id)
      if (!prodOriginal) {
        mostrarNotificacion(`El producto "${item.nombre}" no existe.`, 'error')
        return
      }
      
      let stockDisponible = prodOriginal.stock;
      if (item.variante_id) {
        const variante = prodOriginal.producto_variantes?.find(v => v.id === item.variante_id)
        if (variante) stockDisponible = variante.stock;
      }
      
      if (stockDisponible < item.cantidad) {
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
          variante_id: item.variante_id || null,
          cantidad: item.cantidad,
          precio: item.precio
        }))
      }

      await createVenta(payload)
      
      // Si había una cuenta activa, eliminarla de la lista
      if (cuentaActivaId) {
        eliminarCuenta(cuentaActivaId)
      }

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

  // ── Enviar a crédito ─────────────────────────────────────────────────────
  const abrirCreditoModal = () => {
    if (carrito.length === 0) return
    setCreditoClienteId('')
    setCreditoNuevoNombre('')
    setCreditoNuevoTel('')
    setCreditoModo(clientes.length > 0 ? 'existente' : 'nuevo')
    setCreditoError('')
    setCreditoModal(true)
  }

  const handleEnviarACredito = async (e) => {
    e.preventDefault()
    setCreditoError('')

    // Validar
    let clienteId = null
    if (creditoModo === 'existente') {
      if (!creditoClienteId) { setCreditoError('Selecciona un cliente.'); return }
      clienteId = parseInt(creditoClienteId)
    } else {
      if (!creditoNuevoNombre.trim()) { setCreditoError('El nombre del cliente es obligatorio.'); return }
    }

    setEnviandoCredito(true)
    try {
      // 1. Procesar la venta (descuenta stock)
      const payload = {
        total,
        items: carrito.map((item) => ({
          producto_id: item.id,
          variante_id: item.variante_id || null,
          cantidad: item.cantidad,
          precio: item.precio,
        })),
      }
      const { data: ventaData } = await createVenta(payload)
      const ventaId = ventaData?.venta_id ?? null

      // 2. Crear cliente nuevo si es necesario
      if (creditoModo === 'nuevo') {
        const nuevoCliente = await crearCliente({
          nombre: creditoNuevoNombre.trim(),
          telefono: creditoNuevoTel.trim() || null,
        })
        clienteId = nuevoCliente.id
      }

      // 3. Registrar el crédito
      await createCredito({ cliente_id: clienteId, venta_id: ventaId, total })

      // 4. Cerrar cuenta activa si existe
      if (cuentaActivaId) eliminarCuenta(cuentaActivaId)

      setCreditoModal(false)
      vaciarCarrito()
      await fetchProductos()
      mostrarNotificacion('¡Venta enviada a crédito con éxito!')
    } catch (err) {
      console.error(err)
      setCreditoError(err?.response?.data?.detail ?? 'Error al registrar el crédito.')
    } finally {
      setEnviandoCredito(false)
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
                    // Calculamos cantidad de este producto en el carrito (base + variantes)
                    const enCarritoItems = carrito.filter((i) => i.id === producto.id)
                    const cantidadTotal = enCarritoItems.reduce((sum, item) => sum + item.cantidad, 0)
                    
                    return (
                      <button
                        key={producto.id}
                        onClick={() => agregarAlCarrito(producto)}
                        className="bg-white rounded-xl border border-cafe-beige p-3 text-left hover:border-cafe-claro hover:shadow-md transition-all group relative"
                      >
                        {cantidadTotal > 0 && (
                          <span className="absolute top-2 right-2 w-5 h-5 bg-cafe-medio text-white text-[10px] font-bold rounded-full flex items-center justify-center z-10 shadow-sm">
                            {cantidadTotal}
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
                            className="text-lg hover:scale-125 transition-transform relative z-10"
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

      {/* ── Modal Selector Variante ── */}
      <Modal
        isOpen={varianteModal.open}
        onClose={cerrarSelectorVariante}
        title={`Seleccionar Variante: ${varianteModal.producto?.nombre}`}
        maxWidth="max-w-md"
      >
        <div className="py-2 space-y-2">
          {varianteModal.producto?.producto_variantes?.filter(v => v.stock > 0).map(v => (
            <button
              key={v.id}
              onClick={() => agregarAlCarrito(varianteModal.producto, v)}
              className="w-full flex items-center justify-between p-3 border border-cafe-beige rounded-xl hover:bg-cafe-crema hover:border-cafe-claro transition-all group text-left"
            >
              <div>
                <p className="font-bold text-cafe-oscuro group-hover:text-cafe-medio transition-colors">{v.nombre}</p>
                <p className="text-xs text-cafe-claro">{v.stock} disponibles</p>
              </div>
              <Plus size={18} className="text-cafe-claro group-hover:text-cafe-medio transition-colors" />
            </button>
          ))}
          {(!varianteModal.producto?.producto_variantes || varianteModal.producto.producto_variantes.filter(v => v.stock > 0).length === 0) && (
            <div className="text-center py-6 text-cafe-claro text-sm">
              No hay variantes con stock disponible para este producto.
            </div>
          )}
        </div>
      </Modal>

      {/* ── Panel central: Cuentas Abiertas ── */}
      <CuentasPanel
        cuentas={cuentas}
        cuentaActivaId={cuentaActivaId}
        onSeleccionar={handleSeleccionarCuenta}
        onRenombrar={renombrarCuenta}
        onClose={() => setPanelCuentasVisible(false)}
        onEliminar={setCuentaAEliminar}
        isVisible={panelCuentasVisible}
      />

      {/* ── Panel derecho: Carrito ── */}
      <div className="w-72 xl:w-80 bg-white border-l border-cafe-beige flex flex-col flex-shrink-0">
        {/* Header carrito */}
        <div className="px-4 py-4 border-b border-cafe-beige flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart size={18} className="text-cafe-medio" />
            <span className="font-bold text-cafe-oscuro">
              {cuentaActiva ? cuentaActiva.nombre : 'Carrito'}
            </span>
            {totalItems > 0 && (
              <span className="bg-cafe-medio text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {totalItems}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Toggle panel cuentas (Pill design) */}
            <button
              onClick={() => setPanelCuentasVisible((v) => !v)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                panelCuentasVisible
                  ? 'bg-cafe-medio text-white shadow-sm'
                  : 'bg-cafe-crema text-cafe-medio hover:bg-cafe-beige/40 border border-cafe-beige/40'
              }`}
              title={panelCuentasVisible ? 'Ocultar Cuentas' : 'Ver Cuentas Abiertas'}
            >
              <Receipt size={13} />
              <span>Cuentas</span>
              {cuentas.length > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold leading-none ${
                  panelCuentasVisible
                    ? 'bg-white text-cafe-medio'
                    : 'bg-cafe-medio text-white'
                }`}>
                  {cuentas.length}
                </span>
              )}
            </button>
            {carrito.length > 0 && (
              <button
                onClick={vaciarCarrito}
                className="text-xs text-red-400 hover:text-red-600 transition-colors"
              >
                Vaciar
              </button>
            )}
          </div>
        </div>

        {/* Indicador de cuenta activa */}
        {cuentaActiva && (
          <div className="px-4 py-2 bg-cafe-medio/8 border-b border-cafe-medio/20 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cafe-medio animate-pulse inline-block" />
            <span className="text-[11px] text-cafe-medio font-medium">
              Editando: <strong>{cuentaActiva.nombre}</strong>
            </span>
          </div>
        )}

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
                    onClick={() => cambiarCantidad(item.id, item.variante_id, -1)}
                    className="w-8 h-8 rounded-md bg-cafe-crema hover:bg-cafe-beige/50 flex items-center justify-center transition-colors"
                  >
                    {item.cantidad === 1 ? <Trash2 size={14} className="text-red-400" /> : <Minus size={14} className="text-cafe-claro" />}
                  </button>
                  <span className="w-8 text-center text-base font-bold text-cafe-oscuro">{item.cantidad}</span>
                  <button
                    onClick={() => cambiarCantidad(item.id, item.variante_id, 1)}
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

          {/* Botón Guardar como cuenta — solo cuando no hay cuenta activa */}
          {!cuentaActiva && (
            <button
              disabled={carrito.length === 0}
              onClick={handleGuardarComoCuenta}
              className="w-full border border-cafe-medio text-cafe-medio py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2
                hover:bg-cafe-medio/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <BookmarkPlus size={16} />
              Guardar como cuenta
            </button>
          )}

          {/* Botón Enviar a crédito */}
          <button
            disabled={carrito.length === 0 || enviandoCredito}
            onClick={abrirCreditoModal}
            className="w-full border border-amber-500 text-amber-700 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2
              hover:bg-amber-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send size={15} />
            Enviar a crédito
          </button>

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
      {/* ── Modal Confirmar Eliminar Cuenta ── */}
      <Modal
        isOpen={!!cuentaAEliminar}
        onClose={() => setCuentaAEliminar(null)}
        title="Confirmar Eliminación"
        maxWidth="max-w-sm"
      >
        <div className="text-center space-y-4 py-2">
          <div className="text-5xl">⚠️</div>
          <p className="text-cafe-oscuro text-sm">
            ¿Eliminar la cuenta <strong>"{cuentaAEliminar?.nombre}"</strong>?
            Esta acción vaciará sus productos y no se puede deshacer.
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <button
              onClick={() => setCuentaAEliminar(null)}
              className="px-4 py-2 border border-cafe-beige rounded-xl font-semibold text-xs text-cafe-oscuro bg-white hover:bg-cafe-crema transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                if (cuentaActivaId === cuentaAEliminar.id) {
                  vaciarCarrito()
                }
                eliminarCuenta(cuentaAEliminar.id)
                setCuentaAEliminar(null)
                mostrarNotificacion('Cuenta eliminada con éxito')
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs shadow-sm transition-colors animate-pulse"
            >
              Sí, Eliminar
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Modal Enviar a Crédito ── */}
      <Modal
        isOpen={creditoModal}
        onClose={() => setCreditoModal(false)}
        title="Enviar a Crédito"
        maxWidth="max-w-sm"
      >
        <form onSubmit={handleEnviarACredito} className="space-y-4">
          {/* Resumen */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-amber-700 font-semibold">Total a crédito</span>
            <span className="text-lg font-black text-amber-800">${formatPrecio(total)}</span>
          </div>

          {/* Selector modo */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCreditoModo('existente')}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                creditoModo === 'existente'
                  ? 'bg-cafe-medio text-white border-cafe-medio'
                  : 'bg-white text-cafe-claro border-cafe-beige hover:border-cafe-medio'
              }`}
            >
              Cliente existente
            </button>
            <button
              type="button"
              onClick={() => setCreditoModo('nuevo')}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                creditoModo === 'nuevo'
                  ? 'bg-cafe-medio text-white border-cafe-medio'
                  : 'bg-white text-cafe-claro border-cafe-beige hover:border-cafe-medio'
              }`}
            >
              <UserPlus size={13} className="inline mr-1" />
              Nuevo cliente
            </button>
          </div>

          {creditoError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {creditoError}
            </p>
          )}

          {/* Selector cliente existente */}
          {creditoModo === 'existente' && (
            <div>
              <label className="block text-xs font-semibold text-cafe-claro uppercase tracking-wide mb-1">
                Cliente *
              </label>
              {clientes.length === 0 ? (
                <p className="text-xs text-cafe-claro bg-cafe-crema rounded-lg px-3 py-2">
                  Aún no hay clientes registrados. Cambia a "Nuevo cliente".
                </p>
              ) : (
                <select
                  value={creditoClienteId}
                  onChange={(e) => setCreditoClienteId(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm border border-cafe-beige rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-cafe-medio/30"
                >
                  <option value="">Selecciona un cliente...</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}{c.telefono ? ` · ${c.telefono}` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Formulario nuevo cliente */}
          {creditoModo === 'nuevo' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-cafe-claro uppercase tracking-wide mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={creditoNuevoNombre}
                  onChange={(e) => setCreditoNuevoNombre(e.target.value)}
                  placeholder="Ej: Carlos Ramírez"
                  required
                  className="w-full px-3 py-2 text-sm border border-cafe-beige rounded-lg focus:outline-none focus:ring-2 focus:ring-cafe-medio/30"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-cafe-claro uppercase tracking-wide mb-1">
                  Teléfono (opcional)
                </label>
                <input
                  type="text"
                  value={creditoNuevoTel}
                  onChange={(e) => setCreditoNuevoTel(e.target.value)}
                  placeholder="Ej: 3001234567"
                  className="w-full px-3 py-2 text-sm border border-cafe-beige rounded-lg focus:outline-none focus:ring-2 focus:ring-cafe-medio/30"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={() => setCreditoModal(false)}
              className="px-4 py-2 border border-cafe-beige rounded-xl font-semibold text-xs text-cafe-oscuro bg-white hover:bg-cafe-crema transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviandoCredito}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Send size={13} />
              {enviandoCredito ? 'Enviando...' : 'Confirmar crédito'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
