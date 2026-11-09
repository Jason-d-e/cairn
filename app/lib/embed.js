// Local multilingual embeddings (transformers.js + multilingual-e5-small, quantised): no API key, works offline after the
// first download, and puts Chinese questions and English standards in the same vector space.
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { pipeline, env } from '@huggingface/transformers'

const APP_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
env.cacheDir = path.join(APP_DIR, 'data', 'models')

export const EMBED_MODEL = 'Xenova/multilingual-e5-small'
export const EMBED_DIM = 384

let extractor = null
async function model() {
  extractor ??= await pipeline('feature-extraction', EMBED_MODEL, { dtype: 'q8' })
  return extractor
}

/** e5 models expect "query: " for questions and "passage: " for indexed text. */
export async function embed(texts, kind = 'passage', batch = 16) {
  const m = await model()
  const out = []
  for (let i = 0; i < texts.length; i += batch) {
    const slice = texts.slice(i, i + batch).map((t) => `${kind}: ${t}`)
    const t = await m(slice, { pooling: 'mean', normalize: true })
    out.push(...t.tolist())
  }
  return out
}

export async function embedQuery(text) {
  return (await embed([text], 'query'))[0]
}
