// Ingestion: W3C WCAG 2.2 source (w3c/wcag, W3C Document License) -> sections -> chunks -> embeddings -> Orama index.
// Usage: npm run ingest   (reads ../corpus/wcag-src, writes data/chunks.json, data/documents.json, data/index.json)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as cheerio from 'cheerio'
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
import { embed, EMBED_MODEL } from '../lib/embed.js'
import { buildIndex, saveIndex } from '../lib/search.js'

const APP_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.resolve(APP_DIR, '..', 'corpus', 'wcag-src')
const DATA = path.join(APP_DIR, 'data')
const SKIP_SECTIONS = new Set(['techniques', 'resources', 'test-rules', 'key-terms'])
const TR = 'https://www.w3.org/TR/WCAG22/'
const UNDERSTANDING = 'https://www.w3.org/WAI/WCAG22/Understanding/'

const clean = (s) => s.replace(/\s+/g, ' ').replace(/\s([.,;:)])/g, '$1').trim()

/** Readable text from an HTML fragment: paragraphs, list items and definitions on their own lines. */
function textOf($, el) {
  const parts = []
  $(el).find('p, li, dt, dd, td, th, figcaption, blockquote').each((_, n) => {
    if ($(n).find('p, li, dd').length) return // keep only the innermost blocks
    const t = clean($(n).text())
    if (t) parts.push($(n).is('dt') ? `${t}:` : t)
  })
  if (!parts.length) parts.push(clean($(el).text()))
  return parts.join('\n')
}

// 1. The order of success criteria (and so their numbers) comes from guidelines/index.html.
const index = cheerio.load(fs.readFileSync(path.join(SRC, 'guidelines', 'index.html'), 'utf8'))
const criteria = []
index('section.principle').each((p, principle) => {
  index(principle).find('section.guideline').each((g, guideline) => {
    const guidelineTitle = clean(index(guideline).find('> h3').first().text())
    index(guideline).find('section[data-include^="sc/"]').each((s, inc) => {
      const file = index(inc).attr('data-include')
      const [, ver, name] = file.match(/^sc\/(\d+)\/(.+)\.html$/)
      criteria.push({ number: `${p + 1}.${g + 1}.${s + 1}`, slug: name, ver, guideline: guidelineTitle })
    })
  })
})

const documents = []
const sections = []
for (const c of criteria) {
  const sc = cheerio.load(fs.readFileSync(path.join(SRC, 'guidelines', 'sc', c.ver, `${c.slug}.html`), 'utf8'))
  const title = clean(sc('h4').first().text())
  const level = clean(sc('.conformance-level').first().text())
  sc('h4, .conformance-level').remove()
  const normative = textOf(sc, sc.root())
  const obsolete = /obsolete|removed/i.test(normative.slice(0, 200))
  const id = `${c.number} ${title}`
  documents.push({
    id: c.number, title, level, guideline: c.guideline, added_in: `WCAG 2.${c.ver.slice(1)}`, obsolete,
    url: `${TR}#${c.slug}`, understanding_url: `${UNDERSTANDING}${c.slug}.html`,
  })
  sections.push({ doc: c.number, title: id, level, section: 'Success criterion', kind: 'normative', url: `${TR}#${c.slug}`, text: normative })

  const uPath = path.join(SRC, 'understanding', c.ver, `${c.slug}.html`)
  if (!fs.existsSync(uPath)) continue
  const u = cheerio.load(fs.readFileSync(uPath, 'utf8'))
  u('section').each((_, sec) => {
    const sid = u(sec).attr('id')
    if (!sid || SKIP_SECTIONS.has(sid) || u(sec).parents('section').length) return
    const heading = clean(u(sec).find('> h2').first().text()).replace(` of ${title}`, '').replace(` for ${title}`, '')
    const body = textOf(u, sec)
    if (body.length < 40) return
    sections.push({ doc: c.number, title: id, level, section: heading || sid, kind: 'understanding', url: `${UNDERSTANDING}${c.slug}.html#${sid}`, text: body })
  })
}

// 2. Chunk: about 900 characters with 150 of overlap, split on paragraphs first (LangChain's recursive splitter).
const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 900, chunkOverlap: 150, separators: ['\n', '. ', ' ', ''] })
const chunks = []
for (const s of sections) {
  const pieces = await splitter.splitText(s.text)
  pieces.forEach((text, i) => chunks.push({ id: `${s.doc}#${s.kind === 'normative' ? 'sc' : s.section.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${i + 1}`, ...s, text }))
}
console.log(`${documents.length} success criteria, ${sections.length} sections, ${chunks.length} chunks`)

// 3. Embed (title and section give each chunk its context) and index.
const t0 = Date.now()
const vectors = await embed(chunks.map((c) => `${c.title}. ${c.section}. ${c.text}`))
console.log(`embedded with ${EMBED_MODEL} in ${((Date.now() - t0) / 1000).toFixed(1)} s`)
const db = await buildIndex(chunks.map((c, i) => ({ ...c, embedding: vectors[i] })))

fs.mkdirSync(DATA, { recursive: true })
const head = fs.readFileSync(path.join(SRC, '.git', 'shallow'), 'utf8').trim().slice(0, 7)
const meta = {
  source: 'https://github.com/w3c/wcag', commit: head, license: 'W3C Document License, https://www.w3.org/copyright/document-license-2023/',
  notice: 'Copyright © 2026 World Wide Web Consortium. https://www.w3.org/copyright/document-license-2023/', built_at: new Date().toISOString(),
  embed_model: EMBED_MODEL, chunk_size: 900, chunk_overlap: 150, documents: documents.length, chunks: chunks.length,
}
fs.writeFileSync(path.join(DATA, 'documents.json'), JSON.stringify({ meta, documents }, null, 1))
fs.writeFileSync(path.join(DATA, 'chunks.json'), JSON.stringify(chunks))
await saveIndex(db, path.join(DATA, 'index.json'))
console.log('wrote data/documents.json, data/chunks.json, data/index.json')
