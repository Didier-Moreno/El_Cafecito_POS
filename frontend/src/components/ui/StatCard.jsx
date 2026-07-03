export default function StatCard({ icon: Icon, label, value, sub, color = 'cafe', onClick, active }) {
  const colorMap = {
    cafe:    { bg: 'bg-cafe-crema',    icon: 'bg-cafe-medio/15 text-cafe-medio',   border: 'border-cafe-beige',   ring: 'ring-cafe-medio' },
    warning: { bg: 'bg-amber-50',      icon: 'bg-amber-100 text-amber-600',         border: 'border-amber-200',    ring: 'ring-amber-500' },
    danger:  { bg: 'bg-red-50',        icon: 'bg-red-100 text-red-500',             border: 'border-red-200',      ring: 'ring-red-500' },
    success: { bg: 'bg-emerald-50',    icon: 'bg-emerald-100 text-emerald-600',     border: 'border-emerald-200',  ring: 'ring-emerald-500' },
  }

  const c = colorMap[color] ?? colorMap.cafe

  return (
    <div
      onClick={onClick}
      className={`${c.bg} rounded-2xl border ${c.border} p-5 flex items-center gap-4 transition-all duration-200 select-none ${
        onClick ? 'cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.98]' : ''
      } ${active ? `ring-2 ${c.ring} border-transparent shadow-md` : ''}`}
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${c.icon}`}>
        <Icon size={22} strokeWidth={1.8} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-cafe-claro font-medium uppercase tracking-wide truncate">{label}</p>
        <p className="text-2xl font-bold text-cafe-oscuro leading-none mt-0.5">{value}</p>
        {sub && <p className="text-xs text-cafe-claro mt-1 truncate">{sub}</p>}
      </div>
    </div>
  )
}
