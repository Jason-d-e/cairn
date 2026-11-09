// The local engine: an answer without any model API, the way assistants worked before large language models.
// It cannot write; it chooses. The retrieval stage finds the passages as usual, the passages are split into
// sentences, the local cross-encoder (bge-reranker-base, already used for reranking) scores every sentence
// against the question, and the best sentences become the answer: the top one is the bottom line, the next
// ones the points. Each is quoted word for word from its page, so the usual verification holds by construction.
// Templates add the page, the campus and the lead-in in the reader's language. No sentence above the threshold
// means "not covered"; nothing is ever paraphrased or invented.
import { findContext } from './pipeline.js'
import { rerank } from './rerank.js'
import { checkAnswer } from './validate.js'

export const LOCAL_VERSION = 'local-extractive-v1'
export const LOCAL_ENGINE = 'local-extractive (bge-reranker-base)'
/** A sentence scoring below this is not treated as an answer. Calibrated on the evaluation questions; the scores are in eval/results/local-<date>.json. */
export const THRESHOLD = 0.5
const MAX_SENTENCES = 72
const POINTS = 3

const isChinese = (q) => /[㐀-鿿]/.test(q)
const CAMPUS_ZH = { all: '所有校区', au: '澳大利亚校区', my: '马来西亚校区', id: '印度尼西亚校区' }

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

/** The lead-in and labels, in the language of the question. Quotes stay in English. */
function templates(question, meta) {
  const zh = isChinese(question)
  const campusName = (c) => (zh ? CAMPUS_ZH[c] ?? c : meta.campuses?.[c] ?? c)
  return {
    lead: (s) => (zh ? `根据《${s.title}》（${campusName(s.campus)}）：${s.text}` : `From “${s.title}” (${campusName(s.campus).toLowerCase()}): ${s.text}`),
    // A point is a label for the quote shown under it (page, section, campus); the sentence itself is the quote, not repeated.
    point: (s) => (zh ? `《${s.title}》· ${s.section}（${campusName(s.campus)}）` : `${s.title} · ${s.section} (${campusName(s.campus).toLowerCase()})`),
    missing: (best) =>
      zh
        ? `本地引擎没有在这些页面里找到能回答这个问题的句子${best ? `（最接近的是《${best.title}》，分数 ${best.rerank_score.toFixed(2)}，低于 ${THRESHOLD}）` : ''}。它只会摘录原句，不会改写或推断。`
        : `The local engine found no sentence in these pages that answers the question${best ? ` (closest: “${best.title}”, score ${best.rerank_score.toFixed(2)}, below ${THRESHOLD})` : ''}. It only selects sentences; it never paraphrases or infers.`,
  }
}

/**
 * Answer without a model: retrieve, split into sentences, score them locally, template the best ones.
 * Returns the same shape as answerQuestion, so the interface and the checks do not care which engine answered.
 */
export async function answerLocally(kb, question, { campus } = {}) {
  const { context, trace } = await findContext(kb, question, { campus })
  const started = Date.now()
  const query = trace.query ?? question
  // Every sentence is scored on its own against the question. (Blending in the passage's score was tried on the
  // evaluation questions and ranked the right page slightly less often, so the sentence stands alone.)
  const ranked = await rerank(query, candidates(context), POINTS + 1)
  const t = templates(question, kb.meta)
  const good = ranked.filter((s) => s.rerank_score >= THRESHOLD)
  let parsed
  if (good.length === 0) {
    parsed = { status: 'not_covered', answer: '', points: [], citations: [], missing_info: t.missing(ranked[0]), clarifying_question: '' }
  } else {
    const [best, ...rest] = good
    parsed = {
      status: 'answered',
      answer: t.lead(best),
      points: rest.slice(0, POINTS).map((s) => ({ text: t.point(s), source_id: s.id, quote: s.text })),
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
