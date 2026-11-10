// When the pages do not answer, draft the email the reader would send to ask. A template, not a model, so it
// works in every mode and never invents a contact: the address comes from the retrieved passages (a documented
// email), or the draft is left unaddressed with the page to look at. The reader copies it or opens it in their
// mail app; nothing is sent by Cairn.

const EMAIL_RE = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g
const isChinese = (q) => /[㐀-鿿]/.test(q)

/** The first documented email address in the three best passages, with the chunk it was found in. */
export function findContact(context) {
  for (const c of context.slice(0, 3)) {
    const m = String(c.text).match(EMAIL_RE)
    if (m) return { email: m[0], source_id: c.id, title: c.title, url: c.url }
  }
  return null
}

/** The pages worth naming in the letter: the closest one always, others only when they are actually relevant. */
function pagesOf(context) {
  const pages = []
  for (const c of context) {
    if (pages.some((p) => p.doc === c.doc)) continue
    if (pages.length === 0 || (c.rerank_score ?? -1) >= 0) pages.push({ doc: c.doc, title: c.title, url: c.url })
  }
  return pages.slice(0, 3)
}

/**
 * The draft: subject, body, the address if the pages gave one, and a mailto link.
 * The body is English because the organisation's staff read English. The question goes in as its English
 * rendering when the retrieval step made one; otherwise as asked, and the note says to translate it first.
 */
export function draftEmail({ question, question_en = null, campusName, context, organisation = 'Monash University' }) {
  const contact = findContact(context)
  const pages = pagesOf(context)
  const zh = isChinese(question)
  const subject = `Question about ${pages[0]?.title ?? 'a student rule'}${campusName ? ` (${campusName})` : ''}`
  const lines = [
    'Dear team,',
    '',
    `I am a student${campusName ? ` at the ${campusName} campus` : ''}. I could not find the answer to this question on the ${organisation} student pages:`,
    '',
    `“${question_en ?? question}”`,
    '',
    pages.length === 1 ? 'The closest page I found:' : pages.length ? 'Pages I have read:' : '',
    ...pages.map((p) => `- ${p.title}: ${p.url}`),
    '',
    'Could you tell me what applies in my case, and whether there is a deadline or a form I should use?',
    '',
    'Thank you,',
    '[Your name]',
    '[Student ID]',
  ].filter((l, i, arr) => !(l === '' && arr[i - 1] === ''))
  const body = lines.join('\n')
  const to = contact?.email ?? ''
  const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  // One short line for the reader: where the address comes from, or where to look for one.
  const untranslated = zh && !question_en
  const note = zh
    ? `${contact ? `收件地址来自《${contact.title}》页面。` : '这些页面没写邮箱，请到邮件里列出的页面找联系方式。'}${untranslated ? '问题是中文的，发送前请改成英文。' : ''}`
    : contact
      ? `The address comes from the page “${contact.title}”.`
      : 'These pages give no email address; look for the contact on the page listed in the email.'
  return { to, to_source: contact ? { source_id: contact.source_id, title: contact.title, url: contact.url } : null, subject, body, mailto, note }
}
