-- ─────────────────────────────────────────────────────────────────────────────
-- Migración 010 — Módulo de Créditos
-- Tablas: clientes, creditos, pagos_credito
-- Ejecutar en el editor SQL de Supabase
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Tabla de clientes ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clientes (
  id          SERIAL PRIMARY KEY,
  nombre      TEXT        NOT NULL,
  telefono    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 2. Tabla de créditos ──────────────────────────────────────────────────────
-- Cada fila representa una venta que quedó pendiente de pago.
-- venta_id: referencia a la venta procesada (puede ser NULL si se registra
--           manualmente sin pasar por el POS, aunque el flujo normal lo llena).
CREATE TABLE IF NOT EXISTS creditos (
  id               SERIAL PRIMARY KEY,
  cliente_id       INTEGER     NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  venta_id         INTEGER     REFERENCES ventas(id) ON DELETE SET NULL,
  total            NUMERIC(12, 2) NOT NULL,
  saldo_pendiente  NUMERIC(12, 2) NOT NULL,
  estado           TEXT        NOT NULL DEFAULT 'Pendiente'
                               CHECK (estado IN ('Pendiente', 'Pagado')),
  nota             TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3. Tabla de pagos parciales o totales ────────────────────────────────────
CREATE TABLE IF NOT EXISTS pagos_credito (
  id          SERIAL PRIMARY KEY,
  credito_id  INTEGER        NOT NULL REFERENCES creditos(id) ON DELETE CASCADE,
  monto       NUMERIC(12, 2) NOT NULL CHECK (monto > 0),
  nota        TEXT,
  created_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ── 4. Índices ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_creditos_cliente_id ON creditos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_creditos_estado     ON creditos(estado);
CREATE INDEX IF NOT EXISTS idx_pagos_credito_id    ON pagos_credito(credito_id);

-- ── 5. RLS — Row Level Security ───────────────────────────────────────────────
-- Todas las tablas habilitadas; usuarios autenticados pueden leer y escribir.
ALTER TABLE clientes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE creditos     ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos_credito ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas anteriores si existen (idempotente)
DROP POLICY IF EXISTS "authenticated can manage clientes"      ON clientes;
DROP POLICY IF EXISTS "authenticated can manage creditos"      ON creditos;
DROP POLICY IF EXISTS "authenticated can manage pagos_credito" ON pagos_credito;

CREATE POLICY "authenticated can manage clientes"
  ON clientes FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated can manage creditos"
  ON creditos FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated can manage pagos_credito"
  ON pagos_credito FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── 6. Service-role policy (backend usa service_role) ─────────────────────────
-- Con service_role las políticas se bypasean por defecto.
-- Si en algún momento necesitas que el servicio anon también acceda,
-- añade políticas adicionales aquí.
