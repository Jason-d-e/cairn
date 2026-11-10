// The local engine: an answer without any model API, the way assistants worked before large language models.
// It cannot write; it chooses. The retrieval stage finds the passages as usual, the passages are split into
// sentences, the local cross-encoder (bge-reranker-base, already used for reranking) scores every sentence
// against the question, and the best sentences become the answer: the top one is the bottom line, the next
// ones the points. Each is the page's own sentence, word for word, so the usual verification holds by
// construction; the interface shows the page and campus beside it. No sentence above the threshold means
// "not covered"; nothing is ever paraphrased or invented.
import { findContext } from './pipeline.js'
import { rerank } from './rerank.js'
import { checkAnswer } from './validate.js'

export const LOCAL_VERSION = 'local-extractive-v2'
export const LOCAL_ENGINE = 'local-extractive (bge-reranker-base)'
/** A sentence scoring below this is not treated as an answer. Calibrated on the evaluation questions; the scores are in eval/results/local-<date>.json. */
export const THRESHOLD = 0.5
/** A page whose best sentence scores at least this is still worth naming as "the closest page" when nothing answers. */
const CLOSE_ENOUGH = -2
const MAX_SENTENCES = 72
const POINTS = 3

const isChinese = (q) => /[㐀-鿿]/.test(q)

/** A chunk's text as candidate sentences: list items and table rows whole, prose split at sentence ends, headings dropped. */
export function splitSentences(text) {
  const out = []
  for (const raw of String(text).split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    if (line.startsWith('- ') || line.includes(' | ')) {
      out.push(line.replace(/^-\s+/, ''))
      continue
    }
    for (const s of line.split(/(?<=[.!?])\s+(?=["“(A-Z])/)) out.push(s.trim())
  }
  return out.filter((s) => s.length >= 25 && s.length <= 420)
}

function candidates(context) {
  const seen = new Set()
  const list = []
  for (const c of context) {
    for (const s of splitSentences(c.text)) {
      const key = s.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      list.push({ id: c.id, doc: c.doc, title: c.title, section: c.section, campus: c.campus, url: c.url, text: s, chunk_score: c.rerank_score ?? 0 })
    }
  }
  return list.slice(0, MAX_SENTENCES)
}

/**
 * When no sentence answers, the status line already says so. The one thing worth adding is the closest page,
 * when there is one; otherwise nothing, and the interface shows its standard line.
 */
function notCovered(question, best) {
  if (!best || best.rerank_score < CLOSE_ENOUGH) return ''
  return isChinese(question) ? `《${best.title}》，可以先去看看。` : `“${best.title}”. It may be worth a look.`
}

/**
 * Answer without a model: retrieve, split into sentences, score them locally, return the best ones.
 * Returns the same shape as answerQuestion, so the interface and the checks do not care which engine answered.
 * The bottom line and every point are the sentences themselves (text and quote are the same string).
 */
export async function answerLocally(kb, question, { campus } = {}) {
  const { context, trace } = await findContext(kb, question, { campus })
  const started = Date.now()
  const query = trace.query ?? question
  // Every sentence is scored on its own against the question. (Blending in the passage's score was tried on the
  // evaluation questions and ranked the right page slightly less often, so the sentence stands alone.)
  const ranked = await rerank(query, candidates(context), POINTS + 1)
  const good = ranked.filter((s) => s.rerank_score >= THRESHOLD)
  let parsed
  if (good.length === 0) {
    parsed = { status: 'not_covered', answer: '', points: [], citations: [], missing_info: notCovered(question, ranked[0]), clarifying_question: '' }
  } else {
    const [best, ...rest] = good
    parsed = {
      status: 'answered',
      answer: best.text,
      points: rest.slice(0, POINTS).map((s) => ({ text: s.text, source_id: s.id, quote: s.text })),
      citations: [{ source_id: best.id, quote: best.text }],
      missing_info: '',
      clarifying_question: '',
    }
  }
  const meta = {
    prompt_version: LOCAL_VERSION,
    engine: 'local',
    campus: campus ?? null,
    corpus: `${kb.meta.source}@${kb.meta.commit}`,
    model_requested: 'local',
    model_served: LOCAL_ENGINE,
    effort: 'n/a',
    latency_ms: Date.now() - started,
    retrieval_ms: (trace.ms.translate ?? 0) + trace.ms.retrieve + trace.ms.rerank,
    stop_reason: 'end',
    usage: { input_tokens: null, output_tokens: null },
    sentence_scores: ranked.map((s) => ({ id: s.id, score: s.rerank_score, passage_score: s.chunk_score })),
  }
  return { ...checkAnswer(parsed, kb.chunkById), trace, meta }
}
