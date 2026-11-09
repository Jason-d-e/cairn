import { useEffect, useState } from 'react'

// The campus a reader picks before asking. Pages marked 'all' always apply; the campus adds its own pages.
// Shared by the cover and the desk, remembered in localStorage, so it is chosen once.
export const CAMPUS_CODES = ['au', 'my', 'id'] as const
export type Campus = (typeof CAMPUS_CODES)[number]

const KEY = 'cairn-campus'
const isCampus = (v: unknown): v is Campus => typeof v === 'string' && (CAMPUS_CODES as readonly string[]).includes(v)

function read(): Campus | null {
  try {
    const v = localStorage.getItem(KEY)
    return isCampus(v) ? v : null
  } catch {
    return null
  }
}

let current: Campus | null = read()
const listeners = new Set<(c: Campus | null) => void>()

export const getCampus = () => current

export function setCampus(c: Campus) {
  current = c
  try {
    localStorage.setItem(KEY, c)
  } catch {
    /* storage unavailable */
  }
  listeners.forEach((l) => l(c))
}

export function useCampus(): [Campus | null, (c: Campus) => void] {
  const [campus, set] = useState<Campus | null>(current)
  useEffect(() => {
    listeners.add(set)
    return () => {
      listeners.delete(set)
    }
  }, [])
  return [campus, setCampus]
}
