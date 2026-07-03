-- Migration: 006_reportes_operacionales.sql
-- Función RPC para el módulo de Reportes operacionales (vista del día).
-- Retorna KPIs diarios + detalle de ventas con hora, productos y totales.

CREATE OR REPLACE FUNCTION obtener_reporte_operacional(p_fecha DATE)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tz            TEXT := 'America/Bogota';
  v_inicio        TIMESTAMPTZ;
  v_fin           TIMESTAMPTZ;
  v_kpis          JSONB;
  v_producto_top  JSONB;
  v_hora_pico     JSONB;
  v_detalle       JSONB;
BEGIN
  -- Rango del día completo en zona horaria Colombia, parseado correctamente a TIMESTAMPTZ
  v_inicio := (p_fecha::TEXT || ' 00:00:00')::TIMESTAMP AT TIME ZONE v_tz;
  v_fin    := (p_fecha::TEXT || ' 23:59:59')::TIMESTAMP AT TIME ZONE v_tz;

  -- 1. KPIs básicos del día
  SELECT jsonb_build_object(
    'cantidad', COUNT(*),
    'suma',     COALESCE(SUM(total), 0)
  ) INTO v_kpis
  FROM ventas
  WHERE fecha >= v_inicio AND fecha <= v_fin;

  -- 2. Producto más vendido del día
  SELECT COALESCE(jsonb_build_object(
    'nombre',   p.nombre,
    'cantidad', SUM(dv.cantidad)
  ), '{}'::jsonb) INTO v_producto_top
  FROM detalle_venta dv
  JOIN ventas v   ON v.id  = dv.venta_id
  JOIN productos p ON p.id = dv.producto_id
  WHERE v.fecha >= v_inicio AND v.fecha <= v_fin
  GROUP BY p.nombre
  ORDER BY SUM(dv.cantidad) DESC
  LIMIT 1;

  -- 3. Hora pico (franja de 1 hora con más transacciones)
  SELECT COALESCE(jsonb_build_object(
    'hora',                  sub.hora,
    'cantidad_transacciones', sub.cnt
  ), '{}'::jsonb) INTO v_hora_pico
  FROM (
    SELECT EXTRACT(HOUR FROM (fecha AT TIME ZONE 'UTC' AT TIME ZONE v_tz))::INT AS hora,
           COUNT(*) AS cnt
    FROM ventas
    WHERE fecha >= v_inicio AND fecha <= v_fin
    GROUP BY hora
    ORDER BY cnt DESC
    LIMIT 1
  ) sub;

  -- 4. Detalle de ventas del día
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id',       sub.id,
      'hora',     sub.hora,
      'total',    sub.total,
      'productos', sub.productos
    ) ORDER BY sub.hora ASC
  ), '[]'::jsonb) INTO v_detalle
  FROM (
    SELECT
      v.id,
      TO_CHAR(v.fecha AT TIME ZONE 'UTC' AT TIME ZONE v_tz, 'HH12:MI AM') AS hora,
      v.total,
      (
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object(
            'nombre',   p.nombre,
            'cantidad', dv2.cantidad
          )
        ), '[]'::jsonb)
        FROM detalle_venta dv2
        JOIN productos p ON p.id = dv2.producto_id
        WHERE dv2.venta_id = v.id
      ) AS productos
    FROM ventas v
    WHERE v.fecha >= v_inicio AND v.fecha <= v_fin
  ) sub;

  RETURN jsonb_build_object(
    'kpis',          v_kpis,
    'producto_top',  v_producto_top,
    'hora_pico',     v_hora_pico,
    'detalle',       v_detalle
  );
END;
$$;
