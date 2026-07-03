import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Menu, Clock } from 'lucide-react'

const PAGE_TITLES = {
  '/pos':           { label: 'Punto de Venta',  emoji: '🛒' },
  '/inventario':    { label: 'Inventario',       emoji: '📦' },
  '/gastos':        { label: 'Gastos',           emoji: '💸' },
  '/reportes':      { label: 'Reportes',         emoji: '📊' },
  '/configuracion': { label: 'Configuración',    emoji: '⚙️' },
}

export default function Header({ onMenuClick }) {
  const { pathname } = useLocation()
  const page = PAGE_TITLES[pathname] ?? { label: 'El Cafecito', emoji: '☕' }

  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const formatTime = (date) =>
    date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })

  const formatDate = (date) =>
    date.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <header className="bg-white border-b border-cafe-beige/50 px-4 lg:px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
      {/* Izquierda: hamburguesa + título */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-cafe-oscuro hover:bg-cafe-crema transition-colors"
          aria-label="Abrir menú"
        >
          <Menu size={22} />
        </button>
        <div>
          <h1 className="text-lg font-bold text-cafe-oscuro leading-none">
            {page.label}
          </h1>
          <p className="text-cafe-claro text-xs mt-0.5 capitalize">{formatDate(time)}</p>
        </div>
      </div>

      {/* Derecha: reloj */}
      <div className="flex items-center gap-2 text-cafe-oscuro bg-cafe-crema px-3 py-1.5 rounded-lg border border-cafe-beige">
        <Clock size={14} className="text-cafe-claro" />
        <span className="text-sm font-semibold tabular-nums">{formatTime(time)}</span>
      </div>
    </header>
  )
}
