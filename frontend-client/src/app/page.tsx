'use client'

import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="landing-wrapper">
      <section className="landing-hero">
        <div>
          <span className="pill">Elecciones Web3 seguras</span>
          <h1>Orquesta procesos de votación confiables con trazabilidad on-chain.</h1>
          <p>
            Nuestro módulo permite que administradores creen elecciones temporizadas mientras que los votantes se autentican, vinculan su wallet y emiten votos auditables sobre la blockchain.
          </p>
          <div className="landing-actions">
            <Link href="/register" className="primary-button">Crear cuenta</Link>
            <Link href="/login" className="secondary-button">Iniciar sesión</Link>
          </div>
        </div>
        <div className="glass-panel">
          <h3>Resumen del flujo</h3>
          <div className="snapshot">
            <div className="stat">
              <span>Registro Web2</span>
              <strong>Alta de votantes y admin</strong>
            </div>
            <div className="stat">
              <span>Wallet vinculada</span>
              <strong>Identidad on-chain</strong>
            </div>
            <div className="stat">
              <span>Elecciones activas</span>
              <strong>Seguimiento en tiempo real</strong>
            </div>
            <div className="stat">
              <span>Auditoría</span>
              <strong>Eventos inmutables</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-feature-grid">
        <article className="feature-card">
          <h3>Experiencia del votante</h3>
          <p>Un panel dedicado para que cada ciudadano vincule su wallet, consulte elecciones y emita su voto con feedback inmediato.</p>
        </article>
        <article className="feature-card">
          <h3>Panel administrativo</h3>
          <p>Creación de elecciones con control de fechas, duración y whitelist inicial utilizando API Key protegida.</p>
        </article>
        <article className="feature-card">
          <h3>Transparencia total</h3>
          <p>Todos los eventos críticos quedan registrados en la blockchain y en el backend para auditorías y reportes.</p>
        </article>
        <article className="feature-card">
          <h3>Arquitectura modular</h3>
          <p>Backend REST, smart contract y frontend Next.js listos para desplegar en entornos locales o redes L2.</p>
        </article>
      </section>
    </div>
  )
}
