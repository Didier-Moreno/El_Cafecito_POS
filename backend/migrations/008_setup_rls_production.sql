-- ========================================================================================
-- SCRIPT DE SEGURIDAD RLS PARA PRODUCCIÓN - EL CAFECITO
-- ========================================================================================
-- Este script habilita RLS en todas las tablas utilizadas por el POS y configura
-- políticas estrictas que solo permiten acceso a los usuarios que hayan iniciado sesión
-- a través de Supabase Auth (rol 'authenticated').
-- ========================================================================================

-- 1. HABILITAR ROW LEVEL SECURITY (RLS) EN TODAS LAS TABLAS
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE detalle_venta ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;

-- 2. LIMPIEZA DE POLÍTICAS ANTERIORES INSEGURAS
-- Eliminar políticas anónimas si existen (para cerrar accesos públicos)
DROP POLICY IF EXISTS "Allow all for anon" ON productos;
DROP POLICY IF EXISTS "Allow all for anon" ON ventas;
DROP POLICY IF EXISTS "Allow all for anon" ON detalle_venta;
DROP POLICY IF EXISTS "Allow all for anon" ON gastos;

-- Eliminar posibles políticas genéricas previas para evitar duplicación
DROP POLICY IF EXISTS "Allow all for authenticated" ON productos;
DROP POLICY IF EXISTS "Allow all for authenticated" ON ventas;
DROP POLICY IF EXISTS "Allow all for authenticated" ON detalle_venta;
DROP POLICY IF EXISTS "Allow all for authenticated" ON gastos;

-- Eliminar políticas específicas si ya existían para recrearlas limpiamente
DROP POLICY IF EXISTS "Autenticados pueden ver productos" ON productos;
DROP POLICY IF EXISTS "Autenticados pueden insertar productos" ON productos;
DROP POLICY IF EXISTS "Autenticados pueden actualizar productos" ON productos;
DROP POLICY IF EXISTS "Autenticados pueden eliminar productos" ON productos;

DROP POLICY IF EXISTS "Autenticados pueden ver ventas" ON ventas;
DROP POLICY IF EXISTS "Autenticados pueden insertar ventas" ON ventas;

DROP POLICY IF EXISTS "Autenticados pueden ver detalle_venta" ON detalle_venta;
DROP POLICY IF EXISTS "Autenticados pueden insertar detalle_venta" ON detalle_venta;

DROP POLICY IF EXISTS "Autenticados pueden ver gastos" ON gastos;
DROP POLICY IF EXISTS "Autenticados pueden insertar gastos" ON gastos;
DROP POLICY IF EXISTS "Autenticados pueden actualizar gastos" ON gastos;
DROP POLICY IF EXISTS "Autenticados pueden eliminar gastos" ON gastos;


-- ========================================================================================
-- 3. CREACIÓN DE POLÍTICAS PARA USUARIOS AUTENTICADOS
-- ========================================================================================

-- ----------------------------------------------------------------------------------------
-- TABLA: productos
-- Operaciones: SELECT, INSERT, UPDATE, DELETE (Gestión completa de inventario)
-- ----------------------------------------------------------------------------------------
CREATE POLICY "Autenticados pueden ver productos" ON productos
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Autenticados pueden insertar productos" ON productos
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Autenticados pueden actualizar productos" ON productos
FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Autenticados pueden eliminar productos" ON productos
FOR DELETE TO authenticated USING (true);


-- ----------------------------------------------------------------------------------------
-- TABLA: ventas
-- Operaciones: SELECT, INSERT 
-- (Normalmente no se borran ni editan ventas terminadas por auditoría. Si en el futuro 
-- requieres anulaciones, puedes agregar la de UPDATE/DELETE).
-- ----------------------------------------------------------------------------------------
CREATE POLICY "Autenticados pueden ver ventas" ON ventas
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Autenticados pueden insertar ventas" ON ventas
FOR INSERT TO authenticated WITH CHECK (true);


-- ----------------------------------------------------------------------------------------
-- TABLA: detalle_venta
-- Operaciones: SELECT, INSERT
-- (Debe coincidir con los permisos de la tabla ventas al ser su detalle).
-- ----------------------------------------------------------------------------------------
CREATE POLICY "Autenticados pueden ver detalle_venta" ON detalle_venta
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Autenticados pueden insertar detalle_venta" ON detalle_venta
FOR INSERT TO authenticated WITH CHECK (true);


-- ----------------------------------------------------------------------------------------
-- TABLA: gastos
-- Operaciones: SELECT, INSERT, UPDATE, DELETE (Gestión completa de gastos)
-- ----------------------------------------------------------------------------------------
CREATE POLICY "Autenticados pueden ver gastos" ON gastos
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Autenticados pueden insertar gastos" ON gastos
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Autenticados pueden actualizar gastos" ON gastos
FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Autenticados pueden eliminar gastos" ON gastos
FOR DELETE TO authenticated USING (true);

-- ========================================================================================
-- FIN DEL SCRIPT
-- ========================================================================================
