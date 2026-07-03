import { useMemo, useState } from 'react'
import {
  LineChart, Line, BarChart, Bar, Cell,
  AreaChart, Area, LabelList, Brush,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { TrendingUp, TrendingDown, ShoppingCart, Ticket, Star, AlertCircle, RefreshCw, Briefcase, Coffee, Package, Activity, Info, Filter, X, Calendar, Trophy, BarChart3, Target, Award, RotateCw } from 'lucide-react'
import PageContainer from '../components/ui/PageContainer'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import KpiCard from '../components/ui/KpiCard'
import DateRangeSelector from '../components/reportes/DateRangeSelector'
import { useReportes } from '../hooks/useReportes'
import { useProductos } from '../hooks/useProductos'
import { formatPrecio } from '../utils/format'
import {
  calcularCambioPorcentual,
  calcularTendenciaVentas,
  generarInsightGeneral,
  generarInsightTemporal,
  generarInsightProducto
} from '../utils/analytics'

// ── Paletas de colores ────────────────────────────────────────────────────────
const GASTO_COLORS = ['#EF4444', '#F97316', '#F59E0B', '#B45309', '#78350F', '#6B7280']
const DAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

const CATEGORY_COLORS = {
  'Cafetería': '#92400e',
  'Gaseosas': '#3b82f6',
  'Snacks': '#f97316',
  'Agua': '#06b6d4',
  'Cervezas y Maltas': '#eab308',
  'Energizantes': '#22c55e',
  'Jugos': '#ec4899',
  'Bebidas deportivas': '#8b5cf6',
  'default': '#a8a29e'
}

const CATEGORIAS_LIST = Object.keys(CATEGORY_COLORS).filter(c => c !== 'default')

// ── Componentes de Soporte ────────────────────────────────────────────────────
function InsightBox({ insight }) {
  if (!insight) return null;
  const colors = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    danger: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };
  return (
    <div className={`mt-4 p-4 rounded-xl border flex gap-3 items-start shadow-sm transition-all ${colors[insight.tipo]}`}>
      <Info size={20} className="shrink-0 mt-0.5 opacity-80" />
      <div>
        <h4 className="text-sm font-extrabold tracking-tight mb-1">{insight.titulo}</h4>
        <p className="text-[13px] leading-relaxed opacity-90">{insight.mensaje}</p>
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;

  let categoria = data.categoria || data.name || payload[0].name;
  let defaultColor = payload[0].color || CATEGORY_COLORS['default'];
  let color = CATEGORY_COLORS[categoria] || defaultColor;

  if (payload[0].dataKey === 'Ventas') color = '#92400e';
  if (payload[0].dataKey === 'Gastos') color = '#EF4444';
  if (payload[0].dataKey === 'Monto') color = '#EF4444';

  const isBarChart = payload[0].dataKey === 'Unidades';

  return (
    <div className="bg-white p-3 rounded-lg shadow-lg border-l-4" style={{ borderLeftColor: color }}>
      <p className="text-xs font-bold text-gray-800 mb-1">{data.nombreCompleto || data.name || label}</p>
      {isBarChart && data.categoria && (
        <p className="text-[10px] text-gray-500 mb-1 uppercase tracking-wider">{data.categoria}</p>
      )}
      {payload.map((p, i) => (
        <p key={i} className="text-xs font-extrabold flex items-center gap-1.5" style={{ color: p.color || color }}>
          {p.name === 'Unidades' ? `${p.value} u.` : `$${formatPrecio(p.value)}`}
          {isBarChart && data.total_vendido ? (
            <span className="text-[10px] text-gray-500 font-normal ml-1">
              (Total: ${formatPrecio(data.total_vendido)})
            </span>
          ) : null}
        </p>
      ))}
      {data.porcentaje !== undefined && (
        <p className="text-[10px] text-gray-500 mt-1 font-semibold">{data.porcentaje}% del total</p>
      )}
    </div>
  )
}

function WeekHeatmap({ ventasGrafico }) {
  const [hoveredCell, setHoveredCell] = useState(null)

  const { weeks, maxVal } = useMemo(() => {
    if (!ventasGrafico || ventasGrafico.length === 0) return { weeks: [], maxVal: 0 }

    const sorted = [...ventasGrafico].sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
    const minDateStr = sorted[0].fecha
    const maxDateStr = sorted[sorted.length - 1].fecha

    const start = new Date(minDateStr + 'T12:00:00')
    const end = new Date(maxDateStr + 'T12:00:00')

    const day = start.getDay()
    const diff = start.getDate() - day + (day === 0 ? -6 : 1)
    const startMonday = new Date(start.setDate(diff))

    const endDay = end.getDay()
    const endDiff = end.getDate() + (endDay === 0 ? 0 : 7 - endDay)
    const endSunday = new Date(end.setDate(endDiff))

    const map = {}
    let localMax = 0
    ventasGrafico.forEach(v => {
      if (!v.fecha) return
      const total = Number(v.total) || 0
      map[v.fecha] = total
      if (total > localMax) localMax = total
    })

    const ws = []
    let current = new Date(startMonday)
    while (current <= endSunday) {
      const weekStartStr = current.toISOString().split('T')[0]
      const weekDays = []
      for (let i = 0; i < 7; i++) {
        const dStr = current.toISOString().split('T')[0]
        weekDays.push({
          dateObj: new Date(current),
          dateStr: dStr,
          total: map[dStr] || 0
        })
        current.setDate(current.getDate() + 1)
      }
      ws.push({ weekStart: weekStartStr, days: weekDays })
    }

    return { weeks: ws, maxVal: localMax }
  }, [ventasGrafico])

  const HEATMAP_COLORS = [
    '#f4f6f9', // sin ventas (gris clarito)
    '#a4c2b9', // emerald claro
    '#689887', // emerald medio
    '#2d735a', // emerald oscuro
    '#185b48', // máximo
  ]

  const getColor = (val) => {
    if (val === 0 || maxVal === 0) return HEATMAP_COLORS[0]
    const ratio = val / maxVal
    if (ratio <= 0.25) return HEATMAP_COLORS[1]
    if (ratio <= 0.5) return HEATMAP_COLORS[2]
    if (ratio <= 0.75) return HEATMAP_COLORS[3]
    return HEATMAP_COLORS[4]
  }

  const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

  return (
    <div className="bg-white p-6 rounded-2xl border border-cafe-beige flex flex-col h-full items-center">
      <h3 className="text-base font-black text-cafe-oscuro mb-1">Ventas por día de la semana</h3>
      <p className="text-xs text-cafe-claro mb-6">Distribución de ingresos por semana del período.</p>

      {weeks.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-cafe-claro text-xs">Sin datos</div>
      ) : (
        <div className="flex flex-col w-full max-w-4xl mx-auto">
          <div className="flex w-full">
            {/* Etiquetas Y */}
            <div className="flex flex-col justify-between pr-4 py-[1px] shrink-0">
              {DAY_NAMES.map((d) => (
                <div key={d} className="text-[11px] text-gray-500 font-medium h-[36px] md:h-[48px] flex items-center justify-end">
                  {d}
                </div>
              ))}
            </div>

            {/* Matriz */}
            <div className="flex-1 overflow-x-auto pb-4 pt-14 -mt-14 relative z-0">
              <div className="flex w-full min-w-fit mt-14">
                {weeks.map((week, wIndex) => (
                  <div key={week.weekStart} className="flex flex-col flex-1 min-w-[36px] max-w-[80px]">
                    {week.days.map((day, dIndex) => (
                      <div
                        key={day.dateStr}
                        className="relative w-full aspect-square md:h-[48px] border border-white transition-opacity hover:opacity-80 cursor-pointer"
                        style={{ backgroundColor: getColor(day.total) }}
                        onMouseEnter={() => setHoveredCell({ week: wIndex, day: dIndex, ...day })}
                        onMouseLeave={() => setHoveredCell(null)}
                      >
                        {hoveredCell?.dateStr === day.dateStr && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none whitespace-nowrap bg-white text-gray-800 text-[11px] p-2.5 rounded-lg shadow-xl border border-gray-100">
                            <span className="text-gray-500">{day.dateStr} ({DAY_NAMES[dIndex]}): </span>
                            <strong className="font-black text-[#92400e]">${formatPrecio(day.total)}</strong>
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-white drop-shadow-sm" />
                          </div>
                        )}
                      </div>
                    ))}
                    <div className="text-[10px] text-gray-400 font-medium mt-2 text-center truncate">
                      {week.weekStart}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Leyenda */}
          <div className="mt-8 flex items-center justify-center gap-3">
            <span className="text-[11px] text-gray-500 font-medium mr-2">0</span>
            <div className="flex rounded-sm overflow-hidden h-4 w-48 shadow-inner">
              {HEATMAP_COLORS.map(c => (
                <div key={c} className="flex-1 h-full" style={{ backgroundColor: c }} />
              ))}
            </div>
            <span className="text-[11px] text-gray-500 font-medium ml-2">{maxVal}</span>
          </div>
        </div>
      )}
    </div>
  )
}


// ── Componente Principal ──────────────────────────────────────────────────────
export default function Analisis() {
  const {
    reportes, loading, error,
    setRangoFechas, refetch,
    categoria, setFiltroCategoria,
    productoId, setFiltroProducto
  } = useReportes()

  const { productos } = useProductos()

  const [activeCatBar, setActiveCatBar] = useState(-1)
  const [activeUnitBar, setActiveUnitBar] = useState(-1)
  const [activeProdBar, setActiveProdBar] = useState(-1)
  const [activeProdUnitBar, setActiveProdUnitBar] = useState(-1)
  const [activeTab, setActiveTab] = useState('general')

  // ── Cálculos de KPIs Generales ───────────────────────────────────────────
  const totalVentas = Number(reportes?.ventas_periodo?.suma) || 0
  const totalVentasPrevio = Number(reportes?.ventas_previo?.suma) || 0
  const ventasChange = useMemo(() => calcularCambioPorcentual(totalVentas, totalVentasPrevio), [totalVentas, totalVentasPrevio])

  const numVentas = Number(reportes?.ventas_periodo?.cantidad) || 0
  const ticketPromedio = numVentas > 0 ? totalVentas / numVentas : 0
  const numVentasPrevio = Number(reportes?.ventas_previo?.cantidad) || 0
  const ticketPromedioPrevio = numVentasPrevio > 0 ? totalVentasPrevio / numVentasPrevio : 0
  const ticketChange = useMemo(() => calcularCambioPorcentual(ticketPromedio, ticketPromedioPrevio), [ticketPromedio, ticketPromedioPrevio])
  const transaccionesChange = useMemo(() => calcularCambioPorcentual(numVentas, numVentasPrevio), [numVentas, numVentasPrevio])

  const cogsPeriodo = Number(reportes?.cogs_periodo) || 0
  const utilidadEstimada = totalVentas - cogsPeriodo
  const cogsPrevio = Number(reportes?.cogs_previo) || 0
  const utilidadEstimadaPrev = totalVentasPrevio - cogsPrevio
  const utilidadChange = useMemo(() => calcularCambioPorcentual(utilidadEstimada, utilidadEstimadaPrev), [utilidadEstimada, utilidadEstimadaPrev])

  const gastosPeriodo = Number(reportes?.gastos_periodo?.suma) || 0
  const gastosPrevio = Number(reportes?.gastos_previo?.suma) || 0
  const resultadoEstimado = utilidadEstimada - gastosPeriodo
  const resultadoEstimadoPrev = utilidadEstimadaPrev - gastosPrevio
  const resultadoChange = useMemo(() => calcularCambioPorcentual(resultadoEstimado, resultadoEstimadoPrev), [resultadoEstimado, resultadoEstimadoPrev])

  const tendenciaVentas = useMemo(() => calcularTendenciaVentas(reportes?.ventas_grafico), [reportes?.ventas_grafico])

  // ── Data Gráficos y Análisis Temporal ────────────────────────────────────
  const { totalVendido, promedioDiario, mejorDia, peorDia, top3Mejores, top3Peores } = useMemo(() => {
    const ventas = reportes?.ventas_grafico || [];
    const total = ventas.reduce((acc, v) => acc + (Number(v.total) || 0), 0);
    const prom = ventas.length > 0 ? total / ventas.length : 0;

    const sorted = [...ventas].sort((a, b) => Number(b.total) - Number(a.total));
    const best = sorted[0] || null;
    const worst = sorted[sorted.length - 1] || null;
    const top3M = sorted.slice(0, 3);
    const top3P = [...sorted].reverse().slice(0, 3);

    return {
      totalVendido: total,
      promedioDiario: prom,
      mejorDia: best,
      peorDia: worst,
      top3Mejores: top3M,
      top3Peores: top3P
    };
  }, [reportes?.ventas_grafico]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
  };

  const ventasLineData = useMemo(() => {
    if (!reportes?.ventas_grafico) return []
    return reportes.ventas_grafico.map((v) => {
      let shortDate = '';
      if (v.fecha) {
        const [y, m, d] = v.fecha.split('-');
        const date = new Date(y, m - 1, d);
        shortDate = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
      }
      return {
        fechaStr: shortDate,
        fechaObj: v.fecha,
        Ventas: Number(v.total) || 0,
      }
    })
  }, [reportes?.ventas_grafico])

  const ventasPorDiaSemana = useMemo(() => {
    if (!reportes?.ventas_grafico) return [];
    const dias = [
      { name: 'Lunes', Ventas: 0, diaIndex: 1 },
      { name: 'Martes', Ventas: 0, diaIndex: 2 },
      { name: 'Miércoles', Ventas: 0, diaIndex: 3 },
      { name: 'Jueves', Ventas: 0, diaIndex: 4 },
      { name: 'Viernes', Ventas: 0, diaIndex: 5 },
      { name: 'Sábado', Ventas: 0, diaIndex: 6 },
      { name: 'Domingo', Ventas: 0, diaIndex: 0 }
    ];
    reportes.ventas_grafico.forEach(v => {
      if (!v.fecha) return;
      const [y, m, d] = v.fecha.split('-');
      const date = new Date(y, m - 1, d);
      const diaSemana = date.getDay();
      const diaObj = dias.find(d => d.diaIndex === diaSemana);
      if (diaObj) {
        diaObj.Ventas += (Number(v.total) || 0);
      }
    });
    return dias.map(({ name, Ventas }) => ({ name, Ventas }));
  }, [reportes?.ventas_grafico]);

  // ── Insights Temporales (3 cards) ─────────────────────────────────────────
  const insightsTemporales = useMemo(() => {
    const ventas = reportes?.ventas_grafico || [];
    if (ventas.length === 0) return null;

    // 1. PROMEDIO DIARIO Y DÍAS SOBRE PROMEDIO
    const totalSum = ventas.reduce((acc, v) => acc + (Number(v.total) || 0), 0);
    const promedio = totalSum / ventas.length;
    const diasSobrePromedio = ventas.filter(v => (Number(v.total) || 0) > promedio).length;

    // 2. MEJOR DÍA DE LA SEMANA
    const diasSemanaCalc = [
      { name: 'Lunes', total: 0, idx: 1 },
      { name: 'Martes', total: 0, idx: 2 },
      { name: 'Miércoles', total: 0, idx: 3 },
      { name: 'Jueves', total: 0, idx: 4 },
      { name: 'Viernes', total: 0, idx: 5 },
      { name: 'Sábado', total: 0, idx: 6 },
      { name: 'Domingo', total: 0, idx: 0 }
    ];
    ventas.forEach(v => {
      if (!v.fecha) return;
      const [y, m, d] = v.fecha.split('-');
      const date = new Date(y, m - 1, d);
      const dow = date.getDay();
      const diaObj = diasSemanaCalc.find(x => x.idx === dow);
      if (diaObj) diaObj.total += (Number(v.total) || 0);
    });
    const mejorDiaSemana = diasSemanaCalc.reduce((best, d) => d.total > best.total ? d : best, diasSemanaCalc[0]);

    // 3. TENDENCIA DEL PERÍODO (últimos 7 días)
    const sorted = [...ventas].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    const ultimos7 = sorted.slice(-7);
    let tendenciaValor = 'Estable';
    let tendenciaDireccion = 'estable';
    if (ultimos7.length >= 6) {
      const primeros3 = ultimos7.slice(0, 3);
      const ultimos3 = ultimos7.slice(-3);
      const promPrimeros = primeros3.reduce((a, v) => a + (Number(v.total) || 0), 0) / 3;
      const promUltimos = ultimos3.reduce((a, v) => a + (Number(v.total) || 0), 0) / 3;
      if (promPrimeros > 0) {
        const cambio = ((promUltimos - promPrimeros) / promPrimeros) * 100;
        if (cambio > 10) { tendenciaValor = 'Subiendo'; tendenciaDireccion = 'subiendo'; }
        else if (cambio < -10) { tendenciaValor = 'Bajando'; tendenciaDireccion = 'bajando'; }
      }
    }

    return {
      promedio: {
        label: 'Promedio diario',
        valor: `$${formatPrecio(promedio)}`,
        detalle: `${diasSobrePromedio} de ${ventas.length} días con venta superaron el promedio`,
        icono: 'calendar'
      },
      mejorDia: {
        label: 'Mejor día de la semana',
        valor: mejorDiaSemana.name,
        detalle: 'Tu día más fuerte del período',
        icono: 'star'
      },
      tendencia: {
        label: 'Tendencia reciente',
        valor: tendenciaValor,
        detalle: 'Basado en los últimos 7 días',
        icono: 'trending-up',
        direccion: tendenciaDireccion
      }
    };
  }, [reportes?.ventas_grafico]);

  const gastosLineData = useMemo(() => {
    if (!reportes?.gastos_grafico) return []
    return reportes.gastos_grafico.map((g) => ({
      fecha: g.fecha ? `${g.fecha.slice(8, 10)}/${g.fecha.slice(5, 7)}` : '',
      Gastos: Number(g.total) || 0,
    }))
  }, [reportes?.gastos_grafico])

  const ventasCatData = useMemo(() => {
    if (!reportes?.ventas_por_categoria) return []
    const total = reportes.ventas_por_categoria.reduce((acc, c) => acc + (Number(c.total) || 0), 0)
    return [...reportes.ventas_por_categoria]
      .map((c) => ({
        name: c.categoria || 'Sin Categoría',
        value: Number(c.total) || 0,
        porcentaje: total > 0 ? ((Number(c.total) / total) * 100).toFixed(1) : '0'
      }))
      .sort((a, b) => b.value - a.value)
  }, [reportes?.ventas_por_categoria])

  // Unidades vendidas agrupadas por categoría (derivadas de productos_mas_vendidos)
  const unidadesPorCategoria = useMemo(() => {
    if (!reportes?.productos_mas_vendidos) return []
    const catMap = {}
    reportes.productos_mas_vendidos.forEach((p) => {
      const cat = p.categoria || 'Sin Categoría'
      catMap[cat] = (catMap[cat] || 0) + (Number(p.cantidad) || 0)
    })
    return Object.entries(catMap)
      .map(([name, Unidades]) => ({ name, Unidades }))
      .sort((a, b) => b.Unidades - a.Unidades)
  }, [reportes?.productos_mas_vendidos])

  // KPIs de categoría
  const categoryKpis = useMemo(() => {
    if (ventasCatData.length === 0) return null
    const leader = ventasCatData[0]
    const lowest = ventasCatData[ventasCatData.length - 1]
    return {
      leader: { name: leader.name, value: leader.value, porcentaje: leader.porcentaje },
      topParticipation: { name: leader.name, porcentaje: leader.porcentaje },
      lowest: { name: lowest.name, value: lowest.value, porcentaje: lowest.porcentaje }
    }
  }, [ventasCatData])

  // Insights automáticos de categoría
  const categoryInsights = useMemo(() => {
    if (ventasCatData.length === 0) return []
    const insights = []
    const totalIngresos = ventasCatData.reduce((acc, c) => acc + c.value, 0)
    // 1. Categoría líder en ingresos
    const leader = ventasCatData[0]
    insights.push({
      icon: Trophy,
      color: 'emerald',
      title: `${leader.name} lidera las ventas`,
      text: `Es la categoría con mayores ingresos, aportando el ${leader.porcentaje}% del total facturado.`
    })
    // 2. Categoría con mayor rotación en unidades
    if (unidadesPorCategoria.length > 0) {
      const topUnits = unidadesPorCategoria[0]
      insights.push({
        icon: BarChart3,
        color: 'blue',
        title: `${topUnits.name} tiene la mayor rotación`,
        text: `Es la categoría con más unidades vendidas (${topUnits.Unidades.toLocaleString('es-CO')})${topUnits.name !== leader.name ? ', aunque su ticket promedio es menor al de ' + leader.name : ''}.`
      })
    }
    // 3. Concentración de ventas
    if (ventasCatData.length >= 2) {
      const top2Total = ventasCatData[0].value + ventasCatData[1].value
      const concentracion = totalIngresos > 0 ? ((top2Total / totalIngresos) * 100).toFixed(0) : 0
      insights.push({
        icon: Target,
        color: 'amber',
        title: 'Alta concentración en pocas categorías',
        text: `Las 2 categorías principales (${ventasCatData[0].name} y ${ventasCatData[1].name}) concentran el ${concentracion}% de los ingresos totales.`
      })
    }
    return insights
  }, [ventasCatData, unidadesPorCategoria])

  const productosList = useMemo(() => {
    if (!productos) return []
    return [...productos].sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''))
  }, [productos])

  const ventasProdData = useMemo(() => {
    if (!reportes?.productos_mas_vendidos) return []
    return [...reportes.productos_mas_vendidos]
      .map((p) => ({
        name: p.nombre || 'Sin Nombre',
        value: Number(p.total_vendido) || 0,
        porcentaje: totalVentas > 0 ? ((Number(p.total_vendido) / totalVentas) * 100).toFixed(1) : '0',
        categoria: p.categoria || 'Sin Categoría'
      }))
      .sort((a, b) => b.value - a.value)
  }, [reportes?.productos_mas_vendidos, totalVentas])

  const unidadesPorProducto = useMemo(() => {
    if (!reportes?.productos_mas_vendidos) return []
    return [...reportes.productos_mas_vendidos]
      .map((p) => ({
        name: p.nombre || 'Sin Nombre',
        Unidades: Number(p.cantidad) || 0,
        categoria: p.categoria || 'Sin Categoría',
        total_vendido: Number(p.total_vendido) || 0
      }))
      .sort((a, b) => b.Unidades - a.Unidades)
  }, [reportes?.productos_mas_vendidos])

  const productosSinVentas = useMemo(() => {
    if (!productos || productos.length === 0) return []
    const vendidosNombres = new Set(
      (reportes?.productos_mas_vendidos || []).map((p) => p.nombre)
    )
    return productos.filter((p) => !vendidosNombres.has(p.nombre))
  }, [productos, reportes?.productos_mas_vendidos])

  const productKpis = useMemo(() => {
    if (ventasProdData.length === 0) return null
    const leader = ventasProdData[0]
    const topRotation = unidadesPorProducto.length > 0 ? unidadesPorProducto[0] : null
    
    let sinVentasLabel = ''
    let sinVentasDetail = ''
    let sinVentasVal = ''
    
    if (productosSinVentas.length > 0) {
      sinVentasVal = `${productosSinVentas.length} prod.`
      const nombres = productosSinVentas.slice(0, 2).map(p => p.nombre).join(', ')
      sinVentasLabel = 'Productos sin ventas'
      sinVentasDetail = `Sin movimientos: ${nombres}${productosSinVentas.length > 2 ? '...' : ''}`
    } else {
      const lowestRotation = unidadesPorProducto[unidadesPorProducto.length - 1]
      sinVentasVal = lowestRotation ? `${lowestRotation.Unidades} u.` : '0 u.'
      sinVentasLabel = 'Baja rotación'
      sinVentasDetail = lowestRotation ? `Mínimo: ${lowestRotation.name}` : 'Buena rotación'
    }

    return {
      leader: { name: leader.name, value: leader.value, porcentaje: leader.porcentaje },
      topRotation: topRotation ? { name: topRotation.name, unidades: topRotation.Unidades } : null,
      inactive: { label: sinVentasLabel, value: sinVentasVal, detail: sinVentasDetail }
    }
  }, [ventasProdData, unidadesPorProducto, productosSinVentas])

  const productInsights = useMemo(() => {
    if (ventasProdData.length === 0) return []
    const insights = []
    
    // Helper para formatear números como texto en español
    const formatNumberWord = (n) => {
      const words = ['Cero', 'Un', 'Dos', 'Tres', 'Cuatro', 'Cinco', 'Seis', 'Siete', 'Ocho', 'Nueve', 'Diez'];
      return words[n] || n;
    };

    // 1. Producto líder
    const leader = ventasProdData[0];
    const leaderPct = Math.round(Number(leader.porcentaje));
    const verb = (leader.name || '').toLowerCase().endsWith('s') ? 'representan' : 'representa';
    insights.push({
      icon: Trophy,
      color: 'emerald',
      title: `${leader.name} lidera las ventas`,
      text: `${leader.name} ${verb} el ${leaderPct}% del ingreso.`
    });

    // 2. Productos con solo 1 venta
    const productosUnaVenta = (reportes?.productos_mas_vendidos || []).filter(p => Number(p.cantidad) === 1).length;
    if (productosUnaVenta > 0) {
      insights.push({
        icon: BarChart3,
        color: 'blue',
        title: 'Baja rotación individual',
        text: `Existen ${productosUnaVenta} productos que solo registraron una venta.`
      });
    }

    // 3. Pareto 60% aportación
    if (productos.length > 0) {
      const count60 = Math.round(productos.length * 0.6);
      const sortedAllProds = productos.map(p => {
        const sold = (reportes?.productos_mas_vendidos || []).find(x => x.nombre === p.nombre);
        return sold ? (Number(sold.total_vendido) || 0) : 0;
      }).sort((a, b) => a - b);
      const bottom60Revenue = sortedAllProds.slice(0, count60).reduce((sum, v) => sum + v, 0);
      const bottom60Percentage = totalVentas > 0 ? Math.round((bottom60Revenue / totalVentas) * 100) : 0;
      
      insights.push({
        icon: Target,
        color: 'amber',
        title: 'Concentración de ventas',
        text: `El 60% de los productos aporta menos del ${bottom60Percentage}% de la facturación.`
      });
    }

    // 4. Productos sin ventas
    if (productosSinVentas.length > 0) {
      const word = formatNumberWord(productosSinVentas.length);
      const textSuffix = productosSinVentas.length === 1 
        ? 'producto no tuvo ventas durante el período.'
        : 'productos no tuvieron ventas durante el período.';
      insights.push({
        icon: AlertCircle,
        color: 'amber',
        title: 'Productos sin movimiento',
        text: `${word} ${textSuffix}`
      });
    }

    return insights;
  }, [ventasProdData, reportes?.productos_mas_vendidos, productos, totalVentas, productosSinVentas])

  const formatYAxis = (v) => {
    if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`
    if (v >= 1000) return `$${(v / 1000).toFixed(0)}k`
    return `$${v}`
  }

  const TABS = [
    { id: 'general', label: 'General & Temporal', color: 'cafe' },
    { id: 'categoria', label: 'Por Categoría', color: 'emerald' },
    { id: 'producto', label: 'Por Producto', color: 'blue' },
  ]

  const tabActiveStyle = (tabId) => {
    if (activeTab !== tabId) return 'bg-cafe-crema text-cafe-claro hover:bg-cafe-beige/50 hover:text-cafe-oscuro'
    if (tabId === 'general')   return 'bg-cafe-medio text-white shadow-sm'
    if (tabId === 'categoria') return 'bg-emerald-600 text-white shadow-sm'
    if (tabId === 'producto')  return 'bg-blue-600 text-white shadow-sm'
    return ''
  }

  return (
    <PageContainer>
      {/* ── Header, Tabs y Filtros Globales ── */}
      <div className="bg-white rounded-2xl border border-cafe-beige shadow-sm mb-8 relative z-20">
        {/* Fila superior: Título + Controles */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 p-5">
          <div>
            <h1 className="text-2xl font-black text-cafe-oscuro flex items-center gap-2">
              <Activity className="text-cafe-medio" /> Análisis BI
            </h1>
            <p className="text-sm text-cafe-claro mt-1">Dashboard integral de inteligencia de negocio.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <DateRangeSelector onChange={(start, end) => setRangoFechas(start, end)} />
            <button
              onClick={refetch}
              className="p-2.5 bg-white text-cafe-claro hover:text-cafe-oscuro rounded-xl border border-cafe-beige hover:bg-cafe-crema transition-colors shadow-sm h-10 w-10 flex items-center justify-center"
              title="Actualizar Datos"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Barra de Tabs – estilo pill */}
        <div className="flex border-t border-cafe-beige px-5 py-3 gap-2">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${tabActiveStyle(tab.id)}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading && !reportes ? (
        <div className="flex justify-center items-center py-24"><LoadingSpinner /></div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle size={22} className="shrink-0" />
          <div className="flex-1"><p className="font-bold text-sm">Error al cargar análisis</p><p className="text-xs">{error}</p></div>
          <button onClick={refetch} className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 text-xs font-bold rounded-lg transition-colors">Reintentar</button>
        </div>
      ) : (
        <div className="relative space-y-10 pb-10">
          {loading && (
            <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] flex justify-center items-center z-50 rounded-2xl">
              <LoadingSpinner />
            </div>
          )}

          {/* ════ TAB 1: GENERAL & TEMPORAL ════ */}
          {activeTab === 'general' && <>

          {/* ════ 1. INFORMACIÓN GENERAL ════ */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-1.5 h-6 bg-cafe-medio rounded-full" />
              <h2 className="text-lg font-black text-cafe-oscuro uppercase tracking-wide">1. Información General</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard icon={TrendingUp} label="Ventas" value={`$${formatPrecio(totalVentas)}`} change={ventasChange} color="cafe" />
              <KpiCard icon={Briefcase} label="Utilidad Estimada" value={`$${formatPrecio(utilidadEstimada)}`} change={utilidadChange} color="cafe" />
              <KpiCard icon={Ticket} label="Ingreso Promedio" value={`$${formatPrecio(ticketPromedio)}`} change={ticketChange} color="cafe" />
              <KpiCard icon={ShoppingCart} label="Transacciones" value={numVentas.toLocaleString('es-CO')} change={transaccionesChange} color="cafe" />
            </div>
            <InsightBox insight={generarInsightGeneral(reportes)} />
          </section>

          {/* ════ 2. ANÁLISIS TEMPORAL ════ */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-1.5 h-6 bg-amber-500 rounded-full" />
              <h2 className="text-lg font-black text-cafe-oscuro uppercase tracking-wide">2. Análisis Temporal</h2>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-200 flex flex-col mb-6 shadow-sm">
              <div className="mb-6">
                <h3 className="text-xl font-black text-gray-800 mb-1">Evolución diaria de ventas</h3>
                <p className="text-sm text-gray-500">Comportamiento diario de los ingresos dentro del período seleccionado.</p>
              </div>

              <div className="h-[350px] w-full mb-8">
                {ventasLineData.length === 0 ? <div className="h-full flex items-center justify-center text-gray-400 text-sm">Sin datos</div> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={ventasLineData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorVentas2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#92400e" stopOpacity={0.18} />
                          <stop offset="95%" stopColor="#92400e" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="fechaStr" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={true} tickMargin={10} minTickGap={20} />
                      <YAxis tickFormatter={formatYAxis} stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dx={-10} />
                      <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#d6b896', strokeWidth: 1, strokeDasharray: '4 4' }} />
                      <Area name="Ventas" type="monotone" dataKey="Ventas" stroke="#92400e" strokeWidth={2.5} fillOpacity={1} fill="url(#colorVentas2)" activeDot={{ r: 5, fill: '#92400e', stroke: '#fff', strokeWidth: 2 }} dot={{ r: 3, fill: '#fff', stroke: '#92400e', strokeWidth: 2 }} isAnimationActive={true} animationDuration={800} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-200 flex flex-col mb-6 shadow-sm">
              <div className="mb-6">
                <h3 className="text-xl font-black text-gray-800 mb-1">Ventas por día de la semana</h3>
                <p className="text-sm text-gray-500">Rendimiento agrupado por día para identificar los días de mayor venta.</p>
              </div>
              <div className="h-[300px] w-full">
                {ventasPorDiaSemana.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-400 text-sm">Sin datos</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ventasPorDiaSemana} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={true} tickMargin={10} />
                      <YAxis tickFormatter={formatYAxis} stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dx={-10} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                      <Bar name="Ventas" dataKey="Ventas" fill="#92400e" radius={[4, 4, 0, 0]} barSize={40} isAnimationActive={true} animationDuration={800}>
                        {ventasPorDiaSemana.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill="#92400e" />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* ── Insights Temporales + Mejores/Peores (debajo de los gráficos) ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {insightsTemporales ? (
                <>
                  {/* Promedio diario */}
                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-emerald-200 group">
                    <div className="flex items-start gap-4">
                      <div className="bg-emerald-100 p-2.5 rounded-xl text-emerald-600 group-hover:bg-emerald-200 transition-colors shrink-0">
                        <Calendar size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider mb-1">{insightsTemporales.promedio.label}</p>
                        <p className="text-xl font-black text-gray-800 leading-tight">{insightsTemporales.promedio.valor}</p>
                        <p className="text-xs text-gray-500 mt-1.5">{insightsTemporales.promedio.detalle}</p>
                      </div>
                    </div>
                  </div>

                  {/* Mejor día de la semana */}
                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-amber-200 group">
                    <div className="flex items-start gap-4">
                      <div className="bg-amber-100 p-2.5 rounded-xl text-amber-600 group-hover:bg-amber-200 transition-colors shrink-0">
                        <Star size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider mb-1">{insightsTemporales.mejorDia.label}</p>
                        <p className="text-xl font-black text-gray-800 leading-tight">{insightsTemporales.mejorDia.valor}</p>
                        <p className="text-xs text-gray-500 mt-1.5">{insightsTemporales.mejorDia.detalle}</p>
                      </div>
                    </div>
                  </div>

                  {/* Tendencia reciente */}
                  <div className={`bg-white p-5 rounded-xl border shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 group ${insightsTemporales.tendencia.direccion === 'subiendo' ? 'border-gray-200 hover:border-emerald-200' :
                    insightsTemporales.tendencia.direccion === 'bajando' ? 'border-gray-200 hover:border-red-200' :
                      'border-gray-200 hover:border-blue-200'
                    }`}>
                    <div className="flex items-start gap-4">
                      <div className={`p-2.5 rounded-xl transition-colors shrink-0 ${insightsTemporales.tendencia.direccion === 'subiendo' ? 'bg-emerald-100 text-emerald-600 group-hover:bg-emerald-200' :
                        insightsTemporales.tendencia.direccion === 'bajando' ? 'bg-red-100 text-red-600 group-hover:bg-red-200' :
                          'bg-blue-100 text-blue-600 group-hover:bg-blue-200'
                        }`}>
                        {insightsTemporales.tendencia.direccion === 'bajando' ? <TrendingDown size={20} /> : <TrendingUp size={20} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider mb-1">{insightsTemporales.tendencia.label}</p>
                        <p className={`text-xl font-black leading-tight ${insightsTemporales.tendencia.direccion === 'subiendo' ? 'text-emerald-600' :
                          insightsTemporales.tendencia.direccion === 'bajando' ? 'text-red-600' :
                            'text-blue-600'
                          }`}>{insightsTemporales.tendencia.valor}</p>
                        <p className="text-xs text-gray-500 mt-1.5">{insightsTemporales.tendencia.detalle}</p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="col-span-3 bg-white p-6 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 text-sm">Sin datos para generar insights</div>
              )}
            </div>

            {/* ── Mejores y Peores días (compacto) ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Mejores días */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md hover:border-emerald-200">
                <div className="flex items-center gap-2 px-5 py-3 bg-emerald-50 border-b border-emerald-100">
                  <TrendingUp size={15} className="text-emerald-600" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Top 3 — Mejores días</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {top3Mejores.map((dia, i) => (
                    <div key={i} className="flex items-center px-5 py-3 hover:bg-gray-50/50 transition-colors">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 mr-4 ${i === 0 ? 'bg-emerald-100 text-emerald-700' :
                        i === 1 ? 'bg-emerald-50 text-emerald-600' :
                          'bg-gray-100 text-gray-500'
                        }`}>{i + 1}</div>
                      <span className="text-sm text-gray-700 flex-1">{formatDate(dia.fecha)}</span>
                      <span className="text-sm font-bold text-gray-800">${formatPrecio(dia.total)}</span>
                    </div>
                  ))}
                  {top3Mejores.length === 0 && <div className="px-5 py-4 text-xs text-gray-400 text-center">Sin datos</div>}
                </div>
              </div>

              {/* Peores días */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md hover:border-red-200">
                <div className="flex items-center gap-2 px-5 py-3 bg-red-50 border-b border-red-100">
                  <TrendingDown size={15} className="text-red-600" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-red-700">Top 3 — Peores días</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {top3Peores.map((dia, i) => (
                    <div key={i} className="flex items-center px-5 py-3 hover:bg-gray-50/50 transition-colors">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 mr-4 ${i === 0 ? 'bg-red-100 text-red-700' :
                        i === 1 ? 'bg-red-50 text-red-600' :
                          'bg-gray-100 text-gray-500'
                        }`}>{i + 1}</div>
                      <span className="text-sm text-gray-700 flex-1">{formatDate(dia.fecha)}</span>
                      <span className="text-sm font-bold text-gray-800">${formatPrecio(dia.total)}</span>
                    </div>
                  ))}
                  {top3Peores.length === 0 && <div className="px-5 py-4 text-xs text-gray-400 text-center">Sin datos</div>}
                </div>
              </div>
            </div>

          </section>

          </> }

          {/* ════ TAB 2: ANÁLISIS POR CATEGORÍA ════ */}
          {activeTab === 'categoria' && <>

          {/* ════ 3. ANÁLISIS POR CATEGORÍA ════ */}
          <section>
            {/* ── Encabezado ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                  <h2 className="text-lg font-black text-cafe-oscuro uppercase tracking-wide">3. Análisis por Categoría</h2>
                </div>
                <p className="text-sm text-cafe-claro ml-[18px]">Desempeño de ventas por categoría de productos.</p>
              </div>
            </div>

            {/* ── 3 KPI Cards ── */}
            {categoryKpis && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 mt-4">
                {/* Categoría líder en ventas */}
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-emerald-200 group">
                  <div className="flex items-start gap-4">
                    <div className="bg-emerald-100 p-2.5 rounded-xl text-emerald-600 group-hover:bg-emerald-200 transition-colors shrink-0">
                      <Trophy size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider mb-1">Categoría líder en ventas</p>
                      <p className="text-lg font-black text-emerald-700 leading-tight truncate">{categoryKpis.leader.name}</p>
                      <p className="text-sm font-bold text-gray-800 mt-0.5">${formatPrecio(categoryKpis.leader.value)}</p>
                      <p className="text-xs text-gray-500">{categoryKpis.leader.porcentaje}% del total</p>
                    </div>
                  </div>
                </div>

                {/* Mayor participación */}
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-blue-200 group">
                  <div className="flex items-start gap-4">
                    <div className="bg-blue-100 p-2.5 rounded-xl text-blue-600 group-hover:bg-blue-200 transition-colors shrink-0">
                      <Award size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider mb-1">Mayor participación</p>
                      <p className="text-2xl font-black text-blue-700 leading-tight">{categoryKpis.topParticipation.porcentaje}%</p>
                      <p className="text-sm text-gray-700 font-semibold mt-0.5">{categoryKpis.topParticipation.name}</p>
                      <p className="text-xs text-gray-500">del total de ingresos</p>
                    </div>
                  </div>
                </div>

                {/* Menor aporte */}
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-red-200 group">
                  <div className="flex items-start gap-4">
                    <div className="bg-red-100 p-2.5 rounded-xl text-red-500 group-hover:bg-red-200 transition-colors shrink-0">
                      <TrendingDown size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider mb-1">Menor aporte</p>
                      <p className="text-2xl font-black text-red-600 leading-tight">{categoryKpis.lowest.porcentaje}%</p>
                      <p className="text-sm text-gray-700 font-semibold mt-0.5 truncate">{categoryKpis.lowest.name}</p>
                      <p className="text-xs text-gray-500">${formatPrecio(categoryKpis.lowest.value)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Gráficos (2 columnas) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Ventas por categoría – barras horizontales */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <h3 className="text-base font-black text-gray-800 mb-1">Ventas por categoría</h3>
                <p className="text-xs text-gray-500 mb-4">Ingresos totales y participación sobre el total.</p>
                <div style={{ height: Math.max(200, ventasCatData.length * 44) }}>
                  {ventasCatData.length === 0 ? <div className="h-full flex items-center justify-center text-gray-400 text-sm">Sin datos</div> : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={ventasCatData}
                        layout="vertical"
                        margin={{ top: 5, right: 80, left: 10, bottom: 5 }}
                        onMouseMove={(state) => {
                          if (state && state.activeTooltipIndex !== undefined) setActiveCatBar(state.activeTooltipIndex);
                          else setActiveCatBar(-1);
                        }}
                        onMouseLeave={() => setActiveCatBar(-1)}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" tickFormatter={formatYAxis} stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} width={120} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0].payload;
                            return (
                              <div className="bg-white p-3 rounded-lg shadow-lg border-l-4" style={{ borderLeftColor: CATEGORY_COLORS[d.name] || '#10b981' }}>
                                <p className="text-xs font-bold text-gray-800 mb-1">{d.name}</p>
                                <p className="text-sm font-black" style={{ color: CATEGORY_COLORS[d.name] || '#10b981' }}>${formatPrecio(d.value)}</p>
                                <p className="text-[10px] text-gray-500 mt-0.5 font-semibold">{d.porcentaje}% del total</p>
                              </div>
                            );
                          }}
                          cursor={{ fill: 'rgba(16, 185, 129, 0.04)' }}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={18} isAnimationActive={false} animationEasing="ease-out">
                          {ventasCatData.map((entry, i) => (
                            <Cell key={i} fill={CATEGORY_COLORS[entry.name] || '#10b981'} opacity={activeCatBar === -1 || activeCatBar === i ? 1 : 0.6} style={{ transition: 'opacity 0.3s ease' }} />
                          ))}
                          <LabelList
                            content={({ x, y, width, height, index }) => {
                              const d = ventasCatData[index];
                              if (!d) return null;
                              return (
                                <g>
                                  <text x={x + width + 6} y={y + height / 2 - 5} fontSize={11} fill="#1e293b" fontWeight="bold">${formatPrecio(d.value)}</text>
                                  <text x={x + width + 6} y={y + height / 2 + 9} fontSize={10} fill="#94a3b8" fontWeight="600">{d.porcentaje}%</text>
                                </g>
                              );
                            }}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Unidades vendidas por categoría – barras horizontales */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <h3 className="text-base font-black text-gray-800 mb-1">Unidades vendidas por categoría</h3>
                <p className="text-xs text-gray-500 mb-4">Cantidad total de unidades vendidas.</p>
                <div style={{ height: Math.max(200, unidadesPorCategoria.length * 44) }}>
                  {unidadesPorCategoria.length === 0 ? <div className="h-full flex items-center justify-center text-gray-400 text-sm">Sin datos</div> : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={unidadesPorCategoria}
                        layout="vertical"
                        margin={{ top: 5, right: 50, left: 10, bottom: 5 }}
                        onMouseMove={(state) => {
                          if (state && state.activeTooltipIndex !== undefined) setActiveUnitBar(state.activeTooltipIndex);
                          else setActiveUnitBar(-1);
                        }}
                        onMouseLeave={() => setActiveUnitBar(-1)}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} width={120} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0].payload;
                            return (
                              <div className="bg-white p-3 rounded-lg shadow-lg border-l-4 border-blue-500">
                                <p className="text-xs font-bold text-gray-800 mb-1">{d.name}</p>
                                <p className="text-sm font-black text-blue-600">{d.Unidades.toLocaleString('es-CO')} unidades</p>
                              </div>
                            );
                          }}
                          cursor={{ fill: 'rgba(59, 130, 246, 0.04)' }}
                        />
                        <Bar dataKey="Unidades" radius={[0, 4, 4, 0]} barSize={18} isAnimationActive={false} animationEasing="ease-out">
                          {unidadesPorCategoria.map((entry, i) => (
                            <Cell key={i} fill={CATEGORY_COLORS[entry.name] || '#3b82f6'} opacity={activeUnitBar === -1 || activeUnitBar === i ? 1 : 0.6} style={{ transition: 'opacity 0.3s ease' }} />
                          ))}
                          <LabelList dataKey="Unidades" position="right" style={{ fontSize: '11px', fill: '#1e293b', fontWeight: 'bold' }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>

            {/* ── Resumen por categoría + Insights ── */}
            <div className="grid grid-cols-1 gap-6">

              {/* Insights clave */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <h3 className="text-base font-black text-gray-800 mb-4">Insights clave</h3>
                {categoryInsights.length === 0 ? (
                  <div className="text-gray-400 text-sm text-center py-6">Sin datos para generar insights</div>
                ) : (
                  <div className="space-y-5">
                    {categoryInsights.map((insight, i) => {
                      const Icon = insight.icon;
                      const colorMap = {
                        emerald: { bg: 'bg-emerald-100', text: 'text-emerald-600', titleColor: 'text-emerald-700' },
                        blue: { bg: 'bg-blue-100', text: 'text-blue-600', titleColor: 'text-blue-700' },
                        amber: { bg: 'bg-amber-100', text: 'text-amber-600', titleColor: 'text-amber-700' }
                      };
                      const colors = colorMap[insight.color] || colorMap.emerald;
                      return (
                        <div key={i} className="flex items-start gap-4">
                          <div className={`${colors.bg} p-2.5 rounded-xl ${colors.text} shrink-0`}>
                            <Icon size={20} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className={`text-sm font-bold ${colors.titleColor} mb-0.5`}>{insight.title}</h4>
                            <p className="text-xs text-gray-600 leading-relaxed">{insight.text}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </section>

          </> }

          {/* ════ TAB 3: ANÁLISIS POR PRODUCTO ════ */}
          {activeTab === 'producto' && <>

          {/* ════ 4. ANÁLISIS POR PRODUCTO ════ */}
          <section>
            {/* ── Encabezado ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
                  <h2 className="text-lg font-black text-cafe-oscuro uppercase tracking-wide">4. Análisis por Producto</h2>
                </div>
                <p className="text-sm text-cafe-claro ml-[18px]">Desempeño de ventas por producto individual.</p>
              </div>
            </div>

            {/* ── 3 KPI Cards ── */}
            {productKpis && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 mt-4">
                {/* Producto líder */}
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-emerald-200 group">
                  <div className="flex items-start gap-4">
                    <div className="bg-emerald-100 p-2.5 rounded-xl text-emerald-600 group-hover:bg-emerald-200 transition-colors shrink-0">
                      <Trophy size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider mb-1">Producto líder</p>
                      <p className="text-lg font-black text-emerald-700 leading-tight truncate">{productKpis.leader.name}</p>
                      <p className="text-sm font-bold text-gray-800 mt-0.5">${formatPrecio(productKpis.leader.value)}</p>
                      <p className="text-xs text-gray-500">{productKpis.leader.porcentaje}% del total de ingresos</p>
                    </div>
                  </div>
                </div>

                {/* Mayor rotación */}
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-blue-200 group">
                  <div className="flex items-start gap-4">
                    <div className="bg-blue-100 p-2.5 rounded-xl text-blue-600 group-hover:bg-blue-200 transition-colors shrink-0">
                      <RotateCw size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider mb-1">Mayor rotación</p>
                      <p className="text-lg font-black text-blue-700 leading-tight truncate">{productKpis.topRotation ? productKpis.topRotation.name : 'N/A'}</p>
                      <p className="text-sm font-bold text-gray-800 mt-0.5">{productKpis.topRotation ? productKpis.topRotation.unidades.toLocaleString('es-CO') : 0} unidades</p>
                      <p className="text-xs text-gray-500">artículo con más volumen</p>
                    </div>
                  </div>
                </div>

                {/* Productos sin ventas o baja rotación */}
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-amber-200 group">
                  <div className="flex items-start gap-4">
                    <div className="bg-amber-100 p-2.5 rounded-xl text-amber-600 group-hover:bg-amber-200 transition-colors shrink-0">
                      <AlertCircle size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider mb-1">{productKpis.inactive.label}</p>
                      <p className="text-lg font-black text-amber-700 leading-tight truncate">{productKpis.inactive.value}</p>
                      <p className="text-sm font-bold text-gray-800 mt-0.5 truncate">{productKpis.inactive.detail}</p>
                      <p className="text-xs text-gray-500">en este período</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Gráficos (2 columnas) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Ventas por producto – barras horizontales */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <h3 className="text-base font-black text-gray-800 mb-1">Ventas por producto</h3>
                <p className="text-xs text-gray-500 mb-4">Ingresos totales y participación sobre el total.</p>
                <div style={{ height: Math.max(200, ventasProdData.length * 44) }}>
                  {ventasProdData.length === 0 ? <div className="h-full flex items-center justify-center text-gray-400 text-sm">Sin datos</div> : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={ventasProdData}
                        layout="vertical"
                        margin={{ top: 5, right: 80, left: 10, bottom: 5 }}
                        onMouseMove={(state) => {
                          if (state && state.activeTooltipIndex !== undefined) setActiveProdBar(state.activeTooltipIndex);
                          else setActiveProdBar(-1);
                        }}
                        onMouseLeave={() => setActiveProdBar(-1)}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" tickFormatter={formatYAxis} stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} width={120} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0].payload;
                            return (
                              <div className="bg-white p-3 rounded-lg shadow-lg border-l-4" style={{ borderLeftColor: CATEGORY_COLORS[d.categoria] || CATEGORY_COLORS['default'] }}>
                                <p className="text-xs font-bold text-gray-800 mb-1">{d.name}</p>
                                <p className="text-sm font-black" style={{ color: CATEGORY_COLORS[d.categoria] || CATEGORY_COLORS['default'] }}>${formatPrecio(d.value)}</p>
                                <p className="text-[10px] text-gray-500 mt-0.5 font-semibold">{d.porcentaje}% del total</p>
                              </div>
                            );
                          }}
                          cursor={{ fill: 'rgba(16, 185, 129, 0.04)' }}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={18} isAnimationActive={false} animationEasing="ease-out">
                          {ventasProdData.map((entry, i) => (
                            <Cell key={i} fill={CATEGORY_COLORS[entry.categoria] || CATEGORY_COLORS['default']} opacity={activeProdBar === -1 || activeProdBar === i ? 1 : 0.6} style={{ transition: 'opacity 0.3s ease' }} />
                          ))}
                          <LabelList
                            content={({ x, y, width, height, index }) => {
                              const d = ventasProdData[index];
                              if (!d) return null;
                              return (
                                <g>
                                  <text x={x + width + 6} y={y + height / 2 - 5} fontSize={11} fill="#1e293b" fontWeight="bold">${formatPrecio(d.value)}</text>
                                  <text x={x + width + 6} y={y + height / 2 + 9} fontSize={10} fill="#94a3b8" fontWeight="600">{d.porcentaje}%</text>
                                </g>
                              );
                            }}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Unidades vendidas por producto – barras horizontales */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <h3 className="text-base font-black text-gray-800 mb-1">Unidades vendidas por producto</h3>
                <p className="text-xs text-gray-500 mb-4">Cantidad total de unidades vendidas.</p>
                <div style={{ height: Math.max(200, unidadesPorProducto.length * 44) }}>
                  {unidadesPorProducto.length === 0 ? <div className="h-full flex items-center justify-center text-gray-400 text-sm">Sin datos</div> : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={unidadesPorProducto}
                        layout="vertical"
                        margin={{ top: 5, right: 50, left: 10, bottom: 5 }}
                        onMouseMove={(state) => {
                          if (state && state.activeTooltipIndex !== undefined) setActiveProdUnitBar(state.activeTooltipIndex);
                          else setActiveProdUnitBar(-1);
                        }}
                        onMouseLeave={() => setActiveProdUnitBar(-1)}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} width={120} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0].payload;
                            return (
                              <div className="bg-white p-3 rounded-lg shadow-lg border-l-4 border-blue-500">
                                <p className="text-xs font-bold text-gray-800 mb-1">{d.name}</p>
                                <p className="text-sm font-black text-blue-600">{d.Unidades.toLocaleString('es-CO')} unidades</p>
                              </div>
                            );
                          }}
                          cursor={{ fill: 'rgba(59, 130, 246, 0.04)' }}
                        />
                        <Bar dataKey="Unidades" radius={[0, 4, 4, 0]} barSize={18} isAnimationActive={false} animationEasing="ease-out">
                          {unidadesPorProducto.map((entry, i) => (
                            <Cell key={i} fill={CATEGORY_COLORS[entry.categoria] || CATEGORY_COLORS['default']} opacity={activeProdUnitBar === -1 || activeProdUnitBar === i ? 1 : 0.6} style={{ transition: 'opacity 0.3s ease' }} />
                          ))}
                          <LabelList dataKey="Unidades" position="right" style={{ fontSize: '11px', fill: '#1e293b', fontWeight: 'bold' }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>

            {/* ── Resumen por producto + Insights ── */}
            <div className="grid grid-cols-1 gap-6">
              {/* Insights clave */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <h3 className="text-base font-black text-gray-800 mb-4">Insights clave</h3>
                {productInsights.length === 0 ? (
                  <div className="text-gray-400 text-sm text-center py-6">Sin datos para generar insights</div>
                ) : (
                  <div className="space-y-5">
                    {productInsights.map((insight, i) => {
                      const Icon = insight.icon;
                      const colorMap = {
                        emerald: { bg: 'bg-emerald-100', text: 'text-emerald-600', titleColor: 'text-emerald-700' },
                        blue: { bg: 'bg-blue-100', text: 'text-blue-600', titleColor: 'text-blue-700' },
                        amber: { bg: 'bg-amber-100', text: 'text-amber-600', titleColor: 'text-amber-700' }
                      };
                      const colors = colorMap[insight.color] || colorMap.emerald;
                      return (
                        <div key={i} className="flex items-start gap-4">
                          <div className={`${colors.bg} p-2.5 rounded-xl ${colors.text} shrink-0`}>
                            <Icon size={20} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className={`text-sm font-bold ${colors.titleColor} mb-0.5`}>{insight.title}</h4>
                            <p className="text-xs text-gray-600 leading-relaxed">{insight.text}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <InsightBox insight={generarInsightProducto(reportes)} />
          </section>

          </> }

        </div>
      )}
    </PageContainer>
  )
}
