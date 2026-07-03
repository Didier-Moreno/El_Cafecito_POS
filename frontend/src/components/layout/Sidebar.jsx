import { NavLink } from 'react-router-dom'
import {
  ShoppingCart, Package, TrendingDown, ClipboardList,
  LineChart, Settings, X, Coffee, LogOut
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

const NAV_SECTIONS = [
  {
    label: 'OPERACIONES',
    items: [
      { to: '/pos',        icon: ShoppingCart,  label: 'Punto de Venta' },
      { to: '/inventario', icon: Package,        label: 'Inventario'     },
    ],
  },
  {
    label: 'ADMINISTRACIÓN',
    items: [
      { to: '/gastos',   icon: TrendingDown,  label: 'Gastos'   },
      { to: '/reportes', icon: ClipboardList, label: 'Reportes' },
      { to: '/analisis', icon: LineChart,     label: 'Análisis' },
    ],
  },
  {
    label: 'SISTEMA',
    items: [
      { to: '/configuracion', icon: Settings, label: 'Configuración' },
    ],
  },
]

export default function Sidebar({ isOpen, onClose }) {
  const { signOut } = useAuth()

  return (
    <>
      {/* Overlay móvil */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-cafe-oscuro z-30
          flex flex-col transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:z-auto
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-6 py-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-cafe-medio rounded-xl flex items-center justify-center shadow-lg">
              <Coffee size={20} className="text-cafe-crema" />
            </div>
            <div>
              <p className="text-cafe-crema font-bold text-sm tracking-widest uppercase leading-none">
                El Cafecito
              </p>
              <p className="text-cafe-beige/60 text-xs mt-0.5">Sistema POS</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-cafe-beige/60 hover:text-cafe-crema transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navegación */}
        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-6 scrollbar-thin">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="text-cafe-beige/40 text-[10px] font-semibold tracking-widest uppercase px-3 mb-2">
                {section.label}
              </p>
              <ul className="space-y-1">
                {section.items.map(({ to, icon: Icon, label }) => (
                  <li key={to}>
                    <NavLink
                      to={to}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                          isActive
                            ? 'bg-cafe-medio text-cafe-crema shadow-lg shadow-cafe-medio/30'
                            : 'text-cafe-beige/70 hover:bg-white/5 hover:text-cafe-crema'
                        }`
                      }
                    >
                      <Icon size={18} strokeWidth={1.8} />
                      {label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-white/10 space-y-3">
          <button
            id="sidebar-signout"
            onClick={signOut}
            className="
              w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
              text-sm font-medium text-cafe-beige/70
              hover:bg-red-900/30 hover:text-red-300
              transition-all duration-200
            "
          >
            <LogOut size={18} strokeWidth={1.8} />
            Cerrar sesión
          </button>
          <p className="text-cafe-beige/30 text-xs text-center">
            v1.0.0 · El Cafecito POS
          </p>
        </div>
      </aside>
    </>
  )
}

