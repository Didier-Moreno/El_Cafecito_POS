import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  ShoppingCart, Package, TrendingDown, ClipboardList,
  LineChart, Settings, X, Coffee, LogOut, CreditCard
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

const NAV_SECTIONS = [
  {
    label: 'OPERACIONES',
    items: [
      { to: '/pos',        icon: ShoppingCart,  label: 'Punto de Venta' },
      { to: '/inventario', icon: Package,        label: 'Inventario'     },
      { to: '/creditos',   icon: CreditCard,     label: 'Créditos'       },
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
  const [expanded, setExpanded] = useState(false)

  // En desktop el sidebar es estático y reacciona al hover.
  // En móvil mantiene el comportamiento original (drawer).
  return (
    <>
      {/* ── Overlay móvil ── */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        style={{
          width: expanded ? '16rem' : '4rem',   /* 256px / 64px */
          transition: 'width 250ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        className={`
          fixed top-0 left-0 h-full bg-cafe-oscuro z-30
          flex flex-col overflow-hidden flex-shrink-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:z-auto
        `}
      >
        {/* ── Logo ── */}
        <div className="flex items-center px-[14px] py-6 border-b border-white/10 min-h-[73px]">
          {/* Icono siempre visible */}
          <div className="w-9 h-9 bg-cafe-medio rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
            <Coffee size={20} className="text-cafe-crema" />
          </div>

          {/* Texto: aparece/desaparece con el hover */}
          <div
            className="ml-3 overflow-hidden"
            style={{
              opacity: expanded ? 1 : 0,
              width: expanded ? '9rem' : 0,
              transition: 'opacity 200ms ease, width 250ms cubic-bezier(0.4, 0, 0.2, 1)',
              whiteSpace: 'nowrap',
            }}
          >
            <p className="text-cafe-crema font-bold text-sm tracking-widest uppercase leading-none">
              El Cafecito
            </p>
            <p className="text-cafe-beige/60 text-xs mt-0.5">Sistema POS</p>
          </div>

          {/* Botón cerrar sólo en móvil */}
          <button
            onClick={onClose}
            className="lg:hidden ml-auto text-cafe-beige/60 hover:text-cafe-crema transition-colors flex-shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Navegación ── */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-6 px-2 space-y-6 scrollbar-thin">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              {/* Etiqueta de sección: sólo visible expandido */}
              <div
                className="overflow-hidden"
                style={{
                  maxHeight: expanded ? '2rem' : 0,
                  opacity: expanded ? 1 : 0,
                  transition: 'max-height 200ms ease, opacity 180ms ease',
                }}
              >
                <p className="text-cafe-beige/40 text-[10px] font-semibold tracking-widest uppercase px-3 mb-2">
                  {section.label}
                </p>
              </div>

              <ul className="space-y-1">
                {section.items.map(({ to, icon: Icon, label }) => (
                  <li key={to}>
                    <NavLink
                      to={to}
                      onClick={onClose}
                      title={!expanded ? label : undefined}
                      className={({ isActive }) =>
                        `flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                          isActive
                            ? 'bg-cafe-medio text-cafe-crema shadow-lg shadow-cafe-medio/30'
                            : 'text-cafe-beige/70 hover:bg-white/5 hover:text-cafe-crema'
                        }`
                      }
                    >
                      {/* Icono: centrado cuando colapsado */}
                      <span
                        className="flex-shrink-0 flex items-center justify-center"
                        style={{
                          width: '18px',
                          marginLeft: expanded ? '0' : 'auto',
                          marginRight: expanded ? '0' : 'auto',
                          transition: 'margin 250ms cubic-bezier(0.4, 0, 0.2, 1)',
                        }}
                      >
                        <Icon size={18} strokeWidth={1.8} />
                      </span>

                      {/* Texto del ítem */}
                      <span
                        className="overflow-hidden whitespace-nowrap ml-3"
                        style={{
                          opacity: expanded ? 1 : 0,
                          maxWidth: expanded ? '12rem' : 0,
                          transition: 'opacity 180ms ease, max-width 250ms cubic-bezier(0.4, 0, 0.2, 1)',
                        }}
                      >
                        {label}
                      </span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* ── Footer ── */}
        <div className="px-2 py-4 border-t border-white/10 space-y-3">
          <button
            id="sidebar-signout"
            onClick={signOut}
            title={!expanded ? 'Cerrar sesión' : undefined}
            className="
              w-full flex items-center px-3 py-2.5 rounded-xl
              text-sm font-medium text-cafe-beige/70
              hover:bg-red-900/30 hover:text-red-300
              transition-all duration-200
            "
          >
            <span
              className="flex-shrink-0 flex items-center justify-center"
              style={{
                width: '18px',
                marginLeft: expanded ? '0' : 'auto',
                marginRight: expanded ? '0' : 'auto',
                transition: 'margin 250ms cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <LogOut size={18} strokeWidth={1.8} />
            </span>

            <span
              className="overflow-hidden whitespace-nowrap ml-3"
              style={{
                opacity: expanded ? 1 : 0,
                maxWidth: expanded ? '12rem' : 0,
                transition: 'opacity 180ms ease, max-width 250ms cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              Cerrar sesión
            </span>
          </button>

          <div
            className="overflow-hidden text-center"
            style={{
              maxHeight: expanded ? '2rem' : 0,
              opacity: expanded ? 1 : 0,
              transition: 'max-height 200ms ease, opacity 180ms ease',
            }}
          >
            <p className="text-cafe-beige/30 text-xs">v1.0.0 · El Cafecito POS</p>
          </div>
        </div>
      </aside>
    </>
  )
}
