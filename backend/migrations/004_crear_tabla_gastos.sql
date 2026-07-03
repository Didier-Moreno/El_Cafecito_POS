-- Migration: 004_crear_tabla_gastos.sql
-- Crea la tabla gastos para El Cafecito
-- Diseñada para escalar con recordatorios, adjuntos y pedidos a proveedores

CREATE TABLE IF NOT EXISTS gastos (
    id              BIGSERIAL PRIMARY KEY,
    concepto        TEXT NOT NULL,
    proveedor       TEXT,
    categoria       TEXT NOT NULL,
    valor           NUMERIC(12, 2) NOT NULL DEFAULT 0,
    fecha_gasto     DATE,
    fecha_pago      DATE,
    estado          TEXT NOT NULL DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente', 'Pagado', 'Cancelado')),
    observaciones   TEXT,

    -- Campos de auditoría (preparados para historial de pagos futuro)
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_gastos_estado      ON gastos(estado);
CREATE INDEX IF NOT EXISTS idx_gastos_categoria   ON gastos(categoria);
CREATE INDEX IF NOT EXISTS idx_gastos_fecha_pago  ON gastos(fecha_pago);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_gastos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_gastos_updated_at
BEFORE UPDATE ON gastos
FOR EACH ROW EXECUTE FUNCTION update_gastos_updated_at();

-- ── Políticas RLS ────────────────────────────────────────────────────────────
-- Habilitar RLS en la tabla (Supabase lo activa por defecto al crear)
ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;

-- Permitir acceso completo al rol anon (mismo patrón que la tabla productos)
CREATE POLICY "Allow all for anon" ON gastos
    FOR ALL
    TO anon
    USING (true)
    WITH CHECK (true);

-- Permitir acceso completo al rol authenticated también
CREATE POLICY "Allow all for authenticated" ON gastos
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

