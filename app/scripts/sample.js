// Writes web/src/cover/sample.ts from a real answer, so the cover never shows a hand-typed result.
// Usage: node scripts/sample.js   (the server must be running with a model key)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BASE = process.env.CAIRN_URL ?? 'http://127.0.0.1:3100'
const QUESTIONS = { en: 'How big must a touch target be?', zh: '触控目标至少要多大？' }

async function ask(question) {
  const res = await fetch(`${BASE}/api/ask`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-cairn-source': 'eval' }, body: JSON.stringify({ question }) })
  const body = await res.json()
  if (!res.ok) throw new Error(`${res.status}: ${body.error?.message}`)
  return body
}

const en = await ask(QUESTIONS.en)
const zh = await ask(QUESTIONS.zh)
for (const [lang, r] of [['en', en], ['zh', zh]]) console.log(lang, r.status, `${r.checks.quotes_verified}/${r.checks.quotes_total} verified`, '-', r.answer)
if (en.status !== 'answered' || zh.status !== 'answered') {
  console.error('Both answers must be "answered" before they go on the cover. Nothing written.')
  process.exit(1)
}
// The English quote shown is the first verified citation of the English answer; the sentence shown per language is that language's own answer.
const quote = [...en.citations, ...en.points].find((q) => q.verified)
const out = `// The answer shown on the cover. Regenerated from a real run by scripts/sample.js, never typed by hand.
// Run on ${new Date().toISOString().slice(0, 10)} with ${en.meta.model_served}, corpus ${en.meta.corpus}.
export const SAMPLE = {
  date: ${JSON.stringify(new Date().toISOString().slice(0, 10))},
  question: ${JSON.stringify(QUESTIONS)},
  answer: ${JSON.stringify({ en: en.answer, zh: zh.answer })},
  quote: ${JSON.stringify(quote.quote)},
  source_id: ${JSON.stringify(quote.source_id)},
  doc: ${JSON.stringify(quote.doc)},
  title: ${JSON.stringify(quote.title.replace(/^\d+\.\d+\.\d+\s*/, ''))},
  level: ${JSON.stringify(quote.level)},
  url: ${JSON.stringify(quote.url)},
  verified: ${quote.verified},
}
`
const file = path.join(APP, 'web', 'src', 'cover', 'sample.ts')
fs.writeFileSync(file, out)
console.log('wrote', path.relative(APP, file))
