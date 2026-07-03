import { Info, ArrowUp, ArrowDown } from 'lucide-react'

export default function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  color = 'cafe',
  tooltip,
  change, // Objeto { porcentaje, formateado, positivo, tendencia }
}) {
  // Determinar status principal
  let status = 'neutral'
  if (change && change.porcentaje !== undefined) {
    if (change.porcentaje > 0) status = 'success'
    else if (change.porcentaje < 0) status = 'danger'
    else status = 'neutral' // 0% de cambio
  } else if (color === 'warning' || color === 'danger' || color === 'success') {
    status = color
  }

  const theme = {
    success: {
      border: 'border-l-emerald-500',
      iconBg: 'bg-emerald-50 text-emerald-600',
      text: 'text-emerald-600',
    },
    danger: {
      border: 'border-l-red-500',
      iconBg: 'bg-red-50 text-red-600',
      text: 'text-red-600',
    },
    warning: {
      border: 'border-l-amber-500',
      iconBg: 'bg-amber-50 text-amber-600',
      text: 'text-amber-600',
    },
    neutral: {
      border: 'border-l-gray-200',
      iconBg: 'bg-gray-50 text-gray-500',
      text: 'text-gray-500',
    }
  }

  const t = theme[status] || theme.neutral

  return (
    <div className={`group relative flex flex-col bg-white rounded-xl border border-gray-100 border-l-[4px] ${t.border} p-4 transition-all duration-300 ease-out hover:shadow-md select-none shadow-sm`}>
      {/* Tooltip */}
      {tooltip && (
        <div className="absolute left-1/2 bottom-[102%] -translate-x-1/2 w-64 bg-gray-800 text-white text-[11px] p-3 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 pointer-events-none border border-white/10 leading-relaxed">
          <div className="font-bold border-b border-white/10 pb-1 mb-1.5 flex items-center gap-1">
            <Info size={12} className="text-gray-300" />
            ¿Qué mide y cómo se calcula?
          </div>
          {tooltip}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-800" />
        </div>
      )}

      {/* Fila 1: Label */}
      <div className="flex items-center gap-1 text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-2">
        <span className="truncate">{label}</span>
        {tooltip && <Info size={12} className="text-gray-400 shrink-0" />}
      </div>

      {/* Fila 2: Value + Icono */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="text-2xl font-black text-gray-800 tracking-tight leading-none truncate">
          {value}
        </span>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${t.iconBg}`}>
          <Icon size={18} strokeWidth={2.5} />
        </div>
      </div>

      {/* Fila 3: Change + Subtext */}
      <div className="flex items-center gap-1 mt-auto">
        {change && change.porcentaje !== undefined && (
          <span className={`flex items-center text-[11px] font-bold ${t.text}`}>
            {change.porcentaje > 0 && <ArrowUp size={12} className="mr-0.5" strokeWidth={3} />}
            {change.porcentaje < 0 && <ArrowDown size={12} className="mr-0.5" strokeWidth={3} />}
            {change.formateado}
          </span>
        )}
        
        {sub && (
          <span className="text-[11px] text-gray-500 font-medium truncate">
            {sub}
          </span>
        )}
      </div>
    </div>
  )
}
