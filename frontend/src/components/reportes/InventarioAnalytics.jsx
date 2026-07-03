import { useMemo } from 'react'
import { AlertTriangle, Briefcase, DollarSign, Package } from 'lucide-react'
import Table from '../ui/Table'
import { useProductos } from '../../hooks/useProductos'
import { formatPrecio } from '../../utils/format'

export default function InventarioAnalytics({ reportes }) {
  const { valorizacion_inventario, stock_bajo_lista } = reportes
  const { productos, loading, error } = useProductos()

  // Agrupar y valorizar el stock por categoría
  const categoriaValuation = useMemo(() => {
    if (!productos || productos.length === 0) return []

    const map = {}
    productos.forEach((p) => {
      const cat = p.categoria?.trim() || 'Sin Categoría'
      const stock = Number(p.stock) || 0
      const precio = Number(p.precio) || 0
      const costo = Number(p.costo) || 0

      if (!map[cat]) {
        map[cat] = {
          categoria: cat,
          itemsCount: 0,
          stockTotal: 0,
          valorVenta: 0,
          valorCosto: 0,
        }
      }

      map[cat].itemsCount += 1
      map[cat].stockTotal += stock
      map[cat].valorVenta += stock * precio
      map[cat].valorCosto += stock * costo
    })

    return Object.values(map).map((catData) => {
      const utilidadPotencial = Math.max(0, catData.valorVenta - catData.valorCosto)
      const margenPotencial = catData.valorVenta > 0 ? (utilidadPotencial / catData.valorVenta) * 100 : 0
      return {
        ...catData,
        utilidadPotencial,
        margenPotencial,
      }
    })
  }, [productos])

  // Obtener todos los productos con stock crítico (menos de 5 unidades) o agotados
  const criticalStockList = useMemo(() => {
    if (!productos) return []
    return productos
      .filter((p) => p.stock <= 5)
      .sort((a, b) => a.stock - b.stock)
  }, [productos])

  const totalPrecio = Number(valorizacion_inventario?.total_precio) || 0
  const totalCosto = Number(valorizacion_inventario?.total_costo) || 0
  const totalUtilidadPotencial = Math.max(0, totalPrecio - totalCosto)
  const margenPotencialPromedio = totalPrecio > 0 ? (totalUtilidadPotencial / totalPrecio) * 100 : 0

  const catColumns = [
    { key: 'categoria', label: 'Categoría', sortable: true },
    { key: 'itemsCount', label: 'Variedades', sortable: true, render: (val) => `${val} prod.` },
    { key: 'stockTotal', label: 'Existencias (Cant)', sortable: true, render: (val) => <span className="font-semibold text-cafe-oscuro">{val} u.</span> },
    { key: 'valorCosto', label: 'Inversión (Costo)', sortable: true, render: (val) => `$${formatPrecio(val)}` },
    { key: 'valorVenta', label: 'Valoración (Venta)', sortable: true, render: (val) => <span className="font-semibold text-cafe-medio">${formatPrecio(val)}</span> },
    { key: 'utilidadPotencial', label: 'Utilidad Potencial', sortable: true, render: (val) => <span className="font-bold text-emerald-600">${formatPrecio(val)}</span> },
    {
      key: 'margenPotencial',
      label: 'Margen Est.',
      sortable: true,
      render: (val) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${val > 40 ? 'bg-emerald-100 text-emerald-800' : 'bg-cafe-crema text-cafe-medio'}`}>
          {val.toFixed(1)}%
        </span>
      ),
    },
  ]

  const alertColumns = [
    { key: 'nombre', label: 'Producto' },
    { key: 'categoria', label: 'Categoría' },
    {
      key: 'stock',
      label: 'Stock Actual',
      render: (val) => {
        const isAgotado = val === 0
        return (
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold ${isAgotado ? 'bg-rose-100 text-rose-800 animate-pulse' : 'bg-amber-100 text-amber-800'}`}>
            {isAgotado ? 'Agotado' : `${val} u.`}
          </span>
        )
      },
    },
    {
      key: 'precio',
      label: 'Precio Venta',
      render: (val) => `$${formatPrecio(val)}`,
    },
  ]

  return (
    <div className="space-y-6">
      {/* KPIs de Inventario */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Inversión inmovilizada */}
        <div className="bg-white p-5 rounded-2xl border border-cafe-beige flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-amber-100 text-amber-700">
            <Briefcase size={22} />
          </div>
          <div>
            <p className="text-xs text-cafe-claro font-medium uppercase tracking-wide">Capital Invertido (Costo)</p>
            <p className="text-2xl font-bold text-cafe-oscuro leading-none mt-0.5">${formatPrecio(totalCosto)}</p>
            <p className="text-xs text-cafe-claro mt-1">Valor de adquisición en bodega</p>
          </div>
        </div>

        {/* Valorización a venta */}
        <div className="bg-white p-5 rounded-2xl border border-cafe-beige flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-cafe-crema text-cafe-medio border border-cafe-beige/40">
            <DollarSign size={22} />
          </div>
          <div>
            <p className="text-xs text-cafe-claro font-medium uppercase tracking-wide">Valor de Inventario (Venta)</p>
            <p className="text-2xl font-bold text-cafe-oscuro leading-none mt-0.5">${formatPrecio(totalPrecio)}</p>
            <p className="text-xs text-cafe-claro mt-1">Recaudación potencial total</p>
          </div>
        </div>

        {/* Ganancia potencial */}
        <div className="bg-white p-5 rounded-2xl border border-cafe-beige flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-emerald-100 text-emerald-600">
            <Package size={22} />
          </div>
          <div>
            <p className="text-xs text-cafe-claro font-medium uppercase tracking-wide">Margen Bruto Stock (Est)</p>
            <p className="text-2xl font-bold text-cafe-oscuro leading-none mt-0.5">${formatPrecio(totalUtilidadPotencial)}</p>
            <p className="text-xs text-cafe-claro mt-1">Margen esperado: {margenPotencialPromedio.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      {/* Grid: Valoración por categoría y Alertas de stock */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tabla Categorías */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-cafe-beige">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-cafe-oscuro">Valoración del Inventario por Categoría</h3>
            <p className="text-xs text-cafe-claro">Desglose de capital de trabajo y utilidades potenciales de stock por categoría.</p>
          </div>
          <Table columns={catColumns} data={categoriaValuation} loading={loading} emptyMessage="No hay productos en inventario." />
        </div>

        {/* Alertas de Stock Bajo */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-cafe-beige flex flex-col justify-between">
          <div>
            <div className="mb-4 flex items-center gap-2">
              <AlertTriangle className="text-amber-500 shrink-0" size={20} />
              <div>
                <h3 className="text-sm font-bold text-cafe-oscuro">Existencias Críticas</h3>
                <p className="text-xs text-cafe-claro">Productos agotados o con stock &le; 5 unidades.</p>
              </div>
            </div>
            <div className="max-h-[300px] overflow-y-auto pr-1">
              <Table
                columns={alertColumns}
                data={criticalStockList}
                loading={loading}
                emptyMessage="Todo en orden. No hay productos con stock crítico."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
