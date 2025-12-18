'use client'

import { useEffect, useState } from 'react'
import type { PaginatedResponse, RegisteredVoter } from '../../../types/admin'
import { useAdminAccess } from '../../../hooks/useAdminAccess'

const PAGE_LIMIT = 25

export default function AdminVotersPage() {
  const { isReady } = useAdminAccess()
  const [items, setItems] = useState<RegisteredVoter[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    if (!isReady) return

    const fetchData = async () => {
      setLoading(true)
      setError(null)

      try {
        const token = localStorage.getItem('token')
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/admin/voters?page=${page}&limit=${PAGE_LIMIT}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        const data: PaginatedResponse<RegisteredVoter> & { message?: string } = await res.json()
        if (!res.ok) {
          throw new Error(data.message || 'No fue posible obtener el padrón de usuarios')
        }

        setItems(data.results || [])
        setTotal(data.total || 0)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [isReady, page])

  if (!isReady) {
    return (
      <section className="admin-grid">
        <article className="admin-card">
          <h2>Validando credenciales…</h2>
        </article>
      </section>
    )
  }

  return (
    <section className="admin-grid">
      <article className="admin-card">
        <div className="admin-card-header">
          <div>
            <h2>Padrón de votantes</h2>
            <p>Usuarios registrados en la plataforma y su estado de wallet.</p>
          </div>
        </div>

        {error && <div className="message error">{error}</div>}
        {loading && <div className="message info">Cargando padrón…</div>}

        {!loading && !items.length && !error && (
          <p className="empty-state">No hay usuarios registrados todavía.</p>
        )}

        {!loading && items.length > 0 && (
          <div className="table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Wallet</th>
                  <th>Rol</th>
                  <th>Registro</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.full_name}</td>
                    <td>{item.email}</td>
                    <td className="mono">{item.wallet_address ?? 'Sin vincular'}</td>
                    <td>
                      <span className={`badge ${item.role === 'admin' ? 'badge-accent' : ''}`}>
                        {item.role === 'admin' ? 'Admin' : 'Votante'}
                      </span>
                    </td>
                    <td>{new Date(item.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {total > PAGE_LIMIT && (
          <div className="pagination">
            <button
              type="button"
              className="ghost-button"
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              disabled={page === 1 || loading}
            >
              Anterior
            </button>
            <span>Página {page}</span>
            <button
              type="button"
              className="ghost-button"
              onClick={() => setPage((prev) => prev + 1)}
              disabled={page * PAGE_LIMIT >= total || loading}
            >
              Siguiente
            </button>
          </div>
        )}
      </article>
    </section>
  )
}
