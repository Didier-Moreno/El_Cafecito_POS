import { useState, useMemo, useRef, useEffect } from 'react'
import {
  CreditCard, Users, DollarSign, CheckCircle2,
  ChevronDown, ChevronUp, Plus, Trash2, AlertCircle,
  CheckCircle, Phone, Calendar, Clock,
} from 'lucide-react'
import PageContainer from '../components/ui/PageContainer'
import StatCard from '../components/ui/StatCard'
import SearchBar from '../components/ui/SearchBar'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { useCreditos } from '../hooks/useCreditos'
import { formatPrecio } from '../utils/format'
import DateRangeSelector from '../components/reportes/DateRangeSelector'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatFecha(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function formatHora(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
}

// ── Badge de estado ───────────────────────────────────────────────────────────

function EstadoBadge({ estado }) {
  const map = {
    Pendiente: 'bg-amber-100 text-amber-700 border-amber-200',
    Pagado:    'bg-emerald-100 text-emerald-700 border-emerald-200',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${map[estado] ?? map.Pendiente}`}>
      {estado}
    </span>
  )
}

// ── Barra de progreso de saldo ────────────────────────────────────────────────

function ProgressBar({ total, saldo }) {
  const pagado = total - saldo
  const pct    = total > 0 ? Math.round((pagado / total) * 100) : 0
  return (
    <div className="w-full">
      <div className="flex justify-between text-[10px] text-cafe-claro mb-1">
        <span>Pagado: ${formatPrecio(pagado)}</span>
        <span>{pct}%</span>
      </div>
      <div className="w-full bg-cafe-beige/50 rounded-full h-1.5">
        <div
          className="h-1.5 rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: pct >= 100
              ? 'linear-gradient(90deg,#34d399,#10b981)'
              : 'linear-gradient(90deg,#b45309,#d97706)',
          }}
        />
      </div>
    </div>
  )
}

// ── Tarjeta de un crédito individual ─────────────────────────────────────────

function CreditoCard({ credito, onPagar, onEliminar }) {
  const [expanded, setExpanded] = useState(false)
  const pagos = credito.pagos_credito ?? []

  return (
    <div className={`rounded-xl border transition-all duration-200 overflow-hidden ${
      credito.estado === 'Pagado'
        ? 'border-emerald-200 bg-emerald-50/40'
        : 'border-cafe-beige bg-white hover:border-cafe-medio/40 hover:shadow-sm'
    }`}>
      {/* Cabecera del crédito */}
      <div className="px-4 py-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-cafe-oscuro">
              #{credito.id}
            </span>
            <EstadoBadge estado={credito.estado} />
            <span className="text-xs text-cafe-claro flex items-center gap-1">
              <Calendar size={11} /> {formatFecha(credito.created_at)}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-1.5">
            <span className="text-xs text-cafe-claro">
              Total: <strong className="text-cafe-oscuro">${formatPrecio(credito.total)}</strong>
            </span>
            {credito.estado === 'Pendiente' && (
              <span className="text-xs text-amber-700 font-semibold">
                Saldo: ${formatPrecio(credito.saldo_pendiente)}
              </span>
            )}
          </div>
          <div className="mt-2">
            <ProgressBar total={credito.total} saldo={credito.saldo_pendiente} />
          </div>
          {credito.nota && (
            <p className="text-[11px] text-cafe-claro mt-1 italic">{credito.nota}</p>
          )}
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {credito.estado === 'Pendiente' && (
            <button
              onClick={() => onPagar(credito)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cafe-medio text-white text-xs font-semibold hover:bg-cafe-oscuro transition-colors shadow-sm"
            >
              <DollarSign size={12} /> Abonar
            </button>
          )}
          <button
            onClick={() => onEliminar(credito)}
            className="p-1.5 rounded-lg text-cafe-claro hover:bg-red-50 hover:text-red-500 transition-colors"
            title="Eliminar crédito"
          >
            <Trash2 size={14} />
          </button>
          {pagos.length > 0 && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="p-1.5 rounded-lg text-cafe-claro hover:bg-cafe-crema transition-colors"
              title={expanded ? 'Ocultar pagos' : 'Ver pagos'}
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
        </div>
      </div>

      {/* Historial de pagos */}
      {expanded && pagos.length > 0 && (
        <div className="border-t border-cafe-beige/60 bg-cafe-crema/30 px-4 py-3 space-y-2">
          <p className="text-[10px] font-semibold text-cafe-claro uppercase tracking-wide mb-2">
            Historial de abonos
          </p>
          {[...pagos]
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .map((p) => (
            <div key={p.id} className="flex items-center justify-between text-xs bg-white rounded-lg px-3 py-2 border border-cafe-beige/40">
              <div className="flex items-center gap-2">
                <Clock size={11} className="text-cafe-claro" />
                <span className="text-cafe-claro">{formatFecha(p.created_at)} {formatHora(p.created_at)}</span>
                {p.nota && <span className="text-cafe-claro italic">· {p.nota}</span>}
              </div>
              <span className="font-bold text-emerald-700">+${formatPrecio(p.monto)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Tarjeta por cliente ───────────────────────────────────────────────────────

function ClienteSection({ cliente, creditos, onPagar, onEliminar }) {
  const [open, setOpen] = useState(true)
  const pendientes = creditos.filter((c) => c.estado === 'Pendiente')
  const saldoTotal = pendientes.reduce((s, c) => s + Number(c.saldo_pendiente), 0)

  return (
    <div className="rounded-2xl border border-cafe-beige bg-white shadow-sm overflow-hidden">
      {/* Header cliente */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-cafe-crema/30 transition-colors text-left"
      >
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cafe-medio to-cafe-oscuro flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-md">
          {cliente.nombre.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-cafe-oscuro truncate">{cliente.nombre}</p>
          {cliente.telefono && (
            <p className="text-xs text-cafe-claro flex items-center gap-1 mt-0.5">
              <Phone size={10} /> {cliente.telefono}
            </p>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          {saldoTotal > 0 ? (
            <p className="text-sm font-black text-amber-700">${formatPrecio(saldoTotal)}</p>
          ) : (
            <p className="text-sm font-bold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 size={14} /> Al día
            </p>
          )}
          <p className="text-[10px] text-cafe-claro mt-0.5">
            {creditos.length} crédito{creditos.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="ml-2 text-cafe-claro flex-shrink-0">
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* Lista de créditos */}
      {open && (
        <div className="px-4 pb-4 space-y-2 border-t border-cafe-beige/40 pt-3">
          {creditos.map((c) => (
            <CreditoCard
              key={c.id}
              credito={c}
              onPagar={onPagar}
              onEliminar={onEliminar}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function Creditos() {
  const { creditos, loading, error, pagar, eliminar } = useCreditos()

  // ── Rango de fechas mensual ──
  const [fechaInicio, setFechaInicio] = useState(null)
  const [fechaFin, setFechaFin]       = useState(null)

  // ── Filtros ──
  const [search, setSearch]         = useState('')
  const [filterEstado, setFilterEstado] = useState('Pendiente')

  // ── Modales ──
  const [pagoModal, setPagoModal]     = useState(null) // crédito seleccionado
  const [deleteModal, setDeleteModal] = useState(null) // crédito a eliminar
  const [pagoMonto, setPagoMonto]     = useState('')
  const [pagoNota, setPagoNota]       = useState('')
  const [pagoError, setPagoError]     = useState('')
  const [saving, setSaving]           = useState(false)

  // ── Notificaciones ──
  const [notificacion, setNotificacion] = useState(null)

  const mostrarNotificacion = (mensaje, tipo = 'success') => {
    setNotificacion({ mensaje, tipo })
    setTimeout(() => setNotificacion(null), 3500)
  }

  // ── Filtrado por mes (DateRangeSelector) ──
  const creditosMes = useMemo(() => {
    if (!fechaInicio || !fechaFin) return creditos
    const dInicio = new Date(fechaInicio)
    const dFin = new Date(fechaFin)
    return creditos.filter((c) => {
      if (!c.created_at) return false
      const dCredito = new Date(c.created_at)
      return dCredito >= dInicio && dCredito <= dFin
    })
  }, [creditos, fechaInicio, fechaFin])

  // Estadísticas locales del mes seleccionado
  const statsMes = useMemo(() => {
    const pendientes = creditosMes.filter((c) => c.estado === 'Pendiente')
    const clientesConDeuda = new Set(pendientes.map((c) => c.cliente_id)).size
    const totalAdeudado = pendientes.reduce((sum, c) => sum + Number(c.saldo_pendiente), 0)
    const totalCreditos = creditosMes.length
    const creditosPagados = creditosMes.filter((c) => c.estado === 'Pagado').length

    return { clientesConDeuda, totalAdeudado, totalCreditos, creditosPagados }
  }, [creditosMes])

  // ── Agrupación por cliente ──
  const creditosFiltrados = useMemo(() => {
    return creditosMes.filter((c) => {
      const nombre = c.clientes?.nombre ?? ''
      const matchSearch  = !search || nombre.toLowerCase().includes(search.toLowerCase())
      const matchEstado  = !filterEstado || c.estado === filterEstado
      return matchSearch && matchEstado
    })
  }, [creditosMes, search, filterEstado])

  const porCliente = useMemo(() => {
    const mapa = {}
    for (const c of creditosFiltrados) {
      const cid = c.cliente_id
      if (!mapa[cid]) {
        mapa[cid] = { cliente: c.clientes ?? { id: cid, nombre: 'Desconocido', telefono: null }, creditos: [] }
      }
      mapa[cid].creditos.push(c)
    }
    // Ordenar por saldo pendiente descendente
    return Object.values(mapa).sort((a, b) => {
      const sA = a.creditos.filter((x) => x.estado === 'Pendiente').reduce((s, x) => s + Number(x.saldo_pendiente), 0)
      const sB = b.creditos.filter((x) => x.estado === 'Pendiente').reduce((s, x) => s + Number(x.saldo_pendiente), 0)
      return sB - sA
    })
  }, [creditosFiltrados])

  // ── Handlers ──

  const abrirPago = (credito) => {
    setPagoModal(credito)
    setPagoMonto('')
    setPagoNota('')
    setPagoError('')
  }

  const handlePago = async (e) => {
    e.preventDefault()
    const monto = parseFloat(pagoMonto)
    if (!monto || monto <= 0) { setPagoError('Ingresa un monto válido.'); return }
    if (monto > parseFloat(pagoModal.saldo_pendiente)) {
      setPagoError(`El monto no puede superar el saldo pendiente ($${formatPrecio(pagoModal.saldo_pendiente)}).`)
      return
    }
    setSaving(true)
    setPagoError('')
    try {
      const resultado = await pagar(pagoModal.id, monto, pagoNota)
      setPagoModal(null)
      if (resultado.estado === 'Pagado') {
        mostrarNotificacion('¡Crédito pagado completamente! 🎉')
      } else {
        mostrarNotificacion(`Abono registrado. Saldo restante: $${formatPrecio(resultado.saldo_pendiente)}`)
      }
    } catch (err) {
      setPagoError(err?.response?.data?.detail ?? 'Error al registrar el pago.')
    } finally {
      setSaving(false)
    }
  }

  const handleEliminar = async () => {
    if (!deleteModal) return
    try {
      await eliminar(deleteModal.id)
      mostrarNotificacion('Crédito eliminado.')
    } catch {
      mostrarNotificacion('Error al eliminar el crédito.', 'error')
    } finally {
      setDeleteModal(null)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <PageContainer>
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-black text-cafe-oscuro">Créditos</h2>
          <p className="text-xs text-cafe-claro">Gestiona ventas a crédito y registra los pagos de tus clientes.</p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangeSelector onChange={(start, end) => {
            setFechaInicio(start)
            setFechaFin(end)
          }} />
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Clientes con deuda"
          value={statsMes.clientesConDeuda}
          color="cafe"
          onClick={() => setFilterEstado(filterEstado === 'Pendiente' ? '' : 'Pendiente')}
          active={filterEstado === 'Pendiente'}
        />
        <StatCard
          icon={DollarSign}
          label="Total adeudado"
          value={`$${formatPrecio(statsMes.totalAdeudado)}`}
          color="danger"
          onClick={() => setFilterEstado(filterEstado === 'Pendiente' ? '' : 'Pendiente')}
          active={filterEstado === 'Pendiente'}
        />
        <StatCard
          icon={CreditCard}
          label="Total créditos"
          value={statsMes.totalCreditos}
          color="warning"
          onClick={() => setFilterEstado('')}
          active={filterEstado === ''}
        />
        <StatCard
          icon={CheckCircle2}
          label="Pagados"
          value={statsMes.creditosPagados}
          color="success"
          onClick={() => setFilterEstado(filterEstado === 'Pagado' ? '' : 'Pagado')}
          active={filterEstado === 'Pagado'}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertCircle size={18} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Buscar cliente..."
          className="w-full sm:w-72"
        />
        <div className="flex gap-2">
          {['Pendiente', 'Pagado', ''].map((estado) => (
            <button
              key={estado || 'todos'}
              onClick={() => setFilterEstado(estado)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                filterEstado === estado
                  ? 'bg-cafe-medio text-white shadow-sm'
                  : 'bg-cafe-crema text-cafe-claro hover:bg-cafe-beige'
              }`}
            >
              {estado || 'Todos'}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de clientes y sus créditos */}
      {loading ? (
        <div className="text-center py-16 text-cafe-claro">Cargando créditos...</div>
      ) : porCliente.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-cafe-crema flex items-center justify-center">
            <CreditCard size={28} className="text-cafe-medio" />
          </div>
          <p className="text-cafe-claro text-sm text-center">
            {filterEstado === 'Pendiente'
              ? 'No hay créditos pendientes. ¡Todo al día! 🎉'
              : 'No se encontraron créditos.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {porCliente.map(({ cliente, creditos: creds }) => (
            <ClienteSection
              key={cliente.id}
              cliente={cliente}
              creditos={creds}
              onPagar={abrirPago}
              onEliminar={setDeleteModal}
            />
          ))}
        </div>
      )}

      {/* ── Modal Registrar Pago ── */}
      <Modal
        isOpen={!!pagoModal}
        onClose={() => setPagoModal(null)}
        title="Registrar Abono"
        maxWidth="max-w-sm"
      >
        {pagoModal && (
          <form onSubmit={handlePago} className="space-y-4">
            {/* Info del crédito */}
            <div className="bg-cafe-crema rounded-xl px-4 py-3 space-y-1">
              <p className="text-xs text-cafe-claro font-semibold uppercase tracking-wide">
                {pagoModal.clientes?.nombre ?? 'Cliente'}
              </p>
              <div className="flex justify-between">
                <span className="text-sm text-cafe-oscuro">Total crédito</span>
                <span className="font-semibold text-cafe-oscuro">${formatPrecio(pagoModal.total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-cafe-oscuro">Saldo pendiente</span>
                <span className="font-black text-amber-700">${formatPrecio(pagoModal.saldo_pendiente)}</span>
              </div>
            </div>

            {pagoError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {pagoError}
              </p>
            )}

            {/* Monto */}
            <div>
              <label className="block text-xs font-semibold text-cafe-claro uppercase tracking-wide mb-1">
                Monto del abono ($) *
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                max={pagoModal.saldo_pendiente}
                value={pagoMonto}
                onChange={(e) => setPagoMonto(e.target.value)}
                required
                autoFocus
                placeholder={`Máx. $${formatPrecio(pagoModal.saldo_pendiente)}`}
                className="w-full px-3 py-2 text-sm border border-cafe-beige rounded-lg focus:outline-none focus:ring-2 focus:ring-cafe-medio/30 focus:border-cafe-claro"
              />
              {/* Botón pago total */}
              <button
                type="button"
                onClick={() => setPagoMonto(String(pagoModal.saldo_pendiente))}
                className="mt-1.5 text-xs text-cafe-medio hover:text-cafe-oscuro underline"
              >
                Pagar saldo completo (${formatPrecio(pagoModal.saldo_pendiente)})
              </button>
            </div>

            {/* Nota opcional */}
            <div>
              <label className="block text-xs font-semibold text-cafe-claro uppercase tracking-wide mb-1">
                Nota (opcional)
              </label>
              <input
                type="text"
                value={pagoNota}
                onChange={(e) => setPagoNota(e.target.value)}
                placeholder="Ej: Pago efectivo"
                className="w-full px-3 py-2 text-sm border border-cafe-beige rounded-lg focus:outline-none focus:ring-2 focus:ring-cafe-medio/30"
              />
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <Button type="button" variant="secondary" onClick={() => setPagoModal(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Registrando...' : 'Registrar abono'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── Modal Confirmar Eliminar ── */}
      <Modal
        isOpen={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        title="Eliminar Crédito"
        maxWidth="max-w-sm"
      >
        <div className="text-center space-y-4 py-2">
          <div className="text-5xl">⚠️</div>
          <p className="text-cafe-oscuro text-sm">
            ¿Eliminar el crédito <strong>#{deleteModal?.id}</strong> de{' '}
            <strong>{deleteModal?.clientes?.nombre ?? 'este cliente'}</strong>?
            <br />
            <span className="text-cafe-claro">Esta acción no se puede deshacer.</span>
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <Button variant="secondary" onClick={() => setDeleteModal(null)}>Cancelar</Button>
            <Button variant="danger" onClick={handleEliminar}>Sí, Eliminar</Button>
          </div>
        </div>
      </Modal>

      {/* Toast Notification */}
      {notificacion && (
        <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 z-50 border ${
          notificacion.tipo === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-red-50 border-red-200 text-red-800'
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
