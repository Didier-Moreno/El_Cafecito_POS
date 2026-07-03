import { useState, useMemo } from 'react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import Table from '../ui/Table'
import { formatPrecio } from '../../utils/format'

export default function VentasAnalytics({ reportes }) {
  const { productos_mas_vendidos, ventas_por_categoria } = reportes

  const [sortConfig, setSortConfig] = useState({ key: 'cantidad', direction: 'desc' })

  const handleSort = (key) => {
    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  // Colores para el gráfico de torta (tema café + complementarios cálidos)
  const CATEGORY_COLORS = ['#2C1810', '#8B4513', '#A97142', '#D9C2A3', '#E0A96D', '#D2B48C']

  const processedCategoryData = useMemo(() => {
    if (!ventas_por_categoria) return []
    return ventas_por_categoria.map((item) => ({
      name: item.categoria,
      value: Number(item.total) || 0,
    }))
  }, [ventas_por_categoria])

  const top10BarData = useMemo(() => {
    if (!productos_mas_vendidos) return []
    return [...productos_mas_vendidos]
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 10)
      .map((p) => ({
        nombre: p.nombre.length > 15 ? p.nombre.slice(0, 15) + '...' : p.nombre,
        nombreCompleto: p.nombre,
        Unidades: p.cantidad,
        Monto: p.total_vendido,
      }))
  }, [productos_mas_vendidos])

  const sortedTableData = useMemo(() => {
    if (!productos_mas_vendidos) return []

    const data = productos_mas_vendidos.map((p, idx) => {
      const cantidad = Number(p.cantidad) || 0
      const total_vendido = Number(p.total_vendido) || 0
      const costo_actual = Number(p.costo_actual) || 0
      const costo_total = costo_actual * cantidad
      const utilidad_bruta = Math.max(0, total_vendido - costo_total)
      const margen_porcentaje = total_vendido > 0 ? (utilidad_bruta / total_vendido) * 100 : 0

      return {
        id: idx,
        nombre: p.nombre,
        categoria: p.categoria || 'Sin Categoría',
        cantidad,
        total_vendido,
        costo_actual,
        costo_total,
        utilidad_bruta,
        margen_porcentaje,
      }
    })

    if (!sortConfig.key) return data

    return [...data].sort((a, b) => {
      const valA = a[sortConfig.key]
      const valB = b[sortConfig.key]

      if (typeof valA === 'string') {
        return sortConfig.direction === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA)
      }

      return sortConfig.direction === 'asc' ? valA - valB : valB - valA
    })
  }, [productos_mas_vendidos, sortConfig])

  const columns = [
    { key: 'nombre', label: 'Producto', sortable: true },
    { key: 'categoria', label: 'Categoría', sortable: true },
    {
      key: 'cantidad',
      label: 'Cant. Vendida',
      sortable: true,
      render: (val) => <span className="font-medium text-cafe-oscuro">{val} u.</span>,
    },
    {
      key: 'total_vendido',
      label: 'Recaudado (Total)',
      sortable: true,
      render: (val) => <span className="font-bold text-cafe-medio">${formatPrecio(val)}</span>,
    },
    {
      key: 'costo_actual',
      label: 'Costo Unit. (Act)',
      sortable: true,
      render: (val) => `$${formatPrecio(val)}`,
    },
    {
      key: 'costo_total',
      label: 'Costo Total (Est)',
      sortable: true,
      render: (val) => `$${formatPrecio(val)}`,
    },
    {
      key: 'utilidad_bruta',
      label: 'Utilidad Est.',
      sortable: true,
      render: (val) => <span className="font-medium text-emerald-600">${formatPrecio(val)}</span>,
    },
    {
      key: 'margen_porcentaje',
      label: 'Margen % (Est)',
      sortable: true,
      render: (val) => (
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold whitespace-nowrap ${
            val > 50
              ? 'bg-emerald-100 text-emerald-800'
              : val > 25
              ? 'bg-amber-50 text-amber-800 border border-amber-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {val.toFixed(1)}%
        </span>
      ),
    },
  ]

  const CustomPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      const percent = processedCategoryData.reduce((acc, curr) => acc + curr.value, 0)
      const ratio = percent > 0 ? (data.value / percent) * 100 : 0
      return (
        <div className="bg-white p-3 rounded-xl border border-cafe-beige shadow-lg">
          <p className="text-xs font-bold text-cafe-oscuro">{data.name}</p>
          <p className="text-xs font-semibold text-cafe-medio mt-1">
            ${formatPrecio(data.value)} ({ratio.toFixed(1)}%)
          </p>
        </div>
      )
    }
    return null
  }

  const CustomBarTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 rounded-xl border border-cafe-beige shadow-lg">
          <p className="text-xs font-bold text-cafe-oscuro">{data.nombreCompleto}</p>
          <p className="text-xs text-cafe-claro mt-1">Unidades vendidas: {data.Unidades}</p>
          <p className="text-xs font-semibold text-cafe-medio">Recaudación: ${formatPrecio(data.Monto)}</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      {/* Gráficos de Categorías y Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribución por Categoría */}
        <div className="bg-white p-6 rounded-2xl border border-cafe-beige flex flex-col h-80">
          <div className="mb-2">
            <h3 className="text-sm font-bold text-cafe-oscuro">Ventas por Categoría</h3>
            <p className="text-xs text-cafe-claro">Participación de ingresos de cada categoría en el período.</p>
          </div>
          <div className="flex-1 w-full relative">
            {processedCategoryData.length === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-cafe-claro">
                <p className="text-xs">No hay datos</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={processedCategoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {processedCategoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                  <Legend layout="vertical" verticalAlign="middle" align="right" iconType="circle" wrapperStyle={{ fontSize: '11px', color: '#2C1810' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Productos Más Vendidos */}
        <div className="bg-white p-6 rounded-2xl border border-cafe-beige flex flex-col h-80">
          <div className="mb-2">
            <h3 className="text-sm font-bold text-cafe-oscuro">Top 10 Productos Más Vendidos</h3>
            <p className="text-xs text-cafe-claro">Comparación en volumen de ventas del top 10.</p>
          </div>
          <div className="flex-1 w-full">
            {top10BarData.length === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-cafe-claro">
                <p className="text-xs">Sin transacciones registradas</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={top10BarData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1EFEA" />
                  <XAxis type="number" stroke="#A97142" fontSize={10} tickLine={false} />
                  <YAxis dataKey="nombre" type="category" stroke="#A97142" fontSize={10} tickLine={false} width={80} />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Bar dataKey="Unidades" fill="#8B4513" radius={[0, 4, 4, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Tabla de Márgenes */}
      <div className="bg-white p-6 rounded-2xl border border-cafe-beige">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-cafe-oscuro">Análisis de Rentabilidad por Producto</h3>
          <p className="text-xs text-cafe-claro">
            Detalle financiero ordenable de costos, ingresos y márgenes estimados por producto (basado en costo y precio actual).
          </p>
        </div>
        <Table
          columns={columns}
          data={sortedTableData}
          loading={false}
          sortConfig={sortConfig}
          onSort={handleSort}
          emptyMessage="No se vendieron productos en el rango de fechas seleccionado."
        />
      </div>
    </div>
  )
}
