import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import PrivateRoute from './PrivateRoute'
import Login from '../pages/Login'
import POS from '../pages/POS'
import Inventario from '../pages/Inventario'
import Gastos from '../pages/Gastos'
import Reportes from '../pages/Reportes'
import Analisis from '../pages/Analisis'
import Configuracion from '../pages/Configuracion'

export default function AppRoutes() {
  return (
    <Routes>
      {/* Ruta pública */}
      <Route path="/login" element={<Login />} />

      {/* Rutas protegidas — requieren sesión activa */}
      <Route element={<PrivateRoute />}>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/pos" replace />} />
          <Route path="pos" element={<POS />} />
          <Route path="inventario" element={<Inventario />} />
          <Route path="gastos" element={<Gastos />} />
          <Route path="reportes" element={<Reportes />} />
          <Route path="analisis" element={<Analisis />} />
          <Route path="configuracion" element={<Configuracion />} />
        </Route>
      </Route>
    </Routes>
  )
}
