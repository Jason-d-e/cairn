import fs from 'node:fs'
import path from 'node:path'
import express from 'express'
import { APP_DIR, config, modelConfigured } from './lib/config.js'
import { loadKnowledge, findContext, RETRIEVAL } from './lib/pipeline.js'
import { answerQuestion, describeError } from './lib/answer.js'
import { logRun, readRuns } from './lib/runlog.js'
import { EMBED_MODEL } from './lib/embed.js'
import { RERANK_MODEL } from './lib/rerank.js'

const kb = await loadKnowledge()
// Warm both local models so the first reader does not wait for them to load.
await findContext(kb, 'warm up')

const app = express()
app.use(express.json({ limit: '16kb' }))

// A small in-memory rate limit: this is a local, single-user prototype.
const hits = new Map()
function limited(ip) {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000)
  recent.push(now)
  hits.set(ip, recent)
  return recent.length > 20
}

app.get('/api/status', (req, res) => {
  res.json({
    model_configured: modelConfigured(),
    model: config.model,
    corpus: { source: kb.meta.source, commit: kb.meta.commit, documents: kb.meta.documents, chunks: kb.meta.chunks, license: kb.meta.license, notice: kb.meta.notice },
    retrieval: { ...RETRIEVAL, embed_model: EMBED_MODEL, rerank_model: RERANK_MODEL, chunk_size: kb.meta.chunk_size, chunk_overlap: kb.meta.chunk_overlap },
  })
})

// Retrieval only: shows what the pipeline would hand to the model. No model call, no cost.
app.get('/api/search', async (req, res, next) => {
  try {
    const q = String(req.query.q ?? '').trim()
    if (!q || q.length > 500) return res.status(400).json({ error: { code: 'bad_question', message: 'Ask a question of 1 to 500 characters.' } })
    const { trace } = await findContext(kb, q)
    res.json(trace)
  } catch (e) {
    next(e)
  }
})

app.post('/api/ask', async (req, res) => {
  const question = String(req.body?.question ?? '').trim()
  if (!question || question.length > 500) return res.status(400).json({ error: { code: 'bad_question', message: 'Ask a question of 1 to 500 characters.' } })
  if (limited(req.ip)) return res.status(429).json({ error: { code: 'rate_limited', message: 'Too many questions in a minute. Wait a moment.', retryable: true } })
  if (!modelConfigured()) return res.status(503).json({ error: { code: 'model_not_configured', message: 'Add ANTHROPIC_API_KEY to app/.env and restart.', retryable: false } })
  try {
    const result = await answerQuestion(kb, question)
    logRun({
      source: req.get('x-cairn-source') === 'eval' ? 'eval' : 'web', question, status: result.status, model_status: result.model_status,
      checks: result.checks, criteria: result.criteria.map((c) => c.id), missing_info: result.missing_info,
      retrieved: result.trace.chunks.map((c) => c.id), ...result.meta,
    })
    res.json(result)
  } catch (err) {
    const e = describeError(err)
    logRun({ source: 'web', question, status: 'error', error: e.code })
    res.status(e.http).json({ error: { code: e.code, message: e.message, retryable: e.retryable } })
  }
})

// The library: every document the desk can answer from, with its level, version and W3C links.
app.get('/api/library', (req, res) => {
  const perDoc = new Map()
  for (const c of kb.chunkById.values()) perDoc.set(c.doc, (perDoc.get(c.doc) ?? 0) + 1)
  res.json({ meta: kb.meta, documents: kb.documents.map((d) => ({ ...d, chunks: perDoc.get(d.id) ?? 0 })) })
})

// Knowledge gaps: real questions the corpus could not answer, grouped, most asked first.
app.get('/api/gaps', (req, res) => {
  const runs = readRuns().filter((r) => r.source === 'web')
  const groups = new Map()
  for (const r of runs.filter((x) => x.status === 'not_covered' || x.status === 'withheld')) {
    const key = r.question.trim().toLowerCase()
    const g = groups.get(key) ?? { question: r.question, asked: 0, last: r.run_at, missing_info: r.missing_info ?? '' }
    g.asked += 1
    g.last = r.run_at
    groups.set(key, g)
  }
  const answered = runs.filter((r) => r.status === 'answered').length
  res.json({ questions: runs.length, answered, gaps: [...groups.values()].sort((a, b) => b.asked - a.asked).slice(0, 20) })
})

// The latest retrieval evaluation (see scripts/eval-retrieval.js).
app.get('/api/quality', (req, res) => {
  const dir = path.join(APP_DIR, 'eval', 'results')
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /^retrieval-.*\.json$/.test(f)).sort() : []
  if (!files.length) return res.json({ summary: [] })
  const { summary } = JSON.parse(fs.readFileSync(path.join(dir, files.at(-1)), 'utf8'))
  res.json({ file: files.at(-1), summary })
})

app.use(express.static(path.join(APP_DIR, 'web', 'dist')))

// Malformed JSON and other errors: a short message, never a stack trace.
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err)
  const bad = err?.type === 'entity.parse.failed'
  res.status(bad ? 400 : 500).json({ error: { code: bad ? 'bad_json' : 'internal', message: bad ? 'The request body is not valid JSON.' : 'Something went wrong on the server.' } })
})

app.listen(config.port, '127.0.0.1', () => {
  console.log(`Cairn running at http://localhost:${config.port}`)
  console.log(`Corpus ${kb.meta.source}@${kb.meta.commit}: ${kb.meta.documents} criteria, ${kb.meta.chunks} chunks`)
  console.log(`Model: ${modelConfigured() ? `${config.model} (effort ${config.effort})` : 'NOT CONFIGURED (add ANTHROPIC_API_KEY to app/.env)'}`)
})
