import { useEffect, useState } from 'react'

// How an answer is written: by the model (needs a key) or by the local engine (sentences chosen by a local
// model, no API, free). Chosen on the desk, remembered in localStorage, shared by every component.
export const ENGINES = ['model', 'local'] as const
export type Engine = (typeof ENGINES)[number]

const KEY = 'cairn-engine'
const isEngine = (v: unknown): v is Engine => typeof v === 'string' && (ENGINES as readonly string[]).includes(v)

function read(): Engine | null {
  try {
    const v = localStorage.getItem(KEY)
    return isEngine(v) ? v : null
  } catch {
    return null
  }
}

let current: Engine | null = read()
const listeners = new Set<(e: Engine | null) => void>()

export const getEngine = () => current

export function setEngine(e: Engine) {
  current = e
  try {
    localStorage.setItem(KEY, e)
  } catch {
    /* storage unavailable */
  }
  listeners.forEach((l) => l(e))
}

export function useEngine(): [Engine | null, (e: Engine) => void] {
  const [engine, set] = useState<Engine | null>(current)
  useEffect(() => {
    listeners.add(set)
    return () => {
      listeners.delete(set)
    }
  }, [])
  return [engine, setEngine]
}
