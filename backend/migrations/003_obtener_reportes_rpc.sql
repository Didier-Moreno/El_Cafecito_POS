CREATE OR REPLACE FUNCTION obtener_reportes()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_res JSONB;
  v_ventas_dia JSONB;
  v_ventas_mes JSONB;
  v_total_productos INT;
  v_stock_bajo_count INT;
  v_stock_bajo_lista JSONB;
  v_ventas_semanales JSONB;
  v_productos_mas_vendidos JSONB;
  
  -- Definir la zona horaria para Colombia
  v_tz TEXT := 'America/Bogota';
  -- Obtener la hora actual en esa zona horaria
  v_now TIMESTAMP := timezone(v_tz, NOW());
BEGIN
  
  -- 1. Ventas del Día
  SELECT jsonb_build_object(
      'suma', COALESCE(SUM(total), 0),
      'cantidad', COUNT(*)
  ) INTO v_ventas_dia
  FROM ventas
  WHERE DATE((fecha AT TIME ZONE 'UTC' AT TIME ZONE v_tz)) = DATE(v_now);

  -- 2. Ventas del Mes
  SELECT jsonb_build_object(
      'suma', COALESCE(SUM(total), 0),
      'cantidad', COUNT(*)
  ) INTO v_ventas_mes
  FROM ventas
  WHERE EXTRACT(MONTH FROM (fecha AT TIME ZONE 'UTC' AT TIME ZONE v_tz)) = EXTRACT(MONTH FROM v_now)
    AND EXTRACT(YEAR FROM (fecha AT TIME ZONE 'UTC' AT TIME ZONE v_tz)) = EXTRACT(YEAR FROM v_now);

  -- 3. Total Productos
  SELECT COUNT(*) INTO v_total_productos FROM productos;

  -- 4. Stock Bajo (count) (productos con stock entre 0 y 5)
  SELECT COUNT(*) INTO v_stock_bajo_count FROM productos WHERE stock <= 5 AND stock > 0;

  -- 5. Stock Bajo (lista)
  SELECT COALESCE(jsonb_agg(
      jsonb_build_object('id', id, 'nombre', nombre, 'categoria', categoria, 'stock', stock)
      ORDER BY stock ASC
  ), '[]'::jsonb) INTO v_stock_bajo_lista
  FROM productos
  WHERE stock <= 5 AND stock > 0;

  -- 6. Ventas Semanales (Últimos 7 días)
  WITH ultimos_dias AS (
    SELECT generate_series(DATE(v_now) - interval '6 days', DATE(v_now), '1 day')::date AS dia
  )
  SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
          'dia', TO_CHAR(d.dia, 'DY'), 
          'fecha', d.dia,
          'total', COALESCE(v.total_dia, 0)
      ) ORDER BY d.dia ASC
  ), '[]'::jsonb) INTO v_ventas_semanales
  FROM ultimos_dias d
  LEFT JOIN (
    SELECT DATE((fecha AT TIME ZONE 'UTC' AT TIME ZONE v_tz)) AS dia, SUM(total) AS total_dia
    FROM ventas
    WHERE (fecha AT TIME ZONE 'UTC' AT TIME ZONE v_tz) >= v_now - interval '7 days'
    GROUP BY DATE((fecha AT TIME ZONE 'UTC' AT TIME ZONE v_tz))
  ) v ON d.dia = v.dia;

  -- 7. Productos más vendidos (Top 10)
  SELECT COALESCE(jsonb_agg(
      jsonb_build_object('nombre', p.nombre, 'cantidad', sub.total_cantidad)
  ), '[]'::jsonb) INTO v_productos_mas_vendidos
  FROM (
      SELECT producto_id, SUM(cantidad) AS total_cantidad
      FROM detalle_venta
      GROUP BY producto_id
      ORDER BY total_cantidad DESC
      LIMIT 10
  ) sub
  JOIN productos p ON p.id = sub.producto_id;

  -- Construir la respuesta final JSON
  v_res := jsonb_build_object(
    'ventas_dia', v_ventas_dia,
    'ventas_mes', v_ventas_mes,
    'total_productos', v_total_productos,
    'stock_bajo_count', v_stock_bajo_count,
    'stock_bajo_lista', v_stock_bajo_lista,
    'ventas_semanales', v_ventas_semanales,
    'productos_mas_vendidos', v_productos_mas_vendidos
  );

  RETURN v_res;
END;
$$;
