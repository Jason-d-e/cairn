import fs from 'node:fs'
import path from 'node:path'
import { APP_DIR } from './config.js'

const LOG_DIR = path.join(APP_DIR, 'logs')
export const RUN_LOG = path.join(LOG_DIR, 'runs.jsonl')

/** One JSON line per question: what was retrieved, what the model said, what the checks found. */
export function logRun(entry) {
  fs.mkdirSync(LOG_DIR, { recursive: true })
  fs.appendFileSync(RUN_LOG, JSON.stringify({ run_at: new Date().toISOString(), ...entry }) + '\n')
}

export function readRuns() {
  if (!fs.existsSync(RUN_LOG)) return []
  return fs.readFileSync(RUN_LOG, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
}
