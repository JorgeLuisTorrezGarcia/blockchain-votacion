'use client'

import { useState, useEffect } from 'react'

type ElectionData = {
  title: string
  description: string
  isActive: boolean
  options: string[]
  results: number[]
  startTime?: number
  endTime?: number
}

type VoterStatus = {
  isAuthorized: boolean
  hasVoted: boolean
}

export default function DashboardPage() {
  const [token, setToken] = useState('')
  const [walletAddress, setWalletAddress] = useState('')
  const [electionId, setElectionId] = useState('')
  const [electionData, setElectionData] = useState<ElectionData | null>(null)
  const [voterStatus, setVoterStatus] = useState<VoterStatus | null>(null)
  const [loading, setLoading] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const storedToken = localStorage.getItem('token')
    if (!storedToken) {
      window.location.href = '/login'
      return
    }
    setToken(storedToken)
  }, [])

  const handleLinkWallet = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading('link-wallet')
    setMessage('')

    try {
      const res = await fetch('http://localhost:4000/api/users/link-wallet', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ wallet_address: walletAddress })
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.message || 'Error vinculando wallet')

      setMessage('Wallet vinculada con éxito')
      setWalletAddress('')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Error desconocido')
    } finally {
      setLoading('')
    }
  }

  const handleFetchElection = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading('fetch-election')
    setMessage('')
    setElectionData(null)

    try {
      const trimmedId = electionId.trim()
      if (!trimmedId) {
        throw new Error('Ingresa un ID de elección válido')
      }

      const res = await fetch(`http://localhost:4000/api/elections/${trimmedId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.message || 'Error obteniendo elección')

      const start = Number(data.startTime ?? 0)
      const end = Number(data.endTime ?? 0)
      const now = Math.floor(Date.now() / 1000)
      const hasStarted = start === 0 || now >= start
      const notFinished = end === 0 || now <= end

      setElectionData({
        title: data.title ?? 'Elección sin título',
        description: data.description ?? '',
        isActive: Boolean(hasStarted && notFinished),
        options: Array.isArray(data.options) ? data.options : [],
        results: Array.isArray(data.voteCounts) ? data.voteCounts.map((value: unknown) => Number(value) || 0) : [],
        startTime: start,
        endTime: end,
      })
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Error desconocido')
    } finally {
      setLoading('')
    }
  }

  const fetchVoterStatus = async () => {
    setLoading('check-voter')
    setMessage('')
    setVoterStatus(null)

    try {
      const trimmedId = electionId.trim()
      if (!trimmedId) {
        throw new Error('Consulta primero una elección válida.')
      }

      const normalizedWallet = walletAddress.trim()
      if (!normalizedWallet) {
        throw new Error('Vincula o ingresa tu wallet para verificar el estado del votante.')
      }

      const res = await fetch(`http://localhost:4000/api/elections/${trimmedId}/voters/${normalizedWallet}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.message || 'Error verificando estado')

      setVoterStatus(data)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Error desconocido')
    } finally {
      setLoading('')
    }
  }

  const handleVote = async (optionIndex: number) => {
    setLoading('vote')
    setMessage('')

    try {
      const res = await fetch(`http://localhost:4000/api/elections/${electionId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ optionIndex })
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.message || 'Error votando')

      setMessage('Voto emitido con éxito')
      
      // Actualizar estado del votante
      setTimeout(() => fetchVoterStatus(), 1000)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Error desconocido')
    } finally {
      setLoading('')
    }
  }

  return (
    <div className="dashboard-wrapper">
      <header className="dashboard-header">
        <div className="header-copy">
          <h1>Panel de Votante</h1>
          <p>Gestiona tu wallet y participa en elecciones activas desde un solo lugar.</p>
        </div>
        <button onClick={() => { localStorage.removeItem('token'); window.location.href = '/login' }} className="ghost-button">
          Cerrar Sesión
        </button>
      </header>

      <section className="card-grid">
        <article className="dashboard-card">
          <h2>Vincular Wallet</h2>
          <p>Asocia tu dirección Ethereum para validar tu identidad Web3.</p>
          <form onSubmit={handleLinkWallet} className="card-form">
            <label className="input-label" htmlFor="wallet-address">Dirección de Wallet</label>
            <input
              id="wallet-address"
              type="text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              placeholder="0x..."
              required
              className="input"
            />
            <button type="submit" disabled={loading === 'link-wallet'} className="primary-button">
              {loading === 'link-wallet' ? 'Vinculando...' : 'Vincular Wallet'}
            </button>
          </form>
        </article>

        <article className="dashboard-card">
          <h2>Consultar Elección</h2>
          <p>Ingresa el ID de la elección para revisar su estado y opciones.</p>
          <form onSubmit={handleFetchElection} className="card-form">
            <label className="input-label" htmlFor="election-id">ID de Elección</label>
            <input
              id="election-id"
              type="number"
              value={electionId}
              onChange={(e) => setElectionId(e.target.value)}
              required
              className="input"
            />
            <button type="submit" disabled={loading === 'fetch-election'} className="primary-button">
              {loading === 'fetch-election' ? 'Consultando...' : 'Consultar'}
            </button>
          </form>
        </article>
      </section>

      {/* Datos de Elección */}
      {electionData && (
        <section className="info-card">
          <header>
            <div>
              <h3>{electionData.title}</h3>
              <span className={`status-badge ${electionData.isActive ? 'active' : 'inactive'}`}>
                {electionData.isActive ? 'Activa' : 'Inactiva'}
              </span>
            </div>
            <p>{electionData.description}</p>
          </header>
          <div className="options-grid">
            {electionData.options.map((opt, i) => (
              <div key={i} className="option-card">
                <span className="option-index">#{i + 1}</span>
                <p>{opt}</p>
                <span className="option-votes">{electionData.results[i] ?? 0} votos</span>
              </div>
            ))}
          </div>
          <button onClick={fetchVoterStatus} disabled={loading === 'check-voter'} className="secondary-button">
            {loading === 'check-voter' ? 'Verificando...' : 'Verificar Mi Estado'}
          </button>
        </section>
      )}

      {/* Estado del Votante */}
      {voterStatus && (
        <section className="info-card">
          <h3>Mi Estado como Votante</h3>
          <div className="status-grid">
            <div>
              <span className="status-label">Autorizado</span>
              <span className={`status-value ${voterStatus.isAuthorized ? 'positive' : 'negative'}`}>
                {voterStatus.isAuthorized ? 'Sí' : 'No'}
              </span>
            </div>
            <div>
              <span className="status-label">Voto emitido</span>
              <span className={`status-value ${voterStatus.hasVoted ? 'negative' : 'positive'}`}>
                {voterStatus.hasVoted ? 'Sí' : 'No'}
              </span>
            </div>
          </div>

          {voterStatus.isAuthorized && !voterStatus.hasVoted && electionData?.isActive && (
            <div className="vote-actions">
              <h4>Selecciona tu opción:</h4>
              <div className="options-grid">
                {electionData.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => handleVote(i)}
                    disabled={loading === 'vote'}
                    className="primary-button"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Mensajes */}
      {message && (
        <div className={`feedback-banner ${message.includes('éxito') || message.includes('exitoso') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}
    </div>
  )
}
