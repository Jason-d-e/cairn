// Writes the data the static demo (GitHub Pages) serves instead of the API: the status, library, gaps and
// evaluation JSON, plus one real answer per example question and campus. Every answer is a genuine run against
// the running server, dated, never edited by hand. The answers carry short excerpts of the pages, as the desk shows them.
// Both engines are recorded for every question: the model's answer and the local engine's (no model call).
// Usage: node scripts/export-static.js   (the server must be running with a model key; about 14 model calls)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BASE = process.env.CAIRN_URL ?? 'http://127.0.0.1:3100'
const OUT = path.join(APP, 'web', 'public', 'static')

// The desk's example questions in both languages (the cover's placeholder and closing questions are among them),
// answered for the Malaysia campus, plus the campus-specific ones for Australia and Indonesia.
const EN = [
  'I was sick on the day of my exam. Can I defer it?',
  'What is the deadline to apply for special consideration?',
  'Can I withdraw from a unit after the census date without a fail grade?',
  'How do I register with Disability Support Services?',
  'What happens if my internet drops during an eExam?',
]
const ZH = ['考试当天生病没去考，可以申请延期考试吗？', '特殊考量（special consideration）最晚什么时候申请？', '过了 census date 再退课，会有什么后果？', '怎么注册 DSS（残障支持服务）？', 'eExam 考到一半断网了怎么办？']
const QUESTIONS = [
  ...EN.map((q) => ({ campus: 'my', lang: 'en', q })),
  ...ZH.map((q) => ({ campus: 'my', lang: 'zh', q })),
  { campus: 'au', lang: 'en', q: EN[3] },
  { campus: 'au', lang: 'en', q: EN[1] },
  { campus: 'au', lang: 'zh', q: ZH[3] },
  { campus: 'id', lang: 'en', q: EN[3] },
]

/** The same normalisation the static client uses to look a question up. */
export const keyOf = (q) => q.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[?？。.!！\s]+$/, '')

async function get(p) {
  const r = await fetch(BASE + p)
  if (!r.ok) throw new Error(`${p}: ${r.status}`)
  return r.json()
}
async function ask(question, campus, engine) {
  const r = await fetch(`${BASE}/api/ask`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-cairn-source': 'eval' }, body: JSON.stringify({ question, campus, engine }) })
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

const index = { generated: new Date().toLocaleDateString('sv-SE'), model: status.model, questions: [] }
let n = 0
for (const { campus, lang, q } of QUESTIONS) {
  n += 1
  for (const engine of ['model', 'local']) {
    const result = await ask(q, campus, engine)
    // The stored answer keeps the quotes (short, verified) but not the whole passages behind "Show the passage":
    // the pages are not ours to republish, so the public demo carries excerpts only.
    const trim = (list) => list.map(({ source_text, span, ...rest }) => rest)
    const slim = { ...result, points: trim(result.points), citations: trim(result.citations) }
    const file = `answers/${campus}-${lang}-${n}-${engine}.json`
    write(file, slim)
    index.questions.push({ q, key: keyOf(q), lang, campus, engine, file, status: result.status, verified: result.checks.quotes_verified, total: result.checks.quotes_total })
    console.log(`  ${campus} ${lang} ${engine.padEnd(5)} ${result.status} ${result.checks.quotes_verified}/${result.checks.quotes_total} - ${q}`)
  }
}
write('answers/index.json', index)
console.log(`done: ${index.questions.length} answers, ${index.generated}`)
