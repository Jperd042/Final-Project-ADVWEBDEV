import { useEffect, useState } from 'react'
import { api, errorMessage } from '../lib/api'

export function useResource(url) {
  const [revision, setRevision] = useState(0)
  const [result, setResult] = useState({ key: null, data: null, error: '' })
  const key = `${url}:${revision}`

  useEffect(() => {
    const controller = new AbortController()
    api.get(url, { signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted) setResult({ key, data, error: '' })
      })
      .catch((error) => {
        if (!controller.signal.aborted) setResult({ key, data: null, error: errorMessage(error) })
      })
    return () => controller.abort()
  }, [url, key])

  return {
    data: result.key === key ? result.data : null,
    error: result.key === key ? result.error : '',
    loading: result.key !== key,
    refresh: () => setRevision((value) => value + 1),
  }
}

export function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}
