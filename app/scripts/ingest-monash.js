// Ingestion for the Monash corpus: pages saved from the owner's browser (corpus/monash-src/*.json) -> sections -> chunks
// -> embeddings -> Orama index. The pages are Monash University's; they are not redistributed with the code.
// Usage: npm run ingest:monash   (reads ../corpus/monash-src, writes data/documents.json, data/chunks.json, data/index.json)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
import { embed, EMBED_MODEL } from '../lib/embed.js'
import { buildIndex, saveIndex } from '../lib/search.js'

const APP_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.resolve(APP_DIR, '..', 'corpus', 'monash-src')
const DATA = path.join(APP_DIR, 'data')

export const CAMPUSES = { all: 'All campuses', au: 'Australia', my: 'Malaysia', id: 'Indonesia' }
export const TOPICS = {
  'special-consideration': 'Special consideration and extensions',
  exams: 'Final assessments and exams',
  withdrawal: 'Withdrawing, intermission and fees',
  dates: 'Key dates',
  disability: 'Disability Support Services',
  contacts: 'Contacts and forms',
}

// 1. Every saved page: { id, campus, topic, url, title, fetched, text } with the text as "# Heading" / "- item" lines.
const pages = []
for (const f of fs.readdirSync(SRC).filter((f) => f.endsWith('.json'))) {
  for (const p of JSON.parse(fs.readFileSync(path.join(SRC, f), 'utf8'))) {
    if (!p.text || p.text.split(/\s+/).length < 20) { console.log('skipped (too short):', p.id); continue }
    pages.push(p)
  }
}
const byId = new Map()
for (const p of pages) byId.set(p.id, p) // a later file wins, so a refetch replaces an old copy
const documents = [...byId.values()].sort((a, b) => a.id.localeCompare(b.id)).map((p) => ({
  id: p.id, title: p.title, campus: p.campus, topic: p.topic, url: p.url, fetched: p.fetched, words: p.text.split(/\s+/).length,
}))

// 2. Sections: split each page at its headings; the running heading becomes the chunk's section name.
const sections = []
for (const p of byId.values()) {
  let heading = p.title
  let buf = []
  const flush = () => {
    const text = buf.join('\n').trim()
    if (text.replace(/^#+\s.*$/gm, '').trim().length >= 40) sections.push({ doc: p.id, title: p.title, campus: p.campus, topic: p.topic, section: heading, kind: 'page', url: p.url, text })
    buf = []
  }
  for (const line of p.text.split('\n')) {
    const m = line.match(/^(#{1,5})\s+(.*)$/)
    if (m && m[1].length <= 3) { flush(); heading = m[2].trim().replace(/\s+(View|Show|Hide|Expand|Collapse)$/i, '') || heading; continue }
    if (m) { buf.push(m[2]); continue }
    buf.push(line)
  }
  flush()
}

// 3. Chunk: about 900 characters with 150 of overlap, split on lines first (LangChain's recursive splitter).
const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 900, chunkOverlap: 150, separators: ['\n', '. ', ' ', ''] })
const chunks = []
const counts = new Map()
for (const s of sections) {
  const pieces = await splitter.splitText(s.text)
  for (const text of pieces) {
    const n = (counts.get(s.doc) ?? 0) + 1
    counts.set(s.doc, n)
    chunks.push({ id: `${s.doc}#${n}`, ...s, text })
  }
}
console.log(`${documents.length} pages, ${sections.length} sections, ${chunks.length} chunks`)

// 4. Embed (title and section give each chunk its context) and index.
const t0 = Date.now()
const vectors = await embed(chunks.map((c) => `${c.title}. ${c.section}. ${c.text}`))
console.log(`embedded with ${EMBED_MODEL} in ${((Date.now() - t0) / 1000).toFixed(1)} s`)
const db = await buildIndex(chunks.map((c, i) => ({ ...c, embedding: vectors[i] })))

fs.mkdirSync(DATA, { recursive: true })
const fetched = [...new Set(documents.map((d) => d.fetched))].sort()
const meta = {
  source: 'Monash University student pages (monash.edu, monash.edu.my), read in the owner’s browser',
  commit: fetched.at(-1), fetched,
  license: 'Copyright Monash University. Pages are not redistributed; the desk shows short excerpts with a link to the page they come from.',
  notice: 'Unofficial. Not affiliated with Monash University. Check the linked page or ask Monash Connect before relying on an answer.',
  built_at: new Date().toISOString(), embed_model: EMBED_MODEL, chunk_size: 900, chunk_overlap: 150,
  documents: documents.length, chunks: chunks.length, campuses: CAMPUSES, topics: TOPICS,
}
fs.writeFileSync(path.join(DATA, 'documents.json'), JSON.stringify({ meta, documents }, null, 1))
fs.writeFileSync(path.join(DATA, 'chunks.json'), JSON.stringify(chunks))
await saveIndex(db, path.join(DATA, 'index.json'))
console.log('wrote data/documents.json, data/chunks.json, data/index.json')
