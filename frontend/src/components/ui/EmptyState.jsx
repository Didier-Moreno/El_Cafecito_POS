import { PackageOpen } from 'lucide-react'

export default function EmptyState({
  message = 'No hay datos para mostrar',
  sub,
  icon: Icon = PackageOpen,
  action,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <div className="w-16 h-16 bg-cafe-crema rounded-2xl flex items-center justify-center mb-4 border border-cafe-beige">
        <Icon size={28} className="text-cafe-beige" strokeWidth={1.5} />
      </div>
      <p className="text-cafe-oscuro font-semibold text-base">{message}</p>
      {sub && <p className="text-cafe-claro text-sm mt-1">{sub}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
