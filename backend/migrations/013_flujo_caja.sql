-- ─────────────────────────────────────────────────────────────────────────────
-- Migración 013 — Módulo Flujo de Caja
-- Tabla: caja_diaria
-- RPC:   obtener_flujo_caja(p_fecha DATE)
-- Ejecutar en el editor SQL de Supabase
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Tabla caja_diaria ─────────────────────────────────────────────────────
-- Almacena únicamente el dinero inicial y el conteo físico de cierre por fecha.
-- Todo lo demás (entradas/salidas) se calcula desde las tablas existentes.
CREATE TABLE IF NOT EXISTS caja_diaria (
  id             SERIAL PRIMARY KEY,
  fecha          DATE        NOT NULL UNIQUE,
  dinero_inicial NUMERIC(12,2) NOT NULL DEFAULT 0,
  dinero_contado NUMERIC(12,2),          -- NULL = cierre no registrado
  nota           TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_caja_diaria_fecha ON caja_diaria(fecha);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_caja_diaria_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_caja_diaria_updated_at ON caja_diaria;
CREATE TRIGGER trigger_caja_diaria_updated_at
  BEFORE UPDATE ON caja_diaria
  FOR EACH ROW EXECUTE FUNCTION update_caja_diaria_updated_at();

-- ── 2. RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE caja_diaria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated can manage caja_diaria" ON caja_diaria;
CREATE POLICY "authenticated can manage caja_diaria"
  ON caja_diaria FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon can manage caja_diaria" ON caja_diaria;
CREATE POLICY "anon can manage caja_diaria"
  ON caja_diaria FOR ALL TO anon USING (true) WITH CHECK (true);


-- ── 3. RPC obtener_flujo_caja ────────────────────────────────────────────────
-- Retorna el flujo de caja completo para una fecha dada.
-- Lógica:
--   • Ventas contado  = ventas sin crédito pendiente (es decir, ventas que NO
--                       tienen un crédito asociado con estado 'Pendiente').
--   • Abonos          = pagos_credito del día (son entrada de dinero real).
--   • Gastos          = gastos con fecha_gasto = p_fecha y estado = 'Pagado'.
--   • Ventas a crédito NO se suman como entrada hasta que haya un abono.
CREATE OR REPLACE FUNCTION obtener_flujo_caja(p_fecha DATE)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tz              TEXT := 'America/Bogota';
  v_inicio          TIMESTAMPTZ;
  v_fin             TIMESTAMPTZ;

  -- Caja del día
  v_dinero_inicial  NUMERIC(12,2) := 0;
  v_dinero_contado  NUMERIC(12,2) := NULL;
  v_nota_caja       TEXT := NULL;

  -- Entradas
  v_ventas_contado  NUMERIC(12,2) := 0;
  v_abonos          NUMERIC(12,2) := 0;

  -- Salidas
  v_gastos          NUMERIC(12,2) := 0;

  -- Detalle
  v_movimientos     JSONB := '[]'::JSONB;
BEGIN
  -- Rango del día en hora local (Colombia UTC-5)
  v_inicio := (p_fecha::TEXT || ' 00:00:00-05:00')::TIMESTAMPTZ;
  v_fin    := (p_fecha::TEXT || ' 23:59:59-05:00')::TIMESTAMPTZ;

  -- 1. Datos de caja_diaria
  SELECT dinero_inicial, dinero_contado, nota
    INTO v_dinero_inicial, v_dinero_contado, v_nota_caja
    FROM caja_diaria
   WHERE fecha = p_fecha;

  IF NOT FOUND THEN
    v_dinero_inicial := 0;
  END IF;

  -- 2. Ventas en efectivo (ventas sin crédito pendiente del día)
  --    Se excluyen las ventas que tienen un crédito con estado 'Pendiente'
  SELECT COALESCE(SUM(v.total), 0)
    INTO v_ventas_contado
    FROM ventas v
   WHERE v.fecha BETWEEN v_inicio AND v_fin
     AND NOT EXISTS (
       SELECT 1 FROM creditos c
        WHERE c.venta_id = v.id
          AND c.estado = 'Pendiente'
     );

  -- 3. Abonos de crédito del día
  SELECT COALESCE(SUM(pc.monto), 0)
    INTO v_abonos
    FROM pagos_credito pc
   WHERE pc.created_at BETWEEN v_inicio AND v_fin;

  -- 4. Gastos pagados del día
  SELECT COALESCE(SUM(g.valor), 0)
    INTO v_gastos
    FROM gastos g
   WHERE g.fecha_gasto = p_fecha
     AND g.estado = 'Pagado';

  -- 5. Movimientos detallados (para tabla en el frontend)
  --    Ventas en efectivo
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'tipo',        'entrada',
        'categoria',   'Venta efectivo',
        'descripcion', 'Venta a las ' || TO_CHAR(v.fecha AT TIME ZONE 'UTC' AT TIME ZONE v_tz, 'HH12:MI AM'),
        'monto',       v.total,
        'hora',        TO_CHAR(v.fecha AT TIME ZONE 'UTC' AT TIME ZONE v_tz, 'HH12:MI AM')
      ) ORDER BY v.fecha
    ), '[]'::JSONB)
    INTO v_movimientos
    FROM ventas v
   WHERE v.fecha BETWEEN v_inicio AND v_fin
     AND NOT EXISTS (
       SELECT 1 FROM creditos c
        WHERE c.venta_id = v.id
          AND c.estado = 'Pendiente'
     );

  -- Agregar abonos al detalle
  v_movimientos := v_movimientos || COALESCE(
    (SELECT jsonb_agg(
        jsonb_build_object(
          'tipo',        'entrada',
          'categoria',   'Abono de crédito',
          'descripcion', 'Abono - ' || COALESCE(cli.nombre, 'Cliente'),
          'monto',       pc.monto,
          'hora',        TO_CHAR(pc.created_at AT TIME ZONE 'UTC' AT TIME ZONE v_tz, 'HH12:MI AM')
        ) ORDER BY pc.created_at
      )
      FROM pagos_credito pc
      JOIN creditos cr   ON cr.id = pc.credito_id
      LEFT JOIN clientes cli ON cli.id = cr.cliente_id
     WHERE pc.created_at BETWEEN v_inicio AND v_fin),
    '[]'::JSONB
  );

  -- Agregar gastos al detalle
  v_movimientos := v_movimientos || COALESCE(
    (SELECT jsonb_agg(
        jsonb_build_object(
          'tipo',        'salida',
          'categoria',   'Gasto',
          'descripcion', g.concepto,
          'monto',       g.valor,
          'hora',        NULL
        ) ORDER BY g.id
      )
      FROM gastos g
     WHERE g.fecha_gasto = p_fecha
       AND g.estado = 'Pagado'),
    '[]'::JSONB
  );

  RETURN jsonb_build_object(
    'fecha',           p_fecha,
    'dinero_inicial',  v_dinero_inicial,
    'dinero_contado',  v_dinero_contado,
    'nota_caja',       v_nota_caja,
    'ventas_contado',  v_ventas_contado,
    'abonos',          v_abonos,
    'total_entradas',  v_ventas_contado + v_abonos,
    'total_salidas',   v_gastos,
    'gastos',          v_gastos,
    'caja_esperada',   v_dinero_inicial + v_ventas_contado + v_abonos - v_gastos,
    'movimientos',     v_movimientos
  );
END;
$$;
