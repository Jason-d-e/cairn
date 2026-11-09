// Retrieval evaluation: which success criterion does each method put first, in the top 3 and top 5?
// Metrics per method and language: hit@1, hit@3, hit@5 and MRR@10 (by success criterion, any gold one counts).
// Usage: npm run eval:retrieval   (no model calls, no cost; writes eval/results/retrieval-<date>.json and .md)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadIndex, retrieve, retrieveRRF } from '../lib/search.js'
import { rerank } from '../lib/rerank.js'

const APP_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const { questions } = JSON.parse(fs.readFileSync(path.join(APP_DIR, 'eval', 'retrieval-questions.json'), 'utf8'))
const db = await loadIndex(path.join(APP_DIR, 'data', 'index.json'))

const METHODS = {
  'keyword (BM25)': (q) => retrieve(db, q, { mode: 'keyword', k: 10 }),
  vector: (q) => retrieve(db, q, { mode: 'vector', k: 10 }),
  'hybrid, Orama 0.4/0.6': (q) => retrieve(db, q, { mode: 'hybrid', k: 10, weights: { text: 0.4, vector: 0.6 } }),
  'hybrid, Orama 0.2/0.8': (q) => retrieve(db, q, { mode: 'hybrid', k: 10, weights: { text: 0.2, vector: 0.8 } }),
  'hybrid, RRF': (q) => retrieveRRF(db, q, { k: 10 }),
  'vector + rerank': async (q) => rerank(q, await retrieve(db, q, { mode: 'vector', k: 20 }), 10),
  'RRF + rerank': async (q) => rerank(q, await retrieveRRF(db, q, { k: 20 }), 10),
}

const rows = []
for (const [name, run] of Object.entries(METHODS)) {
  for (const item of questions) {
    const hits = await run(item.q)
    const docs = [...new Set(hits.map((h) => h.doc))] // rank by success criterion, not by chunk
    const pos = docs.findIndex((d) => item.gold.includes(d))
    rows.push({ method: name, id: item.id, lang: item.lang, first: docs[0] ?? null, rank: pos === -1 ? null : pos + 1 })
  }
}

const summary = []
for (const name of Object.keys(METHODS)) {
  for (const lang of ['en', 'zh', 'all']) {
    const r = rows.filter((x) => x.method === name && (lang === 'all' || x.lang === lang))
    const at = (k) => r.filter((x) => x.rank && x.rank <= k).length
    const mrr = r.reduce((s, x) => s + (x.rank ? 1 / x.rank : 0), 0) / r.length
    summary.push({ method: name, lang, n: r.length, hit1: at(1), hit3: at(3), hit5: at(5), mrr: Number(mrr.toFixed(3)) })
  }
}

const day = new Date().toISOString().slice(0, 10)
const out = path.join(APP_DIR, 'eval', 'results')
fs.mkdirSync(out, { recursive: true })
fs.writeFileSync(path.join(out, `retrieval-${day}.json`), JSON.stringify({ summary, rows }, null, 1))
const table = ['| Method | Questions | Hit@1 | Hit@3 | Hit@5 | MRR@10 |', '| --- | --- | --- | --- | --- | --- |',
  ...summary.map((s) => `| ${s.method} | ${s.lang} (${s.n}) | ${s.hit1} | ${s.hit3} | ${s.hit5} | ${s.mrr} |`)].join('\n')
fs.writeFileSync(path.join(out, `retrieval-${day}.md`), `# Retrieval evaluation, ${day}\n\n${table}\n`)
console.log(table)
const misses = rows.filter((x) => x.method === 'hybrid, RRF' && (!x.rank || x.rank > 3))
console.log('\nRRF misses (not in top 3):', misses.map((m) => `${m.id}→${m.first}`).join(', ') || 'none')
