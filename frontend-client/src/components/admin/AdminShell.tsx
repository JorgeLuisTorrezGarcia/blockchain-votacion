'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'
import { useAdminAccess } from '../../hooks/useAdminAccess'

const NAV_ITEMS = [
  { label: 'Crear elección', href: '/admin' },
  { label: 'Elecciones creadas', href: '/admin/elections' },
  { label: 'Padrón de votantes', href: '/admin/voters' },
]

function isActive(pathname: string, href: string) {
  if (href === '/admin') {
    return pathname === '/admin'
  }

  return pathname.startsWith(href)
}

export default function AdminShell({ children }: { children: ReactNode }) {
  const { isReady } = useAdminAccess()
  const pathname = usePathname()

  if (!isReady) {
    return (
      <div className="admin-shell">
        <div className="admin-loading">
          <div className="spinner" aria-hidden />
          <p>Validando credenciales administrativas…</p>
        </div>
      </div>
    )
  }

  const handleLogout = () => {
    window.localStorage.removeItem('token')
    window.localStorage.removeItem('role')
    window.location.href = '/login'
  }

  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <div className="admin-brand">
          <span className="admin-brand-title">Axiom Governance</span>
          <span className="admin-brand-subtitle">Panel administrativo</span>
        </div>

        <nav className="admin-nav" aria-label="Secciones de administración">
          {NAV_ITEMS.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className={`admin-nav-link${isActive(pathname, href) ? ' active' : ''}`}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="admin-topbar-actions">
          <Link href="/dashboard" className="secondary-button">
            Panel de votante
          </Link>
          <button type="button" className="ghost-button" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="admin-content">{children}</main>
    </div>
  )
}
