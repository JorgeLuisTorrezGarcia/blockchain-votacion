'use client'

import { useState } from 'react'

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: ''
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const res = await fetch('http://localhost:4000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.message || 'Error en registro')

      setMessage('Registro exitoso. Redirigiendo al login...')
      setTimeout(() => window.location.href = '/login', 2000)
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
          <h1>Crear cuenta</h1>
          <p>Regístrate con tus datos personales para acceder como votante y participar en elecciones.</p>
        </header>

        <form onSubmit={handleRegister} className="auth-form">
          <label className="input-label" htmlFor="register-name">Nombre completo</label>
          <input
            id="register-name"
            className="input"
            type="text"
            name="full_name"
            value={formData.full_name}
            onChange={handleChange}
            placeholder="Tu nombre y apellidos"
            required
          />

          <label className="input-label" htmlFor="register-email">Correo electrónico</label>
          <input
            id="register-email"
            className="input"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="tu.correo@dominio.com"
            required
          />

          <label className="input-label" htmlFor="register-password">Contraseña</label>
          <input
            id="register-password"
            className="input"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Crea una contraseña segura"
            required
          />

          <button type="submit" disabled={loading} className="primary-button">
            {loading ? 'Registrando...' : 'Crear cuenta'}
          </button>

          {message && (
            <div className={`message inline ${message.includes('exitoso') ? 'success' : 'error'}`}>
              {message}
            </div>
          )}
        </form>

        <div className="auth-footer">
          <span>¿Ya tienes cuenta?</span>
          <a href="/login">Inicia sesión</a>
        </div>
      </div>
    </div>
  )
}
