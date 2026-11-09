import fs from 'node:fs'
import path from 'node:path'
import { parseEnv } from 'node:util'
import { fileURLToPath } from 'node:url'

export const APP_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// Settings come ONLY from app/.env, never from process.env, so the app cannot pick up
// credentials that belong to other tools on the same machine.
function readDotEnv() {
  const file = path.join(APP_DIR, '.env')
  return fs.existsSync(file) ? parseEnv(fs.readFileSync(file, 'utf8')) : {}
}
const env = readDotEnv()

export const config = {
  apiKey: (env.ANTHROPIC_API_KEY ?? '').trim(),
  // The cheapest current Claude model.
  model: (env.CAIRN_MODEL ?? '').trim() || 'claude-haiku-5-5',
  effort: (env.CAIRN_EFFORT ?? '').trim() || 'medium',
  port: Number(env.PORT) || 3100,
  baseURL: 'https://api.anthropic.com',
}

export const modelConfigured = () => config.apiKey.length > 0
