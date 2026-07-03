import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { AlertCircle, Loader2 } from 'lucide-react'
import { supabase } from '../services/supabaseClient'
import { useAuth } from '../hooks/useAuth'

const ERROR_MESSAGES = {
  'Invalid login credentials':  'Correo o contraseña incorrectos.',
  'Email not confirmed':        'Debes confirmar tu correo electrónico antes de iniciar sesión.',
  'Too many requests':          'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.',
  'User not found':             'No existe una cuenta con ese correo electrónico.',
}

function translateError(message = '') {
  for (const [key, value] of Object.entries(ERROR_MESSAGES)) {
    if (message.toLowerCase().includes(key.toLowerCase())) return value
  }
  return 'Ocurrió un error al iniciar sesión. Inténtalo de nuevo.'
}

export default function Login() {
  const { session, loading } = useAuth()
  const [logoError, setLogoError] = useState(false)
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [error,     setError]     = useState(null)
  const [isPending, setIsPending] = useState(false)

  if (!loading && session) {
    return <Navigate to="/pos" replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setIsPending(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(translateError(error.message))
      setIsPending(false)
    }
  }

  return (
    <div className="login-root">
      <div className="login-card">

        {/* ── Panel izquierdo: marca ── */}
        <div className="brand-panel">
          <div className="logo-wrap">
            {!logoError ? (
              <img
                src="/logo.webp"
                alt="El Cafecito"
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="logo-fallback">☕</div>
            )}
          </div>
          <h1>El Cafecito</h1>
          <p>Sistema · Punto de Venta</p>
        </div>

        {/* ── Panel derecho: formulario tipo ticket ── */}
        <div className="form-panel">
          <p className="eyebrow">Acceso al sistema</p>
          <h2>Bienvenido de vuelta</h2>

          {error && (
            <div className="login-error">
              <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div className="login-field">
              <label htmlFor="login-email">Correo electrónico</label>
              <div className="input-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="correo@ejemplo.com"
                />
              </div>
            </div>

            {/* Contraseña */}
            <div className="login-field">
              <label htmlFor="login-password">Contraseña</label>
              <div className="input-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Botón */}
            <button
              id="login-submit"
              type="submit"
              className="login-submit"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Verificando…
                </>
              ) : (
                'Iniciar sesión'
              )}
            </button>
          </form>

          {/* Separador de ticket */}
          <div className="login-perf" />

          <div className="login-ticket-foot">
            <span>El Cafecito POS</span>
            <span>v1.0.0</span>
          </div>
        </div>

      </div>
    </div>
  )
}
