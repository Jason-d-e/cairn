// Query translation for retrieval. The pages are English; a Chinese question is embedded and reranked far better
// after a plain English rendering. The original question still goes to the answering model, which replies in its language.
// One small model call per distinct question, cached for the life of the process.
import Anthropic from '@anthropic-ai/sdk'
import { config, modelConfigured } from './config.js'

const cache = new Map()
let client = null

export const needsTranslation = (q) => /[぀-ヿ㐀-鿿가-힯]/.test(q)

const SYSTEM = `Translate the student's question into plain English for searching a university website. Keep the university's own terms as they are: special consideration, short extension, deferred assessment, supplementary assessment, alternative assessment arrangements, census date, WD-LATE, WD-FAIL, Withdrawn grade, intermission, eExam, Disability Support Services (DSS), Monash Connect. Output only the English question, nothing else.`

/** English search text for a non-English question, or null when no translation is needed or possible. */
export async function translateQuery(question) {
  if (!modelConfigured() || !needsTranslation(question)) return null
  if (cache.has(question)) return cache.get(question)
  client ??= new Anthropic({ apiKey: config.apiKey, baseURL: config.baseURL, timeout: 20_000, maxRetries: 1 })
  const res = await client.beta.messages.create({
    model: config.model,
    max_tokens: 300,
    output_config: { effort: 'low' },
    system: SYSTEM,
    messages: [{ role: 'user', content: `<question>\n${question}\n</question>` }],
  })
  const text = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim()
  const out = text && text.length < 500 ? text : null
  cache.set(question, out)
  return out
}
