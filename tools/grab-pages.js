// Reads an organisation's public pages in YOUR OWN browser and saves them as one JSON file for `npm run ingest:monash`.
//
// Why a browser: the Monash sites refuse scripted requests, and the pages are theirs. So a person opens the site,
// runs this once per site in the DevTools console, and gets one download. The pages stay on your machine
// (corpus/monash-src/), never in the repository; the desk shows short excerpts of them with a link to each page.
//
// How to use, once per site (www.monash.edu, then www.monash.edu.my):
//   1. In Chrome, open any page of that site. Open DevTools (F12) and its Console tab.
//   2. Copy that site's list from corpus/monash-pages.json ("sites" -> the host) into PAGES below.
//   3. Paste the whole script into the console and press Enter. Allow the download when Chrome asks.
//   4. Move the downloaded file into corpus/monash-src/, then run `npm run ingest:monash` in app/.
//
// Each page becomes { id, campus, topic, url, title, fetched, text }; the text keeps the page's structure as
// "# Heading" lines, "- item" lines and "a | b" table rows, and stops at the site's shared footer blocks.
(async () => {
  const PAGES = [
    // { id: 'all-sc-overview', campus: 'all', topic: 'special-consideration', url: 'https://www.monash.edu/students/admin/assessments/extensions-special-consideration' },
  ]
  const stopRe = /^(Got a question\? Message Monash Connect|Try MoVA|Monash College and University diploma enquiries|Quick links|Related links)/i
  const skipRe = /^(You are here:|Share this|Print this page|Page last updated|Back to top)/i

  function extract(doc) {
    const root = [...doc.querySelectorAll('main, #main-content, #content, .content, body')].sort((a, b) => b.textContent.length - a.textContent.length)[0]
    const h1 = root.querySelector('h1')
    const blocks = [...root.querySelectorAll('h1, h2, h3, h4, h5, p, li, dt, dd, tr, blockquote, figcaption')]
    const start = h1 ? blocks.indexOf(h1) : 0
    const lines = []
    let last = ''
    for (const el of blocks.slice(start)) {
      if (el.closest('nav, footer, header, [role=navigation], .breadcrumbs, .breadcrumb, .side-nav, .sidebar')) continue
      if (el.tagName === 'LI' && el.querySelector('li')) continue // keep the innermost items only
      if (el.tagName === 'P' && el.closest('li, td, th, dd, blockquote, figcaption')) continue
      let t = el.tagName === 'TR'
        ? [...el.children].map((c) => c.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean).join(' | ')
        : el.textContent.replace(/\s+/g, ' ').trim()
      if (!t || skipRe.test(t) || t === last) continue
      if (/^H[1-5]$/.test(el.tagName)) {
        if (stopRe.test(t)) break
        t = '#'.repeat(Number(el.tagName[1])) + ' ' + t
      } else if (el.tagName === 'LI') t = '- ' + t
      else if (el.tagName === 'DT') t = t + ':'
      lines.push(t)
      last = t
    }
    const title = (doc.title || '').replace(/ - Current students$/, '').replace(/ - Monash University( Malaysia)?$/, '')
    return { title, text: lines.join('\n') }
  }

  const fetched = new Date().toISOString().slice(0, 10)
  const out = []
  // Same-origin fetches, four at a time, so the site is not hammered and the console does not time out.
  for (let i = 0; i < PAGES.length; i += 4) {
    await Promise.all(
      PAGES.slice(i, i + 4).map(async (p) => {
        try {
          const html = await (await fetch(p.url)).text()
          const { title, text } = extract(new DOMParser().parseFromString(html, 'text/html'))
          out.push({ ...p, title, fetched, text })
          console.log('ok', p.id, text.split(/\s+/).length, 'words')
        } catch (e) {
          console.warn('failed', p.id, String(e))
        }
      }),
    )
  }
  const blob = new Blob([JSON.stringify(out, null, 1)], { type: 'application/json' })
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `${location.hostname}-corpus.json` })
  document.body.appendChild(a)
  a.click()
  a.remove()
  return `${out.length} of ${PAGES.length} pages saved`
})()
