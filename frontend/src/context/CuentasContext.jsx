import { createContext, useContext, useState, useCallback } from 'react'

const CuentasContext = createContext(null)

/**
 * CuentasProvider — mantiene el estado de las cuentas abiertas a nivel de app,
 * de modo que persistan al navegar entre páginas.
 */
export function CuentasProvider({ children }) {
  const [cuentas, setCuentas] = useState([])
  const [cuentaActivaId, setCuentaActivaId] = useState(null)
  const [contador, setContador] = useState(1)

  // ── Computed ──────────────────────────────────────────────────────────────
  const cuentaActiva = cuentas.find((c) => c.id === cuentaActivaId) ?? null

  // ── Crear cuenta desde el carrito ─────────────────────────────────────────
  const guardarComoCuenta = useCallback((items) => {
    if (!items || items.length === 0) return

    const nuevaCuenta = {
      id: crypto.randomUUID(),
      nombre: `Cuenta ${contador}`,
      items: items.map((i) => ({ ...i })),
    }

    setCuentas((prev) => [...prev, nuevaCuenta])
    setContador((n) => n + 1)
    setCuentaActivaId(null)
  }, [contador])

  // ── Seleccionar / deseleccionar ───────────────────────────────────────────
  /**
   * Devuelve los items de la cuenta seleccionada para cargarlos en el carrito.
   * Si la cuenta ya era la activa, la deselecciona y devuelve [].
   */
  const seleccionarCuenta = useCallback((id) => {
    if (cuentaActivaId === id) {
      setCuentaActivaId(null)
      return []
    }
    const cuenta = cuentas.find((c) => c.id === id)
    if (!cuenta) return []
    setCuentaActivaId(id)
    return cuenta.items.map((i) => ({ ...i }))
  }, [cuentas, cuentaActivaId])

  const deseleccionarCuenta = useCallback(() => {
    setCuentaActivaId(null)
  }, [])

  // ── Renombrar ─────────────────────────────────────────────────────────────
  const renombrarCuenta = useCallback((id, nombre) => {
    setCuentas((prev) =>
      prev.map((c) => (c.id === id ? { ...c, nombre: nombre.trim() || c.nombre } : c))
    )
  }, [])

  // ── Sincronizar items (cuando el carrito cambia con cuenta activa) ─────────
  const actualizarItemsCuenta = useCallback((id, items) => {
    setCuentas((prev) =>
      prev.map((c) => (c.id === id ? { ...c, items: items.map((i) => ({ ...i })) } : c))
    )
  }, [])

  // ── Eliminar (al cobrar) ──────────────────────────────────────────────────
  const eliminarCuenta = useCallback((id) => {
    setCuentas((prev) => prev.filter((c) => c.id !== id))
    setCuentaActivaId((prev) => (prev === id ? null : prev))
  }, [])

  const value = {
    cuentas,
    cuentaActivaId,
    cuentaActiva,
    guardarComoCuenta,
    seleccionarCuenta,
    deseleccionarCuenta,
    renombrarCuenta,
    actualizarItemsCuenta,
    eliminarCuenta,
  }

  return <CuentasContext.Provider value={value}>{children}</CuentasContext.Provider>
}

export function useCuentas() {
  const ctx = useContext(CuentasContext)
  if (!ctx) throw new Error('useCuentas debe usarse dentro de <CuentasProvider>')
  return ctx
}
