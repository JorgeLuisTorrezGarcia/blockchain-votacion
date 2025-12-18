'use client'

import { useEffect, useState } from 'react'
import type { Election, PaginatedResponse } from '../../../types/admin'
import { useAdminAccess } from '../../../hooks/useAdminAccess'

const PAGE_LIMIT = 20

export default function AdminElectionsPage() {
  const { isReady } = useAdminAccess()
  const [items, setItems] = useState<Election[]>([])
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
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/admin/elections?page=${page}&limit=${PAGE_LIMIT}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        const data: PaginatedResponse<Election> & { message?: string } = await res.json()
        if (!res.ok) {
          throw new Error(data.message || 'No fue posible obtener las elecciones')
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
            <h2>Elecciones registradas</h2>
            <p>Resumen de todas las elecciones creadas via panel o API.</p>
          </div>
        </div>

        {error && <div className="message error">{error}</div>}
        {loading && <div className="message info">Cargando elecciones…</div>}

        {!loading && !items.length && !error && (
          <p className="empty-state">No hay elecciones registradas todavía.</p>
        )}

        {!loading && items.length > 0 && (
          <div className="table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID on-chain</th>
                  <th>Título</th>
                  <th>Inicio</th>
                  <th>Fin</th>
                  <th>Opciones</th>
                  <th>Registrada</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="mono">{item.on_chain_id}</td>
                    <td>{item.title}</td>
                    <td>{item.start_time ? new Date(item.start_time).toLocaleString() : 'Sin programar'}</td>
                    <td>{item.end_time ? new Date(item.end_time).toLocaleString() : 'Sin programar'}</td>
                    <td>{item.options?.length ?? 0}</td>
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
