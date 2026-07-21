import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import PrivateRoute from './PrivateRoute'
import { CuentasProvider } from '../context/CuentasContext'
import Login from '../pages/Login'
import POS from '../pages/POS'
import Inventario from '../pages/Inventario'
import Creditos from '../pages/Creditos'
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
        {/* CuentasProvider aquí: el estado persiste aunque el usuario navegue fuera del POS */}
        <Route path="/" element={<CuentasProvider><Layout /></CuentasProvider>}>
          <Route index element={<Navigate to="/pos" replace />} />
          <Route path="pos" element={<POS />} />
          <Route path="inventario" element={<Inventario />} />
          <Route path="creditos" element={<Creditos />} />
          <Route path="gastos" element={<Gastos />} />
          <Route path="reportes" element={<Reportes />} />
          <Route path="analisis" element={<Analisis />} />
          <Route path="configuracion" element={<Configuracion />} />
        </Route>
      </Route>
    </Routes>
  )
}
