import { useMemo, useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { AlertCircle, Calendar, CreditCard, DollarSign } from 'lucide-react'
import Table from '../ui/Table'
import { formatPrecio } from '../../utils/format'
import { useGastos, getEstadoEfectivo } from '../../hooks/useGastos'

export default function GastosAnalytics({ reportes, fechaInicio, fechaFin }) {
  const { gastos_periodo, gastos_por_categoria } = reportes
  const { gastos, loading, error } = useGastos()

  const [sortConfig, setSortConfig] = useState({ key: 'fecha_gasto', direction: 'desc' })

  const handleSort = (key) => {
    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  // Colores para el gráfico de torta de gastos (tonalidades cálidas/rojizas/naranjas)
  const EXPENSE_COLORS = ['#EF4444', '#F97316', '#F59E0B', '#B45309', '#78350F', '#6B7280']

  // Filtrar los gastos en frontend por el rango seleccionado
  const filteredGastos = useMemo(() => {
    if (!gastos || gastos.length === 0) return []
    if (!fechaInicio || !fechaFin) return gastos

    const start = new Date(fechaInicio)
    start.setHours(0, 0, 0, 0)
    const end = new Date(fechaFin)
    end.setHours(23, 59, 59, 999)

    return gastos.filter((g) => {
      const dateStr = g.fecha_gasto || g.fecha_pago || g.created_at
      if (!dateStr) return false
      // Asegurar parseo sin desfase de zona horaria
      const d = new Date(dateStr + 'T12:00:00')
      return d >= start && d <= end
    })
  }, [gastos, fechaInicio, fechaFin])

  // Top proveedores del período
  const topProveedores = useMemo(() => {
    const provsMap = {}
    filteredGastos.forEach((g) => {
      const prov = g.proveedor?.trim() || 'Sin Proveedor'
      provsMap[prov] = (provsMap[prov] || 0) + Number(g.valor)
    })

    return Object.entries(provsMap)
      .map(([nombre, total]) => ({ nombre, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
  }, [filteredGastos])

  // Datos ordenados para la tabla
  const sortedGastosTable = useMemo(() => {
    if (!filteredGastos) return []

    const data = filteredGastos.map((g) => ({
      ...g,
      valor: Number(g.valor) || 0,
      estadoEfectivo: getEstadoEfectivo(g),
    }))

    if (!sortConfig.key) return data

    return [...data].sort((a, b) => {
      let valA = a[sortConfig.key]
      let valB = b[sortConfig.key]

      if (valA === null || valA === undefined) valA = ''
      if (valB === null || valB === undefined) valB = ''

      if (typeof valA === 'string') {
        return sortConfig.direction === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA)
      }

      return sortConfig.direction === 'asc' ? valA - valB : valB - valA
    })
  }, [filteredGastos, sortConfig])

  // Gráfico de categorías procesado
  const chartCategoryData = useMemo(() => {
    if (!gastos_por_categoria) return []
    return gastos_por_categoria.map((item) => ({
      name: item.categoria,
      value: Number(item.total) || 0,
    }))
  }, [gastos_por_categoria])

  const totalSuma = Number(gastos_periodo?.suma) || 0
  const totalPagado = Number(gastos_periodo?.suma_pagado) || 0
  const totalPendiente = Number(gastos_periodo?.suma_pendiente) || 0

  const columns = [
    {
      key: 'fecha_gasto',
      label: 'Fecha',
      sortable: true,
      render: (val) => {
        if (!val) return '—'
        const [y, m, d] = val.split('-')
        return `${d}/${m}/${y}`
      },
    },
    { key: 'concepto', label: 'Concepto', sortable: true },
    { key: 'proveedor', label: 'Proveedor', sortable: true },
    { key: 'categoria', label: 'Categoría', sortable: true },
    {
      key: 'valor',
      label: 'Monto',
      sortable: true,
      render: (val) => <span className="font-bold text-red-600">${formatPrecio(val)}</span>,
    },
    {
      key: 'estadoEfectivo',
      label: 'Estado',
      sortable: true,
      render: (val) => {
        let badgeStyle = 'bg-gray-100 text-gray-800'
        if (val === 'Pagado') badgeStyle = 'bg-emerald-100 text-emerald-800'
        if (val === 'Pendiente') badgeStyle = 'bg-amber-100 text-amber-800'
        if (val === 'Vencido') badgeStyle = 'bg-rose-100 text-rose-800'

        return <span className={`px-2 py-0.5 rounded-full text-xs font-bold`}>{val}</span>
      },
    },
  ]

  const CustomPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      const total = chartCategoryData.reduce((acc, curr) => acc + curr.value, 0)
      const ratio = total > 0 ? (data.value / total) * 100 : 0
      return (
        <div className="bg-white p-3 rounded-xl border border-cafe-beige shadow-lg">
          <p className="text-xs font-bold text-cafe-oscuro">{data.name}</p>
          <p className="text-xs font-semibold text-red-600 mt-1">
            ${formatPrecio(data.value)} ({ratio.toFixed(1)}%)
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      {/* KPIs de Gastos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Gastos */}
        <div className="bg-white p-5 rounded-2xl border border-cafe-beige flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-red-100 text-red-600">
            <DollarSign size={22} />
          </div>
          <div>
            <p className="text-xs text-cafe-claro font-medium uppercase tracking-wide">Gastos del Período</p>
            <p className="text-2xl font-bold text-cafe-oscuro leading-none mt-0.5">${formatPrecio(totalSuma)}</p>
            <p className="text-xs text-cafe-claro mt-1">{gastos_periodo?.cantidad || 0} egresos registrados</p>
          </div>
        </div>

        {/* Pagados */}
        <div className="bg-white p-5 rounded-2xl border border-cafe-beige flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-emerald-100 text-emerald-600">
            <CreditCard size={22} />
          </div>
          <div>
            <p className="text-xs text-cafe-claro font-medium uppercase tracking-wide">Egresos Pagados</p>
            <p className="text-2xl font-bold text-cafe-oscuro leading-none mt-0.5">${formatPrecio(totalPagado)}</p>
            <p className="text-xs text-cafe-claro mt-1">Flujo de caja ejecutado</p>
          </div>
        </div>

        {/* Pendientes */}
        <div className="bg-white p-5 rounded-2xl border border-cafe-beige flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-amber-100 text-amber-600">
            <AlertCircle size={22} />
          </div>
          <div>
            <p className="text-xs text-cafe-claro font-medium uppercase tracking-wide">Compromisos Pendientes</p>
            <p className="text-2xl font-bold text-cafe-oscuro leading-none mt-0.5">${formatPrecio(totalPendiente)}</p>
            <p className="text-xs text-cafe-claro mt-1">Cuentas por pagar</p>
          </div>
        </div>
      </div>

      {/* Gráfico y Proveedores */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribución por categoría */}
        <div className="bg-white p-6 rounded-2xl border border-cafe-beige flex flex-col h-80">
          <div className="mb-2">
            <h3 className="text-sm font-bold text-cafe-oscuro">Egresos por Categoría</h3>
            <p className="text-xs text-cafe-claro">Distribución de gastos en categorías operacionales.</p>
          </div>
          <div className="flex-1 w-full relative">
            {chartCategoryData.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-cafe-claro text-xs">
                Sin gastos en este rango.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartCategoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {chartCategoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={EXPENSE_COLORS[index % EXPENSE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                  <Legend layout="vertical" verticalAlign="middle" align="right" iconType="circle" wrapperStyle={{ fontSize: '11px', color: '#2C1810' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Proveedores Principales */}
        <div className="bg-white p-6 rounded-2xl border border-cafe-beige flex flex-col h-80">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-cafe-oscuro">Top 5 Proveedores</h3>
            <p className="text-xs text-cafe-claro">Proveedores con mayor acumulación de egresos.</p>
          </div>
          <div className="flex-grow space-y-3 overflow-y-auto pr-1">
            {topProveedores.length === 0 ? (
              <div className="h-full flex items-center justify-center text-cafe-claro text-xs">
                Sin datos de proveedores.
              </div>
            ) : (
              topProveedores.map((p, idx) => {
                const maxVal = topProveedores[0]?.total || 1
                const barWidth = (p.total / maxVal) * 100
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-cafe-oscuro">{p.nombre}</span>
                      <span className="text-red-600 font-bold">${formatPrecio(p.total)}</span>
                    </div>
                    <div className="h-2.5 w-full bg-cafe-crema rounded-full overflow-hidden">
                      <div className="h-full bg-red-400 rounded-full transition-all duration-300" style={{ width: `${barWidth}%` }}></div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Tabla Detallada */}
      <div className="bg-white p-6 rounded-2xl border border-cafe-beige">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-cafe-oscuro">Bitácora de Egresos</h3>
          <p className="text-xs text-cafe-claro">Lista de todos los gastos que ocurrieron en el rango seleccionado.</p>
        </div>
        <Table
          columns={columns}
          data={sortedGastosTable}
          loading={loading}
          sortConfig={sortConfig}
          onSort={handleSort}
          emptyMessage="No se encontraron egresos en las fechas seleccionadas."
        />
      </div>
    </div>
  )
}
