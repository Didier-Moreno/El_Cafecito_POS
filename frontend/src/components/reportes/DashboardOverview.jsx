import { useMemo } from 'react'
import { TrendingUp, Coins, Percent, ShoppingBag } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import StatCard from '../ui/StatCard'
import ReportInsights from './ReportInsights'
import { formatPrecio } from '../../utils/format'
import { calcularMetricasGanancia, calcularCambioPorcentual } from '../../utils/analytics'

export default function DashboardOverview({ reportes }) {
  const {
    ventas_periodo,
    ventas_previo,
    gastos_periodo,
    gastos_previo,
    cogs_periodo,
    cogs_previo,
    productos_mas_vendidos,
    ventas_grafico,
    gastos_grafico,
  } = reportes

  const totalVentas = Number(ventas_periodo?.suma) || 0
  const prevVentas = Number(ventas_previo?.suma) || 0

  const totalGastos = Number(gastos_periodo?.suma) || 0
  const prevGastos = Number(gastos_previo?.suma) || 0

  const totalGastosPagados = Number(gastos_periodo?.suma_pagado) || 0
  const prevGastosPagados = Number(gastos_previo?.suma_pagado) || 0

  const cogsPeriodoVal = cogs_periodo !== undefined ? Number(cogs_periodo) : null
  const cogsPrevioVal = cogs_previo !== undefined ? Number(cogs_previo) : null

  // Calcular COGS y utilidad estimada del período actual
  const { cogsEstimado, utilidadBruta } = useMemo(() => {
    return calcularMetricasGanancia(productos_mas_vendidos, totalVentas, cogsPeriodoVal)
  }, [productos_mas_vendidos, totalVentas, cogsPeriodoVal])

  // Calcular utilidad estimada del período previo
  const { utilidadBruta: utilidadBrutaPrev } = useMemo(() => {
    return calcularMetricasGanancia(null, prevVentas, cogsPrevioVal)
  }, [prevVentas, cogsPrevioVal])

  // Utilidades Netas Estimadas
  const utilidadNetaEstimada = Math.max(0, utilidadBruta - totalGastosPagados)
  const prevUtilidadNeta = Math.max(0, utilidadBrutaPrev - prevGastosPagados)

  const margenNetoPorcentaje = totalVentas > 0 ? (utilidadNetaEstimada / totalVentas) * 100 : 0

  // Variaciones porcentuales comparativas
  const ventasTrend = useMemo(() => calcularCambioPorcentual(totalVentas, prevVentas), [totalVentas, prevVentas])
  const utilidadTrend = useMemo(() => calcularCambioPorcentual(utilidadBruta, utilidadBrutaPrev), [utilidadBruta, utilidadBrutaPrev])
  const gastosTrend = useMemo(() => calcularCambioPorcentual(totalGastos, prevGastos), [totalGastos, prevGastos])
  const netoTrend = useMemo(() => calcularCambioPorcentual(utilidadNetaEstimada, prevUtilidadNeta), [utilidadNetaEstimada, prevUtilidadNeta])

  // Combinar y ordenar datos de gráficos por fecha
  const chartData = useMemo(() => {
    const datesMap = {}

    if (ventas_grafico && Array.isArray(ventas_grafico)) {
      ventas_grafico.forEach((v) => {
        const key = v.fecha // YYYY-MM-DD
        datesMap[key] = {
          fecha: key,
          dia: v.dia || '',
          Ventas: Number(v.total) || 0,
          Gastos: 0,
        }
      })
    }

    if (gastos_grafico && Array.isArray(gastos_grafico)) {
      gastos_grafico.forEach((g) => {
        const key = g.fecha // YYYY-MM-DD
        if (!datesMap[key]) {
          const dateObj = new Date(key + 'T00:00:00')
          const dayName = dateObj.toLocaleDateString('es-CO', { weekday: 'short' }).slice(0, 3).toUpperCase()
          datesMap[key] = {
            fecha: key,
            dia: dayName,
            Ventas: 0,
            Gastos: 0,
          }
        }
        datesMap[key].Gastos = Number(g.total) || 0
      })
    }

    return Object.values(datesMap).sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
  }, [ventas_grafico, gastos_grafico])

  const formatYAxis = (tickItem) => {
    if (tickItem >= 1000000) return `$${(tickItem / 1000000).toFixed(1)}M`
    if (tickItem >= 1000) return `$${(tickItem / 1000).toFixed(0)}k`
    return `$${tickItem}`
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      // Intentar formatear la fecha
      let displayLabel = label
      if (label && label.includes('-')) {
        const parts = label.split('-')
        if (parts.length === 3) {
          displayLabel = `${parts[2]}/${parts[1]}/${parts[0]}`
        }
      }

      return (
        <div className="bg-white p-4 rounded-xl border border-cafe-beige shadow-lg">
          <p className="text-xs font-bold text-cafe-oscuro mb-2">{displayLabel}</p>
          {payload.map((p, idx) => (
            <p key={idx} className="text-xs font-medium flex items-center gap-1.5" style={{ color: p.color }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }}></span>
              {p.name}: ${formatPrecio(p.value)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      {/* Cards de KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={TrendingUp}
          label="Ingresos Totales"
          value={`$${formatPrecio(totalVentas)}`}
          sub={`${ventas_periodo?.cantidad || 0} ventas (${ventasTrend.formateado} vs. prev.)`}
          color="cafe"
        />
        <StatCard
          icon={Coins}
          label="Ganancia Est. (Bruta)"
          value={`$${formatPrecio(utilidadBruta)}`}
          sub={`Costo: $${formatPrecio(cogsEstimado)} (${utilidadTrend.formateado})`}
          color="success"
        />
        <StatCard
          icon={ShoppingBag}
          label="Gastos Operativos"
          value={`$${formatPrecio(totalGastos)}`}
          sub={`Pagados: $${formatPrecio(totalGastosPagados)} (${gastosTrend.formateado})`}
          color="danger"
        />
        <StatCard
          icon={Percent}
          label="Margen Neto Est."
          value={`${margenNetoPorcentaje.toFixed(1)}%`}
          sub={`Neto: $${formatPrecio(utilidadNetaEstimada)} (${netoTrend.formateado})`}
          color={margenNetoPorcentaje > 40 ? 'success' : margenNetoPorcentaje > 20 ? 'cafe' : 'warning'}
        />
      </div>

      {/* Gráfico principal e Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-cafe-beige flex flex-col">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-cafe-oscuro">Ventas vs Gastos en el Período</h3>
            <p className="text-xs text-cafe-claro">Comparativa de ingresos recaudados contra egresos registrados.</p>
          </div>

          <div className="h-80 w-full flex-1">
            {chartData.length === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-cafe-claro">
                <TrendingUp size={32} className="mb-2 opacity-35" />
                <p className="text-xs">No hay datos de operaciones en el rango seleccionado</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B4513" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#8B4513" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1EFEA" />
                  <XAxis
                    dataKey="fecha"
                    tickFormatter={(tick) => {
                      const parts = tick.split('-')
                      return parts.length === 3 ? `${parts[2]}/${parts[1]}` : tick
                    }}
                    stroke="#A97142"
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={formatYAxis}
                    stroke="#A97142"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Area
                    name="Ventas"
                    type="monotone"
                    dataKey="Ventas"
                    stroke="#8B4513"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorVentas)"
                  />
                  <Area
                    name="Gastos"
                    type="monotone"
                    dataKey="Gastos"
                    stroke="#EF4444"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorGastos)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Insights */}
        <div className="lg:col-span-1">
          <ReportInsights reportes={reportes} />
        </div>
      </div>
    </div>
  )
}
