'use client'

import { useState } from 'react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const res = await fetch('http://localhost:4000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.message || 'Error en login')

      localStorage.setItem('token', data.token)
      if (data.role) {
        localStorage.setItem('role', data.role)
      }

      const destination = data.role === 'admin' ? '/admin' : '/dashboard'
      window.location.href = destination
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <header>
          <h1>Iniciar sesión</h1>
          <p>Accede al panel de votante para vincular tu wallet y participar en elecciones activas.</p>
        </header>

        <form onSubmit={handleLogin} className="auth-form">
          <label className="input-label" htmlFor="login-email">Correo electrónico</label>
          <input
            id="login-email"
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu.correo@dominio.com"
            required
          />

          <label className="input-label" htmlFor="login-password">Contraseña</label>
          <input
            id="login-password"
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          <button type="submit" disabled={loading} className="primary-button">
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>

          {message && (
            <div className={`message inline ${message.includes('exitoso') ? 'success' : 'error'}`}>
              {message}
            </div>
          )}
        </form>

        <div className="auth-footer">
          <span>¿No tienes cuenta?</span>
          <a href="/register">Crear cuenta</a>
        </div>
      </div>
    </div>
  )
}
