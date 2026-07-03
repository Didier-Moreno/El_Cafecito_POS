-- Función RPC para procesar ventas de forma atómica
-- Esta función maneja la transacción completa:
-- 1. Crea la venta
-- 2. Verifica y descuenta el stock
-- 3. Crea los detalles de la venta
-- Si ocurre algún error (ej. stock insuficiente), se hace un rollback automático de todo.

CREATE OR REPLACE FUNCTION procesar_venta(
  p_items JSONB,
  p_total NUMERIC
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_venta_id INT;
  v_item JSONB;
  v_producto_id INT;
  v_cantidad INT;
  v_precio NUMERIC;
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
    v_cantidad := (v_item->>'cantidad')::INT;
    v_precio := (v_item->>'precio')::NUMERIC;

    -- Verificar stock y bloquear fila para evitar condiciones de carrera
    SELECT stock INTO v_stock_actual
    FROM productos
    WHERE id = v_producto_id FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'El producto ID % no existe', v_producto_id;
    END IF;

    IF v_stock_actual < v_cantidad THEN
      RAISE EXCEPTION 'Stock insuficiente para el producto ID % (Disponible: %)', v_producto_id, v_stock_actual;
    END IF;

    -- Actualizar stock
    UPDATE productos
    SET stock = stock - v_cantidad
    WHERE id = v_producto_id;

    -- Insertar detalle de venta
    INSERT INTO detalle_venta (venta_id, producto_id, cantidad, subtotal)
    VALUES (v_venta_id, v_producto_id, v_cantidad, v_cantidad * v_precio);

  END LOOP;

  -- Retornar el ID de la venta creada si todo fue exitoso
  RETURN jsonb_build_object(
    'success', true,
    'venta_id', v_venta_id,
    'mensaje', 'Venta procesada exitosamente'
  );
EXCEPTION
  WHEN OTHERS THEN
    -- PL/pgSQL realiza rollback automáticamente al lanzar la excepción
    RAISE EXCEPTION 'Error al procesar la venta: %', SQLERRM;
END;
$$;
