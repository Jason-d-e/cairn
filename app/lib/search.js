// Retrieval with Orama: BM25 full-text, vector (cosine) and hybrid search over the same chunks.
import fs from 'node:fs'
import { create, insertMultiple, search } from '@orama/orama'
import { persist, restore } from '@orama/plugin-data-persistence'
import { EMBED_DIM, embedQuery } from './embed.js'

const SCHEMA = {
  id: 'string', doc: 'string', title: 'string', level: 'string', section: 'string', kind: 'string', url: 'string', text: 'string',
  embedding: `vector[${EMBED_DIM}]`,
}

export async function buildIndex(rows) {
  const db = create({ schema: SCHEMA })
  await insertMultiple(db, rows, 200)
  return db
}

export async function saveIndex(db, file) {
  fs.writeFileSync(file, await persist(db, 'json'))
}

export async function loadIndex(file) {
  return restore('json', fs.readFileSync(file, 'utf8'))
}

/**
 * Reciprocal rank fusion (Cormack et al., 2009): score = sum of 1 / (60 + rank) over the keyword and the vector lists.
 * It needs no score calibration, so a BM25 list that finds nothing (a Chinese question) simply adds nothing.
 */
export async function retrieveRRF(db, query, { k = 6, depth = 30, c = 60 } = {}) {
  const [kw, vec] = await Promise.all([
    retrieve(db, query, { mode: 'keyword', k: depth }),
    retrieve(db, query, { mode: 'vector', k: depth }),
  ])
  const fused = new Map()
  for (const list of [kw, vec]) {
    for (const h of list) {
      const cur = fused.get(h.id) ?? { ...h, score: 0, from: [] }
      cur.score += 1 / (c + h.rank)
      cur.from.push(list === kw ? `keyword #${h.rank}` : `vector #${h.rank}`)
      fused.set(h.id, cur)
    }
  }
  return [...fused.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((h, i) => ({ ...h, score: Number(h.score.toFixed(5)), rank: i + 1 }))
}

/**
 * mode: 'keyword' (BM25 only), 'vector' (embeddings only) or 'hybrid' (both, Orama's weighted fusion).
 * Returns the top k chunks with their score and rank, without the stored vectors.
 */
export async function retrieve(db, query, { mode = 'hybrid', k = 6, weights = { text: 0.4, vector: 0.6 } } = {}) {
  const props = ['title', 'section', 'text']
  let params
  if (mode === 'keyword') {
    params = { term: query, properties: props, limit: k }
  } else {
    const value = await embedQuery(query)
    const vector = { value, property: 'embedding' }
    params = mode === 'vector'
      ? { mode: 'vector', vector, similarity: 0.2, limit: k, includeVectors: false }
      : { mode: 'hybrid', term: query, properties: props, vector, similarity: 0.2, limit: k, hybridWeights: weights, includeVectors: false }
  }
  const res = await search(db, params)
  return res.hits.map((h, i) => {
    const { embedding, ...doc } = h.document
    return { ...doc, score: Number(h.score.toFixed(4)), rank: i + 1 }
  })
}
