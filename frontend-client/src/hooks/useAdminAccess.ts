'use client'

import { useEffect, useState } from 'react'
import { ADMIN_API_KEY } from '../lib/admin-config'

export function useAdminAccess() {
  const [status, setStatus] = useState<'checking' | 'ready'>('checking')

  useEffect(() => {
    const token = window.localStorage.getItem('token')
    const role = window.localStorage.getItem('role')

    if (!token) {
      window.location.href = '/login'
      return
    }

    if (role !== 'admin') {
      window.location.href = '/dashboard'
      return
    }

    const verify = async () => {
      try {
        const res = await fetch('http://localhost:4000/api/admin/verify', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!res.ok) {
          window.location.href = '/dashboard'
          return
        }

        if (!ADMIN_API_KEY) {
          console.warn('NEXT_PUBLIC_ADMIN_API_KEY no está configurada; la API admin puede fallar en el frontend.')
        }

        setStatus('ready')
      } catch (error) {
        console.error('Fallo verificando credenciales admin', error)
        window.location.href = '/dashboard'
      }
    }

    verify()
  }, [])

  return {
    isReady: status === 'ready',
  }
}
