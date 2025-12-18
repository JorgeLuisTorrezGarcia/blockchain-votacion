'use client'

import { useEffect, useState } from 'react'
import { ADMIN_API_KEY } from '../../lib/admin-config'
import { useAdminAccess } from '../../hooks/useAdminAccess'

export default function AdminPage() {
  const { isReady } = useAdminAccess()
  const [electionData, setElectionData] = useState({
    title: '',
    description: '',
    startTime: '',
    duration: '',
    options: [''],
    initialVoters: ''
  })
  const [loading, setLoading] = useState('')
  const [message, setMessage] = useState('')
  const [lastElection, setLastElection] = useState<{
    electionId: string;
    receipt?: {
      transactionHash: string;
      blockNumber: number;
      startTime: number;
      endTime: number;
      options: string[];
      initialVoters: string[];
    };
    queueSummary?: {
      targetedUsers?: number;
      unmatchedWallets?: string[];
    };
  } | null>(null)
  const [apiKey, setApiKey] = useState('')

  useEffect(() => {
    if (typeof window === 'undefined') return

    const storedKey = window.localStorage.getItem('admin_api_key')
    if (storedKey && storedKey.trim().length > 0) {
      setApiKey(storedKey.trim())
      return
    }

    if (ADMIN_API_KEY) {
      setApiKey(ADMIN_API_KEY)
    }
  }, [])

  const handleElectionChange = (field: string, value: string) => {
    setElectionData(prev => ({ ...prev, [field]: value }))
  }

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...electionData.options]
    newOptions[index] = value
    setElectionData(prev => ({ ...prev, options: newOptions }))
  }

  const addOption = () => {
    setElectionData(prev => ({ ...prev, options: [...prev.options, ''] }))
  }

  const handleCreateElection = async (e: React.FormEvent) => {
    e.preventDefault()

    const headerApiKey = (apiKey || ADMIN_API_KEY || '').trim()
    if (!headerApiKey) {
      setMessage('Define una clave API administrativa antes de crear elecciones.')
      return
    }

    setLoading('create-election')
    setMessage('')

    try {
      const token = localStorage.getItem('token')
      const cleanOptions = electionData.options.map(opt => opt.trim()).filter(Boolean)
      const cleanVoters = electionData.initialVoters
        .split(/\r?\n|,/)
        .map((address) => address.trim())
        .filter(Boolean)

      const payload = {
        title: electionData.title,
        description: electionData.description,
        start_time: electionData.startTime ? new Date(electionData.startTime).toISOString() : null,
        duration_minutes: electionData.duration ? parseInt(electionData.duration) : null,
        options: cleanOptions,
        initial_voters: cleanVoters,
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/admin/elections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Admin-API-Key': headerApiKey
        },
        body: JSON.stringify(payload)
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.message || 'Error creando elección')

      setMessage(`Elección creada con éxito. ID: ${data.electionId}`)
      setLastElection(data)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('admin_api_key', headerApiKey)
      }
      // Reset form
      setElectionData({
        title: '',
        description: '',
        startTime: '',
        duration: '',
        options: [''],
        initialVoters: ''
      })
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Error desconocido')
    } finally {
      setLoading('')
    }
  }

  if (!isReady) {
    return (
      <section className="admin-grid">
        <article className="admin-card">
          <h2>Validando credenciales…</h2>
          <p>Estamos verificando tu rol y permisos administrativos.</p>
        </article>
      </section>
    )
  }

  return (
    <section className="admin-grid">
      <article className="admin-card">
        <h2>Nueva elección</h2>
        <p>Configura título, descripción, programación y opciones visibles para los votantes.</p>

        <form onSubmit={handleCreateElection} className="card-form">
            <label className="input-label" htmlFor="admin-title">Título de la elección</label>
            <input
              id="admin-title"
              className="input"
              type="text"
              value={electionData.title}
              onChange={(e) => handleElectionChange('title', e.target.value)}
              placeholder="Elección general 2025"
              required
            />

            <label className="input-label" htmlFor="admin-description">Descripción</label>
            <textarea
              id="admin-description"
              value={electionData.description}
              onChange={(e) => handleElectionChange('description', e.target.value)}
              placeholder="Detalle los objetivos de la elección, requisitos o notas internas"
              required
            />

            <div className="split-grid">
              <label className="input-label" htmlFor="admin-start">Inicio</label>
              <label className="input-label" htmlFor="admin-duration">Duración (minutos)</label>

              <input
                id="admin-start"
                className="input"
                type="datetime-local"
                value={electionData.startTime}
                onChange={(e) => handleElectionChange('startTime', e.target.value)}
                required
              />

              <input
                id="admin-duration"
                className="input"
                type="number"
                min={1}
                value={electionData.duration}
                onChange={(e) => handleElectionChange('duration', e.target.value)}
                required
              />
            </div>

            <div className="options-grid">
              {electionData.options.map((option, index) => (
                <div key={index} className="option-card">
                  <span className="option-index">Opción {index + 1}</span>
                  <input
                    className="input"
                    type="text"
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`Nombre de la opción ${index + 1}`}
                    required
                  />
                </div>
              ))}
            </div>
            <button type="button" onClick={addOption} className="secondary-button">
              Añadir otra opción
            </button>

            <label className="input-label" htmlFor="admin-initial-voters">Whitelist inicial (opcional)</label>
            <textarea
              id="admin-initial-voters"
              value={electionData.initialVoters}
              onChange={(e) => handleElectionChange('initialVoters', e.target.value)}
              placeholder="Pega direcciones 0x separadas por nueva línea o comas"
            />

            <label className="input-label" htmlFor="admin-api-key">Clave API administrativa</label>
            <input
              id="admin-api-key"
              className="input"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Clave API definida en el backend"
              required={!ADMIN_API_KEY}
            />
            <p className="small-note">Se guardará de forma local para próximos inicios de sesión.</p>

            <button type="submit" disabled={loading === 'create-election'} className="primary-button">
              {loading === 'create-election' ? 'Publicando elección...' : 'Publicar elección'}
            </button>

            {message && (
              <div className={`message inline ${message.includes('éxito') ? 'success' : 'error'}`}>
                {message}
              </div>
            )}

            {lastElection && (
              <div className="info-card" style={{ marginTop: '12px' }}>
                <h3>Elección registrada</h3>
                <p><strong>ID on-chain:</strong> {lastElection.electionId}</p>
                <p><strong>Transacción:</strong> {lastElection.receipt?.transactionHash || 'N/A'}</p>
                <p><strong>Usuarios notificados:</strong> {lastElection.queueSummary?.targetedUsers ?? 0}</p>
                {Array.isArray(lastElection.queueSummary?.unmatchedWallets) && lastElection.queueSummary.unmatchedWallets.length > 0 && (
                  <div className="small-note">
                    <strong>Wallets sin usuario asignado:</strong>
                    <ul>
                      {lastElection.queueSummary.unmatchedWallets.map((wallet: string) => (
                        <li key={wallet}>{wallet}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
        </form>
      </article>
    </section>
  )
}
