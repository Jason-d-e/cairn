import { useEffect, useState } from 'react'
import { api } from './api'
import type { StatusInfo } from './types'

// /api/status is asked for once per page load and shared by every component that needs it.
let pending: Promise<StatusInfo> | null = null
let known: StatusInfo | null = null

export function useStatus() {
  const [status, setStatus] = useState<StatusInfo | null>(known)
  const [error, setError] = useState(false)
  useEffect(() => {
    if (known) return
    pending ??= api.status()
    pending
      .then((s) => {
        known = s
        setStatus(s)
      })
      .catch(() => {
        pending = null
        setError(true)
      })
  }, [])
  return { status, error }
}
