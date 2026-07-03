import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Coffee } from 'lucide-react'

export default function PrivateRoute() {
  const { session, loading } = useAuth()

  // Mientras se verifica la sesión inicial, mostramos un spinner
  // con los colores del sistema para evitar un flash de la pantalla de login
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-cafe-crema">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 bg-cafe-oscuro rounded-2xl flex items-center justify-center shadow-lg animate-pulse">
            <Coffee size={28} className="text-cafe-crema" />
          </div>
          <p className="text-cafe-claro text-sm font-medium">Verificando sesión…</p>
        </div>
      </div>
    )
  }

  // Sin sesión → login
  if (!session) {
    return <Navigate to="/login" replace />
  }

  // Con sesión → renderiza las rutas hijas
  return <Outlet />
}
