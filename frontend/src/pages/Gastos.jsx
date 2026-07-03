import { useState, useMemo, useRef, useEffect } from 'react'
import {
  DollarSign, Clock, CheckCircle2, AlertTriangle, Plus, Pencil, Trash2,
  AlertCircle, CheckCircle, MoreVertical, Eye, Copy, BadgeDollarSign,
  XCircle,
} from 'lucide-react'
import PageContainer from '../components/ui/PageContainer'
import StatCard from '../components/ui/StatCard'
import SearchBar from '../components/ui/SearchBar'
import Table from '../components/ui/Table'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { useGastos, getEstadoEfectivo, getDiasParaVencer } from '../hooks/useGastos'
import { formatPrecio } from '../utils/format'

// ── Constantes ────────────────────────────────────────────────────────────────

const CATEGORIAS_GASTO = ['Proveedores', 'Servicios', 'Nómina', 'Arriendo', 'Impuestos', 'Otros']
const ESTADOS = ['Pendiente', 'Pagado', 'Cancelado']

const EMPTY_FORM = {
  concepto: '',
  proveedor: '',
  categoria: '',
  valor: '',
  fecha_gasto: new Date().toISOString().slice(0, 10),
  fecha_pago: '',
  estado: 'Pendiente',
  observaciones: '',
}

// ── Badge de estado ───────────────────────────────────────────────────────────

function EstadoBadge({ estado }) {
  const map = {
    Pendiente: 'bg-amber-100 text-amber-700 border-amber-200',
    Pagado:    'bg-emerald-100 text-emerald-700 border-emerald-200',
    Cancelado: 'bg-gray-100 text-gray-500 border-gray-200',
    Vencido:   'bg-red-100 text-red-600 border-red-200',
  }
  const cls = map[estado] ?? map.Pendiente
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
      {estado}
    </span>
  )
}

// ── Indicador visual de proximidad ────────────────────────────────────────────

function VencimientoIndicador({ gasto }) {
  const dias = getDiasParaVencer(gasto)
  if (dias === null) return null
  if (dias < 0) {
    return (
      <span className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full border border-red-200">
        <AlertCircle size={10} /> Vencido
      </span>
    )
  }
  if (dias <= 3) {
    return (
      <span className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full border border-orange-200">
        <AlertCircle size={10} /> {dias === 0 ? 'Hoy' : `${dias}d`}
      </span>
    )
  }
  return null
}

// ── Menú de tres puntos por fila ──────────────────────────────────────────────

function AccionesMenu({ row, onVer, onEditar, onMarcarPagado, onDuplicar, onEliminar }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const estadoEfectivo = getEstadoEfectivo(row)

  return (
    <div ref={ref} className="relative flex justify-end">
      <button
        onClick={() => setOpen((v) => !v)}
        className="p-1.5 rounded-lg text-cafe-claro hover:bg-cafe-crema hover:text-cafe-medio transition-colors"
        title="Acciones"
      >
        <MoreVertical size={15} />
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-20 bg-white rounded-xl shadow-xl border border-cafe-beige w-44 py-1 overflow-hidden">
          <MenuItem icon={Eye} label="Ver detalle" onClick={() => { onVer(row); setOpen(false) }} />
          <MenuItem icon={Pencil} label="Editar" onClick={() => { onEditar(row); setOpen(false) }} />
          {estadoEfectivo !== 'Pagado' && (
            <MenuItem icon={CheckCircle2} label="Marcar pagado" onClick={() => { onMarcarPagado(row); setOpen(false) }} className="text-emerald-600" />
          )}
          <MenuItem icon={Copy} label="Duplicar" onClick={() => { onDuplicar(row); setOpen(false) }} />
          <div className="my-1 border-t border-cafe-beige/60" />
          <MenuItem icon={Trash2} label="Eliminar" onClick={() => { onEliminar(row); setOpen(false) }} className="text-red-500 hover:bg-red-50" />
        </div>
      )}
    </div>
  )
}

