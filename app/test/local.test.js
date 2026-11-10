import test from 'node:test'
import assert from 'node:assert/strict'
import { splitSentences, THRESHOLD } from '../lib/local.js'
import { draftEmail, findContact } from '../lib/email.js'

test('splitSentences: prose splits at sentence ends, list items and table rows stay whole, headings go', () => {
  const text = [
    '## Late applications',
    'We won’t accept an application after the deadline (11.55pm on its set date) unless you can show exceptional circumstances. Once results are released, we won’t accept any applications.',
    '- Submit an application as soon as possible, but no later than the deadline shown.',
    'Semester 2 | 31 August 2026 | census date for standard units',
    'Short.',
  ].join('\n')
  const out = splitSentences(text)
  assert.equal(out.length, 4)
  assert.match(out[0], /^We won’t accept an application/)
  assert.match(out[1], /^Once results are released/)
  assert.equal(out[2], 'Submit an application as soon as possible, but no later than the deadline shown.')
  assert.equal(out[3], 'Semester 2 | 31 August 2026 | census date for standard units')
})

test('findContact: the first documented email in the passages, with its source', () => {
  const context = [
    { id: 'a#1', title: 'A', url: 'https://x/a', text: 'No address here.' },
    { id: 'b#2', title: 'B', url: 'https://x/b', text: 'Email disabilitysupportservices@monash.edu to register.' },
  ]
  assert.deepEqual(findContact(context), { email: 'disabilitysupportservices@monash.edu', source_id: 'b#2', title: 'B', url: 'https://x/b' })
  assert.equal(findContact([context[0]]), null)
})

test('draftEmail: addressed when the pages give an address, blank and explained when they do not', () => {
  const context = [{ id: 'b#2', doc: 'b', title: 'Disability Support Services', url: 'https://x/b', text: 'Email disabilitysupportservices@monash.edu to register.' }]
  const e = draftEmail({ question: 'How do I register with DSS?', campusName: 'Australia', context })
  assert.equal(e.to, 'disabilitysupportservices@monash.edu')
  assert.match(e.subject, /Disability Support Services \(Australia\)/)
  assert.match(e.body, /“How do I register with DSS\?”/)
  assert.match(e.body, /- Disability Support Services: https:\/\/x\/b/)
  assert.match(e.mailto, /^mailto:disabilitysupportservices%40monash\.edu\?subject=/)
  const weak = [{ id: 'p#1', doc: 'p', title: 'Parking', url: 'https://x/p', text: 'Apply at the office.', rerank_score: -1.5 }, { id: 'q#1', doc: 'q', title: 'Intermission', url: 'https://x/q', text: 'Unrelated.', rerank_score: -4 }]
  const none = draftEmail({ question: '停车证怎么办？', campusName: 'Malaysia', context: weak })
  assert.equal(none.to, '')
  assert.match(none.note, /没写邮箱/)
  assert.match(none.note, /请改成英文/)
  // Only the closest page is named when the others are not relevant.
  assert.match(none.body, /The closest page I found:\n- Parking: https:\/\/x\/p/)
  assert.doesNotMatch(none.body, /Intermission/)
  // With an English rendering of the question, the letter quotes that and the note no longer asks for a translation.
  const en = draftEmail({ question: '停车证怎么办？', question_en: 'How do I get a parking permit?', campusName: 'Malaysia', context: weak })
  assert.match(en.body, /“How do I get a parking permit\?”/)
  assert.doesNotMatch(en.note, /请改成英文/)
})

test('threshold is a number the engine respects', () => {
  assert.ok(THRESHOLD > 0)
})
