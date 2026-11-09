// When the pages do not answer, draft the email the reader would send to ask. A template, not a model, so it
// works in every mode and never invents a contact: the address comes from the retrieved passages (a documented
// email), or the draft is left unaddressed with the pages to look at. The reader copies it or opens it in their
// mail app; nothing is sent by Cairn.

const EMAIL_RE = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g
const isChinese = (q) => /[㐀-鿿]/.test(q)

/** The first documented email address in the retrieved passages, with the chunk it was found in. */
export function findContact(context) {
  for (const c of context) {
    const m = String(c.text).match(EMAIL_RE)
    if (m) return { email: m[0], source_id: c.id, title: c.title, url: c.url }
  }
  return null
}

const pagesOf = (context) => [...new Map(context.map((c) => [c.doc, { title: c.title, url: c.url }])).values()].slice(0, 3)

/**
 * The draft: subject, body, the address if the pages gave one, and a mailto link.
 * The body is English because the organisation's staff read English; the question is quoted as asked.
 */
export function draftEmail({ question, campus, campusName, missing_info, context, organisation = 'Monash University' }) {
  const contact = findContact(context)
  const pages = pagesOf(context)
  const zh = isChinese(question)
  const subject = `Question about ${pages[0]?.title ?? 'a student rule'}${campusName ? ` (${campusName})` : ''}`
  const lines = [
    'Dear team,',
    '',
    `I am a student${campusName ? ` at the ${campusName} campus` : ''} and I could not find the answer to this question on the ${organisation} pages:`,
    '',
    `“${question}”`,
    '',
    pages.length ? 'Pages I have read:' : 'I have looked at the published pages.',
    ...pages.map((p) => `- ${p.title}: ${p.url}`),
    '',
    missing_info ? `What they do not say: ${missing_info}` : '',
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
  return {
    to,
    to_source: contact ? { source_id: contact.source_id, title: contact.title, url: contact.url } : null,
    subject,
    body,
    mailto,
    note: zh
      ? contact
        ? `收件地址来自页面《${contact.title}》；邮件用英文写好，可以直接复制或改动。`
        : '页面里没有写邮箱，收件人留空；请在上面列出的页面里找联系方式。邮件用英文写好，可以直接复制或改动。'
      : contact
        ? `The address comes from the page “${contact.title}”. Edit the draft as you like.`
        : 'The pages do not give an email address, so the recipient is left blank; look for the contact on the pages listed. Edit the draft as you like.',
  }
}
