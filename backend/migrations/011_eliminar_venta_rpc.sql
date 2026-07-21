-- ─────────────────────────────────────────────────────────────────────────────
-- Migración 011 — RPC para Eliminar Venta
-- Permite revertir stock, borrar crédito asociado y eliminar la venta del día.
-- Ejecutar en el editor SQL de Supabase.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION eliminar_venta(p_venta_id INT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fecha_venta TIMESTAMPTZ;
  v_item RECORD;
BEGIN
  -- 1. Obtener la fecha de la venta y verificar si existe
  SELECT fecha INTO v_fecha_venta FROM ventas WHERE id = p_venta_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'La venta con ID % no existe', p_venta_id;
  END IF;

  -- 2. Verificar que sea del mismo día en la zona horaria de Colombia (America/Bogota)
  IF (v_fecha_venta AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota')::date <> (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota')::date THEN
    RAISE EXCEPTION 'No se permite eliminar ventas de días anteriores para conservar la integridad del historial.';
  END IF;

  -- 3. Revertir el stock en productos
  FOR v_item IN SELECT producto_id, cantidad FROM detalle_venta WHERE venta_id = p_venta_id
  LOOP
    UPDATE productos
    SET stock = stock + v_item.cantidad
    WHERE id = v_item.producto_id;
  END LOOP;

  -- 4. Eliminar el crédito asociado si existe (borra pagos_credito en cascada)
  DELETE FROM creditos WHERE venta_id = p_venta_id;

  -- 5. Eliminar detalles de la venta
  DELETE FROM detalle_venta WHERE venta_id = p_venta_id;

  -- 6. Eliminar la venta principal
  DELETE FROM ventas WHERE id = p_venta_id;

  RETURN jsonb_build_object(
    'success', true,
    'mensaje', 'Venta eliminada correctamente e inventario restablecido.'
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error al eliminar la venta: %', SQLERRM;
END;
$$;
