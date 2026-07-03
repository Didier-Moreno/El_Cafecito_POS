-- Migration: 005_reportes_avanzados.sql
-- Crea la función RPC obtener_reportes_filtrados para análisis de negocio en un rango de fechas con comparativa del período anterior.

CREATE OR REPLACE FUNCTION obtener_reportes_filtrados(
  p_fecha_inicio TIMESTAMPTZ,
  p_fecha_fin TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_res JSONB;
  v_ventas_periodo JSONB;
  v_ventas_previo JSONB;
  v_gastos_periodo JSONB;
  v_gastos_previo JSONB;
  v_total_productos INT;
  v_stock_bajo_count INT;
  v_stock_bajo_lista JSONB;
  v_ventas_grafico JSONB;
  v_gastos_grafico JSONB;
  v_productos_mas_vendidos JSONB;
  v_ventas_por_categoria JSONB;
  v_gastos_por_categoria JSONB;
  v_valorizacion_inventario JSONB;
  
  v_cogs_periodo NUMERIC;
  v_cogs_previo NUMERIC;
  
  v_tz TEXT := 'America/Bogota';
  v_prev_inicio TIMESTAMPTZ;
  v_prev_fin TIMESTAMPTZ;
  v_interval INTERVAL;
BEGIN
  -- Calcular el intervalo del período actual para comparar con la misma duración hacia atrás
  v_interval := p_fecha_fin - p_fecha_inicio;
  v_prev_inicio := p_fecha_inicio - v_interval;
  v_prev_fin := p_fecha_inicio - INTERVAL '1 microsecond';

  -- 1. Ventas del Período Actual
  SELECT jsonb_build_object(
      'suma', COALESCE(SUM(total), 0),
      'cantidad', COUNT(*)
  ) INTO v_ventas_periodo
  FROM ventas
  WHERE fecha >= p_fecha_inicio AND fecha <= p_fecha_fin;

  -- 2. Ventas del Período Previo
  SELECT jsonb_build_object(
      'suma', COALESCE(SUM(total), 0),
      'cantidad', COUNT(*)
  ) INTO v_ventas_previo
  FROM ventas
  WHERE fecha >= v_prev_inicio AND fecha <= v_prev_fin;

  -- 3. Gastos del Período Actual
  SELECT jsonb_build_object(
      'suma', COALESCE(SUM(valor), 0),
      'cantidad', COUNT(*),
      'suma_pagado', COALESCE(SUM(CASE WHEN estado = 'Pagado' THEN valor ELSE 0 END), 0),
      'suma_pendiente', COALESCE(SUM(CASE WHEN estado = 'Pendiente' THEN valor ELSE 0 END), 0)
  ) INTO v_gastos_periodo
  FROM gastos
  WHERE (fecha_gasto >= p_fecha_inicio::date AND fecha_gasto <= p_fecha_fin::date)
     OR (fecha_pago >= p_fecha_inicio::date AND fecha_pago <= p_fecha_fin::date)
     OR (created_at >= p_fecha_inicio AND created_at <= p_fecha_fin);

  -- 4. Gastos del Período Previo
  SELECT jsonb_build_object(
      'suma', COALESCE(SUM(valor), 0),
      'cantidad', COUNT(*),
      'suma_pagado', COALESCE(SUM(CASE WHEN estado = 'Pagado' THEN valor ELSE 0 END), 0),
      'suma_pendiente', COALESCE(SUM(CASE WHEN estado = 'Pendiente' THEN valor ELSE 0 END), 0)
  ) INTO v_gastos_previo
  FROM gastos
  WHERE (fecha_gasto >= v_prev_inicio::date AND fecha_gasto <= v_prev_fin::date)
     OR (fecha_pago >= v_prev_inicio::date AND fecha_pago <= v_prev_fin::date)
     OR (created_at >= v_prev_inicio AND created_at <= v_prev_fin);

  -- 5. COGS (Costo de Mercancía) del Período Actual
  SELECT COALESCE(SUM(dv.cantidad * p.costo), 0) INTO v_cogs_periodo
  FROM detalle_venta dv
  JOIN ventas v ON v.id = dv.venta_id
  JOIN productos p ON p.id = dv.producto_id
  WHERE v.fecha >= p_fecha_inicio AND v.fecha <= p_fecha_fin;

  -- 6. COGS (Costo de Mercancía) del Período Previo
  SELECT COALESCE(SUM(dv.cantidad * p.costo), 0) INTO v_cogs_previo
  FROM detalle_venta dv
  JOIN ventas v ON v.id = dv.venta_id
  JOIN productos p ON p.id = dv.producto_id
  WHERE v.fecha >= v_prev_inicio AND v.fecha <= v_prev_fin;

  -- 7. Total Productos
  SELECT COUNT(*) INTO v_total_productos FROM productos;

  -- 8. Stock Bajo (count)
  SELECT COUNT(*) INTO v_stock_bajo_count FROM productos WHERE stock <= 5 AND stock > 0;

  -- 9. Stock Bajo (lista)
  SELECT COALESCE(jsonb_agg(
      jsonb_build_object('id', id, 'nombre', nombre, 'categoria', categoria, 'stock', stock)
      ORDER BY stock ASC
  ), '[]'::jsonb) INTO v_stock_bajo_lista
  FROM productos
  WHERE stock <= 5 AND stock > 0;

  -- 10. Ventas Gráfico (agrupación diaria en el período)
  SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
          'fecha', sub.dia,
          'dia', TO_CHAR(sub.dia, 'DY'),
          'total', sub.total_dia
      ) ORDER BY sub.dia ASC
  ), '[]'::jsonb) INTO v_ventas_grafico
  FROM (
      SELECT DATE((fecha AT TIME ZONE 'UTC' AT TIME ZONE v_tz)) AS dia, SUM(total) AS total_dia
      FROM ventas
      WHERE fecha >= p_fecha_inicio AND fecha <= p_fecha_fin
      GROUP BY DATE((fecha AT TIME ZONE 'UTC' AT TIME ZONE v_tz))
  ) sub;

  -- 11. Gastos Gráfico (agrupación diaria en el período)
  SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
          'fecha', sub.dia,
          'total', sub.total_dia
      ) ORDER BY sub.dia ASC
  ), '[]'::jsonb) INTO v_gastos_grafico
  FROM (
      SELECT COALESCE(fecha_gasto, fecha_pago, DATE(created_at AT TIME ZONE 'UTC' AT TIME ZONE v_tz)) AS dia, SUM(valor) AS total_dia
      FROM gastos
      WHERE (fecha_gasto >= p_fecha_inicio::date AND fecha_gasto <= p_fecha_fin::date)
         OR (fecha_pago >= p_fecha_inicio::date AND fecha_pago <= p_fecha_fin::date)
         OR (created_at >= p_fecha_inicio AND created_at <= p_fecha_fin)
      GROUP BY COALESCE(fecha_gasto, fecha_pago, DATE(created_at AT TIME ZONE 'UTC' AT TIME ZONE v_tz))
  ) sub;

  -- 12. Productos más vendidos (Top 10)
  SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
          'nombre', p.nombre, 
          'cantidad', sub.total_cantidad,
          'total_vendido', sub.total_subtotal,
          'categoria', p.categoria,
          'costo_actual', p.costo,
          'precio_actual', p.precio
      )
  ), '[]'::jsonb) INTO v_productos_mas_vendidos
  FROM (
      SELECT dv.producto_id, SUM(dv.cantidad) AS total_cantidad, SUM(dv.subtotal) AS total_subtotal
      FROM detalle_venta dv
      JOIN ventas v ON v.id = dv.venta_id
      WHERE v.fecha >= p_fecha_inicio AND v.fecha <= p_fecha_fin
      GROUP BY dv.producto_id
      ORDER BY total_cantidad DESC
      LIMIT 10
  ) sub
  JOIN productos p ON p.id = sub.producto_id;

  -- 13. Ventas por Categoría
  SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
          'categoria', sub.categoria,
          'total', sub.total_categoria,
          'cantidad', sub.cantidad_categoria
      )
  ), '[]'::jsonb) INTO v_ventas_por_categoria
  FROM (
      SELECT COALESCE(p.categoria, 'Sin Categoría') AS categoria, 
             SUM(dv.subtotal) AS total_categoria, 
             SUM(dv.cantidad) AS cantidad_categoria
      FROM detalle_venta dv
      JOIN ventas v ON v.id = dv.venta_id
      JOIN productos p ON p.id = dv.producto_id
      WHERE v.fecha >= p_fecha_inicio AND v.fecha <= p_fecha_fin
      GROUP BY p.categoria
  ) sub;

  -- 14. Gastos por Categoría
  SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
          'categoria', sub.categoria,
          'total', sub.total_gasto
      )
  ), '[]'::jsonb) INTO v_gastos_por_categoria
  FROM (
      SELECT categoria, SUM(valor) AS total_gasto
      FROM gastos
      WHERE (fecha_gasto >= p_fecha_inicio::date AND fecha_gasto <= p_fecha_fin::date)
         OR (fecha_pago >= p_fecha_inicio::date AND fecha_pago <= p_fecha_fin::date)
         OR (created_at >= p_fecha_inicio AND created_at <= p_fecha_fin)
      GROUP BY categoria
  ) sub;

  -- 15. Valorización de Inventario
  SELECT jsonb_build_object(
      'total_precio', COALESCE(SUM(stock * precio), 0),
      'total_costo', COALESCE(SUM(stock * costo), 0)
  ) INTO v_valorizacion_inventario
  FROM productos;

  -- Construir la respuesta final JSON
  v_res := jsonb_build_object(
    'ventas_periodo', v_ventas_periodo,
    'ventas_previo', v_ventas_previo,
    'gastos_periodo', v_gastos_periodo,
    'gastos_previo', v_gastos_previo,
    'cogs_periodo', v_cogs_periodo,
    'cogs_previo', v_cogs_previo,
    'total_productos', v_total_productos,
    'stock_bajo_count', v_stock_bajo_count,
    'stock_bajo_lista', v_stock_bajo_lista,
    'ventas_grafico', v_ventas_grafico,
    'gastos_grafico', v_gastos_grafico,
    'productos_mas_vendidos', v_productos_mas_vendidos,
    'ventas_por_categoria', v_ventas_por_categoria,
    'gastos_por_categoria', v_gastos_por_categoria,
    'valorizacion_inventario', v_valorizacion_inventario
  );

  RETURN v_res;
END;
$$;
