import { AlertTriangle, CheckCircle, Info, Sparkles } from 'lucide-react'
import { generarInsights } from '../../utils/analytics'

export default function ReportInsights({ reportes }) {
  const insights = generarInsights(reportes)

  if (insights.length === 0) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-cafe-beige h-full flex flex-col justify-center items-center text-center">
        <Sparkles className="text-cafe-claro mb-2 opacity-50" size={32} />
        <h4 className="text-sm font-bold text-cafe-oscuro mb-1">Sin Insights Disponibles</h4>
        <p className="text-xs text-cafe-claro max-w-[240px]">Agrega más ventas y gastos en este rango para generar recomendaciones.</p>
      </div>
    )
  }

  const getStyle = (tipo) => {
    switch (tipo) {
      case 'danger':
        return {
          bg: 'bg-red-50 border-red-100',
          text: 'text-red-800',
          title: 'text-red-900',
          icon: <AlertTriangle size={18} className="text-red-500 shrink-0" />,
        }
      case 'warning':
        return {
          bg: 'bg-amber-50 border-amber-100',
          text: 'text-amber-800',
          title: 'text-amber-900',
          icon: <AlertTriangle size={18} className="text-amber-500 shrink-0" />,
        }
      case 'success':
        return {
          bg: 'bg-emerald-50 border-emerald-100',
          text: 'text-emerald-800',
          title: 'text-emerald-900',
          icon: <CheckCircle size={18} className="text-emerald-500 shrink-0" />,
        }
      case 'info':
      default:
        return {
          bg: 'bg-blue-50 border-blue-100',
          text: 'text-blue-800',
          title: 'text-blue-900',
          icon: <Info size={18} className="text-blue-500 shrink-0" />,
        }
    }
  }

  return (
    <div className="bg-white p-6 rounded-2xl border border-cafe-beige h-full flex flex-col">
      <h3 className="text-sm font-bold text-cafe-oscuro mb-4 flex items-center gap-2">
        <Sparkles size={18} className="text-amber-500 animate-pulse" />
        Insights de Negocio
      </h3>
      <div className="space-y-3 flex-1 overflow-y-auto max-h-[350px] pr-2 scrollbar-thin">
        {insights.map((insight, idx) => {
          const style = getStyle(insight.tipo)
          return (
            <div key={idx} className={`p-3.5 rounded-xl border ${style.bg} flex gap-3 items-start transition-all hover:scale-[1.01]`}>
              {style.icon}
              <div className="space-y-0.5">
                <h4 className={`text-xs font-bold ${style.title}`}>{insight.titulo}</h4>
                <p className={`text-xs leading-relaxed ${style.text}`}>{insight.mensaje}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
