-- ─────────────────────────────────────────────────────────────────────────────
-- Migración 012 — Sistema de Variantes de Productos
-- Agrega soporte para variantes (ej: Cervezas → Poker, Águila, Corona).
-- Ejecutar en el editor SQL de Supabase.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Añadir campo tiene_variantes a la tabla productos
ALTER TABLE productos ADD COLUMN IF NOT EXISTS tiene_variantes BOOLEAN DEFAULT false;

-- 2. Crear tabla producto_variantes
CREATE TABLE IF NOT EXISTS producto_variantes (
  id          SERIAL      PRIMARY KEY,
  producto_id INTEGER     NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  nombre      TEXT        NOT NULL,
  stock       INTEGER     NOT NULL DEFAULT 0 CHECK (stock >= 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_variantes_producto_id ON producto_variantes(producto_id);

-- 3. RLS para producto_variantes
ALTER TABLE producto_variantes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated can manage producto_variantes" ON producto_variantes;
CREATE POLICY "authenticated can manage producto_variantes"
  ON producto_variantes FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 4. Añadir variante_id a detalle_venta (nullable para mantener compatibilidad)
ALTER TABLE detalle_venta ADD COLUMN IF NOT EXISTS variante_id INTEGER REFERENCES producto_variantes(id) ON DELETE SET NULL;

-- 5. Actualizar RPC procesar_venta para soportar variantes
CREATE OR REPLACE FUNCTION procesar_venta(
  p_items JSONB,
  p_total NUMERIC
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_venta_id    INT;
  v_item        JSONB;
  v_producto_id INT;
  v_variante_id INT;
  v_cantidad    INT;
  v_precio      NUMERIC;
  v_stock_actual INT;
BEGIN
  -- 1. Crear el registro de la venta
  INSERT INTO ventas (fecha, total)
  VALUES (NOW(), p_total)
  RETURNING id INTO v_venta_id;

  -- 2. Procesar cada item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_producto_id := (v_item->>'producto_id')::INT;
    v_variante_id := CASE
      WHEN v_item->>'variante_id' IS NOT NULL AND (v_item->>'variante_id') <> 'null'
      THEN (v_item->>'variante_id')::INT
      ELSE NULL
    END;
    v_cantidad    := (v_item->>'cantidad')::INT;
    v_precio      := (v_item->>'precio')::NUMERIC;

    IF v_variante_id IS NOT NULL THEN
      -- Descuento por variante: verificar y bloquear fila
      SELECT stock INTO v_stock_actual
      FROM producto_variantes
      WHERE id = v_variante_id AND producto_id = v_producto_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'La variante ID % del producto ID % no existe', v_variante_id, v_producto_id;
      END IF;

      IF v_stock_actual < v_cantidad THEN
        RAISE EXCEPTION 'Stock insuficiente para la variante ID % (Disponible: %)', v_variante_id, v_stock_actual;
      END IF;

      UPDATE producto_variantes SET stock = stock - v_cantidad WHERE id = v_variante_id;

      -- Actualizar el stock total del producto padre
      UPDATE productos
      SET stock = (SELECT COALESCE(SUM(stock), 0) FROM producto_variantes WHERE producto_id = v_producto_id)
      WHERE id = v_producto_id;

    ELSE
      -- Descuento por producto simple
      SELECT stock INTO v_stock_actual
      FROM productos
      WHERE id = v_producto_id FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'El producto ID % no existe', v_producto_id;
      END IF;

      IF v_stock_actual < v_cantidad THEN
        RAISE EXCEPTION 'Stock insuficiente para el producto ID % (Disponible: %)', v_producto_id, v_stock_actual;
      END IF;

      UPDATE productos SET stock = stock - v_cantidad WHERE id = v_producto_id;
    END IF;

    -- Insertar detalle de venta
    INSERT INTO detalle_venta (venta_id, producto_id, variante_id, cantidad, subtotal)
    VALUES (v_venta_id, v_producto_id, v_variante_id, v_cantidad, v_cantidad * v_precio);

  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'venta_id', v_venta_id,
    'mensaje', 'Venta procesada exitosamente'
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error al procesar la venta: %', SQLERRM;
END;
$$;

-- 6. Actualizar RPC eliminar_venta para revertir stock de variante si aplica
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

  -- 2. Verificar que sea del mismo día (zona horaria Colombia)
  IF (v_fecha_venta AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota')::date <>
     (NOW()         AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota')::date THEN
    RAISE EXCEPTION 'No se permite eliminar ventas de días anteriores para conservar la integridad del historial.';
  END IF;

  -- 3. Revertir el stock (variante o producto simple)
  FOR v_item IN SELECT producto_id, variante_id, cantidad FROM detalle_venta WHERE venta_id = p_venta_id
  LOOP
    IF v_item.variante_id IS NOT NULL THEN
      UPDATE producto_variantes SET stock = stock + v_item.cantidad WHERE id = v_item.variante_id;

      -- Recalcular stock total del producto padre
      UPDATE productos
      SET stock = (SELECT COALESCE(SUM(stock), 0) FROM producto_variantes WHERE producto_id = v_item.producto_id)
      WHERE id = v_item.producto_id;
    ELSE
      UPDATE productos SET stock = stock + v_item.cantidad WHERE id = v_item.producto_id;
    END IF;
  END LOOP;

  -- 4. Eliminar el crédito asociado si existe
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
