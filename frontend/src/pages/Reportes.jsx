import { useState, useEffect } from 'react'
import { ShoppingCart, Clock, Star, TrendingUp, AlertCircle, RefreshCw, Trash2 } from 'lucide-react'
import PageContainer from '../components/ui/PageContainer'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import StatCard from '../components/ui/StatCard'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import { useReporteOperacional } from '../hooks/useReporteOperacional'
import { formatPrecio } from '../utils/format'
import { deleteVenta } from '../services/api'

export default function Reportes() {
  const { data, loading, error, fecha, setFecha, refetch } = useReporteOperacional()

  // ── Estados para eliminación ──
  const [ventaAEliminar, setVentaAEliminar] = useState(null)
  const [eliminando, setEliminando] = useState(false)
  const [notificacion, setNotificacion] = useState(null)

  const isToday = fecha === new Date().toLocaleDateString('en-CA')

  useEffect(() => {
    if (notificacion) {
      const timer = setTimeout(() => setNotificacion(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [notificacion])

  const handleEliminarVenta = async () => {
    if (!ventaAEliminar) return
    setEliminando(true)
    try {
      await deleteVenta(ventaAEliminar.id)
      setNotificacion({ mensaje: 'Venta eliminada correctamente y stock revertido.', tipo: 'success' })
      setVentaAEliminar(null)
      refetch()
    } catch (err) {
      console.error(err)
      const errorMsg = err.response?.data?.detail || 'Error al eliminar la venta.'
      setNotificacion({ mensaje: errorMsg, tipo: 'error' })
    } finally {
      setEliminando(false)
    }
  }

  const kpis       = data?.kpis        ?? { suma: 0, cantidad: 0 }
  const prodTop    = data?.producto_top ?? {}
  const horaPico   = data?.hora_pico   ?? {}
  const detalle    = data?.detalle     ?? []

  // Ordenar detalle de ventas de forma cronológica (AM/PM)
  const detalleOrdenado = import.meta.env.SSR ? detalle : [...detalle].sort((a, b) => {
    const parseHoraAMinutos = (horaStr) => {
      if (!horaStr) return 0
      const match = horaStr.trim().match(/^(\d+):(\d+)\s*(AM|PM)$/i)
      if (!match) return 0
      let [_, hrs, mins, amp] = match
      let horas = parseInt(hrs, 10)
      const minutos = parseInt(mins, 10)
      if (amp.toUpperCase() === 'PM' && horas < 12) horas += 12
      if (amp.toUpperCase() === 'AM' && horas === 12) horas = 0
      return horas * 60 + minutos
    }
    return parseHoraAMinutos(a.hora) - parseHoraAMinutos(b.hora)
  })

  return (
    <PageContainer>
      {notificacion && (
        <div className={`mb-4 px-4 py-3 rounded-xl border flex items-center gap-3 text-sm transition-all ${
          notificacion.tipo === 'error'
            ? 'bg-red-50 border-red-200 text-red-700'
            : 'bg-emerald-50 border-emerald-200 text-emerald-700'
        }`}>
          <AlertCircle size={18} className="shrink-0" />
          <span>{notificacion.mensaje}</span>
        </div>
      )}

      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-cafe-oscuro">Reportes del Día</h1>
          <p className="text-sm text-cafe-claro">Resumen operacional de ventas en tiempo real.</p>
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

      {/* Estado de carga y error */}
      {loading && !data ? (
        <div className="flex justify-center items-center py-24">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle size={22} className="shrink-0" />
          <div className="flex-1">
            <p className="font-bold text-sm">Error al cargar el reporte</p>
            <p className="text-xs">{error}</p>
          </div>
          <button onClick={refetch} className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 text-xs font-bold rounded-lg transition-colors">
            Reintentar
          </button>
        </div>
      ) : (
        <div className="relative space-y-6">
          {/* Overlay sutil durante refresh */}
          {loading && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex justify-center items-center z-10 rounded-2xl">
              <LoadingSpinner />
            </div>
          )}

          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={ShoppingCart}
              label="Ventas del Día"
              value={kpis.cantidad}
              sub="transacciones registradas"
              color="cafe"
            />
            <StatCard
              icon={TrendingUp}
              label="Total Recaudado"
              value={`$${formatPrecio(kpis.suma)}`}
              sub="ingresos brutos del día"
              color="success"
            />
            <StatCard
              icon={Star}
              label="Producto Más Vendido"
              value={prodTop.nombre ?? '—'}
              sub={prodTop.cantidad ? `${prodTop.cantidad} unidades` : 'Sin ventas aún'}
              color="cafe"
            />
            <StatCard
              icon={Clock}
              label="Hora Pico"
              value={horaPico.hora !== undefined ? `${String(horaPico.hora).padStart(2,'0')}:00` : '—'}
              sub={horaPico.cantidad_transacciones ? `${horaPico.cantidad_transacciones} transacciones` : 'Sin datos'}
              color="warning"
            />
          </div>

          {/* Tabla de ventas del día */}
          <div className="bg-white rounded-2xl border border-cafe-beige overflow-hidden">
            <div className="px-6 py-4 border-b border-cafe-beige/60">
              <h2 className="text-sm font-bold text-cafe-oscuro">Detalle de Ventas del Día</h2>
              <p className="text-xs text-cafe-claro mt-0.5">
                {fecha} · {detalle.length} {detalle.length === 1 ? 'transacción' : 'transacciones'}
              </p>
            </div>

            {detalle.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-cafe-claro">
                <ShoppingCart size={36} className="mb-3 opacity-30" />
                <p className="text-sm font-medium">Sin ventas registradas para esta fecha</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-cafe-crema border-b border-cafe-beige">
                      <th className="px-5 py-3 text-left text-xs font-semibold text-cafe-claro uppercase tracking-wider w-24">Hora</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-cafe-claro uppercase tracking-wider">Productos</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-cafe-claro uppercase tracking-wider w-36">Total</th>
                      {isToday && (
                        <th className="px-5 py-3 text-center text-xs font-semibold text-cafe-claro uppercase tracking-wider w-24">Acciones</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cafe-beige/40">
                    {detalleOrdenado.map((venta, idx) => (
                      <tr key={venta.id ?? idx} className="hover:bg-cafe-crema/40 transition-colors">
                        <td className="px-5 py-3 text-cafe-claro font-medium whitespace-nowrap">
                          {venta.hora}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            {Array.isArray(venta.productos) && venta.productos.map((p, pi) => (
                              <span
                                key={pi}
                                className="inline-flex items-center gap-1 bg-cafe-crema border border-cafe-beige/60 text-cafe-oscuro text-xs px-2 py-0.5 rounded-full"
                              >
                                <span className="font-semibold text-cafe-medio">{p.cantidad}×</span>
                                {p.nombre}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-right font-bold text-cafe-oscuro whitespace-nowrap">
                          ${formatPrecio(venta.total)}
                        </td>
                        {isToday && (
                          <td className="px-5 py-3 text-center whitespace-nowrap">
                            <button
                              onClick={() => setVentaAEliminar(venta)}
                              className="p-1.5 rounded-lg text-cafe-claro hover:bg-red-50 hover:text-red-500 transition-colors"
                              title="Eliminar venta"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  {/* Fila de total */}
                  <tfoot>
                    <tr className="bg-cafe-crema border-t-2 border-cafe-beige">
                      <td colSpan={isToday ? 3 : 2} className="px-5 py-3 text-xs font-bold text-cafe-claro uppercase tracking-wider">
                        Total del Día
                      </td>
                      <td className="px-5 py-3 text-right font-black text-cafe-oscuro text-base">
                        ${formatPrecio(kpis.suma)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal Confirmar Eliminar Venta ── */}
      <Modal
        isOpen={!!ventaAEliminar}
        onClose={() => setVentaAEliminar(null)}
        title="¿Eliminar esta venta?"
        maxWidth="max-w-md"
      >
        {ventaAEliminar && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-xs text-red-700 space-y-1.5">
              <p className="font-bold flex items-center gap-1">
                <AlertCircle size={14} /> ¡Atención! Esta acción no se puede deshacer.
              </p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Se restablecerá el stock del inventario para los productos de esta venta.</li>
                <li>Si esta venta está asociada a un crédito, dicho crédito se eliminará permanentemente junto con sus abonos.</li>
                <li>Los reportes y análisis del día se recalcularán automáticamente.</li>
              </ul>
            </div>

            <div className="border border-cafe-beige rounded-xl p-4 space-y-2 text-sm bg-cafe-crema/20">
              <div className="flex justify-between">
                <span className="text-cafe-claro font-medium">Hora de venta:</span>
                <span className="text-cafe-oscuro font-bold">{ventaAEliminar.hora}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-cafe-claro font-medium">Monto total:</span>
                <span className="text-cafe-medio font-extrabold">${formatPrecio(ventaAEliminar.total)}</span>
              </div>
              <div className="space-y-1">
                <span className="text-cafe-claro font-medium block">Productos:</span>
                <div className="flex flex-wrap gap-1.5">
                  {Array.isArray(ventaAEliminar.productos) && ventaAEliminar.productos.map((p, pi) => (
                    <span
                      key={pi}
                      className="bg-white border border-cafe-beige text-cafe-oscuro text-xs px-2 py-0.5 rounded-full"
                    >
                      {p.cantidad}× {p.nombre}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <Button
                variant="ghost"
                onClick={() => setVentaAEliminar(null)}
                disabled={eliminando}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                onClick={handleEliminarVenta}
                disabled={eliminando}
              >
                {eliminando ? 'Eliminando...' : 'Sí, eliminar venta'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </PageContainer>
  )
}
