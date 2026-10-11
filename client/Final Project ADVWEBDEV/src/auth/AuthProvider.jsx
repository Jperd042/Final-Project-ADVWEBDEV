import { useEffect, useState } from 'react'
import { api, errorMessage } from '../lib/api'
import { AuthContext } from './AuthContext'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  function checkSession() {
    setLoading(true)
    setError('')
    setAttempt((value) => value + 1)
  }

  useEffect(() => {
    const controller = new AbortController()
    const interceptor = api.interceptors.response.use((response) => response, (failure) => {
      if (failure.response?.status === 401 && failure.response.data?.code === 'UNAUTHENTICATED') setUser(null)
      return Promise.reject(failure)
    })
    api.get('/auth/me', { signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted) setUser(data.user)
      })
      .catch((failure) => {
        if (controller.signal.aborted) return
        setUser(null)
        if (failure.response?.status !== 401) setError(errorMessage(failure))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => {
      controller.abort()
      api.interceptors.response.eject(interceptor)
    }
  }, [attempt])

  async function authenticate(mode, values) {
    const { data } = await api.post(`/auth/${mode}`, values)
    setUser(data.user)
  }

  async function logout() {
    try {
      await api.post('/auth/logout')
    } catch (failure) {
      if (failure.response?.status !== 401) throw failure
    }
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, setUser, loading, error, checkSession, authenticate, logout }}>{children}</AuthContext.Provider>
}
