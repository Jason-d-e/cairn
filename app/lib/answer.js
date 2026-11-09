// Generation: one Claude call with structured output, then the server-side checks.
// (Client setup and error mapping are reused from our TraceDesk project.)
import Anthropic from '@anthropic-ai/sdk'
import { config } from './config.js'
import { PROMPT_VERSION, SYSTEM, buildSchema, buildUserMessage } from './prompt.js'
import { checkAnswer, ModelOutputError } from './validate.js'
import { findContext } from './pipeline.js'

export class RefusalError extends Error {
  constructor(details) {
    super('The model declined this request.')
    this.name = 'RefusalError'
    this.details = details
  }
}

let client = null
const getClient = () => (client ??= new Anthropic({ apiKey: config.apiKey, baseURL: config.baseURL, timeout: 60_000, maxRetries: 2 }))

export async function answerQuestion(kb, question) {
  const { context, trace } = await findContext(kb, question)
  const started = Date.now()
  const response = await getClient().beta.messages.create({
    model: config.model,
    max_tokens: 8000,
    output_config: { effort: config.effort, format: { type: 'json_schema', schema: buildSchema(context.map((c) => c.id)) } },
    system: SYSTEM,
    messages: [{ role: 'user', content: buildUserMessage(question, context) }],
  })
  const meta = {
    prompt_version: PROMPT_VERSION,
    corpus: `${kb.meta.source}@${kb.meta.commit}`,
    model_requested: config.model,
    model_served: response.model,
    effort: config.effort,
    latency_ms: Date.now() - started,
    retrieval_ms: trace.ms.retrieve + trace.ms.rerank,
    stop_reason: response.stop_reason,
    usage: { input_tokens: response.usage?.input_tokens ?? null, output_tokens: response.usage?.output_tokens ?? null },
  }
  if (response.stop_reason === 'refusal') throw new RefusalError(meta)
  if (response.stop_reason === 'max_tokens') throw new ModelOutputError("The model's answer was cut off before it finished.")
  const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('')
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new ModelOutputError('The model did not return valid JSON.')
  }
  return { ...checkAnswer(parsed, kb.chunkById), trace, meta }
}

/** Translate any failure into a stable, user-safe error description. */
export function describeError(err) {
  if (err instanceof RefusalError) return { http: 422, code: 'refused', retryable: false, message: 'The model declined to answer this question.' }
  if (err instanceof ModelOutputError) return { http: 502, code: 'model_output_invalid', retryable: true, message: err.message }
  if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
    return { http: 502, code: 'model_auth_failed', retryable: false, message: 'The API key was rejected. Check ANTHROPIC_API_KEY in app/.env.' }
  }
  if (err instanceof Anthropic.RateLimitError) return { http: 503, code: 'rate_limited', retryable: true, message: 'The model service is busy. Try again in a moment.' }
  if (err instanceof Anthropic.APIConnectionTimeoutError) return { http: 504, code: 'timeout', retryable: true, message: 'The model took too long to respond. Try again.' }
  if (err instanceof Anthropic.APIConnectionError) return { http: 503, code: 'network', retryable: true, message: 'Could not reach the model service. Check the connection.' }
  if (err instanceof Anthropic.APIError) return { http: 502, code: 'api_error', retryable: true, message: `Model service error (${err.status ?? 'unknown'}).` }
  return { http: 500, code: 'internal', retryable: true, message: 'Something went wrong on the server.' }
}