function MenuItem({ icon: Icon, label, onClick, className = '' }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-cafe-oscuro hover:bg-cafe-crema transition-colors ${className}`}
    >
      <Icon size={14} />
      {label}
    </button>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function Gastos() {
  const { gastos, loading, error, stats, crear, actualizar, eliminar, marcarPagado, duplicar } = useGastos()

  // ── Búsqueda y filtros ──────────────────────────────────────────────────────
  const [search, setSearch]         = useState('')
  const [filterEstado, setFilterEstado] = useState('')
  const [filterCat, setFilterCat]   = useState('')
  const [sortBy, setSortBy]         = useState('reciente')
  const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'desc' })

  // ── Modales ─────────────────────────────────────────────────────────────────
  const [modalOpen, setModalOpen]       = useState(false)
  const [detalleModal, setDetalleModal] = useState(null)
  const [deleteModal, setDeleteModal]   = useState(null)
  const [editingId, setEditingId]       = useState(null)
  const [form, setForm]                 = useState(EMPTY_FORM)
  const [saving, setSaving]             = useState(false)
  const [formError, setFormError]       = useState('')

  // ── Notificaciones ──────────────────────────────────────────────────────────
  const [notificacion, setNotificacion] = useState(null)

  const mostrarNotificacion = (mensaje, tipo = 'success') => {
    setNotificacion({ mensaje, tipo })
    setTimeout(() => setNotificacion(null), 3000)
  }

  // ── Filtrado y ordenamiento ─────────────────────────────────────────────────
  const gastosFiltrados = useMemo(() => {
    let lista = gastos.filter((g) => {
      const estadoEfectivo = getEstadoEfectivo(g)
      const matchSearch = !search ||
        g.concepto?.toLowerCase().includes(search.toLowerCase()) ||
        g.proveedor?.toLowerCase().includes(search.toLowerCase()) ||
        g.categoria?.toLowerCase().includes(search.toLowerCase())
      const matchEstado = !filterEstado || estadoEfectivo === filterEstado
      const matchCat = !filterCat || g.categoria === filterCat
      return matchSearch && matchEstado && matchCat
    })

    // Ordenar
    lista = [...lista].sort((a, b) => {
      if (sortBy === 'reciente') return b.id - a.id
      if (sortBy === 'antiguo') return a.id - b.id
      if (sortBy === 'mayor_valor') return Number(b.valor) - Number(a.valor)
      if (sortBy === 'menor_valor') return Number(a.valor) - Number(b.valor)
      if (sortBy === 'proxima_fecha') {
        const fa = a.fecha_pago ? new Date(a.fecha_pago) : new Date('9999-12-31')
        const fb = b.fecha_pago ? new Date(b.fecha_pago) : new Date('9999-12-31')
        return fa - fb
      }
      // Ordenamiento por columna de tabla
      let aVal = a[sortConfig.key]
      let bVal = b[sortConfig.key]
      if (aVal === null || aVal === undefined) aVal = ''
      if (bVal === null || bVal === undefined) bVal = ''
      if (typeof aVal === 'string') aVal = aVal.toLowerCase()
      if (typeof bVal === 'string') bVal = bVal.toLowerCase()
      return sortConfig.direction === 'asc'
        ? (aVal < bVal ? -1 : aVal > bVal ? 1 : 0)
        : (aVal > bVal ? -1 : aVal < bVal ? 1 : 0)
    })

    return lista
  }, [gastos, search, filterEstado, filterCat, sortBy, sortConfig])

  const handleSort = (key) => {
    setSortBy('col')
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  // ── Formulario ──────────────────────────────────────────────────────────────
  const abrirNuevo = () => {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setFormError('')
    setModalOpen(true)
  }

  const abrirEditar = (gasto) => {
    setForm({
      concepto:      gasto.concepto     ?? '',
      proveedor:     gasto.proveedor    ?? '',
      categoria:     gasto.categoria    ?? '',
      valor:         gasto.valor        ?? '',
      fecha_gasto:   gasto.fecha_gasto  ?? new Date().toISOString().slice(0, 10),
      fecha_pago:    gasto.fecha_pago   ?? '',
      estado:        gasto.estado       ?? 'Pendiente',
      observaciones: gasto.observaciones ?? '',
    })
    setEditingId(gasto.id)
    setFormError('')
    setModalOpen(true)
  }

  const cerrarModal = () => {
    setModalOpen(false)
    setForm(EMPTY_FORM)
    setEditingId(null)
  }

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.concepto || !form.categoria || form.valor === '') {
      setFormError('Concepto, categoría y valor son obligatorios.')
      return
    }
    setSaving(true)
    setFormError('')
    try {
      const payload = {
        concepto:      form.concepto,
        proveedor:     form.proveedor || null,
        categoria:     form.categoria,
        valor:         parseFloat(form.valor),
        fecha_gasto:   form.fecha_gasto || null,
        fecha_pago:    form.fecha_pago || null,
        estado:        form.estado,
        observaciones: form.observaciones || null,
      }
      if (editingId) {
        await actualizar(editingId, payload)
        mostrarNotificacion('¡Gasto actualizado con éxito!')
      } else {
        await crear(payload)
        mostrarNotificacion('¡Gasto registrado con éxito!')
      }
      cerrarModal()
    } catch {
      setFormError('Ocurrió un error al guardar. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  // ── Acciones de fila ────────────────────────────────────────────────────────
  const handleMarcarPagado = async (gasto) => {
    try {
      await marcarPagado(gasto.id)
      mostrarNotificacion('¡Gasto marcado como pagado!')
    } catch {
      mostrarNotificacion('Error al actualizar el gasto.', 'error')
    }
  }

  const handleDuplicar = async (gasto) => {
    try {
      await duplicar(gasto)
      mostrarNotificacion('¡Gasto duplicado con éxito!')
    } catch {
      mostrarNotificacion('Error al duplicar el gasto.', 'error')
    }
  }

  const handleDelete = async () => {
    if (!deleteModal) return
    try {
      await eliminar(deleteModal.id)
      mostrarNotificacion('¡Gasto eliminado con éxito!')
    } finally {
      setDeleteModal(null)
    }
  }

  // ── Columnas de tabla ───────────────────────────────────────────────────────
  const columns = [
    {
      key: 'concepto',
      label: 'Concepto',
      sortable: true,
      render: (v, row) => (
        <div>
          <p className="font-semibold text-cafe-oscuro">{v}</p>
          {row.proveedor && (
            <p className="text-[11px] text-cafe-claro mt-0.5">{row.proveedor}</p>
          )}
        </div>
      ),
    },
    {
      key: 'proveedor',
      label: 'Proveedor',
      sortable: true,
      render: (v) => v ? (
        <span className="text-sm text-cafe-oscuro">{v}</span>
      ) : (
        <span className="text-cafe-beige">—</span>
      ),
    },
    {
      key: 'categoria',
      label: 'Categoría',
      sortable: true,
      render: (v) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-cafe-crema text-cafe-claro border border-cafe-beige">
          {v}
        </span>
      ),
    },
    {
      key: 'valor',
      label: 'Valor',
      sortable: true,
      render: (v) => <span className="font-semibold text-cafe-oscuro">${formatPrecio(v)}</span>,
    },
    {
      key: 'fecha_pago',
      label: 'Fecha de pago',
      sortable: true,
      render: (v, row) => {
        if (!v) return <span className="text-cafe-beige">—</span>
        const formatted = new Date(v + 'T00:00:00').toLocaleDateString('es-CO', {
          day: '2-digit', month: 'short', year: 'numeric',
        })
        return (
          <div className="flex items-center flex-wrap gap-x-1">
            <span className="text-sm text-cafe-oscuro">{formatted}</span>
            <VencimientoIndicador gasto={row} />
          </div>
        )
      },
    },
    {
      key: 'estado',
      label: 'Estado',
      sortable: true,
      render: (_, row) => <EstadoBadge estado={getEstadoEfectivo(row)} />,
    },
  ]

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <PageContainer>
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={DollarSign}
          label="Total Gastos"
          value={stats.total}
          color="cafe"
        />
        <StatCard
          icon={Clock}
          label="Pendientes"
          value={stats.pendientes}
          color="warning"
          onClick={() => setFilterEstado(filterEstado === 'Pendiente' ? '' : 'Pendiente')}
          active={filterEstado === 'Pendiente'}
        />
        <StatCard
          icon={CheckCircle2}
          label="Pagados"
          value={stats.pagados}
          color="success"
          onClick={() => setFilterEstado(filterEstado === 'Pagado' ? '' : 'Pagado')}
          active={filterEstado === 'Pagado'}
        />
        <StatCard
          icon={BadgeDollarSign}
          label="Valor Pendiente"
          value={`$${formatPrecio(stats.valorPendiente)}`}
          color="danger"
        />
      </div>

      {/* Alerta por gastos vencidos */}
      {(() => {
        const vencidos = gastos.filter((g) => getEstadoEfectivo(g) === 'Vencido').length
        return vencidos > 0 ? (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <AlertCircle size={18} className="text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">
              <strong>{vencidos}</strong> gasto{vencidos !== 1 ? 's' : ''} vencido{vencidos !== 1 ? 's' : ''}.
              Revísalos y actualiza su estado cuanto antes.
            </p>
          </div>
        ) : null
      })()}

      {/* Error del backend */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertCircle size={18} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
        {/* Buscador */}
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Buscar por concepto, proveedor o categoría..."
          className="w-full sm:w-72"
        />

        {/* Filtro Estado */}
        <select
          value={filterEstado}
          onChange={(e) => setFilterEstado(e.target.value)}
          className="text-sm border border-cafe-beige rounded-lg px-3 py-2 bg-white text-cafe-oscuro focus:outline-none focus:ring-2 focus:ring-cafe-medio/30"
        >
          <option value="">Todos los estados</option>
          <option value="Pendiente">Pendiente</option>
          <option value="Pagado">Pagado</option>
          <option value="Cancelado">Cancelado</option>
          <option value="Vencido">Vencido</option>
        </select>

        {/* Filtro Categoría */}
        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className="text-sm border border-cafe-beige rounded-lg px-3 py-2 bg-white text-cafe-oscuro focus:outline-none focus:ring-2 focus:ring-cafe-medio/30"
        >
          <option value="">Todas las categorías</option>
          {CATEGORIAS_GASTO.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        {/* Ordenar por */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="text-sm border border-cafe-beige rounded-lg px-3 py-2 bg-white text-cafe-oscuro focus:outline-none focus:ring-2 focus:ring-cafe-medio/30"
        >
          <option value="reciente">Más reciente</option>
          <option value="antiguo">Más antiguo</option>
          <option value="mayor_valor">Mayor valor</option>
          <option value="menor_valor">Menor valor</option>
          <option value="proxima_fecha">Próxima fecha de pago</option>
        </select>

        <div className="sm:ml-auto">
          <Button icon={Plus} onClick={abrirNuevo}>
            Nuevo Gasto
          </Button>
        </div>
      </div>

      {/* Tabla */}
      <Table
        columns={columns}
        data={gastosFiltrados}
        loading={loading}
        emptyMessage="No hay gastos registrados"
        sortConfig={sortConfig}
        onSort={handleSort}
        actions={(row) => (
          <AccionesMenu
            row={row}
            onVer={setDetalleModal}
            onEditar={abrirEditar}
            onMarcarPagado={handleMarcarPagado}
            onDuplicar={handleDuplicar}
            onEliminar={setDeleteModal}
          />
        )}
      />

      {/* ── Modal Formulario ── */}
      <Modal
        isOpen={modalOpen}
        onClose={cerrarModal}
        title={editingId ? 'Editar Gasto' : 'Nuevo Gasto'}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {formError}
            </p>
          )}

          {/* Concepto */}
          <div>
            <label className="block text-xs font-semibold text-cafe-claro uppercase tracking-wide mb-1">
              Concepto *
            </label>
            <input
              name="concepto"
              value={form.concepto}
              onChange={handleChange}
              placeholder="Ej: Compra de café en grano"
              required
              className="w-full px-3 py-2 text-sm border border-cafe-beige rounded-lg focus:outline-none focus:ring-2 focus:ring-cafe-medio/30 focus:border-cafe-claro"
            />
          </div>

          {/* Proveedor / Categoría */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-cafe-claro uppercase tracking-wide mb-1">
                Proveedor
              </label>
              <input
                name="proveedor"
                value={form.proveedor}
                onChange={handleChange}
                placeholder="Ej: Distribuidora X"
                className="w-full px-3 py-2 text-sm border border-cafe-beige rounded-lg focus:outline-none focus:ring-2 focus:ring-cafe-medio/30"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-cafe-claro uppercase tracking-wide mb-1">
                Categoría *
              </label>
              <select
                name="categoria"
                value={form.categoria}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 text-sm border border-cafe-beige rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-cafe-medio/30"
              >
                <option value="">Seleccione...</option>
                {CATEGORIAS_GASTO.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Valor / Estado */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-cafe-claro uppercase tracking-wide mb-1">
                Valor ($) *
              </label>
              <input
                name="valor"
                type="number"
                min="0"
                step="0.01"
                value={form.valor}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 text-sm border border-cafe-beige rounded-lg focus:outline-none focus:ring-2 focus:ring-cafe-medio/30"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-cafe-claro uppercase tracking-wide mb-1">
                Estado
              </label>
              <select
                name="estado"
                value={form.estado}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-cafe-beige rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-cafe-medio/30"
              >
                {ESTADOS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Fecha gasto / Fecha pago */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-cafe-claro uppercase tracking-wide mb-1">
                Fecha del gasto
              </label>
              <input
                name="fecha_gasto"
                type="date"
                value={form.fecha_gasto}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-cafe-beige rounded-lg focus:outline-none focus:ring-2 focus:ring-cafe-medio/30"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-cafe-claro uppercase tracking-wide mb-1">
                Fecha de pago
              </label>
              <input
                name="fecha_pago"
                type="date"
                value={form.fecha_pago}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-cafe-beige rounded-lg focus:outline-none focus:ring-2 focus:ring-cafe-medio/30"
              />
            </div>
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-xs font-semibold text-cafe-claro uppercase tracking-wide mb-1">
              Observaciones
            </label>
            <textarea
              name="observaciones"
              value={form.observaciones}
              onChange={handleChange}
              rows={3}
              placeholder="Notas adicionales..."
              className="w-full px-3 py-2 text-sm border border-cafe-beige rounded-lg focus:outline-none focus:ring-2 focus:ring-cafe-medio/30 resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={cerrarModal}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Guardar Gasto'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Modal Ver Detalle ── */}
      <Modal
        isOpen={!!detalleModal}
        onClose={() => setDetalleModal(null)}
        title="Detalle del Gasto"
        maxWidth="max-w-md"
      >
        {detalleModal && (
          <div className="space-y-3 py-1">
            <DetalleRow label="Concepto"       value={detalleModal.concepto} />
            <DetalleRow label="Proveedor"      value={detalleModal.proveedor || '—'} />
            <DetalleRow label="Categoría"      value={detalleModal.categoria} />
            <DetalleRow label="Valor"          value={`$${formatPrecio(detalleModal.valor)}`} />
            <DetalleRow label="Fecha gasto"    value={detalleModal.fecha_gasto || '—'} />
            <DetalleRow label="Fecha de pago"  value={detalleModal.fecha_pago || '—'} />
            <div className="flex items-center justify-between py-2 border-b border-cafe-beige/40">
              <span className="text-xs text-cafe-claro font-medium uppercase tracking-wide">Estado</span>
              <EstadoBadge estado={getEstadoEfectivo(detalleModal)} />
            </div>
            {detalleModal.observaciones && (
              <div>
                <p className="text-xs text-cafe-claro font-medium uppercase tracking-wide mb-1">Observaciones</p>
                <p className="text-sm text-cafe-oscuro bg-cafe-crema rounded-lg px-3 py-2">{detalleModal.observaciones}</p>
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setDetalleModal(null)}>Cerrar</Button>
              <Button onClick={() => { abrirEditar(detalleModal); setDetalleModal(null) }}>Editar</Button>
            </div>
          </div>
        )}
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
            ¿Eliminar el gasto <strong>"{deleteModal?.concepto}"</strong>?
            Esta acción no se puede deshacer.
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <Button variant="secondary" onClick={() => setDeleteModal(null)}>Cancelar</Button>
            <Button variant="danger" onClick={handleDelete}>Sí, Eliminar</Button>
          </div>
        </div>
      </Modal>

      {/* Toast Notification */}
      {notificacion && (
        <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50 ${
          notificacion.tipo === 'success'
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {notificacion.tipo === 'success'
            ? <CheckCircle size={20} className="text-emerald-600" />
            : <AlertCircle size={20} className="text-red-600" />
          }
          <p className="font-medium text-sm">{notificacion.mensaje}</p>
        </div>
      )}
    </PageContainer>
  )
}

function DetalleRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-cafe-beige/40">
      <span className="text-xs text-cafe-claro font-medium uppercase tracking-wide">{label}</span>
      <span className="text-sm font-semibold text-cafe-oscuro text-right max-w-[60%] truncate">{value}</span>
    </div>
  )
}
