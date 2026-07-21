import { useState, useMemo, useEffect } from 'react'
import { Package, AlertTriangle, XCircle, FolderOpen, Plus, Minus, Pencil, Trash2, AlertCircle, CheckCircle } from 'lucide-react'
import PageContainer from '../components/ui/PageContainer'
import StatCard from '../components/ui/StatCard'
import SearchBar from '../components/ui/SearchBar'
import Table from '../components/ui/Table'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { useProductos } from '../hooks/useProductos'
import { formatPrecio } from '../utils/format'

const CATEGORIAS_PREDEFINIDAS = ['Gaseosas', 'Energizantes', 'Cervezas y Maltas', 'Snacks', 'Cafetería']

const EMPTY_FORM = { nombre: '', precio: '', costo: '', stock: '', categoria: '', tiene_variantes: false, variantes: [] }

export default function Inventario() {
  const { productos, loading, error, stats, crear, actualizar, eliminar } = useProductos()

  const [search, setSearch]             = useState('')
  const [filterCat, setFilterCat]       = useState('')
  const [modalOpen, setModalOpen]       = useState(false)
  const [deleteModal, setDeleteModal]   = useState(null) // producto a eliminar
  const [form, setForm]                 = useState(EMPTY_FORM)
  const [editingId, setEditingId]       = useState(null)
  const [saving, setSaving]             = useState(false)
  const [formError, setFormError]       = useState('')

  const [inlineStockId, setInlineStockId] = useState(null)
  const [inlineStockValue, setInlineStockValue] = useState('')

  // Gestión de categorías dinámicas
  const [categoriasAgregadas, setCategoriasAgregadas] = useState(() => {
    try {
      const saved = localStorage.getItem('categoriasAgregadas')
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })
  const [categoriasEliminadas, setCategoriasEliminadas] = useState(() => {
    try {
      const saved = localStorage.getItem('categoriasEliminadas')
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })

  useEffect(() => {
    localStorage.setItem('categoriasAgregadas', JSON.stringify(categoriasAgregadas))
  }, [categoriasAgregadas])

  useEffect(() => {
    localStorage.setItem('categoriasEliminadas', JSON.stringify(categoriasEliminadas))
  }, [categoriasEliminadas])

  const [showNuevaCatInput, setShowNuevaCatInput]     = useState(false)
  const [nuevaCatNombre, setNuevaCatNombre]           = useState('')
  const [showToolbarCatInput, setShowToolbarCatInput] = useState(false)
  const [toolbarCatNombre, setToolbarCatNombre]       = useState('')

  // Filtros interactivos de KPIs y Gestión
  const [kpiFilter, setKpiFilter]                     = useState('todos')
  const [categoriasModalOpen, setCategoriasModalOpen] = useState(false)
  const [editingCatName, setEditingCatName]           = useState(null)
  const [renameCatVal, setRenameCatVal]               = useState('')
  const [newModalCatName, setNewModalCatName]         = useState('')
  const [deleteCatConfirm, setDeleteCatConfirm]       = useState(null)

  // Sistema de notificaciones Toast
  const [notificacion, setNotificacion] = useState(null)

  // Ordenamiento de tabla
  const [sortConfig, setSortConfig] = useState({ key: 'nombre', direction: 'asc' })

  const handleSort = (key) => {
    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const mostrarNotificacion = (mensaje, tipo = 'success') => {
    setNotificacion({ mensaje, tipo })
    setTimeout(() => setNotificacion(null), 3000)
  }

  const opcionesCategorias = useMemo(() => {
    const catsExistentes = productos.map((p) => p.categoria).filter(Boolean)
    const todasCats = [...new Set([...CATEGORIAS_PREDEFINIDAS, ...catsExistentes, ...categoriasAgregadas])]
    // Filtrar categorías eliminadas (solo las predefinidas eliminadas)
    return todasCats.filter((cat) => !categoriasEliminadas.includes(cat))
  }, [productos, categoriasAgregadas, categoriasEliminadas])

  const categoriasDisponibles = useMemo(() => {
    const catsExistentes = productos.map((p) => p.categoria).filter(Boolean)
    const todasCats = [...new Set([...CATEGORIAS_PREDEFINIDAS, ...catsExistentes, ...categoriasAgregadas])]
    // Filtrar categorías eliminadas (solo las predefinidas eliminadas)
    return todasCats.filter((cat) => !categoriasEliminadas.includes(cat))
  }, [productos, categoriasAgregadas, categoriasEliminadas])

  const handleAgregarCategoria = (e) => {
    e.preventDefault()
    const nombreLimpio = nuevaCatNombre.trim()
    if (!nombreLimpio) return

    if (!opcionesCategorias.includes(nombreLimpio)) {
      setCategoriasAgregadas((prev) => [...prev, nombreLimpio])
      mostrarNotificacion(`Categoría "${nombreLimpio}" agregada con éxito`)
    }
    setForm((prev) => ({ ...prev, categoria: nombreLimpio }))
    setNuevaCatNombre('')
    setShowNuevaCatInput(false)
  }

  const handleAddToolbarCategory = (e) => {
    e.preventDefault()
    const nombreLimpio = toolbarCatNombre.trim()
    if (!nombreLimpio) return

    if (!opcionesCategorias.includes(nombreLimpio)) {
      setCategoriasAgregadas((prev) => [...prev, nombreLimpio])
      mostrarNotificacion(`Categoría "${nombreLimpio}" agregada con éxito`)
    }
    setFilterCat(nombreLimpio)
    setToolbarCatNombre('')
    setShowToolbarCatInput(false)
  }

  // ── Lógica de gestión de categorías en lote ─────────────────────────────────
  const handleRenombrarCategoriaEnLote = async (categoriaVieja, categoriaNueva) => {
    const nuevaLimpia = categoriaNueva.trim()
    if (!nuevaLimpia || nuevaLimpia === categoriaVieja) {
      setEditingCatName(null)
      return
    }

    try {
      const productosAfectados = productos.filter((p) => p.categoria === categoriaVieja)
      for (const prod of productosAfectados) {
        await actualizar(prod.id, { categoria: nuevaLimpia })
      }

      setCategoriasAgregadas((prev) => {
        const sinVieja = prev.filter((c) => c !== categoriaVieja)
        if (!sinVieja.includes(nuevaLimpia) && !CATEGORIAS_PREDEFINIDAS.includes(nuevaLimpia)) {
          return [...sinVieja, nuevaLimpia]
        }
        return sinVieja
      })

      if (filterCat === categoriaVieja) {
        setFilterCat(nuevaLimpia)
      }

      mostrarNotificacion('¡Categoría renombrada con éxito en todos los productos!')
      setEditingCatName(null)
      setRenameCatVal('')
    } catch (err) {
      console.error(err)
      mostrarNotificacion('Ocurrió un error al renombrar la categoría.', 'error')
    }
  }

  const confirmarEliminarCategoria = (categoria) => {
    setDeleteCatConfirm(categoria)
  }

  const handleEliminarCategoriaEnLote = async () => {
    const categoria = deleteCatConfirm
    if (!categoria) return
    setDeleteCatConfirm(null)

    try {
      const productosAfectados = productos.filter((p) => p.categoria === categoria)
      for (const prod of productosAfectados) {
        await actualizar(prod.id, { categoria: null })
      }

      // Si es categoría personalizada, remover de categoriasAgregadas
      setCategoriasAgregadas((prev) => prev.filter((c) => c !== categoria))

      // Si es categoría predefinida, agregar a categoriasEliminadas
      if (CATEGORIAS_PREDEFINIDAS.includes(categoria)) {
        setCategoriasEliminadas((prev) => [...prev, categoria])
      }

      if (filterCat === categoria) {
        setFilterCat('')
      }

      mostrarNotificacion('¡Categoría eliminada con éxito!')
    } catch (err) {
      console.error(err)
      mostrarNotificacion('Ocurrió un error al eliminar la categoría.', 'error')
    }
  }

  const handleAgregarCategoriaDesdeModal = (e) => {
    e.preventDefault()
    const nombreLimpio = newModalCatName.trim()
    if (!nombreLimpio) return

    if (!opcionesCategorias.includes(nombreLimpio)) {
      setCategoriasAgregadas((prev) => [...prev, nombreLimpio])
      mostrarNotificacion(`Categoría "${nombreLimpio}" agregada con éxito`)
    }
    setNewModalCatName('')
  }

  // ── Filtrado y ordenamiento ────────────────────────────────────────────────
  const productosFiltrados = useMemo(() => {
    const filtrados = productos.filter((p) => {
      const matchSearch = p.nombre?.toLowerCase().includes(search.toLowerCase())
      const matchCat    = filterCat ? p.categoria === filterCat : true
      
      let matchKpi = true
      if (kpiFilter === 'bajo_stock') {
        matchKpi = p.stock > 0 && p.stock <= 5
      } else if (kpiFilter === 'agotados') {
        matchKpi = p.stock === 0
      }

      return matchSearch && matchCat && matchKpi
    })

    // Ordenar dinámicamente
    return filtrados.sort((a, b) => {
      let aValue = a[sortConfig.key]
      let bValue = b[sortConfig.key]

      if (aValue === null || aValue === undefined) aValue = ''
      if (bValue === null || bValue === undefined) bValue = ''

      if (typeof aValue === 'string') aValue = aValue.toLowerCase()
      if (typeof bValue === 'string') bValue = bValue.toLowerCase()

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1
      }
      return 0
    })
  }, [productos, search, filterCat, kpiFilter, sortConfig])

  // ── Modal Formulario ────────────────────────────────────────────────────────
  const abrirNuevo = () => {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setFormError('')
    setModalOpen(true)
  }

  const abrirEditar = (producto) => {
    setForm({
      nombre:          producto.nombre          ?? '',
      precio:          producto.precio          ?? '',
      costo:           producto.costo           ?? '',
      stock:           producto.stock           ?? '',
      categoria:       producto.categoria       ?? '',
      tiene_variantes: producto.tiene_variantes ?? false,
      variantes:       producto.producto_variantes ? [...producto.producto_variantes] : [],
    })
    setEditingId(producto.id)
    setFormError('')
    setModalOpen(true)
  }

  const cerrarModal = () => {
    setModalOpen(false)
    setForm(EMPTY_FORM)
    setEditingId(null)
    setShowNuevaCatInput(false)
    setNuevaCatNombre('')
  }

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [e.target.name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validar datos básicos
    if (!form.nombre || !form.precio) {
      setFormError('Nombre y precio son obligatorios.')
      return
    }

    // Validar según si tiene variantes
    let stockTotal = parseInt(form.stock, 10);
    if (form.tiene_variantes) {
      if (form.variantes.length === 0) {
        setFormError('Debe agregar al menos una variante.')
        return
      }
      for (const v of form.variantes) {
        if (!v.nombre.trim() || v.stock === '' || isNaN(v.stock)) {
          setFormError('Todas las variantes deben tener nombre y un stock válido.')
          return
        }
      }
      stockTotal = form.variantes.reduce((sum, v) => sum + parseInt(v.stock, 10), 0);
    } else {
      if (form.stock === '' || isNaN(stockTotal)) {
        setFormError('Stock es obligatorio.')
        return
      }
    }

    setSaving(true)
    setFormError('')
    try {
      const payload = {
        nombre:          form.nombre,
        precio:          parseFloat(form.precio),
        costo:           parseFloat(form.costo) || 0,
        stock:           stockTotal,
        categoria:       form.categoria || null,
        tiene_variantes: form.tiene_variantes,
        variantes:       form.tiene_variantes ? form.variantes.map(v => ({
                           id: v.id || null,
                           nombre: v.nombre,
                           stock: parseInt(v.stock, 10)
                         })) : null,
      }
      
      if (editingId) {
        await actualizar(editingId, payload)
        mostrarNotificacion('¡Producto actualizado con éxito!')
      } else {
        await crear(payload)
        mostrarNotificacion('¡Producto creado con éxito!')
      }
      cerrarModal()
    } catch {
      setFormError('Ocurrió un error al guardar. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  // ── Edición rápida de stock ──────────────────────────────────────────────────
  const handleQuickStockChange = async (producto, change) => {
    try {
      const newStock = Math.max(0, producto.stock + change)
      await actualizar(producto.id, { ...producto, stock: newStock })
      mostrarNotificacion('Stock actualizado')
    } catch {
      mostrarNotificacion('Error al actualizar stock', 'error')
    }
  }

  const handleInlineStockSubmit = async (e, producto) => {
    e.preventDefault()
    const newStock = parseInt(inlineStockValue, 10)
    if (isNaN(newStock) || newStock < 0) {
      mostrarNotificacion('Cantidad inválida', 'error')
      setInlineStockId(null)
      return
    }
    try {
      await actualizar(producto.id, { ...producto, stock: newStock })
      mostrarNotificacion('Stock actualizado')
      setInlineStockId(null)
    } catch {
      mostrarNotificacion('Error al actualizar stock', 'error')
    }
  }

  // ── Eliminar ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteModal) return
    try {
      await eliminar(deleteModal.id)
      mostrarNotificacion('¡Producto eliminado con éxito!')
    } finally {
      setDeleteModal(null)
    }
  }

  // ── Columnas de tabla ───────────────────────────────────────────────────────
  const columns = [
    { key: 'nombre',    label: 'Producto', sortable: true },
    { key: 'categoria', label: 'Categoría', sortable: true, render: (v) => v ?? <span className="text-cafe-beige">—</span> },
    {
      key: 'precio',
      label: 'Precio',
      sortable: true,
      render: (v) => <span className="font-semibold">${formatPrecio(v)}</span>,
    },
    {
      key: 'stock',
      label: 'Stock',
      sortable: true,
      render: (v, row) => {
        const isEditing = inlineStockId === row.id
        const n = Number(v)
        let cls = 'bg-emerald-100 text-emerald-700'
        if (n === 0)    cls = 'bg-red-100 text-red-600'
        else if (n <= 5) cls = 'bg-amber-100 text-amber-700'

        if (isEditing) {
          return (
            <form 
              onSubmit={(e) => handleInlineStockSubmit(e, row)}
              className="flex items-center gap-1.5"
            >
              <input
                type="number"
                min="0"
                value={inlineStockValue}
                onChange={(e) => setInlineStockValue(e.target.value)}
                autoFocus
                onBlur={() => setInlineStockId(null)}
                className="w-20 px-2 py-1 text-sm border border-cafe-beige rounded focus:outline-none focus:ring-1 focus:ring-cafe-medio bg-white"
              />
              <button type="submit" className="text-emerald-600 hover:text-emerald-800" onMouseDown={(e) => e.preventDefault()}><CheckCircle size={18}/></button>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => setInlineStockId(null)} className="text-red-500 hover:text-red-700"><XCircle size={18}/></button>
            </form>
          )
        }

        return (
          <div className="flex items-center gap-2.5 group min-w-[110px]">
            <button 
              onClick={() => handleQuickStockChange(row, -1)}
              className="w-7 h-7 rounded-md bg-cafe-crema flex items-center justify-center text-cafe-claro hover:bg-red-50 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 shadow-sm"
              title="Disminuir stock"
            >
              <Minus size={16} />
            </button>
            <span 
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-semibold cursor-pointer hover:opacity-80 transition-opacity ${cls}`}
              onClick={() => {
                setInlineStockId(row.id)
                setInlineStockValue(row.stock)
              }}
              title="Click para editar"
            >
              {n === 0 ? 'Agotado' : n}
            </span>
            <button 
              onClick={() => handleQuickStockChange(row, 1)}
              className="w-7 h-7 rounded-md bg-cafe-crema flex items-center justify-center text-cafe-claro hover:bg-emerald-50 hover:text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 shadow-sm"
              title="Aumentar stock"
            >
              <Plus size={16} />
            </button>
          </div>
        )
      },
    },
  ]

  return (
    <PageContainer>
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Package}
          label="Total Productos"
          value={stats.total}
          color="cafe"
          onClick={() => setKpiFilter('todos')}
          active={kpiFilter === 'todos'}
        />
        <StatCard
          icon={AlertTriangle}
          label="Stock Bajo"
          value={stats.stockBajo}
          color="warning"
          onClick={() => setKpiFilter('bajo_stock')}
          active={kpiFilter === 'bajo_stock'}
        />
        <StatCard
          icon={XCircle}
          label="Agotados"
          value={stats.agotados}
          color="danger"
          onClick={() => setKpiFilter('agotados')}
          active={kpiFilter === 'agotados'}
        />
        <StatCard
          icon={FolderOpen}
          label="Categorías"
          value={stats.categorias}
          color="success"
          onClick={() => setCategoriasModalOpen(true)}
          active={categoriasModalOpen}
        />
      </div>

      {/* Alerta stock bajo */}
      {stats.stockBajo > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertCircle size={18} className="text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            <strong>{stats.stockBajo}</strong> producto{stats.stockBajo !== 1 ? 's' : ''} con stock bajo (≤ 5 unidades).
            Considera reabastecer pronto.
          </p>
        </div>
      )}

      {/* Error del backend */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertCircle size={18} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Buscar producto..."
          className="w-full sm:w-72"
        />
        {showToolbarCatInput ? (
          <form onSubmit={handleAddToolbarCategory} className="flex items-center gap-1.5 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Nueva categoría..."
              value={toolbarCatNombre}
              onChange={(e) => setToolbarCatNombre(e.target.value)}
              className="text-sm border border-cafe-beige rounded-lg px-3 py-2 bg-white text-cafe-oscuro focus:outline-none focus:ring-2 focus:ring-cafe-medio/30 w-full sm:w-44"
              autoFocus
            />
            <button
              type="submit"
              className="px-3 py-2 text-xs font-bold bg-cafe-medio text-white rounded-lg hover:bg-cafe-claro transition-colors whitespace-nowrap"
            >
              Agregar
            </button>
            <button
              type="button"
              onClick={() => {
                setShowToolbarCatInput(false)
                setToolbarCatNombre('')
              }}
              className="px-2.5 py-2 text-xs font-semibold text-cafe-claro hover:bg-cafe-crema rounded-lg transition-colors whitespace-nowrap"
            >
              Cancelar
            </button>
          </form>
        ) : (
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <select
              value={filterCat}
              onChange={(e) => setFilterCat(e.target.value)}
              className="text-sm border border-cafe-beige rounded-lg px-3 py-2 bg-white text-cafe-oscuro focus:outline-none focus:ring-2 focus:ring-cafe-medio/30 w-full sm:w-auto"
            >
              <option value="">Todas las categorías</option>
              {categoriasDisponibles.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowToolbarCatInput(true)}
              className="p-2.5 border border-cafe-beige rounded-lg bg-white text-cafe-claro hover:bg-cafe-crema hover:text-cafe-medio transition-all flex items-center justify-center flex-shrink-0"
              title="Añadir nueva categoría"
            >
              <Plus size={15} />
            </button>
          </div>
        )}
        <div className="sm:ml-auto">
          <Button icon={Plus} onClick={abrirNuevo}>
            Nuevo Producto
          </Button>
        </div>
      </div>

      {/* Tabla */}
      <Table
        columns={columns}
        data={productosFiltrados}
        loading={loading}
        emptyMessage="No se encontraron productos"
        sortConfig={sortConfig}
        onSort={handleSort}
        actions={(row) => (
          <>
            <button
              onClick={() => abrirEditar(row)}
              className="p-1.5 rounded-lg text-cafe-claro hover:bg-cafe-crema hover:text-cafe-medio transition-colors"
              title="Editar"
            >
              <Pencil size={15} />
            </button>
            <button
              onClick={() => setDeleteModal(row)}
              className="p-1.5 rounded-lg text-cafe-claro hover:bg-red-50 hover:text-red-500 transition-colors"
              title="Eliminar"
            >
              <Trash2 size={15} />
            </button>
          </>
        )}
      />

      {/* ── Modal Formulario ── */}
      <Modal
        isOpen={modalOpen}
        onClose={cerrarModal}
        title={editingId ? 'Editar Producto' : 'Nuevo Producto'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {formError}
            </p>
          )}

          <div>
            <label className="block text-xs font-semibold text-cafe-claro uppercase tracking-wide mb-1">
              Nombre del Producto *
            </label>
            <input
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              placeholder="Ej: Agua pequeña"
              required
              className="w-full px-3 py-2 text-sm border border-cafe-beige rounded-lg focus:outline-none focus:ring-2 focus:ring-cafe-medio/30 focus:border-cafe-claro"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-cafe-claro uppercase tracking-wide mb-1">
                Precio ($) *
              </label>
              <input
                name="precio"
                type="number"
                min="0"
                step="0.01"
                value={form.precio}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 text-sm border border-cafe-beige rounded-lg focus:outline-none focus:ring-2 focus:ring-cafe-medio/30"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-cafe-claro uppercase tracking-wide mb-1">
                Costo ($)
              </label>
              <input
                name="costo"
                type="number"
                min="0"
                step="0.01"
                value={form.costo}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-cafe-beige rounded-lg focus:outline-none focus:ring-2 focus:ring-cafe-medio/30"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <input
              type="checkbox"
              id="tiene_variantes"
              name="tiene_variantes"
              checked={form.tiene_variantes}
              onChange={handleChange}
              className="w-4 h-4 text-cafe-medio rounded border-cafe-beige focus:ring-cafe-medio"
            />
            <label htmlFor="tiene_variantes" className="text-sm font-semibold text-cafe-oscuro cursor-pointer">
              Este producto tiene variantes (ej: Sabores, Marcas)
            </label>
          </div>

          {form.tiene_variantes ? (
            <div className="border border-cafe-beige rounded-xl p-4 bg-cafe-crema/30 space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-cafe-claro uppercase tracking-wide">
                  Variantes del Producto
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForm(prev => ({
                      ...prev,
                      variantes: [...prev.variantes, { nombre: '', stock: '' }]
                    }))
                  }}
                  className="text-[10px] text-cafe-medio hover:text-cafe-claro font-bold flex items-center gap-0.5 bg-white px-2 py-1 rounded-md border border-cafe-beige shadow-sm"
                >
                  <Plus size={10} /> Añadir Variante
                </button>
              </div>

              {form.variantes.length === 0 ? (
                <p className="text-xs text-cafe-claro text-center py-2">No hay variantes agregadas.</p>
              ) : (
                <div className="space-y-2">
                  {form.variantes.map((v, idx) => (
                    <div key={idx} className="flex gap-2 items-start">
                      <div className="flex-1">
                        <input
                          placeholder="Nombre (ej: Poker)"
                          value={v.nombre}
                          onChange={(e) => {
                            const newVars = [...form.variantes]
                            newVars[idx].nombre = e.target.value
                            setForm({ ...form, variantes: newVars })
                          }}
                          className="w-full px-2 py-1.5 text-xs border border-cafe-beige rounded-md focus:outline-none focus:ring-1 focus:ring-cafe-medio bg-white"
                        />
                      </div>
                      <div className="w-24">
                        <input
                          type="number"
                          min="0"
                          placeholder="Stock"
                          value={v.stock}
                          onChange={(e) => {
                            const newVars = [...form.variantes]
                            newVars[idx].stock = e.target.value
                            setForm({ ...form, variantes: newVars })
                          }}
                          className="w-full px-2 py-1.5 text-xs border border-cafe-beige rounded-md focus:outline-none focus:ring-1 focus:ring-cafe-medio bg-white"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const newVars = form.variantes.filter((_, i) => i !== idx)
                          setForm({ ...form, variantes: newVars })
                        }}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <div className="flex justify-end pt-2 border-t border-cafe-beige/50">
                    <p className="text-xs font-semibold text-cafe-oscuro">
                      Stock Total: {form.variantes.reduce((sum, v) => sum + (parseInt(v.stock, 10) || 0), 0)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-cafe-claro uppercase tracking-wide mb-1">
                  Stock *
                </label>
                <input
                  name="stock"
                  type="number"
                  min="0"
                  value={form.stock}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 text-sm border border-cafe-beige rounded-lg focus:outline-none focus:ring-2 focus:ring-cafe-medio/30"
                />
              </div>
              <div /> {/* Spacer */}
            </div>
          )}

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold text-cafe-claro uppercase tracking-wide">
                Categoría
              </label>
              {!showNuevaCatInput && (
                <button
                  type="button"
                  onClick={() => setShowNuevaCatInput(true)}
                  className="text-[10px] text-cafe-medio hover:text-cafe-claro font-bold flex items-center gap-0.5"
                >
                  <Plus size={10} /> Nueva
                </button>
              )}
            </div>
            {showNuevaCatInput ? (
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="Nombre categoría..."
                  value={nuevaCatNombre}
                  onChange={(e) => setNuevaCatNombre(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 text-xs border border-cafe-beige rounded-lg focus:outline-none focus:ring-2 focus:ring-cafe-medio/30"
                />
                <button
                  type="button"
                  onClick={handleAgregarCategoria}
                  className="px-2.5 py-1.5 text-xs font-bold bg-cafe-medio text-white rounded-lg hover:bg-cafe-claro transition-colors"
                >
                  Agregar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNuevaCatInput(false)
                    setNuevaCatNombre('')
                  }}
                  className="px-2 py-1.5 text-xs font-semibold text-cafe-claro hover:bg-cafe-crema rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <select
                name="categoria"
                value={form.categoria}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-cafe-beige rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-cafe-medio/30"
              >
                <option value="">Seleccione...</option>
                {opcionesCategorias.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={cerrarModal}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Guardar Producto'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Modal Confirmar Eliminar ── */}
      <Modal
        isOpen={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        title="Confirmar Eliminación"
        maxWidth="max-w-sm"
      >
        <div className="text-center space-y-4 py-2">
          <div className="text-5xl">⚠️</div>
          <p className="text-cafe-oscuro">
            ¿Eliminar <strong>"{deleteModal?.nombre}"</strong>?
            Esta acción no se puede deshacer.
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <Button variant="secondary" onClick={() => setDeleteModal(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Sí, Eliminar
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Modal Gestionar Categorías ── */}
      <Modal
        isOpen={categoriasModalOpen}
        onClose={() => {
          setCategoriasModalOpen(false)
          setEditingCatName(null)
          setRenameCatVal('')
          setNewModalCatName('')
        }}
        title="Gestionar Categorías"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4 py-2">
          {/* Subformulario para agregar nueva categoría */}
          <form onSubmit={handleAgregarCategoriaDesdeModal} className="flex gap-2">
            <input
              type="text"
              placeholder="Nueva categoría..."
              value={newModalCatName}
              onChange={(e) => setNewModalCatName(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-cafe-beige rounded-lg focus:outline-none focus:ring-2 focus:ring-cafe-medio/30 bg-white text-cafe-oscuro"
            />
            <Button type="submit">Agregar</Button>
          </form>

          {/* Listado de categorías */}
          <div className="max-h-96 overflow-y-auto divide-y divide-cafe-beige/30 pr-1 scrollbar-thin">
            {opcionesCategorias.length === 0 ? (
              <p className="text-center text-xs text-cafe-claro py-4">No hay categorías registradas</p>
            ) : (
              opcionesCategorias.map((cat) => {
                const count = productos.filter((p) => p.categoria === cat).length
                const isEditing = editingCatName === cat

                return (
                  <div key={cat} className="flex items-center justify-between py-2.5">
                    {isEditing ? (
                      <div className="flex items-center gap-1.5 flex-1 pr-2">
                        <input
                          type="text"
                          value={renameCatVal}
                          onChange={(e) => setRenameCatVal(e.target.value)}
                          className="flex-1 px-2.5 py-1 text-xs border border-cafe-beige rounded-md focus:outline-none focus:ring-2 focus:ring-cafe-medio/30 bg-white text-cafe-oscuro"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleRenombrarCategoriaEnLote(cat, renameCatVal)}
                          className="px-2.5 py-1 text-[10px] font-bold bg-cafe-medio text-white rounded-md hover:bg-cafe-claro"
                        >
                          Guardar
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingCatName(null)}
                          className="px-2.5 py-1 text-[10px] font-semibold text-cafe-claro hover:bg-cafe-crema rounded-md"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-cafe-oscuro truncate">{cat}</p>
                          <p className="text-[10px] text-cafe-claro mt-0.5">{count} producto{count !== 1 ? 's' : ''}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCatName(cat)
                              setRenameCatVal(cat)
                            }}
                            className="p-1.5 rounded-lg text-cafe-claro hover:bg-cafe-crema hover:text-cafe-medio transition-colors"
                            title="Editar nombre"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => confirmarEliminarCategoria(cat)}
                            className="p-1.5 rounded-lg text-cafe-claro hover:bg-red-50 hover:text-red-500 transition-colors"
                            title="Eliminar categoría"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </Modal>

      {/* ── Modal Confirmar Eliminación Categoría ── */}
      <Modal
        isOpen={!!deleteCatConfirm}
        onClose={() => setDeleteCatConfirm(null)}
        title="Confirmar Eliminación de Categoría"
        maxWidth="max-w-sm"
      >
        <div className="text-center space-y-4 py-2">
          <div className="text-5xl">⚠️</div>
          <p className="text-cafe-oscuro">
            ¿Eliminar la categoría <strong>"{deleteCatConfirm}"</strong>?
            <br />
            <span className="text-sm text-cafe-claro">
              Los productos con esta categoría quedarán sin categoría asignada.
            </span>
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <Button variant="secondary" onClick={() => setDeleteCatConfirm(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleEliminarCategoriaEnLote}>
              Sí, Eliminar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Toast Notification */}
      {notificacion && (
        <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50 animate-in slide-in-from-bottom-5 ${
          notificacion.tipo === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {notificacion.tipo === 'success' ? <CheckCircle size={20} className="text-emerald-600" /> : <AlertCircle size={20} className="text-red-600" />}
          <p className="font-medium text-sm">{notificacion.mensaje}</p>
        </div>
      )}
    </PageContainer>
  )
}
