import { useState, useEffect } from 'react'
import {
  Wallet, ArrowDownCircle, ArrowUpCircle, RefreshCw,
  AlertCircle, CheckCircle2, TrendingDown, TrendingUp,
  DollarSign, ClipboardList, ChevronLeft, Save, Lock, Unlock, PlusCircle, MessageSquare
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import PageContainer from '../components/ui/PageContainer'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import { useFlujoCaja } from '../hooks/useFlujoCaja'
import { useClientes } from '../hooks/useClientes'
import { formatPrecio } from '../utils/format'
import { registrarDeudaAnterior } from '../services/api'

// ─── Sub-componente: Tarjeta de resumen ───────────────────────────────────────
function ResumenCard({ label, value, color = 'gray', icon: Icon, big = false }) {
  const colorMap = {
    green:  'bg-emerald-50 border-emerald-200 text-emerald-700',
    red:    'bg-red-50 border-red-200 text-red-700',
    blue:   'bg-blue-50 border-blue-200 text-blue-700',
    amber:  'bg-amber-50 border-amber-200 text-amber-700',
    cafe:   'bg-cafe-crema border-cafe-beige text-cafe-oscuro',
    gray:   'bg-gray-50 border-gray-200 text-gray-700',
  }
  const cls = colorMap[color] ?? colorMap.gray
  return (
    <div className={`rounded-2xl border p-5 ${cls} flex items-center gap-4`}>
      <div className="w-11 h-11 rounded-xl bg-white/60 flex items-center justify-center flex-shrink-0">
        <Icon size={20} strokeWidth={1.8} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
        <p className={`font-bold leading-none mt-0.5 ${big ? 'text-2xl' : 'text-xl'}`}>
          ${formatPrecio(value ?? 0)}
        </p>
      </div>
    </div>
  )
}

// ─── Sub-componente: Fila de movimiento ───────────────────────────────────────
function MovimientoRow({ mov }) {
  const esEntrada = mov.tipo === 'entrada'
  return (
    <tr className="hover:bg-cafe-crema/40 transition-colors">
      <td className="px-5 py-3 whitespace-nowrap">
        <span className={`inline-flex items-center gap-1.5 text-xs font-extrabold px-3 py-1 rounded-full border ${
          esEntrada
            ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
            : 'bg-red-100 border-red-300 text-red-800'
        }`}>
          {esEntrada
            ? <ArrowDownCircle size={13} className="text-emerald-700" />
            : <ArrowUpCircle size={13} className="text-red-700" />}
          {esEntrada ? 'Entrada' : 'Salida'}
        </span>
      </td>
      <td className="px-5 py-3 text-sm font-medium text-cafe-oscuro">{mov.descripcion}</td>
      <td className="px-5 py-3 text-xs text-cafe-claro whitespace-nowrap">{mov.hora ?? '—'}</td>
      <td className={`px-5 py-3 text-right font-black whitespace-nowrap ${
        esEntrada ? 'text-emerald-700' : 'text-red-700'
      }`}>
        {esEntrada ? '+' : '−'}${formatPrecio(mov.monto)}
      </td>
    </tr>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function FlujoCaja() {
  const navigate = useNavigate()
  const { data, loading, error, fecha, setFecha, refetch, guardarCaja, guardando } = useFlujoCaja()
  const { clientes } = useClientes()

  // Estado del formulario de apertura & cierre
  const [dineroInicial, setDineroInicial] = useState('')
  const [dineroContado, setDineroContado] = useState('')
  const [notaCaja, setNotaCaja]           = useState('')
  const [notificacion, setNotificacion]   = useState(null)

  // Estado para modal de Deuda Anterior
  const [modalDeudaOpen, setModalDeudaOpen] = useState(false)
  const [deudaNombre, setDeudaNombre]       = useState('')
  const [deudaMonto, setDeudaMonto]         = useState('')
  const [deudaNota, setDeudaNota]           = useState('')
  const [guardandoDeuda, setGuardandoDeuda] = useState(false)

  // Sincronizar campos con los datos del servidor cuando cambia la fecha
  useEffect(() => {
    if (data) {
      setDineroInicial(data.dinero_inicial != null ? String(data.dinero_inicial) : '0')
      setDineroContado(data.dinero_contado != null ? String(data.dinero_contado) : '')
      setNotaCaja(data.nota_caja ?? '')
    }
  }, [data])

  useEffect(() => {
    if (notificacion) {
      const t = setTimeout(() => setNotificacion(null), 4000)
      return () => clearTimeout(t)
    }
  }, [notificacion])

  const handleGuardarApertura = async () => {
    try {
      const payload = {
        fecha,
        dinero_inicial: parseFloat(dineroInicial) || 0,
        dinero_contado: dineroContado !== '' ? parseFloat(dineroContado) : null,
        nota: notaCaja || null,
      }
      await guardarCaja(payload)
      setNotificacion({ tipo: 'success', mensaje: 'Dinero inicial de apertura guardado correctamente.' })
    } catch (err) {
      const msg = err.response?.data?.detail || 'Error al guardar la apertura.'
      setNotificacion({ tipo: 'error', mensaje: msg })
    }
  }

  const handleGuardarCierre = async () => {
    try {
      const payload = {
        fecha,
        dinero_inicial: parseFloat(dineroInicial) || 0,
        dinero_contado: dineroContado !== '' ? parseFloat(dineroContado) : null,
        nota: notaCaja || null,
      }
      await guardarCaja(payload)
      setNotificacion({ tipo: 'success', mensaje: 'Cierre de caja y observaciones guardados correctamente.' })
    } catch (err) {
      const msg = err.response?.data?.detail || 'Error al guardar el cierre.'
      setNotificacion({ tipo: 'error', mensaje: msg })
    }
  }

  const handleGuardarDeudaAnterior = async (e) => {
    e.preventDefault()
    if (cajaCerrada) {
      setNotificacion({ tipo: 'error', mensaje: 'No se puede ingresar deuda anterior porque la caja ya se encuentra cerrada.' })
      return
    }
    const montoNum = parseFloat(deudaMonto)
    if (!deudaNombre.trim() || isNaN(montoNum) || montoNum <= 0) return

    setGuardandoDeuda(true)
    try {
      const cliExistente = clientes.find(
        c => c.nombre.toLowerCase() === deudaNombre.trim().toLowerCase()
      )

      await registrarDeudaAnterior({
        cliente_id: cliExistente ? cliExistente.id : null,
        cliente_nombre: deudaNombre.trim(),
        monto: montoNum,
        nota: deudaNota.trim() || 'Pago deuda anterior al sistema',
        fecha,
      })

      setNotificacion({
        tipo: 'success',
        mensaje: `Ingreso de $${formatPrecio(montoNum)} registrado correctamente como abono de ${deudaNombre.trim()}.`
      })

      setModalDeudaOpen(false)
      setDeudaNombre('')
      setDeudaMonto('')
      setDeudaNota('')
      refetch()
    } catch (err) {
      console.error(err)
      const msg = err.response?.data?.detail || 'Error al registrar el cobro de deuda anterior.'
      setNotificacion({ tipo: 'error', mensaje: msg })
    } finally {
      setGuardandoDeuda(false)
    }
  }

  // Valores calculados
  const inicial      = parseFloat(dineroInicial) || 0
  const entradas     = parseFloat(data?.total_entradas ?? 0)
  const salidas      = parseFloat(data?.total_salidas   ?? 0)
  const cajaEsperada = inicial + entradas - salidas
  const contado      = dineroContado !== '' ? parseFloat(dineroContado) : null
  const diferencia   = contado !== null ? contado - cajaEsperada : null

  const movimientos  = data?.movimientos ?? []
  const entradas_list = movimientos.filter(m => m.tipo === 'entrada')
  const salidas_list  = movimientos.filter(m => m.tipo === 'salida')

  const isHoy = fecha === new Date().toLocaleDateString('en-CA')
  const cajaCerrada = data?.dinero_contado != null
  const isSoloLectura = cajaCerrada && !isHoy


  return (
    <PageContainer>
      {/* ── Notificación ── */}
      {notificacion && (
        <div className={`mb-4 px-4 py-3 rounded-xl border flex items-center gap-3 text-sm transition-all ${
          notificacion.tipo === 'error'
            ? 'bg-red-50 border-red-200 text-red-700'
            : 'bg-emerald-50 border-emerald-200 text-emerald-700'
        }`}>
          {notificacion.tipo === 'error'
            ? <AlertCircle size={18} className="shrink-0" />
            : <CheckCircle2 size={18} className="shrink-0" />}
          <span>{notificacion.mensaje}</span>
        </div>
      )}

      {/* ── Encabezado ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/reportes')}
            className="p-2 rounded-xl border border-cafe-beige bg-white text-cafe-claro hover:text-cafe-oscuro hover:bg-cafe-crema transition-colors"
            title="Volver a Reportes"
          >
            <ChevronLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black text-cafe-oscuro flex items-center gap-2">
                <Wallet size={22} className="text-cafe-medio" />
                Flujo de Caja
              </h1>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
                cajaCerrada
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700'
              }`}>
                {cajaCerrada ? <Lock size={12} /> : <Unlock size={12} />}
                {cajaCerrada ? 'Caja Cerrada' : 'Caja Abierta'}
              </span>
            </div>
            <p className="text-sm text-cafe-claro">Movimientos de dinero en caja por día.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="px-3 py-2.5 border border-cafe-beige rounded-xl text-sm text-cafe-oscuro bg-white focus:outline-none focus:border-cafe-medio shadow-sm"
          />
          <button
            onClick={refetch}
            className="p-2.5 bg-white text-cafe-claro hover:text-cafe-oscuro rounded-xl border border-cafe-beige hover:bg-cafe-crema transition-colors shadow-sm"
            title="Sincronizar"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── Estado de carga / error ── */}
      {loading && !data ? (
        <div className="flex justify-center items-center py-24">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle size={22} className="shrink-0" />
          <div className="flex-1">
            <p className="font-bold text-sm">Error al cargar el flujo de caja</p>
            <p className="text-xs">{error}</p>
          </div>
          <button
            onClick={refetch}
            className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 text-xs font-bold rounded-lg transition-colors"
          >
            Reintentar
          </button>
        </div>
      ) : (
        <div className="relative space-y-6">
          {loading && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex justify-center items-center z-10 rounded-2xl">
              <LoadingSpinner />
            </div>
          )}

          {/* ── Panel Apertura de Caja ── */}
          <div className="bg-white rounded-2xl border border-cafe-beige overflow-hidden">
            <div className="px-6 py-4 border-b border-cafe-beige/60">
              <h2 className="text-sm font-bold text-cafe-oscuro flex items-center gap-1.5">
                <DollarSign size={15} className="text-cafe-medio" />
                Apertura de Caja
              </h2>
              <p className="text-xs text-cafe-claro mt-0.5">{fecha} · Registra el dinero base para iniciar la jornada</p>
            </div>
            <div className="p-6">
              <div className="flex flex-col sm:flex-row items-end gap-4 max-w-xl">
                <div className="flex-1 w-full">
                  <label className="block text-xs font-semibold text-cafe-claro uppercase tracking-wide mb-1.5">
                    Dinero Inicial en Caja
                  </label>
                  {cajaCerrada ? (
                    <div className="w-full px-3 py-2.5 border border-cafe-beige rounded-xl text-sm font-bold text-cafe-oscuro bg-cafe-crema/50 select-none">
                      ${formatPrecio(inicial)}
                    </div>
                  ) : (
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cafe-claro font-bold">$</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={dineroInicial}
                        onChange={(e) => setDineroInicial(e.target.value)}
                        placeholder="0"
                        className="w-full pl-7 pr-3 py-2.5 border border-cafe-beige rounded-xl text-sm text-cafe-oscuro bg-white focus:outline-none focus:border-cafe-medio transition-colors"
                      />
                    </div>
                  )}
                </div>
                {!cajaCerrada && (
                  <button
                    onClick={handleGuardarApertura}
                    disabled={guardando}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-cafe-medio hover:bg-cafe-oscuro disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
                  >
                    <Save size={15} />
                    {guardando ? 'Guardando...' : 'Guardar Apertura'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── Tarjetas de resumen ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <ResumenCard
              icon={DollarSign}
              label="Dinero Inicial"
              value={inicial}
              color="cafe"
            />
            <ResumenCard
              icon={TrendingUp}
              label="Total Entradas"
              value={entradas}
              color="green"
            />
            <ResumenCard
              icon={TrendingDown}
              label="Total Salidas"
              value={salidas}
              color="red"
            />
            <ResumenCard
              icon={Wallet}
              label="Caja Esperada"
              value={cajaEsperada}
              color="blue"
              big
            />
          </div>

          {/* ── Tabla de movimientos ── */}
          <div className="bg-white rounded-2xl border border-cafe-beige overflow-hidden">
            <div className="px-6 py-4 border-b border-cafe-beige/60 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ClipboardList size={16} className="text-cafe-medio" />
                <div>
                  <h2 className="text-sm font-bold text-cafe-oscuro">
                    Movimientos del Día
                  </h2>
                  <span className="text-xs text-cafe-claro">
                    {fecha} · {movimientos.length} {movimientos.length === 1 ? 'movimiento' : 'movimientos'}
                  </span>
                </div>
              </div>

              {/* Botón para ingresar dinero de deudas anteriores al sistema */}
              <button
                onClick={() => setModalDeudaOpen(true)}
                disabled={cajaCerrada || loading}
                title={cajaCerrada ? 'Caja cerrada: no es posible ingresar cobros de deudas anteriores' : 'Ingresar cobro de deuda anterior'}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl shadow-sm transition-all ${
                  cajaCerrada
                    ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed shadow-none'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white hover:scale-[1.02] active:scale-[0.98]'
                }`}
              >
                <PlusCircle size={16} />
                Ingresar Deuda Anterior
              </button>
            </div>

            {movimientos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-cafe-claro gap-2">
                <ClipboardList size={36} className="opacity-25" />
                <p className="text-sm font-medium">Sin movimientos para esta fecha</p>
                <p className="text-xs opacity-70">Registra el dinero inicial o cobros anteriores para empezar</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                {/* Sección Entradas */}
                {entradas_list.length > 0 && (
                  <>
                    <div className="px-5 py-2.5 bg-emerald-50 border-b border-emerald-100 flex items-center gap-2">
                      <ArrowDownCircle size={14} className="text-emerald-600" />
                      <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">
                        Entradas — ${formatPrecio(entradas)}
                      </span>
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-cafe-crema/50 border-b border-cafe-beige/60">
                          <th className="px-5 py-2.5 text-left text-xs font-semibold text-cafe-claro uppercase tracking-wider w-36">Tipo</th>
                          <th className="px-5 py-2.5 text-left text-xs font-semibold text-cafe-claro uppercase tracking-wider">Descripción</th>
                          <th className="px-5 py-2.5 text-left text-xs font-semibold text-cafe-claro uppercase tracking-wider w-28">Hora</th>
                          <th className="px-5 py-2.5 text-right text-xs font-semibold text-cafe-claro uppercase tracking-wider w-32">Monto</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-cafe-beige/40">
                        {entradas_list.map((mov, i) => <MovimientoRow key={`e-${i}`} mov={mov} />)}
                      </tbody>
                    </table>
                  </>
                )}

                {/* Sección Salidas */}
                {salidas_list.length > 0 && (
                  <>
                    <div className="px-5 py-2.5 bg-red-50 border-t border-b border-red-100 flex items-center gap-2">
                      <ArrowUpCircle size={14} className="text-red-600" />
                      <span className="text-xs font-bold text-red-700 uppercase tracking-wide">
                        Salidas — ${formatPrecio(salidas)}
                      </span>
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-cafe-crema/50 border-b border-cafe-beige/60">
                          <th className="px-5 py-2.5 text-left text-xs font-semibold text-cafe-claro uppercase tracking-wider w-36">Tipo</th>
                          <th className="px-5 py-2.5 text-left text-xs font-semibold text-cafe-claro uppercase tracking-wider">Descripción</th>
                          <th className="px-5 py-2.5 text-left text-xs font-semibold text-cafe-claro uppercase tracking-wider w-28">Hora</th>
                          <th className="px-5 py-2.5 text-right text-xs font-semibold text-cafe-claro uppercase tracking-wider w-32">Monto</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-cafe-beige/40">
                        {salidas_list.map((mov, i) => <MovimientoRow key={`s-${i}`} mov={mov} />)}
                      </tbody>
                    </table>
                  </>
                )}
              </div>
            )}
          </div>

          {/* ── Panel de Cierre de Caja ── */}
          <div className="bg-white rounded-2xl border border-cafe-beige overflow-hidden">
            <div className="px-6 py-4 border-b border-cafe-beige/60">
              <h2 className="text-sm font-bold text-cafe-oscuro flex items-center gap-1.5">
                <Lock size={15} className="text-cafe-medio" />
                Cierre de Caja
              </h2>
              <p className="text-xs text-cafe-claro mt-0.5">
                Ingresa el dinero contado físicamente al final del día y registra observaciones o motivos de descuadre.
              </p>
            </div>
            <div className="p-6 space-y-4">
              {isSoloLectura ? (
                <div className="bg-cafe-crema/30 rounded-xl border border-cafe-beige p-5 text-center">
                  <p className="text-sm text-cafe-oscuro font-medium">El cierre de caja para esta fecha ya fue guardado y no es modificable.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Caja esperada (solo lectura) */}
                    <div>
                      <label className="block text-xs font-semibold text-cafe-claro uppercase tracking-wide mb-1.5">
                        Caja Esperada
                      </label>
                      <div className="w-full px-3 py-2.5 border border-cafe-beige rounded-xl text-sm font-bold text-cafe-oscuro bg-cafe-crema/50 select-none">
                        ${formatPrecio(cajaEsperada)}
                      </div>
                    </div>

                    {/* Dinero contado */}
                    <div>
                      <label className="block text-xs font-semibold text-cafe-claro uppercase tracking-wide mb-1.5">
                        Dinero Contado Físicamente
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cafe-claro font-bold">$</span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={dineroContado}
                          onChange={(e) => setDineroContado(e.target.value)}
                          placeholder="0"
                          className="w-full pl-7 pr-3 py-2.5 border border-cafe-beige rounded-xl text-sm text-cafe-oscuro bg-white focus:outline-none focus:border-cafe-medio transition-colors"
                        />
                      </div>
                    </div>

                    {/* Diferencia */}
                    <div>
                      <label className="block text-xs font-semibold text-cafe-claro uppercase tracking-wide mb-1.5">
                        Diferencia
                      </label>
                      <div className={`w-full px-3 py-2.5 border rounded-xl text-sm font-bold select-none ${
                        diferencia === null
                          ? 'border-cafe-beige bg-cafe-crema/50 text-cafe-claro'
                          : diferencia === 0
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : diferencia > 0
                              ? 'border-blue-200 bg-blue-50 text-blue-700'
                              : 'border-red-200 bg-red-50 text-red-700'
                      }`}>
                        {diferencia === null
                          ? '—'
                          : `${diferencia >= 0 ? '+' : ''}$${formatPrecio(Math.abs(diferencia))}`}
                      </div>
                    </div>
                  </div>

                  {/* Nota / Observación de Cierre */}
                  <div>
                    <label className="block text-xs font-semibold text-cafe-claro uppercase tracking-wide mb-1.5 flex items-center gap-1">
                      <MessageSquare size={13} className="text-cafe-medio" />
                      Nota / Registro de Descuadre u Observaciones del Cierre
                    </label>
                    <input
                      type="text"
                      value={notaCaja}
                      onChange={(e) => setNotaCaja(e.target.value)}
                      placeholder="Ej: Faltante de $2.000 por cambio mal entregado / billete roto guardado"
                      className="w-full px-3.5 py-2.5 border border-cafe-beige rounded-xl text-sm text-cafe-oscuro bg-white focus:outline-none focus:border-cafe-medio transition-colors"
                    />
                  </div>

                  {/* Botón guardar cierre */}
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleGuardarCierre}
                      disabled={guardando}
                      className="flex items-center justify-center gap-2 px-6 py-2.5 bg-cafe-medio hover:bg-cafe-oscuro disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
                    >
                      <Save size={15} />
                      {guardando ? 'Guardando Cierre...' : 'Guardar Cierre de Caja'}
                    </button>
                  </div>
                </>
              )}

              {/* Resumen visual del cierre */}
              {contado !== null && (
                <div className={`mt-4 p-4 rounded-xl border text-sm ${
                  diferencia === 0
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : diferencia < 0
                      ? 'bg-red-50 border-red-200 text-red-800'
                      : 'bg-blue-50 border-blue-200 text-blue-800'
                }`}>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xs opacity-70 mb-1">Caja esperada</p>
                      <p className="font-bold text-base">${formatPrecio(cajaEsperada)}</p>
                    </div>
                    <div>
                      <p className="text-xs opacity-70 mb-1">Dinero contado</p>
                      <p className="font-bold text-base">${formatPrecio(contado)}</p>
                    </div>
                    <div>
                      <p className="text-xs opacity-70 mb-1">Diferencia</p>
                      <p className="font-bold text-base">
                        {diferencia >= 0 ? '+' : ''}${formatPrecio(Math.abs(diferencia))}
                      </p>
                    </div>
                  </div>
                  {diferencia !== 0 && (
                    <p className="text-xs mt-3 text-center opacity-80">
                      {diferencia < 0
                        ? `⚠️ Hay un faltante de $${formatPrecio(Math.abs(diferencia))} en caja.`
                        : `ℹ️ Hay un sobrante de $${formatPrecio(diferencia)} en caja.`}
                    </p>
                  )}
                  {notaCaja && (
                    <div className="mt-3 pt-2 border-t border-current/10 text-xs flex items-center gap-1.5">
                      <MessageSquare size={13} className="shrink-0" />
                      <span><strong>Nota de registro:</strong> {notaCaja}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Ingresar Deuda Anterior ── */}
      <Modal
        isOpen={modalDeudaOpen}
        onClose={() => setModalDeudaOpen(false)}
        title="Ingresar Pago de Deuda Anterior"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleGuardarDeudaAnterior} className="space-y-4">
          <p className="text-xs text-cafe-claro">
            Registra el cobro de una deuda correspondiente a meses anteriores (antes de usar el sistema).
            Aparecerá como entrada de caja para el día <strong className="text-cafe-oscuro">{fecha}</strong>.
          </p>

          <div>
            <label className="block text-xs font-semibold text-cafe-claro uppercase tracking-wide mb-1">
              Nombre de la Persona
            </label>
            <input
              type="text"
              required
              list="clientes-list"
              value={deudaNombre}
              onChange={(e) => setDeudaNombre(e.target.value)}
              placeholder="Ej: Don Pedro"
              className="w-full px-3 py-2.5 border border-cafe-beige rounded-xl text-sm text-cafe-oscuro bg-white focus:outline-none focus:border-cafe-medio"
            />
            <datalist id="clientes-list">
              {clientes.map(c => (
                <option key={c.id} value={c.nombre} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-xs font-semibold text-cafe-claro uppercase tracking-wide mb-1">
              Monto Recibido ($)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cafe-claro font-bold">$</span>
              <input
                type="number"
                required
                min="1"
                step="any"
                value={deudaMonto}
                onChange={(e) => setDeudaMonto(e.target.value)}
                placeholder="Ej: 50000"
                className="w-full pl-7 pr-3 py-2.5 border border-cafe-beige rounded-xl text-sm text-cafe-oscuro bg-white focus:outline-none focus:border-cafe-medio"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-cafe-claro uppercase tracking-wide mb-1">
              Nota u Observación (opcional)
            </label>
            <input
              type="text"
              value={deudaNota}
              onChange={(e) => setDeudaNota(e.target.value)}
              placeholder="Ej: Saldo pendiente mes anterior"
              className="w-full px-3 py-2.5 border border-cafe-beige rounded-xl text-sm text-cafe-oscuro bg-white focus:outline-none focus:border-cafe-medio"
            />
          </div>

          <div className="flex gap-3 justify-end pt-3 border-t border-cafe-beige">
            <Button
              variant="ghost"
              type="button"
              onClick={() => setModalDeudaOpen(false)}
              disabled={guardandoDeuda}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={guardandoDeuda}
            >
              {guardandoDeuda ? 'Registrando...' : 'Registrar Ingreso'}
            </Button>
          </div>
        </form>
      </Modal>
    </PageContainer>
  )
}
