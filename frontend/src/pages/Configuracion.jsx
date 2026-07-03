import { Settings, Store, Bell, Shield, Palette } from 'lucide-react'
import PageContainer from '../components/ui/PageContainer'

const CONFIG_SECTIONS = [
  {
    icon: Store,
    title: 'Datos del Negocio',
    desc: 'Nombre, dirección, RUT y datos de contacto del establecimiento.',
  },
  {
    icon: Bell,
    title: 'Alertas de Stock',
    desc: 'Configura el umbral mínimo de stock para recibir alertas de reabastecimiento.',
  },
  {
    icon: Palette,
    title: 'Apariencia',
    desc: 'Personaliza colores y tema de la interfaz.',
  },
  {
    icon: Shield,
    title: 'Seguridad',
    desc: 'Gestión de usuarios, contraseñas y permisos de acceso.',
  },
]

export default function Configuracion() {
  return (
    <PageContainer>
      <div className="max-w-2xl space-y-4">
        <div className="bg-cafe-crema rounded-2xl border border-cafe-beige px-5 py-4 flex items-center gap-3">
          <Settings size={20} className="text-cafe-claro" />
          <div>
            <p className="text-sm font-semibold text-cafe-oscuro">Configuración del Sistema</p>
            <p className="text-xs text-cafe-claro">Estas opciones estarán disponibles próximamente.</p>
          </div>
        </div>

        {CONFIG_SECTIONS.map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="bg-white rounded-2xl border border-cafe-beige p-5 flex items-start gap-4 opacity-60 cursor-not-allowed"
          >
            <div className="w-10 h-10 rounded-xl bg-cafe-crema border border-cafe-beige flex items-center justify-center flex-shrink-0">
              <Icon size={18} className="text-cafe-claro" strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-sm font-semibold text-cafe-oscuro">{title}</p>
              <p className="text-xs text-cafe-claro mt-0.5">{desc}</p>
            </div>
            <span className="ml-auto text-[10px] bg-cafe-beige/50 text-cafe-claro px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
              Próximamente
            </span>
          </div>
        ))}
      </div>
    </PageContainer>
  )
}
