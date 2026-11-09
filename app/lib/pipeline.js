// The RAG pipeline: retrieve -> rerank -> assemble context -> generate -> verify.
import fs from 'node:fs'
import path from 'node:path'
import { APP_DIR } from './config.js'
import { loadIndex, retrieve } from './search.js'
import { rerank } from './rerank.js'

const DATA = path.join(APP_DIR, 'data')

export async function loadKnowledge() {
  const { meta, documents } = JSON.parse(fs.readFileSync(path.join(DATA, 'documents.json'), 'utf8'))
  const chunks = JSON.parse(fs.readFileSync(path.join(DATA, 'chunks.json'), 'utf8'))
  const db = await loadIndex(path.join(DATA, 'index.json'))
  return {
    meta,
    documents,
    docById: new Map(documents.map((d) => [d.id, d])),
    chunkById: new Map(chunks.map((c) => [c.id, c])),
    normativeByDoc: groupRuleText(chunks),
    db,
  }
}

/** The rule text of a criterion can span several chunks (10 of 87 do, up to 3). Group them per criterion, in order, so all of them can be added. */
function groupRuleText(chunks) {
  const by = new Map()
  for (const c of chunks.filter((c) => c.kind === 'normative')) {
    if (!by.has(c.doc)) by.set(c.doc, [])
    by.get(c.doc).push(c)
  }
  for (const list of by.values()) {
    list.sort((a, b) => Number(a.id.split('#sc-')[1] ?? 0) - Number(b.id.split('#sc-')[1] ?? 0))
    list.forEach((c, i) => { c.part = i })
  }
  return by
}

export const RETRIEVAL = { method: 'vector + rerank', candidates: 20, context: 6, max_context: 10 }

/**
 * Stage 1: vector search for 20 candidates. Stage 2: cross-encoder rerank, keep 6.
 * Then add the rule text (all normative chunks) of the top three criteria, so the answer can quote the rule itself.
 * Returns the context chunks and a trace of how each one was found.
 */
export async function findContext(kb, question) {
  const t0 = Date.now()
  const candidates = await retrieve(kb.db, question, { mode: 'vector', k: RETRIEVAL.candidates })
  const t1 = Date.now()
  const ranked = await rerank(question, candidates, RETRIEVAL.context)
  const t2 = Date.now()

  const context = ranked.map((c) => ({ ...c, why: 'retrieved' }))
  const docs = [...new Set(ranked.map((c) => c.doc))].slice(0, 3)
  // The rule statement (first chunk) of every top criterion goes in first, then any continuation chunks (exceptions, notes).
  const rules = docs.flatMap((d) => kb.normativeByDoc.get(d) ?? [])
  rules.sort((a, b) => a.part - b.part || docs.indexOf(a.doc) - docs.indexOf(b.doc))
  for (const rule of rules) {
    if (!context.some((c) => c.id === rule.id) && context.length < RETRIEVAL.max_context) {
      context.push({ ...rule, rank: null, retrieval_rank: null, rerank_score: null, why: 'rule text of a retrieved criterion' })
    }
  }
  return {
    context,
    trace: {
      method: RETRIEVAL.method,
      candidates: candidates.length,
      ms: { retrieve: t1 - t0, rerank: t2 - t1 },
      chunks: context.map((c) => ({
        id: c.id, doc: c.doc, title: c.title, section: c.section, level: c.level, url: c.url,
        retrieval_rank: c.retrieval_rank, rerank_score: c.rerank_score, why: c.why,
      })),
    },
  }
}
