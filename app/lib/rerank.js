// Second-stage reranking with a multilingual cross-encoder (BAAI bge-reranker-base, via transformers.js).
// The first stage finds about 20 candidates cheaply; the cross-encoder reads question and passage together
// and scores how well the passage answers it.
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { AutoTokenizer, AutoModelForSequenceClassification, env } from '@huggingface/transformers'

const APP_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
env.cacheDir = path.join(APP_DIR, 'data', 'models')

export const RERANK_MODEL = 'Xenova/bge-reranker-base'
let loaded = null

async function load() {
  loaded ??= Promise.all([
    AutoTokenizer.from_pretrained(RERANK_MODEL),
    AutoModelForSequenceClassification.from_pretrained(RERANK_MODEL, { dtype: 'q8' }),
  ])
  return loaded
}

/** Returns the candidates re-ordered by the cross-encoder, each with its rerank score. */
export async function rerank(query, candidates, k = 6) {
  if (!candidates.length) return []
  const [tokenizer, model] = await load()
  const inputs = tokenizer(new Array(candidates.length).fill(query), {
    text_pair: candidates.map((c) => `${c.title}. ${c.section}. ${c.text}`),
    padding: true,
    truncation: true,
    max_length: 512,
  })
  const { logits } = await model(inputs)
  const scores = logits.tolist().map((row) => row[0])
  return candidates
    .map((c, i) => ({ ...c, retrieval_rank: c.rank, rerank_score: Number(scores[i].toFixed(4)) }))
    .sort((a, b) => b.rerank_score - a.rerank_score)
    .slice(0, k)
    .map((c, i) => ({ ...c, rank: i + 1 }))
}
