// Writes the data the static demo (GitHub Pages) serves instead of the API: the status, library, gaps and
// evaluation JSON, plus one real answer per example question. Every answer is a genuine run against the
// running server, dated, never edited by hand.
// Usage: node scripts/export-static.js   (the server must be running with a model key; about 12 model calls)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BASE = process.env.CAIRN_URL ?? 'http://127.0.0.1:3100'
const OUT = path.join(APP, 'web', 'public', 'static')

// The desk's example questions in both languages, the cover's placeholder question, and the three closing questions.
const QUESTIONS = {
  en: [
    'How big must a touch target be?',
    'What contrast does body text need?',
    'Does a live video need captions?',
    'Can a session time out?',
    'What makes a focus indicator visible enough?',
    'How big must a button be?',
  ],
  zh: ['触控目标至少要多大？', '正文文字需要多高的对比度？', '直播视频必须配字幕吗？', '会话可以超时吗？', '焦点指示器怎样才算足够可见？', '按钮至少要多大？'],
}

/** The same normalisation the static client uses to look a question up. */
export const keyOf = (q) => q.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[?？。.!！\s]+$/, '')

async function get(p) {
  const r = await fetch(BASE + p)
  if (!r.ok) throw new Error(`${p}: ${r.status}`)
  return r.json()
}
async function ask(question) {
  const r = await fetch(`${BASE}/api/ask`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-cairn-source': 'eval' }, body: JSON.stringify({ question }) })
  const body = await r.json()
  if (!r.ok) throw new Error(`${question}: ${r.status} ${body.error?.message}`)
  return body
}
const write = (name, data) => {
  const file = path.join(OUT, name)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(data))
  console.log('wrote', path.relative(APP, file))
}

fs.rmSync(OUT, { recursive: true, force: true })
const status = await get('/api/status')
if (!status.model_configured) {
  console.error('The server has no model key; the answers would fail. Nothing written.')
  process.exit(1)
}
write('status.json', { ...status, static_demo: true })
write('library.json', await get('/api/library'))
write('gaps.json', await get('/api/gaps'))
write('quality.json', await get('/api/quality'))

const index = { generated: new Date().toISOString().slice(0, 10), model: status.model, questions: [] }
let n = 0
for (const [lang, list] of Object.entries(QUESTIONS)) {
  for (const q of list) {
    n += 1
    const result = await ask(q)
    const file = `answers/${lang}-${n}.json`
    write(file, result)
    index.questions.push({ q, key: keyOf(q), lang, file, status: result.status, verified: result.checks.quotes_verified, total: result.checks.quotes_total })
    console.log(`  ${lang} ${result.status} ${result.checks.quotes_verified}/${result.checks.quotes_total} - ${q}`)
  }
}
write('answers/index.json', index)
console.log(`done: ${index.questions.length} answers, ${index.generated}`)
