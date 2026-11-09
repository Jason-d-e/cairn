// The RAG pipeline: retrieve -> rerank -> assemble context -> generate -> verify.
import fs from 'node:fs'
import path from 'node:path'
import { APP_DIR } from './config.js'
import { loadIndex, retrieve } from './search.js'
import { rerank } from './rerank.js'
import { translateQuery } from './translate.js'

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

/** Rule text (chunks of kind 'normative'; the WCAG corpus has them, the Monash pages do not) can span several chunks. Group them per document, in order, so all of them can be added. */
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
 * Then, when the corpus has rule text, add the rule text (all normative chunks) of the top three documents, so the answer can quote the rule itself.
 * Returns the context chunks and a trace of how each one was found.
 */
export async function findContext(kb, question, { campus } = {}) {
  const t0 = Date.now()
  // A Chinese question is searched by its English rendering (the pages are English); the answer still comes in Chinese.
  const translated = await translateQuery(question).catch(() => null)
  const query = translated ?? question
  const tq = Date.now()
  const candidates = await retrieve(kb.db, query, { mode: 'vector', k: RETRIEVAL.candidates, campus })
  const t1 = Date.now()
  const ranked = await rerank(query, candidates, RETRIEVAL.context)
  const t2 = Date.now()

  const context = ranked.map((c) => ({ ...c, why: 'retrieved' }))
  const docs = [...new Set(ranked.map((c) => c.doc))].slice(0, 3)
  // The rule statement (first chunk) of every top document goes in first, then any continuation chunks (exceptions, notes).
  const rules = docs.flatMap((d) => kb.normativeByDoc.get(d) ?? [])
  rules.sort((a, b) => a.part - b.part || docs.indexOf(a.doc) - docs.indexOf(b.doc))
  for (const rule of rules) {
    if (!context.some((c) => c.id === rule.id) && context.length < RETRIEVAL.max_context) {
      context.push({ ...rule, rank: null, retrieval_rank: null, rerank_score: null, why: 'rule text of a retrieved document' })
    }
  }
  return {
    context,
    trace: {
      method: RETRIEVAL.method,
      campus: campus ?? null,
      query,
      translated_from: translated ? question : null,
      candidates: candidates.length,
      ms: { translate: tq - t0, retrieve: t1 - tq, rerank: t2 - t1 },
      chunks: context.map((c) => ({
        id: c.id, doc: c.doc, title: c.title, section: c.section, level: c.level ?? null, campus: c.campus ?? null, topic: c.topic ?? null, url: c.url,
        retrieval_rank: c.retrieval_rank, rerank_score: c.rerank_score, why: c.why,
      })),
    },
  }
}
